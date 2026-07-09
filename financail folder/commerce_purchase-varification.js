// ============================================================================
// ARCHITECTURAL REFINEMENT: MODULE 9 & MODULE 13 CLEANUP
// For LazyDogTemplates Marketplace Commerce Engine.
//
// Changes:
// 1. Module 9: Removed 'downloadReady' parameter from list entries. 
// 2. Module 13: Verifies ownership strictly by calling `Commerce.library.hasAccess()`.
// ============================================================================

(function () {
  // Guard system boundaries across layers
  if (typeof Commerce === "undefined" || !Commerce.order || !Commerce.finance) {
    console.error("[Cleanup CRITICAL] Pre-requisite Commerce layers are missing.");
    return;
  }

  // Ensure namespaces exist cleanly
  if (!Commerce.library) Commerce.library = {};

  /** Private database resolver */
  async function _getFirestoreInstance() {
    if (typeof Commerce._ensureFirebase === "function") {
      const fb = await Commerce._ensureFirebase();
      if (fb && fb.db) return fb.db;
    }
    if (typeof window !== "undefined" && window.firebase && window.firebase.firestore) {
      return window.firebase.firestore();
    }
    return null;
  }

  // ============================================================================
  // REFINED MODULE 9: BUYER PURCHASE LIBRARY (Factual Purchase Data Only)
  // ============================================================================

  /**
   * Pulls and transforms every completed purchase document belonging to a buyer.
   * EXPOSES FACTUAL PURCHASE INFORMATION ONLY. NO download authorization states.
   */
  Commerce.library.list = async function (buyerId) {
    if (!buyerId || typeof buyerId !== "string" || !buyerId.trim()) return [];

    const targetBuyer = buyerId.trim();
    const purchaseRecordsList = [];

    try {
      const db = await _getFirestoreInstance();
      if (!db || typeof db.collection !== "function") return [];

      const querySnapshot = await db.collection("orders")
        .where("buyerId", "==", targetBuyer)
        .get();

      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        if (Array.isArray(orderData.items)) {
          orderData.items.forEach((item) => {
            purchaseRecordsList.push({
              orderId: orderData.orderId,
              purchaseDate: orderData.createdDate,
              productId: item.productId,
              productTitle: item.productTitle,
              sellerId: item.sellerId,
              quantity: item.quantity,
              financialStatus: orderData.financialStatus || "created",
              orderStatus: orderData.orderStatus || "created"
            });
          });
        }
      });

      return purchaseRecordsList.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    } catch (error) {
      console.error("[Module 9 Cleanup Exception] Failed listing factual purchases:", error);
      return [];
    }
  };

  /** Returns one raw purchase record from the order layer. Read-only. */
  Commerce.library.get = async function (orderId) {
    if (!orderId || typeof orderId !== "string" || !orderId.trim()) return null;
    return await Commerce.order.get(orderId.trim());
  };

  /** The authoritative gatekeeper checking financial settlement. Read-only. */
  Commerce.library.hasAccess = async function (orderId) {
    if (!orderId || typeof orderId !== "string" || !orderId.trim()) return false;

    try {
      const financialDetails = await Commerce.finance.status(orderId.trim());
      if (!financialDetails || !financialDetails.financialStatus) return false;

      const token = financialDetails.financialStatus.toLowerCase();
      return (token === "paid" || token === "settled" || token === "submitted_to_ledger" || token === "completed");
    } catch (error) {
      return false;
    }
  };


  // ============================================================================
  // REFINED MODULE 13: PURCHASE VERIFICATION ENGINE (Layer Isolation Enforced)
  // ============================================================================

  /**
   * central ownership verification engine.
   * Asserts validity by piping historical list records straight into hasAccess() verification rules.
   */
  Commerce.library.ownsProduct = async function (buyerId, productId) {
    if (!buyerId || typeof buyerId !== "string" || !buyerId.trim() ||
        !productId || typeof productId !== "string" || !productId.trim()) {
      return false;
    }

    const targetProductId = productId.trim();

    try {
      // Step 1: Query intermediate Library Layer
      const masterRecords = masterRecords || await Commerce.library.list(buyerId);
      
      // Step 2: Locate target product match row entries
      const matchingRecords = masterRecords.filter(r => r.productId === targetProductId);
      if (matchingRecords.length === 0) return false;

      // Step 3: Validate authoritative lifecycle access for matches
      for (const record of matchingRecords) {
        const clear = await Commerce.library.hasAccess(record.orderId);
        if (clear) return true; // Validated ownership cleared successfully
      }

      return false;
    } catch (error) {
      console.error("[Module 13 Cleanup Exception] Error matching product verification rules:", error);
      return false;
    }
  };

  /** Returns a unique set collection of all product IDs where ownership is cleared. */
  Commerce.library.getOwnedProducts = async function (buyerId) {
    if (!buyerId || typeof buyerId !== "string" || !buyerId.trim()) return [];

    try {
      const masterRecords = await Commerce.library.list(buyerId);
      const verifiedOwnedSet = new Set();

      for (const record of masterRecords) {
        if (record.productId) {
          const clear = await Commerce.library.hasAccess(record.orderId);
          if (clear) {
            verifiedOwnedSet.add(record.productId);
          }
        }
      }

      return Array.from(verifiedOwnedSet);
    } catch (error) {
      console.error("[Module 13 Cleanup Exception] Error parsing unique owned products collections:", error);
      return [];
    }
  };

})();