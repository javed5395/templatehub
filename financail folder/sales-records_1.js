// ============================================================================
// sales-records-1.js  —  Continuation Shell Infrastructure & Modules 4–9
// Financial Ecosystem Extension for LazyDogTemplates.
//
// Version: 1.6.0-Module9
//
// Purpose:
//   This file serves as the official runtime extension and architectural 
//   continuation shell for the platform's core financial engine.
//
// Module 9 — Payment Provider Adapter Layer:
//   Responsible exclusively for maintaining a private runtime abstraction gateway
//   for future provider plugins (Payoneer, Wise, Stripe, etc.). This ensures the
//   financial engine remains entirely independent of third-party API layouts.
//   It does NOT execute jobs, store access keys, or call external services.
// ============================================================================

// ============================================================================
// Private Continuation State & Module Management
// ============================================================================
let _coreEngineReference = null;
const TRANSACTIONS_COLLECTION = "transactions";
const PAYOUT_QUEUE_COLLECTION = "payoutQueue";
const PAYMENT_JOBS_COLLECTION = "paymentJobs";

// Private in-memory registry map isolated entirely from Firestore persistence
const _registeredProviders = new Map();

// ============================================================================
// Internal Dependency Verification & Context Resolution Helpers
// ============================================================================

/**
 * Safely resolves and hooks into the parent single-source-of-truth engine instance.
 * Prevents initialization duplication and executes runtime environment testing.
 *
 * @private
 * @returns {Object} The authoritative, fully instantiated SalesRecords parent API.
 * @throws {Error} If the underlying foundation engine is missing or unverified.
 */
function _resolveCoreEngine() {
  if (_coreEngineReference) {
    return _coreEngineReference;
  }

  const globalRef = window.SalesRecords;

  if (!globalRef || typeof globalRef !== "object") {
    const structuralError = new Error(
      "[SalesRecords-Continuation CRITICAL] Dependency Resolution Failure: " +
      "The core sales-records.js module (Modules 1-3) must be fully loaded " +
      "and registered on the global window context prior to initializing this extension wrapper."
    );
    console.error(structuralError.message);
    throw structuralError;
  }

  if (
    typeof globalRef._ensureFirebase !== "function" ||
    !globalRef.ledger ||
    !globalRef.engine
  ) {
    const interfaceError = new Error(
      "[SalesRecords-Continuation CRITICAL] Interface Integrity Failure: " +
      "The registered SalesRecords instance does not present the mandatory " +
      "Module 1-3 structural footprints or core API schema contracts."
    );
    console.error(interfaceError.message);
    throw interfaceError;
  }

  _coreEngineReference = globalRef;
  
  _coreEngineReference.logger.info(
    "SalesRecords-Continuation bridge safely linked to core financial engine foundation."
  );

  return _coreEngineReference;
}

/**
 * Structural verification guard to ensure runtime execution environment health.
 *
 * @private
 * @returns {boolean} True if the architectural dependency layout passes validation.
 */
function _verifySystemSanity() {
  try {
    return !!_resolveCoreEngine();
  } catch (e) {
    return false;
  }
}

// ============================================================================
// MODULE 4 — TRANSACTION PROCESSOR IMPLEMENTATION
// ============================================================================

/**
 * Pulls a recorded sale fact, runs it through the authoritative core commission split,
 * and writes a deterministic, immutable financial transaction record.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Operational result status flags and reference IDs.
 */
async function processTransaction(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    console.warn("[Module 4] Transaction processing aborted: Invalid or empty orderId provided.");
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const saleSnapshot = await db.collection("salesRecords").doc(cleanOrderId).get();
    if (!saleSnapshot.exists) {
      core.logger.warn(`Transaction processing aborted: Parent sale record missing for Order ID: ${cleanOrderId}`);
      return { status: "sale_not_found" };
    }

    const saleRecordData = saleSnapshot.data();

    const txDocRef = db.collection(TRANSACTIONS_COLLECTION).doc(cleanOrderId);
    const txSnapshot = await txDocRef.get();
    if (txSnapshot.exists) {
      core.logger.info(`Transaction processing short-circuited: Document already processed for Order ID: ${cleanOrderId}`);
      return { status: "already_processed" };
    }

    const splits = core.engine.calculateCommission(saleRecordData);
    
    if (!splits || splits.status) {
      core.logger.error(`Transaction processing failed: Commission formula layer returned an invalid split sequence.`, splits);
      return { status: "invalid_commission_rate" };
    }

    const immutableTransactionDocument = {
      transactionId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: String(saleRecordData.sellerUid).trim(),
      buyerUid: saleRecordData.buyerUid ? String(saleRecordData.buyerUid).trim() : null,
      productId: String(saleRecordData.templateId).trim(),
      grossAmount: Number(splits.grossAmount),
      commissionRate: Number(splits.commissionRate),
      platformCommission: Number(splits.platformCommission),
      sellerEarnings: Number(splits.sellerEarnings),
      currency: String(splits.currency).toUpperCase(),
      transactionDate: window.firebase.firestore.FieldValue.serverTimestamp(),
      status: "settled"
    };

    await txDocRef.set(immutableTransactionDocument);
    core.logger.info(`Transaction document successfully formalized and frozen for Order ID: ${cleanOrderId}`);

    core.emit("transaction:processed", {
      transactionId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: immutableTransactionDocument.sellerUid,
      grossAmount: immutableTransactionDocument.grossAmount
    });

    return {
      status: "processed",
      orderId: cleanOrderId,
      transactionId: cleanOrderId
    };

  } catch (error) {
    console.error(`[Module 4 CRITICAL] FireStore transaction processing runtime exception:`, error);
    return { status: "firestore_error" };
  }
}

// ============================================================================
// MODULE 5 — PAYOUT QUEUE ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Validates a processed transaction record and cleanly packages its verified
 * seller earnings value into an immutable clearance queue log.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Operational result status flags and database reference contexts.
 */
async function queueSellerPayout(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    console.warn("[Module 5] Payout staging aborted: Invalid or empty orderId provided.");
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const txSnapshot = await db.collection(TRANSACTIONS_COLLECTION).doc(cleanOrderId).get();
    if (!txSnapshot.exists) {
      core.logger.warn(`Payout staging aborted: Corresponding transaction document missing for Order ID: ${cleanOrderId}`);
      return { status: "transaction_not_found" };
    }

    const transactionData = txSnapshot.data();

    const queueDocRef = db.collection(PAYOUT_QUEUE_COLLECTION).doc(cleanOrderId);
    const queueSnapshot = await queueDocRef.get();
    if (queueSnapshot.exists) {
      core.logger.info(`Payout staging short-circuited: Queue entry already present for Order ID: ${cleanOrderId}`);
      return { status: "already_queued" };
    }

    const targetEarnings = transactionData.sellerEarnings;
    const targetCurrency = transactionData.currency;
    const targetSellerUid = transactionData.sellerUid;

    if (targetEarnings === undefined || targetEarnings === null || !targetSellerUid) {
      core.logger.error(`Payout staging failed: Transaction document contains incomplete financial variables for Order ID: ${cleanOrderId}`);
      return { status: "invalid_transaction_data" };
    }

    const immutablePayoutQueueDocument = {
      queueId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: String(targetSellerUid).trim(),
      sellerEarnings: Number(targetEarnings),
      currency: String(targetCurrency).toUpperCase(),
      queuedDate: window.firebase.firestore.FieldValue.serverTimestamp(),
      status: "queued"
    };

    await queueDocRef.set(immutablePayoutQueueDocument);
    core.logger.info(`Payout sequence cleanly locked into liquidation queue for Order ID: ${cleanOrderId}`);

    core.emit("payout:queued", {
      queueId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: immutablePayoutQueueDocument.sellerUid,
      sellerEarnings: immutablePayoutQueueDocument.sellerEarnings
    });

    return {
      status: "queued",
      orderId: cleanOrderId,
      queueId: cleanOrderId
    };

  } catch (error) {
    console.error(`[Module 5 CRITICAL] Firestore payout queue staging runtime exception:`, error);
    return { status: "firestore_error" };
  }
}

// ============================================================================
// MODULE 6 — PAYOUT APPROVAL ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Transitions the status of an existing staged payout log from "queued" to "approved".
 * Evaluates for presence and protects against duplicate state transformations.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Operational outcome state descriptions.
 */
async function approvePayout(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    console.warn("[Module 6] Payout approval aborted: Invalid or empty orderId provided.");
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const queueDocRef = db.collection(PAYOUT_QUEUE_COLLECTION).doc(cleanOrderId);
    
    const queueSnapshot = await queueDocRef.get();
    if (!queueSnapshot.exists) {
      core.logger.warn(`Payout approval aborted: Staged queue entry missing for Order ID: ${cleanOrderId}`);
      return { status: "queue_not_found" };
    }

    const queueData = queueSnapshot.data();

    if (queueData.status === "approved") {
      core.logger.info(`Payout approval bypassed: Staged entry already validated as approved for Order ID: ${cleanOrderId}`);
      return { status: "already_approved" };
    }

    if (queueData.status !== "queued") {
      core.logger.warn(`Payout approval rejected: Invalid state transformation sequence from '${queueData.status}' for Order ID: ${cleanOrderId}`);
      return { status: "invalid_status_transition" };
    }

    await queueDocRef.update({
      status: "approved",
      approvedDate: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    core.logger.info(`Payout approval state transition securely committed for Order ID: ${cleanOrderId}`);

    core.emit("payout:approved", {
      queueId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: queueData.sellerUid,
      sellerEarnings: queueData.sellerEarnings
    });

    return {
      status: "approved",
      orderId: cleanOrderId
    };

  } catch (error) {
    console.error(`[Module 6 CRITICAL] Firestore payout approval state update exception:`, error);
    return { status: "firestore_error" };
  }
}

/**
 * Read-only accessor targeting the explicit runtime lifecycle state of a payout.
 * Performs no mutations, side effects, or writes.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Object wrapping the active status or fallback error strings.
 */
async function getApprovalStatus(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const queueSnapshot = await db.collection(PAYOUT_QUEUE_COLLECTION).doc(cleanOrderId).get();
    if (!queueSnapshot.exists) {
      return { status: "queue_not_found" };
    }

    const data = queueSnapshot.data();
    return {
      orderId: cleanOrderId,
      status: data.status || "unknown",
      approvedDate: data.approvedDate || null,
      queuedDate: data.queuedDate || null
    };

  } catch (error) {
    return { status: "firestore_error" };
  }
}

// ============================================================================
// MODULE 7 — PAYMENT JOB ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Validates approval bounds within the staging queue and records a single,
 * unexecuted, immutable execution job entry matching the order context.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Operational result status flags and database descriptors.
 */
async function createPaymentJob(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    console.warn("[Module 7] Payment job generation aborted: Invalid or empty orderId provided.");
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const queueSnapshot = await db.collection(PAYOUT_QUEUE_COLLECTION).doc(cleanOrderId).get();
    if (!queueSnapshot.exists) {
      core.logger.warn(`Payment job generation aborted: Staged queue entry missing for Order ID: ${cleanOrderId}`);
      return { status: "queue_not_found" };
    }

    const queueData = queueSnapshot.data();

    if (queueData.status !== "approved") {
      core.logger.warn(`Payment job generation blocked: Staged payout state is currently '${queueData.status}', not approved for Order ID: ${cleanOrderId}`);
      return { status: "not_approved" };
    }

    const jobDocRef = db.collection(PAYMENT_JOBS_COLLECTION).doc(cleanOrderId);
    const jobSnapshot = await jobDocRef.get();
    if (jobSnapshot.exists) {
      core.logger.info(`Payment job generation short-circuited: Execution job already registered for Order ID: ${cleanOrderId}`);
      return { status: "already_created" };
    }

    const immutablePaymentJobDocument = {
      jobId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: String(queueData.sellerUid).trim(),
      amount: Number(queueData.sellerEarnings),
      currency: String(queueData.currency).toUpperCase(),
      createdDate: window.firebase.FieldValue.serverTimestamp(),
      status: "pending"
    };

    await jobDocRef.set(immutablePaymentJobDocument);
    core.logger.info(`Payment execution job successfully drafted and frozen under pending status for Order ID: ${cleanOrderId}`);

    core.emit("payment:job_created", {
      jobId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: immutablePaymentJobDocument.sellerUid,
      amount: immutablePaymentJobDocument.amount
    });

    return {
      status: "created",
      orderId: cleanOrderId,
      jobId: cleanOrderId
    };

  } catch (error) {
    console.error(`[Module 7 CRITICAL] Firestore payment job creation pipeline exception:`, error);
    return { status: "firestore_error" };
  }
}

// ============================================================================
// MODULE 8 — PAYMENT EXECUTION ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Validates a target job record's state criteria within the payment register
 * and commits an execution state transition from "pending" to "executing".
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Operational execution status flags.
 */
async function beginExecution(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    console.warn("[Module 8] Payment execution gate aborted: Invalid or empty orderId parameter.");
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const jobDocRef = db.collection(PAYMENT_JOBS_COLLECTION).doc(cleanOrderId);
    
    const jobSnapshot = await jobDocRef.get();
    if (!jobSnapshot.exists) {
      core.logger.warn(`Payment execution gate aborted: Target payment job blueprint missing for Order ID: ${cleanOrderId}`);
      return { status: "job_not_found" };
    }

    const jobData = jobSnapshot.data();

    if (jobData.status !== "pending") {
      core.logger.info(`Payment execution gate short-circuited: Job state is already '${jobData.status}', not pending for Order ID: ${cleanOrderId}`);
      return { status: "invalid_state" };
    }

    await jobDocRef.update({
      status: "executing",
      executionStartedDate: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    core.logger.info(`Payment execution lock successfully applied. Transitioning to executing status for Order ID: ${cleanOrderId}`);

    core.emit("payment:execution_started", {
      jobId: cleanOrderId,
      orderId: cleanOrderId,
      sellerUid: jobData.sellerUid,
      amount: jobData.amount
    });

    return {
      status: "executing",
      orderId: cleanOrderId
    };

  } catch (error) {
    console.error(`[Module 8 CRITICAL] Firestore payment execution lock pipeline exception:`, error);
    return { status: "firestore_error" };
  }
}

/**
 * Read-only accessor targeting the exact execution lifecycle milestone of a payment job.
 * Performs no document mutations or status updates.
 *
 * @param {string} orderId - Unique storefront or payment gateway order indicator.
 * @returns {Promise<Object>} Object capturing active status keys or transactional error codes.
 */
async function getExecutionStatus(orderId) {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    return { status: "invalid_input" };
  }

  const cleanOrderId = orderId.trim();

  try {
    const core = _resolveCoreEngine();
    const { db } = await core._ensureFirebase();

    const jobSnapshot = await db.collection(PAYMENT_JOBS_COLLECTION).doc(cleanOrderId).get();
    if (!jobSnapshot.exists) {
      return { status: "job_not_found" };
    }

    const data = jobSnapshot.data();
    return {
      orderId: cleanOrderId,
      status: data.status || "unknown",
      createdDate: data.createdDate || null,
      executionStartedDate: data.executionStartedDate || null
    };

  } catch (error) {
    return { status: "firestore_error" };
  }
}

// ============================================================================
// MODULE 9 — PAYMENT PROVIDER ADAPTER LAYER IMPLEMENTATION
// ============================================================================

/**
 * Registers an abstract gateway provider instance within the runtime memory map.
 * Enforces validation parameters and intercepts matching duplicate keys.
 *
 * @param {string} name - Uniquely identifies the provider token (e.g., "payoneer").
 * @param {Object} adapter - Concrete operational plugin interface map.
 * @returns {Object} Operational status report metadata.
 */
function registerProvider(name, adapter) {
  // Validate presence and typing constraint boundaries
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    console.warn("[Module 9] Provider registration rejected: Invalid or blank identifier key.");
    return { status: "invalid_input" };
  }
  
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    console.warn("[Module 9] Provider registration rejected: Target implementation must be an object schema map.");
    return { status: "invalid_input" };
  }

  const cleanName = name.trim().toLowerCase();
  const core = _resolveCoreEngine();

  // Reject duplicate interface configurations
  if (_registeredProviders.has(cleanName)) {
    core.logger.warn(`Provider registration short-circuited: Key '${cleanName}' is already registered in the adapter map.`);
    return { status: "already_registered" };
  }

  // Add the plugin mapping directly inside private memory context
  _registeredProviders.set(cleanName, adapter);
  core.logger.info(`Payment provider interface layer successfully registered under key: '${cleanName}'`);

  return { status: "registered", provider: cleanName };
}

/**
 * Obtains a referenced driver instance from the runtime storage context.
 *
 * @param {string} name - Uniquely identifies the provider token.
 * @returns {Object|null} The raw adapter object mapping reference, or null if unmapped.
 */
function getProvider(name) {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return null;
  }
  const cleanName = name.trim().toLowerCase();
  return _registeredProviders.get(cleanName) || null;
}

/**
 * Builds a plain read-only array index summarizing the mapped driver system tags.
 *
 * @returns {Array<string>} An isolated snapshot array containing active provider tags.
 */
function listProviders() {
  // Returns a new array copy to avoid structural reference leaking
  return Array.from(_registeredProviders.keys());
}

// ============================================================================
// Public System Extension API Framework (Upgraded for Module 9)
// ============================================================================
export const SalesRecordsContinuation = {
  // Structural Link Validation Functions
  verifyLinkage: _verifySystemSanity,
  _getCoreBridge: _resolveCoreEngine,

  // Module 4 Transaction Processing Enclave
  transaction: {
    process: processTransaction
  },

  // Module 5 & 6 Payout Operations Enclave
  payout: {
    queue: queueSellerPayout,
    approve: approvePayout,
    status: getApprovalStatus
  },

  // Module 7 & 8 Payment Dispersal & State Lock Enclave
  payment: {
    createJob: createPaymentJob,
    beginExecution: beginExecution,
    executionStatus: getExecutionStatus
  },

  // Module 9 Payment Provider Adapter Interface Enclave Upgrades
  provider: {
    register: registerProvider,
    get: getProvider,
    list: listProviders
  }
};

export default SalesRecordsContinuation;