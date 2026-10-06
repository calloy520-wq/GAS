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
var AI_URL = 'https://api.anthropic.com/v1/messages';
var AI_VER = '2023-06-01';
var AI_MODEL_DEFAULT = 'claude-opus-5';   // 想省錢可用 setAiModel('claude-haiku-4-5')
var AI_TIMEOUT_NOTE = '村誌生成失敗時一律回 null，前端會沿用模板文字。';

// 寫作守則：這段固定不變，所以放在可快取的前綴，之後每次呼叫只付 0.1 倍價
var AI_SYSTEM =
  '你是一部村莊編年史的執筆者。背景是一座荒廢後被重新開墾的東方邊境村落，' +
  '沒有魔法、沒有超自然力量，是寫實的墾荒求生。\n\n' +
  '你的工作：把下面提供的「當日結算結果」改寫成一段村誌。\n\n' +
  '【絕對規則】\n' +
  '1. 你只能描述結算結果裡**已經發生**的事。不准發明任何事件、數字、人物或轉折。\n' +
  '2. 不准讓任何人復活、死而復生、或改變生死狀態。結果說誰死了就是誰死了。\n' +
  '3. 不准更動任何數值。你寫的是文字，不是規則。\n' +
  '4. 沒有出現在名單裡的人，不准提到。\n' +
  '5. 如果玩家的建築名字很奇怪（例如「會噴火的龍塔」），照用那個名字，' +
  '但它在故事裡就是一座普通的木造建物，不會真的噴火。\n\n' +
  '【文體】\n' +
  '繁體中文。語氣平實、節制、略帶疲憊感，像真的有人在煤油燈下記帳簿後面順手寫的。' +
  '不要華麗辭藻，不要戲劇化的感嘆。寫人做了什麼、天氣如何、誰的狀況不好。\n' +
  '每則 80～150 字，分 1～2 段。不要列點，不要標題，不要開場白，直接寫內容。\n' +
  '有人死去時寫得克制，一兩句就好——越平淡越沉重。';

function aiModel_(){
  try {
    return PropertiesService.getScriptProperties().getProperty('AI_MODEL') || AI_MODEL_DEFAULT;
  } catch(e){ return AI_MODEL_DEFAULT; }
}

// ★ AI 只收「已經算完的結果」，只回純文字，不得回寫任何欄位。
//   任何失敗都回 { text:null }，前端沿用模板，遊戲完全不受影響。
function apiNarrate_(p){
  var key;
  try { key = PropertiesService.getScriptProperties().getProperty(PROP_AI_KEY); } catch(e){ key = null; }
  if (!key) return { text: null, reason: 'no-key' };

  var facts = p.facts;
  if (!facts || typeof facts !== 'object') return { text: null, reason: 'no-facts' };

  var body = {
    model: aiModel_(),
    max_tokens: 700,
    system: [{ type:'text', text: AI_SYSTEM, cache_control: { type:'ephemeral' } }],
    messages: [{ role:'user', content: buildNarratePrompt_(facts) }]
  };

  var res;
  try {
    res = UrlFetchApp.fetch(AI_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': key, 'anthropic-version': AI_VER },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
  } catch(e){
    return { text: null, reason: 'fetch-failed' };
  }

  if (res.getResponseCode() !== 200){
    return { text: null, reason: 'http-' + res.getResponseCode() };
  }
  var data;
  try { data = JSON.parse(res.getContentText()); } catch(e){ return { text:null, reason:'bad-json' }; }
  if (data.stop_reason === 'refusal') return { text: null, reason: 'refusal' };

  var out = '';
  var blocks = data.content || [];
  for (var i = 0; i < blocks.length; i++){
    if (blocks[i].type === 'text') out += blocks[i].text;
  }
  out = (out || '').trim();
  if (!out) return { text: null, reason: 'empty' };

  return {
    text: out.slice(0, 1200),
    usage: data.usage ? {
      in: data.usage.input_tokens, out: data.usage.output_tokens,
      cacheRead: data.usage.cache_read_input_tokens || 0,
      cacheWrite: data.usage.cache_creation_input_tokens || 0
    } : null
  };
}

// 把結構化結果組成給 AI 的輸入。
// 刻意只送「事實」，不送對話歷史 —— 成本才會是固定的，不會隨遊戲進度膨脹。
function buildNarratePrompt_(f){
  var L = [];
  L.push('【村子】' + (f.village || '無名村') + '　第 ' + f.day + ' 天・' + f.season + '・' + f.weather);
  if (f.cards && f.cards.length){
    L.push('\n【目前村裡的人】');
    f.cards.forEach(function(c){
      L.push('・' + c.name + '（' + c.sex + c.age + '歲，' + c.trait + '）' +
        '　體力' + c.stam + ' 心情' + c.mood + ' 健康' + c.hp + (c.sick ? ' ※' + c.sick : ''));
    });
  }
  if (f.memory) L.push('\n【前情】' + f.memory);
  L.push('\n【今天實際發生的事（只能寫這些）】');
  (f.lines || []).forEach(function(x){ L.push('・' + x); });
  if (f.custom && f.custom.length) L.push('\n【村裡的建物】' + f.custom.join('、'));
  L.push('\n請依上述事實寫成一則村誌。');
  return L.join('\n');
}
