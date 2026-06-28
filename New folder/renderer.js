/* ============================================================
   renderer.js  —  SLIDE RENDERER  (draws a slide onto fabric)
   ------------------------------------------------------------
   Reads a slide's XML (via the brain helpers in bridge-core.js)
   and draws it onto the shared fabric canvas `fc`.
   Uses globals from editor.html (fc, slides, slideSize, cur)
   and from bridge-core.js (byLocal, fillOf, svgTextToPng, …).

   This is "how a slide is drawn." Touch it for rendering logic,
   not for layout/buttons (those live in editor.html).
   ============================================================ */

async function render(idx){
  var s=slides[idx]; if(!s) return;
  var doc=s.doc;
  var images=s.images;
  var sx=fc.getWidth()/slideSize.w, sy=fc.getHeight()/slideSize.h;
  function toX(e){ return parseFloat(e||0)*sx; }
  function toY(e){ return parseFloat(e||0)*sy; }
  function toFont(z){ return Math.max(8, Math.round((parseFloat(z||1800)/100)*12700*sx)); }

  var bg='#ffffff', bgEl=byLocal(doc,'bg')[0];
  if(bgEl){ var c=fillOf(bgEl); if(c) bg=c; }
  var bgDark=isDark(bg);

  fc.clear();
  fc.setBackgroundColor(bg, fc.renderAll.bind(fc));

  var spTree=byLocal(doc,'spTree')[0];
  if(!spTree){ fc.renderAll(); return; }

  function readXfrmEMU(spPr){
    var res={x:0,y:0,w:0,h:0,rot:0,flipH:false,flipV:false};
    var xf=byLocal(spPr,'xfrm')[0]; if(!xf) return res;
    var off=childLocal(xf,'off'), ext=childLocal(xf,'ext');
    if(off){ res.x=parseFloat(off.getAttribute('x')||0); res.y=parseFloat(off.getAttribute('y')||0); }
    if(ext){ res.w=parseFloat(ext.getAttribute('cx')||0); res.h=parseFloat(ext.getAttribute('cy')||0); }
    var rot=xf.getAttribute('rot'); if(rot) res.rot=parseFloat(rot)/60000;
    if(xf.getAttribute('flipH')==='1') res.flipH=true;
    if(xf.getAttribute('flipV')==='1') res.flipV=true;
    return res;
  }
  function emuPos(spPr,T){
    var r=readXfrmEMU(spPr);
    var X=r.x*T.sx+T.tx, Y=r.y*T.sy+T.ty;
    return { x:toX(X), y:toY(Y), w:toX(r.w*T.sx), h:toY(r.h*T.sy), rot:r.rot, flipH:r.flipH, flipV:r.flipV };
  }

  function blipImage(spPr){
    var bf=childLocal(spPr,'blipFill'); if(!bf) return null;
    var blip=byLocal(bf,'blip')[0]; if(!blip) return null;
    var rId=attrLocal(blip,'embed');
    var opacity=1;
    var amf=byLocal(blip,'alphaModFix')[0]; if(amf){ var amt=amf.getAttribute('amt'); if(amt) opacity=parseInt(amt)/100000; }
    if(!rId){ var sv=byLocal(blip,'svgBlip')[0]; if(sv) rId=attrLocal(sv,'embed'); }
    if(!rId||!images[rId]) return null;
    return { img:images[rId], opacity:opacity };
  }
  function drawImageObj(img, p, opacity){
    img.set({ left:p.x, top:p.y, angle:p.rot, opacity:opacity });
    if(p.w>0 && p.h>0 && img.width && img.height){ img.scaleX = p.w/img.width; img.scaleY = p.h/img.height; }
    if(p.flipH) img.flipX=true;
    if(p.flipV) img.flipY=true;
    fc.add(img);
  }
  function loadRaster(url){ return new Promise(function(res){ fabric.Image.fromURL(url,function(im){res(im);},{crossOrigin:'anonymous'}); }); }

  function buildText(txBody, p){
    var paras=byLocal(txBody,'p'), lines=[], fontPx=18, bold=false, italic=false, fill=null, align='left', got=false;
    for(var pi=0;pi<paras.length;pi++){
      var pPr=childLocal(paras[pi],'pPr');
      if(pPr){ var a=pPr.getAttribute('algn'); if(a==='ctr') align='center'; else if(a==='r') align='right'; else if(a==='just') align='justify'; }
      var runs=byLocal(paras[pi],'r'), line='';
      for(var ri=0;ri<runs.length;ri++){
        var rPr=childLocal(runs[ri],'rPr'), t=childLocal(runs[ri],'t');
        if(t) line+=t.textContent;
        if(rPr && !got){
          var sz=rPr.getAttribute('sz'); if(sz) fontPx=toFont(sz);
          if(rPr.getAttribute('b')==='1') bold=true;
          if(rPr.getAttribute('i')==='1') italic=true;
          var c=fillOf(rPr); if(c) fill=c;
          if(t && t.textContent) got=true;
        }
      }
      lines.push(line);
    }
    var text=lines.join('\n').replace(/\s+$/,'');
    if(!text.trim()) return null;
    if(!fill) fill = bgDark ? '#ffffff' : '#000000';
    return new fabric.Textbox(text,{
      left:p.x, top:p.y, width:Math.max(40,p.w||200),
      fontSize:Math.max(8,fontPx), fontWeight:bold?'bold':'normal', fontStyle:italic?'italic':'normal',
      fill:fill, textAlign:align, fontFamily:'Segoe UI, sans-serif', angle:p.rot, editable:true
    });
  }

  async function renderSp(node, T){
    var spPr=childLocal(node,'spPr'), txBody=childLocal(node,'txBody');
    var p=emuPos(spPr,T);
    var bi=blipImage(spPr);
    if(bi && p.w>0 && p.h>0){
      try{
        var src = bi.img.url;
        if(bi.img.ext==='svg'){
          src = await svgTextToPng(bi.img.text || svgUrlToText(bi.img.url), p.w, p.h);
        }
        var obj = await loadRaster(src);
        obj._el=node; obj._kind='image'; obj._slide=cur;
        drawImageObj(obj, p, bi.opacity);
      }catch(err){ console.warn('image failed', err); }
    } else {
      var col=fillOf(spPr);
      var cg=byLocal(spPr,'custGeom')[0];
      if(cg && p.w>0 && p.h>0){
        var cp=custGeomPath(cg);
        if(cp && cp.d){
          var pth=new fabric.Path(cp.d,{ left:p.x, top:p.y, originX:'left', originY:'top', fill: col||'#888888', angle:p.rot });
          if(pth.width>0 && pth.height>0){ pth.scaleX=p.w/pth.width; pth.scaleY=p.h/pth.height; pth.left=p.x; pth.top=p.y; pth.setCoords(); }
          pth._el=node; pth._kind='shape'; pth._slide=cur;
          fc.add(pth);
          if(txBody){ var tcg=buildText(txBody,p); if(tcg){ tcg._el=node; tcg._kind='text'; tcg._slide=cur; fc.add(tcg); } }
          return;
        }
      }
      if(col && p.w>0 && p.h>0){
        var geom=byLocal(spPr,'prstGeom')[0], prst=geom?geom.getAttribute('prst'):'rect';
        var common={left:p.x,top:p.y,fill:col,angle:p.rot};
        var sh;
        if(prst==='ellipse') sh=new fabric.Ellipse(Object.assign(common,{rx:p.w/2,ry:p.h/2}));
        else if(prst==='roundRect') sh=new fabric.Rect(Object.assign(common,{width:p.w,height:p.h,rx:Math.min(p.w,p.h)*0.12,ry:Math.min(p.w,p.h)*0.12}));
        else sh=new fabric.Rect(Object.assign(common,{width:p.w,height:p.h}));
        sh._el=node; sh._kind='shape'; sh._slide=cur;
        fc.add(sh);
      }
    }
    if(txBody){ var tb=buildText(txBody,p); if(tb){ tb._el=node; tb._kind='text'; tb._slide=cur; fc.add(tb); } }
  }

  function groupTransform(node, T){
    var gPr=childLocal(node,'grpSpPr');
    var xf=gPr?byLocal(gPr,'xfrm')[0]:null;
    if(!xf) return { sx:T.sx, tx:T.tx, sy:T.sy, ty:T.ty };
    var off=childLocal(xf,'off'), ext=childLocal(xf,'ext'), chOff=childLocal(xf,'chOff'), chExt=childLocal(xf,'chExt');
    if(!(off&&ext&&chOff&&chExt)) return { sx:T.sx, tx:T.tx, sy:T.sy, ty:T.ty };
    var ox=parseFloat(off.getAttribute('x')||0), oy=parseFloat(off.getAttribute('y')||0);
    var ecx=parseFloat(ext.getAttribute('cx')||1), ecy=parseFloat(ext.getAttribute('cy')||1);
    var cox=parseFloat(chOff.getAttribute('x')||0), coy=parseFloat(chOff.getAttribute('y')||0);
    var ccx=parseFloat(chExt.getAttribute('cx')||1)||1, ccy=parseFloat(chExt.getAttribute('cy')||1)||1;
    var lsx=ecx/ccx, lsy=ecy/ccy;
    var ltx=ox-cox*lsx, lty=oy-coy*lsy;
    return { sx:T.sx*lsx, tx:T.sx*ltx+T.tx, sy:T.sy*lsy, ty:T.sy*lty+T.ty };
  }

  // ── <pic> real pictures ──
  async function renderPic(node, T){
    var spPr=childLocal(node,'spPr'), blipFill=childLocal(node,'blipFill');
    var p=emuPos(spPr,T);
    if(!blipFill || !(p.w>0 && p.h>0)) return;
    var blip=byLocal(blipFill,'blip')[0]; if(!blip) return;
    var rId=attrLocal(blip,'embed');
    if(!rId){ var sv=byLocal(blip,'svgBlip')[0]; if(sv) rId=attrLocal(sv,'embed'); }
    if(!rId || !images[rId]) return;
    var im=images[rId];
    try{
      var src=im.url;
      if(im.ext==='svg') src=await svgTextToPng(im.text||svgUrlToText(im.url), p.w, p.h);
      var obj=await loadRaster(src);
      obj._el=node; obj._kind='image'; obj._slide=cur;
      drawImageObj(obj, p, 1);
    }catch(err){ console.warn('pic failed', err); }
  }

  // ── <cxnSp> connectors / lines ──
  function renderCxn(node, T){
    var spPr=childLocal(node,'spPr');
    var p=emuPos(spPr,T);
    var ln=byLocal(spPr,'ln')[0];
    var col=ln?fillOf(ln):null;
    var sw=2; if(ln){ var w=ln.getAttribute('w'); if(w) sw=Math.max(1, toX(parseFloat(w))); }
    var x1=p.x,y1=p.y,x2=p.x+p.w,y2=p.y+p.h;
    if(p.flipH){ var t=x1; x1=x2; x2=t; }
    if(p.flipV){ var t2=y1; y1=y2; y2=t2; }
    var line=new fabric.Line([x1,y1,x2,y2],{stroke:col||'#888888',strokeWidth:sw});
    line._el=node; line._kind='shape'; line._slide=cur;
    fc.add(line);
  }

  // ── tables ──
  function renderTable(tbl, base){
    var gridCols=byLocal(tbl,'gridCol'), colW=[];
    for(var g=0;g<gridCols.length;g++) colW.push(parseFloat(gridCols[g].getAttribute('w')||0));
    var totalW=colW.reduce(function(a,b){return a+b;},0)||1;
    var rows=byLocal(tbl,'tr'), rowEmu=[], sum=0;
    for(var r=0;r<rows.length;r++){ var h=parseFloat(rows[r].getAttribute('h')||0); rowEmu.push(h); sum+=h; }
    if(sum<=0){ for(var r2=0;r2<rows.length;r2++) rowEmu[r2]=1; sum=rows.length||1; }
    var yCur=base.y;
    for(var r3=0;r3<rows.length;r3++){
      var rowH=base.h*(rowEmu[r3]/sum);
      var cells=byLocal(rows[r3],'tc'), xCur=base.x;
      for(var c=0;c<cells.length;c++){
        var cwpx=base.w*(colW[c]||0)/totalW, cell=cells[c];
        var cellFill=fillOf(childLocal(cell,'tcPr'));
        fc.add(new fabric.Rect({left:xCur,top:yCur,width:cwpx,height:rowH,fill:cellFill||'rgba(0,0,0,0)',stroke:'#cccccc',strokeWidth:1,selectable:false,evented:false}));
        var cbody=childLocal(cell,'txBody');
        if(cbody){ var tb=buildText(cbody,{x:xCur+4,y:yCur+4,w:cwpx-8,h:rowH,rot:0}); if(tb){ tb.set({fontSize:Math.min(tb.fontSize,16)}); tb._el=cell; tb._kind='text'; tb._slide=cur; fc.add(tb); } }
        xCur+=cwpx;
      }
      yCur+=rowH;
    }
  }

  // ── <graphicFrame>: table | chart | SmartArt | other ──
  function renderGraphicFrame(node, T){
    var xf=byLocal(node,'xfrm')[0], base={x:0,y:0,w:0,h:0};
    if(xf){ var off=childLocal(xf,'off'),ext=childLocal(xf,'ext');
      var ex=off?parseFloat(off.getAttribute('x')||0):0, ey=off?parseFloat(off.getAttribute('y')||0):0;
      var ew=ext?parseFloat(ext.getAttribute('cx')||0):0, eh=ext?parseFloat(ext.getAttribute('cy')||0):0;
      base={ x:toX(ex*T.sx+T.tx), y:toY(ey*T.sy+T.ty), w:toX(ew*T.sx), h:toY(eh*T.sy) };
    }
    var tbl=byLocal(node,'tbl')[0];
    if(tbl){ renderTable(tbl, base); return; }
    if(base.w>0 && base.h>0){
      var gd=byLocal(node,'graphicData')[0], uri=gd?(gd.getAttribute('uri')||''):'';
      var kind = uri.indexOf('chart')>-1?'Chart': uri.indexOf('diagram')>-1?'SmartArt':'Object';
      var boxFr=new fabric.Rect({left:base.x,top:base.y,width:base.w,height:base.h,fill:'rgba(120,120,150,0.12)',stroke:'#8a8aa8',strokeDashArray:[6,4],strokeWidth:1});
      boxFr._el=node; boxFr._kind='shape'; boxFr._slide=cur; fc.add(boxFr);
      fc.add(new fabric.Textbox('▦ '+kind+' — kept in file',{left:base.x+6,top:base.y+6,width:Math.max(60,base.w-12),fontSize:12,fill:'#8a8aa8',fontFamily:'Segoe UI, sans-serif',selectable:false,evented:false}));
    }
  }

  async function walk(parent, T){
    for(var i=0;i<parent.children.length;i++){
      var node=parent.children[i], L=node.localName;
      if(L==='sp') await renderSp(node, T);
      else if(L==='pic') await renderPic(node, T);
      else if(L==='cxnSp') renderCxn(node, T);
      else if(L==='graphicFrame') renderGraphicFrame(node, T);
      else if(L==='grpSp') await walk(node, groupTransform(node, T));
      else if(L==='AlternateContent'){            // SmartArt / fancy content fallback
        var fb=childLocal(node,'Fallback')||childLocal(node,'Choice');
        if(fb) await walk(fb, T);
      }
    }
  }

  await walk(spTree, { sx:1, tx:0, sy:1, ty:0 });
  fc.renderAll();
}
