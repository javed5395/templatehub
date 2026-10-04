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

  /* ── GUMROAD LINKS, 2026-10-07 ────────────────────────────────────────
     Products live on Gumroad get their checkout URL listed here. "match" is
     a short, distinctive fragment of the title — matching is normalized
     (lowercased, punctuation stripped) and checks whether the fragment
     appears ANYWHERE in the page's title, so it survives small wording
     differences between the on-page heading and the Gumroad listing name
     (e.g. an em dash vs hyphen, or "Template" / "12 Slides" being present
     on one side and not the other). Add a new line here each time a
     product goes live on Gumroad — no other code change needed. Keep each
     "match" fragment short but specific enough that it won't accidentally
     match a different product's title. Everything NOT listed here still
     falls through to the "coming soon" message below, unchanged. */
  var GUMROAD_LINKS = [
    { match: 'startup pitch deck',
      url: 'https://javedmind3.gumroad.com/l/pd001-startup-pitch-deck?wanted=true' }
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

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

  function gumroadLink(d) {
    var raw = (d && (d.title || d.name)) ? String(d.title || d.name) : '';
    var t = norm(raw);
    if (!t) return null;
    for (var i = 0; i < GUMROAD_LINKS.length; i++) {
      if (t.indexOf(norm(GUMROAD_LINKS[i].match)) !== -1) return GUMROAD_LINKS[i].url;
    }
    return null;
  }

  var orig = window.buyItNow;
  window.buyItNow = function () {
    var d = data();
    if (isPaid(d)) {
      var link = gumroadLink(d);
      if (link) { window.open(link, '_blank', 'noopener'); return; }
      /* No Gumroad match — log the raw product data so a field-name or
         text mismatch is visible in DevTools (F12 > Console) right away,
         instead of needing another round of screenshots to diagnose. */
      try { console.log('[gumroad] no match for product data:', d); } catch (e) {}
      toast(MESSAGE);
      return;
    }
    if (typeof orig === 'function') orig();
  };

  /* Let the pages mark their buy buttons as paused if they want to. Pages that
     do nothing simply get the message above when the button is pressed. */
  window.ldtCheckoutPaused = true;
  window.ldtCheckoutPausedMessage = MESSAGE;
})();
