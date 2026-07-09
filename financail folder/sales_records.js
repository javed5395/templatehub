// ============================================================================
// sales-records.js  —  Module 3: Commission Engine
// Deterministic Financial Split Processor & Pure Function Valuation Layer.
//
// This module owns exclusive responsibilities for interpreting the financial
// distribution metrics of recorded transaction facts. It enforces absolute 
// precision math rules, executes with zero side-effects, and never touches 
// the Firestore layer or system state engines directly.
// ============================================================================

/**
 * Pure, deterministic function that evaluates a transaction's historical record 
 * and outputs the exact platform and contributor split allocations.
 *
 * @param {Object} saleRecord - The raw or database-retrieved ledger fact object.
 * @returns {Object} Structured data describing the financial split, or failure code.
 */
function calculateCommission(saleRecord) {
  // 1. Initial Structural Input Constraints
  if (!saleRecord || typeof saleRecord !== "object" || Array.isArray(saleRecord)) {
    loggerWarn("Commission calculation aborted: Input payload record context is invalid.");
    return { status: "invalid_input" };
  }

  const {
    orderId,
    sellerUid,
    grossAmount,
    currency,
    commissionRate: recordCommissionRate = null
  } = saleRecord;

  // 2. Strict Input Presence & Numeric Data Type Checks
  if (!validatorRequired(orderId) || !validatorRequired(sellerUid) || !validatorRequired(currency)) {
    loggerWarn("Commission calculation aborted: Missing mandatory identifier fields.");
    return { status: "invalid_input" };
  }

  if (!validatorNumber(grossAmount) || isNaN(grossAmount)) {
    loggerWarn("Commission calculation aborted: Gross amount is missing or not an authentic numeric type.");
    return { status: "missing_grossAmount" };
  }

  if (grossAmount < 0) {
    loggerWarn("Commission calculation aborted: Gross value contains negative financial fields.");
    return { status: "negative_or_nan_values" };
  }

  // 3. Resolve Authoritative Commission Split Targeting
  let activeRate;
  
  if (recordCommissionRate !== null && recordCommissionRate !== undefined) {
    if (!validatorNumber(recordCommissionRate) || isNaN(recordCommissionRate) || recordCommissionRate < 0 || recordCommissionRate > 1) {
      loggerWarn("Commission calculation aborted: Custom track record commission rate out of bounds [0-1].");
      return { status: "invalid_commission_rate" };
    }
    activeRate = Number(recordCommissionRate);
  } else {
    // Graceful baseline fallback targeting the Module 1 global infrastructure configuration store
    const fallbackRate = configGet("basePlatformCommissionRate");
    if (!validatorNumber(fallbackRate) || isNaN(fallbackRate) || fallbackRate < 0 || fallbackRate > 1) {
      loggerWarn("Commission calculation aborted: Infrastructure global commission rate is invalid.");
      return { status: "invalid_commission_rate" };
    }
    activeRate = Number(fallbackRate);
  }

  // 4. Precision Financial Math Implementations (Guarding Against Floating Point Drift)
  // Convert dollars to cents entirely before calculation to secure exact ledger bounds
  const grossCents = Math.round(Number(grossAmount) * 100);
  const platformCommissionCents = Math.round(grossCents * activeRate);
  const sellerEarningsCents = grossCents - platformCommissionCents;

  // Remap cents smoothly back into primary currency point structures (.XX fixed floats)
  const platformCommission = Number((platformCommissionCents / 100).toFixed(2));
  const sellerEarnings = Number((sellerEarningsCents / 100).toFixed(2));
  const finalGrossAmount = Number((grossCents / 100).toFixed(2));

  // 5. Build Successful Deterministic Response Output Frame
  return {
    orderId: String(orderId).trim(),
    grossAmount: finalGrossAmount,
    platformCommission: platformCommission,
    sellerEarnings: sellerEarnings,
    commissionRate: activeRate,
    currency: String(currency).trim().toUpperCase()
  };
}

// ============================================================================
// Public System API Framework Upgrades (Appended seamlessly to Module 1 & 2 Export)
// ============================================================================
export const SalesRecords = {
  // Module 1 Core Hooks
  on: eventOn,
  off: eventOff,
  once: eventOnce,
  emit: eventEmit,
  config: { get: configGet, set: configSet, has: configHas, remove: configRemove, reset: configReset, getAll: configGetAll },
  logger: { info: loggerInfo, warn: loggerWarn, error: loggerError, debug: loggerDebug, getHistory: loggerGetHistory },
  validator: { required: validatorRequired, number: validatorNumber, positiveNumber: validatorPositiveNumber, nonEmptyString: validatorNonEmptyString },
  _ensureFirebase,

  // Module 2 Ledger Functions
  ledger: {
    recordSale: recordSale
  },

  // Module 3 Split Calculation Layers
  engine: {
    calculateCommission: calculateCommission
  }
};

export default SalesRecords;