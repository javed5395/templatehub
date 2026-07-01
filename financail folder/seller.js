// ============================================================================
// seller.js  —  Module 1: Foundation
// Seller engine for LazyDogTemplates.
//
// This module is fully self-contained. It does NOT import, require, or
// depend on navbar.js, commerce.js, or any other site file. It owns its
// own Firebase connection and exposes a small public API that any page
// can call.
//
// Authentication, seller profiles, product management, and dashboard
// features are NOT implemented here. They belong to future modules and
// will be added in explicitly-approved tasks.
//
// This file (Module 1) establishes the foundation only:
//   - Internal constants
//   - Private module state
//   - Configuration module
//   - Logger module
//   - Event Bus
//   - Firebase lazy initialization
//   - Public API skeleton
//
// Usage from a page:
//
//   <script type="module">
//     import { Seller } from './seller.js';
//
//     // Configure the engine before calling any feature:
//     Seller.config.set("environment", "production");
//
//     // Subscribe to events emitted by future modules:
//     Seller.on("seller:ready", (payload) => {
//       console.log("Seller engine ready", payload);
//     });
//
//     // Inspect current configuration (debugging):
//     console.log(Seller.config.getAll());
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
let _firestoreApi = null; // holds { collection, doc, getDoc, ... } once loaded
let _initPromise = null;

// Auth provider slot — no one is connected until a future module supplies one.
// Any object with a getCurrentUser() method is accepted. getCurrentUser()
// should return either null, or an object shaped like { uid, email, ... }.
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
//
// Allows a future auth module (or an external integration) to inject a
// user-session provider without this file needing to change. This is the
// only point at which seller.js learns who the current user is.
// ----------------------------------------------------------------------------

/**
 * Connect an external auth provider to the seller engine.
 *
 * @param {{ getCurrentUser: () => (null | { uid: string, email?: string }) }} provider
 * @returns {void}
 * @throws {Error} If provider is missing or does not expose getCurrentUser().
 */
function setAuthProvider(provider) {
  if (!provider || typeof provider.getCurrentUser !== "function") {
    throw new Error(
      "Seller.setAuthProvider requires an object with a getCurrentUser() method."
    );
  }
  _authProvider = provider;
}

/**
 * Internal helper: safely read the current user from the registered provider.
 * Returns null (never throws) so callers do not need individual try/catch blocks.
 *
 * @returns {{ uid: string, email?: string } | null}
 */
function _getCurrentUser() {
  try {
    return _authProvider.getCurrentUser() || null;
  } catch (err) {
    console.error("Seller: auth provider threw an error", err);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Internal Event Bus
//
// A lightweight publish/subscribe system, private to this module's closure
// (no globals are created). It allows different parts of seller.js — and
// future code that calls into Seller's public API — to react to events
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
      console.error(`Seller: listener for "${eventName}" threw an error`, err);
    }
  });
}

// ----------------------------------------------------------------------------
// Internal Configuration Module
//
// A centralized, self-contained store for engine-wide settings. This is
// plumbing only — the values stored here are placeholders for future
// modules to read; nothing in this file currently branches on them.
//
// Storage lives in a module-private Map so external code can never reach
// the underlying data structure directly (no reference to it is ever
// exposed). All access goes through the get/set/has/remove/reset/getAll
// functions below.
// ----------------------------------------------------------------------------

// Default configuration values. Frozen so this template object itself can
// never be mutated by accident; reset() always copies fresh from here.
const _CONFIG_DEFAULTS = Object.freeze({
  environment: "production",
  debugMode: false,
  // Seller registration and account management.
  // Intentional placeholders — consumed by future modules.
  sellerRegistrationEnabled: false,
  sellerVerificationRequired: true,
  sellerDashboardEnabled: false,
  // Product management.
  // Intentional placeholders — consumed by future modules.
  productSubmissionEnabled: false,
  productModerationEnabled: true,
  maxProductsPerSeller: null,
  // Revenue and payouts.
  // Intentional placeholders — consumed by future modules.
  payoutProvider: null,
  platformCommissionRate: null,
  minimumPayoutThreshold: null
});

// Module-private Map holding the live configuration. Never exposed
// directly — only ever read/written through the functions below.
const _configStore = new Map(Object.entries(_CONFIG_DEFAULTS));

/**
 * Retrieve a configuration value.
 *
 * @param {string} key - Configuration key to look up.
 * @returns {*} The stored value, or undefined if the key doesn't exist
 * or an invalid key was supplied.
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
// not wired into any feature, the event bus, or Firebase; nothing in this
// file currently calls logger.info/warn/error/debug. That wiring is a
// separate, explicitly-approved task.
//
// Logs live purely in module memory (an array in this closure) and are
// never persisted to Firestore, localStorage, or any file. Console output
// only happens when Seller.config.debugMode is true, so by default this
// module is silent.
// ----------------------------------------------------------------------------

// Default cap on how many log entries are retained. Configurable via
// _setLogHistoryLimit (debug/advanced use only — not part of the
// documented public API surface for this module).
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
        level === "warn"  ? console.warn  :
        level === "debug" ? console.debug :
        console.log;
      consoleMethod(`Seller[${level}] ${entry.timestamp} — ${entry.message}`, data !== undefined ? data : "");
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
// any seller-specific business rules — they simply answer "does this
// value look like X?" so future modules can reuse them consistently.
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

// ============================================================================
// seller.js  —  Module 2: Seller Authentication
//
// Unified Firebase Authentication for the seller engine.
// Supports Google (signInWithPopup) and passwordless email (Email Link /
// Magic Link). No passwords are ever stored or transmitted.
//
// Auth SDK is loaded lazily via its own init promise (_ensureAuth), completely
// separate from _ensureFirebase() (Firestore), so the two never interfere.
// Both follow the same guard-once promise pattern but are fully independent.
//
// Every public function returns the same unified user shape:
//   { uid: string, email: string | null, provider: "google" | "email" }
// or null when no session exists.
//
// This module does NOT:
//   - write anything to Firestore
//   - create contributor or buyer documents
//   - emit events (wiring is a separate, explicitly-approved task)
//   - implement profile creation or seller registration
// ============================================================================

// ----------------------------------------------------------------------------
// Module 2 — private auth SDK state
//
// Kept separate from Module 1 state (_app, _db, etc.) so Firestore and Auth
// initialization paths remain fully independent and cannot interfere.
// ----------------------------------------------------------------------------

// Holds the resolved Auth SDK bundle once _ensureAuth() has run.
// Never exposed directly.
let _authSdk = null;

// Guard-once promise for Auth initialization.
// Mirrors the _initPromise pattern used by _ensureFirebase().
let _authInitPromise = null;

// ----------------------------------------------------------------------------
// Module 2 — lazy Auth initialization
// ----------------------------------------------------------------------------

/**
 * Lazy-load the Firebase Auth SDK and initialize the Auth instance.
 * Safe to call concurrently — all callers share the same Promise and the
 * SDK is only fetched once. Reuses the existing Firebase App if
 * _ensureFirebase() has already initialized it; initializes the App itself
 * if it has not. Either way the two initialization paths remain independent.
 *
 * @returns {Promise<{
 * auth:                  Object,
 * onAuthStateChanged:    Function,
 * signInWithPopup:       Function,
 * signOut:               Function,
 * sendSignInLinkToEmail: Function,
 * signInWithEmailLink:   Function,
 * isSignInWithEmailLink: Function,
 * GoogleAuthProvider:    Function
 * }>}
 */
async function _ensureAuth() {
  if (_authInitPromise) return _authInitPromise;

  _authInitPromise = (async () => {
    // App SDK — reuses the existing app if Firestore already initialized it,
    // initializes a fresh one otherwise. getApps()/getApp() guarantees
    // Firebase never creates a duplicate app instance.
    const { initializeApp, getApps, getApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );

    const {
      getAuth,
      onAuthStateChanged,
      signInWithPopup,
      signOut,
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
      signOut,
      sendSignInLinkToEmail,
      signInWithEmailLink,
      isSignInWithEmailLink,
      GoogleAuthProvider
    };

    return _authSdk;
  })();

  return _authInitPromise;
}

// ----------------------------------------------------------------------------
// Module 2 — internal helpers
// ----------------------------------------------------------------------------

/**
 * Normalize a raw Firebase User object into the unified user shape.
 * Infers provider from the user's providerData list.
 *
 * @param {Object|null} firebaseUser - Raw Firebase User, or null.
 * @returns {{ uid: string, email: string|null, provider: "google"|"email" } | null}
 */
function _normalizeAuthUser(firebaseUser) {
  if (!firebaseUser) return null;
  const providerIds = (firebaseUser.providerData || []).map((p) => p.providerId);
  const provider = providerIds.includes("google.com") ? "google" : "email";
  return {
    uid:      firebaseUser.uid,
    email:    firebaseUser.email || null,
    provider
  };
}

// ----------------------------------------------------------------------------
// Module 2 — public auth functions
// ----------------------------------------------------------------------------

/**
 * Sign in with a Google account via a popup window.
 * Firebase creates the seller account automatically on first use.
 * Prompts the user to pick an account every time (no silent re-use).
 *
 * @returns {Promise<{ uid: string, email: string|null, provider: "google" }>}
 * @throws {Error} Re-throws Firebase errors (popup-blocked, cancelled, network
 * failure, etc.) so the caller can decide how to surface them.
 */
async function authLoginWithGoogle() {
  const sdk = await _ensureAuth();
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await sdk.signInWithPopup(sdk.auth, provider);
  return _normalizeAuthUser(result.user);
}

/**
 * Passwordless email sign-in using Firebase Email Link (Magic Link).
 * No password is ever stored or transmitted.
 *
 * Two-step flow:
 * Step 1 — send link:
 * Call loginWithEmail(email) on any page.
 * Sends a sign-in link to the address and returns
 * { status: "link_sent", email } so the caller can show a
 * "check your inbox" message.
 *
 * Step 2 — complete sign-in:
 * The user clicks the link and lands back on the app.
 * Call loginWithEmail(email) again on that page.
 * The function detects the Firebase sign-in URL, completes sign-in,
 * and returns the unified user object.
 *
 * The email is persisted to sessionStorage between steps so the completion
 * page can retrieve it without asking the user to retype it.
 *
 * @param {string} email - The seller's email address.
 * @returns {Promise<
 * | { uid: string, email: string|null, provider: "email" }
 * | { status: "link_sent", email: string }
 * >}
 * @throws {Error} Re-throws Firebase errors, or throws on invalid input.
 */
async function authLoginWithEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Seller.auth.loginWithEmail: a valid email address is required.");
  }

  const sdk        = await _ensureAuth();
  const currentUrl = window.location.href;

  // --- Step 2: current URL is a Firebase email sign-in link ----------------
  if (sdk.isSignInWithEmailLink(sdk.auth, currentUrl)) {
    const result = await sdk.signInWithEmailLink(sdk.auth, email.trim(), currentUrl);
    try { window.sessionStorage.removeItem("seller_pendingSignInEmail"); } catch (_) {}
    return _normalizeAuthUser(result.user);
  }

  // --- Step 1: send the magic link -----------------------------------------
  const actionCodeSettings = {
    // Redirect back to the current page so it can detect and complete the
    // sign-in (Step 2) when the user returns from their inbox.
    url:            currentUrl,
    handleCodeInApp: true
  };

  await sdk.sendSignInLinkToEmail(sdk.auth, email.trim(), actionCodeSettings);

  // Persist email so the completion page can auto-supply it in Step 2
  // without asking the user to retype their address.
  try { window.sessionStorage.setItem("seller_pendingSignInEmail", email.trim()); } catch (_) {}

  return { status: "link_sent", email: email.trim() };
}

/**
 * Sign the current seller out of Firebase Auth, completely terminating
 * their session.
 *
 * @returns {Promise<{ status: "signed_out" }>}
 * @throws {Error} Re-throws Firebase errors on unexpected failure.
 */
async function authLogout() {
  const sdk = await _ensureAuth();
  await sdk.signOut(sdk.auth);
  return { status: "signed_out" };
}

/**
 * Return the currently signed-in seller synchronously, or null.
 *
 * Important: Firebase hydrates the session asynchronously from storage on
 * page load, so this may transiently return null on first render even when
 * a valid session exists. For reactive, reliable state use onUserChange().
 *
 * @returns {{ uid: string, email: string|null, provider: "google"|"email" } | null}
 */
function authGetCurrentUser() {
  if (!_authSdk || !_authSdk.auth.currentUser) return null;
  return _normalizeAuthUser(_authSdk.auth.currentUser);
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * The callback fires immediately with the current state, then again on
 * every subsequent change — standard Firebase onAuthStateChanged semantics.
 *
 * @param {(user: { uid: string, email: string|null, provider: "google"|"email" } | null) => void} callback
 * @returns {Promise<() => void>} Resolves to an unsubscribe function.
 * Call the returned function to stop receiving auth state updates.
 * @throws {Error} Throws if callback is not a function.
 */
async function authOnUserChange(callback) {
  if (typeof callback !== "function") {
    throw new Error("Seller.auth.onUserChange: callback must be a function.");
  }
  const sdk = await _ensureAuth();
  return sdk.onAuthStateChanged(sdk.auth, (firebaseUser) => {
    callback(_normalizeAuthUser(firebaseUser));
  });
}

// ============================================================================
// seller.js  —  Module 3: Contributor Profile
//
// Manages the contributor's Firestore profile document inside the
// "contributors" collection. Each authenticated seller has exactly one
// document, keyed by their Firebase uid (no random IDs, no duplicates).
//
// This module:
//   - Reuses _ensureFirebase() — does NOT create another Firestore init.
//   - Reuses authGetCurrentUser() — does NOT duplicate auth logic.
//   - Writes only to Firestore. No UI, no alerts, no side-effects.
//   - Routes all console output through the logger (debugMode-gated).
//   - Returns structured result objects from every function.
//
// This module does NOT implement:
//   Products, Uploads, Drafts, Submission, Dashboard,
//   Notifications, Statistics, Sales, or Payouts.
// ============================================================================

// ----------------------------------------------------------------------------
// Module 3 — constants
// ----------------------------------------------------------------------------

const CONTRIBUTORS_COLLECTION = "contributors";

// Fields that create() always sets and update() must never overwrite.
const _PROFILE_IMMUTABLE_FIELDS = ["uid", "email", "joinedDate"];

// Fields whose presence (non-empty string) marks a profile as complete.
const _PROFILE_REQUIRED_FOR_COMPLETION = ["displayName", "country", "biography"];

// ----------------------------------------------------------------------------
// Module 3 — internal helper
//
// Returns a plain reference bundle { db, fs } so every public function
// can reach Firestore without repeating the await+destructure pattern.
// ----------------------------------------------------------------------------

/**
 * Ensure Firestore is initialised and return a convenience bundle.
 *
 * @returns {Promise<{ db: Object, fs: Object }>}
 * db — the Firestore database instance
 * fs — the full Firestore SDK namespace (doc, getDoc, setDoc, …)
 */
async function _firestoreBundle() {
  await _ensureFirebase();
  return { db: _db, fs: _firestoreApi };
}

// ----------------------------------------------------------------------------
// Module 3 — public profile functions
// ----------------------------------------------------------------------------

/**
 * Check whether a contributor profile document exists for the current user.
 *
 * @returns {Promise<boolean>} true when the document exists, false otherwise.
 * Returns false (never throws) when unauthenticated or on Firestore error.
 */
async function profileExists() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.profile.exists: no authenticated user.");
    return false;
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, CONTRIBUTORS_COLLECTION, user.uid);
    const snap = await fs.getDoc(ref);
    return snap.exists();
  } catch (err) {
    loggerError("Seller.profile.exists: Firestore error.", err);
    return false;
  }
}

/**
 * Fetch the contributor's profile document.
 *
 * @returns {Promise<Object|null>}
 * The profile data object when the document exists, or null when it does
 * not exist, the user is unauthenticated, or a Firestore error occurs.
 */
async function profileGet() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.profile.get: no authenticated user.");
    return null;
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, CONTRIBUTORS_COLLECTION, user.uid);
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) return null;
    return { ...snap.data() };          // safe copy — caller cannot mutate Firestore state
  } catch (err) {
    loggerError("Seller.profile.get: Firestore error.", err);
    return null;
  }
}

/**
 * Create a new contributor profile document.
 *
 * The document ID is always the authenticated user's uid, which guarantees
 * one document per contributor with no random IDs and no duplicates.
 *
 * Fails safely (without overwriting) when a profile already exists.
 *
 * Default field values applied on creation:
 * approvalStatus  = "pending"
 * payoneerStatus  = "not_connected"
 * taxStatus       = "incomplete"
 * joinedDate      = server timestamp
 * updatedDate     = server timestamp
 *
 * Caller-supplied fields (displayName, country, biography, avatar, etc.)
 * are merged in on top of the defaults.
 *
 * @param {Object} [fields={}]
 * Optional initial field values. uid, email, joinedDate are always set
 * from the authenticated session and server clock — any values supplied
 * for those keys in `fields` are silently ignored.
 *
 * @returns {Promise<
 * | { status: "created",       profile: Object }
 * | { status: "already_exists"                }
 * | { status: "auth_required"                 }
 * | { status: "error",         error: Error   }
 * >}
 */
async function profileCreate(fields = {}) {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.profile.create: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref = fs.doc(db, CONTRIBUTORS_COLLECTION, user.uid);

    // Guard: do not overwrite an existing profile.
    const snap = await fs.getDoc(ref);
    if (snap.exists()) {
      loggerWarn("Seller.profile.create: profile already exists.", { uid: user.uid });
      return { status: "already_exists" };
    }

    // Strip immutable fields from caller-supplied data so they cannot be
    // spoofed — uid, email, and joinedDate always come from authoritative sources.
    const safeFields = { ...fields };
    for (const key of _PROFILE_IMMUTABLE_FIELDS) {
      delete safeFields[key];
    }

    const now = fs.serverTimestamp();

    const profile = {
      // Caller-supplied overridable fields (applied first so defaults win
      // for anything not explicitly set).
      displayName:    null,
      country:        null,
      biography:      null,
      avatar:         null,
      ...safeFields,
      // Authoritative fields — always set from session / server clock.
      uid:            user.uid,
      email:          user.email || null,
      approvalStatus: "pending",
      payoneerStatus: "not_connected",
      taxStatus:      "incomplete",
      joinedDate:     now,
      updatedDate:    now
    };

    // setDoc with the uid as the document ID — atomic, no random ID.
    await fs.setDoc(ref, profile);

    loggerInfo("Seller.profile.create: profile created.", { uid: user.uid });

    // Return a readable snapshot. serverTimestamp() fields are sentinels
    // until the next read; re-fetch is the caller's responsibility if they
    // need the resolved timestamps immediately.
    return {
      status: "created",
      profile: { ...profile }
    };

  } catch (err) {
    loggerError("Seller.profile.create: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Update specific fields on an existing contributor profile.
 *
 * Always refreshes updatedDate automatically.
 * Never overwrites uid, email, or joinedDate — those keys are stripped from
 * the supplied fields object before the write, even if the caller includes them.
 *
 * @param {Object} fields - Fields to update. Must be a non-empty plain object.
 *
 * @returns {Promise<
 * | { status: "updated"                      }
 * | { status: "auth_required"                }
 * | { status: "not_found"                    }
 * | { status: "invalid_fields"               }
 * | { status: "error",       error: Error    }
 * >}
 */
async function profileUpdate(fields) {
  // Guard: fields must be a non-empty plain object.
  // Checked before auth so callers receive immediate feedback on bad input
  // without needing a live session.
  if (
    !fields ||
    typeof fields !== "object" ||
    Array.isArray(fields) ||
    Object.keys(fields).length === 0
  ) {
    loggerWarn("Seller.profile.update: fields must be a non-empty plain object.");
    return { status: "invalid_fields" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.profile.update: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref = fs.doc(db, CONTRIBUTORS_COLLECTION, user.uid);

    // Confirm the document exists before attempting an update.
    const snap = await fs.getDoc(ref);
    if (!snap.exists()) {
      loggerWarn("Seller.profile.update: profile does not exist.", { uid: user.uid });
      return { status: "not_found" };
    }

    // Strip immutable fields — uid, email, joinedDate must never be overwritten.
    const safeFields = { ...fields };
    for (const key of _PROFILE_IMMUTABLE_FIELDS) {
      delete safeFields[key];
    }

    // Always refresh updatedDate on every write.
    safeFields.updatedDate = fs.serverTimestamp();

    await fs.updateDoc(ref, safeFields);

    loggerInfo("Seller.profile.update: profile updated.", {
      uid: user.uid,
      keys: Object.keys(safeFields)
    });

    return { status: "updated" };

  } catch (err) {
    loggerError("Seller.profile.update: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Check whether the contributor has completed the minimum required
 * onboarding fields: displayName, country, and biography.
 *
 * All three must be present as non-empty strings for this to return true.
 * Returns false when unauthenticated, when the profile does not exist, or
 * when any required field is absent, null, or an empty string.
 *
 * @returns {Promise<boolean>}
 */
async function profileComplete() {
  const profile = await profileGet();
  if (!profile) return false;

  return _PROFILE_REQUIRED_FOR_COMPLETION.every(
    (key) => typeof profile[key] === "string" && profile[key].trim().length > 0
  );
}

// ============================================================================
// seller.js  —  Module 4: Product Draft Management
//
// Manages product draft documents inside the "productDrafts" Firestore
// collection. Every draft belongs to exactly one authenticated contributor,
// enforced by ownerUid on every read, update, and delete.
//
// This module:
//   - Reuses _ensureFirebase() via _firestoreBundle() — no new Firestore init.
//   - Reuses authGetCurrentUser() — no duplicated auth logic.
//   - Generates draftId automatically via Firestore addDoc (native auto-ID).
//   - Sets status = "draft" only. Submission/approval/publishing states
//     belong to a future module and are not implemented here.
//   - Returns structured result objects. No UI, no alerts, no side-effects.
//   - Routes all console output through the logger (debugMode-gated).
//
// This module does NOT implement:
//   Uploads, ZIP processing, image processing, submission, approval,
//   publishing, dashboard, notifications, or sales.
// ============================================================================

// ----------------------------------------------------------------------------
// Module 4 — constants
// ----------------------------------------------------------------------------

const PRODUCT_DRAFTS_COLLECTION = "productDrafts";

// Fields that can never be overwritten by updateDraft().
const _DRAFT_IMMUTABLE_FIELDS = ["draftId", "ownerUid", "createdDate", "status"];

// ----------------------------------------------------------------------------
// Module 4 — public draft functions
// ----------------------------------------------------------------------------

/**
 * Create a new product draft for the authenticated contributor.
 *
 * draftId is generated automatically by Firestore (addDoc).
 * ownerUid is always taken from the authenticated session.
 *
 * Default values applied on creation:
 * status      = "draft"
 * createdDate = server timestamp
 * updatedDate = server timestamp
 *
 * All schema fields not supplied in `fields` default to null.
 *
 * @param {Object} [fields={}]
 * Optional initial field values. draftId, ownerUid, status, createdDate,
 * and updatedDate are always set from the session/server — any values
 * supplied for those keys in `fields` are silently ignored.
 *
 * @returns {Promise<
 * | { status: "created", draftId: string, draft: Object }
 * | { status: "auth_required"                           }
 * | { status: "error",   error: Error                   }
 * >}
 */
async function productCreateDraft(fields = {}) {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.products.createDraft: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();

    // Strip all immutable fields from caller input so they cannot be spoofed.
    const safeFields = { ...fields };
    for (const key of _DRAFT_IMMUTABLE_FIELDS) {
      delete safeFields[key];
    }

    const now = fs.serverTimestamp();

    const draftData = {
      // Nullable schema fields — caller may override any of these.
      title:         null,
      description:   null,
      category:      null,
      tags:          null,
      thumbnail:     null,
      previewImages: null,
      zipFile:       null,
      version:       null,
      software:      null,
      compatibility: null,
      license:       null,
      price:         null,
      ...safeFields,
      // Authoritative fields — always set from session / server clock.
      ownerUid:    user.uid,
      status:      "draft",
      createdDate: now,
      updatedDate: now
      // draftId is stored inside the document after addDoc resolves (see below).
    };

    // addDoc generates the document ID automatically — no random ID logic here.
    const ref    = fs.collection(db, PRODUCT_DRAFTS_COLLECTION);
    const docRef = await fs.addDoc(ref, draftData);

    // Write draftId back into the document so it is self-contained.
    await fs.updateDoc(docRef, { draftId: docRef.id });

    const draft = { ...draftData, draftId: docRef.id };

    loggerInfo("Seller.products.createDraft: draft created.", {
      draftId:  docRef.id,
      ownerUid: user.uid
    });

    return { status: "created", draftId: docRef.id, draft };

  } catch (err) {
    loggerError("Seller.products.createDraft: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Fetch a single draft by ID.
 *
 * Returns the draft only when ownerUid matches the authenticated user.
 * Returns access_denied when the document exists but belongs to someone else,
 * preventing any cross-contributor data exposure.
 *
 * @param {string} draftId - The Firestore document ID of the draft.
 *
 * @returns {Promise<
 * | { status: "found",         draft: Object }
 * | { status: "not_found"                    }
 * | { status: "access_denied"                }
 * | { status: "auth_required"                }
 * | { status: "invalid_input"                }
 * | { status: "error",         error: Error  }
 * >}
 */
async function productGetDraft(draftId) {
  if (!draftId || typeof draftId !== "string" || !draftId.trim()) {
    loggerWarn("Seller.products.getDraft: draftId is required.");
    return { status: "invalid_input" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.products.getDraft: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, PRODUCT_DRAFTS_COLLECTION, draftId.trim());
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) {
      return { status: "not_found" };
    }

    const data = snap.data();

    // Ownership check — never expose another contributor's draft.
    if (data.ownerUid !== user.uid) {
      loggerWarn("Seller.products.getDraft: access denied.", {
        requestedBy: user.uid,
        draftId
      });
      return { status: "access_denied" };
    }

    return { status: "found", draft: { ...data } };

  } catch (err) {
    loggerError("Seller.products.getDraft: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Fetch all drafts owned by the authenticated contributor.
 *
 * Results are ordered by updatedDate descending (most recently updated first).
 * Returns an empty array when no drafts exist — never returns null.
 *
 * @returns {Promise<
 * | { status: "found",         drafts: Object[] }
 * | { status: "auth_required"                   }
 * | { status: "error",         error: Error     }
 * >}
 */
async function productGetDrafts() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.products.getDrafts: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();

    const q = fs.query(
      fs.collection(db, PRODUCT_DRAFTS_COLLECTION),
      fs.where("ownerUid", "==", user.uid),
      fs.orderBy("updatedDate", "desc")
    );

    const snap   = await fs.getDocs(q);
    const drafts = snap.docs.map((d) => ({ ...d.data() }));

    loggerInfo("Seller.products.getDrafts: fetched drafts.", {
      ownerUid: user.uid,
      count:    drafts.length
    });

    return { status: "found", drafts };

  } catch (err) {
    loggerError("Seller.products.getDrafts: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Update specific fields on an existing draft.
 *
 * Ownership is verified before any write — another contributor's draft
 * can never be modified.
 *
 * updatedDate is always refreshed automatically.
 * draftId, ownerUid, createdDate, and status are immutable — any values
 * supplied for those keys are stripped before the write.
 *
 * @param {string} draftId  - The Firestore document ID of the draft to update.
 * @param {Object} updates  - Fields to update. Must be a non-empty plain object.
 *
 * @returns {Promise<
 * | { status: "updated"                      }
 * | { status: "not_found"                    }
 * | { status: "access_denied"                }
 * | { status: "auth_required"                }
 * | { status: "invalid_input"                }
 * | { status: "error",       error: Error    }
 * >}
 */
async function productUpdateDraft(draftId, updates) {
  // Validate inputs before auth check for immediate caller feedback.
  if (!draftId || typeof draftId !== "string" || !draftId.trim()) {
    loggerWarn("Seller.products.updateDraft: draftId is required.");
    return { status: "invalid_input" };
  }

  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0
  ) {
    loggerWarn("Seller.products.updateDraft: updates must be a non-empty plain object.");
    return { status: "invalid_input" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.products.updateDraft: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, PRODUCT_DRAFTS_COLLECTION, draftId.trim());
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) {
      return { status: "not_found" };
    }

    // Ownership check before any write.
    if (snap.data().ownerUid !== user.uid) {
      loggerWarn("Seller.products.updateDraft: access denied.", {
        requestedBy: user.uid,
        draftId
      });
      return { status: "access_denied" };
    }

    // Strip immutable fields — these can never be changed after creation.
    const safeUpdates = { ...updates };
    for (const key of _DRAFT_IMMUTABLE_FIELDS) {
      delete safeUpdates[key];
    }

    // Always refresh updatedDate on every write.
    safeUpdates.updatedDate = fs.serverTimestamp();

    await fs.updateDoc(ref, safeUpdates);

    loggerInfo("Seller.products.updateDraft: draft updated.", {
      draftId,
      ownerUid: user.uid,
      keys: Object.keys(safeUpdates)
    });

    return { status: "updated" };

  } catch (err) {
    loggerError("Seller.products.updateDraft: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Delete a draft by ID.
 *
 * Only the owning contributor may delete their own draft.
 * Returns a structured success response on completion.
 *
 * @param {string} draftId - The Firestore document ID of the draft to delete.
 *
 * @returns {Promise<
 * | { status: "deleted"                      }
 * | { status: "not_found"                    }
 * | { status: "access_denied"                }
 * | { status: "auth_required"                }
 * | { status: "invalid_input"                }
 * | { status: "error",       error: Error    }
 * >}
 */
async function productDeleteDraft(draftId) {
  if (!draftId || typeof draftId !== "string" || !draftId.trim()) {
    loggerWarn("Seller.products.deleteDraft: draftId is required.");
    return { status: "invalid_input" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.products.deleteDraft: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, PRODUCT_DRAFTS_COLLECTION, draftId.trim());
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) {
      return { status: "not_found" };
    }

    // Ownership check before delete.
    if (snap.data().ownerUid !== user.uid) {
      loggerWarn("Seller.products.deleteDraft: access denied.", {
        requestedBy: user.uid,
        draftId
      });
      return { status: "access_denied" };
    }

    await fs.deleteDoc(ref);

    loggerInfo("Seller.products.deleteDraft: draft deleted.", {
      draftId,
      ownerUid: user.uid
    });

    return { status: "deleted" };

  } catch (err) {
    loggerError("Seller.products.deleteDraft: Firestore error.", err);
    return { status: "error", error: err };
  }
}

// ============================================================================
// seller.js  —  Module 5: Product Submission
//
// Manages the submission of existing product drafts for review.
// Operates entirely on the existing "productDrafts" collection — no new
// collection is created. Submission simply updates the draft document's
// status field and records a server timestamp.
//
// This module:
//   - Reuses authGetCurrentUser()   — no duplicated auth logic.
//   - Reuses _firestoreBundle()     — no new Firestore initializer.
//   - Reuses PRODUCT_DRAFTS_COLLECTION — same collection as Module 4.
//   - validate() performs NO Firestore writes — read-only inspection.
//   - submit() updates the existing draft document only.
//   - Prevents duplicate submissions (status "submitted" → already_submitted).
//   - Enforces ownership on every operation.
//
// This module does NOT implement:
//   Admin approval, publishing, marketplace listing, downloads,
//   FastSpring, orders, notifications, dashboard, or contributor statistics.
// ============================================================================

// ----------------------------------------------------------------------------
// Module 5 — required fields for submission
//
// All fields must be present and non-empty on the draft before it can be
// submitted. validate() checks exactly this list — nothing more.
// ----------------------------------------------------------------------------

const _SUBMISSION_REQUIRED_FIELDS = [
  "title",
  "description",
  "category",
  "thumbnail",
  "zipFile",
  "price",
  "version",
  "license",
  "software",
  "compatibility",
  "previewImages",
  "tags"
];

// ----------------------------------------------------------------------------
// Module 5 — internal field presence check
//
// A field is considered present when it is:
//   - a non-empty string (after trimming), OR
//   - a non-empty array, OR
//   - a finite number
// null, undefined, "", [], and 0-length values are treated as missing.
// ----------------------------------------------------------------------------

/**
 * Returns true when a single draft field value is considered populated.
 *
 * @param {*} value
 * @returns {boolean}
 */
function _isFieldPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string")  return value.trim().length > 0;
  if (Array.isArray(value))       return value.length > 0;
  if (typeof value === "number")  return Number.isFinite(value);
  return false;
}

// ----------------------------------------------------------------------------
// Module 5 — public submission functions
// ----------------------------------------------------------------------------

/**
 * Validate all required submission fields on a draft without modifying Firestore.
 *
 * Loads the draft, verifies ownership, then checks every field in
 * _SUBMISSION_REQUIRED_FIELDS for a non-empty value.
 *
 * Returns { valid: true } when all fields are present.
 * Returns { valid: false, missing: [...fieldNames] } listing every absent field.
 *
 * @param {string} draftId - Firestore document ID of the draft to validate.
 *
 * @returns {Promise<
 * | { valid: true                                       }
 * | { valid: false,        missing: string[]            }
 * | { status: "auth_required"                          }
 * | { status: "not_found"                              }
 * | { status: "access_denied"                          }
 * | { status: "invalid_input"                          }
 * | { status: "error",         error: Error            }
 * >}
 */
async function submissionValidate(draftId) {
  if (!draftId || typeof draftId !== "string" || !draftId.trim()) {
    loggerWarn("Seller.submission.validate: draftId is required.");
    return { status: "invalid_input" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.submission.validate: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, PRODUCT_DRAFTS_COLLECTION, draftId.trim());
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) {
      return { status: "not_found" };
    }

    const data = snap.data();

    if (data.ownerUid !== user.uid) {
      loggerWarn("Seller.submission.validate: access denied.", {
        requestedBy: user.uid,
        draftId
      });
      return { status: "access_denied" };
    }

    // Check every required field — collect all missing ones in a single pass.
    const missing = _SUBMISSION_REQUIRED_FIELDS.filter(
      (field) => !_isFieldPresent(data[field])
    );

    if (missing.length > 0) {
      loggerInfo("Seller.submission.validate: validation failed.", {
        draftId,
        missing
      });
      return { valid: false, missing };
    }

    loggerInfo("Seller.submission.validate: validation passed.", { draftId });
    return { valid: true };

  } catch (err) {
    loggerError("Seller.submission.validate: Firestore error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Submit an existing draft for review.
 *
 * Flow (in order):
 * 1. Validate draftId input.
 * 2. Confirm authenticated contributor.
 * 3. Load draft from "productDrafts" — reject if not found.
 * 4. Verify ownerUid matches authenticated user.
 * 5. Reject if status is not "draft" (already_submitted or wrong_status).
 * 6. Run submissionValidate() — return validation result on failure.
 * 7. Update the existing draft document in place:
 * status        = "submitted"
 * submittedDate = server timestamp
 * updatedDate   = server timestamp
 * 8. Return structured success response.
 *
 * No new Firestore collection is created. Only the draft document is updated.
 *
 * @param {string} draftId - Firestore document ID of the draft to submit.
 *
 * @returns {Promise<
 * | { status: "submitted",       draftId: string                     }
 * | { status: "already_submitted"                                     }
 * | { status: "validation_failed", valid: false, missing: string[]   }
 * | { status: "not_found"                                             }
 * | { status: "access_denied"                                         }
 * | { status: "auth_required"                                         }
 * | { status: "invalid_input"                                         }
 * | { status: "error",           error: Error                         }
 * >}
 */
async function submissionSubmit(draftId) {
  if (!draftId || typeof draftId !== "string" || !draftId.trim()) {
    loggerWarn("Seller.submission.submit: draftId is required.");
    return { status: "invalid_input" };
  }

  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.submission.submit: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const ref  = fs.doc(db, PRODUCT_DRAFTS_COLLECTION, draftId.trim());
    const snap = await fs.getDoc(ref);

    if (!snap.exists()) {
      return { status: "not_found" };
    }

    const data = snap.data();

    // Ownership check.
    if (data.ownerUid !== user.uid) {
      loggerWarn("Seller.submission.submit: access denied.", {
        requestedBy: user.uid,
        draftId
      });
      return { status: "access_denied" };
    }

    // Reject already-submitted drafts — idempotency guard.
    if (data.status === "submitted") {
      loggerWarn("Seller.submission.submit: draft already submitted.", { draftId });
      return { status: "already_submitted" };
    }

    // Only "draft" status may be submitted.
    if (data.status !== "draft") {
      loggerWarn("Seller.submission.submit: draft has unexpected status.", {
        draftId,
        currentStatus: data.status
      });
      return { status: "wrong_status", currentStatus: data.status };
    }

    // Validate all required fields before writing anything.
    const validation = await submissionValidate(draftId);
    if (validation.valid !== true) {
      // Bubble validation result with a submission-specific status wrapper.
      if (validation.valid === false) {
        return {
          status:  "validation_failed",
          valid:   false,
          missing: validation.missing
        };
      }
      // Guard against unexpected returns from validate() (auth/error paths)
      // re-surfaced here so the caller gets a structured response.
      return validation;
    }

    // Update the existing draft document in place — no new collection.
    const now = fs.serverTimestamp();
    await fs.updateDoc(ref, {
      status:        "submitted",
      submittedDate: now,
      updatedDate:   now
    });

    loggerInfo("Seller.submission.submit: draft submitted.", {
      draftId,
      ownerUid: user.uid
    });

    return { status: "submitted", draftId: draftId.trim() };

  } catch (err) {
    loggerError("Seller.submission.submit: Firestore error.", err);
    return { status: "error", error: err };
  }
}

// ============================================================================
// seller.js  —  Module 6: Contributor Dashboard Management
//
// A purely read-only analytics, listing, transaction, and communication
// aggregate system mapping explicitly to the authenticated user context.
// No status writes, mutations, or side-effects are executed here.
// ============================================================================

const NOTIFICATIONS_COLLECTION = "notifications";
const TRANSACTIONS_COLLECTION = "transactions";

/**
 * Fetch overview totals of all product documents owned by the contributor.
 * Maps status counts metrics exclusively for authenticated sessions.
 *
 * @returns {Promise<
 * | { status: "success", summary: { draftCount: number, submittedCount: number, approvedCount: number, publishedCount: number, rejectedCount: number } }
 * | { status: "auth_required" }
 * | { status: "error", error: Error }
 * >}
 */
async function dashboardSummary() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.dashboard.summary: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const q = fs.query(
      fs.collection(db, PRODUCT_DRAFTS_COLLECTION),
      fs.where("ownerUid", "==", user.uid)
    );

    const snap = await fs.getDocs(q);
    
    let draftCount = 0;
    let submittedCount = 0;
    let approvedCount = 0;
    let publishedCount = 0;
    let rejectedCount = 0;

    snap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === "draft") draftCount++;
      else if (data.status === "submitted") submittedCount++;
      else if (data.status === "approved") approvedCount++;
      else if (data.status === "published") publishedCount++;
      else if (data.status === "rejected") rejectedCount++;
    });

    return {
      status: "success",
      summary: {
        draftCount,
        submittedCount,
        approvedCount,
        publishedCount,
        rejectedCount
      }
    };
  } catch (err) {
    loggerError("Seller.dashboard.summary: Firestore query error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Fetch all product documents owned by the authenticated contributor.
 * Chronologically sorted by updatedDate descending.
 *
 * @returns {Promise<
 * | { status: "success", products: Object[] }
 * | { status: "auth_required" }
 * | { status: "error", error: Error }
 * >}
 */
async function dashboardProducts() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.dashboard.products: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const q = fs.query(
      fs.collection(db, PRODUCT_DRAFTS_COLLECTION),
      fs.where("ownerUid", "==", user.uid),
      fs.orderBy("updatedDate", "desc")
    );

    const snap = await fs.getDocs(q);
    const products = snap.docs.map((doc) => ({ ...doc.data() }));

    return { status: "success", products };
  } catch (err) {
    loggerError("Seller.dashboard.products: Firestore query error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Read system notifications addressed specifically to the authenticated contributor.
 * Chronologically ordered newest first. Reads only without setting flags.
 *
 * @returns {Promise<
 * | { status: "success", notifications: Object[] }
 * | { status: "auth_required" }
 * | { status: "error", error: Error }
 * >}
 */
async function dashboardNotifications() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.dashboard.notifications: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const q = fs.query(
      fs.collection(db, NOTIFICATIONS_COLLECTION),
      fs.where("recipientUid", "==", user.uid),
      fs.orderBy("createdDate", "desc")
    );

    const snap = await fs.getDocs(q);
    const notifications = snap.docs.map((doc) => ({ ...doc.data() }));

    return { status: "success", notifications };
  } catch (err) {
    loggerError("Seller.dashboard.notifications: Firestore query error.", err);
    return { status: "error", error: err };
  }
}

/**
 * Read historical sales metrics/ledgers connected explicitly to the contributor context.
 * Performs no mutations or computational modifications to base records.
 *
 * @returns {Promise<
 * | { status: "success", sales: Object[] }
 * | { status: "auth_required" }
 * | { status: "error", error: Error }
 * >}
 */
async function dashboardSales() {
  const user = authGetCurrentUser();
  if (!user || !user.uid) {
    loggerWarn("Seller.dashboard.sales: no authenticated user.");
    return { status: "auth_required" };
  }

  try {
    const { db, fs } = await _firestoreBundle();
    const q = fs.query(
      fs.collection(db, TRANSACTIONS_COLLECTION),
      fs.where("contributorUid", "==", user.uid),
      fs.orderBy("timestamp", "desc")
    );

    const snap = await fs.getDocs(q);
    const sales = snap.docs.map((doc) => ({ ...doc.data() }));

    return { status: "success", sales };
  } catch (err) {
    loggerError("Seller.dashboard.sales: Firestore query error.", err);
    return { status: "error", error: err };
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export const Seller = {

  // Auth provider plug-in point — see setAuthProvider() above.
  setAuthProvider,

  // Internal event bus — subscribe/unsubscribe/emit.
  // Future modules will emit named events (e.g. "seller:ready", "product:submitted").
  on,
  off,
  once,
  emit,

  // Internal configuration module.
  config: {
    get:    configGet,
    set:    configSet,
    has:    configHas,
    remove: configRemove,
    reset:  configReset,
    getAll: configGetAll
  },

  // Internal logger module.
  logger: {
    info:       loggerInfo,
    warn:       loggerWarn,
    error:      loggerError,
    debug:      loggerDebug,
    getHistory: loggerGetHistory,
    clear:      loggerClear
  },

  // Internal validator module.
  validator: {
    required:        validatorRequired,
    email:           validatorEmail,
    number:          validatorNumber,
    integer:         validatorInteger,
    positiveNumber:  validatorPositiveNumber,
    string:          validatorString,
    nonEmptyString:  validatorNonEmptyString,
    array:           validatorArray,
    object:          validatorObject,
    boolean:         validatorBoolean,
    url:             validatorUrl,
    uuid:            validatorUuid,
    minLength:       validatorMinLength,
    maxLength:       validatorMaxLength,
    inRange:         validatorInRange,
    custom:          validatorCustom
  },

  // Firebase initialization — exposed for debugging and advanced use.
  // Future modules call _ensureFirebase() internally; pages should not
  // need to call this directly.
  _ensureFirebase,

  // Module 2: Seller Authentication.
  // Google Sign-In and passwordless Email Link (Magic Link) only.
  // No passwords. No Firestore writes. No profile creation.
  auth: {
    loginWithGoogle:  authLoginWithGoogle,
    loginWithEmail:   authLoginWithEmail,
    logout:           authLogout,
    getCurrentUser:   authGetCurrentUser,
    onUserChange:     authOnUserChange
  },

  // Module 3: Contributor Profile.
  // Manages the "contributors" Firestore collection.
  // Document ID = uid. One document per authenticated contributor.
  profile: {
    exists:   profileExists,
    get:      profileGet,
    create:   profileCreate,
    update:   profileUpdate,
    complete: profileComplete
  },

  // Module 4: Product Draft Management.
  // Manages the "productDrafts" Firestore collection.
  // ownerUid enforced on every read, update, and delete.
  products: {
    createDraft: productCreateDraft,
    getDraft:    productGetDraft,
    getDrafts:   productGetDrafts,
    updateDraft: productUpdateDraft,
    deleteDraft: productDeleteDraft
  },

  // Module 5: Product Submission.
  // Validates and submits existing drafts in the "productDrafts" collection.
  // No new collection. Status updated in place on the draft document.
  submission: {
    validate: submissionValidate,
    submit:   submissionSubmit
  },

  // Module 6: Contributor Dashboard Management.
  // Completely isolated query space targeting analytical read-only records.
  dashboard: {
    summary:       dashboardSummary,
    products:      dashboardProducts,
    notifications: dashboardNotifications,
    sales:         dashboardSales
  }

};

export default Seller;