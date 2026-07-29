/* design_widget.js — "Want us to MAKE a design for you?" card.
   Javed's design: sits on the store pages beside the search & fill cards,
   same visual family (white/#F4F6FB two-tone, radius 28, teaser + expand,
   lock button). PURPOSE: a NEW-DESIGN ORDER — the search card FINDS existing
   designs; this card COMMISSIONS one.

   ── 30 Jul 2026 — FIELD PARITY + METADATA ─────────────────────────────────
   Owner's rule: the two cards now carry the SAME field set. The only
   difference is the description box — the SEARCH card has none, the GENERATE
   card does.

       SEARCH card   = fields
       GENERATE card = fields + description box

   METADATA: every multi-select below is seeded with the curated option list
   AND then merged with the LIVE vocabulary built from the approved templates
   in Firestore — the exact same words the search card matches against. The
   vocab arrives one of two ways:
     1. search_widget.js is on the page → it publishes window.LDT_SEARCH_VOCAB
        and fires 'ldt-vocab-ready'. We reuse it. No second Firestore read.
     2. this card is alone on the page (e.g. Hexa_Promptbox.html) → we read the
        approved templates ourselves, once, after a short grace period.
   Either way the words the buyer picks here are words the system actually
   knows, so the composer is never handed vocabulary the library has never
   seen. Nothing here touches the private meta codec — that stays server-side,
   exactly where it was.

   ONE CHAIN OF COMMAND is unchanged: the card only speaks to Hexa
   (hexaDesign → editor?compose). It never calls the composer itself, and it
   never calls recommend_http — this card ORDERS a design, it does not search
   for one. */
(function () {

  // ── the eight metadata fields the search card matches on ──────────────────
  var META_MULTI = ['type', 'colorFamily', 'background', 'style', 'industry', 'tone', 'audience', 'bestFor'];

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

    var style = document.createElement('style');
    style.textContent = `
      /* 30 Jul 2026 — the card moved UP into #metaSearchRow as the third of
         three equal cards (it used to be a full-width strip slung underneath).
         On a page with no flex row around it (the Hexa prompt page mounts it
         inside a plain aside) these flex properties are simply ignored and the
         card falls back to full width, which is what that layout wants. */
      #dwWrap { flex:1 1 0; min-width:0; order:3; margin-top:-70px; align-self:flex-start; }
      @media (max-width:1100px){ #dwWrap { flex:1 1 100%; margin-top:0; } }
      #designWidget { width:100%; background:#fff; overflow:hidden; max-height:64px;
        transition:max-height .45s cubic-bezier(.4,0,.2,1); border-radius:28px;
        box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
        font-family:'Inter','Segoe UI',sans-serif; }
      #designWidget:hover, #designWidget.locked { max-height:1500px; }
      #dwTeaser { padding:16px 26px; color:#1a1a2e; font-size:14px; font-weight:600;
        font-family:'Poppins',sans-serif; position:relative; }
      #dwTeaser small { display:block; color:#6b7280; font-weight:400; font-size:11.5px; margin-top:3px; font-family:'Inter',sans-serif; }
      #dwLockBtn { position:absolute; top:14px; right:20px; background:#F4F6FB; border:1px solid #e5e8f0;
        border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; font-family:'Inter',sans-serif; }
      #dwLockBtn.is-locked { background:rgba(212,175,55,.15); border-color:rgba(212,175,55,.4); color:#8a6d1f; }
      /* auto-fit everywhere: this card is a third of a row on the store pages
         and a narrow aside on the Hexa page, so it must choose its own column
         count from the width it is handed rather than from the viewport. */
      #designWidget .dw-panels { display:grid; grid-template-columns:repeat(auto-fit,minmax(255px,1fr)); align-items:stretch; }
      #designWidget .dw-col { padding:22px 20px; min-width:0; }
      #designWidget .dw-col:nth-child(2){ background:#F4F6FB; border-left:1px solid #e5e8f0; }
      #designWidget h3 { font-size:13px; color:#d4af37; margin:0 0 12px; font-family:'Poppins',sans-serif; }
      #designWidget h4 { font-size:10px; color:#9aa1ad; margin:14px 0 2px; text-transform:uppercase;
        letter-spacing:.06em; font-family:'Inter',sans-serif; font-weight:700; grid-column:1 / -1; }
      #designWidget h4:first-child { margin-top:0; }
      #designWidget textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid #d8dce6; border-radius:14px;
        padding:12px; min-height:150px; font-size:12.5px; color:#1a1a2e; font-family:'Inter',sans-serif; line-height:1.6; resize:vertical; }
      #designWidget .dw-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(116px,1fr)); gap:9px 12px; }
      #designWidget .dw-field { display:flex; flex-direction:column; gap:4px; min-width:0; }
      #designWidget .dw-field.full { grid-column:1 / -1; }
      #designWidget label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.03em; }
      #designWidget select, #designWidget input { background:#fff; color:#1a1a2e; border:1px solid #d8dce6; border-radius:10px;
        padding:6px 8px; font-size:12px; font-family:inherit; width:100%; box-sizing:border-box; }
      #designWidget select[multiple]{ height:66px; }
      #designWidget .dw-go { margin-top:14px; padding:11px 28px; border-radius:30px; border:none;
        background:linear-gradient(135deg,#5b7fff,#b464ff); color:#fff; font-weight:800; cursor:pointer;
        font-size:13px; font-family:'Poppins',sans-serif; }
      #designWidget .dw-go:disabled { opacity:.5; cursor:default; }
      #designWidget .dw-note { margin-top:9px; font-size:11.5px; color:#6b7280; }
      #designWidget .dw-clear { margin-top:12px; background:transparent; border:1px solid #e0a0a0; color:#b23a3a;
        border-radius:20px; padding:5px 14px; font-size:11px; cursor:pointer; font-family:'Inter',sans-serif; }
      #dwOrderPreview { margin-top:10px; font-size:11px; color:#6b7280; line-height:1.5;
        background:#F4F6FB; border:1px solid #e5e8f0; border-radius:12px; padding:8px 10px; display:none; }
      @media (max-width:900px){
        #designWidget .dw-col:nth-child(2){ border-left:none; border-top:1px solid #e5e8f0; }
      }
    `;
    document.head.appendChild(style);

    // ── option lists: identical wording to the search card ───────────────────
    function opts(pairs) {
      return pairs.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
    }
    var WEIGHTS = '<option value="">Any</option><option value="none">None</option><option value="low">Low</option>' +
                  '<option value="medium">Medium</option><option value="medium-high">Medium-High</option>' +
                  '<option value="high">High</option><option value="very-high">Very High</option>';

    var TYPE_OPTS = opts([['freelancer','Freelancer'],['podcast','Podcast'],['press','Press / PR'],['influencer','Influencer'],
      ['brand','Brand'],['tech','Tech'],['fashion','Fashion'],['ugc','UGC Creator'],['photography','Photography'],
      ['music','Music / Artist'],['sports','Sports'],['food','Food'],['beauty','Beauty'],['travel','Travel'],
      ['corporate','Corporate'],['startup','Startup'],['sales','Sales'],['education','Education'],['nonprofit','Non-profit'],
      ['creative','Creative'],['investment','Investment'],['product-launch','Product Launch'],['partnership','Partnership'],
      ['real-estate','Real Estate'],['healthcare','Healthcare'],['tech-ai','Tech & AI']]);

    var COLOR_OPTS = opts([['black','Black'],['white','White'],['gray','Gray'],['silver','Silver'],['charcoal','Charcoal'],
      ['beige','Beige'],['neutral','Neutral'],['navy','Navy'],['blue','Blue'],['cyan','Cyan'],['teal','Teal'],['green','Green'],
      ['lime','Lime'],['olive','Olive'],['yellow','Yellow'],['gold','Gold'],['orange','Orange'],['coral','Coral'],
      ['terracotta','Terracotta'],['brown','Brown'],['red','Red'],['burgundy','Burgundy'],['pink','Pink'],['purple','Purple'],
      ['violet','Violet'],['lavender','Lavender'],['warm','Warm Tones'],['cool','Cool Tones'],['pastel','Pastel'],['neon','Neon'],
      ['earth','Earth Tones'],['monochrome','Monochrome'],['dark','Dark'],['light','Light'],['multicolor','Multicolor']]);

    var BG_OPTS = opts([['dark','Dark'],['light','Light'],['monochrome','Monochrome'],['transparent','Transparent'],
      ['solid','Solid'],['gradient','Gradient'],['mesh-gradient','Mesh Gradient'],['duotone','Duotone'],
      ['color-block','Colour Block'],['metallic','Metallic'],['neon','Neon'],['photo','Photo'],
      ['full-bleed-image','Full-Bleed Image'],['blurred','Blurred'],['bokeh','Bokeh'],['illustration','Illustration'],
      ['watercolor','Watercolour'],['textured','Textured'],['pattern','Pattern'],['paper','Paper'],['organic','Organic'],
      ['grid','Grid'],['geometric','Geometric'],['split-screen','Split Screen'],['framed','Framed'],['abstract','Abstract'],
      ['3d','3D'],['glassmorphism','Glassmorphism']]);

    var STYLE_OPTS = opts([['minimal','Minimal'],['bold','Bold'],['modern','Modern'],['elegant','Elegant'],
      ['professional','Professional'],['playful','Playful'],['editorial','Editorial'],['corporate','Corporate'],
      ['creative','Creative'],['luxury','Luxury'],['clean','Clean'],['colorful','Colorful'],['vintage','Vintage'],
      ['futuristic','Futuristic']]);

    var IND_OPTS = opts([['tech','Tech'],['saas','SaaS'],['cybersecurity','Cybersecurity'],['electronics','Electronics'],
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
      ['other','Other']]);

    var TONE_OPTS = opts([['professional','Professional'],['friendly','Friendly'],['formal','Formal'],['casual','Casual'],
      ['creative','Creative'],['modern','Modern'],['elegant','Elegant'],['luxury','Luxury'],['minimalist','Minimalist'],
      ['serious','Serious'],['inspirational','Inspirational'],['motivational','Motivational'],['playful','Playful'],
      ['fun','Fun'],['confident','Confident'],['trustworthy','Trustworthy'],['premium','Premium'],['executive','Executive'],
      ['corporate','Corporate'],['bold','Bold']]);

    var AUD_OPTS = opts([['executives','Executives'],['managers','Managers'],['team-leaders','Team Leaders'],
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
      ['partners','Brand Partners'],['sponsors','Brand Sponsors']]);

    var BEST_OPTS = opts([['pitching-investors','Pitching Investors'],['seed-round','Seed Round'],['series-a','Series A'],
      ['series-b','Series B'],['demo-day','Demo Day'],['investor-roadshow','Investor Roadshow'],
      ['accelerator-application','Accelerator Application'],['product-launch','Product Launch'],
      ['brand-campaign-pitches','Brand Campaign Pitches'],['press-kit-distribution','Press Kit Distribution'],
      ['partnership-proposals','Partnership Proposals'],['client-proposals','Client Proposals'],
      ['sales-presentations','Sales Presentations'],['internal-presentations','Internal Presentations'],
      ['team-training','Team Training'],['board-meetings','Board Meetings'],['conference-talk','Conference Talk'],
      ['social-campaign','Social Media Campaigns'],['job-applications','Job Applications'],
      ['portfolio-showcase','Portfolio Showcase']]);

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
            '<div id="dwOrderPreview"></div>' +
          '</div>' +
          '<div class="dw-col"><h3>🎛️ Design preferences <span style="color:#9aa1ad;font-weight:400;font-size:11px;">— the same fields the search card uses</span></h3>' +
            '<div class="dw-grid">' +

              '<h4>The basics</h4>' +
              '<div class="dw-field"><label>Template Type</label><select id="dw_contentType"><option value="">Any</option>' +
                '<option value="pitch-deck">Pitch Deck</option><option value="media-kit">Media Kit</option></select></div>' +
              '<div class="dw-field"><label>No. of Slides</label><input type="number" id="dw_slides" min="2" max="40" placeholder="e.g. 15"/></div>' +
              '<div class="dw-field"><label>Aspect Ratio</label><select id="dw_aspectRatio"><option value="">Any</option>' +
                '<option value="16 9">16:9</option></select></div>' +
              '<div class="dw-field"><label>Formality</label><select id="dw_formality"><option value="">Any</option>' +
                '<option value="very high">Very High</option><option value="high">High</option>' +
                '<option value="medium high">Medium-High</option><option value="medium">Medium</option>' +
                '<option value="low">Low</option></select></div>' +
              '<div class="dw-field"><label>Type</label><select id="dw_type" multiple>' + TYPE_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Industry</label><select id="dw_industry" multiple>' + IND_OPTS + '</select></div>' +

              '<h4>Look &amp; feel</h4>' +
              '<div class="dw-field"><label>Color Family</label><select id="dw_colorFamily" multiple>' + COLOR_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Background</label><select id="dw_background" multiple>' + BG_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Style</label><select id="dw_style" multiple>' + STYLE_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Tone</label><select id="dw_tone" multiple>' + TONE_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Audience</label><select id="dw_audience" multiple>' + AUD_OPTS + '</select></div>' +
              '<div class="dw-field"><label>Best For</label><select id="dw_bestFor" multiple>' + BEST_OPTS + '</select></div>' +

              '<h4>Canvas balance <span style="text-transform:none;letter-spacing:0;font-weight:400;">— how much of each slide is what</span></h4>' +
              '<div class="dw-field"><label>Text</label><select id="dw_textWeight">' + WEIGHTS + '</select></div>' +
              '<div class="dw-field"><label>Shapes</label><select id="dw_shapeWeight">' + WEIGHTS + '</select></div>' +
              '<div class="dw-field"><label>Graphs</label><select id="dw_graphWeight">' + WEIGHTS + '</select></div>' +
              '<div class="dw-field"><label>Empty Space</label><select id="dw_emptySpace">' + WEIGHTS + '</select></div>' +

              '<h4>Only when we MAKE it for you</h4>' +
              '<div class="dw-field"><label>Accent Colour</label><select id="dw_accent"><option value="">Any</option>' +
                '<option value="gold">Gold</option><option value="blue">Blue</option><option value="teal">Teal</option>' +
                '<option value="purple">Purple</option><option value="green">Green</option><option value="red">Red</option>' +
                '<option value="pink">Pink</option><option value="orange">Orange</option></select></div>' +
              '<div class="dw-field"><label>Image Weight</label><select id="dw_images"><option value="">Balanced</option>' +
                '<option value="lots of images">Lots of images</option>' +
                '<option value="few images">Few images (text-focus)</option></select></div>' +
              '<div class="dw-field"><label>Mock-up Slides <span title="Ready-to-fill placeholder slides added to your design">ⓘ</span></label><input type="text" id="dw_mockups" placeholder="e.g. 5  or  20%"/></div>' +
              '<div class="dw-field"><label>Use a past design\'s look</label><input type="text" id="dw_ref" placeholder="e.g. design 3 background"/></div>' +
              '<div class="dw-field full"><label>Inspired by / base layout on</label><input type="text" id="dw_inspired" placeholder="e.g. use the layout of the ‘Aurora Skincare’ kit"/></div>' +

            '</div>' +
            '<button class="dw-clear" id="dwClear" type="button">Clear all preferences</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    // 30 Jul 2026 — INTO the row (third card), no longer a strip beneath it.
    row.appendChild(wrap);

    // ── METADATA: merge the LIVE vocabulary into the eight multi-selects ─────
    // Same merge rule the search card uses: never wipe a curated list, only ADD
    // words the library actually contains. If the live read fails, the curated
    // lists stand on their own and the card still works — a metadata outage can
    // never blank a dropdown.
    function mergeVocab(vocab) {
      if (!vocab) return;
      META_MULTI.forEach(function (field) {
        var el = document.getElementById('dw_' + field);
        if (!el) return;
        var chosen = {};
        Array.prototype.forEach.call(el.selectedOptions || [], function (o) { chosen[o.value] = 1; });
        var seen = {}, merged = [];
        Array.prototype.forEach.call(el.options, function (op) {
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
        el.innerHTML = merged.map(function (m) {
          return '<option value="' + m.v + '"' + (chosen[m.v] ? ' selected' : '') + '>' + m.label + '</option>';
        }).join('');
      });
    }

    (function loadVocab() {
      // 1. the search card already did the read — reuse it, no second fetch.
      if (window.LDT_SEARCH_VOCAB) { mergeVocab(window.LDT_SEARCH_VOCAB); return; }
      window.addEventListener('ldt-vocab-ready', function () { mergeVocab(window.LDT_SEARCH_VOCAB); });
      // 2. give the search card a moment; if it isn't on this page at all, read
      //    once ourselves so a stand-alone card is still metadata-aware.
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
          META_MULTI.forEach(function (field) {
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

    // ── build ONE order sentence the composer's grammar understands ──────────
    function v(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
    function multi(id) {
      var e = document.getElementById(id);
      if (!e) return [];
      return Array.prototype.slice.call(e.selectedOptions).map(function (o) {
        return String(o.value).replace(/-/g, ' ').trim();
      }).filter(Boolean);
    }
    function orderSentence() {
      var bits = [];
      var desc = v('dwDescribe'); if (desc) bits.push(desc.replace(/[.\s]+$/, ''));

      var ct = v('dw_contentType').replace(/-/g, ' ');
      if (ct && (!desc || desc.toLowerCase().indexOf(ct) === -1)) bits.push('make me a ' + ct);

      var ty  = multi('dw_type');        if (ty.length)  bits.push(ty.join(' and '));
      var ind = multi('dw_industry');    if (ind.length) bits.push(ind.join(' and '));
      var cf  = multi('dw_colorFamily'); if (cf.length)  bits.push(cf.join(' and '));
      var bg  = multi('dw_background');  if (bg.length)  bits.push(bg.join(' and ') + ' background');
      var st  = multi('dw_style');       if (st.length)  bits.push(st.join(' and '));
      var tn  = multi('dw_tone');        if (tn.length)  bits.push(tn.join(' and ') + ' tone');
      var au  = multi('dw_audience');    if (au.length)  bits.push('for ' + au.join(' and '));
      var bf  = multi('dw_bestFor');     if (bf.length)  bits.push('best for ' + bf.join(' and '));

      var ac = v('dw_accent');       if (ac) bits.push(ac + ' accents');
      var sl = v('dw_slides');       if (sl) bits.push(sl + ' slides');
      var ar = v('dw_aspectRatio');  if (ar) bits.push(ar.replace(' ', ':'));
      var fo = v('dw_formality');    if (fo) bits.push(fo + ' formality');

      [['dw_textWeight', 'text'], ['dw_shapeWeight', 'shapes'],
       ['dw_graphWeight', 'graphs'], ['dw_emptySpace', 'empty space']].forEach(function (p) {
        var val = v(p[0]);
        if (val) bits.push(val.replace(/-/g, ' ') + ' ' + p[1]);
      });

      var im = v('dw_images'); if (im) bits.push(im);
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
      if (!s) { preview.style.display = 'none'; preview.textContent = ''; return; }
      preview.style.display = 'block';
      preview.textContent = 'Your order: ' + s;
    }
    wrap.addEventListener('change', refreshPreview);
    wrap.addEventListener('input', refreshPreview);

    document.getElementById('dwClear').addEventListener('click', function () {
      Array.prototype.forEach.call(wrap.querySelectorAll('#designWidget select, #designWidget input'), function (el) {
        if (el.multiple) { Array.prototype.forEach.call(el.options, function (o) { o.selected = false; }); }
        else { el.value = ''; }
      });
      refreshPreview();
    });

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
