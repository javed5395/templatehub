// ============================================================
// MIC_ACTION.JS — Voice Assistant (extracted from navbar.js)
// ============================================================
// This used to live inline inside navbar.js. It has been pulled out into
// its own file so navbar.js stays lighter and the voice assistant — a big,
// sensitive, actively-evolving piece of the system — can be edited and
// tested in isolation without risking the rest of the navbar/site.
//
// Loaded by navbar.js via a dynamically-injected <script> tag (see the
// "BRIDGE" comment in navbar.js, right next to the Google Translate script
// load) — so no individual HTML page needs to reference this file directly.
//
// It controls the existing 🎤 Voice button in the Features dropdown:
//   <button id="vaBtn" onclick="toggleVoiceAssistant()">🎤</button>
// and the gender toggle button inside its bubble:
//   <button id="vaGenderBtn" onclick="vaToggleGender()">♀ Female</button>
// Both of those elements are still drawn by navbar.js — only the BEHAVIOR
// moved here. Nothing about the button's id, appearance, or onclick names
// changed, so nothing on any page needed to be touched.
//
// Matches commands against window.vaDictionary (va_dictionary.js).
// ============================================================

(function () {

  // ── VOICE ASSISTANT ──
  var vaRecognition = null;
  var vaListening = false;
  var vaGender = 'female';
  var vaRestarting = false; // guards against rapid restart churn (see onend below)

  function vaSpeak(text) {
    if (!text) return;
    var u = new SpeechSynthesisUtterance(text);
    var voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      u.voice = vaGender === 'male'
        ? (voices.find(function(v){ return v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark') || v.name.toLowerCase().includes('male'); }) || voices[0])
        : (voices.find(function(v){ return v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female'); }) || voices[0]);
    }
    window.speechSynthesis.speak(u);
  }

  function vaShowBubble(text) {
    var bubble = document.getElementById('vaBubble');
    var msg = document.getElementById('vaBubbleMsg');
    if (!bubble || !msg) return;
    msg.textContent = text;
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateX(0)';
  }

  // ── Whole-phrase match against the curated dictionary ───────────────────
  // Unchanged behavior — every existing FAQ answer, greeting, nav phrase,
  // and stop/gender control keeps working exactly as it always has. Now
  // returns its match LENGTH too, so vaHandleCommand can compare it fairly
  // against the word-level engine below instead of always favoring it.
  function vaMatchDictionary(lower) {
    var commands = window.vaDictionary || [];
    var best = null;
    var bestLen = 0;
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      var phrases = cmd.phrases || [];
      for (var j = 0; j < phrases.length; j++) {
        if (lower.includes(phrases[j].toLowerCase()) && phrases[j].length > bestLen) {
          best = cmd;
          bestLen = phrases[j].length;
        }
      }
    }
    return { cmd: best, len: bestLen };
  }

  // ── Word-level intent engine ────────────────────────────────────────────
  // Finds an ACTION word/verb (open, show, go to...) and a TARGET word/noun
  // (pitch deck, social media kits, invoice...) anywhere in the sentence —
  // in any order, regardless of filler words like "I want you to" — and
  // combines them into a command. This is what lets a sentence that was
  // NEVER typed into va_dictionary.js (e.g. "I want you to open social
  // media kits") still work, as long as its action word and target word
  // are both known. Data lives in va_dictionary.js (vaActionWords /
  // vaTargetWords) — add new pages or verbs there, not here.
  //
  // ── STEMMER ── so nobody has to hand-list every plural/tense of a word.
  // "kit"/"kits", "open"/"opens"/"opened"/"opening", "deck"/"decks" etc. are
  // treated as the same word by chopping common English endings before
  // comparing. This is a lightweight heuristic (not a full dictionary
  // lookup), so it deliberately protects a short list of common words that
  // LOOK plural but aren't (this/was/has/...), then strips -ies/-ing/-ed/-s.
  var VA_STEM_SKIP = [
    'is', 'was', 'has', 'this', 'yes', 'his', 'its', 'us', 'plus',
    'across', 'always', 'news', 'address', 'business', 'less', 'unless',
    'gas', 'bus', 'status'
  ];
  function vaStem(word) {
    word = word.toLowerCase();
    if (word.length < 3 || VA_STEM_SKIP.indexOf(word) !== -1) return word;
    if (word.length > 4 && word.slice(-3) === 'ies') return word.slice(0, -3) + 'y';   // studies -> study
    if (word.length > 5 && word.slice(-3) === 'ing') return word.slice(0, -3);          // opening -> open
    if (word.length > 4 && word.slice(-2) === 'ed')  return word.slice(0, -2);          // opened -> open
    if (word.length > 3 && word.slice(-2) === 'es' &&
        ['s','x','h','z'].indexOf(word.slice(-3, -2)) !== -1) return word.slice(0, -2); // boxes -> box
    if (word.length > 2 && word.slice(-1) === 's' && word.slice(-2) !== 'ss')
      return word.slice(0, -1);                                                         // kits -> kit
    return word;
  }
  // Normalizes a whole phrase (sentence OR a dictionary keyword) into
  // space-joined stems, so the existing substring/"includes" matching below
  // keeps working unchanged — it just now compares stemmed text instead of
  // raw text.
  function vaStemPhrase(str) {
    var words = str.toLowerCase().split(/[^a-z']+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < words.length; i++) out.push(vaStem(words[i]));
    return out.join(' ');
  }

  function vaFindActionPhrase(lower) {
    var stemmedLower = vaStemPhrase(lower);
    var words = (window.vaActionWords && window.vaActionWords.navigate) || [];
    var bestPhrase = null, bestLen = 0;
    for (var i = 0; i < words.length; i++) {
      var stemmedWord = vaStemPhrase(words[i]);
      if (stemmedLower.includes(stemmedWord) && words[i].length > bestLen) {
        bestPhrase = words[i];
        bestLen = words[i].length;
      }
    }
    return bestPhrase;
  }

  function vaFindTargetMatch(lower) {
    var stemmedLower = vaStemPhrase(lower);
    var groups = window.vaTargetWords || [];
    var bestGroup = null, bestLen = 0;
    for (var i = 0; i < groups.length; i++) {
      var kws = groups[i].keywords || [];
      for (var j = 0; j < kws.length; j++) {
        var stemmedKw = vaStemPhrase(kws[j]);
        if (stemmedLower.includes(stemmedKw) && kws[j].length > bestLen) {
          bestGroup = groups[i];
          bestLen = kws[j].length;
        }
      }
    }
    return { group: bestGroup, len: bestLen };
  }

  // ── FORM-FILL MODE ──────────────────────────────────────────────────────
  // Relays spoken lines straight into the metadata search widget's own
  // chat box (search_widget.js), exactly as if the user had typed the line
  // and pressed Enter there. Reuses that widget's own field-extraction
  // engine instead of duplicating it here — search_widget.js itself is not
  // modified. Data (start/stop trigger phrases) lives in va_dictionary.js
  // as vaFormControlWords.
  var vaFormFillMode = false;

  function vaFindControlPhrase(lower, list) {
    var bestPhrase = null, bestLen = 0;
    for (var i = 0; i < list.length; i++) {
      if (lower.includes(list[i]) && list[i].length > bestLen) {
        bestPhrase = list[i];
        bestLen = list[i].length;
      }
    }
    return bestPhrase;
  }

  function vaRelayToSearchWidget(transcript) {
    var input = document.getElementById('userInput');
    if (!input) {
      vaSpeak('The search filter card is not open on this page.');
      return;
    }
    input.value = transcript;
    var evt;
    try {
      evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    } catch (ex) {
      evt = document.createEvent('Event');
      evt.initEvent('keydown', true, true);
      evt.key = 'Enter';
    }
    input.dispatchEvent(evt); // triggers search_widget.js's own Enter listener -> sendMsg()
    var replies = document.querySelectorAll('#chatBox .msg.engine');
    var lastReply = replies.length ? replies[replies.length - 1].textContent : '';
    vaSpeak(lastReply || 'Noted.');
  }

  // ── DIRECT FIELD FILLING ────────────────────────────────────────────────
  // "colour red" / "fill the style field with modern" etc. This finds the
  // real <select>/<input> on the card and selects/sets the real <option> —
  // the same DOM change a mouse click would make — instead of going through
  // the chat text-parser (which only affected scoring, not the visible
  // field). Reads the field's CURRENT live options at match time, so it
  // automatically stays correct as more decks/metadata get added later;
  // nothing here needs to be hand-updated with new colors/styles/etc.
  function vaFindFieldMatch(lower) {
    var groups = window.vaFieldWords || [];
    var bestGroup = null, bestKeyword = null, bestLen = 0;
    for (var i = 0; i < groups.length; i++) {
      var kws = groups[i].keywords || [];
      for (var j = 0; j < kws.length; j++) {
        if (lower.includes(kws[j]) && kws[j].length > bestLen) {
          bestGroup = groups[i];
          bestKeyword = kws[j];
          bestLen = kws[j].length;
        }
      }
    }
    return bestGroup ? { group: bestGroup, keyword: bestKeyword } : null;
  }

  function vaExtractFieldValue(transcript, matchedKeyword) {
    var text = ' ' + transcript.toLowerCase() + ' ';
    text = text.split(matchedKeyword).join(' ');
    var fillers = window.vaFieldFillFillers || [];
    for (var i = 0; i < fillers.length; i++) {
      var re = new RegExp('\\b' + fillers[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      text = text.replace(re, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function vaFillField(fieldGroup, valueText) {
    var el = document.getElementById(fieldGroup.id);
    if (!el) return { ok: false, reason: "that field isn't on this page" };
    if (!valueText) return { ok: false, reason: "I didn't catch a value to set" };

    if (fieldGroup.numeric) {
      var num = valueText.match(/\d+/);
      if (!num) return { ok: false, reason: 'I did not hear a number' };
      el.value = num[0];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true, label: num[0] };
    }

    var stemmedValue = vaStemPhrase(valueText);
    var options = Array.prototype.slice.call(el.options);
    var best = null, bestLen = 0;
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      if (!o.value) continue; // skip the blank "Any" option
      var stemmedOpt = vaStemPhrase(o.value);
      if (stemmedOpt && stemmedValue.includes(stemmedOpt) && stemmedOpt.length > bestLen) {
        best = o;
        bestLen = stemmedOpt.length;
      }
    }
    if (!best) {
      return { ok: false, reason: 'no current deck has "' + valueText + '" for that field yet' };
    }
    if (fieldGroup.multi) {
      best.selected = true;
    } else {
      el.value = best.value;
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, label: best.textContent };
  }

  function vaHandleCommand(transcript) {
    var lower = transcript.toLowerCase();
    vaShowBubble(transcript);

    // ── Form-fill mode gets first priority over everything else below ──
    var formWords = window.vaFormControlWords || { start: [], stop: [] };
    if (vaFormFillMode && vaFindControlPhrase(lower, formWords.stop)) {
      vaFormFillMode = false;
      vaSpeak('Okay, stopped filling the form.');
      return;
    }
    if (!vaFormFillMode && vaFindControlPhrase(lower, formWords.start)) {
      vaFormFillMode = true;
      vaSpeak('Ok, please proceed with the data — I will fill each field as you speak.');
      return;
    }
    if (vaFormFillMode) {
      var fieldMatch = vaFindFieldMatch(lower);
      if (fieldMatch) {
        var valueText = vaExtractFieldValue(transcript, fieldMatch.keyword);
        var result = vaFillField(fieldMatch.group, valueText);
        if (result.ok) {
          vaSpeak('Set ' + fieldMatch.group.id.replace('f_', '') + ' to ' + result.label + '.');
        } else {
          vaSpeak("I heard you, but " + result.reason + ".");
        }
      } else {
        // No known field name heard — treat it as a free-text description
        // instead (e.g. "luxury beauty brand"), same as typing into the chat box.
        vaRelayToSearchWidget(transcript);
      }
      return;
    }

    // Run BOTH systems and let the LONGER, more specific match win —
    // instead of always favoring the dictionary. This matters because the
    // dictionary still has generic bare words like "kit" / "kits" (from
    // the original media-kit entry), which would otherwise swallow a more
    // specific new phrase like "social media kits" before the word-level
    // engine ever got a chance to recognize it.
    var dictMatch = vaMatchDictionary(lower);
    var targetMatch = vaFindTargetMatch(lower);
    var actionPhrase = vaFindActionPhrase(lower);

    var best = null;
    if (dictMatch.cmd && dictMatch.len >= targetMatch.len) {
      best = dictMatch.cmd;
    } else if (targetMatch.group) {
      // A recognized target/noun is enough to act on its own (matches how
      // bare nouns like "pitch deck" already worked) — but this is also
      // exactly the case where an action word (verb) is present alongside
      // it, e.g. "open" + "social media kits".
      best = { action: 'navigate', target: targetMatch.group.target, reply: targetMatch.group.reply };
    } else if (dictMatch.cmd) {
      best = dictMatch.cmd; // dictionary matched something, target engine found nothing
    }

    if (!best && actionPhrase) {
      // Recognized a verb but no known target — ask instead of failing silently.
      vaSpeak('Open what? You can say pitch decks, media kits, digital keynotes, career docs, web kits, invoice, or home.');
      return;
    }

    if (best) {
      vaSpeak(best.reply || 'Done');
      if (best.action === 'navigate' && best.target) {
        setTimeout(function(){ window.location.href = best.target; }, 1200);
      }
    } else {
      vaSpeak('Sorry, I did not understand that.');
    }
  }

  window.toggleVoiceAssistant = function() {
    var btn = document.getElementById('vaBtn');
    if (!vaListening) {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { alert('Voice not supported. Use Chrome.'); return; }
      vaRecognition = new SR();
      vaRecognition.continuous = true;
      vaRecognition.interimResults = true; // live captions — show text as the user is still speaking
      vaRecognition.lang = 'en-US';
      vaRecognition.onresult = function(e) {
        var res = e.results[e.results.length - 1];
        var t = res[0].transcript.trim();
        vaShowBubble(t); // live-update the bubble on every partial result, not just the final one
        if (res.isFinal) {
          vaHandleCommand(t);
        }
      };
      vaRecognition.onerror = function(e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          vaListening = false;
          if (btn) btn.classList.remove('va-listening');
          vaShowBubble('Mic access denied');
        }
        // other errors (network, no-speech) — let onend handle restart
      };
      vaRecognition.onend = function() {
        // Auto-restart if still supposed to be listening (Chrome stops after silence).
        // Restarting the SAME instance instantly, over and over, is what makes Chrome
        // treat this as continuous indefinite mic use and re-surface the "Allow while
        // visiting" reminder. A short pause between stop and restart avoids that churn.
        if (vaListening && !vaRestarting) {
          vaRestarting = true;
          setTimeout(function(){
            vaRestarting = false;
            if (vaListening) { try { vaRecognition.start(); } catch(ex) {} }
          }, 300);
        }
      };
      vaRecognition.start();
      vaListening = true;
      if (btn) btn.classList.add('va-listening');
      vaSpeak('Voice assistant on');
    } else {
      vaRecognition.stop();
      vaListening = false;
      if (btn) btn.classList.remove('va-listening');
      vaSpeak('Voice assistant off');
    }
  };

  window.vaToggleGender = function() {
    var btn = document.getElementById('vaGenderBtn');
    vaGender = vaGender === 'female' ? 'male' : 'female';
    if (btn) btn.textContent = vaGender === 'female' ? '♀ Female' : '♂ Male';
    vaSpeak('Voice changed to ' + vaGender);
  };

  // ── Reusable: run the SAME word-compiler on TYPED text and return a composed
  // answer WITHOUT speaking. Lets the typed chat box use the free compiler
  // before ever falling through to the AI cascade. Voice path is untouched.
  // Returns { reply, target } or null.
  window.vaComposeReply = function(text) {
    try {
      var lower = String(text || '').toLowerCase().trim();
      if (!lower) return null;
      var dictMatch = vaMatchDictionary(lower);
      var targetMatch = vaFindTargetMatch(lower);
      var best = null;
      if (dictMatch.cmd && dictMatch.len >= targetMatch.len) {
        best = dictMatch.cmd;
      } else if (targetMatch.group) {
        best = { action: 'navigate', target: targetMatch.group.target, reply: targetMatch.group.reply };
      } else if (dictMatch.cmd) {
        best = dictMatch.cmd;
      }
      if (best && best.reply) {
        return { reply: best.reply, target: (best.action === 'navigate') ? best.target : null };
      }
    } catch (e) {}
    return null;
  };

})();


/* ══════════════════════════════════════════════════════════════════════════
   APPEND-ONLY PATCH LOG — mic_action.js
   House rule (Javed, 7 Aug 2026): nothing above this line is deleted or
   rewritten. Every change is a NEW timestamped block appended here that
   overrides the earlier definition. To undo a patch, delete only its block.
   ══════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 23:10 UTC · Opus · BUG No. 13 (and the cause of BUG No. 14)
   The small chat bubble resets to the first-time welcome on a casual question.

   PROVED ON THE LIVE SITE, not guessed. On www.lazydogtemplates.com/index.html:
     · Sent "do you have media kits"  -> "Opening Media Kits for you." (fine)
     · Sent "would you like to have a cup of tea with me?"
         -> "Hello! Welcome to LazyDogTemplates. I can help you find pitch
             decks, media kits, or invoices. What are you looking for?"
     · I wrapped window.fetch first: ZERO network calls were made. So the AI was
       never asked — the reply was manufactured on the page.
     · window.chatCompose(text) returned null (correct: "I don't know this, send
       it to the AI"). window.vaComposeReply(text) returned the greeting.
     · Cause, exactly: vaMatchDictionary (line ~66 above) matches with
           lower.includes(phrases[j])
       a RAW SUBSTRING test. The greeting entry lists the phrase "yo".
       "would YOu like to have a cup of tea with me?" contains "yo" inside
       "you". One two-letter substring hijacked the whole sentence.
   chat_brain.js's own matcher fixed this same class of bug long ago — its
   comment reads "whole-word (or simple plural) match — 'hi' must not match
   inside 'anything', 'this', 'white'…". That fix never reached this file.

   THIS IS ALSO THE ROOT OF BUG No. 14. vaComposeReply is consulted by
   navbar.js (line 977) and search_widget.js (line 942) as a fallback after
   chatCompose — but NOT by Hexa_Promptbox.html. So the big "Hexa World" page
   sends unknown sentences to the live AI and answers naturally, while the small
   bubble hands them to this substring matcher first. That is precisely why one
   surface "handled the same situations better" than the other. Fixing it here
   fixes both consumers at once, without touching three files.

   THE FIX (wraps window.vaComposeReply; the original stays intact above):
   after the original produces a reply, we check whether the dictionary entry it
   came from ACTUALLY matches on a whole-word basis. If it does not — i.e. the
   match was a substring accident — we return null, and the caller falls through
   to the live AI exactly as it should have. The word-level target engine
   (vaFindTargetMatch, which is stemmed and token-based) is left alone.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 23:10 UTC · bugs 13 + 14';

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* whole-word (or simple plural) — the same rule chat_brain.js uses */
  function wholeWordHit(haystack, phrase) {
    var p = norm(phrase);
    if (!p) return false;
    var pad = ' ' + norm(haystack) + ' ';
    return pad.indexOf(' ' + p + ' ') !== -1 || pad.indexOf(' ' + p + 's ') !== -1;
  }

  var _prev = window.vaComposeReply;

  window.vaComposeReply = function (text) {
    var res = null;
    try { res = _prev ? _prev.apply(this, arguments) : null; } catch (e) { return null; }
    if (!res || !res.reply) return res;

    try {
      var dict = window.vaDictionary || [];
      var owner = null;
      for (var i = 0; i < dict.length; i++) {
        if (dict[i] && dict[i].reply === res.reply) { owner = dict[i]; break; }
      }
      /* Reply did not come from a dictionary entry (the stemmed target engine
         produced it) — leave it exactly as it was. */
      if (!owner) return res;

      var phrases = owner.phrases || [];
      for (var j = 0; j < phrases.length; j++) {
        if (wholeWordHit(text, phrases[j])) return res;     /* a real match */
      }

      /* Got here => the only reason this entry won was a substring accident
         ("yo" inside "you"). Say nothing and let the caller ask the AI. */
      try {
        console.warn('[vaComposeReply ' + PATCH + '] dropped a substring-only match on "' +
                     String(text).slice(0, 60) + '" (entry: ' + (owner.id || '?') + ') — passing to the AI instead');
      } catch (e) {}
      return null;
    } catch (e) { return res; }
  };

  try { console.log('[mic_action patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 00:20 UTC · Opus · VOICE AUDIT (not one of the 15)
   "Does Hexa listen properly, do actions, and reply?" — answer, measured:
   she listens fine and speaks fine, but the mic that can THINK cannot TALK,
   and the mic that TALKS cannot think.

   MEASURED by stubbing SpeechRecognition + speechSynthesis and driving the
   real code with fake transcripts:

     🎤 nav-bar Voice button (#vaBtn -> toggleVoiceAssistant, this file)
        · navigation: WORKS   "open pitch decks" -> spoken + navigates
        · speaks every reply aloud: YES
        · brain: NONE. vaHandleCommand never calls chatCompose and never calls
          the AI (verified: zero network traffic). So by voice:
              "my name is Sarah"            -> "Sorry, I did not understand that."
              "I am feeling really stressed…"-> "Sorry, I did not understand that."
              "how much does a pitch deck cost" -> just navigates away
        · and it inherits the substring matcher, so ordinary speech is hijacked:
              "can I use this commercially"   -> the first-time WELCOME GREETING
                                                ("hi" inside "t-hi-s")
              "…but got nothing"              -> greeting ("hi" inside "not-hi-ng")
              "do you do custom work"         -> greeting ("yo" inside "yo-u")

     🎤 chat-bubble mic (#hexaMicBtn -> hexaMic, navbar.js ~line 1003)
        · brain: FULL. It dictates into helpbotSend, which runs the whole
          cascade — chat_brain (all fifteen fixes) then the live AI.
        · speaks the reply: NEVER. Not one call to speechSynthesis anywhere in
          navbar.js, Hexa_Promptbox.html, search_widget.js or chat_brain.js.

   So the good mic was mute. THIS BLOCK gives it a voice, which is the smaller
   and safer half of the fix: the chat-bubble mic already has correct
   whole-word matching (chat_brain) and the AI behind it, so nothing has to be
   re-plumbed — it just needed to say its answer out loud.

   Deliberate choices:
     · It speaks ONLY when the message was DICTATED. Typing stays silent —
       nobody wants a shop page talking at them because they typed.
     · The ♀/♂ choice is honoured by reading the existing #vaGenderBtn label,
       so the nav-bar voice picker keeps working for this mic too.
     · Link/button text inside a reply is not read aloud, and the reply is
       spoken once, after it stops changing (replies stream in).
   window.hexaMic is OVERRIDDEN here; navbar.js's original is untouched and
   this file is injected by navbar.js afterwards, so this definition wins.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 00:20 UTC · voice audit';

  function preferredVoice() {
    var wantMale = false;
    try {
      var b = document.getElementById('vaGenderBtn');
      wantMale = !!(b && /male/i.test(b.textContent) && !/female/i.test(b.textContent));
    } catch (e) {}
    var voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
    if (!voices.length) return null;
    var pick = wantMale
      ? voices.filter(function (v) { return /david|mark|male/i.test(v.name) && !/female/i.test(v.name); })[0]
      : voices.filter(function (v) { return /zira|female/i.test(v.name); })[0];
    return pick || voices[0];
  }

  function speak(text) {
    if (!text) return;
    try {
      var clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 400);
      if (!clean) return;
      var u = new SpeechSynthesisUtterance(clean);
      var v = preferredVoice();
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable — the text is on screen regardless */ }
  }
  window.hexaSpeak = speak;

  /* Watch the chat thread for the NEXT bot reply, read it once it settles. */
  function speakNextReply() {
    var thread = document.getElementById('lbThread');
    if (!thread) return;
    var startCount = thread.querySelectorAll('.lb-msg.bot').length;
    var timer = null, done = false, observer = null;

    function finish() {
      if (done) return;
      done = true;
      try { observer && observer.disconnect(); } catch (e) {}
      clearTimeout(timer);
      var bots = thread.querySelectorAll('.lb-msg.bot');
      var last = bots[bots.length - 1];
      if (!last) return;
      /* read the words, not the button label on the end of the bubble */
      var copy = last.cloneNode(true);
      try {
        Array.prototype.forEach.call(copy.querySelectorAll('a,button'), function (n) {
          if (n.parentNode) n.parentNode.removeChild(n);
        });
      } catch (e) {}
      var txt = (copy.textContent || '').trim();
      if (txt && !/^[.·…\s]*$/.test(txt)) speak(txt);
    }

    observer = new MutationObserver(function () {
      var bots = thread.querySelectorAll('.lb-msg.bot');
      if (bots.length <= startCount) return;      /* reply bubble not added yet */
      clearTimeout(timer);
      timer = setTimeout(finish, 700);           /* settled = stopped changing */
    });
    observer.observe(thread, { childList: true, subtree: true, characterData: true });
    setTimeout(finish, 25000);                   /* hard stop, never leaks */
  }

  var _prevHexaMic = window.hexaMic;

  window.hexaMic = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser — please type instead.");
      return;
    }
    var r = new SR();
    r.lang = (document.documentElement.lang || 'en-US');
    r.interimResults = false;
    r.maxAlternatives = 1;
    var btn = document.getElementById('hexaMicBtn');
    if (btn) btn.textContent = '●';
    r.onresult = function (e) {
      var tx = '';
      try { tx = e.results[0][0].transcript; } catch (err) {}
      if (!tx) return;
      var inp = document.getElementById('helpbotInput');
      if (inp) inp.value = tx;
      speakNextReply();                          /* <- the whole point */
      if (window.helpbotSend) window.helpbotSend(tx);
    };
    r.onend   = function () { if (btn) btn.textContent = '🎤'; };
    r.onerror = function () { if (btn) btn.textContent = '🎤'; };
    try { r.start(); } catch (e) { if (btn) btn.textContent = '🎤'; }
  };

  try { console.log('[mic_action patch] ' + PATCH + ' installed — chat-bubble mic now speaks its replies'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 00:55 UTC · Opus · RETIRE THE NAV-BAR VOICE ASSISTANT
   Decision (Javed, this session): now that the Hexa chat-box mic listens,
   thinks, acts AND speaks, the nav-bar 🎤 Voice button is the weaker duplicate
   and comes out. Keep one mic that does everything.

   Why the nav-bar one loses, measured earlier today:
     · no brain — vaHandleCommand never reaches chatCompose or the AI, so none
       of the fifteen fixes exist through it
     · substring matching — "can I use this commercially" answered with the
       first-time welcome greeting, because "hi" sits inside "t-hi-s"
     · recognition hardcoded to en-US while the site has a language switcher
   The Hexa box mic beats it on every one of those, and now speaks too.

   NOTHING IS DELETED — house rule. The #vaBtn and #vaBubble markup stays
   exactly where it is in navbar.js (lines ~245 and ~626), and navbar.js is not
   edited at all. This block only:
     1. hides the nav-bar Voice tile and the floating voice bubble,
     2. MOVES the real ♀/♂ picker node into the Hexa chat box — moved, not
        recreated, so vaToggleGender() still finds it by id and the speaking
        code above still reads it to choose the voice,
     3. makes toggleVoiceAssistant a no-op that points at the Hexa mic, in case
        anything still calls it, and stops any session already listening.
   To bring the old assistant back, delete this one block.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 00:55 UTC · retire nav-bar voice';

  function install() {
    var vaBtn    = document.getElementById('vaBtn');
    var vaBubble = document.getElementById('vaBubble');
    var gender   = document.getElementById('vaGenderBtn');
    var micBtn   = document.getElementById('hexaMicBtn');
    /* wait until the navbar AND the chat bubble have both been injected */
    if (!vaBtn || !vaBubble || !gender || !micBtn) return false;
    if (document.getElementById('ldVoiceRetired')) return true;

    var mark = document.createElement('meta');
    mark.id = 'ldVoiceRetired';
    document.head.appendChild(mark);

    /* 1. hide the old entry points (hidden, not removed) */
    var st = document.createElement('style');
    st.textContent =
      '#vaBtn{display:none!important;}' +
      '#vaBubble{display:none!important;}' +
      '#vaGenderBtn{background:#eef1ff;border:1px solid #d8ddff;color:#5b5bd6;' +
        'border-radius:8px;padding:3px 9px;font-size:10.5px;cursor:pointer;' +
        "font-family:Poppins,'Segoe UI',sans-serif;line-height:1.4;white-space:nowrap;}" +
      '#vaGenderBtn:hover{background:#e2e7ff;}';
    document.head.appendChild(st);
    /* the tile wrapper has no id of its own — hide it so the "Voice" caption goes too */
    try {
      var tile = vaBtn.closest ? vaBtn.closest('.nb-fd-item') : null;
      if (tile) tile.style.display = 'none';
    } catch (e) {}

    /* 2. MOVE the real picker node into the Hexa chat box. appendChild MOVES
       it, so its id survives — vaToggleGender() still finds it, and the
       speaking code above still reads it to pick the voice. */
    try {
      gender.removeAttribute('style');          /* drop the dark-bubble styling */
      gender.setAttribute('title', 'Switch Hexa\u2019s speaking voice');
      gender.setAttribute('aria-label', 'Switch speaking voice');
      var wrap = document.createElement('span');
      wrap.id = 'hexaVoicePickWrap';
      wrap.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;';
      wrap.appendChild(gender);                 /* <- the move */
      micBtn.parentNode.insertBefore(wrap, micBtn);
    } catch (e) {
      try { console.warn('[' + PATCH + '] could not move the voice picker:', e && e.message); } catch (_) {}
    }

    /* 3. neutralise the old assistant */
    try {
      window.toggleVoiceAssistant = function () {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        var m = document.getElementById('hexaMicBtn');
        if (m && m.click) m.click();            /* send anyone who lands here to the good mic */
      };
    } catch (e) {}

    try { console.log('[mic_action patch] ' + PATCH + ' installed — one mic now, in the Hexa box'); } catch (e) {}
    return true;
  }

  var n = 0, t = setInterval(function () { n++; if (install() || n > 200) clearInterval(t); }, 100);
})();
