/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE (combined)                       owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   Merged from engine2…engine12 + engine3d in original load order:
   engine2 → engine3 → engine4 → engine5 → engine6 → engine7 → engine8 →
   engine9 → engine10 → engine11 → engine12 → engine3d.
   Load AFTER core.js / icons.js / assets.js, BEFORE ribbon.js / sidebar.js.
   ═══════════════════════════════════════════════════════════════════════ */

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
  /[?&]dev=1/.test(location.search)
    ? 'http://localhost:8080'   /* opt-in local dev backend via ?dev=1 — everything else uses the cloud proxy */
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

/* 21 Aug 2026 (Fable) — THE FRAMES BUG. dropImageIntoFrame called
   frameSrcToDataURL(), which did not exist anywhere — every drop threw a
   ReferenceError and no photo ever went into a frame. Defined here: draw the
   picture to a canvas and read it back; a cross-origin picture that taints
   the canvas returns null and the async path below fetches it instead. */
function frameSrcToDataURL(natural) {
  try {
    var c = document.createElement('canvas');
    c.width = natural.naturalWidth || natural.width; c.height = natural.naturalHeight || natural.height;
    c.getContext('2d').drawImage(natural, 0, 0);
    return c.toDataURL('image/png');
  } catch (e) { return null; }
}
async function frameSrcViaFetch(url) {
  try {
    var r = await fetch(url, { mode: 'cors' }); if (!r.ok) return null;
    var b = await r.blob();
    return await new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(b); });
  } catch (e) { return null; }
}
/* a renderer-painted photo is a GROUP (pattern-filled path) or a group with
   one image inside — unwrap to the real <img> wherever it hides */
function frameImageOf(o) {
  if (!o) return null;
  if (o.type === 'image') return o._originalElement || o._element || null;
  if (o._frameImg) return o._frameImg;
  var kids = o._objects || [];
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].type === 'image') return kids[i]._originalElement || kids[i]._element || null;
    var f = kids[i].fill;
    if (f && f.source && (f.source.naturalWidth || f.source.width)) return f.source;
  }
  return null;
}
async function dropImageIntoIRFrame(imgObj, frameGrp, el) {
  var natural = frameImageOf(imgObj);
  if (!natural) { showToast('Only photos can go into a frame'); return false; }
  var iw = natural.naturalWidth || natural.width, ih = natural.naturalHeight || natural.height;
  if (!iw || !ih) return false;
  var src = frameSrcToDataURL(natural);
  if (!src) { var u = natural.src || natural.currentSrc; src = u && !/^data:/.test(u) ? await frameSrcViaFetch(u) : null; }
  if (!src) { showToast('That photo is on a server that refuses sharing — save it and upload it instead'); return false; }
  histLabel('Photo into frame');
  var frameAR = Math.abs(el.w) / Math.max(1, Math.abs(el.h)), imgAR = iw / ih;
  var fr = { l: 0, t: 0, r: 0, b: 0 };
  if (imgAR > frameAR) { var ov = (1 - imgAR / frameAR) / 2; fr.l = ov; fr.r = ov; }
  else if (imgAR < frameAR) { var ov2 = (1 - frameAR / imgAR) / 2; fr.t = ov2; fr.b = ov2; }
  var prev = { src: el.src, frect: el.frect, format: el.format, crop: el.crop, tile: el.tile };
  el.src = src; el.frect = fr; el.format = /^data:image\/jpeg/.test(src) ? 'jpeg' : 'png'; el.crop = null; el.tile = null;
  var idx = fc.getObjects().indexOf(frameGrp);
  var sx = (fc._baseWidth || fc.getWidth()) / (window._deckIR && window._deckIR.size ? window._deckIR.size.w : 12192000);
  var sy = (fc._baseHeight || fc.getHeight()) / (window._deckIR && window._deckIR.size ? window._deckIR.size.h : 6858000);
  try {
    fc.remove(imgObj); fc.remove(frameGrp);
    await renderImageElementIR(el, sx, sy, fc);
  } catch (err) {
    el.src = prev.src; el.frect = prev.frect; el.format = prev.format; el.crop = prev.crop; el.tile = prev.tile;
    fc.add(frameGrp); fc.add(imgObj); fc.requestRenderAll();
    showToast('Could not fit the photo — restored'); return false;
  }
  var objs = fc.getObjects(), added = objs[objs.length - 1];
  if (added && idx >= 0) added.moveTo(idx);
  fc.requestRenderAll(); saveState(); showToast('Photo fitted into frame ✓');
  return true;
}
function dropImageIntoFrame(imgObj, grp, _srcOverride) {
  histLabel('Photo into frame');
  var natural = frameImageOf(imgObj);
  if (!natural) { showToast('Only photos can go into a frame'); return false; }
  var iw = natural.naturalWidth || natural.width;
  var ih = natural.naturalHeight || natural.height;
  if (!iw || !ih) return false;
  var src = _srcOverride || frameSrcToDataURL(natural);
  if (!src) {
    var url = natural.src || natural.currentSrc || (imgObj.getSrc && imgObj.getSrc()) || imgObj.src;
    if (!url || /^data:/.test(url)) { showToast('That image could not be read'); return false; }
    showToast('Fitting photo…');
    frameSrcViaFetch(url).then(function (d) {
      if (!d) { showToast('That photo is on a server that refuses sharing — save it and upload it instead'); return; }
      var im = new Image(); im.onload = function () { imgObj._originalElement = im; dropImageIntoFrame(imgObj, grp, d); }; im.src = d;
    });
    return true;
  }

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
async function projSaveCurrent(asNew) {
  if (!fc) return;
  captureCurrentPage();
  if (typeof stickerFreeze === 'function') stickerFreeze();

  var existing = _projList.filter(function (p) { return p.id === _currentProjectId; })[0];
  var name = existing && !asNew ? existing.name
    : await window.ldPrompt('Project name:', '', (existing && existing.name) || 'Untitled design');
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

async function projSaveToFile() {
  if (!fc) { showToast('Editor still loading'); return; }
  captureCurrentPage();
  if (typeof stickerFreeze === 'function') stickerFreeze();

  var existing = _projList.filter(function (p) { return p.id === _currentProjectId; })[0];
  var name = await window.ldPrompt('Save a copy as:', '', (existing && existing.name) || 'Untitled design');
  if (!name) return;

  var doc = {
    format: 'lazydog-design',
    version: LD_FILE_VERSION,
    savedAt: new Date().toISOString(),
    name: name,
    slideCount: state.pages.length,
    pages: state.pages.map(function (p) {
      return { id: p.id, ir: p.ir || null, irOrig: p.irOrig || null, canvasJSON: p.canvasJSON || null };
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
  /* 22 Aug 2026 — a fresh AI-composed deck must start clean. window._ldMasters
     ("stamp on all slides" elements) survived from the PREVIOUS design and was
     being silently re-stamped onto every slide of the new one by
     ldStampMasters() on first page-visit — this was the "keeps previous
     design in back" bug. */
  window._ldMasters = [];
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
  /* self-heal: a deck has landed, so clear any leftover "Building slides…"
     heartbeat pill (e.g. one orphaned by an earlier import that hung) */
  if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
  /* fill in thumbnails for every other slide so the filmstrip shows all
     slides immediately, like Canva, instead of staying blank until clicked */
  (async function fillAllThumbs() {
    var startPage = state.currentPage;
    for (var i = 1; i < state.pages.length; i++) {
      try {
        await loadPageIntoCanvas(i);
        state.pages[i].thumb = fc.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.08 });
        renderPageThumbs();
      } catch (e) { /* one bad slide must not stop the rest */ }
    }
    try { await loadPageIntoCanvas(startPage); } catch (e) {}
  })();
};

/* 20 Aug 2026 (Fable) — wait PROPERLY for the login token. The old loop gave
   up after a hard 5 seconds; on a fresh/slow open the request then left with
   no token, the server answered 401, and the editor sat on its last-opened
   deck looking like a failed generation. Wait up to 30s, and if the first
   attempt still lands a 401, wait for the late token and retry ONCE. */
window.ldWaitAuthToken = async function (ms) {
  var until = Date.now() + (ms || 30000);
  while (!window.LD_AUTH_TOKEN && Date.now() < until)
    await new Promise(function (r) { setTimeout(r, 250); });
  return !!window.LD_AUTH_TOKEN;
};

window.ldCompose = async function (sentence) {
  showToast('Designing in LazyDog cloud… a big deck can take a few minutes', 8000);
  await window.ldWaitAuthToken(30000);
  var attempt = async function () {
    return fetch(window.LD_BACKEND + '/compose_ir', {
      method: 'POST', headers: window.ldHeaders('application/json'),
      body: JSON.stringify({ sentence: sentence })
    });
  };
  var r = await attempt();
  if ((r.status === 401 || r.status === 403) && await window.ldWaitAuthToken(15000)) {
    r = await attempt();   // the token arrived late — one clean retry
  }
  if (r.status === 401 || r.status === 403) { showToast('Please sign in on the main site first, then reopen the editor 🔐', 6000); return; }
  if (!r.ok) {
    var msg = '';
    try { msg = ((await r.json()) || {}).message || ''; } catch (e) {}
    showToast(msg || ('Compose failed: ' + r.status), 8000);
    return;
  }
  var d = await r.json();
  /* 22 Aug 2026 — only skip the commercial-font gate when the "Make a
     design" card actually had a Fonts value filled in (heading and/or
     body) — the user already chose, so don't interrupt; adjust later by
     hand if needed. If Fonts was left on "Any", the donor kit's own fonts
     are unknown/unpicked, so the gate still asks as before. */
  var _fo = d.order && d.order.fonts;
  if (d.deck && _fo && (_fo.heading || _fo.body)) d.deck.__ldSkipFontGate = true;
  await window.loadDeckIRIntoEditor(d.deck);
  if (window.ldRefreshTokens) window.ldRefreshTokens();   /* 20 Aug 2026 — balance chip */
};

/* ═════════ token balance chip (20 Aug 2026, Fable — Javed's rules) ═════════
   Normal editing is FREE; generation and AI fill spend tokens. This chip
   shows the signed-in user their live balance (admin sees ∞). It refreshes
   on sign-in and after every paid operation. Prices come from the server's
   billing config — nothing is hard-coded here. */
window.LD_TOKENS_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/token_balance';
window.ldRefreshTokens = async function () {
  var chip = document.getElementById('ld-token-chip');
  if (!window.LD_AUTH_TOKEN) { if (chip) chip.style.display = 'none'; return; }
  try {
    var r = await fetch(window.LD_TOKENS_URL, { method: 'POST', headers: window.ldHeaders('application/json') });
    if (!r.ok) return;
    var d = await r.json();
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'ld-token-chip';
      chip.style.cssText = 'position:fixed;right:14px;bottom:64px;z-index:9000;display:flex;align-items:center;gap:8px;' +
        'background:#151623;border:1px solid #2c2e45;border-radius:999px;' +
        'padding:5px 6px 5px 14px;font:600 12px "DM Sans",system-ui,sans-serif;color:#e8e9f2;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.4);';
      document.body.appendChild(chip);
    }
    chip.style.display = '';
    /* 21 Aug 2026 (Javed) — SUBSCRIPTION IS ONE CLICK AWAY. The balance chip
       carries a "Plans" button; plans are bought on the website (never inside
       the app — Store rule), so it opens lazydogtemplates.com/pricing.html. */
    chip.innerHTML = '';
    var lab = document.createElement('span');
    lab.textContent = d.admin ? '⚡ Unlimited (admin)' : '⚡ ' + Number(d.balance || 0).toLocaleString() + ' tokens';
    lab.title = 'Your token balance — editing is free, AI work spends tokens';
    /* 21 Aug 2026 (Javed) — the gradient "Plans / Upgrade" button that sat on
       this chip is REMOVED. Only the balance shows now.
       The plans modal itself is untouched and still reachable through
       Editor.run('showPlans') — see ldPlansModal below — so putting a button
       back later is one line, not a rebuild. */
    chip.appendChild(lab);
  } catch (e) { /* quietly — the chip is a convenience, never a blocker */ }
};
window.addEventListener('load', function () {
  setTimeout(function () {
    window.ldRefreshTokens();
    if (window.Editor && Editor.on) Editor.on('user', function () { window.ldRefreshTokens(); });
  }, 2500);
});

/* ═════════ PLANS MODAL (21 Aug 2026, Javed) — Canva-style, inside the editor ═════════
   Live prices from billing_config/main (the same doc pricing.html reads), the
   Subscribe buttons open Whop checkout in the browser (never in-app). */
window.ldPlansModal = async function () {
  var old = document.getElementById('ld-plans-overlay'); if (old) old.remove();
  var FALLBACK = { costs: { composePerSlide: 5, fillPerSlide: 12, pngDecompose: 25, pdfDecomposePerPage: 20 },
    plans: { pro: { priceUsd: 19, tokens: 1500 }, studio: { priceUsd: 39, tokens: 3750 },
             proAnnual: { priceUsd: 192, tokens: 1500, billedAnnually: true }, studioAnnual: { priceUsd: 408, tokens: 3750, billedAnnually: true },
             annualFlex: { priceUsd: 50, tokens: 6000, oneTime: true } }, carryForwardPct: 50, graceDays: 30, whopPlanMap: {} };
  var CFG = FALLBACK;
  try {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({ apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes', authDomain: 'templatehub-16cd7.firebaseapp.com', projectId: 'templatehub-16cd7', storageBucket: 'templatehub-16cd7.firebasestorage.app' });
    var snap = await fsMod.getDoc(fsMod.doc(fsMod.getFirestore(app), 'billing_config', 'main'));
    if (snap.exists()) { var d = snap.data() || {}; CFG = { costs: Object.assign({}, FALLBACK.costs, d.costs || {}), plans: Object.assign({}, FALLBACK.plans, d.plans || {}), carryForwardPct: d.carryForwardPct != null ? d.carryForwardPct : 50, graceDays: d.graceDays != null ? d.graceDays : 30, whopPlanMap: d.whopPlanMap || {} }; }
  } catch (e) { /* fallback prices */ }
  function checkoutFor(key) { var m = CFG.whopPlanMap || {}; for (var id in m) if (m[id] === key) return 'https://whop.com/checkout/' + id; return 'https://www.lazydogtemplates.com/pricing.html'; }
  var ov = document.createElement('div'); ov.id = 'ld-plans-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.66);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:"DM Sans",system-ui,sans-serif;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:18px;width:min(1120px,96vw);max-height:92vh;overflow:auto;padding:26px 28px;color:#e8e9f2;box-shadow:0 24px 70px rgba(0,0,0,.6);position:relative;';
  var n = function (v) { return Number(v || 0).toLocaleString(); };
  var c = CFG.costs, perDeck = (Number(c.composePerSlide || 0) + Number(c.fillPerSlide || 0)) * 10;
  var mode = 'monthly';
  function render() {
    var keys = mode === 'monthly' ? ['pro', 'studio', 'annualFlex'] : ['proAnnual', 'studioAnnual', 'annualFlex'];
    var LABEL = { pro: 'Pro', studio: 'Studio', proAnnual: 'Pro', studioAnnual: 'Studio', annualFlex: 'Flex' };
    var SUB = { pro: 'For steady, regular work', studio: 'For heavy use and teams', proAnnual: 'For steady, regular work', studioAnnual: 'For heavy use and teams', annualFlex: 'For work that comes in bursts' };
    box.innerHTML = '<button id="ld-plans-x" style="position:absolute;top:12px;right:14px;border:0;background:#23243a;color:#c9cbe0;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer;">×</button>' +
      '<div style="font-size:22px;font-weight:800;">Upgrade your plan</div>' +
      '<div style="font-size:13px;color:#a9abc4;margin:4px 0 14px;">Editing is always free. Tokens pay for AI work — designing, writing, dissolving files. ' + CFG.carryForwardPct + '% of unused tokens carry over when you renew or re-subscribe within ' + CFG.graceDays + ' days of a plan ending.</div>' +
      '<div style="display:inline-flex;background:#0e0f1a;border:1px solid #34365a;border-radius:999px;padding:3px;margin-bottom:16px;">' +
        '<button data-mode="monthly" style="border:0;border-radius:999px;padding:6px 14px;font-weight:700;font-size:12px;cursor:pointer;' + (mode === 'monthly' ? 'background:#7c5cff;color:#fff;' : 'background:transparent;color:#c9cbe0;') + '">Monthly</button>' +
        '<button data-mode="annual" style="border:0;border-radius:999px;padding:6px 14px;font-weight:700;font-size:12px;cursor:pointer;' + (mode === 'annual' ? 'background:#7c5cff;color:#fff;' : 'background:transparent;color:#c9cbe0;') + '">Annual · save ~16%</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">' +
      keys.map(function (k, i) {
        var p = CFG.plans[k] || {}; var tk = Number(p.tokens || 0); var decks = perDeck ? Math.floor(tk / perDeck) : 0;
        var price = p.oneTime ? '$' + p.priceUsd + ' <span style="font-size:13px;color:#a9abc4;">once</span>' : p.billedAnnually ? '$' + p.priceUsd + ' <span style="font-size:13px;color:#a9abc4;">/year</span>' : '$' + p.priceUsd + ' <span style="font-size:13px;color:#a9abc4;">/month</span>';
        var note = p.oneTime ? 'Valid one year. Never charged again.' : p.billedAnnually ? (n(tk) + ' tokens every month, billed yearly') : 'Cancel any time';
        return '<div style="background:#0e0f1a;border:1px solid ' + (i === 0 ? '#7c5cff' : '#2c2e45') + ';border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;">' +
          (i === 0 ? '<div style="font-size:10px;letter-spacing:.1em;color:#e05fa9;font-weight:800;">MOST POPULAR</div>' : '<div style="height:12px;"></div>') +
          '<div style="font-size:20px;font-weight:800;">' + LABEL[k] + '</div><div style="font-size:12px;color:#a9abc4;">' + SUB[k] + '</div>' +
          '<div style="font-size:30px;font-weight:800;margin-top:6px;">' + price + '</div><div style="font-size:11.5px;color:#a9abc4;">' + note + '</div>' +
          '<div style="font-size:16px;font-weight:700;margin-top:8px;">' + n(tk) + ' tokens</div><div style="font-size:11.5px;color:#a9abc4;">about ' + decks + ' full 10-slide decks</div>' +
          '<div style="font-size:11px;color:#8b8ea8;margin-top:8px;line-height:1.7;">Design one slide <b style="float:right;color:#e8e9f2;">' + c.composePerSlide + '</b><br>Write one slide from your content <b style="float:right;color:#e8e9f2;">' + c.fillPerSlide + '</b><br>PDF page → slides <b style="float:right;color:#e8e9f2;">' + c.pdfDecomposePerPage + '</b><br>PNG → editable slide <b style="float:right;color:#e8e9f2;">' + c.pngDecompose + '</b></div>' +
          '<a data-buy="' + k + '" href="' + checkoutFor(k) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:auto;border:0;border-radius:10px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;">' + (p.oneTime ? 'Buy once' : 'Subscribe') + '</a>' +
        '</div>';
      }).join('') +
      /* 4th card — Custom / done-for-you, quoted per job (same as pricing.html) */
      '<div style="background:#0e0f1a;border:1px solid #2c2e45;border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;">' +
        '<div style="font-size:10px;letter-spacing:.1em;color:#12A5A0;font-weight:800;">QUOTED PER JOB</div>' +
        '<div style="font-size:20px;font-weight:800;">Custom</div><div style="font-size:12px;color:#a9abc4;">We build it and put it live for you</div>' +
        '<div style="font-size:30px;font-weight:800;margin-top:6px;">Let\'s talk</div><div style="font-size:11.5px;color:#a9abc4;">No fixed price. Asking costs nothing.</div>' +
        '<div style="font-size:16px;font-weight:700;margin-top:8px;">Done for you</div><div style="font-size:11.5px;color:#a9abc4;">You supply the content, we deliver the finished site</div>' +
        '<div style="font-size:11px;color:#8b8ea8;margin-top:8px;line-height:1.7;">Your text and images placed <b style="float:right;color:#e8e9f2;">yes</b><br>Colours, fonts and logo applied <b style="float:right;color:#e8e9f2;">yes</b><br>Live on your own domain <b style="float:right;color:#e8e9f2;">yes</b><br>Contact form and basic SEO <b style="float:right;color:#e8e9f2;">yes</b></div>' +
        '<a href="https://www.lazydogtemplates.com/deployment/quote.html" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:auto;border:0;border-radius:10px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;background:#23243a;color:#fff;border:1px solid #34365a;">Request a quote</a>' +
      '</div></div>' +
      '<div style="font-size:11px;color:#8b8ea8;margin-top:14px;line-height:1.6;">Payments are processed by Whop in your browser — card details never reach LazyDog. A lapsed plan keeps its balance for ' + CFG.graceDays + ' days. Cancelling never takes back tokens you have paid for. Templates are sold separately.</div>';
    box.querySelector('#ld-plans-x').onclick = close;
    box.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { mode = b.getAttribute('data-mode'); render(); }; });
    box.querySelectorAll('a[target=_blank]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        /* belt and braces: the anchor opens it; if a popup blocker or the
           desktop shell swallows that, open it ourselves, and if THAT is
           blocked too, show the address so it can be copied. */
        var url = a.getAttribute('href');
        var w = null; try { w = window.open(url, '_blank', 'noopener'); } catch (err) {}
        e.preventDefault();
        if (w === null) {
          var note = box.querySelector('#ld-plans-note') || (function () { var d = document.createElement('div'); d.id = 'ld-plans-note'; d.style.cssText = 'margin-top:10px;font-size:12px;color:#e8e9f2;'; box.appendChild(d); return d; })();
          note.innerHTML = 'Your browser blocked the checkout window. Open this address: <input readonly value="' + url + '" style="width:100%;margin-top:4px;background:#0e0f1a;color:#fff;border:1px solid #34365a;border-radius:8px;padding:7px 9px;font-size:12px;">';
          note.querySelector('input').select();
        } else showToast('Opening checkout in your browser…');
      });
    });
  }
  function close() { ov.remove(); document.removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  document.addEventListener('keydown', onKey, true);
  ov.onmousedown = function (e) { if (e.target === ov) close(); };
  render(); ov.appendChild(box); document.body.appendChild(ov);
};
Editor._register({ showPlans: function () { window.ldPlansModal(); } });

/* ═════════ SHARE (21 Aug 2026, Javed) — real links, Canva-style ═════════
   The deck is published as JSON to Storage under shares/{uid}/{slug}.json
   (owner-only write, public read — see storage.rules) and the link opens
   this editor with ?share=uid~slug. "Only you" = nothing published.
   View link = read-only canvas with a "Make a copy" button; Edit link =
   opens as an editable copy. "Personalise your link" = your own slug. */
(function () {
  var BUCKET = 'templatehub-16cd7.firebasestorage.app';
  var SITE = 'https://www.lazydogtemplates.com/editor-v2/editor.html';
  function slugify(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
  function shareState() { try { return JSON.parse(localStorage.getItem('ld_share_state') || '{}'); } catch (e) { return {}; } }
  function putState(st) { try { localStorage.setItem('ld_share_state', JSON.stringify(st)); } catch (e) {} }
  async function fb() {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
    var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({ apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes', authDomain: 'templatehub-16cd7.firebaseapp.com', projectId: 'templatehub-16cd7', storageBucket: BUCKET });
    return { app: app, user: authMod.getAuth(app).currentUser, st: stMod };
  }
  function linkFor(uid, slug) { return SITE + '?share=' + encodeURIComponent(uid + '~' + slug); }
  async function publish(mode, slug) {
    var F = await fb();
    if (!F.user) { showToast('Sign in first to share a link 🔐', 5000); return null; }
    var deck = await buildEffectiveDeckIR();
    var payload = { v: 1, mode: mode, name: slug, by: F.user.displayName || F.user.email || '', at: Date.now(), slides: state.pages.length, deck: deck, notes: (state.notes || []).slice() };
    var json = JSON.stringify(payload);
    if (json.length > 30 * 1024 * 1024) { showToast('This design is too big to share as a link (30 MB max) — download it instead', 7000); return null; }
    var ref = F.st.ref(F.st.getStorage(F.app, 'gs://' + BUCKET), 'shares/' + F.user.uid + '/' + slug + '.json');
    await F.st.uploadBytes(ref, new Blob([json], { type: 'application/json' }), { contentType: 'application/json', cacheControl: 'public,max-age=60' });
    return linkFor(F.user.uid, slug);
  }
  async function unpublish(slug) {
    try { var F = await fb(); if (!F.user) return; await F.st.deleteObject(F.st.ref(F.st.getStorage(F.app, 'gs://' + BUCKET), 'shares/' + F.user.uid + '/' + slug + '.json')); } catch (e) {}
  }
  window.ldShareModal = async function () {
    var old = document.getElementById('ld-share-overlay'); if (old) old.remove();
    var st = shareState();
    var key = String(window.LD_DESIGN_NO || (state.pages[0] && state.pages[0].id) || 'design');
    var cur = st[key] || { mode: 'private', slug: '' };
    if (!cur.slug) cur.slug = 'design-' + Math.random().toString(36).slice(2, 8);
    var ov = document.createElement('div'); ov.id = 'ld-share-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;font-family:"DM Sans",system-ui,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;top:52px;right:16px;width:340px;background:#151623;border:1px solid #2c2e45;border-radius:14px;padding:16px;color:#e8e9f2;box-shadow:0 18px 50px rgba(0,0,0,.55);';
    function close() { ov.remove(); }
    ov.onmousedown = function (e) { if (e.target === ov) close(); };
    function render(busy, msg) {
      var link = cur.mode === 'private' ? '' : linkFor(cur.uid || '', cur.slug);
      box.innerHTML = '<div style="font-size:15px;font-weight:800;margin-bottom:10px;">Share this design</div>' +
        '<label style="font-size:11px;color:#a9abc4;">Who can open the link</label>' +
        '<select id="ld-sh-mode" style="width:100%;margin:4px 0 10px;background:#0e0f1a;color:#fff;border:1px solid #34365a;border-radius:8px;padding:8px 10px;font-size:13px;">' +
          '<option value="private"' + (cur.mode === 'private' ? ' selected' : '') + '>🔒 Only you can access</option>' +
          '<option value="view"' + (cur.mode === 'view' ? ' selected' : '') + '>👁 Anyone with the link can view</option>' +
          '<option value="edit"' + (cur.mode === 'edit' ? ' selected' : '') + '>✏️ Anyone with the link can edit a copy</option>' +
        '</select>' +
        '<label style="font-size:11px;color:#a9abc4;">Personalise your link</label>' +
        '<div style="display:flex;gap:6px;margin:4px 0 10px;"><span style="font-size:11px;color:#8b8ea8;align-self:center;white-space:nowrap;">…/editor.html?share=you~</span><input id="ld-sh-slug" value="' + cur.slug.replace(/"/g, '') + '" style="flex:1;min-width:0;background:#0e0f1a;color:#fff;border:1px solid #34365a;border-radius:8px;padding:7px 9px;font-size:13px;"></div>' +
        '<input id="ld-sh-link" readonly value="' + (link || 'Turn on link sharing above') + '" style="width:100%;background:#0e0f1a;color:' + (link ? '#e8e9f2' : '#8b8ea8') + ';border:1px solid #34365a;border-radius:8px;padding:8px 10px;font-size:12px;margin-bottom:10px;">' +
        '<button id="ld-sh-copy" ' + (busy ? 'disabled' : '') + ' style="width:100%;border:0;border-radius:10px;padding:11px;font-weight:800;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;opacity:' + (busy ? '.6' : '1') + ';">' + (busy ? 'Publishing…' : (cur.mode === 'private' ? 'Turn on sharing & copy link' : '🔗 Copy link')) + '</button>' +
        '<div style="font-size:11px;color:#8b8ea8;margin-top:8px;min-height:14px;">' + (msg || (cur.mode === 'private' ? 'Nothing is published until you turn sharing on.' : 'Published — anyone with the link sees the latest copy you published. Re-copy after edits to update it.')) + '</div>';
      box.querySelector('#ld-sh-mode').onchange = function (e) { cur.mode = e.target.value; if (cur.mode === 'private' && cur.uid) { unpublish(cur.slug); } st[key] = cur; putState(st); render(false); };
      box.querySelector('#ld-sh-slug').onchange = function (e) { var ns = slugify(e.target.value) || cur.slug; if (ns !== cur.slug && cur.uid) unpublish(cur.slug); cur.slug = ns; st[key] = cur; putState(st); render(false); };
      box.querySelector('#ld-sh-copy').onclick = async function () {
        var mode = box.querySelector('#ld-sh-mode').value; cur.mode = mode === 'private' ? 'view' : mode;
        cur.slug = slugify(box.querySelector('#ld-sh-slug').value) || cur.slug;
        render(true);
        try {
          var url = await publish(cur.mode, cur.slug);
          if (!url) { render(false, 'Could not publish.'); return; }
          cur.uid = decodeURIComponent(url.split('share=')[1]).split('~')[0];
          st[key] = cur; putState(st);
          try { await navigator.clipboard.writeText(url); } catch (e) {}
          render(false, '✓ Link copied. ' + (cur.mode === 'view' ? 'Viewers see a read-only deck.' : 'Anyone can open it and edit their own copy.'));
          box.querySelector('#ld-sh-link').select();
        } catch (e) { render(false, 'Publish failed: ' + (e && e.message || e)); }
      };
    }
    render(false); ov.appendChild(box); document.body.appendChild(ov);
  };
  Editor._register({ share: function () { window.ldShareModal(); } });

  /* ── opening a shared link ── */
  var share = null; try { share = new URLSearchParams(location.search).get('share'); } catch (e) {}
  if (share && share.indexOf('~') > 0) {
    window.addEventListener('load', function () {
      setTimeout(async function () {
        var parts = share.split('~'), uid = parts[0], slug = parts.slice(1).join('~');
        var url = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent('shares/' + uid + '/' + slug + '.json') + '?alt=media';
        showToast('Opening shared design…', 8000);
        try {
          var r = await fetch(url); if (!r.ok) throw new Error('This link has been turned off or does not exist');
          var d = await r.json();
          await window.loadDeckIRIntoEditor(d.deck);
          if (d.notes) state.notes = d.notes;
          if (d.mode === 'view') {
            fc.getObjects().forEach(function (o) { o.selectable = false; o.evented = false; });
            fc.selection = false; fc.discardActiveObject(); fc.renderAll();
            window._ldViewOnly = true;
            var bar = document.createElement('div');
            bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:70px;z-index:9500;background:#151623;border:1px solid #2c2e45;border-radius:999px;padding:8px 10px 8px 16px;color:#e8e9f2;font:600 12.5px "DM Sans",system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.45);';
            bar.innerHTML = '👁 View only — shared by ' + (d.by || 'a LazyDog user') + ' <button style="border:0;border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;">Make a copy to edit</button>';
            bar.querySelector('button').onclick = function () {
              window._ldViewOnly = false; fc.selection = true;
              state.pages.forEach(function (p) { delete p.canvasJSON; });
              loadPageIntoCanvas(state.currentPage).then(function () { fc.getObjects().forEach(function (o) { o.selectable = true; o.evented = true; }); fc.renderAll(); });
              bar.remove(); showToast('This is your own copy now — edit freely');
            };
            document.body.appendChild(bar);
            showToast('Shared design opened (view only)');
          } else showToast('Shared design opened — this is your own editable copy');
          try { history.replaceState(null, '', location.pathname); } catch (e) {}
        } catch (e) { showToast(e.message || 'Could not open that link', 7000); }
      }, 800);
    });
  }
})();

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
      if (!o || o.isFrame || !frameImageOf(o)) return;
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
      /* 21 Aug 2026 — DESIGN frames too (the Brain's rule): a photo frame that
         came with a composed/imported design is a group with an irId whose IR
         element is an image with custom geometry. Dropping a photo on it
         re-fits the photo into that shape, exactly like the Brain does. */
      var irSlide = (state.pages[state.currentPage] || {}).irOrig || (state.pages[state.currentPage] || {}).ir ||
                    (window._deckIR && window._deckIR.slides && window._deckIR.slides[state.currentPage]) || null;
      if (!irSlide || !irSlide.elements) return;
      var byId = {}; irSlide.elements.forEach(function (e) { byId[e.id] = e; });
      var cands = fc.getObjects().filter(function (g) { return g !== o && g.irId && byId[g.irId] && byId[g.irId].type === 'image' && byId[g.irId].geom && byId[g.irId].geom.custom; });
      for (var j = cands.length - 1; j >= 0; j--) {
        var bb = cands[j].getBoundingRect(true, true);
        if (pt.x >= bb.left && pt.x <= bb.left + bb.width && pt.y >= bb.top && pt.y <= bb.top + bb.height) {
          dropImageIntoIRFrame(o, cands[j], byId[cands[j].irId]);
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
        return { id: p.id, canvasJSON: p.canvasJSON, ir: p.ir, irOrig: p.irOrig || null, thumb: p.thumb, title: p.title || null, transition: p.transition || null };
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
    saveProject: async function () {
      var name = await window.ldPrompt('Project name:', '', 'My design ' + new Date().toLocaleDateString());
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
    newDesign: async function () {
      if (state.pages.length > 1 || (fc.getObjects() || []).length) {
        if (!(await window.ldConfirm('Start a new design? Unsaved work on this one is kept in autosave.', 'New design'))) return;
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

  /* 21 Aug 2026 — a reload must never lose the deck: offer the autosave
     back on boot, and warn before leaving with work on the canvas */
  setTimeout(function () {
    projAll().then(function (list) {
      var a = (list || []).filter(function (p) { return p && p.id === '__autosave__'; })[0];
      if (!a || !a.deck || !a.deck.pages) return;
      var fresh = (Date.now() - (a.ts || 0)) < 3 * 24 * 3600 * 1000;
      var nonEmpty = a.deck.pages.length > 1 || (a.deck.pages[0] && ((a.deck.pages[0].canvasJSON && a.deck.pages[0].canvasJSON.objects && a.deck.pages[0].canvasJSON.objects.length) || a.deck.pages[0].ir));
      var blankNow = state.pages.length === 1 && !(fc.getObjects() || []).length && !window._deckIR;
      var q = ''; try { q = location.search; } catch (e) {}
      if (!fresh || !nonEmpty || !blankNow || /compose=|project=/.test(q)) return;
      window.ldConfirm('Restore your last design? (' + a.deck.pages.length + ' slide' + (a.deck.pages.length === 1 ? '' : 's') + ', autosaved ' + new Date(a.ts).toLocaleTimeString() + ')', 'Restore')
        .then(function (yes) { if (yes) { restoreSnapshot(a.deck); showToast('Restored from autosave'); } });
    }).catch(function () {});
  }, 1800);
  window.addEventListener('beforeunload', function (e) {
    try {
      if (state.pages.length > 1 || (fc.getObjects() || []).length) {
        projSave({ id: '__autosave__', name: 'Autosave', isAutosave: true, ts: Date.now(), deck: deckSnapshot() });
        e.preventDefault(); e.returnValue = '';
      }
    } catch (err) {}
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

/* ═════════ MOCK-UP SLIDES (21 Aug 2026, Javed's order) ═════════
   A mock-up slide is a ready LAYOUT: photo frames to punch pictures into,
   text areas, and a chart area — in different proportions. 15 of them.
   Units are fractions of the slide; kinds: frame(shape), heading, body, chart. */
var MOCKUP_LAYOUTS = [
  { name: 'Title + hero photo',      items: [['heading',.06,.10,.40,.18],['body',.06,.32,.38,.30],['frame','landscape',.50,.10,.44,.80]] },
  { name: 'Photo left, text right',  items: [['frame','portrait',.06,.10,.34,.80],['heading',.46,.14,.48,.16],['body',.46,.34,.48,.46]] },
  { name: 'Three photo columns',     items: [['heading',.06,.08,.88,.14],['frame','portrait',.06,.26,.27,.64],['frame','portrait',.365,.26,.27,.64],['frame','portrait',.67,.26,.27,.64]] },
  { name: 'Four square gallery',     items: [['heading',.06,.08,.40,.14],['frame','square',.50,.08,.20,.38],['frame','square',.74,.08,.20,.38],['frame','square',.50,.52,.20,.38],['frame','square',.74,.52,.20,.38],['body',.06,.26,.40,.50]] },
  { name: 'Circle portraits (team)', items: [['heading',.06,.08,.88,.14],['frame','circle',.08,.30,.18,.32],['frame','circle',.30,.30,.18,.32],['frame','circle',.52,.30,.18,.32],['frame','circle',.74,.30,.18,.32],['body',.06,.68,.88,.22]] },
  { name: 'Chart + commentary',      items: [['heading',.06,.08,.88,.14],['chart',.06,.26,.56,.64],['body',.66,.26,.28,.64]] },
  { name: 'Two charts',              items: [['heading',.06,.08,.88,.14],['chart',.06,.26,.43,.64],['chart',.51,.26,.43,.64]] },
  { name: 'Photo + chart + text',    items: [['frame','rounded',.06,.10,.30,.80],['chart',.40,.10,.54,.44],['body',.40,.58,.54,.32]] },
  { name: 'Big statement',           items: [['heading',.08,.30,.84,.24],['body',.08,.58,.60,.20],['frame','circle',.74,.56,.18,.32]] },
  { name: 'Hexagon features',        items: [['heading',.06,.08,.88,.14],['frame','hexagon',.06,.28,.20,.36],['body',.06,.66,.20,.26],['frame','hexagon',.29,.28,.20,.36],['body',.29,.66,.20,.26],['frame','hexagon',.52,.28,.20,.36],['body',.52,.66,.20,.26],['frame','hexagon',.75,.28,.20,.36],['body',.75,.66,.20,.26]] },
  { name: 'Wide banner + 3 cards',   items: [['frame','landscape',.06,.08,.88,.36],['heading',.06,.48,.88,.12],['body',.06,.62,.27,.30],['body',.365,.62,.27,.30],['body',.67,.62,.27,.30]] },
  { name: 'Diamond + text blocks',   items: [['frame','diamond',.06,.20,.32,.60],['heading',.44,.16,.50,.14],['body',.44,.34,.50,.22],['body',.44,.60,.50,.22]] },
  { name: 'Phone mock-up + copy',    items: [['frame','phone',.08,.08,.24,.84],['heading',.40,.16,.54,.16],['body',.40,.36,.54,.40]] },
  { name: 'Laptop mock-up',          items: [['heading',.06,.08,.88,.12],['frame','laptop',.14,.24,.72,.68]] },
  { name: 'Arch + arch',             items: [['frame','arch',.06,.10,.26,.80],['frame','arch',.36,.10,.26,.80],['heading',.66,.14,.28,.20],['body',.66,.38,.28,.50]] }
];
function mockupPreviewSvg(L) {
  var out = '<svg viewBox="0 0 160 90">';
  out += '<rect x="0" y="0" width="160" height="90" rx="4" fill="currentColor" opacity=".08"/>';
  L.items.forEach(function (it) {
    var k = it[0], sh = k === 'frame' ? it[1] : null, o = k === 'frame' ? 2 : 1;
    var x = it[o] * 160, y = it[o + 1] * 90, w = it[o + 2] * 160, h = it[o + 3] * 90;
    if (k === 'frame') {
      if (sh === 'circle') out += '<ellipse cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" rx="' + w / 2 + '" ry="' + h / 2 + '" fill="#8B3DFF" opacity=".55"/>';
      else if (sh === 'diamond') out += '<polygon points="' + (x + w / 2) + ',' + y + ' ' + (x + w) + ',' + (y + h / 2) + ' ' + (x + w / 2) + ',' + (y + h) + ' ' + x + ',' + (y + h / 2) + '" fill="#8B3DFF" opacity=".55"/>';
      else if (sh === 'hexagon') out += '<polygon points="' + (x + w * .25) + ',' + y + ' ' + (x + w * .75) + ',' + y + ' ' + (x + w) + ',' + (y + h / 2) + ' ' + (x + w * .75) + ',' + (y + h) + ' ' + (x + w * .25) + ',' + (y + h) + ' ' + x + ',' + (y + h / 2) + '" fill="#8B3DFF" opacity=".55"/>';
      else if (sh === 'arch') out += '<path d="M' + x + ' ' + (y + h) + ' V' + (y + w / 2) + ' A' + w / 2 + ' ' + w / 2 + ' 0 0 1 ' + (x + w) + ' ' + (y + w / 2) + ' V' + (y + h) + ' Z" fill="#8B3DFF" opacity=".55"/>';
      else out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (sh === 'rounded' || sh === 'phone' ? 4 : 1) + '" fill="#8B3DFF" opacity=".55"/>';
    } else if (k === 'heading') out += '<rect x="' + x + '" y="' + y + '" width="' + w * .8 + '" height="' + Math.min(h, 7) + '" rx="1.5" fill="currentColor" opacity=".7"/>';
    else if (k === 'body') { for (var i = 0; i < 3; i++) out += '<rect x="' + x + '" y="' + (y + i * 5) + '" width="' + w * (i === 2 ? .6 : .95) + '" height="2.2" rx="1" fill="currentColor" opacity=".4"/>'; }
    else if (k === 'chart') { out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="#12A5A0" opacity=".18"/>'; for (var j = 0; j < 5; j++) { var bh = h * (0.3 + ((j * 37) % 60) / 100); out += '<rect x="' + (x + w * (0.08 + j * 0.18)) + '" y="' + (y + h - bh) + '" width="' + w * 0.12 + '" height="' + bh + '" fill="#12A5A0" opacity=".7"/>'; } }
  });
  return out + '</svg>';
}
function buildFrameAt(kind, left, top, w, h) {
  var def = FRAME_DEFS[kind]; if (!def) return null;
  var path = new fabric.Path(def.d, { fill: '#E9EAEE', isAperture: true });
  var parts = [path];
  (def.deco || []).forEach(function (d) { parts.push(new fabric.Path(d[0], { fill: d[1], evented: false })); });
  var g = new fabric.Group(parts, { left: left, top: top, isFrame: true, frameKind: kind, framePath: def.d, framePathW: def.w, framePathH: def.h, frameLook: 'placeholder', frameFill: '#7C3AED' });
  var sc = Math.min(w / def.w, h / def.h);
  g.set({ scaleX: sc, scaleY: sc, left: left + (w - def.w * sc) / 2, top: top + (h - def.h * sc) / 2 });
  return g;
}
Editor._register({
  __qMockupLayouts: function () { return MOCKUP_LAYOUTS.map(function (L, i) { return { i: i, name: L.name, svg: mockupPreviewSvg(L) }; }); },
  insertMockupLayout: async function (i) {
    var L = MOCKUP_LAYOUTS[i | 0]; if (!L) return;
    /* a mock-up slide is a NEW slide, inserted right after the current one
       (Javed, 21 Aug 2026). It inherits the deck's background colour. */
    var _max = (typeof ldMaxSlides === 'function') ? ldMaxSlides() : 500;
    if (state.pages.length >= _max) { showToast('Maximum ' + _max + ' slides'); return; }
    var prevBg = (typeof fc.backgroundColor === 'string') ? fc.backgroundColor : '#FFFFFF';
    captureCurrentPage();
    var at = state.currentPage + 1;
    var page = makeBlankPage(Date.now()); page.pendingBg = prevBg;
    state.pages.splice(at, 0, page); state.notes.splice(at, 0, '');
    state.currentPage = at;
    await loadPageIntoCanvas(at);
    fc.setBackgroundColor(prevBg, function () {});
    var W = fc._baseWidth || 1920, H = fc._baseHeight || 1080;
    var dark = false;
    try { var bgc = fc.backgroundColor; if (typeof bgc === 'string' && /^#/.test(bgc)) { var n = parseInt(bgc.slice(1, 7), 16); dark = ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) < 128; } } catch (e) {}
    var ink = dark ? '#FFFFFF' : '#0F172A', sub = dark ? '#CBD2DE' : '#475569';
    histLabel('Mock-up slide');
    var added = [];
    L.items.forEach(function (it) {
      var k = it[0], o = k === 'frame' ? 2 : 1;
      var x = it[o] * W, y = it[o + 1] * H, w = it[o + 2] * W, h = it[o + 3] * H;
      if (k === 'frame') { var g = buildFrameAt(it[1], x, y, w, h); if (g) { fc.add(g); refreshFrame(g); added.push(g); } }
      else if (k === 'heading' || k === 'body') {
        var t = new fabric.Textbox(k === 'heading' ? 'Your heading here' : 'Your text goes here — replace me with your own words.', {
          left: x, top: y, width: w, fontFamily: 'DM Sans', fontSize: k === 'heading' ? Math.round(Math.min(88, h * 0.55)) : 30,
          fontWeight: k === 'heading' ? '700' : '400', fill: k === 'heading' ? ink : sub, editable: true });
        fc.add(t); added.push(t);
      } else if (k === 'chart') {
        var r = new fabric.Rect({ left: x, top: y, width: w, height: h, rx: 16, ry: 16, fill: 'rgba(18,165,160,0.10)', stroke: '#12A5A0', strokeWidth: 3, strokeDashArray: [14, 10], strokeUniform: true, isChartArea: true });
        var lab = new fabric.Textbox('Chart area — Data panel → pick a chart, drop it here', { left: x + 24, top: y + h / 2 - 18, width: w - 48, fontSize: 26, fontFamily: 'DM Sans', fill: '#12A5A0', textAlign: 'center', editable: false, evented: false });
        fc.add(r); fc.add(lab); added.push(r); added.push(lab);
      }
    });
    fc.discardActiveObject(); fc.renderAll(); saveState();
    try { renderPageThumbs(); } catch (e) {}
    Editor._emit('slides', Editor.query('slides'));
    showToast('Mock-up slide “' + L.name + '” added as slide ' + (at + 1) + ' — click a photo in Photos, or drag one onto a frame');
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
    /* strokes never leave the slide — points outside are clamped to its
       edge, so nothing bleeds past the canvas in the exported file */
    var origGetPointer = fc.getPointer.bind(fc);
    fc.getPointer = function (e, ignoreZoom) {
      var p = origGetPointer(e, ignoreZoom);
      if (fc.isDrawingMode && p) {
        var W = fc._baseWidth || 1920, H = fc._baseHeight || 1080;
        p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
      }
      return p;
    };
    fc.on('mouse:down', function (opt) {
      if (draw.mode !== 'erase' || !opt.target) return;
      if (opt.target._isDrawn) { fc.remove(opt.target); fc.renderAll(); saveState(); }
    });
  }
  function stopDrawing() {
    draw.mode = null; fc.isDrawingMode = false; fc.defaultCursor = 'default';
    if (fc.upperCanvasEl) fc.upperCanvasEl.style.cursor = 'default';
    if (Editor._emit) Editor._emit('selection', Editor.query('selection'));
  }
  function pen(highlight) {
    hooks();
    /* pressing the active tool again switches back to the mouse (21 Aug 2026) */
    if (draw.mode === (highlight ? 'high' : 'pen')) { stopDrawing(); showToast('Back to the mouse'); return; }
    draw.mode = highlight ? 'high' : 'pen';
    fc.isDrawingMode = true;
    fc.freeDrawingBrush = new fabric.PencilBrush(fc);
    fc.freeDrawingBrush.width = highlight ? draw.size * 4 : draw.size;
    fc.freeDrawingBrush.color = highlight
      ? draw.colour + '55'
      : draw.colour;
    showToast((highlight ? 'Highlighter' : 'Pen') + ' on — press Esc, or click Select, to go back to the mouse', 5000);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && draw.mode) { stopDrawing(); showToast('Back to the mouse'); }
  });
  Editor._register({
    drawSelect: function () { stopDrawing(); showToast('Select tool — back to the mouse'); },
    __qDrawMode: function () { return draw.mode; },
    drawPen: function () { pen(false); },
    drawHighlighter: function () { pen(true); },
    drawEraser: function () {
      hooks(); if (draw.mode === 'erase') { stopDrawing(); showToast('Back to the mouse'); return; }
      draw.mode = 'erase'; fc.isDrawingMode = false;
      showToast('Eraser — click a stroke to remove it. Esc or Select to stop');
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
  /* ═══ PRESENT REWRITE — 23 Aug 2026 (Fable, bugs #7 #8 #9) ═══════════════
     #9  Slides are now rendered LAZILY: slide 1 shows immediately, the rest
         render on demand (with the next one prefetched) — big decks no
         longer freeze on "Present".
     #8  Each of the 6 transitions now renders DISTINCTLY (fade, push, wipe,
         split, reveal, zoom) instead of everything being a plain fade.
     #7  Object animations finally PLAY: any object with animType is lifted
         out of the flat slide image and overlaid as its own element, then
         CSS-animated (entrance on show, emphasis after, exit on leave).  */
  var _LD_ANIM = {
    'appear':   ['ldpAppear', 1],   'fade-in':  ['ldpFadeIn', 600],
    'fly-in':   ['ldpFlyIn', 700],  'float-in': ['ldpFloatIn', 700],
    'split-in': ['ldpSplitIn', 600],'wipe-in':  ['ldpWipeIn', 600],
    'shape-in': ['ldpShapeIn', 700],'wheel':    ['ldpWheel', 800],
    'bars':     ['ldpBars', 700],   'grow-turn':['ldpGrowTurn', 700],
    'zoom-in':  ['ldpZoomIn', 600], 'swivel':   ['ldpSwivel', 800],
    'bounce':   ['ldpBounce', 900],
    'pulse':    ['ldpPulse', 800],  'teeter':   ['ldpTeeter', 800],
    'spin':     ['ldpSpin', 900],   'grow':     ['ldpGrow', 800],
    'disappear':['ldpDisappear', 1],'fade-out': ['ldpFadeOut', 500],
    'fly-out':  ['ldpFlyOut', 600], 'zoom-out': ['ldpZoomOut', 500]
  };
  var _LD_EXIT = { 'disappear': 1, 'fade-out': 1, 'fly-out': 1, 'zoom-out': 1 };
  var _LD_EMPH = { 'pulse': 1, 'teeter': 1, 'spin': 1, 'grow': 1 };
  function _ldPresentCss() {
    if (document.getElementById('ld-present-css')) return;
    var s = document.createElement('style'); s.id = 'ld-present-css';
    s.textContent =
      '@keyframes ldpAppear{from{opacity:0}to{opacity:1}}' +
      '@keyframes ldpFadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes ldpFlyIn{from{opacity:0;transform:translateY(70vh)}to{opacity:1;transform:none}}' +
      '@keyframes ldpFloatIn{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}' +
      '@keyframes ldpSplitIn{from{opacity:0;clip-path:inset(0 50% 0 50%)}to{opacity:1;clip-path:inset(0 0 0 0)}}' +
      '@keyframes ldpWipeIn{from{opacity:1;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}' +
      '@keyframes ldpShapeIn{from{opacity:0;clip-path:circle(0% at 50% 50%)}to{opacity:1;clip-path:circle(75% at 50% 50%)}}' +
      '@keyframes ldpWheel{from{opacity:0;transform:rotate(-180deg) scale(.4)}to{opacity:1;transform:none}}' +
      '@keyframes ldpBars{0%{opacity:0}20%{opacity:.15}40%{opacity:.35}60%{opacity:.55}80%{opacity:.8}100%{opacity:1}}' +
      '@keyframes ldpGrowTurn{from{opacity:0;transform:scale(.1) rotate(-90deg)}to{opacity:1;transform:none}}' +
      '@keyframes ldpZoomIn{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}' +
      '@keyframes ldpSwivel{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:none}}' +
      '@keyframes ldpBounce{0%{opacity:0;transform:translateY(-60vh)}45%{opacity:1;transform:translateY(0)}62%{transform:translateY(-8vh)}78%{transform:translateY(0)}90%{transform:translateY(-3vh)}100%{transform:translateY(0)}}' +
      '@keyframes ldpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}' +
      '@keyframes ldpTeeter{0%,100%{transform:rotate(0)}25%{transform:rotate(6deg)}75%{transform:rotate(-6deg)}}' +
      '@keyframes ldpSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
      '@keyframes ldpGrow{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}' +
      '@keyframes ldpDisappear{to{opacity:0}}' +
      '@keyframes ldpFadeOut{to{opacity:0}}' +
      '@keyframes ldpFlyOut{to{opacity:0;transform:translateY(-70vh)}}' +
      '@keyframes ldpZoomOut{to{opacity:0;transform:scale(.2)}}' +
      '.ldp-layer{position:absolute;inset:0;}' +
      '.ldp-layer img.ldp-base{position:absolute;inset:0;width:100%;height:100%;}' +
      '.ldp-obj{position:absolute;will-change:transform,opacity,clip-path;}';
    document.head.appendChild(s);
  }
  /* Render ONE slide for the show: flat base image + separate images for
     every animated object (lifted out so they can move on their own). */
  async function slideBundle(i) {
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
    var anims = [];
    try {
      sc.getObjects().forEach(function (o) {
        if (!o.animType || !_LD_ANIM[o.animType]) return;
        var r = o.getBoundingRect(true, true);
        var url;
        try { url = o.toDataURL({ format: 'png' }); } catch (e) { return; }
        anims.push({ url: url, l: r.left / W, t: r.top / H, w: r.width / W, h: r.height / H, type: o.animType });
        o.visible = false;      // lifted out of the flat base image
      });
      if (anims.length) sc.renderAll();
    } catch (e) { console.warn('[present] anim lift failed', e); }
    var url = sc.toDataURL({ format: 'jpeg', quality: 0.92 });
    try { sc.dispose(); } catch (e) {}
    return { url: url, anims: anims, W: W, H: H };
  }
  async function present(fromCurrent) {
    _ldPresentCss();
    var n = state.pages.length;
    var bundles = new Array(n);
    function getBundle(i) { return bundles[i] || (bundles[i] = slideBundle(i)); }
    var idx = fromCurrent ? state.currentPage : 0;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;cursor:none;overflow:hidden;';
    var stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;overflow:hidden;background:#000;';
    ov.appendChild(stage);
    var counter = document.createElement('div');
    counter.style.cssText = 'position:fixed;bottom:16px;right:22px;color:#888;font:600 13px "DM Sans",sans-serif;z-index:3;';
    ov.appendChild(counter);
    document.body.appendChild(ov);
    var ratio = (fc._baseWidth || 1920) / (fc._baseHeight || 1080);
    function fitStage() {
      var vw = ov.clientWidth, vh = ov.clientHeight;
      var w = Math.min(vw, vh * ratio), h = w / ratio;
      stage.style.width = w + 'px'; stage.style.height = h + 'px';
      stage.style.left = ((vw - w) / 2) + 'px'; stage.style.top = ((vh - h) / 2) + 'px';
    }
    fitStage();
    window.addEventListener('resize', fitStage);
    function buildLayer(b) {
      var layer = document.createElement('div'); layer.className = 'ldp-layer';
      var base = document.createElement('img'); base.className = 'ldp-base'; base.src = b.url;
      layer.appendChild(base);
      b.anims.forEach(function (a) {
        var im = document.createElement('img'); im.className = 'ldp-obj'; im.src = a.url;
        im.style.left = (a.l * 100) + '%'; im.style.top = (a.t * 100) + '%';
        im.style.width = (a.w * 100) + '%'; im.style.height = (a.h * 100) + '%';
        im.dataset.anim = a.type;
        if (!_LD_EXIT[a.type] && !_LD_EMPH[a.type]) im.style.opacity = '0'; // entrance: hidden until played
        layer.appendChild(im);
      });
      return layer;
    }
    function playAnims(layer) {
      var objs = Array.prototype.slice.call(layer.querySelectorAll('.ldp-obj'));
      var delay = 150, entTotal = 0;
      objs.forEach(function (im) {
        var k = im.dataset.anim, spec = _LD_ANIM[k];
        if (!spec || _LD_EXIT[k] || _LD_EMPH[k]) return;
        im.style.opacity = '';
        im.style.animation = spec[0] + ' ' + spec[1] + 'ms ease both ' + entTotal + 'ms';
        entTotal += delay;
      });
      var emStart = entTotal + 500;
      objs.forEach(function (im) {
        var k = im.dataset.anim, spec = _LD_ANIM[k];
        if (!spec || !_LD_EMPH[k]) return;
        im.style.animation = spec[0] + ' ' + spec[1] + 'ms ease both ' + emStart + 'ms';
        emStart += delay;
      });
    }
    function playExits(layer) {
      var ms = 0;
      layer.querySelectorAll('.ldp-obj').forEach(function (im) {
        var k = im.dataset.anim, spec = _LD_ANIM[k];
        if (!spec || !_LD_EXIT[k]) return;
        im.style.animation = spec[0] + ' ' + spec[1] + 'ms ease both';
        ms = Math.max(ms, spec[1]);
      });
      return Math.min(ms, 700);
    }
    /* #8 — each transition type has its OWN look (applied to the slide we
       are ARRIVING at, PowerPoint-style "transition to this slide"). */
    function runTransition(oldL, newL, type, ms) {
      ms = Math.max(150, Math.min(3000, ms || 500));
      var ease = ' ' + ms + 'ms ease';
      function done() { if (oldL && oldL.parentNode) oldL.remove(); }
      if (!oldL || !type || type === 'none') { done(); return 0; }
      newL.style.zIndex = 2; oldL.style.zIndex = 1;
      if (type === 'fade') {
        newL.style.opacity = '0'; newL.style.transition = 'opacity' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () { newL.style.opacity = '1'; }); });
      } else if (type === 'slide') {          /* Push */
        newL.style.transform = 'translateX(100%)'; newL.style.transition = 'transform' + ease;
        oldL.style.transition = 'transform' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          newL.style.transform = 'translateX(0)'; oldL.style.transform = 'translateX(-100%)';
        }); });
      } else if (type === 'wipe') {
        newL.style.clipPath = 'inset(0 100% 0 0)'; newL.style.transition = 'clip-path' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () { newL.style.clipPath = 'inset(0 0 0 0)'; }); });
      } else if (type === 'split') {
        newL.style.clipPath = 'inset(0 50% 0 50%)'; newL.style.transition = 'clip-path' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () { newL.style.clipPath = 'inset(0 0 0 0)'; }); });
      } else if (type === 'reveal') {         /* old slide lifts away, new sits beneath */
        newL.style.zIndex = 1; oldL.style.zIndex = 2;
        oldL.style.transition = 'opacity' + ease + ', transform' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          oldL.style.opacity = '0'; oldL.style.transform = 'translateX(-12%)';
        }); });
      } else if (type === 'zoom') {
        newL.style.opacity = '0'; newL.style.transform = 'scale(.6)';
        newL.style.transition = 'opacity' + ease + ', transform' + ease;
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          newL.style.opacity = '1'; newL.style.transform = 'scale(1)';
        }); });
      } else { done(); return 0; }
      setTimeout(done, ms + 60);
      return ms;
    }
    var busy = false;
    async function show(i, first) {
      var to = Math.max(0, Math.min(n - 1, i));
      if (!first && to === idx) return;
      if (busy) return;
      busy = true;
      try {
        var oldL = stage.firstChild || null;
        var exitMs = (!first && oldL && to > idx) ? playExits(oldL) : 0;   // #7 exit anims on leave (forward)
        if (exitMs) await new Promise(function (r) { setTimeout(r, exitMs); });
        var b = await getBundle(to);                                        // #9 lazy render on demand
        idx = to;
        var t = (state.pages[idx] || {}).transition || {};
        var newL = buildLayer(b);
        stage.appendChild(newL);
        runTransition(first ? null : oldL, newL, t.type, t.ms);
        playAnims(newL);                                                    // #7 entrance + emphasis
        counter.textContent = (idx + 1) + ' / ' + n;
        if (idx + 1 < n) getBundle(idx + 1);                                // #9 prefetch the next slide
      } finally { busy = false; }
    }
    function key(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') show(idx + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(idx - 1);
    }
    function click() { show(idx + 1); }
    function close() {
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', fitStage);
      ov.remove();
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    }
    document.addEventListener('keydown', key);
    ov.addEventListener('click', click);
    try { await ov.requestFullscreen(); } catch (e) {}
    fitStage();
    show(idx, true);
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
  /* 21 Aug 2026 (Javed) — every download type. PNG/JPG of one slide, PNG of
     every slide (zip), SVG of the current slide (true vectors), and a video
     of the deck (WebM, each slide held for its transition/4s). */
  async function exportJpgFile() {
    var i = state.currentPage || 0;
    showToast('Rendering JPG…');
    var url = await slideImage(i);
    ldSaveDataUrl(url, 'slide-' + (i + 1) + '.jpg');
    showToast('Saved slide ' + (i + 1) + ' as JPG');
  }
  async function exportAllPngZip() {
    showToast('Rendering ' + state.pages.length + ' slides…', 8000);
    var zip = new JSZip();
    for (var i = 0; i < state.pages.length; i++) {
      var url = await slidePng(i);
      zip.file('slide-' + String(i + 1).padStart(2, '0') + '.png', url.split(',')[1], { base64: true });
      if (i % 5 === 4) showToast('Rendered ' + (i + 1) + ' of ' + state.pages.length + '…', 4000);
    }
    var blob = await zip.generateAsync({ type: 'blob' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'slides-png.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    showToast('Saved ' + state.pages.length + ' slides as PNG (zip)');
  }
  async function exportSvgFile() {
    var i = state.currentPage || 0;
    captureCurrentPage();
    var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
    var sc = new fabric.StaticCanvas(null, { width: W, height: H });
    var page = state.pages[i];
    if (page.canvasJSON) await new Promise(function (res) { sc.loadFromJSON(page.canvasJSON, function () { sc.renderAll(); res(); }); });
    var svg = sc.toSVG({ width: W, height: H, viewBox: { x: 0, y: 0, width: W, height: H } });
    try { sc.dispose(); } catch (e) {}
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'slide-' + (i + 1) + '.svg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    showToast('Saved slide ' + (i + 1) + ' as SVG');
  }
  async function exportVideoFile() {
    if (!window.MediaRecorder) { showToast('Video export is not supported in this browser'); return; }
    var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
    var scale = W > 1920 ? 1920 / W : 1;
    var cw = Math.round(W * scale), ch = Math.round(H * scale);
    showToast('Rendering video frames…', 8000);
    var frames = [];
    for (var i = 0; i < state.pages.length; i++) {
      var im = new Image(); im.src = await slideImage(i);
      await new Promise(function (r) { im.onload = r; im.onerror = r; });
      frames.push(im);
    }
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var ctx = cv.getContext('2d');
    var stream = cv.captureStream(30);
    var mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0] || 'video/webm';
    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
    var chunks = []; rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var done = new Promise(function (res) { rec.onstop = res; });
    rec.start(200);
    var HOLD = 4000, FADE = 500;
    var t0 = performance.now();
    function drawAt(t) {
      var per = HOLD + FADE, idx = Math.min(frames.length - 1, Math.floor(t / per)), k = t - idx * per;
      ctx.drawImage(frames[idx], 0, 0, cw, ch);
      if (k > HOLD && idx + 1 < frames.length) { ctx.globalAlpha = (k - HOLD) / FADE; ctx.drawImage(frames[idx + 1], 0, 0, cw, ch); ctx.globalAlpha = 1; }
      return t < frames.length * per - FADE;
    }
    showToast('Recording ' + state.pages.length + ' slides (' + Math.round(state.pages.length * 4.5) + 's)…', 60000);
    await new Promise(function (res) {
      (function tick() { if (drawAt(performance.now() - t0)) requestAnimationFrame(tick); else res(); })();
    });
    rec.stop(); await done;
    var blob = new Blob(chunks, { type: 'video/webm' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'presentation.webm';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    showToast('Saved video (.webm) — plays in any browser, PowerPoint and VLC');
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
    exportPng: function () { ldBusyWrap('PNG', exportPngFile); },
    exportJpg: function () { ldBusyWrap('JPG', exportJpgFile); },
    exportPngAll: function () { ldBusyWrap('PNG', exportAllPngZip); },
    exportSvg: function () { ldBusyWrap('SVG', exportSvgFile); },
    exportVideo: function () { ldBusyWrap('Video', exportVideoFile); }
  });
})();

/* ═════════ small utilities ═════════ */
Editor._register({
  find: async function () {
    var q = await window.ldPrompt('Find text:', 'word or phrase');
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
    window.ldAlert('Ctrl+Z / Ctrl+Y — undo / redo\nCtrl+C / Ctrl+V — copy / paste\nCtrl+D — duplicate\nCtrl+A — select all\nDelete — remove selection\nEsc — deselect / stop drawing\nArrows in slide show — navigate', 'Keyboard shortcuts');
  },
  sendFeedback: function () { window.open('https://www.lazydogtemplates.com/#contact', '_blank'); },
  addComment: async function () {
    var o = fc.getActiveObject();
    var text = await window.ldPrompt('Comment' + (o ? ' on the selected object' : ' on this slide') + ':', 'your note', '', { multiline: true });
    if (!text || !text.trim()) return;
    state.comments.push({ id: 'cm' + Date.now(), page: state.currentPage, text: text.trim(), ts: Date.now() });
    showToast('Comment added (' + state.comments.length + ' total)');
  },
  showComments: function () {
    var list = state.comments.filter(function (c) { return c.page === state.currentPage; });
    if (!list.length) { showToast('No comments on this slide'); return; }
    window.ldAlert(list.map(function (c) { return '• ' + c.text; }).join('\n'), 'Comments on slide ' + (state.currentPage + 1));
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 3                          owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   AI panel (compose-append: add slides in style, mock-ups, one slide,
   rewrite/summarize/translate), the full 1900-font catalogue with lazy
   Google-Fonts loading, icons library, photos library, CSV → chart data.
   ═══════════════════════════════════════════════════════════════════════ */

window.LD_CHAT_URL = window.LD_CHAT_URL
  || 'https://us-central1-templatehub-16cd7.cloudfunctions.net/chat_http';
window.LD_MAX_SLIDES = window.LD_MAX_SLIDES || 500;
function ldMaxSlides() { return window.LD_MAX_SLIDES || 500; }

/* ── fonts: full catalogue + lazy loader ── */
var SYSTEM_FONTS = [
    "Arial","Arial Black","Helvetica","Times New Roman","Georgia","Verdana","Tahoma",
    "Trebuchet MS","Courier New","Impact","Comic Sans MS","Calibri","Calibri Light",
    "Cambria","Candara","Consolas","Constantia","Corbel","Franklin Gothic Medium",
    "Garamond","Century Gothic","Book Antiqua","Bookman Old Style","Palatino Linotype",
    "Segoe UI","Segoe UI Semibold","Lucida Console","Lucida Sans Unicode","Rockwell",
    "Baskerville","Futura","Optima","Gill Sans","Copperplate","Papyrus",
    "Brush Script MT","Didot","Avenir","Avenir Next","American Typewriter","Big Caslon",
    "Chalkboard SE","Cochin","Herculanum","Marker Felt","Monaco","Party LET","Phosphate",
    "Skia","Snell Roundhand","Zapfino","Bahnschrift","DM Sans"
  ];
var GOOGLE_FONTS = [
    "Roboto", "Roboto Slab", "Roboto Condensed", "Roboto Mono", "Open Sans", "Lato",
    "Montserrat", "Oswald", "Raleway", "PT Sans", "PT Serif", "PT Mono",
    "Merriweather", "Playfair Display", "Nunito", "Nunito Sans", "Poppins", "Source Sans Pro",
    "Source Serif Pro", "Source Code Pro", "Ubuntu", "Work Sans", "Rubik", "Inter",
    "Karla", "Quicksand", "Josefin Sans", "Josefin Slab", "Dosis", "Fjalla One",
    "Bitter", "Crimson Text", "Libre Baskerville", "Libre Franklin", "Cabin", "Mulish",
    "Titillium Web", "Barlow", "Barlow Condensed", "Barlow Semi Condensed", "Archivo", "Archivo Black",
    "Archivo Narrow", "Manrope", "DM Serif Display", "DM Serif Text", "DM Mono", "Space Grotesk",
    "Space Mono", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono", "Noto Sans", "Noto Serif",
    "Fira Sans", "Fira Code", "Fira Mono", "Hind", "Heebo", "Assistant",
    "Varela Round", "Comfortaa", "Pacifico", "Lobster", "Lobster Two", "Great Vibes",
    "Dancing Script", "Sacramento", "Satisfy", "Caveat", "Shadows Into Light", "Indie Flower",
    "Permanent Marker", "Amatic SC", "Alfa Slab One", "Anton", "Bebas Neue", "Passion One",
    "Righteous", "Bangers", "Fredoka", "Baloo 2", "Cinzel", "Cinzel Decorative",
    "Cormorant", "Cormorant Garamond", "EB Garamond", "Spectral", "Domine", "Vollkorn",
    "Zilla Slab", "Arvo", "Inconsolata", "Courier Prime", "JetBrains Mono", "Overpass",
    "Overpass Mono", "Signika", "Signika Negative", "Exo", "Exo 2", "Orbitron",
    "Play", "Michroma", "Audiowide", "Russo One", "Teko", "Yanone Kaffeesatz",
    "Krona One", "Staatliches", "Prompt", "Kanit", "Chakra Petch", "Sarabun",
    "Mitr", "Maven Pro", "Questrial", "Catamaran", "Rajdhani", "Saira",
    "Saira Condensed", "Jost", "Outfit", "Sora", "Plus Jakarta Sans", "Lexend",
    "Lexend Deca", "Epilogue", "Red Hat Display", "Red Hat Text", "Public Sans", "Figtree",
    "Onest", "Urbanist", "Albert Sans", "Schibsted Grotesk", "Instrument Sans", "Bricolage Grotesque",
    "Familjen Grotesk", "Unbounded", "Syne", "Abril Fatface", "Alegreya", "Alegreya Sans",
    "Alegreya SC", "Yeseva One", "Prata", "Marcellus", "Cardo", "Neuton",
    "Old Standard TT", "Vidaloka", "Trirong", "Bevan", "Sanchez", "Rufina",
    "Bree Serif", "Kreon", "Alice", "Gelasio", "Lora", "PT Serif Caption",
    "Frank Ruhl Libre", "Noticia Text", "Faustina", "Crete Round", "Coustard", "Suez One",
    "Amiri", "Aref Ruqaa", "Almarai", "Cairo", "Tajawal", "El Messiri",
    "Changa", "Markazi Text", "Reem Kufi", "Lalezar", "Harmattan", "Vazirmatn",
    "Mada", "Rakkas", "Quattrocento", "Quattrocento Sans", "Antic", "Antic Slab",
    "Judson", "Coming Soon", "Kalam", "Patrick Hand", "Gochi Hand", "Architects Daughter",
    "Homemade Apple", "Nanum Pen Script", "Gloria Hallelujah", "Handlee", "Cabin Sketch", "Special Elite",
    "Rock Salt", "Walter Turncoat", "Covered By Your Grace", "Reenie Beanie", "Delius", "Schoolbell",
    "Crafty Girls", "Just Another Hand", "Neucha", "Sriracha", "Yellowtail", "Alex Brush",
    "Allura", "Tangerine", "Mrs Saint Delafield", "Parisienne", "Cookie", "Kaushan Script",
    "Courgette", "Pinyon Script", "Playball", "Rochester", "Marck Script", "Italianno",
    "Petit Formal Script", "Mr Dafoe", "Norican", "Meddon", "WindSong", "Herr Von Muellerhoff",
    "Berkshire Swash", "League Script", "Give You Glory", "Grand Hotel", "Lovers Quarrel", "Nothing You Could Do",
    "Yesteryear", "Bad Script", "Bahiana", "Bungee", "Bungee Inline", "Bungee Shade",
    "Monoton", "Faster One", "Rammetto One", "Sigmar One", "Luckiest Guy", "Chewy",
    "Titan One", "ABeeZee", "ADLaM Display", "AR One Sans", "Abel", "Abhaya Libre",
    "Aboreto", "Abyssinica SIL", "Aclonica", "Acme", "Actor", "Adamina",
    "Advent Pro", "Agdasima", "Aguafina Script", "Akatab", "Akaya Kanadaka", "Akaya Telivigala",
    "Akronim", "Akshar", "Aladin", "Alata", "Alatsi", "Aldrich",
    "Alef", "Alegreya Sans SC", "Aleo", "Alexandria", "Alike", "Alike Angular",
    "Alkalami", "Alkatra", "Allan", "Allerta", "Allerta Stencil", "Allison",
    "Almendra", "Almendra Display", "Almendra SC", "Alumni Sans", "Alumni Sans Collegiate One", "Alumni Sans Inline One",
    "Alumni Sans Pinstripe", "Amarante", "Amaranth", "Amethysta", "Amiko", "Amiri Quran",
    "Amita", "Anaheim", "Andada Pro", "Andika", "Anek Bangla", "Anek Devanagari",
    "Anek Gujarati", "Anek Gurmukhi", "Anek Kannada", "Anek Latin", "Anek Malayalam", "Anek Odia",
    "Anek Tamil", "Anek Telugu", "Angkor", "Annie Use Your Telescope", "Anonymous Pro", "Antic Didone",
    "Antonio", "Anuphan", "Anybody", "Aoboshi One", "Arapey", "Arbutus",
    "Arbutus Slab", "Are You Serious", "Aref Ruqaa Ink", "Arima", "Arima Madurai", "Arimo",
    "Arizonia", "Armata", "Arsenal", "Artifika", "Arya", "Asap",
    "Asap Condensed", "Asar", "Asset", "Astloch", "Asul", "Athiti",
    "Atkinson Hyperlegible", "Atma", "Atomic Age", "Aubrey", "Autour One", "Average",
    "Average Sans", "Averia Gruesa Libre", "Averia Libre", "Averia Sans Libre", "Averia Serif Libre", "Azeret Mono",
    "B612", "B612 Mono", "BIZ UDGothic", "BIZ UDMincho", "BIZ UDPGothic", "BIZ UDPMincho",
    "Babylonica", "Bacasime Antique", "Bagel Fat One", "Bahianita", "Bai Jamjuree", "Bakbak One",
    "Ballet", "Baloo Bhai 2", "Baloo Bhaijaan 2", "Baloo Bhaina 2", "Baloo Chettan 2", "Baloo Da 2",
    "Baloo Paaji 2", "Baloo Tamma 2", "Baloo Tammudu 2", "Baloo Thambi 2", "Balsamiq Sans", "Balthazar",
    "Barriecito", "Barrio", "Basic", "Baskervville", "Battambang", "Baumans",
    "Bayon", "Be Vietnam Pro", "Beau Rivage", "Belanosima", "Belgrano", "Bellefair",
    "Belleza", "Bellota", "Bellota Text", "BenchNine", "Benne", "Bentham",
    "Besley", "Beth Ellen", "BhuTuka Expanded One", "Big Shoulders Display", "Big Shoulders Inline Display", "Big Shoulders Inline Text",
    "Big Shoulders Stencil Display", "Big Shoulders Stencil Text", "Big Shoulders Text", "Bigelow Rules", "Bigshot One", "Bilbo",
    "Bilbo Swash Caps", "BioRhyme", "BioRhyme Expanded", "Birthstone", "Birthstone Bounce", "Biryani",
    "Black And White Picture", "Black Han Sans", "Black Ops One", "Blaka", "Blaka Hollow", "Blaka Ink",
    "Blinker", "Bodoni Moda", "Bokor", "Bona Nova", "Bonbon", "Bonheur Royale",
    "Boogaloo", "Borel", "Bowlby One", "Bowlby One SC", "Braah One", "Brawler",
    "Bruno Ace", "Bruno Ace SC", "Brygada 1918", "Bubblegum Sans", "Bubbler One", "Buda",
    "Buenard", "Bungee Hairline", "Bungee Outline", "Bungee Spice", "Butcherman", "Butterfly Kids",
    "Cabin Condensed", "Caesar Dressing", "Cagliostro", "Cairo Play", "Caladea", "Calistoga",
    "Calligraffitti", "Cambay", "Cambo", "Candal", "Cantarell", "Cantata One",
    "Cantora One", "Caprasimo", "Capriola", "Caramel", "Carattere", "Carlito",
    "Carme", "Carrois Gothic", "Carrois Gothic SC", "Carter One", "Castoro", "Castoro Titling",
    "Caudex", "Caveat Brush", "Cedarville Cursive", "Ceviche One", "Changa One", "Chango",
    "Charis SIL", "Charm", "Charmonman", "Chathura", "Chau Philomene One", "Chela One",
    "Chelsea Market", "Chenla", "Cherish", "Cherry Bomb One", "Cherry Cream Soda", "Cherry Swash",
    "Chicle", "Chilanka", "Chivo", "Chivo Mono", "Chokokutai", "Chonburi",
    "Clicker Script", "Climate Crisis", "Coda", "Coda Caption", "Codystar", "Coiny",
    "Combo", "Comforter", "Comforter Brush", "Comic Neue", "Comme", "Commissioner",
    "Concert One", "Condiment", "Content", "Contrail One", "Convergence", "Copse",
    "Corben", "Corinthia", "Cormorant Infant", "Cormorant SC", "Cormorant Unicase", "Cormorant Upright",
    "Cousine", "Creepster", "Crimson Pro", "Croissant One", "Crushed", "Cuprum",
    "Cute Font", "Cutive", "Cutive Mono", "Dai Banna SIL", "Damion", "Dangrek",
    "Darker Grotesque", "Darumadrop One", "David Libre", "Dawning of a New Day", "Days One", "Dekko",
    "Dela Gothic One", "Delicious Handrawn", "Delius Swash Caps", "Delius Unicase", "Della Respira", "Denk One",
    "Devonshire", "Dhurjati", "Didact Gothic", "Diphylleia", "Diplomata", "Diplomata SC",
    "Do Hyeon", "Dokdo", "Donegal One", "Dongle", "Doppio One", "Dorsa",
    "DotGothic16", "Dr Sugiyama", "Duru Sans", "DynaPuff", "Dynalight", "Eagle Lake",
    "East Sea Dokdo", "Eater", "Economica", "Eczar", "Edu NSW ACT Foundation", "Edu QLD Beginner",
    "Edu SA Beginner", "Edu TAS Beginner", "Edu VIC WA NT Beginner", "Electrolize", "Elsie", "Elsie Swash Caps",
    "Emblema One", "Emilys Candy", "Encode Sans", "Encode Sans Condensed", "Encode Sans Expanded", "Encode Sans SC",
    "Encode Sans Semi Condensed", "Encode Sans Semi Expanded", "Engagement", "Englebert", "Enriqueta", "Ephesis",
    "Erica One", "Esteban", "Estonia", "Euphoria Script", "Ewert", "Expletus Sans",
    "Explora", "Fahkwang", "Fanwood Text", "Farro", "Farsan", "Fascinate",
    "Fascinate Inline", "Fasthand", "Fauna One", "Federant", "Federo", "Felipa",
    "Fenix", "Festive", "Finger Paint", "Finlandica", "Fira Sans Condensed", "Fira Sans Extra Condensed",
    "Fjord One", "Flamenco", "Flavors", "Fleur De Leah", "Flow Block", "Flow Circular",
    "Flow Rounded", "Foldit", "Fondamento", "Fontdiner Swanky", "Forum", "Fragment Mono",
    "Francois One", "Fraunces", "Freckle Face", "Fredericka the Great", "Freehand", "Fresca",
    "Frijole", "Fruktur", "Fugaz One", "Fuggles", "Fuzzy Bubbles", "GFS Didot",
    "GFS Neohellenic", "Gabarito", "Gabriela", "Gaegu", "Gafata", "Gajraj One",
    "Galada", "Galdeano", "Galindo", "Gamja Flower", "Gantari", "Gasoek One",
    "Gayathri", "Gemunu Libre", "Genos", "Gentium Book Plus", "Gentium Plus", "Geo",
    "Geologica", "Georama", "Geostar", "Geostar Fill", "Germania One", "Gideon Roman",
    "Gidugu", "Gilda Display", "Girassol", "Glass Antiqua", "Glegoo", "Gloock",
    "Glory", "Gluten", "Goblin One", "Goldman", "Golos Text", "Gorditas",
    "Gothic A1", "Gotu", "Goudy Bookletter 1911", "Gowun Batang", "Gowun Dodum", "Graduate",
    "Grandiflora One", "Grandstander", "Grape Nuts", "Gravitas One", "Grechen Fuemen", "Grenze",
    "Grenze Gotisch", "Grey Qo", "Griffy", "Gruppo", "Gudea", "Gugi",
    "Gulzar", "Gupter", "Gurajada", "Gwendolyn", "Habibi", "Hachi Maru Pop",
    "Hahmlet", "Halant", "Hammersmith One", "Hanalei", "Hanalei Fill", "Handjet",
    "Hanken Grotesk", "Hanuman", "Happy Monkey", "Headland One", "Henny Penny", "Hepta Slab",
    "Hi Melody", "Hina Mincho", "Hind Guntur", "Hind Madurai", "Hind Siliguri", "Hind Vadodara",
    "Holtwood One SC", "Homenaje", "Hubballi", "Hurricane", "IBM Plex Sans Arabic", "IBM Plex Sans Condensed",
    "IBM Plex Sans Devanagari", "IBM Plex Sans Hebrew", "IBM Plex Sans JP", "IBM Plex Sans KR", "IBM Plex Sans Thai", "IBM Plex Sans Thai Looped",
    "IM Fell DW Pica", "IM Fell DW Pica SC", "IM Fell Double Pica", "IM Fell Double Pica SC", "IM Fell English", "IM Fell English SC",
    "IM Fell French Canon", "IM Fell French Canon SC", "IM Fell Great Primer", "IM Fell Great Primer SC", "Ibarra Real Nova", "Iceberg",
    "Iceland", "Imbue", "Imperial Script", "Imprima", "Inclusive Sans", "Inder",
    "Ingrid Darling", "Inika", "Inknut Antiqua", "Inria Sans", "Inria Serif", "Inspiration",
    "Instrument Serif", "Inter Tight", "Irish Grover", "Island Moments", "Istok Web", "Italiana",
    "Itim", "Jacques Francois", "Jacques Francois Shadow", "Jaldi", "Jim Nightshade", "Joan",
    "Jockey One", "Jolly Lodger", "Jomhuria", "Jomolhari", "Joti One", "Jua",
    "Julee", "Julius Sans One", "Junge", "Jura", "Just Me Again Down Here", "K2D",
    "Kablammo", "Kadwa", "Kaisei Decol", "Kaisei HarunoUmi", "Kaisei Opti", "Kaisei Tokumin",
    "Kameron", "Kantumruy Pro", "Karantina", "Karma", "Katibeh", "Kavivanar",
    "Kavoon", "Kdam Thmor Pro", "Keania One", "Kelly Slab", "Kenia", "Khand",
    "Khmer", "Khula", "Kings", "Kirang Haerang", "Kite One", "Kiwi Maru",
    "Klee One", "Knewave", "KoHo", "Kodchasan", "Koh Santepheap", "Kolker Brush",
    "Konkhmer Sleokchher", "Kosugi", "Kosugi Maru", "Kotta One", "Koulen", "Kranky",
    "Kristi", "Krub", "Kufam", "Kulim Park", "Kumar One", "Kumar One Outline",
    "Kumbh Sans", "Kurale", "La Belle Aurore", "Labrada", "Lacquer", "Laila",
    "Lakki Reddy", "Lancelot", "Langar", "Lateef", "Lavishly Yours", "League Gothic",
    "League Spartan", "Leckerli One", "Ledger", "Lekton", "Lemon", "Lemonada",
    "Lexend Exa", "Lexend Giga", "Lexend Mega", "Lexend Peta", "Lexend Tera", "Lexend Zetta",
    "Libre Barcode 128", "Libre Barcode 128 Text", "Libre Barcode 39", "Libre Barcode 39 Extended", "Libre Barcode 39 Extended Text", "Libre Barcode 39 Text",
    "Libre Barcode EAN13 Text", "Libre Bodoni", "Libre Caslon Display", "Libre Caslon Text", "Licorice", "Life Savers",
    "Lilita One", "Lily Script One", "Limelight", "Linden Hill", "Lisu Bosa", "Literata",
    "Liu Jian Mao Cao", "Livvic", "Londrina Outline", "Londrina Shadow", "Londrina Sketch", "Londrina Solid",
    "Long Cang", "Love Light", "Love Ya Like A Sister", "Loved by the King", "Lugrasimo", "Lumanosimo",
    "Lunasima", "Lusitana", "Lustria", "Luxurious Roman", "Luxurious Script", "M PLUS 1",
    "M PLUS 1 Code", "M PLUS 1p", "M PLUS 2", "M PLUS Code Latin", "M PLUS Rounded 1c", "Ma Shan Zheng",
    "Macondo", "Macondo Swash Caps", "Magra", "Maiden Orange", "Maitree", "Major Mono Display",
    "Mako", "Mali", "Mallanna", "Mandali", "Manjari", "Mansalva",
    "Manuale", "Marcellus SC", "Margarine", "Marhey", "Marko One", "Marmelad",
    "Martel", "Martel Sans", "Martian Mono", "Marvel", "Mate", "Mate SC",
    "Material Icons", "Material Icons Outlined", "Material Icons Round", "Material Icons Sharp", "Material Icons Two Tone", "Material Symbols Outlined",
    "Material Symbols Rounded", "Material Symbols Sharp", "McLaren", "Mea Culpa", "MedievalSharp", "Medula One",
    "Meera Inimai", "Megrim", "Meie Script", "Meow Script", "Merienda", "Merriweather Sans",
    "Metal", "Metal Mania", "Metamorphous", "Metrophobic", "Milonga", "Miltonian",
    "Miltonian Tattoo", "Mina", "Mingzat", "Miniver", "Miriam Libre", "Mirza",
    "Miss Fajardose", "Mochiy Pop One", "Mochiy Pop P One", "Modak", "Modern Antiqua", "Mogra",
    "Mohave", "Moirai One", "Molengo", "Molle", "Monda", "Monofett",
    "Monomaniac One", "Monsieur La Doulaise", "Montaga", "Montagu Slab", "MonteCarlo", "Montez",
    "Montserrat Alternates", "Montserrat Subrayada", "Moo Lah Lah", "Mooli", "Moon Dance", "Afacad",
    "Afacad Flux", "Agbalumo", "Agu Display", "Alan Sans", "Alumni Sans SC", "Amarna",
    "Ancizar Sans", "Ancizar Serif", "Annapurna SIL", "Anta", "Anton SC", "Arsenal SC",
    "Asimovian", "Asta Sans", "Atkinson Hyperlegible Mono", "Atkinson Hyperlegible Next", "BBH Bartle", "BBH Bogle",
    "BBH Hegarty", "Badeen Display", "Baskervville SC", "Beiruti", "Big Shoulders", "Big Shoulders Inline",
    "Big Shoulders Stencil", "Bitcount", "Bitcount Grid Double", "Bitcount Grid Double Ink", "Bitcount Grid Single", "Bitcount Grid Single Ink",
    "Bitcount Ink", "Bitcount Prop Double", "Bitcount Prop Double Ink", "Bitcount Prop Single", "Bitcount Prop Single Ink", "Bitcount Single",
    "Bitcount Single Ink", "Bodoni Moda SC", "Boldonse", "Bona Nova SC", "Bungee Tint", "Bytesized",
    "Cactus Classical Serif", "Cal Sans", "Cascadia Code", "Cascadia Mono", "Cause", "Chiron GoRound TC",
    "Chiron Hei HK", "Chiron Sung HK", "Chocolate Classical Sans", "Comic Relief", "Coral Pixels", "Cossette Texte",
    "Cossette Titre", "Danfo", "Doto", "Edu AU VIC WA NT Arrows", "Edu AU VIC WA NT Dots", "Edu AU VIC WA NT Guides",
    "Edu AU VIC WA NT Hand", "Edu AU VIC WA NT Pre", "Edu NSW ACT Cursive", "Edu NSW ACT Hand Pre", "Edu QLD Hand", "Edu SA Hand",
    "Edu VIC WA NT Hand", "Edu VIC WA NT Hand Pre", "Elms Sans", "Epunda Sans", "Epunda Slab", "Exile",
    "Faculty Glyphic", "Freeman", "Funnel Display", "Funnel Sans", "Fustat", "Ga Maamli",
    "Geist", "Geist Mono", "Geom", "Gidole", "Google Sans", "Google Sans Code",
    "Google Sans Flex", "Hedvig Letters Sans", "Hedvig Letters Serif", "Hind Mysuru", "Honk", "Host Grotesk",
    "Hubot Sans", "Huninn", "Iansui", "Intel One Mono", "Jacquard 12", "Jacquard 12 Charted",
    "Jacquard 24", "Jacquard 24 Charted", "Jacquarda Bastarda 9", "Jacquarda Bastarda 9 Charted", "Jaini", "Jaini Purva",
    "Jaro", "Jersey 10", "Jersey 10 Charted", "Jersey 15", "Jersey 15 Charted", "Jersey 20",
    "Jersey 20 Charted", "Jersey 25", "Jersey 25 Charted", "Kalnia", "Kalnia Glaze", "Kanchenjunga",
    "Kapakana", "Karla Tamil Inclined", "Karla Tamil Upright", "Kay Pho Du", "Kedebideri", "Kode Mono",
    "LXGW Marker Gothic", "LXGW WenKai Mono TC", "LXGW WenKai TC", "Libertinus Keyboard", "Libertinus Math", "Libertinus Mono",
    "Libertinus Sans", "Libertinus Serif", "Libertinus Serif Display", "Lilex", "Linefont", "Liter",
    "Madimi One", "Maname", "Manufacturing Consent", "Matangi", "Matemasie", "Material Symbols",
    "Menbere", "Micro 5", "Micro 5 Charted", "Moderustic", "Momo Signature", "Momo Trust Display",
    "Momo Trust Sans", "Mona Sans", "Monomakh", "Montserrat Underline", "Moul", "Moulpali",
    "Mountains of Christmas", "Mouse Memoirs", "Mozilla Headline", "Mozilla Text", "Mr Bedfort", "Mr De Haviland",
    "Mrs Sheppards", "Ms Madi", "Mukta", "Mukta Mahee", "Mukta Malar", "Mukta Vaani",
    "Murecho", "MuseoModerno", "My Soul", "Mynerve", "Mystery Quest", "NTR",
    "Nabla", "Namdhinggo", "Nanum Brush Script", "Nanum Gothic", "Nanum Gothic Coding", "Nanum Myeongjo",
    "Narnoor", "Nata Sans", "National Park", "Neonderthaw", "Nerko One", "New Amsterdam",
    "New Rocker", "New Tegomin", "News Cycle", "Newsreader", "Niconne", "Niramit",
    "Nixie One", "Nobile", "Nokora", "Nosifer", "Notable", "Noto Color Emoji",
    "Noto Emoji", "Noto Kufi Arabic", "Noto Music", "Noto Naskh Arabic", "Noto Nastaliq Urdu", "Noto Rashi Hebrew",
    "Noto Sans Adlam", "Noto Sans Adlam Unjoined", "Noto Sans Anatolian Hieroglyphs", "Noto Sans Arabic", "Noto Sans Armenian", "Noto Sans Avestan",
    "Noto Sans Balinese", "Noto Sans Bamum", "Noto Sans Bassa Vah", "Noto Sans Batak", "Noto Sans Bengali", "Noto Sans Bhaiksuki",
    "Noto Sans Brahmi", "Noto Sans Buginese", "Noto Sans Buhid", "Noto Sans Canadian Aboriginal", "Noto Sans Carian", "Noto Sans Caucasian Albanian",
    "Noto Sans Chakma", "Noto Sans Cham", "Noto Sans Cherokee", "Noto Sans Chorasmian", "Noto Sans Coptic", "Noto Sans Cuneiform",
    "Noto Sans Cypriot", "Noto Sans Cypro Minoan", "Noto Sans Deseret", "Noto Sans Devanagari", "Noto Sans Display", "Noto Sans Duployan",
    "Noto Sans Egyptian Hieroglyphs", "Noto Sans Elbasan", "Noto Sans Elymaic", "Noto Sans Ethiopic", "Noto Sans Georgian", "Noto Sans Glagolitic",
    "Noto Sans Gothic", "Noto Sans Grantha", "Noto Sans Gujarati", "Noto Sans Gunjala Gondi", "Noto Sans Gurmukhi", "Noto Sans HK",
    "Noto Sans Hanifi Rohingya", "Noto Sans Hanunoo", "Noto Sans Hatran", "Noto Sans Hebrew", "Noto Sans Imperial Aramaic", "Noto Sans Indic Siyaq Numbers",
    "Noto Sans Inscriptional Pahlavi", "Noto Sans Inscriptional Parthian", "Noto Sans JP", "Noto Sans Javanese", "Noto Sans KR", "Noto Sans Kaithi",
    "Noto Sans Kannada", "Noto Sans Kawi", "Noto Sans Kayah Li", "Noto Sans Kharoshthi", "Noto Sans Khmer", "Noto Sans Khojki",
    "Noto Sans Khudawadi", "Noto Sans Lao", "Noto Sans Lao Looped", "Noto Sans Lepcha", "Noto Sans Limbu", "Noto Sans Linear A",
    "Noto Sans Linear B", "Noto Sans Lisu", "Noto Sans Lycian", "Noto Sans Lydian", "Noto Sans Mahajani", "Noto Sans Malayalam",
    "Noto Sans Mandaic", "Noto Sans Manichaean", "Noto Sans Marchen", "Noto Sans Masaram Gondi", "Noto Sans Math", "Noto Sans Mayan Numerals",
    "Noto Sans Medefaidrin", "Noto Sans Meetei Mayek", "Noto Sans Mende Kikakui", "Noto Sans Meroitic", "Noto Sans Miao", "Noto Sans Modi",
    "Noto Sans Mongolian", "Noto Sans Mono", "Noto Sans Mro", "Noto Sans Multani", "Noto Sans Myanmar", "Noto Sans NKo",
    "Noto Sans NKo Unjoined", "Noto Sans Nabataean", "Noto Sans Nag Mundari", "Noto Sans Nandinagari", "Noto Sans New Tai Lue", "Noto Sans Newa",
    "Noto Sans Nushu", "Noto Sans Ogham", "Noto Sans Ol Chiki", "Noto Sans Old Hungarian", "Noto Sans Old Italic", "Noto Sans Old North Arabian",
    "Noto Sans Old Permic", "Noto Sans Old Persian", "Noto Sans Old Sogdian", "Noto Sans Old South Arabian", "Noto Sans Old Turkic", "Noto Sans Oriya",
    "Noto Sans Osage", "Noto Sans Osmanya", "Noto Sans Pahawh Hmong", "Noto Sans Palmyrene", "Noto Sans Pau Cin Hau", "Noto Sans PhagsPa",
    "Noto Sans Phoenician", "Noto Sans Psalter Pahlavi", "Noto Sans Rejang", "Noto Sans Runic", "Noto Sans SC", "Noto Sans Samaritan",
    "Noto Sans Saurashtra", "Noto Sans Sharada", "Noto Sans Shavian", "Noto Sans Siddham", "Noto Sans SignWriting", "Noto Sans Sinhala",
    "Noto Sans Sogdian", "Noto Sans Sora Sompeng", "Noto Sans Soyombo", "Noto Sans Sundanese", "Noto Sans Sunuwar", "Noto Sans Syloti Nagri",
    "Noto Sans Symbols", "Noto Sans Symbols 2", "Noto Sans Syriac", "Noto Sans Syriac Eastern", "Noto Sans Syriac Western", "Noto Sans TC",
    "Noto Sans Tagalog", "Noto Sans Tagbanwa", "Noto Sans Tai Le", "Noto Sans Tai Tham", "Noto Sans Tai Viet", "Noto Sans Takri",
    "Noto Sans Tamil", "Noto Sans Tamil Supplement", "Noto Sans Tangsa", "Noto Sans Telugu", "Noto Sans Thaana", "Noto Sans Thai",
    "Noto Sans Thai Looped", "Noto Sans Tifinagh", "Noto Sans Tirhuta", "Noto Sans Ugaritic", "Noto Sans Vai", "Noto Sans Vithkuqi",
    "Noto Sans Wancho", "Noto Sans Warang Citi", "Noto Sans Yi", "Noto Sans Zanabazar Square", "Noto Serif Ahom", "Noto Serif Armenian",
    "Noto Serif Balinese", "Noto Serif Bengali", "Noto Serif Devanagari", "Noto Serif Display", "Noto Serif Dives Akuru", "Noto Serif Dogra",
    "Noto Serif Ethiopic", "Noto Serif Georgian", "Noto Serif Grantha", "Noto Serif Gujarati", "Noto Serif Gurmukhi", "Noto Serif HK",
    "Noto Serif Hebrew", "Noto Serif Hentaigana", "Noto Serif JP", "Noto Serif KR", "Noto Serif Kannada", "Noto Serif Khitan Small Script",
    "Noto Serif Khmer", "Noto Serif Khojki", "Noto Serif Lao", "Noto Serif Makasar", "Noto Serif Malayalam", "Noto Serif Myanmar",
    "Noto Serif NP Hmong", "Noto Serif Old Uyghur", "Noto Serif Oriya", "Noto Serif Ottoman Siyaq", "Noto Serif SC", "Noto Serif Sinhala",
    "Noto Serif TC", "Noto Serif Tamil", "Noto Serif Tangut", "Noto Serif Telugu", "Noto Serif Thai", "Noto Serif Tibetan",
    "Noto Serif Todhri", "Noto Serif Toto", "Noto Serif Vithkuqi", "Noto Serif Yezidi", "Noto Traditional Nushu", "Noto Znamenny Musical Notation",
    "Nova Cut", "Nova Flat", "Nova Mono", "Nova Oval", "Nova Round", "Nova Script",
    "Nova Slim", "Nova Square", "Numans", "Nuosu SIL", "Odibee Sans", "Odor Mean Chey",
    "Offside", "Oi", "Ojuju", "Oldenburg", "Ole", "Oleo Script",
    "Oleo Script Swash Caps", "Oooh Baby", "Oranienbaum", "Orbit", "Oregano", "Orelega One",
    "Orienta", "Original Surfer", "Over the Rainbow", "Overlock", "Overlock SC", "Ovo",
    "Oxanium", "Oxygen", "Oxygen Mono", "PT Sans Caption", "PT Sans Narrow", "Padauk",
    "Padyakke Expanded One", "Palanquin", "Palanquin Dark", "Palette Mosaic", "Pangolin", "Paprika",
    "Parastoo", "Parkinsans", "Passero One", "Passions Conflict", "Pathway Extreme", "Pathway Gothic One",
    "Patrick Hand SC", "Pattaya", "Patua One", "Pavanam", "Paytone One", "Peddana",
    "Peralta", "Petemoss", "Petrona", "Phetsarath", "Philosopher", "Phudu",
    "Piazzolla", "Piedra", "Pirata One", "Pixelify Sans", "Plaster", "Platypi",
    "Playfair", "Playfair Display SC", "Playpen Sans", "Playpen Sans Arabic", "Playpen Sans Deva", "Playpen Sans Hebrew",
    "Playpen Sans Thai", "Playwrite AR", "Playwrite AR Guides", "Playwrite AT", "Playwrite AT Guides", "Playwrite AU NSW",
    "Playwrite AU NSW Guides", "Playwrite AU QLD", "Playwrite AU QLD Guides", "Playwrite AU SA", "Playwrite AU SA Guides", "Playwrite AU TAS",
    "Playwrite AU TAS Guides", "Playwrite AU VIC", "Playwrite AU VIC Guides", "Playwrite BE VLG", "Playwrite BE VLG Guides", "Playwrite BE WAL",
    "Playwrite BE WAL Guides", "Playwrite BR", "Playwrite BR Guides", "Playwrite CA", "Playwrite CA Guides", "Playwrite CL",
    "Playwrite CL Guides", "Playwrite CO", "Playwrite CO Guides", "Playwrite CU", "Playwrite CU Guides", "Playwrite CZ",
    "Playwrite CZ Guides", "Playwrite DE Grund", "Playwrite DE Grund Guides", "Playwrite DE LA", "Playwrite DE LA Guides", "Playwrite DE SAS",
    "Playwrite DE SAS Guides", "Playwrite DE VA", "Playwrite DE VA Guides", "Playwrite DK Loopet", "Playwrite DK Loopet Guides", "Playwrite DK Uloopet",
    "Playwrite DK Uloopet Guides", "Playwrite ES", "Playwrite ES Deco", "Playwrite ES Deco Guides", "Playwrite ES Guides", "Playwrite FR Moderne",
    "Playwrite FR Moderne Guides", "Playwrite FR Trad", "Playwrite FR Trad Guides", "Playwrite GB J", "Playwrite GB J Guides", "Playwrite GB S",
    "Playwrite GB S Guides", "Playwrite HR", "Playwrite HR Guides", "Playwrite HR Lijeva", "Playwrite HR Lijeva Guides", "Playwrite HU",
    "Playwrite HU Guides", "Playwrite ID", "Playwrite ID Guides", "Playwrite IE", "Playwrite IE Guides", "Playwrite IN",
    "Playwrite IN Guides", "Playwrite IS", "Playwrite IS Guides", "Playwrite IT Moderna", "Playwrite IT Moderna Guides", "Playwrite IT Trad",
    "Playwrite IT Trad Guides", "Playwrite MX", "Playwrite MX Guides", "Playwrite NG Modern", "Playwrite NG Modern Guides", "Playwrite NL",
    "Playwrite NL Guides", "Playwrite NO", "Playwrite NO Guides", "Playwrite NZ", "Playwrite NZ Guides", "Playwrite PE",
    "Playwrite PE Guides", "Playwrite PL", "Playwrite PL Guides", "Playwrite PT", "Playwrite PT Guides", "Playwrite RO",
    "Playwrite RO Guides", "Playwrite SK", "Playwrite SK Guides", "Playwrite TZ", "Playwrite TZ Guides", "Playwrite US Modern",
    "Playwrite US Modern Guides", "Playwrite US Trad", "Playwrite US Trad Guides", "Playwrite VN", "Playwrite VN Guides", "Playwrite ZA",
    "Playwrite ZA Guides", "Pochaevsk", "Podkova", "Poetsen One", "Poiret One", "Poller One",
    "Poltawski Nowy", "Poly", "Pompiere", "Ponnala", "Ponomar", "Pontano Sans",
    "Poor Story", "Port Lligat Sans", "Port Lligat Slab", "Potta One", "Pragati Narrow", "Praise",
    "Preahvihear", "Press Start 2P", "Pridi", "Princess Sofia", "Prociono", "Prosto One",
    "Protest Guerrilla", "Protest Revolution", "Protest Riot", "Protest Strike", "Proza Libre", "Puppies Play",
    "Puritan", "Purple Purse", "Qahiri", "Quando", "Quantico", "Quintessential",
    "Qwigley", "Qwitcher Grypen", "REM", "Racing Sans One", "Radio Canada", "Radio Canada Big",
    "Radley", "Raleway Dots", "Ramabhadra", "Ramaraja", "Rambla", "Rampart One",
    "Ranchers", "Rancho", "Ranga", "Rasa", "Rationale", "Ravi Prakash",
    "Readex Pro", "Recursive", "Red Hat Mono", "Red Rose", "Redacted", "Redacted Script",
    "Reddit Mono", "Reddit Sans", "Reddit Sans Condensed", "Redressed", "Reem Kufi Fun", "Reem Kufi Ink",
    "Reggae One", "Rethink Sans", "Revalia", "Rhodium Libre", "Ribeye", "Ribeye Marrow",
    "Risque", "Road Rage", "Roboto Flex", "Roboto Serif", "Rock 3D", "RocknRoll One",
    "Rokkitt", "Romanesco", "Ropa Sans", "Rosario", "Rosarivo", "Rouge Script",
    "Rowdies", "Rozha One", "Rubik 80s Fade", "Rubik Beastly", "Rubik Broken Fax", "Rubik Bubbles",
    "Rubik Burned", "Rubik Dirt", "Rubik Distressed", "Rubik Doodle Shadow", "Rubik Doodle Triangles", "Rubik Gemstones",
    "Rubik Glitch", "Rubik Glitch Pop", "Rubik Iso", "Rubik Lines", "Rubik Maps", "Rubik Marker Hatch",
    "Rubik Maze", "Rubik Microbe", "Rubik Mono One", "Rubik Moonrocks", "Rubik Pixels", "Rubik Puddles",
    "Rubik Scribble", "Rubik Spray Paint", "Rubik Storm", "Rubik Vinyl", "Rubik Wet Paint", "Ruda",
    "Ruge Boogie", "Ruluko", "Rum Raisin", "Ruslan Display", "Ruthie", "Ruwudu",
    "Rye", "STIX Two Text", "SUSE", "SUSE Mono", "Sahitya", "Sail",
    "Saira Extra Condensed", "Saira Semi Condensed", "Saira Stencil One", "Salsa", "Sancreek", "Sankofa Display",
    "Sansation", "Sansita", "Sansita Swashed", "Sarala", "Sarina", "Sarpanch",
    "Sassy Frass", "Savate", "Sawarabi Gothic", "Sawarabi Mincho", "Scada", "Scheherazade New",
    "Science Gothic", "Scope One", "Seaweed Script", "Secular One", "Sedan", "Sedan SC",
    "Sedgwick Ave", "Sedgwick Ave Display", "Sekuya", "Sen", "Send Flowers", "Sevillana",
    "Seymour One", "Shadows Into Light Two", "Shafarik", "Shalimar", "Shantell Sans", "Shanti",
    "Share", "Share Tech", "Share Tech Mono", "Shippori Antique", "Shippori Antique B1", "Shippori Mincho",
    "Shippori Mincho B1", "Shizuru", "Shojumaru", "Short Stack", "Shrikhand", "Siemreap",
    "Sigmar", "Silkscreen", "Simonetta", "Single Day", "Sintony", "Sirin Stencil",
    "Sirivennela", "Six Caps", "Sixtyfour", "Sixtyfour Convergence", "Skranji", "Slabo 13px",
    "Slabo 27px", "Slackey", "Slackside One", "Smokum", "Smooch", "Smooch Sans",
    "Smythe", "Sniglet", "Snippet", "Snowburst One", "Sofadi One", "Sofia",
    "Sofia Sans", "Sofia Sans Condensed", "Sofia Sans Extra Condensed", "Sofia Sans Semi Condensed", "Solitreo", "Solway",
    "Sometype Mono", "Song Myung", "Sono", "Sonsie One", "Sorts Mill Goudy", "Sour Gummy",
    "Source Sans 3", "Source Serif 4", "Special Gothic", "Special Gothic Condensed One", "Special Gothic Expanded One", "Spectral SC",
    "Spicy Rice", "Spinnaker", "Spirax", "Splash", "Spline Sans", "Spline Sans Mono",
    "Squada One", "Square Peg", "Sree Krushnadevaraya", "Srisakdi", "Stack Sans Headline", "Stack Sans Notch",
    "Stack Sans Text", "Stalemate", "Stalinist One", "Stardos Stencil", "Stick", "Stick No Bills",
    "Stint Ultra Condensed", "Stint Ultra Expanded", "Stoke", "Story Script", "Strait", "Style Script",
    "Stylish", "Sue Ellen Francisco", "Sulphur Point", "Sumana", "Sunflower", "Sunshiney",
    "Supermercado One", "Sura", "Suranna", "Suravaram", "Suwannaphum", "Swanky and Moo Moo",
    "Syncopate", "Syne Mono", "Syne Tactile", "TASA Explorer", "TASA Orbiter", "Tac One",
    "Tagesschrift", "Tai Heritage Pro", "Tapestry", "Taprom", "Tauri", "Taviraj",
    "Teachers", "Tektur", "Telex", "Tenali Ramakrishna", "Tenor Sans", "Text Me One",
    "Texturina", "Thasadith", "The Girl Next Door", "The Nautigal", "Tienne", "TikTok Sans",
    "Tillana", "Tilt Neon", "Tilt Prism", "Tilt Warp", "Timmana", "Tinos",
    "Tiny5", "Tiro Bangla", "Tiro Devanagari Hindi", "Tiro Devanagari Marathi", "Tiro Devanagari Sanskrit", "Tiro Gurmukhi",
    "Tiro Kannada", "Tiro Tamil", "Tiro Telugu", "Tirra", "Tomorrow", "Tourney",
    "Trade Winds", "Train One", "Triodion", "Trispace", "Trocchi", "Trochut",
    "Truculenta", "Trykker", "Tsukimi Rounded", "Tuffy", "Tulpen One", "Turret Road",
    "Twinkle Star", "Ubuntu Condensed", "Ubuntu Mono", "Ubuntu Sans", "Ubuntu Sans Mono", "Uchen",
    "Ultra", "Uncial Antiqua", "Underdog", "Unica One", "UnifrakturCook", "UnifrakturMaguntia",
    "Unkempt", "Unlock", "Unna", "UoqMunThenKhung", "Updock", "VT323",
    "Vampiro One", "Varela", "Varta", "Vast Shadow", "Vend Sans", "Vesper Libre",
    "Viaoda Libre", "Vibes", "Vibur", "Victor Mono", "Viga", "Vina Sans",
    "Voces", "Volkhov", "Vollkorn SC", "Voltaire", "Vujahday Script", "WDXL Lubrifont JP N",
    "WDXL Lubrifont SC", "WDXL Lubrifont TC", "Waiting for the Sunrise", "Wallpoet", "Warnes", "Water Brush",
    "Waterfall", "Wavefont", "Wellfleet", "Wendy One", "Whisper", "Winky Rough",
    "Winky Sans", "Wire One", "Wittgenstein", "Wix Madefor Display", "Wix Madefor Text", "Workbench",
    "Xanh Mono", "Yaldevi", "Yantramanav", "Yarndings 12", "Yarndings 12 Charted", "Yarndings 20",
    "Yarndings 20 Charted", "Yatra One", "Yeon Sung", "Yomogi", "Young Serif", "Yrsa",
    "Ysabeau", "Ysabeau Infant", "Ysabeau Office", "Ysabeau SC", "Yuji Boku", "Yuji Hentaigana Akari",
    "Yuji Hentaigana Akebono", "Yuji Mai", "Yuji Syuku", "Yusei Magic", "ZCOOL KuaiLe", "ZCOOL QingKe HuangYou",
    "ZCOOL XiaoWei", "Zain", "Zalando Sans", "Zalando Sans Expanded", "Zalando Sans SemiExpanded", "Zen Antique",
    "Zen Antique Soft", "Zen Dots", "Zen Kaku Gothic Antique", "Zen Kaku Gothic New", "Zen Kurenaido", "Zen Loop",
    "Zen Maru Gothic", "Zen Old Mincho", "Zen Tokyo Zoo", "Zeyada", "Zhi Mang Xing", "Zilla Slab Highlight"
  ];

var ALL_FONT_NAMES = SYSTEM_FONTS.concat(GOOGLE_FONTS);
var _ldLoadedFonts = {};
function ensureFontLoadedV2(name, cb) {
  if (!name || SYSTEM_FONTS.indexOf(name) > -1 || _ldLoadedFonts[name]) { cb && cb(); return; }
  _ldLoadedFonts[name] = 1;
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@400;600;700&display=swap';
  l.onload = function () { setTimeout(function () { cb && cb(); }, 60); };
  l.onerror = function () { cb && cb(); };
  document.head.appendChild(l);
  setTimeout(function () { cb && cb(); }, 2500);
}
window.loadDeckFonts = function (names, done) {
  var todo = (names || []).filter(function (n) { return n && SYSTEM_FONTS.indexOf(n) === -1 && !_ldLoadedFonts[n]; });
  if (!todo.length) { done && done(); return; }
  var left = todo.length, fired = false;
  function one() { left--; if (left <= 0 && !fired) { fired = true; done && done(); } }
  todo.forEach(function (n) { ensureFontLoadedV2(n, one); });
  setTimeout(function () { if (!fired) { fired = true; done && done(); } }, 4000);
};
Editor._register({
  __qFonts: function () { return ALL_FONT_NAMES; },
  fontFamily: function (name) {
    var o = fc.getActiveObject();
    if (!o || !/text/.test(o.type || '')) { showToast('Select a text box first'); return; }
    ensureFontLoadedV2(name, function () { fc.renderAll(); });
    o.set('fontFamily', name);
    if (o.styles) {
      Object.keys(o.styles).forEach(function (li) {
        Object.keys(o.styles[li]).forEach(function (ci) { o.styles[li][ci].fontFamily = name; });
      });
      if (o.initDimensions) o.initDimensions();
    }
    o.dirty = true; fc.renderAll(); saveState();
    Editor._emit('selection', Editor.query('selection'));
  }
});

/* ── AI: compose-append engine (v1 verbatim) ── */
window.ldComposeAppend = async function (sentence, opts) {
    opts = opts || {};
    if (!window.LD_BACKEND) { say('Designer backend not reachable from here'); return 0; }
    /* 20 Aug 2026 (Fable) — same proper token wait as ldCompose. */
    if (window.ldWaitAuthToken) await window.ldWaitAuthToken(30000);
    else for (var w = 0; w < 10 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });

    var r;
    try {
      r = await fetch(window.LD_BACKEND + '/compose_ir', {
        method: 'POST',
        headers: window.ldHeaders ? window.ldHeaders('application/json') : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: sentence })
      });
    } catch (e) { say('Could not reach the design service — nothing was changed'); return 0; }

    if (r.status === 401 || r.status === 403) { say('Please sign in on the main site first 🔐'); return 0; }
    if (!r.ok) { say('The design service returned an error (' + r.status + ') — nothing was changed'); return 0; }

    var d; try { d = await r.json(); } catch (e) { say('The reply could not be read — nothing was changed'); return 0; }
    var deck = (d && d.deck) ? d.deck : null;
    var slides = (deck && deck.slides) || [];
    var plan = (d && d.plan) || (deck && deck._plan) || [];
    if (!slides.length) { say('The design service sent no slides back — nothing was changed'); return 0; }
    if (d && d.designNo != null) window.LD_DESIGN_NO = d.designNo;

    function kindAt(i) {
      var p = String(plan[i] || '');
      var c = p.lastIndexOf(':');
      return c > -1 ? p.slice(c + 1) : '';
    }

    /* choose which of the returned slides are actually wanted */
    var picked = [];
    if (opts.onlyMockups) {
      slides.forEach(function (s, i) { if (kindAt(i) === 'mockup') picked.push(s); });
      if (!picked.length) { say('No mock-up slides came back — nothing was changed'); return 0; }
    } else if (opts.prefer) {
      var exact = [], rest = [];
      slides.forEach(function (s, i) {
        var k = kindAt(i);
        if (k === 'mockup') return;
        (k === opts.prefer ? exact : rest).push(s);
      });
      picked = exact.concat(rest);
    } else {
      slides.forEach(function (s, i) { if (kindAt(i) !== 'mockup') picked.push(s); });
    }
    if (opts.keep) picked = picked.slice(0, opts.keep);
    if (!picked.length) { say('Nothing matched — nothing was changed'); return 0; }

    /* the same slide ceiling the rest of the editor keeps */
    var _max = (typeof ldMaxSlides === 'function') ? ldMaxSlides() : 500;
    var room = _max - state.pages.length;
    if (room <= 0) { say('Maximum ' + _max + ' slides — remove one first'); return 0; }
    if (picked.length > room) { picked = picked.slice(0, room); say('Only ' + room + ' more slides fit (' + _max + ' max)'); }

    /* fonts first, exactly as loadDeckIRIntoEditor does, or the new slides
       paint in a fallback face for a second and reflow */
    try {
      var fs = {};
      picked.forEach(function (s) {
        (s.elements || []).forEach(function (e) {
          if (e.type === 'text' && e.paragraphs) e.paragraphs.forEach(function (p) {
            (p.runs || []).forEach(function (rn) { if (rn.font) fs[rn.font] = 1; });
          });
        });
      });
      var names = Object.keys(fs);
      if (window.loadDeckFonts && names.length) await new Promise(function (res) { window.loadDeckFonts(names, res); });
    } catch (e) {}

    /* SPLICE, never assign — the deck that is open is untouched */
    try { captureCurrentPage(); } catch (e) {}
    var at = (state.currentPage == null ? state.pages.length - 1 : state.currentPage) + 1;
    picked.forEach(function (slideIR, i) {
      var page = makeBlankPage(Date.now() + i);
      page.ir = slideIR;
      state.pages.splice(at + i, 0, page);
      state.notes.splice(at + i, 0, '');
    });
    /* keep the deck IR in step so saving and exporting see the new slides */
    try {
      if (window._deckIR && window._deckIR.slides) {
        Array.prototype.splice.apply(window._deckIR.slides, [at, 0].concat(picked));
      }
    } catch (e) {}

    state.currentPage = at;
    /* the slides are ALREADY spliced into the deck — a hiccup while drawing
       the first one must not bubble up as "Could not add the slides" when
       they were in fact added (audit 53) */
    try { await loadPageIntoCanvas(state.currentPage); }
    catch (e) { try { console.warn('[ai] drew with a minor issue after insert', e); } catch (e2) {} }
    try { renderPageThumbs && renderPageThumbs(); } catch (e) {}
    try { pageRefresh && pageRefresh(); } catch (e) {}
    try { saveState && saveState(); } catch (e) {}
    return picked.length;
  };

/* pageRefresh shim — ldComposeAppend calls it after splicing slides */
function pageRefresh() { renderPageThumbs(); }

/* ── AI panel commands ── */
(function () {
  function busy(on, msg) { showToast(msg || (on ? 'Working…' : 'Done'), on ? 60000 : 1200); }
  function say(m) { showToast(m, 4000); }
  /* the canvas size picked on the card is applied HERE, after the design
     lands — so it is exact whatever the composer made of the ratio */
  function applyChosenSize(key) {
    if (!key || key === 'custom' || key === '16 9' || key === '16:9') return;
    try { Editor.run('pageSize', key); } catch (e) {}
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function styleClause() {
    return window.LD_DESIGN_NO != null ? ('use design ' + window.LD_DESIGN_NO + ' style, ') : '';
  }
  async function aiText(kind) {
    var o = fc.getActiveObject();
    if (!o || !/text/.test(o.type || '')) { say('Click a text box on the slide first, then press ' + (kind === 'translate' ? 'Translate' : kind === 'rewrite' ? 'Rewrite' : 'Summarize')); return; }
    var src = (o.text || '').trim();
    if (!src) { say('That text box is empty'); return; }
    var prompt;
    if (kind === 'rewrite') prompt = 'Rewrite this presentation text so it is clearer and punchier. Keep the same meaning and roughly the same length. Reply with the rewritten text only, no preamble:\n\n' + src;
    else if (kind === 'summarize') prompt = 'Summarise this into one short slide-friendly line. Reply with the line only:\n\n' + src;
    else {
      var lang = await window.ldPrompt('Translate into which language?', '', 'Urdu');   /* 20 Aug 2026 — prompt() dies in the desktop app */
      if (!lang) return;
      prompt = 'Translate this into ' + lang + '. Keep it natural and slide-friendly. Reply with the translation only. If "' + lang + '" is not a real language you can translate into, reply with exactly the single word ERR and nothing else:\n\n' + src;
    }
    say(kind === 'translate' ? 'Translating…' : kind === 'rewrite' ? 'Rewriting…' : 'Summarising…');
    try {
      var r = await fetch(window.LD_CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      var t = d && (d.reply || d.text || d.message || d.answer);
      if (!t) throw new Error('empty reply');
      t = String(t).replace(/^ACTION:.*$/gm, '').trim();
      /* 21 Aug 2026 — a conversational reply is NOT content. Refuse it. */
      var chatter = /^ERR\b/.test(t) || /\b(I'm|I am|I can|I cannot|I don't|I do not|as an AI|not familiar|sorry|unfortunately|could you|please provide)\b/i.test(t.slice(0, 160)) || t.length > src.length * 3 + 80;
      if (chatter) { say(kind === 'translate' ? 'Could not translate — check the language name and try again' : 'The AI did not return usable text — try again'); return; }
      o._aiBefore = o.text;
      /* 21 Aug 2026 — the renderer squeezes text to its box with scaleX /
         charSpacing; new words under the old squeeze came out mangled.
         Undo the squeeze, keep the box width, let the height grow. */
      var _sy = o.scaleY || 1;
      o.set({ text: t, scaleX: _sy, charSpacing: 0 });
      if (o.initDimensions) o.initDimensions();
      o.setCoords(); o.dirty = true; fc.renderAll(); saveState();
      say((kind === 'translate' ? 'Translated' : kind === 'rewrite' ? 'Rewritten' : 'Summarised') + ' ✓ — Ctrl+Z to undo');
    } catch (e) { say('AI text failed: ' + e.message); }
  }
  /* 21 Aug 2026 — Remove background: the selected photo goes to the dissolve
     service (/remove_bg, rembg) and comes back as a transparent PNG. */
  async function removeBackground() {
    var o = fc.getActiveObject();
    if (!o || o.type !== 'image') { say('Click a photo on the slide first, then press Remove background'); return; }
    if (/^data:image\/svg/.test(o.src || '') || o.svgText) { say('That is a vector graphic — it has no background to remove'); return; }
    var base = String(window.LD_DISSOLVE_URL || '').replace(/\/$/, '');
    if (!base) { say('Background service not configured'); return; }
    say('Removing background…');
    try {
      var el = o._originalElement || o._element;
      var blob;
      try {
        var c = document.createElement('canvas'); c.width = el.naturalWidth || el.width; c.height = el.naturalHeight || el.height;
        c.getContext('2d').drawImage(el, 0, 0);
        blob = await new Promise(function (res) { c.toBlob(res, 'image/png'); });
      } catch (e) { blob = null; }
      if (!blob) { var r0 = await fetch(o.getSrc ? o.getSrc() : o.src); blob = await r0.blob(); }
      var fd = new FormData(); fd.append('file', blob, 'image.png');
      var headers = {};
        if (window.ldWaitAuthToken) await window.ldWaitAuthToken(15000);
      if (window.LD_AUTH_TOKEN) headers['Authorization'] = 'Bearer ' + window.LD_AUTH_TOKEN;
      var r = await fetch(base + '/remove_bg', { method: 'POST', headers: headers, body: fd });
      if (!r.ok) {
        var det = ''; try { det = ((JSON.parse(await r.text()) || {}).message) || ''; } catch (e2) {}
        say(det || ('Background removal failed (' + r.status + ')'), 8000); return;
      }
      var out = await r.blob();
      var url = await new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(out); });
      o.setSrc(url, function () {
        o.src = url; delete o.irId; /* a new picture — export it as such */
        fc.renderAll(); saveState(); say('Background removed ✓ — Ctrl+Z to undo');
        if (window.ldRefreshTokens) window.ldRefreshTokens();
      }, { crossOrigin: 'anonymous' });
    } catch (e) { say('Background removal failed: ' + e.message, 6000); }
  }
  var _aiRunning = false;
  Editor._register({
    ai: function (a) {
      var kind = a && a.kind;
      if (['rewrite', 'summarize', 'translate'].indexOf(kind) > -1) { aiText(kind); return; }
      if (kind === 'removeBg') { removeBackground(); return; }
      if (_aiRunning) { say('Still working on the previous run — one at a time'); return; }
      /* 20 Aug 2026 (Fable) — window.prompt() does not exist in Electron, so
         every one of these buttons died with "Command failed: ai" inside the
         desktop app. All asks now go through ldPrompt (an in-page modal that
         works everywhere); the flow is async but otherwise unchanged. */
      (async function () {
      if (kind === 'deck') {
        if (state.pages.length > 1 && !(await window.ldConfirm('This builds a NEW deck and replaces the ' + state.pages.length + ' slides open here.\n\nReplace everything?', 'Replace'))) return;
        /* 20 Aug 2026 (Fable, Javed's order) — the SAME form Hexa shows on the
           site, right here in the editor. It builds the exact order sentence
           the grammar reads; the free-text box on top still accepts anything. */
        var f0 = await window.ldDesignForm({ title: 'Make a design' });
        if (!f0 || !f0.sentence) return;
        _aiRunning = true; busy(true, 'Designing in the cloud… a big deck can take a few minutes');
        window.ldCompose(f0.sentence).then(function () { _aiRunning = false; applyChosenSize(f0.size); })
          .catch(function (e) { _aiRunning = false; say('Compose failed: ' + e.message); });
        return;
      }
      if (kind === 'prepare') {
        var pr = await window.ldPrepareModal();
        if (!pr) return;
        _aiRunning = true;
        (async function () {
          try {
            if (pr.pptx) { busy(true, 'Opening your design…'); await window.ldImportPptxFile(pr.pptx); }
            else if (pr.composedDeck) { busy(true, 'Loading design…'); await window.loadDeckIRIntoEditor(pr.composedDeck); }
            busy(true, 'Writing your slides — Hexa + the writers are on it…');
            var deckIR = await buildEffectiveDeckIR();
            var r = await fetch(window.LD_FILL_URL, { method: 'POST', headers: window.ldHeaders('application/json'), body: JSON.stringify({ design: deckIR, content: pr.content, qa: true, allowClone: pr.allowClone, expand: pr.expand }) });
            if (!r.ok) {
              var em = ''; try { em = ((await r.json()) || {}).message || ((await r.json()) || {}).error || ''; } catch (e2) {}
              say('Could not prepare the deck: ' + (em || ('HTTP ' + r.status)), 8000);
            } else {
              var fd = await r.json();
              await window.loadDeckIRIntoEditor(fd.deck || fd);
              if (window.ldRefreshTokens) window.ldRefreshTokens();
              say('Presentation ready ✓');
            }
          } catch (e) { say('Prepare failed: ' + e.message, 8000); }
          _aiRunning = false;
        })();
        return;
      }
      if (kind === 'preparePresentation') {
        /* 20 Aug 2026 (Fable, Javed's order) — design + YOUR content, one flow:
           Hexa composes the design, then the model cascade (Haiku fills →
           Sonnet fixes → Opus reviews) rewrites every text region from the
           content box. The key never leaves the cloud (ai_fill_http). */
        if (state.pages.length > 1 && !(await window.ldConfirm('This builds a NEW presentation and replaces the ' + state.pages.length + ' slides open here.\n\nReplace everything?', 'Replace'))) return;
        var fp = await window.ldDesignForm({ title: 'Create presentation', content: true });
        if (!fp || !fp.sentence) return;
        _aiRunning = true; busy(true, 'Designing in the cloud…');
        (async function () {
          try {
            await window.ldCompose(fp.sentence);
            applyChosenSize(fp.size);
            if (fp.content && fp.content.trim()) {
              busy(true, 'Filling your content — Hexa + the writers are on it…');
              var deckIR = await buildEffectiveDeckIR();
              var r = await fetch(window.LD_FILL_URL, {
                method: 'POST', headers: window.ldHeaders('application/json'),
                body: JSON.stringify({ design: deckIR, content: fp.content, qa: true })
              });
              if (!r.ok) {
                var em = ''; try { em = ((await r.json()) || {}).error || ''; } catch (e2) {}
                say('Design is ready, but filling failed: ' + (em || ('HTTP ' + r.status)), 8000);
              } else {
                var fd = await r.json();
                await window.loadDeckIRIntoEditor(fd.deck || fd);
                say('Presentation ready ✓');
              }
            }
          } catch (e) { say('Create presentation failed: ' + e.message, 8000); }
          _aiRunning = false;
        })();
        return;
      }
      if (kind === 'slide') {
        /* 21 Aug 2026 (Javed) — no questions: one more slide in this deck's style */
        _aiRunning = true; busy(true, 'Designing one slide…');
        window.ldComposeAppend(styleClause() + 'one more slide in this style, 3 slides', { keep: 1 })
          .then(function (n) { _aiRunning = false; if (n) say('Slide added ✓'); })
          .catch(function (e) { _aiRunning = false; say('Could not add the slide: ' + (e && e.message || e)); });
        return;
      }
      if (kind === 'addSlides') {
        var howMany = await window.ldPrompt('How many more slides in this style?', '', '5');
        if (!howMany) return;
        var n = Math.max(1, Math.min(20, parseInt(String(howMany).replace(/[^0-9]/g, ''), 10) || 0));
        if (!n) { say('Give a number between 1 and 20'); return; }
        var about = (await window.ldPrompt('Anything in particular?', 'optional — e.g. "more charts", or leave blank', '')) || '';
        if (window.LD_DESIGN_NO == null && !about.trim()) {
          about = (await window.ldPrompt('This deck has no design number, so describe the look:', 'e.g. "dark navy corporate pitch deck"', '')) || '';
          if (!about.trim()) { say('Nothing to go on — cancelled'); return; }
        }
        /* 21 Aug 2026 — plain words become the weights the grammar reads */
        about = about.trim()
          .replace(/\b(more |add |with |some )?(charts?|graphs?)\b/ig, 'high graphs')
          .replace(/\b(more |add |with |some )?(pictures?|photos?|images?|mock-?ups?)\b/ig, 'high images')
          .replace(/\b(more |add |with |some )?(text|words)\b/ig, 'high text');
        _aiRunning = true; busy(true, 'Adding ' + plural(n, 'slide') + '…');
        window.ldComposeAppend(styleClause() + about + (about ? ', ' : '') + (n + 2) + ' slides', { keep: n })
          .then(function (added) { _aiRunning = false; if (added) say(plural(added, 'slide') + ' added ✓'); })
          .catch(function (e) { _aiRunning = false; say('Could not add the slides: ' + (e && e.message || e)); });
        return;
      }
      if (kind === 'mockups') {
        var hm = await window.ldPrompt('How many mock-up slides?', '', '3');
        if (!hm) return;
        var m = Math.max(1, Math.min(20, parseInt(String(hm).replace(/[^0-9]/g, ''), 10) || 0));
        if (!m) { say('Give a number between 1 and 20'); return; }
        _aiRunning = true; busy(true, 'Adding ' + plural(m, 'mock-up slide') + '…');
        window.ldComposeAppend(styleClause() + (m + 2) + ' slides, ' + m + ' mockup slides', { onlyMockups: true, keep: m })
          .then(function (added) { _aiRunning = false; if (added) say(plural(added, 'mock-up slide') + ' added ✓'); })
          .catch(function () { _aiRunning = false; say('Could not add the mock-ups'); });
        return;
      }
      })().catch(function (e) { say('AI failed: ' + e.message); });
    }
  });
})();

/* ═════════ ldDesignForm — Hexa's design form, inside the editor ═════════
   (20 Aug 2026, Fable, Javed's order.) The same boxes the site's promptbox
   shows, rendered as an editor modal. Every filled box becomes a phrase the
   order grammar (orders.js) already reads — the free-text line rides on top.
   opts.content:true adds the "Your content" textarea (Create presentation).
   Resolves { sentence, content } or null on cancel. */
window.LD_FILL_URL = 'https://ai-fill-http-irosbvpq7q-uc.a.run.app';
window.ldDesignForm = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-form-overlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'ld-form-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:14px;' +
      'padding:22px 24px;width:min(640px,94vw);max-height:90vh;overflow:auto;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:"DM Sans",system-ui,sans-serif;color:#e8e9f2;';
    box.innerHTML = '<div style="font-size:16px;font-weight:700;margin-bottom:4px;">' +
      (opts.title || 'Make a design') + '</div>' +
      '<div style="font-size:12px;color:#a9abc4;margin-bottom:14px;">Describe it — or fill any boxes below for more precision. Empty boxes mean "you decide".</div>';

    function field(label, el) {
      var w = document.createElement('div');
      var l = document.createElement('div');
      l.textContent = label;
      l.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.06em;color:#8b8ea8;text-transform:uppercase;margin:0 0 4px;';
      w.appendChild(l); w.appendChild(el);
      return w;
    }
    var inpCss = 'width:100%;box-sizing:border-box;background:#0e0f1a;color:#fff;border:1px solid #34365a;' +
      'border-radius:8px;padding:8px 10px;font-size:13px;outline:none;';
    function txt(ph) { var i = document.createElement('input'); i.type = 'text'; i.placeholder = ph || ''; i.style.cssText = inpCss; return i; }
    function sel(values) {
      var s = document.createElement('select'); s.style.cssText = inpCss;
      ['Any'].concat(values).forEach(function (v) {
        var o = document.createElement('option'); o.value = v === 'Any' ? '' : v; o.textContent = v; s.appendChild(o);
      });
      return s;
    }

    var fDesc = txt('e.g. a fintech pitch deck for investors');
    fDesc.style.marginBottom = '12px';
    box.appendChild(field('Describe your design', fDesc));

    /* 21 Aug 2026 (Fable, Javed's order) — THE SAME CARD AS THE SITE. Every
       field, label, option list and the order wording come from the shared
       design_form_data.js (generated from design_widget.js), so the editor
       and Hexa's page can never drift apart again. */
    var D = window.LD_DESIGN_DATA;
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;';
    var F = {};
    function selFrom(pairs, noAny) {
      var s = document.createElement('select'); s.style.cssText = inpCss;
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = noAny ? 'None' : 'Any'; s.appendChild(o0);
      pairs.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; s.appendChild(o); });
      return s;
    }
    D.FIELDS.forEach(function (f) {
      var el;
      if (f[2] === 'sel') el = selFrom(D[f[3]], !!f[4]);
      else { el = txt(f[3]); if (f[2] === 'num') { el.type = 'number'; el.min = '1'; } }
      F[f[0]] = el;
      grid.appendChild(field(f[1], el));
    });
    /* Template type narrows Sub-Category to that type's own slice (same as the site) */
    function applySlice() {
      var keep = F.type.value;
      var list = D.SUBCAT_BY_TYPE[F.contentType.value] || D.TYPE.map(function (p) { return p[0]; });
      var lab = {}; D.TYPE.forEach(function (p) { lab[p[0]] = p[1]; });
      F.type.innerHTML = '';
      var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Any'; F.type.appendChild(o0);
      list.forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = lab[v] || v; if (v === keep) o.selected = true; F.type.appendChild(o); });
    }
    F.contentType.addEventListener('change', applySlice);
    F.aspectRatio.addEventListener('change', function () {
      if (F.aspectRatio.value !== 'custom') return;
      window.ldPrompt('Custom size — width x height in pixels', 'e.g. 1200x800').then(function (v) {
        var m = /^\s*(\d{2,5})\s*[x×X*,]\s*(\d{2,5})\s*$/.exec(String(v || ''));
        if (!m) { F.aspectRatio.value = ''; return; }
        var o = document.createElement('option'); o.value = m[1] + 'x' + m[2]; o.textContent = 'Custom ' + m[1] + ' x ' + m[2] + ' px';
        F.aspectRatio.appendChild(o); F.aspectRatio.value = o.value; refreshPreview();
      });
    });
    box.appendChild(grid);
    /* live preview — exactly what Hexa is told */
    var prev = document.createElement('div');
    prev.style.cssText = 'font-size:11px;color:#8b8ea8;line-height:1.5;margin-top:10px;min-height:14px;';
    box.appendChild(prev);
    function sentenceNow() { return D.orderSentence(function (id) { return F[id] ? F[id].value : ''; }, fDesc.value); }
    function refreshPreview() { var t = sentenceNow(); prev.textContent = t ? ('Your order: ' + t) : ''; }
    box.addEventListener('input', refreshPreview); box.addEventListener('change', refreshPreview);

    var fContent = null;
    if (opts.content) {
      fContent = document.createElement('textarea');
      fContent.placeholder = 'Paste your content here — headings and text for the slides…';
      fContent.style.cssText = inpCss + 'min-height:110px;resize:vertical;margin-top:12px;';
      var cw = field('Your content (the slides are written from this)', fContent);
      cw.style.marginTop = '12px';
      box.appendChild(cw);
    }

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px;';
    function btn(label, primary) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'border:0;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;' +
        (primary ? 'background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;' : 'background:#23243a;color:#c9cbe0;');
      return b;
    }
    var cancel = btn('Cancel', false);
    var ok = btn(opts.content ? 'Create presentation →' : 'Make my design →', true);
    row.appendChild(cancel); row.appendChild(ok);
    box.appendChild(row);
    ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(function () { fDesc.focus(); }, 30);

    function close(val) { ov.remove(); resolve(val); }
    cancel.onclick = function () { close(null); };
    ov.onmousedown = function (e) { if (e.target === ov) close(null); };
    ok.onclick = function () {
      var sentence = sentenceNow();
      if (!sentence) { fDesc.focus(); return; }
      close({ sentence: sentence, content: fContent ? fContent.value : '', size: F.aspectRatio ? F.aspectRatio.value : '' });
    };
  });
};

/* ═════════ ldPrepareModal — "Prepare my presentation" (21 Aug 2026, Javed) ═════════
   The same card Hexa shows on the site: paste your content or load a .txt /
   .docx, pick the design (the deck open here, or drop a .pptx), and the
   writers fill every slide from your content (ai_fill — costs fillPerSlide
   tokens per slide). Resolves when done; never touches the design if the
   fill fails. */
window.ldPrepareModal = function () {
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-prep-overlay'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ld-prep-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:"DM Sans",system-ui,sans-serif;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:14px;padding:22px 24px;width:min(720px,94vw);max-height:90vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.5);color:#e8e9f2;';
    var inp = 'width:100%;box-sizing:border-box;background:#0e0f1a;color:#fff;border:1px solid #34365a;border-radius:8px;padding:9px 10px;font-size:13px;outline:none;';
    var drop = 'border:1.5px dashed #4a4d78;border-radius:10px;padding:18px 12px;text-align:center;font-size:12.5px;color:#a9abc4;cursor:pointer;background:#0e0f1a;';
    var deckName = (window.LD_DESIGN_NO != null ? 'Design #' + window.LD_DESIGN_NO : (state.pages.length + ' slide' + (state.pages.length === 1 ? '' : 's') + ' open here'));
    box.innerHTML = '<div style="font-size:16px;font-weight:700;">✨ Prepare my presentation</div>' +
      '<div style="font-size:12px;color:#a9abc4;margin:4px 0 14px;">Paste or load your content, choose the design, and we write every slide from it.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
        '<div><div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#8b8ea8;text-transform:uppercase;margin-bottom:4px;">💬 Describe your content</div>' +
          '<textarea id="ld-prep-content" placeholder="Paste your content here — headings and text for the slides…" style="' + inp + 'min-height:200px;resize:vertical;"></textarea></div>' +
        '<div><div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#8b8ea8;text-transform:uppercase;margin-bottom:4px;">📄 Or load a file</div>' +
          '<div id="ld-prep-file" style="' + drop + 'min-height:80px;display:flex;align-items:center;justify-content:center;">Click or drop a content file<br>(.txt, .md, .docx)</div>' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#8b8ea8;text-transform:uppercase;margin:14px 0 4px;">🎨 Your design</div>' +
          '<label style="display:block;font-size:13px;margin:4px 0;"><input type="radio" name="ld-prep-src" value="open" checked> The design open in the editor (' + deckName + ')</label>' +
          '<label style="display:block;font-size:13px;margin:4px 0;"><input type="radio" name="ld-prep-src" value="designno"> A design number (e.g. PD-044)</label>' +
          '<input id="ld-prep-designno" type="text" placeholder="PD-044" style="' + inp + 'margin:2px 0 6px;display:none;text-transform:uppercase;">' +
          '<label style="display:block;font-size:13px;margin:4px 0;"><input type="radio" name="ld-prep-src" value="pptx"> A PowerPoint file I choose</label>' +
          '<div id="ld-prep-pptx" style="' + drop + 'margin-top:6px;display:none;">Click or drop the deck (.pptx) you want filled</div>' +
        '</div>' +
      '</div>' +
      '<div id="ld-prep-note" style="font-size:11.5px;color:#8b8ea8;margin-top:10px;min-height:14px;"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">' +
        '<button id="ld-prep-cancel" style="border:0;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;background:#23243a;color:#c9cbe0;">Cancel</button>' +
        '<button id="ld-prep-go" style="border:0;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#f5b942,#e0843a);color:#1a1a2e;">Prepare presentation →</button>' +
      '</div>';
    ov.appendChild(box); document.body.appendChild(ov);
    var ta = box.querySelector('#ld-prep-content'), note = box.querySelector('#ld-prep-note');
    var pptxFile = null;
    function close(v) { ov.remove(); resolve(v); }
    box.querySelector('#ld-prep-cancel').onclick = function () { close(null); };
    ov.onmousedown = function (e) { if (e.target === ov) close(null); };
    box.querySelectorAll('input[name=ld-prep-src]').forEach(function (r) { r.onchange = function () {
      box.querySelector('#ld-prep-pptx').style.display = r.value === 'pptx' && r.checked ? '' : 'none';
      box.querySelector('#ld-prep-designno').style.display = r.value === 'designno' && r.checked ? '' : 'none';
    }; });
    async function readContentFile(f) {
      if (!f) return;
      if (/\.docx$/i.test(f.name)) {
        try {
          var zip = await JSZip.loadAsync(f); var xml = await zip.file('word/document.xml').async('string');
          var paras = []; xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, function (pp) { var t = (pp.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(function (x) { return x.replace(/<[^>]+>/g, ''); }).join(''); if (t.trim()) paras.push(t); return ''; });
          ta.value = paras.join('\n');
        } catch (e) { note.textContent = 'Could not read that .docx'; return; }
      } else ta.value = await f.text();
      note.textContent = 'Loaded ' + f.name + ' (' + ta.value.length.toLocaleString() + ' characters)';
    }
    function picker(accept, cb) { var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = function () { cb(i.files && i.files[0]); }; i.click(); }
    var fz = box.querySelector('#ld-prep-file'), pz = box.querySelector('#ld-prep-pptx');
    fz.onclick = function () { picker('.txt,.md,.docx,text/plain', readContentFile); };
    pz.onclick = function () { picker('.pptx', function (f) { if (f) { pptxFile = f; pz.textContent = '✓ ' + f.name; } }); };
    [fz, pz].forEach(function (z) {
      z.ondragover = function (e) { e.preventDefault(); z.style.borderColor = '#7c5cff'; };
      z.ondragleave = function () { z.style.borderColor = '#4a4d78'; };
      z.ondrop = function (e) { e.preventDefault(); z.style.borderColor = '#4a4d78'; var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; if (z === fz) readContentFile(f); else { pptxFile = f; pz.textContent = '✓ ' + f.name; } };
    });
    var goBtn = box.querySelector('#ld-prep-go');
    goBtn.onclick = async function () {
      var content = ta.value.trim();
      if (!content) { note.textContent = 'Paste or load your content first.'; ta.focus(); return; }
      var src = box.querySelector('input[name=ld-prep-src]:checked').value;
      if (src === 'pptx' && !pptxFile) { note.textContent = 'Choose the .pptx you want filled.'; return; }
      if (src === 'open' && state.pages.length === 1 && !(fc.getObjects() || []).length && !window._deckIR) { note.textContent = 'The editor is empty — open a design, or choose a PowerPoint file.'; return; }
      var designCode = '';
      if (src === 'designno') {
        designCode = (box.querySelector('#ld-prep-designno').value || '').trim();
        if (!designCode) { note.textContent = 'Type the design number (e.g. PD-044).'; return; }
      }
      /* 22 Aug 2026 (Javed's order) — resolve a typed design NUMBER to its own
         real deck FIRST (free — /compose_ir with only the code in the
         sentence pulls that exact design's own slides via resolveDesignRef's
         refLayout path, no model tokens spent), so the mismatch check below
         can compare against its true slide count before anything is filled. */
      var composedDeck = null;
      if (src === 'designno') {
        note.textContent = 'Looking up design ' + designCode + '…';
        goBtn.disabled = true;
        try {
          await window.ldWaitAuthToken(15000);
          var rr = await fetch(window.LD_BACKEND + '/compose_ir', {
            method: 'POST', headers: window.ldHeaders('application/json'),
            body: JSON.stringify({ sentence: designCode })
          });
          if (!rr.ok) { note.textContent = 'Could not find design ' + designCode + '.'; goBtn.disabled = false; return; }
          var rd = await rr.json();
          if (!rd.deck || !rd.deck.slides || !rd.deck.slides.length) { note.textContent = 'Design ' + designCode + ' has no slides to fill.'; goBtn.disabled = false; return; }
          composedDeck = rd.deck;
        } catch (e) { note.textContent = 'Lookup failed: ' + e.message; goBtn.disabled = false; return; }
        note.textContent = ''; goBtn.disabled = false;
      }
      /* 22 Aug 2026 (Javed's order) — content/slide-count MISMATCH check.
         Roughly split content the same way the server does (blank-line /
         "Slide N:" separated blocks) and compare against how many text-
         bearing slides the target design actually has. If the content needs
         more slides than the design has, ask BEFORE spending any tokens:
         clone extra slides in this same design, or pick a bigger one. */
      var sections = content.split(/\n\s*\n|(?=^\s*slide\s*\d+\s*[:.\-])/gim).map(function (s) { return s.trim(); }).filter(Boolean);
      var targetSlideCount = src === 'open' ? state.pages.length : (src === 'designno' ? composedDeck.slides.length : null); /* pptx slide count known only after it's parsed server-side */
      function proceed(allowClone, expand) {
        close({ content: content, pptx: src === 'pptx' ? pptxFile : null, composedDeck: composedDeck, allowClone: !!allowClone, expand: expand || 0 });
      }
      if (targetSlideCount && sections.length > targetSlideCount) {
        var extra = sections.length - targetSlideCount;
        var mm = document.createElement('div');
        mm.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.7);z-index:100000;display:flex;align-items:center;justify-content:center;';
        mm.innerHTML = '<div style="background:#151623;border:1px solid #2c2e45;border-radius:14px;padding:22px 24px;width:min(440px,92vw);color:#e8e9f2;font-family:\'DM Sans\',system-ui,sans-serif;">' +
          '<div style="font-size:15px;font-weight:700;margin-bottom:8px;">Design / content mismatch</div>' +
          '<div style="font-size:13px;color:#c9cbe0;line-height:1.5;margin-bottom:16px;">This design has ' + targetSlideCount + ' slide' + (targetSlideCount === 1 ? '' : 's') + ' but your content splits into about ' + sections.length + '. Should I clone ' + extra + ' more slide' + (extra === 1 ? '' : 's') + ' in this same design to fit everything, or would you rather give a bigger design?</div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="ld-mm-different" style="border:0;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;background:#23243a;color:#c9cbe0;">I\'ll give a bigger design</button>' +
          '<button id="ld-mm-clone" style="border:0;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#f5b942,#e0843a);color:#1a1a2e;">Clone ' + extra + ' slide' + (extra === 1 ? '' : 's') + '</button>' +
          '</div></div>';
        document.body.appendChild(mm);
        mm.querySelector('#ld-mm-different').onclick = function () { mm.remove(); note.textContent = 'Pick a different design number, upload a bigger .pptx, or open a bigger design first.'; };
        mm.querySelector('#ld-mm-clone').onclick = function () { mm.remove(); proceed(true, extra); };
        return;
      }
      proceed(false, 0);
    };
    setTimeout(function () { ta.focus(); }, 30);
  });
};

/* ═════════ ldSignInModal — email/password + Google chooser (21 Aug 2026)
   Fable, for the Microsoft Store blocker: reviewers (and plenty of real
   customers) need a plain email sign-in. Resolves:
     { mode:'email', email, pass } | { mode:'google' } | null (cancelled). */
window.ldSignInModal = function () {
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-signin-overlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'ld-signin-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:14px;' +
      'padding:26px 28px;width:min(360px,92vw);box-shadow:0 18px 50px rgba(0,0,0,.5);' +
      'font-family:"DM Sans",system-ui,sans-serif;color:#e8e9f2;';
    box.innerHTML = '<div style="font-size:17px;font-weight:700;margin-bottom:14px;">Sign in to LazyDog</div>';
    var inpCss = 'width:100%;box-sizing:border-box;background:#0e0f1a;color:#fff;border:1px solid #34365a;' +
      'border-radius:8px;padding:10px 12px;font-size:14px;outline:none;margin-bottom:10px;';
    var em = document.createElement('input');
    em.type = 'email'; em.placeholder = 'Email'; em.autocomplete = 'username'; em.style.cssText = inpCss;
    var pw = document.createElement('input');
    pw.type = 'password'; pw.placeholder = 'Password'; pw.autocomplete = 'current-password'; pw.style.cssText = inpCss;
    var go = document.createElement('button');
    go.textContent = 'Sign in';
    go.style.cssText = 'width:100%;border:0;border-radius:8px;padding:11px 0;font-size:14px;font-weight:700;' +
      'cursor:pointer;background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;';
    var div = document.createElement('div');
    div.textContent = 'or';
    div.style.cssText = 'text-align:center;color:#8b8ea8;font-size:12px;margin:12px 0;';
    var gg = document.createElement('button');
    gg.textContent = 'Continue with Google';
    gg.style.cssText = 'width:100%;border:1px solid #34365a;border-radius:8px;padding:10px 0;font-size:13px;' +
      'font-weight:600;cursor:pointer;background:#0e0f1a;color:#e8e9f2;';
    var err = document.createElement('div');
    err.style.cssText = 'color:#f87171;font-size:12px;min-height:16px;margin-top:8px;';
    box.appendChild(em); box.appendChild(pw); box.appendChild(go);
    box.appendChild(div); box.appendChild(gg); box.appendChild(err);
    ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(function () { em.focus(); }, 30);
    function close(val) { ov.remove(); resolve(val); }
    ov.onmousedown = function (e) { if (e.target === ov) close(null); };
    function submit() {
      var e1 = em.value.trim(), p1 = pw.value;
      if (!e1 || !/@/.test(e1)) { err.textContent = 'Enter your email address.'; em.focus(); return; }
      if (!p1) { err.textContent = 'Enter your password.'; pw.focus(); return; }
      close({ mode: 'email', email: e1, pass: p1 });
    }
    go.onclick = submit;
    gg.onclick = function () { close({ mode: 'google' }); };
    [em, pw].forEach(function (i) {
      i.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
      };
    });
  });
};

/* ═════════ ldPrompt — an ask box that works EVERYWHERE (20 Aug 2026, Fable)
   window.prompt() is unsupported in Electron (the desktop app), and even in
   browsers it is an ugly system dialog. This is a minimal in-page modal:
   ldPrompt(message, placeholder, defaultValue) → Promise<string|null>.
   Enter/OK resolves the text, Escape/Cancel resolves null. Styled to match
   the editor's dark chrome, no dependencies. ═════════ */
/* 21 Aug 2026 — ldConfirm / ldAlert: in-page twins of confirm()/alert().
   Native dialogs freeze the page for assistive tools and automation, and
   prompt() does not exist in the desktop app at all. Nothing native is used
   in the editor any more. */
window.ldConfirm = function (message, okLabel) {
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-confirm-overlay'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ld-confirm-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:12px;padding:20px 22px;width:min(440px,90vw);box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:"DM Sans",system-ui,sans-serif;color:#e8e9f2;';
    var msg = document.createElement('div'); msg.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-line;'; msg.textContent = String(message || '');
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px;';
    function btn(label, primary) { var b = document.createElement('button'); b.textContent = label; b.style.cssText = 'border:0;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;' + (primary ? 'background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;' : 'background:#23243a;color:#c9cbe0;'); return b; }
    var cancel = btn('Cancel', false), ok = btn(okLabel || 'OK', true);
    function close(v) { ov.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(false); } if (e.key === 'Enter') { e.preventDefault(); close(true); } }
    document.addEventListener('keydown', onKey, true);
    cancel.onclick = function () { close(false); }; ok.onclick = function () { close(true); };
    ov.onmousedown = function (e) { if (e.target === ov) close(false); };
    row.appendChild(cancel); row.appendChild(ok); box.appendChild(msg); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(function () { ok.focus(); }, 30);
  });
};
window.ldAlert = function (message, title) {
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-alert-overlay'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ld-alert-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:12px;padding:20px 22px;width:min(520px,92vw);max-height:80vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:"DM Sans",system-ui,sans-serif;color:#e8e9f2;';
    if (title) { var h = document.createElement('div'); h.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:8px;'; h.textContent = title; box.appendChild(h); }
    var msg = document.createElement('div'); msg.style.cssText = 'font-size:13.5px;line-height:1.55;white-space:pre-line;'; msg.textContent = String(message || ''); box.appendChild(msg);
    var row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:flex-end;margin-top:16px;';
    var ok = document.createElement('button'); ok.textContent = 'OK';
    ok.style.cssText = 'border:0;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;';
    function close() { ov.remove(); document.removeEventListener('keydown', onKey, true); resolve(); }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } }
    document.addEventListener('keydown', onKey, true);
    ok.onclick = close; ov.onmousedown = function (e) { if (e.target === ov) close(); };
    row.appendChild(ok); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(function () { ok.focus(); }, 30);
  });
};
window.ldPrompt = function (message, placeholder, def, opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var old = document.getElementById('ld-prompt-overlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'ld-prompt-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,7,12,.62);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#151623;border:1px solid #2c2e45;border-radius:12px;' +
      'padding:20px 22px;width:min(440px,90vw);box-shadow:0 18px 50px rgba(0,0,0,.5);' +
      'font-family:"DM Sans",system-ui,sans-serif;color:#e8e9f2;';
    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:12px;white-space:pre-line;';
    msg.textContent = String(message || '');
    var inp = document.createElement(opts.multiline ? 'textarea' : 'input');
    if (!opts.multiline) inp.type = 'text';
    inp.placeholder = String(placeholder || '');
    inp.value = def != null ? String(def) : '';
    inp.style.cssText = 'width:100%;box-sizing:border-box;background:#0e0f1a;color:#fff;' +
      'border:1px solid #34365a;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;' +
      (opts.multiline ? 'min-height:160px;resize:vertical;font-family:inherit;' : '');
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:14px;';
    function btn(label, primary) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'border:0;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;' +
        'cursor:pointer;' + (primary
          ? 'background:linear-gradient(135deg,#7c5cff,#e05fa9);color:#fff;'
          : 'background:#23243a;color:#c9cbe0;');
      return b;
    }
    var cancel = btn('Cancel', false), ok = btn('OK', true);
    function close(val) { ov.remove(); resolve(val); }
    cancel.onclick = function () { close(null); };
    ok.onclick = function () { close(inp.value); };
    inp.onkeydown = function (e) {
      if (e.key === 'Enter' && !opts.multiline) { e.preventDefault(); close(inp.value); }
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
    };
    ov.onmousedown = function (e) { if (e.target === ov) close(null); };
    row.appendChild(cancel); row.appendChild(ok);
    box.appendChild(msg); box.appendChild(inp); box.appendChild(row);
    ov.appendChild(box); document.body.appendChild(ov);
    setTimeout(function () { inp.focus(); inp.select(); }, 30);
  });
};

/* ── photos library (session) ── */
(function () {
  var photos = [];
  var origInsert = null;
  document.addEventListener('DOMContentLoaded', function () {
    /* wrap insertImage so every upload lands in the library too */
    var prev = Editor.run;
  });
  Editor._register({
    insertImage: function (dataUrl) {
      if (!dataUrl) return;
      if (photos.indexOf(dataUrl) === -1) photos.unshift(dataUrl);
      if (photos.length > 40) photos.pop();
      var target = fc.getActiveObject();
      if (!(target && target.isFrame)) {
        /* no frame selected: fill the first EMPTY frame on the slide, Canva-style */
        target = fc.getObjects().filter(function (g) { return g.isFrame && !g._frameImg && !g.frameSrc; })[0] || null;
      }
      fabric.Image.fromURL(dataUrl, function (img) {
        if (target) { fc.add(img); if (dropImageIntoFrame(img, target)) return; fc.remove(img); }
        var maxW = fc.getWidth() / fc.getZoom() * 0.5;
        if (img.width > maxW) img.scaleToWidth(maxW);
        img.set({ left: 160, top: 120 });
        fc.add(img).setActiveObject(img);
        fc.renderAll(); saveState();
        showToast('Image added — drag it onto a frame to fit it inside');
      }, { crossOrigin: 'anonymous' });
    },
    __qPhotos: function () { return photos.slice(); }
  });
})();

/* ── CSV → chart data ── */
Editor._register({
  dataUpload: function (dataUrl) {
    try {
      var csv = atob(String(dataUrl).split(',')[1] || '');
      var rows = csv.split(/\r?\n/).filter(function (r) { return r.trim(); })
        .map(function (r) { return r.split(','); });
      if (rows.length < 2) { showToast('Need a header row + data rows'); return; }
      var labels = rows.slice(1).map(function (r) { return r[0]; });
      var vals = rows.slice(1).map(function (r) { return parseFloat(r[1]) || 0; });
      var o = fc.getActiveObject();
      if (!o || !o.chartType) {
        showToast('Select a chart first, then bring in the CSV — using first 2 columns');
        return;
      }
      /* rebuild the chart with real data */
      var type = o.chartType;
      var pos = { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY };
      fc.remove(o);
      var maxV = Math.max.apply(null, vals) || 1;
      var cols = ['#7C3AED', '#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#0EA5E9', '#DB2777', '#CA8A04'];
      var parts = [], W = Math.max(340, vals.length * 80), H = 240;
      parts.push(new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: '#FFFFFF', stroke: '#E4E7EE', strokeWidth: 1, rx: 8, ry: 8 }));
      if (type === 'bar' || type === 'line') {
        vals.forEach(function (v, i) {
          var h = v / maxV * (H - 70);
          if (type === 'bar') parts.push(new fabric.Rect({ left: 30 + i * 76, top: H - 40 - h, width: 46, height: h, fill: cols[i % cols.length], rx: 4, ry: 4 }));
          parts.push(new fabric.Text(String(labels[i]).slice(0, 8), { left: 30 + i * 76, top: H - 30, fontSize: 13, fontFamily: 'DM Sans', fill: '#5B6472' }));
        });
        if (type === 'line') {
          var pts = vals.map(function (v, i) { return { x: 50 + i * 76, y: H - 45 - v / maxV * (H - 80) }; });
          parts.push(new fabric.Polyline(pts, { stroke: '#7C3AED', strokeWidth: 4, fill: '', strokeLineJoin: 'round' }));
        }
      } else {
        var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
        var start = -90;
        vals.forEach(function (v, i) {
          var ang = v / total * 360;
          parts.push(new fabric.Path(describeArc(W / 2, H / 2, 84, start, start + ang), { fill: cols[i % cols.length] }));
          start += ang;
        });
        if (type === 'donut') parts.push(new fabric.Circle({ left: W / 2 - 44, top: H / 2 - 44, radius: 44, fill: '#FFFFFF' }));
      }
      var g = new fabric.Group(parts, Object.assign({ chartType: type }, pos));
      fc.add(g).setActiveObject(g);
      fc.renderAll(); saveState();
      showToast('Chart updated with ' + vals.length + ' rows ✓');
    } catch (e) { showToast('Could not read that file: ' + e.message); }
  }
});

/* ── icons library command upgrade (glyph catalogue for the sidebar) ── */
window.LD_ICON_GLYPHS = ['home','favorite','star','check_circle','bolt','rocket_launch','lightbulb','trending_up',
  'bar_chart','pie_chart','payments','account_balance','shopping_cart','storefront','work','business_center',
  'groups','person','handshake','public','language','travel_explore','school','science','psychology','biotech',
  'health_and_safety','medical_services','favorite_border','eco','recycling','solar_power','devices','smartphone',
  'laptop_mac','cloud','wifi','security','lock','key','settings','build','construction','palette','brush',
  'photo_camera','music_note','movie','sports_esports','emoji_events','celebration','local_fire_department',
  'water_drop','air','pets','restaurant','local_cafe','directions_car','flight','location_on','schedule','mail',
  'call','chat','notifications','thumb_up','verified','diamond','crown'];


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 4 · liveness pass          owner: Fable
   Makes the last 9 commands real: notes, brand, format painter, media,
   rehearse, presenter view, accessibility check, spelling helper.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── speaker notes drawer ── */
(function () {
  var open = false, bar = null, ta = null;
  function build() {
    bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:92px;background:#fff;border-top:1px solid #E4E7EE;box-shadow:0 -6px 18px rgba(15,23,42,0.06);padding:10px 16px;z-index:800;display:none;';
    bar.innerHTML = '<div style="font:700 11.5px \'DM Sans\';color:#9AA3B2;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">Speaker notes — this slide</div>';
    ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;height:64px;border:1px solid #E4E7EE;border-radius:8px;padding:8px 10px;font:13px \'DM Sans\';color:#1F2430;resize:none;outline:none;';
    ta.placeholder = 'Notes only you see while presenting…';
    ta.addEventListener('input', function () { state.notes[state.currentPage] = ta.value; });
    bar.appendChild(ta);
    document.body.appendChild(bar);
  }
  window.ldSyncNotesBoxV2 = function () { if (ta) ta.value = state.notes[state.currentPage] || ''; };
  Editor._register({
    toggleNotes: function () {
      if (!bar) build();
      open = !open;
      bar.style.display = open ? 'block' : 'none';
      if (open) { window.ldSyncNotesBoxV2(); ta.focus(); }
    }
  });
  /* keep in sync on slide change */
  Editor.on('slides', function () { if (open) window.ldSyncNotesBoxV2(); });
})();

/* ── brand kit (stored) + apply ── */
(function () {
  function kit() {
    try { return JSON.parse(localStorage.getItem('ld_v2_brand') || '{}'); } catch (e) { return {}; }
  }
  Editor._register({
    brandApply: function () {
      var k = kit();
      var accent = k.accent || '#7C3AED';
      var n = 0;
      (fc.getObjects() || []).forEach(function (o) {
        if (/text/.test(o.type || '')) return; /* text keeps its colours */
        if (o.isFrame && !o.frameSrc) { o.frameFill = accent; if (typeof refreshFrame === 'function') refreshFrame(o); n++; }
        else if (typeof o.fill === 'string' && !o.isBg && !o._isDrawn) { o.set('fill', accent); n++; }
      });
      fc.renderAll(); saveState();
      showToast(n ? 'Brand colour applied to ' + n + ' object(s)' : 'Nothing on this slide takes the brand colour');
    }
  });
  window.ldBrandSet = function (accent) {
    try { localStorage.setItem('ld_v2_brand', JSON.stringify({ accent: accent })); } catch (e) {}
    showToast('Brand colour saved');
  };
})();

/* ── format painter ── */
(function () {
  var carry = null;
  Editor._register({
    formatPainter: function () {
      var o = fc.getActiveObject();
      if (!o) { showToast('Select the object whose look you want to copy, then press Format painter'); return; }
      if (/text/.test(o.type || '')) {
        carry = { kind: 'text', fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight,
                  fontStyle: o.fontStyle, underline: o.underline, linethrough: o.linethrough,
                  fill: typeof o.fill === 'string' ? o.fill : null, textAlign: o.textAlign,
                  textBackgroundColor: o.textBackgroundColor || '' };
      } else {
        carry = { kind: 'shape', fill: typeof o.fill === 'string' ? o.fill : null,
                  stroke: o.stroke || null, strokeWidth: o.strokeWidth || 0, opacity: o.opacity };
      }
      showToast('Format copied — now click the object to paint it onto (Esc cancels)');
      function apply(ev) {
        var t = ev.target;
        if (!t || t === o) return;
        if (carry.kind === 'text' && /text/.test(t.type || '')) {
          var props = {};
          ['fontFamily','fontSize','fontWeight','fontStyle','underline','linethrough','textAlign','textBackgroundColor'].forEach(function (k) {
            if (carry[k] !== null && carry[k] !== undefined) props[k] = carry[k];
          });
          if (carry.fill) props.fill = carry.fill;
          t.set(props);
          if (t.styles) Object.keys(t.styles).forEach(function (li) { Object.keys(t.styles[li]).forEach(function (ci) { Object.assign(t.styles[li][ci], props); }); });
          if (t.initDimensions) t.initDimensions();
        } else if (carry.kind === 'shape' && !/text/.test(t.type || '')) {
          if (carry.fill) t.set('fill', carry.fill);
          t.set({ stroke: carry.stroke, strokeWidth: carry.strokeWidth, opacity: carry.opacity });
        } else { showToast('Different kind of object — format not applied'); cleanup(); return; }
        t.dirty = true; fc.renderAll(); saveState();
        showToast('Format painted ✓');
        cleanup();
      }
      function esc(e) { if (e.key === 'Escape') cleanup(); }
      function cleanup() {
        fc.off('mouse:down', apply);
        document.removeEventListener('keydown', esc);
        carry = null;
      }
      fc.on('mouse:down', apply);
      document.addEventListener('keydown', esc);
    }
  });
})();

/* ── video & audio ── */
(function () {
  function mediaPick(kind) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = kind === 'video' ? 'video/*' : 'audio/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 24 * 1024 * 1024) { showToast('Keep media under 24 MB'); return; }
      var r = new FileReader();
      r.onload = function () {
        var parts = [
          new fabric.Rect({ left: 0, top: 0, width: 300, height: 180, rx: 12, ry: 12, fill: kind === 'video' ? '#1F2430' : '#EEF2F8', stroke: '#CBD2DE', strokeWidth: 1 }),
          new fabric.Text(kind === 'video' ? 'play_circle' : 'volume_up', {
            left: 118, top: 58, fontSize: 64, fontFamily: 'Material Symbols Outlined',
            fill: kind === 'video' ? '#FFFFFF' : '#2B579A'
          }),
          new fabric.Text(f.name.slice(0, 28), { left: 14, top: 148, fontSize: 14, fontFamily: 'DM Sans', fill: kind === 'video' ? '#CBD2DE' : '#5B6472' })
        ];
        var g = new fabric.Group(parts, { left: 170, top: 140, mediaSrc: r.result, mediaKind: kind });
        fc.add(g).setActiveObject(g);
        fc.renderAll(); saveState();
        showToast((kind === 'video' ? 'Video' : 'Audio') + ' added — double-click to play');
      };
      r.readAsDataURL(f);
    };
    inp.click();
  }
  Editor._register({
    insertVideo: function () { mediaPick('video'); },
    insertAudio: function () { mediaPick('audio'); }
  });
  var t = setInterval(function () {
    if (!window.fc || !fc.on || fc.__v2MediaHooked) { if (window.fc && fc.__v2MediaHooked) clearInterval(t); return; }
    fc.__v2MediaHooked = true; clearInterval(t);
    fc.on('mouse:dblclick', function (opt) {
      var o = opt.target;
      if (o && o.mediaSrc && typeof openMediaPlayer === 'function') openMediaPlayer(o.mediaSrc, o.mediaKind);
    });
  }, 300);
})();

/* ── rehearse timings ── */
Editor._register({
  rehearse: function () {
    captureCurrentPage();
    var times = [], t0 = Date.now(), idx = state.currentPage;
    var hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#23262E;color:#fff;border-radius:10px;padding:10px 18px;z-index:9999;font:600 13px \'DM Sans\';display:flex;gap:16px;align-items:center;';
    var clock = document.createElement('span'); clock.textContent = '0:00';
    var info = document.createElement('span'); info.style.color = '#9AA3B2';
    info.textContent = 'Rehearsing — use the filmstrip to change slides · click Stop when done';
    var stop = document.createElement('button');
    stop.textContent = 'Stop';
    stop.style.cssText = 'background:#DC2626;color:#fff;border:none;border-radius:7px;padding:5px 14px;font:600 12px \'DM Sans\';cursor:pointer;';
    hud.appendChild(clock); hud.appendChild(info); hud.appendChild(stop);
    document.body.appendChild(hud);
    var tick = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    }, 500);
    var lastSwitch = Date.now();
    var off = Editor.on('slides', function (s) {
      if (s.current !== idx) {
        times.push({ slide: idx + 1, secs: Math.round((Date.now() - lastSwitch) / 1000) });
        idx = s.current; lastSwitch = Date.now();
      }
    });
    stop.addEventListener('click', function () {
      times.push({ slide: idx + 1, secs: Math.round((Date.now() - lastSwitch) / 1000) });
      clearInterval(tick); off(); hud.remove();
      var total = Math.round((Date.now() - t0) / 1000);
      window.ldAlert('Rehearsal — total ' + Math.floor(total / 60) + ':' + ('0' + total % 60).slice(-2) + '\n\n'
        + times.map(function (x) { return 'Slide ' + x.slide + ': ' + x.secs + 's'; }).join('\n'));
    });
  }
});

/* ── presenter view ── */
Editor._register({
  presenterView: function () {
    captureCurrentPage();
    var w = window.open('', 'ldPresenter', 'width=900,height=600');
    if (!w) { showToast('Allow pop-ups to use Presenter view'); return; }
    function paint() {
      var i = state.currentPage;
      var thumb = (state.pages[i] || {}).thumb || '';
      var next = (state.pages[i + 1] || {}).thumb || '';
      var notes = (state.notes[i] || '').replace(/</g, '&lt;');
      w.document.body.innerHTML =
        '<div style="font-family:\'DM Sans\',sans-serif;background:#111;color:#eee;position:fixed;inset:0;padding:18px;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:auto 1fr;gap:14px">'
        + '<div><div style="color:#888;font-size:12px;margin-bottom:6px">CURRENT — slide ' + (i + 1) + ' of ' + state.pages.length + '</div>'
        + (thumb ? '<img src="' + thumb + '" style="width:100%;border-radius:8px">' : '<div style="background:#222;height:220px;border-radius:8px"></div>') + '</div>'
        + '<div><div style="color:#888;font-size:12px;margin-bottom:6px">NEXT</div>'
        + (next ? '<img src="' + next + '" style="width:100%;border-radius:8px;opacity:0.8">' : '<div style="background:#1a1a1a;height:120px;border-radius:8px"></div>') + '</div>'
        + '<div style="grid-column:1/3"><div style="color:#888;font-size:12px;margin-bottom:6px">NOTES</div>'
        + '<div style="font-size:17px;line-height:1.6;white-space:pre-wrap">' + (notes || '<span style=\'color:#666\'>No notes on this slide</span>') + '</div></div>'
        + '</div>';
    }
    paint();
    var off = Editor.on('slides', paint);
    var guard = setInterval(function () { if (w.closed) { off(); clearInterval(guard); } }, 800);
    showToast('Presenter view opened — change slides here, it follows');
  }
});

/* ── accessibility check (contrast + alt text, deck-wide) ── */
Editor._register({
  accessibilityCheck: function () {
    captureCurrentPage();
    function lum(hex) {
      var c = (hex || '#000').replace('#', '');
      if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
      var r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
      [r, g, b] = [r, g, b].map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function ratio(a, b) {
      var l1 = lum(a), l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    var issues = [];
    state.pages.forEach(function (p, i) {
      var json = i === state.currentPage ? fc.toJSON(FABRIC_JSON_PROPS)
        : (typeof p.canvasJSON === 'string' ? JSON.parse(p.canvasJSON) : p.canvasJSON);
      if (!json) return;
      var bg = typeof json.background === 'string' ? json.background : '#FFFFFF';
      (json.objects || []).forEach(function (o) {
        if (/text/.test(o.type || '') && typeof o.fill === 'string' && /^#/.test(o.fill)) {
          var pt = (o.fontSize || 32) / ((fc && fc._pxPerPt) || 2);
          var need = pt >= 18 ? 3 : 4.5;
          var r = ratio(o.fill, bg);
          if (r < need) issues.push('Slide ' + (i + 1) + ': low contrast text “' + String(o.text || '').slice(0, 20) + '…” (' + r.toFixed(1) + ':1, needs ' + need + ':1)');
          if (pt < 12) issues.push('Slide ' + (i + 1) + ': text under 12pt — hard to read when projected');
        }
        if (o.type === 'image' && !(o.altText && String(o.altText).trim())) {
          issues.push('Slide ' + (i + 1) + ': image without alternative text');
        }
      });
    });
    if (!issues.length) window.ldAlert('Accessibility check ✓\n\nNo contrast, size or alt-text issues found across ' + state.pages.length + ' slide(s).');
    else window.ldAlert('Accessibility check — ' + issues.length + ' issue(s):\n\n' + issues.slice(0, 20).join('\n') + (issues.length > 20 ? '\n…and ' + (issues.length - 20) + ' more' : ''));
  },
  spellCheck: function () {
    /* browser-powered: all deck text in one spellchecked box; edits write back */
    captureCurrentPage();
    var texts = [];
    (fc.getObjects() || []).forEach(function (o, i) { if (/text/.test(o.type || '')) texts.push({ o: o, i: i }); });
    if (!texts.length) { showToast('No text on this slide'); return; }
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9998;display:grid;place-items:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;padding:20px;width:min(560px,92vw);max-height:80vh;overflow:auto;font-family:\'DM Sans\';';
    box.innerHTML = '<b style="font-size:15px">Spelling — this slide</b><div style="font-size:12px;color:#9AA3B2;margin:4px 0 12px">Red underlines are your browser\'s spell-checker. Fix anything, then Apply.</div>';
    var areas = [];
    texts.forEach(function (t) {
      var ta = document.createElement('textarea');
      ta.value = t.o.text || '';
      ta.spellcheck = true; ta.lang = 'en';
      ta.style.cssText = 'width:100%;min-height:52px;margin-bottom:8px;border:1px solid #E4E7EE;border-radius:8px;padding:8px 10px;font:13px \'DM Sans\';resize:vertical;';
      box.appendChild(ta);
      areas.push(ta);
    });
    var apply = document.createElement('button');
    apply.textContent = 'Apply changes';
    apply.style.cssText = 'background:#7C3AED;color:#fff;border:none;border-radius:8px;padding:9px 18px;font:600 13px \'DM Sans\';cursor:pointer;margin-right:8px;';
    var cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'background:#F1F3F7;color:#1F2430;border:none;border-radius:8px;padding:9px 18px;font:600 13px \'DM Sans\';cursor:pointer;';
    apply.addEventListener('click', function () {
      var changed = 0;
      texts.forEach(function (t, k) {
        if (areas[k].value !== t.o.text) { t.o.set('text', areas[k].value); if (t.o.initDimensions) t.o.initDimensions(); t.o.dirty = true; changed++; }
      });
      if (changed) { fc.renderAll(); saveState(); }
      ov.remove();
      showToast(changed ? changed + ' text box(es) updated ✓' : 'No changes');
    });
    cancel.addEventListener('click', function () { ov.remove(); });
    box.appendChild(apply); box.appendChild(cancel);
    ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  },
  themeFonts: function () { showToast('Every theme card carries its own font pair — pick a theme'); },
  themeColours: function () { showToast('Pick a theme card — colours apply to every slide'); }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 5 · opus handoff wiring    owner: Fable
   PowerPoint import (cloud parse, small + big road) + Fill frames.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Shared PPTX-file importer: takes a File, picks the road, loads deck ──
   Small (<18 MB): direct POST to /parse (proxy gate caps both directions at
   32 MB and a parsed reply runs ~1.4× the file — 18 MB keeps replies under).
   Big (≥18 MB): storage road — /upload_url → resumable PUT → /parse{gcsPath}
   (functions live in engine6.js; they exist by click-time).               */
window.ldImportPptxFile = async function (file) {
  if (window.ldBusy) window.ldBusy('upload', true);
  try {
    var deckIR;
    if (file.size >= 18 * 1024 * 1024) {
      if (typeof window.ldBigUploadParse !== 'function')
        throw new Error('Big-file road not loaded — refresh and try again');
      deckIR = await window.ldBigUploadParse(file);
    } else {
      showToast('Parsing PPTX in LazyDog cloud…', 8000);
      if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Parsing PPTX in LazyDog cloud…');
      var buf = await file.arrayBuffer();
      for (var w = 0; w < 10 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timedOut = false;
      var to = ctrl ? setTimeout(function () { timedOut = true; ctrl.abort(); }, 120000) : null;
      var resp;
      try {
        resp = await fetch((window.LD_BACKEND || 'http://localhost:8080') + '/parse', {
          method: 'POST', headers: window.ldHeaders('application/octet-stream'),
          body: buf, signal: ctrl ? ctrl.signal : undefined
        });
      } catch (netErr) {
        if (timedOut || (netErr && netErr.name === 'AbortError'))
          throw new Error('Upload timed out — try a smaller file or stronger connection');
        throw new Error('Could not reach the import service');
      } finally { if (to) clearTimeout(to); }
      if (resp.status === 401 || resp.status === 403) throw new Error('Please sign in first — import needs a designer account');
      /* Cloud Run cold start / transient 5xx: retry ONCE after 3s before failing —
         first requests after idle regularly die with 500 "Service Unavailable". */
      if (resp.status >= 500) {
        showToast('Import service warming up — retrying…', 4000);
        await new Promise(function (r) { setTimeout(r, 3000); });
        try {
          resp = await fetch((window.LD_BACKEND || 'http://localhost:8080') + '/parse', {
            method: 'POST', headers: window.ldHeaders('application/octet-stream'), body: buf
          });
        } catch (e3) { throw new Error('Could not reach the import service'); }
      }
      if (!resp.ok) {
        var det = ''; try { det = (await resp.text()).slice(0, 200); } catch (e2) {}
        throw new Error('Import service error (' + resp.status + ')' + (det ? ' — ' + det : ''));
      }
      deckIR = await resp.json();
      /* worker may park a heavy IR in Storage and hand back a pointer —
         happens on the direct road too. Unwrap via the range-download
         helper when present, plain fetch otherwise. */
      if (deckIR && deckIR.big === true && deckIR.irUrl) {
        showToast('Finishing up…');
        if (typeof window.ldFetchLargeJson === 'function') {
          if (window.ldDownloadProgress) window.ldDownloadProgress(0);
          var big = await window.ldFetchLargeJson(deckIR.irUrl, function (f) {
            if (window.ldDownloadProgress) window.ldDownloadProgress(f);
          });
          if (window.ldDownloadProgress) window.ldDownloadProgress(null);
          deckIR = big.json;
        } else {
          var r2 = await fetch(deckIR.irUrl);
          if (!r2.ok) throw new Error('IR download ' + r2.status);
          deckIR = await r2.json();
        }
      }
    }
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (!deckIR || !deckIR.slides) throw new Error('The reply was not a deck');
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Building slides…');
    window._deckIR = deckIR;
    /* time-box the build: if an asset hangs, reject after 90s so the catch +
       finally below always run and clear the "Building slides…" pill.
       IMPORTANT: the clock PAUSES while the font-policy dialog is open
       (window.__ldFontGate) — a human deciding "keep vs switch fonts" must
       never count against the build budget (that was killing imports). */
    await Promise.race([
      window.loadDeckIRIntoEditor(deckIR),
      new Promise(function (_r, rej) {
        var waited = 0;
        var iv = setInterval(function () {
          if (!window.__ldFontGate) waited++;
          if (waited >= 90) { clearInterval(iv); rej(new Error('Slide build timed out — please try again')); }
        }, 1000);
      })
    ]);
    var totalEls = deckIR.slides.reduce(function (a, s) { return a + (s.elements || []).length; }, 0);
    if (deckIR.report && deckIR.report.length) {
      showToast('Imported ' + deckIR.slides.length + ' slides / ' + totalEls + ' elements. Notes: '
        + deckIR.report.map(function (r) { return r.kind + ' (slide ' + r.slide + ')'; }).join(', '), 9000);
    } else {
      showToast('Imported ' + deckIR.slides.length + ' slides / ' + totalEls + ' elements — nothing lost', 5000);
    }
    /* background: probe chart-looking pictures against the dissolve
       service; confirmed charts become native editable charts (engine6) */
    try { if (typeof window.ldAutoCrackCharts === 'function') window.ldAutoCrackCharts(); } catch (e) {}
    return true;
  } catch (e) {
    console.error('[v2] pptx import', e);
    showToast('Import failed: ' + e.message, 6000);
    return false;
  } finally {
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (window.ldBusy) window.ldBusy('upload', false);
  }
};

Editor._register({
  importPptx: function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (file) window.ldImportPptxFile(file);
    };
    inp.click();
  },

  /* ── Fill empty frames on this slide with picked images, in order ── */
  fillFrames: function () {
    var frames = (fc.getObjects() || []).filter(function (o) { return o.isFrame && !o.frameSrc; });
    if (!frames.length) { showToast('No empty frames on this slide — add frames first (Insert ▸ Frames)'); return; }
    /* left-to-right, top-to-bottom feels natural */
    frames.sort(function (a, b) { return (a.top - b.top) || (a.left - b.left); });
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = function () {
      var files = Array.from(inp.files || []).slice(0, frames.length);
      if (!files.length) return;
      var done = 0;
      files.forEach(function (f, i) {
        var r = new FileReader();
        r.onload = function () {
          var target = frames[i];
          var im = new Image();
          im.onload = function () {
            target._frameImg = im;
            target.frameSrc = r.result;
            /* cover-fit crop rect (v1 maths) */
            var fAR = (target.width * (target.scaleX || 1)) / Math.max(1, target.height * (target.scaleY || 1));
            var iAR = im.width / im.height;
            var fr = { l: 0, t: 0, r: 0, b: 0 };
            if (iAR > fAR) { var ov = (1 - iAR / fAR) / 2; fr.l = ov; fr.r = ov; }
            else if (iAR < fAR) { var o2 = (1 - fAR / iAR) / 2; fr.t = o2; fr.b = o2; }
            target.frameRect = fr;
            if (typeof refreshFrame === 'function') refreshFrame(target);
            if (++done === files.length) {
              fc.renderAll(); saveState();
              showToast(done + ' frame(s) filled ✓' + (frames.length > files.length
                ? ' — ' + (frames.length - files.length) + ' still empty' : ''));
            }
          };
          im.src = r.result;
        };
        r.readAsDataURL(f);
      });
    };
    inp.click();
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 6 · cloud completion       owner: Fable
   1. Big-file PPTX road (≥18 MB): /upload_url → resumable PUT → /parse
   2. Dissolve service: PDF / image / pptx → editable deck  (+ chart-crack)
   3. Templates feed: admin-uploaded free templates from Firestore
   All fragments ported from v1 (editor-v1-backup) with v2 host names.
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ 1 · BIG-FILE IMPORT ROAD (verbatim v1, goes around the proxy's
        32 MB request cap: editor → /upload_url → resumable PUT straight
        to Storage → /parse { gcsPath }) ════════════════════════════════ */
async function _ldAuthWait() {
  for (var w = 0; w < 24 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });
}
window.ldRequestUploadUrl = async function (file, ct) {
  await _ldAuthWait();
  var r = await fetch(window.LD_BACKEND + '/upload_url', {
    method: 'POST', headers: window.ldHeaders('application/json'),
    body: JSON.stringify({ filename: file.name || 'deck.pptx', contentType: ct })
  });
  if (r.status === 401 || r.status === 403) throw new Error('Please sign in first — PowerPoint import needs a signed-in designer account.');
  if (r.status === 404 || r.status === 405) throw new Error('Big-file service (/upload_url) is not on the deployed proxy — tell Fable status ' + r.status + '.');
  if (!r.ok) throw new Error('Could not start the upload (service error ' + r.status + ').');
  var j = await r.json();
  if (!j || !j.uploadUrl || !j.gcsPath) throw new Error('Upload service returned an unexpected response.');
  return j;
};
window.ldResumablePut = function (sessionUri, file, ct, onProgress) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUri, true);
    xhr.setRequestHeader('Content-Type', ct);
    xhr.setRequestHeader('Content-Range', 'bytes 0-' + (file.size - 1) + '/' + file.size);
    if (xhr.upload) xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 201) resolve();
      else reject(new Error('Upload failed (' + xhr.status + '). Please try again.'));
    };
    xhr.onerror = function () { reject(new Error('Upload connection failed — check your internet and try again.')); };
    xhr.ontimeout = function () { reject(new Error('Upload timed out — connection too slow. Try again on a stronger connection.')); };
    xhr.timeout = 15 * 60 * 1000;
    xhr.send(file);
  });
};
function _ldProgPill(id, html) {
  var el = document.getElementById(id);
  if (html == null) { if (el) el.remove(); return null; }
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:99999;background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);min-width:210px;text-align:center;';
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  return el;
}
function _ldBar(pct) {
  return '<div style="height:5px;background:rgba(255,255,255,.2);border-radius:3px;margin-top:7px;overflow:hidden;">' +
    '<div style="height:100%;width:' + pct + '%;background:#7C3AED;transition:width .2s;"></div></div>';
}
window.ldUploadProgress = function (frac, totalBytes) {
  if (frac == null) { _ldProgPill('ld-up-prog', null); return; }
  var pct = Math.round(frac * 100), mb = '';
  if (totalBytes) {
    var totMB = totalBytes / 1048576;
    mb = ' (' + (totMB * frac).toFixed(1) + ' of ' + totMB.toFixed(1) + ' MB)';
  }
  _ldProgPill('ld-up-prog', 'Uploading… ' + pct + '%' + mb + _ldBar(pct));
};
window.ldDownloadProgress = function (frac) {
  if (frac == null) { _ldProgPill('ld-dl-prog', null); return; }
  var pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
  _ldProgPill('ld-dl-prog', 'Loading design… ' + pct + '%' + _ldBar(pct));
};
/* Plain download of a (possibly large) JSON, streamed for progress. */
async function ldFetchPlainJson(url, onProgress, total) {
  var r = await fetch(url);
  if (!r.ok && r.status !== 206) throw new Error('Could not fetch the parsed deck (' + r.status + ').');
  if (!total) total = parseInt(r.headers.get('Content-Length') || '0', 10) || 0;
  if (r.body && r.body.getReader) {
    var reader = r.body.getReader(), chunks = [], received = 0;
    while (true) {
      var rd = await reader.read();
      if (rd.done) break;
      chunks.push(rd.value); received += rd.value.length;
      if (onProgress && total) onProgress(received / total);
    }
    var all = new Uint8Array(received), off = 0;
    for (var i = 0; i < chunks.length; i++) { all.set(chunks[i], off); off += chunks[i].length; }
    var txt = new TextDecoder('utf-8').decode(all);
    return { text: txt, json: JSON.parse(txt) };
  }
  var t = await r.text();
  return { text: t, json: JSON.parse(t) };
}
/* Storage throttles a single connection — pull big JSON in 6 parallel
   byte-ranges and stitch; ANY problem falls back to plain download. */
window.ldFetchLargeJson = async function (url, onProgress) {
  var total = 0;
  try {
    var head = await fetch(url, { method: 'HEAD' });
    if (head && head.ok) total = parseInt(head.headers.get('Content-Length') || '0', 10) || 0;
  } catch (e) { /* HEAD blocked — fall through to plain */ }
  if (!total || total < 8 * 1024 * 1024) return await ldFetchPlainJson(url, onProgress, total);
  try {
    var PARTS = 6, partSize = Math.ceil(total / PARTS), parts = new Array(PARTS), done = 0;
    await Promise.all(Array.from({ length: PARTS }, function (_u, k) {
      var start = k * partSize, end = Math.min(total - 1, start + partSize - 1);
      if (start > end) { parts[k] = new Uint8Array(0); return Promise.resolve(); }
      return fetch(url, { headers: { Range: 'bytes=' + start + '-' + end } })
        .then(function (rp) { if (!rp.ok && rp.status !== 206) throw new Error('range ' + rp.status); return rp.arrayBuffer(); })
        .then(function (buf) { parts[k] = new Uint8Array(buf); done += parts[k].length; if (onProgress) onProgress(done / total); });
    }));
    var all = new Uint8Array(total);
    for (var k = 0; k < PARTS; k++) { all.set(parts[k], k * partSize); }
    var txt = new TextDecoder('utf-8').decode(all);
    return { text: txt, json: JSON.parse(txt) };
  } catch (e) {
    return await ldFetchPlainJson(url, onProgress, total);
  }
};
window.ldParseByPath = async function (gcsPath) {
  await _ldAuthWait();
  var r = await fetch(window.LD_BACKEND + '/parse', {
    method: 'POST', headers: window.ldHeaders('application/json'),
    body: JSON.stringify({ gcsPath: gcsPath })
  });
  if (r.status === 401 || r.status === 403) throw new Error('Please sign in first — PowerPoint import needs a signed-in designer account.');
  if (!r.ok) {
    var det = ''; try { det = (await r.text()).slice(0, 200); } catch (e2) {}
    throw new Error('Import service error (' + r.status + ')' + (det ? ' — ' + det : ''));
  }
  var j = await r.json();
  /* big decks: worker parks IR in Storage, returns { irUrl, big:true } */
  if (j && j.big === true && j.irUrl) {
    showToast('Finishing up…');
    window.ldDownloadProgress(0);
    var res = await window.ldFetchLargeJson(j.irUrl, function (frac) { window.ldDownloadProgress(frac); });
    window.ldDownloadProgress(null);
    return res.json;
  }
  return j;
};
window.ldBigUploadParse = async function (file) {
  var ct = file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  window.ldUploadProgress(0, file.size);
  var t = await window.ldRequestUploadUrl(file, ct);
  await window.ldResumablePut(t.uploadUrl, file, ct, function (frac) { window.ldUploadProgress(frac, file.size); });
  window.ldUploadProgress(null);
  showToast('Parsing PPTX…');
  if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Parsing PPTX in LazyDog cloud…');
  try { return await window.ldParseByPath(t.gcsPath); }
  finally { if (window.ldParseHeartbeat) window.ldParseHeartbeat(false); }
};

/* ════ 2 · DISSOLVE SERVICE — PDF / image / pptx → fully editable deck ══ */
window.LD_DISSOLVE_URL   = window.LD_DISSOLVE_URL   || 'https://lazydog-dissolve-143000893683.us-central1.run.app';
/* 21 Aug 2026 (Fable) — no shared secret in the browser any more: the dissolve
   service accepts the user's Firebase sign-in (Authorization header) directly. */

window.dissolveFlatFile = async function (file) {
  var base = String(window.LD_DISSOLVE_URL || '').replace(/\/$/, '');
  if (!base) { showToast('Dissolve service not set up yet (LD_DISSOLVE_URL missing)'); return; }
  showToast('Dissolving ' + (file.name || 'file') + ' … this can take a moment', 8000);
  if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Dissolving ' + (file.name || 'file') + ' in LazyDog cloud…');
  if (window.ldBusy) window.ldBusy('upload', true);
  try {
    var fd = new FormData(); fd.append('file', file, file.name || 'upload');
    var headers = {};
    /* 20 Aug 2026 (Fable) — decompose is PAID work now (Javed's rules:
       PNG 25, PDF/page 20). Wait for the login token and send it; the
       service checks the balance and debits only on success. */
    if (window.ldWaitAuthToken) await window.ldWaitAuthToken(15000);
    if (window.LD_AUTH_TOKEN) headers['Authorization'] = 'Bearer ' + window.LD_AUTH_TOKEN;
    var r = await fetch(base + '/dissolve', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) {
      var det = '';
      try {
        var raw = await r.text();
        try { det = (JSON.parse(raw) || {}).message || raw.slice(0, 200); }
        catch (e3) { det = raw.slice(0, 200); }
      } catch (e2) {}
      if (r.status === 401) showToast(det || 'Sign in first to dissolve files 🔐', 8000);
      else if (r.status === 402) showToast(det || 'Your token limit is over — subscribe to continue.', 9000);
      else showToast('Dissolve failed (' + r.status + ')' + (det ? ' — ' + det : ''), 9000);
      return;
    }
    var blob = await r.blob();
    var nm = (file.name || 'design').replace(/\.[^.]+$/, '') + '_EDITABLE.pptx';
    var pptx = new File([blob], nm,
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    var ok = await window.ldImportPptxFile(pptx);
    if (ok) showToast('Dissolved → editable ✓');
    if (window.ldRefreshTokens) window.ldRefreshTokens();   /* balance chip */
  } catch (err) {
    showToast('Dissolve error: ' + ((err && err.message) || err));
  } finally {
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (window.ldBusy) window.ldBusy('upload', false);
  }
};

/* ── AUTO CHART-CRACK — after an import, chart-looking pictures are probed
   in the BACKGROUND against /crack_chart. A confirmed chart swaps in as a
   native editable chart; any refusal leaves the picture untouched. ── */
(function () {
  function looksChartish(src) {
    return new Promise(function (res) {
      try {
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas'); c.width = 64; c.height = 64;
            var g = c.getContext('2d'); g.drawImage(im, 0, 0, 64, 64);
            var d = g.getImageData(0, 0, 64, 64).data, buckets = {}, light = 0, sat = 0;
            for (var p = 0; p < d.length; p += 4) {
              var r = d[p], gg = d[p + 1], b = d[p + 2], a = d[p + 3];
              if (a < 30 || (r > 225 && gg > 225 && b > 225)) { light++; continue; }
              if (Math.max(r, gg, b) - Math.min(r, gg, b) > 60) {
                sat++;
                var k = (r >> 5) + '-' + (gg >> 5) + '-' + (b >> 5);
                buckets[k] = (buckets[k] || 0) + 1;
              }
            }
            var tot = 4096, dom = 0;
            for (var k2 in buckets) dom = Math.max(dom, buckets[k2]);
            res(light / tot > 0.35 && dom / tot > 0.04 && dom / tot < 0.55 && dom / Math.max(1, sat) > 0.5);
          } catch (e) { res(false); }
        };
        im.onerror = function () { res(false); };
        im.crossOrigin = 'anonymous';
        im.src = src;
      } catch (e) { res(false); }
    });
  }
  async function probeOne(el) {
    var base = String(window.LD_DISSOLVE_URL || '').replace(/\/$/, '');
    if (!base) return null;
    var blob = await (await fetch(el.src)).blob();
    var fd = new FormData(); fd.append('file', blob, 'chart.png');
    var headers = {};
    var r = await fetch(base + '/crack_chart', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) return null;
    return await r.json();
  }
  window.ldAutoCrackCharts = async function () {
    try {
      if (!window.LD_DISSOLVE_URL || !window._deckIR || !window._deckIR.size) return;
      var W = window._deckIR.size.w, H = window._deckIR.size.h, cracked = 0;
      for (var i = 0; i < state.pages.length; i++) {
        var ir = state.pages[i].ir;
        if (!ir || !ir.elements) continue;
        for (var j = 0; j < ir.elements.length; j++) {
          var el = ir.elements[j];
          if (!el || el.type !== 'image' || el.format === 'svg' || !el.src) continue;
          var rw = Math.abs(el.w) / W, rh = Math.abs(el.h) / H;
          if (rw < 0.28 || rh < 0.28 || rw > 0.92 || rh > 0.92) continue;
          if (!(await looksChartish(el.src))) continue;
          var chart = null;
          try { chart = await probeOne(el); } catch (e) { chart = null; }
          if (!chart || chart.type !== 'chart') continue;
          ir.elements[j] = Object.assign({}, chart, {
            id: el.id, origin: el.origin || 'slide',
            x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot || 0 });
          cracked++;
          state.pages[i].canvasJSON = null;
          if (i === state.currentPage) { try { await loadPageIntoCanvas(i); } catch (e) {} }
        }
      }
      if (cracked) {
        showToast(cracked + ' chart' + (cracked > 1 ? 's' : '') + ' made editable ✓', 5000);
        try { renderPageThumbs(); } catch (e) {}
      }
    } catch (e) { console.warn('auto-crack skipped', e); }
  };
})();

/* ════ 3 · TEMPLATES FEED — admin-uploaded free templates (Firestore) ═══ */
window._editorTemplates = window._editorTemplates || [];

async function ldRenderDeckThumb(deck, slideIdx) {
  try {
    var si = slideIdx || 0;
    if (!deck || !deck.slides || !deck.slides[si] || typeof fabric === 'undefined' || !deck.size) return null;
    var W = 280, H = Math.max(80, Math.round(W * (deck.size.h || 3) / (deck.size.w || 4)));
    var tf = new fabric.StaticCanvas(null, { width: W, height: H });
    tf._baseWidth = W; tf._baseHeight = H;
    await renderSlideIR(deck.slides[si], deck, tf);
    tf.renderAll();
    var url = tf.toDataURL({ format: 'jpeg', quality: 0.72 });
    try { tf.dispose(); } catch (_) {}
    return url;
  } catch (e) { console.warn('thumb render failed', e); return null; }
}
/* all slide thumbs for one template (detail view / hover rotation) */
window.ldTemplateSlideThumbs = async function (tpl, maxN) {
  if (!tpl) return [];
  if (!tpl._deck) {
    try {
      var r = await fetch(tpl.jsonUrl);
      if (!r.ok) return [];
      tpl._deck = await r.json();
    } catch (e) { return []; }
  }
  var n = Math.min(tpl._deck.slides.length, maxN || tpl._deck.slides.length);
  tpl.slideThumbs = tpl.slideThumbs || [];
  for (var i = 0; i < n; i++) {
    if (!tpl.slideThumbs[i]) {
      tpl.slideThumbs[i] = await ldRenderDeckThumb(tpl._deck, i);
      if (window.Editor && Editor._emit) Editor._emit('templates', { partial: true });
    }
  }
  return tpl.slideThumbs;
};

window.LD_loadEditorTemplates = async function () {
  try {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var fsMod  = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
      apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
      authDomain: 'templatehub-16cd7.firebaseapp.com',
      projectId: 'templatehub-16cd7',
      storageBucket: 'templatehub-16cd7.firebasestorage.app'
    });
    var db = fsMod.getFirestore(app);
    var snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'editor_templates'), fsMod.orderBy('createdAt', 'desc')));
    var out = [], els = [];
    snap.forEach(function (d) {
      var t = d.data();
      if (t.kind === 'element') {
        /* published ELEMENTS live in the same collection (kind:'element') so
           the existing admin-write/public-read rules cover them */
        els.push({ id: d.id, name: t.name, jsonUrl: t.jsonUrl, thumb: t.thumb || null });
        return;
      }
      out.push({ id: d.id, name: t.name, jsonUrl: t.jsonUrl, slideCount: t.slideCount, bg: t.bg });
    });
    window._editorTemplates = out;
    window._editorElements = els;
    if (window.Editor && Editor._emit) {
      Editor._emit('templates', { count: out.length });
      Editor._emit('elements', { count: els.length });
    }
    /* lazy thumbnails: fetch each deck once, render slide 1, re-emit */
    out.forEach(function (tpl) {
      if (!tpl.jsonUrl) return;
      fetch(tpl.jsonUrl).then(function (r) { return r.json(); })
        .then(function (deck) { tpl._deck = deck; return ldRenderDeckThumb(deck); })
        .then(function (url) {
          if (url) { tpl.thumb = url; if (window.Editor && Editor._emit) Editor._emit('templates', { count: out.length }); }
          return window.ldTemplateSlideThumbs(tpl, 6);
        }).catch(function () {});
    });
  } catch (e) {
    console.error('editor templates load failed', e);
    window._editorTemplates = window._editorTemplates || [];
  }
  return window._editorTemplates;
};
/* load shortly after boot — never blocks the editor */
setTimeout(function () { try { window.LD_loadEditorTemplates(); } catch (e) {} }, 1500);

/* ════ commands ════ */
Editor._register({
  dissolve: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.pdf,.png,.jpg,.jpeg,.pptx';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (f) window.dissolveFlatFile(f);
    };
    inp.click();
  },
  templateThumbs: function (id) {
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (tpl) window.ldTemplateSlideThumbs(tpl);
  },
  /* add ONE slide of a template to the current design (Canva behaviour) */
  applyTemplateSlide: async function (arg) {
    var id = arg && arg.id, idx = (arg && arg.i) | 0;
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (!tpl) { showToast('Template not found'); return; }
    try {
      if (!tpl._deck) {
        var r = await fetch(tpl.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        tpl._deck = await r.json();
      }
      var deck = tpl._deck;
      if (!deck.slides[idx]) { showToast('That slide is missing'); return; }
      addPage();
      await new Promise(function (res) { setTimeout(res, 150); });
      await renderSlideIR(deck.slides[idx], deck, fc);
      fc.renderAll();
      captureCurrentPage();
      saveState();
      renderPageThumbs();
      showToast('Slide ' + (idx + 1) + ' of "' + (tpl.name || 'template') + '" added ✓');
    } catch (e) {
      console.error('applyTemplateSlide', e);
      showToast('Could not add that slide: ' + e.message);
    }
  },
  applyTemplate: async function (id) {
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (!tpl) { showToast('Template not found'); return; }
    try {
      showToast('Opening "' + (tpl.name || 'template') + '"…');
      var deck = tpl._deck;
      if (!deck) {
        var r = await fetch(tpl.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        deck = await r.json();
        tpl._deck = deck;
      }
      window._deckIR = deck;
      await window.loadDeckIRIntoEditor(deck);
      showToast('"' + (tpl.name || 'Template') + '" loaded ✓');
    } catch (e) {
      console.error('applyTemplate', e);
      showToast('Could not open template: ' + e.message);
    }
  }
});


/* ════ 4 · PUBLISH AS TEMPLATE (admin-only experiment road, 11 Aug) ════
   The cloud side already existed: Storage path editor_templates/ (admin
   write, public read) + Firestore collection editor_templates (same).
   This is the missing button: current deck → IR JSON → Storage →
   Firestore record → appears in every visitor's Templates panel. */
var LD_ADMIN_EMAILS = ['javed5395@gmail.com', 'lazydogtemplates@gmail.com'];
Editor._register({
  publishTemplate: async function () {
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Publishing templates is for the LazyDog admin account — sign in as admin first', 5000);
        return;
      }
      var name = await window.ldPrompt('Template name (shown in the Templates panel):', '',
        'Template ' + new Date().toLocaleDateString());
      if (!name || !name.trim()) return;
      showToast('Building template…');
      var deck = await buildEffectiveDeckIR();
      if (!deck || !deck.slides || !deck.slides.length) { showToast('Nothing to publish — the deck is empty'); return; }
      var json = JSON.stringify(deck);
      showToast('Uploading (' + Math.round(json.length / 1024) + ' KB)…');
      var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      /* the auth module may have initialised the app WITHOUT storageBucket —
         name the bucket explicitly so it can never depend on init order */
      var storage = stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app');
      var id = 'tpl_' + Date.now();
      var ref = stMod.ref(storage, 'editor_templates/' + id + '.json');
      await stMod.uploadBytes(ref, new Blob([json], { type: 'application/json' }));
      var jsonUrl = await stMod.getDownloadURL(ref);
      var db = fsMod.getFirestore(app);
      var bg = null;
      try {
        var bg0 = deck.slides[0] && deck.slides[0].bg;
        if (bg0 && bg0.color) bg = bg0.color;
      } catch (e) {}
      await fsMod.setDoc(fsMod.doc(db, 'editor_templates', id), {
        name: name.trim(),
        jsonUrl: jsonUrl,
        slideCount: deck.slides.length,
        bg: bg,
        createdAt: fsMod.serverTimestamp()
      });
      showToast('“' + name.trim() + '” published ✓ — it is now in the Templates panel for everyone', 6000);
      try { window.LD_loadEditorTemplates(); } catch (e) {}
    } catch (e) {
      console.error('publishTemplate', e);
      showToast('Publish failed: ' + ((e && e.message) || e), 7000);
    }
  },

  /* ── PUBLISH SELECTED OBJECT(S) AS A PUBLIC ELEMENT (admin) ──
     Same road as publishTemplate: Storage editor_templates/ + Firestore
     editor_templates with kind:'element' → appears in everyone's
     Elements panel under "Custom elements". */
  publishElement: async function () {
    try {
      var o = fc && fc.getActiveObject();
      if (!o) { showToast('Select the object(s) on the canvas first, then publish'); return; }
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Publishing elements is for the LazyDog admin account — sign in as admin first', 5000);
        return;
      }
      var name = await window.ldPrompt('Element name (shown in the Elements panel):', '', 'Element');
      if (!name || !name.trim()) return;
      /* serialize the selection (single object OR multi-selection) */
      var objs = (o.type === 'activeSelection') ? o._objects : [o];
      var data = { objects: objs.map(function (x) { return x.toJSON(FABRIC_JSON_PROPS); }) };
      /* small PNG preview for the panel tile */
      var thumb = null;
      try { thumb = o.toDataURL({ format: 'png', multiplier: Math.min(1, 140 / Math.max(o.getScaledWidth(), o.getScaledHeight())) }); } catch (e) {}
      var json = JSON.stringify(data);
      showToast('Publishing element (' + Math.round(json.length / 1024) + ' KB)…');
      var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      var storage = stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app');
      var id = 'el_' + Date.now();
      var ref = stMod.ref(storage, 'editor_templates/' + id + '.json');
      await stMod.uploadBytes(ref, new Blob([json], { type: 'application/json' }));
      var jsonUrl = await stMod.getDownloadURL(ref);
      await fsMod.setDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id), {
        kind: 'element',
        name: name.trim(),
        jsonUrl: jsonUrl,
        thumb: thumb && thumb.length < 500000 ? thumb : null,
        createdAt: fsMod.serverTimestamp()
      });
      showToast('“' + name.trim() + '” published ✓ — now in the Elements panel for everyone', 6000);
      try { window.LD_loadEditorTemplates(); } catch (e) {}
    } catch (e) {
      console.error('publishElement', e);
      showToast('Publish failed: ' + ((e && e.message) || e), 7000);
    }
  },

  /* insert a published element onto the canvas (everyone) */
  insertElement: async function (id) {
    var ce = (window._editorElements || []).filter(function (t) { return t.id === id; })[0];
    if (!ce) { showToast('Element not found'); return; }
    try {
      if (!ce._data) {
        var r = await fetch(ce.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        ce._data = await r.json();
      }
      fabric.util.enlivenObjects(ce._data.objects || [], function (objs) {
        if (!objs || !objs.length) { showToast('Could not load that element'); return; }
        var g = objs.length > 1 ? new fabric.Group(objs) : objs[0];
        g.set({ left: 200, top: 140, layerName: ce.name || 'Element' });
        g.setCoords();
        fc.add(g).setActiveObject(g);
        fc.renderAll(); saveState();
        showToast((ce.name || 'Element') + ' added');
      });
    } catch (e) {
      console.error('insertElement', e);
      showToast('Could not insert element: ' + e.message);
    }
  },

  /* remove a published element (admin) */
  deleteElement: async function (id) {
    if (!id) return;
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Removing elements is for the LazyDog admin account', 4500);
        return;
      }
      var ce = (window._editorElements || []).filter(function (t) { return t.id === id; })[0];
      if (!(await window.ldConfirm('Remove "' + ((ce && ce.name) || id) + '" from the Elements panel for everyone?', 'Remove'))) return;
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      await fsMod.deleteDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id));
      try {
        var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
        await stMod.deleteObject(stMod.ref(stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app'), 'editor_templates/' + id + '.json'));
      } catch (e2) {}
      window._editorElements = (window._editorElements || []).filter(function (t) { return t.id !== id; });
      if (window.Editor && Editor._emit) Editor._emit('elements', { count: window._editorElements.length });
      showToast('Element removed ✓');
    } catch (e) {
      console.error('deleteElement', e);
      showToast('Remove failed: ' + ((e && e.message) || e), 6000);
    }
  },

  /* remove a published template (admin) — deletes the Firestore record and
     the JSON in Storage; the panel refreshes for everyone on next load */
  deleteTemplate: async function (id) {
    if (!id) return;
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Removing templates is for the LazyDog admin account', 4500);
        return;
      }
      var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
      if (!(await window.ldConfirm('Remove "' + ((tpl && tpl.name) || id) + '" from the Templates panel for everyone?', 'Remove'))) return;
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      await fsMod.deleteDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id));
      /* best effort: the JSON file in Storage (new publishes use <id>.json) */
      try {
        var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
        await stMod.deleteObject(stMod.ref(stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app'), 'editor_templates/' + id + '.json'));
      } catch (e2) { /* older records may keep their JSON elsewhere — fine */ }
      window._editorTemplates = (window._editorTemplates || []).filter(function (t) { return t.id !== id; });
      if (window.Editor && Editor._emit) Editor._emit('templates', { count: window._editorTemplates.length });
      showToast('Template removed ✓');
    } catch (e) {
      console.error('deleteTemplate', e);
      showToast('Remove failed: ' + ((e && e.message) || e), 6000);
    }
  }
});

/* ════ 5 · LIVE ACCOUNT — same Firebase auth as the main LazyDog site ════
   Auth state is shared per-origin, so a user signed in on the main pages is
   automatically signed in here too. The avatar in the top bar shows the
   real user; Sign in / Sign out work from the editor itself. */
(function () {
  var FB_CONFIG = {
    apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
    authDomain: 'templatehub-16cd7.firebaseapp.com',
    projectId: 'templatehub-16cd7',
    storageBucket: 'templatehub-16cd7.firebasestorage.app'
  };
  async function fbAuth() {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FB_CONFIG);
    return { auth: authMod.getAuth(app), mod: authMod };
  }
  /* watch auth state from boot — picks up an existing main-site session */
  setTimeout(async function () {
    try {
      var A = await fbAuth();
      /* 20 Aug 2026 (Fable) — completes a desktop-app redirect sign-in: the
         app comes back from accounts.google.com to this page, and this call
         turns the returned credential into a session. No-op on the website. */
      try { await A.mod.getRedirectResult(A.auth); } catch (e) {}
      A.mod.onAuthStateChanged(A.auth, function (u) {
        window._ldUser = u ? { email: u.email, name: u.displayName, photo: u.photoURL } : null;
        if (window.Editor && Editor._emit) Editor._emit('user', window._ldUser);
      });
    } catch (e) { console.warn('auth watcher failed', e); }
  }, 1200);

  Editor._register({
    signIn: async function () {
      try {
        var A = await fbAuth();
        /* 21 Aug 2026 (Fable) — EMAIL + PASSWORD alongside Google. The last
           Microsoft Store blocker: a reviewer cannot pass Google's device-
           verification on our test account from an unknown machine, so the
           app must offer a plain email sign-in. The modal below asks which;
           the Google paths underneath are unchanged. Also right on its own —
           customers without a Google account were being turned away. */
        var choice = await window.ldSignInModal();
        if (!choice) return;
        if (choice.mode === 'email') {
          await A.mod.signInWithEmailAndPassword(A.auth, choice.email, choice.pass);
          showToast('Signed in ✓');
          return;
        }
        /* 20 Aug 2026 (Fable) — INSIDE THE DESKTOP APP the popup flow is a
           dead end. Google refuses OAuth inside ANY embedded window, so the
           app signs in through the user's REAL browser: main process opens
           app_login.html there, the page mints a custom token via
           mint_app_token, and hands it back over loopback. */
        if (window.lazydogDesktop && window.lazydogDesktop.googleLogin) {
          showToast('Opening Google sign-in in your browser…', 6000);
          var ct = await window.lazydogDesktop.googleLogin();
          if (!ct) { showToast('Sign-in was cancelled or timed out', 5000); return; }
          await A.mod.signInWithCustomToken(A.auth, ct);
          showToast('Signed in ✓');
          return;
        }
        await A.mod.signInWithPopup(A.auth, new A.mod.GoogleAuthProvider());
        showToast('Signed in ✓');
      } catch (e) {
        if (e && /popup-closed/.test(String(e.code))) return;
        console.error('signIn', e);
        var m = String((e && e.code) || '');
        showToast(/invalid-credential|wrong-password|user-not-found|invalid-email/.test(m)
          ? 'Email or password is not right — try again 🔐'
          : 'Sign-in failed: ' + ((e && e.message) || e), 6000);
      }
    },
    signOut: async function () {
      try {
        var A = await fbAuth();
        await A.mod.signOut(A.auth);
        showToast('Signed out');
      } catch (e) { showToast('Sign-out failed: ' + ((e && e.message) || e), 5000); }
    }
  });
})();


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 7 · LIVE CHARTS + DATA     owner: Fable
   Full v1 chart system: 20 chart kinds drawn on canvas (no libraries),
   every placed chart keeps its chartDef so data stays editable forever,
   Data panel: CSV / Excel / Google-Sheet datasets → connect to any chart.
   Live tables: every cell its own editable text.
   ═══════════════════════════════════════════════════════════════════════ */

var CHART_PALETTE = ['#7C3AED', '#12A5A0', '#E8590C', '#EAB308', '#2563EB', '#DB2777', '#059669', '#64748B'];

var CHART_TYPES = [
  { id:'column',        name:'Column',          group:'Bar & column' },
  { id:'column-stack',  name:'Stacked column',  group:'Bar & column' },
  { id:'bar',           name:'Bar',             group:'Bar & column' },
  { id:'bar-stack',     name:'Stacked bar',     group:'Bar & column' },
  { id:'column-group',  name:'Grouped column',  group:'Bar & column' },
  { id:'line',          name:'Line',            group:'Line & area' },
  { id:'line-smooth',   name:'Smooth line',     group:'Line & area' },
  { id:'line-marker',   name:'Line + markers',  group:'Line & area' },
  { id:'area',          name:'Area',            group:'Line & area' },
  { id:'area-stack',    name:'Stacked area',    group:'Line & area' },
  { id:'pie',           name:'Pie',             group:'Pie & parts' },
  { id:'donut',         name:'Donut',           group:'Pie & parts' },
  { id:'half-donut',    name:'Half donut',      group:'Pie & parts' },
  { id:'progress',      name:'Progress ring',   group:'Pie & parts' },
  { id:'funnel',        name:'Funnel',          group:'Pie & parts' },
  { id:'scatter',       name:'Scatter',         group:'Distribution' },
  { id:'bubble',        name:'Bubble',          group:'Distribution' },
  { id:'radar',         name:'Radar',           group:'Distribution' },
  { id:'gauge',         name:'Gauge',           group:'Distribution' },
  { id:'waterfall',     name:'Waterfall',       group:'Distribution' }
];

var CHART_SAMPLE = {
  cats: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Revenue', data: [42, 58, 49, 71] },
    { name: 'Cost',    data: [28, 33, 30, 38] }
  ]
};

/* Draw a chart onto a 2D context sized w x h. Pure canvas, no libraries. */
function drawChart(ctx, w, h, type, def) {
  var d = def || CHART_SAMPLE;
  var s0 = d.series[0].data, s1 = (d.series[1] || d.series[0]).data;
  /* labels sized to the chart so a big placed chart reads clearly */
  var F = Math.max(12, Math.round(h * 0.055));
  var pad = { l: Math.max(40, F * 2.6), r: 16, t: F + 6, b: F * 2 };
  var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  var maxV = Math.max.apply(null, s0.concat(s1)) * 1.15;
  var P = CHART_PALETTE;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  ctx.font = 'bold ' + F + 'px Arial, sans-serif';
  ctx.textBaseline = 'middle';

  function axes(vertical) {
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + ih * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + iw, y); ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxV * (1 - i / 4)), pad.l - 8, y);
    }
    if (vertical !== false) {
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      d.cats.forEach(function (c, i) {
        ctx.fillText(c, pad.l + iw * (i + 0.5) / d.cats.length, h - pad.b + F);
      });
    }
  }
  function bars(horizontal, stacked, grouped) {
    axes(!horizontal);
    var n = d.cats.length;
    for (var i = 0; i < n; i++) {
      if (horizontal) {
        var slot = ih / n, bh = slot * 0.5, y0 = pad.t + slot * i + (slot - bh) / 2;
        var bw = iw * s0[i] / maxV;
        ctx.fillStyle = P[0]; ctx.fillRect(pad.l, y0, bw, bh);
        if (stacked) { ctx.fillStyle = P[1]; ctx.fillRect(pad.l + bw, y0, iw * s1[i] / maxV, bh); }
      } else {
        var slotw = iw / n, bwid = slotw * (grouped ? 0.28 : 0.46);
        var x0 = pad.l + slotw * i + (slotw - bwid * (grouped ? 2 : 1)) / 2;
        var bh0 = ih * s0[i] / maxV;
        ctx.fillStyle = P[0];
        ctx.fillRect(x0, pad.t + ih - bh0, bwid, bh0);
        if (grouped) {
          ctx.fillStyle = P[1];
          var bh1 = ih * s1[i] / maxV;
          ctx.fillRect(x0 + bwid + 2, pad.t + ih - bh1, bwid, bh1);
        } else if (stacked) {
          ctx.fillStyle = P[1];
          var bh2 = ih * s1[i] / maxV;
          ctx.fillRect(x0, pad.t + ih - bh0 - bh2, bwid, bh2);
        }
      }
    }
  }
  function pts(arr) {
    return arr.map(function (v, i) {
      return [pad.l + iw * (i + 0.5) / arr.length, pad.t + ih * (1 - v / maxV)];
    });
  }
  function poly(p, smooth) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) {
      if (smooth) {
        var cx = (p[i - 1][0] + p[i][0]) / 2;
        ctx.bezierCurveTo(cx, p[i - 1][1], cx, p[i][1], p[i][0], p[i][1]);
      } else ctx.lineTo(p[i][0], p[i][1]);
    }
  }
  function pieSlices(inner, sweep, cx, cy, r) {
    var tot = s0.reduce(function (a, b) { return a + b; }, 0), a0 = -Math.PI / 2;
    s0.forEach(function (v, i) {
      var a1 = a0 + sweep * v / tot;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
      ctx.fillStyle = P[i % P.length]; ctx.fill();
      a0 = a1;
    });
    if (inner) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, r * inner, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.36;

  switch (type) {
    case 'column':       bars(false, false, false); break;
    case 'column-stack': bars(false, true,  false); break;
    case 'column-group': bars(false, false, true);  break;
    case 'bar':          bars(true,  false, false); break;
    case 'bar-stack':    bars(true,  true,  false); break;

    case 'line': case 'line-smooth': case 'line-marker': {
      axes();
      var p = pts(s0);
      poly(p, type === 'line-smooth');
      ctx.strokeStyle = P[0]; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      if (type === 'line-marker') {
        p.forEach(function (q) {
          ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = P[0]; ctx.lineWidth = 2; ctx.stroke();
        });
      }
      break;
    }
    case 'area': case 'area-stack': {
      axes();
      [s1, s0].forEach(function (ser, k) {
        if (type === 'area' && k === 0) return;
        var q = pts(ser);
        poly(q, true);
        ctx.lineTo(q[q.length - 1][0], pad.t + ih);
        ctx.lineTo(q[0][0], pad.t + ih);
        ctx.closePath();
        ctx.fillStyle = k === 0 ? P[1] + '66' : P[0] + '66';
        ctx.fill();
        poly(q, true);
        ctx.strokeStyle = k === 0 ? P[1] : P[0]; ctx.lineWidth = 2; ctx.stroke();
      });
      break;
    }

    case 'pie':       pieSlices(0,    Math.PI * 2, cx, cy, r); break;
    case 'donut':     pieSlices(0.58, Math.PI * 2, cx, cy, r); break;
    case 'half-donut':
      pieSlices(0.55, Math.PI, cx, cy + r * 0.45, r * 1.2);
      break;
    case 'progress': {
      var pct = 0.68;
      ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#EDE9FE'; ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = P[0]; ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(r * 0.5) + 'px Arial, sans-serif';
      ctx.fillText(Math.round(pct * 100) + '%', cx, cy);
      break;
    }
    case 'funnel': {
      var n = s0.length, fh = ih / n;
      s0.slice().sort(function (a, b) { return b - a; }).forEach(function (v, i) {
        var wTop = iw * v / maxV, wBot = iw * (s0[i + 1] || v * 0.7) / maxV;
        var y = pad.t + fh * i;
        ctx.beginPath();
        ctx.moveTo(cx - wTop / 2, y); ctx.lineTo(cx + wTop / 2, y);
        ctx.lineTo(cx + wBot / 2, y + fh - 3); ctx.lineTo(cx - wBot / 2, y + fh - 3);
        ctx.closePath();
        ctx.fillStyle = P[i % P.length]; ctx.fill();
      });
      break;
    }
    case 'scatter': case 'bubble': {
      axes(false);
      for (var i = 0; i < 14; i++) {
        var px = pad.l + iw * ((i * 37) % 100) / 100;
        var py = pad.t + ih * (1 - ((i * 53) % 90) / 100);
        var rad = type === 'bubble' ? 4 + ((i * 29) % 11) : 4;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fillStyle = P[i % 3] + (type === 'bubble' ? '99' : 'FF');
        ctx.fill();
      }
      break;
    }
    case 'radar': {
      var n2 = 6, rr = Math.min(w, h) * 0.34;
      for (var ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        for (var k = 0; k <= n2; k++) {
          var a = -Math.PI / 2 + k * 2 * Math.PI / n2;
          var x = cx + Math.cos(a) * rr * ring / 3, y = cy + Math.sin(a) * rr * ring / 3;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath();
      var vals = [0.9, 0.6, 0.75, 0.5, 0.85, 0.65];
      for (var k2 = 0; k2 <= n2; k2++) {
        var a2 = -Math.PI / 2 + k2 * 2 * Math.PI / n2, v2 = vals[k2 % n2];
        var x2 = cx + Math.cos(a2) * rr * v2, y2 = cy + Math.sin(a2) * rr * v2;
        k2 ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2);
      }
      ctx.closePath();
      ctx.fillStyle = P[0] + '55'; ctx.fill();
      ctx.strokeStyle = P[0]; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'gauge': {
      var gcy = cy + r * 0.4;
      ctx.lineWidth = r * 0.26; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(cx, gcy, r, Math.PI, 0);
      ctx.strokeStyle = '#EDE9FE'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, gcy, r, Math.PI, Math.PI + Math.PI * 0.72);
      ctx.strokeStyle = P[0]; ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(r * 0.34) + 'px Arial, sans-serif';
      ctx.fillText('72', cx, gcy - r * 0.28);
      break;
    }
    case 'waterfall': {
      axes();
      var run = 0, nn = s0.length, sw = iw / nn;
      s0.forEach(function (v, i) {
        var delta = i === 0 ? v : v - s0[i - 1];
        var y0 = pad.t + ih * (1 - (run + Math.max(delta, 0)) / maxV);
        var hh = Math.abs(ih * delta / maxV);
        ctx.fillStyle = delta >= 0 ? P[1] : P[2];
        ctx.fillRect(pad.l + sw * i + sw * 0.25, y0, sw * 0.5, Math.max(2, hh));
        run += delta;
      });
      break;
    }
  }
}

/* v1 addChart used histLabel; v2 host has saveState only */
function addChartV2(type) {
  if (!fc) return;
  var slideW = fc.getWidth() / fc.getZoom();
  var slideH = fc.getHeight() / fc.getZoom();
  var W = Math.round(Math.min(slideW * 0.55, 620));
  var H = Math.round(W * 0.62);
  var cv = document.createElement('canvas');
  var dpr = 2;
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawChart(ctx, W, H, type);
  fabric.Image.fromURL(cv.toDataURL('image/png'), function (img) {
    img.set({
      left: (slideW - W) / 2, top: (slideH - H) / 2,
      scaleX: W / img.width, scaleY: H / img.height,
      chartType: type,
      chartDef: JSON.parse(JSON.stringify(CHART_SAMPLE))
    });
    fc.add(img); fc.setActiveObject(img);
    fc.renderAll();
    saveState();
    showToast('Chart added — connect data from the Data panel any time');
  });
}

function chartRedraw(o, def) {
  if (!o || !o.chartType || !fc) return;
  var W = Math.round((o.width || 600) * (o.scaleX || 1));
  var H = Math.round((o.height || 380) * (o.scaleY || 1));
  var dpr = 2;
  var cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawChart(ctx, W, H, o.chartType, def);
  var left = o.left, top = o.top, angle = o.angle;
  o.setSrc(cv.toDataURL('image/png'), function () {
    o.set({ left: left, top: top, angle: angle,
            scaleX: W / o.width, scaleY: H / o.height });
    fc.requestRenderAll();
  });
}

/* chart previews for the sidebar cards (engine-drawn, sidebar just shows) */
var _chartThumbCache = {};
function chartThumb(type) {
  if (_chartThumbCache[type]) return _chartThumbCache[type];
  var cv = document.createElement('canvas');
  cv.width = 264; cv.height = 164;
  var ctx = cv.getContext('2d');
  ctx.scale(2, 2);
  try { drawChart(ctx, 132, 82, type); } catch (e) {}
  return (_chartThumbCache[type] = cv.toDataURL('image/png'));
}

/* ════ DATA — datasets (CSV / Excel / Google Sheet / samples) ════ */
function parseCSV(text) {
  var rows = [], row = [], cur = '', q = false;
  text = String(text).replace(/^\ufeff/, '');
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c === '\r') { /* skip */ }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
}

function rowsToDataset(rows, name) {
  if (!rows.length) return null;
  var header = rows[0];
  var seriesNames = header.slice(1).map(function (h, i) {
    return String(h).trim() || ('Series ' + (i + 1));
  });
  var cats = [], series = seriesNames.map(function (n) { return { name: n, data: [] }; });
  for (var r = 1; r < rows.length; r++) {
    cats.push(String(rows[r][0] == null ? '' : rows[r][0]).trim() || ('Row ' + r));
    for (var c = 0; c < series.length; c++) {
      var raw = String(rows[r][c + 1] == null ? '' : rows[r][c + 1]).replace(/[^0-9.eE+-]/g, '');
      var v = parseFloat(raw);
      series[c].data.push(isFinite(v) ? v : 0);
    }
  }
  if (!cats.length || !series.length) return null;
  return { id: 'ds' + Date.now(), name: name, source: 'csv', cats: cats, series: series, ts: Date.now() };
}

/* .xlsx is a zip of XML — JSZip is already here for PPTX, no new dep */
function parseXLSX(arrayBuffer) {
  if (typeof JSZip === 'undefined') return Promise.resolve(null);
  return JSZip.loadAsync(arrayBuffer).then(function (zip) {
    var sheetFile = null;
    zip.forEach(function (path) {
      if (!sheetFile && /^xl\/worksheets\/sheet1\.xml$/i.test(path)) sheetFile = path;
    });
    if (!sheetFile) return null;
    var shared = zip.file('xl/sharedStrings.xml');
    return Promise.all([
      zip.file(sheetFile).async('string'),
      shared ? shared.async('string') : Promise.resolve('')
    ]).then(function (res) {
      var sheetXml = res[0], sharedXml = res[1];
      var strings = [];
      if (sharedXml) {
        var si = sharedXml.match(/<si>[\s\S]*?<\/si>/g) || [];
        strings = si.map(function (blk) {
          return (blk.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
            .map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('');
        });
      }
      var grid = {}, maxC = 0, maxR = 0;
      (sheetXml.match(/<c [^>]*?r="([A-Z]+)(\d+)"[^>]*>(?:[\s\S]*?)<\/c>|<c [^>]*\/>/g) || [])
        .forEach(function (cell) {
          var ref = cell.match(/r="([A-Z]+)(\d+)"/);
          if (!ref) return;
          var col = 0;
          for (var k = 0; k < ref[1].length; k++) col = col * 26 + (ref[1].charCodeAt(k) - 64);
          col -= 1;
          var rowN = parseInt(ref[2], 10) - 1;
          var isStr = /t="s"/.test(cell);
          var vm = cell.match(/<v>([\s\S]*?)<\/v>/);
          var inline = cell.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          var val = vm ? vm[1] : (inline ? inline[1].replace(/<[^>]+>/g, '') : '');
          if (isStr && vm) val = strings[parseInt(vm[1], 10)] || '';
          grid[rowN + ':' + col] = val;
          if (col > maxC) maxC = col;
          if (rowN > maxR) maxR = rowN;
        });
      var rows = [];
      for (var r = 0; r <= maxR; r++) {
        var row = [];
        for (var c = 0; c <= maxC; c++) row.push(grid[r + ':' + c] == null ? '' : grid[r + ':' + c]);
        rows.push(row);
      }
      return rows;
    });
  }).catch(function () { return null; });
}

var SAMPLE_DATA = [
  { name:'Quarterly revenue', cats:['Q1','Q2','Q3','Q4'],
    series:[{name:'Revenue',data:[42,58,49,71]},{name:'Cost',data:[28,33,30,38]}] },
  { name:'Monthly signups', cats:['Jan','Feb','Mar','Apr','May','Jun'],
    series:[{name:'Free',data:[120,145,138,190,210,265]},{name:'Paid',data:[18,24,31,29,44,58]}] },
  { name:'Traffic by channel', cats:['Search','Social','Direct','Email','Referral'],
    series:[{name:'Sessions',data:[4200,3100,2600,1400,900]}] },
  { name:'Team headcount', cats:['Eng','Sales','Support','Design','Ops'],
    series:[{name:'2025',data:[24,18,12,7,5]},{name:'2026',data:[31,22,15,9,6]}] }
];

state.datasets = state.datasets || [];
function dataSets() { return state.datasets; }
function dataEmit() { if (window.Editor && Editor._emit) Editor._emit('datasets', { count: dataSets().length }); }

function dataAdd(ds) {
  if (!ds) { showToast('Could not read that file'); return; }
  dataSets().unshift(ds);
  state.datasets = dataSets().slice(0, 20);
  dataEmit();
  showToast('Loaded “' + ds.name + '” — ' + ds.cats.length + ' rows, ' + ds.series.length + ' series');
}

function dataRepaintCharts(dsId) {
  var ds = dataSets().filter(function (d) { return d.id === dsId; })[0];
  if (!ds || !fc || !fc.getObjects) return;
  (fc.getObjects() || []).forEach(function (o) {
    if (o.datasetId === dsId) {
      o.chartDef = { cats: ds.cats, series: ds.series };
      chartRedraw(o, o.chartDef);
    }
  });
}

/* dblclick a chart → helpful pointer (data lives in the Data panel) */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    if (!fc || !fc.on) return;
    fc.on('mouse:dblclick', function (opt) {
      var o = opt && opt.target;
      if (o && o.chartType) showToast('Chart data: open the Data panel (left rail) — load a CSV / Excel / sample, then Connect');
    });
  }, 800);
});

/* ════ commands + queries ════ */
Editor._register({
  insertChart: function (type) { addChartV2(type || 'column'); },

  /* live table: every cell is its OWN editable text — dblclick any cell to
     type; select-drag across cells to move the table together */
  insertTable: function (opt) {
    /* proper table: each cell = padded rectangle + its own editable text.
       Sized for the slide (canvas coords are large), roomy rows like Canva. */
    var rows = (opt && +opt.rows) || 3, cols = (opt && +opt.cols) || 3;
    var W = fc.getWidth() / fc.getZoom();
    var tableW = Math.min(W * 0.62, cols * 340);
    var cw = Math.round(tableW / cols);
    var rh = Math.round(Math.max(84, cw * 0.32));
    var x0 = Math.round((W - cw * cols) / 2), y0 = 160;
    var fs = Math.round(rh * 0.30);
    var tid = 'tbl' + Date.now();
    var made = [];
    var r, c;
    /* cell backgrounds first (they sit behind the text) */
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var bg = new fabric.Rect({
        left: x0 + c * cw, top: y0 + r * rh, width: cw, height: rh,
        fill: r === 0 ? '#7C3AED' : (r % 2 ? '#F7F4FD' : '#FFFFFF'),
        stroke: '#D9C9F9', strokeWidth: 1.5,
        tableId: tid, layerName: 'Table cell'
      });
      made.push(bg); fc.add(bg);
    }
    /* editable text, vertically centred with padding */
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var tx = new fabric.Textbox(r === 0 ? 'Header' : 'Cell', {
        left: x0 + c * cw + Math.round(cw * 0.07),
        width: cw - Math.round(cw * 0.14),
        fontSize: fs, fontFamily: 'DM Sans',
        fontWeight: r === 0 ? '600' : 'normal',
        fill: r === 0 ? '#FFFFFF' : '#1F2430',
        tableId: tid, layerName: 'Table text'
      });
      tx.set('top', y0 + r * rh + Math.round((rh - tx.height) / 2));
      made.push(tx); fc.add(tx);
    }
    var sel = new fabric.ActiveSelection(made, { canvas: fc });
    fc.setActiveObject(sel);
    fc.renderAll(); saveState();
    showToast('Table added — double-click any cell to type');
  },

  dataCsv: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function (e) {
        dataAdd(rowsToDataset(parseCSV(e.target.result), f.name.replace(/\.[^.]+$/, '')));
      };
      rd.readAsText(f);
    };
    inp.click();
  },
  dataXlsx: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.xlsx';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function (e) {
        parseXLSX(e.target.result).then(function (rowsA) {
          if (!rowsA) { showToast('Could not read that spreadsheet'); return; }
          var ds = rowsToDataset(rowsA, f.name.replace(/\.[^.]+$/, ''));
          if (ds) ds.source = 'xlsx';
          dataAdd(ds);
        });
      };
      rd.readAsArrayBuffer(f);
    };
    inp.click();
  },
  dataSheet: async function () {
    var url = await window.ldPrompt('Paste a Google Sheets “Publish to web” CSV link:\n\nFile → Share → Publish to web → Comma-separated values (.csv)', 'https://docs.google.com/…/pub?output=csv');
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) { showToast('That does not look like a link'); return; }
    showToast('Fetching sheet…');
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (txt) {
      var ds = rowsToDataset(parseCSV(txt), 'Google Sheet');
      if (!ds) throw new Error('empty');
      ds.source = 'sheet'; ds.url = url;
      dataAdd(ds);
    }).catch(function () {
      showToast('Could not fetch — is the sheet published to the web?');
    });
  },
  dataSample: function (i) {
    var s = SAMPLE_DATA[i | 0];
    if (!s) return;
    dataAdd({ id: 'ds' + Date.now(), name: s.name, source: 'sample',
      cats: s.cats.slice(), series: JSON.parse(JSON.stringify(s.series)), ts: Date.now() });
  },
  dataConnect: function (id) {
    var ds = dataSets().filter(function (d) { return d.id === id; })[0];
    var o = fc && fc.getActiveObject();
    if (!ds) return;
    if (!o || !o.chartType) { showToast('Select a chart on the slide first, then press Connect'); return; }
    o.datasetId = ds.id;
    o.chartDef = { cats: ds.cats, series: ds.series };
    chartRedraw(o, o.chartDef);
    saveState();
    showToast('“' + ds.name + '” connected to this chart ✓');
  },
  dataRefresh: function (id) {
    var ds = dataSets().filter(function (d) { return d.id === id; })[0];
    if (!ds) return;
    if (ds.source !== 'sheet' || !ds.url) {
      showToast('Only linked sheets can refresh — re-upload the file to update it');
      return;
    }
    showToast('Refreshing…');
    fetch(ds.url).then(function (r) { return r.text(); }).then(function (txt) {
      var fresh = rowsToDataset(parseCSV(txt), ds.name);
      if (!fresh) throw new Error('empty');
      ds.cats = fresh.cats; ds.series = fresh.series; ds.ts = Date.now();
      dataRepaintCharts(ds.id);
      dataEmit();
      showToast('Refreshed ✓');
    }).catch(function () { showToast('Refresh failed'); });
  },
  dataRemove: function (id) {
    state.datasets = dataSets().filter(function (d) { return d.id !== id; });
    dataEmit();
  },
  __qDatasets: function () {
    return dataSets().map(function (d) {
      return { id: d.id, name: d.name, source: d.source,
        rows: d.cats.length, cols: d.series.length,
        cats: d.cats.slice(0, 4),
        series: d.series.slice(0, 3).map(function (s) { return { name: s.name, data: s.data.slice(0, 4) }; }) };
    });
  },
  __qChartTypes: function () {
    return CHART_TYPES.map(function (c) {
      return { id: c.id, name: c.name, group: c.group, thumb: chartThumb(c.id) };
    });
  },
  __qSamples: function () {
    return SAMPLE_DATA.map(function (s, i) {
      return { i: i, name: s.name, rows: s.cats.length, cols: s.series.length };
    });
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 8 · SLIDE LAYOUTS + MASTERS + VIEWS
   owner: Fable.  Ported from v1: the PowerPoint "Office theme" new-slide
   gallery (9 layouts), Slides-from-outline, master-slide system (renderer's
   ctxMasterAdd/ctxMasterRemove/ldStampMasters), colour modes, view modes.
   ═══════════════════════════════════════════════════════════════════════ */

var SLIDE_LAYOUTS = [
  { id:'title', name:'Title slide', parts:[
    { k:'text', t:'Click to add title',    s:'heading',    x:.10, y:.34, w:.80, align:'center' },
    { k:'text', t:'Click to add subtitle', s:'subheading', x:.15, y:.52, w:.70, align:'center' } ]},
  { id:'title-content', name:'Title and content', parts:[
    { k:'text', t:'Click to add title', s:'heading', x:.08, y:.10, w:.84 },
    { k:'text', t:'Click to add text',  s:'body',    x:.08, y:.28, w:.84 } ]},
  { id:'section', name:'Section header', parts:[
    { k:'text', t:'Section title', s:'heading', x:.08, y:.40, w:.84 },
    { k:'text', t:'Add a short description', s:'body', x:.08, y:.58, w:.66 } ]},
  { id:'two-content', name:'Two content', parts:[
    { k:'text', t:'Click to add title', s:'heading', x:.08, y:.10, w:.84 },
    { k:'text', t:'Click to add text',  s:'body',    x:.08, y:.30, w:.39 },
    { k:'text', t:'Click to add text',  s:'body',    x:.53, y:.30, w:.39 } ]},
  { id:'comparison', name:'Comparison', parts:[
    { k:'text', t:'Click to add title', s:'heading',    x:.08, y:.08, w:.84 },
    { k:'text', t:'First heading',      s:'subheading', x:.08, y:.28, w:.39 },
    { k:'text', t:'Click to add text',  s:'body',       x:.08, y:.40, w:.39 },
    { k:'text', t:'Second heading',     s:'subheading', x:.53, y:.28, w:.39 },
    { k:'text', t:'Click to add text',  s:'body',       x:.53, y:.40, w:.39 } ]},
  { id:'title-only', name:'Title only', parts:[
    { k:'text', t:'Click to add title', s:'heading', x:.08, y:.10, w:.84 } ]},
  { id:'blank', name:'Blank', parts:[] },
  { id:'caption', name:'Content with caption', parts:[
    { k:'text',  t:'Click to add title', s:'subheading', x:.06, y:.12, w:.30 },
    { k:'text',  t:'Add a caption here', s:'body',       x:.06, y:.30, w:.30 },
    { k:'frame', x:.42, y:.12, w:.52, h:.74 } ]},
  { id:'pic-caption', name:'Picture with caption', parts:[
    { k:'frame', x:.06, y:.10, w:.88, h:.52 },
    { k:'text',  t:'Click to add title', s:'subheading', x:.06, y:.68, w:.88 },
    { k:'text',  t:'Add a caption here', s:'body',       x:.06, y:.80, w:.88 } ]}
];

var LAYOUT_TEXT = {
  heading:    { size:.062, weight:'700', fill:'#0F172A' },
  subheading: { size:.040, weight:'600', fill:'#0F172A' },
  body:       { size:.026, weight:'400', fill:'#334155' }
};

/* miniature of a layout, drawn for the gallery — mirrors the builder parts */
function layoutThumb(L) {
  var W = 104, H = 58;
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">'
        + '<rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="#fff" stroke="#C8C6C4"/>';
  L.parts.forEach(function (p) {
    var x = p.x * W, y = p.y * H, w = p.w * W;
    if (p.k === 'frame') {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (p.h * H)
        + '" fill="#F3F2F1" stroke="#B1AFAD" stroke-dasharray="2 2"/>'
        + '<path d="M' + (x + w / 2 - 5) + ' ' + (y + p.h * H / 2 + 3) + 'l4-5 3 3 3-4 4 6z" fill="#B1AFAD"/>';
    } else {
      var lh = p.s === 'heading' ? 5 : p.s === 'subheading' ? 3.6 : 2.4;
      var rows = p.s === 'body' ? 4 : 1;
      for (var i = 0; i < rows; i++) {
        var rw = (rows > 1 && i === rows - 1) ? w * 0.6 : w;
        var rx = p.align === 'center' ? x + (w - rw) / 2 : x;
        s += '<rect x="' + rx + '" y="' + (y + i * (lh + 2)) + '" width="' + rw + '" height="' + lh
          + '" rx="1" fill="' + (p.s === 'body' ? '#D8D6D4' : '#9C9A98') + '"/>';
      }
    }
  });
  return s + '</svg>';
}

/* build one layout onto the CURRENT slide */
function layoutBuild(id) {
  var L = SLIDE_LAYOUTS.filter(function (x) { return x.id === id; })[0];
  if (!L || !fc) return 0;
  var W = fc.getWidth() / fc.getZoom(), H = fc.getHeight() / fc.getZoom();
  var made = 0;
  L.parts.forEach(function (p) {
    if (p.k === 'frame') {
      Editor.run('insertFrame', 'landscape');
      var o = fc.getActiveObject();
      if (o) {
        o.set({ left: p.x * W, top: p.y * H });
        if (o.width)  o.scaleX = (p.w * W) / o.width;
        if (o.height) o.scaleY = (p.h * H) / o.height;
        o.setCoords();
      }
      made++;
      return;
    }
    var d = LAYOUT_TEXT[p.s] || LAYOUT_TEXT.body;
    var t = new fabric.IText(p.t, {
      left: p.x * W, top: p.y * H, width: p.w * W,
      fontFamily: 'DM Sans, sans-serif',
      fontSize: Math.round(d.size * H), fontWeight: d.weight, fill: d.fill,
      textAlign: p.align || 'left', editable: true, splitByGrapheme: false
    });
    if (p.align === 'center') t.set({ left: p.x * W + (p.w * W - t.getScaledWidth()) / 2 });
    fc.add(t);
    made++;
  });
  fc.discardActiveObject();
  fc.renderAll();
  saveState();
  return made;
}

function slideNewWithLayout(id) {
  if (typeof addPage !== 'function') { showToast('Editor still loading'); return; }
  addPage();
  setTimeout(function () {
    var n = layoutBuild(id);
    var L = SLIDE_LAYOUTS.filter(function (x) { return x.id === id; })[0];
    renderPageThumbs();
    if (window.Editor && Editor._emit) Editor._emit('slides', Editor.query('slides'));
    showToast('Slide ' + state.pages.length + ' added — ' + ((L && L.name) || 'layout')
      + (n ? ' (' + n + ' placeholder' + (n === 1 ? '' : 's') + ')' : ''));
  }, 90);
}

/* text outline → slides: no-indent line = new slide title, indented = body */
async function slidesFromOutlineV2() {
  var raw = await window.ldPrompt('Paste an outline.\n\nA line with no indent starts a new slide (its title).\nIndented lines become that slide’s text.', 'Slide title\n    first point\n    second point', '', { multiline: true });
  if (!raw || !raw.trim()) return;
  var groups = [], cur = null;
  raw.split(/\r?\n/).forEach(function (line) {
    if (!line.trim()) return;
    if (/^\s/.test(line)) { if (cur) cur.body.push(line.trim()); }
    else { cur = { title: line.trim(), body: [] }; groups.push(cur); }
  });
  if (!groups.length) { showToast('Nothing usable in that outline'); return; }
  var i = 0;
  (function next() {
    if (i >= groups.length) {
      renderPageThumbs();
      showToast('Added ' + groups.length + ' slide' + (groups.length === 1 ? '' : 's') + ' from your outline');
      return;
    }
    var g = groups[i++];
    addPage();
    setTimeout(function () {
      var W = fc.getWidth() / fc.getZoom(), H = fc.getHeight() / fc.getZoom();
      var title = new fabric.IText(g.title, { left: .08 * W, top: .10 * H, fontFamily: 'DM Sans, sans-serif',
        fontSize: Math.round(.062 * H), fontWeight: '700', fill: '#0F172A', editable: true });
      fc.add(title);
      if (g.body.length) {
        var body = new fabric.IText(g.body.map(function (b) { return '•  ' + b; }).join('\n'),
          { left: .08 * W, top: .30 * H, fontFamily: 'DM Sans, sans-serif',
            fontSize: Math.round(.026 * H), fontWeight: '400', fill: '#334155', lineHeight: 1.5, editable: true });
        fc.add(body);
      }
      fc.discardActiveObject(); fc.renderAll(); saveState();
      next();
    }, 90);
  })();
}

/* ── OUTLINE VIEW — text skeleton of the whole deck, click to jump ── */
function outlineTexts(page, isCurrent) {
  var out = [];
  try {
    if (isCurrent && fc) {
      (fc.getObjects() || []).forEach(function (o) {
        if (/text/.test(o.type || '') && o.text) out.push({ t: o.text, size: o.fontSize || 16 });
      });
    } else {
      var j = page.canvasJSON ? (typeof page.canvasJSON === 'string' ? JSON.parse(page.canvasJSON) : page.canvasJSON) : null;
      if (j && j.objects) {
        j.objects.forEach(function (o) {
          if (/text/.test(o.type || '') && o.text) out.push({ t: o.text, size: o.fontSize || 16 });
        });
      } else if (page.ir && page.ir.elements) {
        page.ir.elements.forEach(function (e) {
          if (e.type === 'text' && e.paras) {
            var txt = e.paras.map(function (p) {
              return (p.runs || []).map(function (r) { return r.text || ''; }).join('');
            }).join('\n').trim();
            if (txt) out.push({ t: txt, size: (e.paras[0] && e.paras[0].runs && e.paras[0].runs[0] && e.paras[0].runs[0].size) || 16 });
          }
        });
      }
    }
  } catch (e) {}
  out.sort(function (a, b) { return b.size - a.size; });
  return out;
}

function showOutlineView() {
  var ex = document.getElementById('ld-outline-view');
  if (ex) { ex.remove(); return; }
  captureCurrentPage();
  var ov = document.createElement('div');
  ov.id = 'ld-outline-view';
  ov.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'width:min(640px,92vw);max-height:80vh;overflow:auto;background:#fff;border-radius:14px;padding:22px 26px;font-family:"DM Sans",sans-serif;';
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
    + '<b style="font-size:17px;color:#0F172A;">Outline view</b>'
    + '<button id="ld-ov-x" style="border:0;background:#F1F5F9;border-radius:8px;padding:5px 12px;cursor:pointer;font-weight:700;">Close</button></div>';
  state.pages.forEach(function (pg, i) {
    var texts = outlineTexts(pg, i === state.currentPage);
    h += '<div class="ld-ov-slide" data-i="' + i + '" style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 14px;margin-bottom:9px;cursor:pointer;">'
      + '<span style="font-size:11px;font-weight:700;color:#7C3AED;">Slide ' + (i + 1) + '</span>';
    if (texts.length) {
      texts.slice(0, 6).forEach(function (t, k) {
        var tx = String(t.t).replace(/</g, '&lt;').slice(0, 140);
        h += '<div style="font-size:' + (k === 0 ? 14 : 12) + 'px;font-weight:' + (k === 0 ? 700 : 400) + ';color:#1E293B;margin-top:3px;white-space:pre-line;">' + tx + '</div>';
      });
    } else {
      h += '<div style="font-size:12px;color:#94A3B8;margin-top:3px;">(no text)</div>';
    }
    h += '</div>';
  });
  box.innerHTML = h;
  ov.appendChild(box);
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) {
    if (e.target === ov || e.target.id === 'ld-ov-x') { ov.remove(); return; }
    var row = e.target.closest('.ld-ov-slide');
    if (row) { ov.remove(); Editor.run('gotoSlide', parseInt(row.getAttribute('data-i'), 10)); }
  });
}

/* ════ commands ════ */
Editor._register({
  addSlideLayout: function (id) { slideNewWithLayout(id || 'blank'); },
  slidesOutline: function () { slidesFromOutlineV2(); },
  outlineView: function () { showOutlineView(); },
  readingView: function () { Editor.run('presentFromCurrent'); },

  /* master slides — renderer's own system (shows on every slide, exports) */
  masterAdd: function () {
    if (typeof ctxMasterAdd === 'function') ctxMasterAdd();
    else showToast('Master system still loading');
  },
  masterRemove: function () {
    if (typeof ctxMasterRemove === 'function') ctxMasterRemove();
    else showToast('Master system still loading');
  },
  handoutMaster: function () {
    showToast('Handout master applies to paper printouts — web decks use the Slide Master instead', 4500);
  },
  notesMaster: function () {
    showToast('Notes master applies to printed notes pages — your notes live in the Notes drawer (View ▸ Notes)', 4500);
  },

  /* colour modes — live preview of the deck in grayscale / black-and-white */
  colourMode: function (mode) {
    var area = document.getElementById('canvas-area');
    if (!area) return;
    var f = mode === 'gray' ? 'grayscale(1)' : mode === 'bw' ? 'grayscale(1) contrast(3)' : 'none';
    area.style.filter = f;
    showToast(mode === 'gray' ? 'Grayscale view (display only — export keeps colour)'
      : mode === 'bw' ? 'Black & white view (display only)'
      : 'Colour view');
  },
  newWindow: function () {
    try { window.open(location.href, '_blank'); } catch (e) { showToast('Popup blocked — allow popups for this site'); }
  },

  __qSlideLayouts: function () {
    return SLIDE_LAYOUTS.map(function (L) { return { id: L.id, name: L.name, svg: layoutThumb(L) }; });
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 9 · CONTEXT MENU + FONT GATE + BUSY
   owner: Fable.
   1. Right-click context menu (all v1 rows, all live — the ctx* helpers
      already live in lazydog_renderer.js).
   2. Font policy gate on import: Keep original fonts / Switch to free
      (renderer's ldFontAuditPrompt) + embedded-font registration.
   3. Busy indicator: Upload/Download buttons spin while cloud work runs
      (Editor event 'busy' → ribbon), plus a parse heartbeat pill so heavy
      decks always show life.
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ SYSTEM CLIPBOARD PASTE (21 Aug 2026, Javed) ════
   Copy anything in Canva, a browser, PowerPoint or Explorer and Ctrl+V it on
   the canvas: pictures land as pictures (SVG stays vector), text lands as a
   text box. The editor's own copy/paste of objects is untouched — it runs
   first, and this only steps in when there is nothing internal to paste. */
(function () {
  function fileToDataUrl(f) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(f); }); }
  function inField(t) { return t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable); }
  function placeImage(url) {
    fabric.Image.fromURL(url, function (img) {
      if (!img || !img.width) { showToast('Could not read that picture'); return; }
      var W = fc._baseWidth || 1920, H = fc._baseHeight || 1080;
      var maxW = W * 0.6, maxH = H * 0.7;
      var sc = Math.min(1, maxW / img.width, maxH / img.height);
      img.set({ scaleX: sc, scaleY: sc, left: (W - img.width * sc) / 2, top: (H - img.height * sc) / 2 });
      fc.add(img).setActiveObject(img); fc.renderAll(); saveState();
      showToast('Pasted picture');
    }, { crossOrigin: 'anonymous' });
  }
  function placeText(text) {
    var W = fc._baseWidth || 1920;
    var t = new fabric.Textbox(String(text).trim().slice(0, 4000), { left: W * 0.1, top: (fc._baseHeight || 1080) * 0.2, width: W * 0.5, fontFamily: 'DM Sans', fontSize: 32, fill: '#0F172A', editable: true });
    fc.add(t).setActiveObject(t); fc.renderAll(); saveState();
    showToast('Pasted text');
  }
  function imgsFromHtml(html) {
    var out = [];
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('img').forEach(function (im) { var u = im.getAttribute('src') || im.getAttribute('data-src') || ''; if (u && out.indexOf(u) === -1) out.push(u); });
      doc.querySelectorAll('svg').forEach(function (sv) { out.push('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(sv.outerHTML)))); });
      doc.querySelectorAll('[style*="background-image"]').forEach(function (el) { var m = /url\(["']?([^"')]+)/.exec(el.getAttribute('style') || ''); if (m && out.indexOf(m[1]) === -1) out.push(m[1]); });
    } catch (e) {}
    return out;
  }
  async function placeRemote(src) {
    if (/^data:/.test(src)) { placeImage(src); return true; }
    var d = await (typeof frameSrcViaFetch === 'function' ? frameSrcViaFetch(src) : null);
    if (d) { placeImage(d); return true; }
    /* no CORS on that host: show it anyway (the composer fetches the URL
       server-side at download time, so it still exports) */
    return await new Promise(function (res) {
      fabric.Image.fromURL(src, function (img) {
        if (!img || !img.width) { res(false); return; }
        var W = fc._baseWidth || 1920, H = fc._baseHeight || 1080, sc = Math.min(1, W * 0.6 / img.width, H * 0.7 / img.height);
        img.set({ scaleX: sc, scaleY: sc, left: (W - img.width * sc) / 2, top: (H - img.height * sc) / 2, src: src });
        fc.add(img).setActiveObject(img); fc.renderAll(); saveState(); showToast('Pasted picture'); res(true);
      });
    });
  }
  async function pasteFromItems(items, files) {
    var html = '', text = '', imgFile = null, svgText = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.kind === 'file' && /^image\//.test(it.type) && !imgFile) imgFile = it.getAsFile();
      else if (it.type === 'text/html') html = await new Promise(function (r) { it.getAsString(r); });
      else if (it.type === 'text/plain') text = await new Promise(function (r) { it.getAsString(r); });
      else if (it.type === 'image/svg+xml') svgText = await new Promise(function (r) { it.getAsString(r); });
    }
    if (!imgFile && files && files.length && /^image\//.test(files[0].type)) imgFile = files[0];
    if (imgFile) { var u = await fileToDataUrl(imgFile); if (u) { placeImage(u); return true; } }
    if (svgText || /^\s*<svg[\s>]/i.test(text)) { placeImage('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText || text)))); return true; }
    if (html) {
      var srcs = imgsFromHtml(html), placed = 0;
      for (var k = 0; k < srcs.length && k < 12; k++) { if (await placeRemote(srcs[k])) placed++; }
      if (placed) return true;
      var tmp = document.createElement('div'); tmp.innerHTML = html; var t2 = (tmp.textContent || '').trim();
      if (t2) { placeText(t2); return true; }
    }
    if (text && text.trim()) {
      if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(text.trim())) { var d2 = await frameSrcViaFetch(text.trim()); placeImage(d2 || text.trim()); return true; }
      placeText(text); return true;
    }
    return false;
  }
  document.addEventListener('paste', function (e) {
    if (!window.fc) return;
    var ao = fc.getActiveObject && fc.getActiveObject();
    if (inField(e.target) || (ao && ao.isEditing)) return;
    var cd = e.clipboardData; if (!cd) return;
    var hasFile = (cd.files && cd.files.length) || Array.prototype.some.call(cd.items || [], function (it) { return it.kind === 'file'; });
    var hasExternal = hasFile || Array.prototype.some.call(cd.items || [], function (it) { return it.type === 'text/html' || it.type === 'text/plain' || it.type === 'image/svg+xml'; });
    if (!hasExternal) return;
    /* an object copied INSIDE the editor leaves a marker on the system
       clipboard (ctxCopy) — that marker means "paste the editor's way" */
    var plain = ''; try { plain = cd.getData('text/plain') || ''; } catch (e2) {}
    if (!hasFile && plain === 'ld-internal-clip' && typeof _clip !== 'undefined' && _clip) return;
    e.preventDefault();
    pasteFromItems(cd.items || [], cd.files || []);
  }, true);
  /* right-click → Paste with nothing internal: read the system clipboard */
  window.ldPasteFromSystem = async function () {
    if (!navigator.clipboard || !navigator.clipboard.read) { showToast('Use Ctrl+V to paste from other apps'); return; }
    try {
      var items = await navigator.clipboard.read();
      for (var i = 0; i < items.length; i++) {
        var types = items[i].types || [];
        var imgT = types.filter(function (t) { return /^image\//.test(t); })[0];
        if (imgT) { var b = await items[i].getType(imgT); var u = await fileToDataUrl(b); if (u) { placeImage(u); return; } }
        if (types.indexOf('text/html') > -1) { var h = await (await items[i].getType('text/html')).text(); if (await pasteFromItems([{ kind: 'string', type: 'text/html', getAsString: function (cb) { cb(h); } }], [])) return; }
        if (types.indexOf('text/plain') > -1) { var tx = await (await items[i].getType('text/plain')).text(); if (tx.trim() === 'ld-internal-clip') { if (typeof ctxPaste === 'function' && _clip) ctxPaste(); return; } if (tx.trim()) { placeText(tx); return; } }
      }
      showToast('Nothing to paste');
    } catch (e) { showToast('Use Ctrl+V to paste from other apps'); }
  };
})();

/* ════ 0 · COMPONENTS (21 Aug 2026) — save any selection, insert it again ════
   Kept in localStorage per browser/app (no server round-trip, works offline). */
(function () {
  var KEY = 'ld_components_v1';
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function put(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))); } catch (e) { showToast('Could not save — storage is full'); } }
  window.ldComponentSave = async function () {
    var o = fc.getActiveObject();
    if (!o) { showToast('Select something on the slide first'); return; }
    var name = await window.ldPrompt('Component name:', 'e.g. Header card', 'Component ' + (all().length + 1));
    if (!name || !name.trim()) return;
    var objs = (o.type === 'activeSelection') ? o._objects : [o];
    var data = { objects: objs.map(function (x) { return x.toJSON(FABRIC_JSON_PROPS); }) };
    var thumb = null;
    try { thumb = o.toDataURL({ format: 'png', multiplier: Math.min(1, 160 / Math.max(o.getScaledWidth(), o.getScaledHeight())) }); } catch (e) {}
    var list = all(); list.unshift({ id: 'c' + Date.now(), name: name.trim(), thumb: thumb, data: data, ts: Date.now() }); put(list);
    showToast('Saved “' + name.trim() + '” to Components ✓');
    if (Editor._emit) Editor._emit('components');
  };
  Editor._register({
    __qComponents: function () { return all().map(function (c) { return { id: c.id, name: c.name, thumb: c.thumb }; }); },
    componentSave: function () { window.ldComponentSave(); },
    componentDelete: function (id) { put(all().filter(function (c) { return c.id !== id; })); if (Editor._emit) Editor._emit('components'); },
    componentInsert: function (id) {
      var c = all().filter(function (x) { return x.id === id; })[0];
      if (!c) { showToast('That component is gone'); return; }
      fabric.util.enlivenObjects(c.data.objects, function (objs) {
        if (!objs.length) return;
        var g = objs.length === 1 ? objs[0] : new fabric.ActiveSelection(objs, { canvas: fc });
        objs.forEach(function (ob) { ob.set({ left: (ob.left || 0) + 40, top: (ob.top || 0) + 40 }); delete ob.irId; fc.add(ob); });
        if (objs.length > 1) { fc.setActiveObject(g); } else { fc.setActiveObject(objs[0]); }
        fc.renderAll(); saveState(); showToast('Component inserted');
      });
    }
  });
})();

/* ════ 1 · RIGHT-CLICK CONTEXT MENU ════ */
(function () {
  var MENU_HTML =
    '<button class="ctx-item" data-ctx="copy"><span class="ctx-item-left"><span class="material-icons-outlined">content_copy</span>Copy</span><span class="ctx-shortcut">Ctrl+C</span></button>'
  + '<button class="ctx-item" data-ctx="paste"><span class="ctx-item-left"><span class="material-icons-outlined">content_paste</span>Paste</span><span class="ctx-shortcut">Ctrl+V</span></button>'
  + '<button class="ctx-item" data-ctx="duplicate"><span class="ctx-item-left"><span class="material-icons-outlined">library_add</span>Duplicate</span><span class="ctx-shortcut">Ctrl+D</span></button>'
  + '<button class="ctx-item" data-ctx="delete"><span class="ctx-item-left"><span class="material-icons-outlined">delete</span>Delete</span><span class="ctx-shortcut">Delete</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="align"><span class="ctx-item-left"><span class="material-icons-outlined">format_align_center</span>Align to page</span></button>'
  + '<button class="ctx-item" data-ctx="lock"><span class="ctx-item-left"><span class="material-icons-outlined">lock</span>Lock</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="alttext"><span class="ctx-item-left"><span class="material-icons-outlined">accessible</span>Alternative text</span></button>'
  + '<button class="ctx-item" data-ctx="savecomp"><span class="ctx-item-left"><span class="material-icons-outlined">widgets</span>Save as component</span></button>'
  + '<button class="ctx-item" data-ctx="setbg"><span class="ctx-item-left"><span class="material-icons-outlined">image</span>Set image as background</span></button>'
  + '<button class="ctx-item" data-ctx="applycolor"><span class="ctx-item-left"><span class="material-icons-outlined">palette</span>Apply colour to page</span></button>'
  + '<button class="ctx-item" data-ctx="trim"><span class="ctx-item-left"><span class="material-icons-outlined">content_cut</span>Trim to slide</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="master"><span class="ctx-item-left"><span class="material-icons-outlined">layers</span>Show on all slides</span></button>'
  + '<button class="ctx-item" data-ctx="unmaster"><span class="ctx-item-left"><span class="material-icons-outlined">layers_clear</span>Remove from all slides</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="info"><span class="ctx-item-left"><span class="material-icons-outlined">info</span>Info</span></button>';

  function ctxDuplicateV2() {
    var o = fc && fc.getActiveObject();
    if (o) { o.clone(function (c) { c.set({ left: o.left + 20, top: o.top + 20 }); fc.add(c); fc.setActiveObject(c); fc.renderAll(); saveState(); }); }
  }
  function ctxDeleteV2() {
    var o = fc && fc.getActiveObject();
    if (o) { fc.remove(o); fc.discardActiveObject(); fc.renderAll(); saveState(); }
  }

  function mount() {
    var area = document.getElementById('canvas-area');
    if (!area) { setTimeout(mount, 400); return; }
    var m = document.createElement('div');
    m.className = 'ctx-menu';
    m.id = 'ctx-menu';
    m.innerHTML = MENU_HTML;
    document.body.appendChild(m);

    area.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      /* master copies are unselectable — remember which sits under the
         pointer so "Remove from all slides" can find it (v1 audit 46) */
      window._ctxMaster = null;
      try {
        if (window.fc) {
          var pt = fc.getPointer(e);
          var fpt = new fabric.Point(pt.x, pt.y);
          (fc.getObjects() || []).forEach(function (o) {
            if (o.ldMasterId && o.containsPoint && o.containsPoint(fpt)) window._ctxMaster = o;
          });
        }
      } catch (err) {}
      /* Lock row is a toggle — read the target's real state (v1 audit 44) */
      try {
        var lockBtn = m.querySelector('[data-ctx="lock"] .ctx-item-left');
        if (lockBtn) {
          var ao = window.fc && fc.getActiveObject();
          var lk = !!(ao && ao.lockMovementX);
          lockBtn.innerHTML = '<span class="material-icons-outlined">' + (lk ? 'lock_open' : 'lock')
            + '</span>' + (lk ? 'Unlock' : 'Lock');
        }
      } catch (err2) {}
      m.style.left = Math.min(e.clientX, window.innerWidth - 260) + 'px';
      m.style.top = Math.min(e.clientY, window.innerHeight - 420) + 'px';
      m.classList.add('open');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#ctx-menu')) m.classList.remove('open');
    });
    m.addEventListener('click', function (e) {
      var item = e.target.closest('[data-ctx]');
      if (!item) return;
      switch (item.dataset.ctx) {
        case 'copy':       if (typeof ctxCopy === 'function') ctxCopy(); break;
        case 'paste':      if (typeof _clip !== 'undefined' && _clip) ctxPaste(); else if (window.ldPasteFromSystem) window.ldPasteFromSystem(); break;
        case 'duplicate':  ctxDuplicateV2(); break;
        case 'delete':     ctxDeleteV2(); break;
        case 'align':      if (typeof ctxAlign === 'function') ctxAlign(); break;
        case 'lock':       if (typeof ctxLock === 'function') ctxLock(); break;
        case 'alttext':    if (typeof ctxAltText === 'function') ctxAltText(); break;
        case 'setbg':      if (typeof ctxSetBg === 'function') ctxSetBg(); break;
        case 'savecomp':   if (window.ldComponentSave) window.ldComponentSave(); break;
        case 'applycolor': if (typeof ctxApplyColor === 'function') ctxApplyColor(); break;
        case 'trim':       if (typeof ctxTrimToSlide === 'function') ctxTrimToSlide(); break;
        case 'master':     if (typeof ctxMasterAdd === 'function') ctxMasterAdd(); break;
        case 'unmaster':   if (typeof ctxMasterRemove === 'function') ctxMasterRemove(); break;
        case 'info':       if (typeof ctxInfo === 'function') ctxInfo(); break;
      }
      m.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') m.classList.remove('open');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

/* ════ 2 · FONT POLICY GATE (Javed's rule, verbatim v1 wrapper) ════
   RED LINE: engine-made designs use FREE fonts only. IMPORTED files may
   carry commercial fonts — the client's right. On import, any font not in
   the free library raises the renderer's alarm:
   · Keep original  → names untouched, export unchanged.
   · Switch to free → every non-library font permanently rewritten. */
(function () {
  function ldRegisterEmbedded(deck) {
    return new Promise(function (res) {
      window._ldEmbeddedFams = {};
      if (!deck || !deck.embeddedFonts || !window.FontFace) { res(); return; }
      var todo = deck.embeddedFonts.filter(function (ef) { return ef.ttfB64; });
      if (!todo.length) { res(); return; }
      var left = todo.length;
      todo.forEach(async function (ef) {
        try {
          var _fsrc;
          if (String(ef.ttfB64).indexOf('gcsb64:') === 0) {
            try { var _fr = await fetch(ef.ttfB64.slice(7)); if (!_fr.ok) throw new Error(_fr.status); _fsrc = await _fr.arrayBuffer(); }
            catch (_fe) { _fsrc = 'url(' + ef.ttfB64.slice(7) + ')'; }
          } else {
            var fbin = atob(ef.ttfB64), fbuf = new Uint8Array(fbin.length);
            for (var i = 0; i < fbin.length; i++) fbuf[i] = fbin.charCodeAt(i);
            _fsrc = fbuf.buffer;
          }
          var face = new FontFace(ef.family, _fsrc, {
            weight: /bold/i.test(ef.style) ? 'bold' : 'normal',
            style: /italic/i.test(ef.style) ? 'italic' : 'normal' });
          face.load().then(function (f2) { document.fonts.add(f2); window._ldEmbeddedFams[ef.family.toLowerCase()] = 1; })
            .catch(function () {}).finally(function () { if (--left <= 0) res(); });
        } catch (e) { if (--left <= 0) res(); }
      });
      setTimeout(function () { res(); }, 4000);
    });
  }
  function wrapLoader() {
    if (!window.loadDeckIRIntoEditor) { setTimeout(wrapLoader, 400); return; }
    if (window.loadDeckIRIntoEditor.__ldFontWrapped) return;
    var orig = window.loadDeckIRIntoEditor;
    var wrapped = async function (deck) {
      try {
        await ldRegisterEmbedded(deck);
        if (deck && deck.__ldSkipFontGate) { /* AI-composed — skip the gate */ }
        else if (typeof ldFontAuditPrompt === 'function') {
          window.__ldFontGate = true;                       /* pause the build time-box while the human decides */
          try { await ldFontAuditPrompt(deck); } finally { window.__ldFontGate = false; }
        }
      } catch (e) { console.warn('font gate skipped', e); }
      return orig(deck);
    };
    wrapped.__ldFontWrapped = true;
    window.loadDeckIRIntoEditor = wrapped;
  }
  wrapLoader();
})();

/* ════ 3 · BUSY INDICATOR + PARSE HEARTBEAT ════ */
window.ldBusy = function (kind, on) {
  try { if (window.Editor && Editor._emit) Editor._emit('busy', { kind: kind, on: !!on }); } catch (e) {}
};
/* heartbeat pill for the long cloud-parse stage — updates every second so a
   heavy deck NEVER looks dead */
var _ldHeart = null;
window.ldParseHeartbeat = function (on, label) {
  var id = 'ld-parse-heart';
  if (!on) {
    if (_ldHeart) { clearInterval(_ldHeart); _ldHeart = null; }
    var ex = document.getElementById(id);
    if (ex) ex.remove();
    return;
  }
  var t0 = Date.now();
  var el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:99999;background:#0F172A;color:#fff;padding:10px 18px;border-radius:10px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);min-width:250px;text-align:center;';
    document.body.appendChild(el);
  }
  function tick() {
    var s = Math.round((Date.now() - t0) / 1000);
    var m = Math.floor(s / 60);
    el.innerHTML = (label || 'Working in LazyDog cloud…') + ' <span style="color:#C4B5FD">'
      + (m ? m + 'm ' : '') + (s % 60) + 's</span>'
      + '<div style="height:4px;border-radius:2px;margin-top:7px;background:linear-gradient(90deg,#7C3AED 30%,rgba(255,255,255,.15) 30%);background-size:200% 100%;animation:ldslide 1.2s linear infinite;"></div>';
  }
  tick();
  if (_ldHeart) clearInterval(_ldHeart);
  _ldHeart = setInterval(tick, 1000);
};
(function () {
  var st = document.createElement('style');
  st.textContent = '@keyframes ldslide { from { background-position: 0 0; } to { background-position: -200% 0; } }';
  document.head.appendChild(st);
})();


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 10 · CHART DATA TABLE + WORDART STYLES
   owner: Fable.
   1. Double-click any chart → Excel-style data table opens IN PLACE:
      edit cells / add rows / add series → chart redraws itself. Real, not
      an eye-wash toast.
   2. WordArt: v1's 12 style presets (gradients, outline, neon, shadow…).
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ 1 · CHART DATA TABLE (opens on double-click) ════ */
function openChartDataEditor(o) {
  if (!o || !o.chartType) return;
  var ex = document.getElementById('ld-chartdata');
  if (ex) ex.remove();
  var def = o.chartDef || { cats: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Series 1', data: [42, 58, 49, 71] }] };
  /* deep copy so Cancel leaves the chart untouched */
  var d = JSON.parse(JSON.stringify(def));

  var ov = document.createElement('div');
  ov.id = 'ld-chartdata';
  ov.style.cssText = 'position:fixed;inset:0;z-index:650;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'width:min(680px,94vw);max-height:84vh;display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.35);font-family:"DM Sans",sans-serif;overflow:hidden;';
  ov.appendChild(box);

  function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function paint() {
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 10px;">'
      + '<b style="font-size:16px;color:#0F172A;">Chart data</b>'
      + '<span style="font-size:11px;color:#64748B;">edit cells, then Apply — or connect a CSV/Excel from the Data panel</span></div>'
      + '<div style="overflow:auto;padding:0 20px;flex:1;"><table id="ld-cd-tbl" style="border-collapse:collapse;width:100%;font-size:12.5px;">';
    h += '<tr><th style="border:1px solid #E2E8F0;background:#F8FAFC;padding:6px 8px;min-width:90px;"></th>';
    d.series.forEach(function (s, si) {
      h += '<th style="border:1px solid #E2E8F0;background:#EDE9FE;padding:2px;"><div style="display:flex;align-items:center;gap:2px;">'
        + '<input data-sname="' + si + '" value="' + esc(s.name) + '" style="border:0;background:none;font-weight:700;color:#4C1D95;width:90px;padding:4px 6px;">'
        + (d.series.length > 1 ? '<button data-delseries="' + si + '" title="Remove series" style="border:0;background:none;color:#DC2626;cursor:pointer;font-size:13px;">✕</button>' : '')
        + '</div></th>';
    });
    h += '<th style="border:0;padding:2px;"><button id="ld-cd-addser" title="Add series" style="border:1px dashed #CBD5E1;background:#FAFBFD;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700;color:#7C3AED;">+</button></th></tr>';
    d.cats.forEach(function (c, ri) {
      h += '<tr><td style="border:1px solid #E2E8F0;background:#F8FAFC;padding:2px;"><div style="display:flex;align-items:center;gap:2px;">'
        + '<input data-cat="' + ri + '" value="' + esc(c) + '" style="border:0;background:none;font-weight:600;color:#0F172A;width:82px;padding:4px 6px;">'
        + (d.cats.length > 1 ? '<button data-delrow="' + ri + '" title="Remove row" style="border:0;background:none;color:#DC2626;cursor:pointer;font-size:12px;">✕</button>' : '')
        + '</div></td>';
      d.series.forEach(function (s, si) {
        h += '<td style="border:1px solid #E2E8F0;padding:0;"><input data-cell="' + ri + ':' + si + '" value="' + esc(s.data[ri]) + '" style="border:0;width:100%;box-sizing:border-box;padding:6px 8px;text-align:right;color:#1E293B;"></td>';
      });
      h += '<td style="border:0;"></td></tr>';
    });
    h += '</table>'
      + '<button id="ld-cd-addrow" style="margin:8px 0 4px;border:1px dashed #CBD5E1;background:#FAFBFD;border-radius:7px;padding:6px 14px;cursor:pointer;font-weight:700;color:#7C3AED;">+ Add row</button></div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #EEF2F7;">'
      + '<button id="ld-cd-cancel" style="border:1px solid #CBD5E1;background:#fff;border-radius:9px;padding:9px 18px;cursor:pointer;font-weight:700;color:#334155;">Cancel</button>'
      + '<button id="ld-cd-apply" style="border:0;background:#7C3AED;color:#fff;border-radius:9px;padding:9px 22px;cursor:pointer;font-weight:700;">Apply to chart</button></div>';
    box.innerHTML = h;
  }

  function harvest() {
    box.querySelectorAll('[data-cat]').forEach(function (inp) { d.cats[+inp.dataset.cat] = inp.value; });
    box.querySelectorAll('[data-sname]').forEach(function (inp) { d.series[+inp.dataset.sname].name = inp.value; });
    box.querySelectorAll('[data-cell]').forEach(function (inp) {
      var p = inp.dataset.cell.split(':');
      var v = parseFloat(String(inp.value).replace(/[^0-9.eE+-]/g, ''));
      d.series[+p[1]].data[+p[0]] = isFinite(v) ? v : 0;
    });
  }

  paint();
  document.body.appendChild(ov);

  ov.addEventListener('click', function (e) {
    if (e.target === ov || e.target.id === 'ld-cd-cancel') { ov.remove(); return; }
    if (e.target.id === 'ld-cd-addrow') {
      harvest();
      d.cats.push('Row ' + (d.cats.length + 1));
      d.series.forEach(function (s) { s.data.push(0); });
      paint(); return;
    }
    if (e.target.id === 'ld-cd-addser') {
      harvest();
      d.series.push({ name: 'Series ' + (d.series.length + 1), data: d.cats.map(function () { return 0; }) });
      paint(); return;
    }
    if (e.target.dataset && e.target.dataset.delrow != null) {
      harvest();
      var ri = +e.target.dataset.delrow;
      d.cats.splice(ri, 1);
      d.series.forEach(function (s) { s.data.splice(ri, 1); });
      paint(); return;
    }
    if (e.target.dataset && e.target.dataset.delseries != null) {
      harvest();
      d.series.splice(+e.target.dataset.delseries, 1);
      paint(); return;
    }
    if (e.target.id === 'ld-cd-apply') {
      harvest();
      o.chartDef = d;
      o.datasetId = null; /* manual edit detaches the dataset link */
      chartRedraw(o, d);
      saveState();
      ov.remove();
      showToast('Chart updated ✓');
    }
  });
}
window.openChartDataEditor = openChartDataEditor;

/* replace the toast dblclick (engine7) with the real editor */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    if (!fc || !fc.on) return;
    fc.on('mouse:dblclick', function (opt) {
      var o = opt && opt.target;
      if (o && o.chartType) openChartDataEditor(o);
    });
  }, 1200);
});

/* ════ 2 · WORDART STYLES (verbatim v1 presets) ════ */
var WORDART_PRESETS = [
  { id:'plain',   name:'Plain',   fill:null,                                              stroke:null,                          shadow:null },
  { id:'accent',  name:'Fill',    fill:{ type:'solid', color:'#7C3AED' },                 stroke:null,                          shadow:null },
  { id:'grape',   name:'Grape',   fill:{ type:'grad', stops:['#7C3AED','#EC4899'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'gold',    name:'Gold',    fill:{ type:'grad', stops:['#B45309','#FDE68A'], dir:'v' }, stroke:null,                      shadow:null },
  { id:'fire',    name:'Fire',    fill:{ type:'grad', stops:['#F97316','#DC2626'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'ocean',   name:'Ocean',   fill:{ type:'grad', stops:['#2563EB','#06B6D4'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'outline', name:'Outline', fill:{ type:'solid', color:'#FFFFFF' },                 stroke:{ color:'#1B1B1B', ratio:0.045 }, shadow:null },
  { id:'edge',    name:'Edge',    fill:{ type:'solid', color:'#FFFFFF' },                 stroke:{ color:'#7C3AED', ratio:0.045 }, shadow:null },
  { id:'shadow',  name:'Shadow',  fill:{ type:'solid', color:'#7C3AED' },                 stroke:null,                          shadow:{ color:'rgba(0,0,0,.38)', blurR:0.05, dxR:0.05, dyR:0.05 } },
  { id:'lifted',  name:'Lifted',  fill:{ type:'solid', color:'#FFFFFF' },                 stroke:null,                          shadow:{ color:'rgba(0,0,0,.45)', blurR:0.09, dxR:0.02, dyR:0.06 } },
  { id:'neon',    name:'Neon',    fill:{ type:'solid', color:'#22D3EE' },                 stroke:null,                          shadow:{ color:'#22D3EE', blurR:0.18, dxR:0, dyR:0 } },
  { id:'pop',     name:'Pop',     fill:{ type:'solid', color:'#FDE047' },                 stroke:{ color:'#1B1B1B', ratio:0.05 }, shadow:{ color:'rgba(0,0,0,.4)', blurR:0.02, dxR:0.05, dyR:0.06 } }
];
function _waGradCoords(dir, w, h) { return dir === 'v' ? { x1:0, y1:0, x2:0, y2:h } : { x1:0, y1:0, x2:w, y2:0 }; }
function applyWordArt(o, p) {
  if (!o || !p) return;
  var fs = o.fontSize || 40;
  if (p.fill) {
    if (p.fill.type === 'grad') {
      var w = o.width || 200, h = o.height || fs, stops = p.fill.stops;
      o.set('fill', new fabric.Gradient({ type:'linear', gradientUnits:'pixels',
        coords: _waGradCoords(p.fill.dir, w, h),
        colorStops: stops.map(function (c, i) { return { offset: i / (stops.length - 1), color: c }; }) }));
    } else { o.set('fill', p.fill.color); }
  } else { o.set('fill', '#0F172A'); }
  if (p.stroke) { o.set({ stroke: p.stroke.color, strokeWidth: Math.max(1, fs * p.stroke.ratio), paintFirst: 'stroke', strokeLineJoin: 'round' }); }
  else { o.set({ stroke: '', strokeWidth: 0 }); }
  if (p.shadow) { o.set('shadow', new fabric.Shadow({ color: p.shadow.color, blur: Math.round(fs * p.shadow.blurR), offsetX: Math.round(fs * p.shadow.dxR), offsetY: Math.round(fs * p.shadow.dyR) })); }
  else { o.set('shadow', null); }
  o.dirty = true; fc.renderAll(); saveState();
}
function _waThumbStyle(p) {
  var s = '';
  if (p.fill && p.fill.type === 'grad') { s += 'background:linear-gradient(' + (p.fill.dir === 'v' ? 'to bottom' : 'to right') + ',' + p.fill.stops.join(',') + ');-webkit-background-clip:text;background-clip:text;color:transparent;'; }
  else if (p.fill) { s += 'color:' + p.fill.color + ';'; }
  else { s += 'color:#0F172A;'; }
  if (p.stroke) { s += '-webkit-text-stroke:1.3px ' + p.stroke.color + ';'; }
  if (p.shadow) { s += 'text-shadow:' + (p.shadow.dxR * 30).toFixed(1) + 'px ' + (p.shadow.dyR * 30).toFixed(1) + 'px ' + (p.shadow.blurR * 30 + 1).toFixed(1) + 'px ' + p.shadow.color + ';'; }
  return s;
}

Editor._register({
  /* WordArt: with a style index → apply to selected text, or create new
     WordArt text in that style. Plain call (no arg) keeps old behaviour. */
  insertWordArt: function (styleIdx) {
    var p = WORDART_PRESETS[styleIdx == null ? 2 : styleIdx] || WORDART_PRESETS[2];
    var o = fc.getActiveObject();
    if (o && /text/.test(o.type || '')) {
      applyWordArt(o, p);
      showToast('WordArt "' + p.name + '" applied');
      return;
    }
    var t = new fabric.IText('WordArt', {
      left: 180, top: 160, fontFamily: 'DM Sans', fontWeight: '800', fontSize: 96
    });
    fc.add(t); fc.setActiveObject(t);
    applyWordArt(t, p);
    showToast('WordArt added — double-click to edit the text');
  },
  __qWordArtStyles: function () {
    return WORDART_PRESETS.map(function (p, i) {
      return { i: i, name: p.name, css: _waThumbStyle(p) };
    });
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 11 · FULL SHAPE LIBRARY   owner: Fable
   The renderer's PRESET_PATHS (31 OOXML preset geometries) becomes the
   editor's shape library — grouped like Canva: Lines, Basic, Polygons,
   Stars, Arrows, Flowchart, Callouts. insertShape gains every preset;
   insertLine gains dashed / dotted / arrow / double-arrow variants.
   ═══════════════════════════════════════════════════════════════════════ */

var SHAPE_GROUPS = [
  { name: 'Lines', items: [
    { id: 'ln-solid',  name: 'Line',         line: 'solid' },
    { id: 'ln-dashed', name: 'Dashed',       line: 'dashed' },
    { id: 'ln-dotted', name: 'Dotted',       line: 'dotted' },
    { id: 'ln-arrow',  name: 'Arrow line',   line: 'arrow' },
    { id: 'ln-double', name: 'Double arrow', line: 'double' } ] },
  { name: 'Basic shapes', items: [
    { id: 'rect', name: 'Square' }, { id: 'rounded', name: 'Rounded' },
    { id: 'circle', name: 'Circle' }, { id: 'triangle', name: 'Triangle' },
    { id: 'diamond', name: 'Diamond' }, { id: 'trapezoid', name: 'Trapezoid' },
    { id: 'parallelogram', name: 'Parallelogram' }, { id: 'plus', name: 'Plus' },
    { id: 'heart', name: 'Heart' }, { id: 'pie', name: 'Pie' },
    { id: 'arc', name: 'Arc' }, { id: 'donut', name: 'Ring' },
    { id: 'chevron', name: 'Chevron' }, { id: 'homePlate', name: 'Pointer' } ] },
  { name: 'Polygons', items: [
    { id: 'pentagon', name: 'Pentagon' }, { id: 'hexagon', name: 'Hexagon' },
    { id: 'octagon', name: 'Octagon' } ] },
  { name: 'Stars', items: [
    { id: 'star', name: 'Star' }, { id: 'star5', name: '5-point star' } ] },
  { name: 'Arrows', items: [
    { id: 'arrow', name: 'Arrow' }, { id: 'rightArrow', name: 'Right' },
    { id: 'leftArrow', name: 'Left' }, { id: 'upArrow', name: 'Up' },
    { id: 'downArrow', name: 'Down' }, { id: 'leftRightArrow', name: 'Both ways' } ] },
  { name: 'Flowchart', items: [
    { id: 'flowChartTerminator', name: 'Terminator' }, { id: 'flowChartDecision', name: 'Decision' },
    { id: 'flowChartData', name: 'Data' }, { id: 'flowChartInputOutput', name: 'Input / Output' },
    { id: 'flowChartPredefinedProcess', name: 'Process' }, { id: 'flowChartInternalStorage', name: 'Storage' },
    { id: 'flowChartConnector', name: 'Connector' } ] },
  { name: 'Speech bubbles', items: [
    { id: 'wedgeRoundRectCallout', name: 'Callout' } ] }
];

var _LEGACY_SHAPES = { rect: 1, rounded: 1, circle: 1, triangle: 1, diamond: 1, hexagon: 1, star: 1, arrow: 1 };

function shapePreview(item) {
  /* line previews */
  if (item.line) {
    var mid = '<line x1="10" y1="40" x2="190" y2="40" stroke="currentColor" stroke-width="7"';
    if (item.line === 'dashed') mid += ' stroke-dasharray="22 14"';
    if (item.line === 'dotted') mid += ' stroke-dasharray="2 16" stroke-linecap="round"';
    mid += '/>';
    var heads = '';
    if (item.line === 'arrow' || item.line === 'double') heads += '<path d="M168 22 L196 40 L168 58 Z" fill="currentColor"/>';
    if (item.line === 'double') heads += '<path d="M32 22 L4 40 L32 58 Z" fill="currentColor"/>';
    return '<svg viewBox="0 0 200 80">' + mid + heads + '</svg>';
  }
  /* legacy colourless silhouettes for the 8 original kinds */
  var d = null;
  if (item.id === 'rect') d = 'M10 15 h180 v110 h-180 Z';
  else if (item.id === 'rounded') d = 'M40 15 h120 a30 30 0 0 1 30 30 v50 a30 30 0 0 1 -30 30 h-120 a30 30 0 0 1 -30 -30 v-50 a30 30 0 0 1 30 -30 Z';
  else if (item.id === 'circle') d = 'M100 10 a60 60 0 1 0 0.01 0 Z';
  else if (item.id === 'triangle') d = 'M100 12 L188 128 L12 128 Z';
  else if (item.id === 'star') {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 28 : 62, a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push((100 + r * Math.cos(a)).toFixed(1) + ' ' + (70 + r * Math.sin(a)).toFixed(1));
    }
    d = 'M' + pts.join(' L') + ' Z';
  }
  else if (item.id === 'arrow') d = 'M10 50 h100 v-30 l80 50 l-80 50 v-30 h-100 Z';
  if (d) return '<svg viewBox="0 0 200 140"><path d="' + d + '" fill="currentColor"/></svg>';
  /* preset geometry — the same path the renderer draws */
  try {
    if (typeof PRESET_PATHS === 'object' && PRESET_PATHS[item.id]) {
      return '<svg viewBox="-8 -8 216 156"><path d="' + PRESET_PATHS[item.id](200, 140) + '" fill="currentColor"/></svg>';
    }
  } catch (e) {}
  return '<svg viewBox="0 0 200 140"><rect x="10" y="15" width="180" height="110" fill="currentColor"/></svg>';
}

Editor._register({
  /* every preset geometry becomes insertable; legacy kinds stay in core */
  insertShapePreset: function (kind) {
    if (typeof PRESET_PATHS !== 'object' || !PRESET_PATHS[kind]) { showToast('Unknown shape: ' + kind); return; }
    var s = new fabric.Path(PRESET_PATHS[kind](200, 140), {
      left: 160, top: 130, fill: '#7C3AED', opacity: 0.95
    });
    fc.add(s); fc.setActiveObject(s);
    fc.renderAll(); saveState();
    showToast('Shape added');
  },
  insertLineKind: function (kind) {
    var opts = { stroke: '#0F172A', strokeWidth: 4 };
    if (kind === 'dashed') opts.strokeDashArray = [14, 10];
    if (kind === 'dotted') { opts.strokeDashArray = [1, 10]; opts.strokeLineCap = 'round'; }
    var parts = [new fabric.Line([0, 0, 260, 0], opts)];
    function head(x, dir) {
      return new fabric.Polygon(
        [{ x: x, y: 0 }, { x: x - dir * 18, y: -9 }, { x: x - dir * 18, y: 9 }],
        { fill: '#0F172A' });
    }
    if (kind === 'arrow' || kind === 'double') parts.push(head(260, 1));
    if (kind === 'double') parts.push(head(0, -1));
    var o = parts.length > 1 ? new fabric.Group(parts, { left: 140, top: 200 }) : parts[0].set({ left: 140, top: 200 });
    fc.add(o); fc.setActiveObject(o);
    fc.renderAll(); saveState();
    showToast('Line added');
  },
  __qShapeGroups: function () {
    return SHAPE_GROUPS.map(function (g) {
      return { name: g.name, items: g.items.map(function (it) {
        return {
          id: it.id, name: it.name, svg: shapePreview(it),
          cmd: it.line ? 'insertLineKind' : (_LEGACY_SHAPES[it.id] ? 'insertShape' : 'insertShapePreset'),
          arg: it.line ? it.line : it.id
        };
      }) };
    });
  }
});


/* ════ GRIDS — photo-grid layouts (verbatim v1) ════ */
var GRID_LAYOUTS = [
  /* ── Rows & columns ── */
  { n:'2 column', c:'Rows & columns', cells:[[0,0,.5,1],[.5,0,.5,1]] },
  { n:'3 column', c:'Rows & columns', cells:[[0,0,1/3,1],[1/3,0,1/3,1],[2/3,0,1/3,1]] },
  { n:'4 column', c:'Rows & columns', cells:[[0,0,.25,1],[.25,0,.25,1],[.5,0,.25,1],[.75,0,.25,1]] },
  { n:'2 row',    c:'Rows & columns', cells:[[0,0,1,.5],[0,.5,1,.5]] },
  { n:'3 row',    c:'Rows & columns', cells:[[0,0,1,1/3],[0,1/3,1,1/3],[0,2/3,1,1/3]] },

  /* ── Grid ── */
  { n:'2 × 2', c:'Grid', cells:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]] },
  { n:'3 × 2', c:'Grid', cells:[[0,0,1/3,.5],[1/3,0,1/3,.5],[2/3,0,1/3,.5],
                                [0,.5,1/3,.5],[1/3,.5,1/3,.5],[2/3,.5,1/3,.5]] },
  { n:'3 × 3', c:'Grid', cells:[[0,0,1/3,1/3],[1/3,0,1/3,1/3],[2/3,0,1/3,1/3],
                                [0,1/3,1/3,1/3],[1/3,1/3,1/3,1/3],[2/3,1/3,1/3,1/3],
                                [0,2/3,1/3,1/3],[1/3,2/3,1/3,1/3],[2/3,2/3,1/3,1/3]] },
  { n:'4 × 2', c:'Grid', cells:[[0,0,.25,.5],[.25,0,.25,.5],[.5,0,.25,.5],[.75,0,.25,.5],
                                [0,.5,.25,.5],[.25,.5,.25,.5],[.5,.5,.25,.5],[.75,.5,.25,.5]] },

  /* ── Masonry ── */
  { n:'Tall left',   c:'Masonry', cells:[[0,0,.5,1],[.5,0,.5,.5],[.5,.5,.5,.5]] },
  { n:'Tall right',  c:'Masonry', cells:[[0,0,.5,.5],[0,.5,.5,.5],[.5,0,.5,1]] },
  { n:'Staggered',   c:'Masonry', cells:[[0,0,1/3,.62],[0,.62,1/3,.38],
                                         [1/3,0,1/3,.38],[1/3,.38,1/3,.62],
                                         [2/3,0,1/3,.55],[2/3,.55,1/3,.45]] },
  { n:'Mixed heights',c:'Masonry', cells:[[0,0,.34,.55],[0,.55,.34,.45],
                                          [.34,0,.32,1],
                                          [.66,0,.34,.42],[.66,.42,.34,.58]] },
  { n:'Wide top',    c:'Masonry', cells:[[0,0,1,.55],[0,.55,1/3,.45],[1/3,.55,1/3,.45],[2/3,.55,1/3,.45]] },

  /* ── Gallery ── */
  { n:'Hero + 3',    c:'Gallery', cells:[[0,0,.62,1],[.62,0,.38,1/3],[.62,1/3,.38,1/3],[.62,2/3,.38,1/3]] },
  { n:'Hero + strip',c:'Gallery', cells:[[0,0,1,.66],[0,.66,.25,.34],[.25,.66,.25,.34],
                                         [.5,.66,.25,.34],[.75,.66,.25,.34]] },
  { n:'Centre focus',c:'Gallery', cells:[[0,0,.25,.5],[0,.5,.25,.5],
                                         [.25,0,.5,1],
                                         [.75,0,.25,.5],[.75,.5,.25,.5]] },
  { n:'Filmstrip',   c:'Gallery', cells:[[0,0,.2,1],[.2,0,.2,1],[.4,0,.2,1],[.6,0,.2,1],[.8,0,.2,1]] },
  { n:'Showcase',    c:'Gallery', cells:[[0,0,.5,.62],[.5,0,.5,.62],
                                         [0,.62,1/3,.38],[1/3,.62,1/3,.38],[2/3,.62,1/3,.38]] },
];

var ICON_PALETTE = ['#7C3AED', '#12A5A0', '#E8590C', '#EAB308', '#2563EB', '#DB2777', '#059669', '#DC2626'];

function gridPreviewSvg(g) {
  var s2 = '<svg viewBox="0 0 100 62">';
  g.cells.forEach(function (c, i) {
    s2 += '<rect x="' + (c[0] * 100 + 1.5) + '" y="' + (c[1] * 62 + 1.5) + '" width="' + (c[2] * 100 - 3)
      + '" height="' + (c[3] * 62 - 3) + '" rx="2.5" fill="' + ICON_PALETTE[i % ICON_PALETTE.length] + '" opacity="0.85"/>';
  });
  return s2 + '</svg>';
}

Editor._register({
  /* drop a whole photo grid: one landscape frame per cell, photo-ready */
  insertGrid: function (name) {
    var g = GRID_LAYOUTS.filter(function (x) { return x.n === name; })[0];
    if (!g) { showToast('Unknown grid'); return; }
    var W = fc.getWidth() / fc.getZoom(), H = fc.getHeight() / fc.getZoom();
    var pad = Math.round(W * 0.04), gut = Math.round(W * 0.008);
    var iw = W - pad * 2, ih = H - pad * 2;
    g.cells.forEach(function (c) {
      Editor.run('insertFrame', 'landscape');
      var o = fc.getActiveObject();
      if (!o) return;
      var x = pad + c[0] * iw + gut, y = pad + c[1] * ih + gut;
      var w = c[2] * iw - gut * 2, h = c[3] * ih - gut * 2;
      o.set({ left: x, top: y });
      if (o.width)  o.scaleX = w / o.width;
      if (o.height) o.scaleY = h / o.height;
      o.setCoords();
    });
    fc.discardActiveObject();
    fc.renderAll(); saveState();
    showToast('"' + g.n + '" grid added — drop photos into the frames');
  },
  __qGridLayouts: function () {
    var groups = {};
    GRID_LAYOUTS.forEach(function (g) {
      (groups[g.c] = groups[g.c] || []).push({ name: g.n, svg: gridPreviewSvg(g) });
    });
    return Object.keys(groups).map(function (k) { return { name: k, items: groups[k] }; });
  },
  __qIcons: function () {
    return (window.LD_ICON_GLYPHS || []).map(function (nm, i) {
      return { name: nm, color: ICON_PALETTE[i % ICON_PALETTE.length] };
    });
  }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 12 · GRAPHICS + ANIMATED STICKERS
   owner: Fable.  Verbatim v1 libraries:
   · STICKER_LIB — flat multi-colour sticker art incl. ANIMATED ones whose
     motion plays live on the canvas (spin / pulse / bounce / float); the
     resting transform is stashed so saves and exports never record a
     half-way animation frame.
   · ILLO_LIB — illustrations painted by PALETTE ROLE, recolourable in 8
     colour schemes without losing depth.
   ═══════════════════════════════════════════════════════════════════════ */

var STICKER_LIB = [
  /* ── Emoji ─────────────────────────────────────────────── */
  { n:'Grin', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M32 38 A6 8 0 1 1 31.9 38 Z','#3E2723'],
    ['M68 38 A6 8 0 1 1 67.9 38 Z','#3E2723'],
    ['M26 58 A24 24 0 0 0 74 58 Z','#3E2723'],
    ['M34 66 A16 16 0 0 0 66 66 Z','#FF5252'],
  ]},
  { n:'Heart eyes', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M32 48 C24 42 20 38 20 33 A6 6 0 0 1 32 30 A6 6 0 0 1 44 33 C44 38 40 42 32 48 Z','#F4436C'],
    ['M68 48 C60 42 56 38 56 33 A6 6 0 0 1 68 30 A6 6 0 0 1 80 33 C80 38 76 42 68 48 Z','#F4436C'],
    ['M30 62 A22 22 0 0 0 70 62 Z','#3E2723'],
  ]},
  { n:'Cool', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M14 34 H86 V40 H14 Z','#263238'],
    ['M18 38 H44 V52 A13 13 0 0 1 18 52 Z','#263238'],
    ['M56 38 H82 V52 A13 13 0 0 1 56 52 Z','#263238'],
    ['M32 68 A20 20 0 0 0 68 68','#3E2723','st'],
  ]},
  { n:'Wink', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M26 38 A6 8 0 1 1 25.9 38 Z','#3E2723'],
    ['M60 40 A10 6 0 0 1 78 40','#3E2723','st'],
    ['M30 62 A22 20 0 0 0 70 62 Z','#3E2723'],
  ]},
  { n:'Party', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M30 40 A5 7 0 1 1 29.9 40 Z','#3E2723'],
    ['M62 40 A5 7 0 1 1 61.9 40 Z','#3E2723'],
    ['M30 60 A22 22 0 0 0 74 60 Z','#3E2723'],
    ['M74 4 L96 26 L70 30 Z','#42A5F5'],
    ['M12 16 A4 4 0 1 1 11.9 16 Z','#EC407A'],
    ['M88 56 A4 4 0 1 1 87.9 56 Z','#66BB6A'],
  ]},
  { n:'Thinking', c:'Emoji', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z','#FDD835'],
    ['M30 38 A5 7 0 1 1 29.9 38 Z','#3E2723'],
    ['M66 38 A5 7 0 1 1 65.9 38 Z','#3E2723'],
    ['M36 68 H64','#3E2723','st'],
    ['M62 74 A9 9 0 1 1 61.9 74 Z','#FFB74D'],
  ]},

  /* ── Social ────────────────────────────────────────────── */
  { n:'Heart', c:'Social', p:[
    ['M50 90 C22 66 6 52 6 34 A20 20 0 0 1 50 22 A20 20 0 0 1 94 34 C94 52 78 66 50 90 Z','#F4436C'],
    ['M30 34 A8 8 0 0 1 42 28','#FFFFFF','st'],
  ]},
  { n:'Thumbs up', c:'Social', p:[
    ['M28 44 H44 L52 16 A9 9 0 0 1 64 24 L60 42 H84 A8 8 0 0 1 92 52 L84 82 A10 10 0 0 1 74 90 H28 Z','#42A5F5'],
    ['M8 44 H28 V90 H8 Z','#1E88E5'],
  ]},
  { n:'Star', c:'Social', p:[
    ['M50 4 L62 36 L96 38 L70 60 L78 94 L50 76 L22 94 L30 60 L4 38 L38 36 Z','#FFC107'],
  ]},
  { n:'Comment', c:'Social', p:[
    ['M10 12 H90 V68 H44 L24 88 V68 H10 Z','#7C3AED'],
    ['M28 34 A5 5 0 1 1 27.9 34 Z','#FFFFFF'],
    ['M50 34 A5 5 0 1 1 49.9 34 Z','#FFFFFF'],
    ['M72 34 A5 5 0 1 1 71.9 34 Z','#FFFFFF'],
  ]},
  { n:'Fire', c:'Social', p:[
    ['M52 4 C58 26 82 34 82 58 A32 32 0 0 1 18 58 C18 44 28 38 32 26 C40 38 44 40 48 34 C52 28 50 16 52 4 Z','#FF7043'],
    ['M52 44 C56 56 66 58 66 68 A16 16 0 0 1 34 68 C34 60 42 56 44 48 C48 54 50 52 52 44 Z','#FFCA28'],
  ]},
  { n:'Bell', c:'Social', p:[
    ['M50 8 A8 8 0 0 1 58 16 A26 26 0 0 1 76 40 V64 L86 76 H14 L24 64 V40 A26 26 0 0 1 42 16 A8 8 0 0 1 50 8 Z','#FFB300'],
    ['M38 80 A12 12 0 0 0 62 80 Z','#F57C00'],
  ]},
  { n:'Check badge', c:'Social', p:[
    ['M50 4 L62 14 L78 12 L82 28 L96 36 L88 50 L96 64 L82 72 L78 88 L62 86 L50 96 L38 86 L22 88 L18 72 L4 64 L12 50 L4 36 L18 28 L22 12 L38 14 Z','#22C55E'],
    ['M32 50 L44 62 L70 36','#FFFFFF','st'],
  ]},
  { n:'New', c:'Social', p:[
    ['M10 26 H90 A8 8 0 0 1 98 34 V66 A8 8 0 0 1 90 74 H10 A8 8 0 0 1 2 66 V34 A8 8 0 0 1 10 26 Z','#EF4444'],
    ['M18 62 V38 L34 62 V38 M44 38 H60 M44 50 H56 M44 62 H60 M68 38 L72 62 L78 46 L84 62 L88 38','#FFFFFF','st'],
  ]},

  /* ── Decorative ────────────────────────────────────────── */
  { n:'Sparkle', c:'Decorative', p:[
    ['M50 4 C54 30 64 40 90 44 C64 48 54 58 50 84 C46 58 36 48 10 44 C36 40 46 30 50 4 Z','#A78BFA'],
    ['M82 68 C84 78 88 82 96 84 C88 86 84 90 82 98 C80 90 76 86 68 84 C76 82 80 78 82 68 Z','#DDD6FE'],
  ]},
  { n:'Confetti', c:'Decorative', p:[
    ['M12 10 H26 V24 H12 Z','#F4436C'],
    ['M74 6 L88 14 L80 28 Z','#42A5F5'],
    ['M20 60 A7 7 0 1 1 19.9 60 Z','#FFC107'],
    ['M64 48 H80 V56 H64 Z','#22C55E'],
    ['M44 76 L56 84 L44 92 L32 84 Z','#A78BFA'],
    ['M86 66 A6 6 0 1 1 85.9 66 Z','#FF7043'],
  ]},
  { n:'Tape', c:'Decorative', p:[
    ['M6 38 L94 24 L98 52 L10 66 Z','#FDE68A'],
    ['M6 38 L18 42 L6 46 Z','#FCD34D'],
    ['M98 52 L86 48 L98 44 Z','#FCD34D'],
  ]},
  { n:'Ribbon banner', c:'Decorative', p:[
    ['M14 22 H86 V62 H72 L50 78 L28 62 H14 Z','#7C3AED'],
    ['M14 22 L2 34 L14 40 Z','#5B21B6'],
    ['M86 22 L98 34 L86 40 Z','#5B21B6'],
  ]},
  { n:'Quote', c:'Decorative', p:[
    ['M12 20 H42 V50 A28 28 0 0 1 14 78 V64 A14 14 0 0 0 28 50 H12 Z','#334155'],
    ['M56 20 H86 V50 A28 28 0 0 1 58 78 V64 A14 14 0 0 0 72 50 H56 Z','#334155'],
  ]},
  { n:'Arrow doodle', c:'Decorative', p:[
    ['M8 76 C28 76 30 26 52 26 C70 26 68 60 86 56','#0F172A','st'],
    ['M76 46 L90 54 L76 64','#0F172A','st'],
  ]},
  { n:'Burst', c:'Decorative', p:[
    ['M50 2 L58 26 L80 12 L74 38 L98 40 L78 54 L94 74 L68 70 L66 96 L50 78 L34 96 L32 70 L6 74 L22 54 L2 40 L26 38 L20 12 L42 26 Z','#FF7043'],
    ['M50 30 A18 18 0 1 1 49.9 30 Z','#FFCA28'],
  ]},
  { n:'Pin', c:'Decorative', p:[
    ['M50 6 A30 30 0 0 1 80 36 C80 58 50 94 50 94 C50 94 20 58 20 36 A30 30 0 0 1 50 6 Z','#EF4444'],
    ['M50 22 A13 13 0 1 1 49.9 22 Z','#FFFFFF'],
  ]},

  /* ── Animated ──────────────────────────────────────────── */
  { n:'Spin star', c:'Animated', anim:'spin', p:[
    ['M50 4 L62 36 L96 38 L70 60 L78 94 L50 76 L22 94 L30 60 L4 38 L38 36 Z','#FFC107'],
    ['M50 30 L56 44 L70 45 L59 54 L62 68 L50 60 L38 68 L41 54 L30 45 L44 44 Z','#FFE082'],
  ]},
  { n:'Pulse heart', c:'Animated', anim:'pulse', p:[
    ['M50 90 C22 66 6 52 6 34 A20 20 0 0 1 50 22 A20 20 0 0 1 94 34 C94 52 78 66 50 90 Z','#F4436C'],
  ]},
  { n:'Bounce arrow', c:'Animated', anim:'bounce', p:[
    ['M36 6 H64 V54 H84 L50 94 L16 54 H36 Z','#42A5F5'],
  ]},
  { n:'Float sparkle', c:'Animated', anim:'float', p:[
    ['M50 6 C54 32 64 42 90 46 C64 50 54 60 50 86 C46 60 36 50 10 46 C36 42 46 32 50 6 Z','#A78BFA'],
  ]},
  { n:'Spin sun', c:'Animated', anim:'spin', p:[
    ['M50 26 A24 24 0 1 1 49.9 26 Z','#FFC107'],
    ['M50 2 L56 16 H44 Z M50 98 L44 84 H56 Z M2 50 L16 44 V56 Z M98 50 L84 56 V44 Z','#FFB300'],
    ['M16 16 L30 22 L22 30 Z M84 84 L70 78 L78 70 Z M84 16 L78 30 L70 22 Z M16 84 L22 70 L30 78 Z','#FFB300'],
  ]},
  { n:'Pulse dot', c:'Animated', anim:'pulse', p:[
    ['M50 10 A40 40 0 1 1 49.9 10 Z','#DDD6FE'],
    ['M50 28 A22 22 0 1 1 49.9 28 Z','#7C3AED'],
  ]},
];

var ILLO_PALETTES = [
  { n:'Violet',  c:['#3C1E7A','#7C3AED','#A78BFA','#DDD6FE','#F5F3FF'] },
  { n:'Teal',    c:['#04342C','#0F6E56','#1D9E75','#9FE1CB','#E1F5EE'] },
  { n:'Coral',   c:['#4A1B0C','#993C1D','#D85A30','#F5C4B3','#FAECE7'] },
  { n:'Blue',    c:['#042C53','#185FA5','#378ADD','#B5D4F4','#E6F1FB'] },
  { n:'Amber',   c:['#412402','#854F0B','#BA7517','#FAC775','#FAEEDA'] },
  { n:'Pink',    c:['#4B1528','#993556','#D4537E','#F4C0D1','#FBEAF0'] },
  { n:'Slate',   c:['#0F172A','#334155','#64748B','#CBD5E1','#F1F5F9'] },
  { n:'Green',   c:['#173404','#3B6D11','#639922','#C0DD97','#EAF3DE'] },
];

var ILLO_LIB = [
  /* ── Flat ─────────────────────────────────────────────── */
  { n:'Growth', s:'Flat', p:[
    ['M10 88 H90', 1, 'st'],
    ['M18 88 V62 H32 V88 Z', 3],
    ['M38 88 V46 H52 V88 Z', 2],
    ['M58 88 V30 H72 V88 Z', 1],
    ['M20 40 L44 24 L60 34 L86 12', 0, 'st'],
    ['M74 10 H88 V24 Z', 0],
  ]},
  { n:'Idea', s:'Flat', p:[
    ['M50 8 C66 8 78 20 78 36 C78 48 70 54 66 62 H34 C30 54 22 48 22 36 C22 20 34 8 50 8 Z', 3],
    ['M50 20 C60 20 66 27 66 36 C66 43 61 47 58 53 H42 C39 47 34 43 34 36 C34 27 40 20 50 20 Z', 4],
    ['M36 66 H64 V74 H36 Z', 1],
    ['M39 78 H61 V86 H39 Z', 0],
    ['M50 2 V10 M18 18 L24 24 M82 18 L76 24 M8 42 H16 M84 42 H92', 2, 'st'],
  ]},
  { n:'Target', s:'Flat', p:[
    ['M50 12 A38 38 0 1 1 49.9 12 Z', 3],
    ['M50 26 A24 24 0 1 1 49.9 26 Z', 4],
    ['M50 38 A12 12 0 1 1 49.9 38 Z', 1],
    ['M84 16 L54 46', 0, 'st'],
    ['M78 8 L92 12 L88 26 Z', 0],
  ]},
  { n:'Data board', s:'Flat', p:[
    ['M8 14 H92 V74 H8 Z', 3],
    ['M8 14 H92 V26 H8 Z', 1],
    ['M18 66 V44 H28 V66 Z', 2],
    ['M34 66 V34 H44 V66 Z', 1],
    ['M50 66 V50 H60 V66 Z', 2],
    ['M66 66 V38 H76 V66 Z', 0],
    ['M42 74 H58 V88 H42 Z', 1],
    ['M28 88 H72 V94 H28 Z', 0],
  ]},

  /* ── 3D (depth by tonal layering) ─────────────────────── */
  { n:'Coin stack', s:'3D', p:[
    ['M50 66 C70 66 86 72 86 80 C86 88 70 94 50 94 C30 94 14 88 14 80 C14 72 30 66 50 66 Z', 1],
    ['M50 48 C70 48 86 54 86 62 C86 70 70 76 50 76 C30 76 14 70 14 62 C14 54 30 48 50 48 Z', 2],
    ['M50 30 C70 30 86 36 86 44 C86 52 70 58 50 58 C30 58 14 52 14 44 C14 36 30 30 50 30 Z', 3],
    ['M50 34 C64 34 74 38 74 44 C74 50 64 54 50 54 C36 54 26 50 26 44 C26 38 36 34 50 34 Z', 4],
  ]},
  { n:'Cube', s:'3D', p:[
    ['M50 10 L88 32 L50 54 L12 32 Z', 3],
    ['M12 32 L50 54 V94 L12 72 Z', 1],
    ['M88 32 L50 54 V94 L88 72 Z', 2],
  ]},
  { n:'Sphere', s:'3D', p:[
    ['M50 8 A42 42 0 1 1 49.9 8 Z', 1],
    ['M50 8 A42 42 0 0 1 88 34 A46 46 0 0 0 22 76 A42 42 0 0 1 50 8 Z', 2],
    ['M36 26 A11 8 0 1 1 35.9 26 Z', 4],
  ]},
  { n:'Layers', s:'3D', p:[
    ['M50 62 L92 78 L50 94 L8 78 Z', 1],
    ['M50 42 L92 58 L50 74 L8 58 Z', 2],
    ['M50 22 L92 38 L50 54 L8 38 Z', 3],
    ['M50 30 L74 38 L50 46 L26 38 Z', 4],
  ]},

  /* ── Hand drawn (stroke art) ──────────────────────────── */
  { n:'Sketch arrow', s:'Hand drawn', p:[
    ['M8 74 C26 74 30 30 48 30 C64 30 62 62 78 60 C86 59 88 48 88 40', 1, 'st'],
    ['M80 32 L89 38 L80 46', 1, 'st'],
  ]},
  { n:'Sketch star', s:'Hand drawn', p:[
    ['M50 10 L61 38 L91 40 L68 58 L76 88 L50 71 L24 88 L32 58 L9 40 L39 38 Z', 1, 'st'],
    ['M50 26 L56 42 L72 43 L60 53 L64 69 L50 60 L36 69 L40 53 L28 43 L44 42 Z', 3, 'st'],
  ]},
  { n:'Doodle cloud', s:'Hand drawn', p:[
    ['M28 72 A16 16 0 0 1 28 40 A20 20 0 0 1 64 33 A16 16 0 0 1 70 72 Z', 1, 'st'],
    ['M22 82 A5 5 0 1 1 21.9 82 Z', 2, 'st'],
    ['M40 88 A4 4 0 1 1 39.9 88 Z', 2, 'st'],
  ]},
  { n:'Flourish', s:'Hand drawn', p:[
    ['M6 56 q12 -18 24 0 t24 0 t24 0 t16 -6', 1, 'st'],
    ['M14 70 q14 -10 28 -2 t30 -4', 3, 'st'],
  ]},

  /* ── Corporate ────────────────────────────────────────── */
  { n:'Office', s:'Corporate', p:[
    ['M10 90 V26 H46 V90 Z', 2],
    ['M46 90 V44 H90 V90 Z', 1],
    ['M18 34 H26 V42 H18 Z M32 34 H40 V42 H32 Z M18 50 H26 V58 H18 Z M32 50 H40 V58 H32 Z M18 66 H26 V74 H18 Z M32 66 H40 V74 H32 Z', 4],
    ['M54 52 H62 V60 H54 Z M70 52 H78 V60 H70 Z M54 68 H62 V76 H54 Z M70 68 H78 V76 H70 Z', 4],
    ['M6 90 H94', 0, 'st'],
  ]},
  { n:'Briefcase', s:'Corporate', p:[
    ['M8 32 H92 V86 H8 Z', 2],
    ['M36 20 H64 V32 H56 V28 H44 V32 H36 Z', 1],
    ['M8 48 H92 V58 H8 Z', 1],
    ['M42 46 H58 V60 H42 Z', 4],
  ]},
  { n:'Agreement', s:'Corporate', p:[
    ['M14 10 H70 L86 26 V90 H14 Z', 3],
    ['M70 10 L86 26 H70 Z', 2],
    ['M26 38 H74 M26 50 H74 M26 62 H58', 1, 'st'],
    ['M56 74 L64 82 L80 64', 0, 'st'],
  ]},
  { n:'Strategy', s:'Corporate', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z', 4],
    ['M50 18 A32 32 0 1 1 49.9 18 Z', 3],
    ['M50 50 L50 18 A32 32 0 0 1 78 34 Z', 1],
    ['M50 50 L78 34 A32 32 0 0 1 66 78 Z', 2],
    ['M50 44 A6 6 0 1 1 49.9 44 Z', 0],
  ]},

  /* ── Character packs ──────────────────────────────────── */
  { n:'Standing', s:'Character', p:[
    ['M50 12 A13 13 0 1 1 49.9 12 Z', 2],
    ['M30 46 C30 38 38 34 50 34 C62 34 70 38 70 46 V70 H30 Z', 1],
    ['M36 70 H46 V94 H36 Z M54 70 H64 V94 H54 Z', 0],
    ['M30 46 L20 66 M70 46 L80 66', 2, 'st'],
  ]},
  { n:'Waving', s:'Character', p:[
    ['M50 14 A12 12 0 1 1 49.9 14 Z', 2],
    ['M32 48 C32 40 40 36 50 36 C60 36 68 40 68 48 V72 H32 Z', 1],
    ['M38 72 H47 V94 H38 Z M53 72 H62 V94 H53 Z', 0],
    ['M68 48 L84 26', 2, 'st'],
    ['M84 20 A6 6 0 1 1 83.9 20 Z', 3],
  ]},
  { n:'Duo', s:'Character', p:[
    ['M32 20 A11 11 0 1 1 31.9 20 Z', 2],
    ['M14 50 C14 43 22 39 32 39 C42 39 50 43 50 50 V88 H14 Z', 1],
    ['M68 24 A10 10 0 1 1 67.9 24 Z', 3],
    ['M52 52 C52 46 59 42 68 42 C77 42 84 46 84 52 V88 H52 Z', 2],
  ]},
  { n:'Avatar', s:'Character', p:[
    ['M50 6 A44 44 0 1 1 49.9 6 Z', 4],
    ['M50 26 A15 15 0 1 1 49.9 26 Z', 2],
    ['M20 82 C20 66 33 58 50 58 C67 58 80 66 80 82 A44 44 0 0 1 20 82 Z', 1],
  ]},

  /* ── Isometric ────────────────────────────────────────── */
  { n:'Iso tile', s:'Isometric', p:[
    ['M50 30 L92 54 L50 78 L8 54 Z', 2],
    ['M8 54 L50 78 V88 L8 64 Z', 1],
    ['M92 54 L50 78 V88 L92 64 Z', 0],
  ]},
  { n:'Iso boxes', s:'Isometric', p:[
    ['M28 46 L52 60 L28 74 L4 60 Z', 3],
    ['M4 60 L28 74 V88 L4 74 Z', 1],
    ['M52 60 L28 74 V88 L52 74 Z', 2],
    ['M72 30 L96 44 L72 58 L48 44 Z', 3],
    ['M48 44 L72 58 V72 L48 58 Z', 1],
    ['M96 44 L72 58 V72 L96 58 Z', 2],
  ]},
  { n:'Iso stack', s:'Isometric', p:[
    ['M50 8 L86 28 L50 48 L14 28 Z', 3],
    ['M14 28 L50 48 V62 L14 42 Z', 1],
    ['M86 28 L50 48 V62 L86 42 Z', 2],
    ['M14 46 L50 66 V80 L14 60 Z', 1],
    ['M86 46 L50 66 V80 L86 60 Z', 2],
    ['M50 46 L86 46 L50 66 L14 46 Z', 4],
  ]},
  { n:'Iso room', s:'Isometric', p:[
    ['M50 34 L92 58 L50 82 L8 58 Z', 3],
    ['M8 22 L50 46 V82 L8 58 Z', 1],
    ['M92 22 L50 46 V82 L92 58 Z', 2],
    ['M30 52 L46 61 L30 70 L14 61 Z', 4],
  ]},
];


function stickerSvg(st, size) {
  return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">'
    + st.p.map(function (part) {
        return part[2] === 'st'
          ? '<path d="' + part[0] + '" fill="none" stroke="' + part[1]
            + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="' + part[0] + '" fill="' + part[1] + '"/>';
      }).join('') + '</svg>';
}

function illoSvg(il, pal, size) {
  var c = ILLO_PALETTES[pal % ILLO_PALETTES.length].c;
  return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">'
    + il.p.map(function (part) {
        var col = c[part[1]];
        return part[2] === 'st'
          ? '<path d="' + part[0] + '" fill="none" stroke="' + col
            + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="' + part[0] + '" fill="' + col + '"/>';
      }).join('')
    + '</svg>';
}

function addStickerV2(idx, atX, atY) {
  var st = STICKER_LIB[idx];
  if (!st || !fc) return;
  var paths = st.p.map(function (part) {
    return new fabric.Path(part[0], part[2] === 'st'
      ? { fill: '', stroke: part[1], strokeWidth: 6,
          strokeLineCap: 'round', strokeLineJoin: 'round', objectCaching: false }
      : { fill: part[1], objectCaching: false });
  });
  var g = new fabric.Group(paths, {
    isSticker: true, stickerName: st.n, stickerAnim: st.anim || null,
    objectCaching: false
  });
  var slideW = fc.getWidth() / fc.getZoom();
  var slideH = fc.getHeight() / fc.getZoom();
  g.scaleToWidth(Math.min(slideW, slideH) * 0.2);
  g.set({
    left: atX != null ? atX - g.getScaledWidth() / 2  : (slideW - g.getScaledWidth()) / 2,
    top:  atY != null ? atY - g.getScaledHeight() / 2 : (slideH - g.getScaledHeight()) / 2
  });
  fc.add(g); fc.setActiveObject(g);
  if (g.stickerAnim) stickerCaptureBase(g);
  fc.renderAll();
  saveState();
  showToast(st.n + ' added');
}

/* ── live motion runtime (verbatim v1) ── */
function stickerCaptureBase(o) {
  o._animBase = { top: o.top, left: o.left, angle: o.angle || 0,
                  scaleX: o.scaleX || 1, scaleY: o.scaleY || 1 };
}
window.stickerFreeze = function () {
  if (!fc || !fc.getObjects) return;
  (fc.getObjects() || []).forEach(function (o) {
    if (o.stickerAnim && o._animBase) {
      o.set({ top: o._animBase.top, left: o._animBase.left, angle: o._animBase.angle,
              scaleX: o._animBase.scaleX, scaleY: o._animBase.scaleY });
      o.setCoords();
    }
  });
};
(function stickerTicker() {
  var t0 = Date.now();
  function tick() {
    requestAnimationFrame(tick);
    if (typeof fc === 'undefined' || !fc || !fc.getObjects) return;
    var all = fc.getObjects();
    if (!all || !all.length) return;
    var objs = all.filter(function (o) { return o && o.stickerAnim; });
    if (!objs.length) return;
    var t = (Date.now() - t0) / 1000;
    var moved = false;
    objs.forEach(function (o) {
      if (!o._animBase) stickerCaptureBase(o);
      if (fc.getActiveObject() === o && o.__corner) { stickerCaptureBase(o); return; }
      var b = o._animBase;
      if (o.stickerAnim === 'spin')  o.set({ angle: b.angle + (t * 60) % 360 });
      else if (o.stickerAnim === 'pulse') {
        var k = 1 + Math.sin(t * 3) * 0.07;
        o.set({ scaleX: b.scaleX * k, scaleY: b.scaleY * k });
      } else if (o.stickerAnim === 'bounce') {
        o.set({ top: b.top + Math.abs(Math.sin(t * 3)) * -10 });
      } else if (o.stickerAnim === 'float') {
        o.set({ top: b.top + Math.sin(t * 1.6) * 6 });
      }
      moved = true;
    });
    if (moved) fc.requestRenderAll();
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
})();
/* saves/thumbnails must never record a mid-animation frame */
(function () {
  function wrapCapture() {
    if (!window.captureCurrentPage) { setTimeout(wrapCapture, 500); return; }
    if (window.captureCurrentPage.__ldFreezeWrapped) return;
    var orig = window.captureCurrentPage;
    var w = function () { try { window.stickerFreeze(); } catch (e) {} return orig.apply(this, arguments); };
    w.__ldFreezeWrapped = true;
    window.captureCurrentPage = w;
  }
  wrapCapture();
})();

var _illoPaletteV2 = 0;

function makeIllustrationV2(idx, pal) {
  var il = ILLO_LIB[idx];
  if (!il || !fc) return null;
  var cols = ILLO_PALETTES[pal % ILLO_PALETTES.length].c;
  var paths = il.p.map(function (part) {
    return new fabric.Path(part[0], part[2] === 'st'
      ? { fill: '', stroke: cols[part[1]], strokeWidth: 4,
          strokeLineCap: 'round', strokeLineJoin: 'round',
          illoRole: part[1], illoStroke: true, objectCaching: false }
      : { fill: cols[part[1]], illoRole: part[1], objectCaching: false });
  });
  return new fabric.Group(paths, {
    isIllo: true, illoIndex: idx, illoPalette: pal, illoName: il.n,
    objectCaching: false
  });
}

Editor._register({
  insertSticker: function (idx) { addStickerV2(idx | 0); },
  insertIllo: function (arg) {
    var idx = (arg && arg.i != null) ? arg.i : (arg | 0);
    if (arg && arg.pal != null) _illoPaletteV2 = arg.pal;
    var g = makeIllustrationV2(idx, _illoPaletteV2);
    if (!g) return;
    var slideW = fc.getWidth() / fc.getZoom();
    var slideH = fc.getHeight() / fc.getZoom();
    g.scaleToWidth(Math.min(slideW, slideH) * 0.42);
    g.set({
      left: (slideW - g.getScaledWidth()) / 2,
      top: (slideH - g.getScaledHeight()) / 2
    });
    fc.add(g); fc.setActiveObject(g);
    fc.renderAll(); saveState();
    showToast(ILLO_LIB[idx].n + ' added');
  },
  __qStickers: function () {
    var cats = {};
    STICKER_LIB.forEach(function (st, i) {
      var c = st.c || 'Other';
      (cats[c] = cats[c] || []).push({ i: i, name: st.n, svg: stickerSvg(st, 62), anim: st.anim || null });
    });
    return Object.keys(cats).map(function (k) { return { name: k, items: cats[k] }; });
  },
  __qIllos: function (pal) {
    var p = pal == null ? _illoPaletteV2 : pal;
    return {
      palettes: ILLO_PALETTES.map(function (x, i) { return { i: i, name: x.n, a: x.c[1], b: x.c[3] }; }),
      current: _illoPaletteV2,
      styles: (function () {
        var groups = {};
        ILLO_LIB.forEach(function (il, i) {
          (groups[il.s] = groups[il.s] || []).push({ i: i, name: il.n, svg: illoSvg(il, p, 78) });
        });
        return Object.keys(groups).map(function (k) { return { name: k, items: groups[k] }; });
      })()
    };
  },
  illoPalette: function (i) { _illoPaletteV2 = i | 0; if (window.Editor && Editor._emit) Editor._emit('illos', { pal: _illoPaletteV2 }); }
});


/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE 3D (real WebGL objects)          owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   The 3D BRAIN. Loads three.js lazily, builds real parametric meshes,
   renders them with lighting to a transparent texture, and places that
   texture on the fabric canvas as an object that REMEMBERS its 3D state
   (kind / colour / rotation). Alt+drag a selected 3D object to rotate it
   live — the mesh re-renders every frame, like PowerPoint 3D models.
   Overrides the flat-SVG insert3D from core.js (this file loads after it).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var THREE_URL = 'vendor/three.min.js';   /* 21 Aug 2026 — self-hosted (offline + no CDN dependency) */
  var THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var _loading = null;
  function ensureThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (_loading) return _loading;
    _loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = THREE_URL;
      s.onload = function () { res(window.THREE); };
      s.onerror = function () {
        var s2 = document.createElement('script'); s2.src = THREE_CDN;
        s2.onload = function () { res(window.THREE); };
        s2.onerror = function () { _loading = null; rej(new Error('three.js failed to load')); };
        document.head.appendChild(s2);
      };
      document.head.appendChild(s);
    });
    return _loading;
  }

  /* one shared offscreen renderer */
  var R = null;
  function renderer() {
    var T = window.THREE;
    if (!R) {
      R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      R.setSize(512, 512);
      R.setClearColor(0x000000, 0);
    }
    return R;
  }

  /* ══ 3D TEXT (23 Aug 2026, Fable) ═══════════════════════════════════════
     Any word the user types — A-Z, a-z, 0-9, punctuation — extruded into a
     real, rotatable 3D mesh. three r128 dropped TextGeometry from core, so
     the glyph outlines are parsed here directly from a typeface.json font
     (self-hosted in vendor/fonts3d/, CDN fallback) into THREE.Shape paths
     and pushed through ExtrudeGeometry. */
  var FONT3D_URL = 'vendor/fonts3d/helvetiker_bold.typeface.json';
  var FONT3D_CDN = 'https://unpkg.com/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json';
  var _font3d = null, _font3dLoading = null;
  function ensureFont3D() {
    if (_font3d) return Promise.resolve(_font3d);
    if (_font3dLoading) return _font3dLoading;
    _font3dLoading = fetch(FONT3D_URL).then(function (r) {
      if (!r.ok) throw new Error('local font missing');
      return r.json();
    }).catch(function () { return fetch(FONT3D_CDN).then(function (r) { return r.json(); }); })
      .then(function (j) { _font3d = j; return j; })
      .catch(function (e) { _font3dLoading = null; throw e; });
    return _font3dLoading;
  }
  /* one glyph's outline string ("m x y l x y q x y cx cy …") → THREE.Shapes.
     Same command grammar as three's own Font.js: q/b put the TARGET point
     first, control point(s) after. */
  function glyphToShapes(glyph, scale, offX) {
    var T = window.THREE;
    var sp = new T.ShapePath();
    var o = (glyph.o || '').split(' ');
    var i = 0;
    function n() { return parseFloat(o[i++]) * scale; }
    while (i < o.length) {
      var cmd = o[i++];
      if (cmd === 'm')      sp.moveTo(n() + offX, n());
      else if (cmd === 'l') sp.lineTo(n() + offX, n());
      else if (cmd === 'q') { var qx = n() + offX, qy = n(), qcx = n() + offX, qcy = n(); sp.quadraticCurveTo(qcx, qcy, qx, qy); }
      else if (cmd === 'b') { var bx = n() + offX, by = n(), b1x = n() + offX, b1y = n(), b2x = n() + offX, b2y = n(); sp.bezierCurveTo(b1x, b1y, b2x, b2y, bx, by); }
      else if (cmd === 'z') { /* close — ShapePath closes on next moveTo */ }
    }
    return sp.toShapes(true);
  }
  function textMesh(text, material) {
    var T = window.THREE;
    var data = _font3d;
    if (!data) return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), material);
    var size = 1, scale = size / (data.resolution || 1000);
    var shapes = [], offX = 0;
    String(text || 'ABC').split('').forEach(function (ch) {
      if (ch === ' ') { offX += (data.resolution || 1000) * 0.5 * scale; return; }
      var glyph = (data.glyphs || {})[ch] || (data.glyphs || {})['?'];
      if (!glyph) return;
      glyphToShapes(glyph, scale, offX).forEach(function (s) { shapes.push(s); });
      offX += (glyph.ha || (data.resolution || 1000) * 0.6) * scale;
    });
    if (!shapes.length) return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), material);
    var geo = new T.ExtrudeGeometry(shapes, {
      depth: size * 0.28, curveSegments: 8,
      bevelEnabled: true, bevelThickness: size * 0.02, bevelSize: size * 0.015, bevelSegments: 2
    });
    return new T.Mesh(geo, material);
  }
  /* centre any mesh/group on the origin and scale it to a standard size so
     every kind — a letter, a word, an arch — fills the frame the same way */
  function normalize(m, target) {
    var T = window.THREE;
    var box = new T.Box3().setFromObject(m);
    var c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
    var g = new T.Group();
    m.position.sub(c);
    g.add(m);
    var maxd = Math.max(s.x, s.y, s.z) || 1;
    var k = (target || 2.2) / maxd;
    g.scale.set(k, k, k);
    return g;
  }
  function starShape() {
    var T = window.THREE, sh = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 0.45 : 1, a = Math.PI / 2 + i * Math.PI / 5;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    }
    sh.closePath();
    return sh;
  }
  function arrowShape() {
    var T = window.THREE, sh = new T.Shape();
    sh.moveTo(-1, 0.22); sh.lineTo(0.25, 0.22); sh.lineTo(0.25, 0.55);
    sh.lineTo(1, 0); sh.lineTo(0.25, -0.55); sh.lineTo(0.25, -0.22);
    sh.lineTo(-1, -0.22); sh.closePath();
    return sh;
  }

  /* ══ 3D MOCKUPS (23 Aug 2026, Fable — Pacdora step) ═════════════════════
     Real-world objects — bottle, can, mug, poster frame, phone, laptop —
     built PROCEDURALLY (no model files, works offline), each with a design
     surface that wears the user's CURRENT SLIDE as its label/screen.
     The label image travels with the object (threeTexData), so saved decks
     reopen with their mockups intact and still rotatable. */
  var _texCache = {};   /* dataURL -> THREE.Texture (loaded + ready) */
  function warmTexture(dataURL) {
    if (!dataURL) return Promise.resolve(null);
    if (_texCache[dataURL]) return Promise.resolve(_texCache[dataURL]);
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        var T = window.THREE;
        var t = new T.Texture(img);
        t.needsUpdate = true;
        _texCache[dataURL] = t;
        res(t);
      };
      img.onerror = function () { res(null); };
      img.src = dataURL;
    });
  }
  function labelMat(texData, fallbackColor) {
    var T = window.THREE;
    var t = texData && _texCache[texData];
    return t
      ? new T.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.05 })
      : new T.MeshStandardMaterial({ color: fallbackColor || '#FFFFFF', roughness: 0.5, metalness: 0.05 });
  }
  function bodyMat(color, opts) {
    var T = window.THREE;
    return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.35, metalness: 0.2 }, opts || {}));
  }
  function mockupMesh(kind, colorHex, texData) {
    var T = window.THREE, g = new T.Group();
    var label = labelMat(texData, '#F4F4F5');
    if (kind === 'bottle') {
      /* lathe body from a profile: base → shoulder → neck */
      var pts = [];
      [[0, 0], [0.62, 0], [0.72, 0.06], [0.75, 0.5], [0.75, 1.55], [0.7, 1.75],
       [0.45, 2.0], [0.26, 2.15], [0.24, 2.45], [0.24, 2.6]].forEach(function (p) {
        pts.push(new T.Vector2(p[0], p[1]));
      });
      g.add(new T.Mesh(new T.LatheGeometry(pts, 48), bodyMat(colorHex, { roughness: 0.25, metalness: 0.1 })));
      var cap = new T.Mesh(new T.CylinderGeometry(0.27, 0.27, 0.3, 32), bodyMat('#26262B'));
      cap.position.y = 2.72; g.add(cap);
      /* the label: an open band around the body, wearing the slide */
      var band = new T.Mesh(new T.CylinderGeometry(0.765, 0.765, 0.95, 48, 1, true), label);
      band.position.y = 0.98; g.add(band);
    } else if (kind === 'can') {
      g.add(new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 2.1, 48), bodyMat('#C9CCD1', { metalness: 0.7, roughness: 0.3 })));
      var lid = new T.Mesh(new T.CylinderGeometry(0.72, 0.75, 0.06, 48), bodyMat('#9DA1A8', { metalness: 0.8, roughness: 0.25 }));
      lid.position.y = 1.08; g.add(lid);
      var wrap = new T.Mesh(new T.CylinderGeometry(0.755, 0.755, 1.85, 48, 1, true), label);
      wrap.position.y = -0.05; g.add(wrap);
    } else if (kind === 'mug') {
      g.add(new T.Mesh(new T.CylinderGeometry(0.8, 0.74, 1.7, 48), bodyMat(colorHex, { roughness: 0.4 })));
      var inner = new T.Mesh(new T.CylinderGeometry(0.72, 0.72, 0.06, 48), bodyMat('#1F1F23'));
      inner.position.y = 0.83; g.add(inner);
      var handle = new T.Mesh(new T.TorusGeometry(0.42, 0.09, 16, 32, Math.PI), bodyMat(colorHex, { roughness: 0.4 }));
      handle.position.set(0.82, 0.05, 0); handle.rotation.z = -Math.PI / 2; g.add(handle);
      var wrapM = new T.Mesh(new T.CylinderGeometry(0.805, 0.75, 1.15, 48, 1, true), label);
      wrapM.position.y = 0.1; g.add(wrapM);
    } else if (kind === 'frame') {
      var fm = bodyMat(colorHex || '#3A2E22', { roughness: 0.5 });
      var W2 = 2.4, H2 = 1.5, tk = 0.14, dp = 0.1;
      [[0, H2 / 2, W2 + tk * 2, tk], [0, -H2 / 2, W2 + tk * 2, tk],
       [-W2 / 2 - tk / 2, 0, tk, H2], [W2 / 2 + tk / 2, 0, tk, H2]].forEach(function (b) {
        var bar = new T.Mesh(new T.BoxGeometry(b[2], b[3], dp), fm);
        bar.position.set(b[0], b[1], 0); g.add(bar);
      });
      var art = new T.Mesh(new T.PlaneGeometry(W2, H2), label);
      art.position.z = 0.02; g.add(art);
      var back = new T.Mesh(new T.PlaneGeometry(W2, H2), bodyMat('#26262B'));
      back.rotation.y = Math.PI; back.position.z = -0.02; g.add(back);
    } else if (kind === 'phone') {
      var bodyP = new T.Mesh(new T.BoxGeometry(1.05, 2.15, 0.09), bodyMat('#1B1B1F', { roughness: 0.3, metalness: 0.5 }));
      g.add(bodyP);
      var scr = new T.Mesh(new T.PlaneGeometry(0.95, 2.0), label);
      scr.position.z = 0.047; g.add(scr);
      var cam2 = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.02, 16), bodyMat('#0A0A0C'));
      cam2.rotation.x = Math.PI / 2; cam2.position.set(0.32, 0.9, -0.05); g.add(cam2);
    } else if (kind === 'laptop') {
      var base = new T.Mesh(new T.BoxGeometry(2.5, 0.09, 1.65), bodyMat('#8B8F96', { metalness: 0.6, roughness: 0.35 }));
      g.add(base);
      var kb = new T.Mesh(new T.PlaneGeometry(2.2, 1.15), bodyMat('#3A3D42'));
      kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.046, -0.05); g.add(kb);
      var lid = new T.Group();
      var lidBody = new T.Mesh(new T.BoxGeometry(2.5, 1.6, 0.07), bodyMat('#8B8F96', { metalness: 0.6, roughness: 0.35 }));
      lidBody.position.y = 0.8; lid.add(lidBody);
      var scr2 = new T.Mesh(new T.PlaneGeometry(2.3, 1.42), label);
      scr2.position.set(0, 0.8, 0.036); lid.add(scr2);
      lid.position.z = -0.8; lid.rotation.x = -0.28; g.add(lid);
    }
    return normalize(g, 2.3);
  }
  var MOCKUP_KINDS = { bottle: 1, can: 1, mug: 1, frame: 1, phone: 1, laptop: 1 };

  /* ══ GLB DOOR (future real models) ══════════════════════════════════════
     Artist-made .glb files dropped into vendor/models3d/ load through here —
     kind 'glb:<file>' e.g. 'glb:sneaker'. Any mesh in the file named with
     the prefix LD_LABEL wears the design texture. No files shipped yet;
     the loader is vendored (vendor/GLTFLoader.js) and this door is open. */
  var _glbCache = {};
  function ensureGLTF() {
    if (window.THREE && window.THREE.GLTFLoader) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'vendor/GLTFLoader.js';
      s.onload = res; s.onerror = function () { rej(new Error('GLTFLoader failed')); };
      document.head.appendChild(s);
    });
  }
  function loadGLB(name) {
    if (_glbCache[name]) return Promise.resolve(_glbCache[name]);
    return ensureGLTF().then(function () {
      return new Promise(function (res, rej) {
        new window.THREE.GLTFLoader().load('vendor/models3d/' + name + '.glb',
          function (gltf) { _glbCache[name] = gltf.scene; res(gltf.scene); },
          undefined, rej);
      });
    });
  }
  function glbMesh(name, texData) {
    var T = window.THREE;
    var src = _glbCache[name];
    if (!src) return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), bodyMat('#7C3AED'));
    var m = src.clone(true);
    m.traverse(function (n) {
      if (n.isMesh && /^LD_LABEL/i.test(n.name || '') && texData && _texCache[texData]) {
        n.material = labelMat(texData);
      }
    });
    return normalize(m, 2.3);
  }

  function mesh(kind, colorHex, text, texData) {
    if (MOCKUP_KINDS[kind]) return mockupMesh(kind, colorHex, texData);
    if (kind && kind.indexOf('glb:') === 0) return glbMesh(kind.slice(4), texData);
    var T = window.THREE;
    var mat = new T.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.25 });
    var flat = new T.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.25, flatShading: true });
    var g;
    switch (kind) {
      /* ── new kinds (23 Aug 2026, Fable): text, star, lines, structures ── */
      case 'text':
        return normalize(textMesh(text, mat), 4.4);
      case 'star':
        return normalize(new T.Mesh(new T.ExtrudeGeometry(starShape(), {
          depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 }), mat), 2.2);
      case 'arrow3d':
        return normalize(new T.Mesh(new T.ExtrudeGeometry(arrowShape(), {
          depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }), mat), 2.3);
      case 'rod':      /* a straight 3D line / bar */
        g = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 2.6, 24), mat);
        g.rotation.z = Math.PI / 2;
        return normalize(g, 2.5);
      case 'curve': {  /* a swooping 3D line */
        var path = new T.CatmullRomCurve3([
          new T.Vector3(-1.2, -0.5, 0), new T.Vector3(-0.4, 0.55, 0.25),
          new T.Vector3(0.45, -0.45, -0.2), new T.Vector3(1.2, 0.5, 0)]);
        return normalize(new T.Mesh(new T.TubeGeometry(path, 64, 0.09, 16, false), mat), 2.4);
      }
      case 'capsule': /* r128 has no CapsuleGeometry — cylinder + 2 sphere caps */
        g = new T.Group();
        g.add(new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 1.3, 32), mat));
        var c1 = new T.Mesh(new T.SphereGeometry(0.55, 32, 20), mat); c1.position.y = 0.65; g.add(c1);
        var c2 = new T.Mesh(new T.SphereGeometry(0.55, 32, 20), mat); c2.position.y = -0.65; g.add(c2);
        return normalize(g, 2.1);
      case 'dome':
        g = new T.Group();
        g.add(new T.Mesh(new T.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat));
        var cap = new T.Mesh(new T.CircleGeometry(1, 48), mat);
        cap.rotation.x = Math.PI / 2; g.add(cap);
        return normalize(g, 2.1);
      case 'plate':
        return normalize(new T.Mesh(new T.CylinderGeometry(1, 1, 0.14, 64), mat), 2.2);
      case 'arch':
        return normalize(new T.Mesh(new T.TorusGeometry(0.95, 0.3, 24, 64, Math.PI), mat), 2.2);
      case 'cube':     return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), flat);
      case 'box':      return new T.Mesh(new T.BoxGeometry(2, 1.2, 1.2), flat);
      case 'sphere':   return new T.Mesh(new T.SphereGeometry(1.05, 48, 32), mat);
      case 'cylinder': return new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 1.8, 48), mat);
      case 'cone':     return new T.Mesh(new T.ConeGeometry(0.95, 1.9, 48), mat);
      case 'pyramid':  return new T.Mesh(new T.ConeGeometry(1.1, 1.7, 4), flat);
      case 'prism':    return new T.Mesh(new T.CylinderGeometry(1, 1, 1.5, 3), flat);
      case 'ring':     return new T.Mesh(new T.TorusGeometry(0.95, 0.38, 24, 64), mat);
      case 'diamond':  return new T.Mesh(new T.OctahedronGeometry(1.15), flat);
      case 'knot':     return new T.Mesh(new T.TorusKnotGeometry(0.75, 0.26, 128, 20), mat);
      case 'coins':
        g = new T.Group();
        for (var i = 0; i < 4; i++) {
          var c = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.22, 48), mat);
          c.position.y = -0.6 + i * 0.26;
          c.position.x = (i % 2 ? 0.06 : -0.04);
          g.add(c);
        }
        return g;
      case 'bars':
        g = new T.Group();
        [[-0.8, 0.8], [0, 1.4], [0.8, 2.0]].forEach(function (b) {
          var m = new T.Mesh(new T.BoxGeometry(0.55, b[1], 0.55), flat);
          m.position.set(b[0], b[1] / 2 - 1, 0);
          g.add(m);
        });
        return g;
      default:         return new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), flat);
    }
  }

  function render3D(kind, colorHex, rx, ry, text, quat, texData) {
    var T = window.THREE;
    /* words are wide — give text a 2:1 frame so it isn't letterboxed tiny */
    var isText = kind === 'text';
    var W = isText ? 1024 : 512, H = 512;
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(35, W / H, 0.1, 50);
    cam.position.set(0, 0, isText ? 5.8 : 5.2);
    scene.add(new T.AmbientLight(0xffffff, 0.55));
    var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(3, 4, 5); scene.add(key);
    var rim = new T.DirectionalLight(0x8b7cf3, 0.35); rim.position.set(-4, -2, -3); scene.add(rim);
    var m = mesh(kind, colorHex, text, texData);
    /* 23 Aug 2026 (Fable) — FREE trackball rotation. A quaternion (quat)
       is the object's full 3D orientation; it never gimbal-locks, so the
       object tumbles freely like PowerPoint's 3D models. Old saved objects
       that only carry rotX/rotY still render via the Euler fallback. */
    if (quat && quat.length === 4) m.quaternion.fromArray(quat);
    else { m.rotation.x = rx || 0; m.rotation.y = ry || 0; }
    scene.add(m);
    var r = renderer();
    r.setSize(W, H);
    r.render(scene, cam);
    return r.domElement.toDataURL('image/png');
  }
  /* start-quaternion from the old pleasant Euler angle */
  function quatFromEuler(rx, ry) {
    var T = window.THREE;
    return new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0)).toArray();
  }
  /* ── TRUE ARCBALL (23 Aug 2026, Fable — the PowerPoint feel) ────────────
     The object is a glass ball under the cursor. Each cursor position maps
     to a point on that ball's surface; the rotation is the turn that carries
     the grab-point to the current point. Drag through the middle → tumble;
     drag around the RIM → the object ROLLS like clock hands. All three axes,
     no gimbal, exactly the PPT 3D-model behaviour. */
  function arcVec(px, py, cx, cy, R) {
    var T = window.THREE;
    var x = (px - cx) / R, y = -(py - cy) / R;
    var d2 = x * x + y * y;
    if (d2 > 1) { var s = 1 / Math.sqrt(d2); return new T.Vector3(x * s, y * s, 0); }
    return new T.Vector3(x, y, Math.sqrt(1 - d2));
  }
  function quatArcball(prev, x0, y0, x1, y1, cx, cy, R) {
    var T = window.THREE;
    var v0 = arcVec(x0, y0, cx, cy, R), v1 = arcVec(x1, y1, cx, cy, R);
    var qd = new T.Quaternion().setFromUnitVectors(v0, v1);
    /* double the arc angle — the classic arcball trick that makes one full
       drag across the ball turn the object a full half-revolution */
    qd.multiply(qd.clone());
    return qd.multiply(new T.Quaternion().fromArray(prev)).toArray();
  }

  function toast(m) { if (window.Editor && Editor._toast) Editor._toast(m); }

  /* ── insert: a fabric.Image that carries its 3D soul ── */
  Editor._register({
    insert3D: function (a) {
      if (!a || !a.kind) return;
      var color = a.color || '#7C3AED';
      var pre = a.kind === 'text'
        ? Promise.all([ensureThree(), ensureFont3D()])
        : ensureThree();
      pre.then(function () {
        var rx = a.kind === 'text' ? -0.12 : -0.35;   /* text: nearly face-on */
        var ry = a.kind === 'text' ?  0.22 :  0.65;
        var q0 = quatFromEuler(rx, ry);
        var url = render3D(a.kind, color, rx, ry, a.text, q0);
        fabric.Image.fromURL(url, function (img) {
          img.scaleToWidth(a.kind === 'text' ? 420 : 240);
          img.set({
            left: 220, top: 130,
            is3D: true, threeKind: a.kind, threeColor: color,
            threeText: a.text || '',
            threeQuat: q0,
            rotX: rx, rotY: ry,
            layerName: (a.kind === 'text' ? '3D text: ' + (a.text || '') : (a.name || '3D object'))
          });
          fc.add(img).setActiveObject(img);
          fc.renderAll(); saveState();
          toast((a.name || '3D object') + ' added — hold Alt and drag to rotate it in 3D');
        });
      }).catch(function () { toast('3D engine could not load — check your connection'); });
    },
    /* 23 Aug 2026 (Fable) — 3D TEXT: ask for the word, then extrude it.
       Any letters A-Z a-z, digits 0-9 and punctuation the font knows. */
    insert3DText: async function (a) {
      var txt = (a && a.text) || await window.ldPrompt('Your 3D text:', 'HELLO');
      txt = String(txt || '').trim();
      if (!txt) return;
      if (txt.length > 24) { txt = txt.slice(0, 24); toast('3D text is limited to 24 characters'); }
      Editor.run('insert3D', { kind: 'text', text: txt, color: (a && a.color) || '#7C3AED', name: '3D text' });
    },
    /* 23 Aug 2026 (Fable) — 3D MOCKUP: photograph the CURRENT SLIDE and wear
       it as the label/screen of a real-world object. The snapshot travels
       with the object, so it survives save/reopen. */
    insertMockup3D: function (a) {
      if (!a || !MOCKUP_KINDS[a.kind]) return;
      ensureThree().then(function () {
        /* snapshot the current slide at label resolution (1024 wide) */
        captureCurrentPage();
        var page = state.pages[state.currentPage] || {};
        var W = (fc._baseWidth || 1920), H = (fc._baseHeight || 1080);
        var sc = new fabric.StaticCanvas(null, { width: W, height: H });
        sc._baseWidth = W; sc._baseHeight = H;
        var done = function () {
          sc.renderAll();
          var texData = sc.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 1024 / W });
          try { sc.dispose(); } catch (e) {}
          warmTexture(texData).then(function () {
            var rx = -0.12, ry = 0.45;
            var q0 = quatFromEuler(rx, ry);
            var url = render3D(a.kind, a.color || '#12A5A0', rx, ry, null, q0, texData);
            fabric.Image.fromURL(url, function (img) {
              img.scaleToWidth(300);
              img.set({
                left: 220, top: 110,
                is3D: true, threeKind: a.kind, threeColor: a.color || '#12A5A0',
                threeTexData: texData, threeQuat: q0,
                layerName: (a.name || 'Mockup') + ' (this slide as label)'
              });
              fc.add(img).setActiveObject(img);
              fc.renderAll(); saveState();
              toast((a.name || 'Mockup') + ' added wearing this slide — Alt+drag to rotate');
            });
          });
        };
        if (page.canvasJSON) sc.loadFromJSON(page.canvasJSON, done);
        else done();
      }).catch(function () { toast('3D engine could not load — check your connection'); });
    }
  });

  /* ── live rotation: Alt+drag on a selected 3D object ── */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!window.fc || !fc.on) return;
      var rot = null, pending = false;
      /* ── FREE 3D MODE (23 Aug 2026, Fable) — the Pacdora feel ──────────
         Double-click a 3D object: the selection box disappears and BARE
         drag rotates it freely (no Alt needed). Click anywhere else, or
         press Esc, to finish. Alt+drag still works anytime as a shortcut.
         The flat 2D spinner handle is hidden on 3D objects — it only
         confused: it turns the baked picture, not the 3D. */
      var freeObj = null;
      function enterFree(o) {
        if (freeObj === o) return;   /* already free — never re-capture the
          hidden box as the "previous" state (that ate the box for good) */
        freeObj = o;
        o._ldPrevBorders = o.hasBorders; o._ldPrevControls = o.hasControls;
        o.hasBorders = false; o.hasControls = false;
        o.lockMovementX = true; o.lockMovementY = true;
        fc.defaultCursor = 'grab'; fc.hoverCursor = 'grab';
        fc.renderAll();
        toast('3D rotate — drag to spin freely; click outside or press Esc to finish');
      }
      function exitFree() {
        if (!freeObj) return;
        var o = freeObj; freeObj = null;
        o.hasBorders = o._ldPrevBorders !== false;
        o.hasControls = o._ldPrevControls !== false;
        o.lockMovementX = false; o.lockMovementY = false;
        fc.defaultCursor = 'default'; fc.hoverCursor = 'move';
        fc.renderAll(); saveState();
      }
      /* double-click is a SWITCH: box off → free rotate; box back on → resize */
      fc.on('mouse:dblclick', function (opt) {
        var o = opt && opt.target;
        if (!o || !o.is3D) return;
        if (freeObj === o) { exitFree(); fc.setActiveObject(o); fc.renderAll(); return; }
        if (freeObj) exitFree();
        enterFree(o);
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') exitFree(); });
      /* hide the 2D spinner stalk whenever a 3D object is selected */
      function hideSpinner(opt) {
        var sel = (opt && opt.selected) || [];
        sel.forEach(function (o) {
          if (o.is3D && o.setControlsVisibility) o.setControlsVisibility({ mtr: false });
        });
      }
      fc.on('selection:created', hideSpinner);
      fc.on('selection:updated', hideSpinner);
      fc.on('mouse:down', function (opt) {
        var o = opt && opt.target, e = opt && opt.e;
        /* clicking anything that isn't the free-mode object ends free mode */
        if (freeObj && o !== freeObj) { exitFree(); }
        var free = freeObj && o === freeObj;
        if (!o || !o.is3D || !e || (!e.altKey && !free)) return;
        /* legacy objects saved before the trackball upgrade only have
           rotX/rotY — convert once so they keep their pose, then tumble free */
        var q0 = (o.threeQuat && o.threeQuat.length === 4)
          ? o.threeQuat
          : (window.THREE ? quatFromEuler(o.rotX, o.rotY) : null);
        /* a mockup reopened from a saved deck needs its label re-warmed */
        if (o.threeTexData && !_texCache[o.threeTexData]) warmTexture(o.threeTexData);
        /* arcball centre = the OBJECT's centre on screen; ball radius = the
           object's visible size, so the rim (the roll zone) is its edge */
        var cx = e.clientX, cy = e.clientY, R = 150;
        try {
          var br = o.getBoundingRect();
          var el2 = fc.upperCanvasEl.getBoundingClientRect();
          cx = el2.left + br.left + br.width / 2;
          cy = el2.top + br.top + br.height / 2;
          R = Math.max(80, Math.max(br.width, br.height) / 2);
        } catch (err) {}
        rot = { o: o, x: e.clientX, y: e.clientY, q: q0, cx: cx, cy: cy, R: R };
        o.lockMovementX = true; o.lockMovementY = true;
      });
      fc.on('mouse:move', function (opt) {
        if (!rot || !opt.e || !window.THREE) return;
        var o = rot.o;
        o.threeQuat = quatArcball(rot.q || quatFromEuler(o.rotX, o.rotY),
                                  rot.x, rot.y, opt.e.clientX, opt.e.clientY,
                                  rot.cx, rot.cy, rot.R);
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (!window.THREE) return;
          var url = render3D(o.threeKind, o.threeColor, o.rotX, o.rotY, o.threeText, o.threeQuat, o.threeTexData);
          o.setSrc(url, function () { fc.renderAll(); });
        });
      });
      function endRot() {
        if (!rot) return;
        var o = rot.o;
        /* stay locked while free 3D mode is on — dragging must keep rotating,
           not start moving the object across the slide */
        if (freeObj !== o) { o.lockMovementX = false; o.lockMovementY = false; }
        rot = null;
        saveState();
      }
      fc.on('mouse:up', endRot);
      document.addEventListener('keyup', function (e) { if (e.key === 'Alt') endRot(); });
    }, 900);
  });
})();



/* ═════════ desktop app bridge (20 Aug 2026, Fable) ═════════
   Present ONLY inside the LazyDog desktop app, where preload.js exposes
   window.lazydogDesktop. File menu → save/open the deck as a local .lazydog
   file (the deck IR as JSON — the exact object the editor already speaks).
   Works fully OFFLINE: no cloud call anywhere on this path.
   On the website this whole block is a silent no-op. */
(function () {
  if (!window.lazydogDesktop || !window.lazydogDesktop.onMenu) return;
  window.lazydogDesktop.onMenu(async function (cmd) {
    try {
      if (cmd === 'save') {
        var deck = await buildEffectiveDeckIR();
        var name = (deck && (deck.deck || deck.name)) || 'design';
        var p = await window.lazydogDesktop.saveProject(
          JSON.stringify(deck), String(name).replace(/[^\w\- ]+/g, '').trim() || 'design');
        if (p) showToast('Project saved ✓ ' + p, 5000);
      } else if (cmd === 'open') {
        var r = await window.lazydogDesktop.openProject();
        if (!r) return;
        var d = JSON.parse(r.json);
        await window.loadDeckIRIntoEditor(d.deck || d);   /* accept both shapes */
      }
    } catch (e) { showToast('Project file error: ' + e.message, 6000); }
  });
})();

/* ═════════ STASHED-FILL BRIDGE (22 Aug 2026, Javed's order) ═════════
   Bug found: the "Want us to fill this deck with YOUR content?" card
   (fill_widget.js) saves the buyer's content+design into
   localStorage['lazydog_fill_material'] (and, for a locally dropped .pptx,
   the file itself into IndexedDB db 'lazydog' / store 'files' / key
   'deck_pptx'), then sends the visitor to editor.html expecting the editor
   to pick it up and run the fill. NOTHING in the editor ever read either of
   those back — the editor opened clean and nothing happened, which is
   exactly the "took me to editor but never prepared any deck" bug. This
   block is that missing read, run once on load. */
(function () {
  function idbGetDeckBlob() {
    return new Promise(function (resolve) {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      try {
        var req = indexedDB.open('lazydog', 1);
        req.onupgradeneeded = function () { try { req.result.createObjectStore('files'); } catch (e) {} };
        req.onsuccess = function () {
          try {
            var tx = req.result.transaction('files', 'readonly');
            var g = tx.objectStore('files').get('deck_pptx');
            g.onsuccess = function () { resolve(g.result || null); };
            g.onerror = function () { resolve(null); };
          } catch (e) { resolve(null); }
        };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function waitForEditorReady() {
    return new Promise(function (resolve) {
      (function poll() {
        if (typeof window.loadDeckIRIntoEditor === 'function' && typeof window.ldImportPptxFile === 'function' && typeof window.buildEffectiveDeckIR === 'function')
          resolve();
        else setTimeout(poll, 200);
      })();
    });
  }

  async function runStashedFill() {
    var raw;
    try { raw = localStorage.getItem('lazydog_fill_material'); } catch (e) { return; }
    if (!raw) return;
    try { localStorage.removeItem('lazydog_fill_material'); } catch (e) {}   /* consume once — never re-fires on a later visit */
    var material;
    try { material = JSON.parse(raw); } catch (e) { return; }
    if (!material || !material.content || !material.mode || material.mode === 'content') return;   /* content-only has its own free flow on the card */

    await waitForEditorReady();
    try { busy(true, 'Opening your design…'); } catch (e) {}

    try {
      if (material.mode === 'file') {
        var blob = await idbGetDeckBlob();
        if (!blob) { showToast('Could not find the design file you dropped — please try again from the card.', 8000); return; }
        await window.ldImportPptxFile(blob);
      } else if (material.mode === 'site-design') {
        if (!material.pptxUrl) { showToast('This design has no editable file on file — try a different one.', 8000); return; }
        var fr = await fetch(material.pptxUrl);
        if (!fr.ok) throw new Error('Could not fetch the design file (' + fr.status + ')');
        var fblob = await fr.blob();
        await window.ldImportPptxFile(fblob);
      } else {
        return;
      }

      busy(true, 'Writing your slides — Hexa + the writers are on it…');
      var deckIR = await buildEffectiveDeckIR();
      var r = await fetch(window.LD_FILL_URL, {
        method: 'POST', headers: window.ldHeaders('application/json'),
        body: JSON.stringify({ design: deckIR, content: material.content, brand: material.brand || '', qa: true,
                                allowClone: !!material.allowClone, expand: material.extraSlides || 0 })
      });
      if (!r.ok) {
        var errBody = {}; try { errBody = (await r.json()) || {}; } catch (e2) {}
        showToast('Could not prepare the deck: ' + (errBody.message || errBody.error || ('HTTP ' + r.status)), 8000);
        return;
      }
      var fd = await r.json();
      await window.loadDeckIRIntoEditor(fd.deck || fd);
      if (window.ldRefreshTokens) window.ldRefreshTokens();
      showToast('Presentation ready ✓');
    } catch (e) {
      showToast('Prepare failed: ' + e.message, 8000);
    } finally {
      try { busy(false); } catch (e) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runStashedFill);
  else runStashedFill();
})();
