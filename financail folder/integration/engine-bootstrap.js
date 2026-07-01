// ============================================================================
// engine-bootstrap.js  —  Integration Foundation, Layer 5 (Orchestrator)
// LazyDogTemplates Marketplace
//
// THE SINGLE ENTRY POINT a page loads to bring the whole commerce + financial
// stack online, in the one correct order, on a single Firebase connection.
//
// Page usage (migration phase — not applied to any page yet):
//
//   <script type="module">
//     import { bootstrapCommerce } from './financail folder/integration/engine-bootstrap.js';
//     const report = await bootstrapCommerce({
//       fastspringStorefront: 'youraccount.onfastspring.com',
//       fastspringProductPrefix: 'templates-',
//       currency: 'USD',
//       basePlatformCommissionRate: 0.30
//     });
//     console.table(report.checks);
//   </script>
//
// Load order (each step is a prerequisite of the next):
//   1. Firebase v9 app + firestore  (reuses commerce.js's app/config)
//   2. v8-compat db facade + window.firebase shim         (Layer 2)
//   3. Financial Module 1&2 globals + recordSale          (Layer 3)
//   4. import sales_records.js        -> window.SalesRecords
//   5. import sales-records_1.js      -> window.SalesRecordsContinuation
//   6. import sales_record-2.js       -> window.SalesRecordsLifecycle
//   7. import commerce.js             -> window.Commerce (+ config)
//   8. install bridge                 -> Commerce.order / .finance / .bridge   (Layer 4)
//   9. import cart_core.js (IIFE)     -> Commerce.library   (guard now passes)
//  10. wire FastSpring callbacks + verify linkage -> status report
//
// The existing engine files are imported AS-IS. None are modified.
// ============================================================================

import { createCompatDb, installFirebaseCompatGlobal } from "./firestore-compat.js";
import { installFinancialGlobals } from "./financial-foundation.js";
import { installBridge } from "./commerce-finance-bridge.js";
import { installCatalog } from "./commerce-catalog.js";
import { OrderSchema } from "./canonical-order-schema.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
  authDomain: "templatehub-16cd7.firebaseapp.com",
  projectId: "templatehub-16cd7",
  storageBucket: "templatehub-16cd7.firebasestorage.app",
  messagingSenderId: "143000893683",
  appId: "1:143000893683:web:fd694de96f8c0fa6569f86"
};
const FIREBASE_SDK_VERSION = "10.7.0";

// Resolve sibling engine files relative to THIS module, regardless of the
// page's own path. Engines live one directory up (the "financail folder").
const ENGINE = (name) => new URL(`../${name}`, import.meta.url).href;

let _bootPromise = null;
let _report = null;

/**
 * Bring the full stack online. Idempotent — repeated calls return the same
 * promise/report.
 *
 * @param {Object} opts
 * @param {string}  [opts.fastspringStorefront]
 * @param {string}  [opts.fastspringProductPrefix]
 * @param {string}  [opts.currency="USD"]
 * @param {number}  [opts.basePlatformCommissionRate=0.30]
 * @param {Object}  [opts.authProvider]     { getCurrentUser() } — overrides built-in auth wiring
 * @param {Function}[opts.resolveProduct]   async (productId) => { sellerId, productTitle, commissionRate, unitAmount }
 * @param {boolean} [opts.wireFastSpringCallbacks=true]
 * @returns {Promise<Object>} status report
 */
export function bootstrapCommerce(opts = {}) {
  if (_bootPromise) return _bootPromise;
  _bootPromise = _run(opts).catch((err) => {
    _bootPromise = null; // allow retry on hard failure
    throw err;
  });
  return _bootPromise;
}

async function _run(opts) {
  const scope = (typeof window !== "undefined") ? window : globalThis;
  const checks = {};
  const errors = [];
  const mark = (name, ok, detail) => { checks[name] = { ok: !!ok, detail: detail || null }; if (!ok) errors.push(name); };

  // -- Step 1: Firebase v9 app + firestore (reuse commerce.js's app) ----------
  const appMod = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
  );
  const fsApi = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
  );
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
  const v9db = fsApi.getFirestore(app);
  mark("firebase_init", !!v9db, "app+firestore ready (v9)");

  // -- Step 2: compat db + window.firebase shim -------------------------------
  const compatDb = createCompatDb(v9db, fsApi);
  installFirebaseCompatGlobal(compatDb, fsApi, scope);
  const ensureFirebase = async () => ({ db: compatDb, app });
  mark("firestore_compat", typeof compatDb.collection === "function", "v8-over-v9 facade installed");

  // -- Step 3: financial Module 1&2 globals -----------------------------------
  installFinancialGlobals({
    ensureFirebase,
    configDefaults: {
      basePlatformCommissionRate: opts.basePlatformCommissionRate ?? 0.30,
      currency: opts.currency || "USD"
    }
  }, scope);
  mark("financial_globals", typeof scope.recordSale === "function", "event/config/logger/validator/recordSale installed");

  // -- Step 4: financial core (sales_records.js) ------------------------------
  try {
    const core = await import(ENGINE("sales_records.js"));
    scope.SalesRecords = core.default || core.SalesRecords;
    mark("sales_records", !!(scope.SalesRecords && scope.SalesRecords.engine), "window.SalesRecords registered");
  } catch (e) { mark("sales_records", false, e && e.message); }

  // -- Step 5: continuation (sales-records_1.js) ------------------------------
  try {
    const cont = await import(ENGINE("sales-records_1.js"));
    scope.SalesRecordsContinuation = cont.default || cont.SalesRecordsContinuation;
    mark("sales_records_1", !!(scope.SalesRecordsContinuation && scope.SalesRecordsContinuation.transaction),
      "window.SalesRecordsContinuation registered");
  } catch (e) { mark("sales_records_1", false, e && e.message); }

  // -- Step 6: lifecycle (sales_record-2.js) ----------------------------------
  try {
    const life = await import(ENGINE("sales_record-2.js"));
    scope.SalesRecordsLifecycle = life.default || life.SalesRecordsLifecycle || scope.SalesRecordsLifecycle;
    mark("sales_records_2", !!(scope.SalesRecordsLifecycle && scope.SalesRecordsLifecycle.settlement),
      "window.SalesRecordsLifecycle registered");
  } catch (e) { mark("sales_records_2", false, e && e.message); }

  // -- Step 7: commerce.js ----------------------------------------------------
  try {
    const commerceMod = await import(ENGINE("commerce.js"));
    const Commerce = commerceMod.default || commerceMod.Commerce;
    // Preserve anything already attached to window.Commerce by earlier-loaded
    // modules (e.g. Commerce.cart, installed site-wide by navbar's cart_core.js)
    // so registering the engine here does NOT wipe the basket.
    const _priorCommerce = scope.Commerce;
    if (_priorCommerce && typeof _priorCommerce === "object") {
      Object.keys(_priorCommerce).forEach(function (k) { if (!(k in Commerce)) Commerce[k] = _priorCommerce[k]; });
    }
    scope.Commerce = Commerce; // pages read the global `Commerce`

    if (opts.fastspringStorefront) Commerce.config.set("fastspringStorefront", opts.fastspringStorefront);
    if (opts.fastspringProductPrefix !== undefined) Commerce.config.set("fastspringProductPrefix", opts.fastspringProductPrefix);
    if (opts.fastspringProductPath) Commerce.config.set("fastspringProductPath", opts.fastspringProductPath);
    Commerce.config.set("currency", opts.currency || "USD");

    // Wire an auth provider so buyNow() can see the signed-in user.
    if (opts.authProvider && typeof opts.authProvider.getCurrentUser === "function") {
      Commerce.setAuthProvider(opts.authProvider);
    } else if (Commerce.auth && typeof Commerce.auth.getCurrentUser === "function") {
      Commerce.setAuthProvider({ getCurrentUser: () => Commerce.auth.getCurrentUser() });
    }

    // External callers (cart_core, bridge) get the shared v8-compat db.
    // commerce.js's INTERNAL functions keep using their own v9 resolver — this
    // only overrides the exposed property, so checkout audit writes are intact.
    Commerce._ensureFirebase = ensureFirebase;

    mark("commerce", typeof Commerce.buyNow === "function", "window.Commerce registered + configured");
  } catch (e) { mark("commerce", false, e && e.message); }

  // -- Step 7b: live-data catalog (templates/sellers) -------------------------
  let catalog = null;
  try {
    catalog = installCatalog({ Commerce: scope.Commerce, ensureFirebase });
    mark("catalog", !!(scope.Commerce && scope.Commerce.catalog && typeof scope.Commerce.catalog.getTemplate === "function"),
      "Commerce.catalog (templates/sellers) installed");
  } catch (e) { mark("catalog", false, e && e.message); }

  // -- Step 8: bridge + Commerce.order / Commerce.finance ---------------------
  try {
    installBridge({
      Commerce: scope.Commerce,
      SalesRecords: scope.SalesRecords,
      SalesRecordsContinuation: scope.SalesRecordsContinuation,
      SalesRecordsLifecycle: scope.SalesRecordsLifecycle,
      ensureFirebase,
      // Attribute sales to sellers using the REAL templates collection.
      resolveProduct: opts.resolveProduct || (catalog && catalog.resolveProduct)
    });
    mark("bridge", !!(scope.Commerce && scope.Commerce.order && scope.Commerce.finance && scope.Commerce.bridge),
      "Commerce.order / .finance / .bridge installed");
  } catch (e) { mark("bridge", false, e && e.message); }

  // -- Step 9: buyer purchase library (guard now satisfied) ------------------
  // NOTE: the library lives in commerce_purchase-varification.js. cart_core.js
  // is the separate shopping-cart (loaded site-wide by navbar), NOT the library.
  try {
    await import(ENGINE("commerce_purchase-varification.js"));
    mark("purchase_library", !!(scope.Commerce && scope.Commerce.library && typeof scope.Commerce.library.list === "function"),
      "Commerce.library attached");
  } catch (e) { mark("purchase_library", false, e && e.message); }

  // -- Step 10: FastSpring callbacks + linkage verification -------------------
  if (opts.wireFastSpringCallbacks !== false && scope.Commerce && scope.Commerce.bridge) {
    // The bridged handler REPLACES the raw checkoutSuccessHandler so every
    // completed checkout enters the financial lifecycle.
    scope.commerceCheckoutSuccess = (payload) => scope.Commerce.bridge.onCheckoutSuccess(payload);
    scope.commerceCheckoutCancel = scope.Commerce.checkoutCancelHandler;
    mark("fastspring_callbacks", typeof scope.commerceCheckoutSuccess === "function", "success->bridge, cancel->engine");
  }

  // Runtime linkage self-tests exposed by the engines themselves.
  try {
    mark("link_continuation",
      !!(scope.SalesRecordsContinuation && scope.SalesRecordsContinuation.verifyLinkage()),
      "SalesRecordsContinuation bridged to core");
  } catch (e) { mark("link_continuation", false, e && e.message); }
  try {
    mark("link_lifecycle",
      !!(scope.SalesRecordsLifecycle && scope.SalesRecordsLifecycle.verifyLinkage()),
      "SalesRecordsLifecycle bridged to core+continuation");
  } catch (e) { mark("link_lifecycle", false, e && e.message); }

  _report = {
    ok: errors.length === 0,
    failed: errors,
    checks,
    registered: {
      SalesRecords: !!scope.SalesRecords,
      SalesRecordsContinuation: !!scope.SalesRecordsContinuation,
      SalesRecordsLifecycle: !!scope.SalesRecordsLifecycle,
      Commerce: !!scope.Commerce,
      "Commerce.order": !!(scope.Commerce && scope.Commerce.order),
      "Commerce.finance": !!(scope.Commerce && scope.Commerce.finance),
      "Commerce.library": !!(scope.Commerce && scope.Commerce.library),
      "Commerce.catalog": !!(scope.Commerce && scope.Commerce.catalog),
      "Commerce.bridge": !!(scope.Commerce && scope.Commerce.bridge)
    },
    schema: { collections: OrderSchema.COLLECTIONS },
    bootedAt: new Date().toISOString()
  };

  if (scope.SalesRecords && scope.SalesRecords.logger) {
    scope.SalesRecords.logger.info(
      `Commerce+Financial foundation bootstrapped. ok=${_report.ok} failed=[${errors.join(", ")}]`
    );
  }
  return _report;
}

/** Return the last bootstrap report (or null if not booted). */
export function getBootstrapReport() { return _report; }

export default { bootstrapCommerce, getBootstrapReport };
