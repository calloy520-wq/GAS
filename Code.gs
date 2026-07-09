// ============================================================
// 傭兵之城 · D&D 版 — 入口與 API 路由
// 前端透過 google.script.run.api(action, payloadJson) 呼叫。
// 地下城戰鬥一律後端運算（authoritative）。
// ============================================================

function doGet(){
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('海與劍之歌')
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
    case 'naval':   return apiNaval_(p);
    case 'prize':   return apiPrize_(p);
    case 'captive': return apiCaptive_(p);
    case 'captain': return apiCaptain_(p);
    case 'faction': return apiFaction_(p);
    case 'lair':    return apiLair_(p);
    case 'porttask':return apiPortTask_(p);
    case 'raid':    return apiRaidPlayer_(p);
    case 'shipbuy': return apiShipBuy_(p);
    case 'fleet':   return apiFleet_(p);
    case 'sea':     return apiSea_(p);
    case 'conquer': return apiConquer_(p);
    case 'holdings':return apiHold_(p);
    case 'rumor':   return apiRumor_(p);
    case 'scout':   return apiScout_(p);
    case 'ship':    return apiShip_(p);
    case 'treasure':return apiTreasure_(p);
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
// ===== 海事等級：航海術 / 商業（帳號級・像騎砍的團長個人技能，隨活動成長）=====
var SEA_LV_MAX = 20;
function seaXpNext_(lv){ return 40 + lv*lv*28; }   // Lv1→68, Lv5→740, Lv10→2840
function ensureSea_(pl){
  if (!pl.nav || typeof pl.nav!=='object') pl.nav={lv:1,xp:0};
  if (!pl.com || typeof pl.com!=='object') pl.com={lv:1,xp:0};
  if (typeof pl.nav.lv!=='number') pl.nav.lv=1; if (typeof pl.nav.xp!=='number') pl.nav.xp=0;
  if (typeof pl.com.lv!=='number') pl.com.lv=1; if (typeof pl.com.xp!=='number') pl.com.xp=0;
}
function teamHasSkill_(pl, sk){ return (pl.roster||[]).some(function(c){ return charSkills(c).indexOf(sk)>=0; }); }
// 天賦：隊伍技能決定哪條海事技能練得快（不必改職業，選角仍影響海上）
function seaAffinity_(pl, track){
  if (track==='nav') return (teamHasSkill_(pl,'survival')||teamHasSkill_(pl,'perception'))?1.5:1;
  return teamHasSkill_(pl,'persuasion')?1.5:1;
}
function grantSea_(pl, track, xp){
  ensureSea_(pl);
  var gain = Math.max(0, Math.round((xp||0)*seaAffinity_(pl,track)));
  var t = pl[track], ups=0;
  if (gain>0){ t.xp += gain; while (t.lv<SEA_LV_MAX && t.xp>=seaXpNext_(t.lv)){ t.xp-=seaXpNext_(t.lv); t.lv++; ups++; } if (t.lv>=SEA_LV_MAX) t.xp=0; }
  return { track:track, gain:gain, ups:ups, lv:t.lv, nm:(track==='nav'?'航海術':'商業') };
}
// 效果
function navDaysMul_(pl){ ensureSea_(pl); return Math.max(0.4, 1 - 0.024*(pl.nav.lv-1) - 0.015*officerRank_(pl,'navigator')); }  // 航海長進一步縮短航程
function navGunBonus_(pl){ ensureSea_(pl); return Math.floor((pl.nav.lv-1)/3); }             // 每 3 級 +1 砲擊
function navLuck_(pl){ ensureSea_(pl); return Math.min(0.2, 0.011*(pl.nav.lv-1) + 0.008*officerRank_(pl,'navigator')); }  // 航海長更好運
function comBuyMul_(pl){ ensureSea_(pl); return Math.max(0.72, 1 - 0.0075*(pl.com.lv-1)); }  // 進貨更便宜
function comSellMul_(pl){ ensureSea_(pl); return Math.min(1.30, 1 + 0.011*(pl.com.lv-1)); }  // 賣貨更高價
function tradeDisc_(pl){ ensureSea_(pl); var has=teamHasSkill_(pl,'persuasion'); var home=(pl.holdings&&pl.holdings[pl.port])?0.03:0; var qm=officerRank_(pl,'quartermaster')*0.008; var pf=marketFac_(pl.port); var fav=(pf&&repTier((pl.rep&&pl.rep[pf])||0)>=3)?0.04:0; return { buyMul:comBuyMul_(pl)*(has?0.97:1)*(1-home)*(1-qm)*(1-fav), sellMul:comSellMul_(pl)*(has?1.03:1)*(1+home)*(1+qm)*(1+fav), haggle:has, home:home>0, fav:fav>0 }; }
// 里程碑效果
function fleetCap_(pl){ ensureSea_(pl); return FLEET_MAX + (pl.nav.lv>=4?1:0) + (pl.nav.lv>=8?1:0); }   // 5→7
function dividendRate_(pl){ ensureSea_(pl); return 0.05 + (pl.com.lv>=4?0.02:0) + (pl.com.lv>=10?0.03:0); }
// 副手參戰：副手在戰鬥位時，依好感給砲擊加成
function affLevel_(pl, id){ var p=(pl.affinity&&pl.affinity[id])||0, t=[0,30,90,200,400,700], lv=0; for (var i=0;i<t.length;i++){ if (p>=t[i]) lv=i; } return lv; }
function mateInBattle_(pl){ return pl.mate && (pl.team.battle||[]).indexOf(pl.mate)>=0; }
function mateNavalGun_(pl){ if (!mateInBattle_(pl)) return 0; return 1 + Math.floor(affLevel_(pl, pl.mate)/2); }   // +1~+3
function mateNavalLine_(pl){ if (!mateInBattle_(pl)) return null; var m=(pl.roster||[]).filter(function(c){return c.id===pl.mate;})[0]; if (!m) return null;
  var lv=affLevel_(pl,pl.mate); var say=lv>=3?'包在我身上，左滿舵、全砲門開火！':'副手就位，聽我口令調度側舷！'; return '👩‍✈️ '+m.name+'：「'+say+'」'; }
// ===== 船上職務（任何夥伴依能力值上任，給被動加成，讓每個招募都有用）=====
var POSTS = { navigator:{nm:'航海長',ico:'🧭',ab:'wis',skill:'survival'}, gunner:{nm:'砲術長',ico:'💣',ab:'dex',skill:null}, quartermaster:{nm:'總管',ico:'💰',ab:'cha',skill:'persuasion'}, lookout:{nm:'瞭望手',ico:'🔭',ab:'wis',skill:'perception'} };
function officerOf_(pl,key){ if(!pl.posts) return null; var id=pl.posts[key]; if(!id) return null; return (pl.roster||[]).filter(function(c){ return c&&c.id===id; })[0]||null; }
function officerRank_(pl,key){ var c=officerOf_(pl,key); if(!c) return 0; var meta=POSTS[key]; var m=mod(abilityOf(c,meta.ab)); var sk=(meta.skill&&charSkills(c).indexOf(meta.skill)>=0)?1:0; return Math.max(0, Math.min(8, Math.floor((c.level||1)/4)+Math.max(0,m)+sk)); }
function mateLoyalty_(pl){ return pl.mate ? affLevel_(pl,pl.mate) : 0; }   // 副手情義（0~5）
function navalGun_(pl){ return navGunBonus_(pl)+mateNavalGun_(pl)+officerRank_(pl,'gunner')+Math.floor(mateLoyalty_(pl)/3); }  // 情義隨行支援（永久小加成）
function tradeHaggle_(pl){ var has=(pl.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; }); return has?{buyMul:0.95,sellMul:1.05}:{buyMul:1,sellMul:1}; }
function tradeView_(pl, day, disc){
  ensureSea_(pl);
  return { port:pl.port, cargo:pl.cargo||{}, cargoCount:cargoCount_(pl), cargoMax:effectiveCargoMax(pl), haggle:!!disc.haggle,
    nav:pl.nav, com:pl.com, comBuy:disc.buyMul, comSell:disc.sellMul,
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
  var disc = tradeDisc_(player);
  var sea = null;
  if (p.op === 'travel'){
    if (!MARKET_BY[p.to]) throw new Error('未知市集');
    player.port = p.to;
  } else if (p.op === 'buy'){
    if (!GOOD_BY[p.good]) throw new Error('未知商品');
    var qty = Math.max(1, p.qty|0);
    var price = Math.round(tradePrice(player.port, p.good, day) * disc.buyMul);
    if (cargoCount_(player) + qty > effectiveCargoMax(player)) throw new Error('貨艙不足（上限 '+effectiveCargoMax(player)+'）');
    var cost = price * qty;
    if ((player.gold||0) < cost) throw new Error('金幣不足');
    player.gold -= cost; player.cargo[p.good] = (player.cargo[p.good]||0) + qty;
  } else if (p.op === 'sell'){
    var q2 = Math.max(1, p.qty|0);
    if (!player.cargo[p.good] || player.cargo[p.good] < q2) throw new Error('貨艙沒有這麼多');
    var sp = Math.round(tradePrice(player.port, p.good, day) * 0.92 * disc.sellMul);
    var rev = sp * q2;
    player.gold += rev; player.cargo[p.good] -= q2;
    if (player.cargo[p.good] <= 0) delete player.cargo[p.good];
    sea = grantSea_(player, 'com', Math.max(1, Math.round(rev/22)));   // 賣貨練「商業」
    if (player.bounty && player.bounty.type==='deliver' && marketFac_(player.port)===player.bounty.fac){
      player.bounty.prog = (player.bounty.prog||0) + q2;
      sea = sea || {}; sea.bountyProg = { name:player.bounty.name, prog:Math.min(player.bounty.prog,player.bounty.target), target:player.bounty.target, done:player.bounty.prog>=player.bounty.target };
    }
  }
  if (p.op==='buy' || p.op==='sell') applyRep_(player, marketFac_(player.port), 3);   // 在勢力港口做生意→好感微升
  if (p.op){ cleanPlayer_(player); savePlayer(player); }   // 只有實際買/賣/移動才寫檔
  return { player: player, view: tradeView_(player, day, disc), sea: sea };
}

// 航海：從目前港口航向另一港，途中觸發海上事件
function portDist_(a,b){ var A=MARKET_BY[a],B=MARKET_BY[b]; var dx=A.x-B.x, dy=A.y-B.y; return Math.sqrt(dx*dx+dy*dy); }
function voyageDays_(a,b){ return Math.max(1, Math.round(portDist_(a,b)/24)); }
function rollSeaEvent_(pl, haggle){
  // 敵對勢力攔截：與某勢力交惡（敵對/世仇）時，其巡邏艦有機會攔路收買路財
  var hostiles=[]; if (pl.rep) for (var hk in pl.rep){ if (repTier(pl.rep[hk])<=1) hostiles.push(hk); }
  if (hostiles.length && Math.random() < Math.min(0.42, 0.12+0.08*hostiles.length)){ var hf=FACTION_BY[hostiles[rint(0,hostiles.length-1)]]||{}; var loss=Math.min(pl.gold||0, rint(20,50)+hostiles.length*10); pl.gold=(pl.gold||0)-loss; return { ico:hf.ico||'⚔️', t:(hf.nm||'敵對勢力')+'的巡邏艦盯上你，交了 '+loss+'🪙買路財才脫身（樹敵越多、越常被攔）。' }; }
  var r = Math.min(0.999, Math.random() + navLuck_(pl));   // 航海術越高，越常遇好事、越少遇災劫
  if (r < 0.20) return { ico:'🌊', t:'風平浪靜，航行順利。' };
  if (r < 0.34) return { ico:'💨', t:'順風相助，船行如飛。' };
  if (r < 0.50){ // 暴風雨
    var gs = Object.keys(pl.cargo||{});
    if (gs.length){ var g=gs[Math.floor(Math.random()*gs.length)]; var lose=Math.min(pl.cargo[g], 1+Math.floor(Math.random()*2)); pl.cargo[g]-=lose; if(pl.cargo[g]<=0)delete pl.cargo[g]; return {ico:'⛈️', t:'遭遇暴風雨，'+lose+' 箱'+GOOD_BY[g].nm+'落海！'}; }
    var gl=Math.min(pl.gold||0, 10+Math.floor(Math.random()*30)); pl.gold=(pl.gold||0)-gl; return {ico:'⛈️', t:'暴風雨損壞船身，修補花了 '+gl+'🪙。'};
  }
  if (r < 0.64){ // 漂流物
    var g2=GOODS[Math.floor(Math.random()*GOODS.length)]; var q=1+Math.floor(Math.random()*2);
    if (cargoCount_(pl)+q <= effectiveCargoMax(pl)){ pl.cargo[g2.id]=(pl.cargo[g2.id]||0)+q; return {ico:'📦', t:'撈起漂流貨物，獲得 '+q+' 箱'+g2.nm+'！'}; }
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
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  if (!player.port || !MARKET_BY[player.port]) player.port='merc';
  if (!player.cargo) player.cargo={};
  var to = p.to; if (!MARKET_BY[to]) throw new Error('未知港口');
  if (to === player.port) throw new Error('你已經在這個港口了');
  var from = player.port, baseDays = voyageDays_(from, to);
  var days = Math.max(1, Math.round(baseDays * navDaysMul_(player)));   // 航海術縮短航程
  var haggle = (player.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; });
  var voyage = { from:from, to:to, days:days, baseDays:baseDays, events:[] };
  var n = 1 + Math.floor(Math.random()*Math.min(3, days));
  for (var i=0;i<n;i++){ voyage.events.push(rollSeaEvent_(player, haggle)); }
  // 商會分紅（有投資的話，每趟航程領一次）
  if ((player.invest||0) > 0){ var div = Math.max(1, Math.round(player.invest * dividendRate_(player))); player.gold += div; voyage.events.push({ ico:'🏦', t:'商會分紅入帳 +'+div+'🪙（投資 '+player.invest+'）' }); }
  player.port = to;
  player.gold = Math.max(0, player.gold||0);
  voyage.sea = grantSea_(player, 'nav', 8 + baseDays*3);   // 出航練「航海術」
  cleanPlayer_(player); savePlayer(player);
  return { player: player, voyage: voyage };
}

// ===== 海戰 / 掠奪 =====
function bestDexMod_(party){ var m=0; party.forEach(function(c){ m=Math.max(m, mod(abilityOf(c,'dex'))); }); return m; }
function partyPower_(party){ var s=0; party.forEach(function(c){ s+=(c.level||1); }); return s; }
// stance: 'sink' 砲擊擊沉（打撈半數）｜'board' 接舷俘虜（奪船・風險高）｜'kite' 打帶跑（快船邊打邊逃）
function resolveNaval_(ship, party, enemy, gunBonus, stance, enemySpeed, surprise, ammo){
  stance = stance||'sink'; ammo = ammo||'round';
  var STN={sink:'🎯 砲擊擊沉',board:'⚔️ 接舷俘虜',kite:'🏴‍☠️ 打帶跑'};
  var log=[], ph=ship.hull, eh=enemy.hull, guard=0, fled=false, capture=false;
  var gunBase = ship.cannon*flagGunMul(ship) + bestDexMod_(party) + Math.floor((ship.crew||8)/4) + (gunBonus||0);
  var board = partyPower_(party);
  var rangedMul = ammo==='chain'?0.9 : (ammo==='grape'?0.85 : 1.0);   // 砲彈：射擊倍率
  var boardMul  = ammo==='grape'?1.6 : 1.0;                            // 霰彈強化接舷
  var foeFireMul= ammo==='chain'?0.8 : 1.0;                            // 鏈彈削弱敵還擊
  var escBonus  = ammo==='chain'?0.25 : 0;                             // 鏈彈助逃
  var spd = (ship.speed||6), espd = (enemySpeed||6);
  var meMax = ship.hullMax || ship.hull, foeMax = enemy.hull;   // 給戰鬥畫面用
  var nev = [{ t:'start', mode:stance }];
  log.push('⚓ 交戰！我船 '+ph+' vs '+enemy.ico+enemy.nm+' '+eh+'（'+(STN[stance]||'')+'）');
  if (surprise){ var s0 = rint(Math.floor((gunBase+surprise)*0.9), gunBase+surprise+4); eh = Math.max(0, eh-s0); log.push('🎯 偵查奇襲！趁其不備先手齊射，造成 '+s0+' 傷（敵 '+eh+'）'); nev.push({ t:'surprise', dmg:s0, foeHull:eh }); }
  while (ph>0 && eh>0 && guard<30){
    guard++;
    var gun = gunBase * (stance==='sink'?1.15 : stance==='board'?0.85 : 0.8) * rangedMul;
    var pd = rint(Math.floor(gun*0.7), Math.floor(gun)+2);
    var boarding = (stance==='board' && eh < enemy.hull*0.6);
    if (boarding){ pd += Math.floor(board*0.8*boardMul); }
    eh = Math.max(0, eh-pd);
    log.push((boarding?'⚔️ 接舷肉搏！':'💥 齊射 ')+'造成 '+pd+' 傷（敵 '+eh+'）');
    nev.push({ t:'volley', by:'me', dmg:pd, boarding:boarding, foeHull:eh });
    if (eh<=0){ capture = (stance==='board'); nev.push({ t:'sink', who:'foe', capture:capture }); break; }
    if (stance==='kite'){   // 開砲後嘗試脫離，速度差越大越好逃（鏈彈助逃）
      var esc = Math.max(0.05, Math.min(0.97, 0.32 + (spd-espd)*0.07 + escBonus));
      if (Math.random() < esc){ fled=true; log.push('🌬️ 搶佔上風，成功脫離戰鬥！'); nev.push({ t:'flee' }); break; }
    }
    var efire = enemy.cannon * (stance==='kite'?0.5 : stance==='board'?1.2 : 1.0) * foeFireMul;
    var ed = rint(Math.floor(efire*0.6), Math.floor(efire)+2);
    ph = Math.max(0, ph-ed);
    log.push('🔥 '+enemy.ico+enemy.nm+' 還擊 '+ed+' 傷（我船 '+ph+'）');
    nev.push({ t:'volley', by:'foe', dmg:ed, meHull:ph });
    if (ph<=0){ nev.push({ t:'sink', who:'me' }); break; }
  }
  return { win: eh<=0, playerHull: ph, log:log, fled:fled, capture:capture, mode:stance,
    nev:nev, snap:{ me:{ ico:(ship.ico||'⛵'), hullMax:meMax }, foe:{ ico:enemy.ico, nm:enemy.nm, hullMax:foeMax } } };
}
function injectMateLine_(pl, r){ var ln=mateNavalLine_(pl); if (ln && r.log) r.log.splice(1,0,ln); }
// ===== 說服敗方船員入夥（接舷俘虜 NPC 時觸發）=====
// 交涉專長大幅提升；霰彈壓制、總管與副手情義小幅加成。成功→生成一名可招降的角色。
function persuadeChance_(player, ammo){
  var c = 0.30;
  if (teamHasSkill_(player,'persuasion')) c += 0.35;
  if (ammo === 'grape') c += 0.10;
  c += officerRank_(player,'quartermaster')*0.02;
  c += mateLoyalty_(player)*0.02;
  return Math.max(0.10, Math.min(0.85, c));
}
function captiveRansom_(c){ return 40 + (c.level||1)*20 + Math.round((rarityInfo(c.rarity).costMul-1)*40); }
// 勢力好感度增減（敵人的敵人反向連動）
function applyRep_(player, facId, delta){
  if (!facId || !FACTION_BY[facId] || !delta) return;
  if (!player.rep) player.rep = {};
  player.rep[facId] = repClamp((player.rep[facId]||0) + delta);
  var foe = FACTION_BY[facId].foe;
  if (foe) player.rep[foe] = repClamp((player.rep[foe]||0) + Math.round(-delta*0.4));
}
// 招降候選：職業依敵船勢力、稀有度依敵船強度階（越強的船招到越稀有）
function rollRarityBoosted_(boost){
  var x=0, w=RARITY.map(function(r,i){ var ww=r.w*(1+(boost||0)*i*0.6); x+=ww; return ww; });
  var t=Math.random()*x;
  for (var i=0;i<RARITY.length;i++){ t-=w[i]; if (t<0) return RARITY[i].key; }
  return 'common';
}
function factionCandidate_(player, facId, boost){
  var fac = FACTION_BY[facId];
  var job = fac ? pick(fac.jobs) : pick(Object.keys(COMBAT_CLASSES));
  var rk = rollRarityBoosted_(boost);
  return { job:job, race:RACE_KEYS[rint(0,RACE_KEYS.length-1)], rarity:rk, base:rollBaseByRarity(rk) };
}
function tryPersuade_(player, report, ammo, enemy){
  report.persuadeTried = true;
  var ch = persuadeChance_(player, ammo);
  report.persuadeChance = Math.round(ch*100);
  if (Math.random() >= ch) return;                       // 招降失敗（對方寧死不從）
  var facId = (enemy&&enemy.fac)||'pirate', boost=(enemy&&enemy.tier)||0;
  var cand = factionCandidate_(player, facId, boost);
  var c = makeChar(pick(CAPTIVE_NAMES), cand.job, '', 0, cand.base, cand.race);
  c.rarity = cand.rarity;
  player.pendingRecruit = { char:c, ransom:captiveRansom_(c) };
  var ci = classInfo(c.job)||{}, ri = raceInfo(c.race)||{}, fac=FACTION_BY[facId]||{};
  report.persuaded = { name:c.name, job:c.job, ico:ci.ico||'❓', jobNm:ci.nm||'',
    race:c.race, raceIco:ri.ico||'', raceNm:ri.nm||'', rarity:c.rarity, star:rarityInfo(c.rarity).star,
    level:c.level, ransom:player.pendingRecruit.ransom, rosterFull:(player.roster||[]).length>=CFG.ROSTER_MAX,
    facIco:fac.ico||'', facNm:fac.nm||'' };
}
// 決定俘虜去留：收編入團 or 放走換贖金
function apiCaptive_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.pendingRecruit) throw new Error('沒有待決定的俘虜');
  var pr = player.pendingRecruit, out;
  if (p.decision === 'take'){
    if ((player.roster||[]).length >= CFG.ROSTER_MAX) throw new Error('隊伍已滿（上限 '+CFG.ROSTER_MAX+'），請先遣散，或改「放走換贖金」');
    player.roster.push(pr.char);
    out = { mode:'take', name:pr.char.name };
  } else {
    player.gold = (player.gold||0) + (pr.ransom||0);
    out = { mode:'ransom', gold:pr.ransom||0 };
  }
  delete player.pendingRecruit;
  cleanPlayer_(player); savePlayer(player);
  return { player:player, kept:out };
}
// ☠️ 海盜巢穴：升級／領分贓／迎擊賞金獵人
var LAIR_LV_MAX = 3;
function lairUpCost_(lv){ return Math.round(500*Math.pow(2, lv-1)); }   // 1→2:500, 2→3:1000
function apiLair_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.lair) throw new Error('你還沒有海盜巢穴');
  if (typeof player.lairLv !== 'number') player.lairLv = 1;
  var now = Date.now();
  if (p.op === 'upgrade'){
    if (player.lairLv >= LAIR_LV_MAX) throw new Error('巢穴已達最高等級');
    var cost = lairUpCost_(player.lairLv);
    if ((player.gold||0) < cost) throw new Error('金幣不足（升級需 '+cost+'🪙）');
    player.gold -= cost; player.lairLv++;
    cleanPlayer_(player); savePlayer(player);
    return { player:player, lv:player.lairLv };
  }
  if (p.op === 'collect'){
    if (!player.lairAt) player.lairAt = now;
    var cycles = Math.min(16, Math.floor((now - player.lairAt)/HOLD_CYCLE_MS));
    if (cycles <= 0){ cleanPlayer_(player); savePlayer(player); return { player:player, report:{ earned:0 } }; }
    var repMul = 1 + Math.max(0, repTier((player.rep&&player.rep.pirate)||0)-2)*0.15;
    var per = Math.round(45 * player.lairLv * repMul);
    var got = per * cycles; player.gold += got; player.lairAt += cycles*HOLD_CYCLE_MS;
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:{ earned:got, cycles:cycles, per:per } };
  }
  if (p.op === 'defend'){
    if ((player.lairLv||1) < 3) throw new Error('巢穴須升到 Lv3（賊窩要塞）才能設防迎擊賞金獵人');
    if (player.ship && player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
    var day = Math.floor(now/(1000*60*60*24));
    if (player.lairDefDay === day) throw new Error('今日已擊退一波賞金獵人，明天再來');
    var lvl = player.deepest||0;
    var enemy = { nm:'賞金獵人艦隊', ico:'🎯', hull:120+lvl*6, cannon:14+Math.floor(lvl/2), speed:6, gold:[200+lvl*10, 420+lvl*22], loot:5, fac:'', tier:2 };
    var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
    var party = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
    var ship = player.ship || { hull:120, hullMax:120, cannon:12, crew:10, speed:6 };
    var fleetGun = (player.fleet||[]).reduce(function(a,s){ return a + Math.floor((s.cannon||0)/2); }, 0);
    var defShip = { hull:ship.hull, hullMax:ship.hullMax, cannon:(ship.cannon||10)+fleetGun+(player.lairLv*3), crew:ship.crew, speed:ship.speed };
    var r = resolveNaval_(defShip, party, enemy, navalGun_(player), 'sink', enemy.speed, 4, 'round');   // 主場優勢：奇襲先手 +4
    if (player.ship) player.ship.hull = r.playerHull;
    var report = { enemy:{nm:enemy.nm, ico:enemy.ico}, win:r.win, mode:r.mode, fled:r.fled, log:r.log, gold:0, loot:[], hull:(player.ship||defShip).hull, hullMax:(player.ship||defShip).hullMax, nev:r.nev, snap:r.snap, defend:true };
    if (r.win){ var g=rint(enemy.gold[0],enemy.gold[1]); player.gold+=g; report.gold=g; player.lairDefDay=day; applyRep_(player,'pirate',30); report.repHit={ fac:'pirate', ico:'☠️', nm:'黑帆海盜團', delta:30 }; }
    else { var pen=Math.min(player.gold||0, rint(30,70)); player.gold-=pen; report.lostGold=pen; }
    report.sea = grantSea_(player, 'nav', r.win?14:4);
    player.gold = Math.max(0, player.gold);
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  cleanPlayer_(player); savePlayer(player);
  return { player:player };
}
// 在地任務：停泊該港可接，每港每日一件
function apiPortTask_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  var pid = p.port, mk = MARKET_BY[pid]; if (!mk) throw new Error('未知港口');
  if ((player.port||'merc') !== pid) throw new Error('要先停泊在此港才能接在地委託');
  var day = eventDay(); if (!player.portTasks) player.portTasks = {};
  var t = portTaskFor(pid, day, player.deepest||0);
  if (p.op !== 'do') return { player:player, task:t, done:(player.portTasks[pid]===day) };
  if (player.portTasks[pid] === day) throw new Error('今日已完成本港的在地委託，明天再來');
  var report = { type:t.type, desc:t.desc, portNm:mk.nm, rep:t.rep, fac:t.fac, fame:t.fame };
  if (t.type === 'raid'){
    if (player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
    var lvl = player.deepest||0;
    var enemy = { nm:'近海海盜', ico:'🏴‍☠️', hull:80+lvl*4, cannon:9+Math.floor(lvl/2), speed:7, gold:[t.gold, t.gold+80], loot:3, fac:'pirate', tier:1 };
    var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
    var party = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
    var r = resolveNaval_(player.ship, party, enemy, navalGun_(player), 'sink', enemy.speed, 2, 'round');
    player.ship.hull = r.playerHull;
    report.win=r.win; report.mode=r.mode; report.fled=r.fled; report.log=r.log; report.nev=r.nev; report.snap=r.snap;
    report.hull=player.ship.hull; report.hullMax=player.ship.hullMax; report.enemy={nm:enemy.nm,ico:enemy.ico}; report.gold=0; report.loot=[]; report.porttask=true;
    if (r.win){ var g=rint(t.gold,t.gold+80); player.gold+=g; report.gold=g; applyRep_(player,t.fac,t.rep); player.fameBonus=(player.fameBonus||0)+t.fame; player.portTasks[pid]=day; report.taskDone=true; }
    else { var pen=Math.min(player.gold||0, rint(20,50)); player.gold-=pen; report.lostGold=pen; }
    report.sea = grantSea_(player, 'nav', r.win?8:3);
    player.gold=Math.max(0,player.gold);
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  if (t.type === 'supply'){
    var need=3, boxes=0, ck=Object.keys(player.cargo||{});
    for (var i=0;i<ck.length&&need>0;i++){ var k=ck[i], take=Math.min(player.cargo[k],need); player.cargo[k]-=take; if(player.cargo[k]<=0)delete player.cargo[k]; need-=take; boxes+=take; }
    if (need>0){ if((player.gold||0)<300){ // 退回已扣的貨（避免半扣）：重讀較麻煩，這裡直接報錯前不落地
        throw new Error('需要 3 箱貨物、或改用 300🪙 才能賑濟'); } player.gold-=300; report.paid='gold'; }
    else report.paid='cargo';
    player.gold += t.gold; report.reward=t.gold; applyRep_(player,t.fac,t.rep); player.fameBonus=(player.fameBonus||0)+t.fame; player.portTasks[pid]=day;
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  // search
  if ((player.gold||0) < 200) throw new Error('懸賞尋人需要 200🪙');
  player.gold -= 200;
  var roll=Math.random(), out={};
  if (roll<0.40 && (player.roster||[]).length<CFG.ROSTER_MAX){ var cand=factionCandidate_(player,t.fac,1); var c=makeChar(pick(CAPTIVE_NAMES),cand.job,'',0,cand.base,cand.race); c.rarity=cand.rarity; player.pendingRecruit={char:c,ransom:captiveRansom_(c)}; var ci=classInfo(c.job)||{}; out.recruit={name:c.name,jobNm:ci.nm||'',star:rarityInfo(c.rarity).star}; }
  else if (roll<0.70){ player.clues=(player.clues||0)+2; out.clues=2; }
  else { var g3=rint(220,520); player.gold+=g3; out.gold=g3; }
  applyRep_(player,t.fac,t.rep); player.fameBonus=(player.fameBonus||0)+t.fame; player.portTasks[pid]=day; report.out=out;
  cleanPlayer_(player); savePlayer(player);
  return { player:player, report:report };
}
// 勢力懸賞：接受／領獎／放棄
function apiFaction_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (p.op === 'accept'){
    if (!FACTION_BY[p.fac]) throw new Error('未知勢力');
    if (repTier((player.rep&&player.rep[p.fac])||0) < 2) throw new Error('對方目前不信任你，好感達「中立」以上才會託付任務');
    if (player.bounty) throw new Error('你已有進行中的懸賞，先完成或放棄');
    player.bounty = genBounty(p.fac, player);
  } else if (p.op === 'claim'){
    var b = player.bounty; if (!b) throw new Error('沒有進行中的懸賞');
    if ((b.prog||0) < b.target) throw new Error('懸賞尚未完成');
    player.gold += b.reward; applyRep_(player, b.fac, b.rep);
    player.questsDone = (player.questsDone||0) + 1;
    var facNm = (FACTION_BY[b.fac]||{}).nm || '';
    player.bounty = null;
    cleanPlayer_(player); savePlayer(player);
    return { player:player, claimed:{ gold:b.reward, rep:b.rep, facNm:facNm } };
  } else if (p.op === 'abandon'){
    player.bounty = null;
  }
  cleanPlayer_(player); savePlayer(player);
  return { player:player };
}
// 懸賞進度：獵殺類（打贏宿敵的船）
function bountyHunt_(player, enemy, report){
  var b = player.bounty; if (!b || b.type!=='hunt' || enemy.fac!==b.foeFac) return;
  b.prog = (b.prog||0) + 1;
  report.bountyProg = { name:b.name, prog:Math.min(b.prog,b.target), target:b.target, done:b.prog>=b.target };
}
// 依結果發戰利品：逃跑=無・擊沉=打撈半數・俘虜=全額＋奪船＋俘虜船長＋有機會招降船員；並依勢力調整好感
function applyNavalReward_(player, enemy, r, report, ammo){
  if (!player.cargo) player.cargo = {};
  // 勢力好感：對誰動手就得罪誰（擊沉最兇、俘虜次之、打帶跑最輕）
  var eFac = enemy.fac;
  if (eFac){
    var hit = r.fled ? -10 : (r.win ? (r.capture ? -35 : -55) : -15);
    applyRep_(player, eFac, hit);
    var ef = FACTION_BY[eFac]||{};
    report.repHit = { fac:eFac, ico:ef.ico||'', nm:ef.nm||'', delta:hit };
  }
  if (r.fled){ report.fled = true; report.note = '成功脫離，全身而退（未取得戰利品）。'; return; }
  if (r.win){
    bountyHunt_(player, enemy, report);   // 勢力懸賞：獵殺進度
    var g = rint(enemy.gold[0], enemy.gold[1]); player.gold += g; report.gold = g;
    if (r.capture){   // 接舷俘虜：全額貨物 + 奪船 + 俘虜船長（可贖金）+ 有機會招降船員
      for (var i=0;i<enemy.loot;i++){ if (cargoCount_(player) >= effectiveCargoMax(player)) break; var gd=GOODS[rint(0,GOODS.length-1)]; player.cargo[gd.id]=(player.cargo[gd.id]||0)+1; report.loot.push(gd.id); }
      player.pendingPrize = makePrize_(enemy);
      var pz = player.pendingPrize;
      report.prize = { nm:pz.nm, ico:pz.ico, hullMax:pz.hullMax, cannon:pz.cannon, cargoBonus:pz.cargoBonus, speed:pz.speed, scrapGold:pz.scrapGold, full:(player.fleet||[]).length>=fleetCap_(player) };
      // 俘虜船長
      var cfac = FACTION_BY[eFac]||{}, cfoe = FACTION_BY[cfac.foe]||{};
      player.pendingCaptain = { nm:enemy.nm+' 船長', fac:eFac||'', ransom: 80 + (enemy.tier||0)*120 + rint(0,60) };
      report.captain = { nm:player.pendingCaptain.nm, ico:'🧑‍✈️', fac:eFac||'', facIco:cfac.ico||'', facNm:cfac.nm||'',
        foe:cfac.foe||'', foeNm:cfoe.nm||'', foeIco:cfoe.ico||'', ransom:player.pendingCaptain.ransom };
      tryPersuade_(player, report, ammo, enemy);
    } else {          // 砲擊擊沉：只能打撈半數（人與船同歸於盡）
      var half = Math.max(1, Math.ceil(enemy.loot/2));
      for (var j=0;j<half;j++){ if (cargoCount_(player) >= effectiveCargoMax(player)) break; var g2=GOODS[rint(0,GOODS.length-1)]; player.cargo[g2.id]=(player.cargo[g2.id]||0)+1; report.loot.push(g2.id); }
      report.sunk = true;
    }
  } else {
    var gs=Object.keys(player.cargo||{});
    if (gs.length){ var lg=gs[rint(0,gs.length-1)]; var ll=Math.min(player.cargo[lg], 1+rint(0,2)); player.cargo[lg]-=ll; if(player.cargo[lg]<=0)delete player.cargo[lg]; report.lostCargo=ll; }
    var pen=Math.min(player.gold||0, rint(20,60)); player.gold-=pen; report.lostGold=pen;
  }
}
// 處置俘虜船長：贖回原勢力（緩和仇）／賣給敵對（賺更多但徹底得罪）／放走（賣人情）
function apiCaptain_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.pendingCaptain) throw new Error('沒有待處置的俘虜船長');
  var cap = player.pendingCaptain, fac = FACTION_BY[cap.fac]||{}, out;
  if (p.decision === 'sell'){
    var g = Math.round((cap.ransom||0)*1.6); player.gold += g;
    applyRep_(player, cap.fac, -80);
    out = { mode:'sell', gold:g, foeNm:(FACTION_BY[fac.foe]||{}).nm||'敵對勢力' };
  } else if (p.decision === 'release'){
    applyRep_(player, cap.fac, +120);
    out = { mode:'release', facNm:fac.nm||'' };
  } else {
    player.gold += (cap.ransom||0);
    applyRep_(player, cap.fac, +50);
    out = { mode:'ransom', gold:cap.ransom||0, facNm:fac.nm||'' };
  }
  player.gold = Math.max(0, player.gold);
  delete player.pendingCaptain;
  cleanPlayer_(player); savePlayer(player);
  return { player:player, kept:out };
}
// 決定戰利品船：編入艦隊 or 拆解換金
function apiPrize_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.pendingPrize) throw new Error('沒有待處置的戰利品船');
  if (!player.fleet) player.fleet = [];
  var pz = player.pendingPrize, kept;
  if (p.decision === 'fleet' && player.fleet.length < fleetCap_(player)){
    delete pz.scrapGold; player.fleet.push(pz); kept = { mode:'fleet', nm:pz.nm };
  } else {
    var g = pz.scrapGold || Math.round((pz.hullMax + pz.cannon*8)/2); player.gold += g; kept = { mode:'scrap', gold:g };
  }
  delete player.pendingPrize;
  cleanPlayer_(player); savePlayer(player);
  return { player:player, kept:kept };
}
function apiNaval_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  if (player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
  var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  // 敵船等級：依最深層與擲骰加權
  var prog = Math.min(3, Math.floor((player.deepest||0)/8));
  var ti = Math.max(0, Math.min(3, prog - 1 + rint(0,2)));
  var base = ENEMY_SHIPS[ti];
  var enemy = { nm:base.nm, ico:base.ico, hull:base.hull, cannon:base.cannon, speed:base.speed, gold:base.gold, loot:base.loot, fac:shipFaction_(base.nm), tier:ti };
  var r = resolveNaval_(player.ship, party, enemy, navalGun_(player), p.stance, base.speed, 0, p.ammo);
  injectMateLine_(player, r);
  player.ship.hull = r.playerHull;
  var report = { enemy:{nm:enemy.nm, ico:enemy.ico}, win:r.win, mode:r.mode, fled:r.fled, log:r.log, gold:0, loot:[], hull:player.ship.hull, hullMax:player.ship.hullMax };
  report.sea = grantSea_(player, 'nav', r.fled?4:(r.win ? (8 + Math.floor(enemy.hull/6)) : 3));   // 海戰練「航海術」
  report.nev = r.nev; report.snap = r.snap;
  applyNavalReward_(player, enemy, r, report, p.ammo);
  player.gold = Math.max(0, player.gold);
  cleanPlayer_(player); savePlayer(player);
  return { player:player, report:report };
}

// ===== 船商：購買艦隊船 =====
function apiShipBuy_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.fleet) player.fleet = [];
  var sc = SHIP_CLASS_BY[p.cls]; if (!sc) throw new Error('未知船種');
  if (player.fleet.length >= fleetCap_(player)) throw new Error('艦隊已滿（上限 '+fleetCap_(player)+' 艘，提升航海術可擴編）');
  if ((player.gold||0) < sc.price) throw new Error('金幣不足（需 '+sc.price+'🪙）');
  player.gold -= sc.price;
  player.fleet.push({ id:'f'+uid(), cls:sc.cls, nm:sc.nm, ico:sc.ico, hullMax:sc.hullMax, hull:sc.hullMax,
    cannon:sc.cannon, cargoBonus:sc.cargoBonus, speed:sc.speed||6, role:'idle', route:null, escort:false, lastAt:0 });
  cleanPlayer_(player); savePlayer(player);
  return { player:player };
}

// ===== 艦隊：派自動商隊 / 護衛 / 收益 =====
function routeSpread_(from, to, day){
  var best=0, bg=null;
  GOODS.forEach(function(g){ var buy=tradePrice(from,g.id,day), sell=Math.round(tradePrice(to,g.id,day)*0.92); var sp=sell-buy; if (sp>best){ best=sp; bg=g; } });
  return { spread:best, good:bg };
}
function apiFleet_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.fleet) player.fleet = [];
  var day = tradeDayBucket(), now = Date.now();
  var byId={}; player.fleet.forEach(function(s){ byId[s.id]=s; });
  if (p.op === 'assign'){
    var s = byId[p.id]; if (!s) throw new Error('找不到船');
    if (!MARKET_BY[p.from] || !MARKET_BY[p.to] || p.from===p.to) throw new Error('航線無效');
    s.role='trade'; s.route={ from:p.from, to:p.to }; s.lastAt = now;
  } else if (p.op === 'idle'){
    var s2 = byId[p.id]; if (!s2) throw new Error('找不到船'); s2.role='idle'; s2.route=null; s2.escort=false;
  } else if (p.op === 'escort'){
    var s3 = byId[p.id]; if (!s3) throw new Error('找不到船');
    // 需要艦隊裡有一艘閒置且火砲≥12 的船當護衛
    var guard = player.fleet.some(function(x){ return x.id!==s3.id && x.role==='idle' && x.cannon>=12; });
    if (!s3.escort && !guard) throw new Error('需要一艘閒置的戰艦（火砲≥12）當護衛');
    s3.escort = !s3.escort;
  } else if (p.op === 'collect'){
    var report = { earned:0, lines:[] };
    var haggle = (player.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; });
    player.fleet.forEach(function(s){
      if (s.role!=='trade' || !s.route) return;
      var cycles = Math.min(6, Math.floor((now - (s.lastAt||now))/TRADE_CYCLE_MS));
      if (cycles<=0) return;
      var sp = routeSpread_(s.route.from, s.route.to, day);
      var lairSupply = (player.lairLv>=2) ? 1.15 : 1;   // 巢穴 Lv2 艦隊補給站
      var perCycle = Math.max(0, Math.round(sp.spread * s.cargoBonus * 0.7 * (haggle?1.1:1) * lairSupply));
      var got=0, lost=0;
      for (var i=0;i<cycles;i++){
        var lossChance = s.escort?0.08:0.25;
        if (Math.random() < lossChance){ lost++; } else { got += perCycle; }
      }
      s.lastAt = (s.lastAt||now) + cycles*TRADE_CYCLE_MS;
      player.gold += got; report.earned += got;
      report.lines.push(s.ico+s.nm+'（'+MARKET_BY[s.route.from].nm+'→'+MARKET_BY[s.route.to].nm+'）跑 '+cycles+' 趟'+(lost?('，'+lost+' 趟遭劫'):'')+' → +'+got+'🪙');
    });
    if (report.earned>0) report.sea = grantSea_(player, 'com', Math.floor(report.earned/45));   // 商隊收益練「商業」
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  cleanPlayer_(player); savePlayer(player);
  return { player:player };
}

// ===== 海域：NPC 商船清單 / 掠奪（PvE）=====
function apiSea_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  var day = tradeDayBucket();
  if (p.op === 'raid'){
    if (player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
    var list = npcTradersForDay(day);
    var npc = list.filter(function(n){ return n.id===p.id; })[0];
    if (!npc) throw new Error('該商船已離開海域');
    if (!player.raided) player.raided = {};
    var rk = day+'_'+p.id;
    if (player.raided[rk]) throw new Error('這艘商船今天已被你打劫過了');
    var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
    var party=(player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
    var enemy={ nm:npc.nm, ico:npc.ico, hull:npc.hull, cannon:npc.cannon, speed:npc.speed, gold:npc.gold, loot:npc.loot, fac:npc.fac, tier:npc.tier };
    if (worldEvent().type==='pirate') enemy.loot = (enemy.loot||0)+1;   // 海盜猖獗日：掠奪更豐
    var surp = consumeScout_(player, 'sea:'+p.id);
    var r = resolveNaval_(player.ship, party, enemy, navalGun_(player), p.stance, npc.speed, surp, p.ammo);
    injectMateLine_(player, r);
    player.ship.hull = r.playerHull;
    var report={ enemy:{nm:npc.nm, ico:npc.ico}, win:r.win, mode:r.mode, fled:r.fled, log:r.log, gold:0, loot:[], hull:player.ship.hull, hullMax:player.ship.hullMax };
    report.sea = grantSea_(player, 'nav', r.fled?4:(r.win ? (8 + Math.floor(npc.hull/6)) : 3));
    report.nev = r.nev; report.snap = r.snap;
    if (r.win && !r.fled) player.raided[rk]=true;   // 打贏（含擊沉/俘虜）才算今日已搶；逃跑不算
    applyNavalReward_(player, enemy, r, report, p.ammo);
    player.gold=Math.max(0,player.gold);
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  return { player:player, npcs: npcTradersForDay(day) };
}

// ===== PvP：掠奪其他玩家 =====
function apiRaidPlayer_(p){
  var me = loadPlayer((p.nick||'').trim());
  if (!me) throw new Error('找不到存檔');
  if (!me.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  if (me.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
  var target = loadPlayer((p.target||'').trim());
  if (!target || target.nick === me.nick) throw new Error('目標無效');
  if ((target.deepest||0) < 3) throw new Error('對方是新手，受保護不可掠奪');
  if (!target.ship) throw new Error('對方還沒有船艦，無法海上掠奪');
  var byId={}; (me.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party = (me.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var tById={}; (target.roster||[]).forEach(function(c){ tById[c.id]=c; });
  var defParty = (target.team.battle||[]).map(function(id){ return tById[id]; }).filter(Boolean);
  var espeed = (target.ship.speed||6) + Math.floor(partyPower_(defParty)/8);
  var enemy = { nm:target.nick+'的商船', ico:'⛵', hull:(target.ship.hullMax||60), cannon:(target.ship.cannon||6)+Math.floor(partyPower_(defParty)/5), speed:espeed };
  var surpP = consumeScout_(me, 'pvp:'+target.nick);
  var r = resolveNaval_(me.ship, party, enemy, navalGun_(me), p.stance, espeed, surpP, p.ammo);
  injectMateLine_(me, r);
  me.ship.hull = r.playerHull;
  var report = { target:target.nick, win:r.win, mode:r.mode, fled:r.fled, log:r.log, gold:0, loot:[], hull:me.ship.hull, hullMax:me.ship.hullMax };
  report.sea = grantSea_(me, 'nav', r.fled?4:(r.win ? (8 + Math.floor(enemy.hull/6)) : 3));
  report.nev = r.nev; report.snap = r.snap;
  if (r.fled){
    report.fled = true; report.note = '成功脫離，全身而退。';
  } else if (r.win){
    // 接舷俘虜對玩家＝多搶一成（奪船贖金系統另做，這裡不奪船避免對方無船可航）
    var mul = r.capture ? 0.30 : 0.20;   // 擊沉搶兩成、接舷搶三成
    var steal = Math.min(target.gold||0, Math.floor((target.gold||0)*mul) + rint(10,40));
    target.gold = (target.gold||0) - steal; me.gold = (me.gold||0) + steal; report.gold = steal;
    if (!me.cargo) me.cargo = {};
    var maxTake = r.capture ? 5 : 3;
    var tg = Object.keys(target.cargo||{});
    for (var i=0;i<maxTake && tg.length; i++){
      var g = tg[rint(0,tg.length-1)];
      if (target.cargo[g]>0 && cargoCount_(me) < effectiveCargoMax(me)){
        target.cargo[g]--; if (target.cargo[g]<=0){ delete target.cargo[g]; tg=Object.keys(target.cargo); }
        me.cargo[g]=(me.cargo[g]||0)+1; report.loot.push(g);
      }
    }
    report.boarded = r.capture;
  } else {
    var pen = Math.min(me.gold||0, rint(20,50)); me.gold -= pen; report.lostGold = pen;
  }
  me.gold=Math.max(0,me.gold); target.gold=Math.max(0,target.gold);
  cleanPlayer_(me); cleanPlayer_(target);
  savePlayer(target); savePlayer(me);
  return { player:me, report:report };
}

// ===== 城市攻佔：圍城戰 → 佔領港口 → 被動稅收（甩手掌櫃）=====
function apiConquer_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  if (player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
  var pid = p.port, mk = MARKET_BY[pid]; if (!mk) throw new Error('未知港口');
  if (!player.holdings) player.holdings = {};
  if (player.holdings[pid]) throw new Error('這座港口已是你的領地');
  var gar = GARRISONS[pid] || GARRISONS.merc;
  var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var fleetGun = (player.fleet||[]).reduce(function(a,s){ return a + Math.floor((s.cannon||0)/2); }, 0);   // 艦隊助攻火力
  // 友好盟軍協防：若與該港所屬勢力的宿敵友好以上，宿敵派艦助攻
  var ownerFac = marketFac_(pid), allyGun = 0, allyNm = '';
  if (ownerFac){ FACTIONS.forEach(function(f){ if (f.foe===ownerFac){ var tt=repTier((player.rep&&player.rep[f.id])||0); if (tt>=3){ allyGun += (tt-2)*6; allyNm = f.ico+f.nm; } } }); }
  var siegeShip = { hull:player.ship.hull, hullMax:player.ship.hullMax, cannon:(player.ship.cannon||6)+fleetGun+allyGun, crew:player.ship.crew, speed:player.ship.speed };
  var enemy = { nm:gar.nm, ico:'🛡️', hull:gar.hull, cannon:gar.cannon, gold:gar.gold, loot:0, speed:99 };   // 駐軍不會逃
  var surpC = consumeScout_(player, 'port:'+pid);
  var r = resolveNaval_(siegeShip, party, enemy, navalGun_(player), 'board', 99, surpC, p.ammo);
  injectMateLine_(player, r);
  player.ship.hull = r.playerHull;
  var report = { port:pid, portNm:mk.nm, portIco:mk.ico, garrison:gar.nm, win:r.win, log:r.log, hull:player.ship.hull, hullMax:player.ship.hullMax, gold:0, fleetGun:fleetGun, allyGun:allyGun, allyNm:allyNm };
  report.sea = grantSea_(player, 'nav', r.win ? (12 + Math.floor(gar.hull/6)) : 4);
  report.nev = r.nev; report.snap = r.snap;
  if (r.win){
    var g = rint(gar.gold[0], gar.gold[1]); player.gold += g; report.gold = g;
    player.holdings[pid] = { lv:1, since: Date.now(), lastAt: Date.now() };
    report.captured = true;
    var cfac = marketFac_(pid);
    if (cfac){ applyRep_(player, cfac, -150); var cf=FACTION_BY[cfac]||{}; report.repHit={ fac:cfac, ico:cf.ico||'', nm:cf.nm||'', delta:-150 }; }   // 攻佔其港＝重創好感
  } else {
    var pen = Math.min(player.gold||0, rint(30,80)); player.gold -= pen; report.lostGold = pen;
  }
  player.gold = Math.max(0, player.gold);
  cleanPlayer_(player); savePlayer(player);
  return { player:player, report:report };
}
function apiHold_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.holdings) player.holdings = {};
  var now = Date.now();
  if (p.op === 'collect'){
    var report = { earned:0, lines:[] };
    var mateBonus = (mateInBattle_(player)||player.mate) ? affLevel_(player, player.mate)*0.05 : 0;   // 副手當總管加成
    var comBonus = ((player.com&&player.com.lv>=10)?0.5:0);
    var qmBonus = officerRank_(player,'quartermaster')*0.06;   // 總管職務加成
    Object.keys(player.holdings).forEach(function(pid){
      var h = player.holdings[pid], mk = MARKET_BY[pid]; if (!mk) return;
      var cycles = Math.min(16, Math.floor((now - (h.lastAt||now))/HOLD_CYCLE_MS));
      if (cycles<=0) return;
      var per = Math.round(HOLD_TAX_BASE * h.lv * (1+mateBonus+comBonus+qmBonus));
      var got = per * cycles;
      h.lastAt = (h.lastAt||now) + cycles*HOLD_CYCLE_MS;
      player.gold += got; report.earned += got;
      report.lines.push(mk.ico+mk.nm+'（治理 Lv'+h.lv+'）稅收 '+cycles+' 期 → +'+got+'🪙');
    });
    cleanPlayer_(player); savePlayer(player);
    return { player:player, report:report };
  }
  if (p.op === 'upgrade'){
    var h2 = player.holdings[p.port]; if (!h2) throw new Error('這不是你的領地');
    if (h2.lv >= HOLD_LV_MAX) throw new Error('治理已達上限');
    var cost = holdUpgradeCost_(h2.lv); if ((player.gold||0) < cost) throw new Error('金幣不足（需 '+cost+'🪙）');
    player.gold -= cost; h2.lv++;
    cleanPlayer_(player); savePlayer(player);
    return { player:player, lv:h2.lv };
  }
  if (p.op === 'abandon'){ delete player.holdings[p.port]; cleanPlayer_(player); savePlayer(player); return { player:player }; }
  return { player:player };
}

// ===== 打聽消息（酒館情報：貿易/獵物/危險/秘寶）=====
function bestTradeTip_(day){
  var best=0, tip=null;
  MARKETS.forEach(function(a){ MARKETS.forEach(function(b){ if(a.id===b.id) return;
    GOODS.forEach(function(g){ var buy=tradePrice(a.id,g.id,day), sell=Math.round(tradePrice(b.id,g.id,day)*0.92), sp=sell-buy;
      if (sp>best){ best=sp; tip={ from:a.nm, fromIco:a.ico, to:b.nm, toIco:b.ico, good:g.nm, goodIco:g.ico, spread:sp }; } }); }); });
  return tip;
}
function apiRumor_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  var persuade = teamHasSkill_(player,'persuasion');
  var cost = persuade ? 8 : 15;
  if ((player.gold||0) < cost) throw new Error('金幣不足（打聽要 '+cost+'🪙 請杯酒）');
  player.gold -= cost;
  var day = tradeDayBucket(), rumors = [];
  var tt = bestTradeTip_(day);
  if (tt) rumors.push({ ico:'💰', t:'把「'+tt.goodIco+tt.good+'」從 '+tt.fromIco+tt.from+' 運到 '+tt.toIco+tt.to+'，一箱能賺約 '+tt.spread+'🪙。' });
  try { var list=listPlayers(); var rich=list.filter(function(x){ return x.nick!==player.nick && (x.deepest||0)>=3; }).sort(function(a,b){ return b.gold-a.gold; })[0];
    if (rich) rumors.push({ ico:'🏴‍☠️', t:'酒客壓低聲音：'+rich.nick+' 最近賺翻了（約 '+rich.gold+'🪙），船停在 '+(rich.portNm||'某港')+'…要不要去「拜訪」一下？' }); } catch(e){}
  var npcs = npcTradersForDay(day), strong = npcs.filter(function(n){ return n.cannon>=11; }).length;
  rumors.push({ ico: strong>=2?'⚠️':'🌊', t: strong>=2 ? '最近私掠艦橫行，落單商船小心為上；想掠奪先偵查再動手。' : '這幾天海象平穩，正是出海跑商的好時機。' });
  if (persuade && Math.random()<0.5){ player.clues=(player.clues||0)+1; rumors.push({ ico:'🗺️', t:'一名醉醺醺的老水手塞給你一張海圖碎片…秘寶線索 +1！' }); }
  cleanPlayer_(player); savePlayer(player);
  return { player:player, rumors:rumors, cost:cost, persuade:persuade };
}

// ===== 偵查（探敵情報 + 奇襲先手）=====
function winEstimate_(myGun, myHull, enemy){ return Math.round(Math.max(0.05, Math.min(0.95, 0.5 + (myGun-enemy.cannon)*0.03 + (myHull-enemy.hull)*0.0025))*100); }
function consumeScout_(player, key){ if (player.scout && player.scout.key===key){ var g=player.scout.gun||0; player.scout=null; return g; } return 0; }
function apiScout_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  var day = tradeDayBucket();
  var look = officerRank_(player,'lookout');
  var perceive = teamHasSkill_(player,'perception') || teamHasSkill_(player,'stealth') || look>0;
  var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party=(player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var myGun = (player.ship.cannon||6) + bestDexMod_(party) + navalGun_(player);
  var enemy, key, extra={};
  if (p.kind==='sea'){ var n=npcTradersForDay(day).filter(function(x){ return x.id===p.id; })[0]; if(!n) throw new Error('該商船已離開海域'); enemy={ nm:n.nm, ico:n.ico, hull:n.hull, cannon:n.cannon, speed:n.speed }; key='sea:'+p.id; extra.loot=n.loot; extra.gold=n.gold; }
  else if (p.kind==='port'){ var gar=GARRISONS[p.port]; if(!gar) throw new Error('未知港口'); var fg=(player.fleet||[]).reduce(function(a,s){ return a+Math.floor((s.cannon||0)/2); },0); myGun+=fg; enemy={ nm:gar.nm, ico:'🛡️', hull:gar.hull, cannon:gar.cannon, speed:99 }; key='port:'+p.port; extra.fleetGun=fg; }
  else if (p.kind==='pvp'){ var tg=loadPlayer((p.target||'').trim()); if(!tg) throw new Error('目標無效'); enemy={ nm:tg.nick+'的商船', ico:'⛵', hull:(tg.ship&&tg.ship.hullMax)||60, cannon:(tg.ship&&tg.ship.cannon)||6, speed:(tg.ship&&tg.ship.speed)||6 }; key='pvp:'+tg.nick; extra.gold=tg.gold; extra.cargo=cargoCount_(tg); }
  else throw new Error('未知偵查目標');
  var est = winEstimate_(myGun, player.ship.hull, enemy);
  var rec = (player.ship.hull < enemy.hull*0.6) ? 'kite' : (myGun >= enemy.cannon+6 ? 'board' : 'sink');
  var spotted = !perceive && Math.random()<0.3;   // 沒有察覺/隱匿專長，有機率暴露行蹤
  player.scout = spotted ? null : { key:key, gun: (perceive?4:2)+Math.floor(look/2) };
  cleanPlayer_(player); savePlayer(player);
  return { player:player, intel:{ nm:enemy.nm, ico:enemy.ico, hull:enemy.hull, cannon:enemy.cannon, speed:enemy.speed, winEst:est, rec:rec, extra:extra, spotted:spotted, surprise:!spotted, perceive:perceive } };
}

// ===== 船塢：修理 / 升級 / 投資 =====
function upgradeCost_(kind, tier){ var u=SHIP_UP[kind]; return Math.round(u.base * Math.pow(1.6, tier)); }
function apiShip_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  // 領取新手船艦（第 5 層後開放）
  if (p.op === 'claim'){
    if (player.ship) throw new Error('你已經有船艦了');
    if ((player.deepest||0) < 5) throw new Error('尚未達成條件（先下地下城到第 5 層，領主才會賜船）');
    player.ship = startShip();
    cleanPlayer_(player); savePlayer(player);
    return { player:player, claimed:true };
  }
  if (!player.ship) throw new Error('你還沒有船艦，先到領主城堡領取新手船艦');
  var s = player.ship;
  if (p.op === 'repair'){
    var missing = (s.hullMax||60) - (s.hull||0);
    if (missing <= 0) throw new Error('船身完好，無需修理');
    var cost = Math.ceil(missing * 2);
    if ((player.gold||0) < cost) throw new Error('金幣不足（修理需 '+cost+'🪙）');
    player.gold -= cost; s.hull = s.hullMax;
  } else if (p.op === 'upgrade'){
    var u = SHIP_UP[p.kind]; if (!u) throw new Error('未知升級');
    var caps = shipCaps(s), capMap = { hull:'maxHull', cannon:'maxCannon', cargo:'maxCargo', crew:'maxCrew' };
    if (capMap[p.kind]){ var cap = caps[capMap[p.kind]]; if ((s[u.stat]||0)+u.step > cap) throw new Error('已達船級上限（'+caps.nm+'・'+u.nm+' 上限 '+cap+'），請先「船體擴建」提升船級'); }
    s._t = s._t || {}; var tier = s._t[p.kind]||0;
    var c2 = upgradeCost_(p.kind, tier);
    if ((player.gold||0) < c2) throw new Error('金幣不足（需 '+c2+'🪙）');
    player.gold -= c2; s[u.stat] = (s[u.stat]||0) + u.step; s._t[p.kind] = tier+1;
    if (p.kind==='hull') s.hull = s.hullMax;   // 強化船身順便補滿
  } else if (p.op === 'guntier'){
    var gcaps = shipCaps(s), gt = s.gunTier||1;
    if (gt >= gcaps.maxGun) throw new Error('砲管等級已達船級上限（'+gcaps.nm+' 上限 Lv'+gcaps.maxGun+'），請先船體擴建');
    var gc = Math.round(220*Math.pow(1.8, gt-1));
    if ((player.gold||0) < gc) throw new Error('金幣不足（需 '+gc+'🪙）');
    player.gold -= gc; s.gunTier = gt+1;
  } else if (p.op === 'classup'){
    var ct = s.tier||1;
    if (ct >= FLAG_TIERS.length) throw new Error('已是最高船級');
    var cc = FLAG_TIERS[ct].up;
    if ((player.gold||0) < cc) throw new Error('金幣不足（船體擴建需 '+cc+'🪙）');
    player.gold -= cc; s.tier = ct+1;
    var nc = FLAG_TIERS[ct]; if ((s.hullMax||60) < Math.round(nc.maxHull*0.5)){ s.hullMax = Math.round(nc.maxHull*0.5); }
    s.hull = s.hullMax;
  } else if (p.op === 'invest'){
    var amt = Math.max(0, p.amount|0);
    if ((player.gold||0) < amt) throw new Error('金幣不足');
    player.gold -= amt; player.invest = (player.invest||0) + amt;
  } else if (p.op === 'withdraw'){
    var w = Math.min(player.invest||0, Math.max(0, p.amount|0));
    player.invest -= w; player.gold += w;
  }
  cleanPlayer_(player); savePlayer(player);
  return { player:player };
}

// ===== 秘寶：線索集滿 → 挖寶 =====
function apiTreasure_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if ((player.clues||0) < 5) throw new Error('海圖殘片不足（需 5 片，目前 '+(player.clues||0)+'）');
  player.clues -= 5;
  var gold = rint(200, 600) + (player.deepest||0)*20;
  player.gold += gold;
  var report = { gold:gold, gear:null, goods:[] };
  // 有機率挖到稀有裝備
  if (Math.random() < 0.6){ var g = rollLoot(Math.max(6,(player.deepest||0)+4), true); if (g){ player.bag.push(g.id); report.gear = { ico:g.ico, nm:g.nm }; } }
  // 一些珍稀貨物
  if (!player.cargo) player.cargo = {};
  var n = rint(2,4);
  for (var i=0;i<n;i++){ if (cargoCount_(player) >= effectiveCargoMax(player)) break; var gd=GOODS[rint(4,GOODS.length-1)]; player.cargo[gd.id]=(player.cargo[gd.id]||0)+1; report.goods.push(gd.id); }
  cleanPlayer_(player); savePlayer(player);
  return { player:player, report:report };
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
  // 首殺頭目樓層 → 獨門神器（每個只給一次）
  if (!player.uniques) player.uniques = {};
  report.uniqueGains = [];
  report.newBosses.forEach(function(bf){
    var u = UNIQUE_BY_FLOOR[bf];
    if (u && !player.uniques[bf]){ player.uniques[bf]=true; player.bag.push(u.id); report.uniqueGains.push({ ico:u.ico, nm:u.nm }); }
  });
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
