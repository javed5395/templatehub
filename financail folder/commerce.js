// ============================================================================
// commerce.js
// Independent commerce engine for LazyDogTemplates.
//
// This module is fully self-contained. It does NOT import, require, or
// depend on navbar.js, or any other site file. It owns its own Firebase
// connection and exposes a small public API that any page can call.
//
// Authentication is built into Commerce.auth (Google popup and passwordless
// email link). An external auth provider can also be connected via
// Commerce.setAuthProvider(provider) for custom auth integrations.
//
// Usage from a page:
//
//   <script type="module">
//     import { Commerce } from './commerce.js';
//
//     // Configure FastSpring before any purchase is triggered:
//     Commerce.config.set("fastspringStorefront", "youraccount.onfastspring.com");
//     Commerce.config.set("fastspringProductPrefix", "templates-");
//
//     // Sign the user in:
//     await Commerce.auth.loginWithGoogle();
//
//     // Trigger purchase:
//     document.getElementById('buyBtn').addEventListener('click', () => {
//       Commerce.handleDownload({ id: 'abc123', title: 'Pitch Deck Pro' });
//     });
//
//     // Wire FastSpring result callbacks:
//     window.commerceCheckoutSuccess = Commerce.checkoutSuccessHandler;
//     window.commerceCheckoutCancel  = Commerce.checkoutCancelHandler;
//   </script>
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
  authDomain: "templatehub-16cd7.firebaseapp.com",
  projectId: "templatehub-16cd7",
  storageBucket: "templatehub-16cd7.firebasestorage.app",
  messagingSenderId: "143000893683",
  appId: "1:143000893683:web:fd694de96f8c0fa6569f86"
};

const FIREBASE_SDK_VERSION = "10.7.0";

// ----------------------------------------------------------------------------
// Internal state
// ----------------------------------------------------------------------------

let _app = null;
let _db = null;
let _firestoreApi = null; // holds { collection, addDoc, ... } once loaded
let _initPromise = null;

// Default auth provider: no one is logged in until the real one is supplied.
// Any object with a getCurrentUser() method works. getCurrentUser() should
// return either null, or an object shaped like { email, uid, ... }.
let _authProvider = {
  getCurrentUser: () => null
};

// ----------------------------------------------------------------------------
// Lazy Firebase init — only loads the SDK pieces this engine actually needs.
// Safe to call multiple times; only initializes once.
// ----------------------------------------------------------------------------

async function _ensureFirebase() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { initializeApp, getApps, getApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );
    const firestoreApi = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
    );

    _app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    _db = firestoreApi.getFirestore(_app);
    _firestoreApi = firestoreApi;

    return { app: _app, db: _db };
  })();

  return _initPromise;
}

// ----------------------------------------------------------------------------
// Public: auth provider plug-in point
// ----------------------------------------------------------------------------

/**
 * Connect an external auth provider to this commerce engine.
 * @param {{ getCurrentUser: () => (null | { email?: string, uid?: string }) }} provider
 */
function setAuthProvider(provider) {
  if (!provider || typeof provider.getCurrentUser !== "function") {
    throw new Error(
      "Commerce.setAuthProvider requires an object with a getCurrentUser() method."
    );
  }
  _authProvider = provider;
}

function _getCurrentUser() {
  try {
    return _authProvider.getCurrentUser() || null;
  } catch (err) {
    console.error("Commerce: auth provider threw an error", err);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Internal Event Bus
//
// A lightweight publish/subscribe system, private to this module's closure
// (no globals are created). It allows different parts of commerce.js — and
// future code that calls into Commerce's public API — to react to events
// without being tightly coupled to each other.
//
// This is plumbing only: it carries no business logic and does not emit
// any events on its own. Nothing in this file currently calls `emit()`;
// that wiring is a separate, explicitly-approved task.
// ----------------------------------------------------------------------------

// Map<eventName, Set<callback>>
// A Set is used (rather than an array) so that:
//   - the same callback can't accidentally be registered twice for the
//     same event, and
//   - removal via `off()` is an O(1) operation instead of an array scan.
const _listeners = new Map();

/**
 * Subscribe to an event.
 *
 * @param {string} eventName - Name of the event to listen for.
 * @param {(payload: *) => void} callback - Function invoked when the event fires.
 * @returns {void}
 */
function on(eventName, callback) {
  if (typeof eventName !== "string" || !eventName) return;
  if (typeof callback !== "function") return;

  if (!_listeners.has(eventName)) {
    _listeners.set(eventName, new Set());
  }
  _listeners.get(eventName).add(callback);
}

/**
 * Unsubscribe a previously-registered callback from an event.
 * Safe to call even if the event or callback was never registered —
 * unknown events/callbacks are silently ignored.
 *
 * @param {string} eventName - Name of the event to stop listening for.
 * @param {(payload: *) => void} callback - The exact callback reference passed to on()/once().
 * @returns {void}
 */
function off(eventName, callback) {
  const set = _listeners.get(eventName);
  if (!set) return; // Unknown event — nothing to do.

  set.delete(callback);

  // Memory hygiene: once an event has no more listeners, drop its entry
  // entirely instead of leaving an empty Set sitting in the map forever.
  if (set.size === 0) {
    _listeners.delete(eventName);
  }
}

/**
 * Subscribe to an event for exactly one invocation, then auto-unsubscribe.
 *
 * @param {string} eventName - Name of the event to listen for.
 * @param {(payload: *) => void} callback - Function invoked the next time the event fires.
 * @returns {void}
 */
function once(eventName, callback) {
  if (typeof eventName !== "string" || !eventName) return;
  if (typeof callback !== "function") return;

  // Wrapper removes itself from the listener set before delegating to the
  // original callback, guaranteeing at-most-one invocation.
  const wrapper = (payload) => {
    off(eventName, wrapper);
    callback(payload);
  };

  on(eventName, wrapper);
}

/**
 * Emit an event, synchronously invoking all currently-registered listeners
 * for that event name with the given payload.
 *
 * Unknown events (no listeners registered) are gracefully ignored — this
 * is a no-op rather than an error.
 *
 * A listener that throws is caught and logged so that one bad listener
 * cannot prevent the remaining listeners from running.
 *
 * @param {string} eventName - Name of the event to emit.
 * @param {*} [payload] - Arbitrary data passed through to each listener.
 * @returns {void}
 */
function emit(eventName, payload) {
  const set = _listeners.get(eventName);
  if (!set || set.size === 0) return; // Unknown/unsubscribed event — ignore.

  // Snapshot into an array before iterating. This protects against a
  // listener calling on()/off()/once() for the same event while we're
  // mid-emit, which would otherwise mutate the Set during iteration.
  Array.from(set).forEach((callback) => {
    try {
      callback(payload);
    } catch (err) {
      console.error(`Commerce: listener for "${eventName}" threw an error`, err);
    }
  });
}

// ----------------------------------------------------------------------------
// Internal Configuration Module
//
// A centralized, self-contained store for engine-wide settings. This is
// plumbing only — the values stored here are placeholders for future
// features to read; nothing in this file currently branches on them.
//
// Storage lives in a module-private Map so external code can never reach
// the underlying data structure directly (no reference to it is ever
// exposed). All access goes through the get/set/has/remove/reset/getAll
// functions below.
// ----------------------------------------------------------------------------

// Default configuration values. Frozen so this template object itself can
// never be mutated by accident; reset() always copies fresh from here.
const _CONFIG_DEFAULTS = Object.freeze({
  currency: "USD",
  paymentProvider: null,
  environment: "production",
  checkoutEnabled: false,
  contributorSystemEnabled: false,
  buyerRegistrationRequired: false,
  sellerRegistrationEnabled: false,
  analyticsEnabled: false,
  debugMode: false,
  // FastSpring popup integration.
  // Set both values before calling Commerce.buyNow() or Commerce.handleDownload().
  //   fastspringStorefront    — your FastSpring storefront URL, e.g.
  //                             "youraccount.onfastspring.com"
  //   fastspringProductPrefix — prefix prepended to template.id to form the
  //                             FastSpring product path, e.g. "templates-"
  //                             produces "templates-abc123".
  //                             Set to "" if product paths already match IDs.
  fastspringStorefront: null,
  fastspringProductPrefix: ""
});

// Module-private Map holding the live configuration. Never exposed
// directly — only ever read/written through the functions below.
const _configStore = new Map(Object.entries(_CONFIG_DEFAULTS));

/**
 * Retrieve a configuration value.
 *
 * @param {string} key - Configuration key to look up.
 * @returns {*} The stored value, or undefined if the key doesn't exist
 *   or an invalid key was supplied.
 */
function configGet(key) {
  if (typeof key !== "string" || !key) return undefined;
  return _configStore.get(key);
}

/**
 * Set a configuration value. Creates the key if it doesn't already exist.
 * Invalid keys are ignored gracefully rather than throwing.
 *
 * @param {string} key - Configuration key to set.
 * @param {*} value - Value to store.
 * @returns {boolean} true if the value was stored, false if the key was invalid.
 */
function configSet(key, value) {
  if (typeof key !== "string" || !key) return false;
  _configStore.set(key, value);
  return true;
}

/**
 * Check whether a configuration key currently exists.
 *
 * @param {string} key - Configuration key to check.
 * @returns {boolean} true if the key exists, false otherwise (including for invalid keys).
 */
function configHas(key) {
  if (typeof key !== "string" || !key) return false;
  return _configStore.has(key);
}

/**
 * Remove a configuration key entirely.
 * Safe to call on a key that doesn't exist — this is a no-op, not an error.
 *
 * @param {string} key - Configuration key to remove.
 * @returns {boolean} true if a key was removed, false if it didn't exist or was invalid.
 */
function configRemove(key) {
  if (typeof key !== "string" || !key) return false;
  return _configStore.delete(key);
}

/**
 * Restore configuration to its default values, discarding any overrides
 * and any custom keys that were added beyond the defaults.
 *
 * @returns {void}
 */
function configReset() {
  _configStore.clear();
  for (const [key, value] of Object.entries(_CONFIG_DEFAULTS)) {
    _configStore.set(key, value);
  }
}

/**
 * Get a snapshot of the entire configuration.
 * Always returns a brand-new plain object — mutating the returned object
 * has no effect on internal storage.
 *
 * @returns {Object} A safe copy of all current configuration entries.
 */
function configGetAll() {
  return Object.fromEntries(_configStore);
}

// ----------------------------------------------------------------------------
// Internal Logger Module
//
// In-memory logging for this engine. This is infrastructure only — it is
// not wired into buyNow, the event bus, or any other module; nothing in
// this file currently calls logger.info/warn/error/debug. That wiring is
// a separate, explicitly-approved task.
//
// Logs live purely in module memory (an array in this closure) and are
// never persisted to Firestore, localStorage, or any file. Console output
// only happens when Commerce.config.debugMode is true, so by default this
// module is silent.
// ----------------------------------------------------------------------------

// Default cap on how many log entries are retained. Configurable via
// _setLogHistoryLimit (debug/advanced use only — not part of the
// documented public API surface for this task).
let _logHistoryLimit = 500;

// Module-private array holding log entries in chronological order
// (oldest first, newest last). Never exposed directly.
const _logHistory = [];

/**
 * Internal helper: append a log entry, enforce the history limit, and
 * mirror to console when debug mode is enabled. Never throws.
 *
 * @param {string} level - One of "info" | "warn" | "error" | "debug".
 * @param {string} message - Human-readable log message.
 * @param {*} [data] - Optional structured data associated with the log entry.
 * @returns {void}
 */
function _logRecord(level, message, data) {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === "string" ? message : String(message),
      data: data === undefined ? null : data
    };

    _logHistory.push(entry);

    // Roll off the oldest entries once we exceed the configured limit.
    while (_logHistory.length > _logHistoryLimit) {
      _logHistory.shift();
    }

    // Console output is opt-in: only mirror when debug mode is on.
    let debugMode = false;
    try {
      debugMode = _configStore.get("debugMode") === true;
    } catch (err) {
      debugMode = false;
    }

    if (debugMode) {
      const consoleMethod =
        level === "error" ? console.error :
        level === "warn" ? console.warn :
        level === "debug" ? console.debug :
        console.log;
      consoleMethod(`Commerce[${level}] ${entry.timestamp} — ${entry.message}`, data !== undefined ? data : "");
    }
  } catch (err) {
    // Logging must never throw or break the caller. Swallow silently.
  }
}

/**
 * Log an informational message.
 *
 * @param {string} message - Human-readable message.
 * @param {*} [data] - Optional structured data.
 * @returns {void}
 */
function loggerInfo(message, data) {
  _logRecord("info", message, data);
}

/**
 * Log a warning message.
 *
 * @param {string} message - Human-readable message.
 * @param {*} [data] - Optional structured data.
 * @returns {void}
 */
function loggerWarn(message, data) {
  _logRecord("warn", message, data);
}

/**
 * Log an error message.
 *
 * @param {string} message - Human-readable message.
 * @param {*} [data] - Optional structured data.
 * @returns {void}
 */
function loggerError(message, data) {
  _logRecord("error", message, data);
}

/**
 * Log a debug message.
 *
 * @param {string} message - Human-readable message.
 * @param {*} [data] - Optional structured data.
 * @returns {void}
 */
function loggerDebug(message, data) {
  _logRecord("debug", message, data);
}

/**
 * Retrieve the full log history in chronological order.
 * Always returns a brand-new array of shallow-copied entry objects —
 * mutating the returned array or its entries has no effect on internal
 * storage.
 *
 * @returns {Array<{timestamp: string, level: string, message: string, data: *}>}
 */
function loggerGetHistory() {
  return _logHistory.map((entry) => ({ ...entry }));
}

/**
 * Clear all stored log history.
 *
 * @returns {void}
 */
function loggerClear() {
  _logHistory.length = 0;
}

// ----------------------------------------------------------------------------
// Internal Validator Module
//
// A generic, stateless collection of value-shape checks. This is pure
// infrastructure: every function here is a deterministic, side-effect-free
// predicate. None of them log, emit events, write to Firebase, or contain
// any commerce-specific business rules — they simply answer "does this
// value look like X?" so future features can reuse them consistently.
//
// All validators:
//   - return strictly true or false (never throw, never return other types)
//   - accept null/undefined/wrong-typed input safely, treating it as invalid
//     rather than erroring
// ----------------------------------------------------------------------------

/**
 * Check that a value is "present" — not null, not undefined, and not an
 * empty string after trimming whitespace.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

/**
 * Check that a value is a syntactically valid email address.
 * Uses a pragmatic (not fully RFC-5322-compliant) pattern suitable for
 * everyday form validation.
 *
 * @param {*} email
 * @returns {boolean}
 */
function validatorEmail(email) {
  if (typeof email !== "string" || email.trim() === "") return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
}

/**
 * Check that a value is a finite number (excludes NaN and Infinity).
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Check that a value is a finite integer.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Check that a value is a finite number strictly greater than zero.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorPositiveNumber(value) {
  return validatorNumber(value) && value > 0;
}

/**
 * Check that a value is a string (empty strings are considered valid here;
 * use nonEmptyString for the stricter check).
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorString(value) {
  return typeof value === "string";
}

/**
 * Check that a value is a string with at least one non-whitespace character.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check that a value is an array.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorArray(value) {
  return Array.isArray(value);
}

/**
 * Check that a value is a plain object — not null, not an array, and not
 * any other built-in/exotic object type.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Check that a value is strictly a boolean.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorBoolean(value) {
  return typeof value === "boolean";
}

/**
 * Check that a value is a syntactically valid URL.
 * Relies on the built-in URL constructor; any value it can't parse is
 * treated as invalid rather than throwing.
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    new URL(value);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check that a value is a syntactically valid UUID (versions 1-5).
 *
 * @param {*} value
 * @returns {boolean}
 */
function validatorUuid(value) {
  if (typeof value !== "string") return false;
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(value.trim());
}

/**
 * Check that a string or array has at least `length` elements/characters.
 *
 * @param {*} value - A string or array.
 * @param {number} length - Minimum required length.
 * @returns {boolean}
 */
function validatorMinLength(value, length) {
  if (typeof length !== "number" || !Number.isFinite(length)) return false;
  if (typeof value !== "string" && !Array.isArray(value)) return false;
  return value.length >= length;
}

/**
 * Check that a string or array has at most `length` elements/characters.
 *
 * @param {*} value - A string or array.
 * @param {number} length - Maximum allowed length.
 * @returns {boolean}
 */
function validatorMaxLength(value, length) {
  if (typeof length !== "number" || !Number.isFinite(length)) return false;
  if (typeof value !== "string" && !Array.isArray(value)) return false;
  return value.length <= length;
}

/**
 * Check that a numeric value falls within an inclusive [min, max] range.
 *
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function validatorInRange(value, min, max) {
  if (!validatorNumber(value)) return false;
  if (typeof min !== "number" || typeof max !== "number") return false;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return value >= min && value <= max;
}

/**
 * Run an arbitrary caller-supplied predicate against a value.
 * If the callback is not a function, or it throws, this safely returns
 * false rather than propagating the error.
 *
 * @param {*} value
 * @param {(value: *) => boolean} callback
 * @returns {boolean}
 */
function validatorCustom(value, callback) {
  if (typeof callback !== "function") return false;
  try {
    return callback(value) === true;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Public: core purchase flow
// ----------------------------------------------------------------------------

/**
 * Kick off a FastSpring popup checkout session for a template.
 *
 * Prerequisites (must be configured before this is called):
 *   Commerce.config.set("fastspringStorefront",    "youraccount.onfastspring.com");
 *   Commerce.config.set("fastspringProductPrefix", "templates-"); // or ""
 *
 * FastSpring's fsc.js payload script must also be present in the page's
 * <head> with data-storefront pointing to the same storefront URL.
 * This function does not inject that script — page setup is the caller's
 * responsibility so this module stays UI-free.
 *
 * Flow:
 *   1. Validate required config values are present.
 *   2. Confirm a user session exists (auth check).
 *   3. Build the FastSpring product path from config prefix + template.id.
 *   4. Call window.fastspring.builder.push() to open the checkout popup.
 *   5. Return { status: "checkout_opened" } — the popup is now driving UX.
 *      Completion is handled asynchronously by checkoutSuccessHandler() and
 *      checkoutCancelHandler(), which FastSpring calls via the data-popup-closed
 *      and data-popup-webhook-received callbacks registered on the fsc.js script tag.
 *
 * @param {Object} template
 * @param {string}             template.id    - Appended to the product prefix to form path.
 * @param {number|string}      [template.price]
 * @param {string}             [template.title]
 * @param {{ email?: string }} [template.uploader]
 *
 * @param {Object}   [hooks]
 * @param {() => void}         [hooks.onLoginRequired] - Called when no session exists.
 * @param {() => void}         [hooks.onConfigMissing] - Called when FastSpring config
 *   keys are absent. If omitted, a console.error is emitted instead.
 * @param {(err: Error) => void} [hooks.onError] - Called on unexpected failure.
 */
async function buyNow(template, hooks = {}) {
  const { onLoginRequired, onConfigMissing, onError } = hooks;

  // --- 1. Validate FastSpring configuration --------------------------------
  const storefront = configGet("fastspringStorefront");
  const prefix     = configGet("fastspringProductPrefix") ?? "";

  if (!storefront || typeof storefront !== "string" || storefront.trim() === "") {
    const msg =
      'Commerce.buyNow: "fastspringStorefront" is not set. ' +
      'Call Commerce.config.set("fastspringStorefront", "youraccount.onfastspring.com") ' +
      "before triggering checkout.";
    if (typeof onConfigMissing === "function") {
      onConfigMissing(msg);
    } else {
      console.error(msg);
    }
    return { status: "config_missing", key: "fastspringStorefront" };
  }

  // --- 2. Auth check -------------------------------------------------------
  const user = _getCurrentUser();
  if (!user || !user.email) {
    if (typeof onLoginRequired === "function") {
      onLoginRequired();
    } else {
      console.warn("Commerce.buyNow: no authenticated user. Login required before checkout.");
    }
    return { status: "login_required" };
  }

  // --- 3. Build FastSpring product path ------------------------------------
  // Product path = configurable prefix + template.id.
  // Example: prefix "templates-" + id "abc123" → "templates-abc123"
  const productPath = `${prefix}${template.id}`.trim();

  if (!productPath) {
    const err = new Error(
      "Commerce.buyNow: could not build a FastSpring product path. " +
      "Ensure template.id is a non-empty string."
    );
    if (typeof onError === "function") onError(err);
    return { status: "error", error: err };
  }

  // --- 4. Open FastSpring popup --------------------------------------------
  // window.fastspring is injected by fsc.js (FastSpring's payload script).
  // If fsc.js has not been loaded yet, we surface a clear error rather than
  // letting the undefined-property access throw silently.
  try {
    if (
      typeof window === "undefined" ||
      !window.fastspring ||
      typeof window.fastspring.builder === "undefined" ||
      typeof window.fastspring.builder.push !== "function"
    ) {
      throw new Error(
        "Commerce.buyNow: window.fastspring.builder is not available. " +
        "Ensure the FastSpring fsc.js payload script is loaded in the page " +
        '<head> with data-storefront="' + storefront.trim() + '".'
      );
    }

    // Pass buyer email so FastSpring pre-fills the checkout form.
    // Pass template title as the display name if available.
    window.fastspring.builder.push({
      products: [
        {
          path: productPath,
          quantity: 1
        }
      ],
      paymentContact: {
        email: user.email
      },
      ...(template.title ? { tags: { templateTitle: template.title } } : {})
    });

    return {
      status: "checkout_opened",
      productPath,
      user: { uid: user.uid, email: user.email }
    };

  } catch (err) {
    console.error("Commerce.buyNow: failed to open FastSpring popup", err);
    if (typeof onError === "function") onError(err);
    return { status: "error", error: err };
  }
}

// ----------------------------------------------------------------------------
// Internal Auth Module
//
// Unified Firebase Authentication for the commerce engine.
// Supports Google (signInWithPopup) and passwordless email (Email Link /
// Magic Link). No passwords are ever stored or transmitted.
//
// Auth SDK is loaded lazily via its own init promise, completely separate
// from _ensureFirebase() (Firestore), so the two do not interfere.
//
// Every public function in this module returns the same unified user shape:
//   { uid, email, provider: "google" | "email" }
// or null when no session exists.
//
// This module is infrastructure only. It does NOT call buyNow, emit events,
// log, or write to Firestore. Wiring to other modules is a separate task.
// ----------------------------------------------------------------------------

// Module-private auth SDK state — never exposed directly.
let _authSdk = null;
let _authInitPromise = null;

/**
 * Lazy-load the Firebase Auth SDK and initialise the Auth instance.
 * Safe to call concurrently — all callers share the same Promise and the
 * SDK is only fetched once. Uses the same Firebase app as _ensureFirebase().
 *
 * @returns {Promise<Object>} Resolves to an object holding the Auth instance
 *   plus every Auth SDK function this module needs.
 */
async function _ensureAuth() {
  if (_authInitPromise) return _authInitPromise;

  _authInitPromise = (async () => {
    // App SDK — re-uses the existing app if Firestore already initialised it.
    const { initializeApp, getApps, getApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );

    const {
      getAuth,
      onAuthStateChanged,
      signInWithPopup,
      sendSignInLinkToEmail,
      signInWithEmailLink,
      isSignInWithEmailLink,
      GoogleAuthProvider
    } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
    );

    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    _authSdk = {
      auth: getAuth(app),
      onAuthStateChanged,
      signInWithPopup,
      sendSignInLinkToEmail,
      signInWithEmailLink,
      isSignInWithEmailLink,
      GoogleAuthProvider
    };

    return _authSdk;
  })();

  return _authInitPromise;
}

/**
 * Normalise a raw Firebase User into the unified user shape.
 * Infers provider from the user's providerData list.
 *
 * @param {Object} firebaseUser - Raw Firebase User object.
 * @returns {{ uid: string, email: string|null, provider: "google"|"email" }}
 */
function _normalizeAuthUser(firebaseUser) {
  if (!firebaseUser) return null;
  const providerIds = (firebaseUser.providerData || []).map((p) => p.providerId);
  const provider = providerIds.includes("google.com") ? "google" : "email";
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    provider
  };
}

/**
 * Sign in with a Google account via a popup window.
 * Firebase creates the account automatically on first use.
 * Prompts the user to pick an account every time (no silent re-use).
 *
 * @returns {Promise<{ uid: string, email: string|null, provider: "google" }>}
 * @throws {Error} Re-throws Firebase errors (popup-blocked, cancelled, etc.)
 *   so the caller can decide how to surface them.
 */
async function loginWithGoogle() {
  const sdk = await _ensureAuth();
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await sdk.signInWithPopup(sdk.auth, provider);
  return _normalizeAuthUser(result.user);
}

/**
 * Passwordless email sign-in using Firebase Email Link (Magic Link).
 *
 * Two-step flow:
 *   Step 1 — send link:
 *     Call loginWithEmail(email) on any page.
 *     The function sends a sign-in link to the address and returns
 *     { status: "link_sent", email } so the caller can show a
 *     "check your inbox" message.
 *
 *   Step 2 — complete sign-in:
 *     The user clicks the link in their inbox and lands back on the app.
 *     Call loginWithEmail(email) again on that page.
 *     The function detects the Firebase sign-in URL, completes sign-in,
 *     and returns the unified user object.
 *
 * The email is persisted to sessionStorage between steps so the completion
 * page can retrieve it without asking the user to retype it.
 *
 * @param {string} email - The user's email address.
 * @returns {Promise<
 *   { uid: string, email: string|null, provider: "email" } |
 *   { status: "link_sent", email: string }
 * >}
 * @throws {Error} Re-throws Firebase errors or throws on invalid input.
 */
async function loginWithEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Commerce.auth.loginWithEmail: a valid email address is required.");
  }

  const sdk = await _ensureAuth();
  const currentUrl = window.location.href;

  // --- Step 2: current URL is a Firebase email sign-in link ----------------
  if (sdk.isSignInWithEmailLink(sdk.auth, currentUrl)) {
    const result = await sdk.signInWithEmailLink(sdk.auth, email.trim(), currentUrl);
    try { window.sessionStorage.removeItem("commerce_pendingSignInEmail"); } catch (_) {}
    return _normalizeAuthUser(result.user);
  }

  // --- Step 1: send the magic link -----------------------------------------
  const actionCodeSettings = {
    // Redirect back to the current page so it can detect and complete the
    // sign-in (Step 2) when the user returns from their inbox.
    url: currentUrl,
    handleCodeInApp: true
  };

  await sdk.sendSignInLinkToEmail(sdk.auth, email.trim(), actionCodeSettings);

  // Persist email so the completion page can auto-supply it in Step 2.
  try { window.sessionStorage.setItem("commerce_pendingSignInEmail", email.trim()); } catch (_) {}

  return { status: "link_sent", email: email.trim() };
}

/**
 * Return the currently signed-in user synchronously, or null.
 *
 * Important: Firebase hydrates the session asynchronously from storage on
 * page load, so this may transiently return null on first render even when
 * a valid session exists. For reactive, reliable state use onUserChange().
 *
 * @returns {{ uid: string, email: string|null, provider: "google"|"email" } | null}
 */
function getCurrentUser() {
  if (!_authSdk || !_authSdk.auth.currentUser) return null;
  return _normalizeAuthUser(_authSdk.auth.currentUser);
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * The callback fires immediately with the current state, then again on
 * every change — standard Firebase onAuthStateChanged semantics.
 *
 * @param {(user: { uid, email, provider }|null) => void} callback
 * @returns {Promise<() => void>} Resolves to an unsubscribe function.
 * @throws {Error} Throws synchronously if callback is not a function.
 */
async function onUserChange(callback) {
  if (typeof callback !== "function") {
    throw new Error("Commerce.auth.onUserChange: callback must be a function.");
  }
  const sdk = await _ensureAuth();
  return sdk.onAuthStateChanged(sdk.auth, (firebaseUser) => {
    callback(_normalizeAuthUser(firebaseUser));
  });
}

// ----------------------------------------------------------------------------
// Public: unified buyer flow entry point
//
// handleDownload() is the single function a page should call when a user
// clicks any download/buy button. All templates are treated as paid items.
//
// This function owns NO pricing logic. It validates the template shape,
// then delegates unconditionally to buyNow() — passing options through
// unchanged so all existing hooks (onLoginRequired, onError, onPending,
// etc.) continue to work exactly as documented on buyNow().
//
// Safety layer (evaluated BEFORE delegation):
//   • Invalid template shape → { status: "invalid_template" }
//   • Auth failure / uncaught exception  → { status: "auth_required" }
// ----------------------------------------------------------------------------

/**
 * Unified entry point for every template download or purchase action.
 *
 * Validates the template object, then delegates unconditionally to
 * `buyNow(template, options)`. There is no free-download routing here;
 * all templates are treated as paid items at this layer.
 *
 * @param {Object} template
 * @param {string}             template.id       - Required. Template / Firestore document ID.
 * @param {number|string}      [template.price]  - Passed through to buyNow().
 * @param {{ email?: string }} [template.uploader] - Creator info, passed through to buyNow().
 *
 * @param {Object} [options]
 *   Passed through verbatim to buyNow().
 *   Supported hooks: onLoginRequired, onPending, onError.
 *   See buyNow() for the full list.
 *
 * @returns {Promise<
 *   | { status: "invalid_template"                                      }
 *   | { status: "auth_required",    error: Error                        }
 *   | { status: "login_required"                                        }
 *   | { status: "config_missing",   key: string                        }
 *   | { status: "checkout_opened",  productPath: string, user: Object  }
 *   | { status: "error",            error: Error                        }
 * >}
 */
async function handleDownload(template, options = {}) {

  // --- Safety layer: validate template object ------------------------------
  if (
    !template ||
    typeof template !== "object" ||
    Array.isArray(template) ||
    !template.id ||
    typeof template.id !== "string" ||
    template.id.trim() === ""
  ) {
    return { status: "invalid_template" };
  }

  // --- Delegate unconditionally to buyNow ----------------------------------
  try {
    return await buyNow(template, options);
  } catch (err) {
    // An uncaught exception most commonly indicates an auth SDK failure
    // (popup closed, network error, etc.). Surface as auth_required so
    // the caller can prompt re-login without a try/catch on their side.
    return { status: "auth_required", error: err };
  }
}

// ----------------------------------------------------------------------------
// Public: FastSpring checkout result handlers
//
// These two functions are designed to be wired directly into FastSpring's
// fsc.js callback attributes on the payload script tag:
//
//   <script
//     id="fsc-api"
//     src="https://d1f8f9xcsvx3ha.cloudfront.net/sbl/0.9.0/fastspring-builder.min.js"
//     type="text/javascript"
//     data-storefront="youraccount.onfastspring.com/popup-yourstorefront"
//     data-popup-webhook-received="commerceCheckoutSuccess"
//     data-popup-closed="commerceCheckoutCancel">
//   </script>
//
// Then expose them on window so FastSpring can find them:
//
//   import { Commerce } from './commerce.js';
//   window.commerceCheckoutSuccess = Commerce.checkoutSuccessHandler;
//   window.commerceCheckoutCancel  = Commerce.checkoutCancelHandler;
//
// Neither function modifies auth, config, the event bus, the logger, or
// the validator. Their only side-effect is a Firestore write.
// ----------------------------------------------------------------------------

/**
 * Called by FastSpring when a checkout popup is completed and payment is
 * confirmed (wired via data-popup-webhook-received on the fsc.js script tag).
 *
 * Writes an order record to the Firestore "orders" collection with
 * status "paid". The write is best-effort — a Firestore failure is logged
 * to console but does NOT throw, because FastSpring has already confirmed
 * payment and the user must not be left in a broken state.
 *
 * @param {Object} orderData - The FastSpring order payload passed by fsc.js.
 *   Key fields used: orderData.id, orderData.reference, orderData.total,
 *   orderData.currency, orderData.items[].product.
 *   The full payload is also stored as-is for auditability.
 * @returns {Promise<{ status: "logged", orderId: string }
 *                 | { status: "log_failed", error: Error }>}
 */
async function checkoutSuccessHandler(orderData) {
  const user = _getCurrentUser();

  const record = {
    status: "paid",
    uid: user ? user.uid : null,
    email: user ? user.email : null,
    provider: user ? (user.provider || null) : null,
    fastspringOrderId: (orderData && orderData.id)        || null,
    fastspringReference: (orderData && orderData.reference) || null,
    total: (orderData && orderData.total)                  || null,
    currency: (orderData && orderData.currency)            || configGet("currency") || null,
    items: (orderData && Array.isArray(orderData.items))
      ? orderData.items.map((item) => ({
          product: (item.product && item.product.path) || item.product || null,
          quantity: item.quantity || 1
        }))
      : [],
    rawPayload: orderData || null,
    timestamp: new Date()
  };

  try {
    const { db, firestoreApi } = await _ensureFirebase().then(() => ({
      db: _db,
      firestoreApi: _firestoreApi
    }));

    const docRef = await firestoreApi.addDoc(
      firestoreApi.collection(db, "orders"),
      record
    );

    return { status: "logged", orderId: docRef.id };

  } catch (err) {
    // Non-fatal: FastSpring already confirmed the payment.
    // Log the failure so it can be investigated, but do not re-throw.
    console.error(
      "Commerce.checkoutSuccessHandler: Firestore write failed. " +
      "Payment was confirmed by FastSpring but the order record was not saved. " +
      "Investigate immediately.",
      err,
      record
    );
    return { status: "log_failed", error: err };
  }
}

/**
 * Called by FastSpring when the checkout popup is closed without completing
 * payment (wired via data-popup-closed on the fsc.js script tag).
 *
 * FastSpring calls this callback on every popup close — including after a
 * successful payment. To avoid double-logging, this function only records
 * a "cancelled" event when orderData is absent or empty (i.e. the user
 * closed the popup without completing checkout).
 *
 * Writes a record to the Firestore "orders" collection with status
 * "cancelled". The write is best-effort and non-blocking.
 *
 * @param {Object|null} orderData - FastSpring passes the order if payment
 *   was completed before the popup closed, or null/empty if it was abandoned.
 * @returns {Promise<{ status: "logged"   }
 *                 | { status: "skipped"  }
 *                 | { status: "log_failed", error: Error }>}
 */
async function checkoutCancelHandler(orderData) {
  // If FastSpring passes a populated order object, the popup closed AFTER
  // a successful payment — the success handler already owns that event.
  // Skip logging here to avoid a duplicate "cancelled" record.
  if (orderData && orderData.id) {
    return { status: "skipped" };
  }

  const user = _getCurrentUser();

  const record = {
    status: "cancelled",
    uid: user ? user.uid : null,
    email: user ? user.email : null,
    provider: user ? (user.provider || null) : null,
    timestamp: new Date()
  };

  try {
    const { db, firestoreApi } = await _ensureFirebase().then(() => ({
      db: _db,
      firestoreApi: _firestoreApi
    }));

    await firestoreApi.addDoc(
      firestoreApi.collection(db, "orders"),
      record
    );

    return { status: "logged" };

  } catch (err) {
    // Non-fatal: a missed cancellation log is not user-impacting.
    console.error("Commerce.checkoutCancelHandler: Firestore write failed.", err);
    return { status: "log_failed", error: err };
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export const Commerce = {
  setAuthProvider,
  buyNow,
  handleDownload,
  // Internal event bus — see "Internal Event Bus" section above.
  on,
  off,
  once,
  emit,
  // Internal configuration module — see "Internal Configuration Module" section above.
  config: {
    get: configGet,
    set: configSet,
    has: configHas,
    remove: configRemove,
    reset: configReset,
    getAll: configGetAll
  },
  // Internal logger module — see "Internal Logger Module" section above.
  logger: {
    info: loggerInfo,
    warn: loggerWarn,
    error: loggerError,
    debug: loggerDebug,
    getHistory: loggerGetHistory,
    clear: loggerClear
  },
  // Internal validator module — see "Internal Validator Module" section above.
  validator: {
    required: validatorRequired,
    email: validatorEmail,
    number: validatorNumber,
    integer: validatorInteger,
    positiveNumber: validatorPositiveNumber,
    string: validatorString,
    nonEmptyString: validatorNonEmptyString,
    array: validatorArray,
    object: validatorObject,
    boolean: validatorBoolean,
    url: validatorUrl,
    uuid: validatorUuid,
    minLength: validatorMinLength,
    maxLength: validatorMaxLength,
    inRange: validatorInRange,
    custom: validatorCustom
  },
  // Internal auth module — see "Internal Auth Module" section above.
  auth: {
    loginWithGoogle,
    loginWithEmail,
    getCurrentUser,
    onUserChange
  },
  // exposed mainly for debugging / advanced use
  _ensureFirebase,
  // FastSpring popup result handlers — wire to fsc.js callbacks on the page.
  // See "Public: FastSpring checkout result handlers" section above for usage.
  checkoutSuccessHandler,
  checkoutCancelHandler
};

export default Commerce;
