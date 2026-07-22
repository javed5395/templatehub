// ============================================================
// VA_DICTIONARY.JS — LazyDogTemplates Voice Assistant Dictionary
// Built from: Claude (62 pairs) + ChatGPT (400 pairs) = cleaned & merged
// Answers customized specifically for LazyDogTemplates
// To add phrases: add to any 'phrases' array
// To add new topic: copy a block and fill in phrases + reply
// ============================================================

var vaDictionary = [

  // ══════════════════════════════════════════
  // SECTION 1 — NAVIGATION
  // ══════════════════════════════════════════

  {
    id: 'nav_pitch_decks',
    category: 'navigation',
    phrases: [
      'pitch deck', 'pitch decks', 'show pitch decks', 'open pitch decks',
      'i want pitch decks', 'take me to pitch decks', 'go to pitch decks',
      'show me pitch decks', 'where are pitch decks', 'see pitch decks',
      'view pitch decks', 'browse pitch decks', 'find pitch decks',
      'presentation', 'presentations', 'show presentations', 'open presentations',
      'i want a presentation', 'investor presentation', 'business presentation',
      'slides', 'slide deck', 'slide decks', 'show slides', 'open slides',
      'i want slides', 'show me slides', 'where are slides',
      'decks', 'show decks', 'open decks', 'find decks',
      'business deck', 'startup deck', 'investor deck',
      'i need a pitch deck', 'get pitch deck', 'download pitch deck',
      'show me templates', 'open templates', 'view templates',
      'are pitch deck templates available', 'do you offer presentation templates',
      'pitchdeck',
      'pitchdecks',
      'pitch dek',
      'pich deck',
      'deck template',
      'wanna see decks',
      'gimme a deck',
      'got any decks',
      'any pitch decks',
      'show me some decks',
      'need a deck for investors',
      'investor slides',
      'fundraising slides',
      'seed deck',
      'series a deck',
      'startup slides',
      'company deck',
      'sales deck',
      'board deck',
      'demo day deck'
    ],
    action: 'navigate',
    target: 'pitch_deck_folder_section.html',
    reply: 'Opening Pitch Decks for you.'
  },

  {
    id: 'nav_media_kits',
    category: 'navigation',
    phrases: [
      'media kit', 'media kits', 'show media kits', 'open media kits',
      'i want media kits', 'take me to media kits', 'go to media kits',
      'show me media kits', 'where are media kits', 'see media kits',
      'brand kit', 'brand kits', 'show brand kits', 'open brand kits',
      'press kit', 'press kits', 'podcast kit', 'podcast kits',
      'influencer kit', 'influencer kits', 'fashion kit', 'fashion kits',
      'kit', 'kits', 'show kits', 'open kits', 'find kits',
      'i need a media kit', 'get media kit', 'download media kit',
      'can i find branding kits', 'do you offer branding kits',
      'are branding kits available',
      'mediakit',
      'meda kit',
      'midia kit',
      'press pack',
      'wanna see media kits',
      'got media kits',
      'any brand kits',
      'sponsorship kit',
      'influencer media kit',
      'creator kit',
      'youtuber kit',
      'podcast media kit',
      'rate card',
      'collab kit'
    ],
    action: 'navigate',
    target: 'media_kits_folder_section.html',
    reply: 'Opening Media Kits for you.'
  },

  {
    id: 'nav_invoice',
    category: 'navigation',
    phrases: [
      'invoice', 'invoices', 'show invoice', 'open invoice',
      'i want invoice', 'take me to invoice', 'go to invoice',
      'billing', 'bill', 'bills', 'create bill', 'make bill',
      'generate invoice', 'create invoice', 'make invoice', 'new invoice',
      'invoice generator', 'bill generator', 'receipt',
      'i need an invoice', 'get invoice', 'do you offer invoice templates',
      'are invoice templates available', 'invoice template',
      'invioce',
      'invocie',
      'inovice',
      'invoce',
      'recipt',
      'reciept',
      'make me an invoice',
      'need to bill a client',
      'billing tool',
      'create a bill',
      'free invoice tool',
      'invoice maker',
      'bill maker'
    ],
    action: 'navigate',
    target: 'invoice.html',
    reply: 'Opening Invoice Generator.'
  },

  {
    id: 'nav_home',
    category: 'navigation',
    phrases: [
      'home', 'go home', 'take me home', 'go to home',
      'main page', 'go to main page', 'open main page',
      'homepage', 'go to homepage', 'back to home', 'return home',
      'haidee', 'hey haidee', 'hi haidee', 'haidee home',
      'start', 'front page', 'landing page', 'main',
      'take me to the home page', 'i want to go home', 'go back home',
      'home page',
      'start page'
    ],
    action: 'navigate',
    target: 'main.html',
    reply: 'Taking you to the home page.'
  },

  // ══════════════════════════════════════════
  // SECTION 2 — GREETINGS
  // ══════════════════════════════════════════

  {
    id: 'greeting',
    category: 'greeting',
    phrases: [
      'hello', 'hi', 'hey', 'hey there', 'hello there',
      'good morning', 'good afternoon', 'good evening', 'good day',
      'howdy', 'greetings', 'what is up', 'whats up',
      'anyone there', 'are you there', 'is anyone there',
      'yo',
      'yo there',
      'sup',
      'heyy',
      'hii',
      'helo',
      'hlo',
      'hey buddy'
    ],
    action: 'speak',
    reply: 'Hello! Welcome to LazyDogTemplates. I can help you find pitch decks, media kits, or invoices. What are you looking for?'
  },

  // ══════════════════════════════════════════
  // SECTION 3 — IDENTITY
  // ══════════════════════════════════════════

  {
    id: 'identity_assistant',
    category: 'identity',
    phrases: [
      'who are you', 'what are you', 'are you a robot', 'are you human',
      'what is your name', "what's your name", 'whats your name',
      'who am i talking to', 'what do i call you', 'your name',
      'tell me your name', 'are you an ai', 'are you a bot', 'who is haidee',
      'who r u',
      'who are u',
      'ur name',
      'whats your name'
    ],
    action: 'speak',
    reply: 'I am Haidee, your voice assistant on LazyDogTemplates. I can help you navigate, find templates, and answer your questions.'
  },

  {
    id: 'identity_site',
    category: 'identity',
    phrases: [
      'what is this', 'what is this site', 'what is this website',
      'what is this platform', 'tell me about this site',
      'explain this site', 'about this website', 'what is lazydog templates',
      'about lazydog templates', 'tell me about lazydog templates',
      'what kind of platform is this', 'describe this site',
      'what do you have', 'what can i find here', 'what is available',
      'what do you offer', 'what is on this site',
      'what do you guys do'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates is a template marketplace with professional pitch decks, brand media kits and web kits. Each design is a one-time purchase with its price shown on its page. Browsing is free, and the invoice generator is free to use.'
  },

  {
    id: 'identity_different',
    category: 'identity',
    phrases: [
      'what makes this different', 'what makes this marketplace different',
      'why use this site', 'why lazydog templates', 'what is special about this'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates offers high-quality, professionally designed templates. Each is a one-time purchase — no subscription — with Personal and Commercial pricing on its own page. Browsing is free and the invoice tool is free too.'
  },

  {
    id: 'identity_who_for',
    category: 'identity',
    phrases: [
      'who is this for', 'who are these templates for', 'who can use this',
      'who uses this platform', 'is this for beginners',
      'can anyone use this', 'what kind of users'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates is for everyone — startups, freelancers, businesses, students, designers, and creators who need professional templates quickly.'
  },

  {
    id: 'identity_safe',
    category: 'identity',
    phrases: [
      'is this site safe', 'is it safe', 'is my data safe',
      'is this secure', 'can i trust this site', 'is it legit'
    ],
    action: 'speak',
    reply: 'Yes, LazyDogTemplates is completely safe. We use secure systems and do not store sensitive personal data. Browsing and downloading are safe.'
  },

  // ══════════════════════════════════════════
  // SECTION 4 — WHAT IS AVAILABLE
  // ══════════════════════════════════════════

  {
    id: 'available_categories',
    category: 'availability',
    phrases: [
      'what categories do you have', 'what types of templates',
      'what template types', 'what can i download',
      'what templates do you have', 'what kind of templates',
      'what do you offer', 'what types are available',
      'list your templates', 'show me categories',
      'catagories',
      'categorys',
      'categores',
      'show all categories',
      'full list',
      'everything you have'
    ],
    action: 'speak',
    reply: 'We currently have pitch decks, brand media kits, and invoices. Social media templates and resumes are coming soon.'
  },

  {
    id: 'available_industries',
    category: 'availability',
    phrases: [
      'what industries', 'which industries do you cover',
      'are templates industry specific', 'do you have industry templates',
      'which sectors', 'what fields are covered'
    ],
    action: 'speak',
    reply: 'We cover over 20 industries including tech, healthcare, finance, construction, fashion, corporate, media, education, and many more.'
  },

  {
    id: 'available_how_many',
    category: 'availability',
    phrases: [
      'how many templates', 'how many do you have',
      'total templates', 'number of templates'
    ],
    action: 'speak',
    reply: 'We have dozens of templates across multiple categories and industries, with new ones added regularly.'
  },

  {
    id: 'available_resume',
    category: 'availability',
    phrases: [
      'do you have resume templates', 'resume templates',
      'cv templates', 'do you offer resumes', 'where are resumes'
    ],
    action: 'speak',
    reply: 'Resume templates are coming soon. Currently we have pitch decks, media kits, and invoices available.'
  },

  {
    id: 'available_social',
    category: 'availability',
    phrases: [
      'social media templates', 'do you have social media templates',
      'instagram templates', 'facebook templates',
      'are social media templates available'
    ],
    action: 'speak',
    reply: 'Social media templates are coming soon. Check back regularly for new additions.'
  },

  {
    id: 'available_updates',
    category: 'availability',
    phrases: [
      'do you add new templates', 'how often are templates added',
      'do you update templates', 'are new templates added',
      'when will you add more', 'new templates'
    ],
    action: 'speak',
    reply: 'Yes, new templates are added regularly. Check back often for the latest additions.'
  },

  {
    id: 'available_preview',
    category: 'availability',
    phrases: [
      'can i preview templates', 'can i see templates before download',
      'preview available', 'can i look before downloading',
      'is preview available', 'show me before download',
      'can i see first',
      'sample please',
      'demo please'
    ],
    action: 'speak',
    reply: 'Yes, you can preview all templates before downloading. Click on any template to see a full slide preview.'
  },

  // ══════════════════════════════════════════
  // SECTION 5 — PRICING
  // ══════════════════════════════════════════

  {
    id: 'pricing_free',
    category: 'pricing',
    phrases: [
      'is it free', 'are these free', 'are all templates free',
      'is this free', 'is download free', 'can i download for free',
      'do i have to pay', 'is there a charge', 'any cost', 'price',
      'pricing', 'how much does it cost', 'what is the price',
      'are there hidden charges', 'hidden fees', 'is it paid',
      'do i need to pay', 'is there a fee',
      'how much dis',
      'how much is it',
      'whats the damage',
      'prise',
      'pirce',
      'pricee',
      'coast',
      'how mch',
      'whats it cost',
      'what does it cost',
      'ballpark',
      'price range'
    ],
    action: 'speak',
    reply: 'Browsing is free and the invoice generator is free. The design templates are paid — each is a one-time purchase with its Personal and Commercial price shown on its page. There is no subscription.'
  },

  {
    id: 'pricing_subscription',
    category: 'pricing',
    phrases: [
      'is there a subscription', 'do i need subscription',
      'monthly plan', 'yearly plan', 'do you offer subscriptions',
      'subscription plan', 'paid plan',
      'recurring charge',
      'auto renew',
      'monthly fee',
      'yearly fee'
    ],
    action: 'speak',
    reply: 'No subscription — templates are a one-time purchase. You pay once for a design and it is yours to download. The invoice tool is free.'
  },

  {
    id: 'pricing_credit_card',
    category: 'pricing',
    phrases: [
      'do i need a credit card', 'credit card required',
      'payment method', 'what payment methods', 'do you accept paypal',
      'debit card',
      'apple pay',
      'google pay',
      'bank transfer',
      'wire transfer'
    ],
    action: 'speak',
    reply: 'You only pay when you buy a template — a one-time charge shown on its page. Browsing and the invoice generator are free, and checkout uses a secure payment provider.'
  },

  // ══════════════════════════════════════════
  // SECTION 6 — ACCOUNT
  // ══════════════════════════════════════════

  {
    id: 'account_needed',
    category: 'account',
    phrases: [
      'do i need an account', 'do i need to sign up',
      'account required', 'do i need to register',
      'do i need to create account', 'can i use without account',
      'can i browse without account', 'is account creation free',
      'without an account',
      'guest checkout',
      'do i have to register'
    ],
    action: 'speak',
    reply: 'No account needed to browse. To download, just enter your email address — no full signup required.'
  },

  {
    id: 'account_signup',
    category: 'account',
    phrases: [
      'how do i create account', 'how to sign up', 'how to register',
      'how to make account', 'sign up', 'create account',
      'signin',
      'sing up',
      'signup',
      'how do i register',
      'create an account'
    ],
    action: 'speak',
    reply: 'Click Sign Up in the top right corner. You can register with your email or sign in with Google instantly.'
  },

  {
    id: 'account_google',
    category: 'account',
    phrases: [
      'can i sign up with google', 'google login', 'google sign in',
      'login with google', 'sign in with google'
    ],
    action: 'speak',
    reply: 'Yes, Google sign-in is supported. Click Sign In and choose Continue with Google.'
  },

  {
    id: 'account_password',
    category: 'account',
    phrases: [
      'forgot password', 'reset password', 'i forgot my password',
      'how to reset password', 'cant login', 'password reset',
      'forgot pass',
      'cannot log in',
      'reset my password',
      'locked out'
    ],
    action: 'speak',
    reply: 'Click Sign In, then click Forgot Password. Enter your email and we will send a reset link.'
  },

  {
    id: 'account_delete',
    category: 'account',
    phrases: [
      'delete account', 'can i delete my account', 'remove account',
      'how to delete account', 'close account'
    ],
    action: 'speak',
    reply: 'Yes, you can delete your account from account settings. Note that deleted accounts cannot be restored.'
  },

  // ══════════════════════════════════════════
  // SECTION 7 — DOWNLOADING
  // ══════════════════════════════════════════

  {
    id: 'download_how',
    category: 'download',
    phrases: [
      'how do i download', 'how to download', 'how can i download',
      'download process', 'steps to download', 'how does download work',
      'how do i get templates', 'how to get a template',
      'donwload',
      'downlaod',
      'downlod',
      'dowload',
      'how do i get it',
      'how to get the file',
      'what happens after payment',
      'after i pay',
      'once i pay'
    ],
    action: 'speak',
    reply: 'Browse templates, open one you like, choose Personal or Commercial, check out, and the download is instant and saved to your account. The invoice generator is free to use.'
  },

  {
    id: 'download_where',
    category: 'download',
    phrases: [
      'where do downloads go', 'where are my downloads',
      'where is the downloaded file', 'download location',
      'how long does download take', 'are downloads instant',
      'cant find download',
      'where did it go',
      'wheres my file',
      'missing download'
    ],
    action: 'speak',
    reply: 'Downloads save to your device downloads folder and are instant — usually just a few seconds.'
  },

  {
    id: 'download_formats',
    category: 'download',
    phrases: [
      'what file formats', 'what formats available', 'what format will i get',
      'pptx format', 'pdf format', 'png format',
      'what software do i need', 'do i need special software',
      'what file types',
      'which format',
      'file type',
      'ppt or pptx',
      'is it pptx',
      'psd included',
      'ai file',
      'figma file',
      'source file',
      'fonts included',
      'editable file'
    ],
    action: 'speak',
    reply: 'Templates are available in PPTX for editing in PowerPoint, PDF for sharing, and PNG image files for previewing.'
  },

  {
    id: 'download_mobile',
    category: 'download',
    phrases: [
      'can i download on mobile', 'mobile download',
      'download on phone', 'works on mobile'
    ],
    action: 'speak',
    reply: 'Yes, you can browse and download templates on mobile devices.'
  },

  {
    id: 'download_redownload',
    category: 'download',
    phrases: [
      'can i redownload', 're-download', 'download again',
      'download multiple times', 'can i get it again',
      'lost my file',
      'download it again',
      'get it again',
      'second download'
    ],
    action: 'speak',
    reply: 'Yes, you can download templates as many times as you need. Downloads do not expire.'
  },

  {
    id: 'download_offline',
    category: 'download',
    phrases: [
      'do templates work offline', 'offline use',
      'do i need internet after download', 'work without internet'
    ],
    action: 'speak',
    reply: 'Once downloaded, templates work completely offline. Internet is only needed for the initial download.'
  },

  {
    id: 'download_issue',
    category: 'download',
    phrases: [
      'why is download not working', 'download not starting',
      'download failed', 'cant download', 'problem downloading',
      'download error', 'why cant i download'
    ],
    action: 'speak',
    reply: 'Please check your internet connection. If the problem continues, try a different browser or contact our support team.'
  },

  // ══════════════════════════════════════════
  // SECTION 8 — USAGE & EDITING
  // ══════════════════════════════════════════

  {
    id: 'usage_edit',
    category: 'usage',
    phrases: [
      'how do i edit', 'can i edit templates', 'how to customize',
      'are templates editable', 'can i change content',
      'how to modify template', 'edit after download',
      'can i edit this',
      'fully editable',
      'change the text',
      'change the colours',
      'change the colors',
      'swap the images',
      'add my logo'
    ],
    action: 'speak',
    reply: 'Download the PPTX file and open it in Microsoft PowerPoint or Google Slides. All text, colors, and images are fully editable.'
  },

  {
    id: 'usage_skills',
    category: 'usage',
    phrases: [
      'do i need design skills', 'do i need skills',
      'is it easy to use', 'for beginners', 'beginner friendly',
      'can anyone use it', 'no experience needed'
    ],
    action: 'speak',
    reply: 'No design skills needed. Templates are beginner-friendly and ready to use. Just replace the text with your own content.'
  },

  {
    id: 'usage_canva',
    category: 'usage',
    phrases: [
      'can i use in canva', 'canva compatible', 'edit in canva',
      'open in canva', 'works with canva',
      'import to canva'
    ],
    action: 'speak',
    reply: 'Yes, some templates include a Canva link. Look for the Open in Canva button on the template page.'
  },

  {
    id: 'usage_google_slides',
    category: 'usage',
    phrases: [
      'works with google slides', 'google slides compatible',
      'can i use in google slides', 'open in google slides',
      'gslides',
      'google slide',
      'works in google slides'
    ],
    action: 'speak',
    reply: 'Yes. Download the PPTX file and import it into Google Slides — it works perfectly.'
  },

  {
    id: 'usage_commercial',
    category: 'usage',
    phrases: [
      'can i use commercially', 'commercial use', 'use for business',
      'use for clients', 'can i use for my business',
      'commercial license', 'is commercial use allowed',
      'client work',
      'freelance use',
      'can i use for clients',
      'for my company',
      'business use'
    ],
    action: 'speak',
    reply: 'Yes, templates can be used for commercial and business projects. Check the individual template page for full license details.'
  },

  {
    id: 'usage_resell',
    category: 'usage',
    phrases: [
      'can i resell templates', 'sell templates', 'resell',
      'can i redistribute', 'share with others',
      'can i sell this',
      'share with a friend',
      'give it to someone',
      'redistribute'
    ],
    action: 'speak',
    reply: 'No, templates cannot be resold or redistributed. They are for your personal or business use only.'
  },

  {
    id: 'usage_customize',
    category: 'usage',
    phrases: [
      'can i change colors', 'change fonts', 'change layout',
      'add my logo', 'customize branding', 'remove branding',
      'can i add my own content', 'replace placeholder text'
    ],
    action: 'speak',
    reply: 'Yes, everything is customizable — colors, fonts, layouts, images, and text. Add your own logo and branding easily.'
  },

  // ══════════════════════════════════════════
  // SECTION 9 — PITCH DECKS SPECIFIC
  // ══════════════════════════════════════════

  {
    id: 'pitchdeck_slides',
    category: 'pitchdeck',
    phrases: [
      'how many slides', 'how many slides in pitch deck',
      'number of slides', 'slides included'
    ],
    action: 'speak',
    reply: 'Most pitch decks have 10 to 15 slides covering cover, problem, solution, market size, business model, traction, team, and financials.'
  },

  {
    id: 'pitchdeck_investors',
    category: 'pitchdeck',
    phrases: [
      'can i use for investors', 'investor pitch', 'fundraising deck',
      'startup pitch', 'are they investor ready'
    ],
    action: 'speak',
    reply: 'Yes. All pitch decks are designed to professional investor standards with all the key sections investors expect.'
  },

  // ══════════════════════════════════════════
  // SECTION 10 — MEDIA KITS SPECIFIC
  // ══════════════════════════════════════════

  {
    id: 'mediakit_what',
    category: 'mediakit',
    phrases: [
      'what is a media kit', 'what is in a media kit',
      'what does media kit include', 'media kit contents'
    ],
    action: 'speak',
    reply: 'A media kit includes your brand overview, audience stats, services, rates, and contact information. Used for brand partnerships and PR.'
  },

  {
    id: 'mediakit_who',
    category: 'mediakit',
    phrases: [
      'who needs a media kit', 'who uses media kits',
      'do i need a media kit', 'why do i need media kit'
    ],
    action: 'speak',
    reply: 'Influencers, podcasters, brands, and PR professionals use media kits to attract sponsors and partnerships.'
  },

  {
    id: 'mediakit_pages',
    category: 'mediakit',
    phrases: [
      'how many pages is media kit', 'media kit length',
      'pages in media kit', 'how long is media kit'
    ],
    action: 'speak',
    reply: 'Our media kits range from 9 to 13 pages depending on the kit style and category.'
  },

  // ══════════════════════════════════════════
  // SECTION 11 — INVOICE SPECIFIC
  // ══════════════════════════════════════════

  {
    id: 'invoice_types',
    category: 'invoice',
    phrases: [
      'what types of invoices', 'invoice types', 'invoice styles',
      'what invoices do you have'
    ],
    action: 'speak',
    reply: 'Our invoice generator covers multiple industries including freelancer, corporate, creative, and service-based businesses.'
  },

  {
    id: 'invoice_pdf',
    category: 'invoice',
    phrases: [
      'can i download invoice as pdf', 'invoice pdf',
      'save invoice as pdf', 'export invoice'
    ],
    action: 'speak',
    reply: 'Yes. All invoices can be downloaded as professional PDF files instantly.'
  },

  // ══════════════════════════════════════════
  // SECTION 12 — SUPPORT
  // ══════════════════════════════════════════

  {
    id: 'support_contact',
    category: 'support',
    phrases: [
      'how do i contact', 'contact support', 'how to contact',
      'customer support', 'help center', 'get help',
      'who do i contact', 'contact us', 'support email',
      'contact you',
      'your email',
      'talk to someone',
      'speak to a human',
      'customer service'
    ],
    action: 'speak',
    reply: 'You can reach us through the contact form on our website. We respond within 24 to 48 hours.'
  },

  {
    id: 'support_problem',
    category: 'support',
    phrases: [
      'i have a problem', 'something is not working', 'site not working',
      'found a bug', 'report a problem', 'page not loading',
      'template is broken', 'broken file', 'missing file',
      'not working',
      'something is wrong',
      'its broken',
      'having trouble',
      'an error'
    ],
    action: 'speak',
    reply: 'Please try refreshing the page first. If the problem continues, contact our support team and we will resolve it quickly.'
  },

  {
    id: 'support_suggest',
    category: 'support',
    phrases: [
      'can i suggest a template', 'request a template',
      'suggest new template', 'custom template', 'template request',
      'can i request custom design'
    ],
    action: 'speak',
    reply: 'Yes! We love suggestions. Use the contact form to suggest new templates or categories you would like to see.'
  },

  // ══════════════════════════════════════════
  // SECTION 13 — TECHNICAL
  // ══════════════════════════════════════════

  {
    id: 'technical_software',
    category: 'technical',
    phrases: [
      'what software do i need', 'software required', 'which app to use',
      'do i need microsoft office', 'do i need powerpoint',
      'can i open without powerpoint',
      'what software do i need to open',
      'need ms office'
    ],
    action: 'speak',
    reply: 'You need Microsoft PowerPoint, Google Slides, or Canva to edit PPTX files. PDF files open in any PDF viewer. No special software needed for PNG files.'
  },

  {
    id: 'technical_mac_windows',
    category: 'technical',
    phrases: [
      'does it work on mac', 'does it work on windows',
      'compatible with mac', 'compatible with windows',
      'mac and windows'
    ],
    action: 'speak',
    reply: 'Yes, all templates work on both Mac and Windows.'
  },

  {
    id: 'technical_mobile_app',
    category: 'technical',
    phrases: [
      'is there a mobile app', 'android app', 'ios app',
      'app download', 'phone app', 'smartphone app',
      'is there an app',
      'works on phone',
      'mobile friendly'
    ],
    action: 'speak',
    reply: 'No mobile app yet. The website works on mobile browsers, so you can browse and download from your phone.'
  },

  {
    id: 'technical_browsers',
    category: 'technical',
    phrases: [
      'which browsers', 'browser compatibility', 'what browser to use',
      'works on chrome', 'works on firefox', 'works on safari'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates works on all modern browsers including Chrome, Firefox, Safari, and Edge.'
  },

  // ══════════════════════════════════════════
  // SECTION 14 — VOICE ASSISTANT
  // ══════════════════════════════════════════

  {
    id: 'va_howto',
    category: 'assistant',
    phrases: [
      'how do i use you', 'how do i use voice', 'how does this work',
      'how to use voice assistant', 'what should i say',
      'how do i talk to you', 'voice assistant guide'
    ],
    action: 'speak',
    reply: 'Just speak naturally after pressing the mic button. Say things like pitch decks, media kits, invoice, or ask me any question about the site.'
  },

  {
    id: 'va_language',
    category: 'assistant',
    phrases: [
      'what language', 'do you understand urdu', 'do you speak other languages',
      'only english', 'can you understand other languages'
    ],
    action: 'speak',
    reply: 'I currently understand English only. More languages are coming in future updates.'
  },

  {
    id: 'help',
    category: 'assistant',
    phrases: [
      'help', 'i need help', 'can you help', 'help me',
      'what can you do', 'what commands', 'what can i say',
      'voice commands', 'list commands', 'instructions',
      'can u help',
      'plz help',
      'need a hand',
      'give me a hand'
    ],
    action: 'speak',
    reply: 'You can say: pitch decks, media kits, invoice, or go home to navigate. Ask anything about the site and I will answer. Say stop mic to turn me off.'
  },

  // ══════════════════════════════════════════
  // SECTION 15 — STOP & VOICE GENDER
  // ══════════════════════════════════════════

  {
    id: 'stop',
    category: 'control',
    phrases: [
      'stop', 'stop mic', 'turn off', 'turn off mic', 'close mic',
      'put off', 'put off mic', 'switch off', 'switch off mic',
      'off', 'mic off', 'disable mic', 'stop listening',
      'quiet', 'silence', 'enough', 'goodbye', 'bye', 'bye haidee',
      'that is all', 'thats all', 'i am done', 'done', 'close'
    ],
    action: 'stop',
    reply: 'Voice assistant off. Goodbye!'
  },

  {
    id: 'female_voice',
    category: 'control',
    phrases: [
      'female voice', 'woman voice', 'lady voice', 'girl voice',
      'switch to female', 'change to female', 'use female voice', 'female please'
    ],
    action: 'gender',
    gender: 'female',
    reply: 'Switched to female voice.'
  },

  {
    id: 'male_voice',
    category: 'control',
    phrases: [
      'male voice', 'man voice', 'guy voice',
      'switch to male', 'change to male', 'use male voice', 'male please'
    ],
    action: 'gender',
    gender: 'male',
    reply: 'Switched to male voice.'
  },


  // ══════════════════════════════════════════
  // ADDED (Opus, Jul 2026) — more coverage: nav + Q&A + Urdu-English
  // ══════════════════════════════════════════

  {
    id: 'nav_web_kits',
    category: 'navigation',
    phrases: [
      'web kit','web kits','website kit','website kits','landing page','landing pages',
      'web template','website template','ui kit','ui kits','web design','site template',
      'show web kits','open web kits','go to web kits','i want a web kit','need a landing page',
      'web ui','webpage template','website ui','web kit template','webkit','web-kit'
    ],
    action: 'navigate',
    target: 'web_kit_folder_file.html',
    reply: 'Opening Web Kits for you.'
  },

  {
    id: 'nav_career_docs',
    category: 'navigation',
    phrases: [
      'resume','resumes','cv','curriculum vitae','cover letter','cover letters','career docs',
      'career documents','resume template','cv template','job application','linkedin template',
      'portfolio template','reference letter','recommendation letter','resignation letter',
      'show resumes','open resume','i need a resume','need a cv','ats resume','job docs'
    ],
    action: 'navigate',
    target: 'career_docs_folder_section.html',
    reply: 'Opening Career Docs — resumes, cover letters and more.'
  },

  {
    id: 'nav_digital_keynote',
    category: 'navigation',
    phrases: [
      'keynote','digital keynote','keynotes','keynote template','event keynote','talk slides',
      'conference deck','webinar deck','seminar slides','show keynotes','open keynote',
      'i want a keynote','presentation keynote','digital keynotes'
    ],
    action: 'navigate',
    target: 'digital_keynote-folder.html',
    reply: 'Opening Digital Keynotes for you.'
  },

  {
    id: 'q_editable',
    category: 'usage',
    phrases: [
      'is it editable','can i edit','can i edit it','fully editable','are they editable',
      'edit the template','change the text','edit text','can i change it','customisable','customizable','can i customize','can i customise',
      'editable file','is it editable file'
    ],
    action: 'speak',
    reply: 'Yes — every text box, colour, shape and image placeholder is fully editable. Nothing is flattened into a picture. Open the pptx in PowerPoint, Google Slides or Keynote and change whatever you like.'
  },

  {
    id: 'q_formats',
    category: 'download',
    phrases: [
      'what format','which format','file format','what do i get','what is included','file type',
      'what type of file','is it pptx','do i get pptx','ppt or pdf',
      'what files','which files','format of file'
    ],
    action: 'speak',
    reply: 'You get an editable pptx that works in PowerPoint, Google Slides and Keynote, plus a PDF preview. Fonts are free Google Fonts listed in the readme, and images are placeholders you swap for your own.'
  },

  {
    id: 'q_powerpoint',
    category: 'usage',
    phrases: [
      'open in powerpoint','works in powerpoint','powerpoint version','does it work in powerpoint',
      'ms powerpoint','microsoft powerpoint','office 365'
    ],
    action: 'speak',
    reply: 'Yes — it opens in any PowerPoint from 2013 onward on Windows or Mac, and in Microsoft 365. Just open the pptx normally.'
  },

  {
    id: 'q_canva',
    category: 'usage',
    phrases: [
      'open in canva','works in canva','import to canva','can i use in canva','canva support'
    ],
    action: 'speak',
    reply: 'Canva can import a pptx, but it rebuilds the layout so expect some spacing and font drift. PowerPoint, Google Slides or Keynote stay closest to the original design.'
  },

  {
    id: 'q_google_slides',
    category: 'usage',
    phrases: [
      'google slides','open in google slides','gslides','does it work in google slides','upload to google slides'
    ],
    action: 'speak',
    reply: 'Yes — upload the pptx to Google Drive and open it with Google Slides. Install the listed fonts first, or Slides will substitute them.'
  },

  {
    id: 'q_refund',
    category: 'support',
    phrases: [
      'refund','money back','can i get a refund','refund policy','return','cancel order','wrong file'
    ],
    action: 'speak',
    reply: 'Digital files cannot be un-downloaded, so refunds are only for genuine problems — a corrupt file, the wrong item, or a duplicate charge. Email support@lazydogtemplates.com with your order number and we will sort it within 24 hours.'
  },

  {
    id: 'q_license',
    category: 'usage',
    phrases: [
      'license','licence','which license','personal or commercial','commercial use','use for client',
      'client work','business use','can i use commercially','license difference','commercial license',
      'personal vs commercial'
    ],
    action: 'speak',
    reply: 'Personal covers your own non-paid use; Commercial covers business and client work. Both let you use a design in unlimited projects — you just cannot resell or share the file itself. Each template page shows both prices.'
  },

  {
    id: 'q_delivery',
    category: 'download',
    phrases: [
      'how long delivery','when will i get it','delivery time','instant download','how do i download',
      'after payment','where is my download'
    ],
    action: 'speak',
    reply: 'It is instant. After checkout the download appears right away and is emailed to you, and it stays in My Purchases so you can grab it again any time.'
  },

  {
    id: 'q_payment_methods',
    category: 'pricing',
    phrases: [
      'payment methods','how can i pay','which cards','do you accept paypal','payment options',
      'debit card','credit card','apple pay','google pay','how to pay'
    ],
    action: 'speak',
    reply: 'Checkout runs through a secure payment provider that accepts major debit and credit cards. Your card details never touch our servers.'
  },

  {
    id: 'q_account',
    category: 'account',
    phrases: [
      'do i need an account','sign up','sign in','login','create account','register','how to make account','forgot password','reset password'
    ],
    action: 'speak',
    reply: 'Browsing is open to everyone. You need a free account to buy, so your purchases are saved and you can re-download them any time. Sign in with Google in one tap.'
  },

  {
    id: 'q_support',
    category: 'support',
    phrases: [
      'contact','support','help','talk to a human','customer service','email you','contact you',
      'need help','report a problem'
    ],
    action: 'speak',
    reply: 'Email support@lazydogtemplates.com — a real person replies, usually within 24 hours.'
  },

  {
    id: 'q_discount',
    category: 'pricing',
    phrases: [
      'discount','coupon','promo code','voucher','sale','any offer','cheaper','student discount',
      'bundle','deal'
    ],
    action: 'speak',
    reply: 'Deals go out by email — leave yours and I will make sure you hear about the next one. Bundles are on the way too.'
  }

];

// ══════════════════════════════════════════
// SECTION 16 — WORD-LEVEL INTENT ENGINE DATA
// ══════════════════════════════════════════
// The block above (vaDictionary) only fires when the SPOKEN SENTENCE is a
// near-exact match to something already typed into a 'phrases' list. That
// means a new, never-before-written sentence like "I want you to open
// social media kits" would fail even though the meaning is obvious.
//
// These two lists let mic_action.js understand the sentence at the WORD
// level instead of the whole-sentence level:
//   - vaActionWords  = the ACTION / VERB vocabulary (open, show, go to...)
//   - vaTargetWords  = the NOUN / TARGET vocabulary (pitch deck, social
//                      media kits, invoice...), each pointing at a real page
// mic_action.js finds the action word and the target word anywhere in the
// sentence — in any order, with any filler words around them — and
// combines them into a command automatically. Nothing here needs to spell
// out full sentences; it just needs the individual words.
//
// TO ADD A NEW PAGE: add one more object to vaTargetWords with its keyword
// synonyms, target page file, and spoken reply.
// TO ADD A NEW VERB: add the word/phrase to vaActionWords.navigate.
// ══════════════════════════════════════════

// NOTE ON WORD FORMS: you do NOT need to list every plural/tense of a word
// here (kit + kits, open + opens + opening...). mic_action.js runs a small
// stemmer over both the sentence and these lists before comparing, so
// "kit"/"kits", "open"/"opens"/"opened"/"opening", "deck"/"decks" etc. are
// already treated as the same word automatically. Add entries here mainly
// for genuinely DIFFERENT words/synonyms (e.g. "kit" vs "brand kit" vs
// "press kit"), not for simple plural/tense variants of a word you already
// listed — the stemmer handles those for you.

// FIELD-NAME VOCABULARY — maps what a user might CALL a field (colour,
// color family, style, industry...) to that field's real element id on the
// metadata search card. Deliberately does NOT hardcode the field's VALUES
// (red, amber, modern, tech...) — mic_action.js reads whichever option
// values are actually live on the card at that moment, so this stays
// correct automatically as more decks get metadata filled in, without
// ever needing to be hand-updated with new colors/styles/industries.
var vaFieldWords = [
  { id: 'f_colorFamily', multi: true, keywords: ['colour family', 'color family', 'colour', 'color'] },
  { id: 'f_style', multi: true, keywords: ['style', 'design style'] },
  { id: 'f_industry', multi: true, keywords: ['industry', 'sector'] },
  { id: 'f_tone', multi: true, keywords: ['tone', 'mood'] },
  { id: 'f_audience', multi: true, keywords: ['audience', 'target audience'] },
  { id: 'f_bestFor', multi: true, keywords: ['best for', 'use case', 'usecase'] },
  { id: 'f_contentType', multi: false, keywords: ['content type', 'type of content'] },
  { id: 'f_aspectRatio', multi: false, keywords: ['aspect ratio', 'ratio'] },
  { id: 'f_formality', multi: false, keywords: ['formality'] },
  { id: 'f_textWeight', multi: false, keywords: ['text weight'] },
  { id: 'f_imageWeight', multi: false, keywords: ['image weight', 'picture weight'] },
  { id: 'f_graphWeight', multi: false, keywords: ['graph weight', 'chart weight'] },
  { id: 'f_slides', multi: false, numeric: true, keywords: ['number of slides', 'slide count', 'no of slides', 'slides', 'slide'] }
];
// Filler/verb words stripped out of the leftover text once the field name
// itself has been removed, so "please fill the colour field with red" and
// "colour red" both reduce down to just "red" before option-matching.
// NOTE: deliberately does NOT include short articles like "a"/"an" — values
// such as "series a" / "series b" (a real Best For value) need that letter
// to survive filler-stripping. Leaving them in never breaks matching, since
// matching is substring-based and just ignores the extra noise word.
var vaFieldFillFillers = [
  'please', 'fill', 'set', 'choose', 'select', 'make', 'put', 'field',
  'up', 'the', 'is', 'to', 'with', 'equals', 'equal', 'value',
  'for', 'in', 'on', 'it', 'i want', 'want'
];

// FORM-FILL CONTROL PHRASES — used by mic_action.js to enter/exit the mode
// where every spoken line gets relayed straight into the metadata search
// widget's own chat box (same as typing + Enter there), so it fills in
// fields one detail at a time as the user speaks. Saying the normal
// "stop"/"stop mic" phrase (SECTION 15 above) also exits this mode, since
// it turns the whole assistant off.
var vaFormControlWords = {
  start: [
    'fill up the form', 'fill up data form', 'fill up form', 'fill the form',
    'fill form', 'fill fields', 'fill field', 'fill data', 'fill data form',
    'fill in the form', 'fill in the fields', 'start filling', 'let me fill',
    'fill it out', 'help me fill', 'start filling the form'
  ],
  stop: [
    'stop filling', 'done filling', 'finish form', 'finish filling',
    'exit form', 'that is all for the form', 'stop form', 'close form filling'
  ]
};

var vaActionWords = {
  navigate: [
    'i want you to open', 'i want to go to', 'take me to', 'i want',
    'i would like to see', 'i would like', 'i need to see', 'i need',
    'go to', 'goto', 'go over to', 'head to', 'head over to',
    'open up', 'open', 'show me', 'show', 'display', 'bring up',
    'pull up', 'pop up', 'navigate to', 'navigating to', 'browse', 'browse to',
    'browsing', 'browsing to', 'view', 'look at', 'check out', 'find', 'get me', 'fetch',
    'load', 'see', 'switch to', 'jump to', 'move to', 'redirect to',
    'can you open', 'can you show', 'could you open', 'could you show',
    'please open', 'please show', 'go'
  ]
};

var vaTargetWords = [
  {
    keywords: [
      'pitch deck', 'pitch decks', 'presentation', 'presentations',
      'slide deck', 'slide decks', 'slide', 'slides', 'deck', 'decks',
      'business deck', 'startup deck', 'investor deck', 'sales deck',
      'company deck', 'funding deck', 'pitch'
    ],
    target: 'pitch_deck_folder_section.html',
    reply: 'Opening Pitch Decks for you.'
  },
  {
    // Listed BEFORE the plain media-kit block so "social media kit(s)"
    // (the longer, more specific phrase) wins the longest-match check
    // instead of getting swallowed by the shorter "media kit" / "kit".
    keywords: [
      'social media kit', 'social media kits', 'social kit', 'social kits',
      'social media', 'social media pack', 'social pack',
      'instagram kit', 'instagram pack', 'facebook kit'
    ],
    target: 'social_kits.html',
    reply: 'Opening Social Media Kits for you.'
  },
  {
    keywords: [
      'media kit', 'media kits', 'brand kit', 'brand kits',
      'press kit', 'press kits', 'podcast kit', 'podcast kits',
      'influencer kit', 'influencer kits', 'fashion kit', 'fashion kits',
      'branding kit', 'branding kits', 'brand pack', 'media pack', 'kit', 'kits'
    ],
    target: 'media_kits_folder_section.html',
    reply: 'Opening Media Kits for you.'
  },
  {
    keywords: [
      'career doc', 'career docs', 'career document', 'career documents',
      'resume', 'resumes', 'cv', 'cover letter', 'cover letters',
      'job document', 'job documents', 'job application document'
    ],
    target: 'career_docs_folder_section.html',
    reply: 'Opening Career Docs for you.'
  },
  {
    keywords: [
      'web kit', 'web kits', 'website kit', 'website kits', 'web page kit',
      'website template', 'website templates', 'web template', 'web templates',
      'landing page kit', 'landing page template'
    ],
    target: 'web_kit_folder_file.html',
    reply: 'Opening Web Kits for you.'
  },
  {
    // Listed AFTER web kit / media kit so genuinely ambiguous words like
    // "kit" alone still fall through to those, and this only wins on
    // phrases that are clearly about a KEYNOTE specifically.
    keywords: [
      'digital keynote', 'digital keynotes', 'keynote', 'keynotes',
      'keynote deck', 'keynote decks', 'digital presentation',
      'digital presentations', 'interactive keynote', 'interactive keynotes',
      'interactive presentation', 'scrollytelling deck', 'html keynote',
      'html presentation'
    ],
    target: 'digital_keynote-folder.html',
    reply: 'Opening Digital Keynotes for you.'
  },
  {
    keywords: [
      'invoice', 'invoices', 'billing', 'bill', 'bills', 'receipt',
      'receipts', 'invoice generator', 'invoice maker', 'invoice template'
    ],
    target: 'invoice.html',
    reply: 'Opening Invoice Generator.'
  },
  {
    keywords: [
      'faq', 'faqs', 'frequently asked question', 'frequently asked questions',
      'question', 'questions', 'help page', 'help center'
    ],
    target: 'faq.html',
    reply: 'Opening the FAQ page for you.'
  },
  {
    keywords: [
      'terms', 'terms and conditions', 'terms of service', 'terms of use',
      'privacy policy', 'privacy', 'legal page', 'legal terms'
    ],
    target: 'terms.html',
    reply: 'Opening Terms and Conditions for you.'
  },
  {
    keywords: [
      'home', 'main page', 'homepage', 'front page', 'landing page',
      'start page', 'beginning', 'main screen'
    ],
    target: 'main.html',
    reply: 'Taking you to the home page.'
  }
];
