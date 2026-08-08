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
      /* 30 Jul 2026 — one of three equal cards in #metaSearchRow (was flex:1 1
         auto, which let it swell into whatever the search card left behind). */
      #fillWrap { flex:1 1 0; min-width:0; order:1; margin-top:-70px; align-self:flex-start; }
      @media (max-width:1100px){ #fillWrap { flex:1 1 100%; margin-top:0; } }
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
    // ── TEST PHASE (25 Jul 2026): all locks OPEN. Set TEST_OPEN=false to
    //    restore the admin-only lock on filling content / preparing decks. ──
    var TEST_OPEN = false;   // relocked 25 Jul per Javed
    var deckFile=null, designRef=null, isAdmin=TEST_OPEN;
    var goBtn=document.getElementById('fwGo');
    // ── FIT CHECK state (Gate 1): server-verified capacity verdict + the
    //    CLONE AMENDMENT — buyer may approve adding cloned slides. ──
    var fitInfo=null, allowClone=false;
    function refresh(){
      var blocked = fitInfo && fitInfo.verdict==='too_big' && !allowClone;
      goBtn.disabled = !isAdmin || !(deckFile || designRef) || !!blocked;
    }
    // Admin-only: filling content + generating a deck is restricted to the admin
    // account. Buyers and visitors see it locked.
    function applyAdmin(){
      refresh();
      var note=document.getElementById('fwAdminNote');
      if(!note && goBtn && goBtn.parentNode){ note=document.createElement('div'); note.id='fwAdminNote'; note.className='fw-note'; note.style.marginTop='8px'; goBtn.parentNode.appendChild(note); }
      if(note){ note.textContent = isAdmin ? '' : '🔒 Deck filling is for subscribers — subscriptions coming soon.'; note.style.color = isAdmin ? '' : '#b23a3a'; }
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
      function pickFile(f){ deckFile=f; designRef=null; n.textContent='Design file: '+f.name; refresh(); runFitCheck(); }
      function pickSite(ref){ designRef=ref; deckFile=null; n.textContent='Design from site: '+(ref.name||'selected'); refresh(); runFitCheck(); }
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

    // ════════════════════════════════════════════════════════════════════
    // GATE 1 — LIVE FIT CHECK (25 Jul 2026). When the buyer has BOTH content
    // and a SITE design, ask ai_fill_http (slug mode) for the deterministic
    // fit plan built from the deck's PRIVATE slots map (server-side, no AI
    // cost, codes never leave). Verdicts: fits / fits_with_clones / too_big.
    // CLONE AMENDMENT: on overflow the card offers "+N cloned slides"; only
    // buyer approval ("Go ahead") sets allowClone and unblocks the button.
    // GATE 2: on too_big, the metadata search suggests designs that CAN hold
    // the content. Own-.pptx decks have no slots map → checked after parse
    // (the editor asks the same clone consent there).
    // ════════════════════════════════════════════════════════════════════
    var FIT_URL='https://us-central1-templatehub-16cd7.cloudfunctions.net/ai_fill_http';
    var REC_URL='https://us-central1-templatehub-16cd7.cloudfunctions.net/recommend_http';
    var fitBox=null, _fitTimer=null, _fitSeq=0;
    function fitUI(){
      if(fitBox) return fitBox;
      fitBox=document.createElement('div'); fitBox.id='fwFitNote'; fitBox.className='fw-note';
      fitBox.style.cssText='margin-top:10px;line-height:1.55;display:none;';
      if(goBtn && goBtn.parentNode) goBtn.parentNode.insertBefore(fitBox, goBtn);
      return fitBox;
    }
    function fitMsg(html, color){ var b=fitUI(); b.style.display='block'; b.style.color=color||''; b.innerHTML=html; }
    function suggestBigger(needSlides){
      fetch(REC_URL,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({order:{slides:needSlides},limit:5})})
      .then(function(r){return r.json();})
      .then(function(d){
        var res=(d&&d.results)||[]; if(!res.length||!fitBox) return;
        var div=document.createElement('div'); div.style.marginTop='6px';
        div.innerHTML='<b>Designs that can hold your content:</b><br>';
        res.forEach(function(k){
          var a=document.createElement('a'); a.href=k.url||'#'; a.target='_blank'; a.rel='noopener';
          a.textContent='• '+k.name+(k.slides?' · '+k.slides+' slides':'');
          a.style.cssText='display:block;color:#2b6cb0;text-decoration:underline;font-size:11.5px;margin-top:2px;';
          div.appendChild(a);
        });
        fitBox.appendChild(div);
      }).catch(function(){});
    }
    function runFitCheck(){
      clearTimeout(_fitTimer);
      _fitTimer=setTimeout(function(){
        fitInfo=null; allowClone=false; refresh();
        var content=document.getElementById('fwContent').value.trim();
        if(!content){ if(fitBox)fitBox.style.display='none'; return; }
        if(deckFile){ fitMsg('📐 Your own file’s capacity is measured when it opens — if your content needs extra slides, you’ll be asked before we clone them.','#6b7280'); return; }
        if(!(designRef&&designRef.id)){ if(fitBox)fitBox.style.display='none'; return; }
        var seq=++_fitSeq;
        fitMsg('📐 Checking if your content fits this design…','#6b7280');
        fetch(FIT_URL,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({design:String(designRef.id),content:content})})
        .then(function(r){return r.json();})
        .then(function(plan){
          if(seq!==_fitSeq) return;
          if(!plan||plan.error||!plan.verdict){ fitMsg('📐 No capacity map for this design — fit will be confirmed when it opens.','#6b7280'); return; }
          var clones=Math.max(0,(plan.final_slides||0)-(plan.base_slides||0));
          var extra=(plan.unplaced||[]).length;
          fitInfo={verdict:plan.verdict,clones:clones,extra:extra};
          if(plan.verdict==='fits'){ fitMsg('🟢 Your content fits this design perfectly.', '#1b7f3e'); }
          else if(plan.verdict==='fits_with_clones'){
            fitInfo.extra=clones; allowClone=true;   /* splitting inside capacity = designed behaviour */
            fitMsg('🟡 Fits — your text is rich, so '+clones+' slide'+(clones===1?'':'s')+' will be cloned to give it room.', '#8a6d1f');
          } else { /* too_big */
            var need=Math.max(extra,1); fitInfo.extra=need;
            fitMsg('🔴 Your content needs about <b>'+need+' extra slide'+(need===1?'':'s')+'</b> beyond this design’s capacity.'
              +'<br>Our system can <b>clone '+need+' matching slide'+(need===1?'':'s')+'</b> and fill your content into them.'
              +' <button id="fwCloneOk" type="button" style="margin-top:6px;background:#1b7f3e;color:#fff;border:0;border-radius:16px;padding:5px 14px;font-size:11.5px;font-weight:700;cursor:pointer;">✔ Go ahead — add '+need+' slide'+(need===1?'':'s')+'</button>', '#b23a3a');
            var ok=document.getElementById('fwCloneOk');
            if(ok) ok.addEventListener('click',function(){
              allowClone=true; refresh();
              fitMsg('🟢 Approved — '+need+' slide'+(need===1?'':'s')+' will be cloned and filled with your content.', '#1b7f3e');
            });
            var slidesTotal=(plan.final_slides||plan.base_slides||0)+need;
            suggestBigger(slidesTotal);
          }
          refresh();
        })
        .catch(function(){ if(seq===_fitSeq) fitMsg('📐 Fit check unreachable — it will run again when the deck opens.','#6b7280'); });
      },600);
    }
    document.getElementById('fwContent').addEventListener('input', runFitCheck);

    // Stash the actual deck bytes so the editor can PARSE and FILL it.
    // Same DB the editor reads: db 'lazydog', store 'files', key 'deck_pptx'.
    function ldStashDeck(blob){
      return new Promise(function(res){
        try{
          var r=indexedDB.open('lazydog',1);
          r.onupgradeneeded=function(){ try{ r.result.createObjectStore('files'); }catch(e){} };
          r.onsuccess=function(){ try{ var tx=r.result.transaction('files','readwrite');
            tx.objectStore('files').put(blob,'deck_pptx');
            tx.oncomplete=function(){res(true);}; tx.onerror=function(){res(false);};
          }catch(e){res(false);} };
          r.onerror=function(){res(false);};
        }catch(e){res(false);}
      });
    }

    goBtn.addEventListener('click', async function(){
      if(!isAdmin){
        alert('Filling a deck with your content is a subscriber feature.\n\n'
            + 'Subscriptions are coming soon. In the meantime you can still\n'
            + 'generate up to 8 slides free from the designer.');
        return;
      }
      if(!(deckFile || designRef)){ alert('Drag a design from the page, or drop a .pptx here, first.'); return; }
      var content=document.getElementById('fwContent').value.trim();
      var designName = (designRef && designRef.name) ? designRef.name
                     : (deckFile ? String(deckFile.name||'').replace(/\.pptx$/i,'') : '');

      goBtn.disabled=true; goBtn.textContent='Preparing…';

      // FILL, NOT COMPOSE. Save the real design file, then hand design + content
      // to HEXA. Hexa opens the editor (no ?compose), and the editor fills THIS
      // design with the user's content. The card never talks to the engine.
      if (deckFile) { try { await ldStashDeck(deckFile); } catch(e){} }

      // Design dragged FROM THE PAGE: find its Google Drive .pptx id in Firestore
      // so the editor can fetch & fill the real file (no local upload needed).
      var pptxFileId='', pptxUrl='';
      if (designRef && designRef.id) {
        try {
          var A = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
          var F = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
          var app = A.getApps().length ? A.getApp() : A.initializeApp({ apiKey:"AIzaSyDIiOl6apoPuzpHxcamNsUQcDrt1AIVOes", authDomain:"templatehub-16cd7.firebaseapp.com", projectId:"templatehub-16cd7" });
          // 28 Jul 2026: reads `templates` ONLY. The old fallback also read
          // `kits`, which holds encoded_raw (every private metadata code) —
          // that collection is now closed to the browser. `templates` is the
          // public doc and already carries pptxUrl / driveFileIds.
          var db = F.getFirestore(app), data=null;
          /* F10 REGRESSION FIX (29 Jul 2026): pptxUrl and driveFileIds were moved
             OUT of the public `templates` doc into the private `templates_files`
             collection, because the public doc handed every paid kit's download
             link to anyone with a browser. This lookup still read the public doc
             and so came back empty. Read the private companion first (admins can
             read it; nobody else can), and fall back to the public doc for kits
             uploaded before the move. */
          try { var snap = await F.getDoc(F.doc(db, 'templates', designRef.id)); if (snap.exists()) data = snap.data(); } catch(_){}
          var priv = null;
          try { var psnap = await F.getDoc(F.doc(db, 'templates_files', designRef.id)); if (psnap.exists()) priv = psnap.data(); } catch(_){}
          if (data || priv) {
            data = data || {};
            pptxUrl    = (priv && priv.pptxUrl) || data.pptxUrl || '';
            pptxFileId = (priv && priv.driveFileIds && priv.driveFileIds.pptx) ||
                         (data.driveFileIds && data.driveFileIds.pptx) || '';
            if (!pptxFileId && pptxUrl) { var mm = pptxUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || pptxUrl.match(/\/d\/([a-zA-Z0-9_-]+)/); pptxFileId = mm ? mm[1] : ''; }
          }
        } catch(e){}
        if (!pptxFileId) { goBtn.disabled=false; goBtn.textContent='Prepare my deck →';
          alert("Couldn't find this design's editable file. Try dropping the .pptx directly."); return; }
      }

      var payload = {
        content: content,
        deck: designName || 'design',
        designId: (designRef&&designRef.id)||'', designHref:(designRef&&designRef.href)||'',
        pptxFileId: pptxFileId, pptxUrl: pptxUrl,
        mode: designRef ? 'site-design' : (deckFile ? 'file' : 'content'),
        editorUrl: 'editor.html',
        fit: (fitInfo&&fitInfo.verdict)||'', allowClone: allowClone,
        extraSlides: (fitInfo&&fitInfo.extra)||0
      };
      // ONE CHAIN OF COMMAND (25 Jul 2026): the card speaks ONLY to Hexa, and
      // Hexa alone commands the editor. No direct card→editor fallback — two
      // command paths would leave the editor unsure whose order to obey. If
      // Hexa isn't loaded, the card stops and says so instead of improvising.
      if (typeof window.hexaPrepare === 'function') {
        var _res = window.hexaPrepare(payload);
        if (_res && _res.ok === false) {   /* GATE 3 — Hexa refused the order */
          goBtn.disabled=false; goBtn.textContent='Prepare my deck →';
          alert('Hexa: ' + (_res.reason || 'this order cannot be prepared as-is.'));
        }
        return;
      }
      goBtn.disabled=false; goBtn.textContent='Prepare my deck →';
      alert("Hexa isn't loaded on this page, and only Hexa may command the editor. Please refresh the page (Hexa loads with the navbar) and try again.");
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
          isAdmin = TEST_OPEN || !!(u && ADMINS.indexOf((((u&&u.email)||'')).toLowerCase())>-1);
          applyAdmin();
        });
      }).catch(function(){ applyAdmin(); });
    })();
    applyAdmin();
    return true;
  }
  var tries=0, t=setInterval(function(){ tries++; if(boot()||tries>100) clearInterval(t); }, 100);
})();


/* ══════════════════════════════════════════════════════════════════════════
   APPEND-ONLY PATCH LOG — fill_widget.js
   House rule (Javed, 7 Aug 2026): nothing above this line is deleted or
   rewritten. Every change is a NEW timestamped block appended here. To undo a
   patch, delete only its own block — the original still works.
   ══════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   PATCH 2026-08-07 22:05 UTC · Opus · BUG No. 11
   "Prepare my deck" does absolutely nothing — no message, no error, no result.

   THE CAUSE IS NOT WHAT THE NOTE ASSUMED, and the difference matters.
   The click handler DOES have a text-only guard (line ~255 above:
       if(!(deckFile || designRef)){ alert('Drag a design from the page, or drop
                                     a .pptx here, first.'); return; }
   …but it is UNREACHABLE. refresh() (line ~106) sets:
       goBtn.disabled = !isAdmin || !(deckFile || designRef) || !!blocked;
   and TEST_OPEN is false, so on a fresh page isAdmin starts false and no design
   has been chosen. The button is therefore DISABLED — and a disabled button
   fires no click event at all. Nothing runs, so nothing can speak. That is the
   exact "absolutely nothing" the tester saw.

   There are THREE different reasons it can be disabled, and the visitor was
   shown none of them:
     1. not signed in / not entitled  — deck filling is a subscriber feature
     2. no design chosen              — nothing to fill
     3. fit check says "too_big"      — content will not fit the chosen deck

   THIS BLOCK does not unlock anything and does not touch the disabled logic —
   the subscriber lock stays exactly as it is. It only makes the button HONEST:
     · A transparent shield sits over the button, so a click on the disabled
       control is still heard.
     · Every click now produces a specific, visible message saying which of the
       three reasons is blocking it, and what to do about it.
     · The genuine text-only path the note asked for: if content has been typed
       but no design chosen, Hexa offers to BUILD a deck from that content
       instead (editor.html?compose=…), which is the flow that actually exists
       for content-without-a-design. One click, no dead end.
     · If both boxes are empty, it says so instead of staying mute.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  var PATCH = '2026-08-07 22:05 UTC · bug 11';

  function install() {
    var goBtn = document.getElementById('fwGo');
    if (!goBtn || goBtn.dataset.ldHonest) return false;
    goBtn.dataset.ldHonest = '1';

    /* a disabled button swallows pointer events; let them through to a shield */
    var st = document.createElement('style');
    st.textContent =
      '#fwGo:disabled{pointer-events:none;}' +
      '#fwGoShield{display:inline-block;}' +
      '#fwWhyNote{margin-top:10px;font-size:12px;line-height:1.55;color:#8a3b3b;' +
        'font-family:Inter,sans-serif;}' +
      '#fwWhyNote a{display:inline-block;margin-top:8px;padding:8px 16px;border-radius:24px;' +
        'background:#d4af37;color:#1a1200;font-weight:800;text-decoration:none;font-size:12px;}';
    document.head.appendChild(st);

    var shield = document.createElement('span');
    shield.id = 'fwGoShield';
    goBtn.parentNode.insertBefore(shield, goBtn);
    shield.appendChild(goBtn);

    var note = document.createElement('div');
    note.id = 'fwWhyNote';
    shield.parentNode.insertBefore(note, shield.nextSibling);

    function say(html) { note.innerHTML = html; }

    shield.addEventListener('click', function () {
      if (!goBtn.disabled) { say(''); return; }   /* real click runs as normal */

      var contentEl = document.getElementById('fwContent');
      var content = contentEl ? String(contentEl.value || '').trim() : '';
      var deckNote = (document.getElementById('fwDeckNote') || {}).textContent || '';
      var hasDesign = !!deckNote.trim();
      var lockNote = (document.getElementById('fwAdminNote') || {}).textContent || '';
      var locked = /subscriber/i.test(lockNote);

      /* 1. locked */
      if (locked) {
        say('🔒 <strong>Filling a deck with your content is a subscriber feature</strong> — ' +
            'subscriptions are coming soon, so this button is switched off for now. ' +
            (content
              ? 'You can still build a deck from the content you have typed, free, up to 8 slides:' +
                buildLink(content)
              : 'You can still build a deck free from the designer — type your content above and I will offer it here.'));
        return;
      }

      /* 2. content typed, no design chosen — the text-only path */
      if (content && !hasDesign) {
        say('This card <strong>fills an existing design</strong> with your words, so it needs a design to fill — ' +
            'drag one from the page, or drop a .pptx into the box above. ' +
            '<br>If you would rather I just <strong>build</strong> a deck around what you have written, ' +
            'that works right now:' + buildLink(content));
        return;
      }

      /* 3. nothing at all */
      if (!content && !hasDesign) {
        say('Nothing to work with yet — <strong>paste your content on the left</strong> ' +
            '(or load a .txt/.docx), and <strong>drag the design you want filled</strong> into the box above. ' +
            'Then this button comes to life.');
        return;
      }

      /* 4. design chosen but the fit check is blocking */
      if (hasDesign && !content) {
        say('Add the content you want in the deck first — paste it into the box on the left, ' +
            'or load a .txt/.docx file.');
        return;
      }

      say('This cannot run yet — the content does not fit the design you chose. ' +
          'Shorten it, or pick a design with more slides, and the button will unlock.');
    }, true);

    function buildLink(content) {
      var href = 'editor.html?compose=' + encodeURIComponent(content.slice(0, 600));
      return '<br><a href="' + href + '">Build a deck from my content →</a>';
    }

    /* clear the message as soon as they act on it */
    ['fwContent', 'fwDeckDrop', 'fwFileDrop'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { say(''); });
      if (el) el.addEventListener('drop', function () { say(''); });
    });

    try { console.log('[fill_widget patch] ' + PATCH + ' installed'); } catch (e) {}
    return true;
  }

  var n = 0, t = setInterval(function () { n++; if (install() || n > 150) clearInterval(t); }, 100);
})();
