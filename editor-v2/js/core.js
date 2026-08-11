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
  currentPage: 0, zoom: 62,
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
  'isIcon', 'iconName', 'iconWeight',
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

function saveState() {
  if (!fc || (typeof _restoring !== 'undefined' && _restoring) || window._bulkLoad || window._masterMode) return;
  var page = state.pages[state.currentPage];
  if (!page) return;
  var json = JSON.stringify(fc.toJSON(FABRIC_JSON_PROPS));
  var idx = page.historyIndex == null ? -1 : page.historyIndex;
  page.history = (page.history || []).slice(0, idx + 1);
  page.history.push(json);
  page.historyMeta = (page.historyMeta || []).slice(0, idx + 1);
  page.historyMeta.push({ t: Date.now(), n: (fc.getObjects() || []).length, label: _historyLabel });
  _historyLabel = null;
  if (page.history.length > 60) { page.history.shift(); page.historyMeta.shift(); }
  page.historyIndex = page.history.length - 1;
  if (typeof updateUndoRedo === 'function') updateUndoRedo();
  Editor._emit('history', Editor.query('history'));
}

function captureCurrentPage() {
  if (!fc || window._masterMode) return;
  var page = state.pages[state.currentPage];
  if (!page) return;
  page.canvasJSON = fc.toJSON(FABRIC_JSON_PROPS);
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
    'exportPptx','saveProject','newDesign',
    'insertTable','insertIcon','insertWordArt','insertVideo','insertAudio','addComment',
    'drawPen','drawHighlighter','drawEraser','drawClear',
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
    'insertShapePreset','insertLineKind',
    'layerAction','ai'
  ];
  var impl = {};

  window.Editor = {
    run: function (cmd, arg) {
      if (COMMANDS.indexOf(cmd) === -1) { toast('Unknown command: ' + cmd); return false; }
      if (typeof impl[cmd] !== 'function') { toast('Coming in the next wiring stage: ' + cmd); return false; }
      try { return impl[cmd](arg); }
      catch (e) { console.error('[core]', cmd, e); toast('Command failed: ' + cmd); return false; }
    },
    query: function (key) {
      switch (key) {
        case 'selection': return impl.__qSelection ? impl.__qSelection() : null;
        case 'textState': return impl.__qTextState ? impl.__qTextState() : null;
        case 'fonts':     return impl.__qFonts ? impl.__qFonts() : ['DM Sans'];
        case 'slides':    return { count: state.pages.length || 1, current: state.currentPage || 0 };
        case 'zoom':      return state.zoom;
        case 'history':   return impl.__qHistory ? impl.__qHistory() : { canUndo: false, canRedo: false };
        case 'view':      return impl.__qView ? impl.__qView() : { ruler: false, grid: false, guides: false };
        case 'pageSize':  return impl.__qPageSize ? impl.__qPageSize() : { ratio: '16:9' };
        case 'layers':    return impl.__qLayers ? impl.__qLayers() : [];
        case 'pages':     return impl.__qPages ? impl.__qPages() : [];
        case 'photos':    return impl.__qPhotos ? impl.__qPhotos() : [];
        case 'projects':  return [];
        case 'templates': return window._editorTemplates || [];
        case 'datasets':   return impl.__qDatasets ? impl.__qDatasets() : [];
        case 'chartTypes': return impl.__qChartTypes ? impl.__qChartTypes() : [];
        case 'dataSamples': return impl.__qSamples ? impl.__qSamples() : [];
        case 'slideLayouts': return impl.__qSlideLayouts ? impl.__qSlideLayouts() : [];
        case 'wordArtStyles': return impl.__qWordArtStyles ? impl.__qWordArtStyles() : [];
        case 'shapeGroups': return impl.__qShapeGroups ? impl.__qShapeGroups() : [];
        case 'components': return [];
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
    var o = sel();
    if (!isText(o)) { toast('Select a text box first'); return null; }
    return o;
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

  function fitWidthNow() {
    if (!fc || !dom.canvasArea) return;
    var area = dom.canvasArea.getBoundingClientRect().width;
    var slideW = fc.getWidth() / fc.getZoom();
    if (!slideW) return;
    setZoom(Math.max(10, Math.min(300, (area - 80) / slideW * 100)));
  }
  function applyAspect(ratio) {
    var emu = PAGE_SIZES[ratio];
    if (!emu) return;
    captureCurrentPage();
    setSlideAspect(emu[0], emu[1]);
    if (window._deckIR && window._deckIR.size) { window._deckIR.size.w = emu[0]; window._deckIR.size.h = emu[1]; }
    currentRatio = ratio;
    loadPageIntoCanvas(state.currentPage).then(function () {
      fitWidthNow(); renderPageThumbs();
      toast('Slide set to ' + ratio.toUpperCase());
    });
  }
  function dupSlide() {
    captureCurrentPage();
    var src = state.pages[state.currentPage];
    var copy = makeBlankPage(Date.now());
    copy.canvasJSON = src.canvasJSON ? JSON.parse(JSON.stringify(src.canvasJSON)) : null;
    copy.thumb = src.thumb;
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
    bold: function () { var o = needText(); if (!o) return; var fw = effProp(o, 'fontWeight', 'normal'); var on = fw === 'bold' || +fw >= 600; applyTextProps(o, { fontWeight: on ? 'normal' : 'bold' }); done(); },
    italic: function () { var o = needText(); if (!o) return; applyTextProps(o, { fontStyle: effProp(o, 'fontStyle', 'normal') === 'italic' ? 'normal' : 'italic' }); done(); },
    underline: function () { var o = needText(); if (!o) return; applyTextProps(o, { underline: !effProp(o, 'underline', false) }); done(); },
    strike: function () { var o = needText(); if (!o) return; applyTextProps(o, { linethrough: !effProp(o, 'linethrough', false) }); done(); },
    clearFormat: function () {
      var o = needText(); if (!o) return;
      applyTextProps(o, { fontWeight: 'normal', fontStyle: 'normal', underline: false, linethrough: false, textBackgroundColor: '' });
      o.set({ charSpacing: 0, lineHeight: 1.16 });
      done(); toast('Formatting cleared');
    },
    fontFamily: function (name) { var o = needText(); if (!o) return; applyTextProps(o, { fontFamily: name }); done(); },
    fontSize: function (pt) {
      var o = needText(); if (!o) return;
      pt = Math.max(1, Math.min(999, Math.round(pt)));
      applyTextProps(o, { fontSize: pt * pxPerPt() });
      done();
    },
    fontStep: function (dir) {
      var o = needText(); if (!o) return;
      var cur = Math.round(effProp(o, 'fontSize', 36) / pxPerPt());
      var next = null;
      if (dir > 0) { for (var i = 0; i < SIZE_LADDER.length; i++) if (SIZE_LADDER[i] > cur) { next = SIZE_LADDER[i]; break; } if (next == null) next = cur + 8; }
      else { for (var j = SIZE_LADDER.length - 1; j >= 0; j--) if (SIZE_LADDER[j] < cur) { next = SIZE_LADDER[j]; break; } if (next == null) next = Math.max(1, cur - 2); }
      applyTextProps(o, { fontSize: next * pxPerPt() });
      done();
    },
    textColour: function (hex) { var o = needText(); if (!o || !hex) return; applyTextProps(o, { fill: hex }); done(); },
    highlight: function (hex) { var o = needText(); if (!o) return; o.set('textBackgroundColor', hex || ''); done(); },
    align: function (side) { var o = needText(); if (!o) return; o.set('textAlign', side); done(); },
    bullets: function () { listify('bullet'); },
    numbering: function () { listify('number'); },
    lineSpacing: function (v) { var o = needText(); if (!o) return; o.set('lineHeight', +v || 1.16); done(); },

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
      fc.setBackgroundColor(hex, fc.renderAll.bind(fc));
      saveState(); toast('Background applied');
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
      return { kind: kind, locked: !!o.lockMovementX };
    },
    __qTextState: function () {
      var o = sel();
      if (!isText(o)) return null;
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
    var o = needText(); if (!o) return;
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
    done();
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

      loadPageIntoCanvas(0).then(function () {
        Editor.run ? null : null;
        setZoom(60); state.zoom = 60; emit('zoom', { pct: 60 }); /* opus note #1 */
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
