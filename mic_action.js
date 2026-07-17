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
      vaSpeak('Open what? You can say pitch decks, media kits, social media kits, career docs, web kits, invoice, or home.');
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
