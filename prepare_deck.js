/* prepare_deck.js — drop-in "Fill your content" launcher for kit pages.
   Requires: firebase app already initialized (navbar.js does it) + buyer_flow.js loaded.
   Usage on a page:  <button onclick="LazyDogPrepare('kit-slug','Kit Name',16)">Fill your content</button> */
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const EDITOR_URL = "/studio-k7f3a9x2q1.html";   // editor face on THIS site (same origin → handoff works)
let _fns, _callFit;
function _ensure() {
  if (!_fns) { _fns = getFunctions(); _callFit = httpsCallable(_fns, 'fit_content'); }
}
// buyer_flow calls this: (content, mode, map) -> plan   (server-side fit; browser does no fit math)
async function fitFn(content, mode, map) {
  _ensure();
  const res = await _callFit({ kit: map.slug, content, mode });
  return res.data;
}
window.LazyDogPrepare = function (slug, deckName, slides) {
  if (!window.FitBuyerFlow) { alert('Buyer flow still loading — try again in a moment.'); return; }
  window.FitBuyerFlow.open(
    { slug: slug, deck: deckName || slug, slides: slides || 0 },
    { fitFn: fitFn, editorUrl: EDITOR_URL }
  );
};
