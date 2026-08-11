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
    var fontCombo = wire(el('button', 'rb-combo rb-combo-font'), { id: 'fontCombo', tip: 'Font', textOnly: true, pop: fontPopover });
    fontCombo.appendChild(el('span', 'rb-combo-val', 'DM Sans'));
    fontCombo.appendChild(mat('arrow_drop_down', 'rb-caret-s'));
    var sizeCombo = wire(el('button', 'rb-combo rb-combo-size'), { id: 'sizeCombo', tip: 'Font size', textOnly: true, pop: sizePopover });
    sizeCombo.appendChild(el('span', 'rb-combo-val', '18'));
    sizeCombo.appendChild(mat('arrow_drop_down', 'rb-caret-s'));

    var body = el('div', 'rb-body-inner');
    body.appendChild(group('Clipboard',
      big({ ic: 'paste', label: 'Paste', cmd: 'paste' }),
      col(
        small({ ic: 'cut', label: 'Cut', cmd: 'cut' }),
        small({ ic: 'copy', label: 'Copy', cmd: 'copy' }),
        small({ ic: 'painter', label: 'Format painter', cmd: 'formatPainter' })
      )
    ));
    body.appendChild(sepd());
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
      col(
        small({ ic: 'dup-slide', label: 'Duplicate slide', cmd: 'duplicateSlide' }),
        small({ ic: 'delete', label: 'Delete slide', cmd: 'deleteSlide' })
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Font',
      col(
        row(fontCombo, sizeCombo,
          small({ matIcon: 'text_increase', tip: 'Grow font', cmd: 'fontStep', arg: 1, textOnly: true }),
          small({ matIcon: 'text_decrease', tip: 'Shrink font', cmd: 'fontStep', arg: -1, textOnly: true }),
          small({ matIcon: 'format_clear', tip: 'Clear formatting', cmd: 'clearFormat', textOnly: true })
        ),
        row(
          small({ matIcon: 'format_bold', tip: 'Bold', cmd: 'bold', press: 'bold', textOnly: true }),
          small({ matIcon: 'format_italic', tip: 'Italic', cmd: 'italic', press: 'italic', textOnly: true }),
          small({ matIcon: 'format_underlined', tip: 'Underline', cmd: 'underline', press: 'underline', textOnly: true }),
          small({ matIcon: 'strikethrough_s', tip: 'Strikethrough', cmd: 'strike', press: 'strike', textOnly: true }),
          small({ ic: 'text-colour', tip: 'Font colour', textOnly: true, pop: swatchPopover('textColour', TEXT_COLOURS) }),
          small({ ic: 'highlight', tip: 'Text highlight', textOnly: true, pop: swatchPopover('highlight', HIGHLIGHTS, function () {
            return popRow({ matIcon: 'format_color_reset', label: 'No highlight', onClick: function () { run('highlight', null); } });
          }) })
        )
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Paragraph',
      col(
        row(
          small({ ic: 'bullets', tip: 'Bullets', cmd: 'bullets', press: 'bullets', textOnly: true }),
          small({ ic: 'numbering', tip: 'Numbering', cmd: 'numbering', press: 'numbering', textOnly: true }),
          small({ matIcon: 'format_line_spacing', tip: 'Line spacing', textOnly: true, pop: function (pop) {
            [1.0, 1.15, 1.5, 2.0].forEach(function (v) {
              pop.appendChild(popRow({ matIcon: 'format_line_spacing', label: v.toFixed(2), cmd: 'lineSpacing', arg: v }));
            });
          } })
        ),
        row(
          small({ matIcon: 'format_align_left', tip: 'Align left', cmd: 'align', arg: 'left', press: 'align-left', textOnly: true }),
          small({ matIcon: 'format_align_center', tip: 'Centre', cmd: 'align', arg: 'center', press: 'align-center', textOnly: true }),
          small({ matIcon: 'format_align_right', tip: 'Align right', cmd: 'align', arg: 'right', press: 'align-right', textOnly: true }),
          small({ matIcon: 'format_align_justify', tip: 'Justify', cmd: 'align', arg: 'justify', press: 'align-justify', textOnly: true })
        )
      )
    ));
    body.appendChild(sepd());
    body.appendChild(group('Drawing',
      big({ ic: 'shapes', label: 'Shapes', pop: function (pop) {
        pop.appendChild(popGrid([
          { matIcon: 'crop_square', label: 'Rectangle', cmd: 'insertShape', arg: 'rect' },
          { matIcon: 'rounded_corner', label: 'Rounded', cmd: 'insertShape', arg: 'rounded' },
          { matIcon: 'circle', label: 'Ellipse', cmd: 'insertShape', arg: 'circle' },
          { matIcon: 'change_history', label: 'Triangle', cmd: 'insertShape', arg: 'triangle' },
          { matIcon: 'square', label: 'Diamond', cmd: 'insertShape', arg: 'diamond' },
          { matIcon: 'hexagon', label: 'Hexagon', cmd: 'insertShape', arg: 'hexagon' },
          { matIcon: 'east', label: 'Arrow', cmd: 'insertShape', arg: 'arrow' },
          { matIcon: 'star_outline', label: 'Star', cmd: 'insertShape', arg: 'star' },
          { matIcon: 'horizontal_rule', label: 'Line', cmd: 'insertLine' }
        ], 3));
      } }),
      big({ ic: 'arrange', label: 'Arrange', pop: function (pop) {
        pop.appendChild(popRow({ matIcon: 'flip_to_front', label: 'Bring to front', cmd: 'front' }));
        pop.appendChild(popRow({ matIcon: 'flip_to_back', label: 'Send to back', cmd: 'back' }));
        pop.appendChild(popRow({ matIcon: 'arrow_upward', label: 'Bring forward', cmd: 'forward' }));
        pop.appendChild(popRow({ matIcon: 'arrow_downward', label: 'Send backward', cmd: 'backward' }));
        pop.appendChild(el('div', 'rb-pop-div'));
        pop.appendChild(popRow({ matIcon: 'join_full', label: 'Group', cmd: 'group' }));
        pop.appendChild(popRow({ matIcon: 'join_inner', label: 'Ungroup', cmd: 'ungroup' }));
        pop.appendChild(el('div', 'rb-pop-div'));
        pop.appendChild(popRow({ matIcon: 'rotate_right', label: 'Rotate 90°', cmd: 'rotate', arg: 90 }));
        pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip horizontal', cmd: 'flipH' }));
        pop.appendChild(popRow({ matIcon: 'flip', label: 'Flip vertical', cmd: 'flipV' }));
      } })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Editing',
      col(
        small({ ic: 'find', label: 'Find', cmd: 'find' }),
        small({ matIcon: 'select_all', label: 'Select all', cmd: 'selectAll' }),
        small({ matIcon: 'lock_open', label: 'Unlock all', cmd: 'unlockAll' })
      )
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
    body.appendChild(group('Illustrations',
      big({ ic: 'shapes', label: 'Shapes', pop: function (pop) {
        pop.appendChild(popGrid([
          { matIcon: 'crop_square', label: 'Rectangle', cmd: 'insertShape', arg: 'rect' },
          { matIcon: 'circle', label: 'Ellipse', cmd: 'insertShape', arg: 'circle' },
          { matIcon: 'change_history', label: 'Triangle', cmd: 'insertShape', arg: 'triangle' },
          { matIcon: 'hexagon', label: 'Hexagon', cmd: 'insertShape', arg: 'hexagon' },
          { matIcon: 'east', label: 'Arrow', cmd: 'insertShape', arg: 'arrow' },
          { matIcon: 'star_outline', label: 'Star', cmd: 'insertShape', arg: 'star' }
        ], 3));
      } }),
      big({ ic: 'chart', label: 'Chart', pop: function (pop) {
        pop.appendChild(popGrid([
          { matIcon: 'bar_chart', label: 'Column', cmd: 'insertChart', arg: 'column' },
          { matIcon: 'stacked_bar_chart', label: 'Stacked', cmd: 'insertChart', arg: 'column-stack' },
          { matIcon: 'notes', label: 'Bar', cmd: 'insertChart', arg: 'bar' },
          { matIcon: 'show_chart', label: 'Line', cmd: 'insertChart', arg: 'line' },
          { matIcon: 'multiline_chart', label: 'Smooth line', cmd: 'insertChart', arg: 'line-smooth' },
          { matIcon: 'area_chart', label: 'Area', cmd: 'insertChart', arg: 'area' },
          { matIcon: 'pie_chart_outline', label: 'Pie', cmd: 'insertChart', arg: 'pie' },
          { matIcon: 'donut_large', label: 'Donut', cmd: 'insertChart', arg: 'donut' },
          { matIcon: 'data_usage', label: 'Progress', cmd: 'insertChart', arg: 'progress' },
          { matIcon: 'filter_alt', label: 'Funnel', cmd: 'insertChart', arg: 'funnel' },
          { matIcon: 'radar', label: 'Radar', cmd: 'insertChart', arg: 'radar' },
          { matIcon: 'speed', label: 'Gauge', cmd: 'insertChart', arg: 'gauge' },
          { matIcon: 'scatter_plot', label: 'Scatter', cmd: 'insertChart', arg: 'scatter' },
          { matIcon: 'bubble_chart', label: 'Bubble', cmd: 'insertChart', arg: 'bubble' },
          { matIcon: 'waterfall_chart', label: 'Waterfall', cmd: 'insertChart', arg: 'waterfall' },
          { matIcon: 'donut_small', label: 'Half donut', cmd: 'insertChart', arg: 'half-donut' }
        ], 4));
      } })
    ));
    body.appendChild(sepd());
    body.appendChild(group('Text',
      big({ ic: 'textbox', label: 'Text\nBox', pop: function (pop) {
        pop.appendChild(popRow({ matIcon: 'title', label: 'Heading', hint: 'Big title text', cmd: 'insertText', arg: 'heading' }));
        pop.appendChild(popRow({ matIcon: 'text_fields', label: 'Subheading', hint: 'Section label', cmd: 'insertText', arg: 'subheading' }));
        pop.appendChild(popRow({ matIcon: 'notes', label: 'Body text', hint: 'Paragraph copy', cmd: 'insertText', arg: 'body' }));
      } }),
      big({ ic: 'wordart', label: 'WordArt', cmd: 'insertWordArt' })
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
      big({ ic: 'page-size', label: 'Slide\nSize', pop: function (pop) {
        pop.appendChild(popRow({ matIcon: 'crop_16_9', label: '16:9 Widescreen', cmd: 'pageSize', arg: '16:9' }));
        pop.appendChild(popRow({ matIcon: 'crop_5_4', label: '4:3 Standard', cmd: 'pageSize', arg: '4:3' }));
        pop.appendChild(popRow({ matIcon: 'description', label: 'A4 Landscape', cmd: 'pageSize', arg: 'a4' }));
        pop.appendChild(popRow({ matIcon: 'crop_square', label: 'Square 1:1', cmd: 'pageSize', arg: '1:1' }));
        pop.appendChild(popRow({ matIcon: 'crop_16_9', label: '16:10', cmd: 'pageSize', arg: '16:10' }));
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

  /* ── tab strip + shell ───────────────────────────────────────────── */
  var TABS = [
    { id: 'home', name: 'Home', build: tabHome },
    { id: 'insert', name: 'Insert', build: tabInsert },
    { id: 'draw', name: 'Draw', build: tabDraw },
    { id: 'design', name: 'Design', build: tabDesign },
    { id: 'transitions', name: 'Transitions', build: tabTransitions },
    { id: 'animations', name: 'Animations', build: tabAnimations },
    { id: 'slideshow', name: 'Slide Show', build: tabSlideShow },
    { id: 'review', name: 'Review', build: tabReview },
    { id: 'view', name: 'View', build: tabView },
    { id: 'help', name: 'Help', build: tabHelp }
  ];
  var active = 'home';
  var rb = el('div', 'rb');
  var topRow = el('div', 'rb-top');
  var bodyHost = el('div', 'rb-body');
  rb.appendChild(topRow); rb.appendChild(bodyHost);

  var tabBtns = {};
  TABS.forEach(function (t) {
    var b = el('button', 'rb-tab' + (t.id === active ? ' is-active' : ''), t.name);
    b.type = 'button';
    b.addEventListener('click', function () {
      closePop();
      active = t.id;
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('is-active', k === active); });
      paintBody();
    });
    tabBtns[t.id] = b;
    topRow.appendChild(b);
  });

  topRow.appendChild(el('div', 'rb-flex'));

  var undoB = el('button', 'rb-q'); undoB.type = 'button'; undoB.title = 'Undo (Ctrl+Z)';
  undoB.appendChild(svg('undo', 'rb-svg rb-svg-sm'));
  undoB.addEventListener('click', function () { run('undo'); setTimeout(sync, 0); });
  var redoB = el('button', 'rb-q'); redoB.type = 'button'; redoB.title = 'Redo (Ctrl+Y)';
  redoB.appendChild(svg('redo', 'rb-svg rb-svg-sm'));
  redoB.addEventListener('click', function () { run('redo'); setTimeout(sync, 0); });
  topRow.appendChild(undoB); topRow.appendChild(redoB);

  var newB = el('button', 'rb-q'); newB.type = 'button'; newB.title = 'New design';
  newB.appendChild(svg('new-file', 'rb-svg rb-svg-sm'));
  newB.addEventListener('click', function () { run('newDesign'); });
  var saveB = el('button', 'rb-q'); saveB.type = 'button'; saveB.title = 'Save project';
  saveB.appendChild(svg('save', 'rb-svg rb-svg-sm'));
  saveB.addEventListener('click', function () { run('saveProject'); });
  topRow.appendChild(newB); topRow.appendChild(saveB);

  /* hidden picker for the Image option — reuses the engine's existing
     insertImage command, so this stays pure UI (no engine wiring here) */
  var upFile = el('input'); upFile.type = 'file'; upFile.accept = 'image/*'; upFile.className = 'rb-file';
  upFile.addEventListener('change', function () {
    var f = upFile.files && upFile.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { run('insertImage', r.result); };
    r.readAsDataURL(f);
    upFile.value = '';
  });
  /* UI-only note for options still owned by the engine (Fable wires these) */
  function upNote(msg) {
    var host = document.getElementById('toast-host');
    if (!host) return;
    var t = el('div', 'toast', msg);
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  var uploadB = el('button', 'rb-action'); uploadB.type = 'button'; uploadB.title = 'Upload';
  uploadB.appendChild(mat('upload', 'rb-act-ico'));
  uploadB.appendChild(document.createTextNode('Upload'));
  uploadB.appendChild(mat('arrow_drop_down', 'rb-caret-s'));
  uploadB.addEventListener('click', function () {
    showPop(uploadB, function (pop) {
      pop.appendChild(popRow({ matIcon: 'image', label: 'Image', hint: 'Photo from your device', onClick: function () { upFile.click(); } }));
      pop.appendChild(popRow({ matIcon: 'slideshow', label: 'PowerPoint (.pptx)', hint: 'Import a deck', onClick: function () { run('importPptx'); } }));
      pop.appendChild(el('div', 'rb-pop-div'));
      pop.appendChild(popRow({ matIcon: 'burst_mode', label: 'Fill frames with images…', hint: 'Drop photos into frames', onClick: function () { run('fillFrames'); } }));
      pop.appendChild(popRow({ matIcon: 'auto_fix_high', label: 'Dissolve PDF / Image', hint: 'Turn a flat file into an editable design', onClick: function () { run('dissolve'); } }));
    });
  });
  var dlB = el('button', 'rb-action is-primary'); dlB.type = 'button';
  dlB.appendChild(mat('download', 'rb-act-ico'));
  dlB.appendChild(document.createTextNode('Download'));
  dlB.addEventListener('click', function () { run('exportPptx'); });
  topRow.appendChild(upFile); topRow.appendChild(uploadB); topRow.appendChild(dlB);

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
