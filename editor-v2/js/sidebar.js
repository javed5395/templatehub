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
  function panelTemplates(p) {
    p.appendChild(head('Templates'));
    var sw = search('Search templates…');
    p.appendChild(sw);
    var list = ask('templates') || [];
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
        b.appendChild(pv);
        var meta = el('span', 'sb-tpl-meta');
        meta.appendChild(el('b', null, t.name || 'Template'));
        if (t.slideCount) meta.appendChild(el('span', null, t.slideCount + ' slides'));
        b.appendChild(meta);
        b.addEventListener('click', function () { run('applyTemplate', t.id); });
        holder.appendChild(b);
      });
    }
    var inp = sw.querySelector('input');
    if (inp) inp.addEventListener('input', function () { draw(inp.value.trim().toLowerCase()); });
    draw('');
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
  function panelElements(p) {
    p.appendChild(head('Elements'));
    p.appendChild(search('Search elements…'));
    var A = window.RBAssets || {};
    p.appendChild(subhead('Frames — drop a photo in'));
    var fg = el('div', 'sb-grid'); fg.style.gridTemplateColumns = 'repeat(2, 1fr)';
    var fi = 0;
    ['square', 'landscape', 'portrait', 'rounded', 'circle', 'diamond', 'triangle', 'hexagon', 'arch', 'heart']
      .forEach(function (k) {
        var art = A.framePreviewSvg ? A.framePreviewSvg(k, 92, fi++) : '';
        var label = (A.FRAME_DEFS && A.FRAME_DEFS[k] && A.FRAME_DEFS[k].label) || k;
        fg.appendChild(svgCard(art, label, 'insertFrame', k));
      });
    p.appendChild(fg);
    p.appendChild(subhead('Device mockups'));
    var dg = el('div', 'sb-grid'); dg.style.gridTemplateColumns = 'repeat(2, 1fr)';
    ['phone', 'tablet', 'laptop', 'browser', 'polaroid'].forEach(function (k) {
      var art = A.framePreviewSvg ? A.framePreviewSvg(k, 92, fi++) : '';
      var label = (A.FRAME_DEFS && A.FRAME_DEFS[k] && A.FRAME_DEFS[k].label) || k;
      dg.appendChild(svgCard(art, label, 'insertFrame', k));
    });
    p.appendChild(dg);
    p.appendChild(subhead('Icons'));
    var iq = el('input'); iq.type = 'text'; iq.placeholder = 'Search icons…';
    var iw = el('div', 'sb-search'); iw.appendChild(iq);
    p.appendChild(iw);
    var ig = el('div', 'sb-icons');
    function paintIcons(f) {
      ig.innerHTML = '';
      (window.LD_ICON_GLYPHS || []).filter(function (n) { return !f || n.indexOf(f) > -1; })
        .slice(0, 60).forEach(function (n) {
          var b = el('button', 'sb-icon-cell');
          b.type = 'button'; b.title = n.replace(/_/g, ' ');
          var s = el('span', 'material-icons-outlined'); s.textContent = n;
          b.appendChild(s);
          b.addEventListener('click', function () { run('insertIcon', n); });
          ig.appendChild(b);
        });
    }
    iq.addEventListener('input', function () { paintIcons(iq.value.trim().toLowerCase()); });
    paintIcons('');
    p.appendChild(ig);
  }
  function panelText(p) {
    p.appendChild(head('Text'));
    var h = el('button', 'sb-text sb-text-h'); h.type = 'button'; h.textContent = 'Add a heading';
    h.addEventListener('click', function () { run('insertText', 'heading'); });
    var s = el('button', 'sb-text sb-text-s'); s.type = 'button'; s.textContent = 'Add a subheading';
    s.addEventListener('click', function () { run('insertText', 'subheading'); });
    var b = el('button', 'sb-text sb-text-b'); b.type = 'button'; b.textContent = 'Add body text';
    b.addEventListener('click', function () { run('insertText', 'body'); });
    p.appendChild(h); p.appendChild(s); p.appendChild(b);
    p.appendChild(subhead('Charts — live, data-editable'));
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
    p.appendChild(subhead('Table'));
    p.appendChild(grid([
      { matIcon: 'table_chart', label: 'Table', cmd: 'insertTable' }
    ], 2));
    p.appendChild(subhead('Special'));
    p.appendChild(grid([
      { ic: 'wordart', label: 'WordArt', cmd: 'insertWordArt' },
      { ic: 'comment-add', label: 'Comment', cmd: 'addComment' }
    ]));
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
