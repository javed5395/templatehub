(function() {

  /* ── VISITOR COUNTING (3 Aug 2026) ────────────────────────────────────────
     Google Analytics, loaded here because navbar.js is on every page — so this
     one insertion covers the whole site, including every page added later.

     It answers the question we could not answer before: did anybody actually
     come? Five sign-in accounts looked identical whether nobody visited or two
     hundred people did. Now we can tell the difference, and see which of
     Twitter, LinkedIn, Facebook or Instagram sent them.

     Costs nothing, touches no Firebase storage, and does not slow the page —
     the script is async and its own domain. */
  (function () {
    var GA_ID = 'G-9ZV58530NT';
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  })();

  // ── INJECT SHARED STYLESHEET (first — before any other DOM work) ──
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'shared-styles.css';
  document.head.insertBefore(css, document.head.firstChild);

  /* ── INJECT FAVICON (10 Aug 2026) ─────────────────────────────────────────
     navbar.js is on every page, so declaring the favicon here makes the round
     logo the browser-tab AND Google search-result icon site-wide in one place —
     the same way GA and the stylesheet above are handled. Pages had the logo as
     an <img> in the nav bar, but no <link rel="icon">, so Google showed a blank
     globe. Skips injection if a page already declares its own favicon (e.g. the
     welcome/splash page, which has no navbar and sets it statically). */
  (function () {
    if (document.querySelector('link[rel~="icon"]')) return;
    var ICON = 'images/site_logo_round.png';
    [
      { rel: 'icon', type: 'image/png', href: ICON },
      { rel: 'shortcut icon', type: 'image/png', href: ICON },
      { rel: 'apple-touch-icon', href: ICON }
    ].forEach(function (spec) {
      var l = document.createElement('link');
      l.rel = spec.rel; l.href = spec.href;
      if (spec.type) l.type = spec.type;
      document.head.appendChild(l);
    });
  })();

  // ── LAZYDOG STUDIOS — hover lift + glow so users know it's clickable ──
  var studioStyle = document.createElement('style');
  studioStyle.textContent =
    '.nb-logo-studios{transition:transform 0.22s ease,filter 0.22s ease,opacity 0.22s ease;display:inline-flex;align-items:center;}' +
    '.nb-logo-studios:hover{transform:translateY(-2px);filter:drop-shadow(0 4px 10px rgba(34,197,94,0.45));opacity:0.92;}' +
    '.nb-logo-studios:active{transform:translateY(0);}' +
    '.nb-logo-sep{color:rgba(180,180,200,0.35);font-size:1.15em;font-weight:200;margin:0 10px;user-select:none;pointer-events:none;line-height:1;}' +
    '.nb-logo-studios span{color:#22c55e!important;}' +
    'nav#sharedNav .nb-logo-studios span{color:#22c55e!important;}' +
    'a.nb-logo-studios span,a.nb-logo-studios span:visited,a.nb-logo-studios span:hover{color:#22c55e!important;}' +
    '.ld-studios-word{color:#22c55e!important;}';
  document.head.insertBefore(studioStyle, document.head.firstChild);

  // ── LOAD ALL PANEL FONTS IN ONE REQUEST ──
  var nunLink = document.createElement('link');
  nunLink.rel = 'stylesheet';
  nunLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Inter:wght@400;700&family=Montserrat:wght@400;700&family=Raleway:wght@400;700&family=DM+Sans:wght@400;700&family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Space+Grotesk:wght@400;700&family=Outfit:wght@400;700&family=Josefin+Sans:wght@400;700&family=Quicksand:wght@400;700&family=Urbanist:wght@400;700&family=Sora:wght@400;700&family=Plus+Jakarta+Sans:wght@400;700&family=Pacifico&family=Bebas+Neue&family=Dancing+Script:wght@700&family=Oswald:wght@400;700&family=Roboto+Slab:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=Cinzel:wght@400;700&family=Righteous&family=Abril+Fatface&family=Lobster&display=swap';
  document.head.appendChild(nunLink);

  // ── INJECT AUTH MODAL + FIREBASE ──
  var authHTML = `
<div class="auth-overlay" id="authOverlay" onclick="if(event.target===this)closeAuthModal()">
  <div class="auth-modal">
    <button class="auth-modal-close" onclick="closeAuthModal()">✕</button>
    <h2 id="authTitle">Welcome Back</h2>
    <p id="authSubtitle">Sign in to access your downloads</p>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tabSignin" onclick="nbSwitchAuthTab('signin')">Sign In</button>
      <button class="auth-tab" id="tabSignup" onclick="nbSwitchAuthTab('signup')">Sign Up</button>
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
  import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  const firebaseConfig = { apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain:"auth.lazydogtemplates.com", projectId:"templatehub-16cd7", storageBucket:"templatehub-16cd7.firebasestorage.app", messagingSenderId:"143000893683", appId:"1:143000893683:web:fd694de96f8c0fa6569f86" };
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig); // reuse existing app — duplicate-app crash fix (main.html)
  const auth = getAuth(app);
  // Hexa admin: fresh ID token for gated composer calls (null when logged out)
  window.ldGetToken = async function(){ try{ return auth.currentUser ? await auth.currentUser.getIdToken() : null; }catch(e){ return null; } };
  // Sync signed-in check for the admin composer (final authz is server-side at compose time)
  window.ldSignedIn = function(){ try{ return !!(auth && auth.currentUser); }catch(e){ return false; } };
  // OWNER allowlist — deck composing is OWNER-ONLY for now (buyers may chat, but NOT build decks).
  // STRICT: only UIDs listed here can open the composer. (Real security is also server-side via
  // TRUSTED_UIDS, which 403s non-admins on the actual build.)
  // ONE-TIME SETUP: sign in → ask Hexa "what's my uid" → paste it below → git push.
  //   e.g.  window.LD_ADMIN_UIDS = ['abc123YourOwnerUidHere'];
  window.LD_ADMIN_UIDS = window.LD_ADMIN_UIDS || [
    'EUgr3ahFHTdOtNL5oGyLPfQcX8A3',   // javed5395@gmail.com — site owner
    'FvcmbFk2AsXCIq1L2uog7t5erfp1'    // lazydogtemplates@gmail.com — business account
  ];
  // ── TEST PHASE (25 Jul 2026): all FRONTEND locks open — every visitor sees
  //    admin-gated UI (design orders, compose buttons, fill card). Server-side
  //    authz (TRUSTED_UIDS / composer-proxy / designer accounts) still applies.
  //    Set to false to restore all locks in one place. ──
  window.LD_TEST_OPEN = false;   // relocked 25 Jul per Javed — he'll explain why after this phase
  window.ldIsAdmin = function(){
    try{
      if(window.LD_TEST_OPEN) return true;   // TEST PHASE — remove/false to relock
      if(!(auth && auth.currentUser)) return false;
      return window.LD_ADMIN_UIDS.indexOf(auth.currentUser.uid) !== -1; // strict: empty list = nobody
    }catch(e){ return false; }
  };
  // Convenience: let the owner read their own UID (to paste into LD_ADMIN_UIDS above).
  window.ldMyUid = function(){ try{ return auth.currentUser ? auth.currentUser.uid : null; }catch(e){ return null; } };
  // hexaComposeIntent ("make/prepare a deck" detector) now lives in
  // chat_brain.js, which this file injects further down. Defining it here too
  // created two different functions sharing one global name — see the note in
  // chat_brain.js. Do not redefine it here.
  // Complete a full-page Google redirect sign-in (the popup fallback) and
  // surface any error instead of failing silently. onAuthStateChanged below
  // handles the success case automatically once the redirect result resolves.
  getRedirectResult(auth).catch(function(e){
    try { var el=document.getElementById('authError'); if(el && e) el.textContent='Google sign-in failed: '+((e&&e.code)||e); } catch(_){}
  });
  onAuthStateChanged(auth, (user) => {
    const si=document.getElementById('signinBtn'), su=document.getElementById('signupBtn');
    const um=document.getElementById('nbUserMenu'), un=document.getElementById('nbUserName'), ua=document.getElementById('nbUserAvatar');
    // "Generate Designs" button — PUBLIC (lock opened, Jul 2026). Always visible; server still authorizes actual builds.
    const gb=document.getElementById('nbGenBtn');
    if(gb) gb.style.display = 'inline-flex';

    /* ── UPLOAD BUTTON — CONTRIBUTORS ONLY (6 Aug 2026) ────────────────────
       This link used to be visible to every visitor, signed out included.
       That was fine while "signed in" meant the two owner accounts; now that
       freelancers can register, a stranger must not be invited to a page they
       cannot use.

       It ships as display:none and is revealed only for an admin, or for a
       user whose contributor_applications/{uid} says 'approved'.

       Presentation only. The real lock is mayUpload() in firestore.rules —
       hiding a link stops nobody who knows the URL. Firestore is what refuses
       the write. */
    const ub = document.getElementById('nbUploadBtn');
    const eb = document.getElementById('nbEarnBtn');   // My Earnings
    if (ub) ub.style.display = 'none';
    if (eb) eb.style.display = 'none';
    /* ── ONE BUTTON, FOUR STATES (10 Aug 2026, Javed's design) ────────────
       Previously this button was simply absent until someone was approved,
       so a designer who signed in saw nothing at all and had no idea the
       programme existed. Now it changes with where they are:

         never applied  ->  "Become a Contributor"    -> the application
         applied        ->  "Application under review" -> their status
         approved       ->  "Upload"                   -> the upload form
         declined       ->  hidden

       The middle state matters most. Without it, someone who has applied
       still sees "Become a Contributor", clicks it, and reasonably concludes
       their application was lost. */
    function ldSetContribBtn(label, href, dim){
      if (!ub) return;
      ub.textContent = label;
      ub.href = href;
      ub.style.display = 'inline-flex';
      ub.style.opacity = dim ? '0.72' : '';
      ub.style.cursor  = dim ? 'default' : '';
    }

    if (user && ub) {
      if (window.ldIsAdmin()) {
        ldSetContribBtn('Upload', 'upload_form.html', false);
        if (eb) eb.style.display = 'inline-flex';
      } else {
        // Firestore is not otherwise needed by the navbar, so it is imported
        // lazily — signed-out visitors never pay for this.
        (async () => {
          try {
            const { getFirestore, doc, getDoc } =
              await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
            const snap = await getDoc(doc(getFirestore(app), 'contributor_applications', user.uid));
            const status = snap.exists() ? (snap.data().status || '') : '';

            if (status === 'approved') {
              ldSetContribBtn('Upload', 'upload_form.html', false);
              if (eb) eb.style.display = 'inline-flex';
            } else if (status === 'pending') {
              ldSetContribBtn('Application under review', 'contributor/apply.html', true);
            } else if (status === 'rejected') {
              /* Say nothing. Repeating a refusal in the navigation on every
                 page they visit would be unkind and serves no purpose. */
              ub.style.display = 'none';
            } else {
              ldSetContribBtn('Become a Contributor', 'contributor/apply.html', false);
            }
          } catch (e) {
            /* Fail closed on UPLOAD, but still offer the way in: the worst a
               stranger can do with the application form is apply. */
            ldSetContribBtn('Become a Contributor', 'contributor/apply.html', false);
          }
        })();
      }
    }

    if(user) {
      /* Close the sign-in modal the moment auth actually succeeds, whichever
         route got us here — email, Google popup, or a session restored in
         another tab. Each handler already calls closeAuthModal(), but this is
         the one place that is true by definition: if there is a user, the
         sign-in box has no reason to still be on screen. Harmless when it is
         already closed. */
      try { closeAuthModal(); } catch(e){}
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
  /* 4 Aug 2026 — ALWAYS ASK WHICH ACCOUNT (Javed).
     Without prompt:'select_account' Google silently reuses whichever account is
     already open in the browser and never shows the chooser. This navbar is on
     every page, media kits included — so picking "lazydogtemplates" could sign
     you in as javed5395 with no warning at all. upload_form.html and
     editor.html already set this; navbar.js, main.html and Hexa_Promptbox.html
     did not, which made them the only three doors the wrong account could walk
     through silently. */
  window.doGoogleSignIn = async function() {
    var gp = new GoogleAuthProvider();
    gp.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth,gp); closeAuthModal();
    } catch(e){
      /* 17 Aug 2026 — signInWithPopup can fail in modern Chromium because the
         authDomain (templatehub-16cd7.firebaseapp.com) is a DIFFERENT origin than
         the site, so COOP / third-party storage partitioning severs the popup's
         window.opener and the login result never comes back. When that happens,
         fall back to a full-page redirect (which does not rely on the popup
         channel). Also surface the real error code instead of hiding it. */
      var code = (e && e.code) || '';
      var popupIssue = [
        'auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment','auth/internal-error',
        'auth/web-storage-unsupported','auth/network-request-failed',''
      ].indexOf(code) !== -1;
      if (popupIssue) {
        try { await signInWithRedirect(auth, gp); }
        catch(e2){ var er2=document.getElementById('authError'); if(er2) er2.textContent='Google sign-in failed: '+((e2&&e2.code)||e2); }
      } else {
        var err=document.getElementById('authError'); if(err) err.textContent='Google sign-in failed: '+code;
      }
    }
  };
  window.doForgotPassword = async function() {
    const email=document.getElementById('authEmail').value.trim(), err=document.getElementById('authError');
    if(!email){err.textContent='Enter your email address above first.';return;}
    try { await sendPasswordResetEmail(auth,email); err.style.color='#50dc96'; err.textContent='Reset link sent! Check your email.'; setTimeout(()=>{err.style.color='';err.textContent='';},4000); } catch(e){err.textContent='Email not found. Check and try again.';}
  };
<\/script>`;

  /* FIX: scripts inside insertAdjacentHTML NEVER execute — the whole Firebase
     auth block (doSignIn/doGoogleSignIn/onAuthStateChanged…) was dead on every
     page. Inject the HTML part normally, then run the module script for real. */
  var _authSplit = authHTML.indexOf('<script type="module">');
  if (_authSplit === -1) {
    document.body.insertAdjacentHTML('beforeend', authHTML);
  } else {
    document.body.insertAdjacentHTML('beforeend', authHTML.slice(0, _authSplit));
    var _authJs = authHTML.slice(_authSplit + '<script type="module">'.length)
                          .replace(/<\/script>\s*$/, '');
    var _authTag = document.createElement('script');
    _authTag.type = 'module';
    _authTag.textContent = _authJs;
    document.body.appendChild(_authTag);
  }

  // Auth JS functions
  window.openAuth = function(mode) {
    window._authMode = mode||'signin';
    document.getElementById('authOverlay').classList.add('open');
    nbSwitchAuthTab(window._authMode);
    document.getElementById('authError').textContent='';
    document.getElementById('authEmail').value='';
    document.getElementById('authPass').value='';
    document.getElementById('authName').value='';
  };
  window.closeAuthModal = function() { document.getElementById('authOverlay').classList.remove('open'); };
  /* nbSwitchAuthTab, not switchTab (10 Aug 2026).
     upload_form.html defines its OWN window.switchTab for its own sign-in
     panel. That page loads navbar.js first and its module afterwards, so the
     page's version replaced this one — clicking Sign In / Sign Up in the
     navbar modal then set no mode at all, and submitAuth() fell through to
     the sign-up path for someone trying to sign in. Two files sharing one
     global name is the whole bug; the name is now namespaced like every other
     navbar function. */
  window.nbSwitchAuthTab = function(mode) {
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
  <div style="display:inline-flex;align-items:center;gap:0;"><a href="main.html" class="nb-logo notranslate" translate="no" style="display:inline-flex;align-items:center;gap:9px;"><img src="images/site_logo_round.png" alt="LazyDog Templates logo" class="nb-brand-logo" style="height:42px;width:42px;border-radius:50%;object-fit:cover;flex:0 0 auto;box-shadow:0 2px 6px rgba(0,0,0,0.22);">LazyDog<span>Templates</span></a><span class="nb-logo-sep">|</span><a href="lazydog_studio.html" class="nb-logo-studios notranslate" translate="no">LazyDog<span>Studios</span></a></div>
  <button class="nb-hamburger" id="nbHamburgerBtn" onclick="nbToggleMobileMenu()" title="Menu" aria-label="Menu">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <div class="nb-links" id="nbLinks">
    <button class="nav-search-icon" id="navSearchBtn" onclick="nbOpenSearch()" title="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></button>
    <button class="nb-lang" id="nbLangBtn" onmouseenter="nbShowLang()" onmouseleave="nbLangLeaveBtn()" onclick="nbLangToggle(event)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> <span id="nbLangLabel">English</span></button>
    <div class="nb-feat-wrap" id="nbFeatWrap" onmouseenter="nbFeatHover(true)" onmouseleave="nbFeatHover(false)">
      <button class="nb-features" id="nbFeatBtn" onclick="nbFeatLockToggle()">Features</button>
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
    <a href="whats_new_keynote.html" class="nb-wn-tab" title="What's new" style="background:#fff;color:#c79a20;border:1.5px solid #dcb43f;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">What's New</a>
    <a href="coming_soon.html" class="nb-wn-tab" title="Coming soon" style="background:#fff;color:#5b5bd6;border:1.5px solid #8f8ff0;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">Coming Soon</a>
    <a href="Hexa_Promptbox.html" id="nbGenBtn" class="nb-wn-tab" title="Generate designs" style="background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;border:0;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">Generate Designs</a>
    <a href="editor.html" class="nb-wn-tab" title="LazyDog Designer" style="background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;border:1.5px solid #7d6bf0;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">Editor</a>
    <!-- Label and destination are set at runtime by ldSetContribBtn() — it is
         "Become a Contributor", "Application under review" or "Upload"
         depending on where the signed-in user has got to. Ships hidden so
         nothing flashes before we know which. -->
    <a href="upload_form.html" id="nbUploadBtn" class="nb-wn-tab" title="Contributor programme" style="background:#fff;color:#2e9e6b;border:1.5px solid #4fbf8b;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:none;align-items:center;gap:5px;">Upload</a>
    <!-- Same gate as Upload: admins and approved contributors only. Hidden by
         default; the real protection is the earnings rule in firestore.rules,
         which only ever returns a contributor their own rows. -->
    <a href="contributor/earnings.html" id="nbEarnBtn" class="nb-wn-tab" title="Your sales and earnings" style="background:#fff;color:#2f6fd0;border:1.5px solid #7aa8f0;border-radius:0;padding:7px 14px;margin-right:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;text-decoration:none;white-space:nowrap;display:none;align-items:center;gap:5px;">Earnings</a>
    <button class="nb-signin" id="signinBtn" onclick="openAuth('signin')">Sign In</button>
    <button class="nb-signup" id="signupBtn" onclick="openAuth('signup')">Sign Up</button>
    <button class="nb-theme-nb" id="themeBtn" onclick="nbToggleTheme()" title="Toggle Light/Dark Mode"><svg width="22" height="22" viewBox="0 0 24 24" fill="#d4af37"><path d="M21 12.79A9 9 0 1 1 11.21 3 8.2 8.2 0 0 0 21 12.79z"/></svg></button>
    <button class="nb-theme-nb" id="nbCartBtn" onclick="nbOpenCart()" title="Cart" style="position:relative;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span id="nbCartCount" style="position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 4px;background:#e5533c;color:#fff;font-size:10px;font-weight:700;line-height:16px;border-radius:9px;text-align:center;display:none;font-family:Poppins,sans-serif;box-sizing:border-box;">0</span></button>
    <div class="nb-bell-wrap" id="nbBellWrap" style="position:relative;">
      <button class="nb-theme-nb" id="nbBellBtn" onclick="nbToggleUpdates()" title="What's new"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><span id="nbBellDot" style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:#e5533c;display:none;box-sizing:border-box;"></span></button>
      <div class="nb-updates-panel" id="nbUpdatesPanel">
        <div class="nb-updates-head">Updates</div>
        <div class="nb-updates-list" id="nbUpdatesList">
          <div class="nb-updates-empty">Checking for updates…</div>
        </div>
        <a href="blog.html" class="nb-updates-footer">View all updates →</a>
      </div>
    </div>
    <div class="nb-user-menu" id="nbUserMenu" style="display:none;">
      <div class="nb-user-avatar" id="nbUserAvatar" onclick="toggleNbUserDropdown()">J</div>
      <!-- 3 Aug 2026 — the signed-in name was removed (Javed). A long name ate
           the room the buttons needed, and on a narrow window the logo itself
           was being squeezed to make space for it. The avatar already says who
           is signed in, and the name is still in the dropdown behind it.
           The code that filled this is guarded with if(un), so nothing breaks
           by its absence. -->
      <div class="nb-user-dropdown" id="nbUserDropdown">
        <!-- "My Downloads" and "Profile" removed 29 Jul 2026: both were
             href="#" and did nothing at all — a menu that looks like it works
             and doesn't is worse than a shorter menu. Re-add My Downloads once
             there is a purchases page for it to open (orders are now recorded
             server-side, so the data exists). -->
        <!-- 3 Aug 2026 — My Designs. The page existed with nothing pointing at
             it, so the only way in was typing the URL. This is the front door:
             ordered designs, and (for the owner) the daily routines. -->
        <a href="my_designs.html" class="nb-dd-link"
           style="display:block;padding:9px 14px;text-decoration:none;color:inherit;font-size:13px;">
           🎨 My Designs</a>
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

  // ── Cart wiring ───────────────────────────────────────────────────────────
  // The navbar OWNS the basket icon (drawn above). The basket's CONTENTS and
  // count are owned by the finance folder (Commerce.cart, from cart_core.js).
  // navbar pulls that brain in once, site-wide, then just mirrors its count.
  (function nbInitCart(){
    // NOTE: navbar only DRAWS the cart icon and mirrors the count. The cart +
    // full commerce/financial engine + FastSpring are loaded by the dedicated,
    // isolated commerce-loader.js (included on every page), NOT here — finance
    // must not depend on the navbar. This function is now pure UI.

    // Mirror the basket count onto the badge.
    window.nbUpdateCartBadge = function(){
      try {
        var el = document.getElementById('nbCartCount');
        if (!el) return;
        var n = 0;
        if (window.Commerce && window.Commerce.cart && typeof window.Commerce.cart.getItems === 'function') {
          var items = window.Commerce.cart.getItems() || [];
          n = items.reduce(function(sum, it){ return sum + (it.quantity || 1); }, 0);
        }
        if (n > 0) { el.textContent = n > 99 ? '99+' : String(n); el.style.display = 'block'; }
        else { el.style.display = 'none'; }
      } catch (e) {}
    };

    // Keep the badge live and, if the cart panel is open, re-render it.
    ['cart:updated','cart:item-added','cart:item-removed','cart:cleared'].forEach(function(ev){
      window.addEventListener(ev, function(){ nbUpdateCartBadge(); if (window._nbCartOpen) nbRenderCart(); });
    });

    // ── Cart panel ────────────────────────────────────────────────────────────
    // navbar DRAWS the panel; the basket contents and the remove/checkout
    // ACTIONS are delegated to Commerce.cart (the finance folder).
    function nbEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

    if (!document.getElementById('nbCartPanel')) {
      var panel = document.createElement('div');
      panel.id = 'nbCartPanel';
      panel.style.cssText = 'position:fixed;top:66px;right:14px;width:340px;max-width:92vw;max-height:72vh;overflow:auto;background:#16130F;color:#F2EEE5;border:1px solid rgba(212,175,55,0.35);border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.5);z-index:100001;display:none;font-family:Poppins,sans-serif;';
      panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08);"><strong style="font-size:15px;">Your Cart</strong><button onclick="nbCloseCart()" title="Close" style="background:none;border:none;color:#F2EEE5;font-size:18px;cursor:pointer;line-height:1;">&times;</button></div><div id="nbCartBody" style="padding:6px 12px;"></div><div id="nbCartFoot" style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08);"></div>';
      document.body.appendChild(panel);
    }

    window.nbRenderCart = function(){
      var body = document.getElementById('nbCartBody');
      var foot = document.getElementById('nbCartFoot');
      if (!body || !foot) return;
      var cart = (window.Commerce && window.Commerce.cart) ? window.Commerce.cart : null;
      var items = (cart && cart.getItems) ? (cart.getItems() || []) : [];
      if (!items.length) {
        body.innerHTML = '<div style="padding:26px 8px;text-align:center;color:#b8b0a2;font-size:14px;">Your cart is empty.</div>';
        foot.innerHTML = '';
        return;
      }
      body.innerHTML = items.map(function(it){
        var price = (it.price === 'free' || it.price === 0 || it.price == null) ? 'Free' : ('USD ' + Number(it.price).toFixed(2));
        var q = (it.quantity > 1) ? (' &times;' + it.quantity) : '';
        /* The licence must be visible in the basket. The same kit can appear
           twice at two prices, and without a label the two lines look like a
           duplicate the buyer would try to remove. */
        var lic = (it.licence === 'commercial') ? 'commercial' : 'personal';
        var licTag = '<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.02em;'
          + (lic === 'commercial' ? 'background:rgba(100,200,255,0.16);color:#7fd4ff;' : 'background:rgba(255,255,255,0.10);color:#cfc7b8;')
          + '">' + (lic === 'commercial' ? 'COMMERCIAL' : 'PERSONAL') + '</span>';
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.06);">'
          + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + nbEsc(it.title) + q + '</div>'
          + '<div style="font-size:12px;color:#d4af37;">' + price + licTag + '</div></div>'
          + '<button title="Remove" onclick="nbCartRemove(&quot;' + nbEsc(it.productId) + '&quot;,&quot;' + lic + '&quot;)" style="background:none;border:1px solid rgba(229,83,60,0.5);color:#e5533c;font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;cursor:pointer;font-family:Poppins,sans-serif;">Remove</button>'
          + '</div>';
      }).join('');
      var total = (cart && cart.getTotal) ? cart.getTotal() : 0;
      foot.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px;"><span>Total</span><strong>USD ' + Number(total).toFixed(2) + '</strong></div>'
        + '<button onclick="nbCartCheckout()" style="width:100%;padding:11px;border:none;border-radius:10px;background:#d4af37;color:#16130F;font-weight:700;font-size:14px;cursor:pointer;font-family:Poppins,sans-serif;">Checkout</button>';
    };

    window.nbOpenCart = function(){
      var p = document.getElementById('nbCartPanel');
      if (!p) return;
      if (p.style.display === 'block') { nbCloseCart(); return; }
      nbRenderCart();
      p.style.display = 'block';
      window._nbCartOpen = true;
    };
    window.nbCloseCart = function(){
      var p = document.getElementById('nbCartPanel');
      if (p) p.style.display = 'none';
      window._nbCartOpen = false;
    };
    window.nbCartRemove = function(pid, licence){
      if (window.Commerce && window.Commerce.cart && window.Commerce.cart.removeItem) {
        // Pass the licence so removing the Personal line leaves a Commercial
        // line of the same kit alone.
        window.Commerce.cart.removeItem(pid, licence);
        nbRenderCart();
      }
    };
    /* ── REAL CART CHECKOUT (9 Aug 2026) ────────────────────────────────────
       Whop charges one plan per payment, so a basket is sent to a Cloud
       Function which re-prices every line from the database, stores the basket,
       and creates a single Whop checkout for the total. The browser never sends
       a price — only which kit and which licence. That is deliberate: a total
       computed in the page could be edited by the buyer.

       Sign-in is required because the payment is matched back to the account by
       email. Paying while signed out would take money we could not deliver. */
    /* Same address style as download_url_http / chat_http elsewhere on the
       site: project + region + function name. Stable, unlike the hashed
       *.run.app form which changes if the function is ever recreated. */
    var NB_CART_CHECKOUT_URL =
      'https://us-central1-templatehub-16cd7.cloudfunctions.net/whop_cart_checkout_http';

    window.nbCartCheckout = async function(){
      var btn = document.querySelector('#nbCartFoot button');
      var cart = (window.Commerce && window.Commerce.cart) ? window.Commerce.cart : null;
      var items = (cart && cart.getItems) ? cart.getItems() : [];
      if (!items.length) { alert('Your cart is empty.'); return; }

      /* Use this file's own auth helpers. Commerce.auth.getCurrentUser() returns
         a plain {email, uid} object with NO getIdToken method — calling it threw
         and surfaced as "check your connection", which sent us hunting for a
         network fault that did not exist (9 Aug 2026). ldGetToken talks to the
         real Firebase auth instance created at the top of this file. */
      var token = null;
      try { token = (typeof window.ldGetToken === 'function') ? await window.ldGetToken() : null; } catch(e){ token = null; }
      if (!token) {
        alert('Please sign in first — your purchase is saved to your account.');
        if (window.openAuth) { try { openAuth('signin'); } catch(e){} }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Starting checkout…'; }
      try {
        var res = await fetch(NB_CART_CHECKOUT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            items: items.map(function(i){
              return { kitId: i.productId,
                       licence: (i.licence === 'commercial') ? 'commercial' : 'personal' };
            })
          })
        });
        var out = await res.json().catch(function(){ return {}; });
        if (!res.ok || !out.url) {
          alert(out.error || 'Checkout could not be started. Please try again.');
          return;
        }
        /* Send the buyer to Whop's hosted checkout. A redirect rather than an
           embedded box: the basket total is a one-off plan, and the hosted page
           is the flow Whop supports for it. */
        window.location.href = out.url;
      } catch (e) {
        /* Say WHAT failed. A generic "check your connection" cost us a whole
           debugging round chasing a network problem that never existed. */
        try { console.error('[cart-checkout]', e); } catch(_){}
        alert('Checkout could not be started.\n\nReason: ' + ((e && e.message) || e)
              + '\n\nPlease tell support if this keeps happening.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Checkout'; }
      }
    };

    // Close the panel when clicking outside it (but not on the cart button).
    document.addEventListener('click', function(e){
      var p = document.getElementById('nbCartPanel');
      var btn = document.getElementById('nbCartBtn');
      if (!p || p.style.display !== 'block') return;
      if (p.contains(e.target)) return;
      if (btn && (btn === e.target || btn.contains(e.target))) return;
      nbCloseCart();
    });

    nbUpdateCartBadge();
  })();

  // ── NOTIFICATION BELL — "what's new" feed, isolated module, same pattern as cart ──
  // Pulls short update entries from Firestore's `updates` collection (added by
  // whoever ships a feature) and lists them here. Each item can link to the
  // full blog post or straight to the feature. Falls back gracefully if the
  // collection is empty or Firestore isn't reachable yet.
  (function nbInitUpdates(){
    var bellStyle = document.createElement('style');
    bellStyle.textContent = `
      .nb-updates-panel {
        display:none; position:absolute; top:calc(100% + 10px); right:0;
        width:320px; max-height:400px; overflow-y:auto;
        background:#fff; border:1.5px solid #1a1a2e; border-radius:0;
        box-shadow:0 12px 32px rgba(0,0,0,0.18); z-index:9999;
      }
      .nb-updates-head {
        font-family:'Poppins',sans-serif; font-weight:700; font-size:13px;
        letter-spacing:0.4px; text-transform:uppercase; color:#1a1a2e;
        padding:14px 16px 10px; border-bottom:1px solid #eee;
      }
      .nb-updates-list { padding:6px 0; }
      .nb-updates-empty {
        padding:24px 16px; text-align:center; font-size:13px; color:#98a0ae;
        font-family:'Inter',sans-serif;
      }
      .nb-update-item {
        display:block; padding:12px 16px; text-decoration:none; color:inherit;
        border-bottom:1px solid #f2f2f5; transition:background 0.15s;
      }
      .nb-update-item:last-child { border-bottom:none; }
      .nb-update-item:hover { background:#faf8f3; }
      .nb-update-tag {
        display:inline-block; font-size:9px; font-weight:800; letter-spacing:0.6px;
        text-transform:uppercase; color:#c79a20; background:#fdf6e3;
        border:1px solid #dcb43f; padding:2px 7px; margin-bottom:6px;
        font-family:'Poppins',sans-serif;
      }
      .nb-update-title {
        font-family:'Poppins',sans-serif; font-weight:600; font-size:13px;
        color:#1a1a2e; line-height:1.4; margin-bottom:3px;
      }
      .nb-update-date { font-size:11px; color:#98a0ae; font-family:'Inter',sans-serif; }
      .nb-updates-footer {
        display:block; text-align:center; padding:12px; font-size:12.5px;
        font-weight:600; color:#c79a20; text-decoration:none;
        border-top:1px solid #eee; font-family:'Poppins',sans-serif;
      }
      .nb-updates-footer:hover { background:#faf8f3; }
    `;
    document.head.appendChild(bellStyle);

    window.nbToggleUpdates = function(){
      var p = document.getElementById('nbUpdatesPanel');
      if (!p) return;
      var open = p.style.display === 'block';
      p.style.display = open ? 'none' : 'block';
      if (!open) {
        var dot = document.getElementById('nbBellDot');
        if (dot) dot.style.display = 'none';
        try { localStorage.setItem('nb_updates_seen_at', Date.now().toString()); } catch(e){}
      }
    };

    document.addEventListener('click', function(e){
      var p = document.getElementById('nbUpdatesPanel');
      var wrap = document.getElementById('nbBellWrap');
      if (!p || p.style.display !== 'block') return;
      if (wrap && wrap.contains(e.target)) return;
      p.style.display = 'none';
    });

    function renderUpdates(items){
      var list = document.getElementById('nbUpdatesList');
      if (!list) return;
      if (!items || !items.length) {
        list.innerHTML = '<div class="nb-updates-empty">No updates yet — check back soon.</div>';
        return;
      }
      list.innerHTML = items.slice(0, 5).map(function(u){
        var href = u.link || 'blog.html';
        var tag = u.tag ? '<span class="nb-update-tag">' + u.tag + '</span><br/>' : '';
        return '<a class="nb-update-item" href="' + href + '">' + tag +
          '<div class="nb-update-title">' + (u.title || '') + '</div>' +
          '<div class="nb-update-date">' + (u.date || '') + '</div></a>';
      }).join('');

      try {
        var lastSeen = parseInt(localStorage.getItem('nb_updates_seen_at') || '0', 10);
        var newestTs = items[0] && items[0].timestamp ? items[0].timestamp : 0;
        var dot = document.getElementById('nbBellDot');
        if (dot && newestTs > lastSeen) dot.style.display = 'block';
      } catch(e){}
    }

    // Placeholder feed until wired to the real `updates` Firestore collection.
    // Replace this static array with a Firestore fetch (same pattern as the
    // rest of the site's data — see kit loading in career_docs_slides.html
    // for the reference pattern) once the collection exists.
    /* 29 Jul 2026 — this used to be ONE hardcoded entry ("Pitch Decks is live",
       dated 19 July) that could never change. Worse, it was stale in a way that
       misled: Pitch Decks has no approved products right now, while 20+ blog
       posts had no route to a reader at all.

       The bell now shows your five most recent published blog posts, straight
       from Firestore, and updates itself whenever you publish. If the query
       fails or nothing is published, renderUpdates() already falls back to
       "No updates yet — check back soon." — an honest empty state beats a
       frozen announcement. */
    (async function loadUpdatesFromBlog(){
      try {
        /* NOTE: `app` from the module block above is NOT in scope here — that
           block is an injected <script type="module">, a separate scope from
           this IIFE. Import firebase-app too and reuse the already-initialised
           instance via getApps(), exactly as Hexa_Promptbox.html does. */
        const fa = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
        const fs = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const _app = fa.getApps().length ? fa.getApp() : fa.initializeApp({
          apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes",
          authDomain:"auth.lazydogtemplates.com",
          projectId:"templatehub-16cd7",
          storageBucket:"templatehub-16cd7.firebasestorage.app",
          messagingSenderId:"143000893683",
          appId:"1:143000893683:web:fd694de96f8c0fa6569f86"
        });
        const db = fs.getFirestore(_app);
        const q  = fs.query(fs.collection(db, 'templates'),
                            fs.where('status', '==', 'approved'),
                            fs.where('category', '==', 'blog'),
                            fs.limit(20));
        const snap = await fs.getDocs(q);
        const items = [];
        snap.forEach(function(d){
          const v = d.data() || {};
          const t = v.template || {};
          const when = v.uploadedAt && v.uploadedAt.toDate ? v.uploadedAt.toDate() : null;
          items.push({
            tag: 'Journal',
            title: v.title || t.name || 'Untitled',
            date: when ? when.toLocaleDateString(undefined, { month:'long', year:'numeric' }) : '',
            link: 'blog-view.html?id=' + d.id,
            timestamp: when ? when.getTime() : 0
          });
        });
        items.sort(function(a,b){ return b.timestamp - a.timestamp; });
        renderUpdates(items);
      } catch (e) {
        console.warn('[navbar] updates feed unavailable:', e && e.message);
        renderUpdates([]);          // honest empty state, never a stale claim
      }
    })();
  })();

  // ── FORCE Studios span green via JS — beats any CSS including shared-styles.css ──
  (function forceStudiosGreen() {
    function applyGreen() {
      var el = document.querySelector('.nb-logo-studios span, .ld-studios-word');
      if (el) { el.style.setProperty('color', '#22c55e', 'important'); }
    }
    applyGreen();
    document.addEventListener('DOMContentLoaded', applyGreen);
    window.addEventListener('load', applyGreen);
  })();

  // ── MATCH STUDIOS SIZE/FONT TO TEMPLATES LOGO ──
  (function matchStudiosToTemplates() {
    function sync() {
      var src = document.querySelector('.nb-logo');
      var dst = document.querySelector('.nb-logo-studios');
      if (!src || !dst) return;
      var cs = window.getComputedStyle(src);
      ['font-family','font-size','font-weight','font-style','letter-spacing','line-height','text-transform'].forEach(function(p){
        dst.style.setProperty(p, cs.getPropertyValue(p), 'important');
      });
      var span = dst.querySelector('span');
      if (span) {
        span.style.setProperty('color', '#22c55e', 'important');
        span.style.setProperty('font-weight', cs.getPropertyValue('font-weight'), 'important');
      }
    }
    sync();
    document.addEventListener('DOMContentLoaded', sync);
    window.addEventListener('load', sync);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(sync); }
  })();

  // ── PER-PAGE BUTTON VISIBILITY (controlled centrally, from this one map) ──
  // HOW IT WORKS: add a button to the navbar above (so it appears on every page), then list
  // here which page(s) it may show on. It is hidden on every other page automatically.
  // • One line per button. To show a button everywhere, simply DON'T list it here.
  // • Keys are CSS selectors (id ".#nbDownloadBtn", class ".nb-download", etc).
  // • Values are the page filenames the button is allowed on (case-insensitive).
  //
  // EXAMPLE — a Download button that only appears on the slide (final) pages:
  //   '#nbDownloadBtn': ['pitch_deck_slides.html', 'web kit slides.html', 'media_kits_slides.html'],
  var NB_PAGE_BUTTONS = {
    // (no per-page buttons configured yet — add lines here as needed)
  };
  (function(){
    var page = decodeURIComponent((location.pathname.split('/').pop() || 'index.html')).toLowerCase();
    Object.keys(NB_PAGE_BUTTONS).forEach(function(sel){
      var allowed = (NB_PAGE_BUTTONS[sel] || []).map(function(p){ return String(p).toLowerCase(); });
      if (allowed.indexOf(page) === -1) {
        document.querySelectorAll(sel).forEach(function(el){ el.style.display = 'none'; });
      }
    });
  })();

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
    <div class="nb-lang-item" id="nbMoreBtn" onclick="nbToggleMoreLangs(this)" style="font-weight:800;color:#2255dd;font-size:14px;display:flex;align-items:center;justify-content:center;">more</div>
  </div>
  <div id="nbMoreLangs" style="max-height:0;overflow:hidden;opacity:0;transition:max-height 0.25s ease,opacity 0.2s ease;">
    <div class="nb-lang-grid" style="margin-top:4px;border-top:1px solid rgba(0,0,0,0.08);padding-top:4px;">
      <div class="nb-lang-item" onclick="nbSetLang('hi','हिन्दी')">${nbFlag('in')} हिन्दी</div>
      <div class="nb-lang-item" onclick="nbSetLang('tr','Türkçe')">${nbFlag('tr')} Türkçe</div>
      <div class="nb-lang-item" onclick="nbSetLang('pl','Polski')">${nbFlag('pl')} Polski</div>
      <div class="nb-lang-item" onclick="nbSetLang('ru','Русский')">${nbFlag('ru')} Русский</div>
      <div class="nb-lang-item" onclick="nbSetLang('uk','Українська')">${nbFlag('ua')} Українська</div>
      <div class="nb-lang-item" onclick="nbSetLang('it','Italiano')">${nbFlag('it')} Italiano</div>
      <div class="nb-lang-item" onclick="nbSetLang('zh-CN','简体中文')">${nbFlag('cn')} 简体中文</div>
      <div class="nb-lang-item" onclick="nbSetLang('ur','اردو')">${nbFlag('pk')} اردو</div>
      <div class="nb-lang-item" onclick="nbSetLang('bn','বাংলা')">${nbFlag('bd')} বাংলা</div>
      <div class="nb-lang-item" onclick="nbSetLang('ms','Bahasa Melayu')">${nbFlag('my')} Bahasa Melayu</div>
      <div class="nb-lang-item" onclick="nbSetLang('sw','Kiswahili')">${nbFlag('ke')} Kiswahili</div>
      <div class="nb-lang-item" onclick="nbSetLang('tl','Filipino')">${nbFlag('ph')} Filipino</div>
      <div class="nb-lang-item" onclick="nbSetLang('el','Ελληνικά')">${nbFlag('gr')} Ελληνικά</div>
      <div class="nb-lang-item" onclick="nbSetLang('cs','Čeština')">${nbFlag('cz')} Čeština</div>
      <div class="nb-lang-item" onclick="nbSetLang('ro','Română')">${nbFlag('ro')} Română</div>
      <div class="nb-lang-item" onclick="nbSetLang('hu','Magyar')">${nbFlag('hu')} Magyar</div>
      <div class="nb-lang-item" onclick="nbSetLang('sv','Svenska')">${nbFlag('se')} Svenska</div>
      <div class="nb-lang-item" onclick="nbSetLang('no','Norsk')">${nbFlag('no')} Norsk</div>
      <div class="nb-lang-item" onclick="nbSetLang('da','Dansk')">${nbFlag('dk')} Dansk</div>
    </div>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', langHTML);

  var nbLangTimer = null;
  var nbLangLocked = false;
  window.nbToggleMoreLangs = function(btn) {
    var more = document.getElementById('nbMoreLangs');
    if (!more) return;
    if (more._open) {
      more.style.maxHeight = '0';
      more.style.opacity = '0';
      more._open = false;
      btn.textContent = 'more';
    } else {
      more.style.maxHeight = '500px';
      more.style.opacity = '1';
      more._open = true;
      btn.textContent = 'less';
    }
  };
  window.nbShowLang = function() {
    clearTimeout(nbLangTimer);
    var btn = document.getElementById('nbLangBtn');
    var panel = document.getElementById('nbLangPanel');
    var rect = btn.getBoundingClientRect();
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.right = (window.innerWidth - rect.right - 20) + 'px';
    panel.classList.add('open');
  };
  /* 29 Jul 2026 — the panel could ONLY be opened by onmouseenter. On a phone it
     does open, because mobile browsers fire a synthetic mouseenter on tap to keep
     hover menus working. But that is browser behaviour, not a guarantee: it
     differs between Safari, Chrome and in-app browsers (Instagram, Facebook), and
     with 34 languages behind this button it is not something to leave to chance.

     This adds a real click toggle alongside the hover. Desktop is unchanged —
     hover still opens it. On touch, the tap now opens it deliberately rather
     than by accident, and tapping again closes it. */
  window.nbLangToggle = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var panel = document.getElementById('nbLangPanel');
    if (!panel) return;
    if (panel.classList.contains('open')) {
      nbLangLocked = false;
      panel.classList.remove('open');
    } else {
      window.nbShowLang();
      nbLangLocked = true;      // keep it open until something else is tapped
    }
  };
  window.nbLangLeaveBtn = function() {
    if (nbLangLocked) return;
    nbLangTimer = setTimeout(function(){ var p=document.getElementById('nbLangPanel'); if(!nbLangLocked&&p)p.classList.remove('open'); }, 200);
  };
  window.nbLangEnterPanel = function() { clearTimeout(nbLangTimer); };
  window.nbLangLeavePanel = function() { if (!nbLangLocked) document.getElementById('nbLangPanel').classList.remove('open'); };
  // Click inside panel → freeze open; click outside → close and unfreeze
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('nbLangPanel');
    var langBtn = document.getElementById('nbLangBtn');
    if (!panel) return;
    if (panel.contains(e.target)) {
      nbLangLocked = true;
    } else if (langBtn && langBtn.contains(e.target)) {
      // clicking the toggle button — leave lock state unchanged
    } else {
      nbLangLocked = false;
      panel.classList.remove('open');
    }
  });
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
    <div class="helpbot-avatar">👩‍💼</div>
    <div><div class="helpbot-title">Hexa</div><div class="helpbot-sub">LazyDog assistant • Ask me anything ✦</div></div>
    <button class="helpbot-close" onclick="toggleBot()">✕</button>
  </div>
  <div class="helpbot-body" id="helpbotBody">
    <style>
      #helpbotPanel .helpbot-body{padding:0;display:flex;flex-direction:column;height:430px;max-height:72vh;}
      #helpbotPanel .lb-thread{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f6f7fb;}
      #helpbotPanel .lb-row{display:flex;}
      #helpbotPanel .lb-row.user{justify-content:flex-end;}
      #helpbotPanel .lb-msg{max-width:82%;padding:10px 13px;border-radius:0;font-size:12.8px;line-height:1.5;font-family:'Inter',sans-serif;word-wrap:break-word;}
      #helpbotPanel .lb-msg.bot{background:#fff;color:#2a3142;border:1px solid #e7e9f2;}
      #helpbotPanel .lb-msg.user{background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;}
      #helpbotPanel .lb-msg a{color:inherit;text-decoration:underline;}
      #helpbotPanel .lb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
      #helpbotPanel .lb-chip{background:#fff;border:1px solid #d9deef;color:#3a4256;border-radius:0;padding:7px 12px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
      #helpbotPanel .lb-chip:hover{background:#5b7fff;color:#fff;border-color:#5b7fff;}
      #helpbotPanel .lb-typing span{display:inline-block;width:6px;height:6px;margin:0 1px;background:#9aa3bd;border-radius:50%;animation:lbBlink 1.2s infinite both;}
      #helpbotPanel .lb-typing span:nth-child(2){animation-delay:.2s;}
      #helpbotPanel .lb-typing span:nth-child(3){animation-delay:.4s;}
      @keyframes lbBlink{0%,80%,100%{opacity:.3;}40%{opacity:1;}}
      #helpbotPanel .lb-inputrow{display:flex;gap:8px;padding:10px;border-top:1px solid #eceef6;background:#fff;align-items:center;}
      #helpbotPanel .lb-inputrow input{flex:1;padding:10px 14px;border:1px solid #d8dce6;border-radius:0;font-size:12.8px;font-family:'Inter',sans-serif;outline:none;color:#1a1a2e;background:#f6f7fb;}
      #helpbotPanel .lb-inputrow input:focus{border-color:#5b7fff;background:#fff;}
      #helpbotPanel .lb-send{width:38px;height:38px;flex-shrink:0;border:none;border-radius:0;background:linear-gradient(135deg,#5b7fff,#b464ff);color:#fff;font-size:15px;cursor:pointer;}
      #helpbotPanel .lb-send:hover{opacity:.9;}
    </style>
    <div class="lb-thread" id="lbThread">
      <div class="lb-row bot"><div class="lb-msg bot" id="lbGreet">Hi 👋 I'm <strong>Hexa</strong>, your LazyDog assistant. Ask me about our templates, pricing, formats, or your order — or tap a question below.</div></div>
      <div class="lb-chips" id="lbChips">
        <button class="lb-chip" onclick="helpbotSend('What templates are available?')">📊 What's available</button>
        <button class="lb-chip" onclick="helpbotSend('How do I buy and download a template?')">⬇️ Buy &amp; download</button>
        <button class="lb-chip" onclick="helpbotSend('How much do templates cost?')">💳 Pricing</button>
        <button class="lb-chip" onclick="helpbotSend('Can I edit the templates?')">🎨 Editing</button>
        <button class="lb-chip" onclick="helpbotSend('What file formats are available?')">📁 Formats</button>
        <button class="lb-chip" onclick="helpbotSend('How do I contact support?')">📩 Support</button>
      </div>
    </div>
    <div class="lb-inputrow">
      <input id="helpbotInput" type="text" placeholder="Type or speak…" autocomplete="off" onkeydown="if(event.key==='Enter')helpbotAsk();" />
      <button id="hexaMicBtn" class="lb-send" onclick="hexaMic()" title="Speak to Hexa" aria-label="Speak" style="background:#eef1ff;color:#5b5bd6;">🎤</button>
      <button class="lb-send" onclick="helpbotAsk()" aria-label="Send">➤</button>
    </div>
  </div>
</div>`;
  document.body.insertAdjacentHTML('beforeend', helpbotHTML);

  var CANNED = {
    'What templates are available?': "We offer <strong>Pitch Deck Templates</strong> across 20+ industries (Tech, Medical, Finance, Construction and more), <strong>Media Kit Templates</strong> (podcasters, brands, influencers, press, fashion), and <strong>Website UI Kits</strong>. New designs are added regularly.",
    'How do I buy and download a template?': "Browse templates → open the one you like → pick your <strong>license</strong> (Personal or Commercial) → checkout securely. Right after payment you get an instant download link, and it's saved to your account too.",
    'How much do templates cost?': "Each template is a <strong>one-time purchase</strong> — no subscription. Every design has a <strong>Personal</strong> and a <strong>Commercial</strong> license, priced separately; the exact price is shown on each template's page. (Our Invoice Generator is free to use.)",
    'Can I edit the templates?': "Yes — every template is fully editable in <strong>Microsoft PowerPoint</strong>, and Media Kits also include <strong>Canva</strong> versions (look for the purple Canva button on a kit page).",
    'What file formats are available?': "Templates come as <strong>.PPTX</strong> (PowerPoint) and <strong>.PDF</strong>. Media Kits also include <strong>PNG</strong> images and <strong>Canva</strong> links where available.",
    'How do I contact support?': "Email <strong>support@lazydogtemplates.com</strong> — we usually reply within 24 hours."
  };
  var HB_CHAT_URL = 'https://us-central1-templatehub-16cd7.cloudfunctions.net/chat_http';
  var botOpen = false;

  window.toggleBot = function(){
    botOpen = !botOpen;
    var p = document.getElementById('helpbotPanel'), b = document.getElementById('helpbotBtn');
    if (botOpen){ p.classList.add('open'); b.textContent='✕'; var inp=document.getElementById('helpbotInput'); if(inp) setTimeout(function(){inp.focus();},120);
      // #5 memory: returning visitor → personalised greeting (first open only)
      try{ var g=document.getElementById('lbGreet'); if(g && !g.dataset.done && window.hexaGreeting){ var gr=window.hexaGreeting(); if(gr) g.textContent=gr; g.dataset.done='1'; } }catch(e){}
    }
    else { p.classList.remove('open'); b.textContent='💬'; }
  };

  function hbScroll(){ var th=document.getElementById('lbThread'); if(th) th.scrollTop=th.scrollHeight; }
  function hbAdd(content, who, asText){
    var th=document.getElementById('lbThread');
    var row=document.createElement('div'); row.className='lb-row '+who;
    var msg=document.createElement('div'); msg.className='lb-msg '+who;
    if(asText){ msg.textContent=content; } else { msg.innerHTML=content; }
    row.appendChild(msg); th.appendChild(row); hbScroll();
    return msg;
  }

  // Unified entry (chips + typed). FREE first: canned answer → word-compiler → then AI cascade.
  var hbHistory = [];
  function hbRemember(role, text){ hbHistory.push({role:role, content:String(text||'').slice(0,500)}); if(hbHistory.length>12) hbHistory=hbHistory.slice(-12); }
  window.helpbotSend = function(text){
    text=(text||'').trim(); if(!text) return;
    var chips=document.getElementById('lbChips'); if(chips) chips.style.display='none';
    hbAdd(text,'user',true);
    hbRemember('user', text);
    var bubble=hbAdd('<span class="lb-typing"><span></span><span></span><span></span></span>','bot',false);
    // 0) top-bar command (language / mic / colour)
    var cmd=(window.hexaCommand && window.hexaCommand(text))||null;
    if(cmd && cmd.reply){ bubble.textContent=cmd.reply; hbRemember('assistant',cmd.reply); hbScroll(); return; }
    // 0.5) lead capture — email in message / "notify me" (#4)
    /* 3 Aug 2026 — asked BEFORE lead capture: "email me the deck" is an
       order, not someone handing over their address. */
    if(window.hexaHandleAway &&
       window.hexaHandleAway(text, function(msg){ bubble.textContent=msg; hbScroll(); return bubble; })){
      return;
    }
    var lead=(window.hexaLeadCapture && window.hexaLeadCapture(text))||null;
    if(lead && lead.reply){ bubble.textContent=lead.reply; hbRemember('assistant',lead.reply); hbScroll(); return; }
    // 0.52) HEXA ADMIN — owner store commands (prepare/publish daily decks)
    if(window.hexaAdminIntent && window.hexaAdmin && window.hexaAdminIntent(text)){
      window.hexaAdmin(text).then(function(ad){
        bubble.textContent=ad.reply;
        if(ad.decks && window.chatMakeActionBtn){
          ad.decks.forEach(function(dk){
            if(dk.pptx_url){ var b=window.chatMakeActionBtn(dk.pptx_url, dk.i+'. '+dk.name.slice(0,34)); b.target='_blank'; bubble.appendChild(document.createElement('br')); bubble.appendChild(b); }
          });
        }
        hbRemember('assistant',ad.reply); hbScroll();
      }).catch(function(e){ bubble.textContent='Admin command error.'; hbScroll(); });
      return;
    }
    // 0.53) ADMIN DECK COMPOSER — signed-in owner asks to "make/prepare a deck"
    //       → open the full-page composer (design only, not content).
    //       Non-signed-in users fall through to the buyer design order below.
    if(window.hexaComposeIntent && window.ldIsAdmin && window.ldIsAdmin() && window.hexaComposeIntent(text)){
      bubble.innerHTML="🎨 Opening the deck composer…";
      hbRemember('assistant', bubble.textContent); hbScroll();
      setTimeout(function(){ window.location.href='Hexa_Promptbox.html?seed='+encodeURIComponent(String(text||'').slice(0,200)); }, 500);
      return;
    }
    // 0.55) design order — "make me a hospital kit" → Open in Designer button.
    //       29 Jul 2026: the owner-only lock is REMOVED. Slide generation runs on
    //       LazyDog's own engine (no model cost) and is now free up to 8 slides,
    //       enforced server-side in composer_proxy. While this was admin-gated,
    //       "make 4 slides for me" fell through to the browse matcher, which saw
    //       the word "slides" and replied "Opening Pitch Decks for you" — wrong
    //       answer to a creation request.
    // 3 Aug 2026 — "every day at 11" / "email me, I'm going out" never opens the
    // canvas: it becomes a routine or an order. Same call in all three doors.
    if(window.hexaDesignIntent && window.hexaDesign && window.hexaDesignIntent(text)){
      var dz=window.hexaDesign(text);
      bubble.textContent=dz.reply;
      if(window.chatMakeActionBtn){ bubble.appendChild(document.createElement('br')); bubble.appendChild(window.chatMakeActionBtn(dz.target, dz.label)); }
      hbRemember('assistant',dz.reply); hbScroll();
      // SMART ACTION (25 Jul, Javed): the user asked to CREATE — Hexa acts,
      // she doesn't wait for a second click. Button stays as a fallback.
      setTimeout(function(){ try{ window.location.href=dz.target; }catch(e){} }, 1200);
      return;
    }
    // 0.6) name capture — "my name is X" → remember the visitor (#5)
    var nm=(window.hexaNameCapture && window.hexaNameCapture(text))||null;
    if(nm && nm.reply){ bubble.textContent=nm.reply; hbRemember('assistant',nm.reply); hbScroll(); return; }
    // 1) canned preset answer
    if (CANNED[text]) { bubble.innerHTML=CANNED[text]; hbRemember('assistant', bubble.textContent); hbScroll(); return; }
    // 3) AI cascade — defined FIRST so conversational 'soft' replies can defer to it.
    //    Sends prior history + remembered email for context; ACTION -> a click button, never auto-navigate.
    //    fallbackReply is shown ONLY if every AI provider is unreachable, so Hexa still answers offline.
    var doAI=function(fallbackReply){
      fetch(HB_CHAT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text, history:hbHistory.slice(0,-1), email:(window.hexaMemory&&window.hexaMemory.get().email)||''})})
        .then(function(r){return r.json();})
        .then(function(d){
          var raw=(d&&d.reply)?d.reply:(fallbackReply||"Sorry, I couldn't answer that right now.");
          var parsed=(window.chatParseAction)?window.chatParseAction(raw):{text:raw,target:null,label:null};
          bubble.textContent=parsed.text||raw;
          if(parsed.target && window.chatMakeActionBtn){ bubble.appendChild(document.createElement('br')); bubble.appendChild(window.chatMakeActionBtn(parsed.target, parsed.label)); }
          hbRemember('assistant', parsed.text||raw);
          hbScroll();
        })
        .catch(function(){ bubble.textContent=fallbackReply||"Sorry, I'm having trouble right now. Please try again."; hbRemember('assistant', bubble.textContent); hbScroll(); });
    };
    // 2) FREE word-compiler / FAQ
    var composed=(window.chatCompose && window.chatCompose(text)) || (window.vaComposeReply && window.vaComposeReply(text)) || null;
    if (composed && composed.reply) {
      // soft = greeting / small talk / identity → hand to the live AI so the reply is warm,
      // personal and context-aware; the canned line rides along as the offline fallback.
      // Actions, navigation and factual FAQ (no soft flag) still answer instantly and free.
      if (composed.soft && !composed.target) { doAI(composed.reply); return; }
      bubble.innerHTML=composed.reply;
      if(composed.target && composed.execute){ hbRemember('assistant',composed.reply); hbScroll(); setTimeout(function(){window.location.href=composed.target;},900); return; }
      if(composed.target && window.chatMakeActionBtn){ bubble.appendChild(document.createElement('br')); bubble.appendChild(window.chatMakeActionBtn(composed.target, composed.label)); }
      hbRemember('assistant', composed.reply); hbScroll(); return;
    }
    // 2.5) REAL recommendations — server matches actual kit metadata; falls back to AI on no result
    if(window.hexaRecommendIntent && window.hexaRecommend && window.hexaRenderRecs && window.hexaRecommendIntent(text)){
      window.hexaRecommend(text)
        .then(function(rec){
          if(window.hexaRenderRecs(bubble,rec)){ hbRemember('assistant',bubble.textContent); hbScroll(); }
          else doAI();
        })
        .catch(doAI);
      return;
    }
    doAI();
  };
  window.helpbotAsk = function(){ var inp=document.getElementById('helpbotInput'); var t=((inp&&inp.value)||'').trim(); if(!t) return; inp.value=''; window.helpbotSend(t); };

  // Hexa mic: speak instead of type — dictates into Hexa and sends.
  window.hexaMic = function(){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ alert("Voice input isn't supported in this browser — please type instead."); return; }
    var r=new SR(); r.lang=(document.documentElement.lang||'en-US'); r.interimResults=false; r.maxAlternatives=1;
    var btn=document.getElementById('hexaMicBtn'); if(btn) btn.textContent='●';
    r.onresult=function(e){ var tx=e.results[0][0].transcript; var inp=document.getElementById('helpbotInput'); if(inp) inp.value=tx; if(window.helpbotSend) window.helpbotSend(tx); };
    r.onend=function(){ if(btn) btn.textContent='🎤'; };
    r.onerror=function(){ if(btn) btn.textContent='🎤'; };
    try{ r.start(); }catch(e){}
  };

  // ── THEME TOGGLE ──
  // ── UNIVERSAL FONT PANEL (works on all pages) ──
  (function(){
    if (!document.getElementById('fontPanel')) {

      /* ── 3 Aug 2026 — WHY THE FONT NAMES WERE INVISIBLE ────────────────────
         Not colour. Colour was a red herring and cost two attempts.

         The list is  display:flex; flex-direction:column  with  max-height:320px.
         There are 25 fonts. 25 rows x 40px = 1000px, which does not fit, so flex
         did what flex does by default and SHRANK every row to make them fit:

             320 / 25            = 12.80px      predicted
             measured on the live page = 12.8125px

         But line-height stayed at 40px and overflow is hidden. So every name was
         being drawn on a 40px line inside a 12.8px window and clipped clean out
         of sight. Backgrounds still paint the whole box, which is exactly why
         hovering showed a coloured bar with nothing written on it.

         'flex:none' stops the shrinking. Rows keep their 40px and the list
         scrolls instead — measured 40px after the change, names visible.

         This is why it got worse over time: with 8 fonts, 320/8 = 40px and
         nothing looked wrong. It broke silently as fonts were added. Anyone
         adding more fonts later needs this line to stay. */
      var fpStyle = document.createElement('style');
      fpStyle.textContent =
        '#fontPanel .nb-font-item{' +
          'height:40px;min-height:40px;line-height:40px;flex:none;' +
          'padding:0 10px;box-sizing:border-box;' +
          'overflow:hidden;white-space:nowrap;cursor:pointer;' +
          'font-size:15px;border-radius:0;' +
          'transition:background 0.12s,color 0.12s;' +
          'color:rgba(255,255,255,0.88)!important;' +
          'opacity:1!important;' +
        '}' +
        '#fontPanel .nb-font-item:hover{background:rgba(102,126,234,0.22);color:#fff!important;}';
      document.head.appendChild(fpStyle);

      var fonts = [
        // ── Clean modern sans ──
        ["'Poppins', sans-serif",       "Poppins"],
        ["'Inter', sans-serif",         "Inter"],
        ["'Montserrat', sans-serif",    "Montserrat"],
        ["'DM Sans', sans-serif",       "DM Sans"],
        ["'Outfit', sans-serif",        "Outfit"],
        ["'Urbanist', sans-serif",      "Urbanist"],
        ["'Plus Jakarta Sans', sans-serif", "Plus Jakarta Sans"],
        // ── Elegant / geometric ──
        ["'Raleway', sans-serif",       "Raleway"],
        ["'Josefin Sans', sans-serif",  "Josefin Sans"],
        ["'Cinzel', serif",             "Cinzel  (Classical)"],
        // ── Rounded & friendly ──
        ["'Nunito', sans-serif",        "Nunito"],
        ["'Quicksand', sans-serif",     "Quicksand"],
        // ── Technical / grotesk ──
        ["'Space Grotesk', sans-serif", "Space Grotesk"],
        ["'Sora', sans-serif",          "Sora"],
        ["'Oswald', sans-serif",        "Oswald  (Condensed)"],
        // ── Classic serif ──
        ["'Playfair Display', serif",   "Playfair Display"],
        ["'Lora', serif",               "Lora  (Serif)"],
        ["'Roboto Slab', serif",        "Roboto Slab"],
        // ── Display / decorative ──
        ["'Bebas Neue', cursive",       "BEBAS NEUE"],
        ["'Abril Fatface', cursive",    "Abril Fatface"],
        ["'Righteous', cursive",        "Righteous"],
        // ── Script / handwritten ──
        ["'Pacifico', cursive",         "Pacifico"],
        ["'Dancing Script', cursive",   "Dancing Script"],
        ["'Lobster', cursive",          "Lobster"],
        // ── Monospace ──
        ["'IBM Plex Mono', monospace",  "IBM Plex Mono"]
      ];

      /* 3 Aug 2026 — the names are painted INLINE, with !important, and that is
         deliberate. Two separate runtime rules fight over the colour of every
         element on the page:

           Theme :  '.hero *, .navbar-below-strip * { color: <picked> !important }'
           Fonts :  'body .hero *, body .navbar-below-strip * { color: <hex> !important }'

         Both are written into <style> tags AFTER this panel is built, both carry
         !important, and the Fonts one deliberately outranks the Theme one. A
         stylesheet rule of mine can always be out-specified by the next feature
         added to that list — which is how these names went white-on-dark and
         disappeared in the first place.

         An inline style with !important sits at the top of the cascade. Nothing
         in a stylesheet can beat it, whatever colour is picked, forever.
         -webkit-text-fill-color is set too, because that property overrides
         'color' outright on WebKit and no amount of colour fixes it alone. */
      var items = fonts.map(function(f){
        return '<div class="nb-font-item" data-font="'+f[0]+'" '+
          'style="font-family:'+f[0]+';color:#ffffff!important;'+
          '-webkit-text-fill-color:#ffffff!important;opacity:1!important;" '+
          'onmouseenter="nbPreviewFont(this)" onclick="nbLockFont(this)">'+f[1]+'</div>';
      }).join('');

      var html =
        '<div id="fontPanel" style="display:none;position:fixed;z-index:10000;'+
        'background:#1e1e2f;border:1px solid rgba(255,255,255,0.12);border-radius:0;'+
        'padding:14px 14px 10px;box-shadow:0 20px 60px rgba(0,0,0,0.7);min-width:230px;">'+
          '<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-family:Poppins,sans-serif;">🔤 Pick Font</div>'+
          '<div id="nbFontList" style="display:flex;flex-direction:column;max-height:320px;overflow-y:auto;overflow-x:hidden;" onmouseleave="nbRevertFont()">'+items+'</div>'+
          '<div style="margin-top:10px;display:flex;justify-content:flex-end;">'+
            '<button onclick="nbResetFont()" style="font-size:11px;color:rgba(255,255,255,0.45);cursor:pointer;padding:4px 12px;border-radius:0;border:1px solid rgba(255,255,255,0.15);background:transparent;font-family:Poppins,sans-serif;">Reset</button>'+
          '</div>'+
        '</div>';
      document.body.insertAdjacentHTML('beforeend', html);

      var nbCommittedFont = null;
      var nbDefaultFont = "'Poppins', sans-serif";

      // Single CSS injection — one browser paint instead of thousands of inline style changes
      var nbFontStyle = document.createElement('style');
      nbFontStyle.id = 'nbFontApplyStyle';
      document.head.appendChild(nbFontStyle);
      window.nbApplyFont = function(font) {
        nbFontStyle.textContent =
          'body,h1,h2,h3,h4,h5,h6,p,a,button,input,li,span{font-family:'+font+'!important;}' +
          '#fontPanel,#fontPanel *{font-family:Poppins,sans-serif!important;}';
      };
      var nbFontTimer = null;
      // Debounce: only apply font after cursor pauses 150ms on an item — eliminates rapid-sweep jerk
      window.nbPreviewFont = function(el) {
        clearTimeout(nbFontTimer);
        var font = el.getAttribute('data-font');
        nbFontTimer = setTimeout(function(){ nbApplyFont(font); }, 150);
      };
      window.nbRevertFont = function() {
        clearTimeout(nbFontTimer); // cancel any pending preview
        nbApplyFont(nbCommittedFont || nbDefaultFont);
      };
      window.nbLockFont    = function(el) {
        nbCommittedFont = el.getAttribute('data-font');
        nbApplyFont(nbCommittedFont);
        document.querySelectorAll('.nb-font-item').forEach(function(i){ i.style.background=''; });
        el.style.background = 'rgba(102,126,234,0.3)';
      };
      window.nbResetFont = function() {
        nbCommittedFont = null;
        nbFontStyle.textContent = '';
        document.querySelectorAll('.nb-font-item').forEach(function(i){ i.style.background=''; });
      };

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
          panel.style.top  = (r.bottom + 8) + 'px';
          panel.style.left = r.left + 'px';
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

  // ── NEW COLOUR PICKER — injected by navbar.js, works on every page ──
  (function(){
    var cpStyle = document.createElement('style');
    cpStyle.textContent =
      '#nbCPicker{display:none;position:fixed;z-index:99999;background:#1e1e2f;border:1px solid #3a3a55;padding:12px;width:242px;box-shadow:0 8px 32px rgba(0,0,0,0.5);}' +
      '#nbCPicker.open{display:block;}' +
      '#nbCpGradBox{width:100%;height:140px;position:relative;cursor:crosshair;user-select:none;margin-bottom:8px;}' +
      '#nbCpGradFill{position:absolute;inset:0;background:linear-gradient(to right,#fff,hsl(45,100%,50%));}' +
      '#nbCpGradDark{position:absolute;inset:0;background:linear-gradient(to bottom,transparent,#000);}' +
      '#nbCpCursor{position:absolute;width:13px;height:13px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(0,0,0,0.6);transform:translate(-50%,-50%);pointer-events:none;}' +
      '#nbCpHueWrap{position:relative;height:10px;margin-bottom:10px;}' +
      '#nbCpHueBg{height:10px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}' +
      '#nbCpHueSlider{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;margin:0;}' +
      '#nbCpHueThumb{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;}' +
      '#nbCpColorBar{height:22px;border:1px solid #444;margin-bottom:10px;}' +
      '.nbCpRow{display:flex;align-items:center;gap:7px;margin-bottom:8px;}' +
      '#nbCpSwatch{width:26px;height:26px;border-radius:50%;border:1px solid #555;flex-shrink:0;}' +
      '#nbCpEyedrop{width:26px;height:26px;background:#2a2a3f;border:1px solid #555;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '#nbCpHex{flex:1;background:#1a1a26;border:1px solid #444;color:#fff;font-size:12px;padding:5px 7px;font-family:monospace;border-radius:0;}' +
      '.nbCpCh{flex:1;text-align:center;}' +
      '.nbCpCh input{width:100%;background:#1a1a26;border:1px solid #444;color:#fff;font-size:12px;padding:4px 2px;text-align:center;border-radius:0;box-sizing:border-box;}' +
      '.nbCpCh label{display:block;font-size:10px;color:#888;margin-top:2px;text-align:center;}' +
      '#nbCpModeBtn{display:flex;flex-direction:column;cursor:pointer;padding:0 3px;line-height:1;gap:2px;align-self:center;}' +
      '#nbCpModeBtn span{font-size:9px;color:#aaa;}' +
      '.nbCpBtns{display:flex;gap:7px;margin-top:6px;}' +
      '.nbCpBtns button{flex:1;padding:6px;font-size:12px;cursor:pointer;border:1px solid #444;background:#2a2a3f;color:#fff;font-family:Poppins,sans-serif;border-radius:0;}' +
      '#nbCpApply{background:#3344bb!important;border-color:#3344bb!important;}';
    document.head.appendChild(cpStyle);

    // add tab CSS
    cpStyle.textContent +=
      '.nbCpTabs{display:flex;gap:0;margin-bottom:10px;}' +
      '.nbCpTab{flex:1;padding:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #444;background:#2a2a3f;color:#888;font-family:Poppins,sans-serif;border-radius:0;text-align:center;}' +
      '.nbCpTab.active{background:#3344bb;color:#fff;border-color:#3344bb;}';

    var cpDiv = document.createElement('div');
    cpDiv.id = 'nbCPicker';
    cpDiv.innerHTML =
      '<div class="nbCpTabs"><button class="nbCpTab active" id="nbCpTabTheme" onclick="nbCpSetTab(\'theme\')">Theme</button><button class="nbCpTab" id="nbCpTabFonts" onclick="nbCpSetTab(\'fonts\')">Fonts</button></div>' +
      '<div id="nbCpColorBar"></div>' +
      '<div id="nbCpGradBox"><div id="nbCpGradFill"></div><div id="nbCpGradDark"></div><div id="nbCpCursor" style="top:30%;left:60%;"></div></div>' +
      '<div id="nbCpHueWrap"><div id="nbCpHueBg"></div><input id="nbCpHueSlider" type="range" min="0" max="360" value="45" step="1"><div id="nbCpHueThumb" style="left:12.5%;background:hsl(45,100%,50%);"></div></div>' +
      '<div class="nbCpRow"><div id="nbCpSwatch" style="background:#d4af37;"></div><div id="nbCpEyedrop" title="Pick colour from screen" onclick="nbCpEyedrop()">&#128449;</div><input id="nbCpHex" type="text" value="#D4AF37" oninput="nbCpHexIn(this.value)"></div>' +
      '<div class="nbCpRow" style="align-items:flex-start;">' +
        '<div class="nbCpCh"><input id="nbCpC1" type="number" min="0" max="255" value="212" oninput="nbCpChIn()"><label id="nbCpL1">R</label></div>' +
        '<div class="nbCpCh"><input id="nbCpC2" type="number" min="0" max="255" value="175" oninput="nbCpChIn()"><label id="nbCpL2">G</label></div>' +
        '<div class="nbCpCh"><input id="nbCpC3" type="number" min="0" max="255" value="55" oninput="nbCpChIn()"><label id="nbCpL3">B</label></div>' +
        '<div id="nbCpModeBtn" onclick="nbCpMode()" title="Switch RGB / HSL"><span>&#9650;</span><span>&#9660;</span></div>' +
      '</div>' +
      '<div class="nbCpBtns"><button onclick="nbCpReset()">Reset</button><button id="nbCpApply" onclick="nbCpApply()">Apply</button></div>';
    document.body.appendChild(cpDiv);

    var cpH=45,cpSx=0.6,cpSy=0.3,cpModeStr='rgb',cpDrag=false,cpDefault='#D4AF37',cpTab='theme';
    function cl(v,a,b){return Math.max(a,Math.min(b,v));}
    function th(n){return Math.round(cl(n,0,255)).toString(16).padStart(2,'0');}
    function hsvRgb(h,s,v){var r,g,b,i=Math.floor(h/60),f=h/60-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-s+s*f);switch(i%6){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break;}return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
    function rgbHsl(r,g,b){r/=255;g/=255;b/=255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h,s,l=(mx+mn)/2;if(mx===mn){h=s=0;}else{var d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}return[Math.round(h*360),Math.round(s*100),Math.round(l*100)];}

    // Apply chosen colour to fonts via injected style tag
    function nbApplyFontColour(r,g,b){
      var hex='#'+th(r)+th(g)+th(b);
      var s=document.getElementById('nbFontColorStyle');
      if(!s){s=document.createElement('style');s.id='nbFontColorStyle';document.head.appendChild(s);}
      // Font colour — scoped to the HERO only, and each selector carries an extra "body "
      // so it always outranks the Theme rule (Fonts wins over Theme, and persists until Reset).
      // ENTIRE hero (container + everything inside it), every page variant. The "body "
      // prefix makes each selector one notch more specific than the Theme rule, so Fonts
      // always wins over Theme and persists until Reset.
      s.textContent=
        'body .hero,body .hero *,body .hero-section,body .hero-section *,'+
        'body .page-hero,body .page-hero *,body .navbar-below-strip,body .navbar-below-strip *'+
        '{color:'+hex+'!important;}';
    }

    // ── UNIVERSAL THEME COLOUR — works on every page, no per-page code needed ──
    function nbApplyThemeColour(r,g,b){
      var s=document.getElementById('nbThemeColorStyle');
      if(!s){s=document.createElement('style');s.id='nbThemeColorStyle';document.head.appendChild(s);}
      var hex='#'+[r,g,b].map(function(v){return('0'+v.toString(16)).slice(-2);}).join('');
      var exact='rgb('+r+','+g+','+b+')';
      // Luminance-based text colour: dark bg → white text, light bg → dark text
      var lum=0.299*r+0.587*g+0.114*b;
      var tc=lum<=160?'#ffffff':'#0d0d1a';
      // Light-mode body tint
      var lr=Math.min(255,220+Math.round(r*0.14)),lg=Math.min(255,215+Math.round(g*0.14)),lb=Math.min(255,210+Math.round(b*0.14));
      var lbg='rgb('+lr+','+lg+','+lb+')';
      s.textContent=
        // CSS variables — for pages that use them (main.html hero gradients etc.)
        ':root{--bg-body:'+exact+';--bg-hero-dark-1:'+exact+';--bg-hero-dark-2:'+exact+
        ';--bg-body-light:'+exact+';--bg-hero-light-1:'+exact+';--bg-hero-light-2:'+exact+
        ';--bg-stats:'+exact+';--bg-stats-light:'+exact+';--accent:'+hex+';--bg:'+exact+';}'+
        // Body backgrounds — EXACT colour in BOTH modes (day mode picks the full colour, not a tint)
        'body:not(.light){background:'+exact+'!important;}body.light{background:'+exact+'!important;}'+
        // Hero section backgrounds — all page variants (.deck-grid-section = the cards area
        // on folder pages, which sits under the strip; theming it unifies the whole hero region)
        '.hero-section,.navbar-below-strip,.page-hero,.hero-area,.hero-banner,.deck-grid-section{background:'+exact+'!important;}'+
        // Stats section background
        '.stats{background:'+exact+'!important;}'+
        // Hero text — luminance-based on the picked colour. Both modes now show the EXACT
        // colour, so the same readable text colour applies in day and night mode.
        // (The Fonts rule "body .hero *" is one notch more specific, so Fonts still wins.)
        '.hero,.hero *,.hero-section,.hero-section *,'+
        '.page-hero,.page-hero *,.navbar-below-strip,.navbar-below-strip *'+
        '{color:'+tc+'!important;}';
    }

    function cpApplyColour(r,g,b){
      if(cpTab==='theme'){
        nbApplyThemeColour(r,g,b);
      } else {
        nbApplyFontColour(r,g,b);
      }
    }

    // Update picker UI only — no colour applied to page
    function cpUpdUI(){
      var rgb=hsvRgb(cpH,cpSx,1-cpSy);
      var hex='#'+th(rgb[0])+th(rgb[1])+th(rgb[2]);
      document.getElementById('nbCpColorBar').style.background=hex;
      document.getElementById('nbCpSwatch').style.background=hex;
      document.getElementById('nbCpHex').value=hex.toUpperCase();
      document.getElementById('nbCpCursor').style.left=(cpSx*100)+'%';
      document.getElementById('nbCpCursor').style.top=(cpSy*100)+'%';
      document.getElementById('nbCpGradFill').style.background='linear-gradient(to right,#fff,hsl('+cpH+',100%,50%))';
      document.getElementById('nbCpHueThumb').style.left=(cpH/360*100)+'%';
      document.getElementById('nbCpHueThumb').style.background='hsl('+cpH+',100%,50%)';
      document.getElementById('nbCpHueSlider').value=cpH;
      if(cpModeStr==='rgb'){document.getElementById('nbCpC1').value=rgb[0];document.getElementById('nbCpC2').value=rgb[1];document.getElementById('nbCpC3').value=rgb[2];}
      else{var hsl=rgbHsl(rgb[0],rgb[1],rgb[2]);document.getElementById('nbCpC1').value=hsl[0];document.getElementById('nbCpC2').value=hsl[1];document.getElementById('nbCpC3').value=hsl[2];}
      return rgb;
    }
    // Update UI AND apply colour to page (only called when user actually moves the picker)
    function cpUpd(){ var rgb=cpUpdUI(); cpApplyColour(rgb[0],rgb[1],rgb[2]); }

    window.nbCpSetTab=function(tab){
      cpTab=tab;
      document.getElementById('nbCpTabTheme').classList.toggle('active',tab==='theme');
      document.getElementById('nbCpTabFonts').classList.toggle('active',tab==='fonts');
    };

    document.getElementById('nbCpHueSlider').addEventListener('input',function(){cpH=parseInt(this.value);cpUpd();});
    var gb=document.getElementById('nbCpGradBox');
    gb.addEventListener('mousedown',function(e){cpDrag=true;cpMv(e);});
    document.addEventListener('mousemove',function(e){if(cpDrag)cpMv(e);});
    document.addEventListener('mouseup',function(){cpDrag=false;});
    function cpMv(e){var rc=document.getElementById('nbCpGradBox').getBoundingClientRect();cpSx=cl((e.clientX-rc.left)/rc.width,0,1);cpSy=cl((e.clientY-rc.top)/rc.height,0,1);cpUpd();}

    window.nbCpHexIn=function(v){v=v.trim();if(/^#?[0-9a-fA-F]{6}$/.test(v)){var h=v.replace('#','');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);document.getElementById('nbCpSwatch').style.background='#'+h;document.getElementById('nbCpColorBar').style.background='#'+h;document.getElementById('nbCpC1').value=r;document.getElementById('nbCpC2').value=g;document.getElementById('nbCpC3').value=b;cpApplyColour(r,g,b);}};
    window.nbCpChIn=function(){var v1=parseInt(document.getElementById('nbCpC1').value)||0,v2=parseInt(document.getElementById('nbCpC2').value)||0,v3=parseInt(document.getElementById('nbCpC3').value)||0;if(cpModeStr==='rgb'){var hex='#'+th(v1)+th(v2)+th(v3);document.getElementById('nbCpSwatch').style.background=hex;document.getElementById('nbCpColorBar').style.background=hex;document.getElementById('nbCpHex').value=hex.toUpperCase();cpApplyColour(v1,v2,v3);}};
    window.nbCpMode=function(){cpModeStr=cpModeStr==='rgb'?'hsl':'rgb';document.getElementById('nbCpL1').textContent=cpModeStr==='rgb'?'R':'H';document.getElementById('nbCpL2').textContent=cpModeStr==='rgb'?'G':'S';document.getElementById('nbCpL3').textContent=cpModeStr==='rgb'?'B':'L';document.getElementById('nbCpC1').max=cpModeStr==='rgb'?255:360;document.getElementById('nbCpC2').max=cpModeStr==='rgb'?255:100;document.getElementById('nbCpC3').max=cpModeStr==='rgb'?255:100;cpUpd();};
    window.nbCpEyedrop=function(){if(window.EyeDropper){new EyeDropper().open().then(function(r){document.getElementById('nbCpHex').value=r.sRGBHex.toUpperCase();window.nbCpHexIn(r.sRGBHex);}).catch(function(){});}else{alert('Eyedropper works in Chrome / Edge only.');}};
    window.nbCpReset=function(){
      // FULL reset to the page's default look (cream in day mode, dark in night mode).
      // Clears BOTH the theme colour and the font colour, on every page.
      var ts=document.getElementById('nbThemeColorStyle'); if(ts) ts.textContent='';
      var fs=document.getElementById('nbFontColorStyle');  if(fs) fs.textContent='';
      // Remove any inline CSS-variable overrides so each page falls back to its own defaults
      var root=document.documentElement;
      ['--bg-body','--bg-hero-dark-1','--bg-hero-dark-2','--bg-body-light',
       '--bg-hero-light-1','--bg-hero-light-2','--bg-stats','--bg-stats-light','--accent','--bg'].forEach(function(v){
        root.style.removeProperty(v);
      });
      // Clear any inline element colour overrides (backward compat with old per-page applyBgColour)
      document.body.style.color='';
      document.querySelectorAll(
        '.hero h1,.hero p,.hero-sub,.hero-tag,.stat-num,.stat-label,.section-title,'+
        '.hero-grid a,.hero-grid .btn-primary,.hero-grid .btn-secondary,.hero-grid .btn-green,'+
        '.platform-card-name,.platform-card-desc'
      ).forEach(function(el){el.style.color='';});
      // Refresh picker UI to reflect reset state, but do NOT re-apply colour
      cpUpdUI();
    };
    window.nbCpApply=function(){document.getElementById('nbCPicker').classList.remove('open');};

    window.nbTriggerColourPanel=function(){
      var picker=document.getElementById('nbCPicker');
      var btn=document.getElementById('colourBtn');
      if(!picker||!btn)return;
      if(picker.classList.contains('open')){picker.classList.remove('open');}
      else{var rc=btn.getBoundingClientRect();picker.style.top=(rc.bottom+8)+'px';picker.style.left=rc.left+'px';picker.classList.add('open');cpUpdUI();}
    };
    document.addEventListener('click',function(e){var picker=document.getElementById('nbCPicker');var btn=document.getElementById('colourBtn');if(picker&&picker.classList.contains('open')&&!picker.contains(e.target)&&e.target!==btn)picker.classList.remove('open');});
    cpUpdUI(); // initialise picker display only — do NOT apply colour on page load
  })();

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

  // ── UNIFORM BODY THEMING — identical on every page (matches main) ──
  // navbar.js owns the body background + base text colour in both modes, so the toggle
  // behaves the same everywhere. Uses the same variables the Colour engine writes
  // (--bg-body / --bg-body-light), falling back to each page's own --bg, then a neutral
  // default. This also gives the slide/invoice pages a proper dark background.
  (function(){
    var s = document.createElement('style');
    s.id = 'nbBodyTheme';
    s.textContent =
      'body:not(.light){background:var(--bg-body, var(--bg, #0d0d28)) !important; color:#e8eaf6 !important;}' +
      'body.light{background:var(--bg-body-light, var(--bg-light, #faf8f4)) !important; color:#1a1a2e !important;}';
    document.head.appendChild(s);
  })();

  function nbSetThemeIcons(isLight) {
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.innerHTML = isLight
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="#d4af37"><path d="M21 12.79A9 9 0 1 1 11.21 3 8.2 8.2 0 0 0 21 12.79z"/></svg>';
  }

  // ── THEME TOGGLE — identical on every page: flip .light, persist, swap icon.
  //    No per-page inline overrides; background/colour come from the CSS above + Colour engine. ──
  window.nbToggleTheme = function() {
    var isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    nbSetThemeIcons(isLight);
  };

  // ── Apply saved theme on page load ──
  (function(){
    var theme = localStorage.getItem('theme') || 'light'; // default = light
    if (theme === 'light') document.body.classList.add('light');
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
  /* 29 Jul 2026: this always sent you to Pitch Decks no matter which section
     you were browsing — search Media Kits from the Media Kits page and you
     landed in Pitch Decks. Now it searches the section you are actually in and
     only falls back to Pitch Decks from pages that have no section of their own. */
  window.nbSearchTarget = function(){
    var here = (location.pathname.split('/').pop() || '').toLowerCase();
    var map = {
      'media_kits_folder_section.html':  'media_kits_folder_section.html',
      'media_kits_slides.html':          'media_kits_folder_section.html',
      'web_kit_folder_file.html':        'web_kit_folder_file.html',
      'web_kit_slides.html':             'web_kit_folder_file.html',
      'career_docs_folder_section.html': 'career_docs_folder_section.html',
      'career_docs_slides.html':         'career_docs_folder_section.html',
      'digital_keynote-folder.html':     'digital_keynote-folder.html',
      'digital_keynote_slides.html':     'digital_keynote-folder.html'
    };
    return map[here] || 'pitch_deck_folder_section.html';
  };
  window.nbDoSearch = function() {
    var q = document.getElementById('navSearchInput').value.trim();
    var target = window.nbSearchTarget();
    window.location = q ? (target + '?q=' + encodeURIComponent(q)) : target;
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
  // Moved out to mic_action.js (loaded via the bridge script-injection below,
  // next to the Google Translate load). Keeps navbar.js lighter and lets the
  // voice assistant be developed/tested in its own file without touching
  // this one. The #vaBtn / #vaGenderBtn markup stays right here, unchanged —
  // only the behavior code moved.
  var micActionScript = document.createElement('script');
  micActionScript.src = 'mic_action.js';
  document.head.appendChild(micActionScript);

  // Typed-chat brain (separate from voice; reuses vaDictionary vocab, chat-tailored replies).
  var chatBrainScript = document.createElement('script');
  chatBrainScript.src = 'chat_brain.js';
  document.head.appendChild(chatBrainScript);

})();
  // ── CUSTOM CURSOR (ported from lazydog studio.html — black "ink" cursor) ──
  // DISABLED per request: the black dot/ring became invisible over dark
  // sections (like the new search widget's black strip) and was reported as
  // irritating. Restoring the default OS cursor site-wide. Left the function
  // intact below (just not invoked) in case a future page-specific
  // reintroduction is wanted — nothing here was deleted, only turned off.
  (function initCursor() {
    return; // disabled — default cursor restored site-wide
    if (!window.matchMedia('(pointer:fine)').matches) return;
    // If a page already ships its own cursor (e.g. the studio page), don't double up.
    if (document.querySelector('.cursor-dot, .ld-cursor-dot')) return;

    var EASE = 'cubic-bezier(0.65,0,0.35,1)';
    var EASE_OUT = 'cubic-bezier(0.16,1,0.3,1)';
    var style = document.createElement('style');
    style.textContent = [
      'body, body * { cursor: none !important; }',
      '.ld-cursor-dot, .ld-cursor-ring {',
      '  position: fixed; top: 0; left: 0;',
      '  pointer-events: none; z-index: 999999;',
      '  border-radius: 50%;',
      '  transform: translate(-50%, -50%);',
      '}',
      '.ld-cursor-dot { width: 6px; height: 6px; background: #16130F;',
      '  transition: width .3s ' + EASE + ', height .3s ' + EASE + ', opacity .3s; }',
      '.ld-cursor-ring {',
      '  width: 32px; height: 32px;',
      '  border: 1px solid #16130F;',
      '  transition: width .5s ' + EASE_OUT + ', height .5s ' + EASE_OUT + ', border-color .3s, background .3s, border-width .3s;',
      '}',
      '.ld-cursor-ring.is-hover { width: 56px; height: 56px; border-width: 1.5px; }',
      '.ld-cursor-ring.is-label { width: 96px; height: 96px; background: #7A2E1F; border-color: #7A2E1F; }',
      '.ld-cursor-label {',
      '  position: fixed; top: 0; left: 0;',
      '  pointer-events: none; z-index: 999999;',
      '  transform: translate(-50%, -50%);',
      "  font-family: 'JetBrains Mono', monospace;",
      '  font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;',
      '  color: #F2EEE5; opacity: 0; transition: opacity .3s;',
      '  text-align: center; white-space: nowrap; font-weight: 500;',
      '}',
      '.ld-cursor-label.is-visible { opacity: 1; }'
    ].join('');
    document.head.appendChild(style);

    var dot = document.createElement('div');   dot.className   = 'ld-cursor-dot';
    var ring = document.createElement('div');  ring.className  = 'ld-cursor-ring';
    var label = document.createElement('div'); label.className = 'ld-cursor-label';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.appendChild(label);

    var mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
    var ringX = mouseX, ringY = mouseY;

    document.addEventListener('mousemove', function(e) {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + 'px';  dot.style.top  = mouseY + 'px';
      label.style.left = mouseX + 'px'; label.style.top = mouseY + 'px';
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    document.addEventListener('mouseover', function(e) {
      var el = e.target.closest('a,button,[data-cursor-label],[onclick],input,select,textarea');
      if (el) {
        var labelText = el.getAttribute('data-cursor-label');
        if (labelText) {
          ring.classList.add('is-label');
          label.textContent = labelText;
          label.classList.add('is-visible');
        } else {
          ring.classList.add('is-hover');
        }
      } else {
        ring.classList.remove('is-hover', 'is-label');
        label.classList.remove('is-visible');
      }
    });
  })();
