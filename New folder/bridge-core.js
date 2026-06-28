/* ============================================================
   bridge-core.js  —  CORE ENGINE  ("the brain")
   ------------------------------------------------------------
   Pure logic only: XML parsing helpers, colour resolution,
   SVG rasterization, custGeom path building, and OOXML edit
   primitives. NO buttons, NO layout, NO page-specific UI.

   The UI (editor.html) links this with ONE line:
       <script src="bridge-core.js"></script>
   and calls these functions. Touch this file ONLY to change
   conversion / parsing / export logic — never for UI tweaks.
   ============================================================ */

var A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
var theme = {};   // per-deck colour scheme; the editor fills this on upload

/* ─── namespace-agnostic XML helpers ─── */
function byLocal(p, n){ var o=[], a=p.getElementsByTagName('*'); for(var i=0;i<a.length;i++) if(a[i].localName===n) o.push(a[i]); return o; }
function childLocal(p, n){ if(!p) return null; for(var i=0;i<p.children.length;i++) if(p.children[i].localName===n) return p.children[i]; return null; }
function attrLocal(el, n){ if(!el) return null; for(var i=0;i<el.attributes.length;i++) if(el.attributes[i].localName===n) return el.attributes[i].value; return null; }

/* ─── colour resolution ─── */
function schemeHex(name){
  var alias={tx1:'dk1',bg1:'lt1',tx2:'dk2',bg2:'lt2'}; var k=alias[name]||name;
  if (theme[k]) return theme[k];
  var fb={dk1:'#000000',lt1:'#ffffff',dk2:'#1a1a2e',lt2:'#f5f5f5',accent1:'#6c63ff',accent2:'#e03030',accent3:'#2d6a4f',accent4:'#fca311',accent5:'#0096c7',accent6:'#f77f00'};
  return fb[k]||null;
}
function colorEl(el){
  if(!el) return null;
  if(el.localName==='srgbClr') return '#'+(el.getAttribute('val')||'000000');
  if(el.localName==='sysClr')  return '#'+(el.getAttribute('lastClr')||'000000');
  if(el.localName==='schemeClr') return schemeHex(el.getAttribute('val')||'');
  return null;
}
function fillOf(el){
  if(!el) return null;
  var sf=byLocal(el,'solidFill')[0];
  if(sf&&sf.children[0]){ var c=colorEl(sf.children[0]); if(c) return c; }
  var gf=byLocal(el,'gradFill')[0];
  if(gf){ var gs=byLocal(gf,'gs')[0]; if(gs&&gs.children[0]){ var g=colorEl(gs.children[0]); if(g) return g; } }
  return null;
}
function isDark(hex){
  if(!hex||hex[0]!=='#'||hex.length<7) return false;
  var r=parseInt(hex.substr(1,2),16),g=parseInt(hex.substr(3,2),16),b=parseInt(hex.substr(5,2),16);
  return (0.299*r+0.587*g+0.114*b) < 128;
}

/* ─── SVG → PNG rasterizer (reliable display + Canva-friendly) ─── */
function svgUrlToText(dataUrl){
  try { return decodeURIComponent(escape(atob(dataUrl.split(',')[1]))); }
  catch(e){ try { return atob(dataUrl.split(',')[1]); } catch(e2){ return ''; } }
}
function svgTextToPng(svgText, boxW, boxH){
  return new Promise(function(resolve, reject){
    var scale=2;                                   // 2x for crispness
    var W=Math.max(1,Math.round((boxW||300)*scale));
    var H=Math.max(1,Math.round((boxH||300)*scale));
    var txt=String(svgText||'');
    txt=txt.replace(/<svg([^>]*)>/i, function(m, attrs){
      attrs=attrs.replace(/\s(width|height)\s*=\s*"[^"]*"/gi,'');
      return '<svg'+attrs+' width="'+W+'" height="'+H+'">';
    });
    var blob=new Blob([txt],{type:'image/svg+xml;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var img=new Image();
    img.onload=function(){
      try{
        var cnv=document.createElement('canvas'); cnv.width=W; cnv.height=H;
        cnv.getContext('2d').drawImage(img,0,0,W,H);
        URL.revokeObjectURL(url);
        resolve(cnv.toDataURL('image/png'));
      }catch(err){ URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror=function(e){ URL.revokeObjectURL(url); reject(e); };
    img.src=url;
  });
}

/* ─── DrawingML custGeom → SVG path string (draw real shapes, not boxes) ─── */
function custGeomPath(cg){
  var paths=byLocal(cg,'path'); if(!paths.length) return null;
  var W=parseFloat(paths[0].getAttribute('w')||0)||0, H=parseFloat(paths[0].getAttribute('h')||0)||0;
  var d='';
  for(var pi=0; pi<paths.length; pi++){
    var kids=paths[pi].children;
    for(var i=0;i<kids.length;i++){
      var n=kids[i], L=n.localName, pts=byLocal(n,'pt');
      var P=function(k){ return pts[k].getAttribute('x')+' '+pts[k].getAttribute('y')+' '; };
      if(L==='moveTo') d+='M '+P(0);
      else if(L==='lnTo') d+='L '+P(0);
      else if(L==='cubicBezTo') d+='C '+P(0)+P(1)+P(2);
      else if(L==='quadBezTo') d+='Q '+P(0)+P(1);
      else if(L==='close') d+='Z ';
    }
  }
  return d?{d:d,w:W,h:H}:null;
}

/* ─── OOXML edit primitives (canvas edits → XML) ─── */
function setXfrm(spPr, emuX, emuY, emuW, emuH, rotDeg){
  var doc=spPr.ownerDocument;
  var xf=byLocal(spPr,'xfrm')[0];
  if(!xf){ xf=doc.createElementNS(A_NS,'a:xfrm'); spPr.insertBefore(xf, spPr.firstChild); }
  var off=childLocal(xf,'off'); if(!off){ off=doc.createElementNS(A_NS,'a:off'); xf.insertBefore(off, xf.firstChild); }
  var ext=childLocal(xf,'ext'); if(!ext){ ext=doc.createElementNS(A_NS,'a:ext'); xf.appendChild(ext); }
  off.setAttribute('x', Math.round(emuX)); off.setAttribute('y', Math.round(emuY));
  ext.setAttribute('cx', Math.max(1,Math.round(emuW))); ext.setAttribute('cy', Math.max(1,Math.round(emuH)));
  if(rotDeg){ xf.setAttribute('rot', Math.round(rotDeg*60000)); }
}
function setText(el, newText, align){
  var txBody=childLocal(el,'txBody'); if(!txBody) return;
  var doc=el.ownerDocument;
  var firstR=byLocal(txBody,'r')[0];
  var rPrTpl=firstR?childLocal(firstR,'rPr'):null;
  var ps=byLocal(txBody,'p');
  for(var i=0;i<ps.length;i++) ps[i].parentNode.removeChild(ps[i]);
  var lines=String(newText).split('\n');
  for(var L=0;L<lines.length;L++){
    var p=doc.createElementNS(A_NS,'a:p');
    if(align && align!=='left'){
      var pPr=doc.createElementNS(A_NS,'a:pPr');
      pPr.setAttribute('algn', align==='center'?'ctr':align==='right'?'r':'just');
      p.appendChild(pPr);
    }
    var r=doc.createElementNS(A_NS,'a:r');
    if(rPrTpl) r.appendChild(rPrTpl.cloneNode(true));
    var t=doc.createElementNS(A_NS,'a:t'); t.textContent=lines[L];
    r.appendChild(t);
    p.appendChild(r);
    txBody.appendChild(p);
  }
}
