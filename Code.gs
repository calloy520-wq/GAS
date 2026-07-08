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
    case 'recruit': return apiRecruit_(p);
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

// 招募夥伴（後端擲屬性、驗證金幣與名額）
function apiRecruit_(p){
  var nick = (p.nick||'').trim();
  var player = loadPlayer(nick);
  if (!player) throw new Error('找不到存檔');
  if (!classInfo(p.job)) throw new Error('未知職業');
  if ((player.roster||[]).length >= CFG.ROSTER_MAX) throw new Error('倉庫已滿（上限 '+CFG.ROSTER_MAX+' 人），請先遣散');
  var cost = Math.max(0, p.cost|0);
  if ((player.gold||0) < cost) throw new Error('金幣不足');
  var c = makeChar(p.name, p.job, p.portrait, p.seed, p.base, p.race);
  player.gold -= cost;
  player.roster.push(c);
  cleanPlayer_(player);
  savePlayer(player);
  return { player: player, recruited: c };
}

// 地下城：後端跑完整探索，套用結果後存檔
function apiDungeon_(p){
  var nick = (p.nick||'').trim();
  var player = loadPlayer(nick);
  if (!player) throw new Error('找不到存檔');
  var target = Math.max(1, Math.min(CFG.MAX_FLOOR, (p.target|0) || 1));

  var byId = {}; player.roster.forEach(function(c){ byId[c.id]=c; });
  var battle = (player.team.battle||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  var support = (player.team.support||[]).map(function(id){ return byId[id]; }).filter(Boolean);
  if (!battle.length) throw new Error('至少要有一名戰鬥位角色');

  var report = runDungeon({ battle:battle, support:support }, target);

  // 套用結果
  player.gold = (player.gold||0) + report.gold;
  report.loot.forEach(function(id){ player.bag.push(id); });
  if (report.reached > (player.deepest||0)) player.deepest = report.reached;

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
