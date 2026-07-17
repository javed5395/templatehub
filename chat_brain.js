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
    'greeting': "Hi! 👋 I can help you find pitch decks, media kits, website UI kits, or the free invoice generator — and answer questions about buying, editing, formats and licensing. What do you need?",
    'identity_assistant': "I'm the LazyDog Templates assistant. I can help you find templates, explain pricing and licensing, and answer questions about buying, downloading and editing.",
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
    return {
      reply: OVERRIDES[best.id] || best.reply,
      target: (best.action === 'navigate') ? best.target : null
    };
  }

  window.chatCompose = function (text) {
    try { return chatMatch(text); } catch (e) { return null; }
  };

  // ── AI ACTIONS ──────────────────────────────────────────────
  // The AI may end a reply with "ACTION: <key>" to open a page. These keys map
  // to the SAME destinations the voice/mic engine uses.
  var ACTION_TARGETS = {
    pitch_decks: 'pitch_deck_folder_section.html',
    media_kits:  'media_kits_folder_section.html',
    web_kits:    'web_kit_folder_file.html',
    invoice:     'invoice.html',
    home:        'main.html'
  };
  // Strip the ACTION directive from the visible text and return its target (if any).
  // -> { text: <clean reply>, target: <url or null> }
  window.chatParseAction = function (reply) {
    reply = String(reply || '');
    var target = null;
    var m = reply.match(/ACTION:\s*([a-z_]+)/i);
    if (m && ACTION_TARGETS[m[1].toLowerCase()]) target = ACTION_TARGETS[m[1].toLowerCase()];
    var text = reply.replace(/\n?\s*ACTION:\s*[a-z_]+\s*$/i, '')
                    .replace(/ACTION:\s*[a-z_]+/i, '')
                    .trim();
    return { text: text, target: target };
  };

})();
