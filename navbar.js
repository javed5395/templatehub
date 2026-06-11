(function() {

  // ── INJECT AUTH MODAL + FIREBASE ──
  var authHTML = `
<style>
  .auth-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:2000; backdrop-filter:blur(6px); align-items:center; justify-content:center; }
  .auth-overlay.open { display:flex; }
  .auth-modal { background:#0f1030; border:1px solid rgba(212,175,55,0.2); border-radius:24px; padding:36px; width:100%; max-width:420px; box-shadow:0 30px 80px rgba(0,0,0,0.6); font-family:'Poppins',sans-serif; position:relative; animation:modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes modalIn { from{opacity:0;transform:scale(0.88) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);} }
  .auth-modal-close { position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.08); border:none; color:#888; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; }
  .auth-modal-close:hover { background:rgba(255,255,255,0.15); color:#fff; }
  .auth-modal h2 { font-size:24px; font-weight:900; margin-bottom:6px; color:#fff; }
  .auth-modal p { font-size:13px; color:#8899aa; margin-bottom:28px; }
  .auth-tabs { display:flex; gap:6px; margin-bottom:24px; background:rgba(255,255,255,0.05); border-radius:12px; padding:4px; }
  .auth-tab { flex:1; padding:9px; border-radius:9px; border:none; background:none; color:#8899aa; font-size:13px; font-weight:600; cursor:pointer; font-family:'Poppins',sans-serif; }
  .auth-tab.active { background:linear-gradient(90deg,#5b7fff,#b464ff); color:#fff; }
  .auth-field { margin-bottom:16px; }
  .auth-field label { display:block; font-size:12px; font-weight:600; color:#8899aa; margin-bottom:6px; }
  .auth-field input { width:100%; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 16px; color:#fff; font-size:14px; font-family:'Poppins',sans-serif; outline:none; }
  .auth-field input:focus { border-color:#5b7fff; }
  .auth-error { color:#ff6666; font-size:12px; margin-bottom:14px; min-height:18px; }
  .auth-submit { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#5b7fff,#b464ff); color:#fff; font-size:15px; font-weight:800; cursor:pointer; font-family:'Poppins',sans-serif; box-shadow:0 8px 24px rgba(91,127,255,0.35); }
  .auth-name-field { display:none; }
  .auth-name-field.show { display:block; }
  .nb-user-menu { display:none; align-items:center; gap:8px; position:relative; margin-left:6px; }
  .nb-user-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#5b7fff,#b464ff); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; cursor:pointer; font-family:'Poppins',sans-serif; border:2px solid rgba(255,255,255,0.2); }
  .nb-user-name { font-size:13px; font-weight:600; color:#c8d2dc; font-family:'Poppins',sans-serif; }
  .nb-user-dropdown { display:none; position:absolute; top:48px; right:0; background:#0f1030; border:1px solid rgba(212,175,55,0.2); border-radius:12px; padding:8px; min-width:160px; box-shadow:0 12px 40px rgba(0,0,0,0.4); z-index:999; }
  .nb-user-dropdown a, .nb-user-dropdown button { display:block; width:100%; text-align:left; padding:9px 14px; color:#c8d2dc; font-size:13px; background:none; border:none; cursor:pointer; border-radius:8px; font-family:'Poppins',sans-serif; text-decoration:none; }
  .nb-user-dropdown a:hover, .nb-user-dropdown button:hover { background:rgba(212,175,55,0.08); color:#d4af37; }
  .nb-signout-btn { color:#ff6666!important; }
</style>
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

  // ── INJECT NAVBAR HTML ──
  var navHTML = `
<style>
  #sharedNav {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 80px; background: rgba(255,255,255,0.92);
    border-bottom: 1px solid rgba(0,0,0,0.08);
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 1px 8px rgba(0,0,0,0.07);
    transition: background 0.45s ease, border-color 0.45s ease;
  }
  body.light #sharedNav {
    background: rgba(255,255,255,0.97);
    border-bottom: 1px solid rgba(0,0,0,0.07);
    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
  }
  #sharedNav .nb-logo {
    font-size: 26px; font-weight: 900;
    background: linear-gradient(90deg, #64c8ff, #b464ff);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px; font-family: 'Poppins', sans-serif;
    text-decoration: none;
  }
  body.light #sharedNav .nb-logo {
    background: linear-gradient(90deg, #1a4ab5, #6a0dad);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  #sharedNav .nb-links { display: flex; align-items: center; gap: 16px; }
  .nb-lang { background:none; border:none; cursor:pointer; font-size:14px; color:#444; font-family:'Poppins',sans-serif; display:flex; align-items:center; gap:5px; padding:6px 4px; border-radius:6px; transition:color 0.2s; position:relative; font-weight:500; }
  .nb-lang:hover { color:#111; }
  .nb-lang-panel { display:none; position:fixed; z-index:600; background:#fff; border-radius:12px; box-shadow:0 8px 40px rgba(0,0,0,0.15); padding:20px 24px; width:480px; }
  .nb-lang-panel.open { display:block; animation:langSlide 0.2s ease; }
  @keyframes langSlide { from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);} }
  .nb-lang-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; }
  .nb-lang-item { display:flex; align-items:center; gap:10px; padding:11px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#333; font-family:'Poppins',sans-serif; transition:background 0.15s; }
  .nb-lang-item:hover { background:none; color:#2255dd; }
  .nb-lang-item.active { color:#e03030; font-weight:600; }
  .nb-lang-flag { width:26px; height:18px; border-radius:2px; object-fit:cover; flex-shrink:0; }
  .nb-pro { background:none; border:none; cursor:pointer; font-size:14px; color:#444; font-family:'Poppins',sans-serif; padding:6px 4px; border-radius:6px; transition:color 0.2s; font-weight:500; }
  .nb-pro:hover { color:#111; }
  .nb-edit { background:#fff; color:#5b7fff; border:1.5px solid #5b7fff; padding:7px 18px; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; font-family:'Poppins',sans-serif; transition:all 0.2s; }
  .nb-edit:hover { background:#5b7fff; color:#fff; }
  #sharedNav .nb-signin {
    color: #333; background: none; border: none;
    padding: 8px 4px; font-size: 14px; border-radius: 6px;
    font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer;
    transition: all 0.2s;
  }
  #sharedNav .nb-signin:hover { color: #e03030; }
  #sharedNav .nb-signup {
    background: #fff; color: #e03030;
    border: 1.5px solid #e03030;
    padding: 7px 18px; border-radius: 6px;
    font-weight: 600; font-size: 14px; cursor: pointer;
    font-family: 'Poppins', sans-serif;
    transition: all 0.2s;
  }
  #sharedNav .nb-signup:hover { background: #e03030; color: #fff; }
  body.has-download #sharedNav .nb-links { margin-right: 110px; }
  #sharedNav .nb-theme {
    background: #0f1030; border: 1.5px solid rgba(212,175,55,0.4);
    color: #d4af37; width: 42px; height: 42px; border-radius: 50%;
    font-size: 18px; cursor: pointer; transition: all 0.3s;
    display: flex; align-items: center; justify-content: center;
    margin-left: 6px; flex-shrink: 0;
  }
  body.light #sharedNav .nb-theme { background: #fff; border-color: rgba(212,175,55,0.5); }
  #sharedNav .nb-theme:hover { background: rgba(212,175,55,0.1); transform: rotate(20deg); }
  #nbRightSidebar {
    position: fixed; right: 0; top: 55px; bottom: 0;
    z-index: 99; display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 14px 8px;
    background: rgba(10,10,32,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(212,175,55,0.2);
    border-right: none; border-top: none; border-radius: 0;
    box-shadow: -4px 0 20px rgba(0,0,0,0.25);
    overflow-y: auto; overflow-x: hidden;
    scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.3) transparent;
    transition: background 0.45s ease;
  }
  #nbRightSidebar::-webkit-scrollbar { width: 3px; }
  #nbRightSidebar::-webkit-scrollbar-track { background: transparent; }
  #nbRightSidebar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 4px; }
  body.light #nbRightSidebar { background: #ffffff; border-color: rgba(212,175,55,0.3); box-shadow: -4px 0 20px rgba(0,0,0,0.1); }
  .nb-sb-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .nb-sb-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.25s; border: none; flex-shrink: 0; }
  .nb-sb-btn:hover { transform: scale(1.12); }
  .nb-sb-label { font-size: 9px; font-weight: 600; color: #8899aa; font-family: 'Poppins', sans-serif; letter-spacing: 0.3px; }
  body.light .nb-sb-label { color: #999; }
  .nb-sb-home { background: rgba(100,200,255,0.12); border: 1.5px solid rgba(100,200,255,0.3) !important; color: #64c8ff; font-size: 18px; text-decoration: none; }
  body.light .nb-sb-home { background: rgba(26,74,181,0.08); border-color: rgba(26,74,181,0.25) !important; color: #1a4ab5; }
  .nb-sb-font { background: linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-size:14px; font-weight:900; font-family:'Georgia',serif; }
  .nb-sb-colour { background: conic-gradient(red,yellow,lime,cyan,blue,magenta,red); }
  .nb-sb-divider { width: 24px; height: 1px; background: rgba(212,175,55,0.2); margin: 2px 0; }
  .nb-sb-theme { background: #0f1030; border: 1.5px solid rgba(212,175,55,0.4) !important; color: #d4af37; font-size: 18px; }
  body.light .nb-sb-theme { background: #fff; border-color: rgba(212,175,55,0.5) !important; }
  .nb-sb-mic { background: rgba(224,48,48,0.15); border: 1.5px solid rgba(224,48,48,0.4) !important; color: #e03030; font-size: 16px; }
  .nb-sb-mic.va-listening { background: #e03030 !important; color: #fff !important; animation: vaPulse 0.8s infinite alternate; }
  @keyframes vaPulse { from{box-shadow:0 0 0 0 rgba(224,48,48,0.6);}to{box-shadow:0 0 0 8px rgba(224,48,48,0);} }
  #vaBubble { position:fixed; right:60px; bottom:80px; max-width:220px; background:#0f1030; border:1px solid rgba(212,175,55,0.25); border-radius:12px 12px 0 12px; padding:10px 14px; font-size:12px; color:#c8d2dc; font-family:'Poppins',sans-serif; z-index:400; opacity:0; transform:translateX(10px); transition:opacity 0.3s,transform 0.3s; pointer-events:auto; line-height:1.5; }
  body.light #vaBubble { background:#ffffff; border-color:rgba(212,175,55,0.3); color:#333; }
  .nav-search-icon { background:none;border:none;color:#444;font-size:18px;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0; }
  .nav-search-icon:hover { color:#111;background:rgba(0,0,0,0.06); }
  body.light .nav-search-icon { color:#444; }
  body.light .nav-search-icon:hover { color:#111;background:rgba(0,0,0,0.06); }
  .nav-search-panel { position:fixed;top:55px;left:0;right:0;z-index:499;background:#ffffff;border-bottom:1px solid rgba(0,0,0,0.08);box-shadow:0 6px 24px rgba(0,0,0,0.10);max-height:0;overflow:hidden;transition:max-height 1.20s cubic-bezier(0.4,0,0.2,1),opacity 1.00s ease;opacity:0; }
  body:not(.light) .nav-search-panel { background:#0d0d28;border-bottom-color:rgba(255,255,255,0.08);box-shadow:0 6px 24px rgba(0,0,0,0.4); }
  .nav-search-panel.open { max-height:90px;opacity:1; }
  .nav-search-panel-inner { display:flex;align-items:center;padding:16px 120px;gap:12px; }
  .ns-icon-left { color:#aaa;font-size:17px;flex-shrink:0; }
  body:not(.light) .ns-icon-left { color:rgba(255,255,255,0.35); }
  .nav-search-panel input { flex:1;background:transparent;border:none;outline:none;color:#1a1a2e;font-size:17px;font-family:'Poppins',sans-serif;padding:4px 0; }
  body:not(.light) .nav-search-panel input { color:#ffffff; }
  .nav-search-panel input::placeholder { color:#bbb; }
  body:not(.light) .nav-search-panel input::placeholder { color:rgba(255,255,255,0.3); }
  .nav-search-mic { background:none;border:none;cursor:pointer;padding:7px;border-radius:50%;color:#aaa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0; }
  .nav-search-mic:hover { color:#5b7fff;background:rgba(91,127,255,0.08); }
  body:not(.light) .nav-search-mic { color:rgba(255,255,255,0.4); }
  .nav-search-mic.listening { color:#e03030!important;animation:micPulse 0.8s infinite alternate; }
  @keyframes micPulse { from{opacity:1;}to{opacity:0.3;} }
  .nav-search-send { width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#5b7fff,#b464ff);display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0; }
  .nav-search-send:hover { transform:scale(1.1); }
  .nav-search-close { background:none;border:none;cursor:pointer;padding:7px;color:#aaa;font-size:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;margin-left:8px; }
  body:not(.light) .nav-search-close { color:rgba(255,255,255,0.4); }
  body:not(.light) .nav-search-close:hover { color:#fff;background:rgba(255,255,255,0.1); }
</style>
<nav id="sharedNav">
  <a href="main.html" class="nb-logo">TemplateHub</a>
  <div class="nb-links">
    <button class="nav-search-icon" id="navSearchBtn" onclick="nbOpenSearch()" title="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></button>
    <button class="nb-lang" id="nbLangBtn" onmouseenter="nbShowLang()" onmouseleave="nbLangLeaveBtn()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> <span id="nbLangLabel">English</span></button>
    <button class="nb-pro">Pro Plans</button>
    <button class="nb-edit" onclick="(function(){ if(typeof openEditPopup==='function') openEditPopup(); else window.open('edit_section.html','_blank'); })()">✏️ Edit</button>
    <button class="nb-signin" id="signinBtn" onclick="openAuth('signin')">Sign In</button>
    <button class="nb-signup" id="signupBtn" onclick="openAuth('signup')">Sign Up</button>
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
<div id="nbRightSidebar">
  <div class="nb-sb-wrap">
    <a class="nb-sb-btn nb-sb-home" id="nbSidebarHome" href="main.html" title="Go to Home">🏠</a>
    <span class="nb-sb-label">Home</span>
  </div>
  <div class="nb-sb-divider"></div>
  <div class="nb-sb-wrap">
    <button class="nb-sb-btn nb-sb-font" id="fontBtn" onclick="toggleFontPanel&&toggleFontPanel()" title="Pick font">Aa</button>
    <span class="nb-sb-label">Font</span>
  </div>
  <div class="nb-sb-divider"></div>
  <div class="nb-sb-wrap">
    <button class="nb-sb-btn nb-sb-theme" id="themeBtn" onclick="nbToggleTheme()" title="Toggle Light/Dark Mode">🌙</button>
    <span class="nb-sb-label">Theme</span>
  </div>
  <div class="nb-sb-divider"></div>
  <div class="nb-sb-wrap">
    <button class="nb-sb-btn nb-sb-colour" id="colourBtn" onclick="toggleColourPanel&&toggleColourPanel()" title="Pick colour"></button>
    <span class="nb-sb-label">Colour</span>
  </div>
  <div class="nb-sb-divider"></div>
  <div class="nb-sb-wrap">
    <button class="nb-sb-btn nb-sb-mic" id="vaBtn" onclick="toggleVoiceAssistant()" title="Voice Assistant">🎤</button>
    <span class="nb-sb-label">Voice</span>
  </div>
</div>
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
      // Revert to English: clear cookie + storage + reload
      localStorage.removeItem('nb_lang');
      var exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=;' + exp;
      document.cookie = 'googtrans=;' + exp + ' domain=.' + window.location.hostname;
      window.location.reload();
      return;
    }
    document.getElementById('nbLangLabel').textContent = label;
    localStorage.setItem('nb_lang', JSON.stringify({code:code, label:label}));
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
  // Hide the GT banner bar that appears at the top
  var gtStyle = document.createElement('style');
  gtStyle.textContent = '.goog-te-banner-frame,.goog-te-balloon-frame,#goog-gt-tt{display:none!important;}' +
    'body{top:0!important;} .skiptranslate{display:none!important;}';
  document.head.appendChild(gtStyle);
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
  gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  gtScript.async = true;
  document.head.appendChild(gtScript);

  document.body.insertAdjacentHTML('beforeend', sidebarHTML);

  // ── INJECT HELP BOT ──
  var helpbotHTML = `
<style>
  .nb-sb-helpbot { position:fixed; bottom:6px; right:0; z-index:1000; width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg,#5b7fff,#b464ff); border:none; color:#fff; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; animation:botPulse 2.5s infinite; transition:transform 0.3s; }
  .nb-sb-helpbot:hover { transform:scale(1.1); }
  @keyframes botPulse { 0%,100%{box-shadow:0 4px 14px rgba(91,127,255,0.5);}50%{box-shadow:0 4px 22px rgba(91,127,255,0.8);} }
  .helpbot-panel { display:none; position:fixed; bottom:88px; right:24px; z-index:1000; width:320px; background:#ffffff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,0.18); font-family:'Poppins',sans-serif; overflow:hidden; animation:botSlide 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .helpbot-panel.open { display:block; }
  @keyframes botSlide { from{opacity:0;transform:translateY(20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);} }
  .helpbot-header { background:linear-gradient(135deg,#5b7fff,#b464ff); padding:16px 18px; display:flex; align-items:center; gap:12px; }
  .helpbot-avatar { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
  .helpbot-title { color:#fff; font-size:14px; font-weight:700; }
  .helpbot-sub { color:rgba(255,255,255,0.75); font-size:11px; margin-top:2px; }
  .helpbot-close { margin-left:auto; background:rgba(255,255,255,0.2); border:none; color:#fff; width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .helpbot-body { padding:16px; max-height:340px; overflow-y:auto; }
  .helpbot-greeting { font-size:13px; color:#555; margin-bottom:14px; line-height:1.6; }
  .helpbot-greeting span { font-weight:700; color:#1a1a2e; }
  .helpbot-qs { display:flex; flex-direction:column; gap:8px; }
  .helpbot-q { background:#f5f5ff; border:1.5px solid rgba(91,127,255,0.15); border-radius:12px; padding:10px 14px; font-size:12px; font-weight:600; color:#3a3a6a; cursor:pointer; text-align:left; transition:all 0.2s; }
  .helpbot-q:hover { background:rgba(91,127,255,0.08); border-color:rgba(91,127,255,0.4); color:#5b7fff; }
  .helpbot-answer { display:none; background:#f9f9ff; border-radius:12px; padding:12px 14px; font-size:12px; color:#444; line-height:1.7; margin-top:10px; border-left:3px solid #5b7fff; }
  .helpbot-answer.show { display:block; animation:fadeIn 0.2s ease; }
  .helpbot-back { margin-top:10px; font-size:11px; color:#5b7fff; cursor:pointer; display:inline-block; }
  .helpbot-back:hover { text-decoration:underline; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
</style>
<button class="nb-sb-helpbot" id="helpbotBtn" onclick="toggleBot()" title="Need help?">💬</button>
<div class="helpbot-panel" id="helpbotPanel">
  <div class="helpbot-header">
    <div class="helpbot-avatar">🤖</div>
    <div><div class="helpbot-title">TemplateHub Assistant</div><div class="helpbot-sub">Ask me anything ✦</div></div>
    <button class="helpbot-close" onclick="toggleBot()">✕</button>
  </div>
  <div class="helpbot-body" id="helpbotBody">
    <div class="helpbot-greeting">Hi there! 👋 I'm <span>TemplateHub Assistant</span>. What can I help you with today?</div>
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
    "Reach us at <strong>javed5395@gmail.com</strong> — we typically respond within 24 hours. You can also visit <strong>www.templatehub.com</strong> for updates."
  ];
  var botOpen = false;
  window.toggleBot = function(){ botOpen=!botOpen; var p=document.getElementById('helpbotPanel'),b=document.getElementById('helpbotBtn'); if(botOpen){p.classList.add('open');b.textContent='✕';}else{p.classList.remove('open');b.textContent='💬';goBack();} };
  window.showAnswer = function(i){ document.getElementById('helpbotQs').style.display='none'; var a=document.getElementById('helpbotAnswer'); a.innerHTML=ANSWERS[i]; a.classList.add('show'); document.getElementById('helpbotBack').style.display='inline-block'; };
  window.goBack = function(){ document.getElementById('helpbotQs').style.display='flex'; var a=document.getElementById('helpbotAnswer'); a.classList.remove('show'); a.innerHTML=''; document.getElementById('helpbotBack').style.display='none'; };

  // ── THEME TOGGLE ──
  window.nbToggleTheme = function() {
    var body = document.body;
    var btn  = document.getElementById('themeBtn');
    if (body.classList.contains('light')) {
      body.classList.remove('light');
      body.style.background = '';
      if (btn) btn.textContent = '🌙';
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.add('light');
      body.style.background = '#faf8f4';
      if (btn) btn.textContent = '☀️';
      localStorage.setItem('theme', 'light');
    }
  };
  (function(){ if(localStorage.getItem('theme')==='light'){ document.body.classList.add('light'); document.body.style.background='#faf8f4'; var b=document.getElementById('themeBtn'); if(b)b.textContent='☀️'; } })();

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
      vaRecognition.onerror = function() { vaListening = false; if(btn) btn.classList.remove('va-listening'); };
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
