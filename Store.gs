// ============================================================
// 《廢村開拓》— 資料層（Google Sheet 當資料庫）
//
// 注意：刻意使用新的 Script Property key 與新分頁名稱，
// 不會去碰前一個遊戲（海與劍之歌）的舊存檔。
// ============================================================

var PROP_SHEET_ID = 'VILLAGE_SHEET_ID';   // ← 新 key，與舊遊戲完全隔開
var PROP_AI_KEY   = 'AI_API_KEY';         // AI 金鑰（手動在專案設定填，不進 git）
var SHEET_SAVES = 'Saves';
var SHEET_RUINS = 'Ruins';
var SCHEMA_VER = 1;

var SAVE_HEADER = ['nick','json','day','updated','preview'];
var SC = { NICK:0, JSON:1, DAY:2, UPD:3, PREV:4 };
var RUIN_HEADER = ['nick','day','ending','lost','names','lastLog','at'];
var RC = { NICK:0, DAY:1, END:2, LOST:3, NAMES:4, LOG:5, AT:6 };

var CELL_LIMIT = 48000;
var CACHE_TTL  = 21600;    // 存檔快取 6 小時
var RUIN_TTL   = 60;       // 廢墟清單快取 60 秒

// ---- 試算表 --------------------------------------------------
function getSS_(){
  try { var act = SpreadsheetApp.getActiveSpreadsheet(); if (act) return act; } catch(e){}
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  if (id){ try { return SpreadsheetApp.openById(id); } catch(e){} }
  var ss = SpreadsheetApp.create('廢村開拓 - 存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}
// 想把資料庫指到某張試算表時，在編輯器手動執行一次
function setDataSheet(spreadsheetId){
  PropertiesService.getScriptProperties().setProperty(PROP_SHEET_ID, spreadsheetId);
  return '已設定資料庫試算表：' + spreadsheetId;
}
function getDataSheetUrl(){
  var ss = getSS_();
  return ss.getUrl() + '  （id: ' + ss.getId() + '）';
}
// 要接 AI 時，在編輯器手動執行一次（金鑰只存在 Script Properties，不進 git）
function setAiKey(key){
  PropertiesService.getScriptProperties().setProperty(PROP_AI_KEY, key);
  return '已設定 AI 金鑰（長度 ' + (key || '').length + '）';
}
function clearAiKey(){
  PropertiesService.getScriptProperties().deleteProperty(PROP_AI_KEY);
  return '已移除 AI 金鑰，村誌會改用模板文字';
}
// 想換模型時執行（預設 claude-opus-5；claude-haiku-4-5 便宜約五倍）
function setAiModel(model){
  PropertiesService.getScriptProperties().setProperty('AI_MODEL', model);
  return '已設定模型：' + model;
}
// 在編輯器執行這個就能確認金鑰有沒有通
function testAi(){
  var r = apiNarrate_({ facts: {
    village:'測試村', day:1, season:'春', weather:'晴',
    cards:[{name:'阿福',sex:'男',age:34,trait:'耐勞',stam:100,mood:62,hp:100,sick:''}],
    lines:['阿福 伐木 ＋4 木材','這一天沒什麼事']
  }});
  return JSON.stringify(r);
}

function sheet_(name, header){
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    var def = ss.getSheetByName('Sheet1');
    if (def && def.getName() !== name && def.getLastRow() === 0){ try { ss.deleteSheet(def); } catch(e){} }
  } else if (sh.getLastRow() === 0){
    sh.appendRow(header);
  }
  return sh;
}
function saveSheet_(){ return sheet_(SHEET_SAVES, SAVE_HEADER); }
function ruinSheet_(){ return sheet_(SHEET_RUINS, RUIN_HEADER); }

function normNick_(nick){ return (nick || '').toString().trim().slice(0, 16); }
function cacheKey_(nick){ return 'v_' + nick; }

// 只讀 A 欄找列，不把整包 JSON 拉出來
function findRow_(sh, nick){
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var col = sh.getRange(2, SC.NICK + 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++){
    if (normNick_(col[i][0]) === nick) return i + 2;
  }
  return -1;
}

// ---- 讀寫存檔 ------------------------------------------------
function readSave_(nick){
  var cache = CacheService.getScriptCache();
  var hit = null;
  try { hit = cache.get(cacheKey_(nick)); } catch(e){}
  if (hit){ try { return JSON.parse(hit); } catch(e){} }

  var sh = saveSheet_();
  var row = findRow_(sh, nick);
  if (row < 0) return null;
  var json = sh.getRange(row, SC.JSON + 1).getValue();
  if (!json) return null;
  var obj = null;
  try { obj = JSON.parse(json); } catch(e){ return null; }
  try { cache.put(cacheKey_(nick), json, CACHE_TTL); } catch(e){}
  return obj;
}

function writeSave_(nick, save){
  var json = JSON.stringify(save);
  if (json.length > CELL_LIMIT){
    // 存檔過大時先砍村誌（最可壓縮的部分），避免整筆寫入失敗
    if (save.log && save.log.length > 12){
      save = JSON.parse(json);
      save.log = save.log.slice(-12);
      json = JSON.stringify(save);
    }
    if (json.length > CELL_LIMIT) throw new Error('存檔過大，無法寫入');
  }

  var sh = saveSheet_();
  var row = findRow_(sh, nick);
  var day = (save.run && save.run.day) || 0;
  var people = Array.isArray(save.people) ? save.people.filter(function(p){ return p.alive; }).length : 0;
  var preview = '第' + day + '天・' + people + '人' + (save.run && save.run.over ? '・已結束' : '');
  var rowVals = [[nick, json, day, new Date(), preview]];

  if (row < 0) sh.appendRow(rowVals[0]);
  else sh.getRange(row, 1, 1, SAVE_HEADER.length).setValues(rowVals);

  try { CacheService.getScriptCache().put(cacheKey_(nick), json, CACHE_TTL); } catch(e){}
  return true;
}

// ---- 廢墟 ----------------------------------------------------
function writeRuin_(nick, r){
  var sh = ruinSheet_();
  sh.appendRow([nick, r.day, r.ending, r.lost, (r.names || []).join('、'), r.lastLog, r.at]);
  try { CacheService.getScriptCache().remove('ruins'); } catch(e){}
  return true;
}

// 回傳最近的廢墟（排除自己的），給探索時挖到用
function readRuins_(n, exceptNick){
  var cache = CacheService.getScriptCache();
  var hit = null;
  try { hit = cache.get('ruins'); } catch(e){}
  var all;
  if (hit){
    try { all = JSON.parse(hit); } catch(e){ all = null; }
  }
  if (!all){
    var sh = ruinSheet_();
    var last = sh.getLastRow();
    all = [];
    if (last >= 2){
      var from = Math.max(2, last - 199);           // 只讀最近 200 筆
      var vals = sh.getRange(from, 1, last - from + 1, RUIN_HEADER.length).getValues();
      for (var i = vals.length - 1; i >= 0; i--){
        var v = vals[i];
        if (!v[RC.NICK]) continue;
        all.push({
          nick: v[RC.NICK], day: v[RC.DAY], ending: v[RC.END],
          lost: v[RC.LOST], names: (v[RC.NAMES] || '').toString(),
          lastLog: (v[RC.LOG] || '').toString()
        });
      }
    }
    try { cache.put('ruins', JSON.stringify(all), RUIN_TTL); } catch(e){}
  }
  var out = [];
  for (var j = 0; j < all.length && out.length < n; j++){
    if (exceptNick && normNick_(all[j].nick) === exceptNick) continue;
    out.push(all[j]);
  }
  return out;
}
