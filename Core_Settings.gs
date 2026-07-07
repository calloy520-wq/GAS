// ==========================================
// 諸國爭霸 (Warlords) — 蘭斯式地圖征服戰略 SLG
// 第一部分：Schema、平衡數值、兵種/技能表、原創女角色卡種子、初始化
// 核心規則全部由 GAS 運算；不呼叫任何外部 API。
// 角色的「靈魂」以結構化 persona 欄位保存 → 現在驅動模板事件，未來直接當 AI 人設。
// ==========================================

const PROP_SHEET_ID = 'GAME_SHEET_ID';

const SHEETS = {
  STATE:     'GameState',
  FACTION:   'Factions',
  TERRITORY: 'Territories',
  CHAR:      'Characters',
  ITEM:      'Items'
};

// GameState：單列
const C_STATE = { TURN: 0, PHASE: 1, WINNER: 2, LOG: 3 };

// Factions：勢力（AP=本回合行動點；ABILITY=特殊能力代碼）
const C_FAC = { ID: 0, NAME: 1, IS_PLAYER: 2, GOLD: 3, COLOR: 4, ALIVE: 5, AP: 6, ABILITY: 7 };

// Territories：領地
const C_TER = { ID: 0, NAME: 1, OWNER: 2, TROOPS: 3, MAX_TROOPS: 4, INCOME: 5, DEV: 6, X: 7, Y: 8, ADJ: 9 };

// Characters：角色（女武將）。含 persona 靈魂欄位。
const C_CHAR = {
  ID: 0, NAME: 1, OWNER: 2, UNIT: 3, LEVEL: 4, EXP: 5,
  LEAD: 6, WAR: 7, INT: 8, SKILL: 9, LOC: 10, ACTED: 11, ALIVE: 12, LOYALTY: 13, EQUIP: 14,
  // ↓ 靈魂：現在給模板事件用，未來給 AI 當人設 prompt
  PERSONA: 15, SPEECH: 16, LIKES: 17, CATCH: 18, BIO: 19
};

// Items：裝備（owner = 角色ID 表示已裝備；空字串表示在寶庫可自由裝配）
const C_ITEM = { ID: 0, NAME: 1, TYPE: 2, WAR: 3, LEAD: 4, INT: 5, OWNER: 6, DESC: 7 };

// ------------------------------------------
// ★ 平衡數值
// ------------------------------------------
const RULES = {
  RECRUIT_COST_PER_TROOP: 2,
  RECRUIT_BATCH: 200,
  DEVELOP_COST: 300,
  DEVELOP_INCOME_GAIN: 15,
  DEVELOP_MAXTROOPS_GAIN: 200,
  CITY_DEFENSE_BONUS: 20,
  TROOP_REGEN: 40,
  CAPTURE_GENERAL_CHANCE: 0.5,
  START_GOLD: 1200,
  // 行動點
  AP_BASE: 4,
  AP_PER_TERRITORIES: 3,   // 每擁有幾塊地 +1 AP
  // 養成
  EXP_BASE_WIN: 30,
  LEVEL_STAT_GAIN: 2,      // 每升一級三圍各 +2
  STAT_CAP: 130,
  // 好感 / 搜索
  TALK_LOYALTY_GAIN: 12,
  SEARCH_COST_GOLD: 250,
  // 技能發動基礎率
  SKILL_BASE_CHANCE: 0.30,
  SKILL_CHANCE_CAP: 0.65,
  ADV_MULT: 1.30,          // 兵種克制加成
  DISADV_MULT: 0.80        // 兵種被克減益
};

// ------------------------------------------
// ★ 兵種與相剋（attacker 兵種 強克 陣列中的 defender 兵種）
// ------------------------------------------
const UNIT_LABEL = { infantry: '步兵', cavalry: '騎兵', archer: '弓兵', mage: '術士', ninja: '忍者' };
const UNIT_ADV = {
  infantry: ['cavalry'],          // 長槍剋騎兵
  cavalry:  ['archer'],           // 騎兵剋弓兵
  archer:   ['infantry'],         // 弓兵剋步兵
  mage:     ['infantry', 'cavalry'], // 術士範圍剋近戰群
  ninja:    ['archer', 'mage']    // 忍者剋遠程/術士
};

// ------------------------------------------
// ★ 技能（必殺）。type: atk 進攻加成 / heal 減少己方傷亡 / guard 守城減傷
//    ignoreCityDef: 無視守城加成
// ------------------------------------------
const SKILLS = {
  charge:    { name: '聖槍突擊', type: 'atk',   power: 0.40, desc: '策馬突陣，進攻力+40%' },
  firestorm: { name: '炎爆術',   type: 'atk',   power: 0.50, desc: '範圍炎爆，進攻力+50%' },
  volley:    { name: '箭雨',     type: 'atk',   power: 0.35, desc: '箭雨覆蓋，進攻力+35%' },
  snipe:     { name: '精準狙擊', type: 'atk',   power: 0.42, desc: '狙首擾陣，進攻力+42%' },
  shadow:    { name: '暗殺',     type: 'atk',   power: 0.45, desc: '潛入斬將，無視守城加成', ignoreCityDef: true },
  iai:       { name: '居合一閃', type: 'atk',   power: 0.46, desc: '拔刀斬，進攻力+46%' },
  heal:      { name: '聖光治癒', type: 'heal',  power: 0.35, desc: '戰後救回35%傷亡' },
  guard:     { name: '鐵壁陣',   type: 'guard', power: 0.40, desc: '守城時防禦力+40%' }
};

// ------------------------------------------
// ★ 勢力特殊能力
// ------------------------------------------
const ABILITIES = {
  vanguard: { name: '曙光突襲', desc: '我方進攻時全軍戰力 +10%' },
  arcana:   { name: '魔導共鳴', desc: '我方技能發動率 +15%' },
  fortress: { name: '玄影匿蹤', desc: '我方守城時防禦 +15%' }
};

// ------------------------------------------
// ★ 種子資料
// ------------------------------------------
function SEED_FACTIONS() {
  // ID, NAME, IS_PLAYER, GOLD, COLOR, ALIVE, AP, ABILITY
  return [
    ['F0', '在野中立',   0, 0,                '#9e9e9e', 1, 0, ''],
    ['F1', '曙光騎士團', 1, RULES.START_GOLD, '#2e7dd7', 1, RULES.AP_BASE, 'vanguard'],
    ['F2', '緋紅魔導院', 0, RULES.START_GOLD, '#d7492e', 1, 0, 'arcana'],
    ['F3', '玄影忍軍',   0, RULES.START_GOLD, '#7a5cc0', 1, 0, 'fortress']
  ];
}

function SEED_TERRITORIES() {
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

// 角色卡種子。混搭原創動漫女角（奇幻/和風/科幻大集合）。
// 欄位：ID,NAME,OWNER,UNIT,LEVEL,EXP,LEAD,WAR,INT,SKILL,LOC,ACTED,ALIVE,LOYALTY,EQUIP,PERSONA,SPEECH,LIKES,CATCH,BIO
function SEED_CHARS() {
  return [
    // ── 玩家：曙光騎士團 ──
    ['C1', '亞瑟莉亞', 'F1', 'cavalry', 3, 0, 90, 95, 72, 'charge', 'T1', 0, 1, 70, 'IT1',
      '正直熱血的聖騎士王女，責任感極強，不擅長說謊。',
      '端正有禮但一激動就變得中二，愛喊招式名。',
      '正義、甜點、被誇獎；討厭懦弱與背叛。',
      '「以曙光之名，衝鋒！」',
      '失落王國的末裔，立誓以聖劍重整天下秩序。'],
    ['C2', '莉緹希雅', 'F1', 'mage', 3, 0, 70, 66, 96, 'firestorm', 'T1', 0, 1, 65, 'IT3',
      '傲嬌天才魔導士，嘴硬心軟，被依賴時會臉紅嘴上卻不承認。',
      '毒舌吐槽＋「才、才不是為了你」句型。',
      '古書、研究、獨處；討厭笨蛋與被摸頭。',
      '「哼，這種程度的火焰對我來說剛好而已。」',
      '魔導名門的叛逆天才，因看不慣家族保守而出走。'],
    // ── 緋紅魔導院 ──
    ['C3', '卡蜜拉', 'F2', 'mage', 4, 0, 82, 70, 94, 'firestorm', 'T12', 0, 1, 60, '',
      '冷酷從容的魔女統帥，優雅而危險，情緒起伏極小。',
      '低沉優雅、話中帶刺、常以「可憐的孩子」稱呼對手。',
      '完美、紅酒、支配；討厭失序與吵鬧。',
      '「跪下，然後我或許會考慮讓妳活著。」',
      '緋紅魔導院之首，追求以絕對力量統一大陸。'],
    ['C4', '薇歐拉', 'F2', 'archer', 3, 0, 78, 84, 76, 'snipe', 'T12', 0, 1, 55, '',
      '沉著寡言的狙擊手，忠於卡蜜拉，話少但觀察力極強。',
      '簡短、只講重點、偶爾冷面吐槽。',
      '安靜、精密器械；討厭浪費與情緒化。',
      '「……瞄準，完畢。」',
      '孤兒出身，被卡蜜拉收留後成為她最鋒利的箭。'],
    // ── 玄影忍軍 ──
    ['C5', '綾音', 'F3', 'ninja', 4, 0, 84, 88, 80, 'shadow', 'T7', 0, 1, 60, '',
      '沉默的忍者頭領，冷靜致命，重視同伴卻不輕易表露。',
      '簡潔、以「主上」自稱對象、句尾常帶「。」的停頓感。',
      '月夜、修行、糰子；討厭喧嘩與背信。',
      '「影已至。目標，抹殺。」',
      '玄影一族的頭領，尋找足以託付忠誠的真正霸主。'],
    ['C6', '雪代', 'F3', 'infantry', 3, 0, 86, 90, 66, 'iai', 'T7', 0, 1, 58, '',
      '恪守武士道的少女劍士，一板一眼、極重信義，有點不懂變通。',
      '文言腔、常說「在下」「承蒙」，認真到有點好笑。',
      '劍道、清晨、正直之人；討厭卑鄙與偷懶。',
      '「在下的刀，只為道義出鞘。」',
      '沒落武家的獨女，行走天下尋找值得效忠的主君。'],
    // ── 在野（搜索可招募）owner=F0, loc='' ──
    ['C7', '蒂雅娜', 'F0', 'archer', 4, 0, 82, 86, 84, 'volley', '', 0, 1, 0, '',
      '高傲的精靈女王，優雅自負，看不起短命的人類卻意外講理。',
      '高貴、慢條斯理、愛用「汝等」。',
      '森林、星空、美酒；討厭污染與粗魯。',
      '「汝等的壽命，還不夠學會謙卑呢。」',
      '隱世精靈國度的女王，因故離開森林尋找盟友。'],
    ['C8', '星奈', 'F0', 'mage', 4, 0, 76, 72, 98, 'firestorm', '', 0, 1, 0, '',
      '來自未來的 AI 少女，理性精確，正在學習「情感」這種變數。',
      '機械式敬語＋偶爾冒出可愛的計算失誤。',
      '資料、觀測、甜食（新發現）；討厭邏輯矛盾。',
      '「情感模組……運算中。請、請稍候。」',
      '不明時代墜落至此的自律兵器，尋找存在的意義。'],
    ['C9', '芙蘭', 'F0', 'infantry', 2, 0, 74, 82, 60, 'iai', '', 0, 1, 0, '',
      '元氣滿滿的少女劍士，天真直率，行動先於思考。',
      '超有活力、大量驚嘆號、愛取綽號。',
      '肉、冒險、交朋友；討厭無聊與蔬菜。',
      '「衝了衝了——！交給我準沒錯！」',
      '鄉下出身的自學劍士，夢想成為傳說中的英雄。'],
    ['C10', '巫月', 'F0', 'mage', 3, 0, 80, 60, 90, 'heal', '', 0, 1, 0, '',
      '神秘的巫女，溫柔沉靜，總像看透一切又什麼都不說。',
      '柔和、留白很多、偶爾說出預言般的話。',
      '神社、白茶、貓；討厭殺戮與謊言。',
      '「……這一戰的結局，我早已在夢中見過了。」',
      '侍奉古老神明的巫女，為了改變預見的災禍而入世。'],
    ['C11', '蕾娜', 'F0', 'cavalry', 3, 0, 84, 88, 68, 'charge', '', 0, 1, 0, '',
      '豪爽的傭兵團長，重義氣講交情，只認實力與酒量。',
      '大剌剌、江湖味、笑聲很大。',
      '烈酒、好對手、報酬；討厭小氣與背叛金主。',
      '「錢給夠、酒管飽，這條命就是妳的了！」',
      '橫行各地的傭兵團首領，尋找出得起價的雄主。']
  ];
}

function SEED_ITEMS() {
  // ID, NAME, TYPE, WAR, LEAD, INT, OWNER, DESC
  return [
    ['IT1', '破軍聖劍',   'weapon',    14, 2, 0, 'C1', '傳說聖劍，武力大增'],
    ['IT2', '白銀戰鎧',   'armor',      0, 12, 0, '', '堅固戰鎧，統率提升'],
    ['IT3', '賢者之書',   'accessory',  0, 0, 14, 'C2', '智慧結晶，智謀大增'],
    ['IT4', '龍鱗長槍',   'weapon',    16, 3, 0, '', '屠龍之槍，威力驚人'],
    ['IT5', '疾風之靴',   'accessory',  2, 9, 0, '', '風之加護，行軍如飛'],
    ['IT6', '秘銀護符',   'accessory',  0, 0, 16, '', '蘊含秘法，智謀提升']
  ];
}

// ------------------------------------------
// ★ 初始化 / 重開新局（第一次請在編輯器手動執行 initGame）
// ------------------------------------------
function initGame() {
  const ss = getOrCreateSpreadsheet_();

  writeSheet_(ss, SHEETS.STATE,
    ['TURN', 'PHASE', 'WINNER', 'LOG'],
    [[1, 'PLAYER', '', '亂世將起。招賢納士、開疆闢土，統一天下就靠妳的號令了。']]);

  writeSheet_(ss, SHEETS.FACTION,
    ['ID', 'NAME', 'IS_PLAYER', 'GOLD', 'COLOR', 'ALIVE', 'AP', 'ABILITY'],
    SEED_FACTIONS());

  writeSheet_(ss, SHEETS.TERRITORY,
    ['ID', 'NAME', 'OWNER', 'TROOPS', 'MAX_TROOPS', 'INCOME', 'DEV', 'X', 'Y', 'ADJ'],
    SEED_TERRITORIES());

  writeSheet_(ss, SHEETS.CHAR,
    ['ID', 'NAME', 'OWNER', 'UNIT', 'LEVEL', 'EXP', 'LEAD', 'WAR', 'INT', 'SKILL',
     'LOC', 'ACTED', 'ALIVE', 'LOYALTY', 'EQUIP', 'PERSONA', 'SPEECH', 'LIKES', 'CATCH', 'BIO'],
    SEED_CHARS());

  writeSheet_(ss, SHEETS.ITEM,
    ['ID', 'NAME', 'TYPE', 'WAR', 'LEAD', 'INT', 'OWNER', 'DESC'],
    SEED_ITEMS());

  return '✅ 遊戲已初始化，試算表 ID：' + ss.getId();
}

function getOrCreateSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_SHEET_ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { /* 舊 ID 失效，重建 */ }
  }
  const ss = SpreadsheetApp.create('諸國爭霸 - 遊戲存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}

function writeSheet_(ss, name, header, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  const data = [header].concat(rows);
  sh.getRange(1, 1, data.length, header.length).setValues(data);
}

function randFactor_(min, max) { return min + Math.random() * (max - min); }

// ------------------------------------------
// ★ AI 人設接口：把角色卡組成一段人設文字。
//   現在沒用到（零 AI）；未來接 LLM 時，這就是餵給模型的 system prompt。
//   → 這就是角色的「靈魂」，不會因為換了 AI 而改變。
// ------------------------------------------
function buildCharacterCard(ch) {
  return [
    '你要扮演的角色：' + ch.name + '（' + UNIT_LABEL[ch.unit] + '）',
    '性格：' + ch.persona,
    '說話風格：' + ch.speech,
    '喜好：' + ch.likes,
    '口頭禪：' + ch.catch,
    '背景：' + ch.bio,
    '請全程以此人設、用繁體中文與玩家互動，不要跳出角色。'
  ].join('\n');
}
