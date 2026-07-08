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
    case 'naval':   return apiNaval_(p);
    case 'raid':    return apiRaidPlayer_(p);
    case 'shipbuy': return apiShipBuy_(p);
    case 'fleet':   return apiFleet_(p);
    case 'sea':     return apiSea_(p);
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
function tradeHaggle_(pl){ var has=(pl.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; }); return has?{buyMul:0.95,sellMul:1.05}:{buyMul:1,sellMul:1}; }
function tradeView_(pl, day, disc){
  return { port:pl.port, cargo:pl.cargo||{}, cargoCount:cargoCount_(pl), cargoMax:effectiveCargoMax(pl), haggle:(disc.buyMul<1),
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
    if (cargoCount_(player) + qty > effectiveCargoMax(player)) throw new Error('貨艙不足（上限 '+effectiveCargoMax(player)+'）');
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
  if (!player.port || !MARKET_BY[player.port]) player.port='merc';
  if (!player.cargo) player.cargo={};
  var to = p.to; if (!MARKET_BY[to]) throw new Error('未知港口');
  if (to === player.port) throw new Error('你已經在這個港口了');
  var from = player.port, days = voyageDays_(from, to);
  var haggle = (player.roster||[]).some(function(c){ return charSkills(c).indexOf('persuasion')>=0; });
  var voyage = { from:from, to:to, days:days, events:[] };
  var n = 1 + Math.floor(Math.random()*Math.min(3, days));
  for (var i=0;i<n;i++){ voyage.events.push(rollSeaEvent_(player, haggle)); }
  // 商會分紅（有投資的話，每趟航程領一次）
  if ((player.invest||0) > 0){ var div = Math.max(1, Math.round(player.invest * 0.05)); player.gold += div; voyage.events.push({ ico:'🏦', t:'商會分紅入帳 +'+div+'🪙（投資 '+player.invest+'）' }); }
  player.port = to;
  player.gold = Math.max(0, player.gold||0);
  cleanPlayer_(player); savePlayer(player);
  return { player: player, voyage: voyage };
}

// ===== 海戰 / 掠奪 =====
function bestDexMod_(party){ var m=0; party.forEach(function(c){ m=Math.max(m, mod(abilityOf(c,'dex'))); }); return m; }
function partyPower_(party){ var s=0; party.forEach(function(c){ s+=(c.level||1); }); return s; }
function resolveNaval_(ship, party, enemy){
  var log=[], ph=ship.hull, eh=enemy.hull, guard=0;
  var gun = ship.cannon + bestDexMod_(party) + Math.floor((ship.crew||8)/4);
  var board = partyPower_(party);
  log.push('⚓ 兩船進入砲擊距離！我船 '+ph+' vs '+enemy.ico+enemy.nm+' '+eh);
  while (ph>0 && eh>0 && guard<30){
    guard++;
    var pd = rint(Math.floor(gun*0.7), gun+2);
    var boarded = (eh < enemy.hull*0.35);
    if (boarded){ pd += Math.floor(board/2); }
    eh = Math.max(0, eh-pd);
    log.push((boarded?'⚔️ 接舷肉搏！':'💥 我方齊射 ')+'造成 '+pd+' 傷（敵船 '+eh+'）');
    if (eh<=0) break;
    var ed = rint(Math.floor(enemy.cannon*0.6), enemy.cannon+2);
    ph = Math.max(0, ph-ed);
    log.push('🔥 '+enemy.ico+enemy.nm+' 還擊 '+ed+' 傷（我船 '+ph+'）');
  }
  return { win: eh<=0, playerHull: ph, log:log };
}
function apiNaval_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) player.ship = startShip();
  if (player.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
  var byId={}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  // 敵船等級：依最深層與擲骰加權
  var prog = Math.min(3, Math.floor((player.deepest||0)/8));
  var ti = Math.max(0, Math.min(3, prog - 1 + rint(0,2)));
  var base = ENEMY_SHIPS[ti];
  var enemy = { nm:base.nm, ico:base.ico, hull:base.hull, cannon:base.cannon, gold:base.gold, loot:base.loot };
  var r = resolveNaval_(player.ship, party, enemy);
  player.ship.hull = r.playerHull;
  var report = { enemy:{nm:enemy.nm, ico:enemy.ico}, win:r.win, log:r.log, gold:0, loot:[], hull:player.ship.hull, hullMax:player.ship.hullMax };
  if (r.win){
    var g = rint(base.gold[0], base.gold[1]); player.gold += g; report.gold = g;
    if (!player.cargo) player.cargo = {};
    for (var i=0;i<base.loot;i++){ if (cargoCount_(player) >= effectiveCargoMax(player)) break; var gd=GOODS[rint(0,GOODS.length-1)]; player.cargo[gd.id]=(player.cargo[gd.id]||0)+1; report.loot.push(gd.id); }
  } else {
    // 敗：貨艙損失一部分
    var gs=Object.keys(player.cargo||{});
    if (gs.length){ var lg=gs[rint(0,gs.length-1)]; var ll=Math.min(player.cargo[lg], 1+rint(0,2)); player.cargo[lg]-=ll; if(player.cargo[lg]<=0)delete player.cargo[lg]; report.lostCargo=ll; }
    var pen=Math.min(player.gold||0, rint(20,60)); player.gold-=pen; report.lostGold=pen;
  }
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
  if (player.fleet.length >= FLEET_MAX) throw new Error('艦隊已滿（上限 '+FLEET_MAX+' 艘）');
  if ((player.gold||0) < sc.price) throw new Error('金幣不足（需 '+sc.price+'🪙）');
  player.gold -= sc.price;
  player.fleet.push({ id:'f'+uid(), cls:sc.cls, nm:sc.nm, ico:sc.ico, hullMax:sc.hullMax, hull:sc.hullMax,
    cannon:sc.cannon, cargoBonus:sc.cargoBonus, role:'idle', route:null, escort:false, lastAt:0 });
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
      var cycles = Math.min(8, Math.floor((now - (s.lastAt||now))/TRADE_CYCLE_MS));
      if (cycles<=0) return;
      var sp = routeSpread_(s.route.from, s.route.to, day);
      var perCycle = Math.max(0, Math.round(sp.spread * s.cargoBonus * 0.7 * (haggle?1.1:1)));
      var got=0, lost=0;
      for (var i=0;i<cycles;i++){
        var lossChance = s.escort?0.08:0.25;
        if (Math.random() < lossChance){ lost++; } else { got += perCycle; }
      }
      s.lastAt = (s.lastAt||now) + cycles*TRADE_CYCLE_MS;
      player.gold += got; report.earned += got;
      report.lines.push(s.ico+s.nm+'（'+MARKET_BY[s.route.from].nm+'→'+MARKET_BY[s.route.to].nm+'）跑 '+cycles+' 趟'+(lost?('，'+lost+' 趟遭劫'):'')+' → +'+got+'🪙');
    });
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
  if (!player.ship) player.ship = startShip();
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
    var enemy={ nm:npc.nm, ico:npc.ico, hull:npc.hull, cannon:npc.cannon };
    var r = resolveNaval_(player.ship, party, enemy);
    player.ship.hull = r.playerHull;
    var report={ enemy:{nm:npc.nm, ico:npc.ico}, win:r.win, log:r.log, gold:0, loot:[], hull:player.ship.hull, hullMax:player.ship.hullMax };
    if (r.win){
      player.raided[rk]=true;
      var g=rint(npc.gold[0], npc.gold[1]); player.gold+=g; report.gold=g;
      if (!player.cargo) player.cargo={};
      for (var i=0;i<npc.loot;i++){ if (cargoCount_(player)>=effectiveCargoMax(player)) break; var gd=GOODS[rint(0,GOODS.length-1)]; player.cargo[gd.id]=(player.cargo[gd.id]||0)+1; report.loot.push(gd.id); }
    } else { var pen=Math.min(player.gold||0, rint(20,50)); player.gold-=pen; report.lostGold=pen; }
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
  if (!me.ship) me.ship = startShip();
  if (me.ship.hull <= 0) throw new Error('船身破損，請先到船塢修理');
  var target = loadPlayer((p.target||'').trim());
  if (!target || target.nick === me.nick) throw new Error('目標無效');
  if ((target.deepest||0) < 3) throw new Error('對方是新手，受保護不可掠奪');
  if (!target.ship) target.ship = startShip();
  var byId={}; (me.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var party = (me.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var tById={}; (target.roster||[]).forEach(function(c){ tById[c.id]=c; });
  var defParty = (target.team.battle||[]).map(function(id){ return tById[id]; }).filter(Boolean);
  var enemy = { nm:target.nick+'的商船', ico:'⛵', hull:(target.ship.hullMax||60), cannon:(target.ship.cannon||6)+Math.floor(partyPower_(defParty)/5) };
  var r = resolveNaval_(me.ship, party, enemy);
  me.ship.hull = r.playerHull;
  var report = { target:target.nick, win:r.win, log:r.log, gold:0, loot:[], hull:me.ship.hull, hullMax:me.ship.hullMax };
  if (r.win){
    var steal = Math.min(target.gold||0, Math.floor((target.gold||0)*0.2) + rint(10,40));
    target.gold = (target.gold||0) - steal; me.gold = (me.gold||0) + steal; report.gold = steal;
    if (!me.cargo) me.cargo = {};
    var tg = Object.keys(target.cargo||{});
    for (var i=0;i<3 && tg.length; i++){
      var g = tg[rint(0,tg.length-1)];
      if (target.cargo[g]>0 && cargoCount_(me) < effectiveCargoMax(me)){
        target.cargo[g]--; if (target.cargo[g]<=0){ delete target.cargo[g]; tg=Object.keys(target.cargo); }
        me.cargo[g]=(me.cargo[g]||0)+1; report.loot.push(g);
      }
    }
  } else {
    var pen = Math.min(me.gold||0, rint(20,50)); me.gold -= pen; report.lostGold = pen;
  }
  me.gold=Math.max(0,me.gold); target.gold=Math.max(0,target.gold);
  cleanPlayer_(me); cleanPlayer_(target);
  savePlayer(target); savePlayer(me);
  return { player:me, report:report };
}

// ===== 船塢：修理 / 升級 / 投資 =====
function upgradeCost_(kind, tier){ var u=SHIP_UP[kind]; return Math.round(u.base * Math.pow(1.6, tier)); }
function apiShip_(p){
  var player = loadPlayer((p.nick||'').trim());
  if (!player) throw new Error('找不到存檔');
  if (!player.ship) player.ship = startShip();
  var s = player.ship;
  if (p.op === 'repair'){
    var missing = (s.hullMax||60) - (s.hull||0);
    if (missing <= 0) throw new Error('船身完好，無需修理');
    var cost = Math.ceil(missing * 2);
    if ((player.gold||0) < cost) throw new Error('金幣不足（修理需 '+cost+'🪙）');
    player.gold -= cost; s.hull = s.hullMax;
  } else if (p.op === 'upgrade'){
    var u = SHIP_UP[p.kind]; if (!u) throw new Error('未知升級');
    s._t = s._t || {}; var tier = s._t[p.kind]||0;
    var c2 = upgradeCost_(p.kind, tier);
    if ((player.gold||0) < c2) throw new Error('金幣不足（需 '+c2+'🪙）');
    player.gold -= c2; s[u.stat] = (s[u.stat]||0) + u.step; s._t[p.kind] = tier+1;
    if (p.kind==='hull') s.hull = s.hullMax;   // 強化船身順便補滿
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
