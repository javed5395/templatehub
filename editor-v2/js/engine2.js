/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 2                          owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   Engine-side file (like core.js it MAY touch fc/state/renderer — UI files
   still may not). Adds: cloud compose import (Hexa), projects + autosave,
   PPTX export, photo-drop frames, themes, draw, charts, icons, tables,
   WordArt, effects, present mode, transitions/animations storage.
   Battle-tested parts are VERBATIM ports from v1 (marked //v1).
   ═══════════════════════════════════════════════════════════════════════ */

/* ── backend + auth ─────────────────────────────────────────────────── */
window.LD_BACKEND = window.LD_BACKEND || (
  (location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname))
    ? 'http://localhost:8080'
    : 'https://composer-proxy-irosbvpq7q-uc.a.run.app'
);
window.LD_AUTH_TOKEN = window.LD_AUTH_TOKEN || null;
(function () {
  /* firebase auth — same project as the main site; guarded so the editor
     never breaks when offline */
  try {
    var s = document.createElement('script');
    s.type = 'module';
    s.textContent = `
      try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
        const app = getApps().length ? getApp() : initializeApp({ apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain:"templatehub-16cd7.firebaseapp.com", projectId:"templatehub-16cd7" });
        const auth = getAuth(app);
        onAuthStateChanged(auth, async (u) => { window.LD_AUTH_TOKEN = u ? await u.getIdToken() : null; });
        setInterval(async () => { try { if (auth.currentUser) window.LD_AUTH_TOKEN = await auth.currentUser.getIdToken(); } catch(e){} }, 10 * 60 * 1000);
      } catch (e) { console.warn('[v2] auth offline', e); }
    `;
    document.head.appendChild(s);
  } catch (e) {}
})();

/* FRAME_DEFS global expected by the v1 frame fragments */
var FRAME_DEFS = (window.RBAssets && window.RBAssets.FRAME_DEFS) || {};
document.addEventListener('DOMContentLoaded', function () {
  if (!Object.keys(FRAME_DEFS).length && window.RBAssets) FRAME_DEFS = window.RBAssets.FRAME_DEFS || {};
});

function framePathToCmds(d) {
  /* Proper tokenizer: H/V become L (using the running point), M with extra
     pairs becomes M+L, and C/Q/A keep their own arities. The old version only
     knew M/L/C/Z, so H/V/A numbers leaked into the previous command and drew
     stray diagonals (grids and filled shapes). */
  var out = [], re = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi, m;
  var cx = 0, cy = 0, sx = 0, sy = 0, i;
  while ((m = re.exec(d))) {
    var c = m[1].toUpperCase();
    var nums = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
    if (c === 'Z') { out.push(['Z']); cx = sx; cy = sy; }
    else if (c === 'M') {
      for (i = 0; i + 1 < nums.length; i += 2) {
        cx = nums[i]; cy = nums[i + 1];
        out.push([i === 0 ? 'M' : 'L', cx, cy]);
        if (i === 0) { sx = cx; sy = cy; }
      }
    }
    else if (c === 'L' || c === 'T') {
      for (i = 0; i + 1 < nums.length; i += 2) { cx = nums[i]; cy = nums[i + 1]; out.push(['L', cx, cy]); }
    }
    else if (c === 'H') { for (i = 0; i < nums.length; i++) { cx = nums[i]; out.push(['L', cx, cy]); } }
    else if (c === 'V') { for (i = 0; i < nums.length; i++) { cy = nums[i]; out.push(['L', cx, cy]); } }
    else if (c === 'C') { for (i = 0; i + 5 < nums.length; i += 6) { out.push(['C', nums[i], nums[i+1], nums[i+2], nums[i+3], nums[i+4], nums[i+5]]); cx = nums[i+4]; cy = nums[i+5]; } }
    else if (c === 'S') { for (i = 0; i + 3 < nums.length; i += 4) { out.push(['C', cx, cy, nums[i], nums[i+1], nums[i+2], nums[i+3]]); cx = nums[i+2]; cy = nums[i+3]; } }
    else if (c === 'Q') { for (i = 0; i + 3 < nums.length; i += 4) { out.push(['Q', nums[i], nums[i+1], nums[i+2], nums[i+3]]); cx = nums[i+2]; cy = nums[i+3]; } }
    else if (c === 'A') { for (i = 0; i + 6 < nums.length; i += 7) { out.push(['A', nums[i], nums[i+1], nums[i+2], nums[i+3], nums[i+4], nums[i+5], nums[i+6]]); cx = nums[i+5]; cy = nums[i+6]; } }
  }
  return out;
}

function frameFace(obj, wPx, hPx) {
  var cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(wPx));
  cv.height = Math.max(2, Math.round(hPx));
  var g = cv.getContext('2d');
  var im = obj._frameImg, fr = obj.frameRect;
  if (fr) {
    /* PPT stretch fillRect: insets as fractions of the box.
       Negative = the photo overflows the mask = Canva's cover-crop. */
    g.drawImage(im, cv.width * fr.l, cv.height * fr.t,
                    cv.width * (1 - fr.l - fr.r), cv.height * (1 - fr.t - fr.b));
  } else {
    var sc = Math.max(cv.width / im.width, cv.height / im.height);
    g.drawImage(im, (cv.width - im.width * sc) / 2, (cv.height - im.height * sc) / 2,
                im.width * sc, im.height * sc);
  }
  return cv;
}

function framePlaceholder(wPx, hPx) {
  /* 11 Aug — Canva-style scenic placeholder: sky, cloud and green hills
     instead of the grey box + tiny photo glyph (looked dead on canvas). */
  var cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(wPx));
  cv.height = Math.max(2, Math.round(hPx));
  var g = cv.getContext('2d'), W = cv.width, H = cv.height;
  var sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#BEE3F8');
  sky.addColorStop(0.7, '#E7F4FD');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  /* hills */
  g.fillStyle = '#9BD483';
  g.beginPath();
  g.moveTo(0, H * 0.78);
  g.quadraticCurveTo(W * 0.3, H * 0.58, W * 0.55, H * 0.74);
  g.quadraticCurveTo(W * 0.8, H * 0.9, W, H * 0.7);
  g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.fillStyle = '#7BC663';
  g.beginPath();
  g.moveTo(0, H * 0.9);
  g.quadraticCurveTo(W * 0.45, H * 0.72, W, H * 0.88);
  g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
  /* cloud */
  var cx = W * 0.32, cy = H * 0.26, r = Math.min(W, H) * 0.11;
  g.fillStyle = '#FFFFFF';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.arc(cx + r * 1.1, cy + r * 0.15, r * 0.82, 0, Math.PI * 2);
  g.arc(cx - r * 1.05, cy + r * 0.25, r * 0.7, 0, Math.PI * 2);
  g.arc(cx + r * 0.2, cy + r * 0.45, r * 0.9, 0, Math.PI * 2);
  g.fill();
  return cv;
}

function frameAperture(grp) {
  var objs = (grp && grp._objects) || [];
  for (var i = 0; i < objs.length; i++) if (objs[i].isAperture) return objs[i];
  return objs[0] || null;
}

function refreshFrame(grp) {
  if (!grp || !grp.isFrame) return;
  var path = frameAperture(grp);
  if (!path) return;
  /* the photo fills the APERTURE, which on a device frame is smaller than
     the group (the bezel takes the rest) */
  /* PATTERN SPACE FIX (11 Aug): a fabric Pattern paints in the path's
     LOCAL (unscaled) coordinate space. Sizing the canvas by the SCALED px
     meant the artwork spilled outside the aperture — only its top-left
     corner showed (the tiny chip bug). Paint at local size instead. */
  var wPx = path.width  || grp.width;
  var hPx = path.height || grp.height;

  if (grp._frameImg) {
    path.set({ fill: new fabric.Pattern({ source: frameFace(grp, wPx, hPx), repeat: 'no-repeat' }),
               stroke: '', strokeDashArray: null, strokeWidth: 0 });
  } else if (grp.frameLook === 'placeholder') {
    path.set({ fill: new fabric.Pattern({ source: framePlaceholder(wPx, hPx), repeat: 'no-repeat' }),
               stroke: '#9BB8D3', strokeDashArray: null, strokeWidth: 1.5 });
  } else {
    /* plain shape — still a frame, still accepts a photo */
    path.set({ fill: grp.frameFill || '#7C3AED',
               stroke: '', strokeDashArray: null, strokeWidth: 0 });
  }
  grp.dirty = true;
  fc && fc.requestRenderAll();
}

function dropImageIntoFrame(imgObj, grp) {
  histLabel('Photo into frame');
  var natural = imgObj._originalElement || imgObj._element;
  if (!natural) return false;
  var iw = natural.naturalWidth || natural.width;
  var ih = natural.naturalHeight || natural.height;
  if (!iw || !ih) return false;
  var src = frameSrcToDataURL(natural);
  if (!src) { showToast('That image is cross-origin and cannot be framed'); return false; }

  /* cover-fit → the same negative-inset fillRect math Canva writes */
  var frameAR = (grp.width * (grp.scaleX || 1)) / Math.max(1, grp.height * (grp.scaleY || 1));
  var imgAR = iw / ih;
  var fr = { l: 0, t: 0, r: 0, b: 0 };
  if (imgAR > frameAR)      { var ov = (1 - imgAR / frameAR) / 2; fr.l = ov; fr.r = ov; }
  else if (imgAR < frameAR) { var ov2 = (1 - frameAR / imgAR) / 2; fr.t = ov2; fr.b = ov2; }

  grp.frameSrc = src;
  grp.frameRect = fr;
  grp._frameImg = natural;
  fc.remove(imgObj);
  refreshFrame(grp);
  fc.setActiveObject(grp);
  saveState();
  showToast('Photo fitted into frame ✓');
  return true;
}

function slideIRFromCanvas(json, origIR, S) {
  var origById = {};
  if (origIR && origIR.elements) origIR.elements.forEach(function (e) { origById[e.id] = e; });
  /* paragraph-split textboxes (irPara) regroup into ONE text element */
  var paraGroups = {}, groupEmitted = {};
  (json.objects || []).forEach(function (o) {
    if (o.irBody) return; /* body twin of a text element — skip */
    if (o.irId && o.irPara != null && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')) {
      (paraGroups[o.irId] = paraGroups[o.irId] || []).push(o);
    }
  });
  var elements = [];
  var tableEmitted = {}, chartEmitted = {};
  (json.objects || []).forEach(function (o) {
    /* table cell rects/texts collapse back into the ORIGINAL table element
       (structure, merges, true font sizes) instead of loose small boxes */
    if (o.irTable) {
      if (!tableEmitted[o.irTable] && origById[o.irTable]) { elements.push(origById[o.irTable]); tableEmitted[o.irTable] = true; }
      return;
    }
    /* dissolved chart pieces collapse back into the ONE chart element —
       data/title/colour edits already live in that IR object */
    if (o.irChart) {
      if (!chartEmitted[o.irChart] && origById[o.irChart]) { elements.push(origById[o.irChart]); chartEmitted[o.irChart] = true; }
      return;
    }
    var orig = o.irId ? origById[o.irId] : null;
    if (o.irId && o.irPara != null && paraGroups[o.irId]) {
      if (groupEmitted[o.irId]) return;
      groupEmitted[o.irId] = true;
      var grp = paraGroups[o.irId].slice().sort(function (a, b) { return a.irPara - b.irPara; });
      var mergedParas = grp.map(function (g, gi) {
        var subOrig = orig && orig.paragraphs && orig.paragraphs[g.irPara] ? Object.assign({}, orig, { paragraphs: [orig.paragraphs[g.irPara]] }) : null;
        var subEl = textIRFromFabric(g, S, subOrig);
        return subEl.paragraphs[0];
      });
      var first = grp[0];
      var base2 = textIRFromFabric(first, S, orig);
      base2.paragraphs = mergedParas;
      if (orig) { base2.w = orig.w; base2.h = orig.h; } /* keep block bounds */
      elements.push(base2);
      return;
    }
    var wPx = (o.width || 10) * (o.scaleX || 1), hPx = (o.height || 10) * (o.scaleY || 1);
    var lxPx = (o.left || 0), lyPx = (o.top || 0);
    /* rotated objects are center-anchored on canvas — convert back to
       top-left for the file's coordinate system */
    if (o.originX === 'center') lxPx -= wPx / 2;
    if (o.originY === 'center') lyPx -= hPx / 2;
    var gx = lxPx * S, gy = lyPx * S;
    var gw = Math.max(1, wPx * S);
    var gh = Math.max(1, hPx * S);
    var common = { x: gx, y: gy, w: gw, h: gh, rot: o.angle || 0, flipH: !!o.flipX, flipV: !!o.flipY };
    /* ═══ ROUND-TRIP GEOMETRY GUARD (export side, paired with renderSlideIR's
       irC0 stamp) ═══
       Fabric bounding boxes LIE for SVG groups: the box is the artwork's
       CONTENT bounds, not the viewBox — a rotated gradient alone inflated a
       photo frame to a 13143929² square in the exported file (the "giant
       golden bar" bug), and once written, every honest renderer — PowerPoint
       AND our own engine on reimport — stretches the SVG to that box.
       Rule: untouched object → write the ORIGINAL file geometry verbatim;
       moved/scaled/rotated → apply only the user's delta to it. */
    if (orig && o.irC0 && orig.x != null && orig.w != null) {
      var _c0 = o.irC0, _EPX = 0.75;
      var _moved = Math.abs(lxPx - _c0.l) > _EPX || Math.abs(lyPx - _c0.t) > _EPX;
      var _sized = Math.abs(wPx - _c0.w) > _EPX || Math.abs(hPx - _c0.h) > _EPX;
      var _spun = Math.abs((o.angle || 0) - (_c0.a || 0)) > 0.05;
      if (!_moved && !_sized && !_spun) {
        common = { x: orig.x, y: orig.y, w: orig.w, h: orig.h, rot: orig.rot || 0, flipH: !!o.flipX, flipV: !!o.flipY };
      } else {
        var _kx = _c0.w > 0.01 ? wPx / _c0.w : 1, _ky = _c0.h > 0.01 ? hPx / _c0.h : 1;
        common = { x: orig.x + (lxPx - _c0.l) * S, y: orig.y + (lyPx - _c0.t) * S,
                   w: orig.w * _kx, h: orig.h * _ky,
                   rot: (orig.rot || 0) + ((o.angle || 0) - (_c0.a || 0)),
                   flipH: !!o.flipX, flipV: !!o.flipY };
      }
    }
    /* LIVE FRAME (Element 106) → picture-filled custGeom shape, the dialect
       PowerPoint, Canva and Slides all reopen cleanly. An EMPTY frame has no
       photo, so it exports as a plain grey shape rather than vanishing. */
    if (o.isFrame && o.framePath) {
      var fCmds = framePathToCmds(o.framePath);
      var fEl = Object.assign({
        id: o.irId || ('frame-' + Math.random().toString(36).slice(2, 8)),
        origin: 'slide',
        type: o.frameSrc ? 'image' : 'shape',
        geom: { custom: { pathCmds: fCmds, pathW: o.framePathW, pathH: o.framePathH } },
        opacity: o.opacity != null ? o.opacity : 1
      }, common);
      if (o.frameSrc) {
        fEl.src = o.frameSrc;
        fEl.format = /^data:image\/jpeg/.test(o.frameSrc) ? 'jpeg' : 'png';
        fEl.frect = o.frameRect || null;
        fEl.crop = null; fEl.tile = null;
      } else {
        /* no photo yet → a normal filled shape (its own colour, or the
           grey drop-target if it's an unused Frames-group frame) */
        fEl.fill = { type: 'solid',
          color: o.frameLook === 'placeholder' ? '#E9EAEE' : (o.frameFill || '#7C3AED') };
      }
      elements.push(fEl);
      return;
    }
    if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
      var tEl = textIRFromFabric(o, S, orig);
      if (orig) { if (!tEl.fill) tEl.fill = orig.fill; tEl.stroke = orig.stroke; tEl.shadow = orig.shadow; tEl.geom = tEl.geom || orig.geom; }
      elements.push(tEl);
    } else if (o.type === 'image' || o.type === 'group') {
      if (orig && orig.type === 'image') {
        /* 6 Aug 2026 — the renderer parks a translucent image's opacity on the
           object INSIDE its wrapper group; the group itself reports opacity 1.
           Reading o.opacity here overwrote the IR's true value (e.g. a 24%
           sheen texture exported fully OPAQUE and blanked the whole slide —
           the "background became light / bottles gone" bug). Multiply in the
           inner object's opacity so the export matches what the canvas shows. */
        var _grpKids = (o.type === 'group') ? (o.objects || o._objects || []) : null;
        var _innerOp = (_grpKids && _grpKids.length === 1 && _grpKids[0].opacity != null) ? _grpKids[0].opacity : 1;
        var _effOp = (o.opacity != null ? o.opacity : 1) * _innerOp;
        elements.push(Object.assign({}, orig, common, { opacity: (o.opacity != null || _innerOp !== 1) ? _effOp : orig.opacity }));
      } else if (o.type === 'image' && o.src) {
        var fmt = /^data:image\/svg/.test(o.src) ? 'svg' : /jpeg|jpg/.test(o.src.slice(0, 24)) ? 'jpeg' : 'png';
        elements.push(Object.assign({ id: 'edit-' + Math.random().toString(36).slice(2, 8), origin: 'slide', type: 'image', src: o.src, format: fmt, svgText: o.svgText || null, opacity: o.opacity != null ? o.opacity : 1 }, common));
      } else if (orig) { /* svg group matched */
        elements.push(Object.assign({}, orig, common));
      }
    } else if (o.type === 'path' && orig) {
      elements.push(Object.assign({}, orig, common));
    } else if (o.type === 'path' && o.path && o.path.length) {
      /* PATH WITH NO MATCHED ORIGINAL (after re-render / master-stamp): rebuild
         the curve from the fabric path. Without this it fell through to the
         generic branch and exported as a plain RECTANGLE — circles turned into
         straight lines on download on some slides. Mirrors the Brain's version. */
      var _po = o.pathOffset || { x: (o.width || 0) / 2, y: (o.height || 0) / 2 };
      var _offX = _po.x - (o.width || 0) / 2, _offY = _po.y - (o.height || 0) / 2;
      var _pcmds = [];
      o.path.forEach(function (seg) {
        var op = seg[0];
        if (op === 'M' || op === 'L') _pcmds.push([op, seg[1] - _offX, seg[2] - _offY]);
        else if (op === 'C') _pcmds.push(['C', seg[1] - _offX, seg[2] - _offY, seg[3] - _offX, seg[4] - _offY, seg[5] - _offX, seg[6] - _offY]);
        else if (op === 'Q') _pcmds.push(['Q', seg[1] - _offX, seg[2] - _offY, seg[3] - _offX, seg[4] - _offY]);
        else if (op === 'z' || op === 'Z') _pcmds.push(['Z']);
      });
      var _pStroke = (typeof o.stroke === 'string' && o.stroke) ? { color: o.stroke, w: Math.max(6350, Math.round((o.strokeWidth || 1) * S)) } : null;
      elements.push(Object.assign({ id: 'edit-draw-' + Math.random().toString(36).slice(2, 8), origin: 'slide', type: 'shape',
        geom: { custom: { pathCmds: _pcmds, pathW: Math.max(1, o.width || 1), pathH: Math.max(1, o.height || 1) } },
        fill: (typeof o.fill === 'string' && o.fill) ? { type: 'solid', color: o.fill } : { type: 'none' },
        stroke: _pStroke }, common));
    } else if (o.type === 'line') {
      /* matched lines keep their FULL original IR (dash, arrowheads,
         connector type, sites) — rebuilding from fabric was flattening
         every line to a plain thin solid stroke */
      if (orig) { elements.push(Object.assign({}, orig, common)); return; }
      var st = { color: typeof o.stroke === 'string' ? o.stroke : '#555555', w: Math.max(6350, Math.round((o.strokeWidth || 2) * S)) };
      elements.push(Object.assign({ id: 'edit-ln', origin: 'slide', type: 'line', stroke: st }, common));
    } else if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'triangle' || o.type === 'circle' || o.type === 'polygon' || o.type === 'path') {
      /* matched shapes: reuse the original element (pattern/radial fills,
         shadows, adjusted geometry all survive); only geometry from canvas */
      if (orig) { elements.push(Object.assign({}, orig, common)); return; }
      var preset = o.type === 'ellipse' || o.type === 'circle' ? 'ellipse' : o.type === 'triangle' ? 'triangle' : (o.rx && o.type === 'rect') ? 'roundRect' : 'rect';
      var strokeIR = (typeof o.stroke === 'string' && o.stroke) ? { color: o.stroke, w: Math.max(6350, Math.round((o.strokeWidth || 1) * S)) } : null;
      elements.push(Object.assign({ id: 'edit-sh', origin: 'slide', type: 'shape', geom: { preset: preset }, fill: fillIRFromFabric(o.fill), stroke: strokeIR }, common));
    }
  });
  var bg = json.background ? fillIRFromFabric(json.background) : (origIR ? origIR.background : { type: 'solid', color: '#FFFFFF' });
  if (bg && bg.type === 'none') bg = { type: 'solid', color: '#FFFFFF' };
  return { id: (origIR && origIR.id) || 'edited', background: bg, elements: elements };
}

window.ldHeaders = function (ct) {
  var h = { 'Content-Type': ct };
  if (window.LD_AUTH_TOKEN) h['Authorization'] = 'Bearer ' + window.LD_AUTH_TOKEN;
  return h;
};

var PROJ_DB = 'lazydog_projects', PROJ_STORE = 'projects', PROJ_LS = 'ld_projects_fallback';
var ASSET_STORE = 'assets', SNAP_STORE = 'snapshots';
var _projDb = null, _projList = [], _projLoaded = false;

/* DB v2 adds the assets store. The upgrade creates whatever is missing,
   so a machine that already has v1 projects keeps them. */
function projOpenDb() {
  return new Promise(function (resolve) {
    if (_projDb) return resolve(_projDb);
    var idb = (typeof indexedDB !== 'undefined') ? indexedDB : null;
    if (!idb) return resolve(null);
    var req;
    try { req = idb.open(PROJ_DB, 5); } catch (e) { return resolve(null); }
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(PROJ_STORE)) db.createObjectStore(PROJ_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SNAP_STORE)) db.createObjectStore(SNAP_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
    };
    req.onsuccess = function (e) { _projDb = e.target.result; resolve(_projDb); };
    req.onerror = function () { resolve(null); };
  });
}

function projPut(rec) {
  return projOpenDb().then(function (db) {
    if (!db) {                                   /* localStorage fallback */
      var all = iconStore(PROJ_LS, []).filter(function (p) { return p.id !== rec.id; });
      all.unshift(rec);
      try { localStorage.setItem(PROJ_LS, JSON.stringify(all.slice(0, 4))); }
      catch (e) { showToast('Storage full — delete a project first'); return false; }
      return true;
    }
    return new Promise(function (res) {
      var tx = db.transaction(PROJ_STORE, 'readwrite');
      tx.objectStore(PROJ_STORE).put(rec);
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { showToast('Could not save the project'); res(false); };
    });
  });
}

function projAll() {
  return projOpenDb().then(function (db) {
    if (!db) return iconStore(PROJ_LS, []);
    return new Promise(function (res) {
      var out = [];
      var tx = db.transaction(PROJ_STORE, 'readonly');
      var cur = tx.objectStore(PROJ_STORE).openCursor();
      cur.onsuccess = function (e) {
        var c = e.target.result;
        if (c) { out.push(c.value); c.continue(); } else res(out);
      };
      cur.onerror = function () { res([]); };
    });
  });
}

function projDelete(id) {
  return projOpenDb().then(function (db) {
    if (!db) {
      var all = iconStore(PROJ_LS, []).filter(function (p) { return p.id !== id; });
      try { localStorage.setItem(PROJ_LS, JSON.stringify(all)); } catch (e) {}
      return true;
    }
    return new Promise(function (res) {
      var tx = db.transaction(PROJ_STORE, 'readwrite');
      tx.objectStore(PROJ_STORE).delete(id);
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { res(false); };
    });
  });
}

function projRefresh() {
  return projAll().then(function (list) {
    /* The crash-recovery slot lives in the same store but is not a project
       — keep it out of the list so it never looks like one. */
    list = (list || []).filter(function (p) { return p && !p.isAutosave && p.id !== '__autosave__'; });
    _projList = list.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    _projLoaded = true;
    if (state && state.activeTool === 'projects') renderPanelContent('projects');
    return _projList;
  });
}

var _currentProjectId = null;

/* Save (or update) the whole deck — every page, notes included. */
function projSaveCurrent(asNew) {
  if (!fc) return;
  captureCurrentPage();
  if (typeof stickerFreeze === 'function') stickerFreeze();

  var existing = _projList.filter(function (p) { return p.id === _currentProjectId; })[0];
  var name = existing && !asNew ? existing.name
    : prompt('Project name:', (existing && existing.name) || 'Untitled design');
  if (!name) return;

  var thumb = '';
  try { thumb = fc.toDataURL({ format: 'png', multiplier: 0.1 }); } catch (e) {}

  var rec = {
    id: (!asNew && _currentProjectId) || ('pr' + Date.now()),
    name: name,
    updated: Date.now(),
    starred: existing ? !!existing.starred : false,
    shared: existing ? !!existing.shared : false,
    folder: existing ? (existing.folder || '') : '',
    thumb: thumb,
    slideCount: state.pages.length,
    pages: JSON.parse(JSON.stringify(state.pages)),
    notes: JSON.parse(JSON.stringify(state.notes || [])),
    comments: JSON.parse(JSON.stringify(state.comments || []))
  };

  projPut(rec).then(function (ok) {
    if (!ok) return;
    _currentProjectId = rec.id;
    /* an explicit save means there is nothing unsaved to warn about on exit */
    if (typeof window.ldMarkSaved === 'function') window.ldMarkSaved();
    showToast('Saved “' + rec.name + '”');
    projRefresh();
  });
}

/* ── Save to / open from a real file (30 Jul 2026) ─────────────────────
   Everything the editor needs to rebuild a design goes into one .lazydog
   file — slides, notes, comments and any "show on all slides" items. The
   thumbnail is left out on purpose: it is a fat base64 image the editor
   regenerates anyway, and including it doubled the file size.          */
var LD_FILE_VERSION = 1;

function projFileName(name) {
  return String(name || 'Untitled design').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60).trim()
    || 'Untitled design';
}

function projSaveToFile() {
  if (!fc) { showToast('Editor still loading'); return; }
  captureCurrentPage();
  if (typeof stickerFreeze === 'function') stickerFreeze();

  var existing = _projList.filter(function (p) { return p.id === _currentProjectId; })[0];
  var name = prompt('Save a copy as:', (existing && existing.name) || 'Untitled design');
  if (!name) return;

  var doc = {
    format: 'lazydog-design',
    version: LD_FILE_VERSION,
    savedAt: new Date().toISOString(),
    name: name,
    slideCount: state.pages.length,
    pages: state.pages.map(function (p) {
      return { id: p.id, ir: p.ir || null, canvasJSON: p.canvasJSON || null };
    }),
    notes: (state.notes || []).slice(),
    comments: JSON.parse(JSON.stringify(state.comments || [])),
    masters: JSON.parse(JSON.stringify(window._ldMasters || []))
  };

  var json;
  try { json = JSON.stringify(doc); }
  catch (e) { showToast('Could not package this design'); return; }

  try {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = projFileName(name) + '.lazydog';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    showToast('Saved to your Downloads folder');
  } catch (e) {
    showToast('Could not save the file');
  }
}

/* ═════════ compose import (Hexa pipeline) ═════════ */
window.loadDeckIRIntoEditor = async function (deckIR) {
  if (!deckIR || !deckIR.slides || !deckIR.slides.length) { showToast('Empty design received'); return; }
  window._deckIR = deckIR;
  try {
    var n = deckIR._designNo != null ? deckIR._designNo
          : deckIR.designNo != null ? deckIR.designNo : null;
    if (n == null) {
      var m = String(deckIR.deck || deckIR.name || '').match(/design\s*#?\s*(\d{1,6})/i);
      if (m) n = +m[1];
    }
    window.LD_DESIGN_NO = n;
  } catch (e) {}
  state.pages = deckIR.slides.map(function (slideIR, i) {
    return Object.assign(makeBlankPage(Date.now() + i), { ir: slideIR });
  });
  state.notes = state.pages.map(function () { return ''; });
  state.currentPage = 0;
  if (deckIR.size) setSlideAspect(deckIR.size.w, deckIR.size.h);
  await loadPageIntoCanvas(0);
  try { state.pages[0].thumb = fc.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.08 }); } catch (e) {}
  renderPageThumbs();
  Editor._emit('slides', Editor.query('slides'));
  showToast('Design loaded ✓');
};

window.ldCompose = async function (sentence) {
  showToast('Designing in LazyDog cloud… this can take up to a minute', 8000);
  for (var w = 0; w < 10 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });
  var r = await fetch(window.LD_BACKEND + '/compose_ir', {
    method: 'POST', headers: window.ldHeaders('application/json'),
    body: JSON.stringify({ sentence: sentence })
  });
  if (r.status === 401 || r.status === 403) { showToast('Please sign in on the main site first, then reopen the editor 🔐', 6000); return; }
  if (!r.ok) { showToast('Compose failed: ' + r.status); return; }
  var d = await r.json();
  await window.loadDeckIRIntoEditor(d.deck);
};

/* ?compose= boot — same contract Hexa uses on the old editor */
(function () {
  var q = null;
  try { q = new URLSearchParams(location.search).get('compose'); } catch (e) {}
  if (!q) return;
  window.addEventListener('load', function () {
    setTimeout(function () {
      window.ldCompose(q).then(function () {
        /* drop the compose param — a reload must give a fresh editor, not
           re-import the previous design (user report, 11 Aug) */
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
      }).catch(function (e) { showToast('Compose error: ' + e.message); });
    }, 600);
  });
})();

/* ═════════ export to PPTX (cloud writer) ═════════ */
async function exportPptxFileV2() {
  /* re-entrancy guard (11 Aug): a slow cloud export invited second and third
     clicks on Download — each one ran a FULL export and dropped another copy
     of the same file in Downloads. One export at a time. */
  if (window._ldExporting) { showToast('Already exporting — the file will download when ready'); return; }
  window._ldExporting = true;
  showToast('Building PPTX in LazyDog cloud…', 6000);
  try {
    var deck = await buildEffectiveDeckIR();
    var r = await fetch((window.LD_BACKEND || 'http://localhost:8080') + '/export', {
      method: 'POST', headers: window.ldHeaders('application/json'),
      body: JSON.stringify({ deck: deck })
    });
    if (r.status === 401 || r.status === 403) { showToast('Please sign in on the main site first 🔐', 6000); return; }
    if (!r.ok) throw new Error('cloud export ' + r.status);
    var blob;
    var ct = (r.headers.get('content-type') || '');
    if (ct.indexOf('application/json') !== -1) {
      var ej = await r.json();
      if (!(ej && ej.big && ej.pptxUrl)) throw new Error('unexpected export response');
      showToast('Downloading file… (' + Math.round((ej.bytes || 0) / 1048576) + ' MB)');
      var r2 = await fetch(ej.pptxUrl);
      if (!r2.ok) throw new Error('storage download ' + r2.status);
      blob = await r2.blob();
    } else {
      blob = await r.blob();
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'presentation.pptx';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    showToast('PPTX downloaded ✓');
  } catch (e) {
    console.error('[v2] export', e);
    showToast('Export failed: ' + e.message, 5000);
  } finally {
    window._ldExporting = false;
  }
}

/* ═════════ photo drops into frames (audit-63-fixed) ═════════ */
(function () {
  var t = setInterval(function () {
    if (!window.fc || !fc.on) return;
    clearInterval(t);
    fc.on('object:modified', function (ev) {
      var o = ev.target;
      if (!o || o.isFrame || o.type !== 'image') return;
      var act = (ev.transform && ev.transform.action) || ev.action;
      if (act && act !== 'drag') return;
      var pt = null;
      try { if (ev.e) pt = fc.getPointer(ev.e); } catch (e) {}
      if (!pt) pt = o.getCenterPoint();
      var frames = fc.getObjects().filter(function (g) { return g.isFrame; });
      for (var i = frames.length - 1; i >= 0; i--) {
        var b = frames[i].getBoundingRect(true, true);
        if (pt.x >= b.left && pt.x <= b.left + b.width && pt.y >= b.top && pt.y <= b.top + b.height) {
          dropImageIntoFrame(o, frames[i]);
          return;
        }
      }
    });
  }, 300);
})();

/* ═════════ projects + autosave ═════════ */
(function () {
  function deckSnapshot() {
    captureCurrentPage();
    return {
      pages: state.pages.map(function (p) {
        return { id: p.id, canvasJSON: p.canvasJSON, ir: p.ir, thumb: p.thumb, title: p.title || null, transition: p.transition || null };
      }),
      notes: state.notes.slice(),
      deckIR: window._deckIR || null,
      designNo: window.LD_DESIGN_NO != null ? window.LD_DESIGN_NO : null
    };
  }
  function restoreSnapshot(d) {
    state.pages = (d.pages || []).map(function (p) {
      return Object.assign(makeBlankPage(p.id || Date.now()), p, { history: [], historyIndex: -1 });
    });
    if (!state.pages.length) state.pages = [makeBlankPage(Date.now())];
    state.notes = d.notes || [''];
    state.currentPage = 0;
    window._deckIR = d.deckIR || null;
    window.LD_DESIGN_NO = d.designNo != null ? d.designNo : null;
    loadPageIntoCanvas(0).then(function () { renderPageThumbs(); });
  }
  window.ldProjSaveV2 = function (name, id) {
    var rec = { id: id || ('p' + Date.now()), name: name, ts: Date.now(), deck: deckSnapshot() };
    projSave(rec).then(function () { showToast('Saved “' + name + '” ✓'); });
    return rec.id;
  };
  window.ldProjectsList = [];
  function refreshList() {
    projAll().then(function (list) {
      window.ldProjectsList = (list || []).filter(function (p) { return p && p.id !== '__autosave__'; })
        .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    }).catch(function () {});
  }
  refreshList();

  Editor._register({
    saveProject: function () {
      var name = prompt('Project name:', 'My design ' + new Date().toLocaleDateString());
      if (!name) return;
      window.ldProjSaveV2(name.trim());
      setTimeout(refreshList, 400);
    },
    projectOpen: function (id) {
      projAll().then(function (list) {
        var p = (list || []).filter(function (x) { return x.id === id; })[0];
        if (!p || !p.deck) { showToast('Could not open that project'); return; }
        restoreSnapshot(p.deck);
        showToast('Opened “' + p.name + '”');
      });
    },
    newDesign: function () {
      if (state.pages.length > 1 || (fc.getObjects() || []).length) {
        if (!confirm('Start a new design? Unsaved work on this one is kept in autosave.')) return;
      }
      window._deckIR = null; window.LD_DESIGN_NO = null;
      state.pages = [makeBlankPage(Date.now())];
      state.notes = [''];
      state.currentPage = 0;
      loadPageIntoCanvas(0).then(function () { renderPageThumbs(); showToast('New design'); });
    },
    __qProjects: function () {
      refreshList();
      return window.ldProjectsList.map(function (p) { return { id: p.id, name: p.name, ts: p.ts }; });
    }
  });

  /* autosave every 25s */
  setInterval(function () {
    try {
      if (!fc || !state.pages.length) return;
      projSave({ id: '__autosave__', name: 'Autosave', isAutosave: true, ts: Date.now(), deck: deckSnapshot() });
    } catch (e) {}
  }, 25000);
})();

/* ═════════ real frames (placeholder look + photo-ready) ═════════ */
Editor._register({
  insertFrame: function (kind) {
    var def = FRAME_DEFS[kind];
    if (!def) { showToast('Unknown frame: ' + kind); return; }
    var path = new fabric.Path(def.d, { fill: '#E9EAEE', isAperture: true });
    var parts = [path];
    (def.deco || []).forEach(function (d) { parts.push(new fabric.Path(d[0], { fill: d[1], evented: false })); });
    var g = new fabric.Group(parts, {
      left: 180, top: 120, isFrame: true, frameKind: kind,
      framePath: def.d, framePathW: def.w, framePathH: def.h,
      frameLook: 'placeholder', frameFill: '#7C3AED'
    });
    var sc = 320 / Math.max(def.w, def.h);
    g.set({ scaleX: sc, scaleY: sc });
    fc.add(g).setActiveObject(g);
    refreshFrame(g);
    fc.renderAll(); saveState();
    showToast(def.label + ' frame added — drag a photo onto it');
  }
});

/* ═════════ icons · table · wordart · charts ═════════ */
Editor._register({
  insertIcon: function (name) {
    var col = '#7C3AED';
    if (name && typeof name === 'object') { col = name.color || col; name = name.name; }
    var glyph = (typeof name === 'string' && name) ? name : 'star';
    /* wait for the icon font BEFORE measuring — otherwise fabric measures the
       ligature name ("rocket_launch") in a fallback font and the selection
       box becomes a long rectangle instead of the icon's real square */
    function make() {
      try { if (fabric.util && fabric.util.clearFabricFontCache) fabric.util.clearFabricFontCache('Material Symbols Outlined'); } catch (e) {}
      var t = new fabric.Text(glyph, {
        left: 200, top: 160,
        fontFamily: 'Material Symbols Outlined',
        fontSize: 120, fill: col,
        isIcon: true, iconName: glyph
      });
      if (typeof t.initDimensions === 'function') t.initDimensions();
      t.setCoords();
      fc.add(t).setActiveObject(t);
      fc.renderAll(); saveState();
      showToast('Icon added');
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('120px "Material Symbols Outlined"', glyph).then(make, make);
    } else make();
  },
  insertTable: function () {
    var rows = 3, cols = 3, cw = 150, rh = 46;
    var parts = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        parts.push(new fabric.Rect({
          left: c * cw, top: r * rh, width: cw, height: rh,
          fill: r === 0 ? '#7C3AED' : (r % 2 ? '#F4F1FB' : '#FFFFFF'),
          stroke: '#D9C9F9', strokeWidth: 1
        }));
        parts.push(new fabric.IText(r === 0 ? 'Header' : 'Cell', {
          left: c * cw + 12, top: r * rh + 12, fontSize: 18,
          fontFamily: 'DM Sans', fill: r === 0 ? '#FFFFFF' : '#1F2430'
        }));
      }
    }
    var g = new fabric.Group(parts, { left: 160, top: 140, irTable: true });
    fc.add(g).setActiveObject(g);
    fc.renderAll(); saveState();
    showToast('Table added — ungroup to edit cells');
  },
  insertWordArt: function () {
    var t = new fabric.IText('WordArt', {
      left: 180, top: 160, fontFamily: 'DM Sans', fontWeight: '800', fontSize: 96,
      stroke: '#5F27BE', strokeWidth: 2, paintFirst: 'stroke'
    });
    t.set('fill', new fabric.Gradient({
      type: 'linear', coords: { x1: 0, y1: 0, x2: 0, y2: 96 },
      gradientUnits: 'pixels',
      colorStops: [{ offset: 0, color: '#B47EDE' }, { offset: 1, color: '#7C3AED' }]
    }));
    fc.add(t).setActiveObject(t);
    fc.renderAll(); saveState();
    showToast('WordArt added — double-click to edit');
  },
  insertChart: function (type) {
    var vals = [64, 38, 82, 51], cols = ['#7C3AED', '#2563EB', '#16A34A', '#F59E0B'];
    var parts = [], W = 340, H = 220;
    parts.push(new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: '#FFFFFF', stroke: '#E4E7EE', strokeWidth: 1, rx: 8, ry: 8 }));
    if (type === 'bar') {
      vals.forEach(function (v, i) {
        var h = v / 100 * (H - 50);
        parts.push(new fabric.Rect({ left: 34 + i * 76, top: H - 24 - h, width: 46, height: h, fill: cols[i], rx: 4, ry: 4 }));
      });
    } else if (type === 'line') {
      var pts = vals.map(function (v, i) { return { x: 40 + i * 88, y: H - 30 - v / 100 * (H - 60) }; });
      parts.push(new fabric.Polyline(pts, { stroke: '#7C3AED', strokeWidth: 4, fill: '', strokeLineJoin: 'round' }));
      pts.forEach(function (p, i) { parts.push(new fabric.Circle({ left: p.x - 6, top: p.y - 6, radius: 6, fill: cols[i] })); });
    } else { /* pie / donut */
      var total = vals.reduce(function (a, b) { return a + b; }, 0);
      var start = -90;
      vals.forEach(function (v, i) {
        var ang = v / total * 360;
        parts.push(new fabric.Path(describeArc(W / 2, H / 2, 78, start, start + ang), { fill: cols[i] }));
        start += ang;
      });
      if (type === 'donut') parts.push(new fabric.Circle({ left: W / 2 - 40, top: H / 2 - 40, radius: 40, fill: '#FFFFFF' }));
    }
    var g = new fabric.Group(parts, { left: 170, top: 130, chartType: type });
    fc.add(g).setActiveObject(g);
    fc.renderAll(); saveState();
    showToast(type + ' chart added (sample data — Data panel wiring comes next)');
  }
});
function describeArc(cx, cy, r, a0, a1) {
  var rad = function (a) { return (a) * Math.PI / 180; };
  var x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0));
  var x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
  var large = (a1 - a0) > 180 ? 1 : 0;
  return 'M ' + cx + ' ' + cy + ' L ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + ' Z';
}

/* ═════════ themes ═════════ */
Editor._register({
  themeApply: function (id) {
    var T = ((window.RBAssets || {}).THEME_PRESETS || []).filter(function (t) { return t.id === id; })[0];
    if (!T) { showToast('Theme not found'); return; }
    captureCurrentPage();
    var headingPt = 20;
    function restyle(objs) {
      (objs || []).forEach(function (o) {
        if (/text/.test(o.type || '')) {
          var pt = (o.fontSize || 32) / ((fc && fc._pxPerPt) || 2);
          var colour = pt >= headingPt ? T.heading : T.body;
          if (colour) { o.fill = colour; if (o.styles) Object.keys(o.styles).forEach(function (li) { Object.keys(o.styles[li]).forEach(function (ci) { o.styles[li][ci].fill = colour; }); }); }
          var fam = pt >= headingPt ? T.hFont : T.bFont;
          if (fam) { o.fontFamily = fam; if (o.styles) Object.keys(o.styles).forEach(function (li) { Object.keys(o.styles[li]).forEach(function (ci) { o.styles[li][ci].fontFamily = fam; }); }); }
        } else if (o.fill && typeof o.fill === 'string' && !o.isBg && T.accent) {
          o.fill = T.accent;
        }
        if (o.objects) restyle(o.objects);
      });
    }
    /* live slide */
    (fc.getObjects() || []).forEach(function (o) {
      if (/text/.test(o.type || '')) {
        var pt = (o.fontSize || 32) / ((fc && fc._pxPerPt) || 2);
        var colour = pt >= headingPt ? T.heading : T.body;
        var fam = pt >= headingPt ? T.hFont : T.bFont;
        var props = {};
        if (colour) props.fill = colour;
        if (fam) props.fontFamily = fam;
        o.set(props);
        if (o.styles) Object.keys(o.styles).forEach(function (li) { Object.keys(o.styles[li]).forEach(function (ci) { Object.assign(o.styles[li][ci], props); }); });
        if (o.initDimensions) o.initDimensions();
        o.dirty = true;
      } else if (typeof o.fill === 'string' && !o.isBg && T.accent && !o.isFrame) {
        o.set('fill', T.accent);
      }
    });
    if (T.bg) fc.setBackgroundColor(T.bg, function () {});
    /* other slides via their JSON */
    state.pages.forEach(function (p, i) {
      if (i === state.currentPage || !p.canvasJSON) return;
      var json = typeof p.canvasJSON === 'string' ? JSON.parse(p.canvasJSON) : p.canvasJSON;
      if (T.bg) json.background = T.bg;
      restyle(json.objects);
      p.canvasJSON = json;
      p.thumb = null;
    });
    fc.renderAll(); saveState(); renderPageThumbs();
    showToast('Theme “' + T.name + '” applied to every slide');
  },
  themeFonts: function () { showToast('Pick a theme — its fonts ride along'); }
});

/* ═════════ draw ═════════ */
(function () {
  var draw = { colour: '#1F2430', size: 4, mode: null };
  function hooks() {
    if (fc.__v2DrawHooked) return;
    fc.__v2DrawHooked = true;
    fc.on('path:created', function (e) { if (e.path && draw.mode) { e.path._isDrawn = true; } });
    fc.on('mouse:down', function (opt) {
      if (draw.mode !== 'erase' || !opt.target) return;
      if (opt.target._isDrawn) { fc.remove(opt.target); fc.renderAll(); saveState(); }
    });
  }
  function pen(highlight) {
    hooks();
    draw.mode = highlight ? 'high' : 'pen';
    fc.isDrawingMode = true;
    fc.freeDrawingBrush = new fabric.PencilBrush(fc);
    fc.freeDrawingBrush.width = highlight ? draw.size * 4 : draw.size;
    fc.freeDrawingBrush.color = highlight
      ? draw.colour + '55'
      : draw.colour;
    showToast((highlight ? 'Highlighter' : 'Pen') + ' — press Esc to stop drawing');
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && draw.mode) { draw.mode = null; fc.isDrawingMode = false; }
  });
  Editor._register({
    drawPen: function () { pen(false); },
    drawHighlighter: function () { pen(true); },
    drawEraser: function () {
      hooks(); draw.mode = 'erase'; fc.isDrawingMode = false;
      showToast('Eraser — click a stroke to remove it, Esc to stop');
    },
    drawClear: function () {
      var n = 0;
      fc.getObjects().slice().forEach(function (o) { if (o._isDrawn) { fc.remove(o); n++; } });
      fc.renderAll(); saveState();
      showToast(n ? n + ' drawing(s) cleared' : 'No drawings on this slide');
    },
    drawColour: function (c) { draw.colour = c; if (fc.isDrawingMode && fc.freeDrawingBrush) fc.freeDrawingBrush.color = draw.mode === 'high' ? c + '55' : c; showToast('Pen colour set'); },
    drawSize: function (s) { draw.size = +s || 4; if (fc.isDrawingMode && fc.freeDrawingBrush) fc.freeDrawingBrush.width = draw.mode === 'high' ? draw.size * 4 : draw.size; showToast('Thickness ' + s + 'px'); }
  });
})();

/* ═════════ effects (sidebar sliders) ═════════ */
Editor._register({
  effect: function (a) {
    var o = fc.getActiveObject();
    if (!o) { showToast('Select an object first'); return; }
    if (!a) return;
    o.fx = o.fx || {};
    if (a.group === 'clear') {
      o.fx = {};
      o.set('shadow', null);
      if (o.type === 'image') { o.filters = []; try { o.applyFilters(); } catch (e) {} }
      fc.renderAll(); saveState(); showToast('Effects cleared');
      return;
    }
    o.fx[a.group] = o.fx[a.group] || {};
    o.fx[a.group][a.key] = a.value;
    var f = o.fx;
    if (a.group === 'shadow' || a.group === 'glow') {
      var isGlow = a.group === 'glow' && (f.glow.blur || 0) > 0;
      o.set('shadow', new fabric.Shadow({
        color: isGlow ? '#7C3AED' : 'rgba(0,0,0,0.35)',
        blur: isGlow ? f.glow.blur : (f.shadow && f.shadow.blur) || 0,
        offsetX: 0,
        offsetY: isGlow ? 0 : ((f.shadow && f.shadow.offset) || 0)
      }));
    }
    if (a.group === 'outline') {
      o.set({ stroke: '#1B1B1B', strokeWidth: +a.value || 0, strokeUniform: true });
    }
    if (a.group === 'image' && o.type === 'image' && fabric.Image.filters) {
      var F = fabric.Image.filters, out = [];
      if (f.image && f.image.blur > 0 && F.Blur) out.push(new F.Blur({ blur: f.image.blur / 100 }));
      if (f.image && f.image.brightness && F.Brightness) out.push(new F.Brightness({ brightness: f.image.brightness / 100 }));
      o.filters = out;
      try { o.applyFilters(); } catch (e) {}
    }
    o.dirty = true;
    fc.renderAll();
  }
});

/* ═════════ transitions + animations (stored, played in present) ═════════ */
Editor._register({
  setTransition: function (kind) {
    var p = state.pages[state.currentPage];
    p.transition = p.transition || { type: 'fade', ms: 500 };
    p.transition.type = kind;
    showToast(kind === 'none' ? 'Transition removed' : 'Transition: ' + kind);
    saveState();
  },
  transitionDuration: function (ms) {
    var p = state.pages[state.currentPage];
    p.transition = p.transition || { type: 'fade', ms: 500 };
    p.transition.ms = +ms || 500;
    showToast('Duration ' + (ms / 1000).toFixed(1) + 's');
  },
  transitionApplyAll: function () {
    var t = (state.pages[state.currentPage] || {}).transition;
    if (!t) { showToast('Set a transition on this slide first'); return; }
    state.pages.forEach(function (p) { p.transition = JSON.parse(JSON.stringify(t)); });
    showToast('Transition applied to all ' + state.pages.length + ' slides');
  },
  setAnimation: function (kind) {
    var o = fc.getActiveObject();
    if (!o) { showToast('Select an object to animate'); return; }
    o.animType = kind === 'none' ? null : kind;
    saveState();
    showToast(kind === 'none' ? 'Animation removed' : 'Animation: ' + kind);
  }
});

/* ═════════ present mode ═════════ */
(function () {
  async function slideImage(i) {
    var page = state.pages[i];
    var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
    var sc = new fabric.StaticCanvas(null, { width: W, height: H });
    sc._baseWidth = W; sc._baseHeight = H;
    if (i === state.currentPage) { captureCurrentPage(); }
    if (page.canvasJSON) {
      await new Promise(function (res) { sc.loadFromJSON(page.canvasJSON, function () { sc.renderAll(); res(); }); });
    } else if (page.ir && typeof renderSlideIR === 'function') {
      await renderSlideIR(page.ir, window._deckIR, sc);
      sc.renderAll();
    }
    var url = sc.toDataURL({ format: 'jpeg', quality: 0.92 });
    try { sc.dispose(); } catch (e) {}
    return url;
  }
  async function present(fromCurrent) {
    showToast('Preparing slide show…');
    var imgs = [];
    for (var i = 0; i < state.pages.length; i++) imgs.push(await slideImage(i));
    var idx = fromCurrent ? state.currentPage : 0;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:grid;place-items:center;cursor:none;';
    var img = document.createElement('img');
    img.style.cssText = 'max-width:100vw;max-height:100vh;transition:opacity 0.4s ease;';
    ov.appendChild(img);
    var counter = document.createElement('div');
    counter.style.cssText = 'position:fixed;bottom:16px;right:22px;color:#888;font:600 13px "DM Sans",sans-serif;';
    ov.appendChild(counter);
    document.body.appendChild(ov);
    function show(i) {
      idx = Math.max(0, Math.min(imgs.length - 1, i));
      var t = (state.pages[idx] || {}).transition;
      if (t && t.type && t.type !== 'none') {
        img.style.opacity = 0;
        setTimeout(function () { img.src = imgs[idx]; img.style.opacity = 1; }, Math.min(300, (t.ms || 400) / 2));
      } else img.src = imgs[idx];
      counter.textContent = (idx + 1) + ' / ' + imgs.length;
    }
    function key(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') show(idx + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(idx - 1);
    }
    function click() { show(idx + 1); }
    function close() {
      document.removeEventListener('keydown', key);
      ov.remove();
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    }
    document.addEventListener('keydown', key);
    ov.addEventListener('click', click);
    try { await ov.requestFullscreen(); } catch (e) {}
    show(idx);
  }
  function ldLoadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[data-ld-src="' + src + '"]')) return res();
      var el = document.createElement('script'); el.src = src; el.setAttribute('data-ld-src', src);
      el.onload = function () { res(); }; el.onerror = function () { rej(new Error('load failed: ' + src)); };
      document.head.appendChild(el);
    });
  }
  async function slidePng(i) {
    var page = state.pages[i];
    var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
    if (i === state.currentPage) { captureCurrentPage(); }
    var sc = new fabric.StaticCanvas(null, { width: W, height: H });
    sc._baseWidth = W; sc._baseHeight = H;
    if (page.canvasJSON) {
      await new Promise(function (res) { sc.loadFromJSON(page.canvasJSON, function () { sc.renderAll(); res(); }); });
    } else if (page.ir && typeof renderSlideIR === 'function') {
      await renderSlideIR(page.ir, window._deckIR, sc); sc.renderAll();
    }
    var url = sc.toDataURL({ format: 'png' });
    try { sc.dispose(); } catch (e) {}
    return url;
  }
  function ldSaveDataUrl(url, name) {
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function exportPngFile() {
    var i = state.currentPage || 0;
    showToast('Rendering PNG…');
    var url = await slidePng(i);
    ldSaveDataUrl(url, 'slide-' + (i + 1) + '.png');
    showToast('Saved slide ' + (i + 1) + ' as PNG');
  }
  async function exportPdfFile() {
    showToast('Building PDF…');
    await ldLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDF) { showToast('PDF engine did not load — check your connection'); return; }
    var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
    var orient = W >= H ? 'l' : 'p';
    var pdf = new JsPDF({ orientation: orient, unit: 'px', format: [W, H] });
    for (var i = 0; i < state.pages.length; i++) {
      var url = await slideImage(i);
      if (i > 0) pdf.addPage([W, H], orient);
      pdf.addImage(url, 'JPEG', 0, 0, W, H);
    }
    pdf.save('presentation.pdf');
    showToast('Saved ' + state.pages.length + ' slide(s) as PDF');
  }
  function ldBusyWrap(kind, fn) {
    if (window.ldBusy) window.ldBusy('download', true);
    return Promise.resolve().then(fn).catch(function (e) { console.error('[export]', kind, e); showToast(kind + ' export failed'); })
      .finally(function () { if (window.ldBusy) window.ldBusy('download', false); });
  }
  Editor._register({
    presentFromStart: function () { present(false); },
    presentFromCurrent: function () { present(true); },
    exportPptx: function () { ldBusyWrap('PPTX', exportPptxFileV2); },
    exportPdf: function () { ldBusyWrap('PDF', exportPdfFile); },
    exportPng: function () { ldBusyWrap('PNG', exportPngFile); }
  });
})();

/* ═════════ small utilities ═════════ */
Editor._register({
  find: function () {
    var q = prompt('Find text:');
    if (!q) return;
    q = q.toLowerCase();
    for (var i = 0; i < state.pages.length; i++) {
      var p = state.pages[i];
      var json = i === state.currentPage ? fc.toJSON(FABRIC_JSON_PROPS) : (typeof p.canvasJSON === 'string' ? JSON.parse(p.canvasJSON) : p.canvasJSON);
      var hit = (json && json.objects || []).some(function (o) { return o.text && String(o.text).toLowerCase().indexOf(q) > -1; });
      if (hit) {
        (function (slideIdx) {
          Promise.resolve(slideIdx === state.currentPage ? null : switchPage(slideIdx)).then(function () {
            var obj = (fc.getObjects() || []).filter(function (o) { return o.text && String(o.text).toLowerCase().indexOf(q) > -1; })[0];
            if (obj) { fc.setActiveObject(obj); fc.renderAll(); }
            showToast('Found on slide ' + (slideIdx + 1));
          });
        })(i);
        return;
      }
    }
    showToast('“' + q + '” not found');
  },
  viewSorter: function () {
    captureCurrentPage();
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9998;display:grid;place-items:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;padding:22px;max-width:80vw;max-height:80vh;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,180px);gap:12px;';
    state.pages.forEach(function (p, i) {
      var c = document.createElement('button');
      c.style.cssText = 'border:2px solid ' + (i === state.currentPage ? '#7C3AED' : '#E4E7EE') + ';border-radius:8px;height:110px;background:#fff center/cover no-repeat;position:relative;cursor:pointer;';
      if (p.thumb) c.style.backgroundImage = 'url(' + p.thumb + ')';
      var n = document.createElement('span');
      n.textContent = i + 1;
      n.style.cssText = 'position:absolute;left:6px;bottom:4px;font:700 11px "DM Sans";color:#5B6472;background:rgba(255,255,255,0.9);border-radius:4px;padding:1px 5px;';
      c.appendChild(n);
      c.addEventListener('click', function () { ov.remove(); if (i !== state.currentPage) switchPage(i); });
      box.appendChild(c);
    });
    ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  },
  openHelp: function () { showToast('Help articles arrive with the final polish stage'); },
  showShortcuts: function () {
    alert('Keyboard shortcuts\n\nCtrl+Z / Ctrl+Y — undo / redo\nCtrl+C / Ctrl+V — copy / paste\nCtrl+D — duplicate\nCtrl+A — select all\nDelete — remove selection\nEsc — deselect / stop drawing\nArrows in slide show — navigate');
  },
  sendFeedback: function () { window.open('https://www.lazydogtemplates.com/#contact', '_blank'); },
  addComment: function () {
    var o = fc.getActiveObject();
    var text = prompt('Comment' + (o ? ' on the selected object' : ' on this slide') + ':');
    if (!text || !text.trim()) return;
    state.comments.push({ id: 'cm' + Date.now(), page: state.currentPage, text: text.trim(), ts: Date.now() });
    showToast('Comment added (' + state.comments.length + ' total)');
  },
  showComments: function () {
    var list = state.comments.filter(function (c) { return c.page === state.currentPage; });
    if (!list.length) { showToast('No comments on this slide'); return; }
    alert('Comments on slide ' + (state.currentPage + 1) + ':\n\n' + list.map(function (c) { return '• ' + c.text; }).join('\n'));
  }
});
