/* design_widget.js — "Want us to MAKE a design for you?" card (25 Jul 2026).
   Javed's design: sits on the store pages beside the search & fill cards,
   same visual family (white/#F4F6FB two-tone, radius 28, teaser + expand,
   lock button). PURPOSE: a NEW-DESIGN ORDER — the search card FINDS existing
   designs; this card COMMISSIONS one. Same fields as the search card, plus
   "Inspired by" and Javed's mock-up slides rule.
   ONE CHAIN OF COMMAND: the card only speaks to Hexa (hexaDesign →
   editor?compose). It never calls the composer itself. */
(function () {
  function boot() {
    var row = document.getElementById('metaSearchRow');
    if (!row || !row.parentNode) return false;
    if (document.getElementById('designWidget')) return true;

    var style = document.createElement('style');
    style.textContent = `
      #dwWrap { width:100%; margin-top:18px; }
      #designWidget { width:100%; background:#fff; overflow:hidden; max-height:64px;
        transition:max-height .45s cubic-bezier(.4,0,.2,1); border-radius:28px;
        box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
        font-family:'Inter','Segoe UI',sans-serif; }
      #designWidget:hover, #designWidget.locked { max-height:900px; }
      #dwTeaser { padding:16px 26px; color:#1a1a2e; font-size:14px; font-weight:600;
        font-family:'Poppins',sans-serif; position:relative; }
      #dwTeaser small { display:block; color:#6b7280; font-weight:400; font-size:11.5px; margin-top:3px; font-family:'Inter',sans-serif; }
      #dwLockBtn { position:absolute; top:14px; right:20px; background:#F4F6FB; border:1px solid #e5e8f0;
        border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; font-family:'Inter',sans-serif; }
      #dwLockBtn.is-locked { background:rgba(212,175,55,.15); border-color:rgba(212,175,55,.4); color:#8a6d1f; }
      #designWidget .dw-panels { display:grid; grid-template-columns:1fr 1.4fr; align-items:stretch; }
      #designWidget .dw-col { padding:28px 30px; }
      #designWidget .dw-col:nth-child(2){ background:#F4F6FB; border-left:1px solid #e5e8f0; }
      #designWidget h3 { font-size:13px; color:#d4af37; margin:0 0 12px; font-family:'Poppins',sans-serif; }
      #designWidget textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid #d8dce6; border-radius:14px;
        padding:12px; min-height:130px; font-size:12.5px; color:#1a1a2e; font-family:'Inter',sans-serif; line-height:1.6; resize:vertical; }
      #designWidget .dw-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 12px; }
      #designWidget .dw-field { display:flex; flex-direction:column; gap:4px; }
      #designWidget .dw-field.full { grid-column:1 / -1; }
      #designWidget label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.03em; }
      #designWidget select, #designWidget input { background:#fff; color:#1a1a2e; border:1px solid #d8dce6; border-radius:10px;
        padding:6px 8px; font-size:12px; font-family:inherit; }
      #designWidget select[multiple]{ height:54px; }
      #designWidget .dw-go { margin-top:14px; padding:11px 28px; border-radius:30px; border:none;
        background:linear-gradient(135deg,#5b7fff,#b464ff); color:#fff; font-weight:800; cursor:pointer;
        font-size:13px; font-family:'Poppins',sans-serif; }
      #designWidget .dw-go:disabled { opacity:.5; cursor:default; }
      #designWidget .dw-note { margin-top:9px; font-size:11.5px; color:#6b7280; }
    `;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'dwWrap';
    wrap.innerHTML =
      '<div id="designWidget">' +
        '<div id="dwTeaser">🎨 Want us to MAKE a brand-new design for you?' +
          '<button id="dwLockBtn" type="button" title="Lock open">🔓 Lock open</button>' +
          '<small>Hover to open — describe your dream design, set the preferences, and Hexa designs it in the LazyDog Designer.</small>' +
        '</div>' +
        '<div class="dw-panels">' +
          '<div class="dw-col"><h3>💬 Describe your design</h3>' +
            '<textarea id="dwDescribe" placeholder="e.g. luxury fashion media kit, 15 slides, black background, gold accents, editorial layout, inspired by the Aurora Skincare kit, 5 mockup slides..."></textarea>' +
            '<button class="dw-go" id="dwGo">Make my design →</button>' +
            '<div class="dw-note" id="dwNote"></div>' +
          '</div>' +
          '<div class="dw-col"><h3>🎛️ Design preferences</h3>' +
            '<div class="dw-grid">' +
              '<div class="dw-field"><label>Content Type</label><select id="dw_contentType"><option value="">Any</option><option value="media kit">Media Kit</option><option value="pitch deck">Pitch Deck</option><option value="web kit">Web Kit</option><option value="keynote">Digital Keynote</option></select></div>' +
              '<div class="dw-field"><label>No. of Slides</label><input type="number" id="dw_slides" min="2" max="40" placeholder="e.g. 15"/></div>' +
              '<div class="dw-field"><label>Background</label><select id="dw_bg"><option value="">Any</option><option value="black background">Black</option><option value="dark background">Dark</option><option value="navy background">Navy</option><option value="white background">White</option><option value="light background">Light</option><option value="cream background">Cream</option></select></div>' +
              '<div class="dw-field"><label>Accent Colour</label><select id="dw_accent"><option value="">Any</option><option value="gold">Gold</option><option value="blue">Blue</option><option value="teal">Teal</option><option value="purple">Purple</option><option value="green">Green</option><option value="red">Red</option><option value="pink">Pink</option><option value="orange">Orange</option></select></div>' +
              '<div class="dw-field"><label>Industry / Topic</label><select id="dw_industry"><option value="">Any</option><option value="fashion">Fashion & Beauty</option><option value="hospital">Healthcare & Medical</option><option value="fintech">Finance & Fintech</option><option value="tech">Tech & AI</option><option value="education">Education</option><option value="real estate">Real Estate</option><option value="food">Food & Restaurant</option><option value="fitness">Fitness & Wellness</option><option value="travel">Travel</option><option value="legal">Legal</option><option value="construction">Construction</option><option value="energy">Energy</option></select></div>' +
              '<div class="dw-field"><label>Image Weight</label><select id="dw_images"><option value="">Balanced</option><option value="lots of images">Lots of images</option><option value="few images">Few images (text-focus)</option></select></div>' +
              '<div class="dw-field"><label>Mock-up Slides <span title="Ready-to-fill placeholder slides added to your design">ⓘ</span></label><input type="text" id="dw_mockups" placeholder="e.g. 5  or  20%"/></div>' +
              '<div class="dw-field"><label>Use a past design\'s look</label><input type="text" id="dw_ref" placeholder="e.g. design 3 background"/></div>' +
              '<div class="dw-field full"><label>Inspired by / base layout on</label><input type="text" id="dw_inspired" placeholder="e.g. use the layout of the ‘Aurora Skincare’ kit"/></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    row.parentNode.insertBefore(wrap, row.nextSibling);   // full-width strip under the two cards

    // lock toggle (same mechanic as the sibling cards)
    var w = document.getElementById('designWidget');
    document.getElementById('dwLockBtn').addEventListener('click', function (e) {
      e.stopPropagation(); var on = w.classList.toggle('locked'); this.classList.toggle('is-locked', on);
      this.innerHTML = on ? '🔒 Locked' : '🔓 Lock open';
    });

    // ── admin lock (same policy as the fill card; TEST_OPEN opens for tests) ──
    var TEST_OPEN = false;   // flip true during test phase
    var isAdmin = TEST_OPEN;
    var goBtn = document.getElementById('dwGo'), note = document.getElementById('dwNote');
    function applyAdmin() {
      goBtn.disabled = !isAdmin;
      note.textContent = isAdmin ? '' : '🔒 Only the admin can generate new designs for now.';
      note.style.color = isAdmin ? '' : '#b23a3a';
    }
    (function checkAdmin() {
      var ADMINS = ['javed5395@gmail.com', 'lazydogtemplates@gmail.com'];
      Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js')
      ]).then(function (m) {
        var A = m[0], B = m[1];
        var app = A.getApps().length ? A.getApp() : A.initializeApp({ apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain: "templatehub-16cd7.firebaseapp.com", projectId: "templatehub-16cd7" });
        B.onAuthStateChanged(B.getAuth(app), function (u) {
          isAdmin = TEST_OPEN || !!(u && ADMINS.indexOf(String(u.email || '').toLowerCase()) > -1);
          applyAdmin();
        });
      }).catch(function () { applyAdmin(); });
    })();
    applyAdmin();

    // ── build ONE order sentence the composer's grammar understands ──
    function v(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
    function orderSentence() {
      var bits = [];
      var desc = v('dwDescribe'); if (desc) bits.push(desc.replace(/[.\s]+$/, ''));
      var ct = v('dw_contentType'); if (ct && (!desc || desc.toLowerCase().indexOf(ct) === -1)) bits.push('make me a ' + ct);
      var ind = v('dw_industry'); if (ind) bits.push(ind);
      var bg = v('dw_bg'); if (bg) bits.push(bg);
      var ac = v('dw_accent'); if (ac) bits.push(ac);
      var sl = v('dw_slides'); if (sl) bits.push(sl + ' slides');
      var im = v('dw_images'); if (im) bits.push(im);
      var mk = v('dw_mockups');
      if (mk) bits.push(/%/.test(mk) ? (mk.replace(/[^\d]/g, '') + '% mockup slides') : (mk.replace(/[^\d]/g, '') + ' mockup slides'));
      var rf = v('dw_ref'); if (rf) bits.push(/design\s*\d/i.test(rf) ? ('use ' + rf.toLowerCase()) : rf);
      var insp = v('dw_inspired'); if (insp) bits.push('inspired by ' + insp);
      return bits.join(', ').slice(0, 220);
    }

    goBtn.addEventListener('click', function () {
      if (!isAdmin) { alert('Only the admin can generate new designs for now.'); return; }
      var sentence = orderSentence();
      if (!sentence || sentence.length < 4) { note.textContent = 'Describe your design first — a sentence or a few preferences.'; note.style.color = '#b23a3a'; return; }
      // ONE CHAIN OF COMMAND: hand the order to HEXA; Hexa opens the Designer.
      if (window.hexaDesign) {
        var dz = window.hexaDesign(sentence);
        note.style.color = '#1b7f3e';
        note.textContent = '🎨 Hexa is opening the Designer with your order…';
        setTimeout(function () { try { window.location.href = dz.target; } catch (e) {} }, 900);
      } else {
        note.style.color = '#b23a3a';
        note.textContent = "Hexa isn't loaded on this page — refresh and try again (only Hexa may command the Designer).";
      }
    });
    return true;
  }
  var tries = 0, t = setInterval(function () { tries++; if (boot() || tries > 100) clearInterval(t); }, 100);
})();
