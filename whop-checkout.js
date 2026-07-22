/* whop-checkout.js — on-site embedded Whop checkout + instant download.
   Paid kit → payment popup ON this site (no redirect) → on success, file unlocks.
   Free kit → untouched (original email/download flow). */
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
  function planId(d){ var v=d.whopPlanId||d.whop_plan_id||''; var m=String(v).match(/plan_[A-Za-z0-9]+/); return m?m[0]:''; }

  function deliver(d){
    var u = d.pptxUrl || d.pdfUrl || (d.slides&&d.slides[0]) || d.whopPurchaseUrl;
    if (u) window.open(u, '_blank', 'noopener');
    if (typeof ldtToast==='function') ldtToast('Payment complete — your download is starting.');
  }

  function openModal(plan, d){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;';
    var box=document.createElement('div');
    box.style.cssText='background:#fff;border-radius:12px;max-width:460px;width:100%;max-height:92vh;overflow:auto;position:relative;';
    var x=document.createElement('button');
    x.textContent='✕'; x.style.cssText='position:absolute;top:8px;right:10px;z-index:2;border:0;background:transparent;font-size:20px;cursor:pointer;';
    x.onclick=function(){ov.remove();};
    var co=document.createElement('div');
    co.setAttribute('data-whop-checkout-plan-id', plan);
    co.setAttribute('data-whop-checkout-theme','light');
    co.setAttribute('data-whop-checkout-on-complete','whopDone');
    box.appendChild(x); box.appendChild(co); ov.appendChild(box); document.body.appendChild(ov);
    window.whopDone=function(){ ov.remove(); deliver(d); };
    if (window.wco && window.wco.mount) { try{window.wco.mount(co);}catch(e){} }
  }

  var orig = window.buyItNow;
  window.buyItNow = function(){
    var d=data();
    if (isPaid(d)){
      var p=planId(d);
      if (p){ openModal(p, d); return; }
      if (typeof ldtToast==='function'){ ldtToast('This kit is being set up for sale — check back shortly.'); return; }
    }
    if (typeof orig==='function') orig();
  };
})();
