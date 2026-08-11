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
    var mid = '<line x1="10" y1="40" x2="190" y2="40" stroke="#0F172A" stroke-width="7"';
    if (item.line === 'dashed') mid += ' stroke-dasharray="22 14"';
    if (item.line === 'dotted') mid += ' stroke-dasharray="2 16" stroke-linecap="round"';
    mid += '/>';
    var heads = '';
    if (item.line === 'arrow' || item.line === 'double') heads += '<path d="M168 22 L196 40 L168 58 Z" fill="#0F172A"/>';
    if (item.line === 'double') heads += '<path d="M32 22 L4 40 L32 58 Z" fill="#0F172A"/>';
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
  if (d) return '<svg viewBox="0 0 200 140"><path d="' + d + '" fill="#0F172A"/></svg>';
  /* preset geometry — the same path the renderer draws */
  try {
    if (typeof PRESET_PATHS === 'object' && PRESET_PATHS[item.id]) {
      return '<svg viewBox="-8 -8 216 156"><path d="' + PRESET_PATHS[item.id](200, 140) + '" fill="#0F172A"/></svg>';
    }
  } catch (e) {}
  return '<svg viewBox="0 0 200 140"><rect x="10" y="15" width="180" height="110" fill="#0F172A"/></svg>';
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
