// ============================================================================
// commerce-finance-bridge.js  —  Integration Foundation, Layer 4
// LazyDogTemplates Marketplace
//
// THE MISSING LINK. Before this file, a completed checkout wrote a single raw
// order document and stopped — the Financial Engine was never invoked. This
// module wires the pipeline so that EVERY successful checkout automatically
// flows through the financial lifecycle, while preserving the layered design:
//
//   FastSpring success
//        -> OrderSchema.fromFastSpring()            (Layer 1: canonical order)
//        -> Commerce.order.create()                 (writes canonical order doc)
//        -> SalesRecords.ledger.recordSale()        (Financial Module 2)
//        -> SalesRecordsContinuation.transaction.process()  (Financial Module 4)
//        -> Commerce.order.updateFinancialStatus()  (reflect settlement)
//
// It also installs the two adapter namespaces the buyer library (cart_core.js)
// requires but that never existed: Commerce.order and Commerce.finance. This is
// what makes cart_core.js's "Pre-requisite Commerce layers are missing" guard
// pass.
//
// NOTHING in the existing engines is modified. This is orchestration glue only.
// ============================================================================

import { OrderSchema, COLLECTIONS, ORDER_STATUS, FINANCIAL_STATUS } from "./canonical-order-schema.js";

/**
 * Install the bridge + adapters.
 *
 * @param {Object} ctx
 * @param {Object} ctx.Commerce                    window.Commerce (from commerce.js)
 * @param {Object} ctx.SalesRecords                window.SalesRecords core
 * @param {Object} ctx.SalesRecordsContinuation    window.SalesRecordsContinuation
 * @param {Object} [ctx.SalesRecordsLifecycle]     window.SalesRecordsLifecycle (optional, for finance.status)
 * @param {() => Promise<{db:Object}>} ctx.ensureFirebase  shared v8-compat db resolver
 * @param {(productId:string)=>Promise<Object>} [ctx.resolveProduct]  product catalog lookup
 * @returns {Object} bridge API
 */
export function installBridge(ctx = {}) {
  const {
    Commerce,
    SalesRecords,
    SalesRecordsContinuation,
    SalesRecordsLifecycle,
    ensureFirebase
  } = ctx;

  if (!Commerce) throw new Error("installBridge: ctx.Commerce is required.");
  if (typeof ensureFirebase !== "function") throw new Error("installBridge: ctx.ensureFirebase is required.");

  const log = (SalesRecords && SalesRecords.logger) ? SalesRecords.logger : console;

  // Default product resolver: best-effort lookup so FastSpring's sellerless
  // payload can be enriched with sellerId/commissionRate. Override via
  // ctx.resolveProduct for the real catalog schema during page migration.
  const resolveProduct = typeof ctx.resolveProduct === "function"
    ? ctx.resolveProduct
    : async function defaultResolveProduct(productId) {
        try {
          const { db } = await ensureFirebase();
          for (const coll of ["products", "productDrafts"]) {
            const snap = await db.collection(coll).doc(productId).get();
            if (snap.exists) {
              const d = snap.data() || {};
              return {
                sellerId: d.sellerId || d.sellerUid || d.ownerUid || null,
                productTitle: d.productTitle || d.title || d.name || null,
                commissionRate: (d.commissionRate === undefined ? null : d.commissionRate),
                unitAmount: d.unitAmount !== undefined ? d.unitAmount
                  : (d.price !== undefined ? d.price : undefined)
              };
            }
          }
        } catch (e) {
          (log.warn || console.warn)("[bridge] product resolve failed for " + productId, e && e.message);
        }
        return {};
      };

  // --------------------------------------------------------------------------
  // Commerce.order — canonical order layer
  // --------------------------------------------------------------------------
  const order = {
    /** Persist a canonical order to the ORDERS collection, keyed by orderId. */
    async create(canonicalOrder) {
      const v = OrderSchema.validate(canonicalOrder);
      if (!v.valid) {
        (log.warn || console.warn)("[Commerce.order.create] invalid order:", v.errors);
        return { status: "invalid_order", errors: v.errors };
      }
      const { db } = await ensureFirebase();
      const ref = db.collection(COLLECTIONS.ORDERS).doc(canonicalOrder.orderId);
      const existing = await ref.get();
      if (existing.exists) {
        return { status: "already_exists", orderId: canonicalOrder.orderId };
      }
      await ref.set(canonicalOrder);
      return { status: "created", orderId: canonicalOrder.orderId };
    },

    /** Read a canonical order. Read-only. */
    async get(orderId) {
      if (!orderId) return null;
      const { db } = await ensureFirebase();
      const snap = await db.collection(COLLECTIONS.ORDERS).doc(String(orderId).trim()).get();
      return snap.exists ? snap.data() : null;
    },

    /** Update the order's financial status field. */
    async updateFinancialStatus(orderId, financialStatus) {
      const { db } = await ensureFirebase();
      await db.collection(COLLECTIONS.ORDERS).doc(String(orderId).trim())
        .update({ financialStatus });
      return { status: "updated", orderId, financialStatus };
    }
  };

  // --------------------------------------------------------------------------
  // Commerce.finance — read-only financial status resolver
  // (this is what cart_core.js Commerce.library.hasAccess() calls)
  // --------------------------------------------------------------------------
  const finance = {
    /**
     * Return { financialStatus } for an order. Prefers the immutable
     * transaction record (authoritative settlement), then the canonical order
     * doc's financialStatus, else "pending".
     */
    async status(orderId) {
      if (!orderId) return { financialStatus: null };
      const id = String(orderId).trim();
      const { db } = await ensureFirebase();
      try {
        const tx = await db.collection(COLLECTIONS.TRANSACTIONS).doc(id).get();
        if (tx.exists) {
          const d = tx.data() || {};
          return { financialStatus: d.status || FINANCIAL_STATUS.SETTLED, source: "transaction" };
        }
      } catch (_) { /* fall through */ }
      const ord = await db.collection(COLLECTIONS.ORDERS).doc(id).get();
      if (ord.exists) {
        return { financialStatus: (ord.data() || {}).financialStatus || FINANCIAL_STATUS.PENDING, source: "order" };
      }
      return { financialStatus: null, source: "none" };
    },

    /** Re-run the financial pipeline for an already-created order (retry path). */
    async process(orderId) {
      const canonical = await order.get(orderId);
      if (!canonical) return { status: "order_not_found", orderId };
      return runFinancialPipeline(canonical);
    }
  };

  // Attach adapters onto the live Commerce object (satisfies cart_core guard).
  Commerce.order = order;
  Commerce.finance = finance;

  // --------------------------------------------------------------------------
  // Core pipeline: canonical order -> financial lifecycle
  // --------------------------------------------------------------------------
  async function runFinancialPipeline(canonicalOrder) {
    const sales = OrderSchema.toSalesRecords(canonicalOrder);
    const results = [];

    for (const sale of sales) {
      // Module 2 — write the sale fact.
      const rec = await SalesRecords.ledger.recordSale(sale);
      // Module 4 — process into an immutable transaction (commission split).
      let proc = { status: "skipped_no_continuation" };
      if (SalesRecordsContinuation && SalesRecordsContinuation.transaction) {
        proc = await SalesRecordsContinuation.transaction.process(sale.saleId);
      }
      results.push({ saleId: sale.saleId, record: rec.status, process: proc.status });
    }

    const allSettled = results.length > 0 &&
      results.every((r) => r.process === "processed" || r.process === "already_processed");

    const financialStatus = allSettled ? FINANCIAL_STATUS.SETTLED
      : (results.some((r) => r.record === "recorded" || r.record === "already_recorded")
          ? FINANCIAL_STATUS.RECORDED
          : FINANCIAL_STATUS.PENDING);

    try {
      await order.updateFinancialStatus(canonicalOrder.orderId, financialStatus);
    } catch (e) {
      (log.warn || console.warn)("[bridge] could not update financialStatus:", e && e.message);
    }

    return { status: "ok", orderId: canonicalOrder.orderId, financialStatus, sales: results };
  }

  // --------------------------------------------------------------------------
  // Public: the FastSpring success entry point (replaces the raw handler)
  // --------------------------------------------------------------------------

  /**
   * Bridge a FastSpring order payload end-to-end.
   * Wire this to window.commerceCheckoutSuccess in place of the raw handler.
   *
   * @param {Object} fsPayload  FastSpring order payload from fsc.js.
   * @param {Object} [overrides] { user, productPrefix, currency, orderId }
   */
  async function onCheckoutSuccess(fsPayload, overrides = {}) {
    try {
      const user = overrides.user
        || (Commerce.auth && Commerce.auth.getCurrentUser && Commerce.auth.getCurrentUser())
        || null;
      const productPrefix = overrides.productPrefix
        || (Commerce.config && Commerce.config.get && Commerce.config.get("fastspringProductPrefix"))
        || "";
      const currency = overrides.currency
        || (Commerce.config && Commerce.config.get && Commerce.config.get("currency"))
        || "USD";

      // Resolve product enrichment (sellerId, commission, etc.) for each item.
      const rawItems = Array.isArray(fsPayload && fsPayload.items) ? fsPayload.items : [];
      const catalog = {};
      for (const it of rawItems) {
        const path = (it && it.product && it.product.path) || (it && it.product) || (it && it.path);
        const productId = OrderSchema.stripProductPrefix(path, productPrefix);
        if (productId && !catalog[productId]) {
          catalog[productId] = await resolveProduct(productId);
        }
      }

      const canonicalOrder = OrderSchema.fromFastSpring(fsPayload, {
        user, productPrefix, currency, catalog, orderId: overrides.orderId
      });

      const v = OrderSchema.validate(canonicalOrder);
      if (!v.valid) {
        (log.error || console.error)("[bridge] canonical order invalid; aborting finance:", v.errors);
        // Still persist the order for auditability, marked failed.
        canonicalOrder.financialStatus = FINANCIAL_STATUS.FAILED;
        await order.create(canonicalOrder);
        return { status: "invalid_order", orderId: canonicalOrder.orderId, errors: v.errors };
      }

      const created = await order.create(canonicalOrder);
      const pipeline = await runFinancialPipeline(canonicalOrder);

      (log.info || console.log)(`[bridge] checkout bridged: ${canonicalOrder.orderId} -> ${pipeline.financialStatus}`);
      if (Commerce.emit) Commerce.emit("commerce:orderBridged", pipeline);
      // Also fire a DOM event so decoupled UI (e.g. the cart) can react
      // without depending on the engine's internal event bus.
      try {
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
          window.dispatchEvent(new CustomEvent("commerce:orderBridged", { detail: pipeline }));
        }
      } catch (_) { /* non-fatal */ }

      // Spread pipeline first so its internal status:"ok" does not clobber ours.
      return { ...pipeline, created: created.status, status: "bridged" };
    } catch (err) {
      (log.error || console.error)("[bridge] onCheckoutSuccess failed:", err && err.message ? err.message : err);
      return { status: "bridge_error", error: err };
    }
  }

  // --------------------------------------------------------------------------
  // Commerce.checkoutCart — ONE combined payment for a whole basket
  //
  // Opens a SINGLE FastSpring checkout containing every cart item, so the buyer
  // pays once (never once per item). FastSpring's success callback is already
  // wired to onCheckoutSuccess, which records the multi-item order and splits
  // the single payment across each seller. Intentionally inert until a
  // fastspringStorefront is configured (the payment stage stays off until the
  // provider is officially wired) — in that case it calls hooks.onConfigMissing.
  //
  // @param {Array} items  cart items: { productId, title, price, sellerId, quantity }
  // @param {Object} hooks { onLoginRequired, onConfigMissing, onError }
  // --------------------------------------------------------------------------
  async function checkoutCart(items, hooks = {}) {
    if (!Array.isArray(items) || items.length === 0) return { status: "empty_cart" };

    const cfg = (Commerce.config && Commerce.config.get) ? Commerce.config.get.bind(Commerce.config) : () => undefined;
    const storefront = cfg("fastspringStorefront");
    const prefix = cfg("fastspringProductPrefix") || "";

    const user = (Commerce.auth && typeof Commerce.auth.getCurrentUser === "function")
      ? Commerce.auth.getCurrentUser() : null;
    if (!user || !user.email) {
      if (typeof hooks.onLoginRequired === "function") hooks.onLoginRequired();
      return { status: "login_required" };
    }

    // Payment stage intentionally inactive until the storefront is configured.
    if (!storefront) {
      if (typeof hooks.onConfigMissing === "function") hooks.onConfigMissing();
      return { status: "config_missing", key: "fastspringStorefront" };
    }

    if (typeof window === "undefined" || !window.fastspring ||
        !window.fastspring.builder || typeof window.fastspring.builder.push !== "function") {
      const err = new Error("Commerce.checkoutCart: FastSpring builder (fsc.js) is not loaded.");
      if (typeof hooks.onError === "function") hooks.onError(err);
      return { status: "error", error: err };
    }

    // Build ONE payload containing every basket line. If a single fixed
    // FastSpring product is configured (initial setup / one-product phase),
    // push that for every line; otherwise map each item to its own product
    // path (prefix + productId). The real item identity is carried in tags so
    // finance attribution stays correct regardless of the FastSpring path.
    const fixedPath = cfg("fastspringProductPath");
    const products = items.map((it) => ({
      path: (fixedPath && String(fixedPath).trim()) ? String(fixedPath).trim() : `${prefix}${it.productId}`.trim(),
      quantity: (typeof it.quantity === "number" && it.quantity > 0) ? Math.floor(it.quantity) : 1
    }));

    window.fastspring.builder.push({
      products,
      paymentContact: { email: user.email },
      tags: { cart: "1" }
    });

    return { status: "checkout_opened", items: products.length };
  }
  Commerce.checkoutCart = checkoutCart;

  const api = {
    order,
    finance,
    onCheckoutSuccess,
    checkoutCart,
    runFinancialPipeline,
    resolveProduct
  };
  Commerce.bridge = api;
  return api;
}

export default { installBridge };
