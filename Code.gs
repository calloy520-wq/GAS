// ============================================================
// 《廢村開拓》— 入口與 API
//
// 架構說明（跟前一個專案不同，刻意為之）：
//   遊戲引擎在前端（Data.html / Engine.html），只有一份，不需要維護鏡像。
//   伺服器只做三件事：發網頁、存讀檔、（之後）代打 AI 敘事。
//   AI 必須走伺服器，因為 API key 絕對不能出現在前端。
// ============================================================

function doGet(){
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('廢村開拓')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }

// 前端唯一入口：回傳 JSON 字串
function api(action, payloadJson){
  var p = {};
  try { p = payloadJson ? JSON.parse(payloadJson) : {}; } catch(e){ p = {}; }
  try {
    return JSON.stringify({ ok:true, data: route_(action, p) });
  } catch(err){
    return JSON.stringify({ ok:false, error:(err && err.message) ? err.message : String(err) });
  }
}

function route_(action, p){
  switch(action){
    case 'load':    return apiLoad_(p);
    case 'save':    return apiSave_(p);
    case 'ruins':   return apiRuins_(p);
    case 'bury':    return apiBury_(p);
    case 'narrate': return apiNarrate_(p);
    case 'meta':    return { ver: SCHEMA_VER, ai: hasAiKey_() };
    default: throw new Error('未知動作：' + action);
  }
}

// ---- 存讀檔 --------------------------------------------------
function apiLoad_(p){
  var nick = normNick_(p.nick);
  if (!nick) throw new Error('請先取個名字');
  var save = readSave_(nick);
  return { nick: nick, save: save };     // save 為 null 代表新玩家
}

function apiSave_(p){
  var nick = normNick_(p.nick);
  if (!nick) throw new Error('缺少名字');
  if (!p.save || typeof p.save !== 'object') throw new Error('沒有存檔內容');
  writeSave_(nick, p.save);
  return { saved: true, at: new Date().toISOString() };
}

// ---- 廢墟：滅村的村子留在世界上，給別的玩家挖到 --------------
// 這是「非同步多人」的第一步：單人完整可玩，但世界裡有別人的故事。
function apiBury_(p){
  var nick = normNick_(p.nick);
  if (!nick) throw new Error('缺少名字');
  var r = p.ruin || {};
  if (!r.day) throw new Error('沒有廢墟資料');
  writeRuin_(nick, {
    nick: nick,
    day: Math.floor(r.day) || 0,
    ending: (r.ending || '').toString().slice(0, 20),
    lost: Math.floor(r.lost) || 0,
    lastLog: (r.lastLog || '').toString().slice(0, 600),
    names: Array.isArray(r.names) ? r.names.slice(0, 12) : [],
    at: new Date()
  });
  return { buried: true };
}

function apiRuins_(p){
  var n = Math.min(20, Math.max(1, Math.floor(p.n) || 6));
  return { ruins: readRuins_(n, normNick_(p.nick)) };
}

// ---- AI 敘事（之後接上；沒有 key 就回 null，前端自動用模板）----
// ★ AI 只會收到「已經算完的結果」，它寫的字不會回寫任何數值。
function hasAiKey_(){
  try { return !!PropertiesService.getScriptProperties().getProperty(PROP_AI_KEY); }
  catch(e){ return false; }
}
function apiNarrate_(p){
  if (!hasAiKey_()) return { text: null, reason: 'no-key' };
  // 尚未實作：Phase 2 會在這裡用 UrlFetchApp 呼叫 LLM，
  // 輸入只有 p.report（結構化結果）＋角色人設，輸出純文字。
  return { text: null, reason: 'not-implemented' };
}
