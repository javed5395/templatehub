/* design_widget.js — "Want us to MAKE a design for you?" card.
   PURPOSE: a NEW-DESIGN ORDER — the search card FINDS existing designs; this
   card COMMISSIONS one.

   ── 2 Aug 2026 — TWIN OF THE SEARCH CARD (Javed) ──────────────────────────
   This card must LOOK like the search card sitting next to it. Two changes,
   and they supersede the 30 Jul "pair layout" note that used to live here:

     1. NO DESCRIPTION BOX. The card's own textarea is gone. On the Hexa page
        Hexa's prompt bar (#promptInput) is still the description; on the store
        pages there is no free-text description at all and the order is built
        from the dropdowns alone.
     2. LABEL ABOVE CONTROL, TWO PER ROW — copied verbatim from
        search_widget.js (.sw-col / #filterBlock / .sw-grid / .sw-field). The
        30 Jul layout put the label BESIDE the control three-to-a-row; that is
        what made this card look foreign and squeezed its dropdowns.

   If you change the look of one card, change the other the same way — they are
   meant to be twins.

   SINGLE-SELECT, NOT MULTI: the search card lets you tick several values
   because searching means "match ANY of these". Ordering means "make me THIS
   one" — one background, one tone, one style. So every field here is a single
   choice, which is also what lets it sit on one line beside its label.

   METADATA: the eight metadata dropdowns are seeded with the curated lists and
   then merged with the LIVE vocabulary from the approved templates in
   Firestore — the same words the search card matches on. It arrives either
   from search_widget.js (window.LDT_SEARCH_VOCAB + 'ldt-vocab-ready') or, on a
   page without the search card, from one read of our own. Nothing here touches
   the private meta codec; that stays server-side.

   ONE CHAIN OF COMMAND: the card only speaks to Hexa (hexaDesign →
   editor?compose). It never calls the composer itself and never calls
   recommend_http — this card ORDERS a design, it does not search for one. */
(function () {

  var META_FIELDS = ['type', 'colorFamily', 'background', 'style', 'industry', 'tone', 'audience', 'bestFor'];

  // same normaliser the search card uses, so both cards speak one dialect
  function norm(s) {
    return String(s || '')
      .replace(/(\d)\s*[x:]\s*(\d)/gi, '$1 $2')
      .toLowerCase().replace(/[_:]/g, ' ').replace(/-/g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function boot() {
    var row = document.getElementById('metaSearchRow');
    if (!row || !row.parentNode) return false;
    if (document.getElementById('designWidget')) return true;

    // Hexa's prompt bar, when present, is the ONE description box on the page.
    var hexaBar = document.getElementById('promptInput');

    var style = document.createElement('style');
    style.textContent = `
      #dwWrap { flex:1 1 0; min-width:0; order:3; margin-top:-70px; align-self:flex-start; }
      @media (max-width:1100px){ #dwWrap { flex:1 1 100%; margin-top:0; } }
      /* 2 Aug 2026 (Javed) — closed height was 64px, so this card showed ONLY its
         title while the fill and search cards each showed a peek of their fields.
         Now all three sit closed at 260px and open to 1300px. If you change one,
         change all three (fill_widget.js, search_widget.js, here). */
      #designWidget { width:100%; background:#fff; overflow:hidden; max-height:260px;
        transition:max-height .45s cubic-bezier(.4,0,.2,1); border-radius:28px;
        box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
        font-family:'Inter','Segoe UI',sans-serif; }
      #designWidget:hover, #designWidget.locked { max-height:1300px; }
      #dwTeaser { padding:15px 24px; color:#1a1a2e; font-size:14px; font-weight:600;
        font-family:'Poppins',sans-serif; position:relative; }
      #dwTeaser small { display:block; color:#6b7280; font-weight:400; font-size:11.5px; margin-top:3px; font-family:'Inter',sans-serif; }
      #dwLockBtn { position:absolute; top:13px; right:18px; background:#F4F6FB; border:1px solid #e5e8f0;
        border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; font-family:'Inter',sans-serif; }
      #dwLockBtn.is-locked { background:rgba(212,175,55,.15); border-color:rgba(212,175,55,.4); color:#8a6d1f; }

      /* ── 2 Aug 2026 — MATCH THE MIDDLE (SEARCH) CARD ───────────────────────
         The "Describe your design" column is GONE, and the fields now copy the
         search card exactly: one #F4F6FB panel, label ABOVE its control, two
         per row. Before this the label sat BESIDE the control three-to-a-row,
         which is why this card looked nothing like its neighbour and squeezed
         its dropdowns. Values below are lifted verbatim from search_widget.js
         (.sw-col / #filterBlock / .sw-grid / .sw-field) so the two stay twins. */
      #designWidget .dw-body { padding:22px 26px 0; background:#F4F6FB; border-top:1px solid #e5e8f0; }
      #designWidget .dw-fields { background:#F4F6FB; border:1px solid #e5e8f0; border-radius:14px; padding:14px;
        display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; }
      #designWidget .dw-pair { display:flex; flex-direction:column; gap:3px; min-width:0; }
      #designWidget .dw-pair label { font-size:10px; color:#6b7280; text-transform:uppercase;
        letter-spacing:.03em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #designWidget .dw-pair select, #designWidget .dw-pair input { width:100%; box-sizing:border-box;
        background:#fff; color:#1a1a2e; border:1px solid #d8dce6; border-radius:10px;
        padding:6px 8px; font-size:12px; font-family:inherit; }
      #designWidget .dw-pair select:focus, #designWidget .dw-pair input:focus { outline:none; border-color:#d4af37; }

      #designWidget .dw-foot { display:flex; align-items:center; gap:12px; flex-wrap:wrap;
        padding:12px 26px 22px; background:#F4F6FB; }
      #designWidget .dw-go { padding:9px 22px; border-radius:30px; border:none;
        background:linear-gradient(135deg,#5b7fff,#b464ff); color:#fff; font-weight:800; cursor:pointer;
        font-size:12.5px; font-family:'Poppins',sans-serif; }
      #designWidget .dw-go:disabled { opacity:.5; cursor:default; }
      #designWidget .dw-clear { background:transparent; border:1px solid #e0a0a0; color:#b23a3a;
        border-radius:20px; padding:5px 13px; font-size:11px; cursor:pointer; font-family:'Inter',sans-serif; }
      #designWidget .dw-note { font-size:11.5px; color:#6b7280; }
      #dwOrderPreview { flex:1 1 100%; font-size:11px; color:#6b7280; line-height:1.5; }
    `;
    document.head.appendChild(style);

    // ── option lists: same wording as the search card ────────────────────────
    function sel(id, label, pairs) {
      var o = '<option value="">Any</option>' + pairs.map(function (p) {
        return '<option value="' + p[0] + '">' + p[1] + '</option>';
      }).join('');
      return '<div class="dw-pair"><label for="dw_' + id + '">' + label + '</label>' +
             '<select id="dw_' + id + '">' + o + '</select></div>';
    }
    function txt(id, label, ph, type) {
      return '<div class="dw-pair"><label for="dw_' + id + '">' + label + '</label>' +
             '<input type="' + (type || 'text') + '" id="dw_' + id + '" placeholder="' + ph + '"/></div>';
    }

    var WEIGHT = [['none','None'],['low','Low'],['medium','Medium'],['medium-high','Medium-High'],
                  ['high','High'],['very-high','Very High']];

    var CONTENT = [['pitch-deck','Pitch Deck'],['media-kit','Media Kit']];

    var TYPE = [['freelancer','Freelancer'],['podcast','Podcast'],['press','Press / PR'],['influencer','Influencer'],
      ['brand','Brand'],['tech','Tech'],['fashion','Fashion'],['ugc','UGC Creator'],['photography','Photography'],
      ['music','Music / Artist'],['sports','Sports'],['food','Food'],['beauty','Beauty'],['travel','Travel'],
      ['corporate','Corporate'],['startup','Startup'],['sales','Sales'],['education','Education'],['nonprofit','Non-profit'],
      ['creative','Creative'],['investment','Investment'],['product-launch','Product Launch'],['partnership','Partnership'],
      ['real-estate','Real Estate'],['healthcare','Healthcare'],['tech-ai','Tech & AI']];

    var COLOR = [['black','Black'],['white','White'],['gray','Gray'],['silver','Silver'],['charcoal','Charcoal'],
      ['beige','Beige'],['neutral','Neutral'],['navy','Navy'],['blue','Blue'],['cyan','Cyan'],['teal','Teal'],['green','Green'],
      ['lime','Lime'],['olive','Olive'],['yellow','Yellow'],['gold','Gold'],['orange','Orange'],['coral','Coral'],
      ['terracotta','Terracotta'],['brown','Brown'],['red','Red'],['burgundy','Burgundy'],['pink','Pink'],['purple','Purple'],
      ['violet','Violet'],['lavender','Lavender'],['warm','Warm Tones'],['cool','Cool Tones'],['pastel','Pastel'],['neon','Neon'],
      ['earth','Earth Tones'],['monochrome','Monochrome'],['dark','Dark'],['light','Light'],['multicolor','Multicolor']];

    var BG = [['dark','Dark'],['light','Light'],['monochrome','Monochrome'],['transparent','Transparent'],
      ['solid','Solid'],['gradient','Gradient'],['mesh-gradient','Mesh Gradient'],['duotone','Duotone'],
      ['color-block','Colour Block'],['metallic','Metallic'],['neon','Neon'],['photo','Photo'],
      ['full-bleed-image','Full-Bleed Image'],['blurred','Blurred'],['bokeh','Bokeh'],['illustration','Illustration'],
      ['watercolor','Watercolour'],['textured','Textured'],['pattern','Pattern'],['paper','Paper'],['organic','Organic'],
      ['grid','Grid'],['geometric','Geometric'],['split-screen','Split Screen'],['framed','Framed'],['abstract','Abstract'],
      ['3d','3D'],['glassmorphism','Glassmorphism']];

    var STYLE = [['minimal','Minimal'],['bold','Bold'],['modern','Modern'],['elegant','Elegant'],
      ['professional','Professional'],['playful','Playful'],['editorial','Editorial'],['corporate','Corporate'],
      ['creative','Creative'],['luxury','Luxury'],['clean','Clean'],['colorful','Colorful'],['vintage','Vintage'],
      ['futuristic','Futuristic']];

    var IND = [['tech','Tech'],['saas','SaaS'],['cybersecurity','Cybersecurity'],['electronics','Electronics'],
      ['gaming','Gaming'],['telecom','Telecom'],['healthcare','Healthcare'],['pharma','Pharma'],['mental-health','Mental Health'],
      ['finance','Finance'],['fintech','FinTech'],['insurance','Insurance'],['accounting','Accounting'],['crypto','Crypto'],
      ['education','Education'],['elearning','E-Learning'],['retail','Retail'],['food','Food'],['fashion','Fashion'],
      ['luxury','Luxury'],['realestate','Real Estate'],['construction','Construction'],['architecture','Architecture'],
      ['home','Home'],['furniture','Furniture'],['travel','Travel'],['sports','Sports'],['events','Events'],['media','Media'],
      ['music','Music'],['film','Film'],['photography','Photography'],['publishing','Publishing'],['art','Art'],
      ['marketing','Marketing'],['pr','Public Relations'],['consulting','Consulting'],['hr','Human Resources'],
      ['recruiting','Recruiting'],['automotive','Automotive'],['manufacturing','Manufacturing'],['logistics','Logistics'],
      ['energy','Energy'],['environment','Environment'],['agriculture','Agriculture'],['pets','Pets'],['parenting','Parenting'],
      ['legal','Legal'],['government','Government'],['nonprofit','Nonprofit'],['religion','Religion'],['general','General'],
      ['other','Other']];

    var TONE = [['professional','Professional'],['friendly','Friendly'],['formal','Formal'],['casual','Casual'],
      ['creative','Creative'],['modern','Modern'],['elegant','Elegant'],['luxury','Luxury'],['minimalist','Minimalist'],
      ['serious','Serious'],['inspirational','Inspirational'],['motivational','Motivational'],['playful','Playful'],
      ['fun','Fun'],['confident','Confident'],['trustworthy','Trustworthy'],['premium','Premium'],['executive','Executive'],
      ['corporate','Corporate'],['bold','Bold']];

    var AUD = [['executives','Executives'],['managers','Managers'],['team-leaders','Team Leaders'],
      ['employees','Employees'],['project-managers','Project Managers'],['product-managers','Product Managers'],
      ['entrepreneurs','Entrepreneurs'],['founders','Founders'],['startups','Startups'],['business-owners','Business Owners'],
      ['investors','Investors'],['vcs','Venture Capitalists'],['sales-teams','Sales Teams'],['marketing-teams','Marketing Teams'],
      ['agencies','Agencies'],['consultants','Consultants'],['freelancers','Freelancers'],['recruiters','Recruiters'],
      ['hr','HR Professionals'],['job-seekers','Job Seekers'],['educators','Educators'],['teachers','Teachers'],
      ['trainers','Trainers'],['students','Students'],['researchers','Researchers'],['academics','Academics'],
      ['healthcare','Healthcare Professionals'],['doctors','Doctors'],['nurses','Nurses'],['engineers','Engineers'],
      ['developers','Developers'],['designers','Designers'],['architects','Architects'],['realtors','Real Estate Agents'],
      ['buyers','Retail Buyers'],['procurement','Procurement Teams'],['customers','Customers'],['clients','Clients'],
      ['nonprofits','Nonprofits'],['government','Government Officials'],['public-sector','Public Sector Professionals'],
      ['media','Media Outlets'],['press','Press'],['editors','Editors'],['influencers','Influencers'],
      ['partners','Brand Partners'],['sponsors','Brand Sponsors']];

    var BEST = [['pitching-investors','Pitching Investors'],['seed-round','Seed Round'],['series-a','Series A'],
      ['series-b','Series B'],['demo-day','Demo Day'],['investor-roadshow','Investor Roadshow'],
      ['accelerator-application','Accelerator Application'],['product-launch','Product Launch'],
      ['brand-campaign-pitches','Brand Campaign Pitches'],['press-kit-distribution','Press Kit Distribution'],
      ['partnership-proposals','Partnership Proposals'],['client-proposals','Client Proposals'],
      ['sales-presentations','Sales Presentations'],['internal-presentations','Internal Presentations'],
      ['team-training','Team Training'],['board-meetings','Board Meetings'],['conference-talk','Conference Talk'],
      ['social-campaign','Social Media Campaigns'],['job-applications','Job Applications'],
      ['portfolio-showcase','Portfolio Showcase']];

    var FIELDS =
      sel('contentType', 'Template type', CONTENT) +
      txt('slides', 'Slides', 'e.g. 15', 'number') +
      sel('aspectRatio', 'Aspect ratio', [['16 9', '16:9']]) +
      sel('type', 'Type', TYPE) +
      sel('industry', 'Industry', IND) +
      sel('formality', 'Formality', [['very high','Very High'],['high','High'],['medium high','Medium-High'],
                                     ['medium','Medium'],['low','Low']]) +
      sel('colorFamily', 'Colour family', COLOR) +
      sel('background', 'Background', BG) +
      sel('style', 'Style', STYLE) +
      sel('tone', 'Tone', TONE) +
      sel('audience', 'Audience', AUD) +
      sel('bestFor', 'Best for', BEST) +
      sel('textWeight', 'Text', WEIGHT) +
      sel('shapeWeight', 'Shapes', WEIGHT) +
      sel('graphWeight', 'Graphs', WEIGHT) +
      sel('emptySpace', 'Empty space', WEIGHT) +
      sel('accent', 'Accent colour', [['gold','Gold'],['blue','Blue'],['teal','Teal'],['purple','Purple'],
                                      ['green','Green'],['red','Red'],['pink','Pink'],['orange','Orange']]) +
      // 2 Aug 2026 — "Image weight" removed (Javed): the search card has no such
      // field, and shapes/graphs/empty space already describe the canvas.
      txt('mockups', 'Mock-up slides', 'e.g. 5 or 20%') +
      txt('ref', 'Past design', 'e.g. design 3 background') +
      txt('inspired', 'Inspired by', 'e.g. the Aurora kit layout');

    var wrap = document.createElement('div');
    wrap.id = 'dwWrap';
    wrap.innerHTML =
      '<div id="designWidget">' +
        '<div id="dwTeaser">🎨 Want us to MAKE a brand-new design for you?' +
          '<button id="dwLockBtn" type="button" title="Lock open">🔓 Lock open</button>' +
          '<small>' + (hexaBar
            ? 'Describe it in the prompt box above — then fill any boxes below for more precision.'
            : 'Hover to open — pick your preferences and Hexa designs it in the LazyDog Designer.') +
          '</small>' +
        '</div>' +
        '<div class="dw-body">' +
          '<div class="dw-fields">' + FIELDS + '</div>' +
        '</div>' +
        '<div class="dw-foot">' +
          '<button class="dw-go" id="dwGo">Make my design →</button>' +
          '<button class="dw-clear" id="dwClear" type="button">Clear all</button>' +
          '<span class="dw-note" id="dwNote"></span>' +
          '<div id="dwOrderPreview"></div>' +
        '</div>' +
      '</div>';
    row.appendChild(wrap);

    // ── METADATA: merge the LIVE vocabulary into the eight metadata dropdowns ─
    // Never wipe a curated list, only ADD words the library actually contains.
    // If the read fails the curated lists stand alone — a metadata outage can
    // never blank a dropdown.
    function mergeVocab(vocab) {
      if (!vocab) return;
      META_FIELDS.forEach(function (field) {
        var el = document.getElementById('dw_' + field);
        if (!el) return;
        var keep = el.value;
        var seen = {}, merged = [];
        Array.prototype.forEach.call(el.options, function (op) {
          if (!op.value) return;                       // the "Any" row is re-added below
          var n = norm(op.value);
          if (n && !seen[n]) { seen[n] = 1; merged.push({ v: op.value, label: op.textContent }); }
        });
        (vocab[field] || []).forEach(function (raw) {
          var n = norm(raw);
          if (n && !seen[n]) {
            seen[n] = 1;
            merged.push({ v: n, label: n.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) });
          }
        });
        if (!merged.length) return;
        merged.sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
        el.innerHTML = '<option value="">Any</option>' + merged.map(function (m) {
          return '<option value="' + m.v + '">' + m.label + '</option>';
        }).join('');
        el.value = keep;
      });
    }

    (function loadVocab() {
      if (window.LDT_SEARCH_VOCAB) { mergeVocab(window.LDT_SEARCH_VOCAB); return; }
      window.addEventListener('ldt-vocab-ready', function () { mergeVocab(window.LDT_SEARCH_VOCAB); });
      setTimeout(function () {
        if (window.LDT_SEARCH_VOCAB) return;
        Promise.all([
          import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
        ]).then(function (m) {
          var A = m[0], F = m[1];
          var app = A.getApps().length ? A.getApp() : A.initializeApp({
            apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
            authDomain: "templatehub-16cd7.firebaseapp.com",
            projectId: "templatehub-16cd7"
          });
          var db = F.getFirestore(app);
          return F.getDocs(F.query(F.collection(db, 'templates'), F.where('status', '==', 'approved')));
        }).then(function (snap) {
          var decks = [];
          snap.forEach(function (d) { decks.push(d.data()); });
          var vocab = {};
          META_FIELDS.forEach(function (field) {
            var set = {};
            decks.forEach(function (d) {
              var vals = Array.isArray(d[field]) ? d[field] : [d[field]];
              vals.forEach(function (v) { if (v) set[norm(v)] = true; });
            });
            vocab[field] = Object.keys(set).sort();
          });
          window.LDT_SEARCH_VOCAB = vocab;
          mergeVocab(vocab);
        }).catch(function (err) {
          console.warn('[LazyDog design card] live vocab unavailable — curated lists in use.', err && err.message);
        });
      }, 2500);
    })();

    // lock toggle (same mechanic as the sibling cards)
    var w = document.getElementById('designWidget');
    document.getElementById('dwLockBtn').addEventListener('click', function (e) {
      e.stopPropagation(); var on = w.classList.toggle('locked'); this.classList.toggle('is-locked', on);
      this.innerHTML = on ? '🔒 Locked' : '🔓 Lock open';
    });

    // ── admin lock (same policy as the fill card; TEST_OPEN opens for tests) ──
    // ── WHO MAY ORDER (2 Aug 2026, Javed) ────────────────────────────────────
    //   not signed in  → nothing. The button stays locked and firestore.rules
    //                    refuses the write even if someone gets past the page.
    //   signed-in free → orders in the BACKGROUND, up to 5 slides. They can
    //                    close the tab; the deck is waiting in My Designs.
    //   paying customer→ same, with their plan's slide count.
    //   admin          → unchanged: opens the Designer immediately, as before.
    var TEST_OPEN = false;
    var isAdmin = TEST_OPEN;
    var currentUser = null;
    var FREE_SLIDES = 5;
    var FB_CONF = { apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
                    authDomain: "templatehub-16cd7.firebaseapp.com",
                    projectId: "templatehub-16cd7" };
    var goBtn = document.getElementById('dwGo'), note = document.getElementById('dwNote');

    function applyAdmin() {
      goBtn.disabled = !(isAdmin || currentUser);
      if (isAdmin) {
        note.textContent = '';
      } else if (currentUser) {
        note.style.color = '';
        note.innerHTML = 'Free plan builds up to ' + FREE_SLIDES + ' slides. Order it and close the tab — ' +
                         'it is built in the background and waits for you in ' +
                         '<a href="my_designs.html">My Designs</a>.';
      } else {
        note.style.color = '#b23a3a';
        note.textContent = '🔒 Sign in to order a design — then you can close the tab while it builds.';
      }
      goBtn.textContent = (isAdmin || !currentUser) ? goBtn.textContent : 'Order this design';
    }

    (function checkAdmin() {
      var ADMINS = ['javed5395@gmail.com', 'lazydogtemplates@gmail.com'];
      Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js')
      ]).then(function (m) {
        var A = m[0], B = m[1];
        var app = A.getApps().length ? A.getApp() : A.initializeApp(FB_CONF);
        B.onAuthStateChanged(B.getAuth(app), function (u) {
          currentUser = u || null;
          isAdmin = TEST_OPEN || !!(u && ADMINS.indexOf(String(u.email || '').toLowerCase()) > -1);
          applyAdmin();
        });
      }).catch(function () { applyAdmin(); });
    })();
    applyAdmin();

    // ── place a background order ─────────────────────────────────────────────
    // The order is a row in `design_orders`, nothing more. on_design_order picks
    // it up server-side, checks the plan itself (the page is never trusted for
    // that), builds the deck and writes the file back onto the row.
    function placeOrder(sentence) {
      var slidesRaw = parseInt((document.getElementById('dw_slides') || {}).value || '', 10);
      var slides = (slidesRaw > 0 && slidesRaw <= 60) ? slidesRaw : FREE_SLIDES;
      goBtn.disabled = true;
      note.style.color = '';
      note.textContent = '⏳ Placing your order…';
      Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
      ]).then(function (m) {
        var A = m[0], F = m[1];
        var app = A.getApps().length ? A.getApp() : A.initializeApp(FB_CONF);
        var db = F.getFirestore(app);
        return F.addDoc(F.collection(db, 'design_orders'), {
          uid:       currentUser.uid,
          email:     String(currentUser.email || ''),
          sentence:  sentence,
          slides:    slides,
          status:    'queued',
          createdAt: F.serverTimestamp(),
          page:      String(location.pathname || '')
        });
      }).then(function () {
        note.style.color = '#1b7f3e';
        note.innerHTML = '✅ Ordered. You can close this tab — it is being built now. ' +
                         'Collect it on <a href="my_designs.html">My Designs</a>.';
        goBtn.disabled = false;
      }).catch(function (e) {
        note.style.color = '#b23a3a';
        note.textContent = 'Could not place the order: ' + (e && e.message ? e.message : e);
        goBtn.disabled = false;
      });
    }

    // ── build ONE order sentence the composer's grammar understands ──────────
    function v(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
    function word(id) { return v(id).replace(/-/g, ' '); }

    // THE description: Hexa's prompt bar, and only that. (2 Aug 2026 — the
    // card's own textarea was removed, so on store pages there is no free-text
    // description at all; the order is built from the dropdowns alone.)
    function description() {
      return hexaBar ? String(hexaBar.value || '').trim() : '';
    }

    function orderSentence() {
      var bits = [];
      var desc = description(); if (desc) bits.push(desc.replace(/[.\s]+$/, ''));

      var ct = word('dw_contentType');
      if (ct && (!desc || desc.toLowerCase().indexOf(ct) === -1)) bits.push('make me a ' + ct);

      var ty = word('dw_type');        if (ty) bits.push(ty);
      var ind = word('dw_industry');   if (ind) bits.push(ind);
      var cf = word('dw_colorFamily'); if (cf) bits.push(cf);
      var bg = word('dw_background');  if (bg) bits.push(bg + ' background');
      var st = word('dw_style');       if (st) bits.push(st);
      var tn = word('dw_tone');        if (tn) bits.push(tn + ' tone');
      var au = word('dw_audience');    if (au) bits.push('for ' + au);
      var bf = word('dw_bestFor');     if (bf) bits.push('best for ' + bf);

      var ac = v('dw_accent');      if (ac) bits.push(ac + ' accents');
      var sl = v('dw_slides');      if (sl) bits.push(sl + ' slides');
      var ar = v('dw_aspectRatio'); if (ar) bits.push(ar.replace(' ', ':'));
      var fo = v('dw_formality');   if (fo) bits.push(fo + ' formality');

      [['dw_textWeight', 'text'], ['dw_shapeWeight', 'shapes'],
       ['dw_graphWeight', 'graphs'], ['dw_emptySpace', 'empty space']].forEach(function (p) {
        var val = word(p[0]);
        if (val) bits.push(val + ' ' + p[1]);
      });

      var mk = v('dw_mockups');
      if (mk) bits.push(/%/.test(mk) ? (mk.replace(/[^\d]/g, '') + '% mockup slides') : (mk.replace(/[^\d]/g, '') + ' mockup slides'));
      var rf = v('dw_ref'); if (rf) bits.push(/design\s*\d/i.test(rf) ? ('use ' + rf.toLowerCase()) : rf);
      var insp = v('dw_inspired'); if (insp) bits.push('inspired by ' + insp);

      return bits.join(', ').slice(0, 600);
    }

    // live preview — you see exactly what Hexa is about to be told
    var preview = document.getElementById('dwOrderPreview');
    function refreshPreview() {
      var s = orderSentence();
      preview.textContent = s ? ('Your order: ' + s) : '';
    }
    wrap.addEventListener('change', refreshPreview);
    wrap.addEventListener('input', refreshPreview);
    if (hexaBar) hexaBar.addEventListener('input', refreshPreview);

    document.getElementById('dwClear').addEventListener('click', function () {
      Array.prototype.forEach.call(wrap.querySelectorAll('#designWidget select, #designWidget input, #designWidget textarea'), function (el) {
        el.value = '';
      });
      refreshPreview();
    });

    goBtn.addEventListener('click', function () {
      var sentence = orderSentence();
      if (!isAdmin) {
        if (!currentUser) {
          note.style.color = '#b23a3a';
          note.textContent = '🔒 Sign in first — then you can order a design and walk away.';
          return;
        }
        if (!sentence || sentence.length < 4) {
          note.style.color = '#b23a3a';
          note.textContent = 'Pick a few preferences first — template type, colour, style…';
          return;
        }
        placeOrder(sentence);
        return;
      }
      if (!sentence || sentence.length < 4) {
        note.textContent = hexaBar
          ? 'Describe your design in the prompt box above, or pick a few preferences.'
          : 'Pick a few preferences first — template type, colour, style…';
        note.style.color = '#b23a3a';
        return;
      }
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
