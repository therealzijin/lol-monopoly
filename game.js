/* ---------- 資料 ---------- */
const AVATAR=['🐱','🐶','🦊','🐻'];
const NPC_NAMES=[{zh:'狐狸',ja:'キツネ'},{zh:'熊熊',ja:'クマ'}];
const P=(zh,ja,p,g)=>({t:'prop',n:{zh,ja},p,g});
const TILES={
  quick:[
    {t:'go'},P('悠米貓咖','ユーミ猫カフェ',60,'粉'),{t:'chance'},P('塔姆吃到飽','タム食べ放題',80,'粉'),{t:'tax',a:100},
    {t:'rest'},P('逆命電影院','TF映画館',120,'藍'),P('提莫蘑菇火鍋','ティーモきのこ鍋',140,'藍'),{t:'chance'},P('吉茵珂絲樂園','ジンクス遊園地',160,'藍'),
    {t:'jail'},P('慎溫泉旅館','シェン温泉旅館',200,'綠'),P('犽宿夜市','ヤスオ夜市',220,'綠'),{t:'chance'},P('卡爾瑪百貨','カルマデパート',240,'綠'),
    {t:'wheel'},P('漢默丁格科技','ハイマー研究所',280,'金'),{t:'twitch'},P('巴德摩天輪','バード観覧車',320,'金'),{t:'chance'}
  ],
  classic:[
    {t:'go'},P('悠米貓咖','ユーミ猫カフェ',60,'粉'),{t:'chance'},P('塔姆吃到飽','タム食べ放題',60,'粉'),{t:'tax',a:200},P('阿姆姆便利店','アムムコンビニ',80,'粉'),P('逆命電影院','TF映画館',100,'橘'),{t:'chance'},
    {t:'rest'},P('提莫蘑菇火鍋','ティーモきのこ鍋',120,'橘'),P('索娜KTV','ソナカラオケ',140,'橘'),{t:'wheel'},P('吉茵珂絲樂園','ジンクス遊園地',160,'黃'),P('娜米水族館','ナミ水族館',180,'黃'),{t:'chance'},P('奈德麗動物園','ニダリー動物園',200,'黃'),
    {t:'jail'},P('慎溫泉旅館','シェン温泉旅館',220,'綠'),P('犽宿夜市','ヤスオ夜市',240,'綠'),{t:'twitch'},P('卡爾瑪百貨','カルマデパート',260,'綠'),{t:'chance'},P('漢默丁格科技','ハイマー研究所',280,'藍'),P('伊澤電競館','エズリアルeスポ',300,'藍'),
    {t:'wheel'},P('拉姆斯高鐵站','ラムス新幹線駅',320,'藍'),{t:'chance'},P('巴德摩天輪','バード観覧車',350,'紫'),P('阿妮維亞機場','アニビア空港',380,'紫'),{t:'tax',a:200},P('索爾太空港','オレリオン宇宙港',400,'紫'),{t:'chance'}
  ]
};
const CFG={quick:{start:1200,dice:1,maxRounds:15,side:5},classic:{start:1200,dice:2,maxRounds:40,side:8}};
const C=(zh,ja,fx)=>({txt:{zh,ja},fx});
const CARDS=[
  // 情侶日常
  C('對方今晚洗碗！心情大好','相手が今夜の食器洗い！ご機嫌',{money:100}),
  C('偷吃對方的零食被抓到','相手のおやつをつまみ食いしてバレた',{money:-80}),
  C('生日快樂！對方送你紅包','お誕生日おめでとう！相手からお祝い金',{give:150}),
  C('對對方說一句情話，然後前進 3 格','相手に甘い一言を言って、3マス進む',{move:3}),
  C('忘了紀念日，退 3 格反省','記念日を忘れた。3マス戻って反省',{move:-3}),
  C('抱抱卡：兩人都加 50','ハグカード：ふたりとも +50',{both:50}),
  C('幫對方按摩 30 秒，酬勞入帳','相手を30秒マッサージして報酬ゲット',{money:100}),
  C('吵架了，罰站一回合','ケンカした。1回休み',{jail:true}),
  // 天馬行空
  C('被外星人抓走做實驗，醒來不知道在哪','エイリアンに拉致されて実験台に。目覚めたらどこ？',{teleport:true}),
  C('踩到提莫的蘑菇，中毒 -100 還退 2 格','ティーモのキノコを踏んだ。毒で -100、2マス戻る',{money:-100,move:-2}),
  C('撿到聰明果實，算出捷徑，前進 4 格','かしこい果実を拾った。近道を発見、4マス進む',{move:4}),
  C('吃到會飛的餅乾，飄了 5 格','空飛ぶクッキーを食べて 5マス飛んだ',{move:5}),
  C('被一群鴿子追，逃到對方旁邊','ハトの群れに追われて、相手のところまで逃げた',{gotoOpp:true}),
  C('被神明附身，和對方交換位置','神様が降りてきて、相手と位置が入れ替わった',{swap:true}),
  C('對方被外星人抓走，罰站一回合','相手がエイリアンに拉致された。相手は1回休み',{jailOther:true}),
  C('中了外星彩券','宇宙宝くじに当選',{money:300}),
  C('路邊撿到一隻貓，養貓費','道でネコを拾った。ネコ代',{money:-80}),
  C('手滑把錢轉給對方','手が滑って相手に送金してしまった',{lose:100}),
  C('迷路了，繞回起點（沒有獎金）','道に迷ってスタートに戻った（ボーナスなし）',{gotoNoPay:0}),
  C('撿到對方的錢包，誠實歸還獲得獎勵','相手の財布を拾って返した。お礼をもらう',{give:100}),
  C('手遊輸了摔手機','ゲームで負けてスマホを投げた',{money:-150}),
  C('銀行算錯帳，多給你錢','銀行の計算ミスで臨時収入',{money:200}),
  C('中了發票！','レシート宝くじ当選！',{money:250}),
  C('被邀請上綜藝節目，講一個冷笑話拿通告費','バラエティ番組に出演。寒いギャグを言って出演料ゲット',{money:120}),
  // 召喚峽谷
  C('辛吉德跑過去撒了一路毒，你被毒暈，罰站一回合','シンジドが毒をまきながら走り抜けた。毒で気絶、1回休み',{jail:true}),
  C('被塞恩開大撞飛，直接飛出去 6 格','サイオンのウルトに吹き飛ばされて 6マス飛んだ',{move:6}),
  C('希維爾開大！下一次擲骰移動距離加倍','シヴィアのウルト発動！次のサイコロは移動距離2倍',{boost:true}),
  C('被布里茨的機械飛爪勾走，拉到對方旁邊','ブリッツクランクのロケットグラブに引き寄せられて相手の隣へ',{gotoOpp:true}),
  C('巴德開了傳送門，你好奇走進去，不知道通到哪','バードのポータルに興味本位で入ってみた。どこに出る？',{teleport:true}),
  C('被塔姆一口吞掉，在起點被吐出來（沒有獎金）','タム・ケンチに丸呑みされて、スタートで吐き出された（ボーナスなし）',{gotoNoPay:0}),
  C('踩到薩科的小丑盒，嚇到往後跳 3 格','シャコのジャック・イン・ザ・ボックスにビビって 3マス後退',{move:-3}),
  C('學德萊文接斧頭，接了十次，觀眾打賞','ドレイヴンの斧キャッチを10回成功。観客からチップ',{money:200}),
  C('走進漢默丁格的砲台範圍，被打了一輪','ハイマーディンガーのタレットの射程に入って撃たれた',{money:-100}),
  C('阿姆姆過來求抱抱，兩人心軟了，各加 50','アムムがハグを求めてきた。ふたりとも心が緩んで +50',{both:50}),
  C('被露璐變成松鼠，只能小碎步退 2 格','ルルにリスにされて、ちょこちょこ 2マス後退',{move:-2}),
  C('吉茵珂絲亂丟火箭炸到你','ジンクスのロケットが流れ弾で命中',{money:-120}),
  // 翻盤機制
  C('劫富濟貧！資產最高的人付給其他每人 $120','義賊登場！資産トップが他の全員に $120 ずつ支払う',{robinhood:120}),
  C('趁亂佈告：把資產最高的人一塊未升級的地過戶給你','どさくさに紛れて、資産トップの未改築の土地を1つもらった',{steal:true}),
  C('房市崩跌：所有人的租金下一輪打對折','不動産バブル崩壊：全員の家賃が次のラウンドは半額',{crash:true}),
  C('落後補助：排名最後的人領 $200','逆転チャンス：最下位が $200 受け取る',{lastAid:200}),
  C('巴德開了捷徑：直接走到下一塊還沒人買的地','バードの近道！次の空き地まで一気に進む',{nextFree:true}),
  C('拉姆斯說 OK，滾到下一塊空地看看','ラムスが「OK」と転がって次の空き地へ',{nextFree:true}),
];
const WHEEL=[C('大獎','大当たり',{money:300}),C('小獎','当たり',{money:150}),C('安慰獎','残念賞',{money:50}),C('銘謝惠顧','ハズレ',{money:0}),C('轉到破洞','穴に落ちた',{money:-100}),C('對方賠你','相手が払う',{give:100})];
const LVMULT=[1,2,3.5,5];
const RULE={freeProps:5, upkeepPct:.05, propTaxFree:3, propTax:50, underdogRent:.5, npcCap:6, starterMax:160, finalRounds:3, homestretch:200, awards:{rent:300,chance:200,laps:200}};


/* ---------- 語言 ---------- */
const STR={
zh:{
 title:'兩人大富翁',sub:'給你們兩個玩的小桌遊。各拿一支手機，開一間房就能開始。',
 myname:'你的名字',myname_ph:'例如：周',name2:'對方的名字',name2_ph:'例如：小美',
 how:'怎麼玩',online:'兩支手機',online_s:'各看自己的畫面',local:'同一支手機',local_s:'輪流傳給對方',
 npc:'電腦玩家',npc0:'不要',npc1:'1 位',npc2:'2 位',props:'地產',bonus:'落後補助',char0:'你的角色',char1:'對方的角色',sellBtn:'拍賣／出售地產',sellTitle:'出售地產',sellHint:'拍賣：其他人各出一次價（互相看不到），價高者得，底價是地價的一半。賣給銀行：立刻拿回一半的錢。',auction:'拍賣',bankBtn:'賣銀行 ${v}',auctionOn:'<b>{s}</b> 拍賣「<b>{t}</b>」，價值 ${v}，底價 ${m}',yourBid:'你的出價',bid:'出價',passBid:'不要',bidDone:'已出價',thinking:'考慮中',bidFor:'把手機交給 <b>{n}</b> 出價',secLeft:'剩 {s} 秒',noProps:'你目前沒有地產。',closeBtn:'關閉',rules:'玩法說明',rules_title:'玩法說明',close:'知道了',riot:'本遊戲為依據 Riot Games「Legal Jibber Jabber」政策製作的非商業粉絲作品，使用了 Riot Games 擁有的素材。Riot Games 並未背書或贊助本作。英雄 3D 模型來自 modelviewer.lol，英雄資料來自 Riot Data Dragon。',i_owner:'持有者',i_none:'無人',i_price:'價格',i_rent:'租金',i_lv:'等級',i_next:'升級後租金',i_tax:'稅金（或現金 8%）',i_full:'（整組加倍）',layout:'棋盤排列',ring:'環形',ring_s:'繞一圈，方向清楚',snake:'蛇形',snake_s:'格子最大，來回走',mode:'模式',quick:'快速',quick_s:'20 格・15 回合・約 10 分',classic:'經典',classic_s:'32 格・最多 40 回合',
 create:'開新房間',startLocal:'開始遊戲',code_ph:'輸入 4 位房號',join:'加入',
 note:'兩支手機模式：把連結傳給對方，房主選模式開房，對方輸入房號加入。兩支手機最好連同一個 Wi-Fi。語言可以各自選。',
 e_storage:'這個環境沒有連線功能，請改用「同一支手機」模式。',e_disc:'連線中斷了。兩支手機請連同一個 Wi-Fi，然後重新開房。',connecting:'連線中…',e_name:'先填你的名字。',e_create:'建立房間失敗，請再試一次。',e_code:'房號是 4 位數字。',e_notfound:'找不到這個房號，確認一下對方有沒有開房。',e_started:'這間房已經開始了。',
 lobby_title:'房間已開',lobby_sub:'把這個房號告訴對方，讓對方在首頁輸入加入。',waiting:'等待對方加入…',joined:'{n} 已加入，可以開始。',guestWait:'已加入 {n} 的房間，等房主按開始…',start:'開始遊戲',leave:'回首頁',
 m_quick:'快速模式',m_classic:'經典模式',room:'房號',onePhone:'同一支手機',round:'第 {r} / {m} 回合',you:'（你）',worth:'總資產',skipping:'罰站中',boosted:'加速中',
 over:'遊戲結束',turnOf:'<b>{n}</b> 的回合',waitFor:'等 <b>{n}</b> 走完',moving:'走路中…',yourTurn:'<b>{n}</b>，換你了。',passPhone:'把手機交給 <b>{n}</b>，換你了。',roll:'擲骰子',
 buyQ:'「<b>{t}</b>」沒人買，要用 ${p} 買下嗎？',buy:'買下',noBuy:'不買',upQ:'「<b>{t}</b>」可以升級（${c}），租金會從 ${a} 漲到 ${b}。',up:'升級',noUp:'先不要',end:'結束回合',waitTurn:'輪到 <b>{n}</b>，稍等一下。',
 draw:'平手！',wins:'{n} 贏了！',drawSub:'兩人資產一樣多，改天再分勝負。',winSub:'輸的人負責今晚的家事（規則自訂）。',rankSub:'名次：{r}',awardsTitle:'終局獎項',aw_rent:'苦主獎',aw_chance:'冒險獎',aw_laps:'旅行獎',npcWin:'被電腦贏走了！兩個人一起負責家事。',again:'再來一局',hostAgain:'等房主開下一局…',home:'回首頁',
 tile:{go:'起點',chance:'機會',tax:'稅務局',rest:'咖啡休息',jail:'罰站區',wheel:'幸運轉盤',twitch:'圖奇偷家'},
 log:{start:'遊戲開始！後手多拿 $100 補償。',again:'新的一局開始！後手多拿 $100 補償。',roll:'{n} 擲出 {s}',boost:'{n} 希維爾加速中！移動距離加倍，走 {s} 格',passGo:'{n} 經過起點，領 ${a}',npcBuy:'{n} 買下了「{t}」',npcPass:'{n} 看了看「{t}」，決定不買',robin:'{n} 是首富，付給其他每人 ${a}',steal:'{n} 拿走了 {o} 的「{t}」',crash:'房市崩跌！下一輪所有租金減半',lastAid:'{n} 排名最後，領補助 ${a}',out:'{n} 出局了',newRound:'第 {r} 回合開始，這回合由 {n} 先手',auctionStart:'{n} 拍賣「{t}」，底價 ${m}',auctionWin:'{b} 以 ${p} 標下 {n} 的「{t}」',auctionNone:'「{t}」沒人出價，流標',bankSell:'{n} 把「{t}」賣給銀行，拿回 ${v}',dealt:'{n} 起手抽到「{t}」，付 ${p}',final:'最後 {k} 回合！排名最後的 {n} 領衝刺補助 ${a}',award_rent:'苦主獎：{n} 這局共付租金 ${v}，獲得 ${a}',award_chance:'冒險獎：{n} 抽了 {v} 張機會卡，獲得 ${a}',award_laps:'旅行獎：{n} 經過起點 {v} 次，獲得 ${a}',upkeep:'{n} 持有 {c} 塊地，超額部分繳維護費 ${a}',taxProp:'{n} 被稅務局收走 ${a}（含地產稅 ${b}）',rentHalf:'{n} 排名最後，踩到 {o} 的「{t}」租金減半，付 ${r}',twitch:'{n} 被圖奇偷家！「{t}」被偷走，重新變成空地',twitchCash:'{n} 被圖奇偷家！沒有地可偷，現金被摸走 ${a}',twitchNone:'{n} 被圖奇偷家，但家裡空空的，什麼都沒被偷',taxPct:'{n} 被稅務局收走 ${a}（依現金 8%）',
  canBuy:'{n} 來到「{t}」，可以用 ${p} 買下',poor:'{n} 來到「{t}」，但錢不夠買',rent:'{n} 踩到 {o} 的「{t}」，付租金 ${r}',canUp:'{n} 回到自己的「{t}」，可以花 ${c} 升級',back:'{n} 回到自己的「{t}」',
  chance:'{n} 抽到機會：{c}',tax:'{n} 被稅務局收走 ${a}',jail:'{n} 被罰站，下一回合暫停',wheel:'{n} 轉到「{w}」',rest:'{n} 在咖啡店休息一下',go:'{n} 停在起點',
  sell:'{n} 錢不夠，賣掉「{t}」換回 ${v}',bankrupt:'{n} 破產了！',skip:'{n} 這回合罰站，跳過',bought:'{n} 買下了「{t}」',upgraded:'{n} 把「{t}」升到 {l} 級',settle:'{m} 回合結束！結算資產：{r}'}
},
ja:{
 title:'ふたりの大富豪すごろく',sub:'ふたり専用のミニボードゲーム。それぞれスマホを持って、部屋を作ればすぐ始められます。',
 myname:'あなたの名前',myname_ph:'例：なつ',name2:'相手の名前',name2_ph:'例：しゅう',
 how:'遊び方',online:'スマホ2台',online_s:'それぞれの画面で',local:'スマホ1台',local_s:'交代で回す',
 npc:'コンピュータ',npc0:'なし',npc1:'1人',npc2:'2人',props:'物件',bonus:'補助',char0:'あなたのキャラ',char1:'相手のキャラ',sellBtn:'物件を競売／売却',sellTitle:'物件を手放す',sellHint:'競売：ほかの人が1回ずつ入札（お互い見えない）。最高額の人が落札。最低価格は物件価格の半分。銀行に売る：すぐに半額を受け取る。',auction:'競売',bankBtn:'銀行に売る ${v}',auctionOn:'<b>{s}</b> が「<b>{t}</b>」を競売中。価値 ${v}、最低 ${m}',yourBid:'あなたの入札',bid:'入札',passBid:'見送る',bidDone:'入札済み',thinking:'検討中',bidFor:'スマホを <b>{n}</b> に渡して入札',secLeft:'残り {s} 秒',noProps:'まだ物件を持っていません。',closeBtn:'閉じる',rules:'遊び方',rules_title:'遊び方',close:'わかった',riot:'本作は Riot Games の「Legal Jibber Jabber」ポリシーに基づき、Riot Games 所有の素材を使用して作られた非営利のファン作品です。Riot Games は本作を推奨・後援していません。チャンピオンの 3D モデルは modelviewer.lol、データは Riot Data Dragon を利用しています。',i_owner:'所有者',i_none:'なし',i_price:'価格',i_rent:'家賃',i_lv:'レベル',i_next:'改築後の家賃',i_tax:'税金（または所持金の8%）',i_full:'（そろって2倍）',layout:'盤面の並び',ring:'ぐるり一周',ring_s:'方向がわかりやすい',snake:'ジグザグ',snake_s:'マスが一番大きい',mode:'モード',quick:'クイック',quick_s:'20マス・15ラウンド・約10分',classic:'クラシック',classic_s:'32マス・最大40ラウンド',
 create:'部屋を作る',startLocal:'ゲーム開始',code_ph:'4桁の部屋番号',join:'参加',
 note:'スマホ2台モード：リンクを相手に送り、ホストがモードを選んで部屋を作り、相手は部屋番号を入力して参加します。ふたりとも同じWi-Fiにつなぐのがおすすめ。言語はそれぞれ選べます。',
 e_storage:'この環境ではオンライン接続が使えません。「スマホ1台」モードをお使いください。',e_disc:'接続が切れました。ふたりとも同じWi-Fiにつないで、部屋を作り直してください。',connecting:'接続中…',e_name:'先に名前を入力してください。',e_create:'部屋を作れませんでした。もう一度お試しください。',e_code:'部屋番号は4桁の数字です。',e_notfound:'その部屋番号が見つかりません。相手が部屋を作ったか確認してください。',e_started:'この部屋はすでに始まっています。',
 lobby_title:'部屋ができました',lobby_sub:'この番号を相手に伝えて、トップ画面で入力してもらってください。',waiting:'相手の参加を待っています…',joined:'{n} が参加しました。開始できます。',guestWait:'{n} の部屋に参加しました。ホストの開始を待っています…',start:'ゲーム開始',leave:'トップへ戻る',
 m_quick:'クイック',m_classic:'クラシック',room:'部屋',onePhone:'スマホ1台',round:'ラウンド {r} / {m}',you:'（あなた）',worth:'総資産',skipping:'1回休み中',boosted:'加速中',
 over:'ゲーム終了',turnOf:'<b>{n}</b> のターン',waitFor:'<b>{n}</b> の番です',moving:'移動中…',yourTurn:'<b>{n}</b>、あなたの番です。',passPhone:'スマホを <b>{n}</b> に渡してください。',roll:'サイコロを振る',
 buyQ:'「<b>{t}</b>」は空き地。${p} で買いますか？',buy:'買う',noBuy:'買わない',upQ:'「<b>{t}</b>」を ${c} でアップグレードできます。家賃が ${a} → ${b} に。',up:'アップグレード',noUp:'やめておく',end:'ターン終了',waitTurn:'<b>{n}</b> の番です。少しお待ちください。',
 draw:'引き分け！',wins:'{n} の勝ち！',drawSub:'資産が同じ。勝負はまた今度。',winSub:'負けた人が今夜の家事担当（ルールはご自由に）。',rankSub:'順位：{r}',awardsTitle:'ボーナス賞',aw_rent:'苦労賞',aw_chance:'冒険賞',aw_laps:'旅行賞',npcWin:'コンピュータの勝ち！ふたりで家事担当。',again:'もう一局',hostAgain:'ホストが次のゲームを始めるのを待っています…',home:'トップへ戻る',
 tile:{go:'スタート',chance:'チャンス',tax:'税務署',rest:'カフェ休憩',jail:'おしおき',wheel:'ルーレット',twitch:'トゥイッチ襲来'},
 log:{start:'ゲーム開始！後手は補償として $100 多くもらえます。',again:'次のゲーム開始！後手は補償として $100 多くもらえます。',roll:'{n} が {s} を出した',boost:'{n} はシヴィアの加速中！移動距離2倍で {s} マス進む',passGo:'{n} がスタートを通過、${a} 受け取り',npcBuy:'{n} が「{t}」を購入',npcPass:'{n} は「{t}」を見て買わなかった',robin:'{n} は資産トップ。他の全員に ${a} 支払い',steal:'{n} が {o} の「{t}」を奪った',crash:'バブル崩壊！次のラウンドは全員の家賃が半額',lastAid:'{n} は最下位。補助 ${a} 受け取り',out:'{n} が脱落',newRound:'ラウンド {r} 開始。このラウンドは {n} から',auctionStart:'{n} が「{t}」を競売に。最低 ${m}',auctionWin:'{b} が {n} の「{t}」を ${p} で落札',auctionNone:'「{t}」は入札なしで不成立',bankSell:'{n} が「{t}」を銀行に売って ${v} 受け取り',dealt:'{n} の初期物件は「{t}」、${p} 支払い',final:'ラスト {k} ラウンド！最下位の {n} に追い上げボーナス ${a}',award_rent:'苦労賞：{n} は家賃を合計 ${v} 支払った。${a} 獲得',award_chance:'冒険賞：{n} はチャンスカードを {v} 枚引いた。${a} 獲得',award_laps:'旅行賞：{n} はスタートを {v} 回通過。${a} 獲得',upkeep:'{n} は物件 {c} 件。超過分の維持費 ${a} を支払い',taxProp:'{n} が税務署に ${a} 取られた（物件税 ${b} 込み）',rentHalf:'{n} は最下位。{o} の「{t}」の家賃は半額、${r} 支払い',twitch:'{n} の家にトゥイッチが侵入！「{t}」が奪われて空き地に戻った',twitchCash:'{n} の家にトゥイッチが侵入！土地がないので現金 ${a} を盗まれた',twitchNone:'{n} の家にトゥイッチが侵入したが、何もなくて手ぶらで帰った',taxPct:'{n} が税務署に ${a} 取られた（所持金の8%）',
  canBuy:'{n} が「{t}」に到着。${p} で買える',poor:'{n} が「{t}」に到着したが、お金が足りない',rent:'{n} が {o} の「{t}」に止まり、家賃 ${r} を支払い',canUp:'{n} が自分の「{t}」に戻った。${c} でアップグレード可能',back:'{n} が自分の「{t}」に戻った',
  chance:'{n} がチャンスカード：{c}',tax:'{n} が税務署に ${a} 取られた',jail:'{n} がおしおき。次のターンは休み',wheel:'{n} のルーレット：「{w}」',rest:'{n} はカフェでひと休み',go:'{n} がスタートに止まった',
  sell:'{n} はお金が足りず、「{t}」を売って ${v} 回収',bankrupt:'{n} が破産！',skip:'{n} はおしおき中、このターンは休み',bought:'{n} が「{t}」を購入',upgraded:'{n} が「{t}」をレベル {l} に',settle:'{m} ラウンド終了！資産結果：{r}'}
}};
let lang=(navigator.language||'').toLowerCase().startsWith('ja')?'ja':'zh';
let layout='ring';
const S=()=>STR[lang];
function fmt(tpl,p){return tpl.replace(/\{(\w+)\}/g,(m,k)=>p&&p[k]!=null?esc(p[k]):m)}
function T(k,p){return fmt(S()[k],p)}
function tileName(i){const t=tiles()[i];return t.n?t.n[lang]:S().tile[t.t]}
function logText(e){const p=Object.assign({},e.p||{});if(p.ti!=null)p.t=tileName(p.ti);if(p.ci!=null)p.c=CARDS[p.ci].txt[lang];if(p.wi!=null)p.w=WHEEL[p.wi].txt[lang];return fmt(S().log[e.k],p)}
/* ---------- 玩法說明（數字直接讀規則常數） ---------- */
function rulesHTML(){
  const q=CFG.quick, c=CFG.classic, R=RULE, pct=x=>Math.round(x*100)+'%', lv=LVMULT.slice(1).map(x=>'×'+x).join(' / ');
  const tw=TILES.quick.length, cw=TILES.classic.length, ja=lang==='ja';
  const sec=(h,items)=>`<h3>${h}</h3><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if(ja) return sec('勝ち方',[`ゲーム終了時に<b>総資産</b>（所持金＋物件価格＋改築費）がいちばん多い人の勝ち。`,`ほかの全員が破産した場合も、その時点で勝ち。`])
   +sec('モード',[`クイック：${tw}マス・サイコロ${q.dice}個・${q.maxRounds}ラウンド・初期資金 $${q.start}`,`クラシック：${cw}マス・サイコロ${c.dice}個・${c.maxRounds}ラウンド・初期資金 $${c.start}`,`後手は $100 多くもらえる。先手はラウンドごとに1人ずつずれる。`,`開始時、全員に $${R.starterMax} 以下の物件が1つランダムに配られる（代金は支払う）。`])
   +sec('物件と家賃',[`空き地に止まったら価格どおりに買える。買わなければそのまま。`,`他人の物件に止まると家賃を払う（物件価格の${pct(.5)}）。同じ色をすべて持っていると家賃2倍。`,`色をそろえた物件に戻ると改築できる（費用は物件価格の半分）。レベル1〜3で家賃 ${lv}。`,`お金が足りないと物件を半額で自動売却。売り切っても足りなければ脱落。`])
   +sec('特別なマス',[`スタート：通過で $200。順位が1つ下がるごとに +$50。`,`チャンス：カードを1枚引く。ルーレット：お金が増えたり減ったり。`,`税務署：決まった額か所持金の8%の高いほう。さらに物件${R.propTaxFree}件を超える分は1件 $${R.propTax}。`,`おしおき：次のターンは休み。カフェ休憩：何も起きない。`,`トゥイッチ襲来：物件を1つ盗まれて空き地に戻る。物件がなければ現金 $100。`])
   +sec('逆転のしくみ',[`毎ラウンド開始時、物件が${R.freeProps}件を超える分は1件につき価格の${pct(R.upkeepPct)}の維持費。`,`最下位の人は家賃が半額。`,`ラスト${R.finalRounds}ラウンドに入ると最下位に $${R.homestretch}。`,`終了時のボーナス賞：苦労賞（家賃を一番払った）+$${R.awards.rent}、冒険賞（チャンス最多）+$${R.awards.chance}、旅行賞（スタート通過最多）+$${R.awards.laps}。`])
   +sec('そのほか',[`コンピュータ（キツネ・クマ）は自動で動く。`,`マスをタップすると持ち主・家賃が見られる。`]);
  return sec('怎麼贏',[`遊戲結束時<b>總資產</b>（現金＋地價＋升級投入）最高的人獲勝。`,`其他人全部破產時，剩下的人直接獲勝。`])
   +sec('模式',[`快速：${tw} 格・${q.dice} 顆骰子・${q.maxRounds} 回合・起始資金 $${q.start}`,`經典：${cw} 格・${c.dice} 顆骰子・${c.maxRounds} 回合・起始資金 $${c.start}`,`後手多拿 $100。每回合先手輪換一位。`,`開局每人隨機分到一塊 $${R.starterMax} 以下的地（要付錢）。`])
   +sec('地產與租金',[`停在空地可以照地價買下，不買就留著。`,`停在別人的地要付租金（地價的 ${pct(.5)}）。同色整組都是同一人的，租金加倍。`,`整組到手後回到自己的地可以升級（費用為地價一半），1～3 級租金 ${lv}。`,`錢不夠時自動半價賣地，賣光還不夠就出局。`])
   +sec('特殊格',[`起點：經過領 $200，排名每落後一名多 $50。`,`機會：抽一張卡。幸運轉盤：可能拿錢也可能扣錢。`,`稅務局：固定稅額或現金 8% 取高，另外持有超過 ${R.propTaxFree} 塊地的部分每塊加收 $${R.propTax}。`,`罰站區：下回合暫停。咖啡休息：什麼都不會發生。`,`圖奇偷家：被偷走一塊地變回空地；沒有地就被摸走 $100。`])
   +sec('翻盤機制',[`每回合開始，持有超過 ${R.freeProps} 塊地的部分，每塊繳地價 ${pct(R.upkeepPct)} 維護費。`,`排名最後的人付租金半價。`,`進入最後 ${R.finalRounds} 回合時，排名最後的人領 $${R.homestretch}。`,`終局獎項：苦主獎（付最多租金）+$${R.awards.rent}、冒險獎（抽最多機會卡）+$${R.awards.chance}、旅行獎（最多次經過起點）+$${R.awards.laps}。`])
   +sec('其他',[`電腦玩家（狐狸、熊熊）會自動行動。`,`點棋盤上的格子可以看持有者和租金。`]);
}
function openRules(){ $('m-rules-t').textContent=T('rules_title'); $('m-rules-b').innerHTML=rulesHTML()+`<p class="riot">${T('riot')}</p>`; $('m-rules-x').textContent=T('close'); $('m-rules').classList.add('on'); }
function pickOf(i){ return typeof CHAMP!=='undefined'?CHAMP.get(i):null; }
function avatarHTML(i){ const p=st&&st.players[i]; return p&&p.skin&&typeof CHAMP!=='undefined'?CHAMP.avatarImg(p.skin):AVATAR[i]; }
function applyLang(){
  $('html').lang=lang==='ja'?'ja':'zh-Hant';
  document.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=S()[e.dataset.i]);
  document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=S()[e.dataset.ph]);
  document.querySelectorAll('#seg-lang button').forEach(b=>b.classList.toggle('sel',b.dataset.v===lang));
  $('b-create').textContent=homeConn==='online'?T('create'):T('startLocal');
  $('b-lang').textContent=lang==='ja'?'中文':'日本語';
  $('b-layout').textContent=layout==='ring'?T('snake'):T('ring');
  const is3=typeof view3d!=='undefined'&&currentView()===view3d; $('b-view').textContent=is3?'2D':'3D'; $('b-layout').style.display=is3?'none':''; $('b-view').style.display=(typeof view3d!=='undefined'&&view3d.ok())?'':'none';
  document.querySelectorAll('#seg-layout button').forEach(b=>b.classList.toggle('sel',b.dataset.v===layout));
  if(typeof CHAMP!=='undefined') CHAMP.refresh();
  if(st) render();
}

/* ---------- 音效（Web Audio 合成，無外部檔案） ---------- */
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}}, lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let muted=lsGet('mp-muted')==='1', actx=null;
let acIdle=null;
// 省電：20 秒沒有聲音或頁面切到背景就讓音訊晶片休眠；任何觸控或下一個音效再喚醒
function ac(){ if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx&&actx.state==='suspended') actx.resume();
  if(actx){ clearTimeout(acIdle); acIdle=setTimeout(()=>{ try{ actx.suspend(); }catch(e){} },20000); } return actx; }
function tone(f,t0,dur,type='sine',vol=.18,f2){
  const a=ac(); if(!a) return; const o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.setValueAtTime(f,a.currentTime+t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,a.currentTime+t0+dur);
  g.gain.setValueAtTime(0,a.currentTime+t0); g.gain.linearRampToValueAtTime(vol,a.currentTime+t0+.01); g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+t0+dur);
  o.connect(g).connect(a.destination); o.start(a.currentTime+t0); o.stop(a.currentTime+t0+dur+.02);
}
function noise(t0,dur,vol=.12){
  const a=ac(); if(!a) return; const n=a.sampleRate*dur|0, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=a.createBufferSource(), g=a.createGain(), f=a.createBiquadFilter(); f.type='highpass'; f.frequency.value=1800;
  src.buffer=b; g.gain.value=vol; src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime+t0);
}
const SFX={
  click:()=>tone(900,0,.05,'square',.06),
  dice:()=>{ noise(0,.06,.15); tone(300+rnd(200),0,.05,'triangle',.08); },
  step:()=>tone(520,0,.06,'triangle',.1,420),
  coin:()=>{ tone(988,0,.09,'sine',.16); tone(1319,.08,.16,'sine',.16); },
  pay:()=>{ tone(330,0,.12,'sawtooth',.1,220); tone(220,.12,.18,'sawtooth',.1,150); },
  buy:()=>{ [523,659,784,1047].forEach((f,i)=>tone(f,i*.07,.12,'sine',.14)); },
  up:()=>{ [659,784,988,1319].forEach((f,i)=>tone(f,i*.06,.1,'triangle',.12)); },
  card:()=>{ noise(0,.08,.1); tone(700,.05,.12,'sine',.1,1100); },
  wheel:()=>{ for(let i=0;i<8;i++) tone(400+i*60,i*.07,.05,'square',.06); },
  jail:()=>{ tone(150,0,.25,'sawtooth',.14,60); noise(0,.15,.08); },
  win:()=>{ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,i*.12,.22,'triangle',.16)); },
  lose:()=>{ [440,415,392,349].forEach((f,i)=>tone(f,i*.2,.28,'sawtooth',.1)); },
};
function sfx(k){ if(muted) return; try{ SFX[k]&&SFX[k](); }catch(e){} }
function setMuted(m){ muted=m; lsSet('mp-muted',m?'1':'0'); document.querySelectorAll('.b-mute').forEach(b=>b.textContent=m?'🔇':'🔊'); }
document.addEventListener('pointerdown',()=>ac());
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&actx){ try{ actx.suspend(); }catch(e){} } });
document.addEventListener('click',e=>{ if(e.target.closest('button')) sfx('click'); },true);

/* ---------- 狀態 ---------- */
let st=null;            // 共享遊戲狀態
let net={online:false,code:'',me:0};
let timer=null, busy=false;
const $=id=>document.getElementById(id);
const rnd=n=>Math.floor(Math.random()*n);
const hasStorage=()=>typeof window.storage!=='undefined' && window.storage && window.storage.get;
const key=()=> 'room:'+net.code;

function newState(mode,names,skins){
  skins=skins||[];
  const c=CFG[mode];
  return {
    mode, phase:'lobby', seq:1, code:net.code, guestJoined:false,
    players:[{name:names[0]||'玩家一',money:c.start,pos:0,skip:0,rentPaid:0,chances:0,laps:0,skin:skins[0]||null},{name:names[1]||'玩家二',money:c.start+100,pos:0,skip:0,rentPaid:0,chances:0,laps:0,skin:skins[1]||null}]
      .concat(Array.from({length:npcCount},(_,k)=>({name:NPC_NAMES[k][lang],money:c.start,pos:0,skip:0,npc:true,rentPaid:0,chances:0,laps:0}))),
    awards:[],
    owners:{}, turn:0, first:0, round:1, step:'roll', pending:null, dice:[], winner:null, log:[], crash:0
  };
}
function tiles(){return TILES[st.mode]}
function cfg(){return CFG[st.mode]}
function log(k,p){st.log.unshift({k,p}); if(st.log.length>30) st.log.length=30;}
function groupTiles(g){return tiles().map((t,i)=>t.g===g?i:-1).filter(i=>i>=0)}
function ownsGroup(pi,g){return groupTiles(g).every(i=>st.owners[i]&&st.owners[i].owner===pi)}
function propCount(pi){return Object.values(st.owners).filter(o=>o.owner===pi).length}
function alive(){return st.players.map((p,i)=>p.out?-1:i).filter(i=>i>=0)}
function ranking(){return alive().sort((a,b)=>worth(b)-worth(a))}
function rankOf(pi){return ranking().indexOf(pi)}
function richest(){return ranking()[0]}
function goBonus(pi){return 200+50*Math.max(0,rankOf(pi))}
function upkeepOf(pi){
  const mine=Object.keys(st.owners).filter(i=>st.owners[i].owner===pi).map(i=>tiles()[i].p).sort((a,b)=>b-a);
  const extra=mine.slice(0,Math.max(0,mine.length-RULE.freeProps));
  return Math.round(extra.reduce((a,p)=>a+p*RULE.upkeepPct,0)/10)*10;
}
function dealStarters(){
  const cheap=tiles().map((t,i)=>t.t==='prop'&&t.p<=RULE.starterMax?i:-1).filter(i=>i>=0);
  st.players.forEach((p,pi)=>{ const pool=cheap.filter(i=>!st.owners[i]); if(!pool.length) return; const i=pool[rnd(pool.length)]; st.owners[i]={owner:pi,level:0}; p.money-=tiles()[i].p; log('dealt',{n:p.name,ti:i,p:tiles()[i].p}); });
}
function giveAwards(){
  st.awards=[];
  [['rent','rentPaid'],['chance','chances'],['laps','laps']].forEach(([k,f])=>{
    const a=alive(); if(!a.length) return; let best=-1,bv=0,tie=false;
    a.forEach(i=>{ const v=st.players[i][f]||0; if(v>bv){ bv=v; best=i; tie=false; } else if(v===bv&&v>0) tie=true; });
    if(best>=0&&!tie){ const amt=RULE.awards[k]; st.players[best].money+=amt; st.awards.push({k,pi:best,a:amt,v:bv}); log('award_'+k,{n:st.players[best].name,a:amt,v:bv}); }
  });
}
function startGame(k){ st.phase='play'; log(k); dealStarters(); }
function chargeUpkeep(){
  alive().forEach(pi=>{ const a=upkeepOf(pi); if(a>0){ log('upkeep',{n:st.players[pi].name,c:propCount(pi),a}); pay(pi,a,null); } });
}
function rentAt(i,owner,level){const t=tiles()[i];let base=Math.round(t.p*0.5/10)*10;if(ownsGroup(owner,t.g))base*=2;return Math.round(base*LVMULT[level]/10)*10}
function rentOf(i){const o=st.owners[i];let r=rentAt(i,o.owner,o.level);if(st.crash>0)r=Math.round(r/2/10)*10;return r}
function upCost(i){return tiles()[i].p/2}
function worth(pi){if(st.players[pi].out)return 0;let w=st.players[pi].money;for(const i in st.owners){const o=st.owners[i];if(o.owner===pi)w+=tiles()[i].p+o.level*upCost(i)}return w}
function other(pi){const c=alive().filter(i=>i!==pi);return c.length?c[rnd(c.length)]:pi}

function pay(pi,amt,to){
  const p=st.players[pi]; p.money-=amt; if(to!=null) st.players[to].money+=amt;
  if(p.money<0){
    const mine=Object.keys(st.owners).filter(i=>st.owners[i].owner===pi).sort((a,b)=>tiles()[b].p-tiles()[a].p);
    for(const i of mine){ if(p.money>=0) break; const v=tiles()[i].p/2+st.owners[i].level*upCost(i)/2; p.money+=v; delete st.owners[i]; log('sell',{n:p.name,ti:i,v}); }
    if(p.money<0){ p.out=true; p.money=0; log('bankrupt',{n:p.name}); log('out',{n:p.name}); const a=alive(); if(a.length<=1){ st.phase='over'; st.winner=a[0]!=null?a[0]:null; } }
  }
}
function applyFx(pi,fx){
  const p=st.players[pi], q=st.players[other(pi)], N=tiles().length;
  let mv=0, re=false;
  if(fx.money) { if(fx.money>0) p.money+=fx.money; else pay(pi,-fx.money,null); }
  if(fx.give) pay(other(pi),fx.give,pi);
  if(fx.lose) pay(pi,fx.lose,other(pi));
  if(fx.both){ alive().forEach(i=>st.players[i].money+=fx.both); }
  if(fx.jail) p.skip=1;
  if(fx.jailOther) q.skip=1;
  if(fx.boost) p.boost=1;
  if(fx.goto!=null){ p.pos=fx.goto; if(fx.goto===0) p.money+=goBonus(pi); }
  if(fx.robinhood){ const r=richest(); const others=alive().filter(i=>i!==r); log('robin',{n:st.players[r].name,a:fx.robinhood}); others.forEach(i=>pay(r,fx.robinhood,i)); }
  if(fx.steal){ const r=richest(); if(r!==pi){ const c=Object.keys(st.owners).filter(i=>st.owners[i].owner===r&&st.owners[i].level===0); if(c.length){ const i=c[rnd(c.length)]; st.owners[i].owner=pi; log('steal',{n:p.name,o:st.players[r].name,ti:i}); } } }
  if(fx.crash){ st.crash=2; log('crash'); }
  if(fx.lastAid){ const rk=ranking(), l=rk[rk.length-1]; st.players[l].money+=fx.lastAid; log('lastAid',{n:st.players[l].name,a:fx.lastAid}); }
  if(fx.gotoNoPay!=null){ p.pos=fx.gotoNoPay; }
  if(fx.teleport){ p.pos=rnd(N); re=true; }
  if(fx.nextFree){ for(let k=1;k<=N;k++){ const j=(p.pos+k)%N; if(tiles()[j].t==='prop'&&!st.owners[j]){ if(j<p.pos){ const a=goBonus(pi); p.money+=a; p.laps=(p.laps||0)+1; log('passGo',{n:p.name,a}); } p.pos=j; re=true; break; } } }
  if(fx.gotoOpp){ p.pos=q.pos; re=true; }
  if(fx.swap){ const a=p.pos; p.pos=q.pos; q.pos=a; re=true; }
  if(fx.move) mv=fx.move;
  return {mv,re};
}
function land(pi,depth){
  const p=st.players[pi], i=p.pos, t=tiles()[i];
  st.pending=null;
  if(t.t==='prop'){
    const o=st.owners[i];
    if(!o){ if(p.money>=t.p){ st.pending={type:'buy',tile:i}; log('canBuy',{n:p.name,ti:i,p:t.p}); } else log('poor',{n:p.name,ti:i}); }
    else if(o.owner!==pi){ let r=rentOf(i); const last=alive().length>1&&rankOf(pi)===alive().length-1; if(last) r=Math.round(r*RULE.underdogRent/10)*10; log(last?'rentHalf':'rent',{n:p.name,o:st.players[o.owner].name,ti:i,r}); p.rentPaid=(p.rentPaid||0)+r; pay(pi,r,o.owner); sfx('pay'); }
    else { if(ownsGroup(pi,t.g)&&o.level<3&&p.money>=upCost(i)){ st.pending={type:'up',tile:i}; log('canUp',{n:p.name,ti:i,c:upCost(i)}); } else log('back',{n:p.name,ti:i}); }
  } else if(t.t==='chance'){
    const ci=rnd(CARDS.length),c=CARDS[ci]; log('chance',{n:p.name,ci}); p.chances=(p.chances||0)+1; sfx('card');
    const r=applyFx(pi,c.fx);
    if(st.phase==='over') return;
    if(r.mv&&depth<1){ p.pos=(p.pos+r.mv+tiles().length)%tiles().length; land(pi,depth+1); return; }
    if(r.re&&depth<1){ if(tiles()[p.pos].t!=='chance') land(pi,depth+1); return; }
  } else if(t.t==='tax'){ const pct=Math.round(p.money*.08/10)*10; const b=RULE.propTax*Math.max(0,propCount(pi)-RULE.propTaxFree); const a=Math.max(t.a,pct)+b; log(b>0?'taxProp':(a>t.a?'taxPct':'tax'),{n:p.name,a,b}); pay(pi,a,null); sfx('pay'); }
  else if(t.t==='jail'){ p.skip=1; log('jail',{n:p.name}); sfx('jail'); }
  else if(t.t==='twitch'){
    const mine=Object.keys(st.owners).filter(j=>st.owners[j].owner===pi);
    if(mine.length){ const lows=mine.filter(j=>st.owners[j].level===0), pool=lows.length?lows:mine, j=pool[rnd(pool.length)]; delete st.owners[j]; log('twitch',{n:p.name,ti:j}); }
    else if(p.money>=60){ const a=Math.min(100,p.money); log('twitchCash',{n:p.name,a}); pay(pi,a,null); }
    else log('twitchNone',{n:p.name});
    sfx('card');
  }
  else if(t.t==='wheel'){ const wi=rnd(WHEEL.length),w=WHEEL[wi]; log('wheel',{n:p.name,wi}); sfx('wheel'); applyFx(pi,w.fx); }
  else if(t.t==='rest'){ log('rest',{n:p.name}); }
  else if(t.t==='go'){ log('go',{n:p.name}); }
}
function endTurn(){
  st.step='roll'; st.pending=null; st.dice=[];
  let guard=0;
  const n=st.players.length; if(st.first==null) st.first=0;
  do{
    const nxt=(st.turn+1)%n;
    if(nxt===st.first){ st.round++; if(st.crash>0) st.crash--; st.first=(st.first+1)%n; st.turn=st.first; if(!(cfg().maxRounds&&st.round>cfg().maxRounds)){ log('newRound',{r:st.round,n:st.players[st.turn].name}); chargeUpkeep(); if(st.phase==='over') return; if(cfg().maxRounds&&st.round===cfg().maxRounds-RULE.finalRounds+1){ const rk=ranking(), l=rk[rk.length-1]; if(rk.length>1){ st.players[l].money+=RULE.homestretch; log('final',{k:RULE.finalRounds,n:st.players[l].name,a:RULE.homestretch}); } } } }
    else st.turn=nxt;
    if(cfg().maxRounds&&st.round>cfg().maxRounds){ st.phase='over'; giveAwards(); const rk=ranking(); st.winner=rk.length>1&&worth(rk[0])===worth(rk[1])?null:rk[0]; log('settle',{m:cfg().maxRounds,r:rk.map(i=>st.players[i].name+' $'+worth(i)).join('、')}); return; }
    const p=st.players[st.turn];
    if(p.out){ guard++; continue; }
    if(p.skip>0){ p.skip--; log('skip',{n:p.name}); guard++; continue; }
    break;
  }while(guard<n*3);
}

/* ---------- 網路同步（Claude 內用 storage，外部網頁用 WebRTC/PeerJS） ---------- */
const PFX='cmp-2p-';
let peer=null, conn=null;
const usePeer=()=>!hasStorage()&&typeof Peer!=='undefined';
const netOK=()=>hasStorage()||usePeer();
async function push(){
  if(!net.online) return; st.seq++;
  if(hasStorage()){ try{ await window.storage.set(key(),JSON.stringify(st),true); }catch(e){ console.error(e); } }
  else if(conn&&conn.open){ try{ conn.send(JSON.stringify(st)); }catch(e){ console.error(e); } }
}
async function pull(){
  if(!net.online||busy||!hasStorage()) return;
  try{ const r=await window.storage.get(key(),true); if(!r) return; const s=JSON.parse(r.value); if(s.seq>st.seq){ st=s; render(); } }catch(e){}
}
function startPolling(){ if(timer) clearInterval(timer); timer=null; if(hasStorage()) timer=setInterval(pull,2000); }
function stopPolling(){ if(timer) clearInterval(timer); timer=null; if(conn){ try{conn.close()}catch(e){} conn=null; } if(peer){ try{peer.destroy()}catch(e){} peer=null; } }
function onData(d){
  let m; try{ m=typeof d==='string'?JSON.parse(d):d; }catch(e){ return; }
  if(m.type==='act'){ if(net.online&&net.me===0&&st) doAct(Object.assign({},m,{pi:1})); return; }
  if(m.type==='join'){ if(!st||st.phase!=='lobby') return; st.players[1].name=m.name; st.players[1].skin=m.skin||null; st.guestJoined=true; render(); push(); return; }
  if(m.seq!=null && (!st||m.seq>st.seq)){ st=m; if(busy) return; render(); }
}
function onDisconnect(){ if(!net.online) return; $('home-err').textContent=T('e_disc'); goHome(); }
function hostPeer(){
  return new Promise((ok,fail)=>{
    let tries=0;
    const make=()=>{
      net.code=String(1000+rnd(9000)); st.code=net.code;
      peer=new Peer(PFX+net.code);
      peer.on('open',()=>ok());
      peer.on('error',e=>{ if(e.type==='unavailable-id'&&tries++<3){ peer.destroy(); make(); } else fail(e); });
      peer.on('connection',c=>{ conn=c; c.on('data',onData); c.on('close',onDisconnect); c.on('error',onDisconnect); });
    };
    make();
  });
}
function joinPeer(code,name){
  return new Promise((ok,fail)=>{
    let done=false;
    const t=setTimeout(()=>{ if(!done){ done=true; fail(new Error('timeout')); } },10000);
    peer=new Peer();
    peer.on('error',e=>{ if(!done){ done=true; clearTimeout(t); fail(e); } });
    peer.on('open',()=>{
      conn=peer.connect(PFX+code,{reliable:true});
      conn.on('open',()=>{ conn.send(JSON.stringify({type:'join',name,skin:pickOf(0)})); });
      conn.on('data',d=>{ onData(d); if(!done&&st&&st.seq){ done=true; clearTimeout(t); ok(); } });
      conn.on('close',onDisconnect); conn.on('error',e=>{ if(!done){ done=true; clearTimeout(t); fail(e); } else onDisconnect(); });
    });
  });
}

/* ---------- 畫面 ---------- */
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); $(id).classList.add('on'); }
function myTurn(){ return !net.online || st.turn===net.me; }
function isHost(){ return !net.online || net.me===0; }

function render(){
  if(!st) return;
  if(st.phase==='lobby'){ renderLobby(); return; }
  show('s-game');
  const c=cfg();
  $('g-mode').textContent=T('m_'+st.mode)+'・'+(net.online?T('room')+' '+net.code:T('onePhone'));
  $('g-round').textContent=T('round',{r:Math.min(st.round,c.maxRounds),m:c.maxRounds});
  const prevM=render._m||[]; render._m=st.players.map(p=>p.money);
  $('g-players').innerHTML=st.players.map((p,i)=>`<div class="pl ${st.turn===i&&st.phase==='play'?'turn':''} ${p.out?'out':''}"><span class="dot p${i}">${avatarHTML(i)}</span><div style="min-width:0"><div class="nm">${esc(p.name)}${net.online&&net.me===i?T('you'):''}${p.npc?`<span class="npc">NPC</span>`:''}</div><div class="money">$${p.money}</div><div class="worth">${T('worth')} $${worth(i)}${p.skip?'・'+T('skipping'):''}${p.boost?'・'+T('boosted'):''}</div></div><div class="cnt"><b>${propCount(i)}</b><small>${T('props')}</small></div></div>`).join('');
  document.querySelectorAll('#g-players .money').forEach((el,i)=>{ const a=prevM[i]; if(a!=null&&a!==st.players[i].money){ el.classList.add(st.players[i].money>a?'flash-up':'flash-down'); } });
  renderBoard();
  renderPanel();
  $('log').innerHTML=st.log.map(l=>`<div>${logText(l)}</div>`).join('');
  scheduleNpc();
}
function esc(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

let viewMode=lsGet('mp-view')||'3d';
function currentView(){ return (viewMode==='3d'&&typeof view3d!=='undefined'&&view3d.ok())?view3d:view2d; }
function renderBoard(){ currentView().update(); renderDice(); }
function renderDice(){
  const d=(st.dice.length?st.dice:Array(cfg().dice).fill(0));
  $('dice').innerHTML=d.map(x=>`<div class="die f${x} ${busy?'roll':''}">${'<i></i>'.repeat(9)}</div>`).join('');
  $('dice').style.display=(typeof view3d!=='undefined'&&currentView()===view3d)?'none':'';
}

function renderPanel(){
  const say=$('say'), act=$('actions'), over=$('over');
  over.innerHTML='';
  if(st.phase==='over'){
    $('panel').style.display='none';
    if(!renderPanel.overSeq||renderPanel.overSeq!==st.seq+':'+st.round){ renderPanel.overSeq=st.seq+':'+st.round; const w=st.winner; sfx(w==null?'win':(!net.online||w===net.me)?'win':'lose'); }
    const w=st.winner;
    const rk=ranking().map((i,k)=>`${k+1}. ${st.players[i].name} $${worth(i)}`).join('　');
    over.innerHTML=`<div class="over"><h2>${w==null?T('draw'):T('wins',{n:st.players[w].name})}</h2><p>${w==null?T('drawSub'):(st.players[w].npc?T('npcWin'):T('winSub'))}</p><p class="sub" style="font-size:12px;color:var(--ink-soft)">${T('rankSub',{r:rk})}</p>${(st.awards&&st.awards.length)?`<p class="sub" style="font-size:12px;color:var(--ink-soft)">${T('awardsTitle')}：${st.awards.map(a=>`${T('aw_'+a.k)} ${esc(st.players[a.pi].name)} +$${a.a}`).join('　')}</p>`:''}
      <div class="stack">${(!net.online||net.me===0)?`<button class="primary" id="b-again">${T('again')}</button>`:`<p class="sub" style="margin:0;color:var(--ink-soft)">${T('hostAgain')}</p>`}<button class="ghost" id="b-home" style="color:var(--ink);border-color:var(--paper-dim)">${T('home')}</button></div></div>`;
    const ag=$('b-again'); if(ag) ag.onclick=again;
    $('b-home').onclick=goHome;
    return;
  }
  $('panel').style.display='';
  const p=st.players[st.turn];
  if(st.auction){ renderAuction(say,act); return; }
  if(p.npc||!myTurn()){ say.innerHTML=T('waitTurn',{n:p.name}); act.innerHTML=''; return; }
  if(st.step==='moving'){ say.innerHTML=T('moving'); act.innerHTML=''; return; }
  if(st.step==='roll'){
    say.innerHTML=net.online?T('yourTurn',{n:p.name}):T('passPhone',{n:p.name});
    act.innerHTML=`<button class="primary wide" id="b-roll">${T('roll')}</button>${myProps(st.turn).length?`<button class="ghost-ink wide" id="b-sell">${T('sellBtn')}</button>`:''}`;
    $('b-roll').onclick=roll; if($('b-sell')) $('b-sell').onclick=()=>openSell(st.turn);
  } else if(st.pending&&st.pending.type==='buy'){
    const t=tiles()[st.pending.tile];
    say.innerHTML=T('buyQ',{t:tileName(st.pending.tile),p:t.p});
    act.innerHTML=`<button class="primary" id="b-yes">${T('buy')}</button><button id="b-no">${T('noBuy')}</button>`;
    $('b-yes').onclick=()=>{ st.owners[st.pending.tile]={owner:st.turn,level:0}; pay(st.turn,t.p,null); log('bought',{n:p.name,ti:st.pending.tile}); sfx('buy'); st.pending=null; finish(); };
    $('b-no').onclick=()=>{ st.pending=null; finish(); };
  } else if(st.pending&&st.pending.type==='up'){
    const i=st.pending.tile,t=tiles()[i];
    say.innerHTML=T('upQ',{t:tileName(i),c:upCost(i),a:rentOf(i),b:rentAt(i,st.turn,st.owners[i].level+1)});
    act.innerHTML=`<button class="primary" id="b-yes">${T('up')}</button><button id="b-no">${T('noUp')}</button>`;
    $('b-yes').onclick=()=>{ pay(st.turn,upCost(i),null); st.owners[i].level++; log('upgraded',{n:p.name,ti:i,l:st.owners[i].level}); sfx('up'); st.pending=null; finish(); };
    $('b-no').onclick=()=>{ st.pending=null; finish(); };
  } else {
    say.innerHTML=st.log[0]?logText(st.log[0]):'';
    act.innerHTML=`<button class="primary wide" id="b-end">${T('end')}</button>${myProps(st.turn).length?`<button class="ghost-ink wide" id="b-sell">${T('sellBtn')}</button>`:''}`;
    if($('b-sell')) $('b-sell').onclick=()=>openSell(st.turn);
    $('b-end').onclick=()=>{ endTurn(); render(); push(); };
  }
}
/* ---------- 拍賣與出售（連線時由房主統一處理） ---------- */
const AUCTION_MS=20000;
let auctionTimer=null;
function propValue(i){ const o=st.owners[i]; return tiles()[i].p+(o?o.level*upCost(i):0); }
function myProps(pi){ return Object.keys(st.owners).filter(i=>st.owners[i].owner===pi).map(Number).sort((a,b)=>propValue(a)-propValue(b)); }
function canTrade(pi){ return st.phase==='play'&&!st.auction&&!busy&&st.turn===pi&&(st.step==='roll'||st.step==='end'); }
function npcBid(pi,a){
  const p=st.players[pi], t=tiles()[a.tile], mine=groupTiles(t.g).filter(j=>st.owners[j]&&st.owners[j].owner===pi).length, need=groupTiles(t.g).length;
  if((rankOf(pi)===0&&propCount(pi)>=3)||propCount(pi)>=RULE.npcCap) return 0;
  let want=a.value*(.72+(mine===need-1?.4:mine>0?.2:0))*(.9+Math.random()*.2);
  const bid=Math.floor(Math.min(want,p.money-150)/10)*10;
  return bid>=a.min?bid:0;
}
function startAuction(pi,i){
  if(!canTrade(pi)||!st.owners[i]||st.owners[i].owner!==pi) return false;
  const value=propValue(i), min=Math.round(value/2/10)*10;
  const bidders=alive().filter(j=>j!==pi);
  const a=st.auction={seller:pi,tile:i,value,min,bids:{},bidders,deadline:Date.now()+AUCTION_MS};
  bidders.forEach(j=>{ const q=st.players[j]; if(q.npc) a.bids[j]=npcBid(j,a); else if(q.money<min) a.bids[j]=0; });
  log('auctionStart',{n:st.players[pi].name,ti:i,m:min}); sfx('card');
  armAuction(); render(); push(); return true;
}
function submitBid(pi,amt){
  const a=st.auction; if(!a||!a.bidders.includes(pi)||a.bids[pi]!=null) return;
  amt=Math.floor(+amt||0); if(amt&&(amt<a.min||amt>st.players[pi].money)) return;
  a.bids[pi]=amt; if(a.bidders.every(j=>a.bids[j]!=null)) resolveAuction(); else { render(); push(); }
}
function resolveAuction(){
  const a=st.auction; if(!a) return; clearInterval(auctionTimer); auctionTimer=null;
  let best=-1, bv=0; a.bidders.forEach(j=>{ const v=a.bids[j]||0; if(v>bv||(v===bv&&v>0&&Math.random()<.5)){ bv=v; best=j; } });
  const s=st.players[a.seller];
  if(best>=0&&bv>=a.min&&st.owners[a.tile]&&st.owners[a.tile].owner===a.seller){ st.owners[a.tile].owner=best; pay(best,bv,a.seller); log('auctionWin',{b:st.players[best].name,p:bv,n:s.name,ti:a.tile}); sfx('buy'); }
  else log('auctionNone',{ti:a.tile});
  st.auction=null; render(); push();
}
// 房主：時間到自動結算（每 0.5 秒檢查一次）
function armAuction(){ clearInterval(auctionTimer); auctionTimer=setInterval(()=>{ if(!st||!st.auction){ clearInterval(auctionTimer); auctionTimer=null; return; } if(Date.now()>=st.auction.deadline) resolveAuction(); },500); }
function bankSell(pi,i){
  if(!canTrade(pi)||!st.owners[i]||st.owners[i].owner!==pi) return;
  const v=Math.round(propValue(i)/2); delete st.owners[i]; st.players[pi].money+=v; log('bankSell',{n:st.players[pi].name,ti:i,v}); sfx('coin'); render(); push();
}
// 來賓的操作送給房主處理
function act(a,extra){
  const me=net.online?net.me:st.turn;
  if(net.online&&net.me!==0){ if(conn&&conn.open) conn.send(JSON.stringify(Object.assign({type:'act',a,pi:net.me},extra))); return; }
  doAct(Object.assign({a,pi:extra&&extra.pi!=null?extra.pi:me},extra));
}
function doAct(m){
  if(m.a==='auction') startAuction(m.pi,+m.tile);
  else if(m.a==='bank') bankSell(m.pi,+m.tile);
  else if(m.a==='bid') submitBid(m.pi,m.amt);
}
function openSell(pi){
  const list=myProps(pi); $('m-sell-t').textContent=T('sellTitle'); $('m-sell-x').textContent=T('closeBtn');
  $('m-sell-b').innerHTML=`<p class="sub" style="color:var(--ink-soft);font-size:12.5px;margin-bottom:8px">${T('sellHint')}</p>`+(list.length?list.map(i=>{ const o=st.owners[i], v=propValue(i);
    return `<div class="sellrow"><div><b>${esc(tileName(i))}</b> ${'▲'.repeat(o.level)}<small>$${v}</small></div><button class="primary" data-au="${i}">${T('auction')}</button><button data-bk="${i}">${T('bankBtn',{v:Math.round(v/2)})}</button></div>`; }).join(''):`<p>${T('noProps')}</p>`);
  $('m-sell-b').querySelectorAll('[data-au]').forEach(b=>b.onclick=()=>{ $('m-sell').classList.remove('on'); act('auction',{tile:+b.dataset.au,pi}); });
  $('m-sell-b').querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>{ $('m-sell').classList.remove('on'); act('bank',{tile:+b.dataset.bk,pi}); });
  $('m-sell').classList.add('on');
}
// 拍賣進行中的面板
let bidAmt=0, bidKey='';
function renderAuction(say,actEl){
  const a=st.auction, left=Math.max(0,Math.ceil((a.deadline-Date.now())/1000));
  say.innerHTML=T('auctionOn',{s:st.players[a.seller].name,t:tileName(a.tile),v:a.value,m:a.min})+` <span class="cd-left" id="au-left">${T('secLeft',{s:left})}</span>`;
  // 這支手機要替誰出價：連線＝自己；同一支手機＝下一個還沒出價的人類
  const who=net.online?(a.bidders.includes(net.me)&&a.bids[net.me]==null?net.me:-1):(a.bidders.find(j=>!st.players[j].npc&&a.bids[j]==null)??-1);
  const status=a.bidders.map(j=>`<span class="bidst">${esc(st.players[j].name)}：${a.bids[j]!=null?T('bidDone'):T('thinking')}</span>`).join('');
  if(who<0){ actEl.innerHTML=`<div class="bidstats">${status}</div>`; return; }
  const key=a.tile+':'+a.deadline+':'+who; if(bidKey!==key){ bidKey=key; bidAmt=a.min; }
  const max=st.players[who].money;
  actEl.innerHTML=`${net.online?'':`<p class="sub" style="width:100%;margin:0 0 4px">${T('bidFor',{n:st.players[who].name})}</p>`}
    <div class="bidrow"><button id="bd-m">−50</button><div class="bidamt"><small>${T('yourBid')}</small>$<span id="bd-v">${bidAmt}</span></div><button id="bd-p">+50</button></div>
    <button class="primary" id="bd-ok">${T('bid')}</button><button id="bd-no">${T('passBid')}</button><div class="bidstats">${status}</div>`;
  const upd=()=>{ $('bd-v').textContent=bidAmt; };
  $('bd-m').onclick=()=>{ bidAmt=Math.max(a.min,bidAmt-50); upd(); };
  $('bd-p').onclick=()=>{ bidAmt=Math.min(max,bidAmt+50); upd(); };
  $('bd-ok').onclick=()=>act('bid',{amt:Math.min(bidAmt,max),pi:who});
  $('bd-no').onclick=()=>act('bid',{amt:0,pi:who});
}
setInterval(()=>{ const e=$('au-left'); if(e&&st&&st.auction) e.textContent=T('secLeft',{s:Math.max(0,Math.ceil((st.auction.deadline-Date.now())/1000))}); },500);

/* ---------- NPC ---------- */
let npcTimer=null;
function npcDecideBuy(pi,i){
  const p=st.players[pi], t=tiles()[i];
  const mine=groupTiles(t.g).filter(j=>st.owners[j]&&st.owners[j].owner===pi).length;
  const left=p.money-t.p, reserve=st.mode==='classic'?250:150;
  if(mine>0) return left>=0;                 // 湊套組一定買
  if((rankOf(pi)===0&&propCount(pi)>=3)||propCount(pi)>=RULE.npcCap) return false;   // 領先且地已不少、或達上限：只湊套組，不再擴張
  if(propCount(pi)<=1) return left>=reserve*.5;
  return left>=reserve && Math.random()<.75;
}
function scheduleNpc(){
  if(npcTimer){ clearTimeout(npcTimer); npcTimer=null; }
  if(!st||st.phase!=='play'||!isHost()||busy||st.auction) return;
  const p=st.players[st.turn]; if(!p.npc) return;
  npcTimer=setTimeout(npcAct, st.step==='roll'?900:1100);
}
async function npcAct(){
  npcTimer=null;
  if(!st||st.phase!=='play'||busy) return;
  const pi=st.turn, p=st.players[pi]; if(!p.npc) return;
  if(st.step==='roll'&&st.npcSold!==st.round+':'+pi&&(propCount(pi)>RULE.freeProps+1||p.money<100)){ st.npcSold=st.round+':'+pi; const cheap=myProps(pi).find(i=>!ownsGroup(pi,tiles()[i].g)); if(cheap!=null&&startAuction(pi,cheap)) return; }
  if(st.step==='roll'){ await roll(); return; }               // roll 結束會 render → 再排下一步
  if(st.step==='decide'&&st.pending){
    const i=st.pending.tile, t=tiles()[i];
    if(st.pending.type==='buy'){
      if(npcDecideBuy(pi,i)){ st.owners[i]={owner:pi,level:0}; pay(pi,t.p,null); log('npcBuy',{n:p.name,ti:i}); sfx('buy'); }
      else log('npcPass',{n:p.name,ti:i});
    } else if(st.pending.type==='up'){
      if(p.money-upCost(i)>=200){ pay(pi,upCost(i),null); st.owners[i].level++; log('upgraded',{n:p.name,ti:i,l:st.owners[i].level}); sfx('up'); }
    }
    st.pending=null; finish(); return;
  }
  if(st.step==='end'){ endTurn(); render(); push(); }
}

function finish(){ if(st.phase==='over'){ render(); push(); return; } st.step='end'; render(); push(); }

async function roll(){
  if(busy) return; busy=true;
  const c=cfg(), p=st.players[st.turn], TT=tiles();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d=Array.from({length:c.dice},()=>1+rnd(6)); st.dice=d; st.rollId=(st.rollId||0)+1; st.step='moving'; render();
  push();                                            // 連線：擲出的瞬間就同步，對方的骰子動畫同時開始
  const v=currentView();
  if(!reduce){
    if(v.rollDice){ await v.rollDice(d); }          // 3D：立體骰子滾動
    else { // 2D：骰子亂跳一下
      for(let k=0;k<5;k++){ st.dice=d.map(()=>1+rnd(6)); sfx('dice'); renderBoard(); await sleep(90); }
      st.dice=d; renderBoard(); await sleep(250);
    }
  }
  let steps=d.reduce((a,b)=>a+b,0);
  if(p.boost){ p.boost=0; steps*=2; log('boost',{n:p.name,s:steps}); } else log('roll',{n:p.name,s:steps});
  if(!reduce&&v.walkPlan) v.walkPlan(st.turn,steps);
  for(let k=0;k<steps;k++){ p.pos=(p.pos+1)%TT.length; if(p.pos===0){ const a=goBonus(st.turn); p.money+=a; p.laps=(p.laps||0)+1; log('passGo',{n:p.name,a}); sfx('coin'); } else sfx('step'); push(); if(!reduce){ renderBoard(); await sleep(v.stepMs||140); } }   // 每走一格同步一次
  if(!reduce&&v.settle) await v.settle();          // 3D：等棋子真的走到再結算
  busy=false;
  land(st.turn,0);
  if(st.phase==='over'){ render(); push(); return; }
  st.step=st.pending?'decide':'end';
  render(); push();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- 大廳 / 流程 ---------- */
let homeConn='online', homeMode='quick', npcCount=2;
document.querySelectorAll('#seg-conn button').forEach(b=>b.onclick=()=>{ homeConn=b.dataset.v; document.querySelectorAll('#seg-conn button').forEach(x=>x.classList.toggle('sel',x===b)); $('joincode').parentElement.style.display=homeConn==='online'?'':'none'; $('home-note').style.display=homeConn==='online'?'':'none'; $('f-name2').style.display=homeConn==='online'?'none':''; $('f-pick1').style.display=homeConn==='online'?'none':''; $('b-create').textContent=homeConn==='online'?T('create'):T('startLocal'); });
document.querySelectorAll('#seg-lang button').forEach(b=>b.onclick=()=>{ lang=b.dataset.v; applyLang(); });
$('b-lang').onclick=()=>{ lang=lang==='ja'?'zh':'ja'; applyLang(); };
document.querySelectorAll('.b-mute').forEach(b=>b.onclick=()=>setMuted(!muted)); setMuted(muted);
$('b-layout').onclick=()=>{ layout=layout==='ring'?'snake':'ring'; applyLang(); };
$('b-view').onclick=()=>{ viewMode=(typeof view3d!=='undefined'&&currentView()===view3d)?'2d':'3d'; lsSet('mp-view',viewMode); applyLang(); };
document.querySelectorAll('#seg-layout button').forEach(b=>b.onclick=()=>{ layout=b.dataset.v; applyLang(); });
document.querySelectorAll('#seg-npc button').forEach(b=>b.onclick=()=>{ npcCount=+b.dataset.v; document.querySelectorAll('#seg-npc button').forEach(x=>x.classList.toggle('sel',x===b)); });
document.querySelectorAll('#seg-mode button').forEach(b=>b.onclick=()=>{ homeMode=b.dataset.v; document.querySelectorAll('#seg-mode button').forEach(x=>x.classList.toggle('sel',x===b)); });

$('b-create').onclick=async()=>{
  const name=$('myname').value.trim(); $('home-err').textContent='';
  if(homeConn==='local'){
    net={online:false,code:'',me:0};
    const n2=$('name2').value.trim()||(lang==='ja'?'プレイヤー2':'玩家二');
    st=newState(homeMode,[name||(lang==='ja'?'プレイヤー1':'玩家一'),n2],[pickOf(0),pickOf(1)]); startGame('start'); render(); return;
  }
  if(!netOK()){ $('home-err').textContent=T('e_storage'); return; }
  if(!name){ $('home-err').textContent=T('e_name'); return; }
  net={online:true,code:String(1000+rnd(9000)),me:0};
  st=newState(homeMode,[name,''],[pickOf(0)]);
  $('b-create').disabled=true; $('home-err').textContent=T('connecting');
  try{
    if(hasStorage()) await window.storage.set(key(),JSON.stringify(st),true);
    else await hostPeer();
  }catch(e){ $('home-err').textContent=T('e_create'); $('b-create').disabled=false; stopPolling(); return; }
  $('b-create').disabled=false; $('home-err').textContent='';
  render(); startPolling();
};
$('b-join').onclick=async()=>{
  const name=$('myname').value.trim(), code=$('joincode').value.trim(); $('home-err').textContent='';
  if(!netOK()){ $('home-err').textContent=T('e_storage'); return; }
  if(!name){ $('home-err').textContent=T('e_name'); return; }
  if(!/^\d{4}$/.test(code)){ $('home-err').textContent=T('e_code'); return; }
  net={online:true,code,me:1};
  $('b-join').disabled=true; $('home-err').textContent=T('connecting');
  if(hasStorage()){
    let s=null;
    try{ const r=await window.storage.get(key(),true); s=JSON.parse(r.value); }catch(e){}
    $('b-join').disabled=false;
    if(!s){ $('home-err').textContent=T('e_notfound'); return; }
    if(s.guestJoined&&s.phase!=='lobby'){ $('home-err').textContent=T('e_started'); return; }
    s.players[1].name=name; s.players[1].skin=pickOf(0); s.guestJoined=true; st=s; await push();
  } else {
    st=null;
    try{ await joinPeer(code,name); }
    catch(e){ $('b-join').disabled=false; stopPolling(); net.online=false; $('home-err').textContent=T('e_notfound'); return; }
    $('b-join').disabled=false;
    if(st.phase!=='lobby'){ $('home-err').textContent=T('e_started'); stopPolling(); net.online=false; return; }
  }
  $('home-err').textContent='';
  render(); startPolling();
};
$('b-start').onclick=async()=>{ startGame('start'); render(); await push(); };
$('b-leave').onclick=goHome;
$('m-sell-x').onclick=()=>$('m-sell').classList.remove('on'); $('m-sell').onclick=e=>{ if(e.target===$('m-sell')) $('m-sell').classList.remove('on'); };
$('b-rules').onclick=openRules; $('m-rules-x').onclick=()=>$('m-rules').classList.remove('on'); $('m-rules').onclick=e=>{ if(e.target===$('m-rules')) $('m-rules').classList.remove('on'); };

function renderLobby(){
  show('s-lobby'); $('lobby-code').textContent=net.code;
  if(net.me===0){
    $('lobby-status').textContent=st.guestJoined?T('joined',{n:st.players[1].name}):T('waiting');
    $('b-start').style.display=''; $('b-start').disabled=!st.guestJoined;
  } else { $('lobby-status').textContent=T('guestWait',{n:st.players[0].name}); $('b-start').style.display='none'; }
}
function again(){
  const names=st.players.map(p=>p.name), skins=st.players.map(p=>p.skin), seq=st.seq;
  st=newState(st.mode,names,skins); st.seq=seq; st.guestJoined=true; startGame('again');
  render(); push();
}
function goHome(){ stopPolling(); if(typeof view3d!=='undefined') view3d.stop(); if(npcTimer){ clearTimeout(npcTimer); npcTimer=null; } st=null; net={online:false,code:'',me:0}; show('s-home'); applyLang(); }
