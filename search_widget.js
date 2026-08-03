// ============================================================
// SEARCH_WIDGET.JS — Metadata Search Widget (bridged, not inline)
// ============================================================
// This is the promoted version of the v4 sandbox prototype
// (meta_search_widget_v4.html, built and approved in the backup
// folder). It is a single self-contained module, loaded the same
// way navbar.js and mic_action.js are: a plain <script> tag, no
// build step, no dependency on any other file.
//
// HOW IT MOUNTS
// It looks for a page element with id="metaSearchWidgetMount". If
// that element isn't on the page, this file does nothing — safe
// to include on any page without side effects.
//
// The mount element's data-context attribute tells the widget what
// page it's on:
//   data-context=""            -> Home page: shows the Content Type
//                                  field (Pitch Deck / Media Kit / ...)
//   data-context="pitch-deck"  -> Pitch Decks section page: Content
//                                  Type field is hidden and locked to
//                                  "pitch-deck" (redundant on that page)
//   data-context="media-kit"   -> same idea, locked to "media-kit"
//
// DATA CAVEAT (important, told to the user directly): the matching
// engine below still runs on the same 11 sample decks used in the
// sandbox prototype (the only ones with a filled-in SECTION 11 /
// META_* metadata block right now — decks-manifest.json on the
// pitch deck page is currently empty). This file is wired for real
// placement/behavior; swapping in the full live deck catalog is the
// next step once more decks have their metadata filled in.
//
// Matches commands/values against the same auto-built vocabulary
// pattern used everywhere else in this project.
// ============================================================

(function () {
  var mount = document.getElementById('metaSearchWidgetMount');
  if (!mount) return; // page doesn't use the widget — no-op

  var pageContext = mount.getAttribute('data-context') || '';

  // ---------------------------------------------------------
  // STYLES (scoped by ID/class prefixes already unique to this
  // widget — checked against navbar.js and both host pages for
  // collisions before this file was added)
  // ---------------------------------------------------------
  var style = document.createElement('style');
  style.textContent = `
    /* ── Card look + positioning pulled from web kits folder/Cortex/landing.html ──
       Card colour/shadow copied from that file's .mock / .sticky-card (white bg,
       box-shadow: 0 4px 24px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04) = its
       --shadow-card variable) but with sharp corners instead of that file's rounded
       ones, per request. The expand/collapse timing (0.4s cubic-bezier(0.4,0,0.2,1))
       is copied from that same file's .faq__answer accordion reveal — its slowest,
       least-jerky transition — instead of the plain "ease" used before. */
    /* Card WIDTH now matches landing.html's own .sticky-card formula exactly
       (width: min(82vw, 1000px)) instead of the too-narrow 420px cap that
       forced the two-column layout to collapse into a single stacked strip. */
    /* Results (LEFT) sit PARALLEL to the card (RIGHT) in one row, instead of below it. */
    #metaSearchRow { display:flex; flex-wrap:wrap; align-items:flex-start; gap:28px; padding:0 40px; position:relative; z-index:5; }
    #metaSearchCardWrap { flex:1 1 0; min-width:0; order:2; margin-top:-70px; pointer-events:none; }
    @media (max-width:1100px){ #metaSearchCardWrap { flex:1 1 100%; margin-top:0; } }
    #metaSearchCardWrap #searchWidget { pointer-events:auto; }
    #searchWidget { width:100%; background:#ffffff; overflow:hidden; max-height:260px; transition:max-height 0.45s cubic-bezier(0.4,0,0.2,1); cursor:default; border-radius:28px; box-shadow:0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); font-family:'Inter','Segoe UI',sans-serif; }
    #searchWidget:hover { max-height:1300px; cursor:default; }
    #searchWidget.locked { max-height:1300px !important; cursor:default; }
    #searchWidget.force-collapsed:not(.locked), #searchWidget.force-collapsed:not(.locked):hover { max-height:260px !important; }
    #widgetTeaser { padding:16px 26px; color:#1a1a2e; font-size:14px; font-weight:600; font-family:'Poppins',sans-serif; position:relative; }
    #widgetTeaser small { display:block; color:#6b7280; font-weight:400; font-size:11.5px; margin-top:3px; font-family:'Inter',sans-serif; }
    /* Explicit lock/unlock toggle — locking keeps the card open even when
       the mouse leaves or the user clicks elsewhere on the page; unlocking
       immediately slides it back up, regardless of hover. */
    #widgetLockBtn { position:absolute; top:14px; right:20px; background:#F4F6FB; border:1px solid #e5e8f0; border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; font-family:'Inter',sans-serif; transition:background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
    #widgetLockBtn:hover { background:#eef1f8; }
    #widgetLockBtn.is-locked { background:rgba(212,175,55,0.15); border-color:rgba(212,175,55,0.4); color:#8a6d1f; }
    #widgetFull { padding:0; opacity:1; color:#1a1a2e; }
    #searchWidget.expanded #widgetFull { opacity:1; }
    /* TWO-TONE split — same pattern as .sticky-card__content (plain) vs
       .sticky-card__visual (background:#F4F6FB) in landing.html: left
       column stays white, right column gets the grey-blue tone + a
       divider border, restoring the proper side-by-side v4 layout. */
    /* 28 Jul 2026 — one column only (chat side removed). */
    #searchWidget .sw-panels { display:block; }
    #searchWidget .sw-col { padding:22px 26px 26px; background:#F4F6FB; }
    #searchWidget .sw-col h3 { font-size:13px; color:var(--accent,#d4af37); margin:0 0 12px; font-family:'Poppins',sans-serif; }
    #searchWidget #chatBox { background:#fff; border:1px solid #d8dce6; border-radius:14px; padding:12px; min-height:100px; max-height:160px; overflow-y:auto; margin-bottom:0; resize:vertical; width:100%; box-sizing:border-box; font-size:12.5px; color:#1a1a2e; font-family:'Inter',sans-serif; line-height:1.6; }
    #searchWidget #chatBox:focus { outline:none; border-color:var(--accent,#d4af37); }
    #searchWidget .msg { margin-bottom:8px; padding:7px 10px; font-size:12.5px; line-height:1.5; }
    #searchWidget .msg.engine { background:#eef1f8; color:#333c4d; }
    #searchWidget .msg.user   { background:rgba(212,175,55,0.12); color:#8a6d1f; text-align:right; }
    #searchWidget #inputRow { display:none; }
    #searchWidget #userInput { flex:1; padding:9px 12px; border-radius:10px; border:1px solid #d8dce6; background:#fff; color:#1a1a2e; font-size:12.5px; }
    #searchWidget #sendBtn { padding:9px 16px; border-radius:10px; border:none; background:var(--accent,#d4af37); color:#1a1200; font-weight:700; cursor:pointer; }
    #searchWidget #filterBlock { background:#F4F6FB; border:1px solid #e5e8f0; border-radius:14px; padding:14px; }
    #searchWidget .sw-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; }
    #searchWidget .sw-field { display:flex; flex-direction:column; gap:3px; }
    #searchWidget .sw-field label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.03em; }
    #searchWidget .sw-field select, #searchWidget .sw-field input { background:#fff; color:#1a1a2e; border:1px solid #d8dce6; border-radius:10px; padding:6px 8px; font-size:12px; }
    #searchWidget .sw-field select[multiple] { height:56px; }
    #searchWidget #clearFiltersBtn { margin-top:10px; background:transparent; border:1px solid #e0a0a0; color:#b23a3a; border-radius:10px; padding:5px 12px; cursor:pointer; font-size:11px; }
    /* ── THE WHITE MATCH BARS (2 Aug 2026, Javed) ───────────────────────────
       They live ABOVE the three cards: order:-1 puts them on the row's first
       line, flex:0 0 100% makes that line full width.

       HIDDEN UNTIL THERE IS SOMETHING TO SHOW. Before this they were always in
       the flow — even the "No matches yet" line — which left a gap over the
       cards on every page load. The row gets .has-results only when real
       matches come back; see showBars() below.

       The old note here claimed the bars were "TEMPORARILY HIDDEN". They were
       not, and nothing in this file ever hid them. The note is gone. */
    #metaSearchResultsArea { display:none; background:transparent; padding:0 0 18px; margin-top:0; font-family:'Inter',sans-serif; flex:0 0 100%; order:-1; min-width:0; }
    #metaSearchRow.has-results #metaSearchResultsArea { display:block; }
    /* The three cards are pulled up 70px so they overlap the dark hero strip.
       Once bars are on screen there is nothing above to overlap, and the pull
       would drag the cards up over the bars — so cancel it while bars show. */
    #metaSearchRow.has-results #fillWrap,
    #metaSearchRow.has-results #metaSearchCardWrap,
    #metaSearchRow.has-results #dwWrap { margin-top:0; }
    #metaSearchResultsArea .sw-rankHead { font-size:12.5px; font-weight:600; color:#6b7280; margin-bottom:12px; }
    /* THREE across, filling left-to-right, so all 15 (TOP_N) bars have a home.
       The old rule was 5 rows x 2 columns = 10 slots with column flow, so bars
       11-15 spilled into an unstyled third column. */
    #metaSearchResultsArea .sw-rankList { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px 16px; max-width:100%; }
    @media (max-width:1100px){ #metaSearchResultsArea .sw-rankList { grid-template-columns:repeat(2, 1fr); } }
    @media (max-width:700px){ #metaSearchResultsArea .sw-rankList { grid-template-columns:1fr; } }
    #metaSearchResultsArea .sw-rankCard { display:flex; align-items:flex-start; gap:16px; background:#ffffff; border:1px solid #e5e8f0; border-radius:10px; box-shadow:0 4px 24px rgba(0,0,0,0.05); padding:11px 16px; color:#1a1a2e; }
    /* left gauge column: horizontal match bar + % sits at the TOP, aligned with the deck name (width = closeness to the best match) */
    #metaSearchResultsArea .sw-rankGauge { flex:0 0 92px; display:flex; flex-direction:column; gap:5px; margin-top:3px; }
    #metaSearchResultsArea .sw-rankGaugeBar { height:6px; border-radius:4px; background:#eef1f6; overflow:hidden; }
    #metaSearchResultsArea .sw-rankGaugeBar > span { display:block; height:100%; border-radius:4px; transition:width 0.35s ease; }
    #metaSearchResultsArea .sw-rankPct { font-size:11px; font-weight:700; white-space:nowrap; }
    #metaSearchResultsArea .sw-rankBody { flex:1; min-width:0; }
    #metaSearchResultsArea .sw-rankBody strong { color:#1a1a2e; font-size:13px; display:block; }
    #metaSearchResultsArea .sw-deck-meta { font-size:11.5px; color:#6b7280; line-height:1.5; margin-top:4px; }
    #metaSearchEmptyState { color:#8899aa; font-size:13px; padding:16px 0; }
    #swResultsSection { padding:20px 40px 24px; }
    .sw-results-head { font-size:13px; color:#aaaaaa; margin-bottom:14px; }
    /* Cross-section note — sits at the BOTTOM of the card, red, with the other
       section's name as a button that carries this search over to that page. */
    #searchWidget #swCrossNote { display:none; margin-top:12px; font-size:12px; line-height:1.6;
      color:#c02626; background:rgba(192,38,38,0.07); border:1px solid rgba(192,38,38,0.35);
      border-radius:10px; padding:9px 13px; font-family:'Inter',sans-serif; }
    #searchWidget #swCrossNote.is-on { display:block; }
    #searchWidget #swCrossGoBtn { margin-left:6px; background:#c02626; border:none; color:#ffffff;
      font-weight:700; font-size:11.5px; border-radius:8px; padding:4px 11px; cursor:pointer;
      font-family:'Inter',sans-serif; }
    #searchWidget #swCrossGoBtn:hover { background:#a01f1f; }
    .sw-results-head strong { color:#ffffff; }
    #swResultsGrid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
    #swResultsGrid .pd-card { width:auto !important; flex-shrink:unset !important; position:relative; }
    #swResultsGrid .pd-card-img { width:100%; }
    .sw-match-pct { position:absolute; top:8px; right:8px; background:#22c55e; color:#fff; font-size:10px; font-weight:800; border-radius:12px; padding:3px 8px; z-index:2; pointer-events:none; }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------
  // MARKUP — wrapped in #metaSearchCardWrap so the card can be pulled
  // up (negative margin) into the black strip's right side, in the
  // exact spot the pitchdeck_darkbg_2222.png image used to occupy,
  // without being clipped by the strip's own overflow:hidden (the
  // wrapper is a sibling of the strip, not a child of it).
  // ---------------------------------------------------------
  mount.innerHTML =
    '<div id="metaSearchRow">' +
    '<div id="metaSearchResultsArea"><div id="metaSearchResultsList"></div></div>' +
    '<div id="metaSearchCardWrap"><div id="searchWidget">' +
      '<div id="widgetTeaser">🔎 Looking for a 100% match to your requirement?' +
        '<button id="widgetLockBtn" type="button" title="Lock the card open">🔓 Lock open</button>' +
        '<small>Hover or tap to open, then pick your fields — the engine pulls the closest designs instantly.</small>' +
      '</div>' +
      '<div id="widgetFull">' +
        // 28 Jul 2026 — ONE column. The 'Describe it' chat side is gone; the
        // card is the field filter and nothing else. The title now sits
        // directly above the fields, in #widgetTeaser.
        '<div class="sw-panels">' +
          '<div class="sw-col">' +
            '<div id="filterBlock"><div class="sw-grid">' +
              '<div class="sw-field" id="f_contentTypeWrap"><label>Template Type</label>' +
                // 28 Jul 2026: TWO types only — Media Kit and Pitch Deck. Web Kit,
                // Resume/CV and Digital Keynotes are removed: those rooms are not
                // built yet, so offering them would search nothing.
                '<select autocomplete="off" id="f_contentType"><option value="">Any</option>' +
                '<option value="pitch-deck">Pitch Deck</option>' +
                '<option value="media-kit">Media Kit</option></select></div>' +
              // GROUPING (2 Aug 2026) — the 8 SMALL fields (plain dropdowns / number
              // box) come first, 2 per row, filling the top 4 rows. The 8 BIG fields
              // (the tall scrolling multi-select lists) all sit together underneath.
              // Before this, Type and Colour Family were mixed in among the small
              // ones, so a tall list sat beside a short dropdown and every row was a
              // different height.
              // 2 Aug 2026 — autocomplete OFF. The site has a sign-in form (navbar), so
              // Chrome's password manager was offering saved accounts on top of this
              // box the moment a buyer clicked it. The extra attributes cover Chrome,
              // 1Password and LastPass; nothing about the filter itself changes.
              '<div class="sw-field"><label>No. of Slides</label>' +
                '<input type="number" id="f_slides" name="ldt_slides" placeholder="e.g. 15" ' +
                'autocomplete="off" inputmode="numeric" data-form-type="other" ' +
                'data-lpignore="true" data-1p-ignore/></div>' +
              '<div class="sw-field"><label>Aspect Ratio</label><select autocomplete="off" id="f_aspectRatio"><option value="">Any</option>' +
                '<option value="16 9">16:9</option></select></div>' +
              '<div class="sw-field"><label>Formality</label><select autocomplete="off" id="f_formality"><option value="">Any</option>' +
                '<option value="very high">Very High</option><option value="high">High</option>' +
                '<option value="medium high">Medium-High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>' +
              '<div class="sw-field"><label>Text</label><select autocomplete="off" id="f_textWeight"><option value="">Any</option><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="medium-high">Medium-High</option><option value="high">High</option><option value="very-high">Very High</option></select></div>' +
              '<div class="sw-field"><label>Shapes</label><select autocomplete="off" id="f_shapeWeight"><option value="">Any</option><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="medium-high">Medium-High</option><option value="high">High</option><option value="very-high">Very High</option></select></div>' +
              '<div class="sw-field"><label>Graphs</label><select autocomplete="off" id="f_graphWeight"><option value="">Any</option><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="medium-high">Medium-High</option><option value="high">High</option><option value="very-high">Very High</option></select></div>' +
              '<div class="sw-field"><label>Empty Space</label><select autocomplete="off" id="f_emptySpace"><option value="">Any</option><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="medium-high">Medium-High</option><option value="high">High</option><option value="very-high">Very High</option></select></div>' +
              // ── BIG fields start here (tall multi-select lists) ──
              // TYPE: the category INSIDE the template type. Same list the
              // seller picks as Sub-Category in upload_form.html (media kit + pitch
              // deck sub-categories, deduped, 'other' dropped).
              '<div class="sw-field"><label>Type</label><select autocomplete="off" id="f_type" multiple>' +
                '<option value="freelancer">Freelancer</option>' +
                '<option value="podcast">Podcast</option>' +
                '<option value="press">Press / PR</option>' +
                '<option value="influencer">Influencer</option>' +
                '<option value="brand">Brand</option>' +
                '<option value="tech">Tech</option>' +
                '<option value="fashion">Fashion</option>' +
                '<option value="ugc">UGC Creator</option>' +
                '<option value="photography">Photography</option>' +
                '<option value="music">Music / Artist</option>' +
                '<option value="sports">Sports</option>' +
                '<option value="food">Food</option>' +
                '<option value="beauty">Beauty</option>' +
                '<option value="travel">Travel</option>' +
                '<option value="corporate">Corporate</option>' +
                '<option value="startup">Startup</option>' +
                '<option value="sales">Sales</option>' +
                '<option value="education">Education</option>' +
                '<option value="nonprofit">Non-profit</option>' +
                '<option value="creative">Creative</option>' +
                '<option value="investment">Investment</option>' +
                '<option value="product-launch">Product Launch</option>' +
                '<option value="partnership">Partnership</option>' +
                '<option value="real-estate">Real Estate</option>' +
                '<option value="healthcare">Healthcare</option>' +
                '<option value="tech-ai">Tech & AI</option>' +
                // 1 Aug 2026 — sub-categories restored from commit f0f91c1.
                '<option value="youtuber">YouTuber</option>' +
                '<option value="streamer">Streamer</option>' +
                '<option value="gamer">Gamer</option>' +
                '<option value="blogger">Blogger</option>' +
                '<option value="journalist">Journalist</option>' +
                '<option value="author-writer">Author / Writer</option>' +
                '<option value="public-speaker">Public Speaker</option>' +
                '<option value="coach-mentor">Coach / Mentor</option>' +
                '<option value="consultant">Consultant</option>' +
                '<option value="agency">Agency</option>' +
                '<option value="saas-company">SaaS Company</option>' +
                '<option value="ecommerce-brand">E-commerce Brand</option>' +
                '<option value="educational-creator">Educational Creator</option>' +
                '<option value="course-creator">Course Creator</option>' +
                '<option value="newsletter-creator">Newsletter Creator</option>' +
                '<option value="community-manager">Community Manager</option>' +
                '<option value="actor">Actor</option>' +
                '<option value="model">Model</option>' +
                '<option value="artist-illustrator">Artist / Illustrator</option>' +
                '<option value="designer">Designer</option>' +
                '<option value="developer">Developer</option>' +
                '<option value="mobile-app">Mobile App</option>' +
                '<option value="event-organizer">Event Organizer</option>' +
                '<option value="real-estate-agent">Real Estate Agent</option>' +
                '<option value="healthcare-professional">Healthcare Professional</option>' +
                '<option value="wedding-professional">Wedding Professional</option>' +
                '<option value="content-creator">Content Creator</option>' +
                '<option value="small-business">Small Business</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Color Family</label><select autocomplete="off" id="f_colorFamily" multiple>' +
                '<option value="black">Black</option><option value="white">White</option><option value="gray">Gray</option>' +
                '<option value="silver">Silver</option><option value="charcoal">Charcoal</option><option value="beige">Beige</option>' +
                '<option value="neutral">Neutral</option><option value="navy">Navy</option><option value="blue">Blue</option>' +
                '<option value="cyan">Cyan</option><option value="teal">Teal</option><option value="green">Green</option>' +
                '<option value="lime">Lime</option><option value="olive">Olive</option><option value="yellow">Yellow</option>' +
                '<option value="gold">Gold</option><option value="orange">Orange</option><option value="coral">Coral</option>' +
                '<option value="terracotta">Terracotta</option><option value="brown">Brown</option><option value="red">Red</option>' +
                '<option value="burgundy">Burgundy</option><option value="pink">Pink</option><option value="purple">Purple</option>' +
                '<option value="violet">Violet</option><option value="lavender">Lavender</option><option value="warm">Warm Tones</option>' +
                '<option value="cool">Cool Tones</option><option value="pastel">Pastel</option><option value="neon">Neon</option>' +
                '<option value="earth">Earth Tones</option><option value="monochrome">Monochrome</option><option value="dark">Dark</option>' +
                '<option value="light">Light</option><option value="multicolor">Multicolor</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Background</label><select autocomplete="off" id="f_background" multiple>' +
                '<option value="dark">Dark</option><option value="light">Light</option><option value="monochrome">Monochrome</option>' +
                '<option value="transparent">Transparent</option><option value="solid">Solid</option><option value="gradient">Gradient</option>' +
                '<option value="mesh-gradient">Mesh Gradient</option><option value="duotone">Duotone</option><option value="color-block">Colour Block</option>' +
                '<option value="metallic">Metallic</option><option value="neon">Neon</option><option value="photo">Photo</option>' +
                '<option value="full-bleed-image">Full-Bleed Image</option><option value="blurred">Blurred</option><option value="bokeh">Bokeh</option>' +
                '<option value="illustration">Illustration</option><option value="watercolor">Watercolour</option><option value="textured">Textured</option>' +
                '<option value="pattern">Pattern</option><option value="paper">Paper</option><option value="organic">Organic</option>' +
                '<option value="grid">Grid</option><option value="geometric">Geometric</option><option value="split-screen">Split Screen</option>' +
                '<option value="framed">Framed</option><option value="abstract">Abstract</option><option value="3d">3D</option>' +
                '<option value="glassmorphism">Glassmorphism</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Style</label><select autocomplete="off" id="f_style" multiple>' +
                '<option value="minimal">Minimal</option><option value="bold">Bold</option><option value="modern">Modern</option>' +
                '<option value="elegant">Elegant</option><option value="professional">Professional</option><option value="playful">Playful</option>' +
                '<option value="editorial">Editorial</option><option value="corporate">Corporate</option><option value="creative">Creative</option>' +
                '<option value="luxury">Luxury</option><option value="clean">Clean</option>' +
                '<option value="colorful">Colorful</option><option value="vintage">Vintage</option><option value="futuristic">Futuristic</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Industry</label><select autocomplete="off" id="f_industry" multiple>' +
                '<option value="tech">Tech</option><option value="saas">SaaS</option><option value="cybersecurity">Cybersecurity</option>' +
                '<option value="electronics">Electronics</option><option value="gaming">Gaming</option><option value="telecom">Telecom</option>' +
                '<option value="healthcare">Healthcare</option><option value="pharma">Pharma</option><option value="mental-health">Mental Health</option>' +
                '<option value="finance">Finance</option><option value="fintech">FinTech</option><option value="insurance">Insurance</option>' +
                '<option value="accounting">Accounting</option><option value="crypto">Crypto</option><option value="education">Education</option>' +
                '<option value="elearning">E-Learning</option><option value="retail">Retail</option><option value="food">Food</option>' +
                '<option value="fashion">Fashion</option><option value="luxury">Luxury</option><option value="realestate">Real Estate</option>' +
                '<option value="construction">Construction</option><option value="architecture">Architecture</option><option value="home">Home</option>' +
                '<option value="furniture">Furniture</option><option value="travel">Travel</option><option value="sports">Sports</option>' +
                '<option value="events">Events</option><option value="media">Media</option><option value="music">Music</option>' +
                '<option value="film">Film</option><option value="photography">Photography</option><option value="publishing">Publishing</option>' +
                '<option value="art">Art</option><option value="marketing">Marketing</option><option value="pr">Public Relations</option>' +
                '<option value="consulting">Consulting</option><option value="hr">Human Resources</option><option value="recruiting">Recruiting</option>' +
                '<option value="automotive">Automotive</option><option value="manufacturing">Manufacturing</option><option value="logistics">Logistics</option>' +
                '<option value="energy">Energy</option><option value="environment">Environment</option><option value="agriculture">Agriculture</option>' +
                '<option value="pets">Pets</option><option value="parenting">Parenting</option><option value="legal">Legal</option>' +
                '<option value="government">Government</option><option value="nonprofit">Nonprofit</option><option value="religion">Religion</option>' +
                '<option value="general">General</option><option value="other">Other</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Tone</label><select autocomplete="off" id="f_tone" multiple>' +
                '<option value="professional">Professional</option><option value="friendly">Friendly</option>' +
                '<option value="formal">Formal</option><option value="casual">Casual</option>' +
                '<option value="creative">Creative</option><option value="modern">Modern</option>' +
                '<option value="elegant">Elegant</option><option value="luxury">Luxury</option>' +
                '<option value="minimalist">Minimalist</option><option value="serious">Serious</option>' +
                '<option value="inspirational">Inspirational</option><option value="motivational">Motivational</option>' +
                '<option value="playful">Playful</option><option value="fun">Fun</option>' +
                '<option value="confident">Confident</option><option value="trustworthy">Trustworthy</option>' +
                '<option value="premium">Premium</option><option value="executive">Executive</option>' +
                '<option value="corporate">Corporate</option><option value="bold">Bold</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Audience</label><select autocomplete="off" id="f_audience" multiple>' +
                '<option value="executives">Executives</option><option value="managers">Managers</option>' +
                '<option value="team-leaders">Team Leaders</option><option value="employees">Employees</option>' +
                '<option value="project-managers">Project Managers</option><option value="product-managers">Product Managers</option>' +
                '<option value="entrepreneurs">Entrepreneurs</option><option value="founders">Founders</option>' +
                '<option value="startups">Startups</option><option value="business-owners">Business Owners</option>' +
                '<option value="investors">Investors</option><option value="vcs">Venture Capitalists</option>' +
                '<option value="sales-teams">Sales Teams</option><option value="marketing-teams">Marketing Teams</option>' +
                '<option value="agencies">Agencies</option><option value="consultants">Consultants</option>' +
                '<option value="freelancers">Freelancers</option><option value="recruiters">Recruiters</option>' +
                '<option value="hr">HR Professionals</option><option value="job-seekers">Job Seekers</option>' +
                '<option value="educators">Educators</option><option value="teachers">Teachers</option>' +
                '<option value="trainers">Trainers</option><option value="students">Students</option>' +
                '<option value="researchers">Researchers</option><option value="academics">Academics</option>' +
                '<option value="healthcare">Healthcare Professionals</option><option value="doctors">Doctors</option>' +
                '<option value="nurses">Nurses</option><option value="engineers">Engineers</option>' +
                '<option value="developers">Developers</option><option value="designers">Designers</option>' +
                '<option value="architects">Architects</option><option value="realtors">Real Estate Agents</option>' +
                '<option value="buyers">Retail Buyers</option><option value="procurement">Procurement Teams</option>' +
                '<option value="customers">Customers</option><option value="clients">Clients</option>' +
                '<option value="nonprofits">Nonprofits</option><option value="government">Government Officials</option>' +
                '<option value="public-sector">Public Sector Professionals</option><option value="media">Media Outlets</option>' +
                '<option value="press">Press</option><option value="editors">Editors</option>' +
                '<option value="influencers">Influencers</option><option value="partners">Brand Partners</option>' +
                '<option value="sponsors">Brand Sponsors</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Best For</label><select autocomplete="off" id="f_bestFor" multiple>' +
                '<option value="pitching-investors">Pitching Investors</option><option value="seed-round">Seed Round</option>' +
                '<option value="series-a">Series A</option><option value="series-b">Series B</option>' +
                '<option value="demo-day">Demo Day</option><option value="investor-roadshow">Investor Roadshow</option>' +
                '<option value="accelerator-application">Accelerator Application</option><option value="product-launch">Product Launch</option>' +
                '<option value="brand-campaign-pitches">Brand Campaign Pitches</option><option value="press-kit-distribution">Press Kit Distribution</option>' +
                '<option value="partnership-proposals">Partnership Proposals</option><option value="client-proposals">Client Proposals</option>' +
                '<option value="sales-presentations">Sales Presentations</option><option value="internal-presentations">Internal Presentations</option>' +
                '<option value="team-training">Team Training</option><option value="board-meetings">Board Meetings</option>' +
                '<option value="conference-talk">Conference Talk</option><option value="social-campaign">Social Media Campaigns</option>' +
                '<option value="job-applications">Job Applications</option><option value="portfolio-showcase">Portfolio Showcase</option>' +
              '</select></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">' +
              '<button id="clearFiltersBtn">Clear all filters</button>' +
            '</div>' +
            // 2 Aug 2026 — the "📌 Click anywhere outside this box to close it"
            // line was removed (Javed). It was also untrue: only the Lock
            // button opens/closes the card now, clicking outside does nothing.
            '<div id="swCrossNote"></div>' +
          '</div></div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    '</div>' +
    '<div id="swResultsSection"><div class="sw-results-head" id="swResultsHead"></div><div id="swResultsGrid"></div></div>';

  // TEMP DIAGNOSTIC — confirm the bars/results elements are in the DOM
  console.log('[LazyDog] mount built →',
    'resultsList:', document.getElementById('metaSearchResultsList'),
    '| resultsArea:', document.getElementById('metaSearchResultsArea'),
    '| resultsSection:', document.getElementById('swResultsSection'),
    '| row:', document.getElementById('metaSearchRow'));

  // Wire the Lock button NOW (same as fill_widget.js), not after the async
  // Firestore load — otherwise the lock never binds when Firestore is slow or
  // unavailable, which is why the left card locked but this one didn't.
  initWidgetBehavior();

  // ---------------------------------------------------------
  // DATA — loaded from Firestore `templates` collection.
  // realDecks is removed — allDecks is the single source of truth.
  // ---------------------------------------------------------
  var allDecks = [];

  var ARRAY_FIELDS = ['type','colorFamily','background','style','industry','tone','audience','bestFor','notFor'];

  function norm(s) {
    return String(s || '')
      .replace(/(\d)\s*[x:]\s*(\d)/gi, '$1 $2')
      .toLowerCase().replace(/[_:]/g, ' ').replace(/-/g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function buildVocab(field) {
    var set = {};
    allDecks.forEach(function(d) {
      var vals = Array.isArray(d[field]) ? d[field] : [d[field]];
      vals.forEach(function(v) { if (v) set[norm(v)] = true; });
    });
    return Object.keys(set).sort(function(a,b){ return b.length - a.length; });
  }
  // VOCAB is built AFTER Firestore loads (see loadDecksAndInit below).
  var VOCAB = {};

  var FORMALITY_LEVELS = ['very high', 'high', 'medium high', 'medium', 'low'];
  var STOPWORDS = ['a','an','the','for','with','and','of','in','on','i','im','me','my','want','wanted',
    'need','needed','looking','look','show','is','are','be','to','it','that','this','some','any','please',
    'can','you','give','find','deck','decks','kit','kits','theme','style','color','colour','about','have',
    'has','something','like','type','kind','one','slide','slides','formality','ratio','aspect','weight',
    'heavy','format','content'];

  var requirements = {}, chatRequirements = {}, filterRequirements = {}, unmatchedTerms = {};

  function extractFromText(text) {
    var lower = norm(text), found = {}, consumed = lower;
    var slideMatch = lower.match(/(\d+)\s*slide/);
    if (slideMatch) { found.slides = parseInt(slideMatch[1], 10); consumed = consumed.replace(slideMatch[0], ' '); }
    var arMatch = lower.match(/\b(16 9|9 16|4 3|1 1)\b/);
    if (arMatch) { found.aspectRatio = arMatch[1]; consumed = consumed.replace(arMatch[0], ' '); }
    if (/pitch deck|investor pitch|pitch/.test(lower)) { found.contentType = 'pitch-deck'; consumed = consumed.replace(/pitch deck|investor pitch|pitch/, ' '); }
    else if (/media kit/.test(lower)) { found.contentType = 'media-kit'; consumed = consumed.replace(/media kit/, ' '); }
    FORMALITY_LEVELS.forEach(function(level) { if (lower.indexOf(level) !== -1) { found.formality = level; consumed = consumed.replace(level, ' '); } });
    if (/image heavy|lots of images|photo heavy|graphic heavy/.test(lower)) { found.shapeWeight = 'high'; consumed = consumed.replace(/image heavy|lots of images|photo heavy|graphic heavy/, ' '); }
    if (/lots of (?:white ?space|room|space)|airy|minimal layout|plenty of space/.test(lower)) { found.emptySpace = 'high'; consumed = consumed.replace(/lots of (?:white ?space|room|space)|airy|minimal layout|plenty of space/, ' '); }
    if (/dense|packed|busy layout|no white ?space/.test(lower)) { found.emptySpace = 'low'; consumed = consumed.replace(/dense|packed|busy layout|no white ?space/, ' '); }
    if (/text heavy|lots of text|copy heavy/.test(lower)) { found.textWeight = 'high'; consumed = consumed.replace(/text heavy|lots of text|copy heavy/, ' '); }
    if (/graph heavy|lots of graphs|chart heavy|data heavy/.test(lower)) { found.graphWeight = 'high'; consumed = consumed.replace(/graph heavy|lots of graphs|chart heavy|data heavy/, ' '); }
    ARRAY_FIELDS.forEach(function(field) {
      VOCAB[field].forEach(function(phrase) {
        if (phrase.length < 3) return;
        if (consumed.indexOf(phrase) !== -1) {
          found[field] = found[field] || [];
          if (found[field].indexOf(phrase) === -1) found[field].push(phrase);
          consumed = consumed.split(phrase).join(' ');
        }
      });
    });
    var leftover = consumed.split(' ').map(function(w){ return w.trim(); }).filter(function(w) {
      return w.length > 2 && STOPWORDS.indexOf(w) === -1 && !/^\d+$/.test(w);
    });
    leftover.forEach(function(w) { unmatchedTerms[w] = true; });
    return found;
  }

  function mergeRequirements(found) {
    Object.keys(found).forEach(function(key) {
      if (Array.isArray(found[key])) {
        chatRequirements[key] = chatRequirements[key] || [];
        found[key].forEach(function(v) { if (chatRequirements[key].indexOf(v) === -1) chatRequirements[key].push(v); });
      } else { chatRequirements[key] = found[key]; }
    });
  }

  var MULTI_FILTER_FIELDS = ['type','colorFamily','background','style','industry','tone','audience','bestFor'];

  function populateFilterOptions() {
    // FIX (25 Jul 2026): MERGE live vocab with the curated options already in
    // the markup — never wipe a list. (Before the widget's crash-fix, init
    // died before reaching here, so the hardcoded options "survived"; once
    // init succeeded, empty vocab fields blanked their dropdowns.)
    MULTI_FILTER_FIELDS.forEach(function(field) {
      var el = document.getElementById('f_' + field);
      if (!el) return;
      var seen = {}, merged = [];
      Array.prototype.forEach.call(el.options, function(op) {
        var v = norm(op.value);
        if (v && !seen[v]) { seen[v] = 1; merged.push(v); }
      });
      (VOCAB[field] || []).forEach(function(v) {
        if (v && !seen[v]) { seen[v] = 1; merged.push(v); }
      });
      merged.sort();
      if (!merged.length) return;   // nothing known — leave the markup as-is
      el.innerHTML = merged.map(function(v) {
        var label = v.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        return '<option value="' + v + '">' + label + '</option>';
      }).join('');
    });
  }
  function readMultiSelect(id) {
    var el = document.getElementById(id);
    return el ? Array.prototype.slice.call(el.selectedOptions).map(function(o) { return o.value; }) : [];
  }
  function onFilterChange() {
    filterRequirements = {};
    var ct = document.getElementById('f_contentType').value; if (ct) filterRequirements.contentType = ct;
    var sl = document.getElementById('f_slides').value; if (sl) filterRequirements.slides = parseInt(sl, 10);
    var ar = document.getElementById('f_aspectRatio').value; if (ar) filterRequirements.aspectRatio = ar;
    var fo = document.getElementById('f_formality').value; if (fo) filterRequirements.formality = fo;
    // 28 Jul 2026: the four canvas fields — text / shapes / graphs / empty space.
    // These are MEASURED from the .pptx, never typed: background is exempt, shapes
    // and graphs are rectangle unions, empty is canvas nothing sits on, and text is
    // the remainder, so the four always total 100.
    // The null guard stays — it is what stopped a missing element from throwing
    // here and silently killing the entire filter panel (crash fix, 27 Jul).
    ['textWeight','shapeWeight','graphWeight','emptySpace'].forEach(function(w) {
      var el = document.getElementById('f_' + w);
      if (!el) return;
      var v = el.value; if (v) filterRequirements[w] = v;
    });
    MULTI_FILTER_FIELDS.forEach(function(field) {
      var vals = readMultiSelect('f_' + field);
      if (vals.length) filterRequirements[field] = vals;
    });
    recomputeRequirements();
  }
  function clearFilters() {
    ['f_contentType','f_slides','f_aspectRatio','f_formality','f_textWeight','f_shapeWeight','f_graphWeight','f_emptySpace'].forEach(function(id) {
      var el = document.getElementById(id); if (el && id !== 'f_contentType') el.value = '';
    });
    document.getElementById('f_contentType').value = pageContext || '';  // section pages fall back to their own type
    MULTI_FILTER_FIELDS.forEach(function(field) {
      var el = document.getElementById('f_' + field);
      Array.prototype.slice.call(el.options).forEach(function(o) { o.selected = false; });
    });
    filterRequirements = {};
    if (pageContext) filterRequirements.contentType = pageContext;
    recomputeRequirements();
  }
  // Full reset: blank every card value + chat, so the bars disappear
  // (bars only render when something is filled in).
  function resetAll() {
    chatRequirements = {};
    unmatchedTerms = {};
    var input = document.getElementById('userInput');
    if (input) input.value = '';
    var box = document.getElementById('chatBox');
    if (box) box.innerHTML = '<div class="msg engine">Tell me what you\'re looking for, one detail at a time.</div>';
    clearFilters(); // resets all filter fields, then recomputes (now fully empty → no bars)
  }
  function recomputeRequirements() {
    requirements = {};
    [chatRequirements, filterRequirements].forEach(function(src) {
      Object.keys(src).forEach(function(key) {
        if (Array.isArray(src[key])) {
          requirements[key] = requirements[key] || [];
          src[key].forEach(function(v) { if (requirements[key].indexOf(v) === -1) requirements[key].push(v); });
        } else { requirements[key] = src[key]; }
      });
    });
    renderTieredResults(requirements);
    crossSectionNotice();   // note lives in the card, so it updates on every change
  }

  function fieldValuesNorm(deck, field) {
    var vals = Array.isArray(deck[field]) ? deck[field] : [deck[field]];
    return vals.filter(Boolean).map(norm);
  }
  // --- finer-grain scoring helpers: graded/partial credit so scores spread
  //     out smoothly (98, 96, 94...) instead of landing on a few chunky values.
  var WEIGHT_ORDER = { light:0, low:0, minimal:0, sparse:0, none:0,
                       medium:1, moderate:1, balanced:1, mixed:1, some:1,
                       heavy:2, high:2, dense:2, rich:2, lots:2 };
  function gradedWeight(reqV, deckV) {
    var a = WEIGHT_ORDER[reqV], b = WEIGHT_ORDER[deckV];
    if (a == null || b == null) return deckV === reqV ? 1 : 0; // unknown vocab -> exact only
    var dist = Math.abs(a - b);
    return dist === 0 ? 1 : dist === 1 ? 0.5 : 0;              // adjacent -> half credit
  }
  function tokenOverlap(reqStr, deckStr) {
    var r = norm(reqStr).replace(/-/g, ' ').split(' ').filter(Boolean);
    var d = norm(deckStr || '').replace(/-/g, ' ').split(' ').filter(Boolean);
    if (!r.length) return 0;
    var hit = 0; r.forEach(function(w) { if (d.indexOf(w) !== -1) hit++; });
    return hit / r.length;                                     // partial credit by word overlap
  }
  // ⚠️ NOT PART OF THE SEARCH (2 Aug 2026, Javed).
  // scoreDeck() guesses a match from the PUBLIC `templates` fields. The search
  // is not allowed to work that way — it reads the meta codes in the private
  // `kits` collection, server-side, and nothing else. This function is now
  // reached only by summarizeTop() → sendMsg(), which is the old chat column
  // that was removed from this card on 28 Jul, so in practice it never runs.
  // Left in place rather than deleted so nothing silently breaks. Do not wire
  // it back into the results path.
  function scoreDeck(deck, req) {
    var score = 0, max = 0;
    // EQUAL weight per field: every filled filter counts the same (max 1 each),
    // so a 15-slide match weighs exactly as much as a colour match, etc.
    if (req.slides != null) { max += 1; var diff = Math.abs((deck.slides || 0) - req.slides); score += Math.max(0, 1 - diff / 8); }
    if (req.aspectRatio) { max += 1; if (norm(deck.aspectRatio) === req.aspectRatio) score += 1; }
    if (req.contentType) { max += 1; score += tokenOverlap(req.contentType, deck.contentType); }
    if (req.formality) { max += 1; if (norm(deck.formality).indexOf(req.formality) !== -1) score += 1; }
    ['textWeight','shapeWeight','graphWeight','emptySpace'].forEach(function(w) { if (req[w]) { max += 1; score += gradedWeight(req[w], norm(deck[w])); } });
    ['colorFamily','style','industry','tone','audience','bestFor'].forEach(function(field) {
      if (req[field] && req[field].length) {
        max += 1;                                  // whole field = 1 point (equal weight), no matter how many values picked
        var vals = fieldValuesNorm(deck, field);
        var hit = 0; req[field].forEach(function(v) { if (vals.indexOf(v) !== -1) hit++; });
        score += hit / req[field].length;          // partial credit within the field
      }
    });
    var notForVals = fieldValuesNorm(deck, 'notFor');
    ['colorFamily','style','industry','tone','audience','bestFor'].forEach(function(field) {
      if (req[field]) req[field].forEach(function(v) { if (notForVals.indexOf(v) !== -1) score -= 0.5; });
    });
    return max === 0 ? 0 : Math.max(0, Math.round((score / max) * 100));
  }
  // Single source of truth — use page's pre-loaded decks (have _card for rendering) if available.
  function getDecks() {
    return (window._ldtAllDecks && window._ldtAllDecks.length) ? window._ldtAllDecks : allDecks;
  }

  // Render top matches as real deck cards (identical to page cards) with match % badge.
  function renderFilteredResults(scored) {
    // Preferred path: the host page exposes _ldtRenderFiltered, which inserts the
    // top matches as real deck cards ABOVE the folder grid (#deckGrid) — so the
    // searched designs sit on top and the rest of the folder is pushed below.
    // Cap at the 10 best, per the requirement.
    if (typeof window._ldtRenderFiltered === 'function') {
      var sec0 = document.getElementById('swResultsSection');
      if (sec0) sec0.style.display = 'none';   // don't double-render inside the widget
      if (!scored || !scored.length) window._ldtRenderFiltered(null);
      else window._ldtRenderFiltered(scored.slice(0, 15).map(function (s) { return s.deck; }));
      return;
    }
    var section = document.getElementById('swResultsSection');
    if (!section) return;
    if (!scored || !scored.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    var head = document.getElementById('swResultsHead');
    if (head) head.innerHTML = '<strong>🎯 ' + scored.length + ' best match' + (scored.length > 1 ? 'es' : '') + '</strong> · top match ' + scored[0].pct + '%';
    var grid = document.getElementById('swResultsGrid');
    grid.innerHTML = '';
    scored.forEach(function(s) {
      var nd = s.deck, pct = s.pct;
      if (!nd._card || typeof window.renderDeckCard !== 'function') return;
      var tmp = document.createElement('div');
      window.renderDeckCard(tmp, nd._card);
      var cardEl = tmp.firstChild;
      if (!cardEl) return;
      var badge = document.createElement('div');
      badge.className = 'sw-match-pct';
      badge.textContent = pct + '%';
      cardEl.appendChild(badge);
      grid.appendChild(cardEl);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REAL METADATA MATCHING (25 Jul 2026) — the widget no longer decides matches
  // itself. Requirements go to recommend_http, which encodes them via the
  // PRIVATE meta_codec and scores every kit's encoded_raw SERVER-SIDE. Codes
  // never reach the browser; we get back display-safe slugs + rank scores and
  // map them onto this page's own cards. The old client-side scorer survives
  // ONLY as an offline fallback (server unreachable).
  // ══════════════════════════════════════════════════════════════════════════
  var REC_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/recommend_http';
  var TOP_N = 15;                       // engine digs out the top 15 best matches
  var _recTimer = null, _recSeq = 0;

  // The white bars only exist on screen when there is something to put in them.
  // One switch, used by both exits below, so the bars and the cards' -70px pull
  // can never disagree about whether results are showing.
  function showBars(on) {
    var row = document.getElementById('metaSearchRow');
    if (row) row.classList.toggle('has-results', !!on);
  }

  function renderTieredResults(req) {
    // "has input" = the user actually filled something (contentType is auto-locked on section pages).
    var hasInput = Object.keys(req).some(function(k) { return k !== 'contentType'; });
    var container = document.getElementById('metaSearchResultsList');
    if (!hasInput) {
      container.innerHTML = '';
      showBars(false);
      renderFilteredResults(null);
      return;
    }
    // debounce: filters fire on every change — one server call per settled state
    clearTimeout(_recTimer);
    _recTimer = setTimeout(function() { fetchServerMatches(req); }, 350);
  }

  function fetchServerMatches(req) {
    var seq = ++_recSeq;
    fetch(REC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: req, limit: TOP_N })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (seq !== _recSeq) return;              // a newer request superseded this one
      var results = (d && d.results) || [];
      var pool = getDecks(), bySlug = {};
      pool.forEach(function(dk) { if (dk && dk.id) bySlug[dk.id] = dk; });
      var top = results.length ? (results[0].score || 1) : 1;
      var scored = [];
      results.forEach(function(r) {
        var deck = bySlug[r.slug];
        // Section pages keep "page purity" — the local pool only holds this
        // page's own category, so a result from elsewhere has no card to reuse.
        // EXCEPTION (28 Jul 2026): if the buyer explicitly picked a different
        // Content Type, that is exactly what they asked for. Build a light card
        // from the server's display-safe fields and show it.
        var askedElsewhere = (filterRequirements.contentType || '') &&
                             filterRequirements.contentType !== pageContext;
        if (!deck) {
          if (pageContext && !askedElsewhere) return;
          deck = { id: r.slug, name: r.name, contentType: '', slides: r.slides,
                   colorFamily: [], _match: r.match };
        }
        // TRUE match % straight from the server — this deck's share of what the
        // buyer actually asked for. An older deploy of recommend_http does not
        // send `pct`, so we fall back to the old relative-to-best number and the
        // bars keep working while the function is being redeployed.
        var pct = (typeof r.pct === 'number') ? r.pct
                : Math.max(1, Math.round(((r.score || 1) / top) * 100));
        scored.push({ deck: deck, pct: pct });
      });
      paintRanked(scored);
    })
    .catch(function() {
      // ── NO CLIENT-SIDE FALLBACK (2 Aug 2026, Javed) ──────────────────────
      // The search may read ONE thing: the meta codes in the private `kits`
      // collection — and only the server can read those. Nothing else counts
      // as a search.
      //
      // A backup scorer used to sit right here. Whenever the server was
      // unreachable it guessed matches inside the browser from the public
      // `templates` fields. It leaked nothing, but it answered DIFFERENTLY
      // from the real engine and the buyer had no way to tell which one he
      // was looking at. A wrong match shown confidently is worse than an
      // honest "not right now".
      //
      // DO NOT PUT A SECOND SCORER BACK HERE.
      if (seq !== _recSeq) return;              // a newer request already won
      var _c = document.getElementById('metaSearchResultsList');
      if (_c) _c.innerHTML =
        '<div id="metaSearchEmptyState">Search is unavailable for a moment — please try again shortly.</div>';
      showBars(true);
      renderFilteredResults(null);
    });
  }

  // One continuous ranked list — best match first, then the next-nearest,
  // flowing straight down. Each bar's length IS that deck's true match %.
  function paintRanked(scored) {
    var container = document.getElementById('metaSearchResultsList');
    if (!scored.length) {
      container.innerHTML = '<div id="metaSearchEmptyState">Nothing matched those fields yet — try clearing one of them.</div>';
      showBars(true);          // show the area so the "nothing matched" line is visible
      renderFilteredResults(null);
      return;
    }
    showBars(true);
    renderFilteredResults(scored);
    var top = scored[0].pct;
    container.innerHTML =
      '<div class="sw-rankHead">Ranked by match — best first · ' + scored.length + ' deck' + (scored.length > 1 ? 's' : '') + ' · top match ' + top + '%</div>' +
      '<div class="sw-rankList">' + scored.map(function(s) {
        var d = s.deck, pct = s.pct;
        // Bar length IS the match — 40% match, 40% long. It used to be measured
        // against the best deck on screen, which made the top bar full even when
        // that deck was a poor fit.
        var rel = Math.max(2, Math.min(100, pct));   // 2% floor so a 0% bar is still visible
        // Colour scale (2 Aug 2026, Javed): green at the top, red at the bottom,
        // so a deck that fits nothing is obviously wrong at a glance. Read
        // top-down, first match wins — edit these six rows to retune it.
        var color = pct >= 100 ? '#15803d'    // 100%  green
                  : pct >=  90 ? '#4ade80'    //  90%  light green
                  : pct >=  75 ? '#f59e0b'    //  75%  orange
                  : pct >=  50 ? '#f97316'    //  50%  deep orange
                  : pct >=  25 ? '#ef4444'    //  25%  red
                  : pct >    0 ? '#dc2626'    //   1%  red
                  :              '#991b1b';   //   0%  dark red — matches nothing
        return '<div class="sw-rankCard">' +
          '<div class="sw-rankGauge">' +
            '<div class="sw-rankGaugeBar"><span style="width:' + rel + '%;background:' + color + '"></span></div>' +
            '<span class="sw-rankPct" style="color:' + color + '">' + pct + '% match</span>' +
          '</div>' +
          '<div class="sw-rankBody"><strong>' + d.name + '</strong>' +
            '<div class="sw-deck-meta">' + d.contentType + ' · ' + d.slides + ' slides · ' +
            fieldValuesNorm(d, 'colorFamily').slice(0, 3).join(', ') + '</div>' +
          '</div></div>';
      }).join('') + '</div>';
  }

  function addMsg(text, who) {
    var box = document.getElementById('chatBox');
    if (!box) return;          // chat column removed — nothing to write into
    var div = document.createElement('div');
    div.className = 'msg ' + who;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }

  var REVEAL_TRIGGERS = ['show me', 'show results', 'show decks', 'find decks', 'search now', 'search', 'go ahead', 'reveal', 'display'];
  function isRevealTrigger(lowerText) {
    return REVEAL_TRIGGERS.some(function(p) { return lowerText.indexOf(p) !== -1; }) || /^(show|go|search|find|display)\b/.test(lowerText.trim());
  }
  function summarizeTop(req) {
    var scored = allDecks.map(function(d) { return { deck: d, pct: scoreDeck(d, req) }; }).filter(function(s){return s.pct>0;}).sort(function(a,b){return b.pct-a.pct;});
    if (!scored.length) return null;
    if (scored.length === 1) return 'Best match: "' + scored[0].deck.name + '" (' + scored[0].pct + '%).';
    var lines = scored.slice(0,3).map(function(s){ return '"' + s.deck.name + '" (' + s.pct + '%)'; });
    return 'Top matches: ' + lines.join(', ') + '.';
  }
  // Free AI cascade backend (Groq -> Gemini -> ... server-side). Only called for
  // general questions the search rule-bot can't turn into a template search.
  var CHAT_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/chat_http';
  var swHistory = [];
  function askAI(text, fallbackReply) {
    swHistory.push({ role: 'user', content: String(text).slice(0, 500) });
    if (swHistory.length > 12) swHistory = swHistory.slice(-12);
    var bubble = addMsg('…', 'engine');
    var doAI = function(){
      fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: swHistory.slice(0, -1), email: (window.hexaMemory && window.hexaMemory.get().email) || '' })
      })
      .then(function(r){ return r.json(); })
      .then(function(d){
        var raw = (d && d.reply) ? d.reply : (fallbackReply || "Sorry, I couldn't answer that right now.");
        var parsed = (window.chatParseAction) ? window.chatParseAction(raw) : { text: raw, target: null };
        if (bubble) bubble.textContent = parsed.text || raw;
        if (bubble && parsed.target && window.chatMakeActionBtn) { bubble.appendChild(document.createElement('br')); bubble.appendChild(window.chatMakeActionBtn(parsed.target, parsed.label)); }
        swHistory.push({ role: 'assistant', content: (bubble ? bubble.textContent : '').slice(0, 500) });
        var box = document.getElementById('chatBox'); if (box) box.scrollTop = box.scrollHeight;
      })
      .catch(function(){
        if (bubble) bubble.textContent = fallbackReply || "I didn't catch a searchable detail — try slide count, color, style, industry, or content type.";
      });
    };
    // REAL recommendations first — server matches actual kit metadata; AI on miss
    if (window.hexaRecommendIntent && window.hexaRecommend && window.hexaRenderRecs && window.hexaRecommendIntent(text)) {
      window.hexaRecommend(text)
        .then(function(rec){
          if (window.hexaRenderRecs(bubble, rec)) {
            swHistory.push({ role: 'assistant', content: bubble.textContent.slice(0, 500) });
            var box = document.getElementById('chatBox'); if (box) box.scrollTop = box.scrollHeight;
          } else doAI();
        })
        .catch(doAI);
      return;
    }
    doAI();
  }
  function sendMsg() {
    var input = document.getElementById('userInput');
    var text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    var _cmd=(window.hexaCommand && window.hexaCommand(text))||null;
    if(_cmd && _cmd.reply){ addMsg(_cmd.reply,'engine'); return; }
    // lead capture — email in message / "notify me" (#4)
    var _lead=(window.hexaLeadCapture && window.hexaLeadCapture(text))||null;
    if(_lead && _lead.reply){ addMsg(_lead.reply,'engine'); return; }
    // design order — "make me a hospital kit" → Hexa ACTS (25 Jul, Javed):
    // she opens the Designer herself; the button stays as a fallback.
    // 3 Aug 2026 — routine / order requests are handled by the brain, not here.
    if(window.hexaDesignIntent && window.hexaDesignIntent(text) && window.hexaHandleAway &&
       window.hexaHandleAway(text, function(msg){ return addMsg(msg,'engine'); })){
      return;
    }
    if(window.hexaDesignIntent && window.hexaDesign && window.hexaDesignIntent(text)){
      var _dz=window.hexaDesign(text);
      var _dm=addMsg(_dz.reply,'engine');
      if(window.chatMakeActionBtn){ _dm.appendChild(document.createElement('br')); _dm.appendChild(window.chatMakeActionBtn(_dz.target,_dz.label)); }
      setTimeout(function(){ try{ window.location.href=_dz.target; }catch(e){} }, 1200);
      return;
    }
    // name capture — "my name is X" (#5)
    var _nm=(window.hexaNameCapture && window.hexaNameCapture(text))||null;
    if(_nm && _nm.reply){ addMsg(_nm.reply,'engine'); return; }
    var lower = norm(text);
    var found = extractFromText(text);
    mergeRequirements(found);
    recomputeRequirements();
    var summary = summarizeTop(requirements);
    if (summary) {
      // Rule-bot handled it as a template search — free, no API call.
      var reply = (Object.keys(found).length && !isRevealTrigger(lower) ? 'Got it — noted. ' : '') + summary;
      addMsg(reply, 'engine');
    } else {
      // No template-search detail found. Try the word-compiler first (FREE),
      // and only fall through to the AI cascade if it composes nothing.
      var composed = (window.chatCompose && window.chatCompose(text)) || (window.vaComposeReply && window.vaComposeReply(text)) || null;
      if (composed && composed.reply) {
        // soft = greeting / small talk / identity → let the live AI answer warmly (name + history),
        // with the canned line as offline fallback. Actions/navigation/factual FAQ stay instant & free.
        if (composed.soft && !composed.target) { askAI(text, composed.reply); return; }
        var mb = addMsg(composed.reply, 'engine');
        if (composed.target && composed.execute) { setTimeout(function(){ window.location.href = composed.target; }, 900); }
        else if (composed.target && window.chatMakeActionBtn) { mb.appendChild(document.createElement('br')); mb.appendChild(window.chatMakeActionBtn(composed.target, composed.label)); }
      } else {
        askAI(text);
      }
    }
  }

  // ---------------------------------------------------------
  // PAGE CONTEXT — hide/lock Content Type on section pages
  // ---------------------------------------------------------
  function applyPageContext() {
    if (pageContext) {
      // 28 Jul 2026: no longer hidden. It is pre-set to this page's type so the
      // default behaviour is unchanged, but the buyer can now change it and
      // search another category without leaving the page.
      document.getElementById('f_contentType').value = pageContext;
      filterRequirements.contentType = pageContext;
    }
  }

  // ---------------------------------------------------------
  // WIDGET EXPAND / LOCK / COLLAPSE — same mechanic approved in v4, plus an
  // explicit Lock/Unlock button so locking doesn't require guessing that
  // "click the card" does it. All lock/unlock paths (button, card click,
  // outside click) funnel through setLocked() so the button's state and
  // label always stay in sync no matter which path triggered the change.
  // ---------------------------------------------------------
  var widgetEl, widgetLocked = false;
  function setLocked(locked) {
    widgetLocked = !!locked;
    var btn = document.getElementById('widgetLockBtn');
    if (widgetLocked) {
      widgetEl.classList.add('locked');
      widgetEl.classList.remove('force-collapsed');
      if (btn) { btn.textContent = '🔒 Unlock'; btn.title = 'Click to unlock and collapse'; btn.classList.add('is-locked'); }
    } else {
      widgetEl.classList.remove('locked');
      widgetEl.classList.add('force-collapsed'); // collapse now even if still hovering
      if (btn) { btn.textContent = '🔓 Lock open'; btn.title = 'Lock the card open'; btn.classList.remove('is-locked'); }
    }
  }
  function initWidgetBehavior() {
    widgetEl = document.getElementById('searchWidget');
    if (!widgetEl) return;
    // Re-entering the card clears a prior forced collapse so hover works again.
    widgetEl.addEventListener('mouseenter', function() {
      if (!widgetLocked) widgetEl.classList.remove('force-collapsed');
    });
    // The Lock button is the ONLY thing that locks/unlocks — a plain toggle.
    var lockBtn = document.getElementById('widgetLockBtn');
    if (lockBtn) {
      lockBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        setLocked(!widgetLocked);
      });
    }
  }


  // ---------------------------------------------------------
  // CROSS-SECTION SEARCH  (28 Jul 2026)
  // A buyer standing in Media Kits may want a Pitch Deck. Before this, the
  // Content Type field was hidden and hard-locked to the page, so they could
  // not ask — and any result the server returned from another category was
  // thrown away by the "page purity" rule below.
  //
  // Now they get the results RIGHT HERE. No redirect, no "would you like to go
  // to..." — sending someone away mid-search loses them. The only thing shown
  // is a small line saying what is on screen, so the mixed list is never
  // confusing.
  // ---------------------------------------------------------
  // TWO sections only — Media Kits and Pitch Decks. Nothing else has a room
  // built, so nothing else is offered and the note never points anywhere else.
  var SECTION_LABELS = {
    'pitch-deck' : 'Pitch Decks',
    'media-kit'  : 'Media Kits'
  };
  var SECTION_PAGES = {
    'pitch-deck' : 'pitch_deck_folder_section.html',
    'media-kit'  : 'media_kits_folder_section.html'
  };

  // The whole card state travels in ONE url parameter so the buyer's search is
  // not retyped on the other page: ?sw=<url-encoded json of filterRequirements>.
  function crossSearchUrl(target) {
    var page = SECTION_PAGES[target];
    if (!page) return null;
    var carry = {};
    Object.keys(filterRequirements).forEach(function(k) { carry[k] = filterRequirements[k]; });
    carry.contentType = target;
    return page + '?sw=' + encodeURIComponent(JSON.stringify(carry));
  }

  function crossSectionNotice() {
    var note = document.getElementById('swCrossNote');
    if (!note) return;
    var chosen = (filterRequirements.contentType || '').trim();
    var here = SECTION_LABELS[pageContext];
    var want = SECTION_LABELS[chosen];
    if (!pageContext || !chosen || chosen === pageContext || !want || !here) {
      note.className = ''; note.innerHTML = '';
      return;
    }
    note.innerHTML =
      'Currently you are in the <strong>' + here + '</strong> section, so ' + want +
      ' are being pulled from the ' + want + ' section and shown here. ' +
      'If you want to explore more ' + want + ' yourself, click' +
      '<button type="button" id="swCrossGoBtn">' + want + '</button>';
    note.className = 'is-on';
    var btn = document.getElementById('swCrossGoBtn');
    if (btn) btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var url = crossSearchUrl(chosen);
      if (url) window.location.href = url;
    });
  }

  // ---------------------------------------------------------
  // ARRIVING FROM ANOTHER SECTION \u2014 read ?sw=, refill every card field, rerun
  // the match and leave the card locked open. That is what "opens his search
  // there" means: same search, new section, nothing retyped.
  // ---------------------------------------------------------
  function applyIncomingSearch() {
    var m = (window.location.search || '').match(/[?&]sw=([^&]*)/);
    if (!m) return;
    var wanted;
    try { wanted = JSON.parse(decodeURIComponent(m[1])); } catch (err) { return; }
    if (!wanted || typeof wanted !== 'object') return;

    ['contentType','slides','aspectRatio','formality','textWeight','shapeWeight','graphWeight','emptySpace']
      .forEach(function(k) {
        var el = document.getElementById('f_' + k);
        if (!el) return;
        var v = wanted[k];
        if (v === undefined || v === null || v === '') return;
        el.value = String(v);      // a value this page's list doesn't have simply stays blank
      });
    MULTI_FILTER_FIELDS.forEach(function(f) {
      var el = document.getElementById('f_' + f);
      if (!el || !Array.isArray(wanted[f])) return;
      Array.prototype.forEach.call(el.options, function(o) {
        if (wanted[f].indexOf(o.value) !== -1) o.selected = true;
      });
    });
    onFilterChange();            // rebuilds filterRequirements from the DOM + rerenders
    setLocked(true);             // card open, so he sees his own search sitting there
    var w = document.getElementById('searchWidget');
    if (w && w.scrollIntoView) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireEvents() {
    // The chat column was removed, so #sendBtn / #userInput may not exist.
    // Unguarded, the missing #sendBtn threw here and killed every filter
    // listener below it — the same failure mode as the 27 Jul crash.
    var sendEl = document.getElementById('sendBtn');
    if (sendEl) sendEl.addEventListener('click', resetAll);
    var inputEl = document.getElementById('userInput');
    if (inputEl) inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.stopPropagation(); sendMsg(); }
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    ['f_contentType','f_slides','f_aspectRatio','f_formality','f_textWeight','f_shapeWeight','f_graphWeight','f_emptySpace']
      .concat(MULTI_FILTER_FIELDS.map(function(f){ return 'f_' + f; }))
      .forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', onFilterChange);
      });
    // when the folder page finishes loading its real Firebase decks, re-run the current match
    window.addEventListener('ldt:decks-ready', function() { renderTieredResults(requirements); });
  }

  // ---------------------------------------------------------
  // LOAD REAL CATALOG — reads approved decks from Firestore
  // `templates` collection. No manifest, no PDF parsing.
  // ---------------------------------------------------------
  function loadDecksAndInit() {
    var firebaseConfig = {
      apiKey:            "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
      authDomain:        "templatehub-16cd7.firebaseapp.com",
      projectId:         "templatehub-16cd7",
      storageBucket:     "templatehub-16cd7.firebasestorage.app",
      messagingSenderId: "143000893683",
      appId:             "1:143000893683:web:fd694de96f8c0fa6569f86"
    };

    // FIX (25 Jul 2026): this block used the old compat API (firebase.app()/
    // firebase.firestore()), but the section pages never load the compat SDK —
    // the global `firebase` doesn't exist there, the ReferenceError escaped the
    // try/catch, and EVERYTHING below (vocab, page-context lock, event wiring)
    // silently died. Now uses the modular SDK via dynamic import, with the
    // getApps() reuse guard, and init ALWAYS completes even if Firestore fails.
    Promise.all([
      import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js')
    ])
      .then(function(m) {
        var A = m[0], F = m[1];
        var app = A.getApps().length ? A.getApp() : A.initializeApp(firebaseConfig);
        var db = F.getFirestore(app);
        return F.getDocs(F.query(F.collection(db, 'templates'), F.where('status', '==', 'approved')));
      })
      .then(function(snapshot) {
        allDecks = [];
        snapshot.forEach(function(docSnap) {
          var d = docSnap.data();
          d.id = docSnap.id;
          allDecks.push(d);
        });
      })
      .catch(function(err) {
        console.warn('[LazyDog search widget] Firestore load failed — no decks will show.', err);
        allDecks = [];
      })
      .then(function() {
        // Build filter vocab from live Firestore data
        ARRAY_FIELDS.concat(['contentType']).forEach(function(f) { VOCAB[f] = buildVocab(f); });
        populateFilterOptions();
        applyPageContext();
        wireEvents();
        renderTieredResults(requirements);
        applyIncomingSearch();   // must run last — it overwrites the page default
      });
  }

  loadDecksAndInit();
})();
