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
    // 2 Aug 2026 (Javed) — greeting and help now name ALL FOUR things Hexa does.
    // They used to mention only finding templates and the invoice tool, which
    // undersold the card that MAKES designs and the card that FILLS decks.
    'greeting': "Hi! 👋 I'm Hexa. I can <strong>find</strong> you a design, <strong>make</strong> you a brand-new one, <strong>fill</strong> a presentation with your content, or build you a <strong>free invoice</strong> — and answer anything about buying, editing, formats and licensing. What do you need?",
    'identity_assistant': "I'm Hexa, the LazyDog Templates assistant. I can help you find templates, explain pricing and licensing, and answer questions about buying, downloading and editing.",
    'help': "Ask me to find a design, make you a brand-new one, prepare a presentation from your content, or open the free invoice generator — or ask anything about pricing, licenses, file formats, editing, or your order.",
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
    { match: ["how are you","how r u","how are u","how are ya","how you doing","how ya doing","hows it going","how is it going","how do you do","how have you been","hru"], reply: "I'm doing great, thanks for asking \ud83d\ude0a How are you? And what can I help you find today \u2014 a pitch deck, media kit, or web kit?", soft: true },
    { match: ["hello","hi hexa","hey hexa","hey there"], reply: "Hey! \ud83d\udc4b I'm Hexa. Want help finding a pitch deck, media kit, or web kit?" , soft: true},
    { match: ["thank you","thanks","thankyou","thx"], reply: "Anytime! \ud83d\udc9b Anything else I can help you find?" , soft: true},
    { match: ["are you human","are you a robot","are you real","are you ai","are you a bot"], reply: "I'm Hexa — LazyDog's assistant. Real enough to genuinely help you with templates \ud83d\ude0a" , soft: true},
    { match: ["who made you","who created you","who built you"], reply: "I'm Hexa, built for LazyDog Templates to help you find, buy, and use the right design." , soft: true},
    // 2 Aug 2026 (Javed) — this used to be ONE line about finding templates, and
    // it was marked soft:true, which handed the question to the live AI. The AI
    // did not know Hexa can MAKE designs or FILL presentations, so it answered
    // with the old "I find templates and invoices" line. soft is now OFF, so this
    // library answer is what the visitor actually sees — keep it up to date.
    { match: ["what can you do","what all can you do","what all u can do","what all can u do","how can you help","what do you do","what can u do","what are you able to do"],
      reply: "Here's what I can do for you 👇<br><br>" +
             "🔎 <strong>Find you a design</strong> — tell me what you need and I'll pull the closest matches from the library.<br>" +
             "🎨 <strong>Make you a brand-new design</strong> — describe it and I'll build it for you in the LazyDog Designer.<br>" +
             "📄 <strong>Prepare your presentation</strong> — give me your content and a design, and I'll fill the deck for you.<br>" +
             "🧾 <strong>Make you a free invoice</strong> — no account needed.<br><br>" +
             "And I can answer anything about prices, licenses, file formats, editing or your order." },
    // RETIRED 2 Aug 2026 — the whole line below is commented out. It was the old
    // one-line answer, now replaced by the fuller one above. Kept only so you can
    // see what it used to say:
    // { match: ["what can you do"], reply: "I help you find templates, explain pricing and licenses, open pages, switch language, and answer questions — just ask or tap the \ud83c\udfa4 mic." , soft: true},

    // --- off-topic → polite, on-brand deflection (no API) ---
    { match: ["what is the date","whats the date","today's date","what date","what day is it","date today"], reply: "I stick to LazyDog templates, so I can't give the date — your device clock has that \ud83d\ude0a But I can help you find the perfect template!" },
    { match: ["what time","current time","time now","clock"], reply: "Time's outside my world \ud83d\ude0a — I'm your templates assistant. Need a deck, media kit, or invoice?" },
    { match: ["weather","temperature","how hot","how cold","raining"], reply: "Weather's not my area \ud83d\ude04 — but I can find you a great design. Want to see some?" },
    { match: ["tell me a joke","a joke","make me laugh"], reply: "I'm better at slides than punchlines \ud83d\ude04 — but I can find a pitch deck that lands. Want a look?" },
    { match: ["news","stock","cricket","football","match score","who won"], reply: "That's outside my lane \ud83d\ude0a — I focus on LazyDog templates. Want me to find you a design?" },

    // ── refunds & payment problems ─────────────────────────────
    { match: ["refund","money back","cancel my order","chargeback"], reply: "Digital files can't be un-downloaded, so refunds are only for genuine problems — a corrupt file, the wrong item, or a duplicate charge. Email <strong>support@lazydogtemplates.com</strong> with your order number and we'll sort it within 24 hours." },
    { match: ["paid but no file","payment done but","paid but didnt get","money deducted","charged twice","double charge"], reply: "Sorry about that. Your purchase is saved to your account — sign in and check <strong>My Purchases</strong> first. If it isn't there, email <strong>support@lazydogtemplates.com</strong> with the payment reference and we'll fix it fast." },
    { match: ["payment failed","payment declined","card declined","checkout not working","cant pay"], reply: "Try a different card or browser first — most failures are the bank declining an international charge. If it still fails, email <strong>support@lazydogtemplates.com</strong> and tell us your country and card type." },
    { match: ["invoice for my purchase","need a receipt","tax invoice","billing receipt","purchase receipt"], reply: "Your payment receipt is emailed automatically at checkout, and it's also in <strong>My Purchases</strong>. Need a company name or tax number added? Email us and we'll reissue it." },

    // ── licensing ──────────────────────────────────────────────
    { match: ["difference between personal and commercial","personal vs commercial","which license","what license do i need","licence difference"], reply: "<strong>Personal</strong> is for your own non-paid use — study, portfolio, a personal project. <strong>Commercial</strong> covers business use: client work, a company deck, anything that earns money. Both are one-time purchases, priced on each template's page." },
    { match: ["use for client","client work","freelance use","client ke liye","agency use","use for my company"], reply: "That needs the <strong>Commercial</strong> license — it covers client and company work, including paid projects." },
    { match: ["can i resell","resell the template","sell the template","redistribute","share with friend","give to a friend","upload somewhere else"], reply: "No — you can use the design in your own work, but you can't resell, redistribute or share the template file itself. That applies to both licenses." },
    { match: ["use in a course","teaching","students","classroom","use for youtube","use in a video"], reply: "Yes, as long as you're presenting the design rather than selling the file. If the course or channel earns money, use the <strong>Commercial</strong> license." },
    { match: ["how many projects","use it more than once","multiple projects","use again","one license how many"], reply: "One purchase covers unlimited projects for you or your company — you just can't pass the file on to someone else." },
    { match: ["do i need to credit","attribution","give credit","mention lazydog"], reply: "No credit needed. Use it as your own work." },

    // ── formats & what's inside ────────────────────────────────
    { match: ["what format","which format","file format","what do i get","whats included","file type"], reply: "You get an editable <strong>.pptx</strong> (PowerPoint / Google Slides / Keynote), plus a PDF preview. Fonts are free Google Fonts with links in the readme, and images are placeholders you replace with your own." },
    { match: ["is it editable","can i edit","fully editable","edit everything"], reply: "Yes — every text box, colour, shape and image placeholder is editable. Nothing is flattened into a picture." },
    { match: ["fonts included","which fonts","font missing","font not showing"], reply: "We use free Google Fonts and list them with download links in the readme. If text looks wrong, the font just isn't installed yet — install it and reopen the file." },
    { match: ["images included","stock photos","are photos included","can i use the images"], reply: "Photos in the previews are placeholders for demonstration and aren't licensed for redistribution. Swap in your own images, or free ones from Unsplash or Pexels." },
    { match: ["psd","photoshop file","illustrator","ai file","figma file","sketch file","indesign"], reply: "Templates ship as <strong>.pptx</strong>. We don't include PSD, AI, Figma or InDesign source files." },
    { match: ["how many slides does it","how many slides in this","how many slides are in","slide count","number of pages"], reply: "It varies by template — the slide count is listed on each design's page, and you can duplicate or delete slides freely." },

    // ── editing in specific apps ───────────────────────────────
    { match: ["open in powerpoint","works in powerpoint","powerpoint version","ms office","which powerpoint"], reply: "Any PowerPoint from 2013 onward, on Windows or Mac, plus Microsoft 365. Just open the .pptx normally." },
    { match: ["google slides","open in google slides","gslides"], reply: "Yes — upload the .pptx to Google Drive and open it with Google Slides. Install the listed fonts first, or Slides will substitute them." },
    { match: ["canva","open in canva","import to canva"], reply: "Canva can import a .pptx, but it rebuilds the layout, so expect some spacing and font drift. PowerPoint, Google Slides or Keynote stay closest to the original design." },
    { match: ["keynote","mac keynote","open in keynote"], reply: "Yes — Keynote opens .pptx files directly. Install the listed fonts first for the closest match." },
    { match: ["libreoffice","openoffice","wps office","free alternative"], reply: "They'll open the file, but effects and spacing can shift. PowerPoint or Google Slides give the most faithful result." },
    { match: ["edit on phone","edit on mobile","mobile editing","phone se edit","tablet"], reply: "You can edit in the PowerPoint or Google Slides mobile apps, but a laptop is far easier for detailed work." },
    { match: ["change colours","change colors","recolour","rebrand","apply my brand","my brand colors"], reply: "Yes — every colour is editable. In PowerPoint, use <em>Design → Variants → Colours</em> to swap the whole palette at once, or recolour shapes individually." },
    { match: ["add my logo","insert logo","put my logo"], reply: "Yes — drop your logo onto any slide, or place it on the slide master to have it repeat across the deck." },

    // ── delivery & access ──────────────────────────────────────
    { match: ["how long delivery","when will i get","delivery time","shipping","instant download"], reply: "It's instant. The download link appears right after payment and is emailed to you, and it stays in <strong>My Purchases</strong> for re-downloading." },
    { match: ["download again","re download","lost the file","file gone","download expired","link expired"], reply: "Sign in and open <strong>My Purchases</strong> — every template you've bought stays there permanently, so you can re-download any time." },
    { match: ["download not working","download failed","file wont open","corrupt file","cant open the file"], reply: "Try a different browser and check the file finished downloading. If it still won't open, email <strong>support@lazydogtemplates.com</strong> with your order number and we'll resend it." },
    { match: ["do i need an account","without signing up","guest checkout"], reply: "Browsing is open to everyone. You need an account to buy, so your purchases are saved and you can re-download them later." },
    { match: ["how many devices","download limit","how many times can i download"], reply: "No limit — download as often as you like from <strong>My Purchases</strong>." },

    // ── invoice generator (free tool) ──────────────────────────
    { match: ["invoice generator","invoice tool","make an invoice","create invoice"], reply: "Our Invoice Generator is completely free — build an invoice, add your logo and items, and export a clean PDF. No account needed.", target: "invoice.html" },
    { match: ["is the invoice free","invoice cost","invoice price","invoice paid"], reply: "The Invoice Generator is free with no limits. Only the design templates are paid.", target: "invoice.html" },
    { match: ["invoice pdf","download invoice","save invoice","print invoice"], reply: "Fill in the invoice and hit export — it saves as a PDF you can email or print straight away.", target: "invoice.html" },
    { match: ["invoice logo","add logo to invoice","invoice currency","change currency","tax on invoice","vat","gst"], reply: "You can add your logo, set the currency, and add a tax or VAT line — it's all in the invoice builder.", target: "invoice.html" },

    // ── selling on LazyDog ─────────────────────────────────────
    { match: ["can i sell here","sell my templates","become a seller","seller account","submit my design","contributor","sell my designs"], reply: "We're building out our seller programme now. Email <strong>support@lazydogtemplates.com</strong> with samples of your work and we'll get back to you when applications open." },
    { match: ["seller commission","revenue share","how much do sellers earn","payout"], reply: "Commission and payout terms go out with the seller application — email <strong>support@lazydogtemplates.com</strong> and we'll send the current details." },
    { match: ["upload my template","how to upload","submit template"], reply: "Uploads are open to approved sellers only for now. Email <strong>support@lazydogtemplates.com</strong> with samples to start the process." },

    // ── practical buying questions ─────────────────────────────
    { match: ["discount","coupon","promo code","voucher","sale","cheaper","student discount","bundle"], reply: "Deals go out by email — drop yours in and I'll make sure you hear about the next one. Bundles are on their way too." },
    { match: ["custom design","hire you","design for me","custom work","made to order","commission a design"], reply: "We don't take custom commissions at the moment. If nothing fits, tell me the industry and style you're after and I'll suggest the closest template." },
    { match: ["which template should i","recommend","suggest a template","best template for","what do you recommend","help me choose"], reply: "Happy to help — tell me what it's for (pitch deck, media kit, web kit), your industry, and any colour you have in mind, and I'll pull up the closest matches." },
    { match: ["can i see a sample","free sample","try before buy","demo file","preview the file"], reply: "Every template page has a full slide-by-slide preview so you can see all the content before buying." },
    { match: ["is my payment safe","secure checkout","is it safe","card safe"], reply: "Checkout is handled by a secure payment provider — your card details never touch our servers." },
    { match: ["contact","support","talk to a human","email you","customer service"], reply: "Email <strong>support@lazydogtemplates.com</strong> — a real person replies, usually within 24 hours." },

    // ── conversational: acknowledgement ────────────────────────
    { match: ["awesome","great","nice one","good job","that helped","that helps","cool","perfect","amazing","brilliant","excellent","lovely","superb","well done","you re the best","legend"], reply: "Glad that helped 😊 Anything else you'd like me to find?" },
    { match: ["ok thanks","okay thanks","alright thanks","got it thanks","cheers"], reply: "You're welcome! Shout if you need anything else." },
    { match: ["bye","goodbye","see you","later","good night","talk later"], reply: "Bye for now 👋 Come back any time — I'll be right here." },
    { match: ["sorry","my bad","oops"], reply: "No need to apologise 😊 What can I help you with?" },

    // ── negative / cancel ──────────────────────────────────────
    { match: ["never mind","nevermind","forget it","cancel that","stop that","dont bother","no thanks","no thank you","not really","nope","not now"], reply: "No problem — I'll leave that. Just say the word when you need something." },
    { match: ["thats wrong","that s not right","not what i meant","wrong answer","you misunderstood","not that"], reply: "Sorry about that — let me try again. Tell me in your own words what you're after and I'll narrow it down." },

    // ── follow-ups ─────────────────────────────────────────────
    { match: ["tell me more","more info","more details","give details","explain","elaborate","what do you mean","how does that work","go on"], reply: "Happy to. Which part would you like me to expand — pricing, licences, file formats, editing, or finding the right template?" },
    { match: ["why","how come","whats the reason"], reply: "Ask me the full question and I'll explain properly — for example “why do I need the commercial licence?”" },
    { match: ["are you sure","really","is that correct","you sure"], reply: "That's what our current terms say. If something looks off, email <strong>support@lazydogtemplates.com</strong> and a human will confirm it for you." },

    // ── human support ──────────────────────────────────────────
    { match: ["talk to a human","real person","speak to someone","live chat","agent","representative","support team","contact owner","human support","someone real"], reply: "Of course — email <strong>support@lazydogtemplates.com</strong> and a real person will reply, usually within 24 hours. Tell them your order number if it's about a purchase." },

    // ── template quality questions ─────────────────────────────
    { match: ["professionally designed","who designed this","who makes these","are these original","designed by"], reply: "Every template is designed in-house by our own designers — no reselling of stock files." },
    { match: ["investor ready","is it good enough for investors","professional enough","will it impress"], reply: "Our pitch decks are structured the way investors expect — problem, solution, market, traction, team, ask — so you're filling in your story rather than inventing a structure." },
    { match: ["does it include icons","icons included","are icons included"], reply: "Yes — icons are built in as editable vector shapes, so you can recolour and resize them freely." },
    { match: ["does it include charts","charts included","graphs included","infographics"], reply: "Most decks include editable charts and infographic layouts — the slide list on each template page shows exactly what's inside." },
    { match: ["is it animated","animations included","transitions included"], reply: "Templates are designed as static slides so they stay clean and reliable. You can add PowerPoint animations yourself if you want them." },
    { match: ["is it modern","is it up to date","current design","outdated"], reply: "Designs are kept current and we add new ones regularly — the newest work appears first on each category page." },

    // ── discovery: attributes we can genuinely search on ───────
    { match: ["with charts","with graphs","with infographics","with timelines","with maps","with tables","data heavy","lots of charts"], reply: "Tell me the category — pitch deck, media kit or web kit — and I'll look for designs heavy on charts and data for you." },
    { match: ["16 9","16:9","widescreen","4 3","4:3","a4","square format","aspect ratio"], reply: "Most decks are 16:9 widescreen; some are also offered in 4:3. The format is listed on each template's page." },
    { match: ["under 10 slides","fewer slides","short deck","less slides","10 slides","15 slides","20 slides","how long is the deck"], reply: "Slide counts vary and are listed on each design's page. Tell me roughly how many you need and I'll shortlist the closest ones." },
    { match: ["highly visual","image heavy","photo heavy","picture heavy","minimal text","lots of images"], reply: "I can look for image-led designs — which category are you after: pitch deck, media kit, or web kit?" },

    // ── KNOWLEDGE: pitching & decks ────────────────────────────
    //    Real answers to the questions people have while they are choosing
    //    a template. This is the layer that makes Hexa useful rather than
    //    just navigational — and none of it needs an API call.
    { match: ["what is a traction slide","traction slide"], reply: "The traction slide is your proof that this is working: revenue, users, growth rate, pilots, letters of intent, waitlist — whatever number is genuinely moving. Investors look at it before almost anything else. One chart beats five bullet points." },
    { match: ["what is an ask slide","ask slide","the ask"], reply: "The ask slide states how much you're raising, at what stage, and what the money buys — usually a runway figure and 2–3 milestones it gets you to. Be specific: “£500k for 18 months to reach £40k MRR” beats “seeking investment”." },
    { match: ["what slides should a pitch deck have","pitch deck structure","what to include in a pitch deck","deck structure","standard pitch deck"], reply: "The sequence investors expect: <strong>1</strong> title, <strong>2</strong> problem, <strong>3</strong> solution, <strong>4</strong> product/demo, <strong>5</strong> market size, <strong>6</strong> business model, <strong>7</strong> traction, <strong>8</strong> competition, <strong>9</strong> team, <strong>10</strong> the ask. Our pitch decks follow that order, so you fill in your story rather than invent a structure." },
    { match: ["how many slides should a pitch deck","how long should a pitch deck","ideal deck length","seed deck length"], reply: "Ten to twelve for a seed deck. Investors skim in under four minutes, so anything past fifteen tends to dilute rather than add. Keep detail for the appendix." },
    { match: ["what do investors look for","what investors want","how do investors decide"], reply: "In rough order: the size of the problem, why this team, and whether the numbers are moving. Most decisions turn on team and traction — the design's job is to get those across quickly and make you look like you have your act together." },
    { match: ["seed round","pre seed","series a","what stage"], reply: "Pre-seed is usually idea and early build, seed is early traction, Series A is repeatable growth. The deck structure stays similar — what changes is how much weight the traction and financial slides carry." },
    { match: ["how much text per slide","how much text","too much text","words per slide"], reply: "One idea per slide, and a headline that states the point rather than labelling the topic. “Revenue tripled in six months” works; “Revenue” doesn't. Detail belongs in the appendix or the conversation." },
    { match: ["should i use charts","charts or text","data visualisation","data visualization"], reply: "Use a chart whenever you're claiming a trend — a rising line is understood instantly, the same numbers in a sentence aren't. One chart per slide, with the takeaway written as the headline." },
    { match: ["appendix","backup slides","extra slides"], reply: "Keep an appendix after the ask for detailed financials, cohort data, and technical depth. It keeps the main deck tight while letting you answer hard questions properly." },
    { match: ["what is a media kit","whats a media kit","media kit for"], reply: "A media kit presents you or your brand to partners, sponsors and press: who your audience is, your reach and engagement, past collaborations, and your rates. Creators use it to win sponsorships; companies use it for press and partnerships." },
    { match: ["what goes in a media kit","media kit contents","media kit structure"], reply: "Typically: cover, about you or the brand, audience demographics, reach and engagement numbers, past work or collaborations, packages and rates, and contact. Our media kits are laid out in that order." },
    { match: ["what is a web kit","whats a web kit","ui kit for"], reply: "A web kit is a set of designed landing-page sections — hero, features, pricing, testimonials, footer — that you assemble into a site or hand to a developer, instead of designing each block from scratch." },
    { match: ["how to present","presentation tips","how to pitch","presenting tips","nervous"], reply: "Talk to the story, not the slides — the deck supports you, it isn't the script. Open with the problem in one sentence, land the traction number clearly, and rehearse the first ninety seconds until it's automatic. That opening carries most of the room." },
    { match: ["how long should i present","how long is a pitch","pitch length","time limit"], reply: "Ten minutes of talking, then questions, is the common format — demo days are often five. Build for the shortest version and let the appendix handle depth." },
    { match: ["what font should i use","best fonts for presentations","font pairing"], reply: "One font for headings, one for body, and stop there. Keep body text at 18pt or above so it survives a projector. Our templates already come with a paired set that works." },
    { match: ["what colours should i use","best colors for presentation","colour scheme","color scheme"], reply: "One accent colour used consistently, on a light or dark neutral base. Dark backgrounds look sharper on screen; light ones print and photocopy better. Pick for the room you'll actually be in." },
    { match: ["dark or light background","dark theme or light","which background"], reply: "Dark reads well on a screen or in a dim room and photographs nicely. Light is safer for print, handouts and bright rooms. If you're emailing the deck rather than presenting it, light usually wins." },
    { match: ["common mistakes","what not to do","deck mistakes","avoid"], reply: "The usual four: too many words per slide, no clear ask, a market size nobody believes, and burying traction on slide nine. Fixing those four lifts most decks more than any redesign." },

    // ══════════════════════════════════════════════════════════
    //  ADDED (Opus, Jul 2026) — extra factual Q&A, English only
    // ══════════════════════════════════════════════════════════
    { match: ["what is a pitch deck","whats a pitch deck","pitch deck meaning","define pitch deck"], reply: "A <strong>pitch deck</strong> is a short slide presentation that pitches your idea, product or company — usually to investors or partners.", target: "pitch_deck_folder_section.html" },
    { match: ["what is a media kit","whats a media kit","media kit meaning","define media kit"], reply: "A <strong>media kit</strong> presents you or your brand to sponsors, partners and press — audience stats, services, rates and contact.", target: "media_kits_folder_section.html" },
    { match: ["what is a web kit","whats a web kit","web kit meaning","landing page kit"], reply: "A <strong>web kit</strong> is ready-made landing-page and website UI you can adapt for your brand.", target: "web_kit_folder_file.html" },
    { match: ["what is a keynote","digital keynote meaning","whats a keynote deck"], reply: "A <strong>digital keynote</strong> is a polished talk or event presentation — great for webinars, conferences and launches.", target: "digital_keynote-folder.html" },
    { match: ["do you have resumes","resume templates","cv templates","career docs","do you have cv"], reply: "Yes — we have resumes, CVs, cover letters and more career documents, all editable and ATS-friendly.", target: "career_docs_folder_section.html" },
    { match: ["team license","multiple users","use across my team","company wide","how many seats","team use"], reply: "One purchase covers you and your company for unlimited projects. For a formal large-team licence, email <strong>support@lazydogtemplates.com</strong> and we'll advise." },
    { match: ["do i own it","who owns the design","copyright","intellectual property"], reply: "You get a licence to use the design in your own work; LazyDog keeps the copyright of the template itself. You can't resell or redistribute the file." },
    { match: ["can i print","print the slides","printing","print quality","handouts","print resolution"], reply: "Yes — export to PDF from PowerPoint or Google Slides and print. For large formats, check each element is high-resolution first." },
    { match: ["export to pdf","save as pdf","make a pdf","pdf export"], reply: "In PowerPoint use <em>File → Export → PDF</em>, or in Google Slides <em>File → Download → PDF</em>. The layout stays intact." },
    { match: ["export video","save as video","mp4","turn into video","video export"], reply: "PowerPoint can export a deck to MP4 via <em>File → Export → Create a Video</em>. Note our pptx export keeps objects but drops motion." },
    { match: ["change the colours","change the colors","recolour","recolor","rebrand","apply my brand colours","brand colors"], reply: "Every colour is editable. In PowerPoint use <em>Design → Variants → Colours</em> to swap the whole palette at once." },
    { match: ["add my logo","insert my logo","put my logo","place logo"], reply: "Drop your logo onto any slide, or add it to the slide master so it repeats across the whole deck." },
    { match: ["add slides","duplicate slides","delete slides","more slides","reorder slides","rearrange slides"], reply: "Yes — duplicate, delete and reorder slides freely. Right-click a slide thumbnail in PowerPoint or Google Slides." },
    { match: ["change fonts","different font","replace font","swap fonts"], reply: "You can change any font. We use free Google Fonts listed in the readme — install one and it renders exactly as designed." },
    { match: ["edit charts","change the graph","update the chart","edit data","infographics"], reply: "Charts are editable objects — click one and edit its data in PowerPoint or Slides. Decorative infographics are shapes you can recolour and relabel." },
    { match: ["speaker notes","presenter notes","notes section"], reply: "The notes area is free for your own speaker notes — add them in the notes pane below each slide." },
    { match: ["replace images","change the photos","swap pictures","add my photos","use my own images"], reply: "Preview photos are placeholders — right-click and replace with your own, or use free images from Unsplash or Pexels." },
    { match: ["are the images licensed","can i use the photos","stock photo rights"], reply: "Preview photos are for demonstration only and aren't licensed for redistribution. Swap in your own or free-to-use images before publishing." },
    { match: ["remove watermark","preview watermark","get rid of watermark"], reply: "Previews may carry a light watermark; the file you purchase is clean with no watermark." },
    { match: ["change my email","update email","wrong email on account"], reply: "Sign in and update it in your account settings. Locked out? Email <strong>support@lazydogtemplates.com</strong> from the original address." },
    { match: ["forgot password","reset password","cant log in","cannot sign in","login not working"], reply: "Use the <em>Forgot password</em> link on the sign-in screen, or sign in with Google in one tap. Still stuck? Email <strong>support@lazydogtemplates.com</strong>." },
    { match: ["delete my account","close my account","remove my data","gdpr","data protection"], reply: "You can request account or data deletion any time — email <strong>support@lazydogtemplates.com</strong> and we'll action it. We only store what's needed to run your account." },
    { match: ["is my data safe","do you sell my data","what do you do with my email","privacy"], reply: "We use your email only for your account, purchases and updates you opt into. We don't sell your data." },
    { match: ["what payment methods","how can i pay","which cards","do you take paypal","apple pay","google pay","payment options"], reply: "Checkout runs through a secure provider that accepts major debit and credit cards. Your card details never touch our servers." },
    { match: ["what currency","which currency","pay in dollars","currency shown","usd"], reply: "Prices are shown at checkout in the supported currency — the exact amount appears before you confirm." },
    { match: ["tax","vat","gst","sales tax"], reply: "Any applicable tax is shown at checkout, and your emailed receipt is a valid record. Need a company name or tax number on it? Email us and we'll reissue it." },
    { match: ["how many templates","how many designs","size of catalogue","how big is your library"], reply: "The library grows regularly across pitch decks, media kits, web kits and career docs. Browse a category to see the current selection." },
    { match: ["new templates","how often new","do you add new","fresh templates"], reply: "We add new designs regularly — tap ✨ What's New in the top bar, or leave your email and I'll tell you when fresh ones land." },
    { match: ["free updates","do i get updates","template updated","new version free"], reply: "If a template you bought gets an updated version, you can re-download it free from <strong>My Purchases</strong>." },
    { match: ["affiliate","referral program","earn by referring","partner program"], reply: "An affiliate programme isn't live yet — leave your email and I'll let you know when it launches." },
    { match: ["file size","how big is the file","download size","large file"], reply: "Most templates are a few megabytes — a quick download. Image-heavy media kits can be larger but still download fast." },
    { match: ["what language are templates","are templates in english","language of the template"], reply: "Templates are in English, but every text box is editable so you can translate the content into any language." },
    { match: ["buy for someone","gift a template","buy as a gift"], reply: "You can buy a template and use the exported design in your own work, but the file licence stays with the purchasing account." },
    { match: ["leave a review","rate the template","write a review","feedback"], reply: "We'd love that — reviews help other buyers. You'll find the option on your purchase, or email us your feedback any time." },
    { match: ["report a bug","something broken","site not working","page error","found an issue"], reply: "Thanks for flagging it — email <strong>support@lazydogtemplates.com</strong> with what you saw and we'll fix it fast." },
    { match: ["accessibility","screen reader","colour blind","accessible templates"], reply: "Because everything is fully editable, you can adjust contrast, font size and colours for accessibility. Tell me what you need and I'll point you to the cleanest layouts." },
  ];


  // ════════════════════════════════════════════════════════════════
  //  COMPOSITIONAL UNDERSTANDING  (verb + noun + qualifier)
  //  ---------------------------------------------------------------
  //  Everything above matches WHOLE PHRASES that someone wrote down in
  //  advance. This layer instead reads a sentence the way a person does:
  //     what do they want to DO (verb) · to WHAT (noun) · with what
  //     QUALIFIER (industry, colour, size, budget)
  //  and builds an answer from those parts. That means a sentence nobody
  //  ever typed into a list — "how much for a dark hospital deck with 8
  //  slides" — still gets a sensible reply instead of costing an AI call.
  //
  //  It runs LAST, so it can never override an existing exact answer.
  //  To teach it more: add words to VERBS / NOUNS / QUALS below.
  // ════════════════════════════════════════════════════════════════

  // WHAT THEY WANT TO DO. Order matters: the first category that matches
  // wins, so the more specific intents are listed before the vaguer ones.
  var VERBS = [
    ['price',     ['how much','price','pricing','cost','costs','rate','rates','charge','charges','fee','fees','expensive','cheap','afford','budget','worth']],
    ['compare',   ['difference','differance','vs','versus','compare','comparison','better','which one','or a','instead of']],
    ['license',   ['license','licence','licensing','rights','allowed','permission','legally','copyright','attribution','credit','resell','redistribute','commercially','commercial use','personal use','for business','for work']],
    ['edit',      ['edit','editing','change','changing','customise','customize','modify','tweak','adjust','recolour','recolor','replace','rebrand','swap','resize','translate']],
    ['support',   ['problem','issue','broken','not working','doesnt work','does not work','error','stuck','failed','wont open','cant open','corrupt','missing','help me with','wrong']],
    ['download',  ['download','downloading','downlod','donwload','save the file','get the file','get my file','get it again','my file again','re download','redownload','access my','retrieve']],
    ['buy',       ['buy','buying','purchase','purchasing','order','checkout','check out','pay','paying','payment','get it now']],
    ['create',    ['make me','design me','create me','build me','generate','compose me']],
    /* 'recommendation'/'recommendations' added 7 Aug 2026 (Bug 3): matching is
       whole-word, so "I need a recommendation for a dark saas pitch deck" never
       matched 'recommend' and fell through to a plain "Opening Pitch Decks". */
    ['recommend', ['recommend','recommendation','recommendations','suggest','suggestion','suggestions','best for','which should','what should i','help me choose','ideal for','right one','good for']],
    ['availability',['do you have','have you got','got any','is there','are there','available','availability','any chance','looking for','need a','need an','want a','want an']],
    ['browse',    ['open','show','see','view','browse','find','explore','list','take me','go to']]
  ];

  // WHAT THEY ARE TALKING ABOUT. `page` gives the Open button a destination.
  var NOUNS = [
    // 'social kit' removed 29 Jul 2026 — the category is not being built, and
    // this entry routed buyers to social_kits.html, which has never existed.
    ['pitch deck',  ['pitch deck','pitchdeck','pitch','slide deck','deck','decks','presentation','slides','powerpoint','ppt','keynote deck'], 'pitch_deck_folder_section.html'],
    ['media kit',   ['media kit','mediakit','press kit','brand kit','rate card','sponsorship kit','creator kit','collab kit'], 'media_kits_folder_section.html'],
    ['web kit',     ['web kit','website kit','ui kit','web ui','landing page','website template','web template','homepage'], 'web_kit_folder_file.html'],
    ['invoice',     ['invoice','invioce','bill','billing','receipt','recipt'], 'invoice.html'],
    ['account',     ['account','login','log in','sign in','signin','signup','sign up','password','my purchases'], null],
    ['order',       ['my order','order number','purchase history','my file','my download','order'], null],
    ['template',    ['template','templates','design','designs','file','files'], null]
  ];

  // THE QUALIFIER — the detail that makes their need specific. Recognised so
  // Hexa can repeat it back, which is what makes a reply feel understood.
  var QUALS = {
    industry: ['hospital','clinic','medical','healthcare','dental','doctor','pharma','startup','saas','tech','fintech','finance','bank','crypto','real estate','property','realtor','restaurant','cafe','food','fashion','beauty','salon','fitness','gym','education','school','college','course','travel','hotel','agency','law','legal','ngo','charity','event','wedding','music','podcast','gaming','ecommerce','retail','construction','logistics','dentist','surgeon','therapist','psychologist','veterinary','vet','physio','photographer','videographer','designer','architect','developer','freelancer','consultant','coach','trainer','recruiter','realestate','startup founder','founder','ecom','shopify','restaurant owner','bakery','coffee shop','bar','catering','florist','barber','spa','yoga','pilates','nutritionist','dietician','school teacher','tutor','university','nonprofit','ngo charity','church','mosque','sports','football club','esports','travel agency','tour operator','airline','shipping','manufacturing','saas startup','ai startup','app startup','fashion brand','clothing brand','jewellery','skincare','cosmetics','pet','automotive','car dealer','solar','energy','agriculture','farm','media house','magazine','newspaper','radio','film','production house'],
    colour:   ['black','white','dark','light','blue','red','green','purple','violet','pink','orange','yellow','gold','silver','grey','gray','navy','teal','pastel','neon','monochrome','colourful','colorful'],
    tone:     ['minimal','modern','clean','bold','elegant','luxury','premium','playful','fun','corporate','professional','creative','vintage','retro','futuristic','simple','classic']
  };

  /* Broad catch-all qualifiers. They are still recognised, but they lose to a
     specific word found in the same sentence — see findQuals below. */
  var GENERIC_QUAL = { startup: 1, tech: 1, agency: 1, founder: 1, business: 1 };

  function stemWords(t) { return ' ' + t + ' '; }

  function findVerb(t) {
    var pad = stemWords(t);
    for (var i = 0; i < VERBS.length; i++) {
      var words = VERBS[i][1];
      for (var j = 0; j < words.length; j++) {
        if (pad.indexOf(' ' + words[j] + ' ') !== -1 || t.indexOf(words[j]) === 0) return VERBS[i][0];
      }
    }
    return null;
  }

  // Longest noun wins, so "social media kit" beats "media kit" beats "kit".
  function findNoun(t) {
    var pad = stemWords(t), best = null, bestLen = 0;
    for (var i = 0; i < NOUNS.length; i++) {
      var words = NOUNS[i][2] !== undefined ? NOUNS[i][1] : [];
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        if ((pad.indexOf(' ' + w + ' ') !== -1 || pad.indexOf(' ' + w + 's ') !== -1) && w.length > bestLen) {
          best = { name: NOUNS[i][0], page: NOUNS[i][2] }; bestLen = w.length;
        }
      }
    }
    return best;
  }

  function findQuals(t) {
    var pad = stemWords(t), out = {};
    /* 7 Aug 2026 — BUG 3. This used to take the FIRST word in the list that
       matched and stop, so list order decided the answer. In "a fintech
       startup", 'startup' sits earlier in QUALS.industry than 'fintech', so
       Hexa read the sentence as a generic "startup" and threw the specific
       word away. Now: a SPECIFIC word always beats a broad catch-all, and
       otherwise the longest match wins ("fashion brand" beats "fashion"). */
    Object.keys(QUALS).forEach(function (k) {
      var best = null, bestLen = 0, bestGeneric = true;
      for (var i = 0; i < QUALS[k].length; i++) {
        var w = QUALS[k][i];
        if (pad.indexOf(' ' + w + ' ') === -1 && pad.indexOf(' ' + w + 's ') === -1) continue;
        var gen = !!GENERIC_QUAL[w];
        if (best === null || (bestGeneric && !gen) || (bestGeneric === gen && w.length > bestLen)) {
          best = w; bestLen = w.length; bestGeneric = gen;
        }
      }
      if (best) out[k] = best;
    });
    var n = t.match(/\b(\d{1,3})\s*(slides?|pages?)\b/);
    if (n) out.slides = n[1];
    return out;
  }

  function qualPhrase(q) {
    var bits = [];
    if (q.tone) bits.push(q.tone);
    if (q.colour) bits.push(q.colour);
    if (q.industry) bits.push(q.industry);
    var s = bits.join(' ');
    if (q.slides) s += (s ? ' ' : '') + q.slides + '-slide';
    return s;
  }

  // The answer matrix: what to say for each verb, given the noun and detail.
  function composeAnswer(verb, noun, q) {
    var what = noun ? noun.name : 'template';
    var detail = qualPhrase(q);
    var forDetail = detail ? ' for a <strong>' + detail + '</strong> one' : '';
    var page = noun && noun.page;

    switch (verb) {
      case 'price':
        if (what === 'invoice') return { reply: 'The Invoice Generator is <strong>free</strong> — no limits, no account needed.', target: 'invoice.html' };
        return { reply: 'Every ' + what + ' is a <strong>one-time purchase</strong>, no subscription — each design shows its <strong>Personal</strong> and <strong>Commercial</strong> price on its own page' + forDetail + '. Want me to open the ' + what + 's so you can see prices?', target: page };
      case 'buy':
        if (what === 'invoice') return { reply: "Nothing to buy — the Invoice Generator is free to use.", target: 'invoice.html' };
        return { reply: 'To buy: open the ' + what + ' you want → pick <strong>Personal</strong> or <strong>Commercial</strong> → checkout → instant download, saved to your account.', target: page };
      case 'download':
        if (what === 'order' || what === 'account') return { reply: 'Sign in and open <strong>My Purchases</strong> — everything you have bought stays there for re-downloading, with no limit.' };
        return { reply: 'After checkout the download appears instantly and is emailed to you, and it stays in <strong>My Purchases</strong> so you can grab it again any time.', target: page };
      case 'edit':
        return { reply: 'Yes — every ' + what + ' is fully editable: text, colours, shapes and image placeholders. Open the .pptx in PowerPoint, Google Slides or Keynote and change whatever you like' + (q.colour ? ', including recolouring it ' + q.colour : '') + '.', target: page };
      case 'license':
        return { reply: '<strong>Personal</strong> covers your own non-paid use; <strong>Commercial</strong> covers business and client work. Both let you use the ' + what + ' in unlimited projects — you just cannot resell or share the file itself.', target: page };
      case 'compare':
        return { reply: 'Quick version: a <strong>pitch deck</strong> pitches an idea to investors, a <strong>media kit</strong> presents you or your brand to partners and sponsors, and a <strong>web kit</strong> is landing-page UI. Tell me what you are actually presenting and I will point you at the right one.' };
      case 'recommend':
        return { reply: detail
            ? "For a <strong>" + detail + "</strong> " + what + " I can pull up the closest matches — want me to open them?"
            : 'Happy to help you choose — tell me what it is for, your industry, and any colour you have in mind, and I will narrow it down.',
          target: page };
      case 'support':
        return { reply: 'Sorry that is giving you trouble. Try a different browser first, and check <strong>My Purchases</strong> if it is a missing file. Still stuck? Email <strong>support@lazydogtemplates.com</strong> with your order number and we will sort it within 24 hours.' };
      case 'create':
        return null;   // creation is hexaDesign's job, not ours
      case 'availability':
        if (!noun && !detail) return null;
        if (!noun && q.industry) {
          return { reply: 'We may well have something for <strong>' + detail + '</strong> — '
            + 'tell me what you need it for and I will point you straight at it: '
            + 'a <strong>pitch deck</strong>, a <strong>media kit</strong>, or a <strong>web kit</strong>?' };
        }
        return { reply: detail
            ? 'Let me check what we have' + (detail ? ' for <strong>' + detail + '</strong>' : '') + ' — opening the ' + what + 's now. If nothing fits, tell me and I will note it for you.'
            : 'Yes — we have ' + what + 's. Want me to open them?',
          target: page };
      case 'browse':
        if (!noun) return null;
        return { reply: 'Opening ' + what + 's for you.', target: page, execute: !!page };
    }
    return null;
  }

  // Returns an answer for a sentence nobody wrote down, or null.
  // Intents where the sentence is a QUESTION about a product rather than a
  // request to open it. These must beat the phrase matcher.
  var STRONG = { price:1, buy:1, download:1, edit:1, license:1, compare:1,
                 recommend:1, support:1 };

  function hexaComposeIntent(text, strongOnly, requireDetail) {
    var t = norm(text);
    if (!t || t.split(' ').length > 30) return null;
    var verb = findVerb(t);
    var noun = findNoun(t);
    var q = findQuals(t);
    // needs at least a verb, plus something to act on
    if (!verb) return null;
    if (strongOnly && !STRONG[verb]) return null;
    if (!strongOnly && STRONG[verb]) return null;
    /* 7 Aug 2026 — BUG 3. requireDetail = "only answer if this ONE sentence
       already told me the product AND at least one detail about it". Used by
       chatCompose to let a complete sentence overtake the generic FAQ line
       that otherwise asks the visitor for details they have already given. */
    if (requireDetail && !(noun && Object.keys(q).length)) return null;
    if (!noun && !Object.keys(q).length
        && verb !== 'support' && verb !== 'compare' && verb !== 'license') return null;
    var a = composeAnswer(verb, noun, q);
    if (!a) return null;
    if (a.target) { a.label = labelForUrl(a.target); }
    return a;
  }
  // 29 Jul 2026 — RENAMED. This function composes an ANSWER OBJECT. navbar.js
  // exported a completely different function under the same global name that
  // returns a BOOLEAN (verb + deck-noun detection). Whichever script loaded
  // last silently won, so the same call behaved differently page to page —
  // which is exactly how "make 6 slides for me" got answered with "Opening
  // Pitch Decks for you" on one page and worked on another.
  // Consumers wanting the boolean use window.hexaComposeIntent (navbar.js, or
  // the inline copy on Hexa_Promptbox.html, which has no navbar).
  window.hexaComposeAnswer = hexaComposeIntent;


  // Real browser actions Hexa can perform on the page it is sitting on.
  var PAGE_CMDS = [
    [/\b(go back|previous page|back page|last page)\b/,      function(){ history.back(); },  'Going back.'],
    [/\b(go forward|next page|forward page)\b/,              function(){ history.forward(); }, 'Going forward.'],
    [/\b(scroll up|go up|move up)\b/,                        function(){ scrollBy(0,-600); }, 'Scrolling up.'],
    [/\b(scroll down|go down|move down)\b/,                  function(){ scrollBy(0,600); },  'Scrolling down.'],
    [/\b(top of page|scroll to top|go to top|back to top)\b/,function(){ scrollTo({top:0,behavior:'smooth'}); }, 'Back to the top.'],
    [/\b(bottom of page|scroll to bottom|go to bottom)\b/,   function(){ scrollTo({top:document.body.scrollHeight,behavior:'smooth'}); }, 'Down to the bottom.'],
    [/\b(refresh|reload)( the)?( page)?\b/,                  function(){ location.reload(); }, 'Refreshing the page.']
  ];
  window.hexaPageCommand = function (text) {
    var t = norm(text);
    for (var i = 0; i < PAGE_CMDS.length; i++) {
      if (PAGE_CMDS[i][0].test(t)) {
        try { PAGE_CMDS[i][1](); } catch (e) {}
        return { reply: PAGE_CMDS[i][2] };
      }
    }
    return null;
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
    var padded = ' ' + lower + ' ';
    var dict = window.vaDictionary || [];
    var best = null, bestLen = 0;
    for (var i = 0; i < dict.length; i++) {
      var b = dict[i];
      var phr = b.phrases || [];
      for (var j = 0; j < phr.length; j++) {
        var p = norm(phr[j]);
        if (!p || p.length <= bestLen) continue;
        // whole-word (or simple plural) match — "hi" must not match
        // inside "anything", "this", "white"…
        if (padded.indexOf(' ' + p + ' ') !== -1 || padded.indexOf(' ' + p + 's ') !== -1) {
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
      // 0a) page controls the browser can really do
      var pc = window.hexaPageCommand(text);
      if (pc) return pc;
      // 0b) "open the third one" / "next one" — only if we have results
      if (window.hexaResultNav) { var rn = window.hexaResultNav(text); if (rn) return rn; }
      /* 0α) 7 Aug 2026 — BUG 3 FIX: a COMPLETE sentence beats the generic FAQ.
         "recommend a pitch deck for a fintech startup" used to hit the CHAT_FAQ
         entry whose match list contains the bare word "recommend", and got
         answered with "tell me what it's for, your industry, and any colour…"
         — asking for the three things the visitor had just said. The visitor
         then had to repeat themselves in keyword form ("pitch deck, fintech,
         blue") before anything happened.
         So: if this one sentence already names the product AND at least one
         detail (industry / colour / style / slide count), answer it from those
         parts instead. A vague "recommend" or "help me choose" carries no such
         detail, returns null here, and still falls through to the FAQ line —
         which is the right reply for a vague ask. */
      var detailed = hexaComposeIntent(text, true, true);
      if (detailed) return detailed;
      // 0) custom FAQ (edit CHAT_FAQ at the top of this file)
      for (var fi = 0; fi < CHAT_FAQ.length; fi++) {
        var fe = CHAT_FAQ[fi], fm = fe.match || [];
        for (var fj = 0; fj < fm.length; fj++) {
          var fp = norm(fm[fj]);
          if (fp && ((' ' + low + ' ').indexOf(' ' + fp + ' ') !== -1
                  || (' ' + low + ' ').indexOf(' ' + fp + 's ') !== -1
                  || (fp.indexOf(' ') !== -1 && low.indexOf(fp) !== -1))) {
            return { reply: fe.reply, target: fe.target || null, label: fe.target ? labelForUrl(fe.target) : null, execute: !!fe.execute, soft: !!fe.soft };
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
      // 3) STRONG intents first — a question that merely mentions a product
      //    ("how much for a media kit") must be answered as a question, not
      //    as a request to open that product's page.
      var strong = hexaComposeIntent(text, true);
      if (strong) return strong;
      // 4) exact dictionary phrase match
      var m = chatMatch(text);
      if (m) return m;
      // 5) LAST: browse/availability composition
      return hexaComposeIntent(text, false);
    } catch (e) { return null; }
  };

  // ── AI ACTIONS ──────────────────────────────────────────────
  // The AI may end a reply with "ACTION: <key>" to open a page. These keys map
  // to the SAME destinations the voice/mic engine uses.
  var ACTION_TARGETS = {
    pitch_decks: { url: 'pitch_deck_folder_section.html', label: 'Open Pitch Decks' },
    media_kits:  { url: 'media_kits_folder_section.html', label: 'Open Media Kits' },
    web_kits:    { url: 'web_kit_folder_file.html',       label: 'Open Website UI Kits' },
    career_docs: { url: 'career_docs_folder_section.html', label: 'Open Career Docs' },
    digital_keynotes: { url: 'digital_keynote-folder.html', label: 'Open Digital Keynotes' },
    invoice:     { url: 'invoice.html',                    label: 'Open Invoice Generator' },
    home:        { url: 'index.html',                       label: 'Go to Store Hub' },
    faq:         { url: 'faq.html',                        label: 'Open FAQ' },
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
    // a refinement ("make them blue") has no verb or noun of its own, but
    // it IS a search — it only makes sense against the previous one
    if (window.hexaIsRefinement && window.hexaIsRefinement(text)) return true;
    return REC_VERB.test(t) && REC_NOUN.test(t);
  };

  window.hexaRecommend = function (text) {
    // fold this sentence into the running search, then ask for the FULL
    // picture rather than just the words in the latest message
    var refining = window.hexaIsRefinement && window.hexaIsRefinement(text);
    ctxAbsorb(text);
    var q = refining ? ctxQuery() : String(text || '').slice(0, 300);
    return fetch(REC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, limit: 4 })
    }).then(function (r) { return r.json(); })
      .then(function (rec) {
        try { memSet({ last_topic: String(text || '').slice(0, 120) }); } catch (e) {}
        // Nothing in stock for this ask → remember it as a lead interest (#4)
        if (!rec || !rec.results || !rec.results.length) hexaInterest = String(text || '').slice(0, 200);
        else if (window.hexaRememberResults) window.hexaRememberResults(rec.results);
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


  // ════════════════════════════════════════════════════════════════
  //  SEARCH CONTEXT  —  multi-turn refinement
  //  ---------------------------------------------------------------
  //  Without this, every search starts from nothing: "show healthcare
  //  decks" then "make them blue" loses the healthcare part. We keep the
  //  slots the visitor has established (type, industry, colour, style,
  //  slide count) and merge each new sentence into them, so a follow-up
  //  refines the search instead of replacing it.
  //
  //  The server (recommend_http) already turns words into value codes, so
  //  all we need to send is a rebuilt sentence with every slot in it.
  // ════════════════════════════════════════════════════════════════
  var SEARCH_CTX = { type: null, industry: null, colour: null, tone: null, slides: null, ts: 0 };
  var CTX_TTL = 12 * 60 * 1000;          // a search goes stale after 12 min

  function ctxAlive() { return SEARCH_CTX.ts && (Date.now() - SEARCH_CTX.ts) < CTX_TTL; }

  function ctxReset() {
    SEARCH_CTX = { type: null, industry: null, colour: null, tone: null, slides: null, ts: 0 };
  }
  window.hexaSearchReset = ctxReset;

  // Pull whatever slots this sentence mentions and fold them in.
  function ctxAbsorb(text) {
    var t = norm(text);
    var q = findQuals(t);
    var n = findNoun(t);
    if (!ctxAlive()) ctxReset();
    if (n && n.page) SEARCH_CTX.type = n.name;
    if (q.industry) SEARCH_CTX.industry = q.industry;
    if (q.colour)   SEARCH_CTX.colour   = q.colour;
    if (q.tone)     SEARCH_CTX.tone     = q.tone;
    if (q.slides)   SEARCH_CTX.slides   = q.slides;
    SEARCH_CTX.ts = Date.now();
    return SEARCH_CTX;
  }

  // Rebuild a full query sentence from everything we know so far.
  function ctxQuery() {
    var bits = [];
    if (SEARCH_CTX.tone)     bits.push(SEARCH_CTX.tone);
    if (SEARCH_CTX.colour)   bits.push(SEARCH_CTX.colour);
    if (SEARCH_CTX.industry) bits.push(SEARCH_CTX.industry);
    bits.push(SEARCH_CTX.type || 'template');
    if (SEARCH_CTX.slides)   bits.push(SEARCH_CTX.slides + ' slides');
    return bits.join(' ');
  }
  window.hexaSearchContext = function () { return ctxAlive() ? SEARCH_CTX : null; };

  // A refinement is a short follow-up that only makes sense against the
  // previous search: "make them blue", "only minimal ones", "more like this".
  var REFINE_RX = /\b(make (them|it)|only|just|but|instead|rather|more like (this|that|these)|something (more|less)|show more|any more|others|different)\b/;
  function isRefinement(text) {
    var t = norm(text);
    if (!ctxAlive()) return false;
    if (t.split(' ').length > 9) return false;
    var q = findQuals(t);
    var hasNewSlot = !!(q.industry || q.colour || q.tone || q.slides);
    return REFINE_RX.test(t) || (hasNewSlot && !findVerb(t));
  }
  window.hexaIsRefinement = isRefinement;

  // Human-readable summary, so Hexa can say what it is actually searching for.
  function ctxSummary() {
    var b = [];
    if (SEARCH_CTX.tone)     b.push(SEARCH_CTX.tone);
    if (SEARCH_CTX.colour)   b.push(SEARCH_CTX.colour);
    if (SEARCH_CTX.industry) b.push(SEARCH_CTX.industry);
    var head = b.join(' ');
    var t = SEARCH_CTX.type || 'templates';
    return (head ? head + ' ' : '') + t + (SEARCH_CTX.slides ? ', ' + SEARCH_CTX.slides + ' slides' : '');
  }
  window.hexaSearchSummary = ctxSummary;

  // ── Result memory: lets "the third one" / "next one" work ──────────
  var LAST_RESULTS = [], LAST_INDEX = -1;
  window.hexaRememberResults = function (list) {
    LAST_RESULTS = Array.isArray(list) ? list.slice(0, 12) : [];
    LAST_INDEX = LAST_RESULTS.length ? 0 : -1;
  };

  /* ORDINALS ONLY. Cardinals like "one"/"two" must NOT be here: almost every
     one of these sentences ends in the word "one" ("open the third one"),
     so "one" would always win and always select result 1. */
  var ORDINALS = { first:1, second:2, third:3, fourth:4, fifth:5, sixth:6,
                   seventh:7, eighth:8, ninth:9, tenth:10,
                   '1st':1, '2nd':2, '3rd':3, '4th':4, '5th':5, '6th':6,
                   '7th':7, '8th':8, '9th':9, '10th':10 };

  // "open the third one", "next one", "go back one", "that one"
  window.hexaResultNav = function (text) {
    var t = norm(text);
    if (!LAST_RESULTS.length) return null;
    var pick = null;

    var mNum = t.match(/\b(?:open|show|see|view|pick|choose|take)?\s*(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:one|result|option|template)?\b/);
    var ord = Object.keys(ORDINALS).filter(function (k) {
      return new RegExp('\\b' + k + '\\b').test(t);
    })[0];

    if (/\bnext\b/.test(t))            pick = LAST_INDEX + 1;
    else if (/\b(previous|prev|back)\b/.test(t)) pick = LAST_INDEX - 1;
    else if (ord)                      pick = ORDINALS[ord] - 1;
    else if (mNum && /\b(one|result|option|template|open|show)\b/.test(t)) pick = parseInt(mNum[1], 10) - 1;
    else return null;

    if (pick < 0 || pick >= LAST_RESULTS.length) {
      return { reply: "That's outside the list — I found " + LAST_RESULTS.length
        + " result" + (LAST_RESULTS.length === 1 ? '' : 's') + ". Try a number between 1 and " + LAST_RESULTS.length + "." };
    }
    LAST_INDEX = pick;
    var r = LAST_RESULTS[pick];
    var name = r.name || ('Result ' + (pick + 1));
    /* use the SAME field the results renderer uses — recommend_http returns
       a ready-made `url`; there is no template.html to build a link to */
    var url = r.url || r.pdf_url || null;
    return { reply: 'Opening <strong>' + name + '</strong> (' + (pick + 1) + ' of ' + LAST_RESULTS.length + ').',
             target: url, label: 'Open ' + name };
  };

  // ── HEXA ADMIN — owner-only store commands (needs admin login) ────────────
  // "prepare today's decks" → cloud composes the daily batch into review.
  // "publish all decks" / "publish decks 1,3,5" → picked decks go LIVE.
  var GATE_URL = 'https://composer-proxy-irosbvpq7q-uc.a.run.app';
  window.hexaAdminIntent = function (text) {
    var t = norm(text);
    return /\b(prepare|make|generate|create)\b.*\b(today s|todays|daily)\b.*\bdecks?\b/.test(t)
        || /\bpublish\b.*\bdecks?\b/.test(t) || /\bdecks?\b.*\bgo live\b/.test(t)
        /* BATCH ORDERS (25 Jul, Javed): "make 10 decks of 40 slides" — plural
           decks + a count = a batch, never a single design order. */
        || /\b(make|prepare|generate|create|compose)\b[\s\S]*?\b\d{1,2}\s*decks\b/.test(t)
        || /\b\d{1,2}\s*decks\b[\s\S]*?\b(make|prepare|generate|create|compose)\b/.test(t)
        /* "make decks and put them on the site (yourself)" */
        || /\b(make|prepare|generate|create)\b.*\bdecks\b.*\b(on the site|to the site|on site|store|upload)\b/.test(t);
  };
  window.hexaAdmin = async function (text) {
    var t = norm(text);
    var token = window.ldGetToken ? await window.ldGetToken() : null;
    if (!token) return { reply: "That's an owner command — please sign in with the admin account first 🔐" };
    var H = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    try {
      if (/\bpublish\b|\bgo live\b/.test(t)) {
        var picks = 'all';
        var nums = t.match(/\d+/g);
        if (nums && !/\ball\b/.test(t)) picks = nums.map(Number);
        var r = await fetch(GATE_URL + '/publish_batch', { method: 'POST', headers: H,
          body: JSON.stringify({ picks: picks }) });
        var d = await r.json();
        if (!r.ok) return { reply: 'Publish failed: ' + (d.error || r.status) };
        return { reply: d.published && d.published.length
          ? '🚀 LIVE! Published ' + d.published.length + ' deck(s):\n' + d.published.join('\n')
          : 'Nothing published — is there a batch for today?' };
      }
      // batch order — "make 10 decks of 40 slides" (count + slides parsed from
      // the sentence; defaults keep the old daily behaviour). Decks ALWAYS go
      // to review first — Javed reviews, then says "publish all decks".
      var body = {};
      var mc = t.match(/(\d{1,2})\s*decks/);        if (mc) body.count  = +mc[1];
      var msl = t.match(/(\d{1,3})\s*slides?/);      if (msl) body.slides = +msl[1];
      var wantsSite = /\b(on the site|to the site|on site|store|upload|yourself|urself)\b/.test(t);
      var r2 = await fetch(GATE_URL + '/daily_batch', { method: 'POST', headers: H, body: JSON.stringify(body) });
      var d2 = await r2.json();
      if (!r2.ok) return { reply: 'Batch failed: ' + (d2.error || r2.status) };
      var lines = (d2.decks || []).map(function (x) { return x.i + '. ' + x.name; });
      return { reply: "🎨 " + d2.count + " deck" + (d2.count === 1 ? '' : 's') + " ready for your review:\n" + lines.join('\n')
        + "\n\nOpen them below or in Storage → review/" + d2.date + "."
        + (wantsSite ? "\n\n⚠️ I never publish without you — review them, then tell me \"publish all decks\" (or \"publish decks 1,3,5\") and I'll put your picks on the site."
                     : "\n\nWhen happy, tell me: \"publish all decks\" or \"publish decks 1,3,5\"."),
        decks: d2.decks };
    } catch (e) { return { reply: 'Admin command error: ' + e.message }; }
  };

  // ── DESIGN ORDERS — "make me a hospital kit, black bg, 8 slides" ──────────
  // Detected by verbs of creation (not browsing). Shows an "Open in Designer"
  // button → editor.html?compose=<sentence>. The editor + cloud do the rest.
  var DESIGN_VERB = /\b(make|design|create|compose|build|generate|prepare)\b/;
  var DESIGN_NOUN = /\b(kit|kits|deck|decks|presentation|presentations|template|templates|design|slides)\b/;
  /* SINGLE HOME for the deck-request detector (29 Jul 2026).
     Previously navbar.js defined window.hexaComposeIntent as this boolean while
     chat_brain.js exported a DIFFERENT function of the same name that returns an
     answer object. Whichever loaded last won, so identical code behaved
     differently page to page. It now lives here only — chat_brain.js is loaded
     by every page that needs it (directly on Hexa_Promptbox.html, injected by
     navbar.js elsewhere), so both stay in step automatically. */
  window.hexaComposeIntent = function (text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    var v = /\b(make|making|create|creating|generate|generating|prepare|preparing|build|building|design|designing|compose|composing|produce|draft|whip up|put together)\b/;
    var n = /\b(deck|decks|presentation|presentations|slides|slide|kit|kits|template|templates|design|designs)\b/;
    return v.test(t) && n.test(t);
  };

  window.hexaDesignIntent = function (text) {
    var t = norm(text);
    return DESIGN_VERB.test(t) && DESIGN_NOUN.test(t);
  };
  /* Free tier note (owner rule, 29 Jul 2026), CORRECTED 29 Jul.
     The first version tried to work out here whether the visitor was an admin
     and then announced "opening with 5 slides". Two things were wrong with it:
       - ldIsAdmin() lives in navbar.js, and Hexa_Promptbox.html does not load
         navbar.js — so on the main Hexa page it was undefined and EVERY user,
         owner included, was treated as a guest.
       - Even where it exists it returns false until Firebase auth resolves, so a
         fresh page load looks signed-out for the first moment.
     The result: Hexa told the owner "making 5 slides" and then correctly built
     10, because the SERVER exempts admins. The behaviour was right; the sentence
     was a lie.
     The browser cannot know who you are at this instant, so it no longer claims.
     It states the free limit as a fact and passes the request through untouched —
     composer_proxy applies the real cap, and admins are exempt there. */
  var HEXA_FREE_SLIDES = 8;   /* 3 Aug 2026 — 5 → 8 (Javed) */
  /* ── ORDER vs ROUTINE vs OPEN-IT-NOW (3 Aug 2026, Javed) ──────────────────
     Three different things a person can mean by "make me a deck":

       "make me 3 yellow slides"                        → open the Designer NOW
       "...and email me / I'm going out / when I'm back" → ORDER it, they leave
       "...every day at 11am"                            → a ROUTINE, every day

     Until today all three did the same thing: dump the whole sentence into
     editor.html?compose= and drag the person to the canvas — including the
     words "every day at 11 am", which the composer then tried to read as design
     instructions. Someone who says they are leaving should not be taken to a
     canvas they have to sit and watch.

     What Hexa keeps out of the design words: the timing and the delivery. Those
     are instructions to US, not descriptions of the deck. */
  var REPEAT_RX  = /\b(every ?day|everyday|daily|each day|every morning|each morning|every evening|routine|schedule)\b/i;
  /* 3 Aug 2026 — "after two minutes" and "at 10:50" are also "I am leaving,
     have it ready": word-numbers and a clock time count too. We do NOT wait for
     the stated moment — waiting serves nobody. We build immediately and say so,
     which means it is ready BEFORE the time they asked for. */
  var LEAVE_RX   = /\b(email me|mail me|send (it|them) to me|when i (get |come )?back|later|meanwhile|in the meantime|after (a|an|\d|one|two|three|four|five|ten|fifteen|twenty|thirty|half)|going to (office|work|out)|having (a|my) (coffee|tea|lunch)|i am (busy|out|away)|while i|by \d{1,2}(:\d{2})?\s*(am|pm)?|at \d{1,2}:\d{2})\b/i;
  var TIME_RX    = /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bat\s+(\d{1,2})(?::(\d{2}))?\b/i;
  var STRIP_RX   = /\b(every ?day|everyday|daily|each day|every morning|each morning|every evening|and (keep|put) (them|it) in my designs|keep (them|it) in my designs|email me( the output)?|mail me|send (it|them) to me|when i (get |come )?back|in the meantime|meanwhile|after \d+ minutes?|after an? (hour|while)|and will email me( the output)?)\b/gi;
  /* the clock time is an instruction to us, never a design word — "at 11 am"
     must not reach the composer. "16:9" and a bare slide count are untouched. */
  var TIMEWORD_RX = /\bat\s*\d{1,2}(:\d{2})?\s*(am|pm)\b|\bat\s*\d{1,2}:\d{2}\b/gi;

  /* "at 10:50" → 50 · "at 11 am" → 0 · nothing said → 0 */
  window.hexaWhenMinute = function (text) {
    var m = String(text || '').match(TIME_RX);
    if (!m) return 0;
    var mm = parseInt(m[2] || m[5] || '0', 10);
    if (isNaN(mm) || mm < 0 || mm > 59) return 0;
    return Math.round(mm / 5) * 5 % 60;      // the tick is every 5 minutes
  };

  /* "at 11 am" → 11 · "at 9pm" → 21 · nothing said → 9 in the morning */
  window.hexaWhenHour = function (text) {
    var m = String(text || '').match(TIME_RX);
    if (!m) return 9;
    var h = parseInt(m[1] || m[4], 10);
    var ap = (m[3] || '').toLowerCase();
    if (isNaN(h)) return 9;
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return Math.max(0, Math.min(23, h));
  };

  /* the design words only — timing and delivery removed */
  window.hexaDesignWords = function (text) {
    return String(text || '').replace(STRIP_RX, ' ').replace(TIMEWORD_RX, ' ')
             .replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').replace(/^[\s,.]+|[\s,.]+$/g, '').slice(0, 600);
  };

  window.hexaRepeatIntent = function (text) { return REPEAT_RX.test(String(text || '')); };
  window.hexaLeaveIntent  = function (text) { return LEAVE_RX.test(String(text || '')); };

  /* Writes the row and lets the server do the rest. `kind` is 'order' or
     'routine'. Resolves to a short line Hexa can say back. */
  window.hexaPlace = async function (kind, text) {
    var A = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    var B = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
    var F = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    var app = A.getApps().length ? A.getApp() : A.initializeApp({
      apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
      authDomain: "auth.lazydogtemplates.com",
      projectId: "templatehub-16cd7" });
    var user = B.getAuth(app).currentUser;
    if (!user) return { ok: false, reply: '🔒 Sign in first and I will build it while you are away.' };

    var db    = F.getFirestore(app);
    var words = window.hexaDesignWords(text);
    /* "3 yellow slides" — the number and the noun are not always neighbours, so
       an adjacent-only match read that as "no number given" and quietly built 5.
       Allow a few words in between, and fall back to any plain number left in
       the cleaned sentence (the clock time is already stripped out of it, so
       "every day at 8 am" can never be mistaken for a slide count). */
    var m = words.match(/\b(\d{1,3})\s*(?:[a-z-]+\s+){0,3}?(?:slides?|pages?)\b/i)
         || words.match(/\b(?:slides?|pages?)\s*[:=]?\s*(\d{1,3})\b/i)
         || words.match(/\b(\d{1,3})\b/);
    var slides = m ? parseInt(m[1], 10) : 5;
    /* 9 Aug 2026 (Javed) — ceiling 60 → 100. This is only the sanity check on
       what a person typed; who is ALLOWED that many is decided server-side.
       A free account is still stopped at 8 by the free-tier gate in
       composer_proxy; admin is exempt there and may order the full 100. */
    if (!(slides > 0 && slides <= 100)) slides = 5;

    if (kind === 'routine') {
      var hour = window.hexaWhenHour(text);
      var minute = window.hexaWhenMinute(text);
      await F.addDoc(F.collection(db, 'design_schedules'), {
        uid: user.uid, email: String(user.email || ''), sentence: words,
        slides: slides, hour: hour, minute: minute, active: true, label: '',
        createdAt: F.serverTimestamp()
      });
      var hh = (hour % 12) || 12, ap = hour < 12 ? 'am' : 'pm';
      var mm = String(minute).padStart(2, '0');
      return { ok: true, reply: 'Done — I will build that every day at ' + hh + ':' + mm + ' ' + ap +
        ', and leave it on <a href="my_designs.html">My Designs</a>. Nothing for you to click.' };
    }

    await F.addDoc(F.collection(db, 'design_orders'), {
      uid: user.uid, email: String(user.email || ''), sentence: words,
      slides: slides, status: 'queued', createdAt: F.serverTimestamp(), page: 'hexa'
    });
    return { ok: true, reply: 'Ordered — ' + slides + ' slides. I am building it now, so you can close ' +
      'this tab. It will be waiting on <a href="my_designs.html">My Designs</a>.' };
  };

  /* THE ONE ROUTER. Hexa has three doors — the prompt box, the chat bubble in
     the navbar, and the little chat in the search card — and each had its own
     copy of "what to do with a design request". The brain is shared, so the
     decision belongs here too: each door just asks this, and if it says it
     handled the sentence, the door stops.
       say(text) → must print a line and return the element, so the reply can
       be swapped in when the write finishes. */
  /* A routine or an order must be recognised on its OWN, not only when the
     design-verb detector happens to fire. "4 slides, navy, every day at 8 am"
     has no verb in it — the store-page door strips "make me" on the way over —
     and it used to fall through to the browse matcher, which answered
     "Opening Pitch Decks for you" and quietly dropped the schedule.
     The guard is the noun: this only takes over a sentence that is plainly
     about a deck, so "email me later about pricing" is still ordinary chat. */
  var DESIGN_NOUN_RX = /\b(slides?|deck|decks|presentation|pitch|media ?kit|web ?kit|keynote|design|designs|template)\b/i;

  window.hexaHandleAway = function (text, say) {
    var repeat = window.hexaRepeatIntent && window.hexaRepeatIntent(text);
    var leave  = window.hexaLeaveIntent  && window.hexaLeaveIntent(text);
    if (!(repeat || leave) || !DESIGN_NOUN_RX.test(String(text || '')) || !window.hexaPlace) return false;
    var line = null;
    try { line = say(repeat ? 'Setting that up as a daily routine…' : 'Placing your order…'); }
    catch (e) { /* a door with nowhere to print still places the order */ }
    window.hexaPlace(repeat ? 'routine' : 'order', text).then(function (r) {
      if (line) { line.innerHTML = r.reply; }
    }).catch(function (e) {
      if (line) { line.textContent = 'Could not save that: ' + (e && e.message ? e.message : e); }
    });
    return true;
  };

  window.hexaDesign = function (text) {
    var raw  = String(text || '');
    /* ── 9 Aug 2026 (Javed) — THE 200-CHARACTER CUT ─────────────────────────
       This slice was the single worst bug in the ordering chain. The design
       card writes the whole order as ONE sentence, in a fixed order:
         type, sub-category, industry, colour, finish, style, fonts, tone,
         audience, best-for, ACCENT, SLIDES, ratio, formality, the four canvas
         dials, mock-ups, PAST DESIGN, inspired-by.
       A fully filled card passes 200 characters at roughly "purple accents" —
       so everything from the SLIDE COUNT onwards was silently thrown away on
       every order. The composer, hearing no number, fell back to its own
       default of 8. That is why "33 slides" always came back as 8, why the
       ratio / formality / text / shapes / graphs / empty-space dials never did
       anything, and why "use design PD-0xx" was never even seen.
       The card caps its own sentence at 1000 characters, so this now carries
       the whole order and nothing is lost in transit. A URL of this length is
       far below every browser's limit. */
    var seed = raw.slice(0, 1000);
    var m    = norm(raw).match(/\b(\d{1,3})\s*(slides?|pages?)\b/);
    var want = m ? parseInt(m[1], 10) : 0;

    var note = (want > HEXA_FREE_SLIDES)
      ? ' <span style="opacity:.75">(Free accounts build up to ' + HEXA_FREE_SLIDES +
        ' slides — subscriptions are coming soon.)</span>'
      : '';

    return {
      reply: "I can design that for you right now 🎨 — opening it in the LazyDog Designer:" + note,
      target: 'editor.html?compose=' + encodeURIComponent(seed),
      label: 'Open in Designer'
    };
  };

  // ── CONTENT FILL — buyer already has a CHOSEN design + their own content ───
  // Different from hexaDesign (compose-from-scratch → composer-proxy). When the
  // visitor wants their content dropped INTO a picked template, we route to the
  // new ai_fill endpoint instead. `design` is the parsed deck IR (from the
  // editor/bridge) or a kit slug; `content` is the buyer's text (paste or
  // { slide: text }). Returns the filled deck IR the editor then loads.
  var FILL_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/ai_fill_http';
  var FILL_VERB = /\b(fill|drop|put|add|insert|place|pour)\b/;
  var FILL_OBJ  = /\b(my (content|text|info|details|copy|material)|this (content|text|info)|into (this|the|it|my)|with my)\b/;
  window.hexaFillIntent = function (text) {
    var t = norm(text);
    return FILL_VERB.test(t) && FILL_OBJ.test(t);
  };
  // POST design+content to ai_fill and return the filled deck IR (or null on error).
  window.hexaFill = function (design, content, brand) {
    return fetch(FILL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: design, content: content, brand: brand || '' })
    }).then(function (r) { return r.json(); })
      .then(function (d) { return (d && (d.deck || d.slides)) ? (d.deck || d) : null; })
      .catch(function () { return null; });
  };

  // ── HANDOFF: the fill CARD hands its design + content to HEXA, and HEXA
  //    instructs the editor to prepare the deck. The card must NEVER open the
  //    editor itself — everything goes THROUGH Hexa (card → Hexa → editor).
  //    Hexa stashes the buyer's material, then sends them into the editor; the
  //    editor reads that material and calls the fill brain (window.hexaFill).
  window.hexaPrepare = function (opts) {
    opts = opts || {};
    // GATE 3 (25 Jul 2026) — Hexa is the FINAL JUDGE. An order whose content
    // exceeds the design's capacity, without the buyer approving cloned
    // slides, is never commanded to the editor. The engine only ever hears
    // from Hexa, and Hexa only speaks possible orders.
    if (opts.fit === 'too_big' && !opts.allowClone) {
      return { ok: false, reason: "your content needs more slides than this design holds. Approve the extra cloned slides on the card, trim the content, or pick a bigger design — then I'll prepare it." };
    }
    var material = { content: (opts.content != null ? opts.content : ''),
                     brand: opts.brand || '', deck: opts.deck || '',
                     designId: opts.designId || '', designHref: opts.designHref || '',
                     pptxFileId: opts.pptxFileId || '', pptxUrl: opts.pptxUrl || '',
                     mode: opts.mode || '',
                     allowClone: !!opts.allowClone,
                     extraSlides: opts.extraSlides || 0 };
    try { localStorage.setItem('lazydog_fill_material', JSON.stringify(material)); } catch (e) {}
    // IMPORTANT: open the editor WITHOUT ?compose — this is FILL, not compose.
    var url = opts.editorUrl || 'editor.html';
    if (opts.slug && /^https?:/.test(location.protocol)) {
      url += (url.indexOf('?') < 0 ? '?' : '&') + 'kit=' + encodeURIComponent(opts.slug);
    }
    try { window.location.assign(url); } catch (e) {}
    return { ok: true, target: url };
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
        }).catch(function (err) {
          /* 29 Jul 2026: this used to swallow the failure completely while Hexa
             still told the visitor "I've saved your email". A lead that silently
             never arrived is worse than one that never started — you cannot even
             know to chase it. Log it so it shows up in the console and in any
             error reporting, and keep it in local memory so the next successful
             call can carry it. */
          console.error('[hexa] lead capture FAILED — email not recorded:', email, err && err.message);
          try { localStorage.setItem('hexa_pending_lead', email); } catch (e) {}
        });
      } catch (e) {
        console.error('[hexa] lead capture could not be sent:', e && e.message);
      }
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
    // ADMIN HELPER — reveal own UID (to paste into LD_ADMIN_UIDS for the composer gate)
    if(/\b(my uid|what s my uid|what is my uid|whats my uid|my user id|admin uid)\b/.test(t)){
      var uid = window.ldMyUid && window.ldMyUid();
      return { reply: uid ? ("Your UID is: <strong>" + uid + "</strong>") : "You're not signed in — sign in first, then ask again." };
    }
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


/* ══════════════════════════════════════════════════════════════════════════
   APPEND-ONLY PATCH LOG — chat_brain.js
   House rule (Javed, 7 Aug 2026): nothing above this line is deleted or
   rewritten. Every change is a NEW timestamped block appended here that
   OVERRIDES or WRAPS the earlier definition. Newest block wins because it runs
   last. To undo a patch, delete only its own block — the original still works.
   ══════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 18:20 UTC · Opus · BUG No. 4 + BUG No. 5
   4: "call me about a custom deck" made Hexa think the name was "About".
   5: a wrong name sticks and is never corrected.

   MEASURED BEFORE THE FIX (17 name cases through the original
   window.hexaNameCapture, defined ~line 680 above and LEFT INTACT):
       "call me about a custom deck"          -> stored the name "About"
       "call me when you can"                 -> stored "When"
       "please have someone call me tomorrow" -> stored "Tomorrow"
       "call me regarding my order"           -> stored "Regarding"
       "call me about pricing"                -> stored "About"
       "my name is Jean-Luc"                  -> stored "Jean"  (hyphen lost:
            the old code ran on norm(), which strips - and ' to spaces)
       11/17 correct.

   AND on Bug 5, the thing that actually traps the visitor: memSet() DOES
   overwrite, so a literal "my name is Sarah" works. But it is the ONLY wording
   that works. Every natural correction was a dead end — verified, all left the
   wrong name in place:
       "that's not my name" · "don't call me About" · "stop calling me About"
       "actually it's Sarah" · "my name is not About" · "forget my name"
   That is why the wrong name feels permanent.

   THIS BLOCK (overrides window.hexaNameCapture, additive):
     · Reads the RAW message, not norm(), so "Jean-Luc" and "O'Brien" survive.
     · A much longer stop-word list; it is checked first and beats everything,
       so even "call me Tomorrow" is not taken as a name.
     · For the loose triggers ("call me", "i am", "i'm") a word is only taken
       as a name when it is Capitalised in the original message OR the message
       is 4 words or fewer. "my name is X" stays unconditional — it is
       unambiguous.
     · NEW correction path: "that's not my name", "don't call me X", "stop
       calling me X", "forget my name", "my name is not X" all CLEAR the stored
       name and ask for the right one.
     · After a clear, Hexa is briefly listening for the answer, so a bare
       "Sarah" or "it's Sarah" is accepted — but only if the whole message is
       essentially just that word, so "pitch deck" can never become a name.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 18:20 UTC · bugs 4+5';

  /* Words that are never a person's name, however the sentence is phrased.
     Checked before capitalisation, so "call me Tomorrow" is still rejected. */
  var STOP = ('a an the my our your this that these those it its it s here there now then just only also so very really still ' +
    'not no nope yes yeah ok okay sure fine good great sorry please thanks thank ' +
    'about back later soon today tonight tomorrow yesterday when whenever asap regarding re ' +
    'on at in to for from with and or but if once first again anytime any some someone somebody anyone everyone nobody ' +
    'monday tuesday wednesday thursday friday saturday sunday morning afternoon evening night week month year weekend ' +
    'interested looking searching trying wondering browsing buying asking calling waiting thinking needing wanting getting having going ' +
    'new old free busy available ready able unable curious confused happy sad glad quick quickly urgently immediately ' +
    'why how what where who which whose whom whether ' +
    'hi hello hey yo greetings ' +
    'up down out off over under before after during through ' +
    'maybe probably definitely actually basically honestly seriously ' +
    'customer client user buyer owner admin guest visitor human someone team support sales ' +
    'deck decks kit kits slide slides template templates design designs presentation invoice price pricing order refund download').split(' ');
  var STOPMAP = {};
  for (var _i = 0; _i < STOP.length; _i++) STOPMAP[STOP[_i]] = 1;

  function mem() { return (window.hexaMemory && window.hexaMemory.get()) || {}; }
  function remember(patch) { try { if (window.hexaMemory) window.hexaMemory.set(patch); } catch (e) {} }

  function tidy(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function wordCount(s) { return tidy(s).split(' ').filter(Boolean).length; }
  function titleCase(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

  /* Is this token allowed to be a name at all? */
  function nameOk(w) {
    if (!w) return false;
    var low = w.toLowerCase();
    if (STOPMAP[low]) return false;
    if (low.length < 2 || low.length > 21) return false;
    if (!/^[a-z][a-z'\-]*$/.test(low)) return false;
    return true;
  }

  window.hexaNameCapture = function (text) {
    var raw = tidy(text);
    if (!raw) return null;

    /* ── 1. CORRECTION / CLEAR (Bug 5) — always checked first ───────────── */
    var isCorrection =
      /\b(that(?:'|’)?s|thats|it(?:'|’)?s|its)\s+not\s+my\s+name\b/i.test(raw) ||
      /\bmy\s+name\s+(?:is\s+)?not\b/i.test(raw) ||
      /\b(?:that|this)\s+is\s+not\s+my\s+name\b/i.test(raw) ||
      /\b(?:don(?:'|’)?t|do not|stop|quit)\s+(?:call|calling)\s+me\b/i.test(raw) ||
      /\b(?:forget|clear|delete|remove|reset)\s+(?:my|the)\s+name\b/i.test(raw) ||
      /\bwrong\s+name\b/i.test(raw) ||
      /\bi(?:'|’)?m\s+not\s+(?:called\s+)?[a-z]/i.test(raw);

    if (isCorrection) {
      /* A correction may also carry the right name: "don't call me About,
         call me Sarah" / "my name is not About it's Sarah". Take it if so. */
      var fix = raw.match(/\b(?:call me|my name is|i(?:'|’)?m|it(?:'|’)?s)\s+([A-Za-z][A-Za-z'\-]{1,20})\s*$/i);
      var fixName = fix && fix[1];
      if (fixName && nameOk(fixName) && !/\bnot\b/i.test(raw.slice(raw.toLowerCase().lastIndexOf(fixName.toLowerCase()) - 6, raw.toLowerCase().lastIndexOf(fixName.toLowerCase())))) {
        remember({ name: titleCase(fixName), await_name: 0 });
        return { reply: 'Sorry about that — noted, ' + titleCase(fixName) + '. I will not get it wrong again. 😊' };
      }
      var had = mem().name;
      remember({ name: null, await_name: 1 });
      return { reply: had
        ? 'Sorry about that — I have cleared "' + had + '". What should I call you?'
        : 'Sorry about that. What should I call you?' };
    }

    /* ── 2. HEXA ASKED, SO A BARE NAME IS AN ANSWER (Bug 5) ─────────────── */
    if (mem().await_name) {
      var bare = raw.match(/^(?:it(?:'|’)?s\s+|i(?:'|’)?m\s+|im\s+|call me\s+|my name is\s+|the name(?:'|’)?s\s+)?([A-Za-z][A-Za-z'\-]{1,20})[.!]?$/i);
      if (bare && nameOk(bare[1])) {
        remember({ name: titleCase(bare[1]), await_name: 0 });
        return { reply: 'Got it — ' + titleCase(bare[1]) + '. Lovely to meet you properly! 😊 What can I find for you?' };
      }
      /* not a name — stop waiting so we never mislabel a later message */
      remember({ await_name: 0 });
    }

    /* ── 3. NORMAL INTRODUCTION (Bug 4: much stricter) ──────────────────── */
    /* A question about the name is not someone giving their name.
       "who told you my name is About?" must not re-save "About". */
    if (/\?\s*$/.test(raw) || /^(who|why|how|what|where|when|which|is|are|did|do|does|can|could|would|should)\b/i.test(raw)) return null;
    var strict = raw.match(/\b(?:my name is|my name(?:'|’)s|the name is|the name(?:'|’)s)\s+([A-Za-z][A-Za-z'\-]{1,20})\b/i);
    var loose  = raw.match(/\b(?:call me|i am|i(?:'|’)m|im)\s+([A-Za-z][A-Za-z'\-]{1,20})\b/i);

    var word = null, viaStrict = false;
    if (strict) { word = strict[1]; viaStrict = true; }
    else if (loose) { word = loose[1]; }
    if (!word) return null;
    if (!nameOk(word)) return null;

    if (!viaStrict) {
      /* "call me" / "i am" / "i'm" are everyday English, not just
         introductions. Only trust them when the word is Capitalised the way a
         person writes their own name, or the whole message is short enough
         that it can only be an introduction. */
      var capitalised = /^[A-Z]/.test(word);
      if (!capitalised && wordCount(raw) > 4) return null;
    }

    var name = titleCase(word);
    remember({ name: name, await_name: 0 });
    return { reply: 'Lovely to meet you, ' + name + '! 😊 What can I find for you — a pitch deck, media kit, or web kit?' };
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 18:45 UTC · Opus · BUG No. 6
   "Requests for a custom or bespoke project are not understood"

   MEASURED BEFORE THE FIX:
     "a custom quote for a 20 slide investor deck"
         -> "Opening Pitch Decks for you."      (treated as casual browsing)
     "I want to commission a bespoke brand identity"
         -> no local answer at all
     "do you do custom work"
         -> "We don't take custom commissions at the moment."
   That last one is not just unhelpful, it is FALSE. lazydog_studio.html says,
   in its own words: "Commission a bespoke digital experience… we design and
   build custom websites, UI systems, and brand identities." Hexa was turning
   away the highest-value enquiry on the site.

   THIS BLOCK is additive in two ways:
     · It adds window.hexaCustomIntent(text) -> answer object or null.
     · It WRAPS window.chatCompose instead of editing it. The custom rule is
       tried first; everything else falls through to the original chatCompose
       exactly as before. The stale "we don't take custom commissions" entry in
       CHAT_FAQ is left in the file untouched — it is simply no longer reached,
       because every phrase in its match list is caught here first.

   DELIBERATELY NARROW so it cannot steal ordinary questions:
     · "can i customise the colours" / "is it customizable" -> NOT a commission.
       Matching is on the whole word "custom", never inside "customise".
     · "make me a custom deck" still reaches the AI Designer first, because
       hexaDesignIntent runs ahead of chatCompose in all three chat surfaces.
       Only genuine commission wording (bespoke / commission / quote / hire)
       lands here.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 18:45 UTC · bug 6';
  var STUDIO_URL = 'lazydog_studio.html#page-custom';
  var SUPPORT = 'support@lazydogtemplates.com';

  /* Commission wording. Whole-word "custom" only, so "customise"/"customizable"
     (an editing question about a template you already own) never matches. */
  var CUSTOM_RX = new RegExp(
    '\\b(' +
      'bespoke' +
      '|commission(?:ed|ing|s)?' +
      '|made[ -]to[ -]order' +
      '|one[ -]off' +
      '|from scratch' +
      '|tailor[ -]made|tailored for' +
      '|hire (?:you|your team|someone|a designer)' +
      '|work with your (?:team|studio|designers?)' +
      '|custom (?:design|designs|deck|decks|kit|kits|project|projects|work|job|jobs|build|website|site|brand|branding|identity|quote|quotes|order|orders|brief|request|piece|pricing|package)' +
      '|custom(?:ised|ized)? for (?:me|us|my|our)' +
      '|made for (?:me|us) from scratch' +
      '|do you do custom|take custom|any custom work' +
      '|quote for (?:a|an|my|our)' +
      '|get a quote|request a quote|ask for a quote' +
      '|lazydog studios?' +
    ')\\b', 'i');

  /* Guards: an editing / licensing question that happens to say "custom". */
  var NOT_CUSTOM_RX = /\b(customis|customiz)/i;

  window.hexaCustomIntent = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return null;
    if (!CUSTOM_RX.test(raw)) return null;
    /* "can I customise it" is about editing a template you bought — unless the
       sentence ALSO carries real commission wording. */
    if (NOT_CUSTOM_RX.test(raw) && !/\b(bespoke|commission|quote|hire|from scratch|made to order|one off|one-off|lazydog studio)/i.test(raw)) return null;

    /* Keep the request so it is not lost if they leave without writing in. */
    try {
      if (window.hexaMemory) window.hexaMemory.set({ custom_request: raw.slice(0, 300), last_topic: raw.slice(0, 120) });
    } catch (e) {}

    return {
      reply: 'Yes — we do take custom work. That is <strong>LazyDog Studios</strong>: ' +
             'bespoke decks, brand identities, UI systems and full websites, built from scratch rather than from a template. ' +
             'Tell me a little about the project — what it is for, roughly how many slides or pages, and when you need it — ' +
             'or email <strong>' + SUPPORT + '</strong> with those details and we will come back with a real quote. ' +
             'Here is the studio, so you can see the work and the process first:',
      target: STUDIO_URL,
      label: 'See LazyDog Studios',
      execute: false
    };
  };

  /* WRAP, don't replace. */
  var _prevChatCompose = window.chatCompose;
  window.chatCompose = function (text) {
    try {
      var c = window.hexaCustomIntent(text);
      if (c) return c;
    } catch (e) {}
    return _prevChatCompose ? _prevChatCompose.apply(this, arguments) : null;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 19:30 UTC · Opus · BUG No. 7
   "Please have someone contact me" is treated as a newsletter signup.

   MEASURED BEFORE THE FIX:
     "please contact me at sarah@example.com"
       -> "Perfect — I've saved sarah@example.com 📬 I'll make sure you hear
           about it when fresh designs drop!"
     A person asking to be contacted was told they had been added to a mailing
     list. The lead was POSTed to lead_http with no type on it, so nothing
     downstream could tell a callback request apart from a marketing signup —
     nobody would ever ring them back.
     ALSO FOUND: "can someone from your team call me" produced no local answer
     at all and fell through to the AI.

   THIS BLOCK wraps window.hexaLeadCapture (original at ~line 1120 above, left
   intact). Callback requests are now their own lead type:
     · type:'callback' is sent to lead_http, so it can be filtered/routed to a
       human instead of sitting in the newsletter list.
     · The reply says plainly that a person will get back to them, and always
       gives support@lazydogtemplates.com as a guaranteed second path — so the
       request survives even if the lead endpoint is down.
     · If they ask for contact but give no email, Hexa asks for it and REMEMBERS
       that the next email is a callback, not a subscription.
   Newsletter signups ("notify me when new designs arrive") are untouched.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 19:30 UTC · bug 7';
  var LEAD_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/lead_http';
  var EMAIL_RX = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  var SUPPORT  = 'support@lazydogtemplates.com';

  /* A request for a HUMAN to make contact — not a request for updates. */
  var CALLBACK_RX = new RegExp(
    '\\b(' +
      '(?:have|get|ask)\\s+(?:someone|somebody|a (?:person|human|real person)|your team|the team)\\s+(?:to\\s+)?(?:contact|call|ring|email|reach|get back to)\\s+me' +
      '|(?:someone|somebody|a human|a person|your team|the team)\\s+(?:should\\s+|can\\s+|could\\s+|please\\s+)?(?:contact|call|ring|email|reach)\\s+me' +
      '|(?:please\\s+)?contact me' +
      '|call me back|ring me back|get back to me|reach out to me|be in touch|get in touch with me' +
      '|(?:speak|talk|chat)\\s+(?:to|with)\\s+(?:a|an)?\\s*(?:human|real person|person|someone|agent|advisor|sales|your team|the team|somebody)' +
      '|i want to (?:speak|talk) to' +
      '|can (?:someone|somebody|a human|a person) (?:from your team )?(?:call|contact|ring|email|reach) me' +
      '|have a (?:person|human|real person) (?:call|contact) me' +
    ')\\b', 'i');

  /* Guard: "call me Sarah" is an introduction, and "email me the deck" is an
     order. Neither is a request for a human to make contact. */
  var NOT_CALLBACK_RX = /\b(call me [a-z][a-z'\-]{1,20}\s*$|my name is|email me (the|my|it|that|a|an)\b)/i;

  function memGet() { try { return (window.hexaMemory && window.hexaMemory.get()) || {}; } catch (e) { return {}; } }
  function memPut(p) { try { if (window.hexaMemory) window.hexaMemory.set(p); } catch (e) {} }

  function sendLead(email, type, note) {
    try {
      fetch(LEAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: type,                       /* 'callback' — the new lead type */
          lead_type: type,                  /* sent twice so either field name works downstream */
          interest: note || '',
          message: note || '',
          page: (location.pathname || '').split('/').pop() || 'home'
        })
      }).catch(function (err) {
        /* same honesty rule as the original lead capture: never claim it was
           saved when it was not */
        console.error('[hexa] CALLBACK lead FAILED — not recorded:', email, err && err.message);
        try { localStorage.setItem('hexa_pending_lead', email); } catch (e) {}
        try { localStorage.setItem('hexa_pending_lead_type', 'callback'); } catch (e) {}
      });
    } catch (e) {
      console.error('[hexa] callback lead could not be sent:', e && e.message);
    }
  }

  function callbackConfirm(email) {
    return 'Got it — this is a request for a real person to get back to you, not a mailing list. ' +
           'I have passed <strong>' + email + '</strong> to the team as a <strong>contact request</strong>; ' +
           'they normally reply within 24 hours. ' +
           'If it is urgent, email <strong>' + SUPPORT + '</strong> directly and it lands in the same inbox. ' +
           'Anything I should pass on with it — what it is about, and the best time to reach you?';
  }

  var _prevLead = window.hexaLeadCapture;

  window.hexaLeadCapture = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    var email = (raw.match(EMAIL_RX) || [null])[0];
    var wantsCallback = CALLBACK_RX.test(raw) && !NOT_CALLBACK_RX.test(raw);
    var pending = !!memGet().want_callback;

    /* 1. asked for contact AND gave an address in the same breath */
    if (wantsCallback && email) {
      email = email.toLowerCase();
      sendLead(email, 'callback', raw.slice(0, 300));
      memPut({ email: email, want_callback: 0 });
      return { reply: callbackConfirm(email) };
    }

    /* 2. they asked for contact earlier, and this message is the address */
    if (pending && email) {
      email = email.toLowerCase();
      sendLead(email, 'callback', memGet().callback_note || raw.slice(0, 300));
      memPut({ email: email, want_callback: 0 });
      return { reply: callbackConfirm(email) };
    }

    /* 3. asked for contact but gave no address */
    if (wantsCallback) {
      memPut({ want_callback: 1, callback_note: raw.slice(0, 300) });
      return { reply: 'Of course — I will get a real person to come back to you, not a newsletter. ' +
                      'What is the best email for them to use? ' +
                      'Type it here and I will pass it straight on with what you have told me. ' +
                      'You can also email <strong>' + SUPPORT + '</strong> directly if you would rather not leave it with me.' };
    }

    /* everything else — newsletter signups included — behaves exactly as before */
    return _prevLead ? _prevLead.apply(this, arguments) : null;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 19:50 UTC · Opus · BUG No. 8
   A serious complaint about a missing paid order gets a "how to buy" tutorial.

   MEASURED BEFORE THE FIX:
     "where is my order, I paid yesterday but got nothing"
       -> "To buy: open the order you want → pick Personal or Commercial →
           checkout → instant download, saved to your account."
     Someone whose money has gone missing was handed a shopping tutorial. The
     word "order" matched the 'order' noun and "paid" matched the 'buy' verb,
     and the answer matrix has no idea the sentence is a complaint.
     ALSO FOUND: "I paid but received nothing" and "money taken but no
     download" produced NO local answer at all — straight to the AI, no support
     email, no order-number request.

   The note is right that a good pattern already exists: "I was charged twice"
   is answered properly (apologise → My Purchases → support email + payment
   reference). This block gives "paid / nothing received" the same treatment.

   Additive: wraps window.chatCompose. Runs before everything else so the
   complaint can never be read as a shopping question again.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 19:50 UTC · bug 8';
  var SUPPORT = 'support@lazydogtemplates.com';

  /* Evidence that money has changed hands. */
  var PAID_RX = /\b(paid|i pay|payment|charged|charge went|debited|money (?:was )?(?:taken|gone|deducted)|bought|purchased|checked out|order(?:ed)?|invoice paid|card was)\b/i;

  /* Evidence that nothing arrived. */
  var NOTHING_RX = new RegExp(
    '\\b(' +
      'got nothing|received nothing|nothing (?:came|arrived|received|yet)' +
      '|(?:did ?n[o\'’]?t|didnt|have ?n[o\'’]?t|havent|has ?n[o\'’]?t|hasnt|never)\\s+(?:got|get|receive[d]?|arrive[d]?|come|show(?:n|ed)? up)' +
      '|no (?:download|file|files|email|link|deck|order|confirmation|receipt)' +
      '|not (?:received|arrived|delivered|come through|showing|there)' +
      '|missing|still waiting|nothing in my (?:account|purchases|email|inbox)' +
      '|where(?:\'|’)?s? is my order|wheres my order|where is my (?:file|download|deck|purchase)' +
    ')\\b', 'i');

  /* A how-to question is not a complaint: "how do I buy", "can I pay by card". */
  var HOWTO_RX = /^(how (do|can|would) i|what happens (when|after)|can i pay|do you accept|which payment)/i;

  window.hexaPaidNotReceivedIntent = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return false;
    if (HOWTO_RX.test(raw)) return false;
    /* "where is my order" is a complaint on its own — money has been spent. */
    if (/\bwhere(?:'|’)?s?\s+is\s+my\s+order\b|\bwheres my order\b|\bwhere(?:'|’)?s my order\b/i.test(raw)) return true;
    return PAID_RX.test(raw) && NOTHING_RX.test(raw);
  };

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    try {
      if (window.hexaPaidNotReceivedIntent(text)) {
        return {
          reply: 'I am sorry — that should never happen, and I am treating this as a payment problem, not a question about how to buy. ' +
                 'Two quick things while we sort it: ' +
                 '<strong>1.</strong> Sign in and open <strong>My Purchases</strong> — every paid order lands there and can be re-downloaded any time. ' +
                 '<strong>2.</strong> Check your spam folder for the receipt, as the download link is emailed too. ' +
                 'If it is not in either place, email <strong>' + SUPPORT + '</strong> with your <strong>order number or payment reference</strong> ' +
                 '(and the email you paid with) and we will find the payment and get your files to you — same day where we can. ' +
                 'You have paid, so you will get the files or your money back.',
          target: null,
          label: null,
          execute: false
        };
      }
    } catch (e) {}
    return _prevCompose ? _prevCompose.apply(this, arguments) : null;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 20:10 UTC · Opus · BUG No. 9
   Hexa falsely claims it is "opening" something it doesn't actually have.

   MEASURED BEFORE THE FIX:
     "I am looking for wedding invitation templates"
       -> "Let me check what we have for wedding — opening the templates now.
           If nothing fits, tell me and I will note it for you."
       …and target was null, so nothing ever opened. A promise with no action
       behind it.
     "do you have wedding invitations"
       -> "We may well have something for wedding — tell me what you need it
           for…"   (we do not, and never did)
     ALSO FOUND, same root cause: the 'browse' branch has the identical hole —
     any noun whose page is null ('template', 'order', 'account') produces
     "Opening templates for you." with nowhere to go.

   TWO FIXES, both additive (wraps window.chatCompose):
     1. A real catalogue check. Product categories LazyDog does not sell are
        answered honestly, straight away, with what we DO have and the closest
        real alternative — instead of a vague maybe.
     2. A general SAFETY NET for everything else: if an answer promises to
        open / go and look, but carries no destination, the promise is rewritten
        into an honest one. This also covers cases nobody has hit yet.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 20:10 UTC · bug 9';

  /* What LazyDog actually sells, in the visitor's words. */
  var CATALOGUE =
    '<strong>pitch decks</strong>, <strong>media kits</strong>, ' +
    '<strong>website UI kits</strong>, <strong>career docs</strong> (CVs, resumes, cover letters), ' +
    '<strong>digital keynotes</strong>, and a free <strong>invoice generator</strong>';

  /* Categories we do NOT stock, and the nearest real thing for each.
     Deliberately does NOT include resume / cv / cover letter (career docs),
     landing page / website (web kits), keynote, invoice, pitch deck,
     media kit / press kit / rate card — those are all real categories. */
  var NOT_STOCKED = [
    [/\b(wedding (?:invitation|invitations|invite|invites|card|cards|stationery)|save the date|rsvp card)\b/i,
      'wedding invitations', null],
    [/\b(greeting card|birthday card|thank you card|christmas card|greeting cards)\b/i,
      'greeting cards', null],
    [/\b(business card|business cards|visiting card|name card)\b/i,
      'business cards', null],
    [/\b(flyer|flyers|poster|posters|brochure|brochures|leaflet|leaflets|pamphlet)\b/i,
      'flyers and print brochures',
      'a <strong>media kit</strong> or a <strong>pitch deck</strong> — both are fully editable .pptx files, so they print perfectly well'],
    /* 'logo' is the dangerous one — see the note under NOT_STOCKED_EXCLUDE.
       "how do i add my logo" is an editing question with a good existing
       answer and must never land here. */
    [/\b(logo|logos|logo design|brand ?mark|brand identity)\b/i,
      'logo design as a template',
      'a bespoke one through <strong>LazyDog Studios</strong>, which does brand identities from scratch'],
    [/\b(food menu|drinks menu|restaurant menu|cafe menu|bar menu|menu template|menu templates|menu design)\b/i,
      'restaurant menus', null],
    [/\b(t ?-? ?shirt|tshirt|mug|merch|merchandise|hoodie)\b/i, 'merchandise designs', null],
    [/\b(book cover|ebook cover|magazine|magazine template|newspaper)\b/i, 'book and magazine layouts', null],
    [/\b(certificate|certificates|diploma|award template)\b/i, 'certificates', null],
    [/\b(calendar|calendars|planner|planners|diary template)\b/i, 'calendars and planners', null],
    [/\b(letterhead|letterheads|envelope template|compliment slip)\b/i, 'letterheads and stationery', null],
    [/\b(instagram post|instagram story|social media post|social media pack|social kit|facebook post|tiktok template)\b/i,
      'social media post packs',
      'a <strong>media kit</strong>, which covers the same brand-presentation ground'],
    [/\b(email template|newsletter template|mailchimp template)\b/i, 'email newsletter templates', null],
    [/\b(infographic|infographics)\b/i, 'standalone infographics',
      'a <strong>pitch deck</strong> — the charts and infographic shapes inside are editable and can be lifted out']
  ];

  /* The sentence must actually be a PRODUCT ENQUIRY before we tell someone we
     do not stock something. Caught by the regression suite: without this gate
     the logo rule hijacked "add my logo" and "how do i add my logo to the
     invoice" — two questions that already had good answers. Owning your own
     logo and shopping for a logo template are different conversations. */
  var PRODUCT_CTX_RX = /\b(do you (?:have|sell|do|offer|stock|make)|have you got|got any|any\b|sell|selling|stock|offer|looking for|look for|searching for|search for|need|want|buy|buying|purchase|price|pricing|cost|template|templates|design|designs|make me|create me|build me|show me|find me|where can i|is there|are there)\b/i;

  /* Never a "we don't stock that" answer — these are about a logo the visitor
     already owns and wants to put INTO a design. */
  var NOT_STOCKED_EXCLUDE = /\b(add|adding|insert|inserting|place|placing|put|putting|upload|uploading|change|changing|replace|replacing|remove|removing|swap|resize|position)\b[^.?!]{0,24}\blogos?\b|\b(my|our|your|their|its|the client'?s|company) logos?\b|\blogos? (?:to|on|in|onto|into) (?:the|my|a|an|each|every|any)\b/i;

  window.hexaUnknownCategoryIntent = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return null;
    if (!PRODUCT_CTX_RX.test(raw)) return null;
    if (NOT_STOCKED_EXCLUDE.test(raw)) return null;
    for (var i = 0; i < NOT_STOCKED.length; i++) {
      if (NOT_STOCKED[i][0].test(raw)) {
        var name = NOT_STOCKED[i][1], closest = NOT_STOCKED[i][2];
        return {
          reply: 'Being straight with you: we do not have ' + name + '. ' +
                 'What LazyDog does have is ' + CATALOGUE + '. ' +
                 (closest
                    ? 'The closest fit would be ' + closest + '. Want me to open those?'
                    : 'If one of those is close to what you need, tell me which and I will open it. ' +
                      'If not, say the word and I will note ' + name + ' down as a request — it is how we decide what to build next.'),
          target: null,
          label: null,
          execute: false,
          notStocked: name
        };
      }
    }
    return null;
  };

  /* A reply that PROMISES an action. Note "want me to open them?" is a
     question, not a promise, so it is deliberately not matched here. */
  var PROMISE_RX = /\b(opening\b|let me (?:check|look|see|pull)|pulling (?:them|these|those) up|taking you|i(?:'|’)ll open|i will open|here (?:it is|they are))/i;

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    var res = null;
    try {
      var unknown = window.hexaUnknownCategoryIntent(text);
      if (unknown) return unknown;
    } catch (e) {}

    res = _prevCompose ? _prevCompose.apply(this, arguments) : null;

    /* SAFETY NET — never promise to open something with nowhere to go. */
    try {
      if (res && res.reply && !res.target && PROMISE_RX.test(String(res.reply).replace(/<[^>]+>/g, ''))) {
        res = {
          reply: 'I do not want to promise something I cannot do — I have nothing to open for that one. ' +
                 'What LazyDog has is ' + CATALOGUE + '. ' +
                 'Tell me which of those is closest and I will open it properly, ' +
                 'or describe what you are after and I will note it down as a request.',
          target: null,
          label: null,
          execute: false,
          soft: false
        };
      }
    } catch (e) {}

    return res;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 21:05 UTC · Opus · BUG No. 10
   Hexa gives slide-deck answers on the Invoice Generator page.

   MEASURED BEFORE THE FIX (on invoice.html):
     "how do i add my logo to the invoice?"
       -> "Yes — drop your logo onto any slide, or place it on the slide master
           to have it repeat across the deck."
     Two CHAT_FAQ entries above (~line 117 and ~line 214, both LEFT INTACT)
     answer "add my logo" with slide-master instructions, and Hexa had no idea
     which page she was standing on.

   WORSE THAN THE NOTE SAYS — I checked invoice.html itself:
       type="file" count = 0 · no <img> · no upload control anywhere.
     The Invoice Generator has NO logo feature at all. So the old answer was not
     merely "deck words on the wrong page" — it was instructions for something
     that does not exist on that page in any form. A visitor would hunt for a
     slide master on an invoice form and conclude the tool is broken.
     What the generator DOES have: industry presets, design-style presets,
     client details, invoice number and dates, currency, tax, and Download.

   THIS BLOCK adds page awareness (window.hexaPageContext) and, on top of it:
     1. A small table of page-specific answers, starting with the reported one.
     2. A general SAFETY NET, same philosophy as the Bug 9 patch: when Hexa is
        on the invoice page and the answer she is about to give talks about
        slides / decks / PowerPoint / .pptx, it is replaced with an honest
        invoice answer instead of confidently naming the wrong product.
   Additive: wraps window.chatCompose. On every other page nothing changes.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 21:05 UTC · bug 10';

  window.hexaPageContext = function () {
    var f = '';
    try { f = (location.pathname || '').split('/').pop().toLowerCase(); } catch (e) {}
    if (/^invoice/.test(f))            return 'invoice';
    if (/^editor/.test(f))             return 'editor';
    if (/^pitch_deck/.test(f))         return 'pitch_deck';
    if (/^media_kits?/.test(f))        return 'media_kit';
    if (/^web_kit/.test(f))            return 'web_kit';
    if (/^career_docs/.test(f))        return 'career_docs';
    if (/^digital_keynote/.test(f))    return 'digital_keynote';
    if (/^lazydog_studio/.test(f))     return 'studio';
    if (/^hexa_promptbox/.test(f))     return 'hexa_world';
    return 'store';
  };

  var INVOICE_TOOLS = 'industry presets, a set of design styles, your client and ' +
    'invoice details, invoice number and dates, currency, tax, and a Download button';

  /* Page-specific answers. Checked BEFORE the shared FAQ, so the right page
     wins over the generic one. Add rows here as more pages need their own. */
  var PAGE_ANSWERS = {
    invoice: [
      [/\b(add|insert|put|place|upload|include)\b[^.?!]{0,24}\blogos?\b|\blogos?\b[^.?!]{0,20}\b(on|to|in|onto|into)\b[^.?!]{0,16}\binvoice\b/i,
        'Being straight with you: the Invoice Generator does not have a logo upload — I checked, there is no image field on it at all, ' +
        'so anything I told you about slide masters would be nonsense here. ' +
        'What it does give you is ' + INVOICE_TOOLS + '. ' +
        'If a branded invoice with your logo matters to you, say so and I will note it down as a request — ' +
        'and in the meantime you can add the logo after downloading, in Word or any PDF editor.'],
      [/\b(how (do|can) i (use|make|create|generate)|how does (it|this) work|get started)\b/i,
        'On this page: pick your industry and a design style, fill in your details and your client\'s, ' +
        'set the invoice number, dates, currency and tax, then hit Download. ' +
        'It is completely free, with no limits and no account needed.'],
      [/\b(price|pricing|cost|how much|free|pay|subscription)\b/i,
        'The Invoice Generator is <strong>free</strong> — no limits, no account needed, nothing to buy on this page.'],
      [/\b(save|download|export|pdf|print)\b/i,
        'Use the <strong>Download</strong> button on this page to save your invoice. ' +
        'It is free and there is no limit on how many you make.']
    ]
  };

  /* Vocabulary that only makes sense for a slide product. */
  var DECK_WORDS_RX = /\b(slide|slides|slide master|deck|decks|powerpoint|\.pptx|pptx|google slides|keynote|presentation)\b/i;

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    var page = 'store';
    try { page = window.hexaPageContext(); } catch (e) {}

    /* 1. page-specific answer wins — but only for questions that are really
       about THIS page. Regression-driven: an ungated version answered
       "can i pay by card" and, far worse, swallowed the Bug 8 payment
       complaint "money taken but no download" with "use the Download button".
       Row 0 (the logo row) needs no gate: it names the thing explicitly.
       A payment complaint always outranks a page answer. */
    try {
      if (!(window.hexaPaidNotReceivedIntent && window.hexaPaidNotReceivedIntent(text))) {
        var rows = PAGE_ANSWERS[page];
        if (rows) {
          var raw = String(text || '').replace(/\s+/g, ' ').trim();
          var refersToThisPage = /\binvoice\b|\bthis\b|\bhere\b/i.test(raw);
          for (var i = 0; i < rows.length; i++) {
            if (i > 0 && !refersToThisPage) continue;
            if (rows[i][0].test(raw)) {
              return { reply: rows[i][1], target: null, label: null, execute: false };
            }
          }
        }
      }
    } catch (e) {}

    var res = _prevCompose ? _prevCompose.apply(this, arguments) : null;

    /* 2. safety net — never answer in deck language on the invoice page.
       DELIBERATELY NARROW, and the regression suite is why. A first attempt
       fired whenever the ANSWER mentioned slides, and rewrote 358 of 893
       corpus answers on this page — including "do you have digital keynotes"
       and "8 slides please", which are deck questions a visitor is perfectly
       entitled to ask while standing on the invoice page. It now fires only
       when the QUESTION is clearly about this page ("...on the invoice",
       "how do I do this here") and carries no deck words of its own, yet the
       answer came back talking about slides. */
    try {
      var qRaw = String(text || '');
      /* Narrower than the page-answer gate above, on purpose: this branch
         REWRITES an answer, so a bare "here" or "this" is not enough. Caught in
         testing — "what can i find here" had a perfectly good site overview and
         was being replaced with a correction nobody needed. */
      var asksAboutThisPage = /\binvoice\b|\bthis (page|tool|thing|form)\b/i.test(qRaw);
      var questionMentionsDecks = DECK_WORDS_RX.test(qRaw) || /\b(media kit|web kit|pitch|template|templates)\b/i.test(qRaw);
      if (page === 'invoice' && asksAboutThisPage && !questionMentionsDecks &&
          res && res.reply &&
          DECK_WORDS_RX.test(String(res.reply).replace(/<[^>]+>/g, ''))) {
        res = {
          reply: 'That answer of mine was about our slide templates, which is not what you are looking at — ' +
                 'you are on the free <strong>Invoice Generator</strong>. ' +
                 'Here it is ' + INVOICE_TOOLS + '. ' +
                 'Tell me what you are trying to do on the invoice and I will answer for this page, ' +
                 'or ask me about pitch decks and media kits and I will happily talk about those instead.',
          target: null, label: null, execute: false
        };
      }
    } catch (e) {}

    return res;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed · page = ' + window.hexaPageContext()); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 21:35 UTC · Opus · BUG No. 12
   Hexa cannot quote the exact price of a specific real product.

   MEASURED BEFORE THE FIX: asking for one named design by its exact title got
   the generic "each design shows its Personal and Commercial price on its own
   page" answer. Hexa had no route to the real catalogue at all — only pricing
   RULES ("one-time purchase", "no subscription"), never a number.

   WHERE THE REAL PRICES LIVE (read out of pitch_deck_folder_section.html,
   which is the page that actually renders them):
       Firestore collection 'templates'
         · status === 'approved'
         · doc.template.name   -> the title shown on the card
         · doc.template.price  -> the number printed as "USD 00.00"
         · doc.template.slides -> slide array (a doc with none is not shown)
         · doc.designCode      -> the PD-044 style code on every card
         · product page        -> <category>_slides.html?firebase=<docId>
   So Hexa now reads the SAME source the shop does. If the shop shows a price,
   Hexa quotes that price; if the catalogue has nothing, she says so plainly
   rather than inventing one.

   HOW IT LOADS, and why it is done this way:
     · If the page already fetched its products, window._ldtAllDecks is reused
       instantly — zero extra reads on category pages.
     · Otherwise the catalogue is fetched ONCE, lazily, the first time a visitor
       actually talks to Hexa. A browser that never opens the chat costs nothing.
     · chatCompose is synchronous, so if the very first message is a price
       question the cache may still be in flight. That case answers honestly
       ("fetching it now, ask me once more") instead of guessing.
   Additive: wraps window.chatCompose.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 21:35 UTC · bug 12';

  var FB_CFG = {
    apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
    authDomain: "auth.lazydogtemplates.com",
    projectId: "templatehub-16cd7",
    storageBucket: "templatehub-16cd7.firebasestorage.app",
    messagingSenderId: "143000893683",
    appId: "1:143000893683:web:fd694de96f8c0fa6569f86"
  };

  var PAGE_FOR_CAT = {
    pitch_deck: 'pitch_deck_slides.html',
    pitch_decks: 'pitch_deck_slides.html',
    media_kit: 'media_kits_slides.html',
    media_kits: 'media_kits_slides.html',
    web_kit: 'web_kit_slides.html',
    web_kits: 'web_kit_slides.html',
    career_docs: 'career_docs_slides.html',
    career_doc: 'career_docs_slides.html',
    digital_keynote: 'digital_keynote_slides.html',
    digital_keynotes: 'digital_keynote_slides.html'
  };

  var catalogue = null;      /* array once loaded */
  var loading = false;
  var loadFailed = false;

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* Reuse whatever this page already fetched, if anything.

     8 Aug 2026 — CORRECTED AGAINST THE LIVE SITE. My first version read
     x.title / x.price / x.href straight off _ldtAllDecks, which is what the
     folder page's own `deck` object looks like. But the array actually holds
     the output of ldtNormalizeDeck(), whose shape is:
         { id, name, contentType:'media-kit', slides:12 (a NUMBER),
           industry, colorFamily[], ..., _card:{ title, cat, href, slides[],
           price, uploadedAt, code } }
     — the sellable detail (price, href, code) lives on _card, and `slides` is
     a number at the top level but an array inside _card. So every product came
     back with price undefined and url null, hexaProductsFor() matched nothing,
     and the in-chat product list silently never appeared on the live site.
     Note `_card.cat` is a SUB-category ("beauty_makeup"), not the product
     category — the category is contentType ("media-kit"), so that is what we
     match on, with the href as a second route. */
  function fromPage() {
    try {
      var d = window._ldtAllDecks;
      if (!d || !d.length) return null;
      return d.map(function (x) {
        var c = (x && x._card) || {};
        var slides = (c.slides && c.slides.length)
                  || (typeof x.slides === 'number' ? x.slides : (x.slides && x.slides.length))
                  || x.slideCount || null;
        return {
          name: c.title || x.name || x.title || '',
          price: (c.price != null && c.price !== '') ? c.price : x.price,
          slides: slides,
          code: c.code || x.code || '',
          cat: x.contentType || x.category || '',
          url: c.href || x.href || x.url || null
        };
      }).filter(function (x) { return x.name; });
    } catch (e) { return null; }
  }

  function loadCatalogue() {
    if (catalogue || loading) return;
    var page = fromPage();
    if (page && page.length) { catalogue = page; return; }
    loading = true;
    (async function () {
      try {
        var A = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
        var F = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
        var app = A.getApps().length ? A.getApp() : A.initializeApp(FB_CFG);
        var db = F.getFirestore(app);
        var snap = await F.getDocs(F.query(
          F.collection(db, 'templates'),
          F.where('status', '==', 'approved'),
          F.limit(300)
        ));
        var out = [];
        snap.forEach(function (d) {
          var v = d.data() || {}, t = v.template || {};
          if (!t.name) return;
          var cat = String(t.category || v.category || '').toLowerCase();
          if (cat === 'blog') return;
          var pageFile = PAGE_FOR_CAT[cat] || null;
          out.push({
            name: t.name,
            price: t.price,
            slides: (t.slides && t.slides.length) || null,
            code: v.designCode || '',
            cat: cat,
            url: pageFile ? (pageFile + '?firebase=' + d.id) : null
          });
        });
        catalogue = out;
        try { console.log('[hexa] catalogue loaded: ' + out.length + ' approved designs'); } catch (e) {}
      } catch (err) {
        loadFailed = true;
        console.error('[hexa] catalogue load FAILED — price answers fall back to the generic reply:', err && err.message);
      } finally { loading = false; }
    })();
  }
  window.hexaLoadCatalogue = loadCatalogue;
  window.hexaCatalogue = function () { return catalogue; };

  /* Words that appear in almost every title and so identify nothing. */
  var GENERIC_TITLE_WORD = {};
  ('deck decks kit kits template templates design designs slide slides presentation ' +
   'pitch media web website career keynote keynotes invoice brand press pack bundle ' +
   'the and for pro modern clean minimal').split(' ').forEach(function (w) { GENERIC_TITLE_WORD[w] = 1; });

  /* how many designs each distinctive word belongs to (built once per load) */
  var _rare = null;
  function rareWords() {
    if (_rare) return _rare;
    _rare = {};
    (catalogue || []).forEach(function (p) {
      var seen = {};
      norm(p.name).split(' ').forEach(function (w) {
        if (w.length <= 2 || GENERIC_TITLE_WORD[w] || seen[w]) return;
        seen[w] = 1;
        _rare[w] = (_rare[w] || 0) + 1;
      });
    });
    return _rare;
  }

  /* Scoring: exact title, then all-words, then design code. */
  function findProduct(text) {
    if (!catalogue || !catalogue.length) return [];
    var q = norm(text);
    var codeM = q.match(/\b(pd|mk|wk|cv|kn)\s?(\d{1,3})\b/);
    var scored = [];
    for (var i = 0; i < catalogue.length; i++) {
      var p = catalogue[i], n = norm(p.name), s = 0;
      if (!n) continue;
      if (codeM && p.code && norm(p.code).replace(/\s/g, '') === (codeM[1] + codeM[2].padStart(3, '0'))) s = 1000;
      else if (q.indexOf(n) !== -1) s = 500 + n.length;
      else {
        /* Match on the DISTINCTIVE words of the title only. Caught in testing:
           a loose "any 2 words match" rule made "how much do Media Kits cost"
           quote one specific product called "Midnight Media Kit" — a category
           question answered with one arbitrary item's price. The distinctive
           word ("midnight") has to be there before we name a product. */
        var words = n.split(' ').filter(function (w) { return w.length > 2; });
        var distinct = words.filter(function (w) { return !GENERIC_TITLE_WORD[w]; });
        var allPresent = function (list) {
          for (var k = 0; k < list.length; k++) if (q.indexOf(list[k]) === -1) return false;
          return list.length > 0;
        };
        if (allPresent(distinct)) s = 300 + n.length;
        else if (!distinct.length && allPresent(words)) s = 200 + n.length;
        else {
          /* A distinctive word that belongs to exactly ONE design in the whole
             catalogue is enough on its own — "price of Aurora deck" should find
             "Aurora Investor Deck". A word shared by several never is. */
          var uniq = distinct.filter(function (w) { return rareWords()[w] === 1 && q.indexOf(w) !== -1; });
          if (uniq.length) s = 250 + uniq.join('').length;
        }
      }
      if (s) scored.push({ p: p, s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 3).map(function (x) { return x.p; });
  }

  var PRICE_Q_RX = /\b(price|prices|pricing|cost|costs|how much|what do you charge|charge for|fee)\b/i;

  /* Only take over when the visitor has named something specific — a title of
     two words or more, or a design code. A bare "how much is a pitch deck" is
     a category question and keeps its existing, correct answer. */
  /* Category names are NOT a specific product — "how much do Media Kits cost"
     must keep its existing, correct category answer. */
  var CATEGORY_TITLE_RX = /^(pitch deck|pitch decks|media kit|media kits|press kit|web kit|web kits|website kit|career doc|career docs|digital keynote|digital keynotes|invoice generator|template|templates|design|designs)$/i;

  function namesSomethingSpecific(text) {
    var raw = String(text || '');
    if (/\b(pd|mk|wk|cv|kn)[\s\-_]?\d{1,3}\b/i.test(raw)) return true;
    if (/["“”'']([^"“”'']{3,})["“”'']/.test(raw)) return true;
    if (catalogue && findProduct(raw).length) return true;
    /* A Title Cased phrase reads like a product name someone copied off a card.
       Ignore the first word — every sentence starts with a capital. */
    var rest = raw.replace(/\s+/g, ' ').trim().split(' ').slice(1).join(' ');
    var m = rest.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)+/);
    if (m && !CATEGORY_TITLE_RX.test(m[0].trim())) return true;
    return false;
  }

  function money(v) {
    var n = parseFloat(v);
    if (!isFinite(n) || n <= 0) return null;
    return 'USD ' + n.toFixed(2);
  }

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    try {
      loadCatalogue();                       /* lazy warm-up on first message */
      var raw = String(text || '').replace(/\s+/g, ' ').trim();
      if (PRICE_Q_RX.test(raw) && namesSomethingSpecific(raw)) {
        if (!catalogue && !loadFailed) {
          return { reply: 'Let me pull the live price for that — I am fetching the catalogue now. ' +
                          'Ask me once more in a second and I will give you the exact figure.',
                   target: null, label: null, execute: false };
        }
        var hits = findProduct(raw);
        if (hits.length) {
          var top = hits[0], m = money(top.price);
          if (m) {
            return {
              reply: '<strong>' + top.name + '</strong>' + (top.code ? ' (' + top.code + ')' : '') +
                     ' is <strong>' + m + '</strong>' +
                     (top.slides ? ', ' + top.slides + ' slides' : '') +
                     '. That is a one-time purchase — no subscription — and the page shows both the ' +
                     'Personal and Commercial options.' +
                     (hits.length > 1 ? ' I also found "' + hits[1].name + '" if that is the one you meant.' : ''),
              target: top.url || null,
              label: top.url ? 'Open ' + top.name : null,
              execute: false
            };
          }
          return {
            reply: '<strong>' + top.name + '</strong> is listed in the catalogue, but it has no price set on it yet, ' +
                   'so I am not going to guess one. Open its page and it will show the current figure — ' +
                   'or ask me and I will flag it.',
            target: top.url || null,
            label: top.url ? 'Open ' + top.name : null,
            execute: false
          };
        }
        return {
          reply: 'I could not find a design by that exact name in the catalogue, so I will not invent a price. ' +
                 'Tell me the title as it appears on the card (or its code, like PD-044) and I will look up the ' +
                 'real figure. Every design is a one-time purchase with Personal and Commercial pricing on its page.',
          target: null, label: null, execute: false
        };
      }
    } catch (e) {}
    return _prevCompose ? _prevCompose.apply(this, arguments) : null;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 23:30 UTC · Opus · BUG No. 15
   One exact sentence about feeling sad/stressed always gets a terms/policy reply.

   THE BAD RULE, found by bisecting the sentence word by word:
     It is not "these days". It is the single word "really".
       "I"                                 -> (no local answer, goes to AI) ✔
       "I am feeling"                      -> (no local answer) ✔
       "I am feeling really"               -> "That's what our current terms say…" ✘
       "really"                            -> "That's what our current terms say…" ✘
       "stressed" / "sad" / "these days"   -> (no local answer) ✔
     Source: CHAT_FAQ line ~158 above (LEFT INTACT):
       { match: ["are you sure","really","is that correct","you sure"],
         reply: "That's what our current terms say. …" }
     The bare word "really" is in that match list. It was written for a
     follow-up doubt-check ("really?") after Hexa states a fact, but it fires on
     ANY sentence containing the word. Hence the word-for-word identical reply
     every time, on every page — it is a script, not a model.

   AND THE AI WAS FINE ALL ALONG. I called chat_http directly with this exact
   sentence today; it answered:
       "Sorry to hear that, hope things get better for you soon…"
   So the only thing standing between a person saying they feel low and a decent
   answer was this one keyword short-circuiting the AI. That is why the very
   similar "I feel very lonely and down lately" — no "really" in it — worked.

   THIS BLOCK (wraps window.chatCompose; the FAQ entry is untouched):
     1. The terms/policy reply is only allowed to stand when the message really
        IS a short doubt-check ("really?", "are you sure?"). In any longer
        sentence it is dropped and the message goes to the live AI.
     2. Clear emotional-distress wording gets a warm reply marked soft:true —
        the widgets' existing convention meaning "hand this to the live AI so it
        is warm and context-aware, and use my line only if the AI is offline".
        So nobody expressing distress can ever land on a terms-and-conditions
        script, even with the network down.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 23:30 UTC · bug 15';

  var TERMS_REPLY_RX  = /what'?s? our current terms say/i;
  var DOUBT_ONLY_RX   = /^(oh[ ,]+)?(really|are you sure|you sure|is that correct|is that right|seriously|for real)\s*[?!.]*$/i;

  /* Clear, first-person distress. Deliberately narrow — it must not catch
     "this deck is depressing" or "sad colours". */
  var DISTRESS_RX = new RegExp(
    '\\bi(?:\'|’)?\\s?(?:a?m|feel|am feeling|\'m feeling|ve been|have been)\\b[^.?!]{0,40}' +
    '\\b(sad|down|low|depressed|depressing|stressed|stress|anxious|anxiety|lonely|alone|' +
    'burnt out|burned out|overwhelmed|exhausted|hopeless|miserable|struggling|unhappy|awful|terrible)\\b',
    'i');

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();

    /* 2. distress first — a warm line that defers to the live AI */
    try {
      if (DISTRESS_RX.test(raw)) {
        return {
          reply: 'I am sorry you are feeling like that — thank you for saying it. ' +
                 'I am only a shop assistant, so I cannot do much, but I am happy to just chat, ' +
                 'or to leave you be and be here when you want something. ' +
                 'And if things feel heavy, talking to someone you trust really does help.',
          target: null, label: null, execute: false,
          soft: true          /* -> the widgets hand this to the live AI */
        };
      }
    } catch (e) {}

    var res = _prevCompose ? _prevCompose.apply(this, arguments) : null;

    /* 1. the terms reply only survives a genuine short doubt-check */
    try {
      if (res && res.reply && TERMS_REPLY_RX.test(String(res.reply).replace(/<[^>]+>/g, '')) &&
          !DOUBT_ONLY_RX.test(raw)) {
        try {
          console.warn('[chat_brain ' + PATCH + '] dropped the terms/policy script on "' +
                       raw.slice(0, 60) + '" — passing to the AI instead');
        } catch (e) {}
        return null;                       /* -> caller asks the live AI */
      }
    } catch (e) {}

    return res;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 02:10 UTC · Opus · HEXA REMEMBERS  (improvement, not a bug)

   THE OBSERVATION, after fixing all fifteen: the single thing that makes Hexa
   feel dim is not any one wrong answer. It is that HER MAIN ACTION DESTROYS
   HER OWN MEMORY.

   Look at what she does when she succeeds:
       "Opening Media Kits for you."   -> window.location.href = …
   Every successful answer navigates. hbHistory in navbar.js is a plain
   in-memory array (line 894), so the page unload wipes it. The visitor lands
   on the new page and is met with "Hi 👋 I'm Hexa" — the same first-time
   greeting a stranger gets. Everything they just said is gone.
   So the better Hexa is at her job, the faster she forgets you. Three turns
   in, a visitor has explained themselves three times.

   Worse, the live AI is handed history: hbHistory.slice(0,-1) — which after a
   navigation is EMPTY. The backend happily accepts six turns of context
   (_clean_history in main.py, line 946) and was being sent none.

   WHAT THIS BLOCK DOES — three parts, all additive:
     1. A conversation that survives navigation. Every turn is kept in
        sessionStorage (per tab, cleared when the tab closes, never sent
        anywhere on its own).
     2. The thread is restored on the next page, under a quiet "earlier in this
        chat" divider, and the first-time greeting is replaced with a welcome
        back — so it reads as ONE conversation across the whole site.
     3. That history is merged into the chat_http call, so the AI finally gets
        the context it always had room for. Done by intercepting only that one
        URL in fetch; every other request passes through untouched.
   navbar.js is not edited: window.helpbotSend is wrapped, and chat_brain.js is
   injected by navbar.js afterwards, so the wrapper wins.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 02:10 UTC · hexa remembers';
  var KEY = 'hexa_thread';
  var MAX = 24;

  function pageName() {
    try { return (location.pathname || '').split('/').pop() || 'home'; } catch (e) { return 'home'; }
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(a) {
    try { sessionStorage.setItem(KEY, JSON.stringify(a.slice(-MAX))); } catch (e) {}
  }
  function push(role, text) {
    var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!t) return;
    var a = load();
    var last = a[a.length - 1];
    if (last && last.role === role && last.text === t) return;      /* no echoes */
    a.push({ role: role, text: t.slice(0, 700), page: pageName() });
    save(a);
  }
  window.hexaConvo = {
    get: load,
    push: push,
    clear: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} },
    /* the shape chat_http already expects */
    asHistory: function () {
      return load().map(function (m) {
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text };
      });
    }
  };

  /* ── 1 + 2. record every turn, and put the thread back on the next page ── */

  function readBubble(el) {
    if (!el) return '';
    var copy = el.cloneNode(true);
    try {
      Array.prototype.forEach.call(copy.querySelectorAll('a,button'), function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
    } catch (e) {}
    return (copy.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* Hexa's reply is written into the bubble asynchronously (typing dots first,
     then the text, sometimes then a button) — so record it once it settles. */
  function recordNextReply() {
    var thread = document.getElementById('lbThread');
    if (!thread) return;
    var before = thread.querySelectorAll('.lb-msg.bot').length;
    var timer = null, done = false, obs = null;
    function finish() {
      if (done) return;
      done = true;
      try { obs && obs.disconnect(); } catch (e) {}
      clearTimeout(timer);
      var bots = thread.querySelectorAll('.lb-msg.bot');
      var txt = readBubble(bots[bots.length - 1]);
      if (txt && !/^[.·…\s]*$/.test(txt)) push('assistant', txt);
    }
    obs = new MutationObserver(function () {
      if (thread.querySelectorAll('.lb-msg.bot').length <= before) return;
      clearTimeout(timer);
      timer = setTimeout(finish, 800);
    });
    obs.observe(thread, { childList: true, subtree: true, characterData: true });
    setTimeout(finish, 30000);
  }

  var _prevSend = window.helpbotSend;
  if (typeof _prevSend === 'function') {
    window.helpbotSend = function (text) {
      try { push('user', text); recordNextReply(); } catch (e) {}
      return _prevSend.apply(this, arguments);
    };
  }

  function restoreThread() {
    var thread = document.getElementById('lbThread');
    if (!thread || thread.dataset.ldRestored) return;
    var past = load();
    if (!past.length) return;
    thread.dataset.ldRestored = '1';

    var greet = document.getElementById('lbGreet');
    var name = '';
    try { name = (window.hexaMemory && window.hexaMemory.get().name) || ''; } catch (e) {}
    if (greet) {
      greet.innerHTML = name
        ? 'Welcome back, <strong>' + name + '</strong> 👋 — carrying on from where we were.'
        : "We were mid-conversation 👋 — I've kept it, carry on where you left off.";
    }

    var frag = document.createDocumentFragment();
    var div = document.createElement('div');
    div.className = 'lb-row bot';
    div.style.cssText = 'justify-content:center;opacity:.55;';
    div.innerHTML = '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;' +
                    'padding:6px 0;font-family:Inter,sans-serif;">earlier in this chat</div>';
    frag.appendChild(div);

    past.slice(-8).forEach(function (m) {
      var who = m.role === 'assistant' ? 'bot' : 'user';
      var row = document.createElement('div');
      row.className = 'lb-row ' + who;
      var msg = document.createElement('div');
      msg.className = 'lb-msg ' + who;
      msg.style.opacity = '.72';
      msg.textContent = m.text;                    /* text only — never re-inject HTML */
      row.appendChild(msg);
      frag.appendChild(row);
    });

    var anchor = greet ? greet.parentNode : thread.firstChild;
    if (anchor && anchor.nextSibling) thread.insertBefore(frag, anchor.nextSibling);
    else thread.appendChild(frag);
  }

  var tries = 0;
  var t = setInterval(function () {
    tries++;
    if (document.getElementById('lbThread')) { restoreThread(); clearInterval(t); }
    else if (tries > 150) clearInterval(t);
  }, 100);

  /* ── 3. hand that history to the AI (only the chat endpoint is touched) ── */
  (function () {
    if (window.__hexaFetchWrapped) return;
    window.__hexaFetchWrapped = true;
    var of_ = window.fetch;
    if (typeof of_ !== 'function') return;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/chat_http(\?|$)/.test(url) && init && init.body && typeof init.body === 'string') {
          var body = JSON.parse(init.body);
          if (body && typeof body === 'object' && 'message' in body) {
            var stored = window.hexaConvo.asHistory();
            var inPage = Array.isArray(body.history) ? body.history : [];
            /* stored already contains this page's turns; keep whichever set is
               longer, then drop the message we are about to send */
            var merged = stored.length >= inPage.length ? stored : inPage;
            var msg = String(body.message || '').replace(/\s+/g, ' ').trim();
            merged = merged.filter(function (h) {
              return !(h.role === 'user' && String(h.content || '').trim() === msg);
            }).slice(-8);
            /* optional page/product context, supplied by a later patch */
            try {
              if (typeof window.hexaContextTurn === 'function') {
                var ctx = window.hexaContextTurn();
                if (ctx) merged = merged.concat([{ role: 'user', content: String(ctx).slice(0, 300) }]);
              }
            } catch (e2) {}
            body.history = merged;
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      } catch (e) { /* never let this break a request */ }
      return of_.apply(this, arguments.length > 1 ? [input, init] : [input]);
    };
  })();

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 03:05 UTC · Opus · SHOP IN THE CHAT (improvement)

   THE PROBLEM WITH WINNING. "show me media kits" was answered:
       { reply:'Opening Media Kits for you.', target:'media_kits_folder_section.html',
         execute:true }
   and navbar.js then does window.location.href after 900ms. Hexa's best answer
   is a redirect — she ends the conversation to succeed at it, and the previous
   patch had to work hard just to carry the memory across that jump.
   It also throws away everything she knows. She HAS the real catalogue now
   (the Bug 12 patch reads Firestore: names, prices, slide counts, design codes,
   product URLs) and was still saying "opening the folder" instead of "here are
   three, five dollars each".

   THIS BLOCK: when Hexa is about to navigate to a CATEGORY FOLDER page, she
   instead shows the real designs in the chat — name, code, price, slide count,
   each a link — plus a "browse all N" link for the folder page. She stops
   navigating away, so the conversation keeps going and the person can ask
   "which of those is cheapest" without losing their place.

   DELIBERATELY CONSERVATIVE:
     · Only category BROWSE answers are intercepted. Creation ("make me a
       deck" -> the Designer), the invoice tool, the studio, FAQ answers and
       everything else are untouched — they keep their own targets.
     · If the catalogue has not loaded yet, or has nothing for that category,
       the ORIGINAL navigate-away answer is returned unchanged. Never a worse
       experience than before, only a better one.
     · Prices are only ever printed from the real record. No price on file ->
       the row just says the slide count.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 03:05 UTC · shop in the chat';
  var SHOW = 3;

  /* folder page -> the category key used on the product records */
  var FOLDER_CAT = {
    'pitch_deck_folder_section.html':   'pitchdeck',
    'media_kits_folder_section.html':   'mediakit',
    'web_kit_folder_file.html':         'webkit',
    'career_docs_folder_section.html':  'careerdoc',
    'digital_keynote-folder.html':      'digitalkeynote'
  };
  var FOLDER_LABEL = {
    'pitch_deck_folder_section.html':   'pitch decks',
    'media_kits_folder_section.html':   'media kits',
    'web_kit_folder_file.html':         'website UI kits',
    'career_docs_folder_section.html':  'career docs',
    'digital_keynote-folder.html':      'digital keynotes'
  };

  function key(s) {
    return String(s || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
  }

  /* a product belongs to a category if its own category field says so, or —
     for records that came from the page's own fetch — if its product URL does */
  function inCategory(p, wanted) {
    var a = key(p.cat);
    if (a && (a.indexOf(wanted) === 0 || wanted.indexOf(a) === 0)) return true;
    var u = key(p.url);
    return !!(u && u.indexOf(wanted) === 0);
  }

  function money(v) {
    var n = parseFloat(v);
    return (isFinite(n) && n > 0) ? 'USD ' + n.toFixed(2) : null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function row(p) {
    var bits = [];
    var m = money(p.price);
    if (m) bits.push('<strong>' + esc(m) + '</strong>');
    if (p.slides) bits.push(esc(p.slides) + ' slides');
    var meta = bits.length ? ' — ' + bits.join(' · ') : '';
    var title = esc(p.name) + (p.code ? ' <span style="opacity:.6">(' + esc(p.code) + ')</span>' : '');
    return p.url
      ? '<div style="margin:7px 0;"><a href="' + esc(p.url) + '" style="font-weight:700;">' + title + '</a>' + meta + '</div>'
      : '<div style="margin:7px 0;">' + title + meta + '</div>';
  }

  window.hexaProductsFor = function (folderPage, limit) {
    var wanted = FOLDER_CAT[folderPage];
    if (!wanted) return null;
    var cat = null;
    try { cat = window.hexaCatalogue && window.hexaCatalogue(); } catch (e) {}
    if (!cat || !cat.length) return null;
    var hits = cat.filter(function (p) { return p && p.name && inCategory(p, wanted); });
    return hits.length ? hits.slice(0, limit || SHOW) : null;
  };

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    var res = _prevCompose ? _prevCompose.apply(this, arguments) : null;
    try {
      /* warm the catalogue the moment anyone starts browsing */
      if (window.hexaLoadCatalogue) window.hexaLoadCatalogue();

      if (!res || !res.target) return res;
      var folder = String(res.target).split('?')[0];
      if (!FOLDER_CAT[folder]) return res;                      /* not a category page */
      /* Only take over a pure BROWSE answer: either she was about to navigate,
         or the whole reply is the "Opening X for you." line. Anything with real
         content in it — pricing, licensing, editability — keeps its own answer
         and just carries the category link as before. */
      var plain = String(res.reply || '').replace(/<[^>]+>/g, '').trim();
      var pureBrowse = /^opening\b[^.]*\bfor you\.?$/i.test(plain);
      if (!res.execute && !pureBrowse) return res;
      /* 8 Aug 2026 — Hexa is an ACTION bot, not only a chat bot. An EXPLICIT
         command ("open media kits", "take me to pitch decks", "go to invoice")
         is an instruction, and she obeys it literally — she still takes you
         there. Only a softer browse ("show me media kits", "media kits",
         "do you have media kits") is answered with the products in the chat,
         because that is a question, not an order. */
      if (/\b(open|take me|go to|goto|bring me|bring up|navigate|jump to|send me)\b/i.test(String(text || ''))) return res;
      /* belt and braces: a CREATION request belongs to the Designer. All three
         chat surfaces already test design intent before chatCompose, so this
         should never trigger — it is here so it can never regress. */
      if (window.hexaDesignIntent && window.hexaDesignIntent(text)) return res;

      var picks = window.hexaProductsFor(folder, SHOW);
      if (!picks) return res;                                   /* nothing to show — behave as before */

      var all = window.hexaCatalogue().filter(function (p) {
        return p && p.name && inCategory(p, FOLDER_CAT[folder]);
      }).length;
      var label = FOLDER_LABEL[folder] || 'designs';

      var html = 'Here ' + (picks.length === 1 ? 'is one of our ' : 'are ' + picks.length + ' of our ') +
                 esc(label) + ' — click any of them:' +
                 picks.map(row).join('') +
                 (all > picks.length
                   ? '<div style="margin-top:8px;"><a href="' + esc(res.target) + '">Browse all ' + all + ' ' + esc(label) + ' →</a></div>'
                   : '') +
                 '<div style="margin-top:8px;opacity:.75;font-size:12px;">' +
                 'Tell me an industry, colour or budget and I will narrow it down.</div>';

      return {
        reply: html,
        target: res.target,
        label: 'Browse all ' + label,
        execute: false,        /* <- the point: stop navigating away mid-conversation */
        inlineProducts: picks.length
      };
    } catch (e) { return res; }
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 04:00 UTC · Opus · SHE KNOWS WHAT YOU ARE LOOKING AT

   The gap: standing on a product page, Hexa had no idea which product. Ask
   "how much is this?" while the price is printed six inches above her head and
   she answered with the generic "each design shows its price on its own page".

   She does not need a lookup for this — the product page has already fetched
   the record and left it in a global. Verified on all five:
       media_kits_slides.html      -> currentKitData      (line 533)
       web_kit_slides.html         -> currentKitData
       career_docs_slides.html     -> currentKitData
       pitch_deck_slides.html      -> currentDeckData     (line 580)
       digital_keynote_slides.html -> currentKeynoteData  (line 532)
   Different names, slightly different fields (slideCount vs pageCount), same
   data. This block reads whichever exists, so it costs nothing: no Firestore
   call, no network, instant.

   WHAT SHE CAN NOW DO ON A PRODUCT PAGE:
     · open with the actual product — "That's the GlowUp Serum kit, USD 5.00,
       12 slides. Ask me anything about it."
     · resolve "this" and "it" — how much is this / how many slides / what
       formats / is this editable / what is this
     · show similar designs from the same category, in the chat
     · and tell the live AI what the visitor is looking at, through the context
       hook added to the memory patch above.
   Everywhere else on the site nothing changes.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 04:00 UTC · product awareness';

  var PAGE_CAT = {
    'pitch_deck_slides.html':      { key: 'pitchdeck',      label: 'pitch deck',      folder: 'pitch_deck_folder_section.html' },
    'media_kits_slides.html':      { key: 'mediakit',       label: 'media kit',       folder: 'media_kits_folder_section.html' },
    'web_kit_slides.html':         { key: 'webkit',         label: 'website UI kit',  folder: 'web_kit_folder_file.html' },
    'career_docs_slides.html':     { key: 'careerdoc',      label: 'career doc',      folder: 'career_docs_folder_section.html' },
    'digital_keynote_slides.html': { key: 'digitalkeynote', label: 'digital keynote', folder: 'digital_keynote-folder.html' }
  };

  function file() {
    try { return (location.pathname || '').split('/').pop().toLowerCase(); } catch (e) { return ''; }
  }
  /* HOUSE RULE (Javed, 8 Aug 2026): NOTHING on this site is free except the
     Invoice Generator. So this never returns the word "free" for a design —
     a missing, zero or unparseable price means we simply do not know it, and
     Hexa says so instead of giving a paid product away in conversation. */
  function money(v) {
    var n = parseFloat(v);
    return (isFinite(n) && n > 0) ? 'USD ' + n.toFixed(2) : null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* the page has already loaded the record — just read it */
  window.hexaCurrentProduct = function () {
    var meta = PAGE_CAT[file()];
    if (!meta) return null;
    var d = null;
    try { d = window.currentKitData || window.currentDeckData || window.currentKeynoteData || null; } catch (e) { d = null; }
    if (!d || !d.name) return null;
    var slides = d.slideCount || d.pageCount || (d.slides && d.slides.length) || null;
    var id = '';
    try { id = window._ldtProductId || new URLSearchParams(location.search).get('firebase') || ''; } catch (e) {}
    return {
      name: d.name,
      price: d.price,
      priceText: money(d.price),
      slides: slides,
      fileTypes: (d.fileTypes || []).slice(0, 6),
      apps: (d.editableApps || []).slice(0, 6),
      industry: d.industry || null,
      desc: d.desc || null,
      id: id,
      catKey: meta.key,
      catLabel: meta.label,
      folder: meta.folder
    };
  };

  /* what the live AI is told — honest, first person, because it is true */
  window.hexaContextTurn = function () {
    var p = window.hexaCurrentProduct();
    if (!p) return null;
    var bits = ['"' + p.name + '"'];
    if (p.priceText) bits.push(p.priceText);
    if (p.slides) bits.push(p.slides + ' slides');
    return '(For context: I am on the product page for ' + bits.join(', ') + '.)';
  };

  /* ── the opening line on a product page ── */
  function greetWithProduct() {
    var thread = document.getElementById('lbThread');
    var greet = document.getElementById('lbGreet');
    if (!thread || !greet || greet.dataset.ldProduct) return false;
    if (thread.dataset.ldRestored) return true;   /* mid-conversation — leave it alone */
    var p = window.hexaCurrentProduct();
    if (!p) return false;
    greet.dataset.ldProduct = '1';
    var bits = [];
    if (p.priceText) bits.push('<strong>' + esc(p.priceText) + '</strong>');
    if (p.slides) bits.push(esc(p.slides) + ' slides');
    greet.innerHTML = "You're looking at <strong>" + esc(p.name) + '</strong>' +
      (bits.length ? ' — ' + bits.join(' · ') : '') + '. ' +
      'Ask me anything about it — the licence, the formats, whether it fits what you need — ' +
      'or say <em>“show me similar”</em> and I will pull up others like it.';
    return true;
  }
  var tries = 0;
  var t = setInterval(function () {
    tries++;
    if (greetWithProduct() || tries > 200) clearInterval(t);
  }, 150);

  /* ── "this" / "it" now mean the thing on screen ── */
  var ABOUT_THIS = /\b(this|it|that|the one|here)\b/i;

  var _prevCompose = window.chatCompose;

  window.chatCompose = function (text) {
    try {
      var p = window.hexaCurrentProduct();
      if (p) {
        var raw = String(text || '').replace(/\s+/g, ' ').trim();
        /* "this" is implied when the visitor names no OTHER product. Caught in
           testing: "what formats do i get" says neither "this" nor "it", but on
           a product page it can only mean the thing on screen — while
           "how much is a media kit" names a category and must keep the
           category answer. */
        var namesOther = /\b(pitch deck|pitch decks|media kit|media kits|web kit|web kits|website kit|career doc|career docs|keynote|keynotes|invoice|template|templates|design|designs)\b/i.test(raw);
        var refers = !namesOther && (ABOUT_THIS.test(raw) || raw.split(' ').length <= 8);

        /* Warm the catalogue here too. Caught in testing: the branches below
           return early, so the lazy loader further down the chain never ran and
           "show me similar" came back empty on a page where the products were
           sitting right there. */
        try { if (window.hexaLoadCatalogue) window.hexaLoadCatalogue(); } catch (e1) {}

        /* similar designs — reuse the in-chat product list */
        if (/\b(similar|like this|others like|more like|alternatives|something else like)\b/i.test(raw)) {
          var list = window.hexaProductsFor && window.hexaProductsFor(p.folder, 4);
          if (list) {
            var rows = list.filter(function (x) { return x.name !== p.name; }).slice(0, 3);
            if (rows.length) {
              return {
                reply: 'Others in the same range as <strong>' + esc(p.name) + '</strong>:' +
                  rows.map(function (x) {
                    var m = money(x.price), meta = [];
                    if (m) meta.push('<strong>' + esc(m) + '</strong>');
                    if (x.slides) meta.push(esc(x.slides) + ' slides');
                    return '<div style="margin:7px 0;"><a href="' + esc(x.url || p.folder) + '" style="font-weight:700;">' +
                           esc(x.name) + '</a>' + (meta.length ? ' — ' + meta.join(' · ') : '') + '</div>';
                  }).join(''),
                target: p.folder, label: 'Browse all ' + p.catLabel + 's', execute: false
              };
            }
          }
        }

        if (refers) {
          /* "is this free?" — the answer is no, and it must never be fudged */
          if (/\b(free|no charge|cost nothing|without paying|for nothing)\b/i.test(raw)) {
            return {
              reply: 'No — <strong>' + esc(p.name) + '</strong> is a paid design' +
                     (p.priceText ? ' (<strong>' + esc(p.priceText) + '</strong>)' : '') +
                     '. Every template here is a one-time purchase, and the only free thing on the site is the ' +
                     '<strong>Invoice Generator</strong>. Browsing and the full slide-by-slide preview are free, so you can see ' +
                     'exactly what you are getting before you buy.',
              target: 'invoice.html', label: 'Open Invoice Generator', execute: false
            };
          }
          /* price */
          if (/\b(price|cost|costs|how much|what do you charge|fee)\b/i.test(raw)) {
            return {
              reply: p.priceText
                ? '<strong>' + esc(p.name) + '</strong> is <strong>' + esc(p.priceText) + '</strong>' +
                  (p.slides ? ', ' + esc(p.slides) + ' slides' : '') +
                  '. One-time purchase, no subscription — the page shows the Personal and Commercial options.'
                : 'The live price for <strong>' + esc(p.name) + '</strong> is the one printed on this page — ' +
                  'I do not have a figure to hand and I will not guess one. ' +
                  'Every design is a paid one-time purchase; the only free thing on the site is the Invoice Generator.',
              target: null, label: null, execute: false
            };
          }
          /* slide / page count */
          if (/\b(how many (slides|pages)|slide count|page count|number of (slides|pages))\b/i.test(raw)) {
            return {
              reply: p.slides
                ? '<strong>' + esc(p.name) + '</strong> has <strong>' + esc(p.slides) + ' slides</strong>. You can duplicate or delete any of them.'
                : 'The slide count for <strong>' + esc(p.name) + '</strong> is shown on this page — I do not have it to hand.',
              target: null, label: null, execute: false
            };
          }
          /* formats */
          if (/\b(format|formats|file type|file types|what do i get|what files|which files)\b/i.test(raw)) {
            var f = p.fileTypes.length ? p.fileTypes.join(', ') : '.PPTX and a PDF preview';
            var a = p.apps.length ? ' It opens in ' + esc(p.apps.join(', ')) + '.' : '';
            return {
              reply: 'With <strong>' + esc(p.name) + '</strong> you get <strong>' + esc(f) + '</strong>.' + a,
              target: null, label: null, execute: false
            };
          }
          /* editable */
          if (/\b(editable|can i edit|customis|customiz|change the (text|colours|colors))\b/i.test(raw)) {
            return {
              reply: 'Yes — <strong>' + esc(p.name) + '</strong> is fully editable: text, colours, shapes and image placeholders.' +
                     (p.apps.length ? ' Open it in ' + esc(p.apps.join(', ')) + ' and change whatever you like.' : ''),
              target: null, label: null, execute: false
            };
          }
          /* what is this */
          if (/^(what is (this|it)|what am i looking at|tell me about (this|it)|what'?s this)\b/i.test(raw)) {
            var d = [];
            if (p.priceText) d.push(p.priceText);
            if (p.slides) d.push(p.slides + ' slides');
            if (p.industry) d.push(p.industry);
            return {
              reply: 'This is <strong>' + esc(p.name) + '</strong>, a ' + esc(p.catLabel) +
                     (d.length ? ' — ' + esc(d.join(' · ')) : '') + '.' +
                     (p.desc ? ' ' + esc(String(p.desc).slice(0, 220)) : ''),
              target: null, label: null, execute: false
            };
          }
        }
      }
    } catch (e) {}
    return _prevCompose ? _prevCompose.apply(this, arguments) : null;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 06:40 UTC · Opus · FOUR FIELD REPORTS

   (A) "Bold text showing as raw code" — CONFIRMED, and it was mine.
       navbar.js renders each handler's reply differently:
           bubble.innerHTML = composed.reply     <- chatCompose answers
           bubble.textContent = lead.reply       <- LEAD CAPTURE answers
       My contact-request replies contained <strong>, so on that one path the
       tags printed literally. Lead replies are now stripped to plain text at
       the source; every other path keeps its formatting.

   (B) "call me back" was not recognised as a contact request — also mine.
       The guard meant to stop "call me Sarah" being read as a callback,
           /call me [a-z][a-z'-]{1,20}\s*$/
       also matched "call me back", "call me tomorrow", "call me later". Those
       are callbacks, not names. The guard now only fires on a word that could
       actually be a name.

   (C) "Chat goes completely silent on certain phrasings" — could NOT be
       reproduced here: through the real navbar cascade, "call me about a
       custom deck" and "please call me about a custom deck for my startup"
       both answer correctly. Rather than guess at a cause I cannot see, this
       makes silence IMPOSSIBLE: a watchdog checks the reply bubble a few
       seconds after every message, and if it is still empty or still showing
       the typing dots it writes an honest line and logs the message that did
       it, so the next report arrives with evidence attached.

   (D) "It said it doesn't store names, right after using my name" — the local
       brain remembers, but the live AI was never told, so it answered from its
       own policy text. The name now travels with the page context, and a
       direct "do you remember my name?" is answered locally from memory.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 06:40 UTC · field reports A-D';

  function plain(s) {
    return String(s == null ? '' : s)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  /* ── (A) lead replies must be plain text — navbar prints them as text ── */
  var _prevLead = window.hexaLeadCapture;
  /* "call me back / later / tomorrow / when you can" IS a contact request. The
     earlier guard, written to stop "call me Sarah" being read as a callback,
     was swallowing these too — so they produced no reply at all. Re-ask the
     original handler in a form it recognises, so the real callback logic
     (including the lead POST) still does the work. */
  var CALLBACK_ADVERB_RX = /\bcall me\s+(back|later|soon|tomorrow|today|tonight|asap|urgently|when you can|when you get a chance|any ?time)\b/i;
  var EMAIL_RX2 = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  window.hexaLeadCapture = function (text) {
    var raw = String(text || '');
    var r = _prevLead ? _prevLead.apply(this, arguments) : null;
    if (!r && CALLBACK_ADVERB_RX.test(raw)) {
      var em = (raw.match(EMAIL_RX2) || [null])[0];
      r = _prevLead ? _prevLead(em ? ('please contact me at ' + em) : 'please contact me') : null;
    }
    if (r && r.reply) r = Object.assign({}, r, { reply: plain(r.reply) });
    return r;
  };

  /* ── (B) "call me back / later / tomorrow" is a callback, not a name ── */
  var NOT_A_NAME = ('back later soon now today tonight tomorrow yesterday asap urgently ' +
    'please quickly again anytime when whenever regarding about re first thing ' +
    'sometime someday immediately directly personally').split(' ');
  var _prevName = window.hexaNameCapture;
  window.hexaNameCapture = function (text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    var m = raw.match(/\bcall me\s+([A-Za-z][A-Za-z'\-]{1,20})\s*[.!?]*$/i);
    if (m && NOT_A_NAME.indexOf(m[1].toLowerCase()) !== -1) return null;  /* not a name */
    return _prevName ? _prevName.apply(this, arguments) : null;
  };

  /* ── (D) the AI is told who it is speaking to, and "what's my name" is
         answered from memory rather than from the model's policy text ── */
  var _prevCtx = window.hexaContextTurn;
  window.hexaContextTurn = function () {
    var bits = [];
    try {
      var n = (window.hexaMemory && window.hexaMemory.get().name) || '';
      if (n) bits.push('My name is ' + n + ' — you already know it, I told you.');
    } catch (e) {}
    var prev = null;
    try { prev = _prevCtx ? _prevCtx.apply(this, arguments) : null; } catch (e) {}
    if (prev) bits.push(prev);
    return bits.length ? bits.join(' ') : null;
  };

  var _prevCompose = window.chatCompose;
  window.chatCompose = function (text) {
    try {
      var raw = String(text || '').replace(/\s+/g, ' ').trim();
      if (/\b(do you (remember|know) my name|what(?:'|’)?s my name|what is my name|who am i)\b/i.test(raw)) {
        var name = '';
        try { name = (window.hexaMemory && window.hexaMemory.get().name) || ''; } catch (e) {}
        return {
          reply: name
            ? 'Yes — you are <strong>' + plain(name) + '</strong>. I keep it in this browser only, so I can greet you properly; it is not sent anywhere and you can clear it any time by telling me to forget your name.'
            : 'I do not have a name for you yet. Tell me what to call you and I will remember it in this browser — nowhere else.',
          target: null, label: null, execute: false
        };
      }
    } catch (e) {}
    return _prevCompose ? _prevCompose.apply(this, arguments) : null;
  };

  /* ── (C) a bubble can never be left silent again ── */
  var _prevSend = window.helpbotSend;
  if (typeof _prevSend === 'function') {
    window.helpbotSend = function (text) {
      var r = _prevSend.apply(this, arguments);
      try {
        var thread = document.getElementById('lbThread');
        if (thread) {
          var before = thread.querySelectorAll('.lb-msg.bot').length;
          setTimeout(function () {
            try {
              var bots = thread.querySelectorAll('.lb-msg.bot');
              var last = bots[bots.length - 1];
              if (bots.length <= before || !last) return;          /* no bubble to police */
              var txt = (last.textContent || '').replace(/[\s·.…]/g, '');
              var stillTyping = !!last.querySelector('.lb-typing');
              if (txt && !stillTyping) return;                     /* answered fine */
              console.error('[hexa watchdog ' + PATCH + '] no reply produced for: ' +
                            JSON.stringify(String(text).slice(0, 120)));
              last.innerHTML = 'Sorry — something went wrong answering that one, and I do not want to leave you ' +
                'staring at nothing. Try rewording it, or email <strong>support@lazydogtemplates.com</strong> ' +
                'and a person will pick it up.';
            } catch (e) {}
          }, 12000);
        }
      } catch (e) {}
      return r;
    };
  }

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 08:15 UTC · Opus · "USE DESIGN PD-044" NOW FINDS THE DESIGN

   THE MISMATCH, proved against live Firestore. Two different numbering
   systems were being used at the two ends of the same sentence:

     · The CARD and every product card speak the CATALOGUE CODE.
       design_widget.js emits:            "use design MK-009"
     · The COMPOSER resolves a DESIGN NUMBER. engine/server.py, the uploader
       that mints them, says so in its own comment:
           "Every kit gets a sequential design number from the SAME counter the
            composer uses — 'use design N background' then works …
            (registry: designs/{n})"

     They are NOT the same sequence:
           MK-001 -> 20     MK-005 -> 32     MK-008 -> 37
           MK-002 -> 25     MK-007 -> 35     MK-009 -> 38
           PD-001 -> 19     PD-002 -> 21     PD-011 -> 36
     So "use design MK-009" asks for GlowUp Serum and the composer cannot
     resolve it — which is exactly what was seen: ordering MK-009 produced the
     Cloud Stream kit instead. The wrong design, silently.

   THE FIX — front end only. Nothing server-side, nothing private, nothing in
   engine/ or meta_codec.py is touched. Before the sentence leaves for the
   composer, a catalogue code is translated into the design number the composer
   actually understands:
           "use design MK-009 background"  ->  "use design 38 background"
   The pair (designCode, designNo) is read from the SAME public `templates`
   collection the shop pages already read. No new permissions, no secrets.

   FAILS SAFE, deliberately: if the map has not loaded, or the code is not in
   the catalogue, the sentence is passed through COMPLETELY UNCHANGED — exactly
   today's behaviour. This can only ever turn a broken reference into a working
   one; it can never break a working sentence.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 08:15 UTC · design code -> design number';

  var CODE_TO_NO = null;      /* null = not loaded yet */
  var loading = false;

  window.hexaDesignNoMap = function () { return CODE_TO_NO; };

  function canon(code) {
    var m = String(code || '').match(/\b(PD|MK|WK|CV|KN)[\s\-_]?(\d{1,3})\b/i);
    return m ? (m[1].toUpperCase() + '-' + ('00' + m[2]).slice(-3)) : null;
  }

  window.hexaLoadDesignNumbers = function () {
    if (CODE_TO_NO || loading) return;
    loading = true;
    (async function () {
      try {
        var A = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
        var F = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
        var app = A.getApps().length ? A.getApp() : A.initializeApp({
          apiKey: "AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
          authDomain: "auth.lazydogtemplates.com",
          projectId: "templatehub-16cd7"
        });
        var db = F.getFirestore(app);
        var snap = await F.getDocs(F.query(
          F.collection(db, 'templates'), F.where('status', '==', 'approved'), F.limit(300)));
        var map = {};
        snap.forEach(function (d) {
          var v = d.data() || {}, t = v.template || {};
          var c = canon(v.designCode);
          var n = (v.designNo != null) ? v.designNo : t.designNo;
          if (c && n != null && !isNaN(parseInt(n, 10))) map[c] = parseInt(n, 10);
        });
        CODE_TO_NO = map;
        try { console.log('[hexa] design-number map loaded: ' + Object.keys(map).length + ' codes'); } catch (e) {}
      } catch (err) {
        CODE_TO_NO = null;   /* stay unloaded -> sentences pass through untouched */
        console.warn('[hexa] design-number map unavailable — "use design PD-044" will be sent as typed:', err && err.message);
      } finally { loading = false; }
    })();
  };

  /* Translate every catalogue code in a sentence into its design number. */
  window.hexaResolveDesignCodes = function (sentence) {
    var s = String(sentence == null ? '' : sentence);
    if (!CODE_TO_NO) return s;                       /* not loaded — untouched */
    return s.replace(/\b(PD|MK|WK|CV|KN)[\s\-_]?(\d{1,3})\b/gi, function (whole, pre, num) {
      var c = pre.toUpperCase() + '-' + ('00' + num).slice(-3);
      var n = CODE_TO_NO[c];
      return (n == null) ? whole : String(n);        /* unknown code — untouched */
    });
  };

  var _prevDesign = window.hexaDesign;
  window.hexaDesign = function (text) {
    var out = _prevDesign ? _prevDesign.apply(this, arguments) : null;
    try {
      if (out && out.target && CODE_TO_NO) {
        var i = out.target.indexOf('compose=');
        if (i > -1) {
          var seed = decodeURIComponent(out.target.slice(i + 8));
          var fixed = window.hexaResolveDesignCodes(seed);
          if (fixed !== seed) {
            out = Object.assign({}, out, { target: out.target.slice(0, i + 8) + encodeURIComponent(fixed) });
            try { console.log('[' + PATCH + '] "' + seed + '"  ->  "' + fixed + '"'); } catch (e) {}
          }
        }
      }
    } catch (e) { /* any trouble: the original target stands */ }
    return out;
  };

  /* Warm the map where a code can actually be typed, and on first chat use. */
  var tries = 0;
  var t = setInterval(function () {
    tries++;
    if (document.getElementById('dw_ref') || document.getElementById('helpbotInput')) {
      window.hexaLoadDesignNumbers();
      clearInterval(t);
    } else if (tries > 150) clearInterval(t);
  }, 200);

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-08 10:05 UTC · Opus · SPEAK THE COMPOSER'S GRAMMAR

   Read out of bridge/composer_service/orders.js (the private order grammar —
   NOT modified, NOT deployed, only read). Two exact rules explain why colour
   never reached a deck:

   1. BACKGROUND. The parser only sets a background colour when a colour word
      sits IMMEDIATELY before the word background/bg/theme/base:
          var isBg = new RegExp('\\b'+c+'\\s*(bg|background|theme|base)\\b')
          ...
          order.palette.bg = bg || '#101014';        <- the default we always saw
      The card emits "…, blue, gradient background, …". "blue" is followed by
      "gradient", so isBg is false and the background falls to the default on
      every single order. When the BACKGROUND field itself names a colour
      ("dark", "light") it already works — it is the treatment words
      (gradient, solid, photo, mesh…) that carry no colour and leave it unset.

   2. COLOUR VOCABULARY. orders.js knows exactly 20 colour words. The card
      offers 35. Burgundy, charcoal, coral, cyan, lavender, lime, olive,
      silver, terracotta, yellow and beige are not in the parser's table, so
      choosing them did nothing at all — not even an accent.

   WHAT THIS BLOCK DOES — rewrites the ORDER SENTENCE only, on its way out.
   The composer, orders.js and the design card are all untouched.
     · a colourless "<treatment> background" is given the colour the visitor
       actually chose:      "blue, gradient background" -> "blue background"
     · colours the parser cannot read are mapped to their nearest known one:
       burgundy->maroon, cyan->teal, yellow->gold, charcoal->grey, and so on
     · "use design 38" with no part named becomes "use design 38 style", which
       server.js line 351 treats as the WHOLE palette rather than background
       only — that is what "build me one from that design" should mean

   RULES IT KEEPS: the more specific field always wins. If BACKGROUND already
   names a colour, that colour stays the background and the colour family
   stays the accent. If the visitor left BACKGROUND blank, nothing is invented
   — their colour remains an accent exactly as today.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-08 10:05 UTC · composer grammar';

  /* the 20 words orders.js actually understands — kept verbatim, in its order */
  var KNOWN = ['black','dark','navy','blue','white','light','cream','grey','gray',
               'green','teal','purple','violet','red','maroon','gold','golden',
               'orange','pink','brown'];
  var IS_KNOWN = {};
  KNOWN.forEach(function (c) { IS_KNOWN[c] = 1; });

  /* card colours the parser has never heard of -> nearest word it does know */
  var NEAREST = {
    burgundy:'maroon', charcoal:'grey', coral:'orange', cyan:'teal',
    lavender:'purple', lime:'green', olive:'green', silver:'grey',
    terracotta:'brown', yellow:'gold', beige:'cream', monochrome:'grey',
    neutral:'grey', pastel:'cream', 'earth tones':'brown', 'warm tones':'orange',
    'cool tones':'teal', neon:'purple', multicolor:'blue', multicolour:'blue'
  };

  /* treatment words the card offers for BACKGROUND that carry no colour */
  var TREATMENT = ('gradient|mesh gradient|solid|photo|geometric|textured|pattern|abstract|' +
                   'blurred|bokeh|duotone|framed|grid|illustration|organic|paper|metallic|' +
                   'glassmorphism|3d|transparent|watercolour|watercolor|split screen|' +
                   'colour block|color block|full bleed image|full-bleed image');

  function normaliseForComposer(sentence) {
    var s = String(sentence == null ? '' : sentence);
    if (!s) return s;

    /* 1. unknown colour -> nearest known one (word-boundary, case-insensitive) */
    Object.keys(NEAREST).forEach(function (word) {
      var rx = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      if (rx.test(s)) s = s.replace(rx, NEAREST[word]);
    });

    /* 2. a colourless "<treatment> background" takes the chosen colour.
          Only fires when the visitor actually picked a colour; never invents one. */
    var treatRx = new RegExp('\\b(' + TREATMENT + ')\\s+(background|bg|theme|base)\\b', 'i');
    var tm = s.match(treatRx);
    if (tm) {
      var alreadyColoured = new RegExp('\\b(' + KNOWN.join('|') + ')\\s+(background|bg|theme|base)\\b', 'i').test(s);
      if (!alreadyColoured) {
        var cm = s.match(new RegExp('\\b(' + KNOWN.join('|') + ')\\b', 'i'));
        if (cm) s = s.replace(treatRx, cm[1].toLowerCase() + ' ' + tm[2]);
      }
    }

    /* 3. "use design 38"  ->  "use design 38 style"  (whole palette, not just bg) */
    s = s.replace(/\buse\s+design\s+(\d{1,5})\b(?!\s*(background|bg|palette|colou?rs?|style|look|layout))/gi,
                  'use design $1 style');

    return s;
  }
  window.hexaNormaliseOrder = normaliseForComposer;

  var _prevDesign = window.hexaDesign;
  window.hexaDesign = function (text) {
    var out = _prevDesign ? _prevDesign.apply(this, arguments) : null;
    try {
      if (out && out.target) {
        var i = out.target.indexOf('compose=');
        if (i > -1) {
          var seed  = decodeURIComponent(out.target.slice(i + 8));
          var fixed = normaliseForComposer(seed);
          if (fixed !== seed) {
            out = Object.assign({}, out, { target: out.target.slice(0, i + 8) + encodeURIComponent(fixed) });
            try { console.log('[' + PATCH + ']\n   was: ' + seed + '\n   now: ' + fixed); } catch (e) {}
          }
        }
      }
    } catch (e) { /* anything unexpected: the original order stands untouched */ }
    return out;
  };

  try { console.log('[chat_brain patch] ' + PATCH + ' installed'); } catch (e) {}
})();
