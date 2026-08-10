/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — RIBBON (PowerPoint-style)             owner: Opus
   ═══════════════════════════════════════════════════════════════════════
   RULES (non-negotiable):
   1. This file renders into #ribbon-slot and NOWHERE else.
   2. It talks to the engine ONLY via:
        Editor.run(cmd, arg)   Editor.query(key)   Editor.on(event, fn)
      The full contract is in API.md. If something you need is missing
      from API.md, STOP and report — do not reach around the wall.
   3. FORBIDDEN here: fc, fabric, state, window._ld*, lazydog_renderer
      functions, direct #canvas access. Any such reference = rejected.
   4. Styling goes in css/editor.css under the "6. Ribbon styles" heading.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────
     0. Tiny DOM helpers
     ───────────────────────────────────────────────────────────────────── */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function icon(name) {
    var i = el('span', 'material-icons-outlined rb-i');
    i.textContent = name;
    return i;
  }
  function run(cmd, arg) {
    if (!window.Editor || typeof window.Editor.run !== 'function') return false;
    return window.Editor.run(cmd, arg);
  }
  function ask(key) {
    if (!window.Editor || typeof window.Editor.query !== 'function') return null;
    try { return window.Editor.query(key); } catch (e) { return null; }
  }
  function listen(ev, fn) {
    if (window.Editor && typeof window.Editor.on === 'function') window.Editor.on(ev, fn);
  }

  /* ─────────────────────────────────────────────────────────────────────
     1. Palettes / presets (pure UI data)
     ───────────────────────────────────────────────────────────────────── */
  var TEXT_SWATCHES = [
    '#1F2430', '#3B4252', '#5B6472', '#9AA3B2', '#CBD2DE', '#FFFFFF',
    '#7C3AED', '#4F46E5', '#2563EB', '#0EA5E9', '#0D9488', '#16A34A',
    '#CA8A04', '#EA580C', '#DC2626', '#DB2777', '#9333EA', '#78350F'
  ];
  var HIGHLIGHT_SWATCHES = [
    '#FEF08A', '#FDE68A', '#FBCFE8', '#DDD6FE', '#BFDBFE', '#BBF7D0',
    '#A7F3D0', '#FECACA', '#FED7AA', '#E9D5FF', '#E2E8F0', '#D9F99D'
  ];
  var BG_SWATCHES = [
    '#FFFFFF', '#F8F9FB', '#F1F3F7', '#E8ECF4', '#1F2430', '#0F172A',
    '#FDF6EC', '#FBEFEF', '#EEF6F1', '#EDF2FD', '#F3EEFC', '#FAF5E9'
  ];
  var SIZE_LADDER = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 54, 66, 80, 96];
  var LINE_SPACING = [1.0, 1.15, 1.5, 2.0];

  var SHAPE_KINDS = [
    { k: 'rect', label: 'Rectangle', ic: 'crop_square' },
    { k: 'rounded', label: 'Rounded', ic: 'rounded_corner' },
    { k: 'circle', label: 'Ellipse', ic: 'circle' },
    { k: 'triangle', label: 'Triangle', ic: 'change_history' },
    { k: 'diamond', label: 'Diamond', ic: 'diamond' },
    { k: 'hexagon', label: 'Hexagon', ic: 'hexagon' },
    { k: 'arrow', label: 'Arrow', ic: 'arrow_right_alt' },
    { k: 'star', label: 'Star', ic: 'star_outline' },
    { k: 'line', label: 'Line', ic: 'horizontal_rule' }
  ];
  var FRAME_KINDS = [
    { k: 'square', label: 'Square', ic: 'crop_square' },
    { k: 'circle', label: 'Circle', ic: 'circle' },
    { k: 'rounded', label: 'Rounded', ic: 'rounded_corner' },
    { k: 'arch', label: 'Arch', ic: 'door_front' },
    { k: 'heart', label: 'Heart', ic: 'favorite_border' }
  ];
  var CHART_KINDS = [
    { k: 'bar', label: 'Bar chart', ic: 'bar_chart' },
    { k: 'line', label: 'Line chart', ic: 'show_chart' },
    { k: 'pie', label: 'Pie chart', ic: 'pie_chart_outline' },
    { k: 'donut', label: 'Donut chart', ic: 'donut_large' }
  ];
  var TEXT_KINDS = [
    { k: 'heading', label: 'Heading', hint: 'Big title text', cls: 'rb-tk-h' },
    { k: 'subheading', label: 'Subheading', hint: 'Section label', cls: 'rb-tk-s' },
    { k: 'body', label: 'Body text', hint: 'Paragraph copy', cls: 'rb-tk-b' }
  ];

  /* ─────────────────────────────────────────────────────────────────────
     2. Popover engine (one open at a time, outside-click + Esc close)
     ───────────────────────────────────────────────────────────────────── */
  var layer = null;      /* the popover layer inside #ribbon-slot */
  var openPop = null;    /* { node, anchor } */

  function closePop() {
    if (!openPop) return;
    if (openPop.anchor) openPop.anchor.classList.remove('is-open');
    openPop.node.remove();
    openPop = null;
  }

  function showPop(anchor, builder) {
    var wasSame = openPop && openPop.anchor === anchor;
    closePop();
    if (wasSame) return;

    var pop = el('div', 'rb-pop');
    pop.setAttribute('role', 'dialog');
    builder(pop, function () { closePop(); });
    layer.appendChild(pop);

    var ar = anchor.getBoundingClientRect();
    var lr = layer.getBoundingClientRect();
    var sr = slot.getBoundingClientRect();
    var left = ar.left - lr.left;
    var maxLeft = layer.clientWidth - pop.offsetWidth - 10;
    if (left > maxLeft) left = maxLeft;
    if (left < 10) left = 10;
    /* drop below the whole ribbon so a popover never covers the ribbon */
    var top = Math.max(ar.bottom, sr.bottom) - lr.top + 6;
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';

    anchor.classList.add('is-open');
    openPop = { node: pop, anchor: anchor };

    var focusable = pop.querySelector('input[type="text"], input[type="number"]');
    if (focusable) setTimeout(function () { focusable.focus(); }, 0);
  }

  document.addEventListener('mousedown', function (e) {
    if (!openPop) return;
    if (openPop.node.contains(e.target) || openPop.anchor.contains(e.target)) return;
    closePop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openPop) { closePop(); }
  });
  window.addEventListener('resize', closePop);

  /* ─────────────────────────────────────────────────────────────────────
     3. Button factories
     ───────────────────────────────────────────────────────────────────── */
  var registry = {
    textOnly: [],   /* dimmed when the selection is not text */
    press: {},      /* key → [nodes] for pressed-state sync    */
    named: {}       /* id  → node                              */
  };

  function markTextOnly(btn) { registry.textOnly.push(btn); }
  function markPress(key, btn) { (registry.press[key] = registry.press[key] || []).push(btn); }

  function baseButton(spec, cls) {
    var b = el('button', cls);
    b.type = 'button';
    if (spec.title || spec.label) b.title = spec.title || spec.label;
    if (spec.todo) b.setAttribute('data-todo', spec.todo);
    if (spec.textOnly) markTextOnly(b);
    if (spec.press) markPress(spec.press, b);
    if (spec.id) registry.named[spec.id] = b;

    b.addEventListener('click', function () {
      if (spec.pop) { showPop(b, spec.pop); return; }
      closePop();
      if (spec.onClick) { spec.onClick(b); return; }
      if (spec.cmd) run(spec.cmd, spec.arg);
      setTimeout(syncAll, 0);   /* re-read engine truth after every command */
    });
    return b;
  }

  /* stacked large button — PowerPoint "Paste" style */
  function bigButton(spec) {
    var b = baseButton(spec, 'rb-btn rb-big' + (spec.primary ? ' is-primary' : ''));
    b.appendChild(icon(spec.ic));
    var l = el('span', 'rb-big-label');
    l.textContent = spec.label;
    b.appendChild(l);
    if (spec.pop) b.appendChild(icon('arrow_drop_down')).classList.add('rb-caret');
    return b;
  }

  /* icon-only compact button */
  function iconButton(spec) {
    var b = baseButton(spec, 'rb-btn rb-ico');
    b.appendChild(icon(spec.ic));
    b.setAttribute('aria-label', spec.title || spec.label || spec.cmd || '');
    if (spec.pop) b.appendChild(icon('arrow_drop_down')).classList.add('rb-caret');
    return b;
  }

  /* icon + text row button */
  function rowButton(spec) {
    var b = baseButton(spec, 'rb-btn rb-row-btn' + (spec.wide ? ' is-wide' : ''));
    if (spec.ic) b.appendChild(icon(spec.ic));
    b.appendChild(el('span', 'rb-row-label', spec.label));
    if (spec.pop) b.appendChild(icon('arrow_drop_down')).classList.add('rb-caret');
    return b;
  }

  /* combo control: value text + caret (font family / size) */
  function comboButton(spec) {
    var b = baseButton(spec, 'rb-btn rb-combo');
    var v = el('span', 'rb-combo-val', spec.value || '');
    if (spec.valueId) registry.named[spec.valueId] = v;
    b.appendChild(v);
    b.appendChild(icon('arrow_drop_down')).classList.add('rb-caret');
    b.style.width = (spec.width || 132) + 'px';
    return b;
  }

  function sep() { return el('div', 'rb-mini-sep'); }

  /* static read-only chip (zoom percentage) */
  function readout(spec) {
    var n = el('div', 'rb-readout');
    if (spec.ic) n.appendChild(icon(spec.ic));
    var v = el('span', 'rb-row-label', spec.label || '');
    n.appendChild(v);
    if (spec.id) registry.named[spec.id] = n;
    return n;
  }

  function build(item) {
    switch (item.k) {
      case 'big': return bigButton(item);
      case 'ico': return iconButton(item);
      case 'row': return rowButton(item);
      case 'combo': return comboButton(item);
      case 'readout': return readout(item);
      case 'sep': return sep();
      default: return el('div');
    }
  }

  /* group = optional lead (big buttons) + up to two rows + thin label */
  function group(label, def) {
    var g = el('section', 'rb-group');
    var body = el('div', 'rb-g-body');
    (def.lead || []).forEach(function (it) { body.appendChild(build(it)); });
    if (def.rows && def.rows.length) {
      var stack = el('div', 'rb-rows');
      def.rows.forEach(function (row) {
        var r = el('div', 'rb-row');
        row.forEach(function (it) { r.appendChild(build(it)); });
        stack.appendChild(r);
      });
      body.appendChild(stack);
    }
    g.appendChild(body);
    g.appendChild(el('div', 'rb-g-label', label));
    return g;
  }

  /* ─────────────────────────────────────────────────────────────────────
     4. Popover builders
     ───────────────────────────────────────────────────────────────────── */
  function popHeader(pop, text) { pop.appendChild(el('div', 'rb-pop-title', text)); }

  function fontPopover(pop, done) {
    pop.classList.add('rb-pop-font');
    popHeader(pop, 'Font');
    var search = el('input', 'rb-pop-search');
    search.type = 'text';
    search.placeholder = 'Search fonts';
    search.setAttribute('aria-label', 'Search fonts');
    pop.appendChild(search);

    var list = el('div', 'rb-pop-list');
    pop.appendChild(list);

    var fonts = ask('fonts') || [];
    var ts = ask('textState');
    var current = ts && ts.fontFamily ? ts.fontFamily : '';

    function paint(filter) {
      list.textContent = '';
      var q = (filter || '').toLowerCase();
      var shown = 0;
      fonts.forEach(function (name) {
        if (q && name.toLowerCase().indexOf(q) === -1) return;
        shown++;
        var row = el('button', 'rb-pop-row');
        row.type = 'button';
        var tick = icon('check');
        tick.classList.add('rb-tick');
        if (name !== current) tick.classList.add('is-hidden');
        row.appendChild(tick);
        var nm = el('span', 'rb-font-name', name);
        nm.style.fontFamily = '"' + name + '", var(--font-ui)';
        row.appendChild(nm);
        row.addEventListener('click', function () {
          run('fontFamily', name);
          var slot = registry.named.fontValue;
          if (slot) slot.textContent = name;
          done();
        });
        list.appendChild(row);
      });
      if (!shown) list.appendChild(el('div', 'rb-pop-empty', 'No matching fonts'));
    }
    paint('');
    search.addEventListener('input', function () { paint(search.value); });
  }

  function sizePopover(pop, done) {
    pop.classList.add('rb-pop-size');
    popHeader(pop, 'Font size');
    var ts = ask('textState');
    var current = ts && ts.sizePt ? Number(ts.sizePt) : null;

    var grid = el('div', 'rb-size-grid');
    SIZE_LADDER.forEach(function (n) {
      var b = el('button', 'rb-size-cell' + (current === n ? ' is-active' : ''), String(n));
      b.type = 'button';
      b.addEventListener('click', function () {
        run('fontSize', n);
        var slot = registry.named.sizeValue;
        if (slot) slot.textContent = String(n);
        done();
      });
      grid.appendChild(b);
    });
    pop.appendChild(grid);

    var custom = el('div', 'rb-pop-custom');
    custom.appendChild(el('span', 'rb-pop-custom-label', 'Custom'));
    var num = el('input', 'rb-num');
    num.type = 'number';
    num.min = '4';
    num.max = '400';
    num.step = '1';
    num.value = current ? String(current) : '';
    num.setAttribute('aria-label', 'Custom font size');
    custom.appendChild(num);
    var apply = el('button', 'rb-pop-apply', 'Apply');
    apply.type = 'button';
    apply.addEventListener('click', function () {
      var v = parseFloat(num.value);
      if (!isNaN(v) && v > 0) {
        run('fontSize', v);
        var slot = registry.named.sizeValue;
        if (slot) slot.textContent = String(v);
      }
      done();
    });
    num.addEventListener('keydown', function (e) { if (e.key === 'Enter') apply.click(); });
    custom.appendChild(apply);
    pop.appendChild(custom);
  }

  function swatchGrid(colours, onPick) {
    var grid = el('div', 'rb-swatches');
    colours.forEach(function (hex) {
      var s = el('button', 'rb-swatch');
      s.type = 'button';
      s.title = hex.toUpperCase();
      s.style.background = hex;
      s.addEventListener('click', function () { onPick(hex); });
      grid.appendChild(s);
    });
    return grid;
  }

  function customRow(labelText, initial, onPick) {
    var wrap = el('div', 'rb-pop-custom');
    var inp = el('input', 'rb-colour-input');
    inp.type = 'color';
    inp.value = initial || '#7C3AED';
    inp.setAttribute('aria-label', labelText);
    wrap.appendChild(inp);
    wrap.appendChild(el('span', 'rb-pop-custom-label', labelText));
    inp.addEventListener('input', function () { onPick(inp.value, true); });
    inp.addEventListener('change', function () { onPick(inp.value, false); });
    return wrap;
  }

  function colourPopover(title, colours, cmd) {
    return function (pop, done) {
      pop.classList.add('rb-pop-colour');
      popHeader(pop, title);
      pop.appendChild(swatchGrid(colours, function (hex) { run(cmd, hex); done(); }));
      pop.appendChild(customRow('Custom colour', '#7C3AED', function (hex, live) {
        run(cmd, hex);
        if (!live) done();
      }));
    };
  }

  function highlightPopover(pop, done) {
    pop.classList.add('rb-pop-colour');
    popHeader(pop, 'Highlight');
    pop.appendChild(swatchGrid(HIGHLIGHT_SWATCHES, function (hex) { run('highlight', hex); done(); }));
    var none = el('button', 'rb-pop-row rb-pop-none');
    none.type = 'button';
    none.appendChild(icon('format_color_reset'));
    none.appendChild(el('span', 'rb-row-label', 'No highlight'));
    none.addEventListener('click', function () { run('highlight', null); done(); });
    pop.appendChild(none);
    pop.appendChild(customRow('Custom colour', '#FEF08A', function (hex, live) {
      run('highlight', hex);
      if (!live) done();
    }));
  }

  function backgroundPopover(pop, done) {
    pop.classList.add('rb-pop-colour');
    popHeader(pop, 'Slide background');
    pop.appendChild(swatchGrid(BG_SWATCHES, function (hex) { run('background', hex); done(); }));
    pop.appendChild(customRow('Custom colour', '#FFFFFF', function (hex, live) {
      run('background', hex);
      if (!live) done();
    }));
  }

  function lineSpacingPopover(pop, done) {
    popHeader(pop, 'Line spacing');
    LINE_SPACING.forEach(function (n) {
      var row = el('button', 'rb-pop-row');
      row.type = 'button';
      row.appendChild(icon('format_line_spacing'));
      row.appendChild(el('span', 'rb-row-label', n.toFixed(2).replace(/0$/, '').replace(/\.$/, '.0')));
      row.addEventListener('click', function () { run('lineSpacing', n); done(); });
      pop.appendChild(row);
    });
  }

  function textKindPopover(pop, done) {
    popHeader(pop, 'Add text');
    TEXT_KINDS.forEach(function (t) {
      var row = el('button', 'rb-pop-row rb-pop-row-tall');
      row.type = 'button';
      var box = el('div', 'rb-tk');
      box.appendChild(el('span', 'rb-tk-name ' + t.cls, t.label));
      box.appendChild(el('span', 'rb-tk-hint', t.hint));
      row.appendChild(box);
      row.addEventListener('click', function () { run('insertText', t.k); done(); });
      pop.appendChild(row);
    });
  }

  function tilePopover(title, kinds, cmd, lineCmd) {
    return function (pop, done) {
      pop.classList.add('rb-pop-tiles');
      popHeader(pop, title);
      var grid = el('div', 'rb-tiles');
      kinds.forEach(function (s) {
        var t = el('button', 'rb-tile');
        t.type = 'button';
        t.title = s.label;
        t.appendChild(icon(s.ic));
        t.appendChild(el('span', 'rb-tile-label', s.label));
        t.addEventListener('click', function () {
          if (lineCmd && s.k === 'line') run('insertLine');
          else run(cmd, s.k);
          done();
        });
        grid.appendChild(t);
      });
      pop.appendChild(grid);
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
     5. Image picker (hidden input, lives inside #ribbon-slot)
     ───────────────────────────────────────────────────────────────────── */
  var fileInput = null;
  function pickImage() {
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
  }
  function wireFileInput() {
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { run('insertImage', reader.result); };
      reader.readAsDataURL(f);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     6. Tab definitions
     ───────────────────────────────────────────────────────────────────── */
  var TABS = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'design', label: 'Design' },
    { id: 'arrange', label: 'Arrange' },
    { id: 'view', label: 'View' },
    { id: 'present', label: 'Present' }
  ];

  function homeTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Clipboard', {
      lead: [{ k: 'big', ic: 'content_paste', label: 'Paste', cmd: 'paste', primary: true }],
      rows: [
        [{ k: 'row', ic: 'content_cut', label: 'Cut', cmd: 'cut' },
         { k: 'row', ic: 'content_copy', label: 'Copy', cmd: 'copy' }],
        [{ k: 'row', ic: 'copy_all', label: 'Duplicate', cmd: 'duplicate' },
         { k: 'row', ic: 'delete_outline', label: 'Delete', cmd: 'delete' }]
      ]
    }));

    f.appendChild(group('Font', {
      rows: [
        [{ k: 'combo', value: 'DM Sans', valueId: 'fontValue', width: 148, title: 'Font family',
           textOnly: true, pop: fontPopover },
         { k: 'combo', value: '18', valueId: 'sizeValue', width: 68, title: 'Font size',
           textOnly: true, pop: sizePopover },
         { k: 'ico', ic: 'text_increase', title: 'Grow font', cmd: 'fontStep', arg: 1, textOnly: true },
         { k: 'ico', ic: 'text_decrease', title: 'Shrink font', cmd: 'fontStep', arg: -1, textOnly: true },
         { k: 'ico', ic: 'format_clear', title: 'Clear formatting', cmd: 'clearFormat', textOnly: true }],
        [{ k: 'ico', ic: 'format_bold', title: 'Bold', cmd: 'bold', press: 'bold', textOnly: true },
         { k: 'ico', ic: 'format_italic', title: 'Italic', cmd: 'italic', press: 'italic', textOnly: true },
         { k: 'ico', ic: 'format_underlined', title: 'Underline', cmd: 'underline', press: 'underline', textOnly: true },
         { k: 'ico', ic: 'format_strikethrough', title: 'Strikethrough', cmd: 'strike', press: 'strike', textOnly: true },
         { k: 'sep' },
         { k: 'ico', ic: 'format_color_text', title: 'Text colour', textOnly: true,
           pop: colourPopover('Text colour', TEXT_SWATCHES, 'textColour') },
         { k: 'ico', ic: 'format_color_fill', title: 'Highlight', textOnly: true, pop: highlightPopover }]
      ]
    }));

    f.appendChild(group('Paragraph', {
      rows: [
        [{ k: 'ico', ic: 'format_list_bulleted', title: 'Bullets', cmd: 'bullets', press: 'bullet', textOnly: true },
         { k: 'ico', ic: 'format_list_numbered', title: 'Numbering', cmd: 'numbering', press: 'number', textOnly: true },
         { k: 'sep' },
         { k: 'ico', ic: 'format_line_spacing', title: 'Line spacing', textOnly: true, pop: lineSpacingPopover }],
        [{ k: 'ico', ic: 'format_align_left', title: 'Align left', cmd: 'align', arg: 'left', press: 'align:left', textOnly: true },
         { k: 'ico', ic: 'format_align_center', title: 'Align centre', cmd: 'align', arg: 'center', press: 'align:center', textOnly: true },
         { k: 'ico', ic: 'format_align_right', title: 'Align right', cmd: 'align', arg: 'right', press: 'align:right', textOnly: true },
         { k: 'ico', ic: 'format_align_justify', title: 'Justify', cmd: 'align', arg: 'justify', press: 'align:justify', textOnly: true }]
      ]
    }));

    f.appendChild(group('Editing', {
      lead: [{ k: 'big', ic: 'lock_open', label: 'Unlock all', cmd: 'unlockAll' }]
    }));

    return f;
  }

  function insertTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Slides', {
      lead: [{ k: 'big', ic: 'add_box', label: 'New slide', cmd: 'addSlide', primary: true }],
      rows: [
        [{ k: 'row', ic: 'library_add', label: 'Duplicate slide', cmd: 'duplicateSlide', wide: true }]
      ]
    }));

    f.appendChild(group('Text', {
      lead: [{ k: 'big', ic: 'title', label: 'Text box', pop: textKindPopover }]
    }));

    f.appendChild(group('Illustrations', {
      lead: [
        { k: 'big', ic: 'category', label: 'Shapes', pop: tilePopover('Shapes', SHAPE_KINDS, 'insertShape', true) },
        { k: 'big', ic: 'filter_frames', label: 'Frames', pop: tilePopover('Frames', FRAME_KINDS, 'insertFrame', false) },
        { k: 'big', ic: 'insert_chart_outlined', label: 'Charts', pop: tilePopover('Charts', CHART_KINDS, 'insertChart', false) }
      ]
    }));

    f.appendChild(group('Media', {
      lead: [{ k: 'big', ic: 'image', label: 'Image', onClick: pickImage }]
    }));

    return f;
  }

  function designTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Page setup', {
      rows: [
        [{ k: 'row', ic: 'crop_16_9', label: 'Widescreen 16:9', cmd: 'pageSize', arg: '16:9',
           id: 'ratio16', wide: true }],
        [{ k: 'row', ic: 'crop_5_4', label: 'Standard 4:3', cmd: 'pageSize', arg: '4:3',
           id: 'ratio43', wide: true }]
      ]
    }));

    f.appendChild(group('Background', {
      lead: [{ k: 'big', ic: 'format_paint', label: 'Background', pop: backgroundPopover }]
    }));

    return f;
  }

  function arrangeTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Order', {
      rows: [
        [{ k: 'row', ic: 'flip_to_front', label: 'Bring to front', cmd: 'front', wide: true },
         { k: 'row', ic: 'arrow_upward', label: 'Forward', cmd: 'forward' }],
        [{ k: 'row', ic: 'flip_to_back', label: 'Send to back', cmd: 'back', wide: true },
         { k: 'row', ic: 'arrow_downward', label: 'Backward', cmd: 'backward' }]
      ]
    }));

    f.appendChild(group('Group', {
      rows: [
        [{ k: 'row', ic: 'group_work', label: 'Group', cmd: 'group', wide: true }],
        [{ k: 'row', ic: 'scatter_plot', label: 'Ungroup', cmd: 'ungroup', wide: true }]
      ]
    }));

    f.appendChild(group('Align', {
      rows: [
        [{ k: 'ico', ic: 'align_horizontal_left', title: 'Align left', cmd: 'alignSlide', arg: 'left' },
         { k: 'ico', ic: 'align_horizontal_center', title: 'Centre horizontally', cmd: 'alignSlide', arg: 'centerH' },
         { k: 'ico', ic: 'align_horizontal_right', title: 'Align right', cmd: 'alignSlide', arg: 'right' }],
        [{ k: 'ico', ic: 'align_vertical_top', title: 'Align top', cmd: 'alignSlide', arg: 'top' },
         { k: 'ico', ic: 'align_vertical_center', title: 'Centre vertically', cmd: 'alignSlide', arg: 'centerV' },
         { k: 'ico', ic: 'align_vertical_bottom', title: 'Align bottom', cmd: 'alignSlide', arg: 'bottom' }]
      ]
    }));

    f.appendChild(group('Distribute', {
      rows: [
        [{ k: 'row', ic: 'horizontal_distribute', label: 'Horizontal', cmd: 'distribute', arg: 'h', wide: true }],
        [{ k: 'row', ic: 'vertical_distribute', label: 'Vertical', cmd: 'distribute', arg: 'v', wide: true }]
      ]
    }));

    f.appendChild(group('Rotate', {
      rows: [
        [{ k: 'row', ic: 'rotate_90_degrees_ccw', label: 'Rotate 90°', cmd: 'rotate', arg: 90, wide: true }],
        [{ k: 'ico', ic: 'swap_horiz', title: 'Flip horizontal', cmd: 'flipH' },
         { k: 'ico', ic: 'swap_vert', title: 'Flip vertical', cmd: 'flipV' }]
      ]
    }));

    f.appendChild(group('Lock', {
      rows: [
        [{ k: 'row', ic: 'lock', label: 'Lock', cmd: 'lock', wide: true }],
        [{ k: 'row', ic: 'lock_open', label: 'Unlock all', cmd: 'unlockAll', wide: true }]
      ]
    }));

    return f;
  }

  function viewTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Zoom', {
      lead: [{ k: 'big', ic: 'zoom_in', label: 'Fit', cmd: 'zoomFit' }],
      rows: [
        [{ k: 'row', ic: 'zoom_out_map', label: '50%', cmd: 'zoom', arg: 50 },
         { k: 'row', ic: 'crop_free', label: '100%', cmd: 'zoom', arg: 100 }],
        [{ k: 'row', ic: 'aspect_ratio', label: 'Fit width', cmd: 'fitWidth' },
         { k: 'readout', ic: 'percent', label: '100%', id: 'zoomReadout' }]
      ]
    }));

    f.appendChild(group('Show', {
      rows: [
        [{ k: 'row', ic: 'straighten', label: 'Ruler', cmd: 'toggleRuler', press: 'view:ruler', wide: true }],
        [{ k: 'row', ic: 'grid_on', label: 'Gridlines', cmd: 'toggleGrid', press: 'view:grid' },
         { k: 'row', ic: 'border_inner', label: 'Guides', cmd: 'toggleGuides', press: 'view:guides' }]
      ]
    }));

    return f;
  }

  function presentTab() {
    var f = document.createDocumentFragment();

    f.appendChild(group('Start', {
      lead: [{ k: 'big', ic: 'slideshow', label: 'From start', cmd: 'presentFromStart', primary: true }],
      rows: [
        [{ k: 'row', ic: 'play_arrow', label: 'From current slide', cmd: 'presentFromCurrent', wide: true }]
      ]
    }));

    f.appendChild(group('File', {
      rows: [
        [{ k: 'row', ic: 'download', label: 'Export .pptx', cmd: 'exportPptx', wide: true }],
        [{ k: 'row', ic: 'save', label: 'Save project', cmd: 'saveProject' },
         { k: 'row', ic: 'note_add', label: 'New design', cmd: 'newDesign' }]
      ]
    }));

    return f;
  }

  var BUILDERS = {
    home: homeTab, insert: insertTab, design: designTab,
    arrange: arrangeTab, view: viewTab, present: presentTab
  };

  /* ─────────────────────────────────────────────────────────────────────
     7. Shell assembly
     ───────────────────────────────────────────────────────────────────── */
  var slot, tabsBar, bodyEl, activeTab = 'home';
  var tabButtons = {};

  function selectTab(id) {
    if (!BUILDERS[id]) return;
    closePop();
    activeTab = id;
    Object.keys(tabButtons).forEach(function (k) {
      tabButtons[k].classList.toggle('is-active', k === id);
      tabButtons[k].setAttribute('aria-selected', k === id ? 'true' : 'false');
    });
    /* rebuilding wipes registered nodes for the old tab */
    registry.textOnly = [];
    registry.press = {};
    registry.named = {};
    bodyEl.textContent = '';
    var panel = el('div', 'rb-panel');
    panel.appendChild(BUILDERS[id]());
    bodyEl.appendChild(panel);
    syncAll();
  }

  function mount() {
    slot = document.getElementById('ribbon-slot');
    if (!slot) return;
    slot.textContent = '';
    slot.classList.add('rb');

    /* ── top row ── */
    var top = el('div', 'rb-top');

    var qat = el('div', 'rb-qat');
    var undoBtn = el('button', 'rb-qbtn');
    undoBtn.type = 'button';
    undoBtn.title = 'Undo';
    undoBtn.setAttribute('aria-label', 'Undo');
    undoBtn.appendChild(icon('undo'));
    undoBtn.addEventListener('click', function () { closePop(); run('undo'); });
    var redoBtn = el('button', 'rb-qbtn');
    redoBtn.type = 'button';
    redoBtn.title = 'Redo';
    redoBtn.setAttribute('aria-label', 'Redo');
    redoBtn.appendChild(icon('redo'));
    redoBtn.addEventListener('click', function () { closePop(); run('redo'); });
    qat.appendChild(undoBtn);
    qat.appendChild(redoBtn);
    top.appendChild(qat);
    registry.qat = { undo: undoBtn, redo: redoBtn };

    top.appendChild(el('div', 'rb-top-sep'));

    tabsBar = el('nav', 'rb-tabs');
    tabsBar.setAttribute('role', 'tablist');
    TABS.forEach(function (t) {
      var b = el('button', 'rb-tab', t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { selectTab(t.id); });
      tabButtons[t.id] = b;
      tabsBar.appendChild(b);
    });
    top.appendChild(tabsBar);

    var actions = el('div', 'rb-actions');
    var presentBtn = el('button', 'rb-action');
    presentBtn.type = 'button';
    presentBtn.appendChild(icon('slideshow'));
    presentBtn.appendChild(el('span', null, 'Present'));
    presentBtn.addEventListener('click', function () { closePop(); run('presentFromStart'); });
    actions.appendChild(presentBtn);

    var dlBtn = el('button', 'rb-action is-primary');
    dlBtn.type = 'button';
    dlBtn.appendChild(icon('download'));
    dlBtn.appendChild(el('span', null, 'Download'));
    dlBtn.addEventListener('click', function () { closePop(); run('exportPptx'); });
    actions.appendChild(dlBtn);
    top.appendChild(actions);

    slot.appendChild(top);

    /* ── body ── */
    bodyEl = el('div', 'rb-body');
    slot.appendChild(bodyEl);

    /* ── popover layer + hidden file input (both inside the slot) ── */
    layer = el('div', 'rb-pop-layer');
    slot.appendChild(layer);

    fileInput = el('input', 'rb-file');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    wireFileInput();
    slot.appendChild(fileInput);

    selectTab('home');
    wireEvents();
  }

  /* ─────────────────────────────────────────────────────────────────────
     8. Live state sync
     ───────────────────────────────────────────────────────────────────── */
  function setPressed(key, on) {
    (registry.press[key] || []).forEach(function (n) { n.classList.toggle('is-on', !!on); });
  }
  function dim(node, on) { if (node) node.classList.toggle('is-dim', !!on); }

  function syncText() {
    var sel = ask('selection');
    var ts = ask('textState');
    var isText = !!(sel && sel.kind === 'text') || !!ts;

    registry.textOnly.forEach(function (n) { dim(n, !isText); });

    var fontSlot = registry.named.fontValue;
    var sizeSlot = registry.named.sizeValue;
    if (fontSlot) fontSlot.textContent = ts && ts.fontFamily ? ts.fontFamily : 'DM Sans';
    if (sizeSlot) sizeSlot.textContent = ts && ts.sizePt ? String(ts.sizePt) : '18';

    setPressed('bold', ts && ts.bold);
    setPressed('italic', ts && ts.italic);
    setPressed('underline', ts && ts.underline);
    setPressed('strike', ts && ts.strike);
    ['left', 'center', 'right', 'justify'].forEach(function (a) {
      setPressed('align:' + a, ts && ts.align === a);
    });
    setPressed('bullet', ts && ts.list === 'bullet');
    setPressed('number', ts && ts.list === 'number');
  }

  function syncView() {
    var v = ask('view') || {};
    setPressed('view:ruler', v.ruler);
    setPressed('view:grid', v.grid);
    setPressed('view:guides', v.guides);
  }

  function syncPageSize() {
    var ps = ask('pageSize') || {};
    var a = registry.named.ratio16;
    var b = registry.named.ratio43;
    if (a) a.classList.toggle('is-on', ps.ratio === '16:9');
    if (b) b.classList.toggle('is-on', ps.ratio === '4:3');
  }

  function syncHistory(h) {
    var hist = h || ask('history') || {};
    if (!registry.qat) return;
    dim(registry.qat.undo, !hist.canUndo);
    dim(registry.qat.redo, !hist.canRedo);
  }

  function syncZoom(z) {
    var pct = z && typeof z.pct === 'number' ? z.pct : ask('zoom');
    var node = registry.named.zoomReadout;
    if (!node) return;
    var lbl = node.querySelector('.rb-row-label');
    if (lbl) lbl.textContent = (typeof pct === 'number' ? Math.round(pct) : 100) + '%';
  }

  function syncAll() {
    syncText();
    syncView();
    syncPageSize();
    syncHistory();
    syncZoom();
  }

  function wireEvents() {
    listen('ready', syncAll);
    listen('selection', syncText);
    listen('slides', function () { syncPageSize(); });
    listen('history', syncHistory);
    listen('zoom', syncZoom);
  }

  /* ─────────────────────────────────────────────────────────────────────
     9. Boot
     ───────────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
