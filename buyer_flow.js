/* =============================================================================
 * buyer_flow.js — Lazydog Studio "Prepare my deck for me" buyer flow
 * =============================================================================
 * A self-contained overlay that walks a buyer through:
 *   1. "Want us to prepare this deck for you?"  (Yes / No)
 *   2. Give content — Paste one block  OR  Guided (slide by slide)
 *   3. Fit check — fits / we'll add N slides / too big (+ options)
 *   4. Hand-off — store the fill plan and open the editor
 *
 * Depends on fit_engine.js (window.FitEngine) being loaded first.
 *
 * Usage (from a store page, once you have the deck's map from Firestore
 * kits/{slug}.slots):
 *     FitBuyerFlow.open(mapObject, {
 *        editorUrl: 'editor_opus.html',      // where to send the plan
 *        onSmartSplit: async (plan)=>plan     // optional Claude hook (returns plan)
 *     });
 *
 * The fill plan is saved to localStorage under 'lazydog_fill_plan' and the
 * editor reads it on load (see editor hookup, stage 3).
 * ========================================================================== */
(function (root) {
  'use strict';
  var FE = root.FitEngine;

  var CSS = `
  .lz-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
    background:rgba(15,23,42,.55);backdrop-filter:blur(3px);font-family:'DM Sans',system-ui,sans-serif;}
  .lz-card{background:#fff;border-radius:16px;width:min(680px,94vw);max-height:92vh;overflow:hidden;
    display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.35);}
  .lz-head{padding:18px 22px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;justify-content:space-between;}
  .lz-head h3{margin:0;font-size:17px;font-weight:700;color:#0f172a;}
  .lz-sub{font-size:13px;color:#64748b;margin-top:2px;}
  .lz-x{border:none;background:none;font-size:22px;line-height:1;color:#94a3b8;cursor:pointer;}
  .lz-body{padding:20px 22px;overflow:auto;}
  .lz-foot{padding:16px 22px;border-top:1px solid #eef0f4;display:flex;gap:10px;justify-content:flex-end;}
  .lz-btn{padding:9px 18px;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid transparent;}
  .lz-btn.p{background:#7C3AED;color:#fff;} .lz-btn.p:hover{background:#6D28D9;}
  .lz-btn.o{background:#fff;color:#0f172a;border-color:#cbd5e1;} .lz-btn.o:hover{background:#f4f4f5;}
  .lz-btn:disabled{opacity:.45;cursor:not-allowed;}
  .lz-tabs{display:flex;gap:6px;background:#f4f4f5;border-radius:999px;padding:3px;width:max-content;margin-bottom:14px;}
  .lz-tab{padding:6px 16px;border-radius:999px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;border:none;background:none;}
  .lz-tab.on{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1);}
  .lz-ta{width:100%;min-height:190px;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;font-size:14px;line-height:1.55;resize:vertical;font-family:inherit;}
  .lz-ta:focus{outline:none;border-color:#7C3AED;box-shadow:0 0 0 3px #EDE9FE;}
  .lz-field{margin-bottom:12px;} .lz-field label{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;}
  .lz-field textarea{width:100%;min-height:56px;border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical;}
  .lz-hint{font-size:12px;color:#94a3b8;margin-top:6px;}
  .lz-banner{padding:14px 16px;border-radius:12px;font-size:14px;font-weight:600;margin-bottom:14px;display:flex;gap:10px;align-items:flex-start;}
  .lz-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;}
  .lz-warn{background:#fffbeb;color:#92400e;border:1px solid #fde68a;}
  .lz-bad{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}
  .lz-tbl{width:100%;border-collapse:collapse;font-size:13px;}
  .lz-tbl th,.lz-tbl td{text-align:left;padding:7px 8px;border-bottom:1px solid #f1f5f9;}
  .lz-tbl th{color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.4px;}
  .lz-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;}
  .lz-pill.ok{background:#dcfce7;color:#166534;} .lz-pill.tight{background:#fef9c3;color:#854d0e;}
  .lz-pill.split{background:#e0e7ff;color:#3730a3;} .lz-pill.over{background:#fee2e2;color:#991b1b;}
  .lz-pill.tmpl{background:#f1f5f9;color:#475569;}
  .lz-meter{height:6px;border-radius:3px;background:#eef2f7;overflow:hidden;margin-top:3px;}
  .lz-meter > i{display:block;height:100%;background:#7C3AED;}
  .lz-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:18px;text-align:center;color:#64748b;font-size:13px;cursor:pointer;margin-bottom:14px;transition:all .15s;}
  .lz-drop:hover{border-color:#7C3AED;background:#F5F3FF;}
  .lz-drop.over{border-color:#7C3AED;background:#EDE9FE;}
  .lz-drop.has{border-style:solid;border-color:#10b981;background:#ecfdf5;color:#065f46;font-weight:600;}
  `;

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function injectCSS() {
    if (document.getElementById('lz-flow-css')) return;
    var s = h('style'); s.id = 'lz-flow-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  // Store the buyer-dragged deck (a File/Blob) in IndexedDB so it survives the
  // jump to the editor (localStorage is too small for a 12MB .pptx).
  function idbSet(key, blob) {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('lazydog', 1);
      r.onupgradeneeded = function () { try { r.result.createObjectStore('files'); } catch (e) {} };
      r.onsuccess = function () { try {
        var db = r.result; var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(blob, key);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      } catch (e) { rej(e); } };
      r.onerror = function () { rej(r.error); };
    });
  }

  function open(map, opts) {
    opts = opts || {};
    if (!FE && !opts.fitFn) { alert('No fit source: load fit_engine.js or pass opts.fitFn'); return; }
    injectCSS();
    var deckFile = opts.deckFile || null;   // the .pptx the buyer drags in

    var ov = h('div', 'lz-ov');
    var card = h('div', 'lz-card'); ov.appendChild(card);
    var head = h('div', 'lz-head');
    head.appendChild(h('div', '', '<h3>Prepare this deck for you</h3><div class="lz-sub">' +
      (map.deck || 'Selected design') + ' · ' + (map.slides || map.slots.length) + ' slides</div>'));
    var xBtn = h('button', 'lz-x', '&times;'); head.appendChild(xBtn); card.appendChild(head);
    var body = h('div', 'lz-body'); card.appendChild(body);
    var foot = h('div', 'lz-foot'); card.appendChild(foot);
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    xBtn.onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };

    // content slots (what the guided form asks for)
    var contentSlots = map.slots.filter(function (s) {
      return s.archetype !== 'cover' && s.archetype !== 'closing' && s.archetype !== 'divider';
    });

    // ---------- STEP 1: offer ----------
    function stepOffer() {
      body.innerHTML =
        '<p style="font-size:15px;color:#334155;line-height:1.6;margin:6px 0 4px;">' +
        'You picked <b>' + (map.deck || 'this design') + '</b>. Want us to drop your content into it ' +
        'automatically and open it ready to edit?</p>' +
        '<p class="lz-hint">We keep the design intact. If your content is long, we add matching slides so nothing looks cramped.</p>';
      foot.innerHTML = '';
      var no = h('button', 'lz-btn o', 'No thanks'); no.onclick = close;
      var yes = h('button', 'lz-btn p', 'Yes, prepare it'); yes.onclick = stepContent;
      foot.appendChild(no); foot.appendChild(yes);
    }

    // ---------- STEP 2: content ----------
    var mode = 'paste';
    function stepContent() {
      body.innerHTML = '';

      // ── deck drop zone: buyer drags the selected deck (.pptx) in ──
      var drop = h('div', 'lz-drop');
      var fin = h('input'); fin.type = 'file'; fin.accept = '.pptx,.potx';
      fin.style.display = 'none';
      function renderDrop() {
        drop.innerHTML = '<span>' + (deckFile
          ? ('\u2713 ' + deckFile.name + ' \u2014 design ready')
          : '\u2b06\ufe0f  Drag your selected deck (.pptx) here, or click to choose') + '</span>';
        drop.classList.toggle('has', !!deckFile);
        drop.appendChild(fin);
      }
      function takeFile(f) { if (f && /\.pp[to]x$/i.test(f.name)) { deckFile = f; renderDrop(); } }
      drop.onclick = function () { fin.click(); };
      fin.onchange = function () { takeFile(fin.files[0]); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = function () { drop.classList.remove('over'); };
      drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); takeFile(e.dataTransfer.files[0]); };
      renderDrop();
      body.appendChild(drop);

      var tabs = h('div', 'lz-tabs');
      var tP = h('button', 'lz-tab' + (mode === 'paste' ? ' on' : ''), 'Paste everything');
      var tG = h('button', 'lz-tab' + (mode === 'guided' ? ' on' : ''), 'Guided (slide by slide)');
      tabs.appendChild(tP); tabs.appendChild(tG); body.appendChild(tabs);
      var area = h('div'); body.appendChild(area);

      function renderPaste() {
        mode = 'paste'; tP.className = 'lz-tab on'; tG.className = 'lz-tab';
        area.innerHTML = '';
        var ta = h('textarea', 'lz-ta');
        ta.id = 'lz-paste';
        ta.placeholder = 'Paste your content. Tip: put a short heading line above each section ' +
          '(e.g. "Audience Insights") and we will place it on the matching slide.';
        area.appendChild(ta);
        area.appendChild(h('div', 'lz-hint', 'One block is fine — we split and place it for you.'));
      }
      function renderGuided() {
        mode = 'guided'; tG.className = 'lz-tab on'; tP.className = 'lz-tab';
        area.innerHTML = '';
        contentSlots.forEach(function (s) {
          var f = h('div', 'lz-field');
          f.innerHTML = '<label>Slide ' + s.n + ' — ' + s.title +
            ' <span style="color:#94a3b8;font-weight:400;">(fits ~' + s.capacity_chars + ' chars)</span></label>';
          var t = h('textarea'); t.setAttribute('data-slot', s.n); f.appendChild(t);
          area.appendChild(f);
        });
      }
      tP.onclick = renderPaste; tG.onclick = renderGuided;
      mode === 'guided' ? renderGuided() : renderPaste();

      foot.innerHTML = '';
      var back = h('button', 'lz-btn o', 'Back'); back.onclick = stepOffer;
      var go = h('button', 'lz-btn p', 'Check fit'); go.onclick = function () {
        var content;
        if (mode === 'paste') content = (document.getElementById('lz-paste') || {}).value || '';
        else {
          content = {};
          area.querySelectorAll('textarea[data-slot]').forEach(function (t) {
            if (t.value.trim()) content[t.getAttribute('data-slot')] = t.value;
          });
        }
        if ((typeof content === 'string' && !content.trim()) ||
            (typeof content === 'object' && !Object.keys(content).length)) {
          alert('Please add some content first.'); return;
        }
        stepResult(content);
      };
      foot.appendChild(back); foot.appendChild(go);
    }

    // ---------- STEP 3: result ----------
    async function stepResult(content) {
      var plan = opts.fitFn ? await opts.fitFn(content, 'fit', map) : FE.fit(content, map);
      var cls = plan.verdict === 'fits' ? 'lz-ok' : (plan.verdict === 'fits_with_clones' ? 'lz-warn' : 'lz-bad');
      var icon = plan.verdict === 'fits' ? '✓' : (plan.verdict === 'fits_with_clones' ? '＋' : '!');
      body.innerHTML = '';
      body.appendChild(h('div', 'lz-banner ' + cls,
        '<span style="font-size:18px;">' + icon + '</span><span>' + plan.messages.join(' ') + '</span>'));

      var tbl = h('table', 'lz-tbl');
      tbl.innerHTML = '<thead><tr><th>Slide</th><th>Fill</th><th>Status</th></tr></thead>';
      var tb = h('tbody');
      plan.placements.forEach(function (p) {
        var pct = Math.min(100, Math.round(p.used / p.capacity * 100));
        var pill = p.status === 'split' ? 'split' : (p.status === 'over' ? 'over' : (p.status === 'tight' ? 'tight' : 'ok'));
        var label = p.status === 'split' ? ('+' + p.clones + ' slide' + (p.clones > 1 ? 's' : '')) : p.status;
        var tr = h('tr');
        tr.innerHTML = '<td><b>' + p.n + '</b> ' + p.title + '</td>' +
          '<td>' + p.used + '/' + p.capacity + '<div class="lz-meter"><i style="width:' + pct + '%"></i></div></td>' +
          '<td><span class="lz-pill ' + pill + '">' + label + '</span></td>';
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); body.appendChild(tbl);

      if (plan.unplaced && plan.unplaced.length) {
        body.appendChild(h('div', 'lz-hint',
          plan.unplaced.length + ' piece(s) could not be placed — shorten them or pick a larger deck.'));
      }

      foot.innerHTML = '';
      var back = h('button', 'lz-btn o', 'Edit content'); back.onclick = stepContent;
      foot.appendChild(back);
      if (plan.verdict !== 'too_big') {
        var go = h('button', 'lz-btn p',
          plan.verdict === 'fits_with_clones' ? 'Looks good — add slides & open editor' : 'Looks good — open editor');
        go.onclick = function () { handoff(content, go); };
        foot.appendChild(go);
      } else {
        var alt = h('button', 'lz-btn p', 'Find a larger deck');
        alt.onclick = function () { close(); if (opts.onFindLarger) opts.onFindLarger(plan); };
        foot.appendChild(alt);
      }
    }

    // ---------- STEP 4: hand-off ----------
    async function handoff(content, btn) {
      btn.disabled = true; btn.textContent = 'Preparing…';
      try {
        var plan = opts.fitFn ? await opts.fitFn(content, 'plan', map) : FE.buildFillPlan(content, map);
        // optional Claude smart-split hook (returns a possibly-improved plan)
        if (opts.onSmartSplit) {
          try { plan = (await opts.onSmartSplit(plan, content, map)) || plan; }
          catch (e) { console.warn('smart split skipped:', e); }
        }
        try { localStorage.setItem('lazydog_fill_plan', JSON.stringify(plan)); } catch (e) {}
        if (deckFile) { try { await idbSet('deck_pptx', deckFile); } catch (e) { console.warn('deck stash failed:', e); } }
        if (opts.onReady) opts.onReady(plan);
        if (opts.noRedirect) { btn.disabled = false; btn.textContent = 'Ready \u2713'; return; }

        var url = opts.editorUrl || 'editor_opus.html';
        // A query string can break navigation on file:// — the editor reads the
        // plan from localStorage anyway, so only add ?kit on http(s).
        if (map.slug && /^https?:/.test(location.protocol)) {
          url += (url.indexOf('?') < 0 ? '?' : '&') + 'kit=' + encodeURIComponent(map.slug);
        }
        btn.textContent = 'Opening editor…';
        // Manual fallback if the browser blocks auto-navigation (some file:// setups)
        setTimeout(function () {
          btn.disabled = false; btn.textContent = 'Open editor \u2192';
          btn.onclick = function () { window.location.assign(url); };
        }, 1200);
        window.location.assign(url);
      } catch (e) {
        console.error('prepare failed:', e);
        btn.disabled = false; btn.textContent = 'Try again';
        alert('Could not prepare the deck: ' + (e && e.message ? e.message : e));
      }
    }

    stepOffer();
  }

  root.FitBuyerFlow = { open: open };
})(typeof window !== 'undefined' ? window : this);
