/* checkout-paused.js — replaces the old embedded checkout.

   20 Sep 2026. Card payments are paused while we move to a new payment
   provider. This file takes the place of the previous checkout script and
   keeps the same hook (window.buyItNow), so every page that used to load
   the checkout keeps working without any other change.

   What it does now:
     - A paid kit shows a short "coming soon" message instead of opening a
       payment card, UNLESS that specific product already has a Gumroad
       link saved on its own Firestore record — see 2026-10-07 note below.
     - A FREE kit is untouched. The original buyItNow still runs, so free
       downloads keep working exactly as before.
     - Anything a buyer already owns is unaffected: My Purchases, the
       download endpoint and past orders are all server-side and were never
       part of this file.

   ── 2026-10-07 — Gumroad wiring, DATA-DRIVEN, no per-product code edits ──
   Earlier this file matched products to their Gumroad link by product
   title, kept in a hardcoded list here. That required editing this file
   every time a new product went live on Gumroad, and was fragile (titles
   differ slightly between the site and Gumroad).

   This version instead reads the Gumroad link directly off the product's
   OWN Firestore document (field: template.gumroadUrl), using the same
   document id already present in the page's URL (?firebase=ID). As each
   product gets its gumroadUrl field set in Firestore (done by the
   Gumroad-sync scripts, in daily batches), its Buy button on the site
   starts working automatically — nothing in this file needs to change.
   Products with no gumroadUrl yet still show the "coming soon" message
   below, exactly as before.                                               */
(function () {
  'use strict';

  var MESSAGE = 'Payments are being moved to a new provider — this kit will be ' +
                'available to buy again shortly.';

  // Same Firebase project the rest of the site already uses (public
  // client config — not a secret, same one visible in the category pages).
  var FIRESTORE_PROJECT_ID = 'templatehub-16cd7';

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

  function getFirebaseIdFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('firebase');
    } catch (e) {
      return null;
    }
  }

  // Reads template.gumroadUrl straight from this product's own Firestore
  // document via the public REST API (read-only, same access level the
  // page's own on-screen data already uses). Returns null on any failure
  // — never throws, so a network hiccup just falls back to "coming soon".
  function fetchGumroadUrl(docId) {
    var url = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_PROJECT_ID +
               '/databases/(default)/documents/templates/' + encodeURIComponent(docId);
    return fetch(url)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (!json || !json.fields || !json.fields.template) return null;
        var tplFields = json.fields.template.mapValue && json.fields.template.mapValue.fields;
        if (!tplFields || !tplFields.gumroadUrl) return null;
        return tplFields.gumroadUrl.stringValue || null;
      })
      .catch(function () { return null; });
  }

  var orig = window.buyItNow;
  window.buyItNow = function () {
    var d = data();
    if (!isPaid(d)) {
      if (typeof orig === 'function') orig();
      return;
    }

    var docId = getFirebaseIdFromUrl();
    if (!docId) {
      toast(MESSAGE);
      return;
    }

    // Show nothing yet — fetch is quick, but avoid a flash of the "coming
    // soon" message for products that DO have a link. Button press simply
    // waits briefly for the Firestore check before acting.
    fetchGumroadUrl(docId).then(function (link) {
      if (link) {
        window.open(link, '_blank', 'noopener');
      } else {
        toast(MESSAGE);
      }
    });
  };

  window.ldtCheckoutPaused = true;
  window.ldtCheckoutPausedMessage = MESSAGE;
})();
