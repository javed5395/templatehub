/* checkout-paused.js — replaces the old embedded checkout.

   20 Sep 2026. Card payments are paused while we move to a new payment
   provider. This file takes the place of the previous checkout script and
   keeps the same hook (window.buyItNow), so every page that used to load
   the checkout keeps working without any other change.

   What it does now:
     - A paid kit shows a short "coming soon" message instead of opening a
       payment card. Nothing is charged and nothing is unlocked.
     - A FREE kit is untouched. The original buyItNow still runs, so free
       downloads keep working exactly as before.
     - Anything a buyer already owns is unaffected: My Purchases, the
       download endpoint and past orders are all server-side and were never
       part of this file.

   When the new provider is live, replace the body of buyItNow below with the
   new checkout call. The rest of the site needs no edit.                    */
(function () {
  'use strict';

  var MESSAGE = 'Payments are being moved to a new provider — this kit will be ' +
                'available to buy again shortly.';

  function data() {
    var n = ['currentKitData','currentDeckData','currentKeynoteData','currentWebKitData','currentProductData'];
    for (var i = 0; i < n.length; i++) { if (window[n[i]]) return window[n[i]]; }
    return {};
  }

  function isPaid(d) {
    var p = String(d.price == null ? '' : d.price).trim().toLowerCase();
    return !(p === '' || p === 'free' || p === '0' || parseFloat(p) === 0);
  }

  function toast(m) {
    if (typeof ldtToast === 'function') { ldtToast(m); return; }
    try { alert(m); } catch (e) {}
  }

  var orig = window.buyItNow;
  window.buyItNow = function () {
    var d = data();
    if (isPaid(d)) { toast(MESSAGE); return; }
    if (typeof orig === 'function') orig();
  };

  /* Let the pages mark their buy buttons as paused if they want to. Pages that
     do nothing simply get the message above when the button is pressed. */
  window.ldtCheckoutPaused = true;
  window.ldtCheckoutPausedMessage = MESSAGE;
})();
