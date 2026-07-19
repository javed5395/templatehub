// ============================================================
// CHAT_BRAIN.JS — TYPED-CHAT brain for LazyDogTemplates
// ------------------------------------------------------------
// Separate from the VOICE engine on purpose:
//   • Voice (mic_action.js + va_dictionary.js) is left EXACTLY as-is.
//   • This file reuses the SAME vocabulary (window.vaDictionary) so growing
//     the dictionary benefits both — but applies CHAT-specific replies:
//       - paid/premium pricing (not "free")
//       - no voice-only phrasing ("say stop mic", "I am your voice assistant")
// Exposes: window.chatCompose(text) -> { reply, target } or null.
// The chat widgets call this FIRST (free). Only if it returns null do they
// fall through to the AI cascade.
// ============================================================
(function () {

  // Chat-tailored reply overrides, keyed by va_dictionary block id.
  // If a matched block has an override here, chat uses it instead of the
  // voice reply. Everything else falls through to the original reply.
  var OVERRIDES = {
    // --- identity / capabilities: strip voice-only phrasing ---
    'greeting': "Hi! 👋 I'm Hexa. I can help you find pitch decks, media kits, website UI kits, or the free invoice generator — and answer questions about buying, editing, formats and licensing. What do you need?",
    'identity_assistant': "I'm Hexa, the LazyDog Templates assistant. I can help you find templates, explain pricing and licensing, and answer questions about buying, downloading and editing.",
    'help': "You can ask me to open pitch decks, media kits, or the invoice generator — or ask anything about pricing, licenses, file formats, editing, or your order.",
    'va_howto': "Just type your question — templates, pricing, licenses, formats, editing, or your order — and I'll answer.",
    'va_language': "Type your question in plain English and I'll do my best to help.",

    // --- pricing: templates are PAID (invoice tool is free) ---
    'identity_site': "LazyDog Templates is a marketplace for professional <strong>pitch decks</strong>, <strong>media kits</strong>, and <strong>website UI kits</strong>. Templates are premium (one-time purchase, Personal or Commercial license); the Invoice Generator is free to use.",
    'identity_different': "Our templates are professionally designed and sold as one-time purchases — no subscription. Each design offers a Personal and a Commercial license, priced on its page.",
    'pricing_free': "Templates are <strong>premium</strong> — a one-time purchase, no subscription. Every design has a <strong>Personal</strong> and a <strong>Commercial</strong> license, priced separately on its page. (The Invoice Generator is free.)",
    'pricing_subscription': "No subscription — each template is a one-time purchase. You only pay for what you buy.",
    'pricing_credit_card': "You pay per template at secure checkout. Each design shows its Personal and Commercial license price on its page.",

    // --- buying / download flow (now a purchase) ---
    'account_needed': "You can browse freely. To buy, open a template, pick your license, and check out — your purchases are saved to your account for re-download.",
    'download_how': "Open the template you want → choose <strong>Personal</strong> or <strong>Commercial</strong> license → checkout → you get an instant download link right after payment (also saved to your account).",

    // --- support: professional address, not personal ---
    'support_contact': "Email <strong>support@lazydogtemplates.com</strong> — we usually reply within 24 hours."
  };

  // ════════════════════════════════════════════════════════════════
  //  ✎ EDIT ME — Hexa's custom answers (FREE, no API call).
  //  Add a line: { match: ["keyword or phrase", "another wording"], reply: "answer" }
  //  If the visitor's message CONTAINS any phrase in match, Hexa gives reply.
  //  Optional: add  target: "some_page.html"  to also show an Open button.
  //  Checked top-to-bottom — put the most specific entries first.
  // ════════════════════════════════════════════════════════════════
  var CHAT_FAQ = [
    // ↓ Add your own free answers here anytime.
    // { match: ["refund", "money back"], reply: "We offer a 14-day refund window on eligible purchases." },

    // --- conversational / voice ---
    { match: ["do you hear me","can you hear me","are you listening","did you hear","hear me"], reply: "Yes, I can hear you loud and clear \ud83c\udfa4 — go ahead!" },
    { match: ["hello","hi hexa","hey hexa","hey there"], reply: "Hey! \ud83d\udc4b I'm Hexa. Want help finding a pitch deck, media kit, or web kit?" },
    { match: ["thank you","thanks","thankyou","thx"], reply: "Anytime! \ud83d\udc9b Anything else I can help you find?" },
    { match: ["are you human","are you a robot","are you real","are you ai","are you a bot"], reply: "I'm Hexa — LazyDog's assistant. Real enough to genuinely help you with templates \ud83d\ude0a" },
    { match: ["who made you","who created you","who built you"], reply: "I'm Hexa, built for LazyDog Templates to help you find, buy, and use the right design." },
    { match: ["what can you do","how can you help","what do you do"], reply: "I help you find templates, explain pricing & licenses, open pages, switch language, and answer questions — just ask or tap the \ud83c\udfa4 mic." },

    // --- off-topic → polite, on-brand deflection (no API) ---
    { match: ["what is the date","whats the date","today's date","what date","what day is it","date today"], reply: "I stick to LazyDog templates, so I can't give the date — your device clock has that \ud83d\ude0a But I can help you find the perfect template!" },
    { match: ["what time","current time","time now","clock"], reply: "Time's outside my world \ud83d\ude0a — I'm your templates assistant. Need a deck, media kit, or invoice?" },
    { match: ["weather","temperature","how hot","how cold","raining"], reply: "Weather's not my area \ud83d\ude04 — but I can find you a great design. Want to see some?" },
    { match: ["tell me a joke","a joke","make me laugh"], reply: "I'm better at slides than punchlines \ud83d\ude04 — but I can find a pitch deck that lands. Want a look?" },
    { match: ["news","stock","cricket","football","match score","who won"], reply: "That's outside my lane \ud83d\ude0a — I focus on LazyDog templates. Want me to find you a design?" }
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Longest-phrase-match wins (same principle as the voice dictionary matcher),
  // so specific phrases beat generic ones like "kit".
  function chatMatch(text) {
    var lower = norm(text);
    if (!lower) return null;
    var dict = window.vaDictionary || [];
    var best = null, bestLen = 0;
    for (var i = 0; i < dict.length; i++) {
      var b = dict[i];
      var phr = b.phrases || [];
      for (var j = 0; j < phr.length; j++) {
        var p = norm(phr[j]);
        if (p && lower.indexOf(p) !== -1 && p.length > bestLen) {
          best = b; bestLen = p.length;
        }
      }
    }
    if (!best) return null;
    var tgt = (best.action === 'navigate') ? best.target : null;
    var exec = !!tgt && /\b(open|show|take me|go to|goto|bring|browse|see|view|visit)\b/.test(lower);
    return { reply: OVERRIDES[best.id] || best.reply, target: tgt, label: tgt ? labelForUrl(tgt) : null, execute: exec };
  }

  window.chatCompose = function (text) {
    try {
      var low = norm(text);
      // 0) custom FAQ (edit CHAT_FAQ at the top of this file)
      for (var fi = 0; fi < CHAT_FAQ.length; fi++) {
        var fe = CHAT_FAQ[fi], fm = fe.match || [];
        for (var fj = 0; fj < fm.length; fj++) {
          if (fm[fj] && low.indexOf(norm(fm[fj])) !== -1) {
            return { reply: fe.reply, target: fe.target || null, label: fe.target ? labelForUrl(fe.target) : null, execute: !!fe.execute };
          }
        }
      }
      // "What's new" intent → open the What's New keynote.
      if (/(what ?s? new|new feature|new features|any updates|what changed|latest update|new arrivals|new templates|whats new)/.test(low)) {
        return { reply: "Here's what's new at LazyDog 👇", target: 'whats_new_keynote.html', label: "See What's New" };
      }
      // "Coming soon" intent → keynote will be linked once provided.
      if (/(coming soon|what ?s? coming|whats coming|road ?map|upcoming|next plan|planned|future features)/.test(low)) {
        return { reply: "Here's what's coming next 👇", target: 'coming_soon.html', label: "See Coming Soon" };
      }
      return chatMatch(text);
    } catch (e) { return null; }
  };

  // ── AI ACTIONS ──────────────────────────────────────────────
  // The AI may end a reply with "ACTION: <key>" to open a page. These keys map
  // to the SAME destinations the voice/mic engine uses.
  var ACTION_TARGETS = {
    pitch_decks: { url: 'pitch_deck_folder_section.html', label: 'Open Pitch Decks' },
    media_kits:  { url: 'media_kits_folder_section.html', label: 'Open Media Kits' },
    web_kits:    { url: 'web_kit_folder_file.html',       label: 'Open Website UI Kits' },
    invoice:     { url: 'invoice.html',                    label: 'Open Invoice Generator' },
    home:        { url: 'main.html',                       label: 'Go to Store Hub' },
    whats_new:   { url: 'whats_new_keynote.html',          label: "See What's New" }
  };
  function labelForUrl(url) {
    for (var k in ACTION_TARGETS) { if (ACTION_TARGETS[k].url === url) return ACTION_TARGETS[k].label; }
    return 'Open';
  }
  window.chatLabelForUrl = labelForUrl;

  // Strip the ACTION directive from the visible text and return its target (if any).
  // -> { text: <clean reply>, target: <url or null>, label: <button label or null> }
  window.chatParseAction = function (reply) {
    reply = String(reply || '');
    var target = null, label = null;
    var m = reply.match(/ACTION:\s*([a-z_]+)/i);
    if (m && ACTION_TARGETS[m[1].toLowerCase()]) {
      target = ACTION_TARGETS[m[1].toLowerCase()].url;
      label  = ACTION_TARGETS[m[1].toLowerCase()].label;
    }
    var text = reply.replace(/\n?\s*ACTION:\s*[a-z_]+\s*$/i, '')
                    .replace(/ACTION:\s*[a-z_]+/i, '')
                    .trim();
    return { text: text, target: target, label: label };
  };

  // Build a click-to-open button. NOTHING auto-navigates — the visitor decides.
  window.chatMakeActionBtn = function (url, label) {
    var a = document.createElement('a');
    a.href = url;
    a.textContent = (label || labelForUrl(url)) + ' →';
    a.style.cssText = 'display:inline-block;margin-top:8px;padding:8px 13px;' +
      'background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;border-radius:0;' +
      'font-size:12px;font-weight:700;text-decoration:none;cursor:pointer;font-family:Inter,sans-serif;';
    return a;
  };

  // ── #3 REAL RECOMMENDATIONS — Hexa searches the actual kit metadata ────────
  // Widgets call: if (hexaRecommendIntent(text)) hexaRecommend(text).then(rec =>
  //   hexaRenderRecs(bubble, rec) || fallThroughToAI())
  var REC_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/recommend_http';
  var REC_VERB = /\b(show|find|recommend|suggest|need|want|looking for|look for|search|any|got|have|browse|see|give me|do you)\b/;
  var REC_NOUN = /\b(deck|decks|kit|kits|template|templates|design|designs|keynote|keynotes|presentation|presentations|slides)\b/;

  window.hexaRecommendIntent = function (text) {
    var t = norm(text);
    return REC_VERB.test(t) && REC_NOUN.test(t);
  };

  window.hexaRecommend = function (text) {
    return fetch(REC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: String(text || '').slice(0, 300), limit: 4 })
    }).then(function (r) { return r.json(); })
      .then(function (rec) {
        try { memSet({ last_topic: String(text || '').slice(0, 120) }); } catch (e) {}
        // Nothing in stock for this ask → remember it as a lead interest (#4)
        if (!rec || !rec.results || !rec.results.length) hexaInterest = String(text || '').slice(0, 200);
        return rec;
      });
  };

  // ── #5 MEMORY — remember returning visitors (localStorage, device-local) ───
  var MEM_KEY = 'hexa_mem';
  function memGet() {
    try { return JSON.parse(localStorage.getItem(MEM_KEY)) || {}; } catch (e) { return {}; }
  }
  function memSet(patch) {
    try {
      var m = memGet();
      for (var k in patch) m[k] = patch[k];
      m.last_visit = Date.now();
      m.visits = m.visits || 1;
      localStorage.setItem(MEM_KEY, JSON.stringify(m));
    } catch (e) {}
  }
  window.hexaMemory = { get: memGet, set: memSet };

  // Count a visit once per page-load
  (function () {
    try {
      var m = memGet();
      if (!m.last_visit || Date.now() - m.last_visit > 30 * 60 * 1000) memSet({ visits: (m.visits || 0) + 1 });
    } catch (e) {}
  })();

  // Personalised greeting for the widget's first bubble (null = keep default)
  window.hexaGreeting = function () {
    var m = memGet();
    if (!m.name && !m.last_topic) return null;
    var hi = m.name ? 'Welcome back, ' + m.name + '! 👋' : 'Welcome back! 👋';
    if (m.last_topic) return hi + " Last time you were looking for “" + m.last_topic + "” — want me to check what's new for that? Or ask me anything.";
    return hi + ' Ask me about templates, pricing, formats, or your order.';
  };

  // "my name is X / call me X / i'm X" → remember + warm reply
  var NAME_STOP = { a:1, an:1, the:1, just:1, here:1, back:1, good:1, fine:1, ok:1, okay:1, not:1, so:1, very:1, really:1, still:1, also:1, now:1, new:1, sure:1, sorry:1, done:1, interested:1, looking:1, searching:1, trying:1, wondering:1, browsing:1, buying:1, asking:1 };
  window.hexaNameCapture = function (text) {
    var t = norm(text);
    var m = t.match(/\b(?:my name is|call me|i am|i m)\s+([a-z][a-z\-']{1,20})\b/);
    if (!m || NAME_STOP[m[1]]) return null;
    // "i am/i'm" only counts in short, name-like messages ("hi i'm sara")
    if (/\b(i am|i m)\b/.test(t) && !/\b(my name is|call me)\b/.test(t) && t.split(' ').length > 5) return null;
    var name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    memSet({ name: name });
    return { reply: 'Lovely to meet you, ' + name + '! 😊 What can I find for you — a pitch deck, media kit, or web kit?' };
  };

  // ── DESIGN ORDERS — "make me a hospital kit, black bg, 8 slides" ──────────
  // Detected by verbs of creation (not browsing). Shows an "Open in Designer"
  // button → editor.html?compose=<sentence>. The editor + cloud do the rest.
  var DESIGN_VERB = /\b(make|design|create|compose|build|generate|prepare)\b/;
  var DESIGN_NOUN = /\b(kit|kits|deck|decks|presentation|presentations|template|templates|design|slides)\b/;
  window.hexaDesignIntent = function (text) {
    var t = norm(text);
    return DESIGN_VERB.test(t) && DESIGN_NOUN.test(t);
  };
  window.hexaDesign = function (text) {
    return {
      reply: "I can design that for you right now 🎨 — opening it in the LazyDog Designer:",
      target: 'editor.html?compose=' + encodeURIComponent(String(text || '').slice(0, 200)),
      label: 'Open in Designer'
    };
  };

  // ── #4 LEAD CAPTURE — visitor emails → server → private `leads` collection ─
  // Widgets call hexaLeadCapture(text) right after hexaCommand. Returns
  // { reply } when it handled the message (email saved / email requested).
  var LEAD_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/lead_http';
  var EMAIL_RX = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  var NOTIFY_RX = /\b(notify me|let me know|email me|mail me|inform me|update me|alert me|tell me when|ping me|keep me (posted|updated)|when (it s|its|it is|they are|available|ready))\b/;
  var hexaInterest = '';   // last thing the visitor wanted that we didn't have

  window.hexaLeadCapture = function (text) {
    var raw = String(text || '');
    var m = raw.match(EMAIL_RX);
    if (m) {
      var email = m[0].toLowerCase();
      try {
        fetch(LEAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            interest: hexaInterest,
            page: (location.pathname || '').split('/').pop() || 'home'
          })
        }).catch(function () {});
      } catch (e) {}
      var why = hexaInterest ? ' as soon as we add what you were looking for' : ' when fresh designs drop';
      memSet({ email: email });
      hexaInterest = '';
      return { reply: "Perfect — I've saved " + email + " 📬 I'll make sure you hear about it" + why + "!" };
    }
    if (NOTIFY_RX.test(norm(raw))) {
      return { reply: "Happy to! Just type your email here and I'll save it 📬" };
    }
    return null;
  };

  // Renders results into the given bubble. Returns true if it rendered
  // anything (caller then skips the AI cascade), false otherwise.
  window.hexaRenderRecs = function (bubble, rec) {
    var res = (rec && rec.results) || [];
    if (!res.length || !bubble) return false;
    var why = res[0].match && res[0].match.length ? ' for "' + res[0].match.join(', ') + '"' : '';
    bubble.textContent = (res.length === 1
      ? 'Found a great match' + why + ' 👇'
      : 'Found ' + res.length + ' matches' + why + ' 👇');
    for (var i = 0; i < res.length; i++) {
      var r = res[i];
      var label = r.name + (r.slides ? ' · ' + r.slides + ' slides' : '');
      var a = window.chatMakeActionBtn(r.url || '#', label);
      a.target = '_blank'; a.rel = 'noopener';
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(a);
    }
    return true;
  };

  // ── Hexa command executor: run top-bar controls (language / mic / colour) ──
  var LANGS = {english:['en','English'],arabic:['ar','العربية'],spanish:['es','Español'],french:['fr','Français'],german:['de','Deutsch'],dutch:['nl','Nederlands'],japanese:['ja','日本語'],indonesian:['id','Bahasa Indonesia'],thai:['th','ภาษาไทย'],vietnamese:['vi','Tiếng Việt'],korean:['ko','한국어'],persian:['fa','فارسی'],farsi:['fa','فارسی'],hindi:['hi','हिन्दी'],turkish:['tr','Türkçe'],polish:['pl','Polski'],russian:['ru','Русский'],ukrainian:['uk','Українська'],italian:['it','Italiano'],urdu:['ur','اردو'],bengali:['bn','বাংলা'],malay:['ms','Bahasa Melayu'],swahili:['sw','Kiswahili'],filipino:['tl','Filipino'],tagalog:['tl','Filipino'],greek:['el','Ελληνικά'],czech:['cs','Čeština'],romanian:['ro','Română'],hungarian:['hu','Magyar'],swedish:['sv','Svenska'],norwegian:['no','Norsk'],danish:['da','Dansk'],portuguese:['pt','Português (Brasil)'],chinese:['zh-CN','简体中文'],mandarin:['zh-CN','简体中文']};
  var COLOURS = {red:'#e03030',blue:'#2b45f0',green:'#1b7f3e',gold:'#d4af37',golden:'#d4af37',purple:'#7c3aed',orange:'#ff6b35',pink:'#ec4899',teal:'#14b8a6',black:'#111111',cyan:'#06b6d4',yellow:'#eab308'};
  window.hexaCommand = function(text){
    var t=String(text||'').toLowerCase();
    // LANGUAGE
    var lh=null,ln=null;
    for(var nm in LANGS){ if(t.indexOf(nm)!==-1){ lh=LANGS[nm]; ln=nm; break; } }
    if(lh && /(language|translat|site|page|speak|switch|change|convert|version|read)/.test(t)){
      try{ if(window.nbSetLang) window.nbSetLang(lh[0],lh[1]); }catch(e){}
      return { reply: "Switching the site to "+ln.charAt(0).toUpperCase()+ln.slice(1)+"…" };
    }
    if(/(change|switch|set).{0,12}(language|translat)/.test(t) || /(language|translat).{0,8}(to|into)/.test(t)){
      return { reply: "That language isn't in our list — but the 🌐 menu up top has 30+ options." };
    }
    // MIC
    if(/\b(mic|microphone|voice)\b/.test(t)){
      if(/\b(off|stop|disable|close|end)\b/.test(t)){ try{ if(window.toggleVoiceAssistant) window.toggleVoiceAssistant(); }catch(e){} return { reply:"Voice turned off." }; }
      if(/\b(on|start|open|enable|activate|use|begin|turn)\b/.test(t)){ try{ if(window.toggleVoiceAssistant) window.toggleVoiceAssistant(); }catch(e){} return { reply:"Voice is on — speak your command 🎤" }; }
    }
    // COLOUR
    if(/(colou?r|theme|accent)/.test(t) && /(change|set|make|switch|turn|use)/.test(t)){
      for(var c in COLOURS){ if(t.indexOf(c)!==-1){ try{ var pk=document.getElementById('nbCPicker'); if(pk){ pk.value=COLOURS[c]; pk.dispatchEvent(new Event('input',{bubbles:true})); pk.dispatchEvent(new Event('change',{bubbles:true})); } }catch(e){} return { reply:"Accent colour changed to "+c+"." }; } }
      return { reply:"Pick a colour like red, blue, gold or purple — or use the 🎨 menu up top." };
    }
    // APPS — open an external editor in a NEW browser tab
    var APPS={powerpoint:'https://www.office.com/launch/powerpoint',figma:'https://www.figma.com',canva:'https://www.canva.com','google slides':'https://docs.google.com/presentation/',keynote:'https://www.icloud.com/keynote'};
    var APPNAMES={powerpoint:'PowerPoint',figma:'Figma',canva:'Canva','google slides':'Google Slides',keynote:'Keynote'};
    if(/(open|launch|start|go to|take me to|use)/.test(t)){
      for(var ap in APPS){
        if(t.indexOf(ap)!==-1){
          if(ap==='keynote' && t.indexOf('digital')!==-1) continue; // "digital keynotes" = our category
          try{ window.open(APPS[ap],'_blank'); }catch(e){}
          return { reply:"Opening "+APPNAMES[ap]+" in a new tab ↗" };
        }
      }
    }
    // FOOTER / legal pages (internal navigation)
    var PAGES={'terms and conditions':'terms.html','privacy policy':'terms.html#privacy','refund policy':'terms.html#refund','frequently asked':'faq.html','cookie':'terms.html','privacy':'terms.html#privacy','refund':'terms.html#refund','terms':'terms.html','faq':'faq.html'};
    if(/(open|show|take me|go to|see|view|read)/.test(t)){
      for(var pg in PAGES){ if(t.indexOf(pg)!==-1){ try{ window.location.href=PAGES[pg]; }catch(e){} return { reply:"Opening "+pg+"…" }; } }
    }
    return null;
  };

})();
