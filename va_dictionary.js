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
      'are pitch deck templates available', 'do you offer presentation templates'
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
      'are branding kits available'
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
      'are invoice templates available', 'invoice template'
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
      'take me to the home page', 'i want to go home', 'go back home'
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
      'assalam', 'assalam alaikum', 'salam', 'salaam',
      'howdy', 'greetings', 'what is up', 'whats up',
      'anyone there', 'are you there', 'is anyone there'
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
      'tell me your name', 'are you an ai', 'are you a bot', 'who is haidee'
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
      'explain this site', 'about this website', 'what is templatehub',
      'about templatehub', 'tell me about templatehub',
      'what kind of platform is this', 'describe this site',
      'what do you have', 'what can i find here', 'what is available',
      'what do you offer', 'what is on this site'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates is a free template marketplace offering professional pitch decks, brand media kits, and invoice generators. Everything is free to download — no subscription, no payment required.'
  },

  {
    id: 'identity_different',
    category: 'identity',
    phrases: [
      'what makes this different', 'what makes this marketplace different',
      'why use this site', 'why templatehub', 'what is special about this'
    ],
    action: 'speak',
    reply: 'LazyDogTemplates offers high-quality, professionally designed templates completely free. No subscription, no hidden fees. Just pick, download, and use.'
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
      'list your templates', 'show me categories'
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
      'is preview available', 'show me before download'
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
      'do i need to pay', 'is there a fee'
    ],
    action: 'speak',
    reply: 'Everything on LazyDogTemplates is completely free. No payment, no subscription, no hidden charges. Just enter your email and download.'
  },

  {
    id: 'pricing_subscription',
    category: 'pricing',
    phrases: [
      'is there a subscription', 'do i need subscription',
      'monthly plan', 'yearly plan', 'do you offer subscriptions',
      'subscription plan', 'paid plan'
    ],
    action: 'speak',
    reply: 'No subscription needed. All templates are free to download without any plan or payment.'
  },

  {
    id: 'pricing_credit_card',
    category: 'pricing',
    phrases: [
      'do i need a credit card', 'credit card required',
      'payment method', 'what payment methods', 'do you accept paypal'
    ],
    action: 'speak',
    reply: 'No credit card or payment required. LazyDogTemplates is completely free.'
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
      'can i browse without account', 'is account creation free'
    ],
    action: 'speak',
    reply: 'No account needed to browse. To download, just enter your email address — no full signup required.'
  },

  {
    id: 'account_signup',
    category: 'account',
    phrases: [
      'how do i create account', 'how to sign up', 'how to register',
      'how to make account', 'sign up', 'create account'
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
      'how to reset password', 'cant login', 'password reset'
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
      'how do i get templates', 'how to get a template'
    ],
    action: 'speak',
    reply: 'Browse templates, click on any template you like, enter your email address, and click download. It is instant and free.'
  },

  {
    id: 'download_where',
    category: 'download',
    phrases: [
      'where do downloads go', 'where are my downloads',
      'where is the downloaded file', 'download location',
      'how long does download take', 'are downloads instant'
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
      'what file types'
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
      'download multiple times', 'can i get it again'
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
      'how to modify template', 'edit after download'
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
      'open in canva', 'works with canva'
    ],
    action: 'speak',
    reply: 'Yes, some templates include a Canva link. Look for the Open in Canva button on the template page.'
  },

  {
    id: 'usage_google_slides',
    category: 'usage',
    phrases: [
      'works with google slides', 'google slides compatible',
      'can i use in google slides', 'open in google slides'
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
      'commercial license', 'is commercial use allowed'
    ],
    action: 'speak',
    reply: 'Yes, templates can be used for commercial and business projects. Check the individual template page for full license details.'
  },

  {
    id: 'usage_resell',
    category: 'usage',
    phrases: [
      'can i resell templates', 'sell templates', 'resell',
      'can i redistribute', 'share with others'
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
      'who do i contact', 'contact us', 'support email'
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
      'template is broken', 'broken file', 'missing file'
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
      'can i open without powerpoint'
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
      'app download', 'phone app', 'smartphone app'
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
      'voice commands', 'list commands', 'instructions'
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
  }

];
