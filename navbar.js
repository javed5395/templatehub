(function() {

  // ── INJECT SHARED STYLESHEET (first — before any other DOM work) ──
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'shared-styles.css';
  document.head.insertBefore(css, document.head.firstChild);

  // ── LOAD NUNITO FONT ──
  var nunLink = document.createElement('link');
  nunLink.rel = 'stylesheet';
  nunLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap';
  document.head.appendChild(nunLink);

  // ── INJECT AUTH MODAL + FIREBASE ──
  var authHTML = `
<div class="auth-overlay" id="authOverlay" onclick="if(event.target===this)closeAuthModal()">
  <div class="auth-modal">
    <button class="auth-modal-close" onclick="closeAuthModal()">✕</button>
    <h2 id="authTitle">Welcome Back</h2>
    <p id="authSubtitle">Sign in to access your downloads</p>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tabSignin" onclick="switchTab('signin')">Sign In</button>
      <button class="auth-tab" id="tabSignup" onclick="switchTab('signup')">Sign Up</button>
    </div>
    <div class="auth-name-field" id="nameField">
      <div class="auth-field"><label>Your Name</label><input type="text" id="authName" placeholder="e.g. John Smith"/></div>
    </div>
    <div class="auth-field"><label>Email Address</label><input type="email" id="authEmail" placeholder="your@email.com"/></div>
    <div class="auth-field"><label>Password</label><input type="password" id="authPass" placeholder="Min 6 characters" onkeydown="if(event.key==='Enter')submitAuth()"/></div>
    <div class="auth-error" id="authError"></div>
    <button class="auth-submit" id="authSubmit" onclick="submitAuth()">Sign In</button>
    <div style="text-align:center;margin-top:12px;"><span style="font-size:12px;color:#8899aa;cursor:pointer;" onclick="doForgotPassword()">Forgot password?</span></div>
    <div style="display:flex;align-items:center;gap:10px;margin:16px 0;"><div style="flex:1;height:1px;background:rgba(255,255,255,0.1);"></div><span style="font-size:11px;color:#8899aa;">OR</span><div style="flex:1;height:1px;background:rgba(255,255,255,0.1);"></div></div>
    <button onclick="doGoogleSignIn()" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:20px;height:20px;"> Continue with Google
    </button>
  </div>
</div>
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  const firebaseConfig = { apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain:"templatehub-16cd7.firebaseapp.com", projectId:"templatehub-16cd7", storageBucket:"templatehub-16cd7.firebasestorage.app", messagingSenderId:"143000893683", appId:"1:143000893683:web:fd694de96f8c0fa6569f86" };
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    const si=document.getElementById('signinBtn'), su=document.getElementById('signupBtn');
    const um=document.getElementById('nbUserMenu'), un=document.getElementById('nbUserName'), ua=document.getElementById('nbUserAvatar');
    if(user) {
      if(si)si.style.display='none'; if(su)su.style.display='none'; if(um)um.style.display='flex';
      const name=user.displayName||user.email.split('@')[0];
      if(un)un.textContent=name;
      if(ua){ if(user.photoURL){ua.innerHTML='<img src="'+user.photoURL+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';}else{ua.textContent=name.charAt(0).toUpperCase();} }
    } else {
      if(si)si.style.display='inline-flex'; if(su)su.style.display='inline-flex'; if(um)um.style.display='none';
    }
  });
  window.doSignUp = async function() {
    const name=document.getElementById('authName').value.trim(), email=document.getElementById('authEmail').value.trim(), pass=document.getElementById('authPass').value, err=document.getElementById('authError');
    err.textContent='';
    if(!name||!email||!pass){err.textContent='Please fill all fields.';return;}
    if(pass.length<6){err.textContent='Password must be at least 6 characters.';return;}
    try { const cred=await createUserWithEmailAndPassword(auth,email,pass); await updateProfile(cred.user,{displayName:name}); await cred.user.reload(); closeAuthModal(); } catch(e){err.textContent=e.message.replace('Firebase: ','').replace(/\(.*\)/,'');}
  };
  window.doSignIn = async function() {
    const email=document.getElementById('authEmail').value.trim(), pass=document.getElementById('authPass').value, err=document.getElementById('authError');
    err.textContent='';
    if(!email||!pass){err.textContent='Please enter email and password.';return;}
    try { await signInWithEmailAndPassword(auth,email,pass); closeAuthModal(); } catch(e){err.textContent='Invalid email or password.';}
  };
  window.doSignOut = async function() { await signOut(auth); var dd=document.getElementById('nbUserDropdown'); if(dd)dd.style.display='none'; };
  window.doGoogleSignIn = async function() {
    try { await signInWithPopup(auth,new GoogleAuthProvider()); closeAuthModal(); } catch(e){ var err=document.getElementById('authError'); if(err)err.textContent='Google sign-in failed. Try again.'; }
  };
  window.doForgotPassword = async function() {
    const email=document.getElementById('authEmail').value.trim(), err=document.getElementById('authError');
    if(!email){err.textContent='Enter your email address above first.';return;}
    try { await sendPasswordResetEmail(auth,email); err.style.color='#50dc96'; err.textContent='Reset link sent! Check your email.'; setTimeout(()=>{err.style.color='';err.textContent='';},4000); } catch(e){err.textContent='Email not found. Check and try again.';}
  };
<\/script>`;

  document.body.insertAdjacentHTML('beforeend', authHTML);

  // Auth JS functions
  window.openAuth = function(mode) {
    window._authMode = mode||'signin';
    document.getElementById('authOverlay').classList.add('open');
    switchTab(window._authMode);
    document.getElementById('authError').textContent='';
    document.getElementById('authEmail').value='';
    document.getElementById('authPass').value='';
    document.getElementById('authName').value='';
  };
  window.closeAuthModal = function() { document.getElementById('authOverlay').classList.remove('open'); };
  window.switchTab = function(mode) {
    window._authMode = mode;
    document.getElementById('tabSignin').classList.toggle('active', mode==='signin');
    document.getElementById('tabSignup').classList.toggle('active', mode==='signup');
    document.getElementById('nameField').classList.toggle('show', mode==='signup');
    document.getElementById('authTitle').textContent = mode==='signin'?'Welcome Back':'Create Account';
    document.getElementById('authSubtitle').textContent = mode==='signin'?'Sign in to access your downloads':'Join free — download unlimited templates';
    document.getElementById('authSubmit').textContent = mode==='signin'?'Sign In':'Create Account';
    document.getElementById('authError').textContent='';
  };
  window.submitAuth = function() { if(window._authMode==='signin') doSignIn(); else doSignUp(); };
  window.toggleNbUserDropdown = function() { var dd=document.getElementById('nbUserDropdown'); if(dd)dd.style.display=dd.style.display==='block'?'none':'block'; };
  document.addEventListener('click', function(e) {
    var menu=document.getElementById('nbUserMenu'), dd=document.getElementById('nbUserDropdown');
    if(menu&&dd&&!menu.contains(e.target)) dd.style.display='none';
  });

  // ── MOBILE HAMBURGER MENU ──
  window.nbToggleMobileMenu = function() {
    var links = document.getElementById('nbLinks');
    if (links) links.classList.toggle('nb-open');
  };
  document.addEventListener('click', function(e) {
    var links = document.getElementById('nbLinks');
    var burger = document.getElementById('nbHamburgerBtn');
    if (links && links.classList.contains('nb-open') && !links.contains(e.target) && burger && !burger.contains(e.target)) {
      links.classList.remove('nb-open');
    }
  });
  // Close the mobile menu automatically if the window is resized back to desktop width
  window.addEventListener('resize', function() {
    var links = document.getElementById('nbLinks');
    if (links && window.innerWidth > 960) links.classList.remove('nb-open');
  });

  // ── INJECT NAVBAR HTML ──
  var navHTML = `
<nav id="sharedNav">
  <a href="main.html" class="nb-logo notranslate" translate="no">LazyDog<span>Templates</span></a>
  <button class="nb-hamburger" id="nbHamburgerBtn" onclick="nbToggleMobileMenu()" title="Menu" aria-label="Menu">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <div class="nb-links" id="nbLinks">
    <button class="nav-search-icon" id="navSearchBtn" onclick="nbOpenSearch()" title="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></button>
    <button class="nb-lang" id="nbLangBtn" onmouseenter="nbShowLang()" onmouseleave="nbLangLeaveBtn()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> <span id="nbLangLabel">English</span></button>
    <div class="nb-feat-wrap" id="nbFeatWrap" onmouseenter="nbFeatHover(true)" onmouseleave="nbFeatHover(false)">
      <button class="nb-features" id="nbFeatBtn" onclick="nbFeatLockToggle()">⭐ Features</button>
      <div class="nb-feat-dropdown">
        <div class="nb-fd-item">
          <button class="nb-sb-btn nb-sb-font" id="fontBtn" onclick="nbTriggerFontPanel()" title="Pick font">Aa</button>
          <span class="nb-fd-label">Font</span>
        </div>
        <div class="nb-fd-item">
          <button class="nb-sb-btn nb-sb-colour" id="colourBtn" onclick="nbTriggerColourPanel()" title="Pick colour"></button>
          <span class="nb-fd-label">Colour</span>
        </div>
        <div class="nb-fd-item">
          <button class="nb-sb-btn nb-sb-mic" id="vaBtn" onclick="toggleVoiceAssistant()" title="Voice Assistant">🎤</button>
          <span class="nb-fd-label">Voice</span>
        </div>
      </div>
    </div>
    <button class="nb-seller" onclick="window.location='upload_form.html'">🛍️ Become a Seller</button>
    <button class="nb-signin" id="signinBtn" onclick="openAuth('signin')">Sign In</button>
    <button class="nb-signup" id="signupBtn" onclick="openAuth('signup')">Sign Up</button>
    <button class="nb-theme-nb" id="themeBtn" onclick="nbToggleTheme()" title="Toggle Light/Dark Mode"><svg width="22" height="22" viewBox="0 0 24 24" fill="#d4af37"><path d="M21 12.79A9 9 0 1 1 11.21 3 8.2 8.2 0 0 0 21 12.79z"/></svg></button>
    <div class="nb-user-menu" id="nbUserMenu" style="display:none;">
      <div class="nb-user-avatar" id="nbUserAvatar" onclick="toggleNbUserDropdown()">J</div>
      <span class="nb-user-name" id="nbUserName"></span>
      <div class="nb-user-dropdown" id="nbUserDropdown">
        <a href="#">My Downloads</a>
        <a href="#">Profile</a>
        <button class="nb-signout-btn" onclick="doSignOut()">Sign Out</button>
      </div>
    </div>
  </div>
</nav>
<div class="nav-search-panel" id="navSearchPanel">
  <div class="nav-search-panel-inner">
    <span class="ns-icon-left">🔍</span>
    <input type="text" id="navSearchInput" placeholder="Search for templates, categories, industries..."
      onkeydown="if(event.key==='Enter')nbDoSearch(); if(event.key==='Escape')nbCloseSearch();"/>
    <button class="nav-search-mic" id="micBtn" onclick="nbToggleMic()" title="Voice search">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
    </button>
    <button class="nav-search-send" onclick="nbDoSearch()" title="Search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
    <button class="nav-search-close" onclick="nbCloseSearch()" title="Close">✕</button>
  </div>
</div>`;

  document.body.insertAdjacentHTML('afterbegin', navHTML);

  // ── INJECT RIGHT SIDEBAR ──
  var sidebarHTML = `
<div id="vaBubble"><span id="vaBubbleMsg">Ready</span><br/><button id="vaGenderBtn" onclick="vaToggleGender()" style="margin-top:6px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);color:#d4af37;border-radius:8px;padding:3px 10px;font-size:10px;cursor:pointer;font-family:Poppins,sans-serif;">♀ Female</button></div>`;
  // ── LANGUAGE PANEL ──
  function nbFlag(code){ return '<img class="nb-lang-flag" src="https://flagcdn.com/w40/'+code+'.png">'; }
  function nbGlobe(){ return '<span style="font-size:17px;line-height:1;">🌐</span>'; }
  var langHTML = `
<div class="nb-lang-panel notranslate" id="nbLangPanel" translate="no" onmouseenter="nbLangEnterPanel()" onmouseleave="nbLangLeavePanel()">
  <div class="nb-lang-grid">
    <div class="nb-lang-item active" onclick="nbSetLang('en','English')">${nbGlobe()} English ✓</div>
    <div class="nb-lang-item" onclick="nbSetLang('es','Español')">${nbGlobe()} Español</div>
    <div class="nb-lang-item" onclick="nbSetLang('pt','Português (Brasil)')">${nbFlag('br')} Português (Brasil)</div>
    <div class="nb-lang-item" onclick="nbSetLang('de','Deutsch')">${nbFlag('de')} Deutsch</div>
    <div class="nb-lang-item" onclick="nbSetLang('fr','Français')">${nbFlag('fr')} Français</div>
    <div class="nb-lang-item" onclick="nbSetLang('nl','Nederlands')">${nbFlag('nl')} Nederlands</div>
    <div class="nb-lang-item" onclick="nbSetLang('ja','日本語')">${nbFlag('jp')} 日本語</div>
    <div class="nb-lang-item" onclick="nbSetLang('ar','العربية')">${nbGlobe()} العربية</div>
    <div class="nb-lang-item" onclick="nbSetLang('id','Bahasa Indonesia')">${nbFlag('id')} Bahasa Indonesia</div>
    <div class="nb-lang-item" onclick="nbSetLang('th','ภาษาไทย')">${nbFlag('th')} ภาษาไทย</div>
    <div class="nb-lang-item" onclick="nbSetLang('vi','Tiếng Việt')">${nbFlag('vn')} Tiếng Việt</div>
    <div class="nb-lang-item" onclick="nbSetLang('fr','Français (Canada)')">${nbFlag('ca')} Français (Canada)</div>
    <div class="nb-lang-item" onclick="nbSetLang('zh-TW','繁体中文')">${nbGlobe()} 繁体中文</div>
    <div class="nb-lang-item" onclick="nbSetLang('fa','فارسی')">${nbFlag('ir')} فارسی</div>
    <div class="nb-lang-item" onclick="nbSetLang('ko','한국어')">${nbFlag('kr')} 한국어</div>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', langHTML);

  var nbLangTimer = null;
  window.nbShowLang = function() {
    clearTimeout(nbLangTimer);
    var btn = document.getElementById('nbLangBtn');
    var panel = document.getElementById('nbLangPanel');
    var rect = btn.getBoundingClientRect();
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.right = (window.innerWidth - rect.right - 20) + 'px';
    panel.classList.add('open');
  };
  window.nbLangLeaveBtn = function() { nbLangTimer = setTimeout(function(){ document.getElementById('nbLangPanel').classList.remove('open'); }, 200); };
  window.nbLangEnterPanel = function() { clearTimeout(nbLangTimer); };
  window.nbLangLeavePanel = function() { document.getElementById('nbLangPanel').classList.remove('open'); };
  window.nbSetLang = function(code, label) {
    var el = event.currentTarget;
    document.querySelectorAll('.nb-lang-item').forEach(function(e){ e.classList.remove('active'); });
    el.classList.add('active');
    document.getElementById('nbLangPanel').classList.remove('open');
    if (code === 'en') {
      // Revert to English: clear cookie + storage + RTL + reload
      localStorage.removeItem('nb_lang');
      localStorage.removeItem('nb_dir');
      document.documentElement.dir = 'ltr';
      var exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=;' + exp;
      document.cookie = 'googtrans=;' + exp + ' domain=.' + window.location.hostname;
      document.cookie = 'googtrans=;' + exp + ' domain=.' + window.location.hostname.replace(/^www\./, '');
      window.location.reload();
      return;
    }
    document.getElementById('nbLangLabel').textContent = label;
    localStorage.setItem('nb_lang', JSON.stringify({code:code, label:label}));

    // ── RTL: flip page direction for Arabic / Persian / Urdu ──
    var RTL_LANGS = ['ar', 'fa', 'ur', 'he'];
    var isRTL = RTL_LANGS.indexOf(code) !== -1;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('nb_dir', isRTL ? 'rtl' : 'ltr');
    var tryTranslate = function(attempts) {
      var sel = document.querySelector('.goog-te-combo');
      if (sel) {
        sel.value = code;
        sel.dispatchEvent(new Event('change'));
      } else if (attempts > 0) {
        setTimeout(function(){ tryTranslate(attempts - 1); }, 300);
      }
    };
    tryTranslate(10);
  };

  // ── GOOGLE TRANSLATE WIDGET (client-side, works with file:// and localhost) ──
  // Inject hidden widget container
  var gtDiv = document.createElement('div');
  gtDiv.id = 'google_translate_element';
  gtDiv.style.cssText = 'display:none;position:absolute;top:-9999px;';
  document.body.appendChild(gtDiv);
  // Init callback (must be global)
  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({ pageLanguage:'en', autoDisplay:false }, 'google_translate_element');
    // Restore saved language on page load
    var s = localStorage.getItem('nb_lang');
    if (s) {
      var d = JSON.parse(s);
      if (d.code && d.code !== 'en') {
        document.getElementById('nbLangLabel').textContent = d.label;
        setTimeout(function(){
          var sel = document.querySelector('.goog-te-combo');
          if (sel) { sel.value = d.code; sel.dispatchEvent(new Event('change')); }
        }, 800);
      }
    }
  };
  // Load the GT script
  var gtScript = document.createElement('script');
  gtScript.src = 'https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit';
  gtScript.async = true;
  document.head.appendChild(gtScript);

  document.body.insertAdjacentHTML('beforeend', sidebarHTML);

  // ── INJECT HELP BOT ──
  var helpbotHTML = `
<button class="nb-sb-helpbot" id="helpbotBtn" onclick="toggleBot()" title="Need help?">💬</button>
<div class="helpbot-panel" id="helpbotPanel">
  <div class="helpbot-header">
    <div class="helpbot-avatar">🤖</div>
    <div><div class="helpbot-title">LazyDogTemplates Assistant</div><div class="helpbot-sub">Ask me anything ✦</div></div>
    <button class="helpbot-close" onclick="toggleBot()">✕</button>
  </div>
  <div class="helpbot-body" id="helpbotBody">
    <div class="helpbot-greeting">Hi there! 👋 I'm <span>LazyDogTemplates Assistant</span>. What can I help you with today?</div>
    <div class="helpbot-qs" id="helpbotQs">
      <button class="helpbot-q" onclick="showAnswer(0)">📊 What templates are available?</button>
      <button class="helpbot-q" onclick="showAnswer(1)">⬇️ How do I download a template?</button>
      <button class="helpbot-q" onclick="showAnswer(2)">💰 Are the templates really free?</button>
      <button class="helpbot-q" onclick="showAnswer(3)">🎨 Can I edit the templates?</button>
      <button class="helpbot-q" onclick="showAnswer(4)">📁 What file formats are available?</button>
      <button class="helpbot-q" onclick="showAnswer(5)">📩 How do I contact support?</button>
    </div>
    <div class="helpbot-answer" id="helpbotAnswer"></div>
    <span class="helpbot-back" id="helpbotBack" onclick="goBack()" style="display:none;">← Back to questions</span>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', helpbotHTML);

  var ANSWERS = [
    "We have <strong>Pitch Deck Templates</strong> across 20+ industries (Tech, Medical, Finance, Construction and more) and <strong>Media Kit Templates</strong> for podcasters, brands, influencers, press & fashion. New templates added regularly!",
    "Click <strong>Browse Templates</strong> → select any template → click <strong>View</strong> → enter your email → click <strong>Download</strong>. The file downloads instantly to your device. No account needed.",
    "Yes — <strong>100% free</strong>! No subscription, no credit card, no hidden fees. Just enter your email and download. Simple.",
    "Absolutely! All templates are fully editable in <strong>Microsoft PowerPoint</strong>. Media Kits also have <strong>Canva</strong> versions available — just click the purple Canva button on any kit page.",
    "Templates are available as <strong>.PPTX</strong> (PowerPoint) and <strong>.PDF</strong>. Media Kits also include <strong>PNG</strong> image files and <strong>Canva</strong> links where available.",
    "Reach us at <strong>javed5395@gmail.com</strong> — we typically respond within 24 hours. You can also visit <strong>www.lazydogtemplates.com</strong> for updates."
  ];
  var botOpen = false;
  window.toggleBot = function(){ botOpen=!botOpen; var p=document.getElementById('helpbotPanel'),b=document.getElementById('helpbotBtn'); if(botOpen){p.classList.add('open');b.textContent='✕';}else{p.classList.remove('open');b.textContent='💬';goBack();} };
  window.showAnswer = function(i){ document.getElementById('helpbotQs').style.display='none'; var a=document.getElementById('helpbotAnswer'); a.innerHTML=ANSWERS[i]; a.classList.add('show'); document.getElementById('helpbotBack').style.display='inline-block'; };
  window.goBack = function(){ document.getElementById('helpbotQs').style.display='flex'; var a=document.getElementById('helpbotAnswer'); a.classList.remove('show'); a.innerHTML=''; document.getElementById('helpbotBack').style.display='none'; };

  // ── THEME TOGGLE ──
  // ── UNIVERSAL FONT PANEL (works on all pages) ──
  (function(){
    // Inject font panel if page doesn't already have one
    if (!document.getElementById('fontPanel')) {
      var fonts = [
        ["'Poppins', sans-serif","Poppins"],["'Inter', sans-serif","Inter"],
        ["'Montserrat', sans-serif","Montserrat"],["'Raleway', sans-serif","Raleway"],
        ["'Nunito', sans-serif","Nunito"],["'DM Sans', sans-serif","DM Sans"],
        ["'Playfair Display', serif","Playfair Display"],["'Lora', serif","Lora"],
        ["'Space Grotesk', sans-serif","Space Grotesk"],["'Outfit', sans-serif","Outfit"],
        ["'Josefin Sans', sans-serif","Josefin Sans"],["'Quicksand', sans-serif","Quicksand"],
        ["'Urbanist', sans-serif","Urbanist"],["'Sora', sans-serif","Sora"],
        ["'Plus Jakarta Sans', sans-serif","Plus Jakarta Sans"]
      ];
      var items = fonts.map(function(f){
        return '<div class="nb-font-item" style="font-family:'+f[0]+'" data-font="'+f[0]+'" '+
          'onmouseenter="nbPreviewFont(this)" onmouseleave="nbRevertFont()" onclick="nbLockFont(this)">'+f[1]+'</div>';
      }).join('');
      var html = '<div id="fontPanel" style="display:none;position:fixed;top:70px;right:80px;'+
        'background:rgba(10,10,30,0.97);border:1px solid rgba(255,255,255,0.12);border-radius:16px;'+
        'padding:14px;z-index:10000;box-shadow:0 20px 60px rgba(0,0,0,0.7);min-width:220px;max-height:360px;overflow:hidden;">'+
        '<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;font-family:Poppins,sans-serif;">🔤 Pick Font</div>'+
        '<div style="display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto;padding-right:4px;">'+items+'</div>'+
        '<div style="margin-top:10px;display:flex;justify-content:flex-end;">'+
          '<button onclick="nbResetFont()" style="font-size:11px;color:rgba(255,255,255,0.4);cursor:pointer;padding:4px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;font-family:Poppins,sans-serif;">Reset</button>'+
        '</div></div>';
      document.body.insertAdjacentHTML('beforeend', html);

      var nbCommittedFont = null;
      var nbDefaultFont = "'Poppins', sans-serif";
      window.nbApplyFont = function(font) {
        document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,span,div,input,li').forEach(function(el){ el.style.fontFamily = font; });
      };
      window.nbPreviewFont = function(el) { nbApplyFont(el.getAttribute('data-font')); };
      window.nbRevertFont  = function()   { nbApplyFont(nbCommittedFont || nbDefaultFont); };
      window.nbLockFont    = function(el) {
        nbCommittedFont = el.getAttribute('data-font');
        nbApplyFont(nbCommittedFont);
        document.querySelectorAll('.nb-font-item').forEach(function(i){ i.style.background=''; i.style.color=''; });
        el.style.background = 'rgba(102,126,234,0.25)'; el.style.color = '#fff';
      };
      window.nbResetFont   = function()   { nbCommittedFont = null; nbApplyFont(nbDefaultFont); document.querySelectorAll('.nb-font-item').forEach(function(i){ i.style.background=''; i.style.color=''; }); };

      // Close on outside click
      document.addEventListener('click', function(e) {
        var panel = document.getElementById('fontPanel');
        var btn   = document.getElementById('fontBtn');
        if (panel && panel.style.display === 'block' && !panel.contains(e.target) && e.target !== btn) {
          panel.style.display = 'none';
        }
      });

      window.toggleFontPanel = function() {
        var panel = document.getElementById('fontPanel');
        var btn   = document.getElementById('fontBtn');
        var open  = panel.style.display !== 'block';
        panel.style.display = open ? 'block' : 'none';
        if (open && btn) {
          var r = btn.getBoundingClientRect();
          panel.style.position = 'fixed';
          panel.style.top   = (r.bottom + 8) + 'px';
          panel.style.left  = r.left + 'px';
          panel.style.right = 'auto';
        }
      };
    }
  })();

  // Trigger font panel and position it directly below the Font button
  window.nbTriggerFontPanel = function() {
    if (typeof toggleFontPanel === 'function') toggleFontPanel();
    setTimeout(function() {
      var panel = document.getElementById('fontPanel');
      var btn   = document.getElementById('fontBtn');
      if (!panel || !btn) return;
      var open = panel.classList.contains('open') || panel.style.display === 'block';
      if (open) {
        var r = btn.getBoundingClientRect();
        panel.style.cssText += ';position:fixed!important;top:'+(r.bottom+8)+'px!important;left:'+r.left+'px!important;right:auto!important;';
      }
    }, 10);
  };

  // Trigger colour panel and position it directly below the Colour button
  window.nbTriggerColourPanel = function() {
    if (typeof toggleColourPanel === 'function') toggleColourPanel();
    setTimeout(function() {
      var panel = document.getElementById('colourPanel');
      var btn   = document.getElementById('colourBtn');
      if (!panel || !btn) return;
      var open = panel.classList.contains('open') || panel.style.display === 'block';
      if (open) {
        var r = btn.getBoundingClientRect();
        panel.style.cssText += ';position:fixed!important;top:'+(r.bottom+8)+'px!important;left:'+r.left+'px!important;right:auto!important;';
      }
    }, 10);
  };

  // ── FEATURES DROPDOWN: hover + click-lock ──
  window.nbFeatHover = function(entering) {
    var wrap = document.getElementById('nbFeatWrap');
    if (!wrap) return;
    if (entering) wrap.classList.add('nb-feat-hover');
    else wrap.classList.remove('nb-feat-hover');
  };
  window.nbFeatLockToggle = function() {
    var wrap = document.getElementById('nbFeatWrap');
    var btn  = document.getElementById('nbFeatBtn');
    if (!wrap) return;
    var locked = wrap.classList.toggle('nb-feat-open');
    if (btn) btn.classList.toggle('nb-feat-locked', locked);
  };
  // Close locked dropdown when clicking anywhere outside
  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('nbFeatWrap');
    if (wrap && !wrap.contains(e.target)) {
      wrap.classList.remove('nb-feat-open');
      var btn = document.getElementById('nbFeatBtn');
      if (btn) btn.classList.remove('nb-feat-locked');
    }
  });

  var NB_LIGHT_BG_COLOR = '#f8f8f8';
  var NB_LIGHT_BG_IMAGE = 'repeating-linear-gradient(-52deg,transparent,transparent 38px,rgba(160,160,160,0.055) 38px,rgba(160,160,160,0.055) 39px)';
  var NB_DARK_BG_COLOR  = '#0d0d28';
  var NB_DARK_BG_IMAGE  = '';
  // main.html uses CSS vars for theming — skip inline bg override there
  var NB_IS_MAIN = document.body.getAttribute('data-page') === 'main';

  function nbSetThemeIcons(isLight) {
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.innerHTML = isLight
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="#d4af37"><path d="M21 12.79A9 9 0 1 1 11.21 3 8.2 8.2 0 0 0 21 12.79z"/></svg>';
  }

  window.nbToggleTheme = function() {
    var body = document.body;
    if (body.classList.contains('light')) {
      // → switch to DARK
      body.classList.remove('light');
      if (!NB_IS_MAIN) {
        body.style.backgroundColor = NB_DARK_BG_COLOR;
        body.style.backgroundImage = NB_DARK_BG_IMAGE;
        body.style.color = '#e8eaf6';
      }
      localStorage.setItem('theme', 'dark');
      nbSetThemeIcons(false);
    } else {
      // → switch to LIGHT
      body.classList.add('light');
      if (!NB_IS_MAIN) {
        body.style.backgroundColor = NB_LIGHT_BG_COLOR;
        body.style.backgroundImage = NB_LIGHT_BG_IMAGE;
        body.style.color = '#1a1a2e';
      }
      localStorage.setItem('theme', 'light');
      nbSetThemeIcons(true);
    }
  };

  // ── Apply saved theme on page load ──
  (function(){
    var theme = localStorage.getItem('theme') || 'light'; // default = light
    if (theme === 'light') {
      document.body.classList.add('light');
      if (!NB_IS_MAIN) {
        document.body.style.backgroundColor = NB_LIGHT_BG_COLOR;
        document.body.style.backgroundImage = NB_LIGHT_BG_IMAGE;
        document.body.style.color = '#1a1a2e';
      }
    } else {
      if (!NB_IS_MAIN) {
        document.body.style.backgroundColor = NB_DARK_BG_COLOR;
        document.body.style.backgroundImage = NB_DARK_BG_IMAGE;
        document.body.style.color = '#e8eaf6';
      }
    }
    // Sync button icon after DOM ready
    document.addEventListener('DOMContentLoaded', function(){ nbSetThemeIcons(theme === 'light'); });
  })();
  // ── Restore RTL direction on page load ──
  (function(){ var d = localStorage.getItem('nb_dir'); if(d) document.documentElement.dir = d; })();

  // ── SEARCH ──
  window.nbOpenSearch = function() {
    var panel = document.getElementById('navSearchPanel');
    if(!panel) return;
    if(panel.classList.contains('open')){ nbCloseSearch(); return; }
    panel.classList.add('open');
    setTimeout(function(){ var inp=document.getElementById('navSearchInput'); if(inp)inp.focus(); }, 450);
  };
  window.nbCloseSearch = function() {
    var panel = document.getElementById('navSearchPanel');
    if(panel) panel.classList.remove('open');
    var inp = document.getElementById('navSearchInput');
    if(inp) inp.value = '';
  };
  window.nbDoSearch = function() {
    var q = document.getElementById('navSearchInput').value.trim();
    if(q) window.location = 'pitch_deck_folder_section.html?q=' + encodeURIComponent(q);
    else window.location = 'pitch_deck_folder_section.html';
  };

  // ── VOICE MIC ──
  var nbRecognition = null;
  window.nbToggleMic = function() {
    var btn = document.getElementById('micBtn');
    if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Voice search not supported. Try Chrome.'); return; }
    if(nbRecognition){ nbRecognition.stop(); nbRecognition=null; if(btn)btn.classList.remove('listening'); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    nbRecognition = new SR();
    nbRecognition.lang = 'en-US'; nbRecognition.interimResults = false;
    if(btn) btn.classList.add('listening');
    nbRecognition.onresult = function(e){ var t=e.results[0][0].transcript; var inp=document.getElementById('navSearchInput'); if(inp)inp.value=t; nbRecognition=null; if(btn)btn.classList.remove('listening'); nbDoSearch(); };
    nbRecognition.onerror = function(){ nbRecognition=null; if(btn)btn.classList.remove('listening'); };
    nbRecognition.start();
  };

  // ── CLICK OUTSIDE SEARCH ──
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('navSearchPanel');
    var searchBtn = document.getElementById('navSearchBtn');
    if(panel && panel.classList.contains('open') && !panel.contains(e.target) && !searchBtn.contains(e.target)) nbCloseSearch();
  });

  // ── VOICE ASSISTANT ──
  var vaRecognition = null;
  var vaListening = false;
  var vaGender = 'female';

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

  function vaHandleCommand(transcript) {
    var commands = window.vaDictionary || [];
    var lower = transcript.toLowerCase();
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
    vaShowBubble(transcript);
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
      vaRecognition.interimResults = false;
      vaRecognition.lang = 'en-US';
      vaRecognition.onresult = function(e) {
        var t = e.results[e.results.length - 1][0].transcript.trim();
        vaHandleCommand(t);
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
        // Auto-restart if still supposed to be listening (Chrome stops after silence)
        if (vaListening) {
          try { vaRecognition.start(); } catch(ex) {}
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

})();