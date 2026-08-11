// ============================================================================
// tilt.js — cursor-reactive depth for product cards and hero buttons
// LazyDogTemplates · 11 Aug 2026
// ============================================================================
// WHAT IT REPLACES
// Cards and buttons used to LIFT: `transform: translateY(-4px)` — the same
// movement no matter where the cursor sat on them. This makes them ROTATE
// TOWARD the cursor, so hovering the top-left corner leans the element one way
// and the bottom-right leans it the other. That difference does not exist in a
// screenshot; it only exists in motion.
//
// WHY ONE FILE, ONE LISTENER
// Product cards are drawn from Firestore AFTER this script runs, and redrawn
// again on every filter and search. Binding a listener to each card as it is
// created would leave every later card flat — a kit uploaded tomorrow would be
// born without the effect. So the listener lives on the DOCUMENT and asks
// "did that mousemove happen over a card?" each time. Nothing is ever bound to
// a card, so every card that ever exists is covered, including ones that do
// not exist yet. Add a kit, do nothing, it tilts.
//
// COST
// ~1KB. No library, no WebGL. `transform` is composited on the GPU, so this
// does not trigger layout or repaint — the same machinery the old hover used.
//
// TO SWITCH IT OFF: delete the <script> tag. Nothing else depends on it.
// ============================================================================
(function () {
  'use strict';

  /* Anything matching these gets the effect, now or whenever it appears. */
  /* .tmpl-card is the career-docs page's own product-card class — same idea,
     different name, so it is named here rather than left flat. */
  var SELECTOR = '.deck-card, .pd-card, .tmpl-card, .ld-tilt-btn';

  /* Degrees of rotation at the very edge. Cards get more room than buttons:
     a large surface needs more angle to read as tilted, while a small button
     at the same angle just looks wobbly and hurts the text. */
  var TILT_CARD = 6;
  var TILT_BTN  = 9;

  /* How far the element lifts toward the viewer. Keeps the old sense of the
     thing rising to meet you, on top of the new rotation. */
  var LIFT_CARD = 6;
  var LIFT_BTN  = 3;

  /* Lower perspective = stronger, more dramatic 3D. Buttons sit closer to the
     eye, so they take a tighter value. */
  var PERSP_CARD = 900;
  var PERSP_BTN  = 600;

  // ── Bail out where the effect cannot work or is not wanted ───────────────
  // A touch screen has no cursor to follow, so this would be dead weight on
  // every phone. And anyone who has asked their system to reduce motion has
  // usually done so because motion makes them ill — that request is honoured.
  var noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var noMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noHover || noMotion) return;

  // ── Transition, injected rather than edited into each page's CSS ─────────
  // !important because the card rules use `transition: all .3s`, and a
  // transition on `all` would animate every property the tilt touches.
  var style = document.createElement('style');
  style.id = 'ldTiltStyle';
  style.textContent =
    '.deck-card,.pd-card,.tmpl-card,.ld-tilt-btn{' +
      'transition:transform .45s cubic-bezier(.16,1,.3,1),' +
                 'box-shadow .45s cubic-bezier(.16,1,.3,1)!important;' +
      'will-change:transform;' +
    '}';
  (document.head || document.documentElement).appendChild(style);

  var current = null;   // element under the cursor right now

  function settings(el) {
    var isBtn = el.classList.contains('ld-tilt-btn');
    return isBtn
      ? { tilt: TILT_BTN,  lift: LIFT_BTN,  persp: PERSP_BTN  }
      : { tilt: TILT_CARD, lift: LIFT_CARD, persp: PERSP_CARD };
  }

  function reset(el) {
    if (el) el.style.transform = '';
  }

  document.addEventListener('mousemove', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;

    /* Moved off the element (or onto a different one) — flatten the old one.
       Without this a card keeps its last angle after the cursor leaves. */
    if (current && current !== el) { reset(current); current = null; }
    if (!el) return;
    current = el;

    var s = settings(el);
    var r = el.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width;    // 0 at left edge  → 1 at right
    var py = (e.clientY - r.top) / r.height;    // 0 at top edge   → 1 at bottom

    /* rotateY follows left/right. rotateX is INVERTED on purpose: pushing the
       cursor down should tip the top of the element toward you, the way a real
       object leans away from a finger pressing its lower edge. */
    var ry = (px - 0.5) * 2 * s.tilt;
    var rx = (0.5 - py) * 2 * s.tilt;

    el.style.transform =
      'perspective(' + s.persp + 'px) ' +
      'rotateX(' + rx.toFixed(2) + 'deg) ' +
      'rotateY(' + ry.toFixed(2) + 'deg) ' +
      'translateY(-' + s.lift + 'px)';
  }, { passive: true });

  /* Cursor leaving the window entirely fires no mousemove, so the last
     element would stay frozen mid-tilt. */
  document.addEventListener('mouseleave', function () {
    reset(current); current = null;
  });

  /* Scrolling moves the page under a stationary cursor: the element the mouse
     was over may no longer be there, and its angle is now computed from a
     stale rectangle. Flatten and let the next mousemove re-establish it. */
  window.addEventListener('scroll', function () {
    if (current) { reset(current); current = null; }
  }, { passive: true });
})();
