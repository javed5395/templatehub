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

    // wiring
    var deckFile=null;
    var goBtn=document.getElementById('fwGo');
    function refresh(){ goBtn.disabled = !deckFile; }
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
    wireDrop('fwDeckDrop','fwDeckInput','fwDeckNote', function(f,n){ deckFile=f; n.textContent='Design: '+f.name; refresh(); });

    goBtn.addEventListener('click', async function(){
      var content=document.getElementById('fwContent').value.trim();
      if(!deckFile){ alert('Drag the design deck (.pptx) first.'); return; }
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
    return true;
  }
  var tries=0, t=setInterval(function(){ tries++; if(boot()||tries>100) clearInterval(t); }, 100);
})();
