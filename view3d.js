/* 3D 盤面（Three.js r128）。ロジックには触らず、st を読んで描くだけ。
   角色：Q 版動物（toon 著色＋反轉外殼描邊），跳躍採用 預備→伸展→擠壓 的動畫原則。
   特效由「狀態差異」推導（金額、地主、等級、出局），所以連線另一端也看得到。 */
const view3d=(()=>{
  const HAS=typeof THREE!=='undefined';
  const P_COL=[0xFF6B57,0x4D9DE0,0xA56BFF,0x2FB57A];
  const TINT=[0xFFE6E1,0xDFEDFB,0xEEE4FF,0xDDF5EA];
  const GCOL={'粉':0xF7A1C4,'橘':0xFFA25B,'黃':0xF2D45C,'綠':0x7ED3A3,'藍':0x5FC9C9,'紫':0xC39BF2,'金':0xF2C14E};
  const RINGS={quick:{cols:4,rows:8},classic:{cols:6,rows:12}};
  const PAPER=0xFFF4DE, PAPER_DIM=0xEFE2C8, HOT=0xFFF8E0, INK=0x2B2420, GOLD=0xF2C14E;
  const TOP=.14;                                   // 地塊上表面高度
  const STEP_MS=250, HOP_MS=240, LEAP_MS=780, DICE_MS=1150;
  const ANIMALS=[
    {kind:'cat', fur:0xF6C56B, light:0xFFF3DA, ear:0xF6C56B, inner:0xF7A1A1, nose:0xE77B8B},
    {kind:'dog', fur:0xF3E6CF, light:0xFFFFFF, ear:0xB7835A, inner:0xB7835A, nose:0x3A2A24},
    {kind:'fox', fur:0xF08A3C, light:0xFFF6EA, ear:0xF08A3C, inner:0xFFF6EA, nose:0x3A2A24},
    {kind:'bear',fur:0xA8744F, light:0xE8CBA3, ear:0xA8744F, inner:0xE8CBA3, nose:0x3A2A24},
  ];
  const RM=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

  let renderer=null,scene,camera,controls,root,fxRoot,wrap,labelsEl,midEl;
  let tilesM=[],labels=[],tokens=[],props=[],builtKey='',raf=0,W=0,H=0,frame=0,lastT=0;
  let webgl=null, homeTarget=null, homeOffset=null, dice=[], diceShadows=[], diceAnim=null, popEl=null, popTile=-1, camLerp=null, downAt=null;
  let lastRender=0, touchT=0, camSig=null, dbgCam=null, restoreDist=false, parts=[], floats=[], tileFx=[], settleWaiters=[], seenRollId=0, camIntro=null, celebrate=null, lastPhase='', baseMoney=null, midKey='';
  const UP=HAS?new THREE.Vector3(0,1,0):null;
  // BoxGeometry の面順: +x,-x,+y,-y,+z,-z → 目 1,6,2,5,3,4（向かい合う面の和が 7）
  const FACE_VAL=[1,6,2,5,3,4];
  const FACE_N=HAS?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(a=>new THREE.Vector3(...a)):[];

  function ok(){
    if(!HAS||typeof THREE.OrbitControls==='undefined') return false;
    if(webgl==null){ try{ const c=document.createElement('canvas'); webgl=!!(c.getContext('webgl')||c.getContext('experimental-webgl')); }catch(e){ webgl=false; } }
    return webgl;
  }
  function ring(){ return RINGS[st.mode]; }
  function cell(i){
    const {cols,rows}=ring();
    if(i<cols) return {r:0,c:i};
    if(i<cols+rows-2) return {r:i-cols+1,c:cols-1};
    if(i<2*cols+rows-2){ const k=i-(cols+rows-2); return {r:rows-1,c:cols-1-k}; }
    const k=i-(2*cols+rows-2); return {r:rows-2-k,c:0};
  }
  function posOf(i){ const {cols,rows}=ring(); const {r,c}=cell(i); return {x:c-(cols-1)/2, z:r-(rows-1)/2}; }
  function outer(i){
    const {cols,rows}=ring(); const {r,c}=cell(i);
    if(r===0) return {x:0,z:-1}; if(c===cols-1) return {x:1,z:0}; if(r===rows-1) return {x:0,z:1}; return {x:-1,z:0};
  }
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const easeIO=u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  const easeOut=u=>1-Math.pow(1-u,3);
  const elastic=u=>u<=0?0:u>=1?1:Math.pow(2,-10*u)*Math.sin((u*10-.75)*(2*Math.PI)/3)+1;

  /* ---------- 材質・幾何快取 ---------- */
  let GRAD=null, OUTLINE=null, SHADOW_TEX=null;
  const TOON={}, BASIC={}, SPH={};
  const lin=c=>new THREE.Color(c).convertSRGBToLinear();
  function toonMat(c){ return TOON[c]||(TOON[c]=new THREE.MeshToonMaterial({color:lin(c),gradientMap:GRAD})); }
  function basicMat(c,o){ const k=c+':'+(o||1); return BASIC[k]||(BASIC[k]=new THREE.MeshBasicMaterial({color:lin(c),transparent:o!=null,opacity:o==null?1:o,side:THREE.DoubleSide})); }
  function sph(r,a,b){ const k=r+':'+(a||14); return SPH[k]||(SPH[k]=new THREE.SphereGeometry(r,a||14,b||10)); }
  // 部件：toon 網格 + 反轉外殼描邊（子物件，會繼承縮放）
  function part(parent,geo,color,pos,scale,opt){
    opt=opt||{};
    const m=new THREE.Mesh(geo,opt.basic?basicMat(color):toonMat(color));
    if(pos) m.position.set(pos[0],pos[1],pos[2]); if(scale) m.scale.set(scale[0],scale[1],scale[2]); if(opt.rot) m.rotation.set(opt.rot[0],opt.rot[1],opt.rot[2]);
    parent.add(m);
    if(opt.ol!==false){ const o=new THREE.Mesh(geo,OUTLINE); o.scale.setScalar(1+(opt.ol||.1)); m.add(o); }
    return m;
  }
  function roundedBox(w,h,d,r,s){
    const g=new THREE.BoxGeometry(w,h,d,s,s,s), p=g.attributes.position, n=g.attributes.normal, v=new THREE.Vector3(), c=new THREE.Vector3(), dir=new THREE.Vector3();
    const hx=w/2-r, hy=h/2-r, hz=d/2-r;
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i); c.set(clamp(v.x,-hx,hx),clamp(v.y,-hy,hy),clamp(v.z,-hz,hz));
      dir.subVectors(v,c); if(dir.lengthSq()<1e-12) dir.fromBufferAttribute(n,i); dir.normalize();
      p.setXYZ(i,c.x+dir.x*r,c.y+dir.y*r,c.z+dir.z*r); n.setXYZ(i,dir.x,dir.y,dir.z);
    }
    p.needsUpdate=true; n.needsUpdate=true; return g;
  }
  function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); t.anisotropy=4; t.colorSpace=THREE.SRGBColorSpace; return t; }
  function initShared(){
    const d=new Uint8Array([90,175,255]); GRAD=new THREE.DataTexture(d,3,1,THREE.RedFormat);
    GRAD.minFilter=GRAD.magFilter=THREE.NearestFilter; GRAD.generateMipmaps=false; GRAD.needsUpdate=true;
    OUTLINE=new THREE.MeshBasicMaterial({color:lin(INK),side:THREE.BackSide});
    SHADOW_TEX=canvasTex(64,64,(g,w)=>{ const r=g.createRadialGradient(32,32,2,32,32,32); r.addColorStop(0,'rgba(0,0,0,.42)'); r.addColorStop(.6,'rgba(0,0,0,.18)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,w,w); });
  }
  function blobShadow(size){ const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:SHADOW_TEX,transparent:true,depthWrite:false})); m.rotation.x=-Math.PI/2; return m; }

  /* ---------- Q 版動物 ---------- */
  function makeAnimal(pi,small){
    const A=ANIMALS[pi%4], R=new THREE.Group(), P={root:R};
    // 身體
    const body=new THREE.Group(); R.add(body); P.body=body;
    part(body,sph(.12),A.fur,[0,.13,0],[1,.95,.9]);
    part(body,sph(.075),A.light,[0,.12,.072],[1,1,.45],{ol:false});
    P.feet=[-1,1].map(s=>part(body,sph(.046),A.fur,[s*.066,.034,.035],[1,.7,1.25],{ol:.14}));
    P.arms=[-1,1].map(s=>part(body,sph(.04),A.fur,[s*.118,.15,.03],[1,1.15,1],{ol:.14}));
    if(pi>=0){ // 圍巾（玩家色）
      part(body,new THREE.TorusGeometry(.088,.026,8,22),P_COL[pi],[0,.218,0],null,{rot:[Math.PI/2,0,0],ol:.12});
      part(body,sph(.032),P_COL[pi],[.055,.2,.075],[1,.8,.7],{ol:.14});
    }
    // 尾巴
    const tail=new THREE.Group(); tail.position.set(0,.1,-.1); body.add(tail); P.tail=tail;
    if(A.kind==='cat'){ const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.05,-.09),new THREE.Vector3(.03,.15,-.1),new THREE.Vector3(.02,.2,-.05)]); part(tail,new THREE.TubeGeometry(c,12,.022,6),A.fur,null,null,{ol:.3}); }
    else if(A.kind==='fox'){ part(tail,sph(.07),A.fur,[0,.06,-.08],[.75,.75,1.55],{rot:[-.8,0,0]}); part(tail,sph(.045),A.light,[0,.13,-.15],[1,1,1.1]); }
    else if(A.kind==='dog'){ part(tail,new THREE.ConeGeometry(.028,.12,8),A.ear,[0,.06,-.02],null,{rot:[-.7,0,0],ol:.2}); }
    else part(tail,sph(.036),A.fur,[0,.01,-.01]);
    // 頭
    const head=new THREE.Group(); head.position.y=.335; R.add(head); P.head=head;
    part(head,sph(.155,18,14),A.fur,[0,0,0],[1.08,.95,1],{ol:.07});
    part(head,sph(.07),A.light,[0,-.048,.118],[1.3,.85,.8],{ol:false});
    part(head,sph(.022),A.nose,[0,-.025,.185],[1.2,.9,1],{ol:false,basic:true});
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.017,.0045,4,10,Math.PI),basicMat(INK)); smile.position.set(0,-.062,.172); smile.rotation.z=Math.PI; head.add(smile);
    if(A.kind==='dog') part(head,sph(.045),A.ear,[.06,.02,.126],[1,1,.3],{ol:false});
    P.eyes=[-1,1].map(s=>{ const e=new THREE.Group(); e.position.set(s*.06,.016,.136); head.add(e);
      const b=new THREE.Mesh(sph(.026,10,8),basicMat(INK)); b.scale.set(1,1.15,.6); e.add(b);
      const hl=new THREE.Mesh(sph(.009,6,4),basicMat(0xFFFFFF)); hl.position.set(.008,.012,.014); e.add(hl); return e; });
    P.happy=[-1,1].map(s=>{ const h=new THREE.Mesh(new THREE.TorusGeometry(.021,.0065,5,12,Math.PI),basicMat(INK)); h.position.set(s*.06,.01,.142); h.visible=false; head.add(h); return h; });
    [-1,1].forEach(s=>part(head,sph(.03),0xFF9AA8,[s*.1,-.038,.112],[1.3,.8,.45],{ol:false,basic:true}));
    // 耳朵
    P.ears=[-1,1].map(s=>{ const g=new THREE.Group(); head.add(g);
      if(A.kind==='cat'){ g.position.set(s*.085,.12,-.005); g.rotation.z=-s*.35; part(g,new THREE.ConeGeometry(.058,.11,4),A.ear,[0,.03,0],null,{rot:[0,Math.PI/4,0],ol:.12}); part(g,new THREE.ConeGeometry(.032,.07,4),A.inner,[0,.022,.02],null,{rot:[0,Math.PI/4,0],ol:false}); }
      else if(A.kind==='fox'){ g.position.set(s*.085,.13,-.01); g.rotation.z=-s*.3; part(g,new THREE.ConeGeometry(.06,.15,4),A.ear,[0,.045,0],null,{rot:[0,Math.PI/4,0],ol:.12}); part(g,new THREE.ConeGeometry(.03,.09,4),A.inner,[0,.03,.022],null,{rot:[0,Math.PI/4,0],ol:false}); part(g,new THREE.ConeGeometry(.024,.04,4),INK,[0,.108,0],null,{rot:[0,Math.PI/4,0],ol:false}); }
      else if(A.kind==='dog'){ g.position.set(s*.14,.03,-.01); g.rotation.z=s*.4; part(g,sph(.06),A.ear,[0,-.04,0],[.55,1.3,.9],{ol:.12}); }
      else { g.position.set(s*.1,.115,-.02); part(g,sph(.05),A.ear,[0,0,0],[1,1,.6],{ol:.12}); part(g,sph(.028),A.inner,[0,0,.02],[1,1,.4],{ol:false}); }
      return g; });
    // 汗滴（難過時）
    const sweat=new THREE.Mesh(sph(.022,8,6),basicMat(0x8FD3FF)); sweat.scale.set(.8,1.3,.8); sweat.position.set(.14,.07,.07); sweat.visible=false; head.add(sweat); P.sweat=sweat;
    if(small) R.scale.setScalar(small);
    return P;
  }
  function makeCrown(){
    const g=new THREE.Group();
    const band=part(g,new THREE.CylinderGeometry(.08,.088,.055,14),0xFFD24A,[0,0,0],null,{ol:.05});
    for(let k=0;k<5;k++){ const a=k/5*Math.PI*2; part(g,new THREE.ConeGeometry(.024,.07,6),0xFFD24A,[Math.sin(a)*.068,.06,Math.cos(a)*.068],null,{ol:.06}); part(g,sph(.012,6,4),0xFFF1A8,[Math.sin(a)*.068,.1,Math.cos(a)*.068],null,{ol:false,basic:true}); }
    part(g,sph(.02,8,6),0xE0364C,[0,.005,.086],[1,1,.5],{ol:false,basic:true});
    g.scale.setScalar(1.1);
    return g;
  }
  function makeArrow(){ const g=new THREE.Group(); part(g,new THREE.ConeGeometry(.055,.1,4),GOLD,[0,0,0],null,{rot:[Math.PI,Math.PI/4,0],ol:.12}); return g; }
  function makeStars(){ const g=new THREE.Group(); for(let k=0;k<3;k++){ const s=new THREE.Mesh(new THREE.OctahedronGeometry(.025),basicMat(0xFFE27A)); s.userData.a=k/3*Math.PI*2; g.add(s); } return g; }

  /* ---------- 英雄模型（modelviewer.lol 的 glTF：meshopt 壓縮 + KTX2 貼圖） ---------- */
  const CH_YAW=0, CH_H=.68, CH_MAX=1.05, HEAD_WORLD=.24, HEAD_TARGET=.3, HEAD_MAX=2.4, BASIS='https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/';
  let gltfLoader=null; const champCache={};
  function champLoader(){
    if(!gltfLoader){ const k=new THREE.KTX2Loader().setTranscoderPath(BASIS).detectSupport(renderer); gltfLoader=new THREE.GLTFLoader().setKTX2Loader(k).setMeshoptDecoder(THREE.MeshoptDecoder); }
    return gltfLoader;
  }
  function loadChamp(url){ if(!champCache[url]) champCache[url]=new Promise((ok,no)=>champLoader().load(url,ok,undefined,no)).catch(e=>{ delete champCache[url]; throw e; }); return champCache[url]; }
  // 動作名稱每隻英雄略有不同，依序比對
  const CLIP={idle:[/^idle1(_base)?(\.|$)/i,/^idle1/i,/^idle(_base)?(\.|$)/i,/^idle/i], run:[/^run(_base)?(\.|$)/i,/^run(?!_in)/i,/^run/i],
    laugh:[/^laugh(\.|$)/i,/^laugh/i,/^joke/i,/^taunt/i], dance:[/^dance1?(\.|$)/i,/^dance/i,/^laugh/i], hit:[/^knockup/i,/^taunt/i],
    stun:[/^stun/i,/^idle1/i], death:[/^death(\.|$)/i,/^death/i]};
  function findClip(clips,key){ for(const r of CLIP[key]){ const c=clips.find(c=>r.test(c.name)); if(c) return c; } return null; }
  function attachChamp(tk,gltf){
    if(!tokens.includes(tk)||tk.champ) return;
    const model=THREE.SkeletonUtils.clone(gltf.scene), mixer=new THREE.AnimationMixer(model), clips={};
    Object.keys(CLIP).forEach(k=>{ const c=findClip(gltf.animations,k); if(c) clips[k]=c; });
    if(clips.idle){ mixer.clipAction(clips.idle).play(); mixer.update(0); }
    model.updateMatrixWorld(true);
    const measure=()=>{ const box=new THREE.Box3(); model.updateMatrixWorld(true);
      model.traverse(o=>{ if(!o.isMesh) return; o.frustumCulled=false; let bb;
        if(o.isSkinnedMesh){ o.computeBoundingBox(); bb=o.boundingBox.clone(); } else { if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb=o.geometry.boundingBox.clone(); }
        box.union(bb.applyMatrix4(o.matrixWorld)); }); return box; };
    let box=measure();
    // 大頭化：找頭部骨骼；用「主要綁在頭上的頂點」量出臉的大小（頭髮、帽子、武器不算）
    let head=null; model.traverse(o=>{ if(!head&&o.isBone&&/^(c_)?head$/i.test(o.name)) head=o; });
    const faceSize=()=>{ const fb=new THREE.Box3(), v=new THREE.Vector3(); let n=0; model.updateMatrixWorld(true);
      model.traverse(o=>{ if(!o.isSkinnedMesh) return; const hi=o.skeleton.bones.indexOf(head); if(hi<0) return;
        const P=o.geometry.attributes.position, SI=o.geometry.attributes.skinIndex, SW=o.geometry.attributes.skinWeight;
        for(let i=0;i<P.count;i++){ let w=0; for(let c=0;c<4;c++) if(SI.getComponent(i,c)===hi) w+=SW.getComponent(i,c); if(w<.5) continue;
          v.fromBufferAttribute(P,i); o.applyBoneTransform(i,v); v.applyMatrix4(o.matrixWorld); fb.expandByPoint(v); n++; } });
      if(n<20) return 0; const d=fb.getSize(new THREE.Vector3()); return Math.max(d.x,d.y,d.z); };
    let hk=1, hair=[], face=0;
    if(head){ face=faceSize(); const H0=Math.max(1e-6,box.max.y-box.min.y);
      if(face>0){ hk=Math.max(1,Math.min(HEAD_MAX,HEAD_TARGET/(face/H0)));
        if(hk>1.05){ head.scale.multiplyScalar(hk);
          // 頭髮、辮子、披風這類掛在頭上的長骨骼：只放大開根號的倍數，免得辮子拖到地上
          head.children.forEach(c=>{ if(c.isBone&&/hair|braid|tail|pony|ribbon|cape|scarf|cloth|chain|ear_?ring/i.test(c.name)){ hair.push([c,c.scale.clone()]); c.scale.multiplyScalar(Math.sqrt(hk)/hk); } });
          box=measure(); face*=hk; } else hk=1; } }
    // 以臉的大小為基準縮放，讓每位英雄的臉在棋盤上差不多大；身高限制在 CH_H～CH_MAX 之間
    const h=Math.max(1e-6,box.max.y-box.min.y);
    const sc=face>0?Math.max(CH_H/h,Math.min(HEAD_WORLD/face,CH_MAX/h)):CH_H/h;
    const holder=new THREE.Group(), inner=new THREE.Group(); inner.add(model); holder.add(inner);
    inner.scale.setScalar(sc); inner.position.set(-(box.min.x+box.max.x)/2*sc,-box.min.y*sc,-(box.min.z+box.max.z)/2*sc);
    tk.body.remove(tk.A.root); tk.body.add(holder);
    tk.champ={holder,mixer,clips,cur:null,act:null,head:hk>1?head:null,hk,headBase:head?head.scale.clone().divideScalar(hk):null,hair};
    dust(tk.g.position,10); tk.crown.position.y=tk.arrow.position.y=0;   // 高度下一幀重算
  }
  // 更新動畫後把頭放大（沒有縮放軌道的動作也要先還原，避免越乘越大）
  function mixUpdate(C,dt){ if(C.head){ C.head.scale.copy(C.headBase); C.hair.forEach(([b,s])=>b.scale.copy(s)); } C.mixer.update(dt);
    if(C.head){ C.head.scale.multiplyScalar(C.hk); const k=Math.sqrt(C.hk)/C.hk; C.hair.forEach(([b])=>b.scale.multiplyScalar(k)); } }
  function champPlay(C,key){
    if(C.cur===key) return;
    const clip=C.clips[key]||C.clips.idle; C.cur=key; if(!clip) return;
    const a=C.mixer.clipAction(clip), once=key==='laugh'||key==='hit'||key==='death';
    if(C.act===a&&!once) return;
    a.reset(); a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,Infinity); a.clampWhenFinished=once; a.timeScale=key==='run'?1.15:1; a.enabled=true; a.setEffectiveWeight(1);
    if(C.act&&C.act!==a) a.crossFadeFrom(C.act,.22,false);
    a.play(); C.act=a;
  }

  /* ---------- 骰子 ---------- */
  function pipTex(n){
    return canvasTex(256,256,(g)=>{
      const bg=g.createRadialGradient(128,128,40,128,128,190); bg.addColorStop(0,'#FFFDF6'); bg.addColorStop(1,'#F1E4CB'); g.fillStyle=bg; g.fillRect(0,0,256,256);
      const P={1:[[128,128]],2:[[72,72],[184,184]],3:[[70,70],[128,128],[186,186]],4:[[72,72],[184,72],[72,184],[184,184]],5:[[70,70],[186,70],[128,128],[70,186],[186,186]],6:[[74,64],[182,64],[74,128],[182,128],[74,192],[182,192]]}[n];
      const red=n===1||n===4, r=n===1?34:22;
      P.forEach(([x,y])=>{ const gr=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r); gr.addColorStop(0,red?'#FF5A6E':'#5A4A42'); gr.addColorStop(1,red?'#B5122A':'#1E1714'); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); });
    });
  }
  let DIE_GEO=null, DIE_MATS=null;
  function makeDie(){
    if(!DIE_GEO){ DIE_GEO=roundedBox(.5,.5,.5,.09,7); DIE_MATS=FACE_VAL.map(v=>new THREE.MeshStandardMaterial({map:pipTex(v),roughness:.32,metalness:0})); }
    const m=new THREE.Mesh(DIE_GEO,DIE_MATS); m.visible=false; return m;
  }
  function faceQuat(val,yaw){
    const n=FACE_N[FACE_VAL.indexOf(val)];
    const q=new THREE.Quaternion().setFromUnitVectors(n,UP);
    return new THREE.Quaternion().setFromAxisAngle(UP,yaw).multiply(q);
  }
  const DIE_Y=.25+.01;

  /* ---------- 特殊格的小道具 ---------- */
  function makeProp(t){
    const g=new THREE.Group(), info={type:t.t,g};
    if(t.t==='chance'){
      const tex=canvasTex(128,128,(c)=>{ c.fillStyle='#F2C14E'; c.fillRect(0,0,128,128); c.strokeStyle='#C8962A'; c.lineWidth=10; c.strokeRect(5,5,118,118); c.font='900 92px -apple-system,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=12; c.strokeStyle='#8A5A12'; c.strokeText('?',64,70); c.fillStyle='#FFFFFF'; c.fillText('?',64,70); });
      const b=new THREE.Mesh(roundedBox(.2,.2,.2,.035,3),new THREE.MeshToonMaterial({map:tex,gradientMap:GRAD})); const o=new THREE.Mesh(b.geometry,OUTLINE); o.scale.setScalar(1.07); b.add(o);
      b.position.y=.3; g.add(b); info.spin=b;
    } else if(t.t==='wheel'){
      const tex=canvasTex(128,128,(c)=>{ const cols=['#FF6B57','#F2C14E','#7ED3A3','#4D9DE0','#C39BF2','#FFA25B']; for(let k=0;k<6;k++){ c.fillStyle=cols[k]; c.beginPath(); c.moveTo(64,64); c.arc(64,64,64,k/6*Math.PI*2,(k+1)/6*Math.PI*2); c.fill(); } c.fillStyle='#FFF4DE'; c.beginPath(); c.arc(64,64,12,0,7); c.fill(); });
      part(g,new THREE.CylinderGeometry(.012,.012,.2,6),0x6B5F58,[0,.1,0],null,{ol:.4});
      const w=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.03,28),[toonMat(0xFFF4DE),new THREE.MeshBasicMaterial({map:tex}),new THREE.MeshBasicMaterial({map:tex})]);
      const wg=new THREE.Group(); wg.position.set(0,.26,0); wg.rotation.x=Math.PI/2; wg.add(w); g.add(wg); const o=new THREE.Mesh(w.geometry,OUTLINE); o.scale.setScalar(1.06); w.add(o);
      part(g,new THREE.ConeGeometry(.025,.05,4),0xE0364C,[0,.415,.02],null,{rot:[Math.PI,0,0],ol:.2}); info.spin=w;
    } else if(t.t==='go'){
      const sh=new THREE.Shape(); for(let k=0;k<10;k++){ const a=k/10*Math.PI*2-Math.PI/2, r=k%2?.055:.13; k?sh.lineTo(Math.cos(a)*r,-Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,-Math.sin(a)*r); }
      const geo=new THREE.ExtrudeGeometry(sh,{depth:.04,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}); geo.center();
      const s=part(g,geo,GOLD,[0,.26,0],null,{ol:.08}); info.spin=s;
    } else if(t.t==='jail'){
      const c=new THREE.Group(); c.position.y=0; g.add(c);
      for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; part(c,new THREE.CylinderGeometry(.008,.008,.24,5),0x4A4F57,[Math.sin(a)*.11,.12,Math.cos(a)*.11],null,{ol:false}); }
      part(c,new THREE.TorusGeometry(.11,.012,5,20),0x4A4F57,[0,.24,0],null,{rot:[Math.PI/2,0,0],ol:false});
      part(c,new THREE.ConeGeometry(.13,.08,16),0x6B7078,[0,.285,0],null,{ol:.1});

    } else if(t.t==='rest'){
      const c=new THREE.Group(); c.position.set(0,TOP,0); g.add(c);
      part(c,new THREE.CylinderGeometry(.07,.055,.11,16),0xFFFFFF,[0,.055,0],null,{ol:.08});
      part(c,new THREE.CylinderGeometry(.062,.062,.01,16),0x6B3E26,[0,.107,0],null,{ol:false});
      part(c,new THREE.TorusGeometry(.032,.011,6,12),0xFFFFFF,[.075,.06,0],null,{rot:[0,0,0],ol:.2});
      info.steam=[0,1,2].map(k=>{ const s=new THREE.Mesh(sph(.025,8,6),basicMat(0xFFFFFF,.8)); c.add(s); return s; }); info.steamBase=c;
    } else if(t.t==='tax'){
      const c=new THREE.Group(); c.position.set(0,TOP,0); g.add(c); info.bob=c;
      for(let k=0;k<3;k++) part(c,new THREE.CylinderGeometry(.06,.06,.022,16),GOLD,[k*.008,.012+k*.026,0],null,{ol:.12});
    } else if(t.t==='twitch'){
      const r=new THREE.Group(); r.position.set(0,TOP,0); g.add(r); info.bob=r;
      part(r,sph(.085),0x8A9B7A,[0,.08,0],[1,.9,1],{ol:.08});
      part(r,new THREE.ConeGeometry(.045,.09,10),0x8A9B7A,[0,.06,.09],null,{rot:[Math.PI/2,0,0],ol:.12});
      part(r,sph(.012,6,4),0xE77B8B,[0,.06,.138],null,{ol:false,basic:true});
      [-1,1].forEach(s=>{ part(r,sph(.045),0x8A9B7A,[s*.07,.16,-.01],[1,1,.4],{ol:.12}); part(r,sph(.028),0xF7A1A1,[s*.07,.16,.005],[1,1,.3],{ol:false}); part(r,sph(.014,6,4),0xB6FF3A,[s*.035,.1,.07],null,{ol:false,basic:true}); });
      // 圖奇的紫色兜帽
      part(r,sph(.095,12,8),0x6A4C93,[0,.1,-.025],[1.05,.95,.95],{ol:.06}).scale.z=.8;
    } else return null;
    return info;
  }
  function emblemTex(){
    return canvasTex(512,512,(c)=>{
      c.translate(256,256); c.strokeStyle='rgba(242,193,78,.28)'; c.fillStyle='rgba(242,193,78,.22)';
      [230,205,120].forEach((r,k)=>{ c.lineWidth=k===1?3:6; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.stroke(); });
      c.lineWidth=4; c.beginPath(); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2-Math.PI/2; const x=Math.cos(a)*190, y=Math.sin(a)*190; k?c.lineTo(x,y):c.moveTo(x,y); } c.closePath(); c.stroke();
      for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; c.save(); c.rotate(a); c.fillRect(-3,-228,6,22); c.restore(); }
      c.font='900 64px -apple-system,"PingFang TC",sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='rgba(242,193,78,.32)'; c.fillText('召喚峽谷',0,-18); c.font='800 34px -apple-system,sans-serif'; c.fillText('大富翁',0,40);
    });
  }

  /* ---------- 初始化 ---------- */
  function init(){
    initShared();
    wrap=document.createElement('div'); wrap.className='v3wrap';
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    wrap.appendChild(renderer.domElement);
    labelsEl=document.createElement('div'); labelsEl.className='v3labels'; wrap.appendChild(labelsEl);
    const hint=document.createElement('div'); hint.className='v3hint'; hint.textContent='↔ 旋轉・pinch 縮放'; wrap.appendChild(hint);
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(38,1,.1,100);
    // r155+ 採物理光強度：乘上 π 才等於舊版的亮度
    scene.add(new THREE.HemisphereLight(0xffffff,0x2a4a47,.85*Math.PI));
    const sun=new THREE.DirectionalLight(0xfff4de,.85*Math.PI); sun.position.set(3,9,5); scene.add(sun);
    root=new THREE.Group(); scene.add(root); fxRoot=new THREE.Group(); scene.add(fxRoot);
    controls=new THREE.OrbitControls(camera,renderer.domElement);
    controls.enablePan=false; controls.enableDamping=true; controls.dampingFactor=.12; controls.rotateSpeed=.55;
    controls.minPolarAngle=.12; controls.maxPolarAngle=1.05; controls.minAzimuthAngle=-1.2; controls.maxAzimuthAngle=1.2;
    renderer.domElement.style.touchAction='pan-y';
    const el=renderer.domElement;
    el.addEventListener('pointerdown',e=>{ downAt={x:e.clientX,y:e.clientY,t:performance.now()}; camIntro=null; touchT=performance.now(); });
    el.addEventListener('pointermove',e=>{ if(e.buttons||e.pointerType==='touch') touchT=performance.now(); });
    el.addEventListener('wheel',()=>{ touchT=performance.now(); },{passive:true});
    el.addEventListener('pointerup',e=>{
      if(!downAt) return; const dx=e.clientX-downAt.x, dy=e.clientY-downAt.y, dt=performance.now()-downAt.t; downAt=null;
      if(dx*dx+dy*dy>64||dt>500) return;
      const r=el.getBoundingClientRect(); const v=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
      const rc=new THREE.Raycaster(); rc.setFromCamera(v,camera);
      const hit=rc.intersectObjects(tilesM.map(m=>m.base),false)[0];
      if(hit){ const i=tilesM.findIndex(m=>m.base===hit.object); showPop(i===popTile?-1:i); } else showPop(-1);
    });
  }

  function clear(g){ while(g.children.length){ const c=g.children[0]; g.remove(c); } }

  function build(){
    clear(root); clear(fxRoot); tilesM=[]; labels=[]; tokens=[]; props=[]; parts=[]; tileFx=[];
    floats.forEach(f=>f.el.remove()); floats=[]; labelsEl.innerHTML='';
    const {cols,rows}=ring(), TT=tiles();
    const table=new THREE.Mesh(roundedBox(cols+1.1,.16,rows+1.1,.07,2),new THREE.MeshStandardMaterial({color:lin(0x1B3B39),roughness:.95}));
    table.position.y=-.09; root.add(table);
    const inner=new THREE.Mesh(new THREE.BoxGeometry(cols-1.85,.02,rows-1.85),new THREE.MeshStandardMaterial({color:lin(0x2F5F5B),roughness:.95}));
    root.add(inner);
    const es=Math.min(cols-2,rows-2)*.92, em=new THREE.Mesh(new THREE.PlaneGeometry(es,es),new THREE.MeshBasicMaterial({map:emblemTex(),transparent:true,depthWrite:false}));
    em.rotation.x=-Math.PI/2; em.position.set(0,.012,0); root.add(em);
    const TILE_GEO=roundedBox(.92,.14,.92,.045,3);
    TT.forEach((t,i)=>{
      const {x,z}=posOf(i), o=outer(i), g=new THREE.Group(); g.position.set(x,0,z);
      const base=new THREE.Mesh(TILE_GEO,new THREE.MeshToonMaterial({color:lin(t.t==='prop'?PAPER:PAPER_DIM),gradientMap:GRAD})); base.position.y=.07; g.add(base);
      let band=null;
      if(t.t==='prop'){
        const horiz=o.z!==0; band=new THREE.Mesh(roundedBox(horiz?.86:.16,.035,horiz?.16:.86,.012,1),toonMat(GCOL[t.g]));
        band.position.set(o.x*.36,TOP+.012,o.z*.36); g.add(band);
      }
      const houses=new THREE.Group(); houses.position.set(-o.x*.02,TOP,-o.z*.02); g.add(houses);
      const hot=new THREE.Mesh(roundedBox(1.02,.03,1.02,.012,1),basicMat(GOLD)); hot.position.y=-.005; hot.visible=false; g.add(hot);
      const pr=makeProp(t); if(pr){ pr.g.position.set(.27,TOP,-.27); pr.g.scale.setScalar(.68); g.add(pr.g); pr.phase=Math.random()*6; props.push(pr); }
      root.add(g); tilesM.push({g,base,band,houses,hot,t,o,lvl:0,owner:-1,flag:null,hs:[],init:false});
      const el=document.createElement('div'); el.className='lbl'; labelsEl.appendChild(el); labels.push(el);
    });
    midEl=document.createElement('div'); midEl.className='mid3'; labelsEl.appendChild(midEl); midKey='';
    dice=Array.from({length:cfg().dice},()=>{ const d=makeDie(); root.add(d); return d; }); diceAnim=null;
    diceShadows=dice.map(()=>{ const s=blobShadow(.7); s.position.y=.013; s.visible=false; root.add(s); return s; });
    popTile=-1; if(popEl){ popEl.remove(); popEl=null; }
    // 棋子
    st.players.forEach((p,pi)=>{
      const g=new THREE.Group(); root.add(g);
      const shadow=blobShadow(.5); shadow.position.y=.006; g.add(shadow);
      const ringM=new THREE.Mesh(new THREE.RingGeometry(.2,.27,32),basicMat(GOLD,.9)); ringM.rotation.x=-Math.PI/2; ringM.position.y=.008; ringM.visible=false; g.add(ringM);
      const lift=new THREE.Group(); g.add(lift);
      const A=makeAnimal(pi); const body=new THREE.Group(); body.scale.setScalar(1.18); body.add(A.root); lift.add(body);
      const crown=makeCrown(); crown.position.y=.63; crown.visible=false; lift.add(crown);
      const arrow=makeArrow(); arrow.position.y=.86; arrow.visible=false; lift.add(arrow);
      const stars=makeStars(); stars.position.y=.6; stars.visible=false; lift.add(stars);
      const countEl=document.createElement('div'); countEl.className='fx-count'; countEl.style.display='none'; labelsEl.appendChild(countEl);
      tokens.push({pi,g,lift,A,body,champ:null,shadow,ring:ringM,crown,arrow,stars,countEl,idx:null,queue:[],hop:null,slot:[0,.12],sc:1,count:0,emo:null,yaw:0,spin:0,
        blinkAt:performance.now()+1000+Math.random()*3000,blinkT:0,phase:Math.random()*6,holdUntil:0,out:false,dieT:0,crownS:0,landSq:0});
      if(p.skin&&!p.npc&&typeof CHAMP!=='undefined'&&THREE.GLTFLoader){ const tk=tokens[tokens.length-1]; loadChamp(CHAMP.modelUrl(p.skin)).then(gl=>attachChamp(tk,gl)).catch(e=>console.warn('英雄模型載入失敗，改用小動物',p.skin.sid,e)); }
    });
    // 鏡頭：從高處斜掃進場
    const fov=camera.fov*Math.PI/180, span=Math.max(rows+1.6,(cols+1.6)*1.25);
    const dist=span/(2*Math.tan(fov/2))*.78;
    controls.target.set(0,0,rows*.11);
    homeTarget=controls.target.clone(); homeOffset=new THREE.Vector3(0,dist*.78,dist*.63);
    camera.position.copy(homeTarget).add(homeOffset);
    controls.minDistance=dist*.45; controls.maxDistance=dist*1.35; controls.update(); camLerp=null;
    if(!RM()){ const from=homeOffset.clone().multiplyScalar(1.55).applyAxisAngle(UP,-.9); from.y*=1.25; camIntro={t0:performance.now(),dur:1800,from,to:homeOffset.clone()}; }
    camSig=null; builtKey=buildKey(); seenRollId=st.rollId||0; baseMoney=null; lastPhase=st.phase; celebrate=null;
  }

  /* ---------- 點擊資訊 ---------- */
  function showPop(i){
    popTile=i;
    if(i<0){ if(popEl){ popEl.remove(); popEl=null; } return; }
    if(!popEl){ popEl=document.createElement('div'); popEl.className='v3pop'; popEl.onclick=()=>showPop(-1); labelsEl.appendChild(popEl); }
    renderPop();
  }
  function renderPop(){
    if(!popEl||popTile<0) return;
    const i=popTile, t=tiles()[i], o=st.owners[i]; const row=(k,v)=>`<div class="row"><span>${k}</span><span>${v}</span></div>`;
    let h=`<b>${tileName(i)}</b>`;
    if(t.t==='prop'){
      h+=`<div class="row"><span><i class="gb" style="background:#${GCOL[t.g].toString(16).padStart(6,'0')}"></i>${t.g}</span><span>$${t.p}</span></div>`;
      h+=row(T('i_owner'),o?esc(st.players[o.owner].name):T('i_none'));
      if(o){ h+=row(T('i_lv'),'▲'.repeat(o.level)||'0'); h+=row(T('i_rent'),`$${rentOf(i)}${ownsGroup(o.owner,t.g)?'<small>'+T('i_full')+'</small>':''}`); if(o.level<3) h+=row(T('i_next'),`$${rentAt(i,o.owner,o.level+1)}`); }
      else h+=row(T('i_rent'),`$${rentAt(i,-1,0)}`);
    } else if(t.t==='tax') h+=row(T('i_tax'),`$${t.a}`);
    if(popEl.dataset.h!==h){ popEl.innerHTML=h; popEl.dataset.h=h; }
  }

  function fitSize(b){
    const w=b.clientWidth, h=b.clientHeight; if(!w||!h) return;
    if(w!==W||h!==H){ W=w; H=h; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
  }
  function slotOffset(k,n){
    if(n<=1) return [0,-.06];
    if(n===2) return [[-.19,-.06],[.19,-.06]][k];
    if(n===3) return [[-.22,-.13],[.22,-.13],[0,.08]][k];
    return [[-.21,-.15],[.21,-.15],[-.21,.1],[.21,.1]][k];
  }
  function buildKey(){ return st.mode+':'+st.players.length+':'+st.players.map(p=>p.skin?p.skin.sid:'-').join(','); }
  function tilePoint(i,slot){ const {x,z}=posOf(i); return new THREE.Vector3(x+slot[0],TOP,z+slot[1]); }

  /* ---------- 特效：粒子 / 浮動文字 ---------- */
  const PART_GEO={};
  function pgeo(k){ return PART_GEO[k]||(PART_GEO[k]=k==='coin'?new THREE.CylinderGeometry(.045,.045,.014,14):k==='conf'?new THREE.PlaneGeometry(.075,.042):new THREE.IcosahedronGeometry(.05,0)); }
  function spawn(kind,pos,vel,life,color,opt){
    opt=opt||{};
    const mat=kind==='coin'?toonMat(GOLD):kind==='conf'?basicMat(color):basicMat(color||0xFFFFFF,.85);
    const m=new THREE.Mesh(pgeo(kind),mat); m.position.copy(pos);
    if(kind==='coin') m.rotation.x=Math.PI/2;
    if(kind==='conf') m.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
    const s0=opt.s||1; m.scale.setScalar(s0); fxRoot.add(m);
    parts.push({m,kind,vel,life,t:0,g:opt.g!=null?opt.g:4.5,s0,rv:new THREE.Vector3(Math.random()*8-4,Math.random()*8-4,Math.random()*8-4),drag:opt.drag||0});
  }
  function burstCoins(pos,n){ if(RM()) return; for(let k=0;k<n;k++){ const a=Math.random()*Math.PI*2, sp=.6+Math.random()*.7; spawn('coin',pos.clone().add(new THREE.Vector3(0,.35,0)),new THREE.Vector3(Math.cos(a)*sp,2.2+Math.random()*1.2,Math.sin(a)*sp),.9+Math.random()*.3,null,{g:6.5}); } }
  function dust(pos,n,color){ if(RM()) return; for(let k=0;k<(n||6);k++){ const a=k/(n||6)*Math.PI*2+Math.random()*.4; spawn('puff',pos.clone().add(new THREE.Vector3(Math.cos(a)*.1,.03,Math.sin(a)*.1)),new THREE.Vector3(Math.cos(a)*.55,.25+Math.random()*.2,Math.sin(a)*.55),.42+Math.random()*.15,color||0xFFFFFF,{g:0,s:.6+Math.random()*.4,drag:3}); } }
  function confetti(pos,colors,n,spread,up){ if(RM()) return; for(let k=0;k<n;k++){ const a=Math.random()*Math.PI*2, sp=Math.random()*spread; spawn('conf',pos.clone().add(new THREE.Vector3((Math.random()-.5)*.2,0,(Math.random()-.5)*.2)),new THREE.Vector3(Math.cos(a)*sp,up*(.7+Math.random()*.6),Math.sin(a)*sp),1.6+Math.random()*.8,colors[k%colors.length],{g:2.2,drag:1.6}); } }
  function rain(){ if(RM()) return; const {cols,rows}=ring(), cs=[0xFF6B57,0x4D9DE0,0xA56BFF,0x2FB57A,0xF2C14E,0xFFFFFF];
    for(let k=0;k<160;k++) spawn('conf',new THREE.Vector3((Math.random()-.5)*cols,3+Math.random()*2.5,(Math.random()-.5)*rows),new THREE.Vector3((Math.random()-.5)*.4,-Math.random()*.5,(Math.random()-.5)*.4),3.5+Math.random()*1.5,cs[k%cs.length],{g:.35,drag:.6}); }
  function floatText(pos,text,cls,rise,dur){
    const el=document.createElement('div'); el.className='fx-float '+(cls||''); el.textContent=text; labelsEl.appendChild(el);
    floats.push({el,pos:pos.clone(),t0:performance.now(),dur:dur||1300,rise:rise==null?.5:rise});
  }
  function totalText(pos,n){ const el=document.createElement('div'); el.className='fx-total'; el.textContent=n; labelsEl.appendChild(el); floats.push({el,pos:pos.clone(),t0:performance.now(),dur:1100,rise:.25,pop:true}); }
  function headPos(tk){ return tk.g.position.clone().add(new THREE.Vector3(0,.74*tk.sc,0)); }
  function emote(tk,type,dur){ tk.emo={type,t0:performance.now(),dur:dur||1400}; }

  /* ---------- 地產：旗子、房子 ---------- */
  function makeFlag(owner,o){
    const g=new THREE.Group();
    part(g,new THREE.CylinderGeometry(.008,.008,.3,5),0x6B5F58,[0,.15,0],null,{ol:.5});
    const f=new THREE.Group(); f.position.set(0,.26,0); g.add(f);
    part(f,new THREE.BoxGeometry(.13,.08,.008),P_COL[owner],[.066,0,0],null,{ol:.15});
    part(g,sph(.014,6,4),GOLD,[0,.305,0],null,{ol:false});
    // 旗桿放在地塊的外側角落
    const side=o.z!==0?{x:-.3,z:o.z*.36}:{x:o.x*.36,z:-.12};
    g.position.set(side.x,0,side.z); g.userData.cloth=f; return g;
  }
  function makeHouse(owner,hotel){
    const g=new THREE.Group(), s=hotel?1.35:1;
    part(g,new THREE.BoxGeometry(.1*s,.08*s,.1*s),0xFFFBF0,[0,.04*s,0],null,{ol:.12});
    part(g,new THREE.ConeGeometry(.088*s,.075*s,4),P_COL[owner],[0,.08*s+.037*s,0],null,{rot:[0,Math.PI/4,0],ol:.12});
    part(g,new THREE.BoxGeometry(.03*s,.045*s,.005),0x8A5A3C,[0,.022*s,.051*s],null,{ol:false});
    return g;
  }
  function popIn(obj,delay){ obj.scale.setScalar(.001); tileFx.push({obj,t0:performance.now()+(delay||0),dur:520,type:'in'}); }
  function popOut(obj,parent){ tileFx.push({obj,parent,t0:performance.now(),dur:380,type:'out'}); }
  function syncTile(m,i,animate){
    const o=st.owners[i], owner=o?o.owner:-1, lvl=o?o.level:0;
    const wp=m.g.position.clone().add(new THREE.Vector3(0,TOP,0));
    if(owner!==m.owner){
      if(m.flag){ const f=m.flag; if(animate) popOut(f,m.houses); else m.houses.remove(f); m.flag=null; }
      m.hs.forEach(h=>animate?popOut(h,m.houses):m.houses.remove(h)); m.hs=[];
      if(owner>=0){ m.flag=makeFlag(owner,m.o); m.houses.add(m.flag); if(animate){ popIn(m.flag); confetti(wp.clone().add(new THREE.Vector3(0,.2,0)),[P_COL[owner],GOLD,0xFFFFFF],40,1.1,2.8); dust(wp,6); } }
      else if(animate&&m.owner>=0) dust(wp,10,0xA58BD0);        // 被偷 / 被賣：紫色煙
      m.owner=owner; m.lvl=0;
    }
    while(m.hs.length<lvl){
      const k=m.hs.length, h=makeHouse(owner,k===2);
      const along=(k-1)*.2, horiz=m.o.z!==0;
      h.position.set(horiz?along:m.o.x*.2, 0, horiz?m.o.z*.2:along); h.scale.setScalar(.9); h.userData.s=.9;
      m.houses.add(h); m.hs.push(h); if(animate){ popIn(h,k*90); dust(wp.clone().add(h.position),5); }
    }
    while(m.hs.length>lvl){ const h=m.hs.pop(); animate?popOut(h,m.houses):m.houses.remove(h); }
    m.lvl=lvl;
  }

  /* ---------- 每次狀態更新 ---------- */
  function update(){
    if(!ok()) return;
    if(!renderer) init();
    const b=$('board');
    b.className='board three '+st.mode;
    if(wrap.parentNode!==b){ b.innerHTML=''; b.appendChild(wrap); W=H=0; }
    fitSize(b);
    if(builtKey!==buildKey()) build();
    const now=performance.now();
    const TT=tiles(), N=TT.length, play=st.phase==='play', cur=st.players[st.turn];
    const fresh=!st.dice.length&&st.round===1;              // 還沒擲過骰：同步但不放特效
    // 地塊
    tilesM.forEach((m,i)=>{
      const o=st.owners[i], owner=o?o.owner:-1;
      const hot=play&&cur.pos===i&&!cur.out;
      m.base.material.color.setHex(hot?HOT:owner>=0?TINT[owner]:(m.t.t==='prop'?PAPER:PAPER_DIM)).convertSRGBToLinear();
      m.hot.visible=hot;
      syncTile(m,i,m.init&&!fresh); m.init=true;
      const el=labels[i]; let sub='';
      if(m.t.t==='prop') sub=o?`$${rentOf(i)}`:`$${m.t.p}`; else if(m.t.t==='tax') sub=`-$${m.t.a}`;
      const html=`${tileName(i)}${sub?`<small>${sub}</small>`:''}`;
      if(el.dataset.h!==html){ el.innerHTML=html; el.dataset.h=html; }
    });
    // 中央訊息（換人時彈一下）
    const msg=st.phase==='over'?`<b>${T('over')}</b>`:(myTurn()&&!cur.npc?T('turnOf',{n:cur.name}):T('waitFor',{n:cur.name}));
    const last=st.log[0]?`<div class="last">${logText(st.log[0])}</div>`:'';
    const mh=msg+last; if(midEl.dataset.h!==mh){ midEl.innerHTML=mh; midEl.dataset.h=mh; }
    const mk=st.phase+':'+st.turn; if(mk!==midKey){ midKey=mk; midEl.classList.remove('bump'); void midEl.offsetWidth; midEl.classList.add('bump'); }
    // 別台手機擲的骰子：也播一次動畫，棋子等骰子停了再走
    if((st.rollId||0)!==seenRollId){
      seenRollId=st.rollId||0;
      if(st.dice.length&&!RM()){ startDice(st.dice,null); tokens.forEach(tk=>tk.holdUntil=now+DICE_MS); const ct=tokens[st.turn]; if(ct){ const n=st.dice.reduce((a,b)=>a+b,0)*(st.players[st.turn].boost?2:1); if(n>1) ct.count=n; } }
    }
    // 棋子目標
    TT.forEach((t,i)=>{
      const here=st.players.map((p,pi)=>!p.out&&p.pos===i?pi:-1).filter(x=>x>=0);
      here.forEach((pi,k)=>{ const tk=tokens[pi]; tk.slot=slotOffset(k,here.length); tk.sc=here.length>=3?.8:1; });
    });
    const maxWalk=cfg().dice*12;
    tokens.forEach(tk=>{
      const p=st.players[tk.pi];
      if(p.out&&!tk.out){ tk.out=true; tk.dieT=now; dust(tk.g.position,10,0x999999); }
      if(p.out) return;
      if(tk.idx==null){ tk.idx=p.pos; tk.g.position.copy(tilePoint(p.pos,tk.slot)); return; }
      if(p.pos!==tk.idx){
        const fwd=(p.pos-tk.idx+N)%N, back=N-fwd;
        if(fwd<=maxWalk&&fwd<N-6){ for(let k=1;k<=fwd;k++) tk.queue.push({idx:(tk.idx+k)%N}); if(tk.count<=0&&fwd>1) tk.count=fwd; }
        else if(back<=6){ for(let k=1;k<=back;k++) tk.queue.push({idx:(tk.idx-k+N)%N,back:true}); }
        else { tk.queue=[{idx:p.pos,leap:true}]; tk.count=0; }
        tk.idx=p.pos;
      }
    });
    // 金額變化 → 浮動數字、金幣、表情
    if(!baseMoney||fresh||baseMoney.length!==st.players.length) baseMoney=st.players.map(p=>p.money);
    else st.players.forEach((p,i)=>{
      const d=p.money-baseMoney[i]; if(!d) return; baseMoney[i]=p.money; const tk=tokens[i]; if(!tk||tk.out) return;
      floatText(headPos(tk),(d>0?'+$':'-$')+Math.abs(d),d>0?'up':'down');
      if(d>0){ burstCoins(tk.g.position,Math.min(14,3+Math.round(d/40))); if(d>=100) emote(tk,'happy'); }
      else if(d<=-40) emote(tk,'sad',1600);
    });
    // 遊戲結束：彩紙雨、贏家跳舞、鏡頭拉近
    if(st.phase==='over'&&lastPhase!=='over'){
      rain();
      tokens.forEach(tk=>{ if(tk.out) return; if(tk.pi===st.winner) emote(tk,'win',1e9); else emote(tk,'sad',2600); });
      if(st.winner!=null&&tokens[st.winner]) celebrate={t0:now,pi:st.winner};
    }
    if(st.phase!=='over'){ if(celebrate) restoreDist=true; celebrate=null; tokens.forEach(tk=>{ if(tk.emo&&tk.emo.type==='win') tk.emo=null; }); }
    lastPhase=st.phase;
    // 領先者皇冠
    const rk=ranking(), leader=(st.dice.length&&rk.length>1&&worth(rk[0])>worth(rk[1]))?rk[0]:-1;
    tokens.forEach(tk=>{ tk.lead=tk.pi===leader; });
    // 靜止骰子
    if(!diceAnim){
      const {rows}=ring();
      dice.forEach((d,k)=>{ const v=st.dice[k]; d.visible=!!v; diceShadows[k].visible=!!v; if(v){ d.position.set(diceX(k),DIE_Y,-rows*.16); d.quaternion.copy(faceQuat(v,k*1.1+.4)); diceShadows[k].position.set(d.position.x,.013,d.position.z); diceShadows[k].scale.setScalar(1); } });
    }
    renderPop();
    if(!raf){ lastT=now; raf=requestAnimationFrame(loop); }
  }

  /* ---------- 骰子動畫 ---------- */
  function diceX(k){ return (k-(dice.length-1)/2)*.75; }
  function startDice(vals,res){
    const {rows}=ring(), now=performance.now();
    diceAnim={id:st.rollId||0,t0:now,dur:DICE_MS,res,vals,items:vals.map((v,k)=>({d:dice[k],v,x:diceX(k),z:-rows*.16,
      q0:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6)),
      axis:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),spin:14+Math.random()*6,qf:faceQuat(v,Math.random()*6.28),
      x0:(Math.random()-.5)*1.6,z0:1.2+Math.random()*.6,hits:0}))};
    dice.forEach((d,k)=>{ d.visible=k<vals.length; diceShadows[k].visible=k<vals.length; });
    if(typeof sfx==='function') sfx('dice');
    if(!raf){ lastT=now; raf=requestAnimationFrame(loop); }
  }
  function rollDice(vals){
    return new Promise(res=>{
      seenRollId=st.rollId||0;
      if(diceAnim&&diceAnim.id===seenRollId) diceAnim.res=res; else startDice(vals,res);
      watchdog();
    });
  }
  // 頁面在背景時 requestAnimationFrame 會暫停：直接完成動畫，避免整局卡住（兩支手機模式的房主尤其重要）
  let wdTimer=null;
  function watchdog(){
    if(wdTimer) return;
    wdTimer=setInterval(()=>{
      if(!diceAnim&&!settleWaiters.length){ clearInterval(wdTimer); wdTimer=null; return; }
      if(!document.hidden) return;
      const now=performance.now();
      if(diceAnim){ diceAnim.t0=now-diceAnim.dur; stepDice(now); }
      tokens.forEach(tk=>{ if(tk.out) return; tk.queue=[]; tk.hop=null; tk.count=0; if(tk.idx!=null) tk.g.position.copy(tilePoint(tk.idx,tk.slot)); });
      settleWaiters.forEach(w=>w.res()); settleWaiters=[];
    },400);
  }
  function stepDice(now){
    if(!diceAnim) return;
    const u=Math.min(1,(now-diceAnim.t0)/diceAnim.dur);
    diceAnim.items.forEach((it,k)=>{
      // 高度：拋入 → 兩次彈跳 → 靜止
      let y, hit=0;
      if(u<.42){ const q=u/.42; y=DIE_Y+2.6*(1-q*q); }
      else if(u<.7){ const q=(u-.42)/.28; y=DIE_Y+.55*Math.sin(Math.PI*q); hit=1; }
      else if(u<.86){ const q=(u-.7)/.16; y=DIE_Y+.14*Math.sin(Math.PI*q); hit=2; }
      else { y=DIE_Y; hit=3; }
      if(hit>it.hits){ it.hits=hit; if(hit<3){ if(typeof sfx==='function') sfx('dice'); dust(new THREE.Vector3(it.d.position.x,.02,it.d.position.z),5); } }
      const e=easeOut(Math.min(1,u/.86));
      it.d.position.set(it.x+it.x0*(1-e), y, it.z+it.z0*(1-e));
      const qs=it.q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(it.axis,it.spin*(1-Math.pow(1-Math.min(1,u/.9),2))));
      const w=u<.45?0:Math.pow(Math.min(1,(u-.45)/.45),2); it.d.quaternion.copy(qs).slerp(it.qf,w);
      if(u>=1){ it.d.position.set(it.x,DIE_Y,it.z); it.d.quaternion.copy(it.qf); }
      const sh=diceShadows[k]; sh.position.set(it.d.position.x,.013,it.d.position.z); sh.scale.setScalar(clamp(1-(y-DIE_Y)*.3,.35,1));
    });
    if(u>=1){
      const {rows}=ring(), sum=diceAnim.vals.reduce((a,b)=>a+b,0);
      totalText(new THREE.Vector3(0,.95,-rows*.16),sum);
      const r=diceAnim.res; diceAnim=null; if(r) r();
    }
  }

  /* ---------- 走路 ---------- */
  function walkPlan(pi,n){ const tk=tokens[pi]; if(tk&&n>1) tk.count=n; }
  function settle(){ return new Promise(res=>{ settleWaiters.push({res,t0:performance.now()}); watchdog(); }); }
  function idle(tk){ return tk.out||(!tk.hop&&!tk.queue.length); }
  function stepToken(tk,now,dt){
    const p=st.players[tk.pi], g=tk.g, A=tk.A, rm=RM(), C=tk.champ, R=C?C.holder:A.root;
    if(tk.out){ if(C){ champPlay(C,'death'); mixUpdate(C,dt); } const u=clamp((now-tk.dieT-(C?1500:0))/600,0,1); R.scale.setScalar(Math.max(.001,1-easeIO(u))); tk.shadow.scale.setScalar(1-u); tk.ring.visible=tk.crown.visible=tk.arrow.visible=tk.stars.visible=false; tk.countEl.style.display='none'; if(u>=1) g.visible=false; return; }
    g.visible=true; g.scale.setScalar(tk.sc+(g.scale.x-tk.sc)*.8);
    // 開始下一跳
    if(!tk.hop&&tk.queue.length&&now>=tk.holdUntil){
      const it=tk.queue.shift(), last=!tk.queue.length;
      const to=tilePoint(it.idx,last?tk.slot:[0,-.06]);
      const dur=rm?80:it.leap?LEAP_MS:(tk.queue.length>2?190:HOP_MS);
      tk.hop={from:g.position.clone(),to,t0:now,dur:C&&!it.leap?dur*1.1:dur,h:it.leap?(C?1:1.3):(C?.03:(it.back?.18:.3)),leap:!!it.leap,back:!!it.back,landed:false,ch:!!C};
      if(it.leap) tk.spin=0;
    }
    let lift=0, sy=1;
    if(tk.hop){
      const H=tk.hop, u=clamp((now-H.t0)/H.dur,0,1), A1=H.leap?.28:(H.ch?0:.2), B=H.leap?.86:(H.ch?1:.84);
      if(u<A1){ const s=Math.sin(u/A1*Math.PI/2); sy=1-.26*s; g.position.copy(H.from); }
      else if(u<B){ const v=(u-A1)/(B-A1); g.position.lerpVectors(H.from,H.to,easeIO(v)); lift=H.h*Math.sin(Math.PI*v); sy=1+.24*Math.abs(Math.cos(Math.PI*v)); if(H.leap) tk.spin=Math.PI*2*easeIO(v); }
      else { g.position.copy(H.to); const w=B>=1?1:(u-B)/(1-B); sy=1-.3*Math.sin(Math.PI*w)*(1-w*.4); if(!H.landed){ H.landed=true; if(!H.ch||H.leap) dust(H.to,H.leap?10:5); if(tk.count>0){ tk.count--; tk.countEl.classList.add('tick'); setTimeout(()=>tk.countEl.classList.remove('tick'),110); } } }
      const dx=H.to.x-H.from.x, dz=H.to.z-H.from.z; if(dx*dx+dz*dz>1e-4){ const a=Math.atan2(dx,dz)+(H.back?Math.PI:0); tk.yaw=lerpAng(tk.yaw,a,.35); }
      if(H.ch) sy=1;
      if(u>=1){ tk.hop=null; tk.spin=0; }
    } else {
      const tgt=tilePoint(tk.idx,tk.slot); g.position.lerp(tgt,Math.min(1,dt*10));
      const cp=camera.position; tk.yaw=lerpAng(tk.yaw,Math.atan2(cp.x-g.position.x,cp.z-g.position.z),Math.min(1,dt*4));
    }
    // 情緒
    const t=now/1000+tk.phase, cur=st.phase==='play'&&st.turn===tk.pi;
    let happy=false, sad=0, armUp=0, extraSpin=0, headX=0;
    if(tk.emo){
      const E=tk.emo, u=(now-E.t0)/E.dur;
      if(u>=1) tk.emo=null;
      else if(E.type==='happy'){ happy=true; const q=(now-E.t0)/1000; lift+=.16*Math.abs(Math.sin(q*Math.PI*2.4))*(1-u); armUp=1; if(q<.6) extraSpin=Math.PI*2*easeIO(q/.6); }
      else if(E.type==='win'){ happy=true; const q=(now-E.t0)/1000; lift+=.22*Math.abs(Math.sin(q*Math.PI*1.8)); armUp=1; extraSpin=Math.sin(q*2.2)*.6; }
      else if(E.type==='sad'){ sad=Math.sin(Math.min(1,u*4)*Math.PI/2)*(u>.8?(1-u)/.2:1); headX=.38*sad; }
    }
    if(C){ // 英雄：動作交給模型本身的動畫
      let want='idle';
      if(tk.hop||tk.queue.length) want='run';
      else if(tk.emo&&tk.emo.type==='win') want='dance';
      else if(tk.emo&&tk.emo.type==='happy') want='laugh';
      else if(tk.emo&&tk.emo.type==='sad') want='hit';
      else if(p.skip>0) want='stun';
      champPlay(C,want); mixUpdate(C,dt);
      if(!tk.hop||!tk.hop.leap) lift=tk.hop?lift:0; extraSpin=0; happy=false; sad=0;
    }
    else if(!tk.hop&&cur&&!tk.emo&&!rm) lift+=.035*Math.abs(Math.sin(t*3.2));
    if(rm) lift=Math.min(lift,.05);
    tk.lift.position.y=lift;
    const breath=(rm||C)?0:.025*Math.sin(t*2.4);
    const fy=sy*(1+breath)*(1-.08*sad), fxz=1/Math.sqrt(Math.max(.4,sy))*(1-breath*.5);
    R.scale.set(fxz,fy,fxz);
    R.rotation.y=tk.yaw+tk.spin+extraSpin+(C?CH_YAW:0);
    if(!C){
    A.head.rotation.set(headX,0,rm?0:Math.sin(t*.9)*.06);
    A.tail.rotation.z=Math.sin(t*(happy?16:5))*(happy?.5:.25);
    A.ears.forEach((e,k)=>{ e.rotation.x=(sad?-.35*sad:0)+(rm?0:Math.max(0,Math.sin(t*1.3+k*2)-.93)*3); });
    A.arms.forEach((a,k)=>{ a.position.y=.15+armUp*.1; a.position.x=(k?1:-1)*(.118+armUp*.03); });
    // 眨眼
    if(now>tk.blinkAt){ tk.blinkT=now; tk.blinkAt=now+2200+Math.random()*3200; }
    const bl=now-tk.blinkT<130?.12:1;
    A.eyes.forEach(e=>{ e.visible=!happy; e.scale.y=bl*(1-.55*sad); });
    A.happy.forEach(h=>h.visible=happy);
    A.sweat.visible=sad>.2; if(sad>.2){ A.sweat.position.y=.07-((now-tk.emo.t0)%900)/900*.08; }
    }
    // 影子、光圈、箭頭、皇冠、星星
    tk.shadow.scale.setScalar(clamp(1-lift*.55,.35,1));
    tk.ring.visible=cur&&!rm; if(tk.ring.visible){ const s=1+.08*Math.sin(t*5); tk.ring.scale.set(s,s,s); }
    tk.arrow.visible=cur&&idle(tk)&&st.phase==='play'; tk.arrow.position.y=(C?1.06:.86)+(rm?0:.04*Math.sin(t*4)); tk.arrow.rotation.y=t*1.5;
    tk.crownS+=((tk.lead?1:0)-tk.crownS)*Math.min(1,dt*6); tk.crown.visible=tk.crownS>.02; tk.crown.scale.setScalar(Math.max(.001,elastic(tk.crownS))); tk.crown.rotation.y=Math.sin(t*1.2)*.4; tk.crown.position.y=(C?.88:.63)-.07*sad;
    tk.stars.visible=p.skip>0; if(tk.stars.visible) tk.stars.children.forEach(s=>{ const a=s.userData.a+t*3; s.position.set(Math.cos(a)*.16,Math.sin(t*6+s.userData.a)*.02,Math.sin(a)*.16); s.rotation.y=t*4; });
    // 剩餘步數
    const showCount=tk.count>0&&!rm;
    tk.countEl.style.display=showCount?'':'none';
    if(showCount){ if(tk.countEl.textContent!==String(tk.count)) tk.countEl.textContent=tk.count; place(tk.countEl,g.position.clone().add(new THREE.Vector3(0,(.92+lift)*tk.sc,0))); }
  }
  function lerpAng(a,b,k){ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*k; }

  function place(el,v){
    const p=v.clone().project(camera);
    if(p.z>1){ el.style.display='none'; return; }
    el.style.left=((p.x+1)/2*W)+'px'; el.style.top=((1-p.y)/2*H)+'px';
  }

  function stepFx(now,dt){
    for(let k=parts.length-1;k>=0;k--){
      const P=parts[k]; P.t+=dt; const u=P.t/P.life;
      if(u>=1){ fxRoot.remove(P.m); parts.splice(k,1); continue; }
      if(P.drag) P.vel.multiplyScalar(Math.max(0,1-P.drag*dt));
      P.vel.y-=P.g*dt; P.m.position.addScaledVector(P.vel,dt);
      if(P.kind==='coin'){ P.m.rotation.z+=dt*14; if(P.m.position.y<TOP+.02){ P.m.position.y=TOP+.02; P.vel.y*=-.35; P.vel.x*=.6; P.vel.z*=.6; } P.m.scale.setScalar(P.s0*(u>.75?(1-u)/.25:1)); }
      else if(P.kind==='conf'){ P.m.rotation.x+=P.rv.x*dt; P.m.rotation.y+=P.rv.y*dt; if(P.m.position.y<.02){ P.m.position.y=.02; P.vel.set(0,0,0); P.g=0; } P.m.scale.setScalar(P.s0*(u>.85?(1-u)/.15:1)); }
      else { P.m.scale.setScalar(Math.max(.001,P.s0*(u<.3?.6+u/.3*.6:1.2*(1-u)/.7))); }
    }
    for(let k=floats.length-1;k>=0;k--){
      const F=floats[k], u=(now-F.t0)/F.dur;
      if(u>=1){ F.el.remove(); floats.splice(k,1); continue; }
      place(F.el,F.pos.clone().add(new THREE.Vector3(0,F.rise*easeOut(u),0)));
      F.el.style.opacity=u>.7?(1-u)/.3:1;
      const s=F.pop?(u<.25?elastic(u/.25)*1.1:1.1-.1*u):(u<.15?.6+u/.15*.5:1.1-.1*u);
      F.el.style.transform=`translate(-50%,-50%) scale(${s.toFixed(3)})`;
    }
    for(let k=tileFx.length-1;k>=0;k--){
      const X=tileFx[k], u=(now-X.t0)/X.dur; if(u<0) continue;
      if(X.type==='in'){ const S=X.obj.userData.s||1; X.obj.scale.setScalar(Math.max(.001,S*elastic(Math.min(1,u)))); if(u>=1){ X.obj.scale.setScalar(S); tileFx.splice(k,1); } }
      else { X.obj.scale.setScalar(Math.max(.001,(X.obj.userData.s||1)*(1-easeIO(Math.min(1,u))))); X.obj.position.y=.2*Math.min(1,u); if(u>=1){ X.parent.remove(X.obj); tileFx.splice(k,1); } }
    }
    // 小道具與旗子
    const t=now/1000;
    props.forEach(P=>{
      if(P.type==='chance'){ P.spin.rotation.y=t*1.2+P.phase; P.spin.position.y=.3+.035*Math.sin(t*2.2+P.phase); }
      else if(P.type==='wheel'){ P.spin.rotation.y=t*.9; }
      else if(P.type==='go'){ P.spin.rotation.y=t*1.1; P.spin.position.y=.26+.03*Math.sin(t*2); }
      else if(P.type==='rest'){ P.steam.forEach((s,k)=>{ const q=((t*.5+k/3)%1); s.position.set(Math.sin(q*6+k)*.02,.13+q*.22,0); s.scale.setScalar(.5+q*.8); s.visible=q<.92; }); }
      else if(P.type==='tax'){ P.bob.rotation.y=Math.sin(t*1.5+P.phase)*.4; }
      else if(P.type==='twitch'){ P.bob.position.y=-.02+Math.max(0,Math.sin(t*1.4+P.phase))*.05; P.bob.rotation.y=Math.sin(t*.8)*.5; }
    });
    tilesM.forEach(m=>{ if(m.flag){ const c=m.flag.userData.cloth; c.rotation.y=Math.sin(t*3+m.g.position.x*2)*.35; } });
  }

  function stepCamera(now,dt){
    if(dbgCam){ controls.target.copy(dbgCam.t); camera.position.copy(dbgCam.p); return; }
    if(camIntro){
      const u=clamp((now-camIntro.t0)/camIntro.dur,0,1), e=easeOut(u);
      camera.position.copy(controls.target).add(camIntro.from.clone().lerp(camIntro.to,e));
      if(u>=1) camIntro=null;
    }
    if(!homeTarget) return;
    let tgt=homeTarget.clone();
    if(celebrate){ const tk=tokens[celebrate.pi]; if(tk){ tgt=tk.g.position.clone(); const u=clamp((now-celebrate.t0)/1600,0,1); const off=camera.position.clone().sub(controls.target); const want=homeOffset.length()*(1-.42*easeOut(u)); off.setLength(off.length()+(want-off.length())*Math.min(1,dt*3)); camera.position.copy(controls.target).add(off); } }
    else if(restoreDist){ const off=camera.position.clone().sub(controls.target), want=homeOffset.length(); off.setLength(off.length()+(want-off.length())*Math.min(1,dt*3)); camera.position.copy(controls.target).add(off); if(Math.abs(off.length()-want)<.02) restoreDist=false; }
    if(!celebrate&&st.phase==='play'){ const tk=tokens[st.turn]; if(tk&&!tk.out){ const walking=!idle(tk); tgt.lerp(tk.g.position,walking?.2:.08); } }
    controls.target.lerp(tgt,Math.min(1,dt*(celebrate?2.5:3.6)));
  }

  function loop(){
    raf=0;
    if(!wrap||!wrap.isConnected) return;
    raf=requestAnimationFrame(loop);
    if((frame++%12)===0) fitSize($('board'));
    const now=performance.now(), dt=Math.min(.05,Math.max(0,(now-lastT)/1000)); lastT=now;
    if(!st) return;
    stepDice(now);
    tokens.forEach(tk=>stepToken(tk,now,dt));
    // 走完 → 通知 game.js
    if(settleWaiters.length){ const done=tokens.every(idle)&&!diceAnim; settleWaiters=settleWaiters.filter(w=>{ if(done||now-w.t0>8000){ w.res(); return false; } return true; }); }
    stepFx(now,dt);
    stepCamera(now,dt);
    const camMoved=controls.update();
    // 省電：有東西在動就全速；全部靜止時只畫每秒約 12 張（呼吸、眨眼仍看得到）
    const active=camMoved||!!diceAnim||parts.length>0||floats.length>0||tileFx.length>0||!!camIntro||restoreDist||settleWaiters.length>0||now-touchT<700
      ||(celebrate&&now-celebrate.t0<8000)||tokens.some(tk=>tk.hop||tk.queue.length||(tk.emo&&tk.emo.type!=='win')||(tk.out&&now-tk.dieT<2200)||tk.count>0);
    if(now-lastRender<(active?1000/61:80)) return;                // 動的時候最多每秒 60 張，靜止時約 12 張
    lastRender=now;
    renderer.render(scene,camera);
    // 地名標籤只在鏡頭真的動了才重新定位（每幀改 32 個 DOM 位置很耗電）
    const e=camera.matrixWorld.elements, sig=e.map(v=>Math.round(v*1000)).join(',')+':'+W+'x'+H;
    if(sig!==camSig){ camSig=sig;
      tilesM.forEach((m,i)=>place(labels[i],new THREE.Vector3(m.g.position.x-m.o.x*.06,.16,m.g.position.z+.3)));
      if(midEl) place(midEl,new THREE.Vector3(0,.02,ring().rows*.1)); }
    if(popEl&&popTile>=0){ const m=tilesM[popTile]; place(popEl,new THREE.Vector3(m.g.position.x,.3,m.g.position.z)); }
  }

  function stop(){
    if(raf) cancelAnimationFrame(raf); raf=0; showPop(-1);
    if(diceAnim){ const r=diceAnim.res; diceAnim=null; if(r) r(); }
    settleWaiters.forEach(w=>w.res()); settleWaiters=[];
    if(wrap&&wrap.parentNode) wrap.parentNode.removeChild(wrap);
    builtKey='';
  }

  // 除錯：特寫某位玩家（closeup(-1) 取消）
  function closeup(pi,d,tile){ if(pi<0&&tile==null){ dbgCam=null; return; } const tk=tokens[pi]; const t=tile!=null?new THREE.Vector3(posOf(tile).x,.3,posOf(tile).z):tk?tk.g.position.clone().add(new THREE.Vector3(0,.3,0)):null; if(!t) return; dbgCam={t,p:t.clone().add(new THREE.Vector3(.0,(d||1.2)*.45,(d||1.2)))}; }
  function diceUp(){ return dice.filter(d=>d.visible).map(d=>{ let best=-1,bi=0; FACE_N.forEach((n,i)=>{ const w=n.clone().applyQuaternion(d.quaternion).y; if(w>best){ best=w; bi=i; } }); return FACE_VAL[bi]; }); }
  return {ok,update,stop,rollDice,walkPlan,settle,stepMs:STEP_MS,closeup,diceUp,_tk:()=>tokens,_hk:()=>tokens.map(t=>t.champ?[+t.champ.hk.toFixed(2),+t.champ.holder.children[0].scale.x.toFixed(4),t.champ.hair.length]:null)};
})();
