/* LAZYDOG SHARED RENDERER — drawing core used by BOTH the public editor
 * (website/editor.html) and the private lab (bridge/editor_test.html).
 * PUBLIC file: contains NO parser, NO writer, NO Section 11 / codec logic.
 * Edit HERE once — both faces pick it up. Version with ?v=NN on the site. */

function makeBlankPage(id) {
  return { id: id, ir: null, canvasJSON: null, thumb: null, history: [], historyIndex: -1 };
}

function scissorPanelContent() {
  return '<div style="padding:8px 4px;font-size:13px;line-height:1.7;color:var(--text-secondary)">' +
    '<button id="sciss-go" style="width:100%;padding:11px 0;margin:0 0 12px;background:var(--accent);color:#fff;border-radius:8px;font-weight:700;font-size:14px;">✂ Cut / Punch selected</button>' +
    '<b style="color:var(--text-primary)">Cookie-cutter (easiest)</b><br>' +
    '1. Place any shape from <b>Elements</b> on top of the element<br>' +
    '2. Keep the shape selected, press the button above — it punches through<br>' +
    '3. Drag the cut piece out; delete the shape when done<br><br>' +
    '<b style="color:var(--text-primary)">Freehand dots</b><br>' +
    '1. Select the element itself (nothing on top of it)<br>' +
    '2. Press the button above to start placing dots<br>' +
    '3. Click to place dots around the part you want to cut — any direction, any shape<br>' +
    '4. Click the <span style="color:#E8590C;font-weight:600">first (orange) dot</span> again to close the loop and CUT<br>' +
    '5. You get 2 pieces: the patch and the rest — move or delete either<br><br>' +
    '<button id="sciss-cut-btn" style="width:100%;padding:9px 0;margin:2px 0 10px;background:var(--accent);color:#fff;border-radius:8px;font-weight:600;font-size:13px;">✂ Cut now</button>' +
    'Or: double-click, press Enter, or click the first dot. Esc cancels.<br><br>To trim overflow at the slide border instead, right-click an element → <b>Trim to slide</b>.</div>';
}

function genericPanelContent(toolId, toolLabel) {
  const icons = {
    draw: 'gesture', photos: 'image',
    videos: 'videocam', audio: 'music_note', backgrounds: 'wallpaper',
    charts: 'bar_chart', apps: 'apps', extras: 'more_horiz',
    crop: 'crop', flip: 'flip', magic: 'auto_fix_high',
    filters: 'filter', adjust: 'tune', effects: 'blur_on',
  };
  const descriptions = {
    draw: 'Use freehand drawing tools to sketch, annotate, or illustrate directly on your canvas.',
    photos: 'Browse and add high-quality stock photos to enhance your design.',
    videos: 'Add video clips and embed media to create dynamic presentations.',
    audio: 'Add background music, sound effects, or narration to your presentation.',
    backgrounds: 'Choose from solid colors, gradients, and patterns for your slide background.',
    charts: 'Create data visualizations including bar, line, pie, and donut charts.',
    apps: 'Extend your design capabilities with integrated third-party applications.',
    extras: 'Explore additional creative tools, premium content, and advanced features.',
    crop: 'Crop your design to specific dimensions or aspect ratios.',
    flip: 'Flip your design or selected elements horizontally or vertically.',
    magic: 'Automatically enhance and transform your design with AI-powered tools.',
    filters: 'Apply visual filters to change the mood and tone of your design.',
    adjust: 'Fine-tune brightness, contrast, saturation, and other image properties.',
    effects: 'Add blur, shadow, glow, and other special effects to elements.',
  };
  return `<div class="panel-placeholder">
    <span class="material-icons-outlined">${icons[toolId] || 'widgets'}</span>
    <p><strong>${toolLabel}</strong><br>${descriptions[toolId] || 'Explore this feature to enhance your design.'}</p>
  </div>`;
}

function showToast(message, duration = 2500) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function renderSidebarTools() {
  const tools = state.mode === 'design' ? designTools : editingTools;
  dom.sidebarRail.innerHTML = tools.map(t =>
    `<button class="tool-btn${state.activeTool === t.id ? ' active' : ''}" data-tool="${t.id}" aria-label="${t.label}" title="${t.label}">
      <span class="material-icons-outlined">${t.icon}</span>
      <span class="tool-label">${t.label}</span>
    </button>`
  ).join('');
}

function selectTool(toolId) {
  const wasActive = state.activeTool === toolId;
  state.activeTool = wasActive ? null : toolId;

  // Update active states on buttons
  $$('.tool-btn', dom.sidebarRail).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === state.activeTool);
  });

  // Update panel
  if (state.activeTool) {
    openPanel(state.activeTool);
  } else {
    closePanel();
  }

  if (state.activeTool !== 'scissor') stopScissorMode(false);
}

var fc = null, _clip = null;

function openMediaPlayer(src, kind) {
  var old = document.getElementById('lzd-media-pop');
  if (old) old.remove();
  var pop = document.createElement('div');
  pop.id = 'lzd-media-pop';
  pop.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;background:#111;padding:14px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);';
  var m = document.createElement(kind === 'audio' ? 'audio' : 'video');
  m.src = src; m.controls = true; m.autoplay = true;
  if (kind !== 'audio') { m.style.maxWidth = '70vw'; m.style.maxHeight = '60vh'; }
  var x = document.createElement('button');
  x.textContent = '✕ close';
  x.style.cssText = 'display:block;margin:10px auto 0;color:#fff;background:#333;border-radius:6px;padding:6px 16px;font-size:13px;';
  x.onclick = function () { m.pause(); pop.remove(); };
  pop.appendChild(m); pop.appendChild(x);
  document.body.appendChild(pop);
}

var _dbgRects = null;

function debugBounds() {
  if (!fc) return;
  if (_dbgRects) { _dbgRects.forEach(function(r){ fc.remove(r); }); _dbgRects = null; fc.renderAll(); showToast('X-ray off'); return; }
  _dbgRects = [];
  var report = [];
  fc.getObjects().slice().forEach(function(o, i) {
    var b = o.getBoundingRect(true, true);
    var r = new fabric.Rect({ left: b.left, top: b.top, width: b.width, height: b.height, fill: '', stroke: 'rgba(255,0,0,0.95)', strokeWidth: 1.5, strokeDashArray: [4,3], selectable: false, evented: false });
    _dbgRects.push(r); fc.add(r);
    report.push({ i: i, type: o.type, irId: o.irId || '', x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), fill: (typeof o.fill === 'string' ? o.fill : (o.fill ? 'gradient' : '')), stroke: o.stroke || '' });
  });
  try { console.table(report); } catch (e) { console.log(report); }
  fc.renderAll();
  showToast('X-ray ON — red boxes = object bounds (see console)');
}

function initFabric() {
  /* 1920 logical resolution + forced 2x supersampling: the canvas backing
     store renders at double density and downscales to CSS size — kills the
     "milky fog" of plain-density canvas rendering. */
  fabric.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1);
  fc = new fabric.Canvas('canvas', { width: 1920, height: 1080, backgroundColor: '#ffffff', enableRetinaScaling: true, preserveObjectStacking: true }); /* selected objects keep their layer — default fabric painted the selection on TOP, so clicking the full-bleed background hid every element behind it */
  fc._baseWidth = 1920;
  fc._baseHeight = 1080;
  /* ── SLIDE-EDGE SCISSOR (31 Jul 2026, owner rule) ─────────────────────────
     PowerPoint clips every shape at the slide boundary — bleed designs show
     CUT at the edge, never spilling past the canvas. Fabric draws full object
     extents, so imported bleed elements leaked outside the slide. The clip is
     set HERE at creation and RE-ASSERTED after every loadFromJSON, because
     loadFromJSON resets canvas properties (page switch, undo, project open)
     and silently wiped a clip that was only set once at import time. */
  function __ldSlideClip() {
    return new fabric.Rect({ left: 0, top: 0,
      width: fc._baseWidth, height: fc._baseHeight,
      selectable: false, evented: false });
  }
  fc.__ldSlideClip = __ldSlideClip;
  fc.clipPath = __ldSlideClip();
  console.log('[LD renderer] SCISSOR-V2 ACTIVE — canvas clip installed at creation');
  var __ldLFJ = fc.loadFromJSON.bind(fc);
  fc.loadFromJSON = function (json, callback, reviver) {
    return __ldLFJ(json, function () {
      fc.clipPath = __ldSlideClip();
      if (callback) callback.apply(this, arguments);
    }, reviver);
  };
  fc._pxPerPt = 2; /* blank 1920px canvas = 960pt slide; import overwrites with true scale */
  fc.on('object:modified', function(){ saveState(); });
  fc.on('object:added', function(){ saveState(); });
  fc.on('object:moving', _reflFollow);
  fc.on('object:scaling', _reflFollow);
  fc.on('object:modified', _reflFollow);
  fc.on('object:modified', _glowRegen);
  fc.on('selection:created', _chartSelHook);
  fc.on('selection:updated', _chartSelHook);
  fc.on('object:modified', _chartBarModified);
  fc.on('text:editing:exited', _chartTitleEdited);
  fc.on('mouse:dblclick', function (opt) {
    var t = opt.target;
    if (t && t.mediaSrc) { openMediaPlayer(t.mediaSrc, t.mediaKind || 'video'); return; }
    /* PPT opens the embedded workbook in Excel on double-click; our
       equivalent is an IN-APP worksheet editor over the same data */
    if (t && t.irTable && window._oleWb && window._oleWb[t.irTable]) {
      if (opt.e && opt.e.altKey) openWorkbookEditor(t.irTable);           /* Alt+dblclick: quick in-app sheet */
      else if (window.showDirectoryPicker || window.showSaveFilePicker) bridgeToExcel(t.irTable); /* PPT-style: straight to Excel bridge */
      else openWorkbookEditor(t.irTable);
      return;
    }
    /* generic OLE (Word, Publisher, Visio, ...) -> same bridge, native app */
    if (t && t.irId && window._oleDoc && window._oleDoc[t.irId]) bridgeOleDoc(t.irId);
  });
  fc.on('mouse:down', function (opt) {
    var t = opt.target;
    if (t && t.mediaSrc) {
      if (opt.e && opt.e.detail >= 2) { openMediaPlayer(t.mediaSrc, t.mediaKind || 'video'); }
      else showToast('Media object — double-click to play');
    }
  });
}

var _sciss = null;

function goScissor() {
  if (!fc) return;
  var o = fc.getActiveObject();
  if (!o) { showToast('Select the cutter shape (or the element itself) first'); return; }
  if (_sciss) { stopScissorMode(false); }
  var ob = o.getBoundingRect(true, true);
  var under = null, objs = fc.getObjects();
  for (var i = objs.length - 1; i >= 0; i--) {
    var t = objs[i];
    if (t === o || t.isBg || !t.visible) continue;
    var tb = t.getBoundingRect(true, true);
    /* never auto-punch a near-full-slide image (unflagged backgrounds):
       cutting the backdrop produces an invisible camouflage patch */
    if (tb.width > fc._baseWidth * 0.8 && tb.height > fc._baseHeight * 0.8) continue;
    var ix = Math.max(ob.left, tb.left), iy = Math.max(ob.top, tb.top);
    var ix2 = Math.min(ob.left + ob.width, tb.left + tb.width), iy2 = Math.min(ob.top + ob.height, tb.top + tb.height);
    if (ix2 - ix > 4 && iy2 - iy > 4) { under = t; break; }
  }
  if (under) { performPunchCut(o, under); return; }
  showToast('No element under the shape — starting dot mode on the selection instead');
  startScissorMode(o);
}

function startScissorMode(o) {
  if (!fc || !o) return;
  _sciss = { target: o, pts: [], dots: [], line: null };
  fc.discardActiveObject();
  fc.selection = false;
  fc.forEachObject(function (ob) { ob.__sciSel = ob.selectable; ob.selectable = false; ob.evented = false; });
  fc.defaultCursor = 'crosshair';
  fc.on('mouse:down', scissorClick);
  fc.on('mouse:dblclick', scissorDbl);
  fc.renderAll();
  showToast('Scissor: place dots around the part — double-click / Enter / first dot / Cut-now button to cut. Esc cancels');
}

function stopScissorMode(done) {
  if (!_sciss || !fc) { _sciss = null; return; }
  fc.off('mouse:down', scissorClick);
  fc.off('mouse:dblclick', scissorDbl);
  _sciss.dots.forEach(function (d) { fc.remove(d); });
  if (_sciss.line) fc.remove(_sciss.line);
  fc.forEachObject(function (ob) { if (ob.__sciSel !== undefined) { ob.selectable = ob.__sciSel; ob.evented = ob.__sciSel; delete ob.__sciSel; } });
  fc.selection = true;
  fc.defaultCursor = 'default';
  fc.renderAll();
  _sciss = null;
  if (!done) showToast('Scissor cancelled');
}

function scissorClick(opt) {
  if (!_sciss) return;
  var p = fc.getPointer(opt.e);
  var pts = _sciss.pts;
  if (pts.length >= 3) {
    var d0 = Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
    if (d0 < 30 / fc.getZoom()) { performScissorCut(); return; } /* generous snap-to-close */
  }
  pts.push({ x: p.x, y: p.y });
  var r0 = pts.length === 1 ? 9 : 5; /* big first dot = easy close target */
  var dot = new fabric.Circle({ left: p.x - r0, top: p.y - r0, radius: r0, fill: pts.length === 1 ? '#E8590C' : '#7C3AED', stroke: '#fff', strokeWidth: 1.5, selectable: false, evented: false });
  _sciss.dots.push(dot);
  fc.add(dot);
  if (_sciss.line) fc.remove(_sciss.line);
  if (pts.length > 1) {
    _sciss.line = new fabric.Polyline(pts.map(function (q) { return { x: q.x, y: q.y }; }), { fill: '', stroke: '#7C3AED', strokeWidth: 1.5, strokeDashArray: [6, 4], selectable: false, evented: false });
    fc.add(_sciss.line);
  }
  fc.renderAll();
}

function performPunchCut(cutter, target) {
  try {
    var W = fc._baseWidth, H = fc._baseHeight, M = 2;
    target.clone(function (tc) {
      cutter.clone(function (cc) {
        var tt = new fabric.StaticCanvas(null, { width: W * M, height: H * M }); tt.setZoom(M); tt.add(tc); tt.renderAll();
        /* silhouette of the cutter: solid fill (covers stroke-only shapes) */
        function solidify(s) { try { s.set({ fill: '#000', stroke: '#000', opacity: 1 }); } catch (e) {} }
        if (cc.forEachObject) cc.forEachObject(solidify);
        solidify(cc);
        var mm = new fabric.StaticCanvas(null, { width: W * M, height: H * M }); mm.setZoom(M); mm.add(cc); mm.renderAll();
        var b = target.getBoundingRect(true, true), cb = cutter.getBoundingRect(true, true);
        var px = Math.max(b.left, cb.left), py = Math.max(b.top, cb.top);
        var px2 = Math.min(b.left + b.width, cb.left + cb.width), py2 = Math.min(b.top + b.height, cb.top + cb.height);
        if (px2 - px < 2 || py2 - py < 2) { showToast('The shape must sit ON the element you want to cut'); return; }
        var c1 = document.createElement('canvas'); c1.width = Math.ceil((px2 - px) * M); c1.height = Math.ceil((py2 - py) * M);
        var x1 = c1.getContext('2d');
        x1.drawImage(tt.lowerCanvasEl, -px * M, -py * M);
        x1.globalCompositeOperation = 'destination-in';
        x1.drawImage(mm.lowerCanvasEl, -px * M, -py * M);
        var c2 = document.createElement('canvas'); c2.width = Math.ceil(b.width * M); c2.height = Math.ceil(b.height * M);
        var x2 = c2.getContext('2d');
        x2.drawImage(tt.lowerCanvasEl, -b.left * M, -b.top * M);
        x2.globalCompositeOperation = 'destination-out';
        x2.drawImage(mm.lowerCanvasEl, -b.left * M, -b.top * M);
        tt.dispose(); mm.dispose();
        fabric.Image.fromURL(c2.toDataURL('image/png'), function (rest) {
          rest.set({ left: b.left, top: b.top, scaleX: 1 / M, scaleY: 1 / M });
          fabric.Image.fromURL(c1.toDataURL('image/png'), function (piece) {
            /* jump the piece aside so the cut is VISIBLE immediately —
               left in place it perfectly camouflages the hole it came from */
            piece.set({ left: px + 30, top: py + 30, scaleX: 1 / M, scaleY: 1 / M });
            fc.remove(target);
            fc.add(rest); fc.add(piece);
            fc.remove(cutter); /* the cutter's job is done */
            fc.setActiveObject(piece);
            fc.renderAll(); saveState();
            showToast('Punched! The piece jumped aside — the hole is behind it');
          });
        });
      }, FABRIC_JSON_PROPS);
    }, FABRIC_JSON_PROPS);
  } catch (err) { showToast('Punch failed: ' + err.message); }
}

function scissorDbl() { if (_sciss && _sciss.pts.length >= 3) performScissorCut(); }

function performScissorCut() {
  try {
  var S = _sciss, o = S.target, pts = S.pts.slice();
  var W = fc._baseWidth, H = fc._baseHeight, M = 2; /* 2x for sharpness */
  o.clone(function (c) {
    var tmp = new fabric.StaticCanvas(null, { width: W * M, height: H * M });
    tmp.setZoom(M);
    tmp.add(c); tmp.renderAll();
    var src = tmp.lowerCanvasEl;
    var b = o.getBoundingRect(true, true);
    /* polygon bbox clamped to the object's bounds */
    var px = Math.max(b.left, Math.min.apply(null, pts.map(function(q){return q.x;})));
    var py = Math.max(b.top, Math.min.apply(null, pts.map(function(q){return q.y;})));
    var px2 = Math.min(b.left + b.width, Math.max.apply(null, pts.map(function(q){return q.x;})));
    var py2 = Math.min(b.top + b.height, Math.max.apply(null, pts.map(function(q){return q.y;})));
    if (px2 - px < 2 || py2 - py < 2) { stopScissorMode(false); showToast('Cut area does not touch the element'); return; }
    function poly(ctx, ox, oy) {
      ctx.beginPath();
      ctx.moveTo((pts[0].x - ox) * M, (pts[0].y - oy) * M);
      for (var i = 1; i < pts.length; i++) ctx.lineTo((pts[i].x - ox) * M, (pts[i].y - oy) * M);
      ctx.closePath();
    }
    /* piece INSIDE the loop */
    var c1 = document.createElement('canvas'); c1.width = Math.ceil((px2 - px) * M); c1.height = Math.ceil((py2 - py) * M);
    var x1 = c1.getContext('2d');
    x1.save(); poly(x1, px, py); x1.clip();
    x1.drawImage(src, -px * M, -py * M);
    x1.restore();
    /* remainder with the hole */
    var c2 = document.createElement('canvas'); c2.width = Math.ceil(b.width * M); c2.height = Math.ceil(b.height * M);
    var x2 = c2.getContext('2d');
    x2.drawImage(src, -b.left * M, -b.top * M);
    x2.globalCompositeOperation = 'destination-out';
    poly(x2, b.left, b.top); x2.fill();
    tmp.dispose();
    var placed = 0;
    fabric.Image.fromURL(c2.toDataURL('image/png'), function (imgRest) {
      imgRest.set({ left: b.left, top: b.top, scaleX: 1 / M, scaleY: 1 / M });
      fabric.Image.fromURL(c1.toDataURL('image/png'), function (imgPiece) {
        imgPiece.set({ left: px, top: py, scaleX: 1 / M, scaleY: 1 / M });
        fc.remove(o);
        fc.add(imgRest); fc.add(imgPiece);
        stopScissorMode(true);
        fc.setActiveObject(imgPiece);
        fc.renderAll();
        saveState();
        showToast('Cut into 2 pieces — the patch is selected');
      });
    });
  }, FABRIC_JSON_PROPS);
  } catch (err) { stopScissorMode(false); showToast('Cut failed: ' + err.message); }
}

function ctxTrimToSlide() {
  var o = fc && fc.getActiveObject();
  if (!o) { showToast('Select an element first'); return; }
  var W = fc._baseWidth || fc.getWidth() / fc.getZoom();
  var H = fc._baseHeight || fc.getHeight() / fc.getZoom();
  var b = o.getBoundingRect(true, true); /* scene coords, ignore viewport */
  var ix = Math.max(0, b.left), iy = Math.max(0, b.top);
  var ix2 = Math.min(W, b.left + b.width), iy2 = Math.min(H, b.top + b.height);
  if (ix2 - ix <= 1 || iy2 - iy <= 1) { fc.remove(o); fc.discardActiveObject(); fc.renderAll(); saveState(); showToast('Element was fully outside — removed'); return; }
  if (b.left >= -0.5 && b.top >= -0.5 && b.left + b.width <= W + 0.5 && b.top + b.height <= H + 0.5) { showToast('Nothing hangs outside the slide'); return; }
  o.clone(function (c) {
    var tmp = new fabric.StaticCanvas(null, { width: W, height: H });
    tmp.add(c);
    tmp.renderAll();
    var mult = 2; /* keep retina sharpness on the cut piece */
    var url = tmp.toDataURL({ left: ix, top: iy, width: ix2 - ix, height: iy2 - iy, multiplier: mult, format: 'png' });
    tmp.dispose();
    fabric.Image.fromURL(url, function (img) {
      img.set({ left: ix, top: iy, scaleX: 1 / mult, scaleY: 1 / mult, irOrigin: o.irOrigin });
      fc.remove(o);
      fc.add(img);
      fc.setActiveObject(img);
      fc.renderAll();
      saveState();
      showToast('Trimmed along the slide border');
    });
  }, FABRIC_JSON_PROPS);
}

function ctxCopy()      { fc && fc.getActiveObject() && fc.getActiveObject().clone(function(c){ _clip=c; showToast('Copied'); }); }

function ctxPaste()     { _clip && _clip.clone(function(c){ c.set({left:c.left+20,top:c.top+20}); fc.add(c).setActiveObject(c).renderAll(); saveState(); }); }

function ctxAlign()     { var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;} o.set({left:(fc.getWidth()/fc.getZoom()-o.getScaledWidth())/2, top:(fc.getHeight()/fc.getZoom()-o.getScaledHeight())/2}); fc.renderAll(); saveState(); showToast('Aligned to center'); }

function ctxLock()      { var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;} var lock=!o.lockMovementX; /* locked elements stay SELECTABLE so they can be right-clicked and unlocked again (audit 44) */ o.set({lockMovementX:lock,lockMovementY:lock,lockScalingX:lock,lockScalingY:lock,lockRotation:lock,hasControls:!lock,selectable:true,evented:true}); fc.renderAll(); showToast(lock?'Element locked — right-click it again to unlock':'Element unlocked'); }

function ldScopeChooser(title, cb) {
  var old = document.getElementById('ld-scope-pop'); if (old) old.remove();
  var pop = document.createElement('div'); pop.id = 'ld-scope-pop';
  pop.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;';
  pop.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px 22px;min-width:260px;box-shadow:0 12px 40px rgba(0,0,0,0.25);">' +
    '<div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:14px;">' + title + '</div>' +
    '<button id="ld-scope-this" style="display:block;width:100%;padding:10px 0;margin-bottom:8px;background:#F1F5F9;color:#0F172A;border-radius:8px;font-weight:600;font-size:13px;">This slide only</button>' +
    '<button id="ld-scope-all" style="display:block;width:100%;padding:10px 0;background:var(--accent,#7C3AED);color:#fff;border-radius:8px;font-weight:600;font-size:13px;">All slides</button></div>';
  document.body.appendChild(pop);
  pop.addEventListener('click', function (e) { if (e.target === pop) pop.remove(); });
  document.getElementById('ld-scope-this').onclick = function () { pop.remove(); cb('slide'); };
  document.getElementById('ld-scope-all').onclick = function () { pop.remove(); cb('deck'); };
}

function ldApplyBgColorDeck(color) {
  fc.setBackgroundColor(color, fc.renderAll.bind(fc));
  state.pages.forEach(function (page, i) {
    if (i === state.currentPage) return;
    if (page.canvasJSON) page.canvasJSON.background = color;
    else if (page.ir) page.ir.background = { type: 'solid', color: color };
    else page.pendingBg = color; /* blank page: honored on first load */
    page.thumb = null;
  });
  renderPageThumbs();
}

function ldSetBgImageDeck(src) {
  var cw = fc.getWidth() / fc.getZoom(), ch = fc.getHeight() / fc.getZoom();
  var size = window._deckIR ? window._deckIR.size : { w: 12192000, h: 6858000 };
  fabric.Image.fromURL(src, function (img) {
    img.set({ left: -1, top: -1, scaleX: (cw + 2) / img.width, scaleY: (ch + 2) / img.height, selectable: true, ldBgStamp: true });
    fc.add(img); fc.sendToBack(img); fc.renderAll(); saveState();
  }, { crossOrigin: 'anonymous' });
  var probe = new Image();
  probe.onload = function () {
    var natW = probe.width || 100, natH = probe.height || 100;
    state.pages.forEach(function (page, i) {
      if (i === state.currentPage) return;
      if (page.canvasJSON) {
        page.canvasJSON.objects = page.canvasJSON.objects || [];
        page.canvasJSON.objects.unshift({ type: 'image', version: '5.3.1', src: src, crossOrigin: 'anonymous',
          left: -1, top: -1, width: natW, height: natH, scaleX: (cw + 2) / natW, scaleY: (ch + 2) / natH, ldBgStamp: true });
      } else if (page.ir) {
        page.ir.elements = page.ir.elements || [];
        page.ir.elements.unshift({ id: 'ld-bg-stamp-' + i, origin: 'slide', type: 'image',
          format: (src.indexOf('image/jpeg') !== -1 ? 'jpeg' : 'png'), src: src,
          x: 0, y: 0, w: size.w, h: size.h });
      }
      page.thumb = null;
    });
    renderPageThumbs();
  };
  probe.src = src;
}

function ctxSetBg() {
  var o = fc && fc.getActiveObject();
  if (!o || o.type !== 'image') { showToast('Select an image first'); return; }
  ldScopeChooser('Set image as background on…', function (scope) {
    if (scope === 'slide') {
      fc.setBackgroundImage(o, fc.renderAll.bind(fc), { scaleX: fc.getWidth() / fc.getZoom() / o.width, scaleY: fc.getHeight() / fc.getZoom() / o.height });
      fc.remove(o); fc.renderAll(); showToast('Set as background');
    } else {
      var src = (o.getSrc && o.getSrc()) || (o._element && o._element.src) || o.toDataURL();
      fc.remove(o); fc.renderAll();
      ldSetBgImageDeck(src);
      showToast('Background applied to all slides');
    }
    saveState();
  });
}

function ctxInfo()      { var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;} showToast('Type: '+o.type+' | W:'+Math.round(o.getScaledWidth())+'px | H:'+Math.round(o.getScaledHeight())+'px | X:'+Math.round(o.left)+' Y:'+Math.round(o.top)); }

function ctxLink()      { var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;} var url=prompt('Enter URL:','https://'); if(url){ o.set('data',{link:url}); showToast('Link added: '+url); } }

function ctxAltText()   { var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;} var t=prompt('Enter alternative text:',o.altText||''); if(t!==null){ o.altText=t; showToast('Alt text set: '+t); } }

function ctxApplyColor(){
  var o=fc&&fc.getActiveObject(); if(!o){showToast('Select an element first');return;}
  var c=o.fill||o.stroke||'#7C3AED';
  if (typeof c !== 'string') { showToast('Pick an element with a solid colour'); return; }
  ldScopeChooser('Apply this colour to…', function (scope) {
    if (scope === 'slide') { fc.setBackgroundColor(c, fc.renderAll.bind(fc)); showToast('Page colour applied'); }
    else { ldApplyBgColorDeck(c); showToast('Colour applied to all slides'); }
    saveState();
  });
}

function ctxMasterAdd() {
  var o = fc && fc.getActiveObject();
  if (!o) { showToast('Select an element first'); return; }
  if (o.type === 'activeSelection') { showToast('One element at a time'); return; }
  if (!o.ldMasterId) o.ldMasterId = 'm' + Math.random().toString(36).slice(2, 10);
  var json = o.toObject(FABRIC_JSON_PROPS);
  json.ldMasterId = o.ldMasterId;
  window._ldMasters = window._ldMasters.filter(function (m) { return m.ldMasterId !== o.ldMasterId; });
  window._ldMasters.push(json);
  /* stamp into every already-EDITED page now; untouched IR pages get it on
     first visit (ldStampMasters) and at export (buildEffectiveDeckIR) */
  state.pages.forEach(function (page, i) {
    if (i === state.currentPage) return;
    var j = ldNormJson(page);
    if (!j) return;
    j.objects = (j.objects || []).filter(function (ob) { return ob.ldMasterId !== o.ldMasterId; });
    j.objects.push(json);
    page.thumb = null;
  });
  o.selectable = false; o.evented = false; fc.discardActiveObject(); fc.renderAll(); /* master copies lock, like PPT */
  renderPageThumbs(); saveState();
  showToast('Element now shows on all ' + state.pages.length + ' slides — edit it via the Master button');
}

function ctxMasterRemove() {
  var o = fc && fc.getActiveObject();
  /* master copies are unselectable, so fall back to the element that was
     under the pointer when the menu opened (audit 46) */
  if ((!o || !o.ldMasterId) && window._ctxMaster && window._ctxMaster.ldMasterId) o = window._ctxMaster;
  if (!o || !o.ldMasterId) { showToast('Right-click directly on an "all slides" element to remove it'); return; }
  var id = o.ldMasterId;
  window._ldMasters = window._ldMasters.filter(function (m) { return m.ldMasterId !== id; });
  state.pages.forEach(function (page, i) {
    var j = ldNormJson(page);
    if (j) j.objects = (j.objects || []).filter(function (ob) { return ob.ldMasterId !== id; });
    page.thumb = null;
  });
  delete o.ldMasterId; /* the copy on THIS slide stays, as a normal element */
  renderPageThumbs(); saveState();
  showToast('Removed from other slides (kept here as a normal element)');
}

function ldStampMasters() {
  return new Promise(function (resolve) {
    if (window._masterMode) { resolve(); return; }
    if (!window._ldMasters.length || !fc) { resolve(); return; }
    var have = {};
    fc.getObjects().forEach(function (ob) { if (ob.ldMasterId) have[ob.ldMasterId] = 1; });
    var missing = window._ldMasters.filter(function (m) { return !have[m.ldMasterId]; });
    if (!missing.length) { resolve(); return; }
    fabric.util.enlivenObjects(missing.map(function (m) { return Object.assign({}, m); }), function (objs) {
      objs.forEach(function (ob, k) { ob.ldMasterId = missing[k].ldMasterId; ob.selectable = false; ob.evented = false; fc.add(ob); });
      fc.renderAll(); resolve();
    });
  });
}

function ldNormJson(page) {
  if (!page || !page.canvasJSON) return null;
  if (typeof page.canvasJSON === 'string') { try { page.canvasJSON = JSON.parse(page.canvasJSON); } catch (e) { return null; } }
  return page.canvasJSON;
}

function enterMasterMode() {
  if (window._masterMode || !fc) return;
  captureCurrentPage();
  window._masterMode = true;
  window._bulkLoad = true;
  fc.clear();
  fc.setBackgroundColor('#F4F5F7', fc.renderAll.bind(fc));
  if (window._ldMasters.length) {
    fabric.util.enlivenObjects(window._ldMasters.map(function (m) { return Object.assign({}, m); }), function (objs) {
      objs.forEach(function (ob, k) { ob.ldMasterId = window._ldMasters[k].ldMasterId; ob.selectable = true; ob.evented = true; fc.add(ob); });
      fc.renderAll();
    });
  }
  window._bulkLoad = false;
  var btn = document.getElementById('master-toggle');
  if (btn) { btn.classList.add('active'); btn.textContent = 'Exit Master'; }
  var frame = document.getElementById('slide-frame');
  if (frame) frame.style.boxShadow = '0 0 0 3px var(--accent, #7C3AED)';
  showToast('MASTER VIEW — anything you place here shows on ALL slides. Click "Exit Master" (or any slide) to apply.', 6000);
}

function ldSyncMastersFromCanvas() {
  var ms = [];
  fc.getObjects().forEach(function (ob) {
    if (!ob.ldMasterId) ob.ldMasterId = 'm' + Math.random().toString(36).slice(2, 10);
    var j = ob.toObject(FABRIC_JSON_PROPS); j.ldMasterId = ob.ldMasterId; ms.push(j);
  });
  window._ldMasters = ms;
  /* restamp every visited page: strip old master copies, append the new set
     (they arrive locked via loadPageIntoCanvas / ldStampMasters) */
  state.pages.forEach(function (page) {
    var j = ldNormJson(page);
    if (j) j.objects = (j.objects || []).filter(function (ob) { return !ob.ldMasterId; }).concat(ms.map(function (m) { return Object.assign({}, m); }));
    page.thumb = null;
  });
}

async function exitMasterMode() {
  if (!window._masterMode) return;
  ldSyncMastersFromCanvas();
  window._masterMode = false;
  var btn = document.getElementById('master-toggle');
  if (btn) { btn.classList.remove('active'); btn.textContent = 'Master'; }
  var frame = document.getElementById('slide-frame');
  if (frame) frame.style.boxShadow = '';
  await loadPageIntoCanvas(state.currentPage);
  renderPageThumbs();
  showToast(window._ldMasters.length ? 'Master applied to all ' + state.pages.length + ' slides' : 'Master view closed');
}

/* GUARANTEED free twin. The parser's fontDisplay is only a DISPLAY twin and
   can be the commercial name itself when no substitute was found — that is
   how "Helios" and "ITC Edwardian Script" leaked into "free" exports while
   delete deckIR.embeddedFonts stripped the real font files: PowerPoint fell
   back to a default face and the layout broke (Founders & Fortune bug).
   This helper NEVER returns a non-library font. */
function ldFreeTwinFor(name, display) {
  var lib = window.LAZYDOG_FONT_LIB || [], proper = window.LAZYDOG_FONT_PROPER || [];
  function inLib(n) { return !!n && lib.indexOf(String(n).toLowerCase()) !== -1; }
  function properOf(n) { var i = lib.indexOf(String(n).toLowerCase()); return i === -1 ? n : (proper[i] || n); }
  if (inLib(name)) return properOf(name);
  if (inLib(display)) return properOf(display);
  var n = String(name || '').toLowerCase();
  var MAP = {
    'helios': 'Inter', 'helvetica': 'Inter',
    'itc edwardian script': 'Great Vibes', 'edwardian script': 'Great Vibes',
    'gotham': 'Montserrat', 'proxima nova': 'Montserrat',
    'avenir': 'Nunito Sans', 'futura': 'Jost'
  };
  for (var k in MAP) { if (n === k || n.indexOf(k + ' ') === 0 || n.indexOf(k) === 0) { if (inLib(MAP[k])) return properOf(MAP[k]); } }
  /* category heuristics — keep the FEEL of the lost face */
  if (/script|handwrit|callig|brush|signature/.test(n)) { if (inLib('great vibes')) return properOf('great vibes'); if (inLib('dancing script')) return properOf('dancing script'); }
  if (/condensed|compressed/.test(n) && inLib('barlow condensed')) return properOf('barlow condensed');
  if (/narrow/.test(n) && inLib('archivo narrow')) return properOf('archivo narrow');
  if (/slab|serif|roman|georgia|garamond|caslon|times|didot|bodoni/.test(n) && inLib('playfair display')) return properOf('playfair display');
  if (inLib('inter')) return properOf('inter');
  return proper[0] || 'Arial';
}

function ldFontAuditPrompt(deckIR) {
  return new Promise(function (resolve) {
    try {
      var lib = window.LAZYDOG_FONT_LIB || [];
      /* (31 Jul fix — the "size 10 middle heading" bug) The cloud parser can
         deliver font names with quote/space/chain artifacts ("Inter ",
         '"Inter"', "Inter, sans-serif") that FAIL the raw library lookup even
         though the font IS in the library. The alarm then fired on a clean
         deck, "switch to free" flagged every run __refonted, and the fit-
         shrink loop crushed any overflow-by-design box (15.44pt × 0.94⁷ =
         10pt). Normalise before every lookup. */
      function ldNormFont(n) { return String(n == null ? '' : n).split(',')[0].replace(/["']/g, '').trim(); }
      function inLibN(n) { return !!n && lib.indexOf(ldNormFont(n).toLowerCase()) !== -1; }
      var found = {};
      function scanP(p) { (p.runs || []).forEach(function (r) {
        /* show the GUARANTEED twin in the alarm, not the parser's display
           name (which can be the commercial font itself) */
        if (r.font && !inLibN(r.font)) found[r.font] = ldFreeTwinFor(ldNormFont(r.font), ldNormFont(r.fontDisplay));
      }); }
      deckIR.slides.forEach(function (s) { (s.elements || []).forEach(function (e) {
        if (e.type === 'text' && e.paragraphs) e.paragraphs.forEach(scanP);
        else if (e.type === 'table' && e.rows) e.rows.forEach(function (row) { (row.cells || []).forEach(function (c) { (c.paragraphs || []).forEach(scanP); }); });
      }); });
      var names = Object.keys(found);
      if (!names.length) { resolve(); return; }
      var pop = document.createElement('div'); pop.id = 'ld-fontaudit-pop';
      pop.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,0.45);display:flex;align-items:center;justify-content:center;';
      pop.innerHTML = '<div style="background:#fff;border-radius:12px;padding:22px 24px;max-width:480px;box-shadow:0 12px 40px rgba(0,0,0,0.25);">' +
        '<div style="font-size:15px;font-weight:800;color:#B45309;margin-bottom:8px;">&#9888; Commercial / non-library fonts detected</div>' +
        '<div style="font-size:13px;color:#0F172A;line-height:1.5;margin-bottom:10px;">This file uses fonts that are not in the engine\'s free library:</div>' +
        '<div style="font-size:12px;color:#334155;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;margin-bottom:14px;max-height:130px;overflow:auto;">' +
        names.map(function (n) {
          /* three sources, in order: (1) embedded IN THIS FILE (registered
             above — what PowerPoint reads), (2) THIS COMPUTER's installed
             fonts, (3) free twin preview. "Keep" truly shows the original
             whenever source 1 or 2 has it. */
          var emb = !!(window._ldEmbeddedFams && window._ldEmbeddedFams[String(n).toLowerCase()]);
          var here = false;
          try { here = !!(document.fonts && document.fonts.check && document.fonts.check('16px "' + n + '"')); } catch (fe) {}
          return '<div style="margin-bottom:3px;">&bull; <b>' + n + '</b><br>' +
            (emb ? '<span style="color:#059669;">&#10003; embedded in this file — "keep" displays the true font</span>'
             : here ? '<span style="color:#059669;">&#10003; found on this computer — "keep" displays the true font</span>'
                    : '<span style="color:#B45309;">&#10007; not in file or on this computer — preview uses free twin: ' + found[n] + '</span>') + '</div>';
        }).join('') + '</div>' +
        '<button id="ld-fa-keep" style="display:block;width:100%;padding:10px 0;margin-bottom:8px;background:#F1F5F9;color:#0F172A;border-radius:8px;font-weight:600;font-size:13px;">Keep original fonts <span style="font-weight:400;color:#64748B;">(client file — exports unchanged)</span></button>' +
        '<button id="ld-fa-free" style="display:block;width:100%;padding:10px 0;background:var(--accent,#7C3AED);color:#fff;border-radius:8px;font-weight:600;font-size:13px;">Switch to free fonts <span style="font-weight:400;opacity:0.85;">(our kit — safe to distribute)</span></button></div>';
      document.body.appendChild(pop);
      document.getElementById('ld-fa-keep').onclick = function () { deckIR.fontPolicy = 'keep'; pop.remove(); resolve(); };
      document.getElementById('ld-fa-free').onclick = function () {
        deckIR.fontPolicy = 'free';
        function convP(p) { (p.runs || []).forEach(function (r) {
          /* r.fontDisplay can BE the commercial name (parser found no twin)
             — Helios / ITC Edwardian Script survived "free" mode this way.
             ldFreeTwinFor never returns a non-library font, so the exported
             file is truly clean AND the preview shows the exact face the
             buyer will get (the embedded FontFace no longer masks it). */
          if (r.font && !inLibN(r.font)) {
            var _tw = ldFreeTwinFor(ldNormFont(r.font), ldNormFont(r.fontDisplay));
            /* SAME-FONT GUARD (31 Jul): when the "twin" is the run's own
               family (name artifact, not a real substitution), metrics are
               unchanged — clean the name but do NOT mark __refonted, so the
               fit-shrink loop (which exists only to absorb DIFFERENT twin
               metrics) can never fire and crush the box to ~10pt. */
            var _same = _tw && ldNormFont(_tw).toLowerCase() === ldNormFont(r.font).toLowerCase();
            r.font = _tw; r.fontDisplay = _tw;
            if (!_same) r.__refonted = true;
          }
        }); }
        deckIR.slides.forEach(function (s) { (s.elements || []).forEach(function (e) {
          if (e.type === 'text' && e.paragraphs) e.paragraphs.forEach(convP);
          else if (e.type === 'table' && e.rows) e.rows.forEach(function (row) { (row.cells || []).forEach(function (c) { (c.paragraphs || []).forEach(convP); }); });
        }); });
        delete deckIR.embeddedFonts; /* free-font kit: no commercial font files ride along in export */
        pop.remove(); showToast('Fonts converted to free library twins — file is distribution-safe');
        resolve();
      };
    } catch (e) { resolve(); }
  });
}

function addText(type) {
  if (!fc) return;
  var props = {
    heading:    { text:'Add a heading',    fontSize:44, fontWeight:'700', fill:'#0F172A', upper:false },
    subheading: { text:'Add a subheading', fontSize:28, fontWeight:'600', fill:'#0F172A', upper:false },
    body:       { text:'Add body text',    fontSize:16, fontWeight:'400', fill:'#334155', upper:false },
    caption:    { text:'Add a caption',    fontSize:12, fontWeight:'500', fill:'#64748B', upper:true  }
  }[type] || { text:'Text', fontSize:16, fontWeight:'400', fill:'#0F172A', upper:false };

  var t = new fabric.IText(props.upper ? props.text.toUpperCase() : props.text, {
    left: 80, top: 80, fontFamily: 'DM Sans, sans-serif',
    fontSize: props.fontSize, fontWeight: props.fontWeight, fill: props.fill, editable: true
  });
  fc.add(t).setActiveObject(t).renderAll();
  saveState();
  showToast(`Added ${type} text to slide`);
}

function makeStarPoints(outerR, innerR) {
  var spikes = 5, points = [];
  for (var i = 0; i < spikes * 2; i++) {
    var r = (i % 2 === 0) ? outerR : innerR;
    var angle = (Math.PI / spikes) * i - Math.PI / 2;
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return points;
}

function addShape(type) {
  if (!fc) return;
  var defaults = { left: 100, top: 100, fill: '#7C3AED', opacity: 0.9 };
  var s;
  if (type === 'rect')          s = new fabric.Rect(Object.assign({}, defaults, { width:160, height:100 }));
  else if (type === 'circle')   s = new fabric.Circle(Object.assign({}, defaults, { radius:70 }));
  else if (type === 'triangle') s = new fabric.Triangle(Object.assign({}, defaults, { width:140, height:120 }));
  else if (type === 'line')     s = new fabric.Line([50,50,300,50], { left:100, top:150, stroke:'#7C3AED', strokeWidth:3 });
  else if (type === 'rounded-rect') s = new fabric.Rect(Object.assign({}, defaults, { width:160, height:100, rx:24, ry:24 }));
  else if (type === 'star')     s = new fabric.Polygon(makeStarPoints(70, 30), Object.assign({}, defaults, { left:120, top:100 }));
  if (s) { fc.add(s).setActiveObject(s).renderAll(); saveState(); }
  showToast('Element added to slide');
}

function setEditMode(mode) {
  if (!fc) return;
  if (mode === 'view')    { fc.selection = false; fc.getObjects().forEach(function(o){ o.selectable = false; }); }
  else if (mode === 'edit') { fc.selection = true; fc.getObjects().forEach(function(o){ if (!o.isBg) o.selectable = true; }); }
  else if (mode === 'comment') { fc.selection = false; }
  fc.renderAll();
}

var _restoring = false;

function currentPageObj() {
  return state.pages[state.currentPage] || null;
}

function doUndo() {
  var page = currentPageObj();
  if (!page || page.historyIndex <= 0) return;
  page.historyIndex--;
  restoreState();
}

function doRedo() {
  var page = currentPageObj();
  if (!page || page.historyIndex >= page.history.length - 1) return;
  page.historyIndex++;
  restoreState();
}

function restoreState() {
  var page = currentPageObj();
  if (!page || !page.history || !page.history[page.historyIndex]) return;
  _restoring = true;
  fc.loadFromJSON(page.history[page.historyIndex], function() {
    fc.getObjects().forEach(function(o){ if (o.isBg) { o.selectable = true; o.evented = true; } });
    fc.renderAll();
    page.canvasJSON = page.history[page.historyIndex];
    _restoring = false;
    updateUndoRedo();
  });
}

function ensurePageHistory(index) {
  var page = state.pages[index];
  if (!page) return;
  if (!page.history || !page.history.length) {
    var json = JSON.stringify(fc.toJSON(FABRIC_JSON_PROPS));
    page.history = [json];
    page.historyIndex = 0;
    page.canvasJSON = json;
  }
  updateUndoRedo();
}

function updateUndoRedo() {
  var page = currentPageObj();
  var canUndo = !!(page && page.historyIndex > 0);
  var canRedo = !!(page && page.history && page.historyIndex < page.history.length - 1);
  if (dom.undoBtn) dom.undoBtn.style.opacity = canUndo ? '1' : '0.4';
  if (dom.redoBtn) dom.redoBtn.style.opacity = canRedo ? '1' : '0.4';
}

function selectSlide(selected) {
  state.slideSelected = selected;
  dom.slideFrame.classList.toggle('selected', selected);
}

function calculateFitZoom() {
  const area = dom.canvasArea.getBoundingClientRect();
  const padding = 60;
  const maxW = area.width - padding * 2;
  const maxH = area.height - padding * 2;
  const baseW = (fc && fc._baseWidth) || 960;
  const baseH = (fc && fc._baseHeight) || 540;
  const scaleW = maxW / baseW;
  const scaleH = maxH / baseH;
  return Math.min(scaleW, scaleH, 2) * 100;
}

function doZoom(percent) {
  if (!fc) return;
  var z = percent / 100;
  var w = fc._baseWidth || 960;
  var h = fc._baseHeight || 540;
  fc.setZoom(z);
  fc.setWidth(w * z);
  fc.setHeight(h * z);
  fc.renderAll();
}

function setZoom(value) {
  state.zoom = Math.max(25, Math.min(200, Math.round(value)));
  dom.zoomSlider.value = state.zoom;
  dom.zoomValue.textContent = state.zoom + '%';
  doZoom(state.zoom);
}

function setSlideAspect(emuW, emuH) {
  if (!fc || !emuW || !emuH) return;
  var baseW = fc._baseWidth || 960;
  var baseH = Math.round(baseW * (emuH / emuW));
  fc._baseWidth = baseW;
  fc._baseHeight = baseH;
  /* true canvas-px per PowerPoint-pt for THIS deck — the font panel divides
     by this so the size box shows the same number PowerPoint shows */
  fc._pxPerPt = baseW * 12700 / emuW;
  var z = state.zoom / 100;
  fc.setWidth(baseW * z);
  fc.setHeight(baseH * z);
  fc.setZoom(z);
  fc.renderAll();
}

async function switchPage(index) {
  if (window._masterMode) { await exitMasterMode(); } /* clicking a slide applies + leaves master view, like PowerPoint */
  if (index < 0 || index >= state.pages.length || index === state.currentPage) return;
  captureCurrentPage();
  state.notes[state.currentPage] = dom.notesTextarea.value;
  state.currentPage = index;
  dom.notesTextarea.value = state.notes[state.currentPage] || '';
  selectSlide(false);
  await loadPageIntoCanvas(index);
  renderPageThumbs();
}

function addPage() {
  var _maxSlides = (typeof window !== 'undefined' && window.LD_MAX_SLIDES) || 500;
  if (state.pages.length >= _maxSlides) { showToast('Maximum ' + _maxSlides + ' slides allowed'); return; }
  captureCurrentPage();
  var page = makeBlankPage(Date.now());
  state.pages.push(page);
  state.notes.push('');
  state.currentPage = state.pages.length - 1;
  dom.notesTextarea.value = '';
  selectSlide(false);
  window._bulkLoad = true;
  fc.clear();
  fc.setBackgroundColor('#ffffff', fc.renderAll.bind(fc));
  window._bulkLoad = false;
  ensurePageHistory(state.currentPage);
  renderPageThumbs();
  showToast('Slide added');
}

async function deletePage() {
  if (state.pages.length <= 1) { showToast('Cannot delete the last slide'); return; }
  state.pages.splice(state.currentPage, 1);
  state.notes.splice(state.currentPage, 1);
  if (state.currentPage >= state.pages.length) state.currentPage = state.pages.length - 1;
  dom.notesTextarea.value = state.notes[state.currentPage] || '';
  await loadPageIntoCanvas(state.currentPage);
  renderPageThumbs();
  showToast('Slide deleted');
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function toggleTimer() {
  if (state.timerRunning) {
    clearInterval(state.timerInterval);
    state.timerRunning = false;
    dom.timerToggle.querySelector('.material-icons-outlined').textContent = 'play_arrow';
  } else {
    state.timerRunning = true;
    dom.timerToggle.querySelector('.material-icons-outlined').textContent = 'pause';
    dom.timerReset.style.opacity = '1';
    dom.timerReset.style.pointerEvents = 'auto';
    state.timerInterval = setInterval(() => {
      state.timerSeconds++;
      dom.timerDisplay.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  state.timerSeconds = 0;
  dom.timerDisplay.textContent = '00:00';
  dom.timerToggle.querySelector('.material-icons-outlined').textContent = 'play_arrow';
  dom.timerReset.style.opacity = '0';
  dom.timerReset.style.pointerEvents = 'none';
}

function toggleNotes() {
  state.notesOpen = !state.notesOpen;
  dom.notesPanel.classList.toggle('open', state.notesOpen);
  dom.notesToggle.classList.toggle('active', state.notesOpen);
  if (state.notesOpen) dom.notesTextarea.focus();
}

function exportCanvasPNG() {
  if (!fc) { showToast('Editor not ready yet'); return; }
  var dataURL = fc.toDataURL({ format: 'png', multiplier: 2 });
  var a = document.createElement('a');
  a.href = dataURL;
  a.download = 'slide.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Downloading PNG...');
}

function applyBackgroundIR(fill, fc, cw, ch) {
  if (!fill || fill.type === 'none') { fc.setBackgroundColor('#ffffff', function () {}); return; }
  if (fill.type === 'solid') { fc.setBackgroundColor(fill.color, function () {}); return; }
  if (fill.type === 'gradient') {
    var stops = (fill.stops || []).map(function (s) { return { offset: s.pos, color: s.color }; });
    if (!stops.length) { fc.setBackgroundColor('#ffffff', function () {}); return; }
    var rad = (fill.angleDeg || 0) * Math.PI / 180;
    var cx = cw / 2, cy = ch / 2;
    var x1 = cx - Math.cos(rad) * cw / 2, y1 = cy - Math.sin(rad) * ch / 2;
    var x2 = cx + Math.cos(rad) * cw / 2, y2 = cy + Math.sin(rad) * ch / 2;
    var grad = new fabric.Gradient({ type: 'linear', coords: { x1: x1, y1: y1, x2: x2, y2: y2 }, colorStops: stops });
    fc.setBackgroundColor(grad, function () {});
  }
}

function gradientForBox(fillIR, w, h) {
  var stops = (fillIR.stops || []).map(function (s) { return { offset: s.pos, color: s.color }; });
  if (fillIR.radial) {
    /* focus point comes from the file's fillToRect; the 1.84 factor is a
       CALIBRATION of PowerPoint's renderer (its falloff extends well past
       the geometric corner — fitted once against PPT pixel samples, applies
       to every deck, not tuned per file) */
    var fx = (fillIR.focus ? fillIR.focus.fx : 0.5) * w;
    var fy = (fillIR.focus ? fillIR.focus.fy : 0.5) * h;
    var dxm = Math.max(fx, w - fx), dym = Math.max(fy, h - fy);
    var rFar = Math.sqrt(dxm * dxm + dym * dym);
    return new fabric.Gradient({ type: 'radial',
      coords: { x1: fx, y1: fy, r1: 0, x2: fx, y2: fy, r2: rFar * 1.84 },
      colorStops: stops });
  }
  var rad = (fillIR.angleDeg || 0) * Math.PI / 180;
  var x1 = w / 2 - Math.cos(rad) * w / 2, y1 = h / 2 - Math.sin(rad) * h / 2;
  var x2 = w / 2 + Math.cos(rad) * w / 2, y2 = h / 2 + Math.sin(rad) * h / 2;
  return new fabric.Gradient({ type: 'linear', coords: { x1: x1, y1: y1, x2: x2, y2: y2 }, colorStops: stops });
}

function patternForFill(fillIR) {
  /* EXACT-PIXEL 8x8 hatch tiles (PowerPoint/GDI style). Written as raw
     ImageData: no anti-aliasing, so lines are 1px crisp and full-strength —
     the earlier stroked tiles rendered fuzzy and washed-out. Our canvas is
     96dpi-equivalent (1920px / 20in), matching PPT's hatch scale 1:1. */
  var p = (fillIR.prst || 'ltDnDiag');
  function pix(x, y) {
    if (/diagBrick/i.test(p)) return x + y === 7 || (x === y && x > 3); /* runs "/" like PowerPoint — mirrored from first attempt */
    if (/wdDnDiag/i.test(p))  return (x - y + 16) % 8 < 2;
    if (/dkDnDiag/i.test(p))  return (x - y + 16) % 4 < 2;
    if (/dnDiag/i.test(p))    return (x - y + 16) % 4 === 0;
    if (/wdUpDiag/i.test(p))  return (x + y) % 8 < 2;
    if (/dkUpDiag/i.test(p))  return (x + y) % 4 < 2;
    if (/upDiag/i.test(p))    return (x + y) % 4 === 0;
    if (/diagCross|openDmnd|dotDmnd/i.test(p)) return (x - y + 16) % 8 === 0 || (x + y) % 8 === 0;
    if (/smCheck|lgCheck|weave|trellis/i.test(p)) return (x - y + 16) % 4 === 0 || (x + y) % 4 === 0;
    if (/smGrid/i.test(p))    return x % 4 === 0 || y % 4 === 0;
    if (/lgGrid|cross|plaid/i.test(p)) return x === 0 || y === 0;
    if (/ltHorz|dkHorz/i.test(p)) return y % 4 === 0;
    if (/horz/i.test(p))      return y === 0;
    if (/ltVert|dkVert/i.test(p)) return x % 4 === 0;
    if (/vert/i.test(p))      return x === 0;
    if (/pct90|pct80|pct75/i.test(p)) return !((x % 2 === 0) && (y % 2 === 0));
    if (/pct5\b|pct10/i.test(p)) return x % 8 === 0 && y % 8 === 0;
    if (/pct2[05]|pct30/i.test(p)) return (x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0);
    if (/pct|dot/i.test(p))   return (x % 2 === 0 && y % 2 === 0);
    return (x - y + 16) % 4 === 0; /* default: light down-diagonal */
  }
  function hex2rgb(css) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(css).replace('#',''));
    if (m) return [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16), 255];
    var r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(String(css));
    return r ? [+r[1], +r[2], +r[3], 255] : [0, 0, 0, 255];
  }
  var fg = hex2rgb(fillIR.fg || '#000000'), bg = hex2rgb(fillIR.bg || '#FFFFFF');
  var t = document.createElement('canvas'); t.width = 8; t.height = 8;
  var g = t.getContext('2d');
  var im = g.createImageData(8, 8);
  for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
    var c = pix(x, y) ? fg : bg, o = (y * 8 + x) * 4;
    im.data[o] = c[0]; im.data[o+1] = c[1]; im.data[o+2] = c[2]; im.data[o+3] = c[3];
  }
  g.putImageData(im, 0, 0);
  var pat = new fabric.Pattern({ source: t, repeat: 'repeat' });
  /* PPT hatches have a FIXED physical period (8px @ 96dpi = 1/12 inch).
     Our canvas dpi varies with slide size (1920px / slide-width-in), so
     scale the tile to keep the true physical spacing — unscaled tiles
     rendered 1.5x too dense on 13.3in decks and read as thick/heavy. */
  var pxPerPt = (typeof fc !== 'undefined' && fc && fc._pxPerPt) ? fc._pxPerPt : 2;
  var k = pxPerPt * 0.75; /* 96dpi ⇒ 1.333 px/pt ⇒ k=1 */
  if (Math.abs(k - 1) > 0.05) pat.patternTransform = [k, 0, 0, k, 0, 0];
  return pat;
}

function fillIRToFabric(fillIR, w, h) {
  if (!fillIR || fillIR.type === 'none') return '';
  if (fillIR.type === 'solid') return fillIR.color;
  if (fillIR.type === 'gradient') return gradientForBox(fillIR, w, h);
  if (fillIR.type === 'pattern') return patternForFill(fillIR);
  return '';
}

function cssFF(name) {
  var f = String(name || 'DM Sans').replace(/["']/g, '').trim() || 'DM Sans';
  return '"' + f + '", sans-serif';
}

function ldFF(r) {
  if (!r) return cssFF(null);
  var o = String(r.font || '').replace(/["']/g, '').trim();
  var d = String(r.fontDisplay || '').replace(/["']/g, '').trim();
  if (!o) return cssFF(d);
  var chain = ['"' + o + '"'];
  /* pptx writes style-suffixed names ("... Condensed Italics") while the OS
     registers the base family ("... Condensed") — try the stripped name too
     so an INSTALLED original is found even under its real family name */
  var sfx = /\s+(bold|semi[- ]?bold|demi[- ]?bold|extra[- ]?bold|ultra[- ]?bold|medium|light|extra[- ]?light|ultra[- ]?light|thin|black|heavy|regular|book|italics?|oblique|\d+(?:-\d+)?)\s*$/i;
  var base = o, prev2;
  do { prev2 = base; base = base.replace(sfx, ''); } while (base !== prev2 && base);
  base = base.trim();
  if (base && base !== o) chain.push('"' + base + '"');
  if (d && d !== o && d !== base) chain.push('"' + d + '"');
  chain.push('sans-serif');
  return chain.join(', ');
}

function buildArchTextIR(el, sx, sy) {
  try {
    var para = el.paragraphs && el.paragraphs[0];
    if (!para || !para.runs || !para.runs.length) return null;
    var text = para.runs.map(function (r) { return r.text; }).join('');
    if (!text.trim()) return null;
    var down = /Down/.test(el.txWarp);
    var r0 = para.runs[0];
    var fontPx = Math.max(2, r0.sizePt * 12700 * sx);
    var boxW = Math.abs(el.w * sx), boxH = Math.abs(el.h * sy);
    var a = Math.max(8, boxW / 2), b = Math.max(8, boxH / 2);
    var R = Math.max(a * a / b, fontPx * 1.2); /* curvature at inscribed-ellipse apex */
    var chars = [], widths = [], total = 0, i, k, acc, run;
    for (i = 0; i < text.length; i++) {
      run = r0; acc = 0;
      for (k = 0; k < para.runs.length; k++) { acc += para.runs[k].text.length; if (i < acc) { run = para.runs[k]; break; } }
      var t = new fabric.Text(text[i], {
        fontSize: Math.max(2, run.sizePt * 12700 * sx),
        fontFamily: ldFF(run),
        fontWeight: run.weight ? run.weight : (run.b ? 'bold' : 'normal'),
        fontStyle: run.i ? 'italic' : 'normal',
        underline: !!run.u, fill: run.color,
        originX: 'center', originY: down ? 'top' : 'bottom'
      });
      if (run.strokeColor) t.set({ stroke: run.strokeColor, strokeWidth: Math.max(1, (run.strokeWPt || 0.75) * 12700 * sx), paintFirst: 'stroke' }); /* PPT paints the FILL on top of a centered stroke: only w/2 peeks outside, fill stays light and un-darkened (slide 1 audit round 2) */
      chars.push(t); widths.push(t.width || fontPx * 0.6); total += (t.width || fontPx * 0.6);
    }
    var half = Math.min(total / 2, R * 1.4);
    var sag = R - Math.sqrt(Math.max(0, R * R - half * half)); /* arc drop across the chord */
    var blockH = fontPx + sag;
    var cx = el.x * sx + boxW / 2;
    var blockTop = el.y * sy + Math.max(0, (boxH - blockH) / 2); /* WordArt default anchor: centred */
    var cy = down ? (blockTop + sag + fontPx * 0.1 - R) /* circle above, glyph tops hang on lower arc */
                  : (blockTop + fontPx + R);            /* circle below, baselines ride the upper arc */
    var s = -total / 2;
    for (i = 0; i < chars.length; i++) {
      var phi = (s + widths[i] / 2) / R; /* radians from apex */
      var px = cx + R * Math.sin(phi);
      var py = down ? (cy + R * Math.cos(phi)) : (cy - R * Math.cos(phi));
      chars[i].set({ left: px, top: py, angle: (down ? -phi : phi) * 180 / Math.PI });
      s += widths[i];
    }
    var grp = new fabric.Group(chars, { irId: el.id, irOrigin: el.origin, angle: el.rot || 0 });
    if (el.flipH) grp.set('flipX', true);
    if (el.flipV) grp.set('flipY', true);
    return grp;
  } catch (e) { return null; }
}

function buildTextboxFromIR(el, sx, sy) {
  /* WordArt arch family renders curved; other warp presets fall through to
     flat text but the preset survives on the IR for export */
  if (el.txWarp && /^textArch(Up|Down)/.test(el.txWarp)) {
    var _arch = buildArchTextIR(el, sx, sy);
    if (_arch) return _arch;
  }
  /* vertical text body (vert270 = 90° CCW, vert/eaVert = 90° CW): the flat
     textbox is built against the SWAPPED axis then rotated about the box
     centre, wrapped in a group so edit-sync reuses the original IR intact */
  if (el.txVert && !el._noVert) {
    var vEl = Object.assign({}, el, { _noVert: true, w: Math.abs(el.h * sy) / sx, h: Math.abs(el.w * sx) / sy, txVert: null });
    var vtb = buildTextboxFromIR(vEl, sx, sy);
    var vcx = (el.x + el.w / 2) * sx, vcy = (el.y + el.h / 2) * sy;
    vtb.set({ angle: el.txVert === 'vert270' ? -90 : 90, originX: 'center', originY: 'center', left: vcx, top: vcy });
    var vgrp = new fabric.Group([vtb], { irId: el.id, irOrigin: el.origin, angle: el.rot || 0 });
    return vgrp;
  }
  /* native multi-column body (numCol): wrap against the COLUMN width and
     deal wrapped lines round the columns — grouped, original IR reused */
  if (el.numCol > 1 && !el._noCol) {
    var gapEMU = el.spcCol || 0;
    var colWemu = (Math.abs(el.w) - gapEMU * (el.numCol - 1)) / el.numCol;
    var probe = buildTextboxFromIR(Object.assign({}, el, { _noCol: true, w: colWemu, insL: 0, insR: 0 }), sx, sy);
    var wrapped = (probe._textLines || []).map(function (l) { return (Array.isArray(l) ? l.join('') : l); });
    var perCol = Math.max(1, Math.ceil(wrapped.length / el.numCol));
    var colBoxes = [];
    for (var ci = 0; ci < el.numCol; ci++) {
      var chunk = wrapped.slice(ci * perCol, (ci + 1) * perCol).join('\n');
      if (!chunk) break;
      var cEl = Object.assign({}, el, { _noCol: true, w: colWemu, insL: 0, insR: 0,
        x: el.x + ci * (colWemu + gapEMU),
        paragraphs: [{ align: el.paragraphs[0] ? el.paragraphs[0].align : 'left',
          runs: [Object.assign({}, el.paragraphs[0].runs[0], { text: chunk })] }] });
      colBoxes.push(buildTextboxFromIR(cEl, sx, sy));
    }
    if (colBoxes.length) return new fabric.Group(colBoxes, { irId: el.id, irOrigin: el.origin, angle: el.rot || 0 });
  }
  /* Text-box margins: the box's OWN declared insets when present, PowerPoint
     defaults (0.1" left/right, 0.05" top) only as fallback. */
  var insL = el.insL != null ? el.insL : 91440;
  var insR = el.insR != null ? el.insR : 91440;
  var insT = el.insT != null ? el.insT : 45720;
  if (el.wrapNone) { insL = 0; insR = 0; }
  var left = (el.x + insL) * sx, top = (el.y + insT) * sy;
  var w = Math.max(4, Math.abs((el.w - insL - insR) * sx));
  var lines = [], styles = {};
  var firstRun = null, firstLineHeight = 1.16;
  el.paragraphs.forEach(function (para, li) {
    var bulletPrefix = para.bullet ? (para.bullet + ' ') : '';
    var lineText = bulletPrefix + para.runs.map(function (r) { return r.text; }).join('');
    lines.push(lineText);
    var charStyles = {};
    var offset = bulletPrefix.length;
    para.runs.forEach(function (r) {
      if (!firstRun) firstRun = r;
      /* Phase-1 proven formula: pt -> EMU (x12700) -> px (x sx) */
      var fpx = Math.max(2, r.sizePt * 12700 * sx);
      var st = { fontSize: fpx, fontWeight: r.weight ? r.weight : (r.b ? 'bold' : 'normal'), fontStyle: r.i ? 'italic' : 'normal', underline: !!r.u, fill: r.color, fontFamily: ldFF(r) };
      if (r.spcPt) st.charSpacing = (r.spcPt / r.sizePt) * 1000;
      if (r.strokeColor) { st.stroke = r.strokeColor; st.strokeWidth = Math.max(1, (r.strokeWPt || 0.75) * 12700 * sx); st.paintFirst = 'stroke'; /* PowerPoint paints the FILL ON TOP of a centered stroke: only the outer w/2 of the outline is visible and the fill is never darkened. Stroke-over-fill (round 1) doubled the visible ring and muddied the fill colour (slide 1 audit round 2) */ }
      for (var k = 0; k < r.text.length; k++) charStyles[offset + k] = st;
      offset += r.text.length;
    });
    styles[li] = charStyles;
    var domSize = (para.runs[0] && para.runs[0].sizePt) || 18;
    var lh = 1.16;
    if (para.lineSpacingPct) lh = para.lineSpacingPct;
    else if (para.lineSpacingPts) lh = para.lineSpacingPts / domSize;
    if (li === 0) firstLineHeight = lh;
  });
  var fullText = lines.join('\n');
  var align = el.paragraphs[0] ? el.paragraphs[0].align : 'left';
  if (el.wrapNone) align = 'center'; /* wrap=none block is visually centered in its shape */
  var baseFontPt = firstRun ? firstRun.sizePt : 18;
  /* PPT applies the line PITCH to the FIRST line as well: an explicit
     spcPts far larger than the font (display numbers like "290K" at 286pt
     with 401pt spacing) pushes the first baseline DOWN by the extra pitch.
     Fabric draws the first line near the box top — the big number rendered
     ~65pt high and everything around it looked shifted. Calibrated against
     LibreOffice/PowerPoint on the Founders deck (factor 0.58). */
  var pitchDown = 0;
  if (el.paragraphs[0] && el.paragraphs[0].lineSpacingPts && firstRun && firstRun.sizePt &&
      el.paragraphs[0].lineSpacingPts > firstRun.sizePt * 1.15 && (el.bodyAnchor || 't') === 't') {
    pitchDown = (el.paragraphs[0].lineSpacingPts - firstRun.sizePt) * 12700 * sy * 0.58;
  }
  /* JUSTIFY (slide-9 audit): PowerPoint NEVER stretches the LAST line of a
     justified paragraph — a single-line "Prepared by: Lazydog Studios" stays
     compact. Fabric's plain 'justify' stretches every line (incl. single
     lines) full-width, splitting words with huge gaps. 'justify-left'
     justifies wrapped lines but leaves paragraph-ending lines left-aligned —
     exactly PowerPoint's rule. IR keeps 'justify'; only fabric display maps. */
  var fabAlign = align === 'justify' ? 'justify-left' : align;
  /* FIRST-LINE DROP (slide-9 audit): fabric's line box is fontSize*lineHeight
     *1.13 (its internal _fontSizeMult) — the extra 13% sits mostly above the
     baseline, so top-anchored text draws a few px LOWER than PowerPoint and
     landed ON the rule under it instead of a little above. Lift the box by
     the excess (0.778 = 1 - fabric's 0.222 baseline fraction). */
  var fabricDrop = 0;
  if ((el.bodyAnchor || 't') === 't' && !pitchDown) {
    fabricDrop = (baseFontPt * 12700 * sy) * firstLineHeight * 0.13 * 0.778;
  }
  var tb = new fabric.Textbox(fullText, {
    left: left, top: top + pitchDown - fabricDrop, width: w, textAlign: fabAlign,
    fontSize: Math.max(2, baseFontPt * 12700 * sx), /* Phase-1 proven formula */
    fontFamily: ldFF(firstRun),
    fill: firstRun ? firstRun.color : '#000000',
    angle: el.rot || 0, editable: true, styles: styles, lineHeight: firstLineHeight,
    irId: el.id, irOrigin: el.origin
  });
  /* Letter-spacing: fabric only honors charSpacing at OBJECT level — putting
     it in per-char styles (above) silently does nothing. Decks with heavy
     negative tracking (Canva: spc="-581") rendered too wide and wrapped
     lines PowerPoint keeps on one line. */
  if (firstRun && firstRun.spcPt && firstRun.sizePt) {
    tb.set('charSpacing', (firstRun.spcPt / firstRun.sizePt) * 1000);
  }
  /* WIDTH TOLERANCE (keep-original rule): the box HEIGHT budgets how many
     lines PowerPoint drew. If canvas wrapped into MORE lines, the font just
     measured a few px wider here than in PPT — PPT lets the line run over
     the box edge, it never re-wraps. Widen the measuring width (keeping the
     aligned edge) until the authored line count is restored; sizes stay
     SACRED. If even +28% can't restore it, it's a real wrap — put it back. */
  if (!el.wrapNone && el.h) {
    try {
      var pitchWT = firstLineHeight * (baseFontPt * 12700 * sx); /* = lineSpacingPts in px — PPT's true pitch, no fabric 1.13 */
      var expWT = Math.max(el.paragraphs.length, Math.round(Math.abs(el.h * sy) / Math.max(1, pitchWT)));
      var curWT = (tb.textLines || []).length, growWT = 0;
      while (curWT > expWT && growWT < 0.28) {
        growWT += 0.04;
        var nwWT = w * (1 + growWT);
        tb.set({ width: nwWT, left: align === 'center' ? left - (nwWT - w) / 2 : (align === 'right' ? left - (nwWT - w) : left) });
        if (typeof tb.initDimensions === 'function') tb.initDimensions();
        curWT = (tb.textLines || []).length;
      }
      if (curWT > expWT && growWT) {
        tb.set({ width: w, left: left });
        if (typeof tb.initDimensions === 'function') tb.initDimensions();
      }
    } catch (wtErr) { /* tolerance is best-effort */ }
  }
  /* FONT SIZE IS SACRED (Javed's rule): when RENDERING a file the engine
     NEVER alters a run's point size — original font or substitute; a wider
     substitute may wrap differently and that is acceptable and visible.
     The ONE exception (composer rule: "font-fit shrink only on re-fonted
     elements"): when the OWNER ordered "switch to free fonts", the swap is
     a deliberate re-typesetting — fit the swapped runs so the layout
     survives the different metrics. */
  var refonted2 = false;
  el.paragraphs.forEach(function (pR) { (pR.runs || []).forEach(function (rR) { if (rR.__refonted) refonted2 = true; }); });
  if (refonted2 && !el.wrapNone && el.h) {
    try {
      var boxHpx2 = Math.abs(el.h * sy);
      var pitchPx2 = firstLineHeight * (baseFontPt * 12700 * sx) * 1.13;
      var expLines = Math.max(el.paragraphs.length, Math.round(boxHpx2 / Math.max(1, pitchPx2)));
      var curLines = (tb.textLines || []).length;
      var shrinkAcc = 1;
      for (var fitIt = 0; fitIt < 7 && curLines > expLines && shrinkAcc > 0.6; fitIt++) {
        var stepR = 0.94; shrinkAcc *= stepR;
        tb.set({ fontSize: (tb.fontSize || 12) * stepR });
        /* every char of a run SHARES one style object — multiply each
           unique object ONCE, not once per character (a 209-char bio
           shrank 0.94^209 ≈ x0.000002 and "vanished") */
        var seenSt = [];
        Object.keys(tb.styles || {}).forEach(function (li2) {
          Object.keys(tb.styles[li2]).forEach(function (ci2) {
            var st2 = tb.styles[li2][ci2];
            if (st2.fontSize && seenSt.indexOf(st2) === -1) { seenSt.push(st2); st2.fontSize = st2.fontSize * stepR; }
          });
        });
        if (typeof tb.initDimensions === 'function') tb.initDimensions();
        curLines = (tb.textLines || []).length;
      }
    } catch (fitErr) { /* fit is best-effort */ }
  }
  /* run-level outerShdw (the WordArt look) → object shadow */
  if (firstRun && firstRun.shadow) {
    var tRad = firstRun.shadow.dir * Math.PI / 180, tD = firstRun.shadow.dist * sx;
    /* canvas shadowBlur fades over ~1.5x its nominal value (sigma = blur/2), while
       PPT blurRad IS the total fade width -> same number renders softer/wider on
       canvas. 0.6 calibration keeps the tight PowerPoint look (slide 1 audit). */
    tb.set('shadow', new fabric.Shadow({ color: firstRun.shadow.color, blur: firstRun.shadow.blur * sx * 0.6,
      offsetX: Math.cos(tRad) * tD, offsetY: Math.sin(tRad) * tD }));
  }
  if (el.wrapNone && tb.calcTextWidth) {
    /* wrap="none": natural width, positioned per PowerPoint's real rule —
       at the LEFT INSET of the shape (anchorCtr="0"), centered only when
       anchorCtr="1". This matches Steps-in-chevrons, digits-in-circles and
       label pills exactly as PowerPoint places them. */
    var natW = tb.calcTextWidth() + 6;
    var natLeft = el.anchorCtr ? (el.x * sx + (Math.abs(el.w * sx) - natW) / 2) : ((el.x + (el.insL != null ? el.insL : 91440)) * sx);
    tb.set({ width: Math.max(10, natW), left: natLeft, textAlign: 'left' });
  }
  var boxH = Math.abs(el.h * sy);
  if (el.bodyAnchor === 'ctr' || el.bodyAnchor === 'b') {
    var measuredH = tb.height || 0;
    if (el.bodyAnchor === 'ctr') tb.set('top', top + Math.max(0, (boxH - measuredH) / 2));
    else tb.set('top', top + Math.max(0, boxH - measuredH));
  }
  if (el.rot) {
    /* PowerPoint rotates the SHAPE BOX about its centre; fabric rotates the
       object about its own origin (top-left) — so rotated text drifted.
       Rotate the text block's centre around the box centre and re-anchor
       there. Exact for every bodyAnchor. */
    var bcx = (el.x + el.w / 2) * sx, bcy = (el.y + el.h / 2) * sy;
    var tcx = (tb.left || 0) + (tb.width || 0) / 2, tcy = (tb.top || 0) + (tb.height || 0) / 2;
    var rrad = el.rot * Math.PI / 180;
    var rdx = tcx - bcx, rdy = tcy - bcy;
    tb.set({ originX: 'center', originY: 'center',
      left: bcx + rdx * Math.cos(rrad) - rdy * Math.sin(rrad),
      top: bcy + rdx * Math.sin(rrad) + rdy * Math.cos(rrad) });
  }
  return tb;
}

function buildTableFromIR(el, sx, sy, fc) {
  var totalW = (el.cols || []).reduce(function (a, b) { return a + b; }, 0) || 1;
  var baseX = el.x * sx, baseY = el.y * sy, boxW = el.w * sx;
  var yCur = baseY;
  var rowIdx = 0;
  (el.rows || []).forEach(function (row) {
    var rowH = row.h * sy;
    var xCur = baseX;
    (row.cells || []).forEach(function (cell, ci) {
      var baseCw = boxW * ((el.cols[ci] || 0) / totalW);
      if (cell.merged) { xCur += baseCw; return; } /* continuation stub of a merge */
      var cw = baseCw;
      for (var sp = 1; sp < (cell.span || 1); sp++) cw += boxW * ((el.cols[ci + sp] || 0) / totalW);
      /* rowSpan: the cell's box covers ALL spanned rows */
      var ch2 = rowH;
      for (var rsp = 1; rsp < (cell.rowSpan || 1); rsp++) {
        var nxt = (el.rows[rowIdx + rsp]); if (nxt) ch2 += nxt.h * sy;
      }
      var fillCss = fillIRToFabric(cell.fill, cw, ch2) || 'rgba(0,0,0,0)';
      var strokeC = cell.border ? cell.border.color : (cell.styleStroke ? '#FFFFFF' : '');
      var strokeW = cell.border ? Math.max(1, cell.border.w * sx) : (cell.styleStroke ? 1.5 : 0);
      fc.add(new fabric.Rect({ left: xCur, top: yCur, width: cw, height: ch2, fill: fillCss, irTable: el.id,
        stroke: strokeC, strokeWidth: strokeW }));
      if (cell.diag) {
        var dpts = cell.diag.up ? [xCur, yCur + ch2, xCur + cw, yCur] : [xCur, yCur, xCur + cw, yCur + ch2];
        fc.add(new fabric.Line(dpts, { stroke: cell.diag.color, strokeWidth: Math.max(1, cell.diag.w * sx), irTable: el.id, selectable: false, evented: false }));
      }
      if (cell.paragraphs && cell.paragraphs.length) {
        var pseudoEl = { id: el.id + '-cell', origin: el.origin, x: (xCur + 4) / sx, y: (yCur + 4) / sy, w: (cw - 8) / sx, h: ch2 / sy, rot: 0, paragraphs: cell.paragraphs, bodyAnchor: 't' };
        var ctb = buildTextboxFromIR(pseudoEl, sx, sy);
        ctb.set({ fontSize: Math.min(ctb.fontSize, 16), irTable: el.id });
        if (cell.vert === 'vert270' || cell.vert === 'vert') {
          /* vertical cell text: rotate around the cell centre */
          ctb.set({ originX: 'center', originY: 'center',
            left: xCur + cw / 2, top: yCur + ch2 / 2,
            angle: cell.vert === 'vert270' ? -90 : 90, width: Math.max(10, ch2 - 8) });
        }
        fc.add(ctb);
      }
      xCur += baseCw;
    });
    yCur += rowH;
    rowIdx++;
  });
}

function loadFabricImageAsync(src) {
  return new Promise(function (resolve) { fabric.Image.fromURL(src, function (img) { resolve(img); }, { crossOrigin: 'anonymous' }); });
}

function resolveSvgInherit(svgText) {
  try {
    if (svgText.indexOf('inherit') === -1) return svgText;
    var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    var root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') return svgText;
    var SKIP = { defs:1, lineargradient:1, radialgradient:1, clippath:1, mask:1, pattern:1, symbol:1, filter:1, style:1 };
    function walk(node, fill, stroke) {
      if (node.nodeType !== 1) return;
      var tag = node.nodeName.toLowerCase();
      if (SKIP[tag]) return;
      var f = node.getAttribute('fill');
      var s = node.getAttribute('stroke');
      if (f === 'inherit') { node.setAttribute('fill', fill); f = fill; }
      if (s === 'inherit') { node.setAttribute('stroke', stroke); s = stroke; }
      if (f) fill = f;
      if (s) stroke = s;
      for (var c = node.firstChild; c; c = c.nextSibling) walk(c, fill, stroke);
    }
    var rootFill = root.getAttribute('fill') || '#000000';   /* SVG default paint */
    var rootStroke = root.getAttribute('stroke') || 'none';
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c, rootFill, rootStroke);
    return new XMLSerializer().serializeToString(root);
  } catch (e) { return svgText; }
}

function loadFabricSVGAsync(svgText) {
  return new Promise(function (resolve, reject) {
    try {
      fabric.loadSVGFromString(resolveSvgInherit(svgText), function (objects, options) {
        try {
          var g = fabric.util.groupSVGElements(objects, options);
          /* Canva BLEED-CROPS via the svg viewBox: paths extend past the
             declared window and the viewBox is the crop. Fabric ignores
             that — it bounds ALL content, so overflow art got SQUEEZED
             into the element box instead of bleeding off the slide.
             Record the viewBox so the renderer can scale by the WINDOW
             and clip the overflow (fabric normalizes the window to
             0,0..vbW,vbH via its viewBoxTransform). */
          var vbm = /viewBox\s*=\s*"([^"]+)"/.exec(svgText);
          if (vbm) {
            var p = vbm[1].trim().split(/[\s,]+/).map(Number);
            if (p.length === 4 && p[2] > 0 && p[3] > 0) g._ldViewBox = { x: p[0] || 0, y: p[1] || 0, w: p[2], h: p[3] };
          }
          /* SVG clipPath (Canva frames: a huge gradient slab CLIPPED to thin
             strips). Fabric drops group-level clip-paths — the slab painted
             SOLID over everything under it (gold rectangle over the photo).
             Capture the clip path's d so the renderer can re-apply it. */
          var cpm = /<g[^>]*clip-path="url\(#([^)"']+)\)"/.exec(svgText);
          if (cpm) {
            var cpBlock = new RegExp('<clipPath[^>]*id="' + cpm[1] + '"[^>]*>([\\s\\S]*?)</clipPath>').exec(svgText);
            var cpPath = cpBlock ? /<path[^>]*d="([^"]+)"/.exec(cpBlock[1]) : null;
            if (cpPath) g._ldClipD = cpPath[1];
          }
          resolve(g);
        } catch (e) { reject(e); }
      });
    } catch (e) { reject(e); }
  });
}

function bakeImageEffects(src, duo, featherFrac, colorKey) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';   /* cross-origin GCS images must not taint the effect canvas */
    img.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        if (colorKey) {
          var km = /^#?(..)(..)(..)/.exec(String(colorKey.from).replace('#', ''));
          if (km) {
            var kr = parseInt(km[1],16), kg = parseInt(km[2],16), kb = parseInt(km[3],16);
            var TOL = 24; /* PowerPoint keys near-exact matches */
            var ik = g.getImageData(0, 0, c.width, c.height), dk = ik.data;
            for (var p = 0; p < dk.length; p += 4) {
              if (Math.abs(dk[p]-kr) <= TOL && Math.abs(dk[p+1]-kg) <= TOL && Math.abs(dk[p+2]-kb) <= TOL) {
                dk[p+3] = Math.round(255 * (colorKey.toAlpha || 0));
              }
            }
            g.putImageData(ik, 0, 0);
          }
        }
        if (duo) {
          function rgb(css) { var m = /^#?(..)(..)(..)/.exec(css.replace('#', '')); return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [0,0,0]; }
          var A = rgb(duo.c1), B = rgb(duo.c2);
          var im = g.getImageData(0, 0, c.width, c.height), d = im.data;
          for (var i = 0; i < d.length; i += 4) {
            var t = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114) / 255;
            d[i] = A[0] + (B[0] - A[0]) * t; d[i+1] = A[1] + (B[1] - A[1]) * t; d[i+2] = A[2] + (B[2] - A[2]) * t;
          }
          g.putImageData(im, 0, 0);
        }
        if (featherFrac) {
          var f = Math.max(2, Math.round(Math.min(c.width, c.height) * featherFrac));
          var m2 = document.createElement('canvas'); m2.width = c.width; m2.height = c.height;
          var g2 = m2.getContext('2d');
          g2.shadowColor = '#ffffff'; g2.shadowBlur = f; g2.fillStyle = '#ffffff';
          g2.fillRect(f, f, c.width - 2 * f, c.height - 2 * f);
          g2.fillRect(f, f, c.width - 2 * f, c.height - 2 * f); /* double pass = denser core */
          g.globalCompositeOperation = 'destination-in';
          g.drawImage(m2, 0, 0);
        }
        resolve(c.toDataURL('image/png'));
      } catch (e) { resolve(src); }
    };
    img.onerror = function () { resolve(src); };
    img.src = src;
  });
}

function linkedImagePlaceholder(left, top, w, h, fc, el) {
  var box = new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: '#FFFFFF', stroke: '#9AA4B2', strokeWidth: 1.5 });
  var xr = new fabric.Text('✕', { left: 8, top: 6, fontSize: Math.max(12, h * 0.12), fill: '#C00000', fontFamily: 'Arial' });
  var tx = new fabric.Textbox('The linked image cannot be displayed. The file may have been moved, renamed, or deleted.', {
    left: w * 0.12, top: h * 0.12, width: w * 0.78, fontSize: Math.max(10, Math.min(16, h * 0.09)), fill: '#333333', fontFamily: 'Arial' });
  var g = new fabric.Group([box, xr, tx], { left: left, top: top, irId: el.id, irOrigin: el.origin });
  fc.add(g);
}

function brokenImagePlaceholder(left, top, w, h, fc, el) {
  var box = new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: '#FFFFFF', stroke: '#9AA4B2', strokeWidth: 1.5 });
  var xr = new fabric.Text('\u2715', { left: 8, top: 6, fontSize: Math.max(12, h * 0.12), fill: '#C00000', fontFamily: 'Arial' });
  var tx = new fabric.Textbox("The picture can't be displayed.", {
    left: w * 0.12, top: h * 0.1, width: w * 0.78, fontSize: Math.max(10, Math.min(16, h * 0.09)), fill: '#333333', fontFamily: 'Arial' });
  var g = new fabric.Group([box, xr, tx], { left: left, top: top, irId: el.id, irOrigin: el.origin });
  fc.add(g);
}

async function renderImageElementIR(el, sx, sy, fc) {
  /* STALE-RENDER GUARD (slide-bleed audit): this renderer AWAITS image
     downloads. If the user switches page mid-download, the old slide's
     pending images must NOT land on the new slide's canvas. Capture the
     canvas render generation at entry; every fc.add below is skipped when
     a newer page render has since taken ownership of the canvas. */
  var __g0 = fc ? fc.__ldRenderGen : undefined;
  var __live = function () { return !fc || fc.__ldRenderGen === __g0; };
  var left = el.x * sx, top = el.y * sy, w = Math.abs(el.w * sx), h = Math.abs(el.h * sy);
  /* TIFF: decode to PNG through UTIF when the library is present */
  if (el.format === 'tiff' && typeof UTIF !== 'undefined') {
    try {
      var tb64 = el.src.split(',')[1];
      var tbin = atob(tb64), tbuf = new Uint8Array(tbin.length);
      for (var tbI = 0; tbI < tbin.length; tbI++) tbuf[tbI] = tbin.charCodeAt(tbI);
      var ifds = UTIF.decode(tbuf.buffer); UTIF.decodeImage(tbuf.buffer, ifds[0]);
      var rgba = UTIF.toRGBA8(ifds[0]);
      var tcv = document.createElement('canvas'); tcv.width = ifds[0].width; tcv.height = ifds[0].height;
      var tg = tcv.getContext('2d'), tid = tg.createImageData(tcv.width, tcv.height);
      tid.data.set(rgba); tg.putImageData(tid, 0, 0);
      el = Object.assign({}, el, { format: 'png', src: tcv.toDataURL('image/png') });
    } catch (te) { console.warn('TIFF decode failed', te); }
  }
  /* formats no browser draws: PowerPoint-style frame (original bytes kept) */
  if (el.format === 'emf' || el.format === 'wmf' || el.format === 'eps' || el.format === 'tiff') {
    brokenImagePlaceholder(left, top, w, h, fc, el);
    return;
  }
  /* ═══ CANVA FRAME (Element 106): picture-fill shape with CUSTOM GEOMETRY.
     The photo is drawn cover-fit (honouring the negative-inset fillRect that
     Canva writes) onto a canvas, then clipped by the true bezier path — the
     circle/diamond/blob masks render exactly as Canva shows them. */
  if (el.geom && el.geom.custom && el.geom.custom.pathCmds && el.src && el.format !== 'svg' && !el.tile) {
    var fimg = await new Promise(function (res) {
      var fi = new Image(); fi.crossOrigin = 'anonymous'; fi.onload = function () { res(fi); }; fi.onerror = function () { res(null); };
      fi.src = el.src;
    });
    if (fimg) {
      var fcv = document.createElement('canvas');
      fcv.width = Math.max(2, Math.round(w)); fcv.height = Math.max(2, Math.round(h));
      var fg = fcv.getContext('2d');
      var fr = el.frect;
      if (fr) {
        /* PPT stretch fillRect: insets as fractions of the shape (negative = photo
           overflows the mask = Canva cover-crop) */
        var dx = fcv.width * fr.l, dy = fcv.height * fr.t;
        var dw = fcv.width * (1 - fr.l - fr.r), dh = fcv.height * (1 - fr.t - fr.b);
        fg.drawImage(fimg, dx, dy, dw, dh);
      } else {
        /* no/empty fillRect = PPT <a:stretch>: STRETCH to the shape box.
           Cover-fit here drew the Laugh-deck squiggle 27% wider (cropped
           sides, features shifted). Canva photo frames always write an
           explicit negative-inset fillRect, so they take the branch above. */
        fg.drawImage(fimg, 0, 0, fcv.width, fcv.height);
      }
      var cg2 = el.geom.custom, fkx = w / (cg2.pathW || 1), fky = h / (cg2.pathH || 1);
      var fd = cg2.pathCmds.map(function (c) {
        if (c[0] === 'Z') return 'Z';
        var fo = [c[0]];
        for (var fj = 1; fj < c.length; fj += 2) fo.push(c[fj] * fkx, c[fj + 1] * fky);
        return fo.join(' ');
      }).join(' ');
      var fpath = new fabric.Path(fd, {
        fill: new fabric.Pattern({ source: fcv, repeat: 'no-repeat' }),
        stroke: el.spStroke ? el.spStroke.color : '',
        strokeWidth: el.spStroke ? Math.max(1, el.spStroke.w * sx) : 0,
        opacity: el.opacity == null ? 1 : el.opacity,
        selectable: false, evented: false
      });
      var fgrp = new fabric.Group([fpath], { left: left, top: top, angle: el.rot || 0,
        irId: el.id, irOrigin: el.origin, flipX: !!el.flipH, flipY: !!el.flipV });
      fgrp.isFrame = true; fgrp._sx = sx; fgrp._sy = sy;
      applyCenterRotation(fgrp, el, sx, sy);
      if (__live()) fc.add(fgrp);
      return;
    }
  }

  /* picture/texture-fill SHAPES (tile, border or rounded corners): painted
     as a fabric.Rect with a Pattern fill so radius+stroke render natively;
     wrapped in a group so edit-sync reuses the original image IR */
  if ((el.tile || el.spStroke || (el.geom && el.geom.preset === 'roundRect')) && el.src && el.format !== 'svg') {
    var pimg = await new Promise(function (res) {
      var im2 = new Image(); im2.crossOrigin = 'anonymous'; im2.onload = function () { res(im2); }; im2.onerror = function () { res(null); };
      im2.src = el.src;
    });
    if (pimg) {
      var pcv2 = document.createElement('canvas');
      if (el.tile) {
        pcv2.width = Math.max(1, Math.round(pimg.width * el.tile.sx));
        pcv2.height = Math.max(1, Math.round(pimg.height * el.tile.sy));
        pcv2.getContext('2d').drawImage(pimg, 0, 0, pcv2.width, pcv2.height);
      } else {
        pcv2.width = Math.max(1, Math.round(w)); pcv2.height = Math.max(1, Math.round(h));
        pcv2.getContext('2d').drawImage(pimg, 0, 0, pcv2.width, pcv2.height);
      }
      var rxv = (el.geom && el.geom.preset === 'roundRect') ? Math.min(w, h) * 0.1667 : 0;
      var prect = new fabric.Rect({ left: 0, top: 0, width: w, height: h, rx: rxv, ry: rxv,
        fill: new fabric.Pattern({ source: pcv2, repeat: el.tile ? 'repeat' : 'no-repeat' }),
        stroke: el.spStroke ? el.spStroke.color : '', strokeWidth: el.spStroke ? Math.max(1, el.spStroke.w * sx) : 0,
        opacity: el.opacity == null ? 1 : el.opacity });
      var pgrp = new fabric.Group([prect], { left: left, top: top, angle: el.rot || 0, irId: el.id, irOrigin: el.origin });
      applyCenterRotation(pgrp, el, sx, sy);
      if (__live()) fc.add(pgrp);
      return;
    }
  }
  if (el.format === 'extlink') {
    /* try the external source; placeholder frame if unreachable */
    var extImg = await new Promise(function (res) {
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = el.src;
      setTimeout(function () { res(null); }, 6000);
    });
    if (!extImg) { linkedImagePlaceholder(left, top, w, h, fc, el); return; }
  }
  /* Full-bleed background/cover images: overscan 1px so float rounding can
     never let the white canvas base peek out at a slide edge — this was the
     recurring white hairline at the bottom of every dark slide. */
  var cwFB = fc._baseWidth || 0, chFB = fc._baseHeight || 0;
  var tolFB = Math.max(8, cwFB * 0.006);
  var isFullBleed = false;
  if (cwFB && chFB && left <= tolFB && top <= tolFB && w >= cwFB - tolFB && h >= chFB - tolFB) {
    left = -1; top = -1; w = cwFB + 2; h = chFB + 2; isFullBleed = true;
  }
  var obj = null;
  if (el.format === 'svg' && el.svgText) {
    try { obj = await loadFabricSVGAsync(el.svgText); }
    catch (e) { console.warn('SVG render failed, falling back to raster', e); }
  }
  if (obj) {
    var bw = obj.width || 1, bh = obj.height || 1;
    /* ═══ SVG WINDOW SEMANTICS (PowerPoint/Canva) ═══
       The element box is a WINDOW, not the artwork bounds:
       1. <a:stretch><a:fillRect> with NEGATIVE insets inflates the svg far
          beyond the box (slide 4 hexagons: l=-171%, b=-66%) and the box
          CROPS it — the raster branch always did this; the svg branch
          ignored it, so inflated art got SQUEEZED into the box.
       2. The svg's own viewBox is the artwork's viewport: content outside
          it is cropped by the viewport, content bounds ≠ viewport.
       Scale by the VIEWPORT, place by the fillRect window, clip to
       (shape box ∩ image rect). Bleed off-slide happens naturally when
       the shape box itself crosses the slide edge. */
    var vbW = (obj._ldViewBox && obj._ldViewBox.w) || bw;
    var vbH = (obj._ldViewBox && obj._ldViewBox.h) || bh;
    var fr3 = el.frect;
    var needWindow = !!fr3 || bw > vbW * 1.02 || bh > vbH * 1.02 || obj.left < -vbW * 0.02 || obj.top < -vbH * 0.02;
    if (needWindow) {
      var fL3 = fr3 ? fr3.l : 0, fT3 = fr3 ? fr3.t : 0, fR3 = fr3 ? fr3.r : 0, fB3 = fr3 ? fr3.b : 0;
      var imgX3 = left + fL3 * w, imgY3 = top + fT3 * h;
      var imgW3 = Math.max(1, w * (1 - fL3 - fR3)), imgH3 = Math.max(1, h * (1 - fT3 - fB3));
      var scX3 = imgW3 / vbW, scY3 = imgH3 / vbH;
      /* PPT order: window the content INSIDE the box, THEN flip the box.
         flipH/flipV therefore MIRROR the fillRect window within the box
         (slide 1 audit: fillRect b=-48% + flipV = artwork extends UP, the
         unflipped math drew it 49% too LOW), and mirror the artwork's
         offset inside its viewBox window too. */
      var fx3 = !!el.flipH, fy3 = !!el.flipV;
      if (fx3) imgX3 = 2 * left + w - imgX3 - imgW3;
      if (fy3) imgY3 = 2 * top + h - imgY3 - imgH3;
      /* fabric's svg parser already normalizes coordinates to the viewBox
         origin (translate(-minX,-minY)) — obj.left/top are 0-based in the
         viewport. Subtracting the min again DOUBLE-shifted (SAM icon,
         viewBox x=21.6, drew 68px left = "half logo"). */
      var offXvb = fx3 ? (vbW - (obj.left + bw)) : obj.left;
      var offYvb = fy3 ? (vbH - (obj.top + bh)) : obj.top;
      var vx0s = Math.max(left, imgX3), vy0s = Math.max(top, imgY3);
      var vx1s = Math.min(left + w, imgX3 + imgW3), vy1s = Math.min(top + h, imgY3 + imgH3);
      if (vx1s > vx0s && vy1s > vy0s) {
        /* the svg's OWN clipPath outranks the viewBox window (it IS the
           design's crop — Canva frame strips); capture centre while obj
           still holds its svg-space bounds */
        var ownClip = null;
        if (obj._ldClipD) {
          try {
            ownClip = new fabric.Path(obj._ldClipD);
            ownClip.set({ left: ownClip.left - (obj.left + bw / 2), top: ownClip.top - (obj.top + bh / 2) });
          } catch (ce) { ownClip = null; }
        }
        var gLeft = imgX3 + offXvb * scX3, gTop = imgY3 + offYvb * scY3;
        obj.set({ left: gLeft, top: gTop, angle: el.rot || 0, scaleX: scX3, scaleY: scY3,
          flipX: fx3, flipY: fy3, irId: el.id, irOrigin: el.origin,
          svgText: el.svgText, perPixelTargetFind: true,
          opacity: el.opacity == null ? 1 : el.opacity });
        var gcx = gLeft + (bw * scX3) / 2, gcy = gTop + (bh * scY3) / 2;
        /* clipPath lives in object-local space and MIRRORS with the object —
           convert the world window through the flip so it stays put */
        obj.clipPath = ownClip || new fabric.Rect({
          left: fx3 ? (gcx - vx1s) / scX3 : (vx0s - gcx) / scX3,
          top: fy3 ? (gcy - vy1s) / scY3 : (vy0s - gcy) / scY3,
          width: (vx1s - vx0s) / scX3, height: (vy1s - vy0s) / scY3 });
        if (el.rot) {
          /* PPT rotates the WINDOWED result about the BOX centre. The
             generic applyCenterRotation() snaps the object to the box
             centre — correct only when bounds == box; here the content
             centre is offset by the window, so rotate THAT POINT about the
             box centre instead (caution-tape audit: rot 74°/-151° tapes
             collapsed onto their box centres and "squeezed"). */
          var bcx3 = left + w / 2, bcy3 = top + h / 2;
          var rr3 = el.rot * Math.PI / 180;
          var rdx3 = gcx - bcx3, rdy3 = gcy - bcy3;
          obj.set({ originX: 'center', originY: 'center',
            left: bcx3 + rdx3 * Math.cos(rr3) - rdy3 * Math.sin(rr3),
            top: bcy3 + rdx3 * Math.sin(rr3) + rdy3 * Math.cos(rr3) });
        }
        if (el.media) obj.set({ mediaSrc: el.media.src, mediaKind: el.media.kind });
        if (__live()) fc.add(obj);
        return;
      }
    }
    /* perPixelTargetFind: clicks only register on actual drawn pixels, so a
       huge decorative SVG's empty bounding box no longer swallows clicks
       meant for the text/objects beneath it. */
    if (obj._ldClipD) {
      try {
        var ownClip2 = new fabric.Path(obj._ldClipD);
        ownClip2.set({ left: ownClip2.left - (obj.left + bw / 2), top: ownClip2.top - (obj.top + bh / 2) });
        obj.clipPath = ownClip2;
      } catch (ce2) {}
    }
    if (obj._ldViewBox) {
      /* PPT maps the svg VIEWBOX onto the shape box — scaling by content
         bounds distorts aspect whenever the artwork has viewport padding
         (round flower in a 1.15:1 viewBox rendered PRESSED). Scale by the
         viewport and offset the content by its position inside it. */
      var scX4 = w / vbW, scY4 = h / vbH;
      var offX4 = el.flipH ? (vbW - (obj.left + bw)) : obj.left;
      var offY4 = el.flipV ? (vbH - (obj.top + bh)) : obj.top;
      var gL4 = left + offX4 * scX4, gT4 = top + offY4 * scY4;
      obj.set({ left: gL4, top: gT4, angle: el.rot || 0, scaleX: scX4, scaleY: scY4, flipX: !!el.flipH, flipY: !!el.flipV, irId: el.id, irOrigin: el.origin, svgText: el.svgText, perPixelTargetFind: true, opacity: el.opacity == null ? 1 : el.opacity });
      if (el.rot) {
        var bcx4 = left + w / 2, bcy4 = top + h / 2, rr4 = el.rot * Math.PI / 180;
        var gcx4 = gL4 + (bw * scX4) / 2, gcy4 = gT4 + (bh * scY4) / 2;
        var rdx4 = gcx4 - bcx4, rdy4 = gcy4 - bcy4;
        obj.set({ originX: 'center', originY: 'center',
          left: bcx4 + rdx4 * Math.cos(rr4) - rdy4 * Math.sin(rr4),
          top: bcy4 + rdx4 * Math.sin(rr4) + rdy4 * Math.cos(rr4) });
      }
    } else {
      obj.set({ left: left, top: top, angle: el.rot || 0, scaleX: w / bw, scaleY: h / bh, flipX: !!el.flipH, flipY: !!el.flipV, irId: el.id, irOrigin: el.origin, svgText: el.svgText, perPixelTargetFind: true, opacity: el.opacity == null ? 1 : el.opacity });
      applyCenterRotation(obj, el, sx, sy);
    }
  } else {
    var effSrc = el.src;
    if (el.duotone || el.softEdge || el.colorKey) {
      /* feather radius as a fraction of the displayed size → image space */
      var fFrac = el.softEdge ? (el.softEdge * sx) / Math.max(1, Math.min(w, h)) : 0;
      effSrc = await bakeImageEffects(el.src, el.duotone, fFrac, el.colorKey);
    }
    try { obj = await loadFabricImageAsync(effSrc); }
    catch (le) { brokenImagePlaceholder(left, top, w, h, fc, el); return; }
    var natW = obj.width || 1, natH = obj.height || 1;
    var cr = el.crop, fr2 = el.frect;
    if (cr || fr2) {
      /* source-crop window (srcRect) */
      var sL = cr ? cr.l : 0, sT = cr ? cr.t : 0, sR = cr ? cr.r : 0, sB = cr ? cr.b : 0;
      var srcX = sL * natW, srcY = sT * natH;
      var srcW = Math.max(1, natW * (1 - sL - sR)), srcH = Math.max(1, natH * (1 - sT - sB));
      /* fillRect: where the (cropped) image sits relative to the shape box */
      var fL = fr2 ? fr2.l : 0, fT = fr2 ? fr2.t : 0, fR = fr2 ? fr2.r : 0, fB = fr2 ? fr2.b : 0;
      var imgX = left + fL * w, imgY = top + fT * h;
      var imgW = Math.max(1, w * (1 - fL - fR)), imgH = Math.max(1, h * (1 - fT - fB));
      /* clip the image rect to the shape window */
      var vx0 = Math.max(imgX, left), vy0 = Math.max(imgY, top);
      var vx1 = Math.min(imgX + imgW, left + w), vy1 = Math.min(imgY + imgH, top + h);
      if (vx1 - vx0 > 0.5 && vy1 - vy0 > 0.5) {
        var u0 = (vx0 - imgX) / imgW, u1 = (vx1 - imgX) / imgW;
        var v0 = (vy0 - imgY) / imgH, v1 = (vy1 - imgY) / imgH;
        var cX = srcX + u0 * srcW, cY = srcY + v0 * srcH;
        var cW = Math.max(1, (u1 - u0) * srcW), cH = Math.max(1, (v1 - v0) * srcH);
        obj.set({ cropX: cX, cropY: cY, width: cW, height: cH,
          left: vx0, top: vy0, angle: el.rot || 0,
          scaleX: (vx1 - vx0) / cW, scaleY: (vy1 - vy0) / cH,
          flipX: !!el.flipH, flipY: !!el.flipV, irId: el.id, irOrigin: el.origin,
          perPixelTargetFind: true,
          opacity: el.opacity == null ? 1 : el.opacity });
        applyCenterRotation(obj, el, sx, sy);
        fc.add(obj);
        return;
      }
    }
    obj.set({ left: left, top: top, angle: el.rot || 0, scaleX: obj.width ? w / obj.width : 1, scaleY: obj.height ? h / obj.height : 1, flipX: !!el.flipH, flipY: !!el.flipV, irId: el.id, irOrigin: el.origin, perPixelTargetFind: true, opacity: el.opacity == null ? 1 : el.opacity });
    applyCenterRotation(obj, el, sx, sy);
  }
  /* full-bleed background: not click-selectable in Design mode (empty-space
     clicks were selecting it), Editing mode re-enables via the isBg flag */
  if (isFullBleed) obj.set({ isBg: true, selectable: false, evented: false });
  if (el.media) obj.set({ mediaSrc: el.media.src, mediaKind: el.media.kind });
  fc.add(obj);
}

function dashArrayFor(dashVal, w) {
  switch (dashVal) {
    case 'dot': case 'sysDot': return [w, w * 2.2];
    case 'sysDash':            return [w * 3, w];
    case 'dash':               return [w * 4, w * 3];
    case 'lgDash':             return [w * 8, w * 3];
    case 'dashDot': case 'sysDashDot': return [w * 4, w * 3, w, w * 3];
    case 'lgDashDot':          return [w * 8, w * 3, w, w * 3];
    case 'lgDashDotDot': case 'sysDashDotDot': return [w * 8, w * 3, w, w * 3, w, w * 3];
    default:                   return [w * 3, w * 2];
  }
}

function applyCenterRotation(obj, el, sx, sy) {
  if (!el.rot) return;
  obj.set({
    originX: 'center', originY: 'center',
    left: (el.x + el.w / 2) * sx,
    top: (el.y + el.h / 2) * sy
  });
}

function renderShapeElementIR(el, sx, sy, fc) {
  var left = el.x * sx, top = el.y * sy, w = Math.abs(el.w * sx), h = Math.abs(el.h * sy);
  /* same overscan for full-bleed unstroked cover shapes (see image renderer) */
  var cwFB = fc._baseWidth || 0, chFB = fc._baseHeight || 0;
  var tolFB = Math.max(8, cwFB * 0.006);
  var isFullBleedSp = false;
  if (!el.stroke && cwFB && chFB && left <= tolFB && top <= tolFB && w >= cwFB - tolFB && h >= chFB - tolFB) {
    left = -1; top = -1; w = cwFB + 2; h = chFB + 2; isFullBleedSp = true;
  }
  var common = { left: left, top: top, angle: el.rot || 0, originX: 'left', originY: 'top', flipX: !!el.flipH, flipY: !!el.flipV, irId: el.id, irOrigin: el.origin, fill: fillIRToFabric(el.fill, w, h) };
  if (el.stroke) { common.stroke = el.stroke.color; common.strokeWidth = Math.max(1, el.stroke.w * sx); }
  if (el.stroke && el.stroke.dash && el.stroke.dash !== 'solid') { var dw = Math.max(1, el.stroke.w * sx); common.strokeDashArray = dashArrayFor(el.stroke.dash, dw); }
  if (el.geom && el.geom.preset === 'donut') common.fillRule = 'evenodd';
  if (el.rot) { common.originX = 'center'; common.originY = 'center'; common.left = (el.x + el.w / 2) * sx; common.top = (el.y + el.h / 2) * sy; }
  var prst = el.geom && el.geom.preset;
  var obj;
  if (el.geom && el.geom.custom) {
    /* True vector path from custGeom: scale path-space coords to element px. */
    var cg = el.geom.custom, kx = w / (cg.pathW || 1), ky = h / (cg.pathH || 1);
    var d = cg.pathCmds.map(function (c) {
      if (c[0] === 'Z') return 'Z';
      if (c[0] === 'A') return 'A ' + (c[1] * kx) + ' ' + (c[2] * ky) + ' 0 ' + c[3 + 1] + ' ' + c[5] + ' ' + (c[6] * kx) + ' ' + (c[7] * ky);
      var out = [c[0]];
      for (var j = 1; j < c.length; j += 2) { out.push(c[j] * kx, c[j + 1] * ky); }
      return out.join(' ');
    }).join(' ');
    obj = new fabric.Path(d, common);
    if (!el.rot) obj.set({ left: left, top: top }); /* rotated paths keep the center-origin coords set in `common` */
  }
  else if (/^actionButton/.test(prst)) {
    var GLYPHS = {
      actionButtonBackPrevious: function (gw, gh) { return 'M ' + (gw*0.72) + ' ' + (gh*0.2) + ' L ' + (gw*0.24) + ' ' + (gh*0.5) + ' L ' + (gw*0.72) + ' ' + (gh*0.8) + ' Z'; },
      actionButtonForwardNext: function (gw, gh) { return 'M ' + (gw*0.28) + ' ' + (gh*0.2) + ' L ' + (gw*0.76) + ' ' + (gh*0.5) + ' L ' + (gw*0.28) + ' ' + (gh*0.8) + ' Z'; },
      actionButtonHome: function (gw, gh) {
        return 'M ' + (gw*0.5) + ' ' + (gh*0.13) + ' L ' + (gw*0.88) + ' ' + (gh*0.48) + ' L ' + (gw*0.12) + ' ' + (gh*0.48) + ' Z ' +
               'M ' + (gw*0.22) + ' ' + (gh*0.5) + ' L ' + (gw*0.78) + ' ' + (gh*0.5) + ' L ' + (gw*0.78) + ' ' + (gh*0.85) + ' L ' + (gw*0.22) + ' ' + (gh*0.85) + ' Z ' +
               'M ' + (gw*0.43) + ' ' + (gh*0.62) + ' L ' + (gw*0.57) + ' ' + (gh*0.62) + ' L ' + (gw*0.57) + ' ' + (gh*0.85) + ' L ' + (gw*0.43) + ' ' + (gh*0.85) + ' Z';
      }
    };
    function darkOf(css) {
      var m2 = /^#?(..)(..)(..)/.exec(String(css || '#4472C4').replace('#', ''));
      if (!m2) return '#1F3864';
      function d2(hx) { return ('0' + Math.round(parseInt(hx, 16) * 0.45).toString(16)).slice(-2); }
      return '#' + d2(m2[1]) + d2(m2[2]) + d2(m2[3]);
    }
    var face = new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: common.fill, stroke: common.stroke || '', strokeWidth: common.strokeWidth || 0, selectable: false, evented: false });
    var gFn = GLYPHS[prst] || null;
    var parts2 = [face];
    if (gFn) parts2.push(new fabric.Path(gFn(w, h), { fill: darkOf(typeof common.fill === 'string' ? common.fill : null), stroke: '', fillRule: 'evenodd', selectable: false, evented: false }));
    obj = new fabric.Group(parts2, { irId: el.id, irOrigin: el.origin, flipX: !!el.flipH, flipY: !!el.flipV, angle: el.rot || 0 });
    obj.set({ left: left, top: top });
  }
  else if (prst === 'arc') {
    /* PowerPoint fills an arc as the PIE SECTOR but strokes only the curve —
       a single path can't do both, so: sector-fill path + arc-only stroke */
    var aj = el.geom && el.geom.adj;
    var aa1 = ((aj && aj.adj1 != null ? aj.adj1 : 16200000) / 60000) * Math.PI / 180;
    var aa2 = ((aj && aj.adj2 != null ? aj.adj2 : 0) / 60000) * Math.PI / 180;
    var acx = w / 2, acy = h / 2, arx = w / 2, ary = h / 2;
    var ax1 = acx + arx * Math.cos(aa1), ay1 = acy + ary * Math.sin(aa1);
    var ax2 = acx + arx * Math.cos(aa2), ay2 = acy + ary * Math.sin(aa2);
    var asw = (aa2 - aa1 + Math.PI * 2) % (Math.PI * 2);
    var alg = asw > Math.PI ? 1 : 0;
    var arcSeg = ' A ' + arx + ' ' + ary + ' 0 ' + alg + ' 1 ' + ax2 + ' ' + ay2;
    var fillP = new fabric.Path('M ' + acx + ' ' + acy + ' L ' + ax1 + ' ' + ay1 + arcSeg + ' Z',
      { fill: common.fill, stroke: '', selectable: false, evented: false });
    var strokeP = new fabric.Path('M ' + ax1 + ' ' + ay1 + arcSeg,
      { fill: '', stroke: common.stroke || '', strokeWidth: common.strokeWidth || 0, strokeDashArray: common.strokeDashArray, selectable: false, evented: false });
    obj = new fabric.Group([fillP, strokeP], { irId: el.id, irOrigin: el.origin, flipX: !!el.flipH, flipY: !!el.flipV, angle: el.rot || 0 });
    /* the group tightens to the sector's visible bounds — anchor it at the
       sector's true offset INSIDE the shape box, not at the box corner
       (it was sliding left/up by the empty half of the ellipse) */
    var bMinX = acx, bMinY = acy, bPts = [[ax1, ay1], [ax2, ay2]];
    for (var tSt = 0; tSt <= 16; tSt++) { var ta = aa1 + asw * tSt / 16; bPts.push([acx + arx * Math.cos(ta), acy + ary * Math.sin(ta)]); }
    bPts.forEach(function (pp) { bMinX = Math.min(bMinX, pp[0]); bMinY = Math.min(bMinY, pp[1]); });
    obj.set({ left: left + bMinX, top: top + bMinY });
  }
  else if (PRESET_PATHS[prst]) {
    obj = new fabric.Path(PRESET_PATHS[prst](w, h, el.geom && el.geom.adj), common);
    if (!el.rot) obj.set({ left: left, top: top });
  }
  else if (prst === 'ellipse' || prst === 'circle') obj = new fabric.Ellipse(Object.assign(common, { rx: w / 2, ry: h / 2 }));
  else if (prst === 'triangle') obj = new fabric.Triangle(Object.assign(common, { width: w, height: h }));
  else if (prst === 'roundRect') obj = new fabric.Rect(Object.assign(common, { width: w, height: h, rx: Math.min(w, h) * 0.1667, ry: Math.min(w, h) * 0.1667 })); /* PowerPoint default corner = 1/6 of min side */
  else obj = new fabric.Rect(Object.assign(common, { width: w, height: h }));
  if (isFullBleedSp) obj.set({ isBg: true, selectable: false, evented: false });
  if (el.__isBody) obj.set({ irBody: true }); /* text-body twin: excluded from export (the text element re-emits fill+stroke itself) */
  if (el.shadow) {
    var shRad = el.shadow.dir * Math.PI / 180, shD = el.shadow.dist * sx;
    obj.set('shadow', new fabric.Shadow({ color: el.shadow.color, blur: el.shadow.blur * sx,
      offsetX: Math.cos(shRad) * shD, offsetY: Math.sin(shRad) * shD }));
  }
  fc.add(obj);
  if (el.glow) {
    var _gRad = Math.max(2, (el.glow.rad || 101600) * sx), _gCol = el.glow.color || 'rgba(255,165,0,0.7)';
    obj.set({ irHasGlow: true, irGlowRadPx: _gRad, irGlowColor: _gCol });
    try { _makeGlow(obj, { id: el.id, radPx: _gRad, color: _gCol }, fc); } catch (eG) { console.warn('glow build failed', eG); }
  }
  if (el.softEdge) {
    var _seRad = Math.max(1, el.softEdge * sx);
    obj.set({ irHasSoft: true, irSoftRadPx: _seRad, opacity: 0, shadow: null });
    try { _makeSoftEdge(obj, { id: el.id, radPx: _seRad }, fc); } catch (eS) { console.warn('softEdge build failed', eS); }
  }
  if (el.reflection) {
    obj.set('irHasRefl', true);
    try { _makeReflection(obj, el, sx, sy, fc); } catch (eR) { console.warn('reflection build failed', eR); }
  }
}

function _makeSoftEdge(obj, params, fc) {
  var radPx = Math.max(1, params.radPx || 4), elId = params.id;
  var pg0 = (typeof state !== 'undefined' && typeof currentPageObj === 'function') ? currentPageObj() : null;
  var pageOk = function () { return !pg0 || (typeof currentPageObj === 'function' && currentPageObj() === pg0); };
  obj.clone(function (c) {
    c.set({ shadow: null, opacity: 1 });
    var MULT = 2;
    var src = c.toDataURL({ format: 'png', multiplier: MULT });
    var img = new Image();
    img.onload = function () {
      var padR = Math.round(radPx * 1.5 * MULT);
      var cv = document.createElement('canvas');
      cv.width = img.width + padR * 2; cv.height = img.height + padR * 2;
      var g = cv.getContext('2d');
      g.filter = 'blur(' + Math.round(radPx * MULT * 0.6) + 'px)';
      g.drawImage(img, padR, padR);
      fabric.Image.fromURL(cv.toDataURL('image/png'), function (mimg) {
        if (!pageOk()) return;
        var w = obj.getScaledWidth(), h = obj.getScaledHeight();
        var pad = padR / MULT;
        mimg.set({ left: obj.left - pad, top: obj.top - pad,
          scaleX: (w + pad * 2) / mimg.width, scaleY: (h + pad * 2) / mimg.height,
          selectable: false, evented: false, irBody: true,
          irSoftOf: elId, softPad: pad, angle: obj.angle || 0 });
        fc.getObjects().slice().forEach(function (o2) { if (o2.irSoftOf === elId && o2 !== mimg) fc.remove(o2); });
        fc.add(mimg);
        mimg.moveTo(Math.max(0, fc.getObjects().indexOf(obj)));
        fc.renderAll();
      });
    };
    img.src = src;
  }, FABRIC_JSON_PROPS);
}

function _makeReflection(obj, el, sx, sy, fc) {
  var refl = el.reflection || {};
  var startA = Math.min(1, refl.alpha != null ? refl.alpha : 0.5);
  var gapPx = ((refl.dist || 0) * sy) + 2;
  /* the raster is built ASYNC — remember which page asked for it, and drop
     the result if the user has switched pages meanwhile (otherwise the
     reflection would land on the wrong slide's canvas) */
  var pg0 = (typeof state !== 'undefined' && typeof currentPageObj === 'function') ? currentPageObj() : null;
  var pageOk = function () { return !pg0 || (typeof currentPageObj === 'function' && currentPageObj() === pg0); };
  obj.clone(function (c) {
    c.set({ shadow: null, opacity: 1 });
    var mult = 2;
    var src = c.toDataURL({ format: 'png', multiplier: mult });
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      var g = cv.getContext('2d');
      g.translate(0, cv.height); g.scale(1, -1);
      g.drawImage(img, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      var grad = g.createLinearGradient(0, 0, 0, cv.height);
      grad.addColorStop(0, 'rgba(0,0,0,' + startA + ')');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, cv.width, cv.height);
      fabric.Image.fromURL(cv.toDataURL('image/png'), function (mimg) {
        if (!pageOk()) return; /* page changed while rasterizing — discard */
        var w = obj.getScaledWidth(), h = obj.getScaledHeight();
        mimg.set({ left: obj.left, top: obj.top + h + gapPx,
          scaleX: w / mimg.width, scaleY: h / mimg.height,
          selectable: false, evented: false, irBody: true,
          irReflOf: el.id, reflGap: gapPx, reflAlpha: startA, angle: obj.angle || 0 });
        /* replace any stale reflection for this element */
        fc.getObjects().slice().forEach(function (o2) { if (o2.irReflOf === el.id && o2 !== mimg) fc.remove(o2); });
        fc.add(mimg);
        fc.renderAll();
      });
    };
    img.src = src;
  }, FABRIC_JSON_PROPS);
}

function _makeGlow(obj, params, fc) {
  var radPx = Math.max(2, params.radPx || 8);
  var color = params.color || 'rgba(255,165,0,0.7)';
  var elId = params.id;
  var pg0 = (typeof state !== 'undefined' && typeof currentPageObj === 'function') ? currentPageObj() : null;
  var pageOk = function () { return !pg0 || (typeof currentPageObj === 'function' && currentPageObj() === pg0); };
  obj.clone(function (c) {
    c.set({ shadow: null, opacity: 1 });
    var MULT = 2;
    var src = c.toDataURL({ format: 'png', multiplier: MULT });
    var img = new Image();
    img.onload = function () {
      var padR = Math.round(radPx * 2 * MULT); /* raster-space padding */
      /* solid silhouette in the glow colour */
      var sil = document.createElement('canvas');
      sil.width = img.width + padR * 2; sil.height = img.height + padR * 2;
      var g1 = sil.getContext('2d');
      g1.drawImage(img, padR, padR);
      g1.globalCompositeOperation = 'source-in';
      g1.fillStyle = color; g1.fillRect(0, 0, sil.width, sil.height);
      /* stack the blurred silhouette: 3 passes = PPT's dense inner ribbon
         with a soft outer fade */
      var cv = document.createElement('canvas');
      cv.width = sil.width; cv.height = sil.height;
      var g2 = cv.getContext('2d');
      g2.filter = 'blur(' + Math.round(radPx * MULT * 0.45) + 'px)';
      g2.drawImage(sil, 0, 0); g2.drawImage(sil, 0, 0); g2.drawImage(sil, 0, 0);
      fabric.Image.fromURL(cv.toDataURL('image/png'), function (mimg) {
        if (!pageOk()) return;
        var w = obj.getScaledWidth(), h = obj.getScaledHeight();
        var pad = padR / MULT; /* screen-space padding */
        mimg.set({ left: obj.left - pad, top: obj.top - pad,
          scaleX: (w + pad * 2) / mimg.width, scaleY: (h + pad * 2) / mimg.height,
          selectable: false, evented: false, irBody: true,
          irGlowOf: elId, glowPad: pad, angle: obj.angle || 0 });
        fc.getObjects().slice().forEach(function (o2) { if (o2.irGlowOf === elId && o2 !== mimg) fc.remove(o2); });
        fc.add(mimg);
        mimg.moveTo(Math.max(0, fc.getObjects().indexOf(obj))); /* slide BEHIND the source */
        fc.renderAll();
      });
    };
    img.src = src;
  }, FABRIC_JSON_PROPS);
}

function _glowRegen(opt) {
  var o = opt && opt.target;
  if (!o || !o.irId || !fc) return;
  if (o.irHasGlow && o.irGlowRadPx) { try { _makeGlow(o, { id: o.irId, radPx: o.irGlowRadPx, color: o.irGlowColor }, fc); } catch (e) {} }
  if (o.irHasSoft && o.irSoftRadPx) { try { _makeSoftEdge(o, { id: o.irId, radPx: o.irSoftRadPx }, fc); } catch (e2) {} }
}

function _reflFollow(opt) {
  var srcO = opt && opt.target;
  if (!srcO || (!srcO.irHasRefl && !srcO.irHasGlow && !srcO.irHasSoft) || !srcO.irId || !fc) return;
  var objs = fc.getObjects();
  var w = srcO.getScaledWidth(), h = srcO.getScaledHeight();
  for (var i = 0; i < objs.length; i++) {
    var m2 = objs[i];
    if (m2.irReflOf === srcO.irId) {
      m2.set({ left: srcO.left, top: srcO.top + h + (m2.reflGap || 2),
        scaleX: w / m2.width, scaleY: h / m2.height, angle: srcO.angle || 0 });
      m2.setCoords();
    } else if (m2.irGlowOf === srcO.irId || m2.irSoftOf === srcO.irId) {
      var pad = (m2.irGlowOf === srcO.irId ? m2.glowPad : m2.softPad) || 0;
      m2.set({ left: srcO.left - pad, top: srcO.top - pad,
        scaleX: (w + pad * 2) / m2.width, scaleY: (h + pad * 2) / m2.height, angle: srcO.angle || 0 });
      m2.setCoords();
    }
  }
}

function renderLineElementIR(el, sx, sy, fc) {
  var x1 = el.x * sx, y1 = el.y * sy, x2 = el.x * sx + el.w * sx, y2 = el.y * sy + el.h * sy;
  if (el.flipH) { var t = x1; x1 = x2; x2 = t; }
  if (el.flipV) { var t2 = y1; y1 = y2; y2 = t2; }
  var strokeColor = el.stroke ? el.stroke.color : '#555555';
  var strokeW = el.stroke ? Math.max(1, el.stroke.w * sx) : 2;
  /* GRADIENT-stroked straight line (fade-out accent bars: <a:ln><a:gradFill>):
     a fabric.Line has a zero-area bbox, so a gradient stroke has nothing to
     map onto — draw the bar as a RECT of the stroke's thickness with the
     gradient as FILL. Solid approximations showed a fully-filled bar. */
  if (el.stroke && el.stroke.grad && !el.cxn) {
    var isV = Math.abs(x2 - x1) < 0.5, isH = Math.abs(y2 - y1) < 0.5;
    if (isV || isH) {
      var ga = (el.stroke.grad.angleDeg || 0) * Math.PI / 180;
      var gdx = Math.cos(ga), gdy = Math.sin(ga);
      var gradF = new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage',
        coords: { x1: 0.5 - gdx / 2, y1: 0.5 - gdy / 2, x2: 0.5 + gdx / 2, y2: 0.5 + gdy / 2 },
        colorStops: el.stroke.grad.stops.map(function (s2) { return { offset: Math.max(0, Math.min(1, s2.pos)), color: s2.color }; }) });
      var bar = new fabric.Rect({
        left: isV ? Math.min(x1, x2) - strokeW / 2 : Math.min(x1, x2),
        top: isV ? Math.min(y1, y2) : Math.min(y1, y2) - strokeW / 2,
        width: Math.max(1, isV ? strokeW : Math.abs(x2 - x1)),
        height: Math.max(1, isV ? Math.abs(y2 - y1) : strokeW),
        rx: strokeW / 2, ry: strokeW / 2, /* cap-round look of the accent bar */
        fill: gradF, irId: el.id, irOrigin: el.origin });
      fc.add(bar);
      return;
    }
  }
  var lineOpts = { fill: '', stroke: strokeColor, strokeWidth: strokeW, irId: el.id, irOrigin: el.origin, strokeLineCap: 'round' };
  if (el.stroke && el.stroke.dash && el.stroke.dash !== 'solid') lineOpts.strokeDashArray = dashArrayFor(el.stroke.dash, strokeW);
  var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, parts = [];
  /* connection sites decide the tangent axis at each end: idx 0/2 = top/
     bottom edge (VERTICAL leave/enter), idx 1/3 = left/right (HORIZONTAL).
     Without site info default to horizontal (classic left-to-right flow). */
  var stVert = el.stIdx === 0 || el.stIdx === 2;
  var enVert = el.endIdx === 0 || el.endIdx === 2;
  var startAng, endAng; /* tangent angles for arrowheads */
  if (el.cxn && /^bentConnector/.test(el.cxn)) {
    var d;
    if (stVert && enVert)      d = 'M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + my + ' L ' + x2 + ' ' + my + ' L ' + x2 + ' ' + y2;
    else if (stVert)           d = 'M ' + x1 + ' ' + y1 + ' L ' + x1 + ' ' + y2 + ' L ' + x2 + ' ' + y2;
    else if (enVert)           d = 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y1 + ' L ' + x2 + ' ' + y2;
    else                       d = 'M ' + x1 + ' ' + y1 + ' L ' + mx + ' ' + y1 + ' L ' + mx + ' ' + y2 + ' L ' + x2 + ' ' + y2;
    parts.push(new fabric.Path(d, lineOpts));
    startAng = stVert ? Math.atan2(y1 - my, 0) : Math.atan2(0, x1 - mx);
    endAng   = enVert ? Math.atan2(y2 - my, 0) : Math.atan2(0, x2 - mx);
  } else if (el.cxn && /^curvedConnector/.test(el.cxn)) {
    var c1x = stVert ? x1 : mx, c1y = stVert ? my : y1;
    var c2x = enVert ? x2 : mx, c2y = enVert ? my : y2;
    parts.push(new fabric.Path('M ' + x1 + ' ' + y1 + ' C ' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + x2 + ' ' + y2, lineOpts));
    startAng = Math.atan2(y1 - c1y, x1 - c1x); endAng = Math.atan2(y2 - c2y, x2 - c2x);
  } else {
    parts.push(new fabric.Line([x1, y1, x2, y2], lineOpts));
    startAng = Math.atan2(y1 - y2, x1 - x2); endAng = Math.atan2(y2 - y1, x2 - x1);
  }
  /* arrowheads (head = at line START, tail = at line END) */
  function arrowAt(px, py, ang) {
    var L = Math.max(8, strokeW * 5), Wd = Math.max(3.5, strokeW * 2);
    var bx = px - L * Math.cos(ang), by = py - L * Math.sin(ang);
    var nx = -Math.sin(ang) * Wd, ny = Math.cos(ang) * Wd;
    return new fabric.Polygon([{ x: px, y: py }, { x: bx + nx, y: by + ny }, { x: bx - nx, y: by - ny }],
      { fill: strokeColor, stroke: '', selectable: false, evented: false });
  }
  if (el.stroke && el.stroke.head) parts.push(arrowAt(x1, y1, startAng));
  if (el.stroke && el.stroke.tail) parts.push(arrowAt(x2, y2, endAng));
  if (parts.length > 1) {
    var g = new fabric.Group(parts, { irId: el.id, irOrigin: el.origin });
    fc.add(g);
  } else {
    fc.add(parts[0]);
  }
}

function pptAxisScale(maxV, axMaxFile) {
  if (axMaxFile != null && isFinite(axMaxFile)) return { max: axMaxFile, ticks: 5 };
  var target = Math.max(1e-9, maxV) * 1.05;
  var mag = Math.pow(10, Math.floor(Math.log(target) / Math.LN10));
  var mults = [0.1, 0.2, 0.25, 0.5, 1, 2], u = mag * 2;
  for (var i = 0; i < mults.length; i++) { var c = mag * mults[i]; if (Math.ceil(target / c) <= 6) { u = c; break; } } /* PPT keeps <=6 major intervals: 24->unit5/max30, 62->unit20/max80 (slides 2 & 30) */
  var mx = Math.ceil(target / u) * u;
  return { max: Math.round(mx * 1e6) / 1e6, ticks: Math.max(1, Math.round(mx / u)) };
}

function renderChartFabric(el, sx, sy, fc) {
  if (el.chartType !== 'bar') return false;
  var horiz = el.barDir === 'bar';
  var series = el.series || [], cats = el.cats || [];
  for (var q = 0; q < series.length; q++) if (series[q].kind && series[q].kind !== 'bar') return false; /* combo -> fallback */
  if (!series.length) return false;
  window._chartCtx[el.id] = { el: el, sx: sx, sy: sy };
  var X = el.x * sx, Y = el.y * sy, W = Math.abs(el.w * sx), H = Math.abs(el.h * sy);
  /* PPT behaviour: the chart's BLANK area selects the whole graphic frame */
  var _frame = new fabric.Rect({ left: X, top: Y, width: W, height: H, fill: 'rgba(255,255,255,0.01)', stroke: '', irChart: el.id, irChartRole: 'frame', lockRotation: true });
  fc.add(_frame);
  var F = el.txSzPt ? Math.max(6, el.txSzPt * 12700 * sx) : Math.max(7, H * 0.045);
  var TXT = el.txColor || '#1A1A1A';
  var tag = function (o, role, extra) { o.set(Object.assign({ irChart: el.id, irChartRole: role }, extra || {})); fc.add(o); return o; };
  var topY = Y + 4;
  if (el.title && !el.titleDeleted) {
    var FT = el.titleSzPt ? Math.max(6, el.titleSzPt * 12700 * sx) : F * 1.25;
    var tt = new fabric.IText(el.title, { left: X + W / 2, top: topY, originX: 'center', fontSize: FT, fontWeight: 'bold', fontFamily: 'sans-serif', fill: TXT, editable: true });
    tag(tt, 'title'); topY += FT * 1.55;
  }
  var visSeries = series.filter(function (s2) { return !s2.hidden; });
  var stacked = el.grouping === 'stacked' || el.grouping === 'percentStacked';
  var colorOf = function (s2, i) {
    if (s2.ptColors && s2.ptColors[i]) return s2.ptColors[i];
    if (el.varyColors && series.length === 1) return el.colors[i % el.colors.length];
    return s2.color;
  };
  var allVals = [];
  if (stacked) {
    var nC = Math.max.apply(null, series.map(function (s2) { return s2.vals.length; }).concat([0]));
    for (var c2 = 0; c2 < nC; c2++) { var t2 = 0; series.forEach(function (s2) { var v = s2.vals[c2]; if (isFinite(v)) t2 += v; }); allVals.push(t2); }
  } else series.forEach(function (s2) { s2.vals.forEach(function (v) { if (isFinite(v)) allVals.push(v); }); });
  var maxV = Math.max.apply(null, allVals.concat([1]));
  var _axs = pptAxisScale(maxV, el.axMaxFile);
  var axMax = _axs.max, axTicks = _axs.ticks;
  /* legend (horizontal bar charts list series in REVERSE, like PPT) */
  var legendSrc = horiz ? visSeries.slice().reverse() : visSeries;
  var legend = (el.hasLegend === false) ? [] : legendSrc.map(function (s2) { return { label: s2.name || 'Series', color: s2.color, si: series.indexOf(s2) }; });
  var legendB = el.legendPos === 'b';
  var Hbody = H;
  if (legend.length) {
    var lw = 0, items = legend.map(function (it) {
      var t3 = new fabric.Text(it.label, { fontSize: F, fontFamily: 'sans-serif', fill: TXT });
      lw += F + 6 + t3.width + 12; return t3;
    });
    var lx = X + Math.max(4, (W - lw) / 2);
    var ly = legendB ? Y + H - F * 1.5 : topY;
    legend.forEach(function (it, i) {
      tag(new fabric.Rect({ left: lx, top: ly, width: F * 0.8, height: F * 0.8, fill: it.color }), 'legendSwatch', { irChartSi: it.si });
      items[i].set({ left: lx + F, top: ly - F * 0.15 }); tag(items[i], 'legendLabel', { irChartSi: it.si });
      lx += F + 6 + items[i].width + 12;
    });
    if (legendB) Hbody = H - F * 2.1; else topY = ly + F * 1.6;
  }
  var padL, padR = 10, padB, padT2 = (topY - Y) + F * 0.8;
  if (horiz) {
    padL = 0;
    cats.forEach(function (c3) { var m2 = new fabric.Text(String(c3).slice(0, 14), { fontSize: F, fontFamily: 'sans-serif' }); if (m2.width > padL) padL = m2.width; });
    padL += F * 1.2; padB = F * 2.4;
  } else {
    var measAx = new fabric.Text(String(Math.round(axMax)), { fontSize: F, fontFamily: 'sans-serif' });
    padL = measAx.width + F * 1.2; padB = F * 2;
  }
  var plotW = W - padL - padR, plotH = Hbody - padT2 - padB;
  var n = Math.max(cats.length, series[0] ? series[0].vals.length : 0, 1);
  var baseline = Y + Hbody - padB;
  var tickN = axTicks;
  var fmtTick = function (t) { return String(Math.round(axMax * t / tickN * 100) / 100); };
  if (horiz) {
    /* value axis runs along X: VERTICAL gridlines + bottom tick labels */
    for (var t = 0; t <= tickN; t++) {
      var gx = X + padL + plotW * t / tickN;
      if (el.hasGrid && t > 0) tag(new fabric.Line([gx, Y + padT2, gx, baseline], { stroke: '#333333', strokeWidth: 1 }), 'grid');
      tag(new fabric.Text(fmtTick(t), { left: gx, top: baseline + F * 0.4, originX: 'center', fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'valLabel');
    }
  } else {
    for (var t = 0; t <= tickN; t++) {
      var vy = baseline - plotH * t / tickN;
      if (el.hasGrid) tag(new fabric.Line([X + padL, vy, X + W - padR, vy], { stroke: '#333333', strokeWidth: 1 }), 'grid');
      tag(new fabric.Text(fmtTick(t), { left: X + padL - 5, top: vy - F * 0.55, originX: 'right', fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'valLabel');
    }
  }
  tag(new fabric.Line([X + padL, Y + padT2, X + padL, baseline], { stroke: '#333333', strokeWidth: 1 }), 'axis');
  tag(new fabric.Line([X + padL, baseline, X + W - padR, baseline], { stroke: '#333333', strokeWidth: 1 }), 'axis');
  if (horiz) {
    var rowH = plotH / n;
    var nColsH = stacked ? 1 : Math.max(1, series.length);
    var barT = Math.max(2, rowH / (nColsH + (el.gapWidth == null ? 150 : el.gapWidth) / 100));
    var stackBaseH = [];
    series.forEach(function (s2, si2) {
      s2.vals.forEach(function (v, i) {
        var bl = plotW * (v / axMax);
        var rowTop = baseline - (i + 1) * rowH; /* cat 0 at the BOTTOM, PPT convention */
        var by = stacked ? (rowTop + (rowH - barT) / 2)
                         : (rowTop + (rowH - barT * series.length) / 2 + (series.length - 1 - si2) * barT);
        var base = stacked ? (stackBaseH[i] || 0) : 0;
        if (!s2.hidden) {
          tag(new fabric.Rect({ left: X + padL + base, top: by, width: bl, height: barT - 1, fill: colorOf(s2, i), lockRotation: true }), 'bar', { irChartSi: si2, irChartCi: i });
          if (el.showVals) tag(new fabric.Text(String(v), { left: X + padL + base + bl + 3, top: by + barT / 2 - F * 0.55, fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'valTag', { irChartSi: si2, irChartCi: i });
        }
        if (stacked) stackBaseH[i] = base + bl;
      });
    });
    cats.forEach(function (c3, i) {
      tag(new fabric.Text(String(c3).slice(0, 14), { left: X + padL - 6, top: baseline - (i + 1) * rowH + rowH / 2 - F * 0.55, originX: 'right', fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'catLabel', { irChartCi: i });
    });
  } else {
    var groupW = plotW / n;
    var nCols = stacked ? 1 : Math.max(1, series.length);
    var barW = Math.max(2, groupW / (nCols + (el.gapWidth == null ? 150 : el.gapWidth) / 100));
    var stackBase = [];
    series.forEach(function (s2, si2) {
      s2.vals.forEach(function (v, i) {
        var bh = plotH * (v / axMax);
        var bx = stacked ? (X + padL + groupW * i + (groupW - barW) / 2)
                         : (X + padL + groupW * i + (groupW - barW * series.length) / 2 + si2 * barW);
        var base = stacked ? (stackBase[i] || 0) : 0;
        if (!s2.hidden) {
          tag(new fabric.Rect({ left: bx, top: baseline - base - bh, width: barW - 1, height: bh, fill: colorOf(s2, i), lockRotation: true }), 'bar', { irChartSi: si2, irChartCi: i });
          if (el.showVals) tag(new fabric.Text(String(v), { left: bx + barW / 2, top: baseline - base - bh - F * 1.1, originX: 'center', fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'valTag', { irChartSi: si2, irChartCi: i });
        }
        if (stacked) stackBase[i] = base + bh;
      });
    });
    cats.forEach(function (c3, i) {
      tag(new fabric.Text(String(c3).slice(0, 14), { left: X + padL + groupW * (i + 0.5), top: baseline + F * 0.4, originX: 'center', fontSize: F, fontFamily: 'sans-serif', fill: TXT }), 'catLabel', { irChartCi: i });
    });
  }
  window._chartCtx[el.id].layout = { plotH: plotH, plotW: plotW, axMax: axMax, baseline: baseline, stacked: stacked, horiz: horiz };
  return true;
}

function rerenderChartById(id) {
  var ctx = window._chartCtx[id]; if (!ctx || !fc) return;
  fc.getObjects().slice().forEach(function (o) { if (o.irChart === id) fc.remove(o); });
  renderChartFabric(ctx.el, ctx.sx, ctx.sy, fc);
  fc.renderAll(); if (typeof saveState === 'function') saveState();
}

function _chartSelHook() {
  var o = fc && fc.getActiveObject();
  if (o && o.irChart) openChartOptions(o.irChart);
}

function _chartBarModified(opt) {
  var o = opt && opt.target; if (!o) return;
  if (o.irChartRole === 'frame') {
    var fctx = window._chartCtx[o.irChart]; if (!fctx) return;
    fctx.el.x = o.left / fctx.sx; fctx.el.y = o.top / fctx.sy;
    fctx.el.w = (o.width * (o.scaleX || 1)) / fctx.sx * (fctx.el.w < 0 ? -1 : 1);
    fctx.el.h = (o.height * (o.scaleY || 1)) / fctx.sy * (fctx.el.h < 0 ? -1 : 1);
    rerenderChartById(o.irChart);
    return;
  }
  if (o.irChartRole !== 'bar') return;
  var ctx = window._chartCtx[o.irChart]; if (!ctx || !ctx.layout || ctx.layout.stacked) return;
  /* dragging a bar's LENGTH edits the data, PowerPoint-style (height for
     column charts, width for horizontal bar charts) */
  var v;
  if (ctx.layout.horiz) {
    var newW = o.width * (o.scaleX || 1);
    v = Math.round((newW / ctx.layout.plotW) * ctx.layout.axMax * 100) / 100;
  } else {
    var newH = o.height * (o.scaleY || 1);
    v = Math.round((newH / ctx.layout.plotH) * ctx.layout.axMax * 100) / 100;
  }
  if (isFinite(v) && v >= 0 && ctx.el.series[o.irChartSi]) {
    ctx.el.series[o.irChartSi].vals[o.irChartCi] = v;
    rerenderChartById(o.irChart);
    if (typeof showToast === 'function') showToast(ctx.el.series[o.irChartSi].name + ' / ' + (ctx.el.cats[o.irChartCi] || '') + ' = ' + v);
  }
}

function _chartTitleEdited(opt) {
  var o = opt && opt.target; if (!o || o.irChartRole !== 'title') return;
  var ctx = window._chartCtx[o.irChart]; if (ctx) { ctx.el.title = o.text; if (typeof saveState === 'function') saveState(); }
}

function _oleOpenMenu(id, ev) {
  var old = document.getElementById('ole-menu'); if (old) old.remove();
  var m = document.createElement('div');
  m.id = 'ole-menu';
  var mx = (ev && ev.clientX) || window.innerWidth / 2, my = (ev && ev.clientY) || window.innerHeight / 2;
  m.style.cssText = 'position:fixed;left:' + Math.min(mx, window.innerWidth - 240) + 'px;top:' + Math.min(my, window.innerHeight - 120) + 'px;background:#fff;border:1px solid #E2E8F0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.18);z-index:5100;padding:6px;font-size:13px;font-family:inherit;min-width:220px';
  var bridgeOk = !!window.showSaveFilePicker;
  m.innerHTML =
    '<button id="olm-x" style="display:block;width:100%;text-align:left;padding:8px 10px;border-radius:6px;font-weight:600;color:#217346"' + (bridgeOk ? '' : ' disabled') + '>&#9638; Edit in Excel (live bridge)</button>' +
    '<button id="olm-q" style="display:block;width:100%;text-align:left;padding:8px 10px;border-radius:6px">Quick edit here (formulas, rows/cols)</button>' +
    (bridgeOk ? '' : '<div style="padding:4px 10px;color:#94A3B8">Bridge needs Chrome/Edge</div>');
  document.body.appendChild(m);
  var kill = function () { m.remove(); document.removeEventListener('mousedown', outside, true); };
  var outside = function (e2) { if (!m.contains(e2.target)) kill(); };
  document.addEventListener('mousedown', outside, true);
  m.querySelector('#olm-q').onclick = function () { kill(); openWorkbookEditor(id); };
  m.querySelector('#olm-x').onclick = function () { kill(); if (bridgeOk) bridgeToExcel(id); };
}

function _idbBridge(op, val, key) {
  key = key || 'dir';
  return new Promise(function (res) {
    var rq = indexedDB.open('lazydog-bridge', 1);
    rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
    rq.onerror = function () { res(null); };
    rq.onsuccess = function () {
      var db = rq.result, tx = db.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('kv');
      var r2 = op === 'get' ? st.get(key) : st.put(val, key);
      r2.onsuccess = function () { res(op === 'get' ? r2.result : true); };
      r2.onerror = function () { res(null); };
    };
  });
}

function _launchNative(name, pth) {
  if (!pth) return false;
  var ext = (name.split('.').pop() || '').toLowerCase();
  var scheme = { docx: 'ms-word', doc: 'ms-word', dotx: 'ms-word', xlsx: 'ms-excel', xlsm: 'ms-excel', csv: 'ms-excel', pptx: 'ms-powerpoint', pub: 'ms-publisher', vsd: 'ms-visio', vsdx: 'ms-visio' }[ext];
  if (!scheme) return false;
  var fileUrl = 'file:///' + String(pth).replace(/\\/g, '/').replace(/\/+$/, '') + '/' + name;
  try { window.location.href = scheme + ':ofe|u|' + encodeURI(fileUrl); return true; } catch (e) { return false; }
}

async function _ensureBridgePath(app) {
  var pth = await _idbBridge('get', null, 'path');
  if (pth) return pth;
  return new Promise(function (res) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:5200;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-width:400px;padding:22px;font-size:14px;font-family:inherit;line-height:1.5">' +
      '<b>Let ' + app + ' open automatically</b><div style="color:#334155;margin-top:6px">Paste your Bridge folder\'s full path (Explorer &rarr; address bar &rarr; copy). Asked once.</div>' +
      '<input id="bp-in" placeholder="C:\\Users\\you\\Desktop" style="width:100%;margin-top:10px;padding:6px 8px;border:1px solid #CBD5E1;border-radius:6px;font:inherit">' +
      '<div style="margin-top:12px;display:flex;gap:8px"><button id="bp-ok" style="background:#217346;color:#fff;border-radius:8px;padding:7px 16px;font-weight:600">Save</button>' +
      '<button id="bp-skip" style="background:#F1F5F9;border-radius:8px;padding:7px 16px">Skip</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('#bp-ok').onclick = function () { var v = d.querySelector('#bp-in').value.trim(); if (v) _idbBridge('set', v, 'path'); d.remove(); res(v || null); };
    d.querySelector('#bp-skip').onclick = function () { d.remove(); res(null); };
  });
}

async function _bridgeDir(opts) {
  opts = opts || { app: 'Excel', kind: 'sheet', allowEditor: true };
  var h = await _idbBridge('get');
  if (h) {
    try {
      var p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'prompt') p = await h.requestPermission({ mode: 'readwrite' });
      if (p === 'granted') { await _ensureBridgePath(opts.app); return h; }
    } catch (e) {}
  }
  if (!window.showDirectoryPicker) return null;
  /* FIRST RUN: never throw a bare Explorer window at the user — explain
     what is about to happen and why, then let them choose */
  var go = await new Promise(function (res) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:5200;display:flex;align-items:center;justify-content:center;';
    var appCol = { Excel: '#217346', Word: '#2B579A', Publisher: '#077568', Visio: '#3955A3', PowerPoint: '#B7472A' }[opts.app] || '#217346';
    d.innerHTML = '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-width:420px;padding:24px;font-size:14px;font-family:inherit;line-height:1.55">' +
      '<div style="font-size:17px;font-weight:700;color:' + appCol + ';margin-bottom:10px">&#9638; Edit this ' + opts.kind + ' in ' + opts.app + '</div>' +
      '<div style="color:#334155">To let <b>' + opts.app + '</b> edit this embedded ' + opts.kind + ', the editor keeps a copy of it in one folder on your computer.<br><br>' +
      '<b>1.</b> Next screen: pick that folder (Desktop is fine) — <b>asked only once, ever</b><br>' +
      '<b>2.</b> Open the ' + opts.kind + ' file from that folder in ' + opts.app + '<br>' +
      '<b>3.</b> Every time you press <b>Ctrl+S</b> in ' + opts.app + ', it syncs back here by itself</div>' +
      '<div style="margin-top:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;color:#334155">To make ' + opts.app + ' <b>open automatically</b> (like PowerPoint does), paste that folder\'s full path here once:<br>' +
      '<input id="bg-path" placeholder="C:\\Users\\you\\Desktop" style="width:100%;margin-top:6px;padding:6px 8px;border:1px solid #CBD5E1;border-radius:6px;font:inherit">' +
      '<span style="color:#94A3B8;font-size:12px">Explorer &rarr; open the folder &rarr; click the address bar &rarr; copy</span></div>' +
      '<div style="margin-top:16px;display:flex;gap:8px">' +
      '<button id="bg-go" style="background:' + appCol + ';color:#fff;border-radius:8px;padding:8px 18px;font-weight:600">Choose folder</button>' +
      (opts.allowEditor ? '<button id="bg-alt" style="background:#F1F5F9;color:#334155;border-radius:8px;padding:8px 18px;font-weight:600">Edit here instead</button>' : '') + '</div></div>';
    document.body.appendChild(d);
    d.querySelector('#bg-go').onclick = function () {
      var pv = d.querySelector('#bg-path').value.trim();
      if (pv) _idbBridge('set', pv, 'path');
      d.remove(); res(true);
    };
    var altB = d.querySelector('#bg-alt'); if (altB) altB.onclick = function () { d.remove(); res(false); };
  });
  if (!go) return 'editor';
  h = await window.showDirectoryPicker({ id: 'lazydog-bridge', mode: 'readwrite', startIn: 'desktop' });
  await _idbBridge('set', h);
  return h;
}

async function bridgeToExcel(id) {
  var ctx = window._tblCtx && window._tblCtx[id]; if (!ctx) return;
  var el = ctx.el;
  try {
    var bin = atob(el.oleXlsxB64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var name = el.oleName || 'workbook.xlsx';
    var handle = null, dir = null;
    try { dir = await _bridgeDir({ app: 'Excel', kind: 'sheet', allowEditor: true }); } catch (eD) { if (eD && eD.name === 'AbortError') return; }
    if (dir === 'editor') { openWorkbookEditor(id); return; }
    if (dir) handle = await dir.getFileHandle(name, { create: true });
    else {
      handle = await window.showSaveFilePicker({ suggestedName: name,
        types: [{ description: 'Excel Workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] });
    }
    var w = await handle.createWritable(); await w.write(arr.buffer); await w.close();
    if (window._oleBridge[id] && window._oleBridge[id].timer) clearInterval(window._oleBridge[id].timer);
    var st = { handle: handle, last: 0, timer: null };
    var f0 = await handle.getFile(); st.last = f0.lastModified;
    st.timer = setInterval(async function () {
      try {
        var fl = await st.handle.getFile();
        if (fl.lastModified !== st.last) {
          st.last = fl.lastModified;
          var buf = await fl.arrayBuffer();
          await _syncWorkbookIntoTable(id, buf);
          showToast('Synced from Excel ✓');
        }
      } catch (e2) { clearInterval(st.timer); }
    }, 1500);
    window._oleBridge[id] = st;
    var pth = await _idbBridge('get', null, 'path');
    var launched = _launchNative(name, pth);
    _bridgeChip(id, name);
    if (launched) showToast('Opening in Excel…');
  } catch (e) { if (e && e.name !== 'AbortError') { console.warn('bridge failed', e); showToast('Excel bridge failed: ' + e.message); } }
}

function _bridgeChip(id, name) {
  var old = document.getElementById('bridge-chip-' + id); if (old) old.remove();
  var c = document.createElement('div');
  c.id = 'bridge-chip-' + id;
  c.style.cssText = 'position:fixed;left:14px;bottom:74px;background:#0B3D2E;color:#fff;border-radius:12px;padding:10px 14px;z-index:4500;font-size:13px;font-family:inherit;box-shadow:0 8px 30px rgba(0,0,0,0.3);max-width:340px;line-height:1.5';
  c.innerHTML = '<span style="color:#4ADE80">&#9679;</span> <b>' + _oleAppName(name) + ' bridge live</b> — open <b>' + name + '</b> from your Bridge folder in ' + _oleAppName(name) + '. Every <b>Ctrl+S</b> there syncs back here. ' +
    '<button style="margin-left:6px;color:#94E3C2;text-decoration:underline" id="bchip-x-' + id + '">stop</button>';
  document.body.appendChild(c);
  document.getElementById('bchip-x-' + id).onclick = function () {
    if (window._oleBridge[id] && window._oleBridge[id].timer) clearInterval(window._oleBridge[id].timer);
    c.remove(); showToast('Bridge stopped');
  };
}

function _oleAppName(name) {
  var ext = (name.split('.').pop() || '').toLowerCase();
  return { docx: 'Word', doc: 'Word', dotx: 'Word', xlsx: 'Excel', pub: 'Publisher', vsd: 'Visio', vsdx: 'Visio', pptx: 'PowerPoint', bin: 'its app' }[ext] || 'its app';
}

async function bridgeOleDoc(id) {
  var reg = window._oleDoc[id]; if (!reg) return;
  try {
    var dir = null;
    var appNm = _oleAppName(reg.name);
    try { dir = await _bridgeDir({ app: appNm, kind: 'document', allowEditor: false }); } catch (eD) { if (eD && eD.name === 'AbortError') return; }
    if (dir === 'editor' || !dir) { if (!dir) showToast('Bridge needs Chrome/Edge'); return; }
    var bin = atob(reg.b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var handle = await dir.getFileHandle(reg.name, { create: true });
    var w = await handle.createWritable(); await w.write(arr.buffer); await w.close();
    window._oleBridge[id] && window._oleBridge[id].timer && clearInterval(window._oleBridge[id].timer);
    var st = { handle: handle, last: 0, timer: null };
    var f0 = await handle.getFile(); st.last = f0.lastModified;
    st.timer = setInterval(async function () {
      try {
        var fl = await st.handle.getFile();
        if (fl.lastModified !== st.last) {
          st.last = fl.lastModified;
          var buf = await fl.arrayBuffer();
          var b = '', u8 = new Uint8Array(buf); var CH = 0x8000;
          for (var p2 = 0; p2 < u8.length; p2 += CH) b += String.fromCharCode.apply(null, u8.subarray(p2, p2 + CH));
          reg.b64 = btoa(b); if (reg.el) reg.el.oleFileB64 = reg.b64;
          showToast('Synced from ' + _oleAppName(reg.name) + ' \u2713 (embedded file updated)');
        }
      } catch (e2) { clearInterval(st.timer); }
    }, 1500);
    window._oleBridge[id] = st;
    var pth2 = await _idbBridge('get', null, 'path');
    var launched2 = _launchNative(reg.name, pth2);
    _bridgeChip(id, reg.name);
    if (launched2) showToast('Opening in ' + appNm + '…');
  } catch (e) { if (e && e.name !== 'AbortError') { console.warn('doc bridge failed', e); showToast('Bridge failed: ' + e.message); } }
}

async function _syncWorkbookIntoTable(id, buf) {
  var ctx = window._tblCtx && window._tblCtx[id]; if (!ctx) return;
  var el = ctx.el;
  var wb = await JSZip.loadAsync(buf);
  /* shared strings */
  var sst = [];
  var sf = wb.file('xl/sharedStrings.xml');
  if (sf) {
    var sdoc0 = new DOMParser().parseFromString(await sf.async('string'), 'application/xml');
    var sis = sdoc0.getElementsByTagName('*');
    for (var si = 0; si < sis.length; si++) if (sis[si].localName === 'si') {
      var txt = '', ts = sis[si].getElementsByTagName('*');
      for (var ti = 0; ti < ts.length; ti++) if (ts[ti].localName === 't') txt += ts[ti].textContent;
      sst.push(txt);
    }
  }
  var path = 'xl/worksheets/sheet1.xml';
  if (!wb.file(path)) { var ks = Object.keys(wb.files).filter(function (k) { return /^xl\/worksheets\/sheet.*\.xml$/.test(k); }).sort(); if (!ks.length) return; path = ks[0]; }
  var sdoc = new DOMParser().parseFromString(await wb.file(path).async('string'), 'application/xml');
  var grid = {}, maxR = 0, maxC = 0, all = sdoc.getElementsByTagName('*');
  for (var ci = 0; ci < all.length; ci++) {
    var cEl = all[ci]; if (cEl.localName !== 'c') continue;
    var ref = cEl.getAttribute('r') || ''; var mm = ref.match(/^([A-Z]+)([0-9]+)$/); if (!mm) continue;
    var col = 0; for (var k2 = 0; k2 < mm[1].length; k2++) col = col * 26 + (mm[1].charCodeAt(k2) - 64); col--;
    var row = parseInt(mm[2], 10) - 1;
    var t = cEl.getAttribute('t'), vv = '', kids = cEl.getElementsByTagName('*');
    if (t === 'inlineStr') { for (var k3 = 0; k3 < kids.length; k3++) if (kids[k3].localName === 't') vv += kids[k3].textContent; }
    else { for (var k4 = 0; k4 < kids.length; k4++) if (kids[k4].localName === 'v') { vv = kids[k4].textContent; break; } if (t === 's' && vv !== '') vv = sst[parseInt(vv, 10)] || ''; }
    if (vv === '') continue;
    grid[row + ':' + col] = vv; if (row > maxR) maxR = row; if (col > maxC) maxC = col;
  }
  var nR = maxR + 1, nC = maxC + 1;
  var g2 = [];
  for (var r3 = 0; r3 < nR; r3++) { var rr = []; for (var c3 = 0; c3 < nC; c3++) rr.push(grid[r3 + ':' + c3] || ''); g2.push(rr); }
  _applyGridToTable(el, g2);
  /* the file from Excel IS the new embedded workbook */
  var b = '', u8 = new Uint8Array(buf); var CH = 0x8000;
  for (var p2 = 0; p2 < u8.length; p2 += CH) b += String.fromCharCode.apply(null, u8.subarray(p2, p2 + CH));
  el.oleXlsxB64 = btoa(b);
  if (window._oleWb && window._oleWb[el.id]) window._oleWb[el.id].b64 = el.oleXlsxB64;
  el._sheetRaw = null;
  rebuildTableById(id);
}

function _applyGridToTable(el, grid) {
  var nR = grid.length, nC = grid[0] ? grid[0].length : 0;
  el.cols = []; for (var c4 = 0; c4 < nC; c4++) el.cols.push(Math.abs(el.w) / nC);
  el.rows = [];
  for (var r4 = 0; r4 < nR; r4++) {
    var cells = [];
    for (var c5 = 0; c5 < nC; c5++) {
      var hdr = r4 === 0;
      cells.push({ span: 1, rowSpan: 1, merged: false,
        fill: { type: 'solid', color: hdr ? '#217346' : (r4 % 2 === 1 ? '#F2F2F2' : '#FFFFFF') },
        border: { color: '#D9D9D9', w: 9525 },
        paragraphs: [{ align: 'left', bullet: null, runs: [{ text: grid[r4][c5], b: hdr, i: false, u: false, sizePt: 10, color: hdr ? '#FFFFFF' : '#333333', font: 'Calibri', spcPt: 0 }] }] });
    }
    el.rows.push({ h: Math.abs(el.h) / nR, cells: cells });
  }
}

var _sheetLibP = null;

function _loadSheetLib() {
  if (window.jexcel) return Promise.resolve();
  if (_sheetLibP) return _sheetLibP;
  function css(u) { return new Promise(function (res) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; l.onload = res; l.onerror = res; document.head.appendChild(l); }); }
  function js(u) { return new Promise(function (res, rej) { var t = document.createElement('script'); t.src = u; t.onload = res; t.onerror = rej; document.head.appendChild(t); }); }
  function chain(urls) { return urls.reduce(function (p, u) { return p.catch(function () { return js(u); }); }, Promise.reject()); }
  _sheetLibP = Promise.all([
    css('https://cdnjs.cloudflare.com/ajax/libs/jsuites/4.9.11/jsuites.min.css'),
    css('https://cdn.jsdelivr.net/npm/jsuites@4/dist/jsuites.css'),
    css('https://cdnjs.cloudflare.com/ajax/libs/jexcel/4.6.1/jexcel.min.css'),
    css('https://cdn.jsdelivr.net/npm/jexcel@4.6.1/dist/jexcel.min.css')
  ]).then(function () { return chain(['https://cdnjs.cloudflare.com/ajax/libs/jsuites/4.9.11/jsuites.min.js', 'https://cdn.jsdelivr.net/npm/jsuites@4/dist/jsuites.min.js']); })
    .then(function () { return chain(['https://cdnjs.cloudflare.com/ajax/libs/jexcel/4.6.1/jexcel.min.js', 'https://cdn.jsdelivr.net/npm/jexcel@4.6.1/dist/jexcel.min.js']); });
  return _sheetLibP;
}

async function _writeWorkbookFull(el, data, disp) {
  if (!el.oleXlsxB64 || typeof JSZip === 'undefined') return;
  try {
    var wb = await JSZip.loadAsync(el.oleXlsxB64, { base64: true });
    var path = 'xl/worksheets/sheet1.xml';
    if (!wb.file(path)) { var ks = Object.keys(wb.files).filter(function (k) { return /^xl\/worksheets\/sheet.*\.xml$/.test(k); }).sort(); if (!ks.length) return; path = ks[0]; }
    var xml = await wb.file(path).async('string');
    var nR = data.length, nC = 0, r, c;
    for (r = 0; r < nR; r++) nC = Math.max(nC, data[r].length);
    var rowsXml = '';
    for (r = 0; r < nR; r++) {
      var cellsXml = '';
      for (c = 0; c < nC; c++) {
        var raw = String(data[r][c] == null ? '' : data[r][c]);
        if (raw === '') continue;
        var ref = _colLetter(c) + (r + 1);
        if (raw.charAt(0) === '=') {
          var dv = disp && disp[r] ? String(disp[r][c]) : '';
          cellsXml += '<c r="' + ref + '"><f>' + _xesc2(raw.slice(1)) + '</f>' + (dv !== '' && isFinite(parseFloat(dv)) ? '<v>' + parseFloat(dv) + '</v>' : '') + '</c>';
        } else if (raw.trim() !== '' && isFinite(parseFloat(raw)) && /^-?[0-9.eE+]+$/.test(raw.trim())) {
          cellsXml += '<c r="' + ref + '"><v>' + raw.trim() + '</v></c>';
        } else {
          cellsXml += '<c r="' + ref + '" t="inlineStr"><is><t>' + _xesc2(raw) + '</t></is></c>';
        }
      }
      if (cellsXml) rowsXml += '<row r="' + (r + 1) + '">' + cellsXml + '</row>';
    }
    var dim = 'A1:' + _colLetter(Math.max(0, nC - 1)) + Math.max(1, nR);
    xml = xml.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="' + dim + '"/>');
    xml = xml.replace(/<sheetData\/>|<sheetData>[\s\S]*?<\/sheetData>/, '<sheetData>' + rowsXml + '</sheetData>');
    wb.file(path, xml);
    /* make Excel recalculate our formulas on open */
    var wbx = wb.file('xl/workbook.xml');
    if (wbx) {
      var wxml = await wbx.async('string');
      if (/<calcPr[^>]*\/>/.test(wxml)) { if (wxml.indexOf('fullCalcOnLoad') < 0) wxml = wxml.replace(/<calcPr/, '<calcPr fullCalcOnLoad="1"'); }
      else wxml = wxml.replace(/<\/workbook>/, '<calcPr fullCalcOnLoad="1"/></workbook>');
      wb.file('xl/workbook.xml', wxml);
    }
    el.oleXlsxB64 = await wb.generateAsync({ type: 'base64' });
    if (window._oleWb && window._oleWb[el.id]) window._oleWb[el.id].b64 = el.oleXlsxB64;
  } catch (e) { console.warn('workbook full write-back failed', e); }
}

function openWorkbookEditor(id) {
  var ctx = window._tblCtx && window._tblCtx[id]; if (!ctx) return;
  var el = ctx.el;
  var old = document.getElementById('wb-editor'); if (old) old.remove();
  var d = document.createElement('div');
  d.id = 'wb-editor';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:5000;display:flex;align-items:center;justify-content:center;';
  d.innerHTML = '<div id="wb-shell" style="background:#fff;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-width:92vw;max-height:88vh;overflow:auto;padding:16px;font-size:13px;font-family:inherit">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:24px"><b style="color:#217346">&#9638; ' + (el.oleName || 'Worksheet') + '</b><button id="wb-x" style="font-size:18px">&#10005;</button></div>' +
    '<div style="color:#64748B;margin-bottom:8px">Formulas: start with = &nbsp;&bull;&nbsp; Right-click for insert/delete rows &amp; columns</div>' +
    '<div id="wb-sheet">Loading spreadsheet engine…</div>' +
    '<div style="margin-top:12px;display:flex;gap:8px">' +
    '<button id="wb-save" style="background:#217346;color:#fff;border-radius:8px;padding:6px 16px;font-weight:600">Save to slide</button>' +
    '<button id="wb-dl" style="background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:6px 16px;font-weight:600">Download .xlsx</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('mousedown', function (ev) { if (ev.target === d) d.remove(); });
  document.getElementById('wb-x').onclick = function () { d.remove(); };
  document.getElementById('wb-dl').onclick = function () {
    var wbk = window._oleWb[id];
    var a = document.createElement('a');
    a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbk.b64;
    a.download = wbk.name; document.body.appendChild(a); a.click(); a.remove();
  };
  var data = el._sheetRaw || el.rows.map(function (row) {
    return row.cells.map(function (cell) {
      return (cell && cell.paragraphs && cell.paragraphs[0] && cell.paragraphs[0].runs[0]) ? cell.paragraphs[0].runs[0].text : '';
    });
  });
  _loadSheetLib().then(function () {
    var host = document.getElementById('wb-sheet'); host.innerHTML = '';
    var inst = jexcel(host, {
      data: JSON.parse(JSON.stringify(data)),
      minDimensions: [Math.max(3, data[0] ? data[0].length : 3), Math.max(4, data.length + 2)],
      defaultColWidth: 110,
      allowInsertRow: true, allowInsertColumn: true, allowDeleteRow: true, allowDeleteColumn: true,
      tableOverflow: false
    });
    document.getElementById('wb-save').onclick = function () {
      var raw = inst.getData();
      /* trim trailing empty rows/cols */
      var maxR = -1, maxC = -1, r2, c2;
      for (r2 = 0; r2 < raw.length; r2++) for (c2 = 0; c2 < raw[r2].length; c2++) {
        if (String(raw[r2][c2] == null ? '' : raw[r2][c2]) !== '') { if (r2 > maxR) maxR = r2; if (c2 > maxC) maxC = c2; }
      }
      if (maxR < 0) { showToast('Sheet is empty'); return; }
      var grid = [], disp = [];
      for (r2 = 0; r2 <= maxR; r2++) {
        var gr = [], dr = [];
        for (c2 = 0; c2 <= maxC; c2++) {
          var rv = String(raw[r2][c2] == null ? '' : raw[r2][c2]);
          gr.push(rv);
          if (rv.charAt(0) === '=') { var dvv = rv; try { dvv = String(inst.records[r2][c2].innerText); } catch (e) {} dr.push(dvv); }
          else dr.push(rv);
        }
        grid.push(gr); disp.push(dr);
      }
      /* rebuild the slide table IR from the sheet (display values) */
      var nR2 = maxR + 1, nC2 = maxC + 1;
      el.cols = []; for (c2 = 0; c2 < nC2; c2++) el.cols.push(Math.abs(el.w) / nC2);
      el.rows = [];
      for (r2 = 0; r2 < nR2; r2++) {
        var cells2 = [];
        for (c2 = 0; c2 < nC2; c2++) {
          var hdr2 = r2 === 0;
          cells2.push({ span: 1, rowSpan: 1, merged: false,
            fill: { type: 'solid', color: hdr2 ? '#217346' : (r2 % 2 === 1 ? '#F2F2F2' : '#FFFFFF') },
            border: { color: '#D9D9D9', w: 9525 },
            paragraphs: [{ align: 'left', bullet: null, runs: [{ text: disp[r2][c2], b: hdr2, i: false, u: false, sizePt: 10, color: hdr2 ? '#FFFFFF' : '#333333', font: 'Calibri', spcPt: 0 }] }] });
        }
        el.rows.push({ h: Math.abs(el.h) / nR2, cells: cells2 });
      }
      el._sheetRaw = grid; /* formulas survive reopening the editor */
      rebuildTableById(id);
      _writeWorkbookFull(el, grid, disp);
      showToast('Saved — slide & embedded workbook updated');
      d.remove();
    };
  }).catch(function (e) {
    console.warn('spreadsheet lib failed to load', e);
    d.remove();
    _openWorkbookEditorBasic(id);
  });
}

function _colLetter(ci) { var sTx = ''; ci++; while (ci > 0) { var m = (ci - 1) % 26; sTx = String.fromCharCode(65 + m) + sTx; ci = Math.floor((ci - 1) / 26); } return sTx; }

function _xesc2(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function _patchWorkbook(el, edits) {
  if (!el.oleXlsxB64 || typeof JSZip === 'undefined') return;
  try {
    var wb = await JSZip.loadAsync(el.oleXlsxB64, { base64: true });
    var path = 'xl/worksheets/sheet1.xml';
    if (!wb.file(path)) { var ks = Object.keys(wb.files).filter(function (k) { return /^xl\/worksheets\/sheet.*\.xml$/.test(k); }).sort(); if (!ks.length) return; path = ks[0]; }
    var xml = await wb.file(path).async('string');
    edits.forEach(function (ed) {
      var isNum = ed.val.trim() !== '' && isFinite(parseFloat(ed.val)) && /^-?[0-9.eE+]+$/.test(ed.val.trim());
      var cellXml = isNum ? '<c r="' + ed.ref + '"><v>' + ed.val.trim() + '</v></c>'
                          : '<c r="' + ed.ref + '" t="inlineStr"><is><t>' + _xesc2(ed.val) + '</t></is></c>';
      var re = new RegExp('<c r="' + ed.ref + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)');
      if (re.test(xml)) xml = xml.replace(re, cellXml);
    });
    wb.file(path, xml);
    el.oleXlsxB64 = await wb.generateAsync({ type: 'base64' });
    if (window._oleWb && window._oleWb[el.id]) window._oleWb[el.id].b64 = el.oleXlsxB64;
  } catch (e) { console.warn('workbook write-back failed', e); }
}

function rebuildTableById(id) {
  var ctx = window._tblCtx && window._tblCtx[id]; if (!ctx || !fc) return;
  fc.getObjects().slice().forEach(function (o) { if (o.irTable === id) fc.remove(o); });
  buildTableFromIR(ctx.el, ctx.sx, ctx.sy, fc);
  fc.renderAll(); if (typeof saveState === 'function') saveState();
}

function _openWorkbookEditorBasic(id) {
  var ctx = window._tblCtx && window._tblCtx[id]; if (!ctx) return;
  var el = ctx.el;
  var old = document.getElementById('wb-editor'); if (old) old.remove();
  var nR = el.rows.length, nC = el.cols.length;
  var d = document.createElement('div');
  d.id = 'wb-editor';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:5000;display:flex;align-items:center;justify-content:center;';
  var head = '<tr><th style="background:#F3F4F6;border:1px solid #D1D5DB;width:34px"></th>';
  for (var ci = 0; ci < nC; ci++) head += '<th style="background:#F3F4F6;border:1px solid #D1D5DB;padding:2px 10px;font-weight:600;color:#374151">' + _colLetter(ci) + '</th>';
  head += '</tr>';
  var body = '';
  for (var ri = 0; ri < nR; ri++) {
    body += '<tr><td style="background:#F3F4F6;border:1px solid #D1D5DB;text-align:center;color:#374151;font-weight:600">' + (ri + 1) + '</td>';
    for (var ci2 = 0; ci2 < nC; ci2++) {
      var cell = el.rows[ri].cells[ci2];
      var val = cell && cell.paragraphs && cell.paragraphs[0] && cell.paragraphs[0].runs[0] ? cell.paragraphs[0].runs[0].text : '';
      body += '<td style="border:1px solid #D1D5DB;padding:0"><input data-ri="' + ri + '" data-ci="' + ci2 + '" value="' + String(val).replace(/"/g, '&quot;') + '" style="border:none;padding:4px 8px;width:110px;font:inherit"></td>';
    }
    body += '</tr>';
  }
  d.innerHTML = '<div style="background:#fff;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,0.35);max-width:90vw;max-height:85vh;overflow:auto;padding:16px;font-size:13px;font-family:inherit">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px"><b style="color:#217346">&#9638; ' + (el.oleName || 'Worksheet') + '</b><button id="wb-x" style="font-size:18px">&#10005;</button></div>' +
    '<table style="border-collapse:collapse">' + head + body + '</table>' +
    '<div style="margin-top:12px;display:flex;gap:8px">' +
    '<button id="wb-save" style="background:#217346;color:#fff;border-radius:8px;padding:6px 16px;font-weight:600">Save to slide</button>' +
    '<button id="wb-dl" style="background:#EDE9FE;color:#5B21B6;border-radius:8px;padding:6px 16px;font-weight:600">Download .xlsx</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('mousedown', function (ev) { if (ev.target === d) d.remove(); });
  document.getElementById('wb-x').onclick = function () { d.remove(); };
  document.getElementById('wb-save').onclick = function () {
    var edits = [];
    d.querySelectorAll('input[data-ri]').forEach(function (inp) {
      var ri2 = +inp.dataset.ri, ci3 = +inp.dataset.ci, v = inp.value;
      var cell2 = el.rows[ri2].cells[ci3];
      if (cell2) {
        if (!cell2.paragraphs || !cell2.paragraphs.length) cell2.paragraphs = [{ align: 'left', bullet: null, runs: [{ text: '', b: ri2 === 0, i: false, u: false, sizePt: 10, color: ri2 === 0 ? '#FFFFFF' : '#333333', font: 'Calibri', spcPt: 0 }] }];
        if (cell2.paragraphs[0].runs[0].text !== v) { cell2.paragraphs[0].runs[0].text = v; edits.push({ ref: _colLetter(ci3) + (ri2 + 1), val: v }); }
      }
    });
    rebuildTableById(id);
    if (edits.length) _patchWorkbook(el, edits);
    if (typeof showToast === 'function') showToast(edits.length ? 'Saved — slide & workbook updated' : 'No changes');
    d.remove();
  };
  document.getElementById('wb-dl').onclick = function () {
    var wbk = window._oleWb[id];
    var a = document.createElement('a');
    a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbk.b64;
    a.download = wbk.name; document.body.appendChild(a); a.click(); a.remove();
  };
}

function openChartOptions(id) {
  var ctx = window._chartCtx[id]; if (!ctx) return;
  var el = ctx.el, old = document.getElementById('chart-opt-panel');
  if (old) { if (old.dataset.chart === id) return; old.remove(); }
  var d = document.createElement('div');
  d.id = 'chart-opt-panel'; d.dataset.chart = id;
  d.style.cssText = 'position:fixed;top:70px;right:12px;width:270px;max-height:78vh;overflow:auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.12);z-index:4000;padding:14px;font-family:inherit;font-size:13px;';
  var rows = '';
  el.cats.forEach(function (c, ci) {
    rows += '<tr><td><input data-cat="' + ci + '" value="' + String(c).replace(/"/g, '&quot;') + '" style="width:56px"></td>';
    el.series.forEach(function (s2, si) { rows += '<td><input data-si="' + si + '" data-ci="' + ci + '" type="number" step="any" value="' + s2.vals[ci] + '" style="width:56px"></td>'; });
    rows += '</tr>';
  });
  var heads = '<tr><td style="color:#94A3B8">Cat</td>';
  el.series.forEach(function (s2, si) {
    heads += '<td><input data-sname="' + si + '" value="' + String(s2.name || '').replace(/"/g, '&quot;') + '" style="width:56px"> <input data-scolor="' + si + '" type="color" value="' + (/^#([0-9A-Fa-f]{6})/.test(s2.color) ? s2.color.slice(0, 7) : '#4472C4') + '" style="width:24px;height:20px;padding:0;border:none"></td>';
  });
  heads += '</tr>';
  d.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Chart options</b><button id="cop-x" style="font-size:16px">&#10005;</button></div>' +
    '<label style="display:block;margin-bottom:6px">Title <input id="cop-title" value="' + String(el.title || '').replace(/"/g, '&quot;') + '" style="width:100%"></label>' +
    '<label><input type="checkbox" id="cop-legend"' + (el.hasLegend !== false ? ' checked' : '') + '> Legend</label> ' +
    '<label><input type="checkbox" id="cop-grid"' + (el.hasGrid ? ' checked' : '') + '> Gridlines</label> ' +
    '<label><input type="checkbox" id="cop-vals"' + (el.showVals ? ' checked' : '') + '> Value labels</label>' +
    '<div style="margin:8px 0 4px;color:#64748B">Data</div><table style="border-spacing:2px">' + heads + rows + '</table>' +
    '<button id="cop-apply" style="margin-top:10px;background:#7C3AED;color:#fff;border-radius:8px;padding:6px 14px;font-weight:600">Apply</button>';
  document.body.appendChild(d);
  document.getElementById('cop-x').onclick = function () { d.remove(); };
  /* LIVE apply: every keystroke/checkbox/colour change hits the graph
     immediately — no Apply click needed (kept as a manual fallback) */
  function applyChartOpts(showMsg) {
    try {
      el.title = document.getElementById('cop-title').value;
      el.hasLegend = document.getElementById('cop-legend').checked;
      el.hasGrid = document.getElementById('cop-grid').checked;
      el.showVals = document.getElementById('cop-vals').checked;
      d.querySelectorAll('input[data-cat]').forEach(function (inp) { el.cats[+inp.dataset.cat] = inp.value; });
      d.querySelectorAll('input[data-sname]').forEach(function (inp) { el.series[+inp.dataset.sname].name = inp.value; });
      d.querySelectorAll('input[data-scolor]').forEach(function (inp) { el.series[+inp.dataset.scolor].color = inp.value; });
      d.querySelectorAll('input[data-si]').forEach(function (inp) { var v = parseFloat(inp.value); if (isFinite(v)) el.series[+inp.dataset.si].vals[+inp.dataset.ci] = v; });
      rerenderChartById(id);
      if (showMsg && typeof showToast === 'function') showToast('Chart updated');
    } catch (e) { console.error('chart apply failed', e); if (typeof showToast === 'function') showToast('Chart update failed: ' + e.message); }
  }
  var _liveT = null;
  d.addEventListener('input', function () { clearTimeout(_liveT); _liveT = setTimeout(function () { applyChartOpts(false); }, 250); });
  d.addEventListener('change', function () { applyChartOpts(false); });
  document.getElementById('cop-apply').onclick = function () { applyChartOpts(true); };
}

function drawChartPng(el, pxW, pxH) {
  var cv = document.createElement('canvas');
  cv.width = Math.max(200, Math.round(pxW)); cv.height = Math.max(150, Math.round(pxH));
  var g = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var cats = el.cats || [], series = el.series || [];
  var F = Math.max(11, Math.round(H * 0.038)); /* proportional base font */
  function colorOf(s, i) {
    if (s.ptColors && s.ptColors[i]) return s.ptColors[i];
    if (el.varyColors && series.length === 1) return el.colors[i % el.colors.length];
    return s.color;
  }
  var topY = 6;
  if (el.title) {
    g.font = 'bold ' + Math.round(F * 1.25) + 'px sans-serif'; g.fillStyle = '#333333'; g.textAlign = 'center';
    g.fillText(el.title, W / 2, topY + F * 1.25); topY += F * 1.9;
  }
  /* legend: multi-series → series names; single varyColors series → categories */
  var visSeries = series.filter(function (s) { return !s.hidden; }); /* noFill spacer series stay out of the legend */
  var legend = (el.hasLegend === false) ? [] : (visSeries.length >= 1 && el.chartType !== 'pie' && el.chartType !== 'doughnut' && !(el.varyColors && series.length === 1))
    ? visSeries.map(function (s, i) { return { label: s.name || ('Series ' + (i + 1)), color: s.color }; })
    : (el.varyColors ? cats.map(function (c, i) { return { label: c, color: colorOf(series[0] || {}, i) }; }) : []);
  if (el.chartType === 'surface') {
    var sBandC = [el.colors[0], el.colors[1], '#A6A6A6', el.colors[3], el.colors[4]];
    var sStep = Math.max(1, Math.ceil((axMax0_ || 6) / 3));
    legend = [];
    for (var sb = 0; sb * sStep < (axMax0_ || 6); sb++) legend.push({ label: (sb * sStep) + '-' + ((sb + 1) * sStep), color: sBandC[sb % sBandC.length] });
  }
  if (legend.length) {
    g.font = F + 'px sans-serif';
    var lw = legend.reduce(function (a, it) { return a + F + 6 + g.measureText(it.label).width + 12; }, 0);
    var legendB = el.legendPos === 'b'; /* PowerPoint's bottom legend */
    var lx = Math.max(4, (W - lw) / 2), ly = legendB ? H - F * 0.7 : topY + F;
    legend.forEach(function (it) {
      g.fillStyle = it.color; g.fillRect(lx, ly - F * 0.8, F * 0.8, F * 0.8);
      g.fillStyle = '#555555'; g.textAlign = 'left'; g.fillText(it.label, lx + F, ly);
      lx += F + 6 + g.measureText(it.label).width + 12;
    });
    if (legendB) H = H - F * 2.1; /* body lays out above the legend band */
    else topY = ly + F * 0.6;
  }
  var allVals = [];
  var stacked = el.grouping === 'stacked' || el.grouping === 'percentStacked';
  if (stacked) {
    /* stacked: the axis must fit each CATEGORY's column total, not single values */
    var nCats = Math.max.apply(null, series.map(function (s) { return s.vals.length; }).concat([0]));
    for (var ci2 = 0; ci2 < nCats; ci2++) {
      var colSum = 0;
      series.forEach(function (s) { var v = s.vals[ci2]; if (isFinite(v)) colSum += v; });
      allVals.push(colSum);
    }
  } else series.forEach(function (s) { s.vals.forEach(function (v) { if (isFinite(v)) allVals.push(v); }); });
  var maxV = Math.max.apply(null, allVals.concat([1]));
  /* PPT auto axis (5% headroom, nice major unit) — shared with the native renderer */
  var axMax = pptAxisScale(maxV, el.axMaxFile).max;
  var axMax0_ = axMax;
  if (el.chartType === 'pie' || el.chartType === 'doughnut') {
    var s0 = series[0] || { vals: [] };
    var tot = s0.vals.reduce(function (a, b) { return a + (isFinite(b) ? b : 0); }, 0) || 1;
    var cx = W / 2, cy = (H + topY) / 2, R = Math.min(W / 2, (H - topY) / 2) - 8, a0 = -Math.PI / 2;
    s0.vals.forEach(function (v, i) {
      var a1 = a0 + (v / tot) * 2 * Math.PI;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath();
      g.fillStyle = colorOf(s0, i); g.fill(); a0 = a1;
    });
    if (el.chartType === 'doughnut') {
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(cx, cy, R * 0.5, 0, 2 * Math.PI); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
  } else if (el.chartType === 'radar') {
    var rcx = W / 2, rcy = (H + topY) / 2, RR = Math.min(W / 2, (H - topY) / 2) - F * 3;
    var nSp = Math.max(3, cats.length);
    var spAng = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / nSp; };
    /* rings + spokes */
    g.strokeStyle = '#CCCCCC'; g.lineWidth = 1;
    for (var ring = 1; ring <= 5; ring++) {
      g.beginPath();
      for (var si3 = 0; si3 <= nSp; si3++) {
        var ra = spAng(si3 % nSp), rr = RR * ring / 5;
        var rxp = rcx + rr * Math.cos(ra), ryp = rcy + rr * Math.sin(ra);
        if (si3 === 0) g.moveTo(rxp, ryp); else g.lineTo(rxp, ryp);
      }
      g.stroke();
    }
    for (var sk = 0; sk < nSp; sk++) {
      g.beginPath(); g.moveTo(rcx, rcy);
      g.lineTo(rcx + RR * Math.cos(spAng(sk)), rcy + RR * Math.sin(spAng(sk))); g.stroke();
    }
    /* ring values up the top spoke + category labels at the tips */
    g.fillStyle = '#666666'; g.textAlign = 'right';
    for (var rv = 0; rv <= 5; rv++) g.fillText(String(Math.round(axMax * rv / 5 * 10) / 10), rcx - 4, rcy - RR * rv / 5 + F * 0.35);
    g.textAlign = 'center';
    cats.forEach(function (c, i2) {
      var la = spAng(i2);
      var lx2 = rcx + (RR + F * 1.1) * Math.cos(la), ly2 = rcy + (RR + F * 1.1) * Math.sin(la);
      g.fillText(String(c).slice(0, 12), lx2, ly2 + F * 0.35);
    });
    /* series polygons with markers */
    series.forEach(function (s, si4) {
      g.strokeStyle = s.color; g.lineWidth = Math.max(2, F * 0.16); g.beginPath();
      s.vals.forEach(function (v, i3) {
        var pa = spAng(i3), pr = RR * (v / axMax);
        var ppx = rcx + pr * Math.cos(pa), ppy = rcy + pr * Math.sin(pa);
        if (i3 === 0) g.moveTo(ppx, ppy); else g.lineTo(ppx, ppy);
      });
      g.closePath(); g.stroke();
      var mr2 = Math.max(3, F * 0.25);
      g.fillStyle = s.color;
      s.vals.forEach(function (v, i3) {
        var pa = spAng(i3), pr = RR * (v / axMax);
        var ppx = rcx + pr * Math.cos(pa), ppy = rcy + pr * Math.sin(pa);
        g.beginPath();
        if (si4 % 2 === 1) g.rect(ppx - mr2, ppy - mr2, mr2 * 2, mr2 * 2); /* squares for series 2, PPT-style */
        else { g.moveTo(ppx, ppy - mr2); g.lineTo(ppx + mr2, ppy); g.lineTo(ppx, ppy + mr2); g.lineTo(ppx - mr2, ppy); g.closePath(); }
        g.fill();
      });
    });
  } else if (el.chartType === 'surface') {
    /* pseudo-3D surface, PowerPoint-style: the surface is coloured by VALUE
       BAND (contours), not per facet — each quad is sub-tessellated and
       every sub-cell painted by the band its interpolated value falls in */
    var m = series.length, nS = Math.max(2, cats.length || (series[0] ? series[0].vals.length : 2));
    var offX = (W * 0.16) / Math.max(1, m - 1), offY = ((H - topY) * 0.22) / Math.max(1, m - 1);
    var px0 = W * 0.14, plotW2 = W * 0.52, baseY = H - F * 2.6, plotH2 = (H - topY) * 0.5;
    var valAt = function (fi, fj) { /* bilinear value over fractional grid coords */
      var i0 = Math.floor(fi), j0 = Math.floor(fj);
      var i1 = Math.min(nS - 1, i0 + 1), j1 = Math.min(m - 1, j0 + 1);
      var ti = fi - i0, tj = fj - j0;
      var vv = function (ii, jj) { var s2 = series[jj]; return (s2 && isFinite(s2.vals[ii])) ? s2.vals[ii] : 0; };
      return vv(i0, j0) * (1 - ti) * (1 - tj) + vv(i1, j0) * ti * (1 - tj) + vv(i0, j1) * (1 - ti) * tj + vv(i1, j1) * ti * tj;
    };
    var proj = function (fi, fj, v) {
      return { x: px0 + plotW2 * (nS > 1 ? fi / (nS - 1) : 0.5) + offX * fj,
               y: baseY - plotH2 * (v / axMax) - offY * fj };
    };
    var bandC = [el.colors[0], el.colors[1], '#A6A6A6', el.colors[3], el.colors[4]];
    var step2 = Math.max(1, Math.ceil(axMax / 3));
    /* back-plane gridlines (the slanted frame behind the surface) */
    g.strokeStyle = '#BBBBBB'; g.lineWidth = 1;
    for (var tg2 = 0; tg2 <= axMax; tg2 += step2) {
      var gy = baseY - plotH2 * tg2 / axMax;
      g.beginPath();
      g.moveTo(px0, gy);
      g.lineTo(px0 + offX * (m - 1), gy - offY * (m - 1));
      g.lineTo(px0 + plotW2 + offX * (m - 1), gy - offY * (m - 1));
      g.stroke();
    }
    /* surface: back rows first, 8×8 sub-cells per quad, contour-banded */
    var SUB = 8;
    for (var j2 = m - 2; j2 >= 0; j2--) {
      for (var i2 = 0; i2 < nS - 1; i2++) {
        for (var sj = SUB - 1; sj >= 0; sj--) {
          for (var si5 = 0; si5 < SUB; si5++) {
            var f0 = i2 + si5 / SUB, f1 = i2 + (si5 + 1) / SUB;
            var h0 = j2 + sj / SUB, h1 = j2 + (sj + 1) / SUB;
            var vA = valAt(f0, h0), vB = valAt(f1, h0), vC = valAt(f1, h1), vD = valAt(f0, h1);
            var pA = proj(f0, h0, vA), pB = proj(f1, h0, vB), pC = proj(f1, h1, vC), pD = proj(f0, h1, vD);
            var mid = (vA + vB + vC + vD) / 4;
            g.beginPath(); g.moveTo(pA.x, pA.y); g.lineTo(pB.x, pB.y); g.lineTo(pC.x, pC.y); g.lineTo(pD.x, pD.y); g.closePath();
            g.fillStyle = bandC[Math.max(0, Math.min(bandC.length - 1, Math.floor((mid - 0.0001) / step2)))];
            g.fill();
          }
        }
        /* facet edge, drawn once per real quad for the meshy look */
        var qA = proj(i2, j2, valAt(i2, j2)), qB = proj(i2 + 1, j2, valAt(i2 + 1, j2)),
            qC = proj(i2 + 1, j2 + 1, valAt(i2 + 1, j2 + 1)), qD = proj(i2, j2 + 1, valAt(i2, j2 + 1));
        g.beginPath(); g.moveTo(qA.x, qA.y); g.lineTo(qB.x, qB.y); g.lineTo(qC.x, qC.y); g.lineTo(qD.x, qD.y); g.closePath();
        g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.stroke();
      }
    }
    /* frame: value axis, base, receding row axis with ticks */
    g.strokeStyle = '#888888'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(px0, baseY); g.lineTo(px0, baseY - plotH2); g.stroke();
    g.beginPath(); g.moveTo(px0, baseY); g.lineTo(px0 + plotW2, baseY); g.stroke();
    g.beginPath(); g.moveTo(px0 + plotW2, baseY); g.lineTo(px0 + plotW2 + offX * (m - 1), baseY - offY * (m - 1)); g.stroke();
    g.fillStyle = '#444444'; g.textAlign = 'right';
    for (var tv2 = 0; tv2 <= axMax; tv2 += step2) g.fillText(String(tv2), px0 - 5, baseY - plotH2 * tv2 / axMax + F * 0.35);
    g.textAlign = 'center';
    cats.forEach(function (c, i3) { g.fillText(String(c).slice(0, 10), px0 + plotW2 * (nS > 1 ? i3 / (nS - 1) : 0.5), baseY + F * 1.3); });
    g.textAlign = 'left';
    series.forEach(function (s, j3) {
      var rax = px0 + plotW2 + offX * j3, ray = baseY - offY * j3;
      g.beginPath(); g.moveTo(rax - 3, ray); g.lineTo(rax + 3, ray); g.strokeStyle = '#888888'; g.stroke();
      g.fillText(String(s.name || ('Row' + (j3 + 1))).slice(0, 10), rax + F * 0.5, ray + F * 0.35);
    });
  } else {
    g.font = F + 'px sans-serif';
    var horiz = el.chartType === 'bar' && el.barDir === 'bar';
    var padL, padR = 10;
    if (horiz) {
      /* horizontal bars: the left gutter holds CATEGORY labels */
      padL = 0;
      cats.forEach(function (c) { padL = Math.max(padL, g.measureText(String(c).slice(0, 14)).width); });
      padL += F * 1.2;
    } else padL = g.measureText(String(Math.round(axMax))).width + F * 1.2;
    var padB = horiz ? F * 2.4 : F * 2, padT2 = topY + F * 0.8;
    var plotW = W - padL - padR, plotH = H - padT2 - padB;
    var n = Math.max(cats.length, series[0] ? series[0].vals.length : 0, 1);
    g.textAlign = 'right'; g.fillStyle = '#888888'; g.strokeStyle = '#E5E5E5'; g.lineWidth = 1;
    var tickN = el.hasGrid ? 5 : 1;
    if (horiz) {
      /* VERTICAL gridlines for horizontal bars — value axis runs along X */
      if (el.hasGrid) for (var tv = 0; tv <= tickN; tv++) {
        var gx = padL + plotW * tv / tickN;
        g.beginPath(); g.moveTo(gx, padT2); g.lineTo(gx, H - padB); g.stroke();
      }
    } else {
      /* no majorGridlines in the file → PowerPoint's minimal axis: labels at
         0 and max only, no horizontal lines */
      for (var t = 0; t <= tickN; t++) {
        var vy = H - padB - plotH * t / tickN;
        if (el.hasGrid) { g.beginPath(); g.moveTo(padL, vy); g.lineTo(W - padR, vy); g.stroke(); }
        g.fillText(String(Math.round(axMax * t / tickN)), padL - 5, vy + F * 0.35);
      }
    }
    g.strokeStyle = '#AAAAAA';
    g.beginPath(); g.moveTo(padL, padT2); g.lineTo(padL, H - padB); g.lineTo(W - padR, H - padB); g.stroke();
    if (el.chartType === 'line' || el.chartType === 'area' || el.chartType === 'scatter' || el.chartType === 'bubble') {
      var isArea = el.chartType === 'area', isScat = el.chartType === 'scatter' || el.chartType === 'bubble';
      var isBub = el.chartType === 'bubble';
      var maxSz = 1;
      if (isBub) series.forEach(function (s) { (s.sizes || []).forEach(function (z) { if (z > maxSz) maxSz = z; }); });
      var xMaxS = 1;
      if (isScat) { /* numeric x-axis gets its own nice max */
        var allX = [];
        series.forEach(function (s) { (s.xs || []).forEach(function (x2) { if (isFinite(x2)) allX.push(x2); }); });
        var mxX = Math.max.apply(null, allX.concat([1]));
        var magX = Math.pow(10, Math.floor(Math.log(mxX) / Math.LN10));
        xMaxS = Math.ceil(mxX / magX * 2) / 2 * magX;
      }
      var ptX = function (s, i) {
        if (isScat && s.xs) return padL + plotW * ((s.xs[i] || 0) / xMaxS);
        if (isArea) return padL + plotW * (n > 1 ? i / (n - 1) : 0.5); /* areas run edge-to-edge */
        return padL + plotW * (i + 0.5) / n;
      };
      series.forEach(function (s) {
        if (isArea && s.vals.length) { /* filled body first, PPT solid style */
          g.beginPath();
          s.vals.forEach(function (v, i) {
            var x = ptX(s, i), y = H - padB - plotH * (v / axMax);
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
          });
          g.lineTo(ptX(s, s.vals.length - 1), H - padB);
          g.lineTo(ptX(s, 0), H - padB);
          g.closePath(); g.fillStyle = s.color; g.fill();
        }
        if (!isScat) {
          g.strokeStyle = s.color; g.lineWidth = Math.max(2, F * 0.18); g.beginPath();
          s.vals.forEach(function (v, i) {
            var x = ptX(s, i), y = H - padB - plotH * (v / axMax);
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
          });
          g.stroke();
        }
        if (isBub) { /* circles scaled by bubbleSize (area-proportional) */
          var rMax = Math.min(plotW, plotH) * 0.13;
          g.fillStyle = s.color;
          s.vals.forEach(function (v, i) {
            var bx2 = ptX(s, i), by2 = H - padB - plotH * (v / axMax);
            var bz = (s.sizes && s.sizes[i] != null) ? s.sizes[i] : maxSz;
            var br2 = Math.max(3, rMax * Math.sqrt(Math.max(0.02, bz / maxSz)));
            g.beginPath(); g.arc(bx2, by2, br2, 0, 2 * Math.PI); g.fill();
          });
        } else if (s.marker || isScat) { /* diamonds, PowerPoint's default symbol */
          var mr = Math.max(3, F * 0.28);
          g.fillStyle = s.color;
          s.vals.forEach(function (v, i) {
            var mx = ptX(s, i), my = H - padB - plotH * (v / axMax);
            g.beginPath(); g.moveTo(mx, my - mr); g.lineTo(mx + mr, my); g.lineTo(mx, my + mr); g.lineTo(mx - mr, my); g.closePath(); g.fill();
          });
        }
      });
      if (isScat) { /* numeric x ticks in place of category labels */
        g.fillStyle = '#666666'; g.textAlign = 'center';
        for (var tS = 0; tS <= 4; tS++) {
          var xv = xMaxS * tS / 4;
          g.fillText(String(Math.round(xv * 100) / 100), padL + plotW * tS / 4, H - padB + F * 1.2);
        }
      }
    } else if (el.chartType === 'bar' && el.barDir === 'bar') {
      /* HORIZONTAL bars: categories on Y (first at the BOTTOM, PowerPoint
         convention), values along X */
      var rowH = plotH / n;
      var nColsH = stacked ? 1 : Math.max(1, series.length);
      var barT = Math.max(2, rowH / (nColsH + (el.gapWidth == null ? 150 : el.gapWidth) / 100));
      var stackBaseH = [];
      series.forEach(function (s, si2) {
        s.vals.forEach(function (v, i) {
          var bl = plotW * (v / axMax);
          var rowTop = H - padB - (i + 1) * rowH; /* cat 0 at bottom */
          var by = stacked ? (rowTop + (rowH - barT) / 2)
                           : (rowTop + (rowH - barT * series.length) / 2 + (series.length - 1 - si2) * barT);
          var baseH2 = stacked ? (stackBaseH[i] || 0) : 0;
          if (!s.hidden) {
            g.fillStyle = colorOf(s, i);
            g.fillRect(padL + baseH2, by, bl, barT - 1);
            g.fillStyle = '#555555'; g.textAlign = 'left';
            if (el.showVals) g.fillText(String(v), padL + baseH2 + bl + 3, by + barT * 0.7);
          }
          if (stacked) stackBaseH[i] = baseH2 + bl;
        });
      });
      /* category labels left of the axis, row-centred */
      g.fillStyle = '#666666'; g.textAlign = 'right';
      cats.forEach(function (c, i) { g.fillText(String(c).slice(0, 14), padL - 6, H - padB - (i + 1) * rowH + rowH / 2 + F * 0.35); });
      /* value ticks along the bottom (same divisions as the gridlines) */
      g.textAlign = 'center'; g.fillStyle = '#888888';
      var tickNH = el.hasGrid ? 5 : 1;
      for (var tH = 0; tH <= tickNH; tH++) g.fillText(String(Math.round(axMax * tH / tickNH)), padL + plotW * tH / tickNH, H - padB + F * 1.2);
    } else {
      /* gapWidth (default 150) = gap as % of one bar: barW = group/(nSeries + gap/100) */
      var groupW = plotW / n;
      var barSers = series.filter(function (s) { return !s.kind || s.kind === 'bar'; });
      var comboLines = series.filter(function (s) { return s.kind && s.kind !== 'bar'; });
      var nCols = stacked ? 1 : Math.max(1, barSers.length);
      var barW = Math.max(2, groupW / (nCols + (el.gapWidth == null ? 150 : el.gapWidth) / 100));
      var stackBase = []; /* per-category cumulative height (px) */
      barSers.forEach(function (s, si2) {
        s.vals.forEach(function (v, i) {
          var bh = plotH * (v / axMax);
          var bx = stacked ? (padL + groupW * i + (groupW - barW) / 2)
                           : (padL + groupW * i + (groupW - barW * barSers.length) / 2 + si2 * barW);
          var base = stacked ? (stackBase[i] || 0) : 0;
          if (!s.hidden) {
            g.fillStyle = colorOf(s, i);
            g.fillRect(bx, H - padB - base - bh, barW - 1, bh);
            /* value label above bar */
            g.fillStyle = '#555555'; g.textAlign = 'center';
            if (el.showVals) g.fillText(String(v), bx + barW / 2, H - padB - base - bh - F * 0.4);
          }
          if (stacked) stackBase[i] = base + bh;
        });
      });
      /* combo overlay: line/area series drawn over the bars at category centres */
      comboLines.forEach(function (s) {
        g.strokeStyle = s.color; g.lineWidth = Math.max(2, F * 0.16); g.beginPath();
        s.vals.forEach(function (v, i) {
          var lx3 = padL + groupW * (i + 0.5), ly3 = H - padB - plotH * (v / axMax);
          if (i === 0) g.moveTo(lx3, ly3); else g.lineTo(lx3, ly3);
        });
        g.stroke();
        var mr3 = Math.max(3, F * 0.24);
        g.fillStyle = s.color;
        s.vals.forEach(function (v, i) {
          g.beginPath(); g.arc(padL + groupW * (i + 0.5), H - padB - plotH * (v / axMax), mr3, 0, 2 * Math.PI); g.fill();
        });
      });
    }
    if (!(el.chartType === 'bar' && el.barDir === 'bar')) {
      g.fillStyle = '#666666'; g.textAlign = 'center';
      cats.forEach(function (c, i) {
        var cx2 = el.chartType === 'area' ? (padL + plotW * (n > 1 ? i / (n - 1) : 0.5)) : (padL + plotW * (i + 0.5) / n);
        g.fillText(String(c).slice(0, 14), cx2, H - padB + F * 1.2);
      });
    }
  }
  return cv.toDataURL('image/png');
}

async function renderSlideIR(slideIR, deckIR, fc) {
  if (!fc || !slideIR || !deckIR) return;
  /* STALE-RENDER GUARD (slide-bleed audit): each call takes ownership of the
     canvas by bumping the generation. An older render still awaiting images
     sees the bump and stops adding — slide 1's late photos can no longer
     bleed onto slide 3. */
  var __gen = (fc.__ldRenderGen = (fc.__ldRenderGen || 0) + 1);
  fc.clear();
  var cw = fc._baseWidth || fc.getWidth();
  var ch = fc._baseHeight || fc.getHeight();
  var sx = cw / (deckIR.size.w || 1), sy = ch / (deckIR.size.h || 1);
  /* SLIDE-EDGE SCISSOR (31 Jul 2026, owner rule): PowerPoint clips every
     shape at the slide boundary — bleed designs (a circle hanging off the
     corner) show CUT at the edge, never spilling outside the canvas. The
     renderer drew the full object extents, so imported bleed elements
     leaked past the slide border in the editor AND the brain. Clip the
     whole canvas render to the slide rectangle — not a pixel outside. */
  fc.clipPath = new fabric.Rect({ left: 0, top: 0, width: cw, height: ch,
    selectable: false, evented: false });
  applyBackgroundIR(slideIR.background, fc, cw, ch);

  /* Sequential rendering: images are AWAITED in place so every element keeps
     its true document z-order (before: images were added after all text,
     landing on top of everything and swallowing clicks). */
  fc.targetFindTolerance = 4;
  for (var i = 0; i < slideIR.elements.length; i++) {
    if (fc.__ldRenderGen !== __gen) return; /* a newer page render owns the canvas — stop */
    var el = slideIR.elements[i];
    if (el.type === 'shape') renderShapeElementIR(el, sx, sy, fc);
    else if (el.type === 'text') {
      /* A shape that carries text (styled boxes, numbered circles, step
         chevrons) must draw its BODY too — skipping it left white text
         floating invisible on white. */
      if ((el.fill && el.fill.type && el.fill.type !== 'none') || el.stroke) {
        renderShapeElementIR(Object.assign({}, el, { type: 'shape', __isBody: true }), sx, sy, fc);
      }
      /* Mixed-size paragraphs (big heading + small subtitle in ONE box):
         a single canvas textbox has one line-spacing, so the small paragraph
         inherited the big one's spacing and OVERLAPPED it. PowerPoint spaces
         each paragraph by its own metrics — so heterogeneous paragraphs are
         rendered as their own stacked blocks. */
      var paras = el.paragraphs || [];
      var pSizes = paras.map(function (p) { return (p.runs[0] && p.runs[0].sizePt) || 18; });
      var hetero = paras.length > 1 && (Math.max.apply(null, pSizes) / Math.min.apply(null, pSizes) > 1.25);
      if (!hetero) {
        fc.add(buildTextboxFromIR(el, sx, sy));
      } else {
        var yCur = null;
        for (var pi2 = 0; pi2 < paras.length; pi2++) {
          var sub = Object.assign({}, el, { paragraphs: [paras[pi2]], bodyAnchor: 't' });
          var tbp = buildTextboxFromIR(sub, sx, sy);
          tbp.set({ irPara: pi2 });
          if (yCur == null) yCur = tbp.top; else tbp.set({ top: yCur });
          yCur = tbp.top + tbp.height * 1.05;
          fc.add(tbp);
        }
      }
    }
    else if (el.type === 'line') renderLineElementIR(el, sx, sy, fc);
    else if (el.type === 'table') {
      buildTableFromIR(el, sx, sy, fc);
      window._tblCtx = window._tblCtx || {}; window._tblCtx[el.id] = { el: el, sx: sx, sy: sy };
      if (el.oleXlsxB64) { window._oleWb = window._oleWb || {}; window._oleWb[el.id] = { b64: el.oleXlsxB64, name: el.oleName || 'workbook.xlsx' }; }
    }
    else if (el.type === 'chart') {
      var _cOk = false;
      try { _cOk = renderChartFabric(el, sx, sy, fc); } catch (e) { console.warn('native chart render failed, png fallback', e); }
      if (!_cOk) await renderImageElementIR(Object.assign({}, el, { type: 'image', format: 'png', src: drawChartPng(el, Math.abs(el.w) / 4762.5, Math.abs(el.h) / 4762.5) }), sx, sy, fc);
    }
    else if (el.type === 'image') {
      await renderImageElementIR(el, sx, sy, fc);
      if (el.oleFileB64) { window._oleDoc = window._oleDoc || {}; window._oleDoc[el.id] = { b64: el.oleFileB64, name: el.oleFileName || 'document.bin', el: el }; }
    }
  }
  /* ═══ ROUND-TRIP GEOMETRY GUARD (stamp side) ═══
     Fabric bounding boxes are NOT trustworthy as file geometry — an SVG
     group's box is its CONTENT bounds, not its viewBox (a rotated gradient
     alone can inflate it: the 13143929² "giant golden frame" bug). So every
     imported object remembers its birth transform (irC0). At export,
     slideIRFromCanvas compares against irC0: untouched → the ORIGINAL file
     geometry is written back verbatim; moved/scaled → only the user's delta
     is applied to the original geometry. Export→reimport becomes a no-op. */
  if (fc.__ldRenderGen !== __gen) return; /* stale render: skip stamp + renderAll */
  try {
    fc.getObjects().forEach(function (o) {
      if (!o.irId || o.irBody || o.irPara != null || o.irTable || o.irChart) return;
      if (o.irReflOf || o.irGlowOf || o.irSoftOf) return;
      var wpx = (o.width || 0) * (o.scaleX || 1), hpx = (o.height || 0) * (o.scaleY || 1);
      var l = o.left || 0, t = o.top || 0;
      if (o.originX === 'center') l -= wpx / 2;
      if (o.originY === 'center') t -= hpx / 2;
      o.irC0 = { l: l, t: t, w: wpx, h: hpx, a: o.angle || 0 };
    });
  } catch (e) { console.warn('irC0 stamp failed', e); }
  fc.renderAll();
}

function fontFromFabric(ff) {
  if (!ff) return null;
  var f = String(ff).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  return f || null;
}

function fillIRFromFabric(f) {
  if (!f) return { type: 'none' };
  if (typeof f === 'string') return f ? { type: 'solid', color: f } : { type: 'none' };
  if (f.colorStops && f.coords) {
    var stops = (f.colorStops || []).map(function (s) { return { pos: s.offset, color: s.color }; });
    var ang = Math.atan2((f.coords.y2 - f.coords.y1), (f.coords.x2 - f.coords.x1)) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    return { type: 'gradient', stops: stops, angleDeg: ang };
  }
  return { type: 'none' };
}

function runsFromFabricLine(lineText, lineStyles, base) {
  var groups = [], cur = null;
  for (var i = 0; i < lineText.length; i++) {
    var st = (lineStyles && lineStyles[i]) || {};
    var key = JSON.stringify([st.fontSize, st.fill, st.fontWeight, st.fontStyle, st.underline, st.fontFamily, st.charSpacing]);
    if (!cur || cur.key !== key) { cur = { key: key, text: '', st: st }; groups.push(cur); }
    cur.text += lineText[i];
  }
  if (!groups.length) groups.push({ text: lineText, st: {} });
  return groups.map(function (g) {
    var fpx = g.st.fontSize || base.fontPx;
    var sizePt = Math.max(1, fpx * base.S / 12700);
    var cs = g.st.charSpacing != null ? g.st.charSpacing : base.charSpacing;
    return {
      text: g.text,
      b: (function(fw){ return fw === 'bold' || (parseInt(fw, 10) || 0) >= 600; })(g.st.fontWeight || base.fontWeight),
      i: (g.st.fontStyle || base.fontStyle) === 'italic',
      u: g.st.underline != null ? !!g.st.underline : !!base.underline,
      sizePt: sizePt,
      color: g.st.fill || base.fill || '#000000',
      font: fontFromFabric(g.st.fontFamily || base.fontFamily) || 'Calibri',
      spcPt: cs ? (cs / 1000) * sizePt : 0
    };
  });
}

function textIRFromFabric(o, S, orig) {
  var el = {
    id: (orig && orig.id) || ('edit-' + Math.random().toString(36).slice(2, 8)),
    origin: (orig && orig.origin) || 'slide', type: 'text',
    x: (o.left || 0) * S, y: (o.top || 0) * S,
    w: Math.max(1, (o.width || 100) * (o.scaleX || 1) * S),
    h: Math.max(1, (o.height || 40) * (o.scaleY || 1) * S),
    rot: o.angle || 0, flipH: !!o.flipX, flipV: !!o.flipY,
    geom: (orig && orig.geom) || { preset: 'rect' },
    fill: (orig && orig.fill) || null,
    bodyAnchor: (orig && orig.bodyAnchor) || 't', paragraphs: []
  };
  /* ═══ HALF-HEADING FIX (7 Aug) ═══
     1) BODY-FRAME PROPS: a source frame's insets/wrap/warp are NOT derivable
        from the fabric object — dropping them re-added default padding
        (91440/45720 EMU) to zero-inset boxes, so tall display fonts
        (TAN Grandeur etc.) clipped at the frame edge on reimport. Carry them. */
  if (orig) {
    el.insL = orig.insL; el.insR = orig.insR; el.insT = orig.insT; el.insB = orig.insB;
    el.wrapNone = orig.wrapNone; el.anchorCtr = orig.anchorCtr;
    el.txWarp = orig.txWarp; el.txVert = orig.txVert;
    el.numCol = orig.numCol; el.spcCol = orig.spcCol;
    el.stroke = orig.stroke; el.shadow = orig.shadow;
    el.glow = orig.glow; el.reflection = orig.reflection;
  }
  /* 2) ROUND-TRIP GEOMETRY GUARD — same rule shapes/images already follow in
        slideIRFromCanvas, but text never got it: canvas-measured text bounds
        sit LOWER and SHORTER than the true frame (fabric line-height ≠ file
        line spacing), so an untouched 98pt-spaced heading exported into a
        box ~70% of its real height, pushed ~24pt down — renderers that clip
        to the frame (Canva import) sliced the letters in half.
        Untouched box → original file geometry verbatim.
        Moved/scaled  → only the user's delta applied to the original. */
  if (orig && o.irC0 && orig.x != null && orig.w != null) {
    var _c0 = o.irC0, _EPX = 0.75;
    var _wPx = (o.width || 0) * (o.scaleX || 1), _hPx = (o.height || 0) * (o.scaleY || 1);
    var _l = o.left || 0, _t = o.top || 0;
    if (o.originX === 'center') _l -= _wPx / 2;
    if (o.originY === 'center') _t -= _hPx / 2;
    var _moved = Math.abs(_l - _c0.l) > _EPX || Math.abs(_t - _c0.t) > _EPX;
    var _sized = Math.abs(_wPx - _c0.w) > _EPX || Math.abs(_hPx - _c0.h) > _EPX;
    var _spun = Math.abs((o.angle || 0) - (_c0.a || 0)) > 0.05;
    if (!_moved && !_sized && !_spun) {
      el.x = orig.x; el.y = orig.y; el.w = orig.w; el.h = orig.h; el.rot = orig.rot || 0;
    } else {
      var _kx = _c0.w > 0.01 ? _wPx / _c0.w : 1, _ky = _c0.h > 0.01 ? _hPx / _c0.h : 1;
      el.x = orig.x + (_l - _c0.l) * S; el.y = orig.y + (_t - _c0.t) * S;
      el.w = orig.w * _kx; el.h = orig.h * _ky;
      el.rot = (orig.rot || 0) + ((o.angle || 0) - (_c0.a || 0));
    }
  }
  var curText = o.text || '';
  var origText = (orig && orig.paragraphs) ? orig.paragraphs.map(function (p) { return p.runs.map(function (r) { return r.text; }).join(''); }).join('\n') : null;
  if (orig && origText === curText) { el.paragraphs = orig.paragraphs; return el; } /* moved/resized only: keep exact original runs */
  var base = { fontPx: o.fontSize || 18, fontWeight: o.fontWeight, fontStyle: o.fontStyle, underline: o.underline, fill: typeof o.fill === 'string' ? o.fill : '#000000', fontFamily: o.fontFamily, charSpacing: o.charSpacing, S: S };
  var lines = curText.split('\n');
  el.paragraphs = lines.map(function (ln, li) {
    return { align: o.textAlign === 'center' ? 'center' : o.textAlign === 'right' ? 'right' : String(o.textAlign).indexOf('justify') === 0 ? 'justify' : 'left',
             lvl: 0, bullet: null, lineSpacingPct: o.lineHeight || null, lineSpacingPts: null,
             runs: runsFromFabricLine(ln, o.styles && o.styles[li], base) };
  });
  return el;
}

async function buildEffectiveDeckIR() {
  if (window._masterMode) { try { ldSyncMastersFromCanvas(); } catch (e) { console.warn(e); } } /* export straight from master view still ships latest masters */
  if (typeof captureCurrentPage === 'function') { try { await captureCurrentPage(); } catch (e) { console.warn(e); } }
  var size = window._deckIR ? window._deckIR.size : { w: 12192000, h: 6858000 };
  var theme = window._deckIR ? window._deckIR.theme : { colors: {}, majorFont: 'Calibri', minorFont: 'Calibri' };
  var S = size.w / (fc && fc._baseWidth ? fc._baseWidth : 960);
  /* virtual-master elements: pages never visited hold only IR, so convert
     the master stamps to IR once and append to those slides at export —
     every slide ships them as PLAIN elements (no pptx master = Canva-safe) */
  var masterEls = [];
  if (window._ldMasters && window._ldMasters.length) {
    try { masterEls = slideIRFromCanvas({ objects: window._ldMasters, background: null }, null, S).elements; }
    catch (e) { console.warn('master element export failed', e); }
  }
  var slides = state.pages.map(function (page) {
    if (page.canvasJSON) { try { return slideIRFromCanvas(page.canvasJSON, page.ir, S); } catch (e) { console.warn('edit-sync failed for a page, using imported IR', e); } }
    if (page.ir) {
      if (!masterEls.length) return page.ir;
      return Object.assign({}, page.ir, { elements: (page.ir.elements || []).concat(masterEls) });
    }
    return { id: 'blank', background: { type: 'solid', color: page.pendingBg || '#FFFFFF' }, elements: masterEls.slice() };
  });
  var outDeck = { size: size, theme: theme, slides: slides };
  /* EXPORT FIDELITY (155KB-file audit): the effective deck must carry the
     deck-level payloads too, or export ships without them. embeddedFonts is
     the buyer's own font files ("keep original" contract); fontPolicy lets
     the free-kit sweep + embeddedFonts-strip still fire on 'free'. */
  if (window._deckIR) {
    if (window._deckIR.embeddedFonts) outDeck.embeddedFonts = window._deckIR.embeddedFonts;
    if (window._deckIR.fontPolicy) outDeck.fontPolicy = window._deckIR.fontPolicy;
  }
  return outDeck;
}

async function rasterizeSvgElToPng(el) {
  return new Promise(function (resolve) {
    try {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      var pxW = Math.max(2, Math.round(Math.abs(el.w) / 9525)), pxH = Math.max(2, Math.round(Math.abs(el.h) / 9525));
      img.onload = function () {
        try {
          var cv = document.createElement('canvas'); cv.width = Math.min(4096, pxW * 2); cv.height = Math.min(4096, pxH * 2);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = el.src;
    } catch (e) { resolve(null); }
  });
}
