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
function slidesFromOutlineV2() {
  var raw = prompt('Paste an outline.\n\nA line with no indent starts a new slide (its title).\nIndented lines become that slide’s text.');
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
