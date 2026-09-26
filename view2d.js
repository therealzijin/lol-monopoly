/* 2D 盤面（フォールバック／ジグザグ用） */
const RING={quick:{cols:4,rows:8},classic:{cols:6,rows:12}};
function cellOf(i){
  if(layout==='snake'){ const r=Math.floor(i/4), c=(r%2===0)?(i%4):(3-i%4); return {r,c}; }
  const {cols,rows}=RING[st.mode];
  if(i<cols) return {r:0,c:i};
  if(i<cols+rows-2) return {r:i-cols+1,c:cols-1};
  if(i<2*cols+rows-2){ const k=i-(cols+rows-2); return {r:rows-1,c:cols-1-k}; }
  const k=i-(2*cols+rows-2); return {r:rows-2-k,c:0};
}
function dirOf(i,N){
  if(layout==='snake'){
    if(i===N-1) return ['↺',true];
    const r=Math.floor(i/4), last=(i%4===3);
    if(last) return ['↓',true];
    return [r%2===0?'→':'←',false];
  }
  const {cols,rows}=RING[st.mode];
  if(i===N-1) return ['↑',false];
  if(i===cols-1) return ['↓',true];
  if(i===cols+rows-2) return ['←',true];
  if(i===2*cols+rows-3) return ['↑',true];
  if(i<cols-1) return ['→',false];
  if(i<cols+rows-2) return ['↓',false];
  if(i<2*cols+rows-2) return ['←',false];
  return ['↑',false];
}
const view2d={ update(){
  const TT=tiles(), N=TT.length;
  const b=$('board'); b.className='board '+layout+' '+st.mode;
  const cols=layout==='snake'?4:RING[st.mode].cols, rows=layout==='snake'?Math.ceil(N/4):RING[st.mode].rows;
  b.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  let h='';
  TT.forEach((t,i)=>{
    const {r,c}=cellOf(i);
    const o=st.owners[i]; const hot=st.players[st.turn].pos===i&&st.phase==='play';
    const cls=['tile',t.t!=='prop'?'corner':'',o?'own'+o.owner:'',hot?'hot':''].join(' ');
    const band=t.t==='prop'?`<div class="band" style="background:var(--g${t.g})"></div>`:'<div class="band" style="background:transparent"></div>';
    const sub=t.t==='prop'?(o?`<span class="lv">${'▲'.repeat(o.level)||'&nbsp;'}</span>`:`<span class="tp">$${t.p}</span>`):(t.t==='tax'?`<span class="tp">-$${t.a}</span>`:'');
    const here=st.players.map((p,pi)=>!p.out&&p.pos===i?pi:-1).filter(x=>x>=0);
    const tk=here.length?`<span class="tks n${here.length}">${here.map(pi=>`<span class="tk p${pi} ${st.turn===pi&&st.phase==='play'?'act':''}">${avatarHTML(pi)}</span>`).join('')}</span>`:'';
    const [ar,turn]=dirOf(i,N);
    h+=`<div class="${cls}" style="grid-row:${r+1};grid-column:${c+1}">${band}<span class="idx">${i+1}</span>${o?'<span class="ow"></span>':''}<span class="dir ${turn?'turn':''}">${ar}</span><span class="tn">${tileName(i)}</span>${sub}${tk}</div>`;
  });
  if(layout==='ring'){
    const cur=st.players[st.turn];
    const msg=st.phase==='over'?`<b>${T('over')}</b>`:(myTurn()?T('turnOf',{n:cur.name}):T('waitFor',{n:cur.name}));
    const last=st.log[0]?`<div class="last">${logText(st.log[0])}</div>`:'';
    h+=`<div class="mid" style="grid-row:2/${rows};grid-column:2/${cols}">${msg}${last}</div>`;
  }
  b.innerHTML=h;
} };
