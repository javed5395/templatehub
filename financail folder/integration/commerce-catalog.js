// ============================================================================
// commerce-catalog.js  —  Integration Foundation, Layer 6 (Live data adapter)
// LazyDogTemplates Marketplace
//
// Repoints the engine stack at the marketplace's REAL collections:
//   * products  -> `templates`  (doc: { status, sellerId, uploader, template:{ name, price, slides, ... } })
//   * sellers   -> `sellers`    (doc: { name, phone, email, shopName, payout, ... })
//
// The pre-built engines referenced `products` / `productDrafts` / `contributors`,
// which the live site does not use. Rather than move data or edit the engines,
// this adapter provides a single read layer (`Commerce.catalog`) and the
// `resolveProduct()` the bridge uses to attribute each sale to a seller.
//
// Read-only. No writes, no engine edits.
// ============================================================================

const TEMPLATES_COLLECTION = "templates";
const SELLERS_COLLECTION = "sellers";

/**
 * Normalize the marketplace price field (which is either the string "free",
 * the string "pro", or a decimal string like "13.00") into a numeric amount.
 * "free"/"pro"/blank => 0. Anything unpariseable => 0.
 */
export function normalizePrice(priceRaw) {
  if (priceRaw === null || priceRaw === undefined) return 0;
  const s = String(priceRaw).trim().toLowerCase();
  if (s === "" || s === "free" || s === "pro" || s === "0") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Install Commerce.catalog and return it.
 *
 * @param {Object} ctx
 * @param {Object} ctx.Commerce
 * @param {() => Promise<{db:Object}>} ctx.ensureFirebase  shared v8-compat db resolver
 * @returns {Object} catalog API
 */
export function installCatalog(ctx = {}) {
  const { Commerce, ensureFirebase } = ctx;
  if (!Commerce) throw new Error("installCatalog: ctx.Commerce is required.");
  if (typeof ensureFirebase !== "function") throw new Error("installCatalog: ctx.ensureFirebase is required.");

  /** Raw template document data ({ ...topLevel, template:{...} }) or null. */
  async function getTemplate(templateId) {
    if (!templateId) return null;
    const { db } = await ensureFirebase();
    const snap = await db.collection(TEMPLATES_COLLECTION).doc(String(templateId).trim()).get();
    return snap.exists ? snap.data() : null;
  }

  /** Raw seller profile document data or null. */
  async function getSeller(uid) {
    if (!uid) return null;
    const { db } = await ensureFirebase();
    const snap = await db.collection(SELLERS_COLLECTION).doc(String(uid).trim()).get();
    return snap.exists ? snap.data() : null;
  }

  /**
   * The seller/price enrichment the bridge needs, resolved from a real
   * `templates` doc. FastSpring payloads carry no sellerId, so this lookup is
   * how a completed sale is attributed to a contributor.
   *
   * @param {string} productId  a templates doc id
   * @returns {Promise<{sellerId, productTitle, commissionRate, unitAmount}>}
   */
  async function resolveProduct(productId) {
    const data = await getTemplate(productId);
    if (!data) return {};
    const t = data.template || {};
    return {
      sellerId: data.sellerId || t.sellerId || null,
      productTitle: t.name || null,
      commissionRate: (data.commissionRate !== undefined ? data.commissionRate
        : (t.commissionRate !== undefined ? t.commissionRate : null)),
      unitAmount: normalizePrice(t.price)
    };
  }

  /**
   * Convenience: is this template a paid product?  ('free'/'pro'/0 => false)
   */
  function isPaid(templateData) {
    const t = (templateData && templateData.template) || templateData || {};
    return normalizePrice(t.price) > 0;
  }

  const catalog = {
    COLLECTIONS: { TEMPLATES: TEMPLATES_COLLECTION, SELLERS: SELLERS_COLLECTION },
    getTemplate,
    getSeller,
    resolveProduct,
    isPaid,
    normalizePrice
  };
  Commerce.catalog = catalog;
  return catalog;
}

export default { installCatalog, normalizePrice };
