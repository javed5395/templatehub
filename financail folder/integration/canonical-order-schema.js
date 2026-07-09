// ============================================================================
// canonical-order-schema.js  —  Integration Foundation, Layer 1
// LazyDogTemplates Marketplace
//
// THE SINGLE SOURCE OF TRUTH for the shape of an order as it crosses the
// Commerce -> Financial boundary.
//
// Before this file existed, three layers each assumed a different order shape:
//   * commerce.js checkoutSuccessHandler wrote:  { fastspringOrderId, items:[{product}], total, uid }
//   * cart_core.js buyer library READ:           { buyerId, orderId, items:[{productId, sellerId}], financialStatus }
//   * sales-records_1.js processTransaction READ: { sellerUid, buyerUid, templateId, grossAmount, commissionRate }
//
// This module defines ONE canonical order object and the pure, deterministic
// adapters that project it into each consumer's expected shape. It performs
// NO Firestore I/O and has NO side effects, so it is fully unit-testable in
// isolation (see integration/__tests__/foundation.test.mjs).
//
// It does NOT modify any existing engine. It is additive glue only.
// ============================================================================

// ----------------------------------------------------------------------------
// Firestore collection names — centralized so every layer agrees on them.
// These match the names the existing engines already use internally.
// ----------------------------------------------------------------------------
export const COLLECTIONS = Object.freeze({
  ORDERS: "orders",              // canonical order docs (buyer library reads these)
  SALES_RECORDS: "salesRecords", // financial engine Module 4 input (processTransaction reads these)
  TRANSACTIONS: "transactions",  // financial engine Module 4 output
  PAYOUT_QUEUE: "payoutQueue",
  PAYMENT_JOBS: "paymentJobs",
  AUDIT_TRAIL: "auditTrail"
});

// Order lifecycle status (commerce side).
export const ORDER_STATUS = Object.freeze({
  CREATED: "created",
  PAID: "paid",
  CANCELLED: "cancelled",
  REFUNDED: "refunded"
});

// Financial lifecycle status (finance side). Kept intentionally aligned with
// the tokens Commerce.library.hasAccess() already accepts as "settled".
export const FINANCIAL_STATUS = Object.freeze({
  PENDING: "pending",             // order paid, not yet through the financial engine
  RECORDED: "submitted_to_ledger",// recordSale written to salesRecords
  SETTLED: "settled",             // processTransaction produced a transaction doc
  REFUNDED: "refunded",
  FAILED: "failed"
});

// ----------------------------------------------------------------------------
// Internal helpers (pure)
// ----------------------------------------------------------------------------
function _str(v) {
  return (v === null || v === undefined) ? "" : String(v).trim();
}
function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function _round2(n) {
  return Number((Math.round(Number(n) * 100) / 100).toFixed(2));
}

/**
 * Strip a configurable FastSpring product-path prefix to recover the raw
 * marketplace productId. Example: prefix "templates-" + "templates-abc123"
 * -> "abc123". If the path does not start with the prefix, it is returned
 * unchanged (defensive — never throws).
 */
export function stripProductPrefix(productPath, prefix) {
  const path = _str(productPath);
  const p = _str(prefix);
  if (p && path.startsWith(p)) return path.slice(p.length);
  return path;
}

// ----------------------------------------------------------------------------
// Canonical order factory
// ----------------------------------------------------------------------------

/**
 * Build a canonical order object from already-normalized parts.
 * This is the internal shape every layer reads/writes.
 *
 * @param {Object} parts
 * @param {string}  parts.orderId       Stable canonical order id (doc id in ORDERS).
 * @param {string?} parts.buyerId       Buyer uid.
 * @param {string?} parts.buyerEmail
 * @param {string?} parts.provider      Auth provider ("google" | "email" | ...).
 * @param {string}  parts.source        Origin system, e.g. "fastspring".
 * @param {Object?} parts.externalRef   Provider-specific ids (audit).
 * @param {string}  parts.currency      ISO code.
 * @param {Array}   parts.items         Array of canonical line items.
 * @param {Object?} parts.rawPayload    Original provider payload (audit).
 * @param {string?} parts.createdDate   ISO string (defaults to now).
 * @returns {Object} canonical order
 */
export function createCanonicalOrder(parts = {}) {
  const items = Array.isArray(parts.items) ? parts.items.map(normalizeItem) : [];
  const grossAmount = _round2(items.reduce((sum, it) => sum + _num(it.lineAmount), 0));

  return {
    schemaVersion: 1,
    orderId: _str(parts.orderId),
    buyerId: parts.buyerId ? _str(parts.buyerId) : null,
    buyerEmail: parts.buyerEmail ? _str(parts.buyerEmail) : null,
    provider: parts.provider ? _str(parts.provider) : null,
    source: _str(parts.source) || "unknown",
    externalRef: parts.externalRef && typeof parts.externalRef === "object" ? parts.externalRef : {},
    currency: _str(parts.currency).toUpperCase() || "USD",
    grossAmount,
    orderStatus: _str(parts.orderStatus) || ORDER_STATUS.PAID,
    financialStatus: _str(parts.financialStatus) || FINANCIAL_STATUS.PENDING,
    items,
    createdDate: _str(parts.createdDate) || new Date().toISOString(),
    rawPayload: parts.rawPayload || null
  };
}

/**
 * Normalize a single line item into the canonical item shape.
 * lineAmount defaults to unitAmount * quantity when not supplied.
 */
export function normalizeItem(raw = {}) {
  const quantity = Math.max(1, Math.round(_num(raw.quantity) || 1));
  const unitAmount = _round2(raw.unitAmount);
  const lineAmount = raw.lineAmount !== undefined
    ? _round2(raw.lineAmount)
    : _round2(unitAmount * quantity);

  const rate = raw.commissionRate;
  const commissionRate = (rate === null || rate === undefined || rate === "")
    ? null
    : Number(rate);

  return {
    productId: _str(raw.productId),
    productTitle: raw.productTitle ? _str(raw.productTitle) : null,
    sellerId: raw.sellerId ? _str(raw.sellerId) : null,
    quantity,
    unitAmount,
    lineAmount,
    commissionRate
  };
}

// ----------------------------------------------------------------------------
// Adapter: FastSpring payload -> canonical order
// ----------------------------------------------------------------------------

/**
 * Convert a FastSpring order payload (as delivered to fsc.js callbacks) into a
 * canonical order. PURE: any per-product enrichment (sellerId, title,
 * commissionRate, unitAmount) that FastSpring cannot know must be supplied via
 * `context.catalog` — a map of productId -> { sellerId, productTitle,
 * commissionRate, unitAmount }. The bridge resolves that map asynchronously
 * from the product catalog BEFORE calling this function, keeping this adapter
 * side-effect free.
 *
 * @param {Object} fsPayload  FastSpring order payload.
 * @param {Object} context
 * @param {Object?} context.user          { uid, email, provider }
 * @param {string?} context.productPrefix FastSpring product-path prefix to strip.
 * @param {Object?} context.catalog       productId -> enrichment map.
 * @param {string?} context.orderId       Override canonical order id.
 * @returns {Object} canonical order
 */
export function fromFastSpring(fsPayload = {}, context = {}) {
  const user = context.user || {};
  const prefix = context.productPrefix || "";
  const catalog = context.catalog || {};

  const orderId = _str(context.orderId) ||
    _str(fsPayload.id) ||
    _str(fsPayload.reference) ||
    `ord_${Date.now()}`;

  const rawItems = Array.isArray(fsPayload.items) ? fsPayload.items : [];

  const items = rawItems.map((it) => {
    const productPath = (it && it.product && it.product.path) || (it && it.product) || it && it.path;
    const productId = stripProductPrefix(productPath, prefix);
    const enrich = catalog[productId] || {};
    return normalizeItem({
      productId,
      productTitle: enrich.productTitle || (it && it.display) || null,
      sellerId: enrich.sellerId || null,
      quantity: (it && it.quantity) || 1,
      unitAmount: enrich.unitAmount !== undefined ? enrich.unitAmount : (it && (it.unitPrice || it.priceValue)),
      lineAmount: (it && (it.subtotalValue !== undefined ? it.subtotalValue : undefined)),
      commissionRate: enrich.commissionRate !== undefined ? enrich.commissionRate : null
    });
  });

  return createCanonicalOrder({
    orderId,
    buyerId: user.uid || null,
    buyerEmail: user.email || null,
    provider: user.provider || null,
    source: "fastspring",
    externalRef: {
      fastspringOrderId: _str(fsPayload.id) || null,
      fastspringReference: _str(fsPayload.reference) || null
    },
    currency: fsPayload.currency || context.currency || "USD",
    items,
    rawPayload: fsPayload
  });
}

// ----------------------------------------------------------------------------
// Adapter: canonical order -> financial-engine sale records
// ----------------------------------------------------------------------------

/**
 * Project a canonical order into one or more sale-record documents shaped for
 * the Financial Engine (sales-records_1.js Module 4 `processTransaction`, which
 * reads salesRecords/{saleId} and feeds it to calculateCommission).
 *
 * The existing engine is keyed one sale-record per document id. A single-item
 * order therefore maps to ONE record keyed by the orderId (the common buyNow
 * path). A multi-item order maps to N records keyed `${orderId}__${index}` so
 * each seller's line becomes its own immutable transaction — WITHOUT changing
 * the engine.
 *
 * @param {Object} order canonical order
 * @returns {Array<Object>} sale records: { saleId, orderId, sellerUid, buyerUid, templateId, grossAmount, currency, commissionRate }
 */
export function toSalesRecords(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) return [];
  const multi = order.items.length > 1;

  return order.items.map((item, i) => ({
    saleId: multi ? `${order.orderId}__${i}` : order.orderId,
    orderId: order.orderId,
    sellerUid: item.sellerId || null,
    buyerUid: order.buyerId || null,
    templateId: item.productId,
    grossAmount: _num(item.lineAmount),
    currency: order.currency,
    // null => financial engine falls back to configured basePlatformCommissionRate
    commissionRate: (item.commissionRate === null || item.commissionRate === undefined)
      ? null
      : Number(item.commissionRate)
  }));
}

// ----------------------------------------------------------------------------
// Adapter: canonical order -> buyer-library shape
// ----------------------------------------------------------------------------

/**
 * Project the canonical order into exactly the shape cart_core.js
 * Commerce.library.list() expects to read out of the ORDERS collection.
 * Because the canonical order is authored with these field names, this is
 * essentially a safe projection — proving the schema mismatch is resolved.
 *
 * @param {Object} order canonical order
 * @returns {Object} buyer-library order view
 */
export function toLibraryOrder(order) {
  return {
    orderId: order.orderId,
    buyerId: order.buyerId,
    createdDate: order.createdDate,
    financialStatus: order.financialStatus,
    orderStatus: order.orderStatus,
    items: (order.items || []).map((it) => ({
      productId: it.productId,
      productTitle: it.productTitle,
      sellerId: it.sellerId,
      quantity: it.quantity
    }))
  };
}

// ----------------------------------------------------------------------------
// Validation (pure)
// ----------------------------------------------------------------------------

/**
 * Validate a canonical order for the minimum fields the financial pipeline
 * needs. Returns { valid, errors[] } — never throws.
 */
export function validate(order) {
  const errors = [];
  if (!order || typeof order !== "object") {
    return { valid: false, errors: ["order is not an object"] };
  }
  if (!_str(order.orderId)) errors.push("orderId is required");
  if (!_str(order.currency)) errors.push("currency is required");
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push("order must contain at least one item");
  } else {
    order.items.forEach((it, i) => {
      if (!_str(it.productId)) errors.push(`items[${i}].productId is required`);
      if (!Number.isFinite(Number(it.lineAmount)) || Number(it.lineAmount) < 0) {
        errors.push(`items[${i}].lineAmount must be a non-negative number`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

// Namespaced default export for ergonomic importing.
export const OrderSchema = {
  COLLECTIONS,
  ORDER_STATUS,
  FINANCIAL_STATUS,
  createCanonicalOrder,
  normalizeItem,
  stripProductPrefix,
  fromFastSpring,
  toSalesRecords,
  toLibraryOrder,
  validate
};

export default OrderSchema;
