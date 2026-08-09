/* whop-checkout.js — on-site embedded Whop checkout.
   Paid kit → payment popup ON this site (no redirect) → the SERVER records the
   purchase → the file unlocks. Free kit → untouched (handled by ldtRequestDownload).

   ── F06 REWRITE, 29 Jul 2026 ────────────────────────────────────────────────
   What was wrong before:
     1. `window.whopDone` was a global the checkout called on success — which
        meant anyone could open the console, type whopDone(), and be handed a
        paid file for free. Success was decided in the browser.
     2. Nothing was recorded anywhere. Even a real buyer who genuinely paid got
        the file exactly once; on reload the Download button said "Locked"
        again, because no purchase existed to find.
     3. deliver() fell back to `d.slides[0]` — a PREVIEW IMAGE — when the real
        file URL was missing, so a paying customer could receive a PNG.

   How it works now:
     - Checkout requires being signed in, and the email field is prefilled AND
       locked to the account's email. That is what lets the server match the
       payment to a Firebase user.
     - On completion the browser does NOT unlock anything. It asks the server
       "do I own this yet?" and waits for Whop's webhook to land. The unlock is
       a consequence of a recorded purchase, never of a client-side callback.
     - If the webhook is slow, the buyer is told it is processing rather than
       being handed the file on trust.                                          */
(function () {
  'use strict';

  // load Whop embedded-checkout script once
  if (!document.getElementById('whop-loader')) {
    var s = document.createElement('script');
    s.id = 'whop-loader'; s.async = true; s.defer = true;
    s.src = 'https://js.whop.com/static/checkout/loader.js';
    document.head.appendChild(s);
  }

  function data() {
    var n = ['currentKitData','currentDeckData','currentKeynoteData','currentWebKitData','currentProductData'];
    for (var i=0;i<n.length;i++){ if(window[n[i]]) return window[n[i]]; }
    return {};
  }
  function isPaid(d){ var p=String(d.price==null?'':d.price).trim().toLowerCase();
    return !(p===''||p==='free'||p==='0'||parseFloat(p)===0); }
  /* 9 Aug 2026 — licence-aware. window.ldtLicence is set by the licence chooser
     on the slide page ('personal' | 'commercial'); pages without a chooser
     simply leave it undefined and get Personal, exactly as before.

     Falls back to the Personal plan if a Commercial plan id is missing. That
     under-charges rather than failing the sale, and it can never charge the
     Commercial price against the Personal plan — the price the buyer sees comes
     from whopCommercialPrice, which is only shown when the plan exists. */
  function planId(d, licence){
    var v = '';
    if (licence === 'commercial') v = d.whopCommercialPlanId || d.whop_commercial_plan_id || '';
    if (!v) v = d.whopPlanId || d.whop_plan_id || '';
    var m = String(v).match(/plan_[A-Za-z0-9]+/);
    return m ? m[0] : '';
  }
  function chosenLicence(){
    return (window.ldtLicence === 'commercial') ? 'commercial' : 'personal';
  }
  function toast(m){ if (typeof ldtToast==='function') ldtToast(m); }

  function currentUser(){
    try {
      if (window.Commerce && window.Commerce.auth && window.Commerce.auth.getCurrentUser) {
        var u = window.Commerce.auth.getCurrentUser();
        if (u && u.uid) return u;
      }
    } catch(e){}
    return null;
  }

  function productId(d){
    try { if (typeof ldtCurrentProduct === 'function') return ldtCurrentProduct().productId; } catch(e){}
    return String(window._ldtProductId ||
      (new URLSearchParams(location.search)).get('firebase') || (d && d.id) || '');
  }

  /* Deliver the REAL file only. No preview-image fallback: handing a buyer a
     PNG because the pptx URL was missing is worse than an honest error.

     F10: the URL is no longer in the page data — it comes from the server,
     which re-checks entitlement. That double-check is deliberate: this runs
     immediately after payment, so if the webhook has not landed yet the server
     will correctly say "purchase required" and we tell the buyer to wait rather
     than handing over a file we cannot yet prove they own. */
  function deliver(d){
    var pid = productId(d);
    if (!pid || typeof window.ldtFetchDownloadUrl !== 'function') {
      toast('Payment received — your download is in My Purchases.');
      return;
    }
    window.ldtFetchDownloadUrl(pid, 'pptx').then(function(url){
      window.open(url, '_blank', 'noopener');
      toast('Payment complete — your download is starting.');
    }).catch(function(){
      toast('Payment received — your download is in My Purchases.');
    });
  }

  /* Wait for the webhook to record the purchase, then unlock. The server is the
     only authority; this just waits for it to catch up. */
  function awaitOwnership(uid, pid, d){
    var tries = 0, MAX = 14;               // ~21s at 1.5s apart
    toast('Payment received — confirming with our server…');
    (function poll(){
      tries++;
      var ok = false;
      try {
        if (window.Commerce && window.Commerce.library &&
            typeof window.Commerce.library.ownsProduct === 'function') {
          window.Commerce.library.ownsProduct(uid, pid).then(function(owns){
            if (owns) { deliver(d); return; }
            if (tries >= MAX) {
              toast('Payment received. Your download will appear in My Purchases shortly.');
              return;
            }
            setTimeout(poll, 1500);
          }).catch(function(){
            if (tries >= MAX) { toast('Payment received. It will appear in My Purchases shortly.'); return; }
            setTimeout(poll, 1500);
          });
          ok = true;
        }
      } catch(e){}
      if (!ok) toast('Payment received. Your download will appear in My Purchases shortly.');
    })();
  }

  function openModal(plan, d, user){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;';
    var box=document.createElement('div');
    box.style.cssText='background:#fff;border-radius:12px;max-width:460px;width:100%;max-height:92vh;overflow:auto;position:relative;';
    var x=document.createElement('button');
    x.textContent='✕'; x.style.cssText='position:absolute;top:8px;right:10px;z-index:2;border:0;background:transparent;font-size:20px;cursor:pointer;';
    x.onclick=function(){ov.remove();};

    var cbName = 'whopDone_' + Math.random().toString(36).slice(2);
    var co=document.createElement('div');
    co.setAttribute('data-whop-checkout-plan-id', plan);
    co.setAttribute('data-whop-checkout-theme','light');
    co.setAttribute('data-whop-checkout-on-complete', cbName);
    /* The email is how the server matches this payment to a Firebase account.
       Prefilled AND disabled so a buyer cannot pay under an address we have no
       user for — that would take their money and unlock nothing. */
    if (user && user.email) {
      co.setAttribute('data-whop-checkout-prefill-email', user.email);
      co.setAttribute('data-whop-checkout-disable-email', 'true');
    }

    box.appendChild(x); box.appendChild(co); ov.appendChild(box); document.body.appendChild(ov);

    /* Randomised, single-use, and it does NOT unlock anything — it only starts
       waiting on the server. Calling it from the console achieves nothing. */
    window[cbName] = function(){
      try { delete window[cbName]; } catch(e){ window[cbName] = undefined; }
      ov.remove();
      awaitOwnership(user.uid, productId(d), d);
    };

    if (window.wco && window.wco.mount) { try{window.wco.mount(co);}catch(e){} }
  }

  var orig = window.buyItNow;
  window.buyItNow = function(){
    var d=data();
    if (isPaid(d)){
      var lic = chosenLicence();
      var p   = planId(d, lic);
      if (p){
        var user = currentUser();
        if (!user || !user.email) {
          toast('Please sign in first — your purchase is saved to your account.');
          if (window.openAuth) { try { openAuth('signin'); } catch(e){} }
          return;
        }
        openModal(p, d, user);
        return;
      }
      toast('This kit is being set up for sale — check back shortly.');
      return;
    }
    if (typeof orig==='function') orig();
  };
})();
