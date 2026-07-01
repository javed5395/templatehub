// ============================================================================
// financial-foundation.js  —  Integration Foundation, Layer 3
// LazyDogTemplates Marketplace
//
// The Financial Engine ships only Module 3 (sales_records.js — commission math).
// Its Modules 1 & 2 — the shared event bus, config store, logger, validator,
// Firebase resolver, and the `recordSale` ledger writer — DO NOT EXIST as files,
// yet sales_records.js references them as bare (global) identifiers:
//
//     export const SalesRecords = {
//       on: eventOn, off: eventOff, ...            // <- undefined without us
//       config: { get: configGet, ... },           // <- undefined without us
//       logger: { warn: loggerWarn, ... },          // <- undefined without us
//       validator: { required: validatorRequired },  // <- undefined without us
//       _ensureFirebase,                              // <- undefined without us
//       ledger: { recordSale },                       // <- undefined without us
//       engine: { calculateCommission }               // (this one IS in the file)
//     };
//
// As written, evaluating sales_records.js throws ReferenceError immediately, so
// the ENTIRE SalesRecords chain cannot load. This module supplies those missing
// primitives on the global scope BEFORE sales_records.js is imported, making the
// engine loadable WITHOUT editing it.
//
// A free identifier inside an ES module that is neither declared nor imported
// resolves against the global object at runtime. Installing these on globalThis
// therefore satisfies sales_records.js's references.
// ============================================================================

let _installed = false;

/**
 * Install the financial-core Module 1 & 2 primitives on the global scope.
 * Idempotent: safe to call more than once.
 *
 * @param {Object} deps
 * @param {() => Promise<{ db: Object }>} deps.ensureFirebase  Resolver returning
 *        a v8-compat db (from the compat shim). Wired by the bootstrap.
 * @param {Object} [deps.configDefaults]  Seed config values, e.g.
 *        { basePlatformCommissionRate: 0.30, currency: "USD" }.
 * @param {Object} [target=globalThis]
 * @returns {Object} handles to the installed primitives (for testing).
 */
export function installFinancialGlobals(deps = {}, target) {
  const scope = target || globalThis;
  const ensureFirebase = deps.ensureFirebase;

  if (typeof ensureFirebase !== "function") {
    throw new Error("installFinancialGlobals: deps.ensureFirebase is required.");
  }

  // --------------------------------------------------------------------------
  // Module 1a — Event bus  (Map<eventName, Set<callback>>)
  // --------------------------------------------------------------------------
  const _listeners = scope.__finListeners || (scope.__finListeners = new Map());

  function eventOn(name, cb) {
    if (typeof cb !== "function") return function () {};
    if (!_listeners.has(name)) _listeners.set(name, new Set());
    _listeners.get(name).add(cb);
    return function off() { eventOff(name, cb); };
  }
  function eventOff(name, cb) {
    const set = _listeners.get(name);
    if (set) set.delete(cb);
  }
  function eventOnce(name, cb) {
    const wrapper = (payload) => { eventOff(name, wrapper); cb(payload); };
    return eventOn(name, wrapper);
  }
  function eventEmit(name, payload) {
    const set = _listeners.get(name);
    if (!set) return;
    set.forEach((cb) => {
      try { cb(payload); } catch (e) { console.error("[finance event] listener error:", e); }
    });
  }

  // --------------------------------------------------------------------------
  // Module 1b — Config store
  // --------------------------------------------------------------------------
  const _config = scope.__finConfig || (scope.__finConfig = new Map());

  function configGet(key) { return _config.has(key) ? _config.get(key) : undefined; }
  function configSet(key, value) { _config.set(key, value); return value; }
  function configHas(key) { return _config.has(key); }
  function configRemove(key) { return _config.delete(key); }
  function configReset() { _config.clear(); }
  function configGetAll() { return Object.fromEntries(_config.entries()); }

  // Seed defaults (only if not already present — never overwrite live config).
  const defaults = Object.assign(
    { basePlatformCommissionRate: 0.30, currency: "USD" },
    deps.configDefaults || {}
  );
  Object.keys(defaults).forEach((k) => { if (!_config.has(k)) _config.set(k, defaults[k]); });

  // --------------------------------------------------------------------------
  // Module 1c — Logger  (bounded history)
  // --------------------------------------------------------------------------
  const _history = scope.__finLog || (scope.__finLog = []);
  const LOG_CAP = 500;
  function _log(level, message, data) {
    const entry = { level, message, data: data ?? null, ts: new Date().toISOString() };
    _history.push(entry);
    if (_history.length > LOG_CAP) _history.shift();
    const fn = level === "error" ? console.error
      : level === "warn" ? console.warn
      : level === "debug" ? console.debug
      : console.log;
    fn(`[SalesRecords ${level}] ${message}`, data !== undefined ? data : "");
    return entry;
  }
  function loggerInfo(m, d) { return _log("info", m, d); }
  function loggerWarn(m, d) { return _log("warn", m, d); }
  function loggerError(m, d) { return _log("error", m, d); }
  function loggerDebug(m, d) { return _log("debug", m, d); }
  function loggerGetHistory() { return _history.slice(); }
  function loggerClear() { _history.length = 0; }

  // --------------------------------------------------------------------------
  // Module 1d — Validator
  // --------------------------------------------------------------------------
  function validatorRequired(v) { return v !== null && v !== undefined && v !== ""; }
  function validatorNumber(v) { return typeof v === "number" && Number.isFinite(v); }
  function validatorPositiveNumber(v) { return validatorNumber(v) && v > 0; }
  function validatorNonEmptyString(v) { return typeof v === "string" && v.trim().length > 0; }

  // --------------------------------------------------------------------------
  // Module 1e — Firebase resolver (returns the shared v8-compat db)
  // --------------------------------------------------------------------------
  const _ensureFirebase = ensureFirebase;

  // --------------------------------------------------------------------------
  // Module 2 — Ledger writer: recordSale
  //
  // Persists the authoritative "sale fact" that the Financial Engine Module 4
  // (processTransaction) later reads from salesRecords/{saleId}. The document
  // shape is exactly what processTransaction + calculateCommission consume:
  //   { orderId, sellerUid, buyerUid, templateId, grossAmount, currency, commissionRate }
  // Idempotent by saleId. Non-destructive: never overwrites an existing record.
  // --------------------------------------------------------------------------
  async function recordSale(sale) {
    if (!sale || typeof sale !== "object") {
      loggerWarn("recordSale aborted: invalid sale payload.");
      return { status: "invalid_input" };
    }
    const saleId = validatorNonEmptyString(sale.saleId) ? sale.saleId.trim()
      : (validatorNonEmptyString(sale.orderId) ? sale.orderId.trim() : "");

    if (!saleId) { loggerWarn("recordSale aborted: missing saleId/orderId."); return { status: "invalid_input" }; }
    if (!validatorRequired(sale.sellerUid)) { loggerWarn(`recordSale aborted: missing sellerUid for ${saleId}.`); return { status: "missing_seller" }; }
    if (!validatorRequired(sale.templateId)) { loggerWarn(`recordSale aborted: missing templateId for ${saleId}.`); return { status: "missing_product" }; }
    if (!validatorNumber(Number(sale.grossAmount)) || Number(sale.grossAmount) < 0) {
      loggerWarn(`recordSale aborted: invalid grossAmount for ${saleId}.`);
      return { status: "invalid_amount" };
    }

    try {
      const { db } = await _ensureFirebase();
      const ref = db.collection("salesRecords").doc(saleId);
      const existing = await ref.get();
      if (existing.exists) {
        loggerInfo(`recordSale short-circuited: sale already recorded for ${saleId}.`);
        return { status: "already_recorded", saleId };
      }

      const fv = _serverTimestamp(scope);
      const doc = {
        saleId,
        orderId: String(sale.orderId || saleId).trim(),
        sellerUid: String(sale.sellerUid).trim(),
        buyerUid: sale.buyerUid ? String(sale.buyerUid).trim() : null,
        templateId: String(sale.templateId).trim(),
        grossAmount: Number(sale.grossAmount),
        currency: String(sale.currency || configGet("currency") || "USD").toUpperCase(),
        commissionRate: (sale.commissionRate === null || sale.commissionRate === undefined)
          ? null
          : Number(sale.commissionRate),
        recordedAt: fv,
        status: "recorded"
      };

      await ref.set(doc);
      loggerInfo(`Sale fact recorded for ${saleId}.`);
      eventEmit("sale:recorded", { saleId, orderId: doc.orderId, sellerUid: doc.sellerUid, grossAmount: doc.grossAmount });
      return { status: "recorded", saleId };
    } catch (err) {
      loggerError(`recordSale firestore exception for ${saleId}:`, err && err.message ? err.message : err);
      return { status: "firestore_error", error: err };
    }
  }

  // --------------------------------------------------------------------------
  // Install on the global scope so sales_records.js (Module 3) can resolve them.
  // --------------------------------------------------------------------------
  const bindings = {
    eventOn, eventOff, eventOnce, eventEmit,
    configGet, configSet, configHas, configRemove, configReset, configGetAll,
    loggerInfo, loggerWarn, loggerError, loggerDebug, loggerGetHistory, loggerClear,
    validatorRequired, validatorNumber, validatorPositiveNumber, validatorNonEmptyString,
    _ensureFirebase, recordSale
  };
  Object.keys(bindings).forEach((name) => { scope[name] = bindings[name]; });

  _installed = true;
  return bindings;
}

/** Resolve a server timestamp via the installed firebase compat, else Date. */
function _serverTimestamp(scope) {
  try {
    const fv = scope.firebase && scope.firebase.firestore && scope.firebase.firestore.FieldValue;
    if (fv && typeof fv.serverTimestamp === "function") return fv.serverTimestamp();
  } catch (_) { /* ignore */ }
  return new Date();
}

export function isInstalled() { return _installed; }

export default { installFinancialGlobals, isInstalled };
