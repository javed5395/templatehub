/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 5 · opus handoff wiring    owner: Fable
   PowerPoint import (cloud parse, small + big road) + Fill frames.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Shared PPTX-file importer: takes a File, picks the road, loads deck ──
   Small (<18 MB): direct POST to /parse (proxy gate caps both directions at
   32 MB and a parsed reply runs ~1.4× the file — 18 MB keeps replies under).
   Big (≥18 MB): storage road — /upload_url → resumable PUT → /parse{gcsPath}
   (functions live in engine6.js; they exist by click-time).               */
window.ldImportPptxFile = async function (file) {
  if (window.ldBusy) window.ldBusy('upload', true);
  try {
    var deckIR;
    if (file.size >= 18 * 1024 * 1024) {
      if (typeof window.ldBigUploadParse !== 'function')
        throw new Error('Big-file road not loaded — refresh and try again');
      deckIR = await window.ldBigUploadParse(file);
    } else {
      showToast('Parsing PPTX in LazyDog cloud…', 8000);
      if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Parsing PPTX in LazyDog cloud…');
      var buf = await file.arrayBuffer();
      for (var w = 0; w < 10 && !window.LD_AUTH_TOKEN; w++) await new Promise(function (r) { setTimeout(r, 500); });
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timedOut = false;
      var to = ctrl ? setTimeout(function () { timedOut = true; ctrl.abort(); }, 120000) : null;
      var resp;
      try {
        resp = await fetch((window.LD_BACKEND || 'http://localhost:8080') + '/parse', {
          method: 'POST', headers: window.ldHeaders('application/octet-stream'),
          body: buf, signal: ctrl ? ctrl.signal : undefined
        });
      } catch (netErr) {
        if (timedOut || (netErr && netErr.name === 'AbortError'))
          throw new Error('Upload timed out — try a smaller file or stronger connection');
        throw new Error('Could not reach the import service');
      } finally { if (to) clearTimeout(to); }
      if (resp.status === 401 || resp.status === 403) throw new Error('Please sign in first — import needs a designer account');
      if (!resp.ok) {
        var det = ''; try { det = (await resp.text()).slice(0, 200); } catch (e2) {}
        throw new Error('Import service error (' + resp.status + ')' + (det ? ' — ' + det : ''));
      }
      deckIR = await resp.json();
      /* worker may park a heavy IR in Storage and hand back a pointer —
         happens on the direct road too. Unwrap via the range-download
         helper when present, plain fetch otherwise. */
      if (deckIR && deckIR.big === true && deckIR.irUrl) {
        showToast('Finishing up…');
        if (typeof window.ldFetchLargeJson === 'function') {
          if (window.ldDownloadProgress) window.ldDownloadProgress(0);
          var big = await window.ldFetchLargeJson(deckIR.irUrl, function (f) {
            if (window.ldDownloadProgress) window.ldDownloadProgress(f);
          });
          if (window.ldDownloadProgress) window.ldDownloadProgress(null);
          deckIR = big.json;
        } else {
          var r2 = await fetch(deckIR.irUrl);
          if (!r2.ok) throw new Error('IR download ' + r2.status);
          deckIR = await r2.json();
        }
      }
    }
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (!deckIR || !deckIR.slides) throw new Error('The reply was not a deck');
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(true, 'Building slides…');
    window._deckIR = deckIR;
    /* time-box the build: if an asset hangs, reject after 60s so the catch +
       finally below always run and clear the "Building slides…" pill */
    await Promise.race([
      window.loadDeckIRIntoEditor(deckIR),
      new Promise(function (_r, rej) { setTimeout(function () { rej(new Error('Slide build timed out — please try again')); }, 60000); })
    ]);
    var totalEls = deckIR.slides.reduce(function (a, s) { return a + (s.elements || []).length; }, 0);
    if (deckIR.report && deckIR.report.length) {
      showToast('Imported ' + deckIR.slides.length + ' slides / ' + totalEls + ' elements. Notes: '
        + deckIR.report.map(function (r) { return r.kind + ' (slide ' + r.slide + ')'; }).join(', '), 9000);
    } else {
      showToast('Imported ' + deckIR.slides.length + ' slides / ' + totalEls + ' elements — nothing lost', 5000);
    }
    /* background: probe chart-looking pictures against the dissolve
       service; confirmed charts become native editable charts (engine6) */
    try { if (typeof window.ldAutoCrackCharts === 'function') window.ldAutoCrackCharts(); } catch (e) {}
    return true;
  } catch (e) {
    console.error('[v2] pptx import', e);
    showToast('Import failed: ' + e.message, 6000);
    return false;
  } finally {
    if (window.ldParseHeartbeat) window.ldParseHeartbeat(false);
    if (window.ldBusy) window.ldBusy('upload', false);
  }
};

Editor._register({
  importPptx: function () {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (file) window.ldImportPptxFile(file);
    };
    inp.click();
  },

  /* ── Fill empty frames on this slide with picked images, in order ── */
  fillFrames: function () {
    var frames = (fc.getObjects() || []).filter(function (o) { return o.isFrame && !o.frameSrc; });
    if (!frames.length) { showToast('No empty frames on this slide — add frames first (Insert ▸ Frames)'); return; }
    /* left-to-right, top-to-bottom feels natural */
    frames.sort(function (a, b) { return (a.top - b.top) || (a.left - b.left); });
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = function () {
      var files = Array.from(inp.files || []).slice(0, frames.length);
      if (!files.length) return;
      var done = 0;
      files.forEach(function (f, i) {
        var r = new FileReader();
        r.onload = function () {
          var target = frames[i];
          var im = new Image();
          im.onload = function () {
            target._frameImg = im;
            target.frameSrc = r.result;
            /* cover-fit crop rect (v1 maths) */
            var fAR = (target.width * (target.scaleX || 1)) / Math.max(1, target.height * (target.scaleY || 1));
            var iAR = im.width / im.height;
            var fr = { l: 0, t: 0, r: 0, b: 0 };
            if (iAR > fAR) { var ov = (1 - iAR / fAR) / 2; fr.l = ov; fr.r = ov; }
            else if (iAR < fAR) { var o2 = (1 - fAR / iAR) / 2; fr.t = o2; fr.b = o2; }
            target.frameRect = fr;
            if (typeof refreshFrame === 'function') refreshFrame(target);
            if (++done === files.length) {
              fc.renderAll(); saveState();
              showToast(done + ' frame(s) filled ✓' + (frames.length > files.length
                ? ' — ' + (frames.length - files.length) + ' still empty' : ''));
            }
          };
          im.src = r.result;
        };
        r.readAsDataURL(f);
      });
    };
    inp.click();
  }
});
