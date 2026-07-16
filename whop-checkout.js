/* ══════════════════════════════════════════════════════════════════════════
   whop-checkout.js — LazyDogTemplates × Whop payment bridge
   ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   Each kit's Firestore `templates` doc may carry a field:

       whopPlanId : "plan_XXXXXXXXXXXX"

   Product pages already load that doc into `currentKitData`. This script
   (loaded AFTER the page's inline scripts) overrides window.buyItNow:

     - kit HAS whopPlanId  → open https://whop.com/checkout/<planId>
                             (Whop's secure checkout; file access is granted
                             by Whop on successful payment)
     - kit has NO planId   → fall back to the page's original handler
                             (the "coming soon" toast), nothing breaks.

   SCALING: to put any kit on sale, add its whopPlanId in Firestore.
   No code changes, no button edits — this one file serves all pages.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WHOP_CHECKOUT_BASE = 'https://whop.com/checkout/';

  function getPlanId() {
    try {
      var k = (typeof currentKitData !== 'undefined' && currentKitData) ? currentKitData : (window.currentKitData || {});
      var pid = k.whopPlanId || k.whop_plan_id || '';
      pid = String(pid).trim();
      /* accept a bare plan id or a full pasted checkout URL */
      var m = pid.match(/plan_[A-Za-z0-9]+/);
      return m ? m[0] : '';
    } catch (e) { return ''; }
  }

  /* keep the page's original handler as fallback */
  var originalBuyItNow = window.buyItNow;

  window.buyItNow = function () {
    var planId = getPlanId();
    if (planId) {
      window.open(WHOP_CHECKOUT_BASE + planId, '_blank', 'noopener');
      return;
    }
    /* no plan wired for this kit yet → original behaviour */
    if (typeof originalBuyItNow === 'function') { originalBuyItNow(); }
    else if (typeof ldtToast === 'function') { ldtToast('Checkout for this kit is coming soon.'); }
  };
})();
