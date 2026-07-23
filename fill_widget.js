/* fill_widget.js — "Fill your content" card. Mirrors search_widget.js's card
   (same white/#F4F6FB two-tone, radius 28, shadow, teaser+expand) and drops into
   the EMPTY LEFT slot of #metaSearchRow (flex:1), paired beside the search card.
   Three blocks: Describe content | Load file | Drag design. */
(function () {
  function boot() {
    var row = document.getElementById('metaSearchRow');
    if (!row) return false;
    if (document.getElementById('fillWidget')) return true;

    var style = document.createElement('style');
    style.textContent = `
      #fillWrap { flex:1 1 auto; min-width:0; margin-top:-70px; align-self:flex-start; }
      #fillWidget { width:100%; background:#fff; overflow:hidden; max-height:260px;
        transition:max-height .45s cubic-bezier(.4,0,.2,1); border-radius:28px;
        box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
        font-family:'Inter','Segoe UI',sans-serif; }
      #fillWidget:hover, #fillWidget.locked { max-height:1300px; }
      #fwTeaser { padding:16px 26px; color:#1a1a2e; font-size:14px; font-weight:600;
        font-family:'Poppins',sans-serif; position:relative; }
      #fwTeaser small { display:block; color:#6b7280; font-weight:400; font-size:11.5px; margin-top:3px; font-family:'Inter',sans-serif; }
      #fwLockBtn { position:absolute; top:14px; right:20px; background:#F4F6FB; border:1px solid #e5e8f0;
        border-radius:20px; padding:5px 12px; font-size:11px; font-weight:600; color:#6b7280; cursor:pointer; font-family:'Inter',sans-serif; }
      #fwLockBtn.is-locked { background:rgba(212,175,55,.15); border-color:rgba(212,175,55,.4); color:#8a6d1f; }
      #fillWidget .fw-panels { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); align-items:stretch; min-height:420px; }
      #fillWidget .fw-col { padding:36px 34px; }
      #fillWidget .fw-col:nth-child(1){ background:#fff; }
      #fillWidget .fw-col:nth-child(2){ background:#F4F6FB; border-left:1px solid #e5e8f0; }
      #fillWidget .fw-col:nth-child(3){ background:#fff; border-left:1px solid #e5e8f0; }
      #fillWidget .fw-col h3 { font-size:13px; color:#d4af37; margin:0 0 12px; font-family:'Poppins',sans-serif; }
      #fillWidget textarea { width:100%; box-sizing:border-box; background:#fff; border:1px solid #d8dce6; border-radius:14px;
        padding:12px; min-height:150px; font-size:12.5px; color:#1a1a2e; font-family:'Inter',sans-serif; line-height:1.6; resize:vertical; }
      #fillWidget .fw-drop { width:100%; box-sizing:border-box; border:2px dashed #cbd2e0; border-radius:14px; padding:26px 16px;
        text-align:center; color:#6b7280; font-size:12.5px; cursor:pointer; background:#fff; transition:border-color .2s,background .2s; }
      #fillWidget .fw-drop.drag { border-color:#d4af37; background:rgba(212,175,55,.06); color:#8a6d1f; }
      #fillWidget .fw-note { margin-top:10px; font-size:11.5px; color:#6b7280; }
      #fillWidget .fw-go { margin-top:16px; padding:11px 28px; border-radius:30px; border:none; background:#d4af37;
        color:#1a1200; font-weight:800; cursor:pointer; font-size:13px; font-family:'Poppins',sans-serif; }
      #fillWidget .fw-go:disabled { opacity:.5; cursor:default; }
    `;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'fillWrap';
    wrap.innerHTML =
      '<div id="fillWidget">' +
        '<div id="fwTeaser">✨ Want us to fill this deck with YOUR content?' +
          '<button id="fwLockBtn" type="button" title="Lock open">🔓 Lock open</button>' +
          '<small>Hover to open — paste or upload your content, drag the design, and we build your deck.</small>' +
        '</div>' +
        '<div class="fw-panels">' +
          '<div class="fw-col"><h3>💬 Describe your content</h3>' +
            '<textarea id="fwContent" placeholder="Paste your content here — headings and text for the slides..."></textarea>' +
          '</div>' +
          '<div class="fw-col"><h3>📄 Or load a file</h3>' +
            '<div class="fw-drop" id="fwFileDrop">Click or drop a content file (.txt, .docx)</div>' +
            '<input type="file" id="fwFileInput" accept=".txt,.md,.docx" style="display:none"/>' +
            '<div class="fw-note" id="fwFileNote"></div>' +
          '</div>' +
          '<div class="fw-col"><h3>🎨 Drag your design</h3>' +
            '<div class="fw-drop" id="fwDeckDrop">Drag the deck (.pptx) you want filled</div>' +
            '<input type="file" id="fwDeckInput" accept=".pptx" style="display:none"/>' +
            '<div class="fw-note" id="fwDeckNote"></div>' +
            '<button class="fw-go" id="fwGo" disabled>Prepare my deck →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    row.insertBefore(wrap, row.firstChild);   // LEFT slot, before the search card

    // lock toggle (same behaviour as search card)
    var w = document.getElementById('fillWidget');
    document.getElementById('fwLockBtn').addEventListener('click', function(e){
      e.stopPropagation(); var on=w.classList.toggle('locked'); this.classList.toggle('is-locked', on);
      this.innerHTML = on ? '🔒 Locked' : '🔓 Lock open';
    });

    // Make a design card dragged FROM THE PAGE carry a clean payload, so the
    // "Drag your design" box can accept a site design — not only a local file.
    // A document-level listener means we don't have to touch every page's card
    // renderer; .pd-card is the shared card class.
    document.addEventListener('dragstart', function(e){
      var card = (e.target && e.target.closest) ? e.target.closest('.pd-card') : null;
      if (!card) return;
      var title = (card.querySelector('.pd-card-title') || {}).textContent || 'Selected design';
      var href  = card.getAttribute('href') || '';
      var imgEl = card.querySelector('img'); var thumb = imgEl ? imgEl.src : '';
      var m = href.match(/[?&]firebase=([A-Za-z0-9_-]+)/); var id = m ? m[1] : '';
      try { e.dataTransfer.setData('application/x-ldt-design', JSON.stringify({ id:id, href:href, name:title, thumb:thumb })); } catch(_){}
      try { e.dataTransfer.setData('text/plain', href); } catch(_){}
      try { e.dataTransfer.effectAllowed = 'copyLink'; } catch(_){}
    }, true);

    // wiring
    var deckFile=null, designRef=null, isAdmin=false;
    var goBtn=document.getElementById('fwGo');
    function refresh(){ goBtn.disabled = !isAdmin || !(deckFile || designRef); }
    // Admin-only: filling content + generating a deck is restricted to the admin
    // account. Buyers and visitors see it locked.
    function applyAdmin(){
      refresh();
      var note=document.getElementById('fwAdminNote');
      if(!note && goBtn && goBtn.parentNode){ note=document.createElement('div'); note.id='fwAdminNote'; note.className='fw-note'; note.style.marginTop='8px'; goBtn.parentNode.appendChild(note); }
      if(note){ note.textContent = isAdmin ? '' : '🔒 Only the admin can fill content and generate decks.'; note.style.color = isAdmin ? '' : '#b23a3a'; }
    }
    function wireDrop(dropId, inputId, noteId, cb){
      var d=document.getElementById(dropId), i=document.getElementById(inputId), n=document.getElementById(noteId);
      d.addEventListener('click', function(){ i.click(); });
      d.addEventListener('dragover', function(e){ e.preventDefault(); d.classList.add('drag'); });
      d.addEventListener('dragleave', function(){ d.classList.remove('drag'); });
      d.addEventListener('drop', function(e){ e.preventDefault(); d.classList.remove('drag'); if(e.dataTransfer.files[0]){ i.files=e.dataTransfer.files; cb(e.dataTransfer.files[0], n); } });
      i.addEventListener('change', function(){ if(i.files[0]) cb(i.files[0], n); });
    }
    wireDrop('fwFileDrop','fwFileInput','fwFileNote', function(f,n){
      n.textContent='Loaded: '+f.name;
      var r=new FileReader(); r.onload=function(){ document.getElementById('fwContent').value = String(r.result||'').slice(0,20000); }; r.readAsText(f);
    });

    // The design box: accepts a design DRAGGED FROM THE SITE, or a local .pptx.
    (function wireDesignDrop(){
      var d=document.getElementById('fwDeckDrop'), i=document.getElementById('fwDeckInput'), n=document.getElementById('fwDeckNote');
      function pickFile(f){ deckFile=f; designRef=null; n.textContent='Design file: '+f.name; refresh(); }
      function pickSite(ref){ designRef=ref; deckFile=null; n.textContent='Design from site: '+(ref.name||'selected'); refresh(); }
      d.addEventListener('click', function(){ i.click(); });                 // clicking still lets you upload a .pptx
      d.addEventListener('dragover', function(e){ e.preventDefault(); try{ e.dataTransfer.dropEffect='copy'; }catch(_){} d.classList.add('drag'); });
      d.addEventListener('dragleave', function(){ d.classList.remove('drag'); });
      d.addEventListener('drop', function(e){
        e.preventDefault(); d.classList.remove('drag');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) { i.files=e.dataTransfer.files; pickFile(e.dataTransfer.files[0]); return; }
        var raw = e.dataTransfer.getData('application/x-ldt-design');
        if (raw) { try { pickSite(JSON.parse(raw)); return; } catch(_){} }
        var url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
        if (url) { var m = url.match(/[?&]firebase=([A-Za-z0-9_-]+)/); pickSite({ id: m?m[1]:'', href:url, name:'Selected design' }); return; }
        n.textContent='Drag a design card from the page here, or click to upload a .pptx.';
      });
      i.addEventListener('change', function(){ if(i.files[0]) pickFile(i.files[0]); });
    })();

    goBtn.addEventListener('click', async function(){
      if(!isAdmin){ alert('Only the admin can fill content and generate decks. Please sign in as the admin account.'); return; }
      var content=document.getElementById('fwContent').value.trim();
      // A design chosen FROM THE SITE — there's no local file to stash, just its reference.
      if(designRef){
        try{ localStorage.setItem('lazydog_fill_plan', JSON.stringify({
          deck: designRef.name || 'design', source:'fill_widget', mode:'site-design',
          designId: designRef.id || '', designHref: designRef.href || '', content: content, slides: []
        })); }catch(e){}
        window.location.assign('/editor.html');
        return;
      }
      if(!deckFile){ alert('Drag a design from the page, or drop a .pptx here, first.'); return; }
      goBtn.disabled=true; goBtn.textContent='Preparing…';
      try{
        // stash the deck for the editor (same channel the editor reads)
        await new Promise(function(res,rej){
          var rq=indexedDB.open('lazydog',1);
          rq.onupgradeneeded=function(){ try{ rq.result.createObjectStore('files'); }catch(e){} };
          rq.onsuccess=function(){ var db=rq.result; var tx=db.transaction('files','readwrite'); tx.objectStore('files').put(deckFile,'deck_pptx'); tx.oncomplete=function(){res();}; tx.onerror=function(){rej(tx.error);}; };
          rq.onerror=function(){ rej(rq.error); };
        });
        var plan={ deck:(deckFile.name||'deck').replace(/\.pptx$/i,''), source:'fill_widget', content:content, slides:[] };
        try{ localStorage.setItem('lazydog_fill_plan', JSON.stringify(plan)); }catch(e){}
        window.location.assign('/editor.html');
      }catch(e){ alert('Could not prepare: '+e.message); goBtn.disabled=false; goBtn.textContent='Prepare my deck →'; }
    });
    // Resolve admin status from Firebase auth (reuses the page's app).
    (function checkAdmin(){
      var ADMINS=['javed5395@gmail.com','lazydogtemplates@gmail.com'];
      Promise.all([
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js')
      ]).then(function(m){
        var A=m[0], B=m[1];
        var app = A.getApps().length ? A.getApp() : A.initializeApp({ apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain:"templatehub-16cd7.firebaseapp.com", projectId:"templatehub-16cd7" });
        B.onAuthStateChanged(B.getAuth(app), function(u){
          isAdmin = !!(u && ADMINS.indexOf((((u&&u.email)||'')).toLowerCase())>-1);
          applyAdmin();
        });
      }).catch(function(){ applyAdmin(); });
    })();
    applyAdmin();
    return true;
  }
  var tries=0, t=setInterval(function(){ tries++; if(boot()||tries>100) clearInterval(t); }, 100);
})();
