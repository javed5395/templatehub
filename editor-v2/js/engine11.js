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
