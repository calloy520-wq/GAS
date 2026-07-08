// ============================================================
// 傭兵之城 · D&D 版 — 入口與 API 路由
// 前端透過 google.script.run.api(action, payloadJson) 呼叫。
// 地下城戰鬥一律後端運算（authoritative）。
// ============================================================

function doGet(){
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('傭兵之城')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }

// 前端唯一入口：回傳 JSON 字串
function api(action, payloadJson){
  var p = {};
  try { p = payloadJson ? JSON.parse(payloadJson) : {}; } catch(e){ p = {}; }
  try {
    var result = route_(action, p);
    return JSON.stringify({ ok:true, data:result });
  } catch(err){
    return JSON.stringify({ ok:false, error:(err && err.message) ? err.message : String(err) });
  }
}

function route_(action, p){
  switch(action){
    case 'login':   return apiLogin_(p);
    case 'create':  return apiCreate_(p);
    case 'save':    return apiSave_(p);
    case 'tavern':  return apiTavern_(p);
    case 'recruit': return apiRecruit_(p);
    case 'dismiss': return apiDismiss_(p);
    case 'quest':   return apiQuest_(p);
    case 'trade':   return apiTrade_(p);
    case 'voyage':  return apiVoyage_(p);
    case 'dungeon': return apiDungeon_(p);
    case 'roster':  return { players: listPlayers() };
    case 'meta':    return apiMeta_();
    default: throw new Error('未知動作：' + action);
  }
}

// 靜態資料給前端（職業、裝備清單…）
function apiMeta_(){
  return {
    cfg: CFG,
    combatClasses: COMBAT_CLASSES,
    supportClasses: SUPPORT_CLASSES, races: RACES,
    weapons: WEAPONS, armors: ARMORS, trinkets: TRINKETS,
    abilities: ABILITIES, abilityName: ABILITY_NAME, abilityIcon: ABILITY_ICON
  };
}

function apiLogin_(p){
  var nick = (p.nick||'').trim();
  if (!nick) throw new Error('請輸入暱稱');
  var player = loadPlayer(nick);
  return { exists: !!player, player: player };
}

// 建立主角 → 開新存檔
function apiCreate_(p){
  var nick = (p.nick||'').trim();
  if (!nick) throw new Error('請輸入暱稱');
  if (loadPlayer(nick)) throw new Error('這個暱稱已經有存檔了');
  if (!COMBAT_CLASSES[p.job]) throw new Error('主角必須是戰鬥職業');
  var hero = makeChar(p.name, p.job, p.portrait, p.seed, p.base, p.race);
  var player = {
    nick: nick, created: Date.now(), updated: Date.now(),
    gold: CFG.START_GOLD, deepest: 0,
    heroId: hero.id,
    roster: [hero],
    bag: [],                                  // 未裝備的裝備 id
    team: { battle: [hero.id], support: [] }
  };
  return savePlayer(player);
}

// 存回城鎮狀態（裝備/購買/隊伍/招募/遣散由前端計算後整包存）
function apiSave_(p){
  if (!p.player || !p.player.nick) throw new Error('存檔資料不完整');
  // 防呆：不可超過倉庫上限
  if ((p.player.roster||[]).length > CFG.ROSTER_MAX) throw new Error('角色超過倉庫上限');
  cleanPlayer_(p.player);
  return savePlayer(p.player);
}

// 酒館候選：列出／刷新（後端抽稀有度與資質）
function apiTavern_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  var n = 3;
  if (p.op === 'refresh'){
    var fee = 30;
    if ((player.gold||0) < fee) throw new Error('金幣不足以換一批候選（需 '+fee+'🪙）');
    player.gold -= fee;
    player.tavern = null;
  }
  if (!player.tavern || !player.tavern.length){
    player.tavern = [];
    for (var i=0;i<n;i++) player.tavern.push(genCandidate(player.deepest||0, (player.roster||[]).length));
  }
  cleanPlayer_(player);
  savePlayer(player);
  return { player: player };
}

// 招募：從酒館候選名單雇用某位（資質已由後端抽定，玩家只客製名字/頭像）
function apiRecruit_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if ((player.roster||[]).length >= CFG.ROSTER_MAX) throw new Error('倉庫已滿（上限 '+CFG.ROSTER_MAX+' 人），請先遣散');
  var list = player.tavern || [];
  var idx = -1;
  for (var i=0;i<list.length;i++){ if (list[i].cid === p.cid){ idx=i; break; } }
  if (idx < 0) throw new Error('這位候選人已不在酒館，請刷新名單');
  var cand = list[idx];
  if ((player.gold||0) < cand.cost) throw new Error('金幣不足');
  var c = makeChar(p.name, cand.job, p.portrait, p.seed, cand.base, cand.race);
  c.rarity = cand.rarity;
  player.gold -= cand.cost;
  player.roster.push(c);
  player.tavern.splice(idx, 1);           // 雇走後從名單移除
  cleanPlayer_(player);
  savePlayer(player);
  return { player: player, recruited: c };
}

// 遣散夥伴（付遣散費；主角不可遣散）
function severanceCost(level){ return 20 + (level||1)*10; }
function apiDismiss_(p){
  var nick = (p.nick||'').trim();
  var player = loadPlayer(nick);
  if (!player) throw new Error('找不到存檔');
  if (p.id === player.heroId) throw new Error('主角無法遣散');
  var idx = -1;
  for (var i=0;i<player.roster.length;i++){ if (player.roster[i].id === p.id){ idx=i; break; } }
  if (idx < 0) throw new Error('找不到該角色');
  var cost = severanceCost(player.roster[idx].level);
  if ((player.gold||0) < cost) throw new Error('遣散費不足（需 '+cost+'🪙）');
  player.gold -= cost;
  player.roster.splice(idx, 1);
  player.team.battle  = (player.team.battle||[]).filter(function(x){ return x !== p.id; });
  player.team.support = (player.team.support||[]).filter(function(x){ return x !== p.id; });
  cleanPlayer_(player);
  savePlayer(player);
  return { player: player, cost: cost };
}

// 公會委託：接新委託 / 放棄
function apiQuest_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (p.op === 'accept'){ player.quest = genQuest(player.deepest||0); }
  else if (p.op === 'abandon'){ player.quest = null; }
  cleanPlayer_(player);
  savePlayer(player);
  return { player: player };
}

// 依戰報更新委託進度並自動結算
function applyQuest_(player, report){
  var q = player.quest; if (!q) return null;
  if (q.type === 'kill')  q.prog = (q.prog||0) + (report.kills||0);
  else if (q.type === 'depth') q.prog = Math.max(q.prog||0, report.reached||0);
  else if (q.type === 'gold')  q.prog = (q.prog||0) + (report.gold||0);
  if (q.prog >= q.target){
    player.gold = (player.gold||0) + q.reward;
    player.questsDone = (player.questsDone||0) + 1;
    player.quest = null;
    return { name:q.name, reward:q.reward };
  }
  return null;
}

// 大航海式貿易：看盤／買／賣／前往其他市集
function cargoCount_(pl){ var n=0, c=pl.cargo||{}; for (var k in c) n+=c[k]; return n; }
function tradeHaggle_(pl){ var has=(pl.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; }); return has?{buyMul:0.95,sellMul:1.05}:{buyMul:1,sellMul:1}; }
function tradeView_(pl, day, disc){
  return { port:pl.port, cargo:pl.cargo||{}, cargoCount:cargoCount_(pl), cargoMax:CARGO_MAX, haggle:(disc.buyMul<1),
    markets: MARKETS.map(function(m){ return { id:m.id, nm:m.nm, ico:m.ico,
      goods: GOODS.map(function(g){ var base=tradePrice(m.id,g.id,day);
        return { id:g.id, nm:g.nm, ico:g.ico, buy:Math.round(base*disc.buyMul), sell:Math.round(base*0.92*disc.sellMul),
          tag:(m.cheap.indexOf(g.id)>=0?'產地':(m.dear.indexOf(g.id)>=0?'搶手':'')) }; }) }; }) };
}
function apiTrade_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.port || !MARKET_BY[player.port]) player.port = 'merc';
  if (!player.cargo) player.cargo = {};
  var day = tradeDayBucket();
  var disc = tradeHaggle_(player);
  if (p.op === 'travel'){
    if (!MARKET_BY[p.to]) throw new Error('未知市集');
    player.port = p.to;
  } else if (p.op === 'buy'){
    if (!GOOD_BY[p.good]) throw new Error('未知商品');
    var qty = Math.max(1, p.qty|0);
    var price = Math.round(tradePrice(player.port, p.good, day) * disc.buyMul);
    if (cargoCount_(player) + qty > CARGO_MAX) throw new Error('貨艙不足（上限 '+CARGO_MAX+'）');
    var cost = price * qty;
    if ((player.gold||0) < cost) throw new Error('金幣不足');
    player.gold -= cost; player.cargo[p.good] = (player.cargo[p.good]||0) + qty;
  } else if (p.op === 'sell'){
    var q2 = Math.max(1, p.qty|0);
    if (!player.cargo[p.good] || player.cargo[p.good] < q2) throw new Error('貨艙沒有這麼多');
    var sp = Math.round(tradePrice(player.port, p.good, day) * 0.92 * disc.sellMul);
    player.gold += sp * q2; player.cargo[p.good] -= q2;
    if (player.cargo[p.good] <= 0) delete player.cargo[p.good];
  }
  if (p.op){ cleanPlayer_(player); savePlayer(player); }   // 只有實際買/賣/移動才寫檔
  return { player: player, view: tradeView_(player, day, disc) };
}

// 航海：從目前港口航向另一港，途中觸發海上事件
function portDist_(a,b){ var A=MARKET_BY[a],B=MARKET_BY[b]; var dx=A.x-B.x, dy=A.y-B.y; return Math.sqrt(dx*dx+dy*dy); }
function voyageDays_(a,b){ return Math.max(1, Math.round(portDist_(a,b)/24)); }
function rollSeaEvent_(pl, haggle){
  var r = Math.random();
  if (r < 0.20) return { ico:'🌊', t:'風平浪靜，航行順利。' };
  if (r < 0.34) return { ico:'💨', t:'順風相助，船行如飛。' };
  if (r < 0.50){ // 暴風雨
    var gs = Object.keys(pl.cargo||{});
    if (gs.length){ var g=gs[Math.floor(Math.random()*gs.length)]; var lose=Math.min(pl.cargo[g], 1+Math.floor(Math.random()*2)); pl.cargo[g]-=lose; if(pl.cargo[g]<=0)delete pl.cargo[g]; return {ico:'⛈️', t:'遭遇暴風雨，'+lose+' 箱'+GOOD_BY[g].nm+'落海！'}; }
    var gl=Math.min(pl.gold||0, 10+Math.floor(Math.random()*30)); pl.gold=(pl.gold||0)-gl; return {ico:'⛈️', t:'暴風雨損壞船身，修補花了 '+gl+'🪙。'};
  }
  if (r < 0.64){ // 漂流物
    var g2=GOODS[Math.floor(Math.random()*GOODS.length)]; var q=1+Math.floor(Math.random()*2);
    if (cargoCount_(pl)+q <= CARGO_MAX){ pl.cargo[g2.id]=(pl.cargo[g2.id]||0)+q; return {ico:'📦', t:'撈起漂流貨物，獲得 '+q+' 箱'+g2.nm+'！'}; }
    return {ico:'🌊', t:'看到漂流物，但貨艙已滿只能作罷。'};
  }
  if (r < 0.76){ var gg=15+Math.floor(Math.random()*40); pl.gold=(pl.gold||0)+gg; return {ico:'💰', t:'遇到友善商船交易，小賺 '+gg+'🪙。'}; }
  if (r < 0.90){ // 海盜勒索
    if (haggle) return {ico:'🏴‍☠️', t:'遇上海盜！靠著三寸不爛之舌全身而退。'};
    var gs2=Object.keys(pl.cargo||{});
    if (gs2.length){ var g3=gs2[Math.floor(Math.random()*gs2.length)]; var l2=Math.min(pl.cargo[g3], 1+Math.floor(Math.random()*2)); pl.cargo[g3]-=l2; if(pl.cargo[g3]<=0)delete pl.cargo[g3]; return {ico:'🏴‍☠️', t:'海盜勒索，被搶走 '+l2+' 箱'+GOOD_BY[g3].nm+'。'}; }
    var gl2=Math.min(pl.gold||0, 20+Math.floor(Math.random()*30)); pl.gold=(pl.gold||0)-gl2; return {ico:'🏴‍☠️', t:'海盜勒索，交了 '+gl2+'🪙買路財。'};
  }
  pl.clues=(pl.clues||0)+1; return {ico:'🗺️', t:'撈到一片古老海圖殘片…秘寶線索 +1！'};
}
function apiVoyage_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.port || !MARKET_BY[player.port]) player.port='merc';
  if (!player.cargo) player.cargo={};
  var to = p.to; if (!MARKET_BY[to]) throw new Error('未知港口');
  if (to === player.port) throw new Error('你已經在這個港口了');
  var from = player.port, days = voyageDays_(from, to);
  var haggle = (player.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; });
  var voyage = { from:from, to:to, days:days, events:[] };
  var n = 1 + Math.floor(Math.random()*Math.min(3, days));
  for (var i=0;i<n;i++){ voyage.events.push(rollSeaEvent_(player, haggle)); }
  player.port = to;
  player.gold = Math.max(0, player.gold||0);
  cleanPlayer_(player); savePlayer(player);
  return { player: player, voyage: voyage };
}

// 地下城：後端跑完整探索，套用結果後存檔
function apiDungeon_(p){
  var nick = (p.nick||'').trim();
  var player = loadPlayer(nick);
  if (!player) throw new Error('找不到存檔');
  // 起始層最多只能到「已解鎖的最深層」；目標層不得低於起始層
  var maxStart = Math.max(1, player.deepest||1);
  var start = Math.max(1, Math.min(maxStart, (p.start|0) || 1));
  var target = Math.max(start, Math.min(CFG.MAX_FLOOR, (p.target|0) || start));

  var byId = {}; player.roster.forEach(function(c){ byId[c.id]=c; });
  var battle = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var support = (player.team.support||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  if (!battle.length) throw new Error('至少要有一名戰鬥位角色');

  // 羈絆：依現有好感度算每人「同隊加攻」，戰鬥時生效
  if (!player.bonds) player.bonds = {};
  battle.forEach(function(h){
    var atk = 0;
    battle.forEach(function(o){ if (o.id !== h.id) atk += bondLevel(player.bonds[bondKey(h.id,o.id)]); });
    h._bondAtk = atk;
  });

  var report = runDungeon({ battle:battle, support:support }, start, target);

  // 羈絆累積：同隊出戰的每一對 +2（上限 60），並回報升級
  report.bondUps = [];
  for (var i=0;i<battle.length;i++) for (var j=i+1;j<battle.length;j++){
    var k = bondKey(battle[i].id, battle[j].id);
    var before = bondLevel(player.bonds[k]);
    player.bonds[k] = Math.min(60, (player.bonds[k]||0) + 2);
    var after = bondLevel(player.bonds[k]);
    if (after > before) report.bondUps.push({ a:battle[i].name, b:battle[j].name, level:BOND_NM[after] });
  }

  // 死亡懲罰（中等）：全滅撤退時，這趟金幣與戰利品被救援費拿走一半
  if (report.wiped){
    var keepGold = Math.floor(report.gold * 0.5);
    report.rescueGoldLost = report.gold - keepGold;
    report.gold = keepGold;
    var kept = [];
    report.loot.forEach(function(id){ if (Math.random() < 0.5) kept.push(id); });
    report.rescueLootLost = report.loot.length - kept.length;
    report.loot = kept;
  }

  // 套用結果
  player.gold = (player.gold||0) + report.gold;
  report.loot.forEach(function(id){ player.bag.push(id); });
  var oldDeep = player.deepest||0;
  var oldRank = rankOf(oldDeep);
  if (report.reached > oldDeep) player.deepest = report.reached;

  // 主線晉升（靠最深層）
  var newRank = rankOf(player.deepest||0);
  if (newRank > oldRank){
    var bonus = newRank * 100;
    player.gold += bonus;
    report.rankUp = { to: RANKS[newRank].nm, ix: newRank, reward: bonus };
  }
  // 首次擊破頭目樓層 → 觸發劇情
  report.newBosses = [];
  [5,10,15,20,25].forEach(function(bf){ if (oldDeep < bf && (player.deepest||0) >= bf) report.newBosses.push(bf); });
  // 委託結算
  report.questDone = applyQuest_(player, report);

  cleanPlayer_(player);
  savePlayer(player);
  return { player: player, report: report };
}

// 移除戰鬥暫存欄位（底線開頭）避免污染存檔
function cleanPlayer_(player){
  (player.roster||[]).forEach(function(c){
    for (var k in c){ if (k.charAt(0)==='_') delete c[k]; }
    if (c.hp < 0) c.hp = 0;
  });
}
