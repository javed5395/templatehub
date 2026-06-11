(function() {

  // ── DOWNLOAD & SHARE PANEL — CSS ──
  var css = document.createElement('style');
  css.textContent = [
    '.nb-dl-panel{display:none;position:fixed;top:72px;right:10px;width:300px;background:#fff;border-radius:16px;box-shadow:0 14px 50px rgba(0,0,0,0.18);z-index:1500;overflow:hidden;font-family:Poppins,sans-serif;}',
    '@keyframes dlIn{from{opacity:0;transform:translateY(-8px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}',
    '.nb-dl-panel.open{display:block;animation:dlIn 0.22s cubic-bezier(0.34,1.56,0.64,1);}',
    'body:not(.light) .nb-dl-panel{background:#0f1030;border:1px solid rgba(255,255,255,0.1);box-shadow:0 14px 50px rgba(0,0,0,0.5);}',
    '.dl-hdr{padding:14px 18px 12px;border-bottom:1px solid rgba(0,0,0,0.08);display:flex;align-items:center;gap:8px;}',
    'body:not(.light) .dl-hdr{border-bottom-color:rgba(255,255,255,0.08);}',
    '.dl-hdr-title{font-size:15px;font-weight:700;color:#1a1a2e;}',
    'body:not(.light) .dl-hdr-title{color:#fff;}',
    '.dl-sec{padding:14px 18px 0;}',
    '.dl-sec-lbl{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;}',
    'body:not(.light) .dl-sec-lbl{color:#8899aa;}',
    '.dl-sel{border:1.5px solid #5b7fff;border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:8px;transition:background 0.15s;}',
    '.dl-sel:hover{background:rgba(91,127,255,0.05);}',
    '.dl-sel-l{display:flex;align-items:center;gap:9px;}',
    '.dl-sel-ico{font-size:18px;}',
    '.dl-sel-nm{font-size:13px;font-weight:700;color:#1a1a2e;display:flex;align-items:center;gap:6px;}',
    'body:not(.light) .dl-sel-nm{color:#fff;}',
    '.dl-sel-ds{font-size:11px;color:#999;}',
    'body:not(.light) .dl-sel-ds{color:#8899aa;}',
    '.dl-badge{background:#5b7fff;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;}',
    '.dl-arrow{color:#aaa;font-size:11px;transition:transform 0.2s;}',
    '.dl-arrow.open{transform:rotate(180deg);}',
    '.dl-fmt-list{display:none;border:1px solid rgba(0,0,0,0.1);border-radius:10px;overflow:hidden;margin-bottom:10px;}',
    'body:not(.light) .dl-fmt-list{border-color:rgba(255,255,255,0.1);}',
    '.dl-fmt-list.open{display:block;}',
    '.dl-fi{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid rgba(0,0,0,0.06);}',
    'body:not(.light) .dl-fi{border-bottom-color:rgba(255,255,255,0.06);}',
    '.dl-fi:last-child{border-bottom:none;}',
    '.dl-fi:hover{background:rgba(91,127,255,0.07);}',
    'body:not(.light) .dl-fi:hover{background:rgba(255,255,255,0.06);}',
    '.dl-fi-ico{font-size:17px;flex-shrink:0;}',
    '.dl-fi-info{flex:1;}',
    '.dl-fi-nm{font-size:13px;font-weight:600;color:#1a1a2e;}',
    'body:not(.light) .dl-fi-nm{color:#fff;}',
    '.dl-fi-sb{font-size:11px;color:#999;}',
    'body:not(.light) .dl-fi-sb{color:#8899aa;}',
    '.dl-fi-ck{color:#5b7fff;font-size:15px;display:none;flex-shrink:0;}',
    '.dl-fi.dl-active .dl-fi-ck{display:block;}',
    '.dl-go{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:Poppins,sans-serif;margin-bottom:14px;box-shadow:0 5px 18px rgba(91,127,255,0.3);transition:opacity 0.2s;}',
    '.dl-go:hover{opacity:0.88;}',
    '.dl-shr{padding:14px 18px 16px;border-top:1px solid rgba(0,0,0,0.08);}',
    'body:not(.light) .dl-shr{border-top-color:rgba(255,255,255,0.08);}',
    '.dl-acc-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:10px;}',
    '.dl-acc-lbl{color:#555;display:flex;align-items:center;gap:5px;}',
    'body:not(.light) .dl-acc-lbl{color:#c8d2dc;}',
    '.dl-acc-can{color:#5b7fff;font-weight:600;}',
    '.dl-cp-btn{width:100%;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#6f2dbd,#b464ff);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:10px;transition:opacity 0.2s;}',
    '.dl-cp-btn:hover{opacity:0.88;}',
    '.dl-cust-wrap{margin-bottom:12px;}',
    '.dl-cust-lbl{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;}',
    'body:not(.light) .dl-cust-lbl{color:#8899aa;}',
    '.dl-cust{display:flex;align-items:center;border:1px solid rgba(0,0,0,0.12);border-radius:9px;overflow:hidden;background:rgba(0,0,0,0.02);}',
    'body:not(.light) .dl-cust{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);}',
    '.dl-cust-pfx{padding:0 3px 0 10px;font-size:10px;color:#999;white-space:nowrap;flex-shrink:0;}',
    'body:not(.light) .dl-cust-pfx{color:#8899aa;}',
    '.dl-cust input{flex:1;border:none;background:none;outline:none;font-size:11px;color:#1a1a2e;font-family:Poppins,sans-serif;padding:9px 4px;min-width:0;}',
    'body:not(.light) .dl-cust input{color:#fff;}',
    '.dl-cust input::placeholder{color:#ccc;}',
    '.dl-cust-sv{background:#5b7fff;color:#fff;border:none;padding:0 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;align-self:stretch;display:flex;align-items:center;flex-shrink:0;}',
    '.dl-soc-row{display:flex;gap:8px;}',
    '.dl-soc{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;text-decoration:none;border:1px solid rgba(0,0,0,0.1);background:rgba(0,0,0,0.03);transition:transform 0.2s;cursor:pointer;flex-shrink:0;}',
    'body:not(.light) .dl-soc{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);}',
    '.dl-soc:hover{transform:scale(1.15);}'
  ].join('');
  document.head.appendChild(css);

  // ── DOWNLOAD & SHARE PANEL — HTML ──
  var panel = document.createElement('div');
  panel.className = 'nb-dl-panel';
  panel.id = 'nbDlPanel';
  panel.innerHTML =
    '<div class="dl-hdr">' +
      '<span style="font-size:20px;">&#x2B07;</span>' +
      '<span class="dl-hdr-title">Download</span>' +
    '</div>' +
    '<div class="dl-sec">' +
      '<div class="dl-sec-lbl">File type</div>' +
      '<div class="dl-sel" onclick="nbToggleFmtList()">' +
        '<div class="dl-sel-l">' +
          '<span class="dl-sel-ico" id="nbSelIco">&#x1F4C4;</span>' +
          '<div>' +
            '<div class="dl-sel-nm"><span id="nbSelNmTxt">PDF</span><span class="dl-badge" id="nbSugBadge">Suggested</span></div>' +
            '<div class="dl-sel-ds" id="nbSelDs">Best for documents and printing</div>' +
          '</div>' +
        '</div>' +
        '<span class="dl-arrow" id="nbFmtArrow">&#x25BE;</span>' +
      '</div>' +
      '<div class="dl-fmt-list" id="nbFmtList">' +
        '<div class="dl-fi dl-active" data-fmt="pdf" data-ico="&#x1F4C4;" data-nm="PDF" data-ds="Best for documents and printing" onclick="nbPickFmt(this)">' +
          '<span class="dl-fi-ico">&#x1F4C4;</span>' +
          '<div class="dl-fi-info"><div class="dl-fi-nm">PDF <span style="font-size:10px;color:#5b7fff;font-weight:700;margin-left:4px;">Suggested</span></div><div class="dl-fi-sb">Best for documents and printing</div></div>' +
          '<span class="dl-fi-ck">&#x2713;</span>' +
        '</div>' +
        '<div class="dl-fi" data-fmt="pptx" data-ico="&#x1F4CA;" data-nm="PPTX" data-ds="Microsoft PowerPoint document" onclick="nbPickFmt(this)">' +
          '<span class="dl-fi-ico">&#x1F4CA;</span>' +
          '<div class="dl-fi-info"><div class="dl-fi-nm">PPTX</div><div class="dl-fi-sb">Microsoft PowerPoint document</div></div>' +
          '<span class="dl-fi-ck">&#x2713;</span>' +
        '</div>' +
        '<div class="dl-fi" data-fmt="png" data-ico="&#x1F5BC;" data-nm="PNG" data-ds="Best for complex images, illustrations" onclick="nbPickFmt(this)">' +
          '<span class="dl-fi-ico">&#x1F5BC;</span>' +
          '<div class="dl-fi-info"><div class="dl-fi-nm">PNG</div><div class="dl-fi-sb">Best for complex images, illustrations</div></div>' +
          '<span class="dl-fi-ck">&#x2713;</span>' +
        '</div>' +
        '<div class="dl-fi" data-fmt="jpg" data-ico="&#x1F4F8;" data-nm="JPG" data-ds="Best for sharing" onclick="nbPickFmt(this)">' +
          '<span class="dl-fi-ico">&#x1F4F8;</span>' +
          '<div class="dl-fi-info"><div class="dl-fi-nm">JPG</div><div class="dl-fi-sb">Best for sharing</div></div>' +
          '<span class="dl-fi-ck">&#x2713;</span>' +
        '</div>' +
      '</div>' +
      '<button class="dl-go" onclick="nbDoDl()">&#x2B07; Download</button>' +
    '</div>' +
    '<div class="dl-shr">' +
      '<div class="dl-sec-lbl">Share</div>' +
      '<div class="dl-acc-row">' +
        '<span class="dl-acc-lbl">&#x1F517; Anyone with the link</span>' +
        '<span class="dl-acc-can">Can view</span>' +
      '</div>' +
      '<button class="dl-cp-btn" id="nbCpBtn" onclick="nbCpLink()">&#x1F517; Copy Link</button>' +
      '<div class="dl-cust-wrap">' +
        '<div class="dl-cust-lbl">Get a custom link</div>' +
        '<div class="dl-cust">' +
          '<span class="dl-cust-pfx">templatehub.com/</span>' +
          '<input type="text" id="nbSlugInput" placeholder="your-custom-link" maxlength="40"/>' +
          '<button class="dl-cust-sv" onclick="nbSvSlug()">Save</button>' +
        '</div>' +
      '</div>' +
      '<div class="dl-soc-row">' +
        '<a class="dl-soc" id="nbSocWa" href="#" target="_blank" title="WhatsApp">&#x1F4AC;</a>' +
        '<a class="dl-soc" id="nbSocTw" href="#" target="_blank" title="X / Twitter" style="font-size:13px;font-weight:800;">X</a>' +
        '<a class="dl-soc" id="nbSocLi" href="#" target="_blank" title="LinkedIn">&#x1F4BC;</a>' +
        '<a class="dl-soc" id="nbSocMail" href="#" title="Email">&#x1F4E7;</a>' +
        '<a class="dl-soc" onclick="nbCpLink();return false;" href="#" title="Copy Link">&#x1F517;</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(panel);

  // ── DOWNLOAD & SHARE PANEL — JS ──
  var _nbDlOpen = false, _nbFmtOpen = false, _nbFmt = 'pdf';

  window.nbToggleDlPanel = function() {
    _nbDlOpen = !_nbDlOpen;
    var p = document.getElementById('nbDlPanel');
    if (p) { p.classList.toggle('open', _nbDlOpen); if (_nbDlOpen) _nbUpdShr(); }
  };

  window.nbToggleFmtList = function() {
    _nbFmtOpen = !_nbFmtOpen;
    var fl = document.getElementById('nbFmtList'), ar = document.getElementById('nbFmtArrow');
    if (fl) fl.classList.toggle('open', _nbFmtOpen);
    if (ar) ar.classList.toggle('open', _nbFmtOpen);
  };

  window.nbPickFmt = function(el) {
    _nbFmt = el.getAttribute('data-fmt');
    var ico = el.getAttribute('data-ico'), nm = el.getAttribute('data-nm'), ds = el.getAttribute('data-ds');
    var si = document.getElementById('nbSelIco'), nt = document.getElementById('nbSelNmTxt'),
        sd = document.getElementById('nbSelDs'), bg = document.getElementById('nbSugBadge');
    if (si) si.innerHTML = ico;
    if (nt) nt.textContent = nm;
    if (sd) sd.textContent = ds;
    if (bg) bg.style.display = (_nbFmt === 'pdf') ? '' : 'none';
    document.querySelectorAll('.dl-fi').forEach(function(i) { i.classList.toggle('dl-active', i === el); });
    _nbFmtOpen = false;
    var fl = document.getElementById('nbFmtList'), ar = document.getElementById('nbFmtArrow');
    if (fl) fl.classList.remove('open');
    if (ar) ar.classList.remove('open');
  };

  window.nbDoDl = function() {
    var fn = (typeof openModal === 'function') ? openModal : null;
    if (_nbFmt === 'pdf') {
      if (fn) fn(true); else alert('Open a template page to download PDF.');
    } else if (_nbFmt === 'pptx') {
      if (fn) fn(false); else alert('Open a template page to download PPTX.');
    } else {
      if (fn) fn(false); else alert('Open a template page to download slides.');
    }
    var p = document.getElementById('nbDlPanel');
    if (p) { p.classList.remove('open'); _nbDlOpen = false; }
  };

  window.nbCpLink = function() {
    var sl = document.getElementById('nbSlugInput'), url = window.location.href;
    if (sl && sl.value.trim()) url = 'https://templatehub.com/' + sl.value.trim().replace(/\s+/g, '-').toLowerCase();
    var doFeedback = function() {
      var b = document.getElementById('nbCpBtn');
      if (b) { var o = b.innerHTML; b.innerHTML = '&#x2713; Copied!'; setTimeout(function() { b.innerHTML = o; }, 2000); }
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(doFeedback).catch(function() {
        var t = document.createElement('textarea'); t.value = url;
        document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
        doFeedback();
      });
    } else {
      var t = document.createElement('textarea'); t.value = url;
      document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
      doFeedback();
    }
  };

  window.nbSvSlug = function() {
    var sl = document.getElementById('nbSlugInput');
    if (!sl || !sl.value.trim()) { alert('Enter a custom link name first.'); return; }
    nbCpLink();
  };

  function _nbUpdShr() {
    var url = encodeURIComponent(window.location.href),
        ttl = encodeURIComponent(document.title || 'Check out this template on TemplateHub!');
    var wa = document.getElementById('nbSocWa'), tw = document.getElementById('nbSocTw'),
        li = document.getElementById('nbSocLi'), ml = document.getElementById('nbSocMail');
    if (wa) wa.href = 'https://wa.me/?text=' + ttl + '%20' + url;
    if (tw) tw.href = 'https://twitter.com/intent/tweet?text=' + ttl + '&url=' + url;
    if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
    if (ml) ml.href = 'mailto:?subject=' + ttl + '&body=' + url;
  }

  // Close panel on outside click
  document.addEventListener('click', function(e) {
    var p = document.getElementById('nbDlPanel'), b = document.getElementById('nbDlBtn');
    if (_nbDlOpen && p && b && !p.contains(e.target) && !b.contains(e.target)) {
      p.classList.remove('open'); _nbDlOpen = false; _nbFmtOpen = false;
      var fl = document.getElementById('nbFmtList'); if (fl) fl.classList.remove('open');
    }
  });

})();
