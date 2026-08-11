/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 7 · LIVE CHARTS + DATA     owner: Fable
   Full v1 chart system: 20 chart kinds drawn on canvas (no libraries),
   every placed chart keeps its chartDef so data stays editable forever,
   Data panel: CSV / Excel / Google-Sheet datasets → connect to any chart.
   Live tables: every cell its own editable text.
   ═══════════════════════════════════════════════════════════════════════ */

var CHART_PALETTE = ['#7C3AED', '#12A5A0', '#E8590C', '#EAB308', '#2563EB', '#DB2777', '#059669', '#64748B'];

var CHART_TYPES = [
  { id:'column',        name:'Column',          group:'Bar & column' },
  { id:'column-stack',  name:'Stacked column',  group:'Bar & column' },
  { id:'bar',           name:'Bar',             group:'Bar & column' },
  { id:'bar-stack',     name:'Stacked bar',     group:'Bar & column' },
  { id:'column-group',  name:'Grouped column',  group:'Bar & column' },
  { id:'line',          name:'Line',            group:'Line & area' },
  { id:'line-smooth',   name:'Smooth line',     group:'Line & area' },
  { id:'line-marker',   name:'Line + markers',  group:'Line & area' },
  { id:'area',          name:'Area',            group:'Line & area' },
  { id:'area-stack',    name:'Stacked area',    group:'Line & area' },
  { id:'pie',           name:'Pie',             group:'Pie & parts' },
  { id:'donut',         name:'Donut',           group:'Pie & parts' },
  { id:'half-donut',    name:'Half donut',      group:'Pie & parts' },
  { id:'progress',      name:'Progress ring',   group:'Pie & parts' },
  { id:'funnel',        name:'Funnel',          group:'Pie & parts' },
  { id:'scatter',       name:'Scatter',         group:'Distribution' },
  { id:'bubble',        name:'Bubble',          group:'Distribution' },
  { id:'radar',         name:'Radar',           group:'Distribution' },
  { id:'gauge',         name:'Gauge',           group:'Distribution' },
  { id:'waterfall',     name:'Waterfall',       group:'Distribution' }
];

var CHART_SAMPLE = {
  cats: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Revenue', data: [42, 58, 49, 71] },
    { name: 'Cost',    data: [28, 33, 30, 38] }
  ]
};

/* Draw a chart onto a 2D context sized w x h. Pure canvas, no libraries. */
function drawChart(ctx, w, h, type, def) {
  var d = def || CHART_SAMPLE;
  var s0 = d.series[0].data, s1 = (d.series[1] || d.series[0]).data;
  /* labels sized to the chart so a big placed chart reads clearly */
  var F = Math.max(12, Math.round(h * 0.055));
  var pad = { l: Math.max(40, F * 2.6), r: 16, t: F + 6, b: F * 2 };
  var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  var maxV = Math.max.apply(null, s0.concat(s1)) * 1.15;
  var P = CHART_PALETTE;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  ctx.font = 'bold ' + F + 'px Arial, sans-serif';
  ctx.textBaseline = 'middle';

  function axes(vertical) {
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + ih * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + iw, y); ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxV * (1 - i / 4)), pad.l - 8, y);
    }
    if (vertical !== false) {
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      d.cats.forEach(function (c, i) {
        ctx.fillText(c, pad.l + iw * (i + 0.5) / d.cats.length, h - pad.b + F);
      });
    }
  }
  function bars(horizontal, stacked, grouped) {
    axes(!horizontal);
    var n = d.cats.length;
    for (var i = 0; i < n; i++) {
      if (horizontal) {
        var slot = ih / n, bh = slot * 0.5, y0 = pad.t + slot * i + (slot - bh) / 2;
        var bw = iw * s0[i] / maxV;
        ctx.fillStyle = P[0]; ctx.fillRect(pad.l, y0, bw, bh);
        if (stacked) { ctx.fillStyle = P[1]; ctx.fillRect(pad.l + bw, y0, iw * s1[i] / maxV, bh); }
      } else {
        var slotw = iw / n, bwid = slotw * (grouped ? 0.28 : 0.46);
        var x0 = pad.l + slotw * i + (slotw - bwid * (grouped ? 2 : 1)) / 2;
        var bh0 = ih * s0[i] / maxV;
        ctx.fillStyle = P[0];
        ctx.fillRect(x0, pad.t + ih - bh0, bwid, bh0);
        if (grouped) {
          ctx.fillStyle = P[1];
          var bh1 = ih * s1[i] / maxV;
          ctx.fillRect(x0 + bwid + 2, pad.t + ih - bh1, bwid, bh1);
        } else if (stacked) {
          ctx.fillStyle = P[1];
          var bh2 = ih * s1[i] / maxV;
          ctx.fillRect(x0, pad.t + ih - bh0 - bh2, bwid, bh2);
        }
      }
    }
  }
  function pts(arr) {
    return arr.map(function (v, i) {
      return [pad.l + iw * (i + 0.5) / arr.length, pad.t + ih * (1 - v / maxV)];
    });
  }
  function poly(p, smooth) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) {
      if (smooth) {
        var cx = (p[i - 1][0] + p[i][0]) / 2;
        ctx.bezierCurveTo(cx, p[i - 1][1], cx, p[i][1], p[i][0], p[i][1]);
      } else ctx.lineTo(p[i][0], p[i][1]);
    }
  }
  function pieSlices(inner, sweep, cx, cy, r) {
    var tot = s0.reduce(function (a, b) { return a + b; }, 0), a0 = -Math.PI / 2;
    s0.forEach(function (v, i) {
      var a1 = a0 + sweep * v / tot;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
      ctx.fillStyle = P[i % P.length]; ctx.fill();
      a0 = a1;
    });
    if (inner) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, r * inner, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.36;

  switch (type) {
    case 'column':       bars(false, false, false); break;
    case 'column-stack': bars(false, true,  false); break;
    case 'column-group': bars(false, false, true);  break;
    case 'bar':          bars(true,  false, false); break;
    case 'bar-stack':    bars(true,  true,  false); break;

    case 'line': case 'line-smooth': case 'line-marker': {
      axes();
      var p = pts(s0);
      poly(p, type === 'line-smooth');
      ctx.strokeStyle = P[0]; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      if (type === 'line-marker') {
        p.forEach(function (q) {
          ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = P[0]; ctx.lineWidth = 2; ctx.stroke();
        });
      }
      break;
    }
    case 'area': case 'area-stack': {
      axes();
      [s1, s0].forEach(function (ser, k) {
        if (type === 'area' && k === 0) return;
        var q = pts(ser);
        poly(q, true);
        ctx.lineTo(q[q.length - 1][0], pad.t + ih);
        ctx.lineTo(q[0][0], pad.t + ih);
        ctx.closePath();
        ctx.fillStyle = k === 0 ? P[1] + '66' : P[0] + '66';
        ctx.fill();
        poly(q, true);
        ctx.strokeStyle = k === 0 ? P[1] : P[0]; ctx.lineWidth = 2; ctx.stroke();
      });
      break;
    }

    case 'pie':       pieSlices(0,    Math.PI * 2, cx, cy, r); break;
    case 'donut':     pieSlices(0.58, Math.PI * 2, cx, cy, r); break;
    case 'half-donut':
      pieSlices(0.55, Math.PI, cx, cy + r * 0.45, r * 1.2);
      break;
    case 'progress': {
      var pct = 0.68;
      ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#EDE9FE'; ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = P[0]; ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(r * 0.5) + 'px Arial, sans-serif';
      ctx.fillText(Math.round(pct * 100) + '%', cx, cy);
      break;
    }
    case 'funnel': {
      var n = s0.length, fh = ih / n;
      s0.slice().sort(function (a, b) { return b - a; }).forEach(function (v, i) {
        var wTop = iw * v / maxV, wBot = iw * (s0[i + 1] || v * 0.7) / maxV;
        var y = pad.t + fh * i;
        ctx.beginPath();
        ctx.moveTo(cx - wTop / 2, y); ctx.lineTo(cx + wTop / 2, y);
        ctx.lineTo(cx + wBot / 2, y + fh - 3); ctx.lineTo(cx - wBot / 2, y + fh - 3);
        ctx.closePath();
        ctx.fillStyle = P[i % P.length]; ctx.fill();
      });
      break;
    }
    case 'scatter': case 'bubble': {
      axes(false);
      for (var i = 0; i < 14; i++) {
        var px = pad.l + iw * ((i * 37) % 100) / 100;
        var py = pad.t + ih * (1 - ((i * 53) % 90) / 100);
        var rad = type === 'bubble' ? 4 + ((i * 29) % 11) : 4;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fillStyle = P[i % 3] + (type === 'bubble' ? '99' : 'FF');
        ctx.fill();
      }
      break;
    }
    case 'radar': {
      var n2 = 6, rr = Math.min(w, h) * 0.34;
      for (var ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        for (var k = 0; k <= n2; k++) {
          var a = -Math.PI / 2 + k * 2 * Math.PI / n2;
          var x = cx + Math.cos(a) * rr * ring / 3, y = cy + Math.sin(a) * rr * ring / 3;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath();
      var vals = [0.9, 0.6, 0.75, 0.5, 0.85, 0.65];
      for (var k2 = 0; k2 <= n2; k2++) {
        var a2 = -Math.PI / 2 + k2 * 2 * Math.PI / n2, v2 = vals[k2 % n2];
        var x2 = cx + Math.cos(a2) * rr * v2, y2 = cy + Math.sin(a2) * rr * v2;
        k2 ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2);
      }
      ctx.closePath();
      ctx.fillStyle = P[0] + '55'; ctx.fill();
      ctx.strokeStyle = P[0]; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'gauge': {
      var gcy = cy + r * 0.4;
      ctx.lineWidth = r * 0.26; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(cx, gcy, r, Math.PI, 0);
      ctx.strokeStyle = '#EDE9FE'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, gcy, r, Math.PI, Math.PI + Math.PI * 0.72);
      ctx.strokeStyle = P[0]; ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(r * 0.34) + 'px Arial, sans-serif';
      ctx.fillText('72', cx, gcy - r * 0.28);
      break;
    }
    case 'waterfall': {
      axes();
      var run = 0, nn = s0.length, sw = iw / nn;
      s0.forEach(function (v, i) {
        var delta = i === 0 ? v : v - s0[i - 1];
        var y0 = pad.t + ih * (1 - (run + Math.max(delta, 0)) / maxV);
        var hh = Math.abs(ih * delta / maxV);
        ctx.fillStyle = delta >= 0 ? P[1] : P[2];
        ctx.fillRect(pad.l + sw * i + sw * 0.25, y0, sw * 0.5, Math.max(2, hh));
        run += delta;
      });
      break;
    }
  }
}

/* v1 addChart used histLabel; v2 host has saveState only */
function addChartV2(type) {
  if (!fc) return;
  var slideW = fc.getWidth() / fc.getZoom();
  var slideH = fc.getHeight() / fc.getZoom();
  var W = Math.round(Math.min(slideW * 0.55, 620));
  var H = Math.round(W * 0.62);
  var cv = document.createElement('canvas');
  var dpr = 2;
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawChart(ctx, W, H, type);
  fabric.Image.fromURL(cv.toDataURL('image/png'), function (img) {
    img.set({
      left: (slideW - W) / 2, top: (slideH - H) / 2,
      scaleX: W / img.width, scaleY: H / img.height,
      chartType: type,
      chartDef: JSON.parse(JSON.stringify(CHART_SAMPLE))
    });
    fc.add(img); fc.setActiveObject(img);
    fc.renderAll();
    saveState();
    showToast('Chart added — connect data from the Data panel any time');
  });
}

function chartRedraw(o, def) {
  if (!o || !o.chartType || !fc) return;
  var W = Math.round((o.width || 600) * (o.scaleX || 1));
  var H = Math.round((o.height || 380) * (o.scaleY || 1));
  var dpr = 2;
  var cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawChart(ctx, W, H, o.chartType, def);
  var left = o.left, top = o.top, angle = o.angle;
  o.setSrc(cv.toDataURL('image/png'), function () {
    o.set({ left: left, top: top, angle: angle,
            scaleX: W / o.width, scaleY: H / o.height });
    fc.requestRenderAll();
  });
}

/* chart previews for the sidebar cards (engine-drawn, sidebar just shows) */
var _chartThumbCache = {};
function chartThumb(type) {
  if (_chartThumbCache[type]) return _chartThumbCache[type];
  var cv = document.createElement('canvas');
  cv.width = 264; cv.height = 164;
  var ctx = cv.getContext('2d');
  ctx.scale(2, 2);
  try { drawChart(ctx, 132, 82, type); } catch (e) {}
  return (_chartThumbCache[type] = cv.toDataURL('image/png'));
}

/* ════ DATA — datasets (CSV / Excel / Google Sheet / samples) ════ */
function parseCSV(text) {
  var rows = [], row = [], cur = '', q = false;
  text = String(text).replace(/^\ufeff/, '');
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c === '\r') { /* skip */ }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
}

function rowsToDataset(rows, name) {
  if (!rows.length) return null;
  var header = rows[0];
  var seriesNames = header.slice(1).map(function (h, i) {
    return String(h).trim() || ('Series ' + (i + 1));
  });
  var cats = [], series = seriesNames.map(function (n) { return { name: n, data: [] }; });
  for (var r = 1; r < rows.length; r++) {
    cats.push(String(rows[r][0] == null ? '' : rows[r][0]).trim() || ('Row ' + r));
    for (var c = 0; c < series.length; c++) {
      var raw = String(rows[r][c + 1] == null ? '' : rows[r][c + 1]).replace(/[^0-9.eE+-]/g, '');
      var v = parseFloat(raw);
      series[c].data.push(isFinite(v) ? v : 0);
    }
  }
  if (!cats.length || !series.length) return null;
  return { id: 'ds' + Date.now(), name: name, source: 'csv', cats: cats, series: series, ts: Date.now() };
}

/* .xlsx is a zip of XML — JSZip is already here for PPTX, no new dep */
function parseXLSX(arrayBuffer) {
  if (typeof JSZip === 'undefined') return Promise.resolve(null);
  return JSZip.loadAsync(arrayBuffer).then(function (zip) {
    var sheetFile = null;
    zip.forEach(function (path) {
      if (!sheetFile && /^xl\/worksheets\/sheet1\.xml$/i.test(path)) sheetFile = path;
    });
    if (!sheetFile) return null;
    var shared = zip.file('xl/sharedStrings.xml');
    return Promise.all([
      zip.file(sheetFile).async('string'),
      shared ? shared.async('string') : Promise.resolve('')
    ]).then(function (res) {
      var sheetXml = res[0], sharedXml = res[1];
      var strings = [];
      if (sharedXml) {
        var si = sharedXml.match(/<si>[\s\S]*?<\/si>/g) || [];
        strings = si.map(function (blk) {
          return (blk.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
            .map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('');
        });
      }
      var grid = {}, maxC = 0, maxR = 0;
      (sheetXml.match(/<c [^>]*?r="([A-Z]+)(\d+)"[^>]*>(?:[\s\S]*?)<\/c>|<c [^>]*\/>/g) || [])
        .forEach(function (cell) {
          var ref = cell.match(/r="([A-Z]+)(\d+)"/);
          if (!ref) return;
          var col = 0;
          for (var k = 0; k < ref[1].length; k++) col = col * 26 + (ref[1].charCodeAt(k) - 64);
          col -= 1;
          var rowN = parseInt(ref[2], 10) - 1;
          var isStr = /t="s"/.test(cell);
          var vm = cell.match(/<v>([\s\S]*?)<\/v>/);
          var inline = cell.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          var val = vm ? vm[1] : (inline ? inline[1].replace(/<[^>]+>/g, '') : '');
          if (isStr && vm) val = strings[parseInt(vm[1], 10)] || '';
          grid[rowN + ':' + col] = val;
          if (col > maxC) maxC = col;
          if (rowN > maxR) maxR = rowN;
        });
      var rows = [];
      for (var r = 0; r <= maxR; r++) {
        var row = [];
        for (var c = 0; c <= maxC; c++) row.push(grid[r + ':' + c] == null ? '' : grid[r + ':' + c]);
        rows.push(row);
      }
      return rows;
    });
  }).catch(function () { return null; });
}

var SAMPLE_DATA = [
  { name:'Quarterly revenue', cats:['Q1','Q2','Q3','Q4'],
    series:[{name:'Revenue',data:[42,58,49,71]},{name:'Cost',data:[28,33,30,38]}] },
  { name:'Monthly signups', cats:['Jan','Feb','Mar','Apr','May','Jun'],
    series:[{name:'Free',data:[120,145,138,190,210,265]},{name:'Paid',data:[18,24,31,29,44,58]}] },
  { name:'Traffic by channel', cats:['Search','Social','Direct','Email','Referral'],
    series:[{name:'Sessions',data:[4200,3100,2600,1400,900]}] },
  { name:'Team headcount', cats:['Eng','Sales','Support','Design','Ops'],
    series:[{name:'2025',data:[24,18,12,7,5]},{name:'2026',data:[31,22,15,9,6]}] }
];

state.datasets = state.datasets || [];
function dataSets() { return state.datasets; }
function dataEmit() { if (window.Editor && Editor._emit) Editor._emit('datasets', { count: dataSets().length }); }

function dataAdd(ds) {
  if (!ds) { showToast('Could not read that file'); return; }
  dataSets().unshift(ds);
  state.datasets = dataSets().slice(0, 20);
  dataEmit();
  showToast('Loaded “' + ds.name + '” — ' + ds.cats.length + ' rows, ' + ds.series.length + ' series');
}

function dataRepaintCharts(dsId) {
  var ds = dataSets().filter(function (d) { return d.id === dsId; })[0];
  if (!ds || !fc || !fc.getObjects) return;
  (fc.getObjects() || []).forEach(function (o) {
    if (o.datasetId === dsId) {
      o.chartDef = { cats: ds.cats, series: ds.series };
      chartRedraw(o, o.chartDef);
    }
  });
}

/* dblclick a chart → helpful pointer (data lives in the Data panel) */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    if (!fc || !fc.on) return;
    fc.on('mouse:dblclick', function (opt) {
      var o = opt && opt.target;
      if (o && o.chartType) showToast('Chart data: open the Data panel (left rail) — load a CSV / Excel / sample, then Connect');
    });
  }, 800);
});

/* ════ commands + queries ════ */
Editor._register({
  insertChart: function (type) { addChartV2(type || 'column'); },

  /* live table: every cell is its OWN editable text — dblclick any cell to
     type; select-drag across cells to move the table together */
  insertTable: function () {
    var rows = 3, cols = 3, cw = 150, rh = 46, x0 = 160, y0 = 140;
    var tid = 'tbl' + Date.now();
    var made = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = new fabric.Textbox(r === 0 ? 'Header' : 'Cell', {
          left: x0 + c * cw, top: y0 + r * rh,
          width: cw, height: rh,
          fontSize: 17, fontFamily: 'DM Sans',
          fill: r === 0 ? '#FFFFFF' : '#1F2430',
          backgroundColor: r === 0 ? '#7C3AED' : (r % 2 ? '#F4F1FB' : '#FFFFFF'),
          padding: 6,
          tableId: tid
        });
        made.push(cell);
        fc.add(cell);
      }
    }
    var sel = new fabric.ActiveSelection(made, { canvas: fc });
    fc.setActiveObject(sel);
    fc.renderAll(); saveState();
    showToast('Table added — double-click any cell to type');
  },

  dataCsv: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function (e) {
        dataAdd(rowsToDataset(parseCSV(e.target.result), f.name.replace(/\.[^.]+$/, '')));
      };
      rd.readAsText(f);
    };
    inp.click();
  },
  dataXlsx: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.xlsx';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function (e) {
        parseXLSX(e.target.result).then(function (rowsA) {
          if (!rowsA) { showToast('Could not read that spreadsheet'); return; }
          var ds = rowsToDataset(rowsA, f.name.replace(/\.[^.]+$/, ''));
          if (ds) ds.source = 'xlsx';
          dataAdd(ds);
        });
      };
      rd.readAsArrayBuffer(f);
    };
    inp.click();
  },
  dataSheet: function () {
    var url = prompt('Paste a Google Sheets “Publish to web” CSV link:\n\nFile → Share → Publish to web → Comma-separated values (.csv)');
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) { showToast('That does not look like a link'); return; }
    showToast('Fetching sheet…');
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (txt) {
      var ds = rowsToDataset(parseCSV(txt), 'Google Sheet');
      if (!ds) throw new Error('empty');
      ds.source = 'sheet'; ds.url = url;
      dataAdd(ds);
    }).catch(function () {
      showToast('Could not fetch — is the sheet published to the web?');
    });
  },
  dataSample: function (i) {
    var s = SAMPLE_DATA[i | 0];
    if (!s) return;
    dataAdd({ id: 'ds' + Date.now(), name: s.name, source: 'sample',
      cats: s.cats.slice(), series: JSON.parse(JSON.stringify(s.series)), ts: Date.now() });
  },
  dataConnect: function (id) {
    var ds = dataSets().filter(function (d) { return d.id === id; })[0];
    var o = fc && fc.getActiveObject();
    if (!ds) return;
    if (!o || !o.chartType) { showToast('Select a chart on the slide first, then press Connect'); return; }
    o.datasetId = ds.id;
    o.chartDef = { cats: ds.cats, series: ds.series };
    chartRedraw(o, o.chartDef);
    saveState();
    showToast('“' + ds.name + '” connected to this chart ✓');
  },
  dataRefresh: function (id) {
    var ds = dataSets().filter(function (d) { return d.id === id; })[0];
    if (!ds) return;
    if (ds.source !== 'sheet' || !ds.url) {
      showToast('Only linked sheets can refresh — re-upload the file to update it');
      return;
    }
    showToast('Refreshing…');
    fetch(ds.url).then(function (r) { return r.text(); }).then(function (txt) {
      var fresh = rowsToDataset(parseCSV(txt), ds.name);
      if (!fresh) throw new Error('empty');
      ds.cats = fresh.cats; ds.series = fresh.series; ds.ts = Date.now();
      dataRepaintCharts(ds.id);
      dataEmit();
      showToast('Refreshed ✓');
    }).catch(function () { showToast('Refresh failed'); });
  },
  dataRemove: function (id) {
    state.datasets = dataSets().filter(function (d) { return d.id !== id; });
    dataEmit();
  },
  __qDatasets: function () {
    return dataSets().map(function (d) {
      return { id: d.id, name: d.name, source: d.source,
        rows: d.cats.length, cols: d.series.length,
        cats: d.cats.slice(0, 4),
        series: d.series.slice(0, 3).map(function (s) { return { name: s.name, data: s.data.slice(0, 4) }; }) };
    });
  },
  __qChartTypes: function () {
    return CHART_TYPES.map(function (c) {
      return { id: c.id, name: c.name, group: c.group, thumb: chartThumb(c.id) };
    });
  },
  __qSamples: function () {
    return SAMPLE_DATA.map(function (s, i) {
      return { i: i, name: s.name, rows: s.cats.length, cols: s.series.length };
    });
  }
});
