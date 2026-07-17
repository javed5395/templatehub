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
    #metaSearchCardWrap { flex:0 0 auto; margin-left:auto; margin-top:-70px; pointer-events:none; }
    #metaSearchCardWrap #searchWidget { pointer-events:auto; }
    #searchWidget { width:min(82vw,1000px); background:#ffffff; overflow:hidden; max-height:260px; transition:max-height 0.45s cubic-bezier(0.4,0,0.2,1); cursor:default; border-radius:28px; box-shadow:0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); font-family:'Inter','Segoe UI',sans-serif; }
    #searchWidget:hover, #searchWidget.locked { max-height:1300px; cursor:default; }
    #searchWidget.force-collapsed, #searchWidget.force-collapsed:hover { max-height:260px !important; }
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
    #searchWidget #lockNote { display:inline-block; margin-top:10px; font-size:11px; color:#1B7F3E; }
    /* TWO-TONE split — same pattern as .sticky-card__content (plain) vs
       .sticky-card__visual (background:#F4F6FB) in landing.html: left
       column stays white, right column gets the grey-blue tone + a
       divider border, restoring the proper side-by-side v4 layout. */
    #searchWidget .sw-panels { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px,1fr)); align-items:stretch; min-height:520px; }
    #searchWidget .sw-col { padding:44px 48px; }
    #searchWidget .sw-col:first-child { background:#ffffff; }
    #searchWidget .sw-col:last-child { background:#F4F6FB; border-left:1px solid #e5e8f0; }
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
    #metaSearchResultsArea { background:transparent; padding:16px 40px 10px; margin-top:0; font-family:'Inter',sans-serif; flex:0 0 100%; order:-1; min-width:0; }
    /* BARS TEMPORARILY HIDDEN — delete just this one line to bring the ranked bars back. */
    #metaSearchResultsArea .sw-rankHead { font-size:12.5px; font-weight:600; color:#6b7280; margin-bottom:12px; }
    /* two columns of up to 10 (fills top-to-bottom): ranks 1-10 left, 11-20 right — each card half width */
    #metaSearchResultsArea .sw-rankList { display:grid; grid-auto-flow:column; grid-template-rows:repeat(5, auto); grid-template-columns:repeat(2, 1fr); gap:8px 16px; max-width:100%; }
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
        '<small>Hover or tap to fill in details — our engine digs out the closest decks for you instantly.</small>' +
      '</div>' +
      '<div id="widgetFull">' +
        '<div class="sw-panels">' +
          '<div class="sw-col"><h3>💬 Describe it</h3>' +
            '<textarea id="chatBox" placeholder="Tell me what you\'re looking for — e.g. bold fashion pitch deck for investors, minimal blue tone, 16 slides..."></textarea>' +
            '<div id="inputRow"></div>' +
            '<button id="sendBtn" style="margin-top:10px;padding:10px 28px;border-radius:30px;border:2px solid #1a1a2e;background:#ffffff;color:#1a1a2e;font-weight:700;cursor:pointer;font-size:13px;font-family:\'Poppins\',sans-serif;letter-spacing:0.01em;">Reset</button>' +
          '</div>' +
          '<div class="sw-col"><h3>🎛️ Filter by field</h3>' +
            '<div id="filterBlock"><div class="sw-grid">' +
              '<div class="sw-field" id="f_contentTypeWrap"><label>Content Type</label>' +
                '<select id="f_contentType"><option value="">Any</option><option value="pitch-deck">Pitch Deck</option>' +
                '<option value="media-kit">Media Kit</option><option value="web-kit">Web Kit</option>' +
                '<option value="resume-cv">Resume / CV</option>' +
                '<option value="digital-keynotes">Digital Keynotes</option></select></div>' +
              '<div class="sw-field"><label>No. of Slides</label><input type="number" id="f_slides" placeholder="e.g. 15"/></div>' +
              '<div class="sw-field"><label>Aspect Ratio</label><select id="f_aspectRatio"><option value="">Any</option>' +
                '<option value="16 9">16:9</option><option value="4 3">4:3</option><option value="1 1">1:1 Square</option>' +
                '<option value="9 16">9:16 Vertical</option></select></div>' +
              '<div class="sw-field"><label>Formality</label><select id="f_formality"><option value="">Any</option>' +
                '<option value="very high">Very High</option><option value="high">High</option>' +
                '<option value="medium high">Medium-High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>' +
              '<div class="sw-field"><label>Color Family</label><select id="f_colorFamily" multiple>' +
                '<option value="blue">Blue</option><option value="navy">Navy</option><option value="black">Black</option>' +
                '<option value="white">White</option><option value="grey">Grey</option><option value="red">Red</option>' +
                '<option value="terracotta">Terracotta</option><option value="orange">Orange</option><option value="yellow">Yellow</option>' +
                '<option value="gold">Gold</option><option value="green">Green</option><option value="purple">Purple</option>' +
                '<option value="pink">Pink</option><option value="brown">Brown</option><option value="neutral">Neutral</option>' +
                '<option value="warm">Warm Tones</option><option value="cool">Cool Tones</option><option value="dark">Dark</option>' +
                '<option value="light">Light</option><option value="multicolor">Multicolor</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Style</label><select id="f_style" multiple>' +
                '<option value="minimal">Minimal</option><option value="bold">Bold</option><option value="modern">Modern</option>' +
                '<option value="elegant">Elegant</option><option value="professional">Professional</option><option value="playful">Playful</option>' +
                '<option value="editorial">Editorial</option><option value="corporate">Corporate</option><option value="creative">Creative</option>' +
                '<option value="luxury">Luxury</option><option value="clean">Clean</option><option value="dark">Dark</option>' +
                '<option value="colorful">Colorful</option><option value="vintage">Vintage</option><option value="futuristic">Futuristic</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Industry</label><select id="f_industry" multiple>' +
                '<option value="tech">Tech & AI</option><option value="healthcare">Healthcare & Medical</option>' +
                '<option value="finance">Finance & Banking</option><option value="construction">Construction</option>' +
                '<option value="retail">Retail & E-commerce</option><option value="education">Education</option>' +
                '<option value="realestate">Real Estate</option><option value="fashion">Fashion & Beauty</option>' +
                '<option value="food">Food & Restaurant</option><option value="agriculture">Agriculture & Farming</option>' +
                '<option value="travel_hospitality">Travel & Hospitality</option><option value="sports_fitness">Sports & Fitness</option>' +
                '<option value="nonprofit">Non-profit / NGO</option><option value="legal_professional">Legal & Professional Services</option>' +
                '<option value="general">General / Business</option><option value="media_entertainment">Media & Entertainment</option>' +
                '<option value="other">Other</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Tone</label><select id="f_tone" multiple>' +
                '<option value="professional">Professional</option><option value="confident">Confident</option>' +
                '<option value="friendly">Friendly</option><option value="inspiring">Inspiring</option>' +
                '<option value="bold">Bold</option><option value="calm">Calm</option>' +
                '<option value="authoritative">Authoritative</option><option value="playful">Playful</option>' +
                '<option value="elegant">Elegant</option><option value="editorial">Editorial</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Audience</label><select id="f_audience" multiple>' +
                '<option value="investors">Investors</option><option value="clients">Clients</option>' +
                '<option value="media">Media & Press</option><option value="partners">Brand Partners</option>' +
                '<option value="retail_buyers">Retail Buyers</option><option value="influencers">Influencers</option>' +
                '<option value="recruiters">Recruiters</option><option value="students">Students</option>' +
                '<option value="customers">Customers</option><option value="general">General Public</option>' +
              '</select></div>' +
              '<div class="sw-field"><label>Best For</label><select id="f_bestFor" multiple>' +
                '<option value="pitch">Pitching Investors</option><option value="launch">Product / Collection Launch</option>' +
                '<option value="press">Press & Media Distribution</option><option value="partnership">Partnership Proposals</option>' +
                '<option value="job_application">Job Applications</option><option value="brand_identity">Brand Identity</option>' +
                '<option value="social_campaign">Social Media Campaigns</option><option value="sales">Sales Presentations</option>' +
                '<option value="internal">Internal Presentations</option><option value="portfolio">Portfolio Showcase</option>' +
              '</select></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">' +
              '<button id="clearFiltersBtn">Clear all filters</button>' +
            '</div>' +
            '<span id="lockNote">📌 Click anywhere outside this box to close it</span>' +
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

  // ---------------------------------------------------------
  // DATA — loaded from Firestore `templates` collection.
  // realDecks is removed — allDecks is the single source of truth.
  // ---------------------------------------------------------
  var allDecks = [];

  var ARRAY_FIELDS = ['colorFamily','style','industry','tone','audience','bestFor','notFor'];

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
    if (/image heavy|lots of images|photo heavy/.test(lower)) { found.imageWeight = 'high'; consumed = consumed.replace(/image heavy|lots of images|photo heavy/, ' '); }
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

  var MULTI_FILTER_FIELDS = ['colorFamily','style','industry','tone','audience','bestFor'];

  function populateFilterOptions() {
    MULTI_FILTER_FIELDS.forEach(function(field) {
      var el = document.getElementById('f_' + field);
      if (!el) return;
      var display = VOCAB[field].slice().sort();
      el.innerHTML = display.map(function(v) {
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
    ['textWeight','imageWeight','graphWeight'].forEach(function(w) {
      var v = document.getElementById('f_' + w).value; if (v) filterRequirements[w] = v;
    });
    MULTI_FILTER_FIELDS.forEach(function(field) {
      var vals = readMultiSelect('f_' + field);
      if (vals.length) filterRequirements[field] = vals;
    });
    recomputeRequirements();
  }
  function clearFilters() {
    ['f_contentType','f_slides','f_aspectRatio','f_formality','f_textWeight','f_imageWeight','f_graphWeight'].forEach(function(id) {
      var el = document.getElementById(id); if (el && id !== 'f_contentType') el.value = '';
    });
    if (!pageContext) document.getElementById('f_contentType').value = ''; // only Home can clear content type
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
  function scoreDeck(deck, req) {
    var score = 0, max = 0;
    // EQUAL weight per field: every filled filter counts the same (max 1 each),
    // so a 15-slide match weighs exactly as much as a colour match, etc.
    if (req.slides != null) { max += 1; var diff = Math.abs((deck.slides || 0) - req.slides); score += Math.max(0, 1 - diff / 8); }
    if (req.aspectRatio) { max += 1; if (norm(deck.aspectRatio) === req.aspectRatio) score += 1; }
    if (req.contentType) { max += 1; score += tokenOverlap(req.contentType, deck.contentType); }
    if (req.formality) { max += 1; if (norm(deck.formality).indexOf(req.formality) !== -1) score += 1; }
    ['textWeight','imageWeight','graphWeight'].forEach(function(w) { if (req[w]) { max += 1; score += gradedWeight(req[w], norm(deck[w])); } });
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

  // One continuous ranked list — best match first, then the next-nearest,
  // flowing straight down. No fixed 100/90/70 buckets. The bar shows each
  // deck's closeness to the *best available* match (top card always full).
  function renderTieredResults(req) {
    // engine digs out AT MOST 20 best matches; extras stay in the backend (not shown).
    var scored = getDecks().map(function(d) { return { deck: d, pct: scoreDeck(d, req) }; })
      .filter(function(s) { return s.pct > 0; })
      .sort(function(a, b) { return b.pct - a.pct; })
      .slice(0, 20);
    // "has input" = the user actually filled something (contentType is auto-locked on section pages).
    var hasInput = Object.keys(req).some(function(k) { return k !== 'contentType'; });
    var container = document.getElementById('metaSearchResultsList');
    if (!scored.length || !hasInput) {
      container.innerHTML = '<div id="metaSearchEmptyState">No matches yet — fill in a field above (hover the strip to open it), or use the chat box.</div>';
      renderFilteredResults(null);
      return;
    }
    renderFilteredResults(scored);
    var top = scored[0].pct;
    container.innerHTML =
      '<div class="sw-rankHead">Ranked by match — best first · ' + scored.length + ' deck' + (scored.length > 1 ? 's' : '') + ' · top match ' + top + '%</div>' +
      '<div class="sw-rankList">' + scored.map(function(s) {
        var d = s.deck, pct = s.pct;
        var rel = top > 0 ? Math.round((pct / top) * 100) : 0;   // closeness to the best available
        var hue = Math.round(120 * (pct / 100));                 // 0=red .. 120=green, by true strength
        var color = 'hsl(' + hue + ',68%,45%)';
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
  function askAI(text) {
    swHistory.push({ role: 'user', content: String(text).slice(0, 500) });
    if (swHistory.length > 12) swHistory = swHistory.slice(-12);
    var bubble = addMsg('…', 'engine');
    fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: swHistory.slice(0, -1) })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      var raw = (d && d.reply) ? d.reply : "Sorry, I couldn't answer that right now.";
      var parsed = (window.chatParseAction) ? window.chatParseAction(raw) : { text: raw, target: null };
      if (bubble) bubble.textContent = parsed.text || raw;
      if (bubble && parsed.target && window.chatMakeActionBtn) { bubble.appendChild(document.createElement('br')); bubble.appendChild(window.chatMakeActionBtn(parsed.target, parsed.label)); }
      swHistory.push({ role: 'assistant', content: (bubble ? bubble.textContent : '').slice(0, 500) });
      var box = document.getElementById('chatBox'); if (box) box.scrollTop = box.scrollHeight;
    })
    .catch(function(){
      if (bubble) bubble.textContent = "I didn't catch a searchable detail — try slide count, color, style, industry, or content type.";
    });
  }
  function sendMsg() {
    var input = document.getElementById('userInput');
    var text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
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
        var mb = addMsg(composed.reply, 'engine');
        if (composed.target && window.chatMakeActionBtn) { mb.appendChild(document.createElement('br')); mb.appendChild(window.chatMakeActionBtn(composed.target, composed.label)); }
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
      document.getElementById('f_contentTypeWrap').style.display = 'none';
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
    widgetLocked = locked;
    var btn = document.getElementById('widgetLockBtn');
    if (locked) {
      widgetEl.classList.add('locked');
      widgetEl.classList.remove('force-collapsed');
      if (btn) { btn.textContent = '🔒 Unlock'; btn.title = 'Click to unlock and collapse'; btn.classList.add('is-locked'); }
    } else {
      widgetEl.classList.remove('locked');
      widgetEl.classList.add('force-collapsed'); // collapse immediately even if mouse still hovering
      if (btn) { btn.textContent = '🔓 Lock open'; btn.title = 'Lock the card open'; btn.classList.remove('is-locked'); }
    }
  }
  function initWidgetBehavior() {
    widgetEl = document.getElementById('searchWidget');
    // CSS :hover handles expand/collapse. JS only removes force-collapsed on re-entry.
    widgetEl.addEventListener('mouseenter', function() {
      widgetEl.classList.remove('force-collapsed');
    });
    // Click anywhere on card (when not locked) → lock open
    widgetEl.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'widgetLockBtn') return;
      if (!widgetLocked) setLocked(true);
    });
    var lockBtn = document.getElementById('widgetLockBtn');
    if (lockBtn) {
      lockBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        setLocked(!widgetLocked);
      });
    }
    // No document click handler — card only closes via the Unlock button
  }

  function wireEvents() {
    document.getElementById('sendBtn').addEventListener('click', resetAll); // button is now Reset
    var inputEl = document.getElementById('userInput');
    if (inputEl) inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.stopPropagation(); sendMsg(); }
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    ['f_contentType','f_slides','f_aspectRatio','f_formality','f_textWeight','f_imageWeight','f_graphWeight']
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

    // Use existing Firebase app if already initialised on the page
    var fbApp;
    try {
      fbApp = firebase.app();
    } catch(e) {
      fbApp = firebase.initializeApp(firebaseConfig);
    }

    var db = firebase.firestore(fbApp);

    db.collection('templates')
      .where('status', '==', 'approved')
      .get()
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
        initWidgetBehavior();
        wireEvents();
        renderTieredResults(requirements);
      });
  }

  loadDecksAndInit();
})();
