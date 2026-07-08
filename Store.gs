// ============================================================
// 傭兵之城 · D&D 版 — 資料層（Google Sheet 當資料庫）
// 各玩家獨立存檔（以暱稱為 key）；另提供唯讀名冊給「觀戰」用。
// ============================================================

var PROP_SHEET_ID = 'MERC_SHEET_ID';
var SHEET_PLAYERS = 'Players';
// 欄位：nick | json | deepest | gold | updated | preview
var COL = { NICK:0, JSON:1, DEEP:2, GOLD:3, UPD:4, PREVIEW:5 };

function getSS_(){
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  if (id){ try { return SpreadsheetApp.openById(id); } catch(e){} }
  var ss = SpreadsheetApp.create('傭兵之城 - 玩家存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}
function playerSheet_(){
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_PLAYERS);
  if (!sh){
    sh = ss.insertSheet(SHEET_PLAYERS);
    sh.appendRow(['nick','json','deepest','gold','updated','preview']);
    var def = ss.getSheetByName('Sheet1'); if (def && def.getName()!==SHEET_PLAYERS) { try{ ss.deleteSheet(def); }catch(e){} }
  }
  return sh;
}
function normNick_(nick){ return (nick||'').toString().trim().slice(0,16); }

function findRow_(sh, nick){
  var data = sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++){
    if ((data[i][COL.NICK]||'').toString() === nick) return i+1; // 1-based row
  }
  return -1;
}

// 讀取單一玩家（不存在回 null）
function loadPlayer(nick){
  nick = normNick_(nick); if (!nick) return null;
  var sh = playerSheet_();
  var row = findRow_(sh, nick);
  if (row < 0) return null;
  var raw = sh.getRange(row, COL.JSON+1).getValue();
  try { return JSON.parse(raw); } catch(e){ return null; }
}

// 寫入玩家（LockService 防並發）
function savePlayer(player){
  var nick = normNick_(player.nick);
  if (!nick) throw new Error('缺少暱稱');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = playerSheet_();
    player.nick = nick;
    player.updated = Date.now();
    var preview = buildPreview_(player);
    var rowVals = [nick, JSON.stringify(player), player.deepest||0, player.gold||0, player.updated, JSON.stringify(preview)];
    var row = findRow_(sh, nick);
    if (row < 0) sh.appendRow(rowVals);
    else sh.getRange(row, 1, 1, rowVals.length).setValues([rowVals]);
    return player;
  } finally { lock.releaseLock(); }
}

// 隊伍縮圖（給名冊觀戰）
function buildPreview_(player){
  var team = (player.team && player.team.battle || []).concat(player.team && player.team.support || []);
  var byId = {}; (player.roster||[]).forEach(function(c){ byId[c.id]=c; });
  var members = team.map(function(id){ var c=byId[id]; return c ? { name:c.name, job:c.job, ico:(classInfo(c.job)||{}).ico||'❓', level:c.level, portrait:c.portrait||'' } : null; }).filter(Boolean);
  return { deepest:player.deepest||0, gold:player.gold||0, members:members };
}

// 冒險者名冊（唯讀）：所有玩家的進度與隊伍
function listPlayers(){
  var sh = playerSheet_();
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i=1;i<data.length;i++){
    var nick = (data[i][COL.NICK]||'').toString(); if (!nick) continue;
    var preview = {};
    try { preview = JSON.parse(data[i][COL.PREVIEW]||'{}'); } catch(e){ preview={}; }
    out.push({ nick:nick, deepest:data[i][COL.DEEP]||0, gold:data[i][COL.GOLD]||0,
      updated:data[i][COL.UPD]||0, members:preview.members||[] });
  }
  out.sort(function(a,b){ return (b.deepest-a.deepest) || (b.gold-a.gold); });
  return out;
}
