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
  /* ── 3D object library (gradient-shaded SVGs → real canvas objects) ── */
  function g3(id, a, b2) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b2 + '"/></linearGradient>'; }
  var OBJ3D = [
    { name: 'Cube', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('c1', '#A78BFA', '#7C3AED') + g3('c2', '#7C3AED', '#5B21B6') + g3('c3', '#C4B5FD', '#A78BFA') + '</defs><polygon points="50,8 88,28 50,48 12,28" fill="url(#c3)"/><polygon points="12,28 50,48 50,92 12,72" fill="url(#c1)"/><polygon points="88,28 50,48 50,92 88,72" fill="url(#c2)"/></svg>' },
    { name: 'Sphere', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="s1" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#93C5FD"/><stop offset="0.55" stop-color="#3B82F6"/><stop offset="1" stop-color="#1E3A8A"/></radialGradient></defs><circle cx="50" cy="50" r="42" fill="url(#s1)"/><ellipse cx="38" cy="32" rx="14" ry="9" fill="#FFFFFF" opacity="0.35"/></svg>' },
    { name: 'Cylinder', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('cy1', '#34D399', '#059669') + '</defs><path d="M20 24 v52 a30 12 0 0 0 60 0 v-52" fill="url(#cy1)"/><ellipse cx="50" cy="24" rx="30" ry="12" fill="#6EE7B7"/></svg>' },
    { name: 'Pyramid', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('p1', '#FBBF24', '#D97706') + g3('p2', '#D97706', '#92400E') + '</defs><polygon points="50,10 82,80 50,92" fill="url(#p2)"/><polygon points="50,10 18,80 50,92" fill="url(#p1)"/></svg>' },
    { name: 'Cone', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('cn1', '#F472B6', '#DB2777') + '</defs><path d="M50 8 L82 78 a32 12 0 0 1 -64 0 Z" fill="url(#cn1)"/><ellipse cx="50" cy="78" rx="32" ry="12" fill="#F9A8D4"/></svg>' },
    { name: 'Ring', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('r1', '#22D3EE', '#0E7490') + '</defs><path d="M50 12 a38 30 0 1 0 0 60 a38 30 0 1 0 0 -60 Z M50 30 a20 14 0 1 1 0 28 a20 14 0 1 1 0 -28 Z" fill="url(#r1)" fill-rule="evenodd"/></svg>' },
    { name: 'Box', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('b1', '#FB923C', '#EA580C') + g3('b2', '#EA580C', '#9A3412') + g3('b3', '#FDBA74', '#FB923C') + '</defs><polygon points="50,14 90,32 50,50 10,32" fill="url(#b3)"/><polygon points="10,32 50,50 50,90 10,72" fill="url(#b1)"/><polygon points="90,32 50,50 50,90 90,72" fill="url(#b2)"/><polygon points="30,23 70,41 70,50 30,32" fill="#FFEDD5" opacity="0.5"/></svg>' },
    { name: 'Coin stack', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('m1', '#FCD34D', '#D97706') + '</defs><g><ellipse cx="50" cy="80" rx="32" ry="11" fill="url(#m1)"/><ellipse cx="50" cy="68" rx="32" ry="11" fill="url(#m1)"/><ellipse cx="50" cy="56" rx="32" ry="11" fill="url(#m1)"/><ellipse cx="50" cy="44" rx="32" ry="11" fill="#FDE68A"/></g></svg>' },
    { name: '3D bars', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('h1', '#818CF8', '#4F46E5') + g3('h2', '#A78BFA', '#7C3AED') + g3('h3', '#F472B6', '#DB2777') + '</defs><g><polygon points="14,60 26,54 26,88 14,94" fill="url(#h1)"/><polygon points="26,54 34,58 34,92 26,88" fill="#3730A3"/><polygon points="42,42 54,36 54,88 42,94" fill="url(#h2)"/><polygon points="54,36 62,40 62,92 54,88" fill="#5B21B6"/><polygon points="70,24 82,18 82,88 70,94" fill="url(#h3)"/><polygon points="82,18 90,22 90,92 82,88" fill="#9D174D"/></g></svg>' },
    { name: '3D arrow', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('a1', '#4ADE80', '#16A34A') + '</defs><polygon points="10,42 55,42 55,26 92,52 55,78 55,62 10,62" fill="url(#a1)"/><polygon points="10,62 55,62 55,78 92,52 88,58 55,86 55,70 10,70" fill="#166534" opacity="0.85"/></svg>' },
    { name: 'Prism', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('pr1', '#5EEAD4', '#0D9488') + g3('pr2', '#0D9488', '#134E4A') + '</defs><polygon points="26,30 74,30 92,74 8,74" fill="url(#pr1)"/><polygon points="26,30 8,74 8,80 26,36" fill="url(#pr2)"/><polygon points="26,30 74,30 74,36 26,36" fill="#99F6E4" opacity="0.6"/></svg>' },
    { name: 'Diamond', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('d1', '#E9D5FF', '#A855F7') + g3('d2', '#A855F7', '#6B21A8') + '</defs><polygon points="30,20 70,20 88,42 50,90 12,42" fill="url(#d1)"/><polygon points="50,90 12,42 34,42" fill="url(#d2)" opacity="0.8"/><polygon points="50,90 88,42 66,42" fill="url(#d2)" opacity="0.6"/><polygon points="30,20 34,42 12,42" fill="#C084FC"/><polygon points="70,20 88,42 66,42" fill="#C084FC"/></svg>' },
    /* ── 23 Aug 2026 (Fable) — 3D text + new shape kinds ─────────────── */
    { name: '3D text', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('t1', '#A78BFA', '#6D28D9') + '</defs><text x="14" y="66" font-family="Arial Black,Arial" font-weight="900" font-size="46" fill="#4C1D95">Aa</text><text x="10" y="62" font-family="Arial Black,Arial" font-weight="900" font-size="46" fill="url(#t1)">Aa</text></svg>' },
    { name: 'Star', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('st1', '#FDE68A', '#F59E0B') + '</defs><polygon points="54,12 66,40 96,42 72,61 80,91 54,74 28,91 36,61 12,42 42,40" fill="#B45309"/><polygon points="50,8 62,36 92,38 68,57 76,87 50,70 24,87 32,57 8,38 38,36" fill="url(#st1)"/></svg>' },
    { name: 'Rod', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('rd1', '#93C5FD', '#1D4ED8') + '</defs><rect x="8" y="42" width="84" height="16" rx="8" fill="url(#rd1)"/><ellipse cx="16" cy="50" rx="8" ry="8" fill="#BFDBFE"/></svg>' },
    { name: 'Curve', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('cv1', '#6EE7B7', '#059669') + '</defs><path d="M8 72 C 30 20, 55 88, 92 30" fill="none" stroke="url(#cv1)" stroke-width="13" stroke-linecap="round"/></svg>' },
    { name: 'Capsule', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('cp1', '#FDA4AF', '#E11D48') + '</defs><rect x="30" y="14" width="40" height="72" rx="20" fill="url(#cp1)"/><ellipse cx="42" cy="30" rx="8" ry="12" fill="#FECDD3" opacity="0.7"/></svg>' },
    { name: 'Dome', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('dm1', '#C4B5FD', '#6D28D9') + '</defs><path d="M12 68 a38 38 0 0 1 76 0 Z" fill="url(#dm1)"/><ellipse cx="50" cy="68" rx="38" ry="9" fill="#8B5CF6"/></svg>' },
    { name: 'Plate', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('pl1', '#67E8F9', '#0E7490') + '</defs><ellipse cx="50" cy="56" rx="40" ry="16" fill="#155E75"/><ellipse cx="50" cy="48" rx="40" ry="16" fill="url(#pl1)"/></svg>' },
    { name: 'Arch', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('ar1', '#FCA5A5', '#DC2626') + '</defs><path d="M14 82 a36 36 0 0 1 72 0 h-18 a18 18 0 0 0 -36 0 Z" fill="url(#ar1)"/></svg>' }
  ];

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
      { id: 'objects3d', label: '3D Objects', ic: 'deployed_code', grad: 'linear-gradient(135deg,#4F46E5,#DB2777)' },
      { id: 'mockups', label: 'Mock-up slides',  ic: 'devices',          grad: 'linear-gradient(135deg,#12A5A0,#059669)' },
      { id: 'graphics', label: 'Graphics', ic: 'interests',        grad: 'linear-gradient(135deg,#F97316,#DB2777)' },
      { id: 'anims',   label: 'Animations', ic: 'animation',       grad: 'linear-gradient(135deg,#8B3DFF,#22D3EE)' }
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

    /* ── Custom elements — published by admin, visible to EVERYONE
       (same Firebase road as "Publish as template") ── */
    var mine = ask('customElements') || [];
    if (mine.length) {
      p.appendChild(subhead('Custom elements'));
      var cg2 = el('div', 'sb-photo-grid');
      mine.forEach(function (ce) {
        var wrap = el('span', 'sb-custom-wrap');
        var b2 = el('button', 'sb-photo'); b2.type = 'button'; b2.title = ce.name || 'Element';
        if (ce.thumb) { b2.style.backgroundImage = 'url(' + ce.thumb + ')'; b2.style.backgroundSize = 'contain'; }
        b2.addEventListener('click', function () { run('insertElement', ce.id); });
        wrap.appendChild(b2);
        var del2 = el('button', 'sb-tpl-del'); del2.type = 'button'; del2.title = 'Remove for everyone (admin)';
        del2.appendChild(mat('close', 'sb-btn-i'));
        del2.addEventListener('click', function (ev) { ev.stopPropagation(); run('deleteElement', ce.id); });
        wrap.appendChild(del2);
        cg2.appendChild(wrap);
      });
      p.appendChild(cg2);
    }
    var pubBtn = el('button', 'sb-primary'); pubBtn.type = 'button';
    pubBtn.title = 'Select object(s) on the canvas, then publish — appears here for all visitors';
    pubBtn.appendChild(mat('cloud_upload', 'sb-btn-i'));
    pubBtn.appendChild(document.createTextNode('Publish selected as element (admin)'));
    pubBtn.addEventListener('click', function () { run('publishElement'); });
    p.appendChild(pubBtn);
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
      elCatHead(p, 'Mock-up slides');
      p.appendChild(subhead('Ready layouts: photo frames, text areas and chart areas in different proportions. Click one to place it on this slide.'));
      var mg = el('div', 'sb-grid'); mg.style.gridTemplateColumns = 'repeat(2, 1fr)';
      (ask('mockupLayouts') || []).forEach(function (L) {
        var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = L.name;
        var w = el('span', 'sb-shape-art'); w.innerHTML = L.svg;
        b.appendChild(w); b.appendChild(el('span', 'sb-card-lab', L.name));
        b.addEventListener('click', function () { run('insertMockupLayout', L.i); });
        mg.appendChild(b);
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
    if (cat === 'graphics') {
      elCatHead(p, 'Graphics');
      var data = ask('illos') || { palettes: [], styles: [] };
      var pal = el('div', 'sb-illo-pal');
      data.palettes.forEach(function (pl) {
        var b = el('button', 'sb-illo-sw' + (pl.i === data.current ? ' on' : ''));
        b.type = 'button'; b.title = pl.name;
        b.style.background = 'linear-gradient(135deg,' + pl.a + ' 0 50%,' + pl.b + ' 50% 100%)';
        b.addEventListener('click', function () { run('illoPalette', pl.i); paint(); });
        pal.appendChild(b);
      });
      p.appendChild(pal);
      data.styles.forEach(function (grp) {
        p.appendChild(subhead('Illustrations — ' + grp.name));
        var g = el('div', 'sb-grid'); g.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = it.name;
          var w = el('span', 'sb-shape-art'); w.innerHTML = it.svg;
          b.appendChild(w);
          b.appendChild(el('span', 'sb-card-lab', it.name));
          b.addEventListener('click', function () { run('insertIllo', { i: it.i }); });
          g.appendChild(b);
        });
        p.appendChild(g);
      });
      (ask('stickers') || []).forEach(function (grp) {
        if (grp.name === 'Animated') return;   /* those live in Animations */
        p.appendChild(subhead('Stickers — ' + grp.name));
        var g2 = el('div', 'sb-grid'); g2.style.gridTemplateColumns = 'repeat(3, 1fr)';
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = it.name;
          var w = el('span', 'sb-shape-art'); w.innerHTML = it.svg;
          b.appendChild(w);
          b.addEventListener('click', function () { run('insertSticker', it.i); });
          g2.appendChild(b);
        });
        p.appendChild(g2);
      });
      return;
    }
    if (cat === 'anims') {
      elCatHead(p, 'Animated elements');
      p.appendChild(subhead('Motion plays live on the slide'));
      var found = false;
      (ask('stickers') || []).forEach(function (grp) {
        if (grp.name !== 'Animated') return;
        found = true;
        var g = el('div', 'sb-grid'); g.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grp.items.forEach(function (it) {
          var b = el('button', 'sb-shape-card sb-anim-' + (it.anim || '')); b.type = 'button'; b.title = it.name + (it.anim ? ' · ' + it.anim : '');
          var w = el('span', 'sb-shape-art'); w.innerHTML = it.svg;
          b.appendChild(w);
          b.appendChild(el('span', 'sb-card-lab', it.name));
          b.addEventListener('click', function () { run('insertSticker', it.i); });
          g.appendChild(b);
        });
        p.appendChild(g);
      });
      if (!found) p.appendChild(emptyState('animation', 'Coming soon', 'Animated graphics arrive shortly.'));
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
      p.appendChild(subhead('Pick a size — cells are editable on the slide'));
      var SIZES = [[2, 2], [2, 3], [3, 3], [3, 4], [4, 3], [4, 4], [5, 3], [5, 4], [6, 4]];
      var tg = el('div', 'sb-grid'); tg.style.gridTemplateColumns = 'repeat(2, 1fr)';
      SIZES.forEach(function (s) {
        var r = s[0], c = s[1];
        var b = el('button', 'sb-shape-card'); b.type = 'button';
        b.title = r + ' rows × ' + c + ' columns';
        /* mini live preview of the table */
        var W = 96, H = 64, cw2 = W / c, rh2 = H / r, cells = '';
        for (var ri = 0; ri < r; ri++) for (var ci = 0; ci < c; ci++) {
          cells += '<rect x="' + (ci * cw2 + 0.5) + '" y="' + (ri * rh2 + 0.5) + '" width="' + (cw2 - 1) + '" height="' + (rh2 - 1) +
            '" rx="1.5" fill="' + (ri === 0 ? '#7C3AED' : (ri % 2 ? '#F4F1FB' : '#FFFFFF')) + '" stroke="#D9C9F9" stroke-width="0.7"/>';
        }
        var w = el('span', 'sb-shape-art');
        w.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' + cells + '</svg>';
        b.appendChild(w);
        b.appendChild(el('span', 'sb-card-lab', r + ' × ' + c));
        b.addEventListener('click', function () { run('insertTable', { rows: r, cols: c }); });
        tg.appendChild(b);
      });
      p.appendChild(tg);
      return;
    }
    if (cat === 'objects3d') {
      elCatHead(p, '3D objects');
      p.appendChild(subhead('3D objects — insert one, then hold Alt and drag it to rotate'));
      var KIND3 = { 'Cube': 'cube', 'Sphere': 'sphere', 'Cylinder': 'cylinder', 'Pyramid': 'pyramid',
        'Cone': 'cone', 'Ring': 'ring', 'Box': 'box', 'Coin stack': 'coins',
        '3D bars': 'bars', '3D arrow': 'knot', 'Prism': 'prism', 'Diamond': 'diamond',
        '3D text': 'text', 'Star': 'star', 'Rod': 'rod', 'Curve': 'curve',
        'Capsule': 'capsule', 'Dome': 'dome', 'Plate': 'plate', 'Arch': 'arch' };
      var COL3 = { 'Cube': '#7C3AED', 'Sphere': '#3B82F6', 'Cylinder': '#059669', 'Pyramid': '#D97706',
        'Cone': '#DB2777', 'Ring': '#0E7490', 'Box': '#EA580C', 'Coin stack': '#F59E0B',
        '3D bars': '#6D28D9', '3D arrow': '#16A34A', 'Prism': '#0D9488', 'Diamond': '#A855F7',
        '3D text': '#7C3AED', 'Star': '#F59E0B', 'Rod': '#1D4ED8', 'Curve': '#059669',
        'Capsule': '#E11D48', 'Dome': '#6D28D9', 'Plate': '#0E7490', 'Arch': '#DC2626' };
      var og = el('div', 'sb-grid'); og.style.gridTemplateColumns = 'repeat(2, 1fr)';
      OBJ3D.forEach(function (o3) {
        var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = o3.name + ' — 3D object (Alt+drag to rotate)';
        var w3 = el('span', 'sb-shape-art'); w3.innerHTML = o3.svg;
        b.appendChild(w3);
        b.appendChild(el('span', 'sb-card-lab', o3.name));
        b.addEventListener('click', function () {
          /* 3D text asks for the word first (insert3DText prompts), every
             other kind inserts straight away */
          if (KIND3[o3.name] === 'text') { run('insert3DText', { color: COL3[o3.name] }); return; }
          run('insert3D', { kind: KIND3[o3.name] || 'cube', color: COL3[o3.name] || '#7C3AED', name: o3.name });
        });
        og.appendChild(b);
      });
      p.appendChild(og);
      /* ── 23 Aug 2026 (Fable) — 3D MOCKUPS: this slide on a real object ── */
      p.appendChild(subhead('3D mockups — your CURRENT slide becomes the label'));
      var MOCKS = [
        { kind: 'bottle', name: 'Bottle', color: '#12A5A0',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('mk1', '#5EEAD4', '#0D9488') + '</defs><rect x="44" y="8" width="12" height="10" rx="2" fill="#26262B"/><path d="M44 18 h12 v6 c8 6 12 10 12 22 v40 a8 8 0 0 1 -8 8 h-20 a8 8 0 0 1 -8 -8 v-40 c0-12 4-16 12-22 Z" fill="url(#mk1)"/><rect x="34" y="48" width="32" height="22" rx="2" fill="#F8FAFC"/></svg>' },
        { kind: 'can', name: 'Can', color: '#64748B',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('mk2', '#E2E8F0', '#94A3B8') + '</defs><ellipse cx="50" cy="16" rx="24" ry="7" fill="#94A3B8"/><path d="M26 16 v66 a24 8 0 0 0 48 0 v-66" fill="url(#mk2)"/><rect x="26" y="34" width="48" height="30" fill="#F8FAFC"/></svg>' },
        { kind: 'mug', name: 'Mug', color: '#DB2777',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('mk3', '#F9A8D4', '#DB2777') + '</defs><path d="M22 24 h44 v50 a10 10 0 0 1 -10 10 h-24 a10 10 0 0 1 -10 -10 Z" fill="url(#mk3)"/><path d="M66 34 h8 a12 12 0 0 1 0 26 h-8 v-8 h8 a5 5 0 0 0 0 -10 h-8 Z" fill="#DB2777"/><rect x="22" y="38" width="44" height="24" fill="#F8FAFC"/></svg>' },
        { kind: 'frame', name: 'Poster frame', color: '#7C5A3A',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>' + g3('mk4', '#B08356', '#7C5A3A') + '</defs><rect x="10" y="18" width="80" height="64" rx="3" fill="url(#mk4)"/><rect x="20" y="28" width="60" height="44" fill="#F8FAFC"/><rect x="26" y="34" width="30" height="6" fill="#CBD5E1"/><rect x="26" y="46" width="48" height="4" fill="#E2E8F0"/><rect x="26" y="54" width="42" height="4" fill="#E2E8F0"/></svg>' },
        { kind: 'phone', name: 'Phone', color: '#1B1B1F',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="8" width="36" height="84" rx="8" fill="#1B1B1F"/><rect x="36" y="14" width="28" height="72" rx="3" fill="#F8FAFC"/><rect x="40" y="20" width="14" height="4" fill="#CBD5E1"/><rect x="40" y="30" width="20" height="3" fill="#E2E8F0"/></svg>' },
        { kind: 'laptop', name: 'Laptop', color: '#8B8F96',
          svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="18" width="56" height="40" rx="3" fill="#54575E"/><rect x="26" y="22" width="48" height="32" fill="#F8FAFC"/><path d="M14 62 h72 l6 14 a3 3 0 0 1 -3 4 h-78 a3 3 0 0 1 -3 -4 Z" fill="#8B8F96"/></svg>' }
      ];
      var mg = el('div', 'sb-grid'); mg.style.gridTemplateColumns = 'repeat(2, 1fr)';
      MOCKS.forEach(function (mk) {
        var b = el('button', 'sb-shape-card'); b.type = 'button';
        b.title = mk.name + ' — inserts wearing the current slide (Alt+drag to rotate)';
        var w3 = el('span', 'sb-shape-art'); w3.innerHTML = mk.svg;
        b.appendChild(w3);
        b.appendChild(el('span', 'sb-card-lab', mk.name));
        b.addEventListener('click', function () {
          run('insertMockup3D', { kind: mk.kind, color: mk.color, name: mk.name });
        });
        mg.appendChild(b);
      });
      p.appendChild(mg);
      /* ══ 3D LIBRARY (23 Aug 2026, Fable — Javed's List #1, phase 1) ══════
         Firestore `assets3d` is the catalog; Drive holds the GLB files,
         served through the asset3d gate. Search + category chips here,
         click → insertAsset3D. Empty catalog shows an honest hint. */
      p.appendChild(subhead('3D Library — assets from the LazyDog catalog'));
      var libWrap = el('div'); libWrap.style.cssText = 'padding:4px 2px;';
      var sIn = document.createElement('input');
      sIn.type = 'search'; sIn.placeholder = 'Search assets… (phone, tree, car)';
      sIn.style.cssText = 'width:100%;box-sizing:border-box;padding:7px 10px;border-radius:8px;' +
        'border:1px solid rgba(128,128,140,.35);background:transparent;color:inherit;font:inherit;margin-bottom:6px;';
      libWrap.appendChild(sIn);
      var chipRow = el('div'); chipRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
      var CATS3 = [['', 'All'], ['technology', '🖥️ Tech'], ['office', '🏢 Office'], ['transport', '🚗 Transport'],
        ['products', '🧴 Products'], ['home', '🏠 Home'], ['business', '👔 Business'],
        ['presentation', '🎯 Present'], ['nature', '🌿 Nature'], ['shapes', '⭐ Shapes']];
      var libState = { all: null, cat: '', q: '' };
      var grid = el('div', 'sb-grid'); grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      var note = el('div'); note.style.cssText = 'font-size:11px;opacity:.7;padding:6px 2px;';
      function drawLib() {
        grid.innerHTML = '';
        if (!libState.all) { note.textContent = 'Loading catalog…'; return; }
        var items = libState.all.filter(function (it) {
          if (libState.cat && String(it.category || '').toLowerCase() !== libState.cat) return false;
          if (libState.q) {
            var hay = (it.name + ' ' + (it.tags || []).join(' ') + ' ' + it.category).toLowerCase();
            if (hay.indexOf(libState.q) === -1) return false;
          }
          return true;
        });
        note.textContent = items.length ? (items.length + ' asset(s)') :
          (libState.all.length ? 'No match — try another word' :
           'Catalog is empty — assets appear here as they are registered');
        items.slice(0, 40).forEach(function (it) {
          var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = it.name;
          var art = el('span', 'sb-shape-art');
          if (it.thumbUrl) {
            var im = document.createElement('img'); im.src = it.thumbUrl; im.loading = 'lazy';
            im.style.cssText = 'width:100%;height:100%;object-fit:contain;'; art.appendChild(im);
          } else {
            /* phase 2: no picture yet — show a placeholder and queue an
               auto-thumbnail render (persisted to the catalog if admin) */
            art.innerHTML = '<svg viewBox="0 0 100 100"><polygon points="50,12 88,32 50,52 12,32" fill="#A78BFA"/><polygon points="12,32 50,52 50,88 12,68" fill="#7C3AED"/><polygon points="88,32 50,52 50,88 88,68" fill="#5B21B6"/></svg>';
            queueThumb(it, art);
          }
          b.appendChild(art);
          b.appendChild(el('span', 'sb-card-lab', it.name));
          b.addEventListener('click', function () {
            run('insertAsset3D', { id: it.driveFileId, name: it.name,
              scale: it.defaultScale, camera: it.camera });
          });
          grid.appendChild(b);
        });
      }
      CATS3.forEach(function (c) {
        var ch = document.createElement('button'); ch.type = 'button'; ch.textContent = c[1];
        ch.style.cssText = 'border:1px solid rgba(128,128,140,.35);background:transparent;color:inherit;' +
          'border-radius:999px;padding:3px 9px;font-size:11px;cursor:pointer;';
        ch.addEventListener('click', function () {
          libState.cat = c[0];
          Array.prototype.forEach.call(chipRow.children, function (x) { x.style.fontWeight = ''; });
          ch.style.fontWeight = '700';
          drawLib();
        });
        chipRow.appendChild(ch);
      });
      sIn.addEventListener('input', function () { libState.q = sIn.value.trim().toLowerCase(); drawLib(); });
      libWrap.appendChild(chipRow); libWrap.appendChild(note); libWrap.appendChild(grid);
      p.appendChild(libWrap);

      /* ── auto-thumbnail engine (phase 2) ─────────────────────────────
         One asset renders at a time (3D is heavy). A generated thumb is
         shown at once and, for admins, saved back to the catalog so it is
         computed once for everyone. Non-admins just see it for this session. */
      var _fsMod = null, _db = null, _thumbBusy = false, _thumbQ = [], _thumbDone = {};
      function queueThumb(it, artEl) {
        if (!it.driveFileId || it.thumbUrl || _thumbDone[it.driveFileId]) return;
        _thumbQ.push({ it: it, art: artEl });
        pumpThumbs();
      }
      function pumpThumbs() {
        if (_thumbBusy || !_thumbQ.length || !window.ldMakeAsset3DThumb) return;
        var job = _thumbQ.shift();
        if (_thumbDone[job.it.driveFileId]) { pumpThumbs(); return; }
        _thumbBusy = true;
        window.ldMakeAsset3DThumb(job.it.driveFileId, 128).then(function (dataUrl) {
          _thumbDone[job.it.driveFileId] = true;
          if (dataUrl) {
            job.it.thumbUrl = dataUrl;
            if (job.art && job.art.isConnected) {
              job.art.innerHTML = '';
              var im = document.createElement('img'); im.src = dataUrl;
              im.style.cssText = 'width:100%;height:100%;object-fit:contain;';
              job.art.appendChild(im);
            }
            persistThumb(job.it, dataUrl);   /* admin-only; silently ignored otherwise */
          }
        }).catch(function () { _thumbDone[job.it.driveFileId] = true; })
          .finally(function () { _thumbBusy = false; setTimeout(pumpThumbs, 60); });
      }
      async function persistThumb(it, dataUrl) {
        try {
          if (!_db || !_fsMod) return;
          await _fsMod.updateDoc(_fsMod.doc(_db, 'assets3d', it.assetId), { thumbUrl: dataUrl });
        } catch (e) { /* not admin, or offline — fine, it stays session-only */ }
      }

      (async function loadCatalog() {
        try {
          var fa = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
          var fs = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
          _fsMod = fs;
          var app = fa.getApps().length ? fa.getApp() : fa.initializeApp({
            apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
            authDomain: 'auth.lazydogtemplates.com',
            projectId: 'templatehub-16cd7',
            storageBucket: 'templatehub-16cd7.firebasestorage.app',
            messagingSenderId: '143000893683',
            appId: '1:143000893683:web:fd694de96f8c0fa6569f86'
          });
          _db = fs.getFirestore(app);
          var snap = await fs.getDocs(fs.query(fs.collection(_db, 'assets3d'), fs.limit(200)));
          var all = [];
          snap.forEach(function (d) { var v = d.data() || {}; v.assetId = d.id; if (v.driveFileId) all.push(v); });
          libState.all = all;
          /* 24 Aug 2026 (Fable) — share the catalog with Hexa 3D so it can
             place library assets by name/tag from a sentence */
          window._ld3dCatalog = all;
        } catch (e) {
          console.warn('[3dlib] catalog unavailable:', e && e.message);
          libState.all = [];
        }
        drawLib();
      })();
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
    p.appendChild(subhead('Image — select a photo first'));
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
      { matIcon: 'auto_awesome_motion', label: 'Make a design', tip: 'A brand-new design from the card — every box optional', onClick: function () { run('ai', { kind: 'deck' }); } },
      { matIcon: 'note_add', label: 'One slide', tip: 'Adds one more slide in this deck\'s style', onClick: function () { run('ai', { kind: 'slide' }); } },
      { matIcon: 'library_add', label: 'Add slides', tip: 'Adds several slides in this deck\'s style', onClick: function () { run('ai', { kind: 'addSlides' }); } },
      { matIcon: 'dashboard_customize', label: 'Mock-ups', onClick: function () { run('ai', { kind: 'mockups' }); } },
      /* 28 Aug 2026 (Javed) — 'Prepare my presentation' and 'Design + my content'
         hidden from the panel until the fill flow is finished. */
    ], 2));
    p.appendChild(subhead('Text — select a text box first'));
    p.appendChild(grid([
      { matIcon: 'edit_note', label: 'Rewrite', tip: 'Select a text box, then: clearer, punchier wording, same meaning', onClick: function () { run('ai', { kind: 'rewrite' }); } },
      { matIcon: 'compress', label: 'Summarize', tip: 'Select a text box, then: shortens it to one slide-friendly line', onClick: function () { run('ai', { kind: 'summarize' }); } },
      { matIcon: 'translate', label: 'Translate', tip: 'Select a text box, then choose a language', onClick: function () { run('ai', { kind: 'translate' }); } }
    ], 3));
    p.appendChild(subhead('Image — select a photo first'));
    p.appendChild(grid([
      { matIcon: 'auto_fix_normal', label: 'Remove photo background', tip: 'Select a photo, then: cuts the background out of THAT PHOTO (transparent PNG). To clear the slide background use Backgrounds ▸ Remove background.', onClick: function () { run('ai', { kind: 'removeBg' }); } }
    ], 1));
    /* 01 Sep 2026 (Sonnet) — MS Store cert (11.16 Live Generative AI Content):
       always-visible way to flag AI-generated output for review. */
    p.appendChild(subhead('Report'));
    var repRow = el('button', 'sb-report-ai'); repRow.type = 'button';
    repRow.title = 'Flag AI-generated content that looks wrong or inappropriate';
    repRow.appendChild(mat('flag', 'sb-btn-i'));
    repRow.appendChild(el('span', null, 'Report an issue with AI content'));
    repRow.addEventListener('click', function () { run('aiReport'); });
    p.appendChild(repRow);
  }
  function panelComponents(p) {
    p.appendChild(head('Components'));
    var list = ask('components') || [];
    p.appendChild(grid([{ matIcon: 'add_box', label: 'Save selection as component', tip: 'Select anything on the slide (or several things), then click', onClick: function () { run('componentSave'); } }], 1));
    if (!list.length) {
      p.appendChild(emptyState('widgets', 'No components yet',
        'Select something on the slide and click “Save selection as component” — or right-click it → Save as component.'));
      return;
    }
    var g = el('div', 'sb-grid'); g.style.gridTemplateColumns = 'repeat(2, 1fr)';
    list.forEach(function (c) {
      var b = el('button', 'sb-shape-card'); b.type = 'button'; b.title = c.name + ' — click to insert, right-click to delete';
      var w = el('span', 'sb-shape-art');
      if (c.thumb) { var im = document.createElement('img'); im.src = c.thumb; im.style.cssText = 'max-width:100%;max-height:64px;object-fit:contain;'; w.appendChild(im); }
      else w.appendChild(mat('widgets', 'sb-card-mi'));
      b.appendChild(w); b.appendChild(el('span', 'sb-card-lab', c.name));
      b.addEventListener('click', function () { run('componentInsert', c.id); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); run('componentDelete', c.id); });
      g.appendChild(b);
    });
    p.appendChild(g);
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

  /* ── Backgrounds panel (Canva-style, everything applies live) ──── */
  function gradUrl(a, b, dir) {
    var c = document.createElement('canvas'); c.width = 1600; c.height = 900;
    var x = c.getContext('2d');
    var g = dir === 'v' ? x.createLinearGradient(0, 0, 0, 900)
      : dir === 'r' ? x.createRadialGradient(800, 450, 60, 800, 450, 950)
      : x.createLinearGradient(0, 0, 1600, 900);
    g.addColorStop(0, a); g.addColorStop(1, b);
    x.fillStyle = g; x.fillRect(0, 0, 1600, 900);
    return c.toDataURL('image/jpeg', 0.92);
  }
  function svgBgUrl(inner, bg) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">' +
      '<rect width="1600" height="900" fill="' + bg + '"/>' + inner + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function panelBackground(p) {
    p.appendChild(head('Backgrounds'));

    /* 04 Sep 2026 - take the background OFF again. This panel could only ever
       put a background ON; the only "Remove background" in the app was the AI
       photo tool, which is a different thing entirely. */
    var rmBg = el('button', 'sb-primary'); rmBg.type = 'button';
    rmBg.appendChild(mat('format_color_reset', 'sb-btn-i'));
    rmBg.appendChild(document.createTextNode('Remove background'));
    rmBg.addEventListener('click', function () { run('backgroundRemove'); });
    p.appendChild(rmBg);

    p.appendChild(subhead('Colours'));
    var COLS = ['#FFFFFF', '#F8F9FB', '#F1F5F9', '#0F172A', '#1F2430', '#111827',
      '#7C3AED', '#A78BFA', '#F1EAFE', '#2563EB', '#93C5FD', '#DBEAFE',
      '#16A34A', '#86EFAC', '#DCFCE7', '#F59E0B', '#FDE68A', '#FEF3C7',
      '#DC2626', '#FCA5A5', '#DB2777', '#F9A8D4', '#0D9488', '#99F6E4'];
    var cg = el('div'); cg.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:6px';
    COLS.forEach(function (c) {
      var b = el('button'); b.type = 'button'; b.title = c;
      b.style.cssText = 'aspect-ratio:1;border-radius:8px;border:1px solid rgba(15,23,42,.18);background:' + c + ';cursor:pointer';
      b.addEventListener('click', function () { run('background', c); });
      cg.appendChild(b);
    });
    p.appendChild(cg);

    p.appendChild(subhead('Gradients'));
    var GRADS = [
      ['#7C3AED', '#DB2777'], ['#6C5CE7', '#00C2FF'], ['#2563EB', '#22D3EE'],
      ['#0F172A', '#7C3AED'], ['#F59E0B', '#DC2626'], ['#F97316', '#DB2777'],
      ['#16A34A', '#22D3EE'], ['#0D9488', '#84CC16'], ['#111827', '#374151'],
      ['#FDE68A', '#F9A8D4'], ['#E0E7FF', '#FBCFE8'], ['#DBEAFE', '#DCFCE7'],
      ['#1E3A8A', '#0EA5E9'], ['#4C1D95', '#DB2777'], ['#065F46', '#A3E635'],
      ['#FFFFFF', '#DDD6FE'], ['#FFF7ED', '#FDBA74'], ['#F8FAFC', '#CBD5E1']
    ];
    var DIRS = ['d', 'v', 'r'];
    var gg = el('div'); gg.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px';
    GRADS.forEach(function (pr, i) {
      var dir = DIRS[i % 3];
      var b = el('button'); b.type = 'button'; b.title = 'Gradient';
      b.style.cssText = 'aspect-ratio:16/10;border-radius:9px;border:1px solid rgba(15,23,42,.15);cursor:pointer;background:' +
        (dir === 'r' ? 'radial-gradient(circle,' + pr[0] + ',' + pr[1] + ')'
          : 'linear-gradient(' + (dir === 'v' ? '180deg' : '135deg') + ',' + pr[0] + ',' + pr[1] + ')');
      b.addEventListener('click', function () { run('backgroundImage', gradUrl(pr[0], pr[1], dir)); });
      gg.appendChild(b);
    });
    p.appendChild(gg);

    p.appendChild(subhead('Patterns'));
    function rep(fn, nx, ny) { var s = ''; for (var i = 0; i <= nx; i++) for (var j = 0; j <= ny; j++) s += fn(i * (1600 / nx), j * (900 / ny), i, j); return s; }
    var PATS = [
      { n: 'Dots', bg: '#F8F9FB', inner: rep(function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#CBD5E1"/>'; }, 20, 11) },
      { n: 'Dots dark', bg: '#0F172A', inner: rep(function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#334155"/>'; }, 20, 11) },
      { n: 'Grid', bg: '#FFFFFF', inner: rep(function (x, y, i, j) { return (j === 0 ? '<line x1="' + x + '" y1="0" x2="' + x + '" y2="900" stroke="#E2E8F0" stroke-width="2"/>' : '') + (i === 0 ? '<line x1="0" y1="' + y + '" x2="1600" y2="' + y + '" stroke="#E2E8F0" stroke-width="2"/>' : ''); }, 16, 9) },
      { n: 'Stripes', bg: '#F5F3FF', inner: rep(function (x) { return '<rect x="' + x + '" y="0" width="50" height="900" fill="#EDE9FE" transform="skewX(-18)"/>'; }, 16, 1) },
      { n: 'Waves', bg: '#EFF6FF', inner: rep(function (x, y, i, j) { return i === 0 ? '<path d="M0 ' + y + ' Q 200 ' + (y - 45) + ' 400 ' + y + ' T 800 ' + y + ' T 1200 ' + y + ' T 1600 ' + y + '" fill="none" stroke="#BFDBFE" stroke-width="5"/>' : ''; }, 1, 8) },
      { n: 'Bubbles', bg: '#ECFEFF', inner: '<circle cx="250" cy="700" r="190" fill="#CFFAFE"/><circle cx="1350" cy="180" r="240" fill="#A5F3FC" opacity=".7"/><circle cx="900" cy="820" r="150" fill="#67E8F9" opacity=".45"/><circle cx="1500" cy="650" r="110" fill="#CFFAFE"/>' },
      { n: 'Blobs', bg: '#FDF4FF', inner: '<ellipse cx="300" cy="200" rx="330" ry="240" fill="#F5D0FE" opacity=".8"/><ellipse cx="1300" cy="750" rx="380" ry="260" fill="#DDD6FE" opacity=".8"/><ellipse cx="1250" cy="150" rx="200" ry="160" fill="#FBCFE8" opacity=".7"/>' },
      { n: 'Night sky', bg: '#0B1026', inner: rep(function (x, y, i, j) { return '<circle cx="' + ((x + j * 37) % 1600) + '" cy="' + ((y + i * 23) % 900) + '" r="' + (1.5 + (i + j) % 3) + '" fill="#E0E7FF" opacity=".8"/>'; }, 14, 8) },
      { n: 'Confetti', bg: '#FFFBEB', inner: rep(function (x, y, i, j) { var cs = ['#F59E0B', '#DB2777', '#7C3AED', '#2563EB', '#16A34A']; return '<rect x="' + ((x + j * 53) % 1600) + '" y="' + ((y + i * 31) % 900) + '" width="14" height="7" rx="3" fill="' + cs[(i + j) % 5] + '" transform="rotate(' + ((i * j * 7) % 90) + ' ' + x + ' ' + y + ')"/>'; }, 12, 7) }
    ];
    var pg = el('div'); pg.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px';
    PATS.forEach(function (pt) {
      var url = svgBgUrl(pt.inner, pt.bg);
      var b = el('button'); b.type = 'button'; b.title = pt.n;
      b.style.cssText = 'aspect-ratio:16/10;border-radius:9px;border:1px solid rgba(15,23,42,.15);cursor:pointer;background:url(' + url.replace(/'/g, '%27') + ') center/cover';
      b.addEventListener('click', function () { run('backgroundImage', url); });
      pg.appendChild(b);
    });
    p.appendChild(pg);

    p.appendChild(subhead('Photos'));
    var IDS = [1015, 1016, 1018, 1020, 1024, 1025, 1035, 1036, 1039, 1043, 1050, 1057,
      1060, 1069, 1074, 1080, 110, 119, 133, 152, 164, 167, 180, 193, 200, 212, 219, 227];
    var fg2 = el('div', 'sb-photo-grid');
    IDS.forEach(function (id) {
      var b = el('button', 'sb-photo'); b.type = 'button'; b.title = 'Photo background';
      b.style.backgroundImage = 'url(https://picsum.photos/id/' + id + '/220/130)';
      b.addEventListener('click', function () { run('backgroundImage', 'https://picsum.photos/id/' + id + '/1600/900'); });
      fg2.appendChild(b);
    });
    p.appendChild(fg2);
  }

  /* ── rail definition ─────────────────────────────────────────────── */
  var RAIL = [
    { id: 'templates', label: 'Templates', ic: 'templates', build: panelTemplates },
    { id: 'elements', label: 'Elements', ic: 'elements', build: panelElements },
    { id: 'photos', label: 'Photos', ic: 'photos', build: panelPhotos },
    { id: 'background', label: 'Backgrounds', ic: 'wallpaper', build: panelBackground },
    { id: 'layers', label: 'Layers', ic: 'layers-i', build: panelLayers },
    { id: 'brand', label: 'Brand', ic: 'brand-i', build: panelBrand },
    { id: 'effects', label: 'Effects', ic: 'effects-i', build: panelEffects },
    { id: 'data', label: 'Data', ic: 'data-i', build: panelData },
    { id: 'ai', label: 'AI', ic: 'ai-i', build: panelAI },
    { id: 'components', label: 'Components', ic: 'components-i', build: panelComponents },
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
  listen('elements', function () { if (open === 'elements') paint(); });
  listen('datasets', function () { if (open === 'data') paint(); });
  listen('slides', function () { if (open === 'pages' || open === 'layers') paint(); });

  slot.appendChild(rail);
  slot.appendChild(drawer);
})();
