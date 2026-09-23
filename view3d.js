/* 3D 盤面（Three.js r128）。ロジックには触らず、st を読んで描くだけ。 */
const view3d=(()=>{
  const P_COL=[0xFF6B57,0x4D9DE0,0xA56BFF,0x2FB57A];
  const TINT=[0xFFE6E1,0xDFEDFB,0xEEE4FF,0xDDF5EA];
  const GCOL={'粉':0xF7A1C4,'橘':0xFFA25B,'黃':0xF2D45C,'綠':0x7ED3A3,'藍':0x5FC9C9,'紫':0xC39BF2,'金':0xF2C14E};
  const RINGS={quick:{cols:4,rows:8},classic:{cols:6,rows:12}};
  const PAPER=0xFFF4DE, PAPER_DIM=0xEFE2C8, HOT=0xFFFBEF;
  let renderer=null,scene,camera,controls,root,wrap,labelsEl,midEl;
  let tilesM=[],labels=[],tokens=[],builtKey='',raf=0,W=0,H=0,frame=0,lastMode='';
  let webgl=null;
  let homeTarget=null, dice=[], diceAnim=null, popEl=null, popTile=-1, camLerp=null, downAt=null;
  const UP=new THREE.Vector3(0,1,0);
  // BoxGeometry の面順: +x,-x,+y,-y,+z,-z → 目 1,6,2,5,3,4（向かい合う面の和が 7）
  const FACE_VAL=[1,6,2,5,3,4];
  const FACE_N=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(a=>new THREE.Vector3(...a));

  function ok(){
    if(typeof THREE==='undefined') return false;
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
  function outer(i){ // マスの外側方向（色帯を置く側）
    const {cols,rows}=ring(); const {r,c}=cell(i);
    if(r===0) return {x:0,z:-1}; if(c===cols-1) return {x:1,z:0}; if(r===rows-1) return {x:0,z:1}; return {x:-1,z:0};
  }
  function emojiTex(ch){
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.font='96px -apple-system,"Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(ch,64,72);
    const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; return t;
  }
  function pipTex(n){
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.fillStyle='#FFF4DE'; g.fillRect(0,0,128,128);
    g.fillStyle='#2B2420'; const P={1:[[64,64]],2:[[36,36],[92,92]],3:[[36,36],[64,64],[92,92]],4:[[36,36],[92,36],[36,92],[92,92]],5:[[36,36],[92,36],[64,64],[36,92],[92,92]],6:[[36,32],[92,32],[36,64],[92,64],[36,96],[92,96]]}[n];
    P.forEach(([x,y])=>{ g.beginPath(); g.arc(x,y,11,0,Math.PI*2); g.fill(); });
    const t=new THREE.CanvasTexture(c); t.anisotropy=4; return t;
  }
  function makeDie(){
    const mats=FACE_VAL.map(v=>new THREE.MeshStandardMaterial({map:pipTex(v),roughness:.35,metalness:0}));
    const m=new THREE.Mesh(new THREE.BoxGeometry(.62,.62,.62),mats); m.visible=false; return m;
  }
  function faceQuat(val,yaw){ // val の面が上を向く回き＋任意のヨー
    const n=FACE_N[FACE_VAL.indexOf(val)];
    const q=new THREE.Quaternion().setFromUnitVectors(n,UP);
    return new THREE.Quaternion().setFromAxisAngle(UP,yaw).multiply(q);
  }
  const mat=(color,extra)=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.85,metalness:0},extra||{}));

  function init(){
    wrap=document.createElement('div'); wrap.className='v3wrap';
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    renderer.outputEncoding=THREE.sRGBEncoding;
    wrap.appendChild(renderer.domElement);
    labelsEl=document.createElement('div'); labelsEl.className='v3labels'; wrap.appendChild(labelsEl);
    const hint=document.createElement('div'); hint.className='v3hint'; hint.textContent='↔ 旋轉・pinch 縮放'; wrap.appendChild(hint);
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(38,1,.1,100);
    scene.add(new THREE.HemisphereLight(0xffffff,0x2a4a47,.95));
    const sun=new THREE.DirectionalLight(0xfff4de,.75); sun.position.set(3,9,5); scene.add(sun);
    root=new THREE.Group(); scene.add(root);
    controls=new THREE.OrbitControls(camera,renderer.domElement);
    controls.enablePan=false; controls.enableDamping=true; controls.dampingFactor=.12; controls.rotateSpeed=.55;
    controls.minPolarAngle=.12; controls.maxPolarAngle=1.05; controls.minAzimuthAngle=-1.2; controls.maxAzimuthAngle=1.2;
    renderer.domElement.style.touchAction='pan-y'; // 縦スワイプはページスクロールに譲る
    const el=renderer.domElement;
    el.addEventListener('pointerdown',e=>{ downAt={x:e.clientX,y:e.clientY,t:performance.now()}; });
    el.addEventListener('pointerup',e=>{
      if(!downAt) return; const dx=e.clientX-downAt.x, dy=e.clientY-downAt.y, dt=performance.now()-downAt.t; downAt=null;
      if(dx*dx+dy*dy>64||dt>500) return;
      const r=el.getBoundingClientRect(); const v=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
      const rc=new THREE.Raycaster(); rc.setFromCamera(v,camera);
      const hit=rc.intersectObjects(tilesM.map(m=>m.base),false)[0];
      if(hit){ const i=tilesM.findIndex(m=>m.base===hit.object); showPop(i===popTile?-1:i); } else showPop(-1);
    });
  }

  function clear(g){ while(g.children.length){ const c=g.children[0]; g.remove(c); if(c.geometry) c.geometry.dispose(); } }

  function build(){
    clear(root); tilesM=[]; labels=[]; tokens=[]; labelsEl.innerHTML='';
    const {cols,rows}=ring(), TT=tiles();
    // テーブル（フェルト）
    const table=new THREE.Mesh(new THREE.BoxGeometry(cols+1.1,.16,rows+1.1),mat(0x1B3B39,{roughness:.95}));
    table.position.y=-.09; root.add(table);
    const inner=new THREE.Mesh(new THREE.BoxGeometry(cols-1.85,.02,rows-1.85),mat(0x2F5F5B,{roughness:.95}));
    inner.position.y=0; root.add(inner);
    // マス
    TT.forEach((t,i)=>{
      const {x,z}=posOf(i), o=outer(i), g=new THREE.Group(); g.position.set(x,0,z);
      const base=new THREE.Mesh(new THREE.BoxGeometry(.92,.14,.92),mat(t.t==='prop'?PAPER:PAPER_DIM)); base.position.y=.07; g.add(base);
      let band=null;
      if(t.t==='prop'){
        const horiz=o.z!==0; band=new THREE.Mesh(new THREE.BoxGeometry(horiz?.92:.17,.035,horiz?.17:.92),mat(GCOL[t.g],{roughness:.6}));
        band.position.set(o.x*.375,.155,o.z*.375); g.add(band);
      }
      const houses=new THREE.Group(); houses.position.set(-o.x*.05,.14,-o.z*.05); g.add(houses);
      const hot=new THREE.Mesh(new THREE.BoxGeometry(1.02,.03,1.02),new THREE.MeshBasicMaterial({color:0xF2C14E})); hot.position.y=-.01; hot.visible=false; g.add(hot);
      root.add(g); tilesM.push({g,base,band,houses,hot,t,o,lvl:-1,owner:-1});
      const el=document.createElement('div'); el.className='lbl'; labelsEl.appendChild(el); labels.push(el);
    });
    midEl=document.createElement('div'); midEl.className='mid3'; labelsEl.appendChild(midEl);
    dice=Array.from({length:cfg().dice},()=>{ const d=makeDie(); root.add(d); return d; }); diceAnim=null;
    popTile=-1; if(popEl){ popEl.remove(); popEl=null; }
    // コマ
    st.players.forEach((p,pi)=>{
      const g=new THREE.Group();
      const ringM=new THREE.Mesh(new THREE.RingGeometry(.2,.3,28),new THREE.MeshBasicMaterial({color:0xF2C14E,transparent:true,opacity:.85,side:THREE.DoubleSide}));
      ringM.rotation.x=-Math.PI/2; ringM.position.y=.005; ringM.visible=false; g.add(ringM);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.11,22),mat(P_COL[pi],{roughness:.5})); base.position.y=.055; g.add(base);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(AVATAR[pi]),transparent:true,depthWrite:false}));
      sp.scale.set(.4,.4,1); sp.position.y=.34; g.add(sp);
      root.add(g); tokens.push({g,ring:ringM,sp,base,pi,cur:null,from:null,to:null,t0:0,dur:130});
    });
    // カメラ
    const fov=camera.fov*Math.PI/180, span=Math.max(rows+1.6,(cols+1.6)*1.25);
    const dist=span/(2*Math.tan(fov/2))*.78;
    controls.target.set(0,0,rows*.11);
    camera.position.set(0,dist*.78,dist*.63).add(controls.target);
    controls.minDistance=dist*.45; controls.maxDistance=dist*1.35; controls.update(); camLerp=null; homeTarget=controls.target.clone();
    builtKey=st.mode+':'+st.players.length;
  }

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
      h+=row(T('i_owner'),o?st.players[o.owner].name:T('i_none'));
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
    if(n<=1) return [0,.12];
    if(n===2) return [[-.22,.12],[.22,.12]][k];
    if(n===3) return [[-.24,.02],[.24,.02],[0,.3]][k];
    return [[-.24,-.02],[.24,-.02],[-.24,.32],[.24,.32]][k];
  }

  function update(){
    if(!ok()) return;
    if(!renderer) init();
    const b=$('board');
    b.className='board three '+st.mode;
    if(wrap.parentNode!==b){ b.innerHTML=''; b.appendChild(wrap); W=H=0; }
    fitSize(b);
    if(builtKey!==st.mode+':'+st.players.length) build();

    const TT=tiles(), play=st.phase==='play', cur=st.players[st.turn];
    // マスの見た目
    tilesM.forEach((m,i)=>{
      const o=st.owners[i], owner=o?o.owner:-1, lvl=o?o.level:0;
      const hot=play&&cur.pos===i&&!cur.out;
      m.base.material.color.setHex(hot?HOT:owner>=0?TINT[owner]:(m.t.t==='prop'?PAPER:PAPER_DIM));
      m.hot.visible=hot;
      if(owner!==m.owner||lvl!==m.lvl){
        clear(m.houses); m.owner=owner; m.lvl=lvl;
        if(owner>=0){
          // 所有者のピン（色帯の内側に細い棒）
          const pin=new THREE.Mesh(new THREE.BoxGeometry(.92,.05,.06),mat(P_COL[owner],{roughness:.5}));
          if(m.o.z===0){ pin.geometry.dispose(); pin.geometry=new THREE.BoxGeometry(.06,.05,.92); }
          pin.position.set(m.o.x*.22,.025,m.o.z*.22); m.houses.add(pin);
          for(let k=0;k<lvl;k++){
            const h=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,.15),mat(P_COL[owner],{roughness:.4}));
            const along=(k-(lvl-1)/2)*.2;
            h.position.set(m.o.z!==0?along:-m.o.x*.05, .075+.05, m.o.x!==0?along:-m.o.z*.05);
            m.houses.add(h);
          }
        }
      }
      // ラベル
      const el=labels[i]; let sub='';
      if(m.t.t==='prop') sub=o?`$${rentOf(i)}`:`$${m.t.p}`; else if(m.t.t==='tax') sub=`-$${m.t.a}`;
      const html=`${tileName(i)}${sub?`<small>${sub}</small>`:''}`;
      if(el.dataset.h!==html){ el.innerHTML=html; el.dataset.h=html; }
    });
    // 中央メッセージ
    const msg=st.phase==='over'?`<b>${T('over')}</b>`:(myTurn()&&!cur.npc?T('turnOf',{n:cur.name}):T('waitFor',{n:cur.name}));
    const last=st.log[0]?`<div class="last">${logText(st.log[0])}</div>`:'';
    const mh=msg+last; if(midEl.dataset.h!==mh){ midEl.innerHTML=mh; midEl.dataset.h=mh; }
    // コマの目標位置
    const now=performance.now();
    TT.forEach((t,i)=>{
      const here=st.players.map((p,pi)=>!p.out&&p.pos===i?pi:-1).filter(x=>x>=0);
      const {x,z}=posOf(i);
      here.forEach((pi,k)=>{
        const [dx,dz]=slotOffset(k,here.length), tk=tokens[pi];
        const target=new THREE.Vector3(x+dx,.14,z+dz);
        const sc=here.length>=3?.8:1; tk.g.scale.setScalar(sc);
        if(!tk.to||tk.to.distanceToSquared(target)>1e-6){
          if(!tk.cur){ tk.cur=target.clone(); tk.g.position.copy(target); tk.to=target; }
          else { tk.from=tk.cur.clone(); tk.to=target; tk.t0=now; tk.dur=tk.from.distanceTo(target)>1.6?360:130; }
        }
      });
    });
    tokens.forEach(tk=>{ const p=st.players[tk.pi]; tk.g.visible=!p.out; tk.ring.visible=play&&st.turn===tk.pi&&!p.out; });
    // サイコロ（アニメ中でなければ結果をそのまま置く）
    if(!diceAnim){
      const {rows}=ring();
      dice.forEach((d,k)=>{ const v=st.dice[k]; d.visible=!!v; if(v){ d.position.set(diceX(k),.31,-rows*.16); d.quaternion.copy(faceQuat(v,k*1.1+.4)); } });
    }
    // カメラ：手番のコマの方へほんの少し寄る
    if(homeTarget){ const tk=tokens[st.turn]; camLerp=play&&tk&&tk.to?homeTarget.clone().lerp(tk.to,.18):homeTarget.clone(); }
    renderPop();
    if(!raf) raf=requestAnimationFrame(loop);
  }

  function diceX(k){ return (k-(dice.length-1)/2)*.85; }
  function rollDice(vals){
    return new Promise(res=>{
      const {rows}=ring(); const now=performance.now();
      diceAnim={t0:now,dur:900,res,items:vals.map((v,k)=>({d:dice[k],v,x:diceX(k),z:-rows*.16,q0:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6)),
        axis:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),spin:9+Math.random()*5,qf:faceQuat(v,Math.random()*6.28),x0:(Math.random()-.5)*1.2,z0:(Math.random()-.5)*.8,bounced:false}))};
      dice.forEach(d=>d.visible=true);
      if(typeof sfx==='function') sfx('dice');
      if(!raf) raf=requestAnimationFrame(loop);
    });
  }
  function stepDice(now){
    if(!diceAnim) return;
    const u=Math.min(1,(now-diceAnim.t0)/diceAnim.dur);
    diceAnim.items.forEach(it=>{
      // 高さ：落下 → 一回バウンド → 静止
      let y; if(u<.55){ const k=u/.55; y=.31+2.4*(1-k*k); } else { const k=(u-.55)/.45; y=.31+.55*Math.sin(Math.PI*k)*(1-k); if(!it.bounced){ it.bounced=true; if(typeof sfx==='function') sfx('dice'); } }
      const ease=1-Math.pow(1-u,3);
      it.d.position.set(it.x+it.x0*(1-ease), y, it.z+it.z0*(1-ease));
      const qs=it.q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(it.axis,it.spin*(1-Math.pow(1-u,2))));
      const w=u<.5?0:Math.pow((u-.5)/.5,2); it.d.quaternion.copy(qs).slerp(it.qf,w);
      if(u>=1){ it.d.position.set(it.x,.31,it.z); it.d.quaternion.copy(it.qf); }
    });
    if(u>=1){ const r=diceAnim.res; diceAnim=null; r(); }
  }

  function place(el,v){
    const p=v.clone().project(camera);
    if(p.z>1){ el.style.display='none'; return; }
    el.style.display=''; el.style.left=((p.x+1)/2*W)+'px'; el.style.top=((1-p.y)/2*H)+'px';
  }

  function loop(t){
    raf=0;
    if(!wrap||!wrap.isConnected){ return; }
    raf=requestAnimationFrame(loop);
    if((frame++%12)===0) fitSize($('board'));
    const now=performance.now();
    tokens.forEach(tk=>{
      if(!tk.to) return;
      if(tk.from){
        let u=Math.min(1,(now-tk.t0)/tk.dur); const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
        tk.cur.lerpVectors(tk.from,tk.to,e); tk.cur.y=tk.to.y+Math.sin(u*Math.PI)*(tk.dur>200?.9:.32);
        if(u>=1){ tk.from=null; tk.cur.copy(tk.to); }
      }
      tk.g.position.copy(tk.cur);
      if(tk.ring.visible){ tk.g.position.y+=.02+Math.sin(now/170)*.03; }
    });
    stepDice(now);
    if(camLerp) controls.target.lerp(camLerp,.06);
    controls.update();
    renderer.render(scene,camera);
    tilesM.forEach((m,i)=>place(labels[i],new THREE.Vector3(m.g.position.x-m.o.x*.12,.19,m.g.position.z-m.o.z*.12)));
    if(midEl) place(midEl,new THREE.Vector3(0,.02,ring().rows*.1));
    if(popEl&&popTile>=0){ const m=tilesM[popTile]; place(popEl,new THREE.Vector3(m.g.position.x,.3,m.g.position.z)); }
  }

  function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; showPop(-1); if(diceAnim){ const r=diceAnim.res; diceAnim=null; r(); } if(wrap&&wrap.parentNode) wrap.parentNode.removeChild(wrap); }

  return {ok,update,stop,rollDice};
})();
