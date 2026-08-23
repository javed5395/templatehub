/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — RIBBON (PowerPoint-class)              owner: Fable
   ═══════════════════════════════════════════════════════════════════════
   THE WALL: this file talks to the engine ONLY through
   Editor.run / Editor.query / Editor.on  (contract: API.md).
   Forbidden: engine internals, renderer functions, #canvas.
   Icons: window.RBIcons (js/icons.js) — hand-drawn Office-coloured SVGs.
   Styling: css/editor.css section 6.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────────── */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function svg(name, cls) {
    var s = el('span', cls || 'rb-svg');
    var art = (window.RBIcons && window.RBIcons[name]) || null;
    if (art) s.innerHTML = art;
    else { s.className = (cls || 'rb-svg') + ' rb-svg-mat material-icons-outlined'; s.textContent = name; }
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

  var slot = document.getElementById('ribbon-slot');
  if (!slot) return;

  /* ── popover engine — anchored AT the button, 4px below it ───────── */
  var openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.anchor.classList.remove('is-open');
    openPop.node.remove();
    openPop = null;
  }
  function showPop(anchor, builder) {
    var same = openPop && openPop.anchor === anchor;
    closePop();
    if (same) return;
    var pop = el('div', 'rb-pop');
    pop.setAttribute('role', 'menu');
    builder(pop, closePop);
    slot.appendChild(pop);
    var ar = anchor.getBoundingClientRect();
    var sr = slot.getBoundingClientRect();
    var left = ar.left - sr.left;
    if (left + pop.offsetWidth > sr.width - 8) left = sr.width - pop.offsetWidth - 8;
    if (left < 8) left = 8;
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(ar.bottom - sr.top + 4) + 'px';
    anchor.classList.add('is-open');
    openPop = { node: pop, anchor: anchor };
    var f = pop.querySelector('input[type="text"], input[type="number"]');
    if (f) setTimeout(function () { f.focus(); }, 0);
  }
  document.addEventListener('mousedown', function (e) {
    if (openPop && !openPop.node.contains(e.target) && !openPop.anchor.contains(e.target)) closePop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

  /* ── live-state registry ─────────────────────────────────────────── */
  var reg = { textOnly: [], press: {}, named: {} };
  function press(key, node) { (reg.press[key] = reg.press[key] || []).push(node); }

  function wire(b, spec) {
    if (spec.textOnly) reg.textOnly.push(b);
    if (spec.press) press(spec.press, b);
    if (spec.id) reg.named[spec.id] = b;
    b.type = 'button';
    b.title = spec.tip || spec.label || '';
    b.addEventListener('click', function () {
      if (spec.pop) { showPop(b, spec.pop); return; }
      closePop();
      if (spec.onClick) { spec.onClick(b); }
      else if (spec.cmd) { run(spec.cmd, spec.arg); }
      setTimeout(sync, 0);
    });
    return b;
  }

  /* ── control factories (Office look) ─────────────────────────────── */
  function big(spec) {
    var b = wire(el('button', 'rb-big'), spec);
    b.appendChild(spec.matIcon ? mat(spec.matIcon, 'rb-svg-big-mat') : svg(spec.ic, 'rb-svg rb-svg-big'));
    var lab = el('span', 'rb-big-lab');
    String(spec.label).split('\n').forEach(function (line, i) {
      if (i) lab.appendChild(el('br'));
      lab.appendChild(document.createTextNode(line));
    });
    b.appendChild(lab);
    if (spec.pop) lab.appendChild(mat('arrow_drop_down', 'rb-caret-b'));
    return b;
  }
  function small(spec) {
    var b = wire(el('button', 'rb-sm' + (spec.label ? '' : ' rb-sm-ico')), spec);
    b.appendChild(spec.matIcon ? mat(spec.matIcon, 'rb-svg-sm-mat') : svg(spec.ic, 'rb-svg rb-svg-sm'));
    if (spec.label) b.appendChild(el('span', 'rb-sm-lab', spec.label));
    if (spec.pop) b.appendChild(mat('arrow_drop_down', 'rb-caret-s'));
    return b;
  }
  function group(label) {
    var g = el('div', 'rb-group');
    var body = el('div', 'rb-group-body');
    g.appendChild(body);
    g.appendChild(el('div', 'rb-group-lab', label));
    for (var i = 1; i < arguments.length; i++) body.appendChild(arguments[i]);
    return g;
  }
  function col() { var c = el('div', 'rb-col'); for (var i = 0; i < arguments.length; i++) c.appendChild(arguments[i]); return c; }
  function row() { var r = el('div', 'rb-row'); for (var i = 0; i < arguments.length; i++) r.appendChild(arguments[i]); return r; }

  function popRow(spec) {
    var b = el('button', 'rb-pop-row');
    b.type = 'button';
    if (spec.ic) b.appendChild(svg(spec.ic, 'rb-svg rb-svg-sm'));
    else if (spec.matIcon) b.appendChild(mat(spec.matIcon, 'rb-svg-sm-mat'));
    var w = el('span', 'rb-pop-lab');
    w.textContent = spec.label;
    if (spec.hint) w.appendChild(el('span', 'rb-pop-hint', spec.hint));
    b.appendChild(w);
    b.addEventListener('click', function () { closePop(); if (spec.onClick) spec.onClick(); else run(spec.cmd, spec.arg); setTimeout(sync, 0); });
    return b;
  }
  function popGrid(items, cols) {
    var g = el('div', 'rb-pop-grid');
    g.style.gridTemplateColumns = 'repeat(' + (cols || 4) + ', 1fr)';
    items.forEach(function (it) {
      var b = el('button', 'rb-pop-cell');
      b.type = 'button'; b.title = it.label;
      b.appendChild(it.matIcon ? mat(it.matIcon, 'rb-svg-sm-mat') : svg(it.ic, 'rb-svg rb-svg-sm'));
      b.appendChild(el('span', 'rb-pop-cell-lab', it.label));
      b.addEventListener('click', function () { closePop(); run(it.cmd, it.arg); setTimeout(sync, 0); });
      g.appendChild(b);
    });
    return g;
  }

  /* ── shared popovers ─────────────────────────────────────────────── */
  function fontPopover(pop, close) {
    pop.classList.add('rb-pop-font');
    var q = el('input'); q.type = 'text'; q.placeholder = 'Search fonts…';
    var listBox = el('div', 'rb-pop-list');
    var fonts = ask('fonts') || [];
    var cur = (ask('textState') || {}).fontFamily || '';
    function paint(f) {
      listBox.innerHTML = '';
      var m = fonts.filter(function (n) { return n.toLowerCase().indexOf(f) > -1; }).slice(0, 120);
      m.forEach(function (n) {
        var b = el('button', 'rb-pop-row' + (n === cur ? ' is-on' : ''));
        b.type = 'button';
        b.appendChild(mat(n === cur ? 'check' : '', 'rb-check'));
        var s = el('span', 'rb-pop-lab', n);
        s.style.fontFamily = "'" + n + "', sans-serif";
        b.appendChild(s);
        b.addEventListener('click', function () { close(); run('fontFamily', n); setTimeout(sync, 0); });
        listBox.appendChild(b);
      });
      if (!m.length) listBox.appendChild(el('div', 'rb-pop-none', 'No matches'));
    }
    q.addEventListener('input', function () { paint(q.value.trim().toLowerCase()); });
    paint('');
    var qw = el('div', 'rb-pop-search'); qw.appendChild(q);
    pop.appendChild(qw); pop.appendChild(listBox);
  }
  function sizePopover(pop, close) {
    pop.classList.add('rb-pop-size');
    var ladder = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 54, 66, 80, 96];
    var cur = Math.round((ask('textState') || {}).sizePt || 18);
    var inp = el('input'); inp.type = 'number'; inp.min = 1; inp.max = 999; inp.value = cur;
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { close(); run('fontSize', parseFloat(inp.value) || cur); setTimeout(sync, 0); }
    });
    var iw = el('div', 'rb-pop-search'); iw.appendChild(inp);
    pop.appendChild(iw);
    var listBox = el('div', 'rb-pop-list');
    ladder.forEach(function (s) {
      var b = el('button', 'rb-pop-row' + (s === cur ? ' is-on' : ''));
      b.type = 'button';
      b.appendChild(mat(s === cur ? 'check' : '', 'rb-check'));
      b.appendChild(el('span', 'rb-pop-lab', String(s)));
      b.addEventListener('click', function () { close(); run('fontSize', s); setTimeout(sync, 0); });
      listBox.appendChild(b);
    });
    pop.appendChild(listBox);
  }
  function swatchPopover(cmd, swatches, extra) {
    return function (pop, close) {
      pop.classList.add('rb-pop-colours');
      var g = el('div', 'rb-swatches');
      swatches.forEach(function (c) {
        var b = el('button', 'rb-sw');
        b.type = 'button'; b.title = c; b.style.background = c;
        b.addEventListener('click', function () { close(); run(cmd, c); setTimeout(sync, 0); });
        g.appendChild(b);
      });
      var wrap = el('label', 'rb-sw rb-sw-custom'); wrap.title = 'Custom colour';
      wrap.appendChild(mat('colorize', 'rb-sw-ico'));
      var inp = el('input'); inp.type = 'color';
      inp.addEventListener('change', function () { close(); run(cmd, inp.value.toUpperCase()); setTimeout(sync, 0); });
      wrap.appendChild(inp);
      g.appendChild(wrap);
      pop.appendChild(g);
      if (extra) pop.appendChild(extra(close));
    };
  }
  var TEXT_COLOURS = ['#1F2430', '#3B4252', '#5B6472', '#9AA3B2', '#FFFFFF', '#2B579A', '#5B9BD5', '#217346', '#70AD47', '#BF9000', '#FFC000', '#ED7D31', '#C43E1C', '#E81123', '#7719AA', '#B47EDE', '#D24726', '#0D9488'];
  var HIGHLIGHTS = ['#FDE047', '#FEF08A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#FBCFE8', '#FED7AA', '#E2E8F0'];
  var BACKGROUNDS = ['#FFFFFF', '#F8F9FB', '#EEF2F8', '#0F172A', '#1F2430', '#2B579A', '#FDF6EC', '#EAF3DE', '#F5EEFA', '#FDECEA', '#DEECF9', '#FFF8E5'];

  /* ── tab bodies ──────────────────────────────────────────────────── */
  function sepd() { return el('div', 'rb-sep'); }

  function tabHome() {
    /* HOME-REBUILT-TO-MATCH-MOCKUP — 8 groups: Clipboard, Slides, Font,
       Paragraph, Insert, Arrange, Editing, Selection. Every button uses a
       real Editor.run command (see core.js COMMANDS). Nothing removed. */
    var fontCombo = wire(el('button', 'rb-combo rb-combo-font'), { id: 'fontCombo', tip: 'Font', textOnly: true, pop: fontPopover });
    fontCombo.appendChild(el('span', 'rb-combo-val', 'DM Sans'));
    fontCombo.appendChild(mat('arrow_drop_down', 'rb-caret-s'));
    var sizeCombo = wire(el('button', 'rb-combo rb-combo-size'), { id: 'sizeCombo', tip: 'Font size', textOnly: true, pop: sizePopover });
    sizeCombo.appendChild(el('span', 'rb-combo-val', '18'));
    sizeCombo.appendChild(mat('arrow_drop_down', 'rb-caret-s'));

    function newSlidePop(pop) {
      pop.appendChild(el('div', 'rb-pop-head', 'Office theme'));
      var g = el('div', 'rb-layout-grid');
      (ask('slideLayouts') || []).forEach(function (L) {
        var b = el('button', 'rb-layout-card'); b.type = 'button'; b.title = L.name;
        var art = el('span', 'rb-layout-art'); art.innerHTML = L.svg;
        b.appendChild(art); b.appendChild(el('span', 'rb-layout-lab', L.name));
        b.addEventListener('click', function () { run('addSlideLayout', L.id); });
        g.appendChild(b);
      });
      pop.appendChild(g);
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'content_copy', label: 'Duplicate selected slide', cmd: 'duplicateSlide' }));
      pop.appendChild(popRow({ matIcon: 'format_list_bulleted', label: 'Slides from outline…', cmd: 'slidesOutline' }));
    }
    function textBoxPop(pop) {
      pop.appendChild(popRow({ matIcon: 'title', label: 'Heading', hint: 'Big title text', cmd: 'insertText', arg: 'heading' }));
      pop.appendChild(popRow({ matIcon: 'text_fields', label: 'Subheading', hint: 'Section label', cmd: 'insertText', arg: 'subheading' }));
      pop.appendChild(popRow({ matIcon: 'notes', label: 'Body text', hint: 'Paragraph copy', cmd: 'insertText', arg: 'body' }));
    }
    function shapesPop(pop) {
      pop.style.width = '298px'; pop.style.maxHeight = '430px'; pop.style.overflowY = 'auto';
      (ask('shapeGroups') || []).forEach(function (grp) {
        pop.appendChild(el('div', 'rb-pop-head', grp.name));
        var g = el('div'); g.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:2px 10px 8px';
        grp.items.forEach(function (it) {
          var b = el('button'); b.type = 'button'; b.title = it.name;
          b.style.cssText = 'display:grid;place-items:center;height:42px;border-radius:8px;border:1px solid var(--line-2);background:var(--bg-inset);cursor:pointer;padding:6px;color:var(--text-1);transition:all .15s ease';
          b.onmouseenter = function () { b.style.borderColor = 'var(--accent-line)'; };
          b.onmouseleave = function () { b.style.borderColor = 'var(--line-2)'; };
          var art = el('span'); art.style.cssText = 'display:block;line-height:0;width:100%;height:100%';
          art.innerHTML = it.svg;
          var sv = art.querySelector('svg');
          if (sv) {
            sv.style.width = '100%'; sv.style.height = '100%';
            sv.querySelectorAll('*').forEach(function (n) {
              if (n.getAttribute && n.getAttribute('fill')) n.setAttribute('fill', 'currentColor');
              if (n.getAttribute && n.getAttribute('stroke')) n.setAttribute('stroke', 'currentColor');
            });
          }
          b.appendChild(art);
          b.addEventListener('click', function () { closePop(); run(it.cmd, it.arg); setTimeout(sync, 0); });
          g.appendChild(b);
        });
        pop.appendChild(g);
      });
    }
    function arrangePop(pop) {
      pop.appendChild(popRow({ matIcon: 'flip_to_front', label: 'Bring to front', cmd: 'front' }));
      pop.appendChild(popRow({ matIcon: 'flip_to_back', label: 'Send to back', cmd: 'back' }));
      pop.appendChild(popRow({ matIcon: 'arrow_upward', label: 'Bring forward', cmd: 'forward' }));
      pop.appendChild(popRow({ matIcon: 'arrow_downward', label: 'Send backward', cmd: 'backward' }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'rotate_right', label: 'Rotate 90°', cmd: 'rotate', arg: 90 }));
      pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip horizontal', cmd: 'flipH' }));
      pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip vertical', cmd: 'flipV' }));
    }
    function alignPop(pop) {
      pop.appendChild(popRow({ matIcon: 'align_horizontal_left', label: 'Align left', cmd: 'alignSlide', arg: 'left' }));
      pop.appendChild(popRow({ matIcon: 'align_horizontal_center', label: 'Align centre', cmd: 'alignSlide', arg: 'centerH' }));
      pop.appendChild(popRow({ matIcon: 'align_horizontal_right', label: 'Align right', cmd: 'alignSlide', arg: 'right' }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'align_vertical_top', label: 'Align top', cmd: 'alignSlide', arg: 'top' }));
      pop.appendChild(popRow({ matIcon: 'align_vertical_center', label: 'Align middle', cmd: 'alignSlide', arg: 'centerV' }));
      pop.appendChild(popRow({ matIcon: 'align_vertical_bottom', label: 'Align bottom', cmd: 'alignSlide', arg: 'bottom' }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'horizontal_distribute', label: 'Distribute horizontally', cmd: 'distribute', arg: 'h' }));
      pop.appendChild(popRow({ matIcon: 'vertical_distribute', label: 'Distribute vertically', cmd: 'distribute', arg: 'v' }));
    }
    function groupPop(pop) {
      pop.appendChild(popRow({ matIcon: 'join_full', label: 'Group', cmd: 'group' }));
      pop.appendChild(popRow({ matIcon: 'join_inner', label: 'Ungroup', cmd: 'ungroup' }));
    }
    function moreFontPop(pop) {
      pop.appendChild(popRow({ matIcon: 'format_clear', label: 'Clear formatting', cmd: 'clearFormat' }));
    }
    function selectionPop(pop) {
      pop.appendChild(popRow({ matIcon: 'lock_open', label: 'Unlock all', cmd: 'unlockAll' }));
      pop.appendChild(popRow({ matIcon: 'lock', label: 'Lock selected', cmd: 'lock' }));
    }

    var imgFile = el('input'); imgFile.type = 'file'; imgFile.accept = 'image/*'; imgFile.className = 'rb-file';
    imgFile.addEventListener('change', function () {
      var f = imgFile.files && imgFile.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () { run('insertImage', r.result); }; r.readAsDataURL(f); imgFile.value = '';
    });

    var body = el('div', 'rb-body-inner');
    body.appendChild(imgFile);

    body.appendChild(group('Clipboard',
      big({ ic: 'paste', label: 'Paste', cmd: 'paste' }),
      col(
        small({ ic: 'cut', label: 'Cut', cmd: 'cut' }),
        small({ ic: 'copy', label: 'Copy', cmd: 'copy' }),
        small({ ic: 'painter', label: 'Format', cmd: 'formatPainter' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Slides',
      col(
        small({ ic: 'new-slide', label: 'New Slide', pop: newSlidePop }),
        small({ ic: 'dup-slide', label: 'Duplicate', cmd: 'duplicateSlide' }),
        small({ ic: 'delete', label: 'Delete', cmd: 'deleteSlide' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Font',
      col(
        row(fontCombo, sizeCombo,
          small({ matIcon: 'text_increase', tip: 'Grow font', cmd: 'fontStep', arg: 1, textOnly: true }),
          small({ matIcon: 'text_decrease', tip: 'Shrink font', cmd: 'fontStep', arg: -1, textOnly: true })
        ),
        row(
          small({ matIcon: 'format_bold', tip: 'Bold', cmd: 'bold', press: 'bold', textOnly: true }),
          small({ matIcon: 'format_italic', tip: 'Italic', cmd: 'italic', press: 'italic', textOnly: true }),
          small({ matIcon: 'format_underlined', tip: 'Underline', cmd: 'underline', press: 'underline', textOnly: true }),
          small({ matIcon: 'strikethrough_s', tip: 'Strikethrough', cmd: 'strike', press: 'strike', textOnly: true }),
          small({ ic: 'text-colour', tip: 'Font colour', textOnly: true, pop: swatchPopover('textColour', TEXT_COLOURS) }),
          small({ ic: 'highlight', tip: 'Highlight', textOnly: true, pop: swatchPopover('highlight', HIGHLIGHTS, function () {
            return popRow({ matIcon: 'format_color_reset', label: 'No highlight', onClick: function () { run('highlight', null); } });
          }) }),
          small({ matIcon: 'more_horiz', tip: 'More text options', textOnly: true, pop: moreFontPop })
        )
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Paragraph',
      col(
        row(
          small({ ic: 'bullets', tip: 'Bullets', cmd: 'bullets', press: 'bullets', textOnly: true }),
          small({ ic: 'numbering', tip: 'Numbering', cmd: 'numbering', press: 'numbering', textOnly: true })
        ),
        row(
          small({ matIcon: 'format_align_left', tip: 'Align left', cmd: 'align', arg: 'left', press: 'align-left', textOnly: true }),
          small({ matIcon: 'format_align_center', tip: 'Centre', cmd: 'align', arg: 'center', press: 'align-center', textOnly: true }),
          small({ matIcon: 'format_align_right', tip: 'Align right', cmd: 'align', arg: 'right', press: 'align-right', textOnly: true }),
          small({ matIcon: 'format_align_justify', tip: 'Justify', cmd: 'align', arg: 'justify', press: 'align-justify', textOnly: true }),
          small({ matIcon: 'format_line_spacing', tip: 'Line spacing', textOnly: true, pop: function (pop) {
            [1.0, 1.15, 1.5, 2.0].forEach(function (v) { pop.appendChild(popRow({ matIcon: 'format_line_spacing', label: v.toFixed(2), cmd: 'lineSpacing', arg: v })); });
          } })
        )
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Insert',
      col(
        small({ ic: 'textbox', label: 'Text Box', pop: textBoxPop }),
        small({ ic: 'image', label: 'Images', pop: function (pop) {
          pop.appendChild(popRow({ matIcon: 'upload', label: 'Upload from device', hint: 'Photo from your computer', onClick: function () { imgFile.click(); } }));
        } })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Arrange',
      col(
        small({ ic: 'arrange', label: 'Arrange', pop: arrangePop }),
        small({ matIcon: 'align_horizontal_center', label: 'Align', pop: alignPop }),
        small({ matIcon: 'join_full', label: 'Group', pop: groupPop })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Editing',
      col(
        small({ ic: 'find', label: 'Find', cmd: 'find' }),
        small({ matIcon: 'find_replace', label: 'Replace', cmd: 'find' }),
        small({ matIcon: 'select_all', label: 'Select All', cmd: 'selectAll' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Selection',
      big({ matIcon: 'lock_open', label: 'Unlock\nAll', pop: selectionPop })
    ));
    return body;
  }

  function tabInsert() {
    var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.className = 'rb-file';
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { run('insertImage', r.result); };
      r.readAsDataURL(f);
      file.value = '';
    });
    var body = el('div', 'rb-body-inner');
    body.appendChild(file);
    body.appendChild(group('Slides',
      big({ ic: 'new-slide', label: 'New\nSlide', pop: function (pop) {
        pop.appendChild(el('div', 'rb-pop-head', 'Office theme'));
        var g = el('div', 'rb-layout-grid');
        (ask('slideLayouts') || []).forEach(function (L) {
          var b = el('button', 'rb-layout-card'); b.type = 'button'; b.title = L.name;
          var art = el('span', 'rb-layout-art'); art.innerHTML = L.svg;
          b.appendChild(art);
          b.appendChild(el('span', 'rb-layout-lab', L.name));
          b.addEventListener('click', function () { run('addSlideLayout', L.id); });
          g.appendChild(b);
        });
        pop.appendChild(g);
        pop.appendChild(el('div', 'rb-pop-div'));
        pop.appendChild(popRow({ matIcon: 'content_copy', label: 'Duplicate selected slide', cmd: 'duplicateSlide' }));
        pop.appendChild(popRow({ matIcon: 'format_list_bulleted', label: 'Slides from outline…', cmd: 'slidesOutline' }));
      } }),
      big({ ic: 'dup-slide', label: 'Reuse\nSlide', cmd: 'duplicateSlide' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Tables',
      big({ ic: 'table', label: 'Table', cmd: 'insertTable' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Images',
      big({ ic: 'image', label: 'Pictures', onClick: function () { file.click(); } })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Text',
      big({ ic: 'textbox', label: 'Text\nBox', pop: function (pop) {
        pop.appendChild(popRow({ matIcon: 'title', label: 'Heading', hint: 'Big title text', cmd: 'insertText', arg: 'heading' }));
        pop.appendChild(popRow({ matIcon: 'text_fields', label: 'Subheading', hint: 'Section label', cmd: 'insertText', arg: 'subheading' }));
        pop.appendChild(popRow({ matIcon: 'notes', label: 'Body text', hint: 'Paragraph copy', cmd: 'insertText', arg: 'body' }));
      } }),
      big({ ic: 'wordart', label: 'WordArt', pop: function (pop) {
        pop.appendChild(el('div', 'rb-pop-head', 'WordArt styles'));
        var g = el('div', 'rb-wa-grid');
        (ask('wordArtStyles') || []).forEach(function (st) {
          var b = el('button', 'rb-wa-item'); b.type = 'button'; b.title = st.name;
          var a = el('span', 'rb-wa-A', 'A'); a.style.cssText = st.css;
          b.appendChild(a);
          b.addEventListener('click', function () { run('insertWordArt', st.i); });
          g.appendChild(b);
        });
        pop.appendChild(g);
      } })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Media',
      big({ ic: 'video', label: 'Video', cmd: 'insertVideo' }),
      big({ ic: 'audio', label: 'Audio', cmd: 'insertAudio' })
    ));
    return body;
  }

  function tabDraw() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Drawing tools',
      big({ matIcon: 'near_me', label: 'Select', cmd: 'drawSelect', press: 'draw-select' }),
      big({ ic: 'draw-pen', label: 'Pen', cmd: 'drawPen', press: 'draw-pen' }),
      big({ ic: 'draw-highlighter', label: 'Highlighter', cmd: 'drawHighlighter', press: 'draw-high' }),
      big({ ic: 'eraser', label: 'Eraser', cmd: 'drawEraser', press: 'draw-erase' })
    ));
    body.appendChild(sepd());
    var swRow = row();
    ['#1F2430', '#E81123', '#2B579A', '#217346', '#FFC000', '#7719AA'].forEach(function (c) {
      var b = el('button', 'rb-drawsw');
      b.type = 'button'; b.title = c; b.style.background = c;
      b.addEventListener('click', function () { run('drawColour', c); });
      swRow.appendChild(b);
    });
    body.appendChild(group('Colour & size',
      col(
        swRow,
        row(
          small({ matIcon: 'line_weight', label: 'Thickness', pop: function (pop) {
            [2, 4, 8, 12].forEach(function (s) {
              pop.appendChild(popRow({ matIcon: 'horizontal_rule', label: s + ' px', cmd: 'drawSize', arg: s }));
            });
          } })
        )
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Edit',
      col(
        small({ matIcon: 'layers_clear', label: 'Clear all drawings', cmd: 'drawClear' })
      )
    ));
    return body;
  }

  function themeCard(t) {
    var b = el('button', 'rb-theme');
    b.type = 'button'; b.title = t.name + ' theme';
    b.style.background = t.bg || '#fff';
    var aa = el('span', 'rb-theme-aa', 'Aa');
    aa.style.color = t.heading || '#1F2430';
    b.appendChild(aa);
    var strip = el('span', 'rb-theme-strip');
    [t.accent, t.heading, t.body, t.surface].forEach(function (c) {
      if (!c) return;
      var d = el('span'); d.style.background = c; strip.appendChild(d);
    });
    b.appendChild(strip);
    var nm = el('span', 'rb-theme-name', t.name);
    nm.style.color = t.heading || '#1F2430';
    b.appendChild(nm);
    b.addEventListener('click', function () { run('themeApply', t.id); });
    return b;
  }
  function tabDesign() {
    var body = el('div', 'rb-body-inner');
    var themes = (window.RBAssets && window.RBAssets.THEME_PRESETS) || [];
    var gal = el('div', 'rb-theme-gallery');
    themes.forEach(function (t) { gal.appendChild(themeCard(t)); });
    var g = group('Themes — applies to every slide'); g.firstChild.appendChild(gal);
    body.appendChild(g);
    body.appendChild(sepd());
    body.appendChild(group('Customise',
      big({ ic: 'bg-to-all', label: 'Background', pop: swatchPopover('background', BACKGROUNDS) }),
      big({ ic: 'page-size', label: 'Canvas\nSize', pop: function (pop) {
        /* 21 Aug 2026 — the full standard list (same one the design card shows) */
        var L = (window.LD_DESIGN_DATA && window.LD_DESIGN_DATA.SIZES) || [['16:9', '16:9 Widescreen', 1920, 1080]];
        L.forEach(function (sz) {
          var ic = sz[0] === 'custom' ? 'tune' : (!sz[2] ? 'crop_16_9' : sz[2] === sz[3] ? 'crop_square' : sz[2] > sz[3] ? 'crop_16_9' : 'crop_portrait');
          if (sz[0] === 'custom') {
            pop.appendChild(popRow({ matIcon: ic, label: sz[1], onClick: function () {
              var ask = window.ldPrompt ? window.ldPrompt('Custom size — width x height in pixels', 'e.g. 1200x800') : Promise.resolve(prompt('Width x height in px (e.g. 1200x800)'));
              Promise.resolve(ask).then(function (v) {
                var m = /^\s*(\d{2,5})\s*[x×X*,]\s*(\d{2,5})\s*$/.exec(String(v || ''));
                if (!m) { if (v && window.Editor) Editor._toast('Type it as width x height, e.g. 1200x800'); return; }
                run('pageSize', m[1] + 'x' + m[2]);
              });
            } }));
          } else {
            pop.appendChild(popRow({ matIcon: ic, label: sz[1], cmd: 'pageSize', arg: sz[0] }));
          }
        });
      } }),
      big({ ic: 'theme-fonts', label: 'Theme\nFonts', cmd: 'themeFonts' })
    ));
    return body;
  }

  function tabTransitions() {
    var body = el('div', 'rb-body-inner');
    var g = group('Transition to this slide');
    [{ k: 'none', label: 'None' }, { k: 'fade', label: 'Fade' }, { k: 'slide', label: 'Push' },
     { k: 'wipe', label: 'Wipe' }, { k: 'split', label: 'Split' }, { k: 'reveal', label: 'Reveal' },
     { k: 'zoom', label: 'Zoom' }].forEach(function (t) {
      g.firstChild.appendChild(big({ ic: 'transition', label: t.label, cmd: 'setTransition', arg: t.k, press: 'trans-' + t.k }));
    });
    body.appendChild(g);
    body.appendChild(sepd());
    body.appendChild(group('Timing',
      col(
        small({ matIcon: 'timer', label: 'Duration', pop: function (pop) {
          [300, 500, 800, 1200, 2000].forEach(function (ms) {
            pop.appendChild(popRow({ matIcon: 'timer', label: (ms / 1000).toFixed(1) + ' s', cmd: 'transitionDuration', arg: ms }));
          });
        } }),
        small({ matIcon: 'done_all', label: 'Apply to all slides', cmd: 'transitionApplyAll' })
      )
    ));
    return body;
  }

  function animChip(colour) {
    var c = el('span', 'rb-anim-chip');
    c.style.background = colour;
    return c;
  }
  function animCard(label, colour, kind) {
    var b = el('button', 'rb-big');
    b.type = 'button'; b.title = label;
    b.appendChild(animChip(colour));
    var lab = el('span', 'rb-big-lab', label);
    b.appendChild(lab);
    press('anim-' + kind, b);
    b.addEventListener('click', function () { run('setAnimation', kind); setTimeout(sync, 0); });
    return b;
  }
  function tabAnimations() {
    var body = el('div', 'rb-body-inner');
    var gNone = group('None');
    gNone.firstChild.appendChild(animCard('None', '#E2E8F0', 'none'));
    body.appendChild(gNone);
    body.appendChild(sepd());
    var gIn = group('Entrance');
    [['Appear', '#8B5CF6', 'appear'], ['Fade', '#F1734F', 'fade-in'], ['Fly in', '#14B8A6', 'fly-in'],
     ['Float in', '#2563EB', 'float-in'], ['Split', '#EAB308', 'split-in'], ['Wipe', '#DB2777', 'wipe-in'],
     ['Shape', '#16A34A', 'shape-in'], ['Wheel', '#EA580C', 'wheel'], ['Random bars', '#A78BFA', 'bars'],
     ['Grow & turn', '#0EA5E9', 'grow-turn'], ['Zoom', '#DC2626', 'zoom-in'], ['Swivel', '#0F766E', 'swivel'],
     ['Bounce', '#65A30D', 'bounce']].forEach(function (a) {
      gIn.firstChild.appendChild(animCard(a[0], a[1], a[2]));
    });
    body.appendChild(gIn);
    body.appendChild(sepd());
    var gEm = group('Emphasis');
    [['Pulse', '#F59E0B', 'pulse'], ['Teeter', '#FBBF24', 'teeter'], ['Spin', '#D97706', 'spin'],
     ['Grow', '#CA8A04', 'grow']].forEach(function (a) {
      gEm.firstChild.appendChild(animCard(a[0], a[1], a[2]));
    });
    body.appendChild(gEm);
    body.appendChild(sepd());
    var gOut = group('Exit');
    [['Disappear', '#F87171', 'disappear'], ['Fade', '#EF4444', 'fade-out'], ['Fly out', '#DC2626', 'fly-out'],
     ['Zoom', '#B91C1C', 'zoom-out']].forEach(function (a) {
      gOut.firstChild.appendChild(animCard(a[0], a[1], a[2]));
    });
    body.appendChild(gOut);
    return body;
  }

  function tabSlideShow() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Start slide show',
      big({ ic: 'present-start', label: 'From\nBeginning', cmd: 'presentFromStart' }),
      big({ ic: 'present-current', label: 'From Current\nSlide', cmd: 'presentFromCurrent' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Set up',
      big({ ic: 'rehearse', label: 'Rehearse\nTimings', cmd: 'rehearse' }),
      big({ ic: 'presenter-view', label: 'Presenter\nView', cmd: 'presenterView' })
    ));
    return body;
  }

  function tabReview() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Proofing',
      big({ ic: 'proof-spell', label: 'Spelling', cmd: 'spellCheck' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Comments',
      big({ ic: 'comment-add', label: 'New\nComment', cmd: 'addComment' }),
      col(
        small({ matIcon: 'forum', label: 'Show comments', cmd: 'showComments' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Accessibility',
      big({ ic: 'a11y', label: 'Check\nAccessibility', cmd: 'accessibilityCheck' })
    ));
    return body;
  }

  function tabView() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Presentation views',
      big({ ic: 'normal-view', label: 'Normal', cmd: 'viewNormal' }),
      big({ matIcon: 'segment', label: 'Outline\nView', cmd: 'outlineView' }),
      big({ ic: 'sorter', label: 'Slide\nSorter', cmd: 'viewSorter' }),
      big({ ic: 'notes-view', label: 'Notes', cmd: 'toggleNotes', press: 'view-notes' }),
      big({ matIcon: 'auto_stories', label: 'Reading\nView', cmd: 'readingView' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Master views',
      big({ matIcon: 'dashboard_customize', label: 'Slide\nMaster', pop: function (pop) {
        pop.appendChild(popRow({ matIcon: 'push_pin', label: 'Show selected on ALL slides', hint: 'Select an element first, then click', cmd: 'masterAdd' }));
        pop.appendChild(popRow({ matIcon: 'remove_circle_outline', label: 'Remove from all slides', hint: 'Keeps it on this slide only', cmd: 'masterRemove' }));
      } }),
      col(
        small({ matIcon: 'print', label: 'Handout Master', cmd: 'handoutMaster' }),
        small({ matIcon: 'sticky_note_2', label: 'Notes Master', cmd: 'notesMaster' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Color/Grayscale',
      col(
        small({ matIcon: 'palette', label: 'Color', cmd: 'colourMode', arg: 'color' }),
        small({ matIcon: 'gradient', label: 'Grayscale', cmd: 'colourMode', arg: 'gray' }),
        small({ matIcon: 'contrast', label: 'Black and white', cmd: 'colourMode', arg: 'bw' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Window',
      big({ matIcon: 'open_in_new', label: 'New\nWindow', cmd: 'newWindow' })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Zoom',
      big({ ic: 'zoom', label: 'Zoom', pop: function (pop) {
        [50, 75, 100, 150, 200].forEach(function (z) {
          pop.appendChild(popRow({ matIcon: 'search', label: z + '%', cmd: 'zoom', arg: z }));
        });
      } }),
      big({ ic: 'fit', label: 'Fit\nSlide', cmd: 'zoomFit' }),
      col(
        small({ matIcon: 'fit_screen', label: 'Fit width', cmd: 'fitWidth' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Show',
      col(
        small({ ic: 'ruler', label: 'Ruler', cmd: 'toggleRuler', press: 'view-ruler' }),
        small({ ic: 'grid', label: 'Gridlines', cmd: 'toggleGrid', press: 'view-grid' }),
        small({ ic: 'guides', label: 'Guides', cmd: 'toggleGuides', press: 'view-guides' })
      )
    ));
    return body;
  }

  function tabHelp() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Help',
      big({ ic: 'help-q', label: 'Help', cmd: 'openHelp' }),
      big({ ic: 'shortcuts', label: 'Keyboard\nShortcuts', cmd: 'showShortcuts' }),
      big({ ic: 'feedback', label: 'Feedback', cmd: 'sendFeedback' })
    ));
    return body;
  }

  /* ── contextual FORMAT tab (PPT Shape-Format style) ──────────────── */
  function fmtAlignPop(pop) {
    pop.appendChild(popRow({ matIcon: 'align_horizontal_left', label: 'Align left', cmd: 'alignSlide', arg: 'left' }));
    pop.appendChild(popRow({ matIcon: 'align_horizontal_center', label: 'Align centre', cmd: 'alignSlide', arg: 'centerH' }));
    pop.appendChild(popRow({ matIcon: 'align_horizontal_right', label: 'Align right', cmd: 'alignSlide', arg: 'right' }));
    pop.appendChild(el('div', 'rb-pop-div'));
    pop.appendChild(popRow({ matIcon: 'align_vertical_top', label: 'Align top', cmd: 'alignSlide', arg: 'top' }));
    pop.appendChild(popRow({ matIcon: 'align_vertical_center', label: 'Align middle', cmd: 'alignSlide', arg: 'centerV' }));
    pop.appendChild(popRow({ matIcon: 'align_vertical_bottom', label: 'Align bottom', cmd: 'alignSlide', arg: 'bottom' }));
    pop.appendChild(el('div', 'rb-pop-div'));
    pop.appendChild(popRow({ matIcon: 'horizontal_distribute', label: 'Distribute horizontally', cmd: 'distribute', arg: 'h' }));
    pop.appendChild(popRow({ matIcon: 'vertical_distribute', label: 'Distribute vertically', cmd: 'distribute', arg: 'v' }));
  }
  function tabFormat() {
    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Shape Styles',
      big({ matIcon: 'format_color_fill', label: 'Shape\nFill', pop: swatchPopover('shapeFill', TEXT_COLOURS) }),
      big({ matIcon: 'border_color', label: 'Outline', pop: swatchPopover('shapeOutline', TEXT_COLOURS, function () {
        return popRow({ matIcon: 'format_color_reset', label: 'No outline', onClick: function () { run('shapeOutline', null); } });
      }) }),
      col(
        small({ matIcon: 'line_weight', label: 'Weight', pop: function (pop) {
          [1, 2, 4, 6, 8, 12].forEach(function (w) { pop.appendChild(popRow({ matIcon: 'horizontal_rule', label: w + ' px', cmd: 'shapeOutlineW', arg: w })); });
        } }),
        small({ matIcon: 'opacity', label: 'Transparency', pop: function (pop) {
          [100, 80, 60, 40, 20].forEach(function (p) { pop.appendChild(popRow({ matIcon: 'opacity', label: (100 - p) + '%', cmd: 'shapeOpacity', arg: p / 100 })); });
        } })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Text',
      big({ ic: 'wordart', label: 'WordArt\nStyles', pop: function (pop) {
        pop.appendChild(el('div', 'rb-pop-head', 'WordArt styles'));
        var g = el('div', 'rb-wa-grid');
        (ask('wordArtStyles') || []).forEach(function (st) {
          var b = el('button', 'rb-wa-item'); b.type = 'button'; b.title = st.name;
          var a = el('span', 'rb-wa-A', 'A'); a.style.cssText = st.css;
          b.appendChild(a);
          b.addEventListener('click', function () { run('insertWordArt', st.i); });
          g.appendChild(b);
        });
        pop.appendChild(g);
      } })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Arrange',
      col(
        small({ matIcon: 'flip_to_front', label: 'Bring Forward', cmd: 'forward' }),
        small({ matIcon: 'flip_to_back', label: 'Send Backward', cmd: 'backward' }),
        small({ matIcon: 'align_horizontal_center', label: 'Align', pop: fmtAlignPop })
      ),
      col(
        small({ matIcon: 'join_full', label: 'Group', cmd: 'group' }),
        small({ matIcon: 'join_inner', label: 'Ungroup', cmd: 'ungroup' }),
        small({ matIcon: 'rotate_right', label: 'Rotate', pop: function (pop) {
          pop.appendChild(popRow({ matIcon: 'rotate_right', label: 'Rotate 90°', cmd: 'rotate', arg: 90 }));
          pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip horizontal', cmd: 'flipH' }));
          pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip vertical', cmd: 'flipV' }));
        } })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Size & lock',
      col(
        small({ matIcon: 'flip_to_front', label: 'Bring to Front', cmd: 'front' }),
        small({ matIcon: 'flip_to_back', label: 'Send to Back', cmd: 'back' }),
        small({ matIcon: 'lock', label: 'Lock', cmd: 'lock' })
      )
    ));
    return body;
  }

  /* ── 3D tab (23 Aug 2026, Fable — step 4: Javed's angle + light list) ──
     Works on the SELECTED 3D object: camera angles snap its pose, light
     presets re-light it. Both re-bake sharp instantly. */
  function tab3D() {
    var body = el('div', 'rb-body-inner');
    function sm(ic, lab, cmd, arg) { return small({ matIcon: ic, label: lab, cmd: cmd, arg: arg }); }
    body.appendChild(group('Camera angle',
      col(sm('center_focus_strong', 'Front', 'threeAngle', 'front'),
          sm('flip', 'Back', 'threeAngle', 'back'),
          sm('arrow_back', 'Left', 'threeAngle', 'left')),
      col(sm('arrow_forward', 'Right', 'threeAngle', 'right'),
          sm('arrow_upward', 'Top', 'threeAngle', 'top'),
          sm('arrow_downward', 'Bottom', 'threeAngle', 'bottom')),
      col(sm('rotate_right', '45° view', 'threeAngle', 'deg45'),
          sm('deployed_code', 'Isometric', 'threeAngle', 'iso'),
          sm('casino', 'Random cine', 'threeAngle', 'random'))
    ));
    body.appendChild(sepd());
    body.appendChild(group('Shot',
      col(sm('zoom_in', 'Close-up', 'threeAngle', 'closeup'),
          sm('zoom_out', 'Wide shot', 'threeAngle', 'wide'),
          sm('crop_free', 'Normal zoom', 'threeAngle', 'zoomoff')),
      col(big({ matIcon: '360', label: 'Orbit\n360°', cmd: 'threeAngle', arg: 'orbit' }))
    ));
    body.appendChild(sepd());
    body.appendChild(group('Hexa 3D',
      col(big({ matIcon: 'auto_awesome', label: 'Describe\nyour scene', cmd: 'threeOrder' }))
    ));
    body.appendChild(sepd());
    body.appendChild(group('Lights',
      col(sm('light_mode', 'Softbox', 'threeLight', 'softbox'),
          sm('fluorescent', 'Tube', 'threeLight', 'tube'),
          sm('flashlight_on', 'Spot', 'threeLight', 'spot')),
      col(sm('select_all', 'Area', 'threeLight', 'area'),
          sm('palette', 'RGB', 'threeLight', 'rgb'),
          sm('celebration', 'Disco', 'threeLight', 'disco')),
      col(sm('wb_sunny', 'Warm studio', 'threeLight', 'warm'),
          sm('ac_unit', 'Cool studio', 'threeLight', 'cool'),
          sm('tune', 'Multi-light', 'threeLight', 'multi'))
    ));
    return body;
  }

  /* ── tab strip + shell ───────────────────────────────────────────── */
  var TABS = [
    { id: 'home', name: 'Home', build: tabHome },
    { id: 'insert', name: 'Insert', build: tabInsert },
    { id: 'draw', name: 'Draw', build: tabDraw },
    { id: 'design', name: 'Design', build: tabDesign },
    { id: 'transitions', name: 'Transitions', build: tabTransitions },
    { id: 'animations', name: 'Animations', build: tabAnimations },
    { id: 'three', name: '3D', build: tab3D },
    { id: 'slideshow', name: 'Slide Show', build: tabSlideShow },
    { id: 'review', name: 'Review', build: tabReview },
    { id: 'view', name: 'View', build: tabView },
    { id: 'format', name: 'Format', build: tabFormat, ctx: true },
    { id: 'help', name: 'Help', build: tabHelp }
  ];
  var active = 'home';
  var rb = el('div', 'rb');
  /* SINGLE top row: brand + file + tabs + actions all in one strip
     (the old separate brand row was removed to free vertical space) */
  var topbar = el('div', 'rb-tabs rb-onebar');
  var tabstrip = topbar;
  var bodyHost = el('div', 'rb-body');
  rb.appendChild(topbar); rb.appendChild(bodyHost);

  function upNote(msg) {
    var host = document.getElementById('toast-host'); if (!host) return;
    var t = el('div', 'toast', msg); host.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ── brand removed per request — tabs now start at the far left ── */

  var flexNode = el('div', 'rb-flex');
  topbar.appendChild(flexNode);

  var undoB = el('button', 'rb-tico'); undoB.type = 'button'; undoB.title = 'Undo (Ctrl+Z)';
  undoB.appendChild(svg('undo', 'rb-svg rb-svg-sm'));
  undoB.addEventListener('click', function () { run('undo'); setTimeout(sync, 0); });
  var redoB = el('button', 'rb-tico'); redoB.type = 'button'; redoB.title = 'Redo (Ctrl+Y)';
  redoB.appendChild(svg('redo', 'rb-svg rb-svg-sm'));
  redoB.addEventListener('click', function () { run('redo'); setTimeout(sync, 0); });
  topbar.appendChild(undoB); topbar.appendChild(redoB);

  /* day / night toggle (remembers the choice; default = dark) */
  var themeTog = el('button', 'rb-theme-tog'); themeTog.type = 'button'; themeTog.title = 'Day / night';
  themeTog.appendChild(mat('light_mode', 'rb-tog-sun'));
  themeTog.appendChild(mat('dark_mode', 'rb-tog-moon'));
  themeTog.appendChild(el('span', 'rb-tog-knob'));
  function applyTheme(t) {
    if (t === 'light') document.body.setAttribute('data-theme', 'light');
    else document.body.removeAttribute('data-theme');
  }
  var savedTheme = 'dark';
  try { if (localStorage.getItem('lds-editor-theme') === 'light') savedTheme = 'light'; } catch (e) {}
  applyTheme(savedTheme);
  themeTog.addEventListener('click', function () {
    var next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem('lds-editor-theme', next); } catch (e) {}
  });
  topbar.appendChild(themeTog);

  /* ── File menu (New design / Save) — moved out of the account menu ── */
  var fileB = el('button', 'rb-tico'); fileB.type = 'button'; fileB.title = 'File';
  fileB.appendChild(mat('description'));
  fileB.addEventListener('click', function () {
    showPop(fileB, function (pop) {
      pop.appendChild(popRow({ matIcon: 'note_add', label: 'New design', cmd: 'newDesign' }));
      pop.appendChild(popRow({ matIcon: 'save', label: 'Save', cmd: 'saveProject' }));
    });
  });
  topbar.appendChild(fileB);

  /* Upload button (replaces Present — Present now lives beside the zoom bar) */
  var upFile = el('input'); upFile.type = 'file'; upFile.accept = 'image/*'; upFile.className = 'rb-file';
  upFile.addEventListener('change', function () {
    var f = upFile.files && upFile.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { run('insertImage', r.result); }; r.readAsDataURL(f); upFile.value = '';
  });
  topbar.appendChild(upFile);
  var uploadB = el('button', 'rb-action'); uploadB.type = 'button'; uploadB.title = 'Upload';
  uploadB.appendChild(mat('upload', 'rb-act-ico'));
  uploadB.appendChild(document.createTextNode('Upload'));
  uploadB.addEventListener('click', function () {
    showPop(uploadB, function (pop) {
      pop.classList.add('rb-pop-file');
      pop.appendChild(popRow({ matIcon: 'image', label: 'Image', hint: 'Photo from your device', onClick: function () { upFile.click(); } }));
      pop.appendChild(popRow({ matIcon: 'slideshow', label: 'PowerPoint (.pptx)', hint: 'Import a deck', onClick: function () { run('importPptx'); } }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'auto_fix_high', label: 'Dissolve PDF / Image', hint: 'Turn a flat file into an editable design', onClick: function () { run('dissolve'); } }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'cloud_upload', label: 'Publish as template', hint: 'Admin only', onClick: function () { run('publishTemplate'); } }));
    });
  });
  topbar.appendChild(uploadB);

  /* ── blue Download button — real PPTX / PDF / PNG export ── */
  var dlB = el('button', 'rb-action rb-dl'); dlB.type = 'button'; dlB.title = 'Download';
  dlB.appendChild(mat('download', 'rb-act-ico'));
  dlB.appendChild(document.createTextNode('Download'));
  dlB.addEventListener('click', function () {
    showPop(dlB, function (pop) {
      pop.appendChild(popRow({ matIcon: 'slideshow', label: 'PowerPoint', hint: '.pptx', onClick: function () { run('exportPptx'); } }));
      pop.appendChild(popRow({ matIcon: 'picture_as_pdf', label: 'PDF document', hint: '.pdf', onClick: function () { run('exportPdf'); } }));
      pop.appendChild(popRow({ matIcon: 'image', label: 'Image — current slide', hint: '.png', onClick: function () { run('exportPng'); } }));
      pop.appendChild(popRow({ matIcon: 'photo', label: 'Image — current slide', hint: '.jpg', onClick: function () { run('exportJpg'); } }));
      pop.appendChild(popRow({ matIcon: 'collections', label: 'Images — all slides', hint: '.zip of .png', onClick: function () { run('exportPngAll'); } }));
      pop.appendChild(popRow({ matIcon: 'polyline', label: 'Vector — current slide', hint: '.svg', onClick: function () { run('exportSvg'); } }));
      pop.appendChild(popRow({ matIcon: 'movie', label: 'Video — all slides', hint: '.webm', onClick: function () { run('exportVideo'); } }));
    });
  });
  topbar.appendChild(dlB);
  /* ── Plans / Upgrade — same place Canva puts it, opens the in-editor plans card ── */
  var planB = el('button', 'rb-action rb-plans'); planB.type = 'button'; planB.title = 'Subscription plans and top-ups';
  planB.appendChild(mat('workspace_premium', 'rb-act-ico'));
  planB.appendChild(document.createTextNode('Upgrade'));
  planB.addEventListener('click', function () { run('showPlans'); });
  topbar.appendChild(planB);
  /* ── Share — real links (view / edit-a-copy), personalised slug ── */
  var shB = el('button', 'rb-action rb-share'); shB.type = 'button'; shB.title = 'Share a link to this design';
  shB.appendChild(mat('ios_share', 'rb-act-ico'));
  shB.appendChild(document.createTextNode('Share'));
  shB.addEventListener('click', function () { run('share'); });
  topbar.appendChild(shB);

  /* ── LIVE account avatar — real sign-in/out (shared with the main site) ── */
  var avatarB = el('button', 'rb-avatar'); avatarB.type = 'button'; avatarB.title = 'Account';
  function paintUser() {
    var u = ask('user');
    avatarB.innerHTML = '';
    if (u && u.photo) {
      var im = el('img'); im.src = u.photo; im.alt = '';
      im.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover';
      avatarB.appendChild(im);
    } else {
      avatarB.textContent = u ? String(u.name || u.email || 'U').trim().slice(0, 2).toUpperCase() : 'LD';
    }
    avatarB.title = u ? (u.email || 'Account') : 'Sign in';
    avatarB.classList.toggle('is-signed', !!u);
  }
  avatarB.addEventListener('click', function () {
    showPop(avatarB, function (pop) {
      var u = ask('user');
      if (u) {
        var who = el('div', 'rb-pop-row');
        who.style.cursor = 'default';
        who.appendChild(mat('account_circle', 'rb-svg-sm-mat'));
        var lw = el('span', 'rb-pop-lab', u.name || u.email || 'Signed in');
        if (u.name && u.email) lw.appendChild(el('span', 'rb-pop-hint', u.email));
        who.appendChild(lw);
        pop.appendChild(who);
        pop.appendChild(el('div', 'rb-pop-div'));
        pop.appendChild(popRow({ matIcon: 'logout', label: 'Sign out', onClick: function () { run('signOut'); } }));
      } else {
        pop.appendChild(popRow({ matIcon: 'login', label: 'Sign in', hint: 'Google — same account as LazyDog Studio', onClick: function () { run('signIn'); } }));
      }
    });
  });
  listen('user', function () { paintUser(); });
  paintUser();
  topbar.appendChild(avatarB);

  /* ── tab strip (Help now lives in the topbar ? menu) ── */
  var tabBtns = {};
  TABS.forEach(function (t) {
    if (t.id === 'help') return;
    var b = el('button', 'rb-tab' + (t.id === active ? ' is-active' : '') + (t.ctx ? ' rb-tab-ctx' : ''), t.name);
    b.type = 'button';
    if (t.ctx) b.style.display = 'none';
    b.addEventListener('click', function () {
      closePop();
      active = t.id;
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('is-active', k === active); });
      paintBody();
    });
    tabBtns[t.id] = b;
    tabstrip.insertBefore(b, flexNode);
  });

  /* cloud activity → toast (the Saved chip was removed from the bar) */
  if (window.Editor) Editor.on('busy', function (p) {
    if (p.on) upNote(p.kind === 'download' ? 'Preparing…' : 'Importing…');
  });

  function paintBody() {
    reg.textOnly = []; reg.press = {}; reg.named = {};
    bodyHost.innerHTML = '';
    var t = TABS.filter(function (x) { return x.id === active; })[0];
    bodyHost.appendChild(t.build());
    sync();
  }

  /* ── live state ──────────────────────────────────────────────────── */
  function setPress(key, on) {
    (reg.press[key] || []).forEach(function (n) { n.classList.toggle('is-pressed', !!on); });
  }
  function sync() {
    var sel = ask('selection');
    var isText = !!(sel && sel.kind === 'text');
    /* contextual Format tab — appears when an object is selected (PPT-style) */
    if (tabBtns.format) {
      var show = !!sel;
      tabBtns.format.style.display = show ? '' : 'none';
      if (!show && active === 'format') {
        active = 'home';
        Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('is-active', k === active); });
        reg.textOnly = []; reg.press = {}; reg.named = {};
        bodyHost.innerHTML = '';
        bodyHost.appendChild(TABS.filter(function (x) { return x.id === 'home'; })[0].build());
      }
    }
    reg.textOnly.forEach(function (n) { n.classList.toggle('is-dim', !isText); });
    var ts = isText ? (ask('textState') || {}) : {};
    setPress('bold', ts.bold); setPress('italic', ts.italic);
    setPress('underline', ts.underline); setPress('strike', ts.strike);
    setPress('bullets', ts.list === 'bullet'); setPress('numbering', ts.list === 'number');
    ['left', 'center', 'right', 'justify'].forEach(function (a) { setPress('align-' + a, ts.align === a); });
    if (reg.named.fontCombo) reg.named.fontCombo.querySelector('.rb-combo-val').textContent = ts.fontFamily || 'DM Sans';
    if (reg.named.sizeCombo) reg.named.sizeCombo.querySelector('.rb-combo-val').textContent = ts.sizePt ? Math.round(ts.sizePt) : '18';
    var h = ask('history') || {};
    undoB.classList.toggle('is-dim', !h.canUndo);
    redoB.classList.toggle('is-dim', !h.canRedo);
    var v = ask('view') || {};
    setPress('view-ruler', v.ruler); setPress('view-grid', v.grid); setPress('view-guides', v.guides);
    var tr = ask('transition') || {};
    ['none','fade','slide','wipe','split','reveal','zoom'].forEach(function (k) { setPress('trans-' + k, (tr.type || 'none') === k); });
    var dm = ask('drawMode');
    setPress('draw-select', !dm); setPress('draw-pen', dm === 'pen'); setPress('draw-high', dm === 'high'); setPress('draw-erase', dm === 'erase');
    var ps = ask('pageSize') || {};
    setPress('size-169', ps.ratio === '16:9'); setPress('size-43', ps.ratio === '4:3');
  }
  listen('selection', sync);
  listen('history', sync);
  listen('ready', sync);

  /* ── mount ───────────────────────────────────────────────────────── */
  slot.appendChild(rb);
  paintBody();
})();
