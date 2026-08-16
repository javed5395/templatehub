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
  if (!r.ok) {
    var det = ''; try { det = (await r.text()).slice(0, 200); } catch (e2) {}
    throw new Error('Import service error (' + r.status + ')' + (det ? ' — ' + det : ''));
  }
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
  if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Dissolving ' + (file.name || 'file') + ' in LazyDog cloud…');
  if (window.ldBusy) window.ldBusy('upload', true);
  try {
    var fd = new FormData(); fd.append('file', file, file.name || 'upload');
    var headers = {};
    if (window.LD_DISSOLVE_TOKEN) headers['X-Dissolve-Token'] = window.LD_DISSOLVE_TOKEN;
    var r = await fetch(base + '/dissolve', { method: 'POST', headers: headers, body: fd });
    if (!r.ok) {
      var det = ''; try { det = (await r.text()).slice(0, 200); } catch (e2) {}
      showToast('Dissolve failed (' + r.status + ')' + (det ? ' — ' + det : ''), 9000); return;
    }
    var blob = await r.blob();
    var nm = (file.name || 'design').replace(/\.[^.]+$/, '') + '_EDITABLE.pptx';
    var pptx = new File([blob], nm,
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    var ok = await window.ldImportPptxFile(pptx);
    if (ok) showToast('Dissolved → editable ✓');
  } catch (err) {
    showToast('Dissolve error: ' + ((err && err.message) || err));
  } finally {
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (window.ldBusy) window.ldBusy('upload', false);
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

async function ldRenderDeckThumb(deck, slideIdx) {
  try {
    var si = slideIdx || 0;
    if (!deck || !deck.slides || !deck.slides[si] || typeof fabric === 'undefined' || !deck.size) return null;
    var W = 280, H = Math.max(80, Math.round(W * (deck.size.h || 3) / (deck.size.w || 4)));
    var tf = new fabric.StaticCanvas(null, { width: W, height: H });
    tf._baseWidth = W; tf._baseHeight = H;
    await renderSlideIR(deck.slides[si], deck, tf);
    tf.renderAll();
    var url = tf.toDataURL({ format: 'jpeg', quality: 0.72 });
    try { tf.dispose(); } catch (_) {}
    return url;
  } catch (e) { console.warn('thumb render failed', e); return null; }
}
/* all slide thumbs for one template (detail view / hover rotation) */
window.ldTemplateSlideThumbs = async function (tpl, maxN) {
  if (!tpl) return [];
  if (!tpl._deck) {
    try {
      var r = await fetch(tpl.jsonUrl);
      if (!r.ok) return [];
      tpl._deck = await r.json();
    } catch (e) { return []; }
  }
  var n = Math.min(tpl._deck.slides.length, maxN || tpl._deck.slides.length);
  tpl.slideThumbs = tpl.slideThumbs || [];
  for (var i = 0; i < n; i++) {
    if (!tpl.slideThumbs[i]) {
      tpl.slideThumbs[i] = await ldRenderDeckThumb(tpl._deck, i);
      if (window.Editor && Editor._emit) Editor._emit('templates', { partial: true });
    }
  }
  return tpl.slideThumbs;
};

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
    var out = [], els = [];
    snap.forEach(function (d) {
      var t = d.data();
      if (t.kind === 'element') {
        /* published ELEMENTS live in the same collection (kind:'element') so
           the existing admin-write/public-read rules cover them */
        els.push({ id: d.id, name: t.name, jsonUrl: t.jsonUrl, thumb: t.thumb || null });
        return;
      }
      out.push({ id: d.id, name: t.name, jsonUrl: t.jsonUrl, slideCount: t.slideCount, bg: t.bg });
    });
    window._editorTemplates = out;
    window._editorElements = els;
    if (window.Editor && Editor._emit) {
      Editor._emit('templates', { count: out.length });
      Editor._emit('elements', { count: els.length });
    }
    /* lazy thumbnails: fetch each deck once, render slide 1, re-emit */
    out.forEach(function (tpl) {
      if (!tpl.jsonUrl) return;
      fetch(tpl.jsonUrl).then(function (r) { return r.json(); })
        .then(function (deck) { tpl._deck = deck; return ldRenderDeckThumb(deck); })
        .then(function (url) {
          if (url) { tpl.thumb = url; if (window.Editor && Editor._emit) Editor._emit('templates', { count: out.length }); }
          return window.ldTemplateSlideThumbs(tpl, 6);
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
  templateThumbs: function (id) {
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (tpl) window.ldTemplateSlideThumbs(tpl);
  },
  /* add ONE slide of a template to the current design (Canva behaviour) */
  applyTemplateSlide: async function (arg) {
    var id = arg && arg.id, idx = (arg && arg.i) | 0;
    var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
    if (!tpl) { showToast('Template not found'); return; }
    try {
      if (!tpl._deck) {
        var r = await fetch(tpl.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        tpl._deck = await r.json();
      }
      var deck = tpl._deck;
      if (!deck.slides[idx]) { showToast('That slide is missing'); return; }
      addPage();
      await new Promise(function (res) { setTimeout(res, 150); });
      await renderSlideIR(deck.slides[idx], deck, fc);
      fc.renderAll();
      captureCurrentPage();
      saveState();
      renderPageThumbs();
      showToast('Slide ' + (idx + 1) + ' of "' + (tpl.name || 'template') + '" added ✓');
    } catch (e) {
      console.error('applyTemplateSlide', e);
      showToast('Could not add that slide: ' + e.message);
    }
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


/* ════ 4 · PUBLISH AS TEMPLATE (admin-only experiment road, 11 Aug) ════
   The cloud side already existed: Storage path editor_templates/ (admin
   write, public read) + Firestore collection editor_templates (same).
   This is the missing button: current deck → IR JSON → Storage →
   Firestore record → appears in every visitor's Templates panel. */
var LD_ADMIN_EMAILS = ['javed5395@gmail.com', 'lazydogtemplates@gmail.com'];
Editor._register({
  publishTemplate: async function () {
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Publishing templates is for the LazyDog admin account — sign in as admin first', 5000);
        return;
      }
      var name = prompt('Template name (shown in the Templates panel):',
        'Template ' + new Date().toLocaleDateString());
      if (!name || !name.trim()) return;
      showToast('Building template…');
      var deck = await buildEffectiveDeckIR();
      if (!deck || !deck.slides || !deck.slides.length) { showToast('Nothing to publish — the deck is empty'); return; }
      var json = JSON.stringify(deck);
      showToast('Uploading (' + Math.round(json.length / 1024) + ' KB)…');
      var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      /* the auth module may have initialised the app WITHOUT storageBucket —
         name the bucket explicitly so it can never depend on init order */
      var storage = stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app');
      var id = 'tpl_' + Date.now();
      var ref = stMod.ref(storage, 'editor_templates/' + id + '.json');
      await stMod.uploadBytes(ref, new Blob([json], { type: 'application/json' }));
      var jsonUrl = await stMod.getDownloadURL(ref);
      var db = fsMod.getFirestore(app);
      var bg = null;
      try {
        var bg0 = deck.slides[0] && deck.slides[0].bg;
        if (bg0 && bg0.color) bg = bg0.color;
      } catch (e) {}
      await fsMod.setDoc(fsMod.doc(db, 'editor_templates', id), {
        name: name.trim(),
        jsonUrl: jsonUrl,
        slideCount: deck.slides.length,
        bg: bg,
        createdAt: fsMod.serverTimestamp()
      });
      showToast('“' + name.trim() + '” published ✓ — it is now in the Templates panel for everyone', 6000);
      try { window.LD_loadEditorTemplates(); } catch (e) {}
    } catch (e) {
      console.error('publishTemplate', e);
      showToast('Publish failed: ' + ((e && e.message) || e), 7000);
    }
  },

  /* ── PUBLISH SELECTED OBJECT(S) AS A PUBLIC ELEMENT (admin) ──
     Same road as publishTemplate: Storage editor_templates/ + Firestore
     editor_templates with kind:'element' → appears in everyone's
     Elements panel under "Custom elements". */
  publishElement: async function () {
    try {
      var o = fc && fc.getActiveObject();
      if (!o) { showToast('Select the object(s) on the canvas first, then publish'); return; }
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Publishing elements is for the LazyDog admin account — sign in as admin first', 5000);
        return;
      }
      var name = prompt('Element name (shown in the Elements panel):', 'Element');
      if (!name || !name.trim()) return;
      /* serialize the selection (single object OR multi-selection) */
      var objs = (o.type === 'activeSelection') ? o._objects : [o];
      var data = { objects: objs.map(function (x) { return x.toJSON(FABRIC_JSON_PROPS); }) };
      /* small PNG preview for the panel tile */
      var thumb = null;
      try { thumb = o.toDataURL({ format: 'png', multiplier: Math.min(1, 140 / Math.max(o.getScaledWidth(), o.getScaledHeight())) }); } catch (e) {}
      var json = JSON.stringify(data);
      showToast('Publishing element (' + Math.round(json.length / 1024) + ' KB)…');
      var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      var storage = stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app');
      var id = 'el_' + Date.now();
      var ref = stMod.ref(storage, 'editor_templates/' + id + '.json');
      await stMod.uploadBytes(ref, new Blob([json], { type: 'application/json' }));
      var jsonUrl = await stMod.getDownloadURL(ref);
      await fsMod.setDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id), {
        kind: 'element',
        name: name.trim(),
        jsonUrl: jsonUrl,
        thumb: thumb && thumb.length < 500000 ? thumb : null,
        createdAt: fsMod.serverTimestamp()
      });
      showToast('“' + name.trim() + '” published ✓ — now in the Elements panel for everyone', 6000);
      try { window.LD_loadEditorTemplates(); } catch (e) {}
    } catch (e) {
      console.error('publishElement', e);
      showToast('Publish failed: ' + ((e && e.message) || e), 7000);
    }
  },

  /* insert a published element onto the canvas (everyone) */
  insertElement: async function (id) {
    var ce = (window._editorElements || []).filter(function (t) { return t.id === id; })[0];
    if (!ce) { showToast('Element not found'); return; }
    try {
      if (!ce._data) {
        var r = await fetch(ce.jsonUrl);
        if (!r.ok) throw new Error('fetch ' + r.status);
        ce._data = await r.json();
      }
      fabric.util.enlivenObjects(ce._data.objects || [], function (objs) {
        if (!objs || !objs.length) { showToast('Could not load that element'); return; }
        var g = objs.length > 1 ? new fabric.Group(objs) : objs[0];
        g.set({ left: 200, top: 140, layerName: ce.name || 'Element' });
        g.setCoords();
        fc.add(g).setActiveObject(g);
        fc.renderAll(); saveState();
        showToast((ce.name || 'Element') + ' added');
      });
    } catch (e) {
      console.error('insertElement', e);
      showToast('Could not insert element: ' + e.message);
    }
  },

  /* remove a published element (admin) */
  deleteElement: async function (id) {
    if (!id) return;
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Removing elements is for the LazyDog admin account', 4500);
        return;
      }
      var ce = (window._editorElements || []).filter(function (t) { return t.id === id; })[0];
      if (!confirm('Remove "' + ((ce && ce.name) || id) + '" from the Elements panel for everyone?')) return;
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      await fsMod.deleteDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id));
      try {
        var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
        await stMod.deleteObject(stMod.ref(stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app'), 'editor_templates/' + id + '.json'));
      } catch (e2) {}
      window._editorElements = (window._editorElements || []).filter(function (t) { return t.id !== id; });
      if (window.Editor && Editor._emit) Editor._emit('elements', { count: window._editorElements.length });
      showToast('Element removed ✓');
    } catch (e) {
      console.error('deleteElement', e);
      showToast('Remove failed: ' + ((e && e.message) || e), 6000);
    }
  },

  /* remove a published template (admin) — deletes the Firestore record and
     the JSON in Storage; the panel refreshes for everyone on next load */
  deleteTemplate: async function (id) {
    if (!id) return;
    try {
      var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
      var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({
        apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
        authDomain: 'templatehub-16cd7.firebaseapp.com',
        projectId: 'templatehub-16cd7',
        storageBucket: 'templatehub-16cd7.firebasestorage.app'
      });
      var user = authMod.getAuth(app).currentUser;
      if (!user || LD_ADMIN_EMAILS.indexOf(user.email) === -1) {
        showToast('Removing templates is for the LazyDog admin account', 4500);
        return;
      }
      var tpl = (window._editorTemplates || []).filter(function (t) { return t.id === id; })[0];
      if (!confirm('Remove "' + ((tpl && tpl.name) || id) + '" from the Templates panel for everyone?')) return;
      var fsMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      await fsMod.deleteDoc(fsMod.doc(fsMod.getFirestore(app), 'editor_templates', id));
      /* best effort: the JSON file in Storage (new publishes use <id>.json) */
      try {
        var stMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js');
        await stMod.deleteObject(stMod.ref(stMod.getStorage(app, 'gs://templatehub-16cd7.firebasestorage.app'), 'editor_templates/' + id + '.json'));
      } catch (e2) { /* older records may keep their JSON elsewhere — fine */ }
      window._editorTemplates = (window._editorTemplates || []).filter(function (t) { return t.id !== id; });
      if (window.Editor && Editor._emit) Editor._emit('templates', { count: window._editorTemplates.length });
      showToast('Template removed ✓');
    } catch (e) {
      console.error('deleteTemplate', e);
      showToast('Remove failed: ' + ((e && e.message) || e), 6000);
    }
  }
});

/* ════ 5 · LIVE ACCOUNT — same Firebase auth as the main LazyDog site ════
   Auth state is shared per-origin, so a user signed in on the main pages is
   automatically signed in here too. The avatar in the top bar shows the
   real user; Sign in / Sign out work from the editor itself. */
(function () {
  var FB_CONFIG = {
    apiKey: 'AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes',
    authDomain: 'templatehub-16cd7.firebaseapp.com',
    projectId: 'templatehub-16cd7',
    storageBucket: 'templatehub-16cd7.firebasestorage.app'
  };
  async function fbAuth() {
    var appMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var authMod = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FB_CONFIG);
    return { auth: authMod.getAuth(app), mod: authMod };
  }
  /* watch auth state from boot — picks up an existing main-site session */
  setTimeout(async function () {
    try {
      var A = await fbAuth();
      A.mod.onAuthStateChanged(A.auth, function (u) {
        window._ldUser = u ? { email: u.email, name: u.displayName, photo: u.photoURL } : null;
        if (window.Editor && Editor._emit) Editor._emit('user', window._ldUser);
      });
    } catch (e) { console.warn('auth watcher failed', e); }
  }, 1200);

  Editor._register({
    signIn: async function () {
      try {
        var A = await fbAuth();
        await A.mod.signInWithPopup(A.auth, new A.mod.GoogleAuthProvider());
        showToast('Signed in ✓');
      } catch (e) {
        if (e && /popup-closed/.test(String(e.code))) return;
        console.error('signIn', e);
        showToast('Sign-in failed: ' + ((e && e.message) || e), 6000);
      }
    },
    signOut: async function () {
      try {
        var A = await fbAuth();
        await A.mod.signOut(A.auth);
        showToast('Signed out');
      } catch (e) { showToast('Sign-out failed: ' + ((e && e.message) || e), 5000); }
    }
  });
})();
