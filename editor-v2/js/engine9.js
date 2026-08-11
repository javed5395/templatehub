/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 9 · CONTEXT MENU + FONT GATE + BUSY
   owner: Fable.
   1. Right-click context menu (all v1 rows, all live — the ctx* helpers
      already live in lazydog_renderer.js).
   2. Font policy gate on import: Keep original fonts / Switch to free
      (renderer's ldFontAuditPrompt) + embedded-font registration.
   3. Busy indicator: Upload/Download buttons spin while cloud work runs
      (Editor event 'busy' → ribbon), plus a parse heartbeat pill so heavy
      decks always show life.
   ═══════════════════════════════════════════════════════════════════════ */

/* ════ 1 · RIGHT-CLICK CONTEXT MENU ════ */
(function () {
  var MENU_HTML =
    '<button class="ctx-item" data-ctx="copy"><span class="ctx-item-left"><span class="material-icons-outlined">content_copy</span>Copy</span><span class="ctx-shortcut">Ctrl+C</span></button>'
  + '<button class="ctx-item" data-ctx="paste"><span class="ctx-item-left"><span class="material-icons-outlined">content_paste</span>Paste</span><span class="ctx-shortcut">Ctrl+V</span></button>'
  + '<button class="ctx-item" data-ctx="duplicate"><span class="ctx-item-left"><span class="material-icons-outlined">library_add</span>Duplicate</span><span class="ctx-shortcut">Ctrl+D</span></button>'
  + '<button class="ctx-item" data-ctx="delete"><span class="ctx-item-left"><span class="material-icons-outlined">delete</span>Delete</span><span class="ctx-shortcut">Delete</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="align"><span class="ctx-item-left"><span class="material-icons-outlined">format_align_center</span>Align to page</span></button>'
  + '<button class="ctx-item" data-ctx="lock"><span class="ctx-item-left"><span class="material-icons-outlined">lock</span>Lock</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="alttext"><span class="ctx-item-left"><span class="material-icons-outlined">accessible</span>Alternative text</span></button>'
  + '<button class="ctx-item" data-ctx="setbg"><span class="ctx-item-left"><span class="material-icons-outlined">image</span>Set image as background</span></button>'
  + '<button class="ctx-item" data-ctx="applycolor"><span class="ctx-item-left"><span class="material-icons-outlined">palette</span>Apply colour to page</span></button>'
  + '<button class="ctx-item" data-ctx="trim"><span class="ctx-item-left"><span class="material-icons-outlined">content_cut</span>Trim to slide</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="master"><span class="ctx-item-left"><span class="material-icons-outlined">layers</span>Show on all slides</span></button>'
  + '<button class="ctx-item" data-ctx="unmaster"><span class="ctx-item-left"><span class="material-icons-outlined">layers_clear</span>Remove from all slides</span></button>'
  + '<div class="ctx-divider"></div>'
  + '<button class="ctx-item" data-ctx="info"><span class="ctx-item-left"><span class="material-icons-outlined">info</span>Info</span></button>';

  function ctxDuplicateV2() {
    var o = fc && fc.getActiveObject();
    if (o) { o.clone(function (c) { c.set({ left: o.left + 20, top: o.top + 20 }); fc.add(c); fc.setActiveObject(c); fc.renderAll(); saveState(); }); }
  }
  function ctxDeleteV2() {
    var o = fc && fc.getActiveObject();
    if (o) { fc.remove(o); fc.discardActiveObject(); fc.renderAll(); saveState(); }
  }

  function mount() {
    var area = document.getElementById('canvas-area');
    if (!area) { setTimeout(mount, 400); return; }
    var m = document.createElement('div');
    m.className = 'ctx-menu';
    m.id = 'ctx-menu';
    m.innerHTML = MENU_HTML;
    document.body.appendChild(m);

    area.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      /* master copies are unselectable — remember which sits under the
         pointer so "Remove from all slides" can find it (v1 audit 46) */
      window._ctxMaster = null;
      try {
        if (window.fc) {
          var pt = fc.getPointer(e);
          var fpt = new fabric.Point(pt.x, pt.y);
          (fc.getObjects() || []).forEach(function (o) {
            if (o.ldMasterId && o.containsPoint && o.containsPoint(fpt)) window._ctxMaster = o;
          });
        }
      } catch (err) {}
      /* Lock row is a toggle — read the target's real state (v1 audit 44) */
      try {
        var lockBtn = m.querySelector('[data-ctx="lock"] .ctx-item-left');
        if (lockBtn) {
          var ao = window.fc && fc.getActiveObject();
          var lk = !!(ao && ao.lockMovementX);
          lockBtn.innerHTML = '<span class="material-icons-outlined">' + (lk ? 'lock_open' : 'lock')
            + '</span>' + (lk ? 'Unlock' : 'Lock');
        }
      } catch (err2) {}
      m.style.left = Math.min(e.clientX, window.innerWidth - 260) + 'px';
      m.style.top = Math.min(e.clientY, window.innerHeight - 420) + 'px';
      m.classList.add('open');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#ctx-menu')) m.classList.remove('open');
    });
    m.addEventListener('click', function (e) {
      var item = e.target.closest('[data-ctx]');
      if (!item) return;
      switch (item.dataset.ctx) {
        case 'copy':       if (typeof ctxCopy === 'function') ctxCopy(); break;
        case 'paste':      if (typeof ctxPaste === 'function') ctxPaste(); break;
        case 'duplicate':  ctxDuplicateV2(); break;
        case 'delete':     ctxDeleteV2(); break;
        case 'align':      if (typeof ctxAlign === 'function') ctxAlign(); break;
        case 'lock':       if (typeof ctxLock === 'function') ctxLock(); break;
        case 'alttext':    if (typeof ctxAltText === 'function') ctxAltText(); break;
        case 'setbg':      if (typeof ctxSetBg === 'function') ctxSetBg(); break;
        case 'applycolor': if (typeof ctxApplyColor === 'function') ctxApplyColor(); break;
        case 'trim':       if (typeof ctxTrimToSlide === 'function') ctxTrimToSlide(); break;
        case 'master':     if (typeof ctxMasterAdd === 'function') ctxMasterAdd(); break;
        case 'unmaster':   if (typeof ctxMasterRemove === 'function') ctxMasterRemove(); break;
        case 'info':       if (typeof ctxInfo === 'function') ctxInfo(); break;
      }
      m.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') m.classList.remove('open');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

/* ════ 2 · FONT POLICY GATE (Javed's rule, verbatim v1 wrapper) ════
   RED LINE: engine-made designs use FREE fonts only. IMPORTED files may
   carry commercial fonts — the client's right. On import, any font not in
   the free library raises the renderer's alarm:
   · Keep original  → names untouched, export unchanged.
   · Switch to free → every non-library font permanently rewritten. */
(function () {
  function ldRegisterEmbedded(deck) {
    return new Promise(function (res) {
      window._ldEmbeddedFams = {};
      if (!deck || !deck.embeddedFonts || !window.FontFace) { res(); return; }
      var todo = deck.embeddedFonts.filter(function (ef) { return ef.ttfB64; });
      if (!todo.length) { res(); return; }
      var left = todo.length;
      todo.forEach(async function (ef) {
        try {
          var _fsrc;
          if (String(ef.ttfB64).indexOf('gcsb64:') === 0) {
            try { var _fr = await fetch(ef.ttfB64.slice(7)); if (!_fr.ok) throw new Error(_fr.status); _fsrc = await _fr.arrayBuffer(); }
            catch (_fe) { _fsrc = 'url(' + ef.ttfB64.slice(7) + ')'; }
          } else {
            var fbin = atob(ef.ttfB64), fbuf = new Uint8Array(fbin.length);
            for (var i = 0; i < fbin.length; i++) fbuf[i] = fbin.charCodeAt(i);
            _fsrc = fbuf.buffer;
          }
          var face = new FontFace(ef.family, _fsrc, {
            weight: /bold/i.test(ef.style) ? 'bold' : 'normal',
            style: /italic/i.test(ef.style) ? 'italic' : 'normal' });
          face.load().then(function (f2) { document.fonts.add(f2); window._ldEmbeddedFams[ef.family.toLowerCase()] = 1; })
            .catch(function () {}).finally(function () { if (--left <= 0) res(); });
        } catch (e) { if (--left <= 0) res(); }
      });
      setTimeout(function () { res(); }, 4000);
    });
  }
  function wrapLoader() {
    if (!window.loadDeckIRIntoEditor) { setTimeout(wrapLoader, 400); return; }
    if (window.loadDeckIRIntoEditor.__ldFontWrapped) return;
    var orig = window.loadDeckIRIntoEditor;
    var wrapped = async function (deck) {
      try {
        await ldRegisterEmbedded(deck);
        if (typeof ldFontAuditPrompt === 'function') await ldFontAuditPrompt(deck);
      } catch (e) { console.warn('font gate skipped', e); }
      return orig(deck);
    };
    wrapped.__ldFontWrapped = true;
    window.loadDeckIRIntoEditor = wrapped;
  }
  wrapLoader();
})();

/* ════ 3 · BUSY INDICATOR + PARSE HEARTBEAT ════ */
window.ldBusy = function (kind, on) {
  try { if (window.Editor && Editor._emit) Editor._emit('busy', { kind: kind, on: !!on }); } catch (e) {}
};
/* heartbeat pill for the long cloud-parse stage — updates every second so a
   heavy deck NEVER looks dead */
var _ldHeart = null;
window.ldParseHeartbeat = function (on, label) {
  var id = 'ld-parse-heart';
  if (!on) {
    if (_ldHeart) { clearInterval(_ldHeart); _ldHeart = null; }
    var ex = document.getElementById(id);
    if (ex) ex.remove();
    return;
  }
  var t0 = Date.now();
  var el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:99999;background:#0F172A;color:#fff;padding:10px 18px;border-radius:10px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);min-width:250px;text-align:center;';
    document.body.appendChild(el);
  }
  function tick() {
    var s = Math.round((Date.now() - t0) / 1000);
    var m = Math.floor(s / 60);
    el.innerHTML = (label || 'Working in LazyDog cloud…') + ' <span style="color:#C4B5FD">'
      + (m ? m + 'm ' : '') + (s % 60) + 's</span>'
      + '<div style="height:4px;border-radius:2px;margin-top:7px;background:linear-gradient(90deg,#7C3AED 30%,rgba(255,255,255,.15) 30%);background-size:200% 100%;animation:ldslide 1.2s linear infinite;"></div>';
  }
  tick();
  if (_ldHeart) clearInterval(_ldHeart);
  _ldHeart = setInterval(tick, 1000);
};
(function () {
  var st = document.createElement('style');
  st.textContent = '@keyframes ldslide { from { background-position: 0 0; } to { background-position: -200% 0; } }';
  document.head.appendChild(st);
})();
