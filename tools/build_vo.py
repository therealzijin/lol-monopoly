# 全英雄 × {en_US, ja_JP}：從遊戲 WAD 抽基本造型語音 → 依情境分類 → m4a
import sys, os, re, json, random, subprocess, tempfile, time, traceback
sys.path.insert(0,'/private/tmp/lolgame'); from vo import *
from concurrent.futures import ThreadPoolExecutor
OUT='/private/tmp/lolgame/voice_new'; LANGS={'en':'en_US','ja':'ja_JP'}
CATS=[ # (類別, 事件名稱規則, 上限)
 ('move', r'Move2D(?!First)', 6), ('first', r'Move2DFirst', 2), ('buy', r'Attack2D', 3), ('ult', r'R\d?_cast\dD$', 2),
 ('pay', r'Death3D', 3), ('earn', r'Kill3D(General)?$', 3), ('go', r'Recall3D', 2), ('joke', r'Joke3DGeneral', 1),
 ('laugh', r'Laugh3D', 2), ('taunt', r'Taunt3DGeneral', 1), ('meet', r'FirstEncounter3DGeneral', 2), ('respawn', r'Respawn2D', 1)]
ver=S.get('https://ddragon.leagueoflegends.com/api/versions.json').json()[0]
CH=S.get(f'https://ddragon.leagueoflegends.com/cdn/{ver}/data/en_US/champion.json').json()['data']
IDS={c.lower():c for c in CH}
MF={k.lower():v for k,v in manifest().items()}
def dur(w): return (len(w)-44)/(44100*2*2)
def conv(wem,dst):
    with tempfile.TemporaryDirectory() as td:
        open(f'{td}/a.wem','wb').write(wem); r=subprocess.run(['vgmstream-cli','-o',f'{td}/a.wav',f'{td}/a.wem'],capture_output=True)
        if r.returncode: return None
        info=subprocess.run(['afinfo',f'{td}/a.wav'],capture_output=True,text=True).stdout; m=re.search(r'estimated duration: ([\d.]+)',info); d=float(m.group(1)) if m else 0
        subprocess.run(['afconvert','-f','m4af','-d','aac','-c','1','-b','24000',f'{td}/a.wav',dst],check=True,capture_output=True); return d
def work(cid):
    try:
        low=cid.lower(); binj=S.get(f'https://raw.communitydragon.org/latest/game/data/characters/{low}/skins/skin0.bin.json',timeout=60)
        if not binj.ok: return cid,'nobin'
        root=next(v for k,v in binj.json().items() if k.lower().endswith('skins/skin0'))
        units=[bu for bu in root.get('skinAudioProperties',{}).get('bankUnits',[]) if any('/vo/' in p.lower() for p in bu.get('bankPath',[]))]
        if not units: return cid,'novo'
        res={}
        for L,loc in LANGS.items():
            f=MF.get(f'data/final/champions/{low}.{loc.lower()}.wad.client')
            if not f: continue
            rf=RemoteFile(f); E=wad_entries(rf); picks={}
            for bu in units:
                paths=[p.lower() for p in bu['bankPath']]; ev=[wad_get(rf,E,p) for p in paths if p.endswith('events.bnk')]; wp=[wad_get(rf,E,p) for p in paths if p.endswith('.wpk')]
                if not ev or not ev[0] or not wp or not wp[0]: continue
                objs=hirc(ev[0]); au=[wad_get(rf,E,p) for p in paths if p.endswith('audio.bnk')]
                if au and au[0]: objs.update(hirc(au[0]))
                em=event_media(objs,bu.get('events',[])); W=wpk(wp[0])
                for name,ids in em.items():
                    tail=name.split('_',3)[-1] if name.count('_')>=3 else name
                    for cat,rx,n in CATS:
                        if re.search(rx,name): picks.setdefault(cat,[]).extend(i for i in ids if i in W)
                    m=re.search(r'FirstEncounter3D(\w+)$',name)
                    if m and m.group(1).lower() in IDS: picks.setdefault('meet_'+IDS[m.group(1).lower()],[]).extend(i for i in ids if i in W)
                picks.setdefault('_W',{}).update(W)
            W=picks.pop('_W',{}); idx={}
            os.makedirs(f'{OUT}/{L}/{cid}',exist_ok=True)
            for cat,ids in picks.items():
                ids=sorted(set(ids)); random.Random(cid+cat).shuffle(ids)
                lim=next((n for c,_,n in CATS if c==cat),1); k=0
                for i in ids:
                    if k>=lim: break
                    d=conv(W[i],f'{OUT}/{L}/{cid}/{cat}{k}.m4a')
                    if d is None: continue
                    if d>5.5 and len(ids)>lim: os.remove(f'{OUT}/{L}/{cid}/{cat}{k}.m4a'); continue
                    k+=1
                if k: idx[cat]=k
            res[L]=idx
        return cid,res
    except Exception as e:
        return cid,'err '+repr(e)[:120]
only=sys.argv[1:] or list(CH.keys())
out={'en':{},'ja':{}}; t=time.time()
with ThreadPoolExecutor(3) as ex:
    for cid,r in ex.map(work,only):
        if isinstance(r,dict):
            for L,idx in r.items():
                if idx: out[L][cid]=idx
            print(cid, {L:sum(v.values()) for L,v in r.items()}, round(time.time()-t), flush=True)
        else: print(cid,r,flush=True)
for L in out:
    os.makedirs(f'{OUT}/{L}',exist_ok=True); p=f'{OUT}/{L}/index.json'
    old=json.load(open(p)) if os.path.exists(p) else {}; old.update(out[L]); json.dump(old,open(p,'w'),separators=(',',':'),sort_keys=True)
