/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 6 · cloud completion       owner: Fable
   1. Big-file PPTX road (≥18 MB): /upload_url → resumable PUT → /parse
   2. Dissolve service: PDF / image / pptx → editable deck  (+ chart-crack)
   3. Templates feed: admin-uploaded free templates from Firestore
   All fragments ported from v1 (editor-v1-backup) with v2 host names.
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ 1 · BIG-FILE IMPORT ROAD (verbatim v1, goes around the proxy's
        32 MB request cap: editor → /upload_url → resumable PUT straight
        to Storage → /parse { gcsPath }) ════════════════════════════════ */
async function _ldAuthWait() {
  for (var w = 0; w < 24 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });
}
window.ldRequestUploadUrl = async function (file, ct) {
  await _ldAuthWait();
  var r = await fetch(window.LD_BACKEND + '/upload_url', {
    method: 'POST', headers: window.ldHeaders('application/json'),
    body: JSON.stringify({ filename: file.name || 'deck.pptx', contentType: ct })
  });
  if (r.status === 401 || r.status === 403) throw new Error('Please sign in first — PowerPoint import needs a signed-in designer account.');
  if (r.status === 404 || r.status === 405) throw new Error('Big-file service (/upload_url) is not on the deployed proxy — tell Fable status ' + r.status + '.');
  if (!r.ok) throw new Error('Could not start the upload (service error ' + r.status + ').');
  var j = await r.json();
  if (!j || !j.uploadUrl || !j.gcsPath) throw new Error('Upload service returned an unexpected response.');
  return j;
};
window.ldResumablePut = function (sessionUri, file, ct, onProgress) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUri, true);
    xhr.setRequestHeader('Content-Type', ct);
    xhr.setRequestHeader('Content-Range', 'bytes 0-' + (file.size - 1) + '/' + file.size);
    if (xhr.upload) xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 201) resolve();
      else reject(new Error('Upload failed (' + xhr.status + '). Please try again.'));
    };
    xhr.onerror = function () { reject(new Error('Upload connection failed — check your internet and try again.')); };
    xhr.ontimeout = function () { reject(new Error('Upload timed out — connection too slow. Try again on a stronger connection.')); };
    xhr.timeout = 15 * 60 * 1000;
    xhr.send(file);
  });
};
function _ldProgPill(id, html) {
  var el = document.getElementById(id);
  if (html == null) { if (el) el.remove(); return null; }
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:99999;background:#0F172A;color:#fff;padding:10px 16px;border-radius:10px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);min-width:210px;text-align:center;';
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  return el;
}
function _ldBar(pct) {
  return '<div style="height:5px;background:rgba(255,255,255,.2);border-radius:3px;margin-top:7px;overflow:hidden;">' +
    '<div style="height:100%;width:' + pct + '%;background:#7C3AED;transition:width .2s;"></div></div>';
}
window.ldUploadProgress = function (frac, totalBytes) {
  if (frac == null) { _ldProgPill('ld-up-prog', null); return; }
  var pct = Math.round(frac * 100), mb = '';
  if (totalBytes) {
    var totMB = totalBytes / 1048576;
    mb = ' (' + (totMB * frac).toFixed(1) + ' of ' + totMB.toFixed(1) + ' MB)';
  }
  _ldProgPill('ld-up-prog', 'Uploading… ' + pct + '%' + mb + _ldBar(pct));
};
window.ldDownloadProgress = function (frac) {
  if (frac == null) { _ldProgPill('ld-dl-prog', null); return; }
  var pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
  _ldProgPill('ld-dl-prog', 'Loading design… ' + pct + '%' + _ldBar(pct));
};
/* Plain download of a (possibly large) JSON, streamed for progress. */
async function ldFetchPlainJson(url, onProgress, total) {
  var r = await fetch(url);
  if (!r.ok && r.status !== 206) throw new Error('Could not fetch the parsed deck (' + r.status + ').');
  if (!total) total = parseInt(r.headers.get('Content-Length') || '0', 10) || 0;
  if (r.body && r.body.getReader) {
    var reader = r.body.getReader(), chunks = [], received = 0;
    while (true) {
      var rd = await reader.read();
      if (rd.done) break;
      chunks.push(rd.value); received += rd.value.length;
      if (onProgress && total) onProgress(received / total);
    }
    var all = new Uint8Array(received), off = 0;
    for (var i = 0; i < chunks.length; i++) { all.set(chunks[i], off); off += chunks[i].length; }
    var txt = new TextDecoder('utf-8').decode(all);
    return { text: txt, json: JSON.parse(txt) };
  }
  var t = await r.text();
  return { text: t, json: JSON.parse(t) };
}
/* Storage throttles a single connection — pull big JSON in 6 parallel
   byte-ranges and stitch; ANY problem falls back to plain download. */
window.ldFetchLargeJson = async function (url, onProgress) {
  var total = 0;
  try {
    var head = await fetch(url, { method: 'HEAD' });
    if (head && head.ok) total = parseInt(head.headers.get('Content-Length') || '0', 10) || 0;
  } catch (e) { /* HEAD blocked — fall through to plain */ }
  if (!total || total < 8 * 1024 * 1024) return await ldFetchPlainJson(url, onProgress, total);
  try {
    var PARTS = 6, partSize = Math.ceil(total / PARTS), parts = new Array(PARTS), done = 0;
    await Promise.all(Array.from({ length: PARTS }, function (_u, k) {
      var start = k * partSize, end = Math.min(total - 1, start + partSize - 1);
      if (start > end) { parts[k] = new Uint8Array(0); return Promise.resolve(); }
      return fetch(url, { headers: { Range: 'bytes=' + start + '-' + end } })
        .then(function (rp) { if (!rp.ok && rp.status !== 206) throw new Error('range ' + rp.status); return rp.arrayBuffer(); })
        .then(function (buf) { parts[k] = new Uint8Array(buf); done += parts[k].length; if (onProgress) onProgress(done / total); });
    }));
    var all = new Uint8Array(total);
    for (var k = 0; k < PARTS; k++) { all.set(parts[k], k * partSize); }
    var txt = new TextDecoder('utf-8').decode(all);
    return { text: txt, json: JSON.parse(txt) };
  } catch (e) {
    return await ldFetchPlainJson(url, onProgress, total);
  }
};
window.ldParseByPath = async function (gcsPath) {
  await _ldAuthWait();
  var r = await fetch(window.LD_BACKEND + '/parse', {
    method: 'POST', headers: window.ldHeaders('application/json'),
    body: JSON.stringify({ gcsPath: gcsPath })
  });
  if (r.status === 401 || r.status === 403) throw new Error('Please sign in first — PowerPoint import needs a signed-in designer account.');
  if (!r.ok) throw new Error('Import service error (' + r.status + '). Please try again in a moment.');
  var j = await r.json();
  /* big decks: worker parks IR in Storage, returns { irUrl, big:true } */
  if (j && j.big === true && j.irUrl) {
    showToast('Finishing up…');
    window.ldDownloadProgress(0);
    var res = await window.ldFetchLargeJson(j.irUrl, function (frac) { window.ldDownloadProgress(frac); });
    window.ldDownloadProgress(null);
    return res.json;
  }
  return j;
};
window.ldBigUploadParse = async function (file) {
  var ct = file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  window.ldUploadProgress(0, file.size);
  var t = await window.ldRequestUploadUrl(file, ct);
  await window.ldResumablePut(t.uploadUrl, file, ct, function (frac) { window.ldUploadProgress(frac, file.size); });
  window.ldUploadProgress(null);
  showToast('Parsing PPTX…');
  if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Parsing PPTX in LazyDog cloud…');
  try { return await window.ldParseByPath(t.gcsPath); }
  finally { if (window.ldParseHeartbeat) window.ldParseHeartbeat(false); }
};

/* ════ 2 · DISSOLVE SERVICE — PDF / image / pptx → fully editable deck ══ */
window.LD_DISSOLVE_URL   = window.LD_DISSOLVE_URL   || 'https://lazydog-dissolve-143000893683.us-central1.run.app';
window.LD_DISSOLVE_TOKEN = window.LD_DISSOLVE_TOKEN || 'ldg_424ad03e232f06ba77576faa9f2a3d1829c4d3ad754812a6';

window.dissolveFlatFile = async function (file) {
  var base = String(window.LD_DISSOLVE_URL || '').replace(/\/$/, '');
  if (!base) { showToast('Dissolve service not set up yet (LD_DISSOLVE_URL missing)'); return; }
  showToast('Dissolving ' + (file.name || 'file') + ' … this can take a moment', 8000);
  try {
    var fd = new FormData(); fd.append('file', file, file.name || 'upload');
    var headers = {};
    if (window.LD_DISSOLVE_TOKEN) headers['X-Dissolve-Token'] = window.LD_DISSOLVE_TOKEN;
    var r = await fetch(base + '/dissolve', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) { showToast('Dissolve failed (' + r.status + ')'); return; }
    var blob = await r.blob();
    var nm = (file.name || 'design').replace(/\.[^.]+$/, '') + '_EDITABLE.pptx';
    var pptx = new File([blob], nm,
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    var ok = await window.ldImportPptxFile(pptx);
    if (ok) showToast('Dissolved → editable ✓');
  } catch (err) {
    showToast('Dissolve error: ' + ((err && err.message) || err));
  }
};

/* ── AUTO CHART-CRACK — after an import, chart-looking pictures are probed
   in the BACKGROUND against /crack_chart. A confirmed chart swaps in as a
   native editable chart; any refusal leaves the picture untouched. ── */
(function () {
  function looksChartish(src) {
    return new Promise(function (res) {
      try {
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas'); c.width = 64; c.height = 64;
            var g = c.getContext('2d'); g.drawImage(im, 0, 0, 64, 64);
            var d = g.getImageData(0, 0, 64, 64).data, buckets = {}, light = 0, sat = 0;
            for (var p = 0; p < d.length; p += 4) {
              var r = d[p], gg = d[p + 1], b = d[p + 2], a = d[p + 3];
              if (a < 30 || (r > 225 && gg > 225 && b > 225)) { light++; continue; }
              if (Math.max(r, gg, b) - Math.min(r, gg, b) > 60) {
                sat++;
                var k = (r >> 5) + '-' + (gg >> 5) + '-' + (b >> 5);
                buckets[k] = (buckets[k] || 0) + 1;
              }
            }
            var tot = 4096, dom = 0;
            for (var k2 in buckets) dom = Math.max(dom, buckets[k2]);
            res(light / tot > 0.35 && dom / tot > 0.04 && dom / tot < 0.55 && dom / Math.max(1, sat) > 0.5);
          } catch (e) { res(false); }
        };
        im.onerror = function () { res(false); };
        im.crossOrigin = 'anonymous';
        im.src = src;
      } catch (e) { res(false); }
    });
  }
  async function probeOne(el) {
    var base = String(window.LD_DISSOLVE_URL || '').replace(/\/$/, '');
    if (!base) return null;
    var blob = await (await fetch(el.src)).blob();
    var fd = new FormData(); fd.append('file', blob, 'chart.png');
    var headers = {};
    if (window.LD_DISSOLVE_TOKEN) headers['X-Dissolve-Token'] = window.LD_DISSOLVE_TOKEN;
    var r = await fetch(base + '/crack_chart', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) return null;
    return await r.json();
  }
  window.ldAutoCrackCharts = async function () {
    try {
      if (!window.LD_DISSOLVE_URL || !window._deckIR || !window._deckIR.size) return;
      var W = window._deckIR.size.w, H = window._deckIR.size.h, cracked = 0;
      for (var i = 0; i < state.pages.length; i++) {
        var ir = state.pages[i].ir;
        if (!ir || !ir.elements) continue;
        for (var j = 0; j < ir.elements.length; j++) {
          var el = ir.elements[j];
          if (!el || el.type !== 'image' || el.format === 'svg' || !el.src) continue;
          var rw = Math.abs(el.w) / W, rh = Math.abs(el.h) / H;
          if (rw < 0.28 || rh < 0.28 || rw > 0.92 || rh > 0.92) continue;
          if (!(await looksChartish(el.src))) continue;
          var chart = null;
          try { chart = await probeOne(el); } catch (e) { chart = null; }
          if (!chart || chart.type !== 'chart') continue;
          ir.elements[j] = Object.assign({}, chart, {
            id: el.id, origin: el.origin || 'slide',
            x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot || 0 });
          cracked++;
          state.pages[i].canvasJSON = null;
          if (i === state.currentPage) { try { await loadPageIntoCanvas(i); } catch (e) {} }
        }
      }
      if (cracked) {
        showToast(cracked + ' chart' + (cracked > 1 ? 's' : '') + ' made editable ✓', 5000);
        try { renderPageThumbs(); } catch (e) {}
      }
    } catch (e) { console.warn('auto-crack skipped', e); }
  };
})();

/* ════ 3 · TEMPLATES FEED — admin-uploaded free templates (Firestore) ═══ */
window._editorTemplates = window._editorTemplates || [];

async function ldRenderDeckThumb(deck) {
  try {
    if (!deck || !deck.slides || !deck.slides[0] || typeof fabric === 'undefined' || !deck.size) return null;
    var W = 280, H = Math.max(80, Math.round(W * (deck.size.h || 3) / (deck.size.w || 4)));
    var tf = new fabric.StaticCanvas(null, { width: W, height: H });
    tf._baseWidth = W; tf._baseHeight = H;
    await renderSlideIR(deck.slides[0], deck, tf);
    tf.renderAll();
    var url = tf.toDataURL({ format: 'jpeg', quality: 0.72 });
    try { tf.dispose(); } catch (_) {}
    return url;
  } catch (e) { console.warn('thumb render failed', e); return null; }
}

window.LD_loadEditorTemplates = async function () {
  try {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var fsMod  = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
      apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
      authDomain: 'templatehub-16cd7.firebaseapp.com',
      projectId: 'templatehub-16cd7',
      storageBucket: 'templatehub-16cd7.firebasestorage.app'
    });
    var db = fsMod.getFirestore(app);
    var snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'editor_templates'), fsMod.orderBy('createdAt', 'desc')));
    var out = [];
    snap.forEach(function (d) {
      var t = d.data();
      out.push({ id: d.id, name: t.name, jsonUrl: t.jsonUrl, slideCount: t.slideCount, bg: t.bg });
    });
    window._editorTemplates = out;
    if (window.Editor && Editor._emit) Editor._emit('templates', { count: out.length });
    /* lazy thumbnails: fetch each deck once, render slide 1, re-emit */
    out.forEach(function (tpl) {
      if (!tpl.jsonUrl) return;
      fetch(tpl.jsonUrl).then(function (r) { return r.json(); })
        .then(function (deck) { tpl._deck = deck; return ldRenderDeckThumb(deck); })
        .then(function (url) {
          if (url) { tpl.thumb = url; if (window.Editor && Editor._emit) Editor._emit('templates', { count: out.length }); }
        }).catch(function () {});
    });
  } catch (e) {
    console.error('editor templates load failed', e);
    window._editorTemplates = window._editorTemplates || [];
  }
  return window._editorTemplates;
};
/* load shortly after boot — never blocks the editor */
setTimeout(function () { try { window.LD_loadEditorTemplates(); } catch (e) {} }, 1500);

/* ════ commands ════ */
Editor._register({
  dissolve: function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.pdf,.png,.jpg,.jpeg,.pptx';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (f) window.dissolveFlatFile(f);
    };
    inp.click();
  },
  applyTemplate: async function (id) {
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (!tpl) { showToast('Template not found'); return; }
    try {
      showToast('Opening "' + (tpl.name || 'template') + '"…');
      var deck = tpl._deck;
      if (!deck) {
        var r = await fetch(tpl.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        deck = await r.json();
        tpl._deck = deck;
      }
      window._deckIR = deck;
      await window.loadDeckIRIntoEditor(deck);
      showToast('"' + (tpl.name || 'Template') + '" loaded ✓');
    } catch (e) {
      console.error('applyTemplate', e);
      showToast('Could not open template: ' + e.message);
    }
  }
});
