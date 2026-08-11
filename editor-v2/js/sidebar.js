/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — SIDEBAR (Canva-style rail + drawer)    owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   THE WALL: engine access ONLY via Editor.run / Editor.query / Editor.on.
   Renders into #sidebar-slot only. Icons: window.RBIcons.
   Styling: css/editor.css section 7.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function svg(name, cls) {
    var s = el('span', cls || 'sb-svg');
    var art = (window.RBIcons && window.RBIcons[name]) || null;
    if (art) s.innerHTML = art;
    else { s.className = (cls || 'sb-svg') + ' material-icons-outlined'; s.textContent = name; }
    return s;
  }
  function mat(name, cls) {
    var s = el('span', (cls || '') + ' material-icons-outlined');
    s.textContent = name;
    return s;
  }
  function run(cmd, arg) { return window.Editor ? window.Editor.run(cmd, arg) : false; }
  function ask(key) { try { return window.Editor ? window.Editor.query(key) : null; } catch (e) { return null; } }
  function listen(ev, fn) { if (window.Editor) window.Editor.on(ev, fn); }

  var slot = document.getElementById('sidebar-slot');
  if (!slot) return;

  /* ── panel helpers ───────────────────────────────────────────────── */
  function head(title) {
    var h = el('div', 'sb-head');
    h.appendChild(el('b', null, title));
    var x = el('button', 'sb-close'); x.type = 'button'; x.title = 'Close';
    x.appendChild(mat('close', 'sb-close-i'));
    x.addEventListener('click', closeDrawer);
    h.appendChild(x);
    return h;
  }
  function search(placeholder) {
    var w = el('div', 'sb-search');
    var i = el('input'); i.type = 'text'; i.placeholder = placeholder;
    w.appendChild(i);
    return w;
  }
  function emptyState(icon, title, sub) {
    var e = el('div', 'sb-empty');
    e.appendChild(mat(icon, 'sb-empty-i'));
    e.appendChild(el('b', null, title));
    e.appendChild(el('span', null, sub));
    return e;
  }
  function cardBtn(spec) {
    var b = el('button', 'sb-card');
    b.type = 'button'; b.title = spec.tip || spec.label;
    if (spec.ic) b.appendChild(svg(spec.ic, 'sb-svg sb-card-i'));
    else if (spec.matIcon) b.appendChild(mat(spec.matIcon, 'sb-card-mi'));
    b.appendChild(el('span', 'sb-card-lab', spec.label));
    b.addEventListener('click', function () { if (spec.onClick) spec.onClick(); else run(spec.cmd, spec.arg); });
    return b;
  }
  function grid(items, cols) {
    var g = el('div', 'sb-grid');
    g.style.gridTemplateColumns = 'repeat(' + (cols || 3) + ', 1fr)';
    items.forEach(function (s) { g.appendChild(cardBtn(s)); });
    return g;
  }
  function subhead(t) { return el('div', 'sb-sub', t); }

  /* ── panels ──────────────────────────────────────────────────────── */
  var _tplOpen = null;   /* template id whose detail view is open */
  function panelTemplates(p) {
    var list = ask('templates') || [];
    if (_tplOpen) {
      var t = list.filter(function (x) { return x.id === _tplOpen; })[0];
      if (t) { buildTplDetail(p, t); return; }
      _tplOpen = null;
    }
    p.appendChild(head('Templates'));
    var sw = search('Search templates…');
    p.appendChild(sw);
    var holder = el('div', 'sb-tpl-list');
    p.appendChild(holder);
    function draw(filter) {
      holder.innerHTML = '';
      var shown = list.filter(function (t) {
        return !filter || String(t.name || '').toLowerCase().indexOf(filter) !== -1;
      });
      if (!shown.length) {
        holder.appendChild(emptyState('space_dashboard',
          list.length ? 'No match' : 'No templates yet',
          list.length ? 'Try a different search.' : 'Free designs uploaded by LazyDog will appear here.'));
        return;
      }
      shown.forEach(function (t) {
        var b = el('button', 'sb-tpl-card');
        b.type = 'button'; b.title = t.name || 'Template';
        var pv = el('span', 'sb-tpl-prev');
        if (t.thumb) { pv.style.backgroundImage = "url('" + t.thumb + "')"; }
        else if (t.bg) { pv.style.background = t.bg; }
        /* slide-count badge (Canva style) */
        if (t.slideCount) pv.appendChild(el('span', 'sb-tpl-count', String(t.slideCount)));
        /* PRO crown */
        if (t.pro) {
          var crown = el('span', 'sb-tpl-pro');
          crown.appendChild(mat('workspace_premium', 'sb-btn-i'));
          pv.appendChild(crown);
        }
        b.appendChild(pv);
        var meta = el('span', 'sb-tpl-meta');
        meta.appendChild(el('b', null, t.name || 'Template'));
        if (t.slideCount) meta.appendChild(el('span', null, t.slideCount + ' slides'));
        b.appendChild(meta);
        /* hover: rotate through slide thumbs like Canva */
        var rot = null, ri = 0;
        b.addEventListener('mouseenter', function () {
          var st = t.slideThumbs || [];
          if (st.length < 2) return;
          rot = setInterval(function () {
            ri = (ri + 1) % st.length;
            if (st[ri]) pv.style.backgroundImage = "url('" + st[ri] + "')";
          }, 700);
        });
        b.addEventListener('mouseleave', function () {
          if (rot) { clearInterval(rot); rot = null; ri = 0; }
          if (t.thumb) pv.style.backgroundImage = "url('" + t.thumb + "')";
        });
        b.addEventListener('click', function () {
          _tplOpen = t.id;
          run('templateThumbs', t.id);   /* engine renders every slide thumb */
          paint();
        });
        var del = el('button', 'sb-tpl-del');
        del.type = 'button'; del.title = 'Remove template (admin)';
        del.appendChild(mat('close', 'sb-btn-i'));
        del.addEventListener('click', function (ev) { ev.stopPropagation(); run('deleteTemplate', t.id); });
        b.appendChild(del);
        holder.appendChild(b);
      });
    }
    var inp = sw.querySelector('input');
    if (inp) inp.addEventListener('input', function () { draw(inp.value.trim().toLowerCase()); });
    draw('');
  }
  /* Canva-style detail: big cover, Apply-all button, per-slide grid */
  function buildTplDetail(p, t) {
    var top = el('div', 'sb-tpl-dhead');
    var back = el('button', 'sb-tpl-back'); back.type = 'button'; back.title = 'Back';
    back.appendChild(mat('arrow_back', 'sb-btn-i'));
    back.addEventListener('click', function () { _tplOpen = null; paint(); });
    top.appendChild(back);
    var x = el('button', 'sb-close'); x.type = 'button'; x.title = 'Close';
    x.appendChild(mat('close', 'sb-close-i'));
    x.addEventListener('click', closeDrawer);
    top.appendChild(x);
    p.appendChild(top);
    var cover = el('span', 'sb-tpl-dcover');
    if (t.thumb) cover.style.backgroundImage = "url('" + t.thumb + "')";
    p.appendChild(cover);
    p.appendChild(el('b', 'sb-tpl-dname', t.name || 'Template'));
    p.appendChild(el('span', 'sb-tpl-dsub', (t.slideCount || '?') + ' slides' + (t.pro ? ' · PRO' : '')));
    var applyAll = el('button', 'sb-primary'); applyAll.type = 'button';
    applyAll.appendChild(mat('library_add_check', 'sb-btn-i'));
    applyAll.appendChild(document.createTextNode('Apply all ' + (t.slideCount || '') + ' pages'));
    applyAll.addEventListener('click', function () { run('applyTemplate', t.id); });
    p.appendChild(applyAll);
    p.appendChild(subhead('Or add a single slide'));
    var g = el('div', 'sb-grid'); g.style.gridTemplateColumns = 'repeat(2, 1fr)';
    var n = t.slideCount || (t.slideThumbs || []).length || 0;
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var b = el('button', 'sb-tpl-slide'); b.type = 'button'; b.title = 'Add slide ' + (idx + 1);
        var pv = el('span', 'sb-tpl-sprev');
        var st = (t.slideThumbs || [])[idx];
        if (st) pv.style.backgroundImage = "url('" + st + "')";
        else pv.classList.add('is-loading');
        b.appendChild(pv);
        b.appendChild(el('span', 'sb-card-lab', 'Slide ' + (idx + 1)));
        b.addEventListener('click', function () { run('applyTemplateSlide', { id: t.id, i: idx }); });
        g.appendChild(b);
      })(i);
    }
    p.appendChild(g);
  }
  function svgCard(html, label, cmd, arg) {
    var b = el('button', 'sb-card sb-card-svg');
    b.type = 'button'; b.title = label;
    var w = el('span', 'sb-card-art'); w.innerHTML = html;
    b.appendChild(w);
    b.appendChild(el('span', 'sb-card-lab', label));
    b.addEventListener('click', function () { run(cmd, arg); });
    return b;
  }
  var _elCat = null;   /* open Elements category, null = tiles home */
  function panelElements(p) {
    var A = window.RBAssets || {};
    if (_elCat) { buildElCategory(p, _elCat, A); return; }
    p.appendChild(head('Elements'));
    p.appendChild(search('Search elements…'));
    p.appendChild(subhead('Browse categories'));
    var CATS = [
      { id: 'shapes',  label: 'Shapes',   ic: 'interests',        grad: 'linear-gradient(135deg,#7C3AED,#DB2777)' },
      { id: 'frames',  label: 'Frames',   ic: 'filter_frames',    grad: 'linear-gradient(135deg,#059669,#22D3EE)' },
      { id: 'charts',  label: 'Charts',   ic: 'insert_chart',     grad: 'linear-gradient(135deg,#2563EB,#12A5A0)' },
      { id: 'icons',   label: 'Icons',    ic: 'emoji_symbols',    grad: 'linear-gradient(135deg,#E8590C,#EAB308)' },
      { id: 'photos',  label: 'Photos',   ic: 'photo_library',    grad: 'linear-gradient(135deg,#DB2777,#F97316)' },
      { id: 'grids',   label: 'Grids',    ic: 'grid_view',        grad: 'linear-gradient(135deg,#0F172A,#475569)' },
      { id: 'tables',  label: 'Tables',   ic: 'table_chart',      grad: 'linear-gradient(135deg,#EA580C,#FDE047)' },
      { id: 'wordart', label: 'WordArt',  ic: 'format_color_text',grad: 'linear-gradient(135deg,#22D3EE,#7C3AED)' },
      { id: 'mockups', label: 'Mockups',  ic: 'devices',          grad: 'linear-gradient(135deg,#12A5A0,#059669)' }
    ];
    var g = el('div', 'sb-cat-grid');
    CATS.forEach(function (cat) {
      var b = el('button', 'sb-cat-tile'); b.type = 'button'; b.title = cat.label;
      var ic = el('span', 'sb-cat-ico'); ic.style.background = cat.grad;
      ic.appendChild(mat(cat.ic, 'sb-cat-mi'));
      b.appendChild(ic);
      b.appendChild(el('span', 'sb-cat-lab', cat.label));
      b.addEventListener('click', function () {
        if (cat.id === 'photos') { openDrawer('photos'); return; }
        _elCat = cat.id; paint();
      });
      g.appendChild(b);
    });
    p.appendChild(g);
  }
  function elCatHead(p, title) {
    var top = el('div', 'sb-tpl-dhead');
    var back = el('button', 'sb-tpl-back'); back.type = 'button'; back.title = 'Back';
    back.appendChild(mat('arrow_back', 'sb-btn-i'));
    back.addEventListener('click', function () { _elCat = null; paint(); });
    top.appendChild(back);
    top.appendChild(el('b', 'sb-cat-title', title));
    var x = el('button', 'sb-close'); x.type = 'button'; x.title = 'Close';
    x.appendChild(mat('close', 'sb-close-i'));
    x.addEventListener('click', function () { _elCat = null; closeDrawer(); });
    top.appendChild(x);
    p.appendChild(top);
  }
  function buildElCategory(p, cat, A) {
    if (cat === 'shapes') {
      elCatHead(p, 'Shapes');
      (ask('shapeGroups') || []).forEach(function (grp) {
        p.appendChild(subhead(grp.name));
        var g = el('div', 'sb-grid');
        g.style.gridTemplateColumns = 'repeat(' + (grp.name === 'Lines' ? 2 : 4) + ', 1fr)';
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = it.name;
          var w = el('span', 'sb-shape-art'); w.innerHTML = it.svg;
          b.appendChild(w);
          b.addEventListener('click', function () { run(it.cmd, it.arg); });
          g.appendChild(b);
        });
        p.appendChild(g);
      });
      return;
    }
    if (cat === 'frames') {
      elCatHead(p, 'Frames — drop a photo in');
      var fg = el('div', 'sb-grid'); fg.style.gridTemplateColumns = 'repeat(2, 1fr)';
      var fi = 0;
      ['square', 'landscape', 'portrait', 'rounded', 'circle', 'diamond', 'triangle', 'hexagon', 'arch', 'heart']
        .forEach(function (k) {
          var art = A.framePreviewSvg ? A.framePreviewSvg(k, 92, fi++) : '';
          var label = (A.FRAME_DEFS && A.FRAME_DEFS[k] && A.FRAME_DEFS[k].label) || k;
          fg.appendChild(svgCard(art, label, 'insertFrame', k));
        });
      p.appendChild(fg);
      return;
    }
    if (cat === 'mockups') {
      elCatHead(p, 'Device mockups');
      var mg = el('div', 'sb-grid'); mg.style.gridTemplateColumns = 'repeat(2, 1fr)';
      var mi = 10;
      ['phone', 'tablet', 'laptop', 'monitor', 'watch'].forEach(function (k) {
        if (!(A.FRAME_DEFS && A.FRAME_DEFS[k])) return;
        var art = A.framePreviewSvg ? A.framePreviewSvg(k, 92, mi++) : '';
        mg.appendChild(svgCard(art, A.FRAME_DEFS[k].label || k, 'insertFrame', k));
      });
      p.appendChild(mg);
      return;
    }
    if (cat === 'charts') {
      elCatHead(p, 'Charts — live, data-editable');
      var groups = {};
      (ask('chartTypes') || []).forEach(function (c) {
        (groups[c.group] = groups[c.group] || []).push(c);
      });
      Object.keys(groups).forEach(function (gname) {
        p.appendChild(el('div', 'sb-chart-gname', gname));
        var cg = el('div', 'sb-grid'); cg.style.gridTemplateColumns = 'repeat(2, 1fr)';
        groups[gname].forEach(function (c) {
          var b = el('button', 'sb-chart-card');
          b.type = 'button'; b.title = c.name;
          var pv = el('span', 'sb-chart-prev');
          if (c.thumb) pv.style.backgroundImage = "url('" + c.thumb + "')";
          b.appendChild(pv);
          b.appendChild(el('span', 'sb-card-lab', c.name));
          b.addEventListener('click', function () { run('insertChart', c.id); });
          cg.appendChild(b);
        });
        p.appendChild(cg);
      });
      return;
    }
    if (cat === 'icons') {
      elCatHead(p, 'Icons');
      var iq = search('Search icons…');
      p.appendChild(iq);
      var ig = el('div', 'sb-icons-grid');
      p.appendChild(ig);
      function paintIcons(f) {
        ig.innerHTML = '';
        (ask('icons') || []).forEach(function (ic2) {
          if (f && ic2.name.indexOf(f) === -1) return;
          var b = el('button', 'sb-icon-cell'); b.type = 'button'; b.title = ic2.name.replace(/_/g, ' ');
          var m2 = mat(ic2.name, 'sb-icon-mi');
          m2.style.color = ic2.color;
          b.appendChild(m2);
          b.addEventListener('click', function () { run('insertIcon', { name: ic2.name, color: ic2.color }); });
          ig.appendChild(b);
        });
      }
      var inp2 = iq.querySelector('input');
      if (inp2) inp2.addEventListener('input', function () { paintIcons(inp2.value.trim().toLowerCase()); });
      paintIcons('');
      return;
    }
    if (cat === 'grids') {
      elCatHead(p, 'Grids — photo layouts');
      (ask('gridLayouts') || []).forEach(function (grp) {
        p.appendChild(subhead(grp.name));
        var g = el('div', 'sb-grid'); g.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = it.name;
          var w = el('span', 'sb-shape-art'); w.innerHTML = it.svg;
          b.appendChild(w);
          b.appendChild(el('span', 'sb-card-lab', it.name));
          b.addEventListener('click', function () { run('insertGrid', it.name); });
          g.appendChild(b);
        });
        p.appendChild(g);
      });
      return;
    }
    if (cat === 'tables') {
      elCatHead(p, 'Tables');
      p.appendChild(grid([
        { matIcon: 'table_chart', label: 'Table', cmd: 'insertTable' },
        { ic: 'comment-add', label: 'Comment', cmd: 'addComment' }
      ], 2));
      return;
    }
    if (cat === 'wordart') {
      elCatHead(p, 'WordArt styles');
      var wg = el('div', 'sb-grid'); wg.style.gridTemplateColumns = 'repeat(4, 1fr)';
      (ask('wordArtStyles') || []).forEach(function (st) {
        var b = el('button', 'sb-wa-item'); b.type = 'button'; b.title = st.name;
        var a = el('span', 'sb-wa-A', 'A'); a.style.cssText = st.css;
        b.appendChild(a);
        b.addEventListener('click', function () { run('insertWordArt', st.i); });
        wg.appendChild(b);
      });
      p.appendChild(wg);
      return;
    }
    _elCat = null; paint();
  }
  function panelPhotos(p) {
    p.appendChild(head('Photos'));
    var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { run('insertImage', r.result); };
      r.readAsDataURL(f);
      file.value = '';
    });
    p.appendChild(file);
    var up = el('button', 'sb-primary'); up.type = 'button';
    up.appendChild(mat('upload', 'sb-btn-i'));
    up.appendChild(document.createTextNode('Upload an image'));
    up.addEventListener('click', function () { file.click(); });
    p.appendChild(up);
    var photos = ask('photos') || [];
    if (!photos.length) {
      p.appendChild(emptyState('photo_library', 'No photos yet',
        'Images you upload stay here, ready to reuse.'));
      return;
    }
    var pg = el('div', 'sb-photo-grid');
    photos.forEach(function (u) {
      var b = el('button', 'sb-photo');
      b.type = 'button'; b.title = 'Add to slide';
      b.style.backgroundImage = 'url(' + u + ')';
      b.addEventListener('click', function () { run('insertImage', u); });
      pg.appendChild(b);
    });
    p.appendChild(pg);
  }
  function panelLayers(p) {
    p.appendChild(head('Layers'));
    var layers = ask('layers') || [];
    if (!layers.length) {
      p.appendChild(emptyState('layers', 'Nothing on this slide yet',
        'Every object appears here — reorder, hide, lock or rename.'));
      return;
    }
    var list = el('div', 'sb-list');
    layers.forEach(function (L) {
      var r = el('div', 'sb-layer');
      var name = el('button', 'sb-layer-name'); name.type = 'button'; name.textContent = L.name || L.kind || 'Object';
      name.addEventListener('click', function () { run('layerAction', { action: 'select', id: L.id }); });
      var vis = el('button', 'sb-layer-act'); vis.type = 'button'; vis.title = 'Show / hide';
      vis.appendChild(mat(L.visible === false ? 'visibility_off' : 'visibility', 'sb-li'));
      vis.addEventListener('click', function () { run('layerAction', { action: 'vis', id: L.id }); paint(); });
      var lock = el('button', 'sb-layer-act'); lock.type = 'button'; lock.title = 'Lock / unlock';
      lock.appendChild(mat(L.locked ? 'lock' : 'lock_open', 'sb-li'));
      lock.addEventListener('click', function () { run('layerAction', { action: 'lock', id: L.id }); paint(); });
      r.appendChild(name); r.appendChild(vis); r.appendChild(lock);
      list.appendChild(r);
    });
    p.appendChild(list);
  }
  function panelPages(p) {
    p.appendChild(head('Pages'));
    var add = el('button', 'sb-primary'); add.type = 'button';
    add.appendChild(mat('add', 'sb-btn-i'));
    add.appendChild(document.createTextNode('Add page'));
    add.addEventListener('click', function () { run('addSlide'); paint(); });
    p.appendChild(add);
    var pages = ask('pages') || [];
    if (!pages.length) {
      p.appendChild(emptyState('auto_stories', 'Pages appear here',
        'Titles, sections and quick jump for every slide.'));
      return;
    }
    var list = el('div', 'sb-list');
    pages.forEach(function (pg, i) {
      var r = el('button', 'sb-page'); r.type = 'button';
      r.appendChild(el('span', 'sb-page-n', String(i + 1)));
      r.appendChild(el('span', 'sb-page-t', pg.title || 'Slide ' + (i + 1)));
      r.addEventListener('click', function () { run('gotoSlide', i); });
      list.appendChild(r);
    });
    p.appendChild(list);
  }
  function panelBrand(p) {
    p.appendChild(head('Brand'));
    p.appendChild(subhead('Brand colours'));
    var sw = el('div', 'sb-swrow');
    ['#7C3AED', '#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#0F172A'].forEach(function (c) {
      var d = el('span', 'sb-sw'); d.style.background = c; sw.appendChild(d);
    });
    p.appendChild(sw);
    var ap = el('button', 'sb-primary'); ap.type = 'button';
    ap.appendChild(mat('brush', 'sb-btn-i'));
    ap.appendChild(document.createTextNode('Apply branding to slide'));
    ap.addEventListener('click', function () { run('brandApply'); });
    p.appendChild(ap);
    p.appendChild(emptyState('workspace_premium', 'Brand kit',
      'Logo, colours and fonts — set once, apply anywhere.'));
  }
  function panelEffects(p) {
    p.appendChild(head('Effects'));
    function sliderRow(label, group, key, min, max, step, val) {
      var w = el('div', 'sb-slider');
      var l = el('label', null, label);
      var i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = val;
      i.addEventListener('input', function () { run('effect', { group: group, key: key, value: +i.value }); });
      w.appendChild(l); w.appendChild(i);
      return w;
    }
    p.appendChild(subhead('Shadow'));
    p.appendChild(sliderRow('Blur', 'shadow', 'blur', 0, 40, 1, 12));
    p.appendChild(sliderRow('Distance', 'shadow', 'offset', -30, 30, 1, 8));
    p.appendChild(subhead('Glow'));
    p.appendChild(sliderRow('Size', 'glow', 'blur', 0, 60, 1, 0));
    p.appendChild(subhead('Outline'));
    p.appendChild(sliderRow('Width', 'outline', 'w', 0, 8, 0.5, 0));
    p.appendChild(subhead('Image'));
    p.appendChild(sliderRow('Blur', 'image', 'blur', 0, 50, 1, 0));
    p.appendChild(sliderRow('Brightness', 'image', 'brightness', -60, 60, 2, 0));
    var clr = el('button', 'sb-primary'); clr.type = 'button';
    clr.appendChild(mat('layers_clear', 'sb-btn-i'));
    clr.appendChild(document.createTextNode('Clear all effects'));
    clr.addEventListener('click', function () { run('effect', { group: 'clear' }); });
    p.appendChild(clr);
  }
  function panelData(p) {
    p.appendChild(head('Data'));
    var row = el('div', 'sb-ds-src');
    [['description', 'CSV', 'dataCsv'], ['grid_on', 'Excel', 'dataXlsx'], ['link', 'Google Sheet', 'dataSheet']]
      .forEach(function (d) {
        var b = el('button', 'sb-ds-srcbtn'); b.type = 'button';
        b.appendChild(mat(d[0], 'sb-btn-i'));
        b.appendChild(el('span', null, d[1]));
        b.addEventListener('click', function () { run(d[2]); });
        row.appendChild(b);
      });
    p.appendChild(row);

    var list = ask('datasets') || [];
    if (list.length) {
      p.appendChild(subhead('My data'));
      list.forEach(function (d) {
        var card = el('div', 'sb-ds-card');
        var top = el('div', 'sb-ds-top');
        top.appendChild(el('b', null, d.name));
        top.appendChild(el('span', 'sb-ds-tag', d.rows + '×' + d.cols));
        card.appendChild(top);
        var tbl = el('table', 'sb-ds-tbl');
        var trh = el('tr'); trh.appendChild(el('th'));
        d.series.forEach(function (sr) { trh.appendChild(el('th', null, sr.name)); });
        tbl.appendChild(trh);
        d.cats.forEach(function (cat, r) {
          var tr = el('tr');
          tr.appendChild(el('td', 'sb-ds-cat', cat));
          d.series.forEach(function (sr) { tr.appendChild(el('td', null, String(sr.data[r] == null ? '' : sr.data[r]))); });
          tbl.appendChild(tr);
        });
        card.appendChild(tbl);
        var acts = el('div', 'sb-ds-acts');
        [['insert_link', 'Connect to selected chart', 'dataConnect'],
         ['refresh', 'Refresh', 'dataRefresh'],
         ['delete_outline', 'Remove', 'dataRemove']].forEach(function (a) {
          var b = el('button', 'sb-ds-act'); b.type = 'button'; b.title = a[1];
          b.appendChild(mat(a[0], 'sb-btn-i'));
          if (a[2] === 'dataConnect') b.appendChild(el('span', null, 'Connect'));
          b.addEventListener('click', function () { run(a[2], d.id); });
          acts.appendChild(b);
        });
        card.appendChild(acts);
        p.appendChild(card);
      });
    } else {
      p.appendChild(emptyState('dataset', 'Datasets feed your charts',
        'First row = series names, first column = labels. Load a file, select a chart, press Connect.'));
    }

    p.appendChild(subhead('Sample data'));
    (ask('dataSamples') || []).forEach(function (sm) {
      var b = el('button', 'sb-ds-sample'); b.type = 'button';
      b.appendChild(mat('add', 'sb-btn-i'));
      var m = el('span', 'sb-ds-smeta');
      m.appendChild(el('b', null, sm.name));
      m.appendChild(el('span', null, sm.rows + ' rows · ' + sm.cols + ' series'));
      b.appendChild(m);
      b.addEventListener('click', function () { run('dataSample', sm.i); });
      p.appendChild(b);
    });
  }
  function panelAI(p) {
    p.appendChild(head('AI'));
    p.appendChild(subhead('Create'));
    p.appendChild(grid([
      { matIcon: 'auto_awesome_motion', label: 'Presentation', onClick: function () { run('ai', { kind: 'deck' }); } },
      { matIcon: 'note_add', label: 'One slide', onClick: function () { run('ai', { kind: 'slide' }); } },
      { matIcon: 'library_add', label: 'Add slides', onClick: function () { run('ai', { kind: 'addSlides' }); } },
      { matIcon: 'dashboard_customize', label: 'Mock-ups', onClick: function () { run('ai', { kind: 'mockups' }); } }
    ], 2));
    p.appendChild(subhead('Text'));
    p.appendChild(grid([
      { matIcon: 'edit_note', label: 'Rewrite', onClick: function () { run('ai', { kind: 'rewrite' }); } },
      { matIcon: 'compress', label: 'Summarize', onClick: function () { run('ai', { kind: 'summarize' }); } },
      { matIcon: 'translate', label: 'Translate', onClick: function () { run('ai', { kind: 'translate' }); } }
    ], 3));
    p.appendChild(subhead('Image'));
    p.appendChild(grid([
      { matIcon: 'auto_fix_normal', label: 'Remove background', onClick: function () { run('ai', { kind: 'removeBg' }); } }
    ], 1));
  }
  function panelComponents(p) {
    p.appendChild(head('Components'));
    var list = ask('components') || [];
    if (!list.length) {
      p.appendChild(emptyState('widgets', 'Reusable components',
        'Cards, headers and layouts you insert again and again.'));
    }
  }
  function panelProjects(p) {
    p.appendChild(head('Projects'));
    p.appendChild(search('Search projects…'));
    var list = ask('projects') || [];
    if (!list.length) {
      p.appendChild(emptyState('folder_open', 'No saved projects yet',
        'Save a design and it appears here to reopen any time.'));
      return;
    }
    var lw = el('div', 'sb-list');
    list.forEach(function (pr) {
      var r = el('button', 'sb-page'); r.type = 'button';
      r.appendChild(mat('description', 'sb-li'));
      r.appendChild(el('span', 'sb-page-t', pr.name || 'Design'));
      r.addEventListener('click', function () { run('projectOpen', pr.id); });
      lw.appendChild(r);
    });
    p.appendChild(lw);
  }

  /* ── rail definition ─────────────────────────────────────────────── */
  var RAIL = [
    { id: 'templates', label: 'Templates', ic: 'templates', build: panelTemplates },
    { id: 'elements', label: 'Elements', ic: 'elements', build: panelElements },
    { id: 'photos', label: 'Photos', ic: 'photos', build: panelPhotos },
    { id: 'layers', label: 'Layers', ic: 'layers-i', build: panelLayers },
    { id: 'brand', label: 'Brand', ic: 'brand-i', build: panelBrand },
    { id: 'effects', label: 'Effects', ic: 'effects-i', build: panelEffects },
    { id: 'data', label: 'Data', ic: 'data-i', build: panelData },
    { id: 'ai', label: 'AI', ic: 'ai-i', build: panelAI },
    { id: 'components', label: 'Compon.', ic: 'components-i', build: panelComponents },
    { id: 'projects', label: 'Projects', ic: 'projects-i', build: panelProjects }
  ];

  var rail = el('nav', 'sb-rail');
  var drawer = el('div', 'sb-drawer');
  var open = null;
  var railBtns = {};

  function closeDrawer() {
    open = null;
    drawer.classList.remove('is-open');
    drawer.innerHTML = '';
    Object.keys(railBtns).forEach(function (k) { railBtns[k].classList.remove('is-active'); });
  }
  function paint() {
    if (!open) return;
    var item = RAIL.filter(function (r) { return r.id === open; })[0];
    drawer.innerHTML = '';
    item.build(drawer);
  }
  function openDrawer(id) {
    if (open === id) { closeDrawer(); return; }
    open = id;
    drawer.classList.add('is-open');
    Object.keys(railBtns).forEach(function (k) { railBtns[k].classList.toggle('is-active', k === id); });
    paint();
  }

  RAIL.forEach(function (r) {
    var b = el('button', 'sb-rail-btn');
    b.type = 'button'; b.title = r.label;
    b.appendChild(svg(r.ic, 'sb-svg sb-rail-i'));
    b.appendChild(el('span', 'sb-rail-lab', r.label));
    b.addEventListener('click', function () { openDrawer(r.id); });
    railBtns[r.id] = b;
    rail.appendChild(b);
  });

  listen('selection', function () { if (open === 'layers' || open === 'effects') paint(); });
  listen('templates', function () { if (open === 'templates') paint(); });
  listen('datasets', function () { if (open === 'data') paint(); });
  listen('slides', function () { if (open === 'pages' || open === 'layers') paint(); });

  slot.appendChild(rail);
  slot.appendChild(drawer);
})();
