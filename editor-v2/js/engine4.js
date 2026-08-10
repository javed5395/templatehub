/* ═══════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — ENGINE STAGE 4 · liveness pass          owner: Fable
   Makes the last 9 commands real: notes, brand, format painter, media,
   rehearse, presenter view, accessibility check, spelling helper.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── speaker notes drawer ── */
(function () {
  var open = false, bar = null, ta = null;
  function build() {
    bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:92px;background:#fff;border-top:1px solid #E4E7EE;box-shadow:0 -6px 18px rgba(15,23,42,0.06);padding:10px 16px;z-index:800;display:none;';
    bar.innerHTML = '<div style="font:700 11.5px \'DM Sans\';color:#9AA3B2;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">Speaker notes — this slide</div>';
    ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;height:64px;border:1px solid #E4E7EE;border-radius:8px;padding:8px 10px;font:13px \'DM Sans\';color:#1F2430;resize:none;outline:none;';
    ta.placeholder = 'Notes only you see while presenting…';
    ta.addEventListener('input', function () { state.notes[state.currentPage] = ta.value; });
    bar.appendChild(ta);
    document.body.appendChild(bar);
  }
  window.ldSyncNotesBoxV2 = function () { if (ta) ta.value = state.notes[state.currentPage] || ''; };
  Editor._register({
    toggleNotes: function () {
      if (!bar) build();
      open = !open;
      bar.style.display = open ? 'block' : 'none';
      if (open) { window.ldSyncNotesBoxV2(); ta.focus(); }
    }
  });
  /* keep in sync on slide change */
  Editor.on('slides', function () { if (open) window.ldSyncNotesBoxV2(); });
})();

/* ── brand kit (stored) + apply ── */
(function () {
  function kit() {
    try { return JSON.parse(localStorage.getItem('ld_v2_brand') || '{}'); } catch (e) { return {}; }
  }
  Editor._register({
    brandApply: function () {
      var k = kit();
      var accent = k.accent || '#7C3AED';
      var n = 0;
      (fc.getObjects() || []).forEach(function (o) {
        if (/text/.test(o.type || '')) return; /* text keeps its colours */
        if (o.isFrame && !o.frameSrc) { o.frameFill = accent; if (typeof refreshFrame === 'function') refreshFrame(o); n++; }
        else if (typeof o.fill === 'string' && !o.isBg && !o._isDrawn) { o.set('fill', accent); n++; }
      });
      fc.renderAll(); saveState();
      showToast(n ? 'Brand colour applied to ' + n + ' object(s)' : 'Nothing on this slide takes the brand colour');
    }
  });
  window.ldBrandSet = function (accent) {
    try { localStorage.setItem('ld_v2_brand', JSON.stringify({ accent: accent })); } catch (e) {}
    showToast('Brand colour saved');
  };
})();

/* ── format painter ── */
(function () {
  var carry = null;
  Editor._register({
    formatPainter: function () {
      var o = fc.getActiveObject();
      if (!o) { showToast('Select the object whose look you want to copy, then press Format painter'); return; }
      if (/text/.test(o.type || '')) {
        carry = { kind: 'text', fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight,
                  fontStyle: o.fontStyle, underline: o.underline, linethrough: o.linethrough,
                  fill: typeof o.fill === 'string' ? o.fill : null, textAlign: o.textAlign,
                  textBackgroundColor: o.textBackgroundColor || '' };
      } else {
        carry = { kind: 'shape', fill: typeof o.fill === 'string' ? o.fill : null,
                  stroke: o.stroke || null, strokeWidth: o.strokeWidth || 0, opacity: o.opacity };
      }
      showToast('Format copied — now click the object to paint it onto (Esc cancels)');
      function apply(ev) {
        var t = ev.target;
        if (!t || t === o) return;
        if (carry.kind === 'text' && /text/.test(t.type || '')) {
          var props = {};
          ['fontFamily','fontSize','fontWeight','fontStyle','underline','linethrough','textAlign','textBackgroundColor'].forEach(function (k) {
            if (carry[k] !== null && carry[k] !== undefined) props[k] = carry[k];
          });
          if (carry.fill) props.fill = carry.fill;
          t.set(props);
          if (t.styles) Object.keys(t.styles).forEach(function (li) { Object.keys(t.styles[li]).forEach(function (ci) { Object.assign(t.styles[li][ci], props); }); });
          if (t.initDimensions) t.initDimensions();
        } else if (carry.kind === 'shape' && !/text/.test(t.type || '')) {
          if (carry.fill) t.set('fill', carry.fill);
          t.set({ stroke: carry.stroke, strokeWidth: carry.strokeWidth, opacity: carry.opacity });
        } else { showToast('Different kind of object — format not applied'); cleanup(); return; }
        t.dirty = true; fc.renderAll(); saveState();
        showToast('Format painted ✓');
        cleanup();
      }
      function esc(e) { if (e.key === 'Escape') cleanup(); }
      function cleanup() {
        fc.off('mouse:down', apply);
        document.removeEventListener('keydown', esc);
        carry = null;
      }
      fc.on('mouse:down', apply);
      document.addEventListener('keydown', esc);
    }
  });
})();

/* ── video & audio ── */
(function () {
  function mediaPick(kind) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = kind === 'video' ? 'video/*' : 'audio/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 24 * 1024 * 1024) { showToast('Keep media under 24 MB'); return; }
      var r = new FileReader();
      r.onload = function () {
        var parts = [
          new fabric.Rect({ left: 0, top: 0, width: 300, height: 180, rx: 12, ry: 12, fill: kind === 'video' ? '#1F2430' : '#EEF2F8', stroke: '#CBD2DE', strokeWidth: 1 }),
          new fabric.Text(kind === 'video' ? 'play_circle' : 'volume_up', {
            left: 118, top: 58, fontSize: 64, fontFamily: 'Material Symbols Outlined',
            fill: kind === 'video' ? '#FFFFFF' : '#2B579A'
          }),
          new fabric.Text(f.name.slice(0, 28), { left: 14, top: 148, fontSize: 14, fontFamily: 'DM Sans', fill: kind === 'video' ? '#CBD2DE' : '#5B6472' })
        ];
        var g = new fabric.Group(parts, { left: 170, top: 140, mediaSrc: r.result, mediaKind: kind });
        fc.add(g).setActiveObject(g);
        fc.renderAll(); saveState();
        showToast((kind === 'video' ? 'Video' : 'Audio') + ' added — double-click to play');
      };
      r.readAsDataURL(f);
    };
    inp.click();
  }
  Editor._register({
    insertVideo: function () { mediaPick('video'); },
    insertAudio: function () { mediaPick('audio'); }
  });
  var t = setInterval(function () {
    if (!window.fc || !fc.on || fc.__v2MediaHooked) { if (window.fc && fc.__v2MediaHooked) clearInterval(t); return; }
    fc.__v2MediaHooked = true; clearInterval(t);
    fc.on('mouse:dblclick', function (opt) {
      var o = opt.target;
      if (o && o.mediaSrc && typeof openMediaPlayer === 'function') openMediaPlayer(o.mediaSrc, o.mediaKind);
    });
  }, 300);
})();

/* ── rehearse timings ── */
Editor._register({
  rehearse: function () {
    captureCurrentPage();
    var times = [], t0 = Date.now(), idx = state.currentPage;
    var hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#23262E;color:#fff;border-radius:10px;padding:10px 18px;z-index:9999;font:600 13px \'DM Sans\';display:flex;gap:16px;align-items:center;';
    var clock = document.createElement('span'); clock.textContent = '0:00';
    var info = document.createElement('span'); info.style.color = '#9AA3B2';
    info.textContent = 'Rehearsing — use the filmstrip to change slides · click Stop when done';
    var stop = document.createElement('button');
    stop.textContent = 'Stop';
    stop.style.cssText = 'background:#DC2626;color:#fff;border:none;border-radius:7px;padding:5px 14px;font:600 12px \'DM Sans\';cursor:pointer;';
    hud.appendChild(clock); hud.appendChild(info); hud.appendChild(stop);
    document.body.appendChild(hud);
    var tick = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    }, 500);
    var lastSwitch = Date.now();
    var off = Editor.on('slides', function (s) {
      if (s.current !== idx) {
        times.push({ slide: idx + 1, secs: Math.round((Date.now() - lastSwitch) / 1000) });
        idx = s.current; lastSwitch = Date.now();
      }
    });
    stop.addEventListener('click', function () {
      times.push({ slide: idx + 1, secs: Math.round((Date.now() - lastSwitch) / 1000) });
      clearInterval(tick); off(); hud.remove();
      var total = Math.round((Date.now() - t0) / 1000);
      alert('Rehearsal — total ' + Math.floor(total / 60) + ':' + ('0' + total % 60).slice(-2) + '\n\n'
        + times.map(function (x) { return 'Slide ' + x.slide + ': ' + x.secs + 's'; }).join('\n'));
    });
  }
});

/* ── presenter view ── */
Editor._register({
  presenterView: function () {
    captureCurrentPage();
    var w = window.open('', 'ldPresenter', 'width=900,height=600');
    if (!w) { showToast('Allow pop-ups to use Presenter view'); return; }
    function paint() {
      var i = state.currentPage;
      var thumb = (state.pages[i] || {}).thumb || '';
      var next = (state.pages[i + 1] || {}).thumb || '';
      var notes = (state.notes[i] || '').replace(/</g, '&lt;');
      w.document.body.innerHTML =
        '<div style="font-family:\'DM Sans\',sans-serif;background:#111;color:#eee;position:fixed;inset:0;padding:18px;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:auto 1fr;gap:14px">'
        + '<div><div style="color:#888;font-size:12px;margin-bottom:6px">CURRENT — slide ' + (i + 1) + ' of ' + state.pages.length + '</div>'
        + (thumb ? '<img src="' + thumb + '" style="width:100%;border-radius:8px">' : '<div style="background:#222;height:220px;border-radius:8px"></div>') + '</div>'
        + '<div><div style="color:#888;font-size:12px;margin-bottom:6px">NEXT</div>'
        + (next ? '<img src="' + next + '" style="width:100%;border-radius:8px;opacity:0.8">' : '<div style="background:#1a1a1a;height:120px;border-radius:8px"></div>') + '</div>'
        + '<div style="grid-column:1/3"><div style="color:#888;font-size:12px;margin-bottom:6px">NOTES</div>'
        + '<div style="font-size:17px;line-height:1.6;white-space:pre-wrap">' + (notes || '<span style=\'color:#666\'>No notes on this slide</span>') + '</div></div>'
        + '</div>';
    }
    paint();
    var off = Editor.on('slides', paint);
    var guard = setInterval(function () { if (w.closed) { off(); clearInterval(guard); } }, 800);
    showToast('Presenter view opened — change slides here, it follows');
  }
});

/* ── accessibility check (contrast + alt text, deck-wide) ── */
Editor._register({
  accessibilityCheck: function () {
    captureCurrentPage();
    function lum(hex) {
      var c = (hex || '#000').replace('#', '');
      if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
      var r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
      [r, g, b] = [r, g, b].map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function ratio(a, b) {
      var l1 = lum(a), l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    var issues = [];
    state.pages.forEach(function (p, i) {
      var json = i === state.currentPage ? fc.toJSON(FABRIC_JSON_PROPS)
        : (typeof p.canvasJSON === 'string' ? JSON.parse(p.canvasJSON) : p.canvasJSON);
      if (!json) return;
      var bg = typeof json.background === 'string' ? json.background : '#FFFFFF';
      (json.objects || []).forEach(function (o) {
        if (/text/.test(o.type || '') && typeof o.fill === 'string' && /^#/.test(o.fill)) {
          var pt = (o.fontSize || 32) / ((fc && fc._pxPerPt) || 2);
          var need = pt >= 18 ? 3 : 4.5;
          var r = ratio(o.fill, bg);
          if (r < need) issues.push('Slide ' + (i + 1) + ': low contrast text “' + String(o.text || '').slice(0, 20) + '…” (' + r.toFixed(1) + ':1, needs ' + need + ':1)');
          if (pt < 12) issues.push('Slide ' + (i + 1) + ': text under 12pt — hard to read when projected');
        }
        if (o.type === 'image' && !(o.altText && String(o.altText).trim())) {
          issues.push('Slide ' + (i + 1) + ': image without alternative text');
        }
      });
    });
    if (!issues.length) alert('Accessibility check ✓\n\nNo contrast, size or alt-text issues found across ' + state.pages.length + ' slide(s).');
    else alert('Accessibility check — ' + issues.length + ' issue(s):\n\n' + issues.slice(0, 20).join('\n') + (issues.length > 20 ? '\n…and ' + (issues.length - 20) + ' more' : ''));
  },
  spellCheck: function () {
    /* browser-powered: all deck text in one spellchecked box; edits write back */
    captureCurrentPage();
    var texts = [];
    (fc.getObjects() || []).forEach(function (o, i) { if (/text/.test(o.type || '')) texts.push({ o: o, i: i }); });
    if (!texts.length) { showToast('No text on this slide'); return; }
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9998;display:grid;place-items:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;padding:20px;width:min(560px,92vw);max-height:80vh;overflow:auto;font-family:\'DM Sans\';';
    box.innerHTML = '<b style="font-size:15px">Spelling — this slide</b><div style="font-size:12px;color:#9AA3B2;margin:4px 0 12px">Red underlines are your browser\'s spell-checker. Fix anything, then Apply.</div>';
    var areas = [];
    texts.forEach(function (t) {
      var ta = document.createElement('textarea');
      ta.value = t.o.text || '';
      ta.spellcheck = true; ta.lang = 'en';
      ta.style.cssText = 'width:100%;min-height:52px;margin-bottom:8px;border:1px solid #E4E7EE;border-radius:8px;padding:8px 10px;font:13px \'DM Sans\';resize:vertical;';
      box.appendChild(ta);
      areas.push(ta);
    });
    var apply = document.createElement('button');
    apply.textContent = 'Apply changes';
    apply.style.cssText = 'background:#7C3AED;color:#fff;border:none;border-radius:8px;padding:9px 18px;font:600 13px \'DM Sans\';cursor:pointer;margin-right:8px;';
    var cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'background:#F1F3F7;color:#1F2430;border:none;border-radius:8px;padding:9px 18px;font:600 13px \'DM Sans\';cursor:pointer;';
    apply.addEventListener('click', function () {
      var changed = 0;
      texts.forEach(function (t, k) {
        if (areas[k].value !== t.o.text) { t.o.set('text', areas[k].value); if (t.o.initDimensions) t.o.initDimensions(); t.o.dirty = true; changed++; }
      });
      if (changed) { fc.renderAll(); saveState(); }
      ov.remove();
      showToast(changed ? changed + ' text box(es) updated ✓' : 'No changes');
    });
    cancel.addEventListener('click', function () { ov.remove(); });
    box.appendChild(apply); box.appendChild(cancel);
    ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  },
  themeFonts: function () { showToast('Every theme card carries its own font pair — pick a theme'); },
  themeColours: function () { showToast('Pick a theme card — colours apply to every slide'); }
});
