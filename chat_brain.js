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
    { match: ["how are you","how r u","how are u","how are ya","how you doing","how ya doing","hows it going","how is it going","how do you do","how have you been","hru"], reply: "I'm doing great, thanks for asking \ud83d\ude0a How are you? And what can I help you find today \u2014 a pitch deck, media kit, or web kit?", soft: true },
    { match: ["hello","hi hexa","hey hexa","hey there"], reply: "Hey! \ud83d\udc4b I'm Hexa. Want help finding a pitch deck, media kit, or web kit?" , soft: true},
    { match: ["thank you","thanks","thankyou","thx"], reply: "Anytime! \ud83d\udc9b Anything else I can help you find?" , soft: true},
    { match: ["are you human","are you a robot","are you real","are you ai","are you a bot"], reply: "I'm Hexa — LazyDog's assistant. Real enough to genuinely help you with templates \ud83d\ude0a" , soft: true},
    { match: ["who made you","who created you","who built you"], reply: "I'm Hexa, built for LazyDog Templates to help you find, buy, and use the right design." , soft: true},
    { match: ["what can you do","how can you help","what do you do"], reply: "I help you find templates, explain pricing & licenses, open pages, switch language, and answer questions — just ask or tap the \ud83c\udfa4 mic." , soft: true},

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
    ['recommend', ['recommend','suggest','suggestion','best for','which should','what should i','help me choose','ideal for','right one','good for']],
    ['availability',['do you have','have you got','got any','is there','are there','available','availability','any chance','looking for','need a','need an','want a','want an']],
    ['browse',    ['open','show','see','view','browse','find','explore','list','take me','go to']]
  ];

  // WHAT THEY ARE TALKING ABOUT. `page` gives the Open button a destination.
  var NOUNS = [
    ['social kit',  ['social media kit','social kit','instagram kit','instagram template','story template','reels kit','social pack','linkedin kit'], 'social_kits.html'],
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
    Object.keys(QUALS).forEach(function (k) {
      for (var i = 0; i < QUALS[k].length; i++) {
        if (pad.indexOf(' ' + QUALS[k][i] + ' ') !== -1) { out[k] = QUALS[k][i]; break; }
      }
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

  function hexaComposeIntent(text, strongOnly) {
    var t = norm(text);
    if (!t || t.split(' ').length > 30) return null;
    var verb = findVerb(t);
    var noun = findNoun(t);
    var q = findQuals(t);
    // needs at least a verb, plus something to act on
    if (!verb) return null;
    if (strongOnly && !STRONG[verb]) return null;
    if (!strongOnly && STRONG[verb]) return null;
    if (!noun && !Object.keys(q).length
        && verb !== 'support' && verb !== 'compare' && verb !== 'license') return null;
    var a = composeAnswer(verb, noun, q);
    if (!a) return null;
    if (a.target) { a.label = labelForUrl(a.target); }
    return a;
  }
  window.hexaComposeIntent = hexaComposeIntent;


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
    home:        { url: 'main.html',                       label: 'Go to Store Hub' },
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
        || /\bpublish\b.*\bdecks?\b/.test(t) || /\bdecks?\b.*\bgo live\b/.test(t);
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
      // prepare today's decks
      var r2 = await fetch(GATE_URL + '/daily_batch', { method: 'POST', headers: H, body: '{}' });
      var d2 = await r2.json();
      if (!r2.ok) return { reply: 'Batch failed: ' + (d2.error || r2.status) };
      var lines = (d2.decks || []).map(function (x) { return x.i + '. ' + x.name; });
      return { reply: "🎨 Today's " + d2.count + " decks are ready for your review:\n" + lines.join('\n')
        + "\n\nDownload links are in your review folder (Storage → review/" + d2.date + "). "
        + "When happy, tell me: \"publish all decks\" or \"publish decks 1,3,5\".",
        decks: d2.decks };
    } catch (e) { return { reply: 'Admin command error: ' + e.message }; }
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
    var material = { content: (opts.content != null ? opts.content : ''),
                     brand: opts.brand || '', deck: opts.deck || '',
                     designId: opts.designId || '', designHref: opts.designHref || '',
                     pptxFileId: opts.pptxFileId || '', pptxUrl: opts.pptxUrl || '',
                     mode: opts.mode || '' };
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
