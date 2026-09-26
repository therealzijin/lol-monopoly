/* 英雄造型選擇：英雄與造型資料來自 Riot Data Dragon，3D 模型與頭像來自 modelviewer.lol。
   選擇存在本機 localStorage（mp-skin0 = 自己、mp-skin1 = 同一支手機時的對方）。
   造型物件：{cid:'Teemo', sid:'17018', n:{zh,ja}（造型名）, cn:{zh,ja}（英雄名）} */
const CHAMP=(()=>{
  const DD='https://ddragon.leagueoflegends.com', MV='https://cdn.modelviewer.lol/lol';
  const LOC={zh:'zh_TW',ja:'ja_JP'};
  const TXT={
    zh:{t:'選擇英雄',q:'搜尋英雄（中文或英文）',animal:'Q版動物',animalS:'預設・不用下載',chg:'更換',loading:'載入中…',err:'無法取得英雄資料，請確認網路後再試一次。',def:'經典',
        note:'選好後，3D 模型會從 modelviewer.lol 即時下載，每個造型約 3～8 MB，建議連 Wi-Fi。下載完成前先用小動物代替。',noteSkin:'點一個造型就會選定。'},
    ja:{t:'チャンピオンを選ぶ',q:'チャンピオンを検索（日本語・英語）',animal:'ちびアニマル',animalS:'デフォルト・ダウンロード不要',chg:'変更',loading:'読み込み中…',err:'チャンピオン情報を取得できませんでした。通信を確認してもう一度お試しください。',def:'クラシック',
        note:'3D モデルは modelviewer.lol からその場でダウンロードされます（スキンごとに約 3〜8 MB、Wi-Fi 推奨）。読み込み完了までは動物で表示します。',noteSkin:'スキンをタップすると決定します。'},
  };
  const X=()=>TXT[lang]||TXT.zh;
  let ver=null, target=0, view='champs', curChamp=null;
  const lists={}, details={};

  async function getJSON(u){ const r=await fetch(u); if(!r.ok) throw new Error(r.status+' '+u); return r.json(); }
  async function getVer(){ if(!ver) ver=(await getJSON(DD+'/api/versions.json'))[0]; return ver; }
  async function getList(l){ if(!lists[l]){ const v=await getVer(); const j=await getJSON(`${DD}/cdn/${v}/data/${l}/champion.json`); lists[l]=Object.values(j.data); } return lists[l]; }
  async function getDetail(id,l){ const k=id+':'+l; if(!details[k]){ const v=await getVer(); details[k]=(await getJSON(`${DD}/cdn/${v}/data/${l}/champion/${id}.json`)).data[id]; } return details[k]; }

  function get(i){ try{ const s=JSON.parse(localStorage.getItem('mp-skin'+i)); return s&&s.cid&&s.sid?s:null; }catch(e){ return null; } }
  function set(i,s){ try{ if(s) localStorage.setItem('mp-skin'+i,JSON.stringify(s)); else localStorage.removeItem('mp-skin'+i); }catch(e){} refresh(); }
  const modelUrl=s=>`${MV}/models/${s.cid.toLowerCase()}/${s.sid}/model-compressed.wasm?c=1`;
  const circle=s=>`${MV}/circles/${s.sid}.webp`;
  const avatarImg=s=>`<img src="${circle(s)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('★'))">`;
  const pickL=o=>o&&(o[lang]||o.zh||o.ja)||'';
  const skinName=s=>pickL(s.n)||s.cid;

  function refresh(){
    [0,1].forEach(i=>{
      const b=$('pick'+i); if(!b) return; const s=get(i);
      b.innerHTML=s
        ?`${avatarImg(s)}<span><b>${esc(skinName(s))}</b><small>${esc(pickL(s.cn))}</small></span><span class="chg">${X().chg}</span>`
        :`<span class="emo">${AVATAR[i]}</span><span><b>${X().animal}</b><small>${X().animalS}</small></span><span class="chg">${X().chg}</span>`;
    });
  }

  /* ---------- 選擇視窗 ---------- */
  const M=()=>$('m-pick');
  function close(){ M().classList.remove('on'); }
  function open(i){ target=i; view='champs'; curChamp=null; $('pick-q').value=''; M().classList.add('on'); renderChamps(); }
  async function renderChamps(){
    view='champs'; $('pick-t').textContent=X().t; $('pick-q').style.display=''; $('pick-q').placeholder=X().q; $('pick-note').textContent=X().note;
    const g=$('pick-g'); g.className='sheet-b pick-grid';
    const cur=get(target);
    const animal=`<button class="pick-it ${cur?'':'sel'}" data-animal="1"><span class="emo">${AVATAR[target]}</span>${X().animal}</button>`;
    let list;
    try{ list=await getList(LOC[lang]||'zh_TW'); }catch(e){ g.innerHTML=animal+`<p style="grid-column:1/-1;font-size:13px">${X().err}</p>`; bind(); return; }
    if(view!=='champs') return;
    const q=$('pick-q').value.trim().toLowerCase();
    const shown=list.filter(c=>!q||c.name.toLowerCase().includes(q)||c.id.toLowerCase().includes(q)||c.title.toLowerCase().includes(q))
      .sort((a,b)=>a.name.localeCompare(b.name,lang==='ja'?'ja':'zh-Hant'));
    g.innerHTML=(q?'':animal)+shown.map(c=>`<button class="pick-it ${cur&&cur.cid===c.id?'sel':''}" data-cid="${c.id}"><img src="${DD}/cdn/${ver}/img/champion/${c.image.full}" alt="" loading="lazy">${esc(c.name)}</button>`).join('');
    bind();
  }
  async function renderSkins(cid){
    view='skins'; curChamp=cid; $('pick-q').style.display='none'; $('pick-note').textContent=X().noteSkin;
    const g=$('pick-g'); g.className='sheet-b pick-grid skins'; g.innerHTML=`<p style="grid-column:1/-1;font-size:13px">${X().loading}</p>`;
    let zh,ja;
    try{ [zh,ja]=await Promise.all([getDetail(cid,'zh_TW'),getDetail(cid,'ja_JP')]); }catch(e){ g.innerHTML=`<p style="grid-column:1/-1;font-size:13px">${X().err}</p>`; return; }
    if(view!=='skins'||curChamp!==cid) return;
    const me=lang==='ja'?ja:zh; $('pick-t').textContent=me.name;
    const cur=get(target), jaByNum={}; ja.skins.forEach(s=>jaByNum[s.num]=s.name);
    const skins=zh.skins.filter(s=>s.parentSkin==null);            // 炫彩（變色款）沒有獨立模型，排除
    g.innerHTML=skins.map(s=>{
      const nz=s.name==='default'?`${TXT.zh.def} ${zh.name}`:s.name, nj=(jaByNum[s.num]&&jaByNum[s.num]!=='default')?jaByNum[s.num]:`${TXT.ja.def} ${ja.name}`;
      return `<button class="pick-it ${cur&&cur.sid===s.id?'sel':''}" data-sid="${s.id}" data-nz="${esc(nz)}" data-nj="${esc(nj)}"><img src="${DD}/cdn/img/champion/tiles/${cid}_${s.num}.jpg" alt="" loading="lazy">${esc(lang==='ja'?nj:nz)}</button>`;
    }).join('');
    g.querySelectorAll('[data-sid]').forEach(b=>b.onclick=()=>{
      set(target,{cid,sid:b.dataset.sid,n:{zh:b.dataset.nz,ja:b.dataset.nj},cn:{zh:zh.name,ja:ja.name}});
      close();
    });
  }
  function bind(){
    const g=$('pick-g');
    g.querySelectorAll('[data-cid]').forEach(b=>b.onclick=()=>renderSkins(b.dataset.cid));
    const a=g.querySelector('[data-animal]'); if(a) a.onclick=()=>{ set(target,null); close(); };
  }

  function init(){
    [0,1].forEach(i=>{ const b=$('pick'+i); if(b) b.onclick=()=>open(i); });
    $('pick-x').onclick=close;
    $('pick-back').onclick=()=>{ if(view==='skins') renderChamps(); else close(); };
    $('pick-q').oninput=()=>{ if(view==='champs') renderChamps(); };
    M().onclick=e=>{ if(e.target===M()) close(); };
    refresh();
  }
  init();
  return {get,set,refresh,modelUrl,avatarImg,skinName,open};
})();
