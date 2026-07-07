// ==========================================
// 諸國爭霸 (Warlords) — 地圖征服型戰略 SLG
// 第一部分：基礎設定、資料表 Schema 與遊戲初始化
// 核心規則全部由 GAS 運算，不需要任何外部 API。
// ==========================================

// 遊戲資料存放的試算表 ID 存在 Script Properties，第一次執行 initGame() 會自動建立。
const PROP_SHEET_ID = 'GAME_SHEET_ID';

// ------------------------------------------
// ★ 資料表欄位對照 (ORM Mapping)
//   每個 KEY 對應試算表某一欄的索引，讀寫都以此為唯一真實來源。
// ------------------------------------------
const SHEETS = {
  STATE:      'GameState',
  FACTION:    'Factions',
  TERRITORY:  'Territories',
  GENERAL:    'Generals'
};

// GameState：單列，紀錄全域回合狀態
const C_STATE = { TURN: 0, PHASE: 1, WINNER: 2, LOG: 3 };

// Factions：勢力
const C_FAC = { ID: 0, NAME: 1, IS_PLAYER: 2, GOLD: 3, COLOR: 4, ALIVE: 5 };

// Territories：領地
const C_TER = {
  ID: 0, NAME: 1, OWNER: 2, TROOPS: 3, MAX_TROOPS: 4,
  INCOME: 5, DEV: 6, X: 7, Y: 8, ADJ: 9
};

// Generals：武將
const C_GEN = {
  ID: 0, NAME: 1, OWNER: 2, LEAD: 3, WAR: 4, INT: 5, LOC: 6, ACTED: 7, ALIVE: 8
};

// ------------------------------------------
// ★ 平衡數值 (Game Balance)
// ------------------------------------------
const RULES = {
  RECRUIT_COST_PER_TROOP: 2,   // 徵兵每 1 兵花費銀兩
  RECRUIT_BATCH: 200,          // 一次徵兵數量
  DEVELOP_COST: 300,           // 開發花費
  DEVELOP_INCOME_GAIN: 15,     // 開發後每回合收入增加
  DEVELOP_MAXTROOPS_GAIN: 200, // 開發後領地兵力上限增加
  CITY_DEFENSE_BONUS: 20,      // 守城方額外防禦加成(%)
  TROOP_REGEN: 40,             // 每回合各領地自然回補兵力
  CAPTURE_GENERAL_CHANCE: 0.5, // 攻下敵城俘虜對方武將的機率
  START_GOLD: 1000
};

// ------------------------------------------
// ★ 種子資料 (Seed Data) — 重開新局時使用
// ------------------------------------------
function SEED_FACTIONS() {
  // ID, NAME, IS_PLAYER, GOLD, COLOR, ALIVE
  return [
    ['F0', '在野中立', 0, 0,    '#9e9e9e', 1],
    ['F1', '青龍軍',   1, RULES.START_GOLD, '#2e7dd7', 1],
    ['F2', '赤炎盟',   0, RULES.START_GOLD, '#d7492e', 1],
    ['F3', '玄鐵騎',   0, RULES.START_GOLD, '#7a5cc0', 1]
  ];
}

function SEED_TERRITORIES() {
  // ID, NAME, OWNER, TROOPS, MAX_TROOPS, INCOME, DEV, X, Y, ADJ(逗號分隔)
  return [
    ['T1',  '西陲城', 'F1', 600, 1500, 60, 0, 10, 50, 'T2,T7'],
    ['T2',  '河谷關', 'F0', 300, 1200, 40, 0, 25, 55, 'T1,T3,T7'],
    ['T3',  '平原鎮', 'F0', 350, 1500, 55, 0, 42, 58, 'T2,T4,T10'],
    ['T4',  '山陰堡', 'F0', 400, 1200, 40, 0, 58, 68, 'T3,T5,T10'],
    ['T5',  '白石渡', 'F0', 250, 1000, 35, 0, 72, 72, 'T4,T6'],
    ['T6',  '南嶺寨', 'F0', 300, 1200, 45, 0, 80, 65, 'T5,T9,T12'],
    ['T7',  '北風原', 'F3', 600, 1500, 60, 0, 25, 20, 'T1,T2,T8'],
    ['T8',  '鐵嶺',   'F0', 350, 1200, 40, 0, 40, 15, 'T7,T9'],
    ['T9',  '蒼狼谷', 'F0', 300, 1300, 50, 0, 60, 25, 'T6,T8,T11'],
    ['T10', '中州城', 'F0', 500, 1800, 80, 0, 55, 45, 'T3,T4,T11'],
    ['T11', '落日平', 'F0', 350, 1300, 50, 0, 75, 40, 'T9,T10,T12'],
    ['T12', '東海郡', 'F2', 600, 1500, 60, 0, 92, 50, 'T6,T11']
  ];
}

function SEED_GENERALS() {
  // ID, NAME, OWNER, LEAD(統率), WAR(武力), INT(智謀), LOC, ACTED, ALIVE
  // 全數女將(取材自傳說女戰神)。
  return [
    // 玩家：青龍軍
    ['G1',  '花木蘭', 'F1', 88, 95, 76, 'T1', 0, 1],
    ['G2',  '樊梨花', 'F1', 82, 90, 84, 'T1', 0, 1],
    // 赤炎盟
    ['G3',  '穆桂英', 'F2', 90, 92, 80, 'T12', 0, 1],
    ['G4',  '梁紅玉', 'F2', 88, 86, 78, 'T12', 0, 1],
    // 玄鐵騎
    ['G5',  '秦良玉', 'F3', 92, 88, 82, 'T7', 0, 1],
    ['G6',  '荀灌',   'F3', 80, 82, 88, 'T7', 0, 1],
    // 中立在野女將(駐守中立城，攻下可俘虜)
    ['G7',  '婦好',   'F0', 90, 94, 70, 'T10', 0, 1],
    ['G8',  '孫尚香', 'F0', 80, 88, 72, 'T3', 0, 1],
    ['G9',  '王異',   'F0', 78, 76, 85, 'T4', 0, 1]
  ];
}

// ------------------------------------------
// ★ 遊戲初始化 / 重開新局
//   第一次執行請在 Apps Script 編輯器手動跑一次 initGame()
//   之後前端「重開新局」按鈕也會呼叫它。
// ------------------------------------------
function initGame() {
  const ss = getOrCreateSpreadsheet_();

  writeSheet_(ss, SHEETS.STATE,
    ['TURN', 'PHASE', 'WINNER', 'LOG'],
    [[1, 'PLAYER', '', '新的征程開始了。統一天下，就在你手中。']]);

  writeSheet_(ss, SHEETS.FACTION,
    ['ID', 'NAME', 'IS_PLAYER', 'GOLD', 'COLOR', 'ALIVE'],
    SEED_FACTIONS());

  writeSheet_(ss, SHEETS.TERRITORY,
    ['ID', 'NAME', 'OWNER', 'TROOPS', 'MAX_TROOPS', 'INCOME', 'DEV', 'X', 'Y', 'ADJ'],
    SEED_TERRITORIES());

  writeSheet_(ss, SHEETS.GENERAL,
    ['ID', 'NAME', 'OWNER', 'LEAD', 'WAR', 'INT', 'LOC', 'ACTED', 'ALIVE'],
    SEED_GENERALS());

  return '✅ 遊戲已初始化，試算表 ID：' + ss.getId();
}

// 取得(或第一次建立)遊戲試算表
function getOrCreateSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_SHEET_ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { /* 舊 ID 失效，往下重建 */ }
  }
  const ss = SpreadsheetApp.create('諸國爭霸 - 遊戲存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}

// 覆寫整張工作表(不存在則建立)
function writeSheet_(ss, name, header, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  const data = [header].concat(rows);
  sh.getRange(1, 1, data.length, header.length).setValues(data);
  // 移除預設空白 Sheet1
  const first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

// 亂數係數：回傳 min~max 之間的浮點數(戰鬥用)
function randFactor_(min, max) {
  return min + Math.random() * (max - min);
}
