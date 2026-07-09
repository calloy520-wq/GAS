// ============================================================
// 傭兵之城 · D&D 版 — 資料層（Google Sheet 當資料庫）
// 目標：快（快取＋只讀需要的欄）、穩（固定欄位＋schema 補洞＋夾值）。
// 各玩家獨立存檔（以暱稱為 key）；另提供唯讀名冊給「觀戰」用。
// ============================================================

var PROP_SHEET_ID = 'MERC_SHEET_ID';
var SHEET_PLAYERS = 'Players';
var SCHEMA_VER = 1;
// 固定欄位：nick | json | deepest | gold | updated | preview
var HEADER = ['nick','json','deepest','gold','updated','preview'];
var COL = { NICK:0, JSON:1, DEEP:2, GOLD:3, UPD:4, PREVIEW:5 };
var CELL_LIMIT = 48000;      // 單格 5 萬字保守上限
var CACHE_TTL  = 21600;      // 玩家存檔快取 6 小時
var LIST_TTL   = 20;         // 名冊快取 20 秒

// ---- 試算表 / 分頁 ----
function getSS_(){
  // 1) 優先用「綁定的試算表」（你原本給我的那張，容器綁定腳本用得到）
  try { var act = SpreadsheetApp.getActiveSpreadsheet(); if (act) return act; } catch(e){}
  // 2) 其次用手動設定過的試算表 ID（想指定某張表時用）
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  if (id){ try { return SpreadsheetApp.openById(id); } catch(e){} }
  // 3) 兩者都沒有才自動新建一張（獨立腳本的退路）
  var ss = SpreadsheetApp.create('傭兵之城 - 玩家存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}
// 想指定某張試算表當資料庫時：在編輯器手動執行一次即可
function setDataSheet(spreadsheetId){
  PropertiesService.getScriptProperties().setProperty(PROP_SHEET_ID, spreadsheetId);
  return '已設定資料庫試算表：' + spreadsheetId;
}
// 想知道目前資料寫在哪張表：在編輯器執行後看回傳/紀錄
function getDataSheetUrl(){
  var ss = getSS_();
  return ss.getUrl() + '  （id: ' + ss.getId() + '）';
}
function playerSheet_(){
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_PLAYERS);
  if (!sh){
    sh = ss.insertSheet(SHEET_PLAYERS);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
    var def = ss.getSheetByName('Sheet1'); if (def && def.getName()!==SHEET_PLAYERS){ try{ ss.deleteSheet(def); }catch(e){} }
  } else if (sh.getLastRow() === 0){
    sh.appendRow(HEADER);
  }
  return sh;
}
function normNick_(nick){ return (nick||'').toString().trim().slice(0,16); }
function cacheKey_(nick){ return 'p_' + nick; }

// 只讀 A 欄（暱稱）找列，避免把整包 JSON 拉出來比對
function findRow_(sh, nick){
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var col = sh.getRange(2, COL.NICK+1, last-1, 1).getValues();
  for (var i=0;i<col.length;i++){ if ((col[i][0]||'').toString() === nick) return i+2; }
  return -1;
}

// ---- 讀取（快取優先）----
function loadPlayer(nick){
  nick = normNick_(nick); if (!nick) return null;
  var cache = CacheService.getScriptCache();
  var hit = cache.get(cacheKey_(nick));
  if (hit){ var p = safeParse_(hit); if (p) return ensureShape_(p); }
  var sh = playerSheet_();
  var row = findRow_(sh, nick);
  if (row < 0) return null;
  var raw = sh.getRange(row, COL.JSON+1).getValue();
  var pl = safeParse_(raw);
  if (!pl) return null;
  cache.put(cacheKey_(nick), raw, CACHE_TTL);
  return ensureShape_(pl);
}

// ---- 寫入（LockService 防並發；寫穿快取）----
function savePlayer(player){
  var nick = normNick_(player.nick);
  if (!nick) throw new Error('缺少暱稱');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = playerSheet_();
    player.nick = nick;
    player.ver = SCHEMA_VER;
    player.updated = Date.now();
    ensureShape_(player);
    sanitize_(player);
    var json = JSON.stringify(player);
    if (json.length > CELL_LIMIT) throw new Error('存檔過大，請先遣散部分角色');
    var preview = JSON.stringify(buildPreview_(player));
    var rowVals = [nick, json, player.deepest||0, player.gold||0, player.updated, preview];
    var row = findRow_(sh, nick);
    if (row < 0) sh.appendRow(rowVals);
    else sh.getRange(row, 1, 1, rowVals.length).setValues([rowVals]);
    CacheService.getScriptCache().put(cacheKey_(nick), json, CACHE_TTL);
    CacheService.getScriptCache().remove('list_players');   // 名冊失效
    return player;
  } finally { lock.releaseLock(); }
}

function safeParse_(raw){ try { return JSON.parse(raw); } catch(e){ return null; } }

// ---- schema 補洞：缺欄自動補，保證舊存檔/新欄位不會壞 ----
function ensureShape_(pl){
  if (!pl || typeof pl !== 'object') return pl;
  if (!Array.isArray(pl.roster)) pl.roster = [];
  if (!Array.isArray(pl.bag)) pl.bag = [];
  if (!pl.team || typeof pl.team !== 'object') pl.team = {};
  if (!Array.isArray(pl.team.battle)) pl.team.battle = [];
  if (!Array.isArray(pl.team.support)) pl.team.support = [];
  if (typeof pl.gold !== 'number' || isNaN(pl.gold)) pl.gold = 0;
  if (typeof pl.deepest !== 'number' || isNaN(pl.deepest)) pl.deepest = 0;
  if (!pl.port) pl.port = 'merc';
  if (!pl.cargo || typeof pl.cargo !== 'object') pl.cargo = {};
  if (typeof pl.clues !== 'number') pl.clues = 0;
  // 不再自動配船：新玩家先玩陸地，第 5 層後到領主城堡領取新手船艦才開放海上
  if (pl.ship && typeof pl.ship === 'object'){
    if (typeof pl.ship.hull !== 'number') pl.ship.hull = pl.ship.hullMax || 60;
    if (typeof pl.ship.speed !== 'number') pl.ship.speed = 6;
    if (typeof pl.ship.gunTier !== 'number') pl.ship.gunTier = 1;
    if (typeof pl.ship.tier !== 'number') pl.ship.tier = 1;
  }
  if (typeof pl.invest !== 'number') pl.invest = 0;
  if (!Array.isArray(pl.fleet)) pl.fleet = [];
  if (!pl.holdings || typeof pl.holdings !== 'object') pl.holdings = {};   // 領地
  if (!pl.posts || typeof pl.posts !== 'object') pl.posts = {};           // 船上職務
  if (!pl.rep || typeof pl.rep !== 'object') pl.rep = {};                 // 勢力好感度
  if (!pl.chats || typeof pl.chats !== 'object') pl.chats = {};           // 副手對話紀錄（約會窗記憶）
  if (typeof pl.titleTier !== 'number') pl.titleTier = 0;                 // 已受封爵位階
  if (!pl.dateSeen || typeof pl.dateSeen !== 'object') pl.dateSeen = {};  // 已觸發的約會分歧劇情
  if (!pl.dateEnd || typeof pl.dateEnd !== 'object') pl.dateEnd = {};     // 約會終章結局
  if (!pl.jealous || typeof pl.jealous !== 'object') pl.jealous = {};     // 吃醋心情值（純劇情）
  ensureSea_(pl);   // 航海術 / 商業 等級
  pl.roster.forEach(function(c){
    if (!c) return;
    if (!c.race) c.race = 'human';
    if (!c.equip || typeof c.equip !== 'object') c.equip = { weapon:null, armor:null, trinket:null };
    if (typeof c.level !== 'number') c.level = 1;
    if (typeof c.xp !== 'number') c.xp = 0;
    if (!c.base || typeof c.base !== 'object') c.base = { str:10,dex:10,con:10,int:10,wis:10,cha:10 };
  });
  return pl;
}

// ---- 夾值 / 清理：避免 NaN、超額、無效參照污染存檔 ----
function sanitize_(pl){
  pl.gold = Math.max(0, Math.floor(pl.gold || 0));
  pl.deepest = Math.max(0, Math.min(CFG.MAX_FLOOR, Math.floor(pl.deepest || 0)));
  if (pl.roster.length > CFG.ROSTER_MAX) pl.roster = pl.roster.slice(0, CFG.ROSTER_MAX);
  var ids = {}; pl.roster.forEach(function(c){ if (c && c.id) ids[c.id] = true; });
  var seen = {};
  function clean(list, max){
    var out = [];
    for (var i=0;i<list.length && out.length<max;i++){
      var id = list[i];
      if (ids[id] && !seen[id]){ out.push(id); seen[id] = true; }
    }
    return out;
  }
  pl.team.battle = clean(pl.team.battle, CFG.BATTLE_SLOTS);
  pl.team.support = clean(pl.team.support, CFG.SUPPORT_SLOTS);
  pl.roster.forEach(function(c){
    for (var k in c){ if (k.charAt(0)==='_') delete c[k]; }   // 去戰鬥暫存
    var mh = maxHpOf(c);
    if (typeof c.hp !== 'number' || isNaN(c.hp)) c.hp = mh;
    c.maxhp = mh;
    c.hp = Math.max(0, Math.min(mh, Math.round(c.hp)));
  });
}

// ---- 隊伍縮圖（給名冊觀戰）----
function buildPreview_(player){
  var team = (player.team.battle||[]).concat(player.team.support||[]);
  var byId = {}; player.roster.forEach(function(c){ if (c) byId[c.id]=c; });
  var members = team.map(function(id){ var c=byId[id]; if (!c) return null;
    var ri = raceInfo(c.race) || {};
    return { name:c.name, job:c.job, ico:(classInfo(c.job)||{}).ico||'❓', race:c.race, raceIco:ri.ico||'', level:c.level||1, portrait:c.portrait||'' };
  }).filter(Boolean);
  var mk = MARKET_BY[player.port||'merc'] || {};
  var sh = player.ship || {};
  var fame = fameOf(player);
  return { deepest:player.deepest||0, gold:player.gold||0, members:members, fame:fame, peerage:peerageOf(fame),
    port:player.port||'merc', portNm:mk.nm||'', portIco:mk.ico||'', cannon:sh.cannon||6, hull:sh.hullMax||60 };
}

// ---- 冒險者名冊（唯讀，短快取，只讀需要的欄）----
function listPlayers(){
  var cache = CacheService.getScriptCache();
  var hit = cache.get('list_players');
  if (hit){ var p = safeParse_(hit); if (p) return p; }
  var sh = playerSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var nicks = sh.getRange(2, COL.NICK+1, last-1, 1).getValues();
  var rest  = sh.getRange(2, COL.DEEP+1, last-1, 4).getValues();   // deep,gold,upd,preview（跳過大 json 欄）
  var out = [];
  for (var i=0;i<nicks.length;i++){
    var nick = (nicks[i][0]||'').toString(); if (!nick) continue;
    var preview = safeParse_(rest[i][3]) || {};
    out.push({ nick:nick, deepest:rest[i][0]||0, gold:rest[i][1]||0, updated:rest[i][2]||0, members:preview.members||[],
      fame:preview.fame||0, peerage:preview.peerage||0,
      port:preview.port||'merc', portNm:preview.portNm||'', portIco:preview.portIco||'', cannon:preview.cannon||6, hull:preview.hull||60 });
  }
  out.sort(function(a,b){ return (b.fame-a.fame) || (b.deepest-a.deepest); });
  cache.put('list_players', JSON.stringify(out), LIST_TTL);
  return out;
}
