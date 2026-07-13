/* prepare_deck.js — plain script. The button ALWAYS opens the overlay (needs only
   buyer_flow.js). Firebase is imported lazily, only when the fit actually runs, so a
   Firebase hiccup can never kill the button. */
(function () {
  var EDITOR_URL = "/editor.html";
  var _callFit = null;
  async function _ensureFit() {
    if (_callFit) return _callFit;
    var mod = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js");
    var fns = mod.getFunctions();
    _callFit = mod.httpsCallable(fns, "fit_content");
    return _callFit;
  }
  async function fitFn(content, mode, map) {
    var call = await _ensureFit();
    var res = await call({ kit: map.slug, content: content, mode: mode });
    return res.data;
  }
  window.LazyDogPrepare = function (slug, deckName, slides) {
    if (!window.FitBuyerFlow) { alert("Still loading — give it a second and click again."); return; }
    window.FitBuyerFlow.open(
      { slug: slug || "", deck: deckName || slug || "deck", slides: slides || 0 },
      { fitFn: fitFn, editorUrl: EDITOR_URL }
    );
  };
})();
