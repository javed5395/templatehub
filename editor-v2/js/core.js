/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — CORE (engine + Editor API)              owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   STATUS: skeleton. The API surface below is final (see API.md); the
   engine wiring lands in the next build step. Every command already
   resolves safely, so ribbon.js / sidebar.js can be built and clicked
   against this file today.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── tiny toast ── */
  function toast(msg, ms) {
    var host = document.getElementById('toast-host');
    if (!host) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2200);
  }

  /* ── event bus ── */
  var listeners = {};
  function emit(ev, payload) {
    (listeners[ev] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error('[core] listener', ev, e); } });
  }

  /* ── engine state (filled in by the real wiring, next step) ── */
  var engine = {
    booted: false,
    zoomPct: 62
  };

  /* ── command table — every name from API.md exists from day one ── */
  var COMMANDS = [
    'undo','redo','cut','copy','paste','duplicate','delete',
    'bold','italic','underline','strike','clearFormat',
    'fontFamily','fontSize','fontStep','textColour','highlight',
    'align','bullets','numbering','lineSpacing',
    'insertText','insertShape','insertLine','insertFrame','insertImage','insertChart',
    'front','back','forward','backward','group','ungroup',
    'alignSlide','distribute','flipH','flipV','rotate','lock','unlockAll',
    'addSlide','duplicateSlide','deleteSlide','gotoSlide',
    'background','pageSize','zoom','zoomFit','fitWidth',
    'toggleRuler','toggleGrid','toggleGuides',
    'presentFromStart','presentFromCurrent',
    'exportPptx','saveProject','newDesign',
    'insertTable','insertIcon','insertWordArt','insertVideo','insertAudio','addComment',
    'drawPen','drawHighlighter','drawEraser','drawClear',
    'setTransition','setAnimation','accessibilityCheck',
    'formatPainter','find','selectAll','deselect',
    'drawColour','drawSize','themeApply',
    'transitionDuration','transitionApplyAll',
    'rehearse','presenterView','spellCheck','showComments','toggleNotes',
    'viewNormal','viewSorter','openHelp','showShortcuts','sendFeedback'
  ];
  var impl = {};   /* real implementations register here in the wiring step */

  /* ── the public API — THE ONLY DOOR for ribbon.js / sidebar.js ── */
  window.Editor = {
    run: function (cmd, arg) {
      if (COMMANDS.indexOf(cmd) === -1) { toast('Unknown command: ' + cmd); return false; }
      if (typeof impl[cmd] !== 'function') { toast('Not wired yet: ' + cmd); return false; }
      try { return impl[cmd](arg); }
      catch (e) { console.error('[core]', cmd, e); toast('Command failed: ' + cmd); return false; }
    },
    query: function (key) {
      switch (key) {
        case 'selection': return impl.__qSelection ? impl.__qSelection() : null;
        case 'textState': return impl.__qTextState ? impl.__qTextState() : null;
        case 'fonts':     return impl.__qFonts ? impl.__qFonts() : ['DM Sans','Arial','Georgia','Times New Roman'];
        case 'slides':    return impl.__qSlides ? impl.__qSlides() : { count: 1, current: 0 };
        case 'zoom':      return engine.zoomPct;
        case 'history':   return impl.__qHistory ? impl.__qHistory() : { canUndo: false, canRedo: false };
        case 'view':      return impl.__qView ? impl.__qView() : { ruler: false, grid: false, guides: false };
        case 'pageSize':  return impl.__qPageSize ? impl.__qPageSize() : { ratio: '16:9' };
        default: return null;
      }
    },
    on: function (ev, fn) {
      (listeners[ev] = listeners[ev] || []).push(fn);
      return function off() { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); };
    },
    /* used by the wiring step only — not for UI parts */
    _register: function (table) { Object.assign(impl, table); },
    _emit: emit,
    _toast: toast
  };

  /* ── placeholder boot: blank white slide so the shell is visibly alive.
        Replaced by the real renderer wiring in the next build step. ── */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      var holder = document.getElementById('canvas-holder');
      var cv = document.getElementById('canvas');
      var W = 960, H = 540;
      cv.width = W; cv.height = H;
      var g = cv.getContext('2d');
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#C9CFDB'; g.font = '600 20px "DM Sans", sans-serif';
      g.textAlign = 'center';
      g.fillText('Editor v2 core — engine wiring pending', W / 2, H / 2);
      holder.style.width = W + 'px';

      var thumbs = document.getElementById('film-thumbs');
      thumbs.innerHTML = '<div class="film-thumb active"><span class="n">1</span></div>'
        + '<button class="film-add" aria-label="Add slide"><span class="material-icons-outlined">add</span></button>';

      var slider = document.getElementById('zoom-slider');
      var label = document.getElementById('zoom-label');
      slider.addEventListener('input', function () {
        engine.zoomPct = +slider.value;
        label.textContent = slider.value + '%';
        emit('zoom', { pct: engine.zoomPct });
      });

      engine.booted = true;
      emit('ready');
    } catch (e) { console.error('[core] boot', e); }
  });
})();
