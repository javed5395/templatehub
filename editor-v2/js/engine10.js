/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 10 · CHART DATA TABLE + WORDART STYLES
   owner: Fable.
   1. Double-click any chart → Excel-style data table opens IN PLACE:
      edit cells / add rows / add series → chart redraws itself. Real, not
      an eye-wash toast.
   2. WordArt: v1's 12 style presets (gradients, outline, neon, shadow…).
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ 1 · CHART DATA TABLE (opens on double-click) ════ */
function openChartDataEditor(o) {
  if (!o || !o.chartType) return;
  var ex = document.getElementById('ld-chartdata');
  if (ex) ex.remove();
  var def = o.chartDef || { cats: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Series 1', data: [42, 58, 49, 71] }] };
  /* deep copy so Cancel leaves the chart untouched */
  var d = JSON.parse(JSON.stringify(def));

  var ov = document.createElement('div');
  ov.id = 'ld-chartdata';
  ov.style.cssText = 'position:fixed;inset:0;z-index:650;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'width:min(680px,94vw);max-height:84vh;display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.35);font-family:"DM Sans",sans-serif;overflow:hidden;';
  ov.appendChild(box);

  function esc(s) { return String(s == null ? '' : s).replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function paint() {
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 10px;">'
      + '<b style="font-size:16px;color:#0F172A;">Chart data</b>'
      + '<span style="font-size:11px;color:#64748B;">edit cells, then Apply — or connect a CSV/Excel from the Data panel</span></div>'
      + '<div style="overflow:auto;padding:0 20px;flex:1;"><table id="ld-cd-tbl" style="border-collapse:collapse;width:100%;font-size:12.5px;">';
    h += '<tr><th style="border:1px solid #E2E8F0;background:#F8FAFC;padding:6px 8px;min-width:90px;"></th>';
    d.series.forEach(function (s, si) {
      h += '<th style="border:1px solid #E2E8F0;background:#EDE9FE;padding:2px;"><div style="display:flex;align-items:center;gap:2px;">'
        + '<input data-sname="' + si + '" value="' + esc(s.name) + '" style="border:0;background:none;font-weight:700;color:#4C1D95;width:90px;padding:4px 6px;">'
        + (d.series.length > 1 ? '<button data-delseries="' + si + '" title="Remove series" style="border:0;background:none;color:#DC2626;cursor:pointer;font-size:13px;">✕</button>' : '')
        + '</div></th>';
    });
    h += '<th style="border:0;padding:2px;"><button id="ld-cd-addser" title="Add series" style="border:1px dashed #CBD5E1;background:#FAFBFD;border-radius:6px;padding:5px 9px;cursor:pointer;font-weight:700;color:#7C3AED;">+</button></th></tr>';
    d.cats.forEach(function (c, ri) {
      h += '<tr><td style="border:1px solid #E2E8F0;background:#F8FAFC;padding:2px;"><div style="display:flex;align-items:center;gap:2px;">'
        + '<input data-cat="' + ri + '" value="' + esc(c) + '" style="border:0;background:none;font-weight:600;color:#0F172A;width:82px;padding:4px 6px;">'
        + (d.cats.length > 1 ? '<button data-delrow="' + ri + '" title="Remove row" style="border:0;background:none;color:#DC2626;cursor:pointer;font-size:12px;">✕</button>' : '')
        + '</div></td>';
      d.series.forEach(function (s, si) {
        h += '<td style="border:1px solid #E2E8F0;padding:0;"><input data-cell="' + ri + ':' + si + '" value="' + esc(s.data[ri]) + '" style="border:0;width:100%;box-sizing:border-box;padding:6px 8px;text-align:right;color:#1E293B;"></td>';
      });
      h += '<td style="border:0;"></td></tr>';
    });
    h += '</table>'
      + '<button id="ld-cd-addrow" style="margin:8px 0 4px;border:1px dashed #CBD5E1;background:#FAFBFD;border-radius:7px;padding:6px 14px;cursor:pointer;font-weight:700;color:#7C3AED;">+ Add row</button></div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #EEF2F7;">'
      + '<button id="ld-cd-cancel" style="border:1px solid #CBD5E1;background:#fff;border-radius:9px;padding:9px 18px;cursor:pointer;font-weight:700;color:#334155;">Cancel</button>'
      + '<button id="ld-cd-apply" style="border:0;background:#7C3AED;color:#fff;border-radius:9px;padding:9px 22px;cursor:pointer;font-weight:700;">Apply to chart</button></div>';
    box.innerHTML = h;
  }

  function harvest() {
    box.querySelectorAll('[data-cat]').forEach(function (inp) { d.cats[+inp.dataset.cat] = inp.value; });
    box.querySelectorAll('[data-sname]').forEach(function (inp) { d.series[+inp.dataset.sname].name = inp.value; });
    box.querySelectorAll('[data-cell]').forEach(function (inp) {
      var p = inp.dataset.cell.split(':');
      var v = parseFloat(String(inp.value).replace(/[^0-9.eE+-]/g, ''));
      d.series[+p[1]].data[+p[0]] = isFinite(v) ? v : 0;
    });
  }

  paint();
  document.body.appendChild(ov);

  ov.addEventListener('click', function (e) {
    if (e.target === ov || e.target.id === 'ld-cd-cancel') { ov.remove(); return; }
    if (e.target.id === 'ld-cd-addrow') {
      harvest();
      d.cats.push('Row ' + (d.cats.length + 1));
      d.series.forEach(function (s) { s.data.push(0); });
      paint(); return;
    }
    if (e.target.id === 'ld-cd-addser') {
      harvest();
      d.series.push({ name: 'Series ' + (d.series.length + 1), data: d.cats.map(function () { return 0; }) });
      paint(); return;
    }
    if (e.target.dataset && e.target.dataset.delrow != null) {
      harvest();
      var ri = +e.target.dataset.delrow;
      d.cats.splice(ri, 1);
      d.series.forEach(function (s) { s.data.splice(ri, 1); });
      paint(); return;
    }
    if (e.target.dataset && e.target.dataset.delseries != null) {
      harvest();
      d.series.splice(+e.target.dataset.delseries, 1);
      paint(); return;
    }
    if (e.target.id === 'ld-cd-apply') {
      harvest();
      o.chartDef = d;
      o.datasetId = null; /* manual edit detaches the dataset link */
      chartRedraw(o, d);
      saveState();
      ov.remove();
      showToast('Chart updated ✓');
    }
  });
}
window.openChartDataEditor = openChartDataEditor;

/* replace the toast dblclick (engine7) with the real editor */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    if (!fc || !fc.on) return;
    fc.on('mouse:dblclick', function (opt) {
      var o = opt && opt.target;
      if (o && o.chartType) openChartDataEditor(o);
    });
  }, 1200);
});

/* ════ 2 · WORDART STYLES (verbatim v1 presets) ════ */
var WORDART_PRESETS = [
  { id:'plain',   name:'Plain',   fill:null,                                              stroke:null,                          shadow:null },
  { id:'accent',  name:'Fill',    fill:{ type:'solid', color:'#7C3AED' },                 stroke:null,                          shadow:null },
  { id:'grape',   name:'Grape',   fill:{ type:'grad', stops:['#7C3AED','#EC4899'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'gold',    name:'Gold',    fill:{ type:'grad', stops:['#B45309','#FDE68A'], dir:'v' }, stroke:null,                      shadow:null },
  { id:'fire',    name:'Fire',    fill:{ type:'grad', stops:['#F97316','#DC2626'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'ocean',   name:'Ocean',   fill:{ type:'grad', stops:['#2563EB','#06B6D4'], dir:'h' }, stroke:null,                      shadow:null },
  { id:'outline', name:'Outline', fill:{ type:'solid', color:'#FFFFFF' },                 stroke:{ color:'#1B1B1B', ratio:0.045 }, shadow:null },
  { id:'edge',    name:'Edge',    fill:{ type:'solid', color:'#FFFFFF' },                 stroke:{ color:'#7C3AED', ratio:0.045 }, shadow:null },
  { id:'shadow',  name:'Shadow',  fill:{ type:'solid', color:'#7C3AED' },                 stroke:null,                          shadow:{ color:'rgba(0,0,0,.38)', blurR:0.05, dxR:0.05, dyR:0.05 } },
  { id:'lifted',  name:'Lifted',  fill:{ type:'solid', color:'#FFFFFF' },                 stroke:null,                          shadow:{ color:'rgba(0,0,0,.45)', blurR:0.09, dxR:0.02, dyR:0.06 } },
  { id:'neon',    name:'Neon',    fill:{ type:'solid', color:'#22D3EE' },                 stroke:null,                          shadow:{ color:'#22D3EE', blurR:0.18, dxR:0, dyR:0 } },
  { id:'pop',     name:'Pop',     fill:{ type:'solid', color:'#FDE047' },                 stroke:{ color:'#1B1B1B', ratio:0.05 }, shadow:{ color:'rgba(0,0,0,.4)', blurR:0.02, dxR:0.05, dyR:0.06 } }
];
function _waGradCoords(dir, w, h) { return dir === 'v' ? { x1:0, y1:0, x2:0, y2:h } : { x1:0, y1:0, x2:w, y2:0 }; }
function applyWordArt(o, p) {
  if (!o || !p) return;
  var fs = o.fontSize || 40;
  if (p.fill) {
    if (p.fill.type === 'grad') {
      var w = o.width || 200, h = o.height || fs, stops = p.fill.stops;
      o.set('fill', new fabric.Gradient({ type:'linear', gradientUnits:'pixels',
        coords: _waGradCoords(p.fill.dir, w, h),
        colorStops: stops.map(function (c, i) { return { offset: i / (stops.length - 1), color: c }; }) }));
    } else { o.set('fill', p.fill.color); }
  } else { o.set('fill', '#0F172A'); }
  if (p.stroke) { o.set({ stroke: p.stroke.color, strokeWidth: Math.max(1, fs * p.stroke.ratio), paintFirst: 'stroke', strokeLineJoin: 'round' }); }
  else { o.set({ stroke: '', strokeWidth: 0 }); }
  if (p.shadow) { o.set('shadow', new fabric.Shadow({ color: p.shadow.color, blur: Math.round(fs * p.shadow.blurR), offsetX: Math.round(fs * p.shadow.dxR), offsetY: Math.round(fs * p.shadow.dyR) })); }
  else { o.set('shadow', null); }
  o.dirty = true; fc.renderAll(); saveState();
}
function _waThumbStyle(p) {
  var s = '';
  if (p.fill && p.fill.type === 'grad') { s += 'background:linear-gradient(' + (p.fill.dir === 'v' ? 'to bottom' : 'to right') + ',' + p.fill.stops.join(',') + ');-webkit-background-clip:text;background-clip:text;color:transparent;'; }
  else if (p.fill) { s += 'color:' + p.fill.color + ';'; }
  else { s += 'color:#0F172A;'; }
  if (p.stroke) { s += '-webkit-text-stroke:1.3px ' + p.stroke.color + ';'; }
  if (p.shadow) { s += 'text-shadow:' + (p.shadow.dxR * 30).toFixed(1) + 'px ' + (p.shadow.dyR * 30).toFixed(1) + 'px ' + (p.shadow.blurR * 30 + 1).toFixed(1) + 'px ' + p.shadow.color + ';'; }
  return s;
}

Editor._register({
  /* WordArt: with a style index → apply to selected text, or create new
     WordArt text in that style. Plain call (no arg) keeps old behaviour. */
  insertWordArt: function (styleIdx) {
    var p = WORDART_PRESETS[styleIdx == null ? 2 : styleIdx] || WORDART_PRESETS[2];
    var o = fc.getActiveObject();
    if (o && /text/.test(o.type || '')) {
      applyWordArt(o, p);
      showToast('WordArt "' + p.name + '" applied');
      return;
    }
    var t = new fabric.IText('WordArt', {
      left: 180, top: 160, fontFamily: 'DM Sans', fontWeight: '800', fontSize: 96
    });
    fc.add(t); fc.setActiveObject(t);
    applyWordArt(t, p);
    showToast('WordArt added — double-click to edit the text');
  },
  __qWordArtStyles: function () {
    return WORDART_PRESETS.map(function (p, i) {
      return { i: i, name: p.name, css: _waThumbStyle(p) };
    });
  }
});
