/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — CORE (engine host + Editor API)         owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   STAGE 1 WIRING — the renderer (../lazydog_renderer.js) carries the
   canvas engine; this file is the HOST it expects (state, dom shims,
   saveState, loadPageIntoCanvas, filmstrip) plus the Editor command API
   that ribbon.js / sidebar.js call through THE WALL.

   Live in stage 1: canvas + pages + filmstrip + undo/redo + zoom +
   every Home-tab text command (styles-aware, points-based) + shapes,
   lines, frames, images + arrange/align/flip/lock + background +
   page sizes + view toggles + layers/pages queries.
   Stage 2 (next): compose import, projects/autosave, PPTX export,
   charts/icons/tables, themes, effects engine, draw, AI, present.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── host globals the renderer expects ─────────────────────────────── */
function $(sel) { return document.querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

const state = {
  pages: [], notes: [], comments: [],
  currentPage: 0, zoom: 59,
  activeTool: null, openDropdown: null,
  timerRunning: false, timerSeconds: 0, notesOpen: false,
  sidebarVisible: true, datasets: []
};

/* globals the renderer reads — must exist before any page load */
window._ldMasters = window._ldMasters || [];
window._deckIR = window._deckIR || null;
window._bulkLoad = false;

var FABRIC_JSON_PROPS = ['isBg', 'svgText', 'irId', 'irOrigin', 'irPara', 'irBody', 'irTable',
  'irChart', 'irChartRole', 'irChartSi', 'irChartCi', 'irReflOf', 'irHasRefl', 'reflGap', 'reflAlpha',
  'irGlowOf', 'irHasGlow', 'glowPad', 'irGlowRadPx', 'irGlowColor', 'irSoftOf', 'irHasSoft',
  'irSoftRadPx', 'softPad', 'mediaSrc', 'mediaKind', 'irC0',
  'isFrame', 'frameKind', 'framePath', 'framePathW', 'framePathH', 'frameSrc', 'frameRect',
  'frameLook', 'frameFill', 'frameDevice', 'isAperture',
  'chartType', 'chartDef', 'datasetId', 'tableId',
  'isSticker', 'stickerName', 'stickerAnim', 'isIllo', 'illoIndex', 'illoPalette', 'illoName', 'illoRole', 'illoStroke',
  'isIcon', 'iconName', 'iconWeight',
  'is3D', 'threeKind', 'threeColor', 'threeText', 'threeQuat', 'threeTexData', 'threeZoom', 'threeLight', 'threeNoShadow', 'threeDispW', 'rotX', 'rotY', 'isMockArea',
  'isIllo', 'illoIndex', 'illoPalette', 'illoName', 'illoRole', 'illoStroke',
  'isSticker', 'stickerName', 'stickerAnim',
  'layerName', 'visible', 'isBrandLogo',
  'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation',
  'hasControls', 'selectable', 'evented', '_lid',
  'animType', 'animMs', 'animDelay', 'animDir', 'animOrder',
  'fx', 'isComponent', 'componentId', 'componentName',
  'themeRole', '_themeBaseSize', 'altText', 'readOrder',
  '_isDrawn', 'ldMasterId', 'ldBgStamp'];

/* dom shim — every element the renderer touches, mapped to v2 or a stub */
var dom = {};
(function () {
  function stub(tag) { var n = document.createElement(tag || 'div'); n.style.display = 'none'; return n; }
  document.addEventListener('DOMContentLoaded', function () {
    var hidden = document.createElement('div');
    hidden.style.display = 'none';
    document.body.appendChild(hidden);
    var notes = document.createElement('textarea');
    hidden.appendChild(notes);
    Object.assign(dom, {
      toastContainer: $('#toast-host'),
      canvasArea: $('#canvas-area'),
      slideFrame: $('#canvas-holder'),
      zoomSlider: $('#zoom-slider'),
      zoomLevel: $('#zoom-label'),
      zoomValue: $('#zoom-label'),
      pageThumbs: $('#film-thumbs'),
      pageInfo: $('#film-counter'),
      notesTextarea: notes,
      sidebarRail: stub(), undoBtn: stub('button'), redoBtn: stub('button'),
      shareDropdown: stub(), uploadDropdown: stub(), moreDropdown: stub()
    });
  });
})();

/* ── page capture / load (host side of the renderer contract) ──────── */
function currentPageObjHost() { return state.pages[state.currentPage]; }

var _historyLabel = null;
function histLabel(l) { _historyLabel = l; }

/* ═══════════════════════════════════════════════════════════════════════
   04 Sep 2026 - ONE USER ACTION = ONE UNDO STEP.
   Every internal step used to write its own save point: the canvas fires
   object:added for each piece, and each command saved again on top. So one
   table (18 pieces) cost 19 undo clicks and showed broken half-tables on the
   way, and one shape needed two clicks because the first landed on a
   duplicate save point. Save points are now COALESCED - the saves fired by a
   single action collapse into one entry - and flushed immediately whenever
   the page is about to change or undo/redo runs, so nothing is ever written
   to the wrong slide. Undo therefore steps through user actions, not through
   the editor's internal bookkeeping.
   ═══════════════════════════════════════════════════════════════════════ */
var _slideRedo = [];          /* slides removed by undo, waiting for redo */
var _saveTimer = null, _savePending = false;
var SAVE_COALESCE_MS = 180;   /* a single action's saves all land inside this */

function saveState() {
  if (!fc || (typeof _restoring !== 'undefined' && _restoring) || window._bulkLoad || window._masterMode) return;
  _savePending = true;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSaveNow, SAVE_COALESCE_MS);
}

function flushSaveNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (!_savePending) return;
  _savePending = false;
  if (!fc || (typeof _restoring !== 'undefined' && _restoring) || window._bulkLoad || window._masterMode) return;
  var page = state.pages[state.currentPage];
  if (!page) return;
  var json = JSON.stringify(fc.toJSON(FABRIC_JSON_PROPS));
  var idx = page.historyIndex == null ? -1 : page.historyIndex;
  page.history = (page.history || []).slice(0, idx + 1);
  page.historyMeta = (page.historyMeta || []).slice(0, idx + 1);
  var meta = { t: Date.now(), n: (fc.getObjects() || []).length, label: _historyLabel };
  _historyLabel = null;
  /* a slide that was JUST created folds its first change (the layout the
     editor drops in for you) into its opening state, so one Ctrl+Z removes
     the whole slide instead of emptying it first and leaving a blank behind */
  if (page._collapseUntil && Date.now() < page._collapseUntil && page.history.length === 1) {
    page.history[0] = json; page.historyMeta[0] = meta;
  } else {
    page.history.push(json); page.historyMeta.push(meta);
  }
  page._collapseUntil = 0;
  if (page.history.length > 60) { page.history.shift(); page.historyMeta.shift(); }
  page.historyIndex = page.history.length - 1;
  _slideRedo.length = 0;      /* a new change ends the redo trail */
  if (typeof updateUndoRedo === 'function') updateUndoRedo();
  Editor._emit('history', Editor.query('history'));
}
window.ldFlushSave = flushSaveNow;

/* ═══ adding and removing a SLIDE is one undo step of its own ═══
   Undo history is kept per slide, and adding a slide was recorded nowhere at
   all - so Ctrl+Z could strip a new slide's contents one piece at a time but
   could never remove the slide itself, leaving a junk blank behind with Undo
   dead. These wrappers add the missing deck-level step. The renderer is left
   untouched; its own functions still do the work. */
(function () {
  var origAdd  = window.addPage;
  var origUndo = window.doUndo;
  var origRedo = window.doRedo;

  if (typeof origAdd === 'function') {
    window.addPage = function () {
      var r = origAdd.apply(this, arguments);
      var p = state.pages[state.currentPage];
      if (p) { p._undoAdd = true; p._collapseUntil = Date.now() + 1500; }
      _slideRedo.length = 0;
      return r;
    };
  }

  if (typeof origUndo === 'function') {
    window.doUndo = function () {
      flushSaveNow();
      var i = state.currentPage, p = state.pages[i];
      if (p && p._undoAdd && (p.historyIndex == null || p.historyIndex <= 0) && state.pages.length > 1) {
        /* bank what is actually ON this slide before taking it away, or redo
           would bring the slide back empty */
        captureCurrentPage();
        _slideRedo.push({ index: i, page: p, note: state.notes[i] || '', undoneAt: Date.now() });
        state.pages.splice(i, 1);
        state.notes.splice(i, 1);
        state.currentPage = Math.max(0, i - 1);
        loadPageIntoCanvas(state.currentPage).then(function () {
          renderPageThumbs();
          if (typeof updateUndoRedo === 'function') updateUndoRedo();
          Editor._emit('slides', Editor.query('slides'));
          Editor._emit('history', Editor.query('history'));
        });
        if (typeof showToast === 'function') showToast('Slide removed');
        return;
      }
      /* remember WHEN this slide was last stepped back, so redo can tell
         which came last: a step inside a slide, or removing a whole slide */
      var was = state.pages[state.currentPage];
      var out = origUndo.apply(this, arguments);
      if (was) was._lastUndoAt = Date.now();
      return out;
    };
  }

  if (typeof origRedo === 'function') {
    window.doRedo = function () {
      flushSaveNow();
      var p = state.pages[state.currentPage];
      var atEnd = !p || !p.history || p.historyIndex >= p.history.length - 1;
      /* redo replays whatever was undone LAST. If removing a slide came after
         the last step-back inside this slide, put the slide back first -
         otherwise redo would silently rebuild something else. */
      var top = _slideRedo[_slideRedo.length - 1];
      var slideCameLast = !!top && (top.undoneAt || 0) > ((p && p._lastUndoAt) || 0);
      if (_slideRedo.length && (atEnd || slideCameLast)) {
        var rec = _slideRedo.pop();
        var at = Math.min(rec.index, state.pages.length);
        state.pages.splice(at, 0, rec.page);
        state.notes.splice(at, 0, rec.note);
        state.currentPage = at;
        loadPageIntoCanvas(at).then(function () {
          renderPageThumbs();
          Editor._emit('slides', Editor.query('slides'));
          Editor._emit('history', Editor.query('history'));
        });
        if (typeof showToast === 'function') showToast('Slide restored');
        return;
      }
      return origRedo.apply(this, arguments);
    };
  }
})();

function captureCurrentPage() {
  if (!fc || window._masterMode) return;
  /* the page is about to be written out or swapped - bank any save point that
     is still waiting on the coalescing timer, so it lands on THIS slide */
  if (typeof flushSaveNow === 'function') flushSaveNow();
  var page = state.pages[state.currentPage];
  if (!page) return;
  page.canvasJSON = fc.toJSON(FABRIC_JSON_PROPS);
  /* 21 Aug 2026 (Fable) — THE MISSING-PICTURES BUG. page.ir was nulled here
     and later handed to slideIRFromCanvas as the "original IR" — so it was
     always null, no canvas object could be matched back to its element,
     and every picture the renderer paints as a pattern-filled path group
     (i.e. every photo in a composed or imported deck) was silently dropped
     from the download. The original IR is kept on page.irOrig for export. */
  if (page.ir && !page.irOrig) page.irOrig = page.ir;
  page.ir = null;
  try { page.thumb = fc.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.08 }); } catch (e) {}
}

async function loadPageIntoCanvas(index) {
  var page = state.pages[index];
  if (!page || !fc) return;
  window._bulkLoad = true;
  if (page.canvasJSON) {
    await new Promise(function (resolve) {
      fc.loadFromJSON(page.canvasJSON, function () {
        fc.getObjects().forEach(function (o) {
          if (o.isBg) { o.selectable = true; o.evented = true; }
          if (o.ldMasterId) { o.selectable = false; o.evented = false; }
        });
        if (typeof rehydrateFrames === 'function') rehydrateFrames();
        fc.renderAll();
        resolve();
      });
    });
  } else if (page.ir && typeof renderSlideIR === 'function') {
    if (window._deckIR && window._deckIR.size) setSlideAspect(window._deckIR.size.w, window._deckIR.size.h);
    await renderSlideIR(page.ir, window._deckIR, fc);
  } else {
    fc.clear();
    fc.setBackgroundColor(page.pendingBg || '#ffffff', fc.renderAll.bind(fc));
  }
  try { if (typeof ldStampMasters === 'function') await ldStampMasters(); }
  catch (e) { console.warn('[core] stampMasters skipped', e); }
  window._bulkLoad = false; /* ALWAYS clears — a stuck true kills every save */
  if (typeof ensurePageHistory === 'function') ensurePageHistory(index);
  Editor._emit('slides', Editor.query('slides'));
  Editor._emit('selection', Editor.query('selection'));
}

/* ── v2 filmstrip (host implementation of renderPageThumbs) ────────── */
function renderPageThumbs() {
  var host = dom.pageThumbs;
  if (!host) return;
  host.innerHTML = '';
  state.pages.forEach(function (page, i) {
    var t = document.createElement('div');
    t.className = 'film-thumb' + (i === state.currentPage ? ' active' : '');
    t.title = 'Slide ' + (i + 1);
    if (page.thumb) t.style.backgroundImage = 'url(' + page.thumb + ')';
    var n = document.createElement('span');
    n.className = 'n'; n.textContent = i + 1;
    t.appendChild(n);
    var x = document.createElement('button');
    x.className = 'film-del'; x.type = 'button'; x.title = 'Delete slide ' + (i + 1);
    x.innerHTML = '<span class="material-icons-outlined">close</span>';
    x.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (state.pages.length <= 1) { toast('The last slide cannot be deleted'); return; }
      Promise.resolve()
        .then(function () { if (i !== state.currentPage) return switchPage(i); })
        .then(function () { return deletePage(); })
        .then(function () { renderPageThumbs(); });
    });
    t.appendChild(x);
    t.addEventListener('click', function () { if (i !== state.currentPage) switchPage(i); });
    /* Canva-style drag to reorder slides */
    t.draggable = true;
    t.addEventListener('dragstart', function (ev) {
      ev.dataTransfer.setData('text/plain', String(i));
      ev.dataTransfer.effectAllowed = 'move';
      t.style.opacity = '0.4';
    });
    t.addEventListener('dragend', function () { t.style.opacity = ''; });
    t.addEventListener('dragover', function (ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; });
    t.addEventListener('drop', function (ev) {
      ev.preventDefault();
      var from = parseInt(ev.dataTransfer.getData('text/plain'), 10);
      if (isNaN(from) || from === i) return;
      moveSlideTo(from, i);
    });
    host.appendChild(t);
  });
  var add = document.createElement('button');
  add.className = 'film-add'; add.type = 'button'; add.title = 'Add slide';
  add.innerHTML = '<span class="material-icons-outlined">add</span>';
  add.addEventListener('click', function () { addPage(); Editor._emit('slides', Editor.query('slides')); });
  host.appendChild(add);
  if (dom.pageInfo) dom.pageInfo.textContent = (state.currentPage + 1) + ' of ' + state.pages.length;
  Editor._emit('slides', Editor.query('slides'));
}

/* reorder slides (drag & drop in the filmstrip) */
function moveSlideTo(from, to) {
  if (from === to || !state.pages[from]) return;
  captureCurrentPage();
  var cur = state.pages[state.currentPage];
  var p = state.pages.splice(from, 1)[0];
  var n = state.notes.splice(from, 1)[0];
  state.pages.splice(to, 0, p);
  state.notes.splice(to, 0, n || '');
  state.currentPage = state.pages.indexOf(cur);
  renderPageThumbs();
}

/* frames restored from JSON keep their look (stage-1: silhouette only) */
function rehydrateFrames() {}

/* ═══════════════════════════════════════════════════════════════════
   THE EDITOR API
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function toast(msg, ms) {
    var host = document.getElementById('toast-host');
    if (!host) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2200);
  }

  /* click the grey area around the slide → deselect (Canva behaviour) */
  document.addEventListener('DOMContentLoaded', function () {
    var area = document.getElementById('canvas-area');
    if (!area) return;
    area.addEventListener('mousedown', function (e) {
      if (e.target === area || (e.target.id === 'canvas-holder')) {
        if (window.fc) { try { fc.discardActiveObject(); fc.renderAll(); } catch (_) {} }
      }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.fc) {
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      try { fc.discardActiveObject(); fc.renderAll(); } catch (_) {}
    }
  });

  var listeners = {};
  function emit(ev, payload) {
    (listeners[ev] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error('[core] listener', ev, e); } });
  }

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
    'exportPptx','exportPdf','exportPng','exportJpg','exportPngAll','exportSvg','exportVideo','showPlans','share','saveProject','newDesign',
    'insertTable','insertIcon','insertWordArt','insertVideo','insertAudio','addComment',
    'drawPen','drawHighlighter','drawEraser','drawClear','drawSelect',
    'setTransition','setAnimation','accessibilityCheck',
    'formatPainter','find','selectAll','deselect',
    'drawColour','drawSize','themeApply',
    'transitionDuration','transitionApplyAll',
    'rehearse','presenterView','spellCheck','showComments','toggleNotes',
    'viewNormal','viewSorter','openHelp','showShortcuts','sendFeedback',
    'effect','brandApply','templateUse','projectOpen','componentInsert','dataUpload',
    'themeFonts','themeColours','importPptx','fillFrames','dissolve','applyTemplate',
    'dataCsv','dataXlsx','dataSheet','dataSample','dataConnect','dataRefresh','dataRemove',
    'addSlideLayout','slidesOutline','outlineView','readingView','masterAdd','masterRemove','handoutMaster','notesMaster','colourMode','newWindow',
    'publishTemplate','deleteTemplate','templateThumbs','applyTemplateSlide',
    'insertShapePreset','insertLineKind','insertGrid','insertSticker','insertIllo','illoPalette',
    'layerAction','ai','aiReport',
    'shapeFill','shapeOutline','shapeOutlineW','shapeOpacity','moveSlide','insert3D','insert3DText','insertMockup3D','threeAngle','threeAngleCustom','threeColorSet','threeLight','threeShadow','threeOrder','insertAsset3D',
    'publishElement','insertElement','deleteElement','componentSave','componentDelete','insertMockupLayout',
    'mockupArea','mockupFill','signIn','signOut','backgroundImage','backgroundRemove'
  ];
  var impl = {};
  /* commands that need the LazyDog cloud — named for the offline toast */
  var CLOUD_CMD_NAMES = {
    ai: 'AI', fillFrames: 'AI fill', importPptx: 'import', dissolve: 'Dissolve',
    templateUse: 'templates', applyTemplate: 'templates', applyTemplateSlide: 'templates',
    publishTemplate: 'publishing', deleteTemplate: 'templates', templateThumbs: 'templates',
    projectOpen: 'your cloud projects', dataUpload: 'uploads', dataConnect: 'data sources',
    dataSheet: 'data sources', dataRefresh: 'data sources', publishElement: 'publishing',
    insertElement: 'the Elements library', deleteElement: 'the Elements library',
    signIn: 'sign in', componentInsert: 'components', share: 'sharing', showPlans: 'plans'
  };

  window.Editor = {
    run: function (cmd, arg) {
      if (COMMANDS.indexOf(cmd) === -1) { toast('Unknown command: ' + cmd); return false; }
      if (typeof impl[cmd] !== 'function') { toast('Coming in the next wiring stage: ' + cmd); return false; }
      /* offline: cloud commands are refused up front with a clear message
         instead of failing somewhere inside a fetch */
      if (CLOUD_CMD_NAMES[cmd] && typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast("You're offline — reconnect to use " + CLOUD_CMD_NAMES[cmd], 5000);
        return false;
      }
      try { return impl[cmd](arg); }
      catch (e) {
        console.error('[core]', cmd, e);
        /* 21 Aug 2026 (Fable) — offline is a state, not a bug. A cloud
           command failing with no connection says so instead of reading
           as a broken build (Store reviewer note). */
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          toast("You're offline — reconnect to use " + (CLOUD_CMD_NAMES[cmd] || 'this feature'), 5000);
        } else {
          toast('Command failed: ' + cmd);
        }
        return false;
      }
    },
    query: function (key) {
      switch (key) {
        case 'selection': return impl.__qSelection ? impl.__qSelection() : null;
        case 'textState': return impl.__qTextState ? impl.__qTextState() : null;
        case 'fonts':     return impl.__qFonts ? impl.__qFonts() : ['DM Sans'];
        case 'slides':    return { count: state.pages.length || 1, current: state.currentPage || 0 };
        case 'zoom':      return state.zoom;
        case 'drawMode':  return impl.__qDrawMode ? impl.__qDrawMode() : null;
        case 'transition': { var pg = state.pages[state.currentPage]; return (pg && pg.transition) || { type: 'none', ms: 500 }; }
        case 'history':   return impl.__qHistory ? impl.__qHistory() : { canUndo: false, canRedo: false };
        case 'view':      return impl.__qView ? impl.__qView() : { ruler: false, grid: false, guides: false };
        case 'pageSize':  return impl.__qPageSize ? impl.__qPageSize() : { ratio: '16:9' };
        case 'layers':    return impl.__qLayers ? impl.__qLayers() : [];
        case 'pages':     return impl.__qPages ? impl.__qPages() : [];
        case 'photos':    return impl.__qPhotos ? impl.__qPhotos() : [];
        case 'projects':  return [];
        case 'templates': return window._editorTemplates || [];
        case 'customElements': return window._editorElements || [];
        case 'user': return window._ldUser || null;
        case 'datasets':   return impl.__qDatasets ? impl.__qDatasets() : [];
        case 'chartTypes': return impl.__qChartTypes ? impl.__qChartTypes() : [];
        case 'dataSamples': return impl.__qSamples ? impl.__qSamples() : [];
        case 'slideLayouts': return impl.__qSlideLayouts ? impl.__qSlideLayouts() : [];
        case 'wordArtStyles': return impl.__qWordArtStyles ? impl.__qWordArtStyles() : [];
        case 'shapeGroups': return impl.__qShapeGroups ? impl.__qShapeGroups() : [];
        case 'gridLayouts': return impl.__qGridLayouts ? impl.__qGridLayouts() : [];
        case 'icons': return impl.__qIcons ? impl.__qIcons() : [];
        case 'stickers': return impl.__qStickers ? impl.__qStickers() : [];
        case 'illos': return impl.__qIllos ? impl.__qIllos() : { palettes: [], styles: [] };
        case 'components': return impl.__qComponents ? impl.__qComponents() : [];
        case 'mockupLayouts': return impl.__qMockupLayouts ? impl.__qMockupLayouts() : [];
        default: return null;
      }
    },
    on: function (ev, fn) {
      (listeners[ev] = listeners[ev] || []).push(fn);
      return function off() { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); };
    },
    _register: function (t) { Object.assign(impl, t); },
    _emit: emit,
    _toast: toast
  };

  /* ═════════ command implementations (stage 1) ═════════ */

  function sel() { return fc ? fc.getActiveObject() : null; }
  function isText(o) { return !!o && /text/.test(o.type || ''); }
  /* 04 Sep 2026 - MULTI-SELECT FORMATTING.
     A marquee / shift-click selection is one fabric "activeSelection" object,
     not a text box, so every formatting command used to refuse it with
     "Select a text box first". selAll() flattens the selection into the real
     objects, and textTargets() picks out every text object inside it
     (descending into groups), so one click on Bold / size / colour applies
     to all of them at once. */
  function selAll() {
    var o = sel();
    if (!o) return [];
    return o.type === 'activeSelection' ? (o._objects || []).slice() : [o];
  }
  function collectText(o, out) {
    if (!o) return out;
    if (isText(o)) { out.push(o); return out; }
    if (o.type === 'group' && o._objects) {
      o._objects.forEach(function (x) { collectText(x, out); });
      o.dirty = true;
    }
    return out;
  }
  function textTargets() {
    var out = [];
    selAll().forEach(function (o) { collectText(o, out); });
    return out;
  }
  function pxPerPt() { return (fc && fc._pxPerPt) || 2; }
  function effProp(o, prop, dflt) {
    if (!o) return dflt;
    var v = o[prop];
    if (o.styles) {
      var ls = Object.keys(o.styles);
      if (ls.length) {
        var cs = Object.keys(o.styles[ls[0]]);
        if (cs.length && o.styles[ls[0]][cs[0]][prop] !== undefined) v = o.styles[ls[0]][cs[0]][prop];
      }
    }
    return v === undefined || v === null ? dflt : v;
  }
  function applyTextProps(o, props) {
    o.set(props);
    if (o.styles) {
      Object.keys(o.styles).forEach(function (li) {
        Object.keys(o.styles[li]).forEach(function (ci) { Object.assign(o.styles[li][ci], props); });
      });
      if (typeof o.initDimensions === 'function') o.initDimensions();
    }
    o.dirty = true;
  }
  function needText() {
    var list = textTargets();
    if (!list.length) { toast('Select a text box first'); return null; }
    return list[0];
  }
  /* run fn over EVERY text object in the selection (one or many) */
  function eachText(fn) {
    var list = textTargets();
    if (!list.length) { toast('Select a text box first'); return false; }
    list.forEach(fn);
    return true;
  }
  function done(o) { fc.renderAll(); saveState(); emit('selection', Editor.query('selection')); }

  var WEB_FONTS = ['DM Sans', 'Arial', 'Arial Black', 'Helvetica', 'Verdana', 'Tahoma',
    'Trebuchet MS', 'Georgia', 'Times New Roman', 'Garamond', 'Palatino', 'Courier New',
    'Impact', 'Comic Sans MS', 'Segoe UI', 'Calibri', 'Cambria'];

  var SIZE_LADDER = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 54, 66, 80, 96];

  var view = { ruler: false, grid: false, guides: false };
  var PAGE_SIZES = {
    '16:9': [12192000, 6858000], '4:3': [9144000, 6858000],
    'a4': [10692130, 7560310], '1:1': [9144000, 9144000], '16:10': [12192000, 7620000]
  };
  var currentRatio = '16:9';
  function sizeLabel(key) {
    var L = (window.LD_DESIGN_DATA && window.LD_DESIGN_DATA.SIZES) || [];
    for (var i = 0; i < L.length; i++) if (L[i][0] === key) return L[i][1];
    return /^\d+x\d+$/.test(key) ? key.replace('x', ' x ') + ' px' : String(key).toUpperCase();
  }

  function fitWidthNow() {
    if (!fc || !dom.canvasArea) return;
    var area = dom.canvasArea.getBoundingClientRect().width;
    var slideW = fc.getWidth() / fc.getZoom();
    if (!slideW) return;
    setZoom(Math.max(10, Math.min(300, (area - 80) / slideW * 100)));
  }
  function applyAspect(ratio) {
    /* 21 Aug 2026 — every standard canvas size (Instagram, TikTok, posters…)
       plus "WxH" custom, from the shared LD_DESIGN_DATA.SIZES list */
    var emu = PAGE_SIZES[ratio] || (window.LD_DESIGN_DATA && window.LD_DESIGN_DATA.sizeEmu(ratio));
    if (!emu) return;
    captureCurrentPage();
    setSlideAspect(emu[0], emu[1]);
    if (window._deckIR && window._deckIR.size) { window._deckIR.size.w = emu[0]; window._deckIR.size.h = emu[1]; }
    currentRatio = ratio;
    loadPageIntoCanvas(state.currentPage).then(function () {
      var z = Math.round(calculateFitZoom()); if (!isFinite(z) || z <= 0) z = 100;
      setZoom(z); state.zoom = z; state.autoFit = true; emit('zoom', { pct: state.zoom });
      renderPageThumbs();
      toast('Canvas set to ' + sizeLabel(ratio));
    });
  }
  function dupSlide() {
    captureCurrentPage();
    var src = state.pages[state.currentPage];
    var copy = makeBlankPage(Date.now());
    copy.canvasJSON = src.canvasJSON ? JSON.parse(JSON.stringify(src.canvasJSON)) : null;
    copy.thumb = src.thumb;
    copy._undoAdd = true;          /* one Ctrl+Z removes the duplicate again */
    copy._collapseUntil = Date.now() + 1500;
    _slideRedo.length = 0;
    state.pages.splice(state.currentPage + 1, 0, copy);
    state.notes.splice(state.currentPage + 1, 0, state.notes[state.currentPage] || '');
    state.currentPage++;
    loadPageIntoCanvas(state.currentPage).then(function () {
      renderPageThumbs(); toast('Slide duplicated');
    });
  }
  function lidOf(o) {
    if (!o._lid) o._lid = 'L' + Math.random().toString(36).slice(2, 9);
    return o._lid;
  }
  function findByLid(id) {
    return (fc.getObjects() || []).filter(function (o) { return o._lid === id; })[0] || null;
  }
  function labelOf(o) {
    if (o.layerName) return o.layerName;
    if (o.isFrame) return 'Frame';
    if (o.isIcon) return 'Icon';
    if (isText(o)) return (o.text || 'Text').slice(0, 24);
    if (o.type === 'image') return 'Image';
    if (o.type === 'line') return 'Line';
    if (o.type === 'group') return 'Group';
    return o.type || 'Object';
  }

  Editor._register({
    /* history / clipboard */
    undo: function () { doUndo(); setTimeout(function () { emit('history', Editor.query('history')); emit('selection', Editor.query('selection')); }, 60); },
    redo: function () { doRedo(); setTimeout(function () { emit('history', Editor.query('history')); emit('selection', Editor.query('selection')); }, 60); },
    copy: function () { ctxCopy(); },
    paste: function () { ctxPaste(); },
    cut: function () {
      var o = sel(); if (!o) { toast('Select something first'); return; }
      ctxCopy();
      fc.remove(o); fc.discardActiveObject(); done();
      toast('Cut');
    },
    duplicate: function () {
      var o = sel(); if (!o) { toast('Select something first'); return; }
      o.clone(function (c) {
        c.set({ left: c.left + 24, top: c.top + 24 });
        fc.add(c).setActiveObject(c); done();
      }, FABRIC_JSON_PROPS);
    },
    'delete': function () {
      var o = sel(); if (!o) { toast('Select something first'); return; }
      if (o.type === 'activeSelection') { o.forEachObject(function (x) { fc.remove(x); }); fc.discardActiveObject(); }
      else fc.remove(o);
      done();
    },

    /* text */
    /* toggles: the ON/OFF decision is taken once from the first selected text
       box, then applied to every selected text box - so a mixed selection ends
       up uniform instead of each box flipping its own way. */
    bold: function () {
      var o = needText(); if (!o) return;
      var fw = effProp(o, 'fontWeight', 'normal');
      var want = (fw === 'bold' || +fw >= 600) ? 'normal' : 'bold';
      eachText(function (x) { applyTextProps(x, { fontWeight: want }); }); done();
    },
    italic: function () {
      var o = needText(); if (!o) return;
      var want = effProp(o, 'fontStyle', 'normal') === 'italic' ? 'normal' : 'italic';
      eachText(function (x) { applyTextProps(x, { fontStyle: want }); }); done();
    },
    underline: function () {
      var o = needText(); if (!o) return;
      var want = !effProp(o, 'underline', false);
      eachText(function (x) { applyTextProps(x, { underline: want }); }); done();
    },
    strike: function () {
      var o = needText(); if (!o) return;
      var want = !effProp(o, 'linethrough', false);
      eachText(function (x) { applyTextProps(x, { linethrough: want }); }); done();
    },
    clearFormat: function () {
      if (!eachText(function (x) {
        applyTextProps(x, { fontWeight: 'normal', fontStyle: 'normal', underline: false, linethrough: false, textBackgroundColor: '' });
        x.set({ charSpacing: 0, lineHeight: 1.16 });
      })) return;
      done(); toast('Formatting cleared');
    },
    fontFamily: function (name) { if (!eachText(function (x) { applyTextProps(x, { fontFamily: name }); })) return; done(); },
    fontSize: function (pt) {
      pt = Math.max(1, Math.min(999, Math.round(pt)));
      if (!eachText(function (x) { applyTextProps(x, { fontSize: pt * pxPerPt() }); })) return;
      done();
    },
    fontStep: function (dir) {
      /* each box steps from ITS OWN size, so relative sizes inside a
         multi-selection are preserved */
      if (!eachText(function (x) {
        var cur = Math.round(effProp(x, 'fontSize', 36) / pxPerPt());
        var next = null;
        if (dir > 0) { for (var i = 0; i < SIZE_LADDER.length; i++) if (SIZE_LADDER[i] > cur) { next = SIZE_LADDER[i]; break; } if (next == null) next = cur + 8; }
        else { for (var j = SIZE_LADDER.length - 1; j >= 0; j--) if (SIZE_LADDER[j] < cur) { next = SIZE_LADDER[j]; break; } if (next == null) next = Math.max(1, cur - 2); }
        applyTextProps(x, { fontSize: next * pxPerPt() });
      })) return;
      done();
    },
    textColour: function (hex) { if (!hex) return; if (!eachText(function (x) { applyTextProps(x, { fill: hex }); })) return; done(); },
    highlight: function (hex) { if (!eachText(function (x) { x.set('textBackgroundColor', hex || ''); x.dirty = true; })) return; done(); },
    align: function (side) {
      var many = textTargets();
      if (!many.length) { toast('Select a text box first'); return; }
      if (many.length > 1) {
        /* multi-selection: set the alignment on every selected text box */
        many.forEach(function (x) { x.set('textAlign', side); x.dirty = true; });
        done(); return;
      }
      var o = many[0];
      /* 21 Aug 2026 — a box exactly as wide as its text cannot show alignment;
         give it room (the slide width minus its left margin) so it does */
      if (o.type !== 'textbox') {
        var W = fc._baseWidth || 1920, lx = o.left || 0;
        var j = o.toObject(FABRIC_JSON_PROPS); j.type = 'textbox'; j.width = Math.max(o.getScaledWidth() / (o.scaleX || 1), Math.min(W - lx - 40, W * 0.6)); j.scaleX = o.scaleX; j.scaleY = o.scaleY;
        var idx = fc.getObjects().indexOf(o);
        fabric.util.enlivenObjects([j], function (objs) { if (!objs[0]) return; fc.remove(o); fc.insertAt(objs[0], idx, false); objs[0].set('textAlign', side); fc.setActiveObject(objs[0]); done(); });
        return;
      }
      o.set('textAlign', side); o.dirty = true; done();
    },
    bullets: function () { listify('bullet'); },
    numbering: function () { listify('number'); },
    lineSpacing: function (v) { if (!eachText(function (x) { x.set('lineHeight', +v || 1.16); x.dirty = true; })) return; done(); },

    /* insert */
    insertText: function (kind) { addText(kind || 'body'); emit('selection', Editor.query('selection')); },
    insertShape: function (kind) {
      var map = { rect: null, rounded: null, circle: null, triangle: null, diamond: null, hexagon: null, star: null, arrow: null };
      var base = { left: 140, top: 120, fill: '#7C3AED', opacity: 0.92 };
      var s = null;
      if (kind === 'rect') s = new fabric.Rect(Object.assign({}, base, { width: 200, height: 130 }));
      else if (kind === 'rounded') s = new fabric.Rect(Object.assign({}, base, { width: 200, height: 130, rx: 26, ry: 26 }));
      else if (kind === 'circle') s = new fabric.Circle(Object.assign({}, base, { radius: 85 }));
      else if (kind === 'triangle') s = new fabric.Triangle(Object.assign({}, base, { width: 170, height: 150 }));
      else if (kind === 'diamond') s = new fabric.Polygon([{ x: 85, y: 0 }, { x: 170, y: 85 }, { x: 85, y: 170 }, { x: 0, y: 85 }], base);
      else if (kind === 'hexagon') s = new fabric.Polygon([{ x: 45, y: 0 }, { x: 135, y: 0 }, { x: 180, y: 78 }, { x: 135, y: 156 }, { x: 45, y: 156 }, { x: 0, y: 78 }], base);
      else if (kind === 'star') s = new fabric.Polygon(makeStarPoints(85, 36), base);
      else if (kind === 'arrow') s = new fabric.Polygon([{ x: 0, y: 45 }, { x: 110, y: 45 }, { x: 110, y: 10 }, { x: 180, y: 70 }, { x: 110, y: 130 }, { x: 110, y: 95 }, { x: 0, y: 95 }], base);
      if (!s) { toast('Unknown shape: ' + kind); return; }
      fc.add(s).setActiveObject(s);
      done(); toast('Shape added');
    },
    insertLine: function () {
      var l = new fabric.Line([0, 0, 260, 0], { left: 140, top: 200, stroke: '#7C3AED', strokeWidth: 4 });
      fc.add(l).setActiveObject(l);
      done(); toast('Line added');
    },
    insertFrame: function (kind) {
      var A = window.RBAssets || {};
      var def = A.FRAME_DEFS && A.FRAME_DEFS[kind];
      if (!def) { toast('Unknown frame: ' + kind); return; }
      var path = new fabric.Path(def.d, {
        fill: '#E9EAEE', stroke: '#C3C7D1', strokeDashArray: [8, 6], strokeWidth: 2, isAperture: true
      });
      var g = new fabric.Group([path], {
        left: 180, top: 120, isFrame: true, frameKind: kind,
        framePath: def.d, framePathW: def.w, framePathH: def.h, frameLook: 'placeholder'
      });
      var target = 320;
      var sc = target / Math.max(def.w, def.h);
      g.set({ scaleX: sc, scaleY: sc });
      fc.add(g).setActiveObject(g);
      done(); toast(def.label + ' frame added — photo drop comes with stage 2');
    },
    insertImage: function (dataUrl) {
      if (!dataUrl) return;
      fabric.Image.fromURL(dataUrl, function (img) {
        var maxW = fc.getWidth() / fc.getZoom() * 0.5;
        if (img.width > maxW) img.scaleToWidth(maxW);
        img.set({ left: 160, top: 120 });
        fc.add(img).setActiveObject(img);
        done(); toast('Image added');
      });
    },

    /* arrange */
    front: function () { var o = sel(); if (!o) return toast('Select something first'); fc.bringToFront(o); done(); },
    back: function () { var o = sel(); if (!o) return toast('Select something first'); fc.sendToBack(o); done(); },
    forward: function () { var o = sel(); if (!o) return toast('Select something first'); fc.bringForward(o); done(); },
    backward: function () { var o = sel(); if (!o) return toast('Select something first'); fc.sendBackwards(o); done(); },
    group: function () {
      var o = sel();
      if (!o || o.type !== 'activeSelection') return toast('Select two or more objects');
      o.toGroup(); done(); toast('Grouped');
    },
    ungroup: function () {
      var o = sel();
      if (!o || o.type !== 'group') return toast('Select a group first');
      o.toActiveSelection(); done(); toast('Ungrouped');
    },
    alignSlide: function (side) {
      var o = sel(); if (!o) return toast('Select something first');
      var W = fc.getWidth() / fc.getZoom(), H = fc.getHeight() / fc.getZoom();
      var w = o.getScaledWidth(), h = o.getScaledHeight();
      if (side === 'left') o.set('left', 0);
      if (side === 'centerH') o.set('left', (W - w) / 2);
      if (side === 'right') o.set('left', W - w);
      if (side === 'top') o.set('top', 0);
      if (side === 'centerV') o.set('top', (H - h) / 2);
      if (side === 'bottom') o.set('top', H - h);
      o.setCoords(); done();
    },
    distribute: function (axis) {
      var o = sel();
      if (!o || o.type !== 'activeSelection' || o._objects.length < 3) return toast('Select three or more objects');
      var objs = o._objects.slice().sort(function (a, b) { return axis === 'h' ? a.left - b.left : a.top - b.top; });
      var first = objs[0], last = objs[objs.length - 1];
      var span = axis === 'h' ? (last.left - first.left) : (last.top - first.top);
      var step = span / (objs.length - 1);
      objs.forEach(function (x, i) {
        if (axis === 'h') x.set('left', first.left + step * i);
        else x.set('top', first.top + step * i);
        x.setCoords();
      });
      done(); toast('Distributed');
    },
    /* ── photo mockups: mark a design area on a product photo, then fill it ── */
    mockupArea: function () {
      var a = new fabric.Rect({
        left: 260, top: 200, width: 300, height: 380,
        fill: 'rgba(124,58,237,0.10)', stroke: '#7C3AED',
        strokeWidth: 2.5, strokeDashArray: [12, 8],
        isMockArea: true, layerName: 'Design area'
      });
      fc.add(a).setActiveObject(a);
      done();
      toast('Move & resize the dashed area over your product photo, then press "Place design into area"');
    },
    mockupFill: function (dataUrl) {
      var area = sel();
      if (!area || !area.isMockArea) {
        area = (fc.getObjects() || []).filter(function (o) { return o.isMockArea; }).pop();
      }
      if (!area) { toast('Add a design area first (dashed box), place it on the product'); return; }
      function place(url) {
        fabric.Image.fromURL(url, function (img) {
          var aw = area.getScaledWidth(), ah = area.getScaledHeight();
          var s = Math.max(aw / img.width, ah / img.height);
          img.set({
            left: area.left, top: area.top,
            scaleX: s, scaleY: s,
            angle: area.angle || 0,
            clipPath: new fabric.Rect({ left: -((img.width * s - aw) / 2) / s - img.width / 2 + 0, top: -((img.height * s - ah) / 2) / s - img.height / 2 + 0, width: aw / s, height: ah / s, originX: 'left', originY: 'top' }),
            layerName: 'Mockup design'
          });
          /* simpler exact fit: stretch design to the area (mockup style) */
          img.set({ scaleX: aw / img.width, scaleY: ah / img.height, clipPath: null });
          fc.remove(area);
          fc.add(img).setActiveObject(img);
          done();
          toast('Design placed ✓ — your mockup is ready');
        });
      }
      if (typeof dataUrl === 'string' && dataUrl) { place(dataUrl); return; }
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function () { place(r.result); };
        r.readAsDataURL(f);
      };
      inp.click();
    },

    /* Format-tab shape styling */
    shapeFill: function (hex) {
      var o = sel(); if (!o) return toast('Select something first');
      var list = (o.type === 'activeSelection' || o.type === 'group') ? o._objects : [o];
      list.forEach(function (x) { x.set('fill', hex); x.dirty = true; });
      done();
    },
    shapeOutline: function (hex) {
      var o = sel(); if (!o) return toast('Select something first');
      var list = (o.type === 'activeSelection' || o.type === 'group') ? o._objects : [o];
      list.forEach(function (x) {
        if (hex == null) x.set('stroke', null);
        else x.set({ stroke: hex, strokeWidth: Math.max(1, x.strokeWidth || 0) });
        x.dirty = true;
      });
      done();
    },
    shapeOutlineW: function (w) {
      var o = sel(); if (!o) return toast('Select something first');
      var list = (o.type === 'activeSelection' || o.type === 'group') ? o._objects : [o];
      /* 21 Aug 2026 — strokeUniform: the outline is drawn AT the width asked
         for, not multiplied by the object's scale (a 4x-scaled shape used to
         grow a 4x-fat border and look "inflated"). Width capped at 40px. */
      var sw = Math.max(0, Math.min(40, +w || 0));
      list.forEach(function (x) {
        if (sw === 0) { x.set({ strokeWidth: 0 }); }
        else x.set({ strokeWidth: sw, stroke: x.stroke || '#1F2430', strokeUniform: true });
        x.dirty = true; if (x.setCoords) x.setCoords();
      });
      done();
    },
    shapeOpacity: function (v) {
      var list = selAll(); if (!list.length) return toast('Select something first');
      list.forEach(function (x) { x.set('opacity', +v || 1); x.dirty = true; });
      done();
    },
    moveSlide: function (a) { if (a) moveSlideTo(a.from, a.to); },
    /* real 3D-look objects (gradient SVGs) dropped onto the canvas */
    insert3D: function (a) {
      if (!a || !a.svg) return;
      fabric.loadSVGFromString(a.svg, function (objs, opts) {
        if (!objs || !objs.length) { toast('Could not load that object'); return; }
        var g = fabric.util.groupSVGElements(objs, opts);
        var sc = 240 / Math.max(g.width || 1, g.height || 1);
        g.set({ left: 220, top: 140, scaleX: sc, scaleY: sc, layerName: a.name || '3D object' });
        fc.add(g).setActiveObject(g);
        fc.renderAll(); saveState();
        emit('selection', Editor.query('selection'));
        toast((a.name || '3D object') + ' added');
      });
    },
    flipH: function () { var o = sel(); if (!o) return toast('Select something first'); o.set('flipX', !o.flipX); done(); },
    flipV: function () { var o = sel(); if (!o) return toast('Select something first'); o.set('flipY', !o.flipY); done(); },
    rotate: function (deg) { var o = sel(); if (!o) return toast('Select something first'); o.rotate(((o.angle || 0) + (deg || 90)) % 360); o.setCoords(); done(); },
    lock: function () { ctxLock(); saveState(); emit('selection', Editor.query('selection')); },
    unlockAll: function () {
      (fc.getObjects() || []).forEach(function (o) {
        if (o.ldMasterId && !window._masterMode) return;
        o.set({ lockMovementX: false, lockMovementY: false, lockScalingX: false, lockScalingY: false, lockRotation: false, hasControls: true, selectable: true, evented: true });
      });
      done(); toast('All objects unlocked');
    },
    selectAll: function () {
      var objs = (fc.getObjects() || []).filter(function (o) { return o.selectable !== false; });
      if (!objs.length) return toast('Nothing to select');
      fc.discardActiveObject();
      var s = new fabric.ActiveSelection(objs, { canvas: fc });
      fc.setActiveObject(s); fc.renderAll();
      emit('selection', Editor.query('selection'));
    },
    deselect: function () { fc.discardActiveObject(); fc.renderAll(); emit('selection', Editor.query('selection')); },

    /* slides */
    addSlide: function () { addPage(); renderPageThumbs(); },
    duplicateSlide: function () { dupSlide(); },
    deleteSlide: function () { Promise.resolve(deletePage()).then(function () { renderPageThumbs(); }); },
    gotoSlide: function (i) { if (i !== state.currentPage) switchPage(i); },

    /* design / view */
    background: function (hex) {
      if (!hex) return;
      fc.setBackgroundImage(null, function () {
        fc.setBackgroundColor(hex, fc.renderAll.bind(fc));
        saveState(); toast('Background applied');
      });
    },
    /* full-bleed image / gradient / pattern / photo background (live) */
    backgroundImage: function (url) {
      if (!url) return;
      fabric.Image.fromURL(url, function (img) {
        if (!img || !img.width) { toast('Could not load that background'); return; }
        var W = fc.getWidth() / fc.getZoom(), H = fc.getHeight() / fc.getZoom();
        var s = Math.max(W / img.width, H / img.height);
        img.set({ originX: 'left', originY: 'top', left: 0, top: 0, scaleX: s, scaleY: s });
        fc.setBackgroundImage(img, function () {
          fc.renderAll(); saveState(); toast('Background applied');
        });
      }, { crossOrigin: 'anonymous' });
    },
    /* 04 Sep 2026 - REMOVE THE SLIDE'S BACKGROUND. There was no way to take a
       background off again - the Backgrounds panel could only put one on, and
       the AI panel's "Remove background" is a photo tool, not a slide tool.
       This clears the background picture AND the background colour, and also
       deletes any full-bleed background object painted onto the slide
       (imported and composed decks carry their background that way). */
    backgroundRemove: function () {
      var killed = 0;
      (fc.getObjects() || []).slice().forEach(function (o) {
        if (o.isBg) { fc.remove(o); killed++; }
      });
      fc.setBackgroundImage(null, function () {
        fc.setBackgroundColor('#FFFFFF', function () {
          fc.renderAll(); saveState();
          if (typeof renderPageThumbs === 'function') {
            var _p = state.pages[state.currentPage];
            if (_p) { try { _p.thumb = fc.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.08 }); } catch (_e) { _p.thumb = null; } }
            renderPageThumbs();
          }
          toast('Slide background removed');
        });
      });
    },
    pageSize: function (ratio) { applyAspect(ratio); },
    zoom: function (pct) { setZoom(pct); state.zoom = pct; emit('zoom', { pct: pct }); },
    zoomFit: function () { var z = calculateFitZoom(); setZoom(z); state.zoom = z; emit('zoom', { pct: z }); },
    fitWidth: function () { fitWidthNow(); emit('zoom', { pct: state.zoom }); },
    toggleRuler: function () { view.ruler = !view.ruler; dom.canvasArea.classList.toggle('show-ruler', view.ruler); toast('Ruler ' + (view.ruler ? 'on' : 'off')); },
    toggleGrid: function () { view.grid = !view.grid; dom.canvasArea.classList.toggle('show-grid', view.grid); toast('Gridlines ' + (view.grid ? 'on' : 'off')); },
    toggleGuides: function () { view.guides = !view.guides; dom.canvasArea.classList.toggle('show-guides', view.guides); toast('Guides ' + (view.guides ? 'on' : 'off')); },
    viewNormal: function () { toast('Normal view'); },

    /* layers (sidebar) */
    layerAction: function (a) {
      if (!a) return;
      var o = findByLid(a.id);
      if (!o) return;
      if (a.action === 'select') { fc.setActiveObject(o); fc.renderAll(); emit('selection', Editor.query('selection')); }
      if (a.action === 'vis') { o.visible = o.visible === false; if (o.visible === false && sel() === o) fc.discardActiveObject(); done(); }
      if (a.action === 'lock') {
        var lock = !o.lockMovementX;
        o.set({ lockMovementX: lock, lockMovementY: lock, lockScalingX: lock, lockScalingY: lock, lockRotation: lock, hasControls: !lock });
        done();
      }
    },

    /* queries */
    __qSelection: function () {
      var o = sel();
      if (!o) return null;
      var kind = isText(o) ? 'text'
        : o.isFrame ? 'frame' : o.isIcon ? 'icon' : o.isIllo ? 'illustration'
        : o.type === 'image' ? 'image' : o.type === 'activeSelection' ? 'multi'
        : o.type === 'group' ? 'group' : 'shape';
      /* hasText: true when the selection holds ANY text (including a
         multi-selection or a group) - the ribbon uses it to keep the text
         controls live instead of dimming them */
      return { kind: kind, locked: !!o.lockMovementX, hasText: textTargets().length > 0, count: selAll().length };
    },
    __qTextState: function () {
      var o = textTargets()[0];
      if (!o) return null;
      var fw = effProp(o, 'fontWeight', 'normal');
      var lines = String(o.text || '').split('\n').filter(function (l) { return l.trim(); });
      var list = null;
      if (lines.length && lines.every(function (l) { return /^\s*•\s/.test(l); })) list = 'bullet';
      else if (lines.length && lines.every(function (l) { return /^\s*\d+\.\s/.test(l); })) list = 'number';
      return {
        fontFamily: String(effProp(o, 'fontFamily', 'DM Sans')).split(',')[0].replace(/"/g, '').trim(),
        sizePt: Math.round(effProp(o, 'fontSize', 36) / pxPerPt()),
        bold: fw === 'bold' || +fw >= 600,
        italic: effProp(o, 'fontStyle', 'normal') === 'italic',
        underline: !!effProp(o, 'underline', false),
        strike: !!effProp(o, 'linethrough', false),
        align: o.textAlign || 'left',
        colour: typeof effProp(o, 'fill', '#000') === 'string' ? effProp(o, 'fill', '#000') : '#000000',
        highlight: o.textBackgroundColor || null,
        list: list
      };
    },
    __qFonts: function () { return WEB_FONTS.slice(); },
    __qHistory: function () {
      var p = state.pages[state.currentPage] || {};
      var idx = p.historyIndex == null ? -1 : p.historyIndex;
      return { canUndo: idx > 0, canRedo: !!(p.history && idx < p.history.length - 1) };
    },
    __qView: function () { return { ruler: view.ruler, grid: view.grid, guides: view.guides }; },
    __qPageSize: function () { return { ratio: currentRatio }; },
    __qLayers: function () {
      return (fc ? fc.getObjects() : []).filter(function (o) { return !o.isBg; }).map(function (o) {
        return { id: lidOf(o), name: labelOf(o), kind: o.type, visible: o.visible !== false, locked: !!o.lockMovementX };
      }).reverse();
    },
    __qPages: function () {
      return state.pages.map(function (p, i) { return { title: p.title || null, index: i }; });
    },
    __qPhotos: function () { return []; }
  });

  function listify(kind) {
    var all = textTargets();
    if (!all.length) { toast('Select a text box first'); return; }
    all.forEach(function (x) { listifyOne(x, kind); });
    done();
  }
  function listifyOne(o, kind) {
    var lines = String(o.text || '').split('\n');
    var filled = lines.filter(function (l) { return l.trim(); });
    var isB = filled.length && filled.every(function (l) { return /^\s*•\s/.test(l); });
    var isN = filled.length && filled.every(function (l) { return /^\s*\d+\.\s/.test(l); });
    var current = isB ? 'bullet' : isN ? 'number' : null;
    var out;
    if (current === kind || !filled.length) {
      out = lines.map(function (l) { return l.replace(/^\s*([•]|\d+\.)\s+/, ''); });
    } else {
      var stripped = lines.map(function (l) { return l.replace(/^\s*([•]|\d+\.)\s+/, ''); });
      var n = 0;
      out = stripped.map(function (l) {
        if (!l.trim()) return l;
        n++;
        return (kind === 'number' ? n + '. ' : '• ') + l.replace(/^\s+/, '');
      });
    }
    o.set('text', out.join('\n'));
    o.dirty = true;
  }

  /* ═════════ boot ═════════ */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      initFabric();
      state.pages = [makeBlankPage(Date.now())];
      state.notes = [''];
      state.currentPage = 0;
      fc.setBackgroundColor('#ffffff', fc.renderAll.bind(fc));

      ['selection:created', 'selection:updated', 'selection:cleared'].forEach(function (ev) {
        fc.on(ev, function () { emit('selection', Editor.query('selection')); });
      });
      fc.on('text:changed', function () { emit('selection', Editor.query('selection')); });

      /* zoom slider + buttons in the filmstrip */
      var slider = dom.zoomSlider;
      if (slider) slider.addEventListener('input', function () {
        setZoom(+slider.value); state.zoom = +slider.value;
        emit('zoom', { pct: state.zoom });
      });
      var zi = document.getElementById('zoom-in-btn'), zo = document.getElementById('zoom-out-btn');
      if (zi) zi.addEventListener('click', function () { Editor.run('zoom', Math.min(300, state.zoom + 10)); });
      if (zo) zo.addEventListener('click', function () { Editor.run('zoom', Math.max(10, state.zoom - 10)); });

      /* slide-show button beside the zoom bar (Canva/PPT status-bar style) */
      var fm = document.querySelector('.film-meta');
      if (fm) {
        var showB = document.createElement('button');
        showB.type = 'button'; showB.className = 'film-present'; showB.title = 'Slide show (from beginning)';
        showB.innerHTML = '<span class="material-icons-outlined">slideshow</span>';
        showB.addEventListener('click', function () { Editor.run('presentFromStart'); });
        fm.insertBefore(showB, fm.firstChild);
      }

      /* keyboard */
      document.addEventListener('keydown', function (e) {
        var inInput = /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '');
        var o = sel();
        if (inInput || (o && o.isEditing)) return;
        var ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); Editor.run('undo'); return; }
        if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); Editor.run('redo'); return; }
        if (ctrl && (e.key === 'c' || e.key === 'C')) { Editor.run('copy'); return; }
        if (ctrl && (e.key === 'v' || e.key === 'V')) { Editor.run('paste'); return; }
        if (ctrl && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); Editor.run('duplicate'); return; }
        if (ctrl && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); Editor.run('selectAll'); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { if (sel()) { e.preventDefault(); Editor.run('delete'); } return; }
        if (e.key === 'Escape') { Editor.run('deselect'); return; }
      });

      /* selection look: violet border, white round handles (opus note #4) */
      Object.assign(fabric.Object.prototype, {
        borderColor: '#8B3DFF', borderScaleFactor: 1.5,
        cornerColor: '#FFFFFF', cornerStrokeColor: '#8B3DFF',
        cornerStyle: 'circle', cornerSize: 11, transparentCorners: false
      });
      fc.selectionColor = 'rgba(139,61,255,0.08)';
      fc.selectionBorderColor = '#8B3DFF';
      fc.selectionLineWidth = 1.5;
      /* Ctrl+click (or Shift+click) adds objects to the selection → group them */
      fc.selectionKey = ['ctrlKey', 'shiftKey'];

      /* 21 Aug 2026 (Fable) — fit the slide to the window instead of the
         old hard-coded 59%, and keep it fitted when the window is resized
         (PowerPoint behaviour). A manual zoom by the user switches the
         resize handler off until the next Fit Slide / new deck. */
      function fitToWindow() {
        var z = Math.round(calculateFitZoom());
        if (!isFinite(z) || z <= 0) z = 100;
        setZoom(z); state.zoom = z; emit('zoom', { pct: state.zoom });
      }
      state.autoFit = true;
      var _rsT = null;
      window.addEventListener('resize', function () {
        if (!state.autoFit) return;
        clearTimeout(_rsT);
        _rsT = setTimeout(fitToWindow, 120);
      });
      if (slider) slider.addEventListener('input', function () { state.autoFit = false; });
      if (zi) zi.addEventListener('click', function () { state.autoFit = false; });
      if (zo) zo.addEventListener('click', function () { state.autoFit = false; });
      var _origZoomFit = impl.zoomFit;
      impl.zoomFit = function () { state.autoFit = true; return _origZoomFit ? _origZoomFit() : fitToWindow(); };
      var _origZoom = impl.zoom;
      impl.zoom = function (pct) { state.autoFit = false; return _origZoom ? _origZoom(pct) : undefined; };

      loadPageIntoCanvas(0).then(function () {
        fitToWindow();
        /* the sidebar/ribbon mount after us and change the canvas area —
           re-fit once layout has settled */
        setTimeout(function () { if (state.autoFit) fitToWindow(); }, 250);
        renderPageThumbs();
        emit('ready');
        emit('history', Editor.query('history'));
      });
    } catch (e) {
      console.error('[core] boot failed', e);
      toast('Engine failed to start — see console');
    }
  });
})();
