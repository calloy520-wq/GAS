// ==========================================
// 諸國爭霸 (Warlords) — 蘭斯式地圖征服戰略 SLG
// 第一部分：Schema、平衡數值、兵種/技能/勢力能力、種子資料、隨機路人生成、初始化
// 核心規則全部由 GAS 運算；不呼叫任何外部 API。
// 角色「靈魂」以結構化 persona 欄位保存 → 現在驅動模板事件，未來直接當 AI 人設。
// ==========================================

const PROP_SHEET_ID = 'GAME_SHEET_ID';

const SHEETS = {
  STATE:     'GameState',
  FACTION:   'Factions',
  TERRITORY: 'Territories',
  CHAR:      'Characters',
  ITEM:      'Items',
  DUNGEON:   'Dungeons',
  DIPLO:     'Diplomacy'
};

const C_STATE = { TURN: 0, PHASE: 1, WINNER: 2, LOG: 3, BONDS: 4 };
const C_FAC   = { ID: 0, NAME: 1, IS_PLAYER: 2, GOLD: 3, COLOR: 4, ALIVE: 5, AP: 6, ABILITY: 7 };
const C_TER   = { ID: 0, NAME: 1, OWNER: 2, TROOPS: 3, MAX_TROOPS: 4, INCOME: 5, DEV: 6, X: 7, Y: 8, ADJ: 9,
                  MARKET: 10, BARRACKS: 11, WALL: 12, TOWER: 13 };
const C_CHAR  = {
  ID: 0, NAME: 1, OWNER: 2, UNIT: 3, LEVEL: 4, EXP: 5,
  LEAD: 6, WAR: 7, INT: 8, SKILL: 9, LOC: 10, ACTED: 11, ALIVE: 12, LOYALTY: 13, EQUIP: 14,
  PERSONA: 15, SPEECH: 16, LIKES: 17, CATCH: 18, BIO: 19, CHARGE: 20
};
const C_ITEM  = { ID: 0, NAME: 1, TYPE: 2, WAR: 3, LEAD: 4, INT: 5, OWNER: 6, DESC: 7 };
const C_DUN   = { ID: 0, NAME: 1, TER: 2, LEVEL: 3, FLOORS: 4, PROGRESS: 5, CLEARED: 6,
                  MONSTER: 7, REWARD_GOLD: 8, REWARD_ITEM: 9, RECRUIT: 10 };
const C_DIPLO = { FA: 0, FB: 1, STATUS: 2, EXPIRE: 3 }; // STATUS: ally / ceasefire（war 不存表，預設即戰爭）

// ------------------------------------------
// ★ 平衡數值
// ------------------------------------------
const RULES = {
  RECRUIT_COST_PER_TROOP: 2, RECRUIT_BATCH: 200,
  DEVELOP_COST: 300, DEVELOP_INCOME_GAIN: 15, DEVELOP_MAXTROOPS_GAIN: 200,
  CITY_DEFENSE_BONUS: 20, TROOP_REGEN: 40, CAPTURE_GENERAL_CHANCE: 0.5, START_GOLD: 1200,
  AP_BASE: 4, AP_PER_TERRITORIES: 3,
  EXP_BASE_WIN: 30, LEVEL_STAT_GAIN: 2, STAT_CAP: 130,
  TALK_LOYALTY_GAIN: 12, SEARCH_COST_GOLD: 250,
  DUNGEON_FLOOR_GOLD: 120, DUNGEON_FLOOR_EXP: 45,
  SKILL_BASE_CHANCE: 0.30, SKILL_CHANCE_CAP: 0.65, ADV_MULT: 1.30, DISADV_MULT: 0.80,
  // 外交
  ALLY_COST: 600, CEASEFIRE_COST: 300, CEASEFIRE_TURNS: 5,
  WEALTH_BONUS: 0.20, VETERAN_BONUS: 0.50,
  // 回合限制
  TURN_LIMIT: 40,
  // 內政建設（施設）
  BUILD_MAX_LEVEL: 5, BUILD_BASE_COST: 200,
  MARKET_INCOME: 12, BARRACKS_MAX: 150, WALL_DEF: 8, TOWER_SKILL: 0.05,
  // 特技蓄力
  CHARGE_PER_TURN: 34, CHARGE_MAX: 100, CHARGE_SKILL_MULT: 1.6,
  // 部隊（副將組隊）
  MAX_PARTY: 3
};

// ★ 女將羈絆：湊齊(同陣營且皆存活)觸發一次性事件 + 永久被動加成
const BONDS = [
  { id: 'b1', a: 'C1', b: 'C2',  name: '聖劍雙星', bonus: { war: 5, int: 5 },
    event: '亞瑟莉亞與莉緹希雅並肩作戰，默契與日俱增。莉緹希雅：「哼，別扯我後腿就好……才、才不是為了妳。」' },
  { id: 'b2', a: 'C5', b: 'C6',  name: '玄影武魂', bonus: { war: 6, lead: 4 },
    event: '綾音與雪代一同修行，一影一刀，攻守渾然一體。雪代：「與綾音殿並肩，在下無所畏懼。」' },
  { id: 'b3', a: 'C3', b: 'C4',  name: '緋紅主從', bonus: { lead: 5, int: 5 },
    event: '薇歐拉始終如影隨形護衛卡蜜拉。卡蜜拉：「妳這孩子……罷了，跟緊一點。」' },
  { id: 'b4', a: 'C9', b: 'C10', name: '獸牙義俠', bonus: { war: 8 },
    event: '蕾娜與蓋兒不打不相識，痛飲一場後結為生死之交！「嗷——這才夠味！」' },
  { id: 'b5', a: 'C1', b: 'C11', name: '王者之誓', bonus: { lead: 6 },
    event: '亞瑟莉亞的理想打動了高傲的精靈女王蒂雅娜。「汝之志……本座就暫且信一回。」' }
];

// 施設種類（內政建設）
const BUILD_TYPES = {
  market:   { name: '市場',   icon: '🏪', desc: '每級 +12 收入' },
  barracks: { name: '兵營',   icon: '⛺', desc: '每級 +150 兵力上限' },
  wall:     { name: '城牆',   icon: '🧱', desc: '每級 守城防禦 +8%' },
  tower:    { name: '魔導塔', icon: '🗼', desc: '每級 守將技能率 +5%' }
};
const BUILD_KEYS = ['market', 'barracks', 'wall', 'tower'];

const UNIT_LABEL = { infantry: '步兵', cavalry: '騎兵', archer: '弓兵', mage: '術士', ninja: '忍者' };
const UNIT_ADV = {
  infantry: ['cavalry'], cavalry: ['archer'], archer: ['infantry'],
  mage: ['infantry', 'cavalry'], ninja: ['archer', 'mage']
};

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

const ABILITIES = {
  vanguard: { name: '曙光突襲', desc: '進攻時全軍戰力 +10%' },
  arcana:   { name: '魔導共鳴', desc: '技能發動率 +15%' },
  fortress: { name: '玄影匿蹤', desc: '守城時防禦 +15%' },
  wealth:   { name: '蒼海貿易', desc: '領地收入 +20%' },
  veteran:  { name: '白狼精兵', desc: '角色經驗獲得 +50%' }
};

// ------------------------------------------
// ★ 種子資料（5 勢力，各自一種番風世界觀）
// ------------------------------------------
function SEED_FACTIONS() {
  // ID, NAME, IS_PLAYER, GOLD, COLOR, ALIVE, AP, ABILITY
  return [
    ['F0', '在野中立',       0, 0,                '#9e9e9e', 1, 0, ''],
    ['F1', '曙光聖劍騎士國', 1, RULES.START_GOLD, '#2e7dd7', 1, RULES.AP_BASE, 'vanguard'],
    ['F2', '緋紅魔導帝國',   0, RULES.START_GOLD, '#d7492e', 1, 0, 'arcana'],
    ['F3', '玄影忍之國',     0, RULES.START_GOLD, '#7a5cc0', 1, 0, 'fortress'],
    ['F4', '蒼海蒸汽商盟',   0, RULES.START_GOLD, '#1f9e8a', 1, 0, 'wealth'],
    ['F5', '銀月獸牙傭騎',   0, RULES.START_GOLD, '#e08a2e', 1, 0, 'veteran']
  ];
}

function SEED_TERRITORIES() {
  // 6欄 x 3列 網格地圖（共18格）。ID,NAME,OWNER,TROOPS,MAX,INCOME,DEV,X,Y,ADJ
  return [
    ['T1',  '曦光鎮', 'F0', 300, 1200, 45, 0,  8, 22, 'T2,T7'],
    ['T2',  '星隕谷', 'F0', 320, 1200, 45, 0, 25, 22, 'T1,T3,T8'],
    ['T3',  '影忍城', 'F3', 600, 1600, 65, 0, 42, 22, 'T2,T4,T9'],
    ['T4',  '楓丘',   'F0', 340, 1200, 48, 0, 58, 22, 'T3,T5,T10'],
    ['T5',  '龍脊關', 'F0', 300, 1100, 42, 0, 75, 22, 'T4,T6,T11'],
    ['T6',  '霜牙嶺', 'F0', 300, 1100, 42, 0, 92, 22, 'T5,T12'],
    ['T7',  '聖劍都', 'F1', 600, 1600, 65, 0,  8, 50, 'T1,T8,T13'],
    ['T8',  '翠風原', 'F0', 320, 1200, 48, 0, 25, 50, 'T2,T7,T9,T14'],
    ['T9',  '中央樞', 'F0', 450, 1800, 80, 0, 42, 50, 'T3,T8,T10,T15'],
    ['T10', '黃金渡', 'F0', 450, 1800, 80, 0, 58, 50, 'T4,T9,T11,T16'],
    ['T11', '赤霞城', 'F0', 360, 1300, 55, 0, 75, 50, 'T5,T10,T12,T17'],
    ['T12', '魔導京', 'F2', 600, 1600, 65, 0, 92, 50, 'T6,T11,T18'],
    ['T13', '海潮港', 'F0', 280, 1100, 40, 0,  8, 78, 'T7,T14'],
    ['T14', '獸牙寨', 'F5', 600, 1600, 65, 0, 25, 78, 'T8,T13,T15'],
    ['T15', '幽月森', 'F0', 300, 1100, 42, 0, 42, 78, 'T9,T14,T16'],
    ['T16', '蒸汽塢', 'F4', 600, 1600, 65, 0, 58, 78, 'T10,T15,T17'],
    ['T17', '琉璃灣', 'F0', 340, 1200, 48, 0, 75, 78, 'T11,T16,T18'],
    ['T18', '極東洲', 'F0', 320, 1200, 45, 0, 92, 78, 'T12,T17']
  ];
}

// 具名女將（每國 2 位符合番風 + 3 位在野名將）
function SEED_CHARS() {
  return [
    // 聖劍騎士國（西方奇幻聖騎士）
    ['C1', '亞瑟莉亞', 'F1', 'cavalry', 3, 0, 90, 95, 72, 'charge', 'T7', 0, 1, 70, 'IT1',
      '正直熱血的聖騎士王女，責任感極強。', '端正有禮，一激動就中二喊招式名。', '正義、甜點、被誇獎；討厭懦弱與背叛。',
      '「以曙光之名，衝鋒！」', '失落王國末裔，立誓以聖劍重整天下秩序。'],
    ['C2', '莉緹希雅', 'F1', 'mage', 3, 0, 70, 66, 96, 'firestorm', 'T7', 0, 1, 65, 'IT3',
      '傲嬌天才魔導士，嘴硬心軟。', '毒舌吐槽＋「才、才不是為了你」。', '古書、研究、獨處；討厭笨蛋與被摸頭。',
      '「哼，這種火焰剛好而已。」', '魔導名門的叛逆天才，看不慣家族保守而出走。'],
    // 緋紅魔導帝國（魔法帝國）
    ['C3', '卡蜜拉', 'F2', 'mage', 4, 0, 82, 70, 94, 'firestorm', 'T12', 0, 1, 60, '',
      '冷酷從容的魔女統帥，優雅而危險。', '低沉優雅、話中帶刺，稱對手「可憐的孩子」。', '完美、紅酒、支配；討厭失序與吵鬧。',
      '「跪下，我或許考慮讓妳活著。」', '魔導帝國之首，追求以絕對力量統一大陸。'],
    ['C4', '薇歐拉', 'F2', 'archer', 3, 0, 78, 84, 76, 'snipe', 'T12', 0, 1, 55, '',
      '沉著寡言的狙擊手，忠於卡蜜拉。', '簡短、只講重點、偶爾冷面吐槽。', '安靜、精密器械；討厭浪費與情緒化。',
      '「……瞄準，完畢。」', '孤兒出身，被卡蜜拉收留後成為最鋒利的箭。'],
    // 玄影忍之國（和風忍者）
    ['C5', '綾音', 'F3', 'ninja', 4, 0, 84, 88, 80, 'shadow', 'T3', 0, 1, 60, '',
      '沉默的忍者頭領，冷靜致命。', '簡潔、以「主上」稱對象、句尾常停頓。', '月夜、修行、糰子；討厭喧嘩與背信。',
      '「影已至。目標，抹殺。」', '玄影一族頭領，尋找足以託付忠誠的真正霸主。'],
    ['C6', '雪代', 'F3', 'infantry', 3, 0, 86, 90, 66, 'iai', 'T3', 0, 1, 58, '',
      '恪守武士道的少女劍士，一板一眼。', '文言腔，常說「在下」「承蒙」。', '劍道、清晨、正直之人；討厭卑鄙與偷懶。',
      '「在下的刀，只為道義出鞘。」', '沒落武家獨女，行走天下尋找值得效忠的主君。'],
    // 蒼海蒸汽商盟（科幻/蒸汽龐克）
    ['C7', '星奈', 'F4', 'mage', 4, 0, 78, 74, 98, 'firestorm', 'T16', 0, 1, 60, '',
      '來自未來的 AI 少女，理性精確，正在學「情感」。', '機械式敬語＋偶爾可愛的計算失誤。', '資料、觀測、甜食（新發現）；討厭邏輯矛盾。',
      '「情感模組……運算中，請稍候。」', '不明時代墜落至此的自律兵器，尋找存在的意義。'],
    ['C8', '澪', 'F4', 'archer', 3, 0, 80, 82, 78, 'volley', 'T16', 0, 1, 55, '',
      '精明幹練的商會首席護衛，對數字情報極敏銳。', '簡潔專業，偶爾用商業術語。', '情報、紅茶、準時；討厭浪費與拖延。',
      '「這筆生意，穩賺不賠。」', '蒼海商盟王牌槍手，以一桿蒸汽長槍聞名各港。'],
    // 銀月獸牙傭騎（獸耳/野性）
    ['C9', '蕾娜', 'F5', 'cavalry', 3, 0, 84, 88, 68, 'charge', 'T14', 0, 1, 60, '',
      '豪爽的傭兵團長，重義氣講交情。', '大剌剌、江湖味、笑聲很大。', '烈酒、好對手、報酬；討厭小氣與背叛金主。',
      '「錢給夠、酒管飽，命就是妳的了！」', '橫行各地的傭兵團首領，尋找出得起價的雄主。'],
    ['C10', '蓋兒', 'F5', 'infantry', 3, 0, 82, 90, 60, 'iai', 'T14', 0, 1, 55, '',
      '豪放不羈的獸牙戰士，重直覺與本能。', '粗獷豪爽，愛用「本姑娘」。', '狩獵、烤肉、強敵；討厭拘束與規矩。',
      '「嗷——想打架？奉陪到底！」', '銀月獸牙傭騎先鋒，天生戰鬥直覺無人能及。'],
    // 在野名將（F0, loc 空 → 搜索/迷宮可招募）
    ['C11', '蒂雅娜', 'F0', 'archer', 4, 0, 82, 86, 84, 'volley', '', 0, 1, 0, '',
      '高傲的精靈女王，優雅自負卻意外講理。', '高貴、慢條斯理、愛用「汝等」。', '森林、星空、美酒；討厭污染與粗魯。',
      '「汝等的壽命，還不夠學會謙卑。」', '隱世精靈國度的女王，因故離開森林尋找盟友。'],
    ['C12', '芙蘭', 'F0', 'infantry', 2, 0, 74, 82, 60, 'iai', '', 0, 1, 0, '',
      '元氣滿滿的少女劍士，天真直率。', '超有活力、大量驚嘆號、愛取綽號。', '肉、冒險、交朋友；討厭無聊與蔬菜。',
      '「衝了衝了——交給我準沒錯！」', '鄉下自學劍士，夢想成為傳說中的英雄。'],
    ['C13', '巫月', 'F0', 'mage', 3, 0, 80, 60, 90, 'heal', '', 0, 1, 0, '',
      '神秘的巫女，溫柔沉靜，像看透一切。', '柔和、留白很多、偶爾說預言。', '神社、白茶、貓；討厭殺戮與謊言。',
      '「這一戰的結局，我早已在夢中見過。」', '侍奉古老神明的巫女，為改變預見的災禍而入世。']
  ];
}

function SEED_ITEMS() {
  return [
    ['IT1', '破軍聖劍', 'weapon',    14, 2, 0, 'C1', '傳說聖劍，武力大增'],
    ['IT2', '白銀戰鎧', 'armor',      0, 12, 0, '', '堅固戰鎧，統率提升'],
    ['IT3', '賢者之書', 'accessory',  0, 0, 14, 'C2', '智慧結晶，智謀大增'],
    ['IT4', '龍鱗長槍', 'weapon',    16, 3, 0, '', '屠龍之槍，威力驚人'],
    ['IT5', '疾風之靴', 'accessory',  2, 9, 0, '', '風之加護，行軍如飛'],
    ['IT6', '秘銀護符', 'accessory',  0, 0, 16, '', '蘊含秘法，智謀提升'],
    ['IT7', '暗影短刃', 'weapon',    13, 0, 4, 'LOCKED', '幽暗地穴深處的凶器'],
    ['IT8', '龍血重鎧', 'armor',      4, 16, 0, 'LOCKED', '以龍血淬煉的無雙重鎧'],
    ['IT9', '龍神之杖', 'weapon',     6, 0, 18, 'LOCKED', '墜星熔鑄的神杖，智謀大增'],
    ['IT10','森靈之弓', 'weapon',    18, 2, 4, 'LOCKED', '世界樹枝所製的聖弓，箭無虛發']
  ];
}

function SEED_DUNGEONS() {
  // ID,NAME,TER,LEVEL,FLOORS,PROGRESS,CLEARED,MONSTER,REWARD_GOLD,REWARD_ITEM,RECRUIT
  return [
    ['D1', '幽暗地穴', 'T5',  1, 3, 0, 0, 200, 500,  'IT7',  1],
    ['D2', '龍之巢穴', 'T15', 2, 4, 0, 0, 300, 1000, 'IT8',  1],
    ['D3', '天墜之淵', 'T2',  3, 5, 0, 0, 380, 1800, 'IT9',  1],
    ['D4', '黃金聖殿', 'T10', 4, 5, 0, 0, 460, 2500, 'IT10', 1]
  ];
}

// 迷宮最終層頭目 + 通關可策反的傳說女將
const DUNGEON_BOSS = {
  D1: { name: '冥獄魔將', legend: 'L1' },
  D2: { name: '古龍巴哈姆', legend: 'L2' },
  D3: { name: '墜星之王', legend: 'L3' },
  D4: { name: '聖殿守護獸', legend: 'L4' }
};

// 傳說女將（owner=LOCKED 藏起，通關頭目才策反；id 以 L 開頭 → 頭像華麗特效）
function SEED_LEGENDS() {
  return [
    ['L1', '沙夜', 'LOCKED', 'ninja', 6, 0, 104, 110, 96, 'shadow', '', 0, 1, 0, '',
      '封印於幽獄的暗夜刀神，冷冽孤高，力量深不可測。', '古老而簡短，帶著威壓。', '月蝕、寂靜；厭惡背信。',
      '「解開封印者……可有承受吾力之覺悟？」', '上古被封印的刀神，等待夠格的主人。'],
    ['L2', '緋雫', 'LOCKED', 'cavalry', 6, 0, 110, 114, 90, 'charge', '', 0, 1, 0, '',
      '龍族末裔的緋色龍姬，驕傲熾烈，只認強者為伴。', '高傲霸氣，自稱「本龍」。', '火焰、寶物、強敵；討厭懦弱。',
      '「哼，能讓本龍認可，妳算第一個。」', '沉睡龍巢的龍之公主。'],
    ['L3', '露娜', 'LOCKED', 'mage', 6, 0, 100, 96, 118, 'firestorm', '', 0, 1, 0, '',
      '自星海降臨的占星巫女，飄渺神秘，洞悉命運。', '空靈飄忽，像在對星星說話。', '星空、預言、靜謐；厭惡殺戮。',
      '「群星為妳指引……去吧，命定之人。」', '墜星深淵中沉眠的星之巫女。'],
    ['L4', '森亞露露卡', 'LOCKED', 'archer', 6, 0, 100, 108, 108, 'snipe', '', 0, 1, 0, '',
      '森海深處的聖弓姬，溫柔神秘，能與萬物精靈相通，箭無虛發。', '柔和空靈，句尾常帶「呀～」，偶有童趣。', '森林、精靈、野莓；厭惡濫伐與殺戮。',
      '「森林的祝福……都在這一箭之中喔～」', '守護世界樹的上古弓姬，於黃金聖殿沉眠。']
  ];
}

function SEED_DIPLO() { return []; } // 開局全員互為戰爭狀態

// ------------------------------------------
// ★ 隨機路人女將生成（程序化）。開局隨機產生，讓每局陣容都不同。
//   注意：Math.random 在 GAS 執行 initGame 時可用。
// ------------------------------------------
var RAND_SYL = ['艾','莉','蕾','米','娜','露','雅','菲','琳','薇','奈','櫻','雪','星','月','鈴','千','美','香','詩','夏','緋','蒼','翠','琉','希','音','羽','紗','葵'];
var RAND_UNITS = ['infantry','cavalry','archer','mage','ninja'];
var RAND_PERSONA = ['天真爛漫，笑臉迎人','沉默寡言，深不可測','高傲自負，卻很講義氣','溫柔內斂，關鍵時刻很可靠','好勝心強，遇強則強','散漫隨性，意外可靠','認真嚴謹，一絲不苟','愛湊熱鬧，人緣極好'];
var RAND_SPEECH = ['活潑愛用驚嘆號','冷淡簡短','溫柔有禮','大剌剌的江湖口吻','偶爾冒出古語','愛撒嬌耍賴'];
var RAND_LIKES = ['甜食','鍛鍊','讀書','睡覺','美酒','旅行','小動物','亮晶晶的東西'];
var RAND_CATCH = ['「交給我吧！」','「……真無聊。」','「請多指教。」','「有趣，來吧！」','「唔…好睏。」','「錢的事好談。」'];
var RAND_BIO = ['出身不明，浪跡各地的女劍客。','小有名氣的傭兵，尋找安身之所。','沒落貴族之女，志在重振家名。','雲遊四方的異鄉旅人。','村中長大的自學武者。'];

function randInt_(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick_(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randName_() { var n = pick_(RAND_SYL) + pick_(RAND_SYL); if (Math.random() < 0.4) n += pick_(RAND_SYL); return n; }
function skillFor_(unit) {
  return ({ infantry: 'iai', cavalry: 'charge', archer: pick_(['volley', 'snipe']),
            mage: pick_(['firestorm', 'heal']), ninja: 'shadow' })[unit];
}
function genChar_(id, owner, loc) {
  var unit = pick_(RAND_UNITS);
  var lead = randInt_(52, 84), war = randInt_(52, 86), intl = randInt_(50, 82), lvl = randInt_(1, 3);
  return [id, randName_(), owner, unit, lvl, 0, lead, war, intl, skillFor_(unit),
    loc, 0, 1, 0, '',
    pick_(RAND_PERSONA), pick_(RAND_SPEECH), pick_(RAND_LIKES), pick_(RAND_CATCH), pick_(RAND_BIO)];
}
function genRandomChars_() {
  var rows = [];
  var garrison = ['T2', 'T5', 'T9', 'T10', 'T15', 'T18']; // 部分中立城派駐路人守將（攻下可俘虜）
  garrison.forEach(function (t, i) { rows.push(genChar_('R' + (i + 1), 'F0', t)); });
  for (var i = 0; i < 6; i++) rows.push(genChar_('R' + (garrison.length + 1 + i), 'F0', '')); // 在野路人（搜索可得）
  return rows;
}

// ------------------------------------------
// ★ 初始化 / 重開新局（第一次請在編輯器手動執行 initGame）
// ------------------------------------------
function initGame() {
  const ss = getOrCreateSpreadsheet_();

  writeSheet_(ss, SHEETS.STATE, ['TURN', 'PHASE', 'WINNER', 'LOG', 'BONDS'],
    [[1, 'PLAYER', '', '亂世將起，五雄並立。招賢納士、開疆闢土，' + RULES.TURN_LIMIT + ' 回合內統一天下！', '']]);

  writeSheet_(ss, SHEETS.FACTION,
    ['ID', 'NAME', 'IS_PLAYER', 'GOLD', 'COLOR', 'ALIVE', 'AP', 'ABILITY'], SEED_FACTIONS());

  writeSheet_(ss, SHEETS.TERRITORY,
    ['ID', 'NAME', 'OWNER', 'TROOPS', 'MAX_TROOPS', 'INCOME', 'DEV', 'X', 'Y', 'ADJ', 'MARKET', 'BARRACKS', 'WALL', 'TOWER'],
    SEED_TERRITORIES().map(function (r) { return r.concat([0, 0, 0, 0]); }));

  writeSheet_(ss, SHEETS.CHAR,
    ['ID', 'NAME', 'OWNER', 'UNIT', 'LEVEL', 'EXP', 'LEAD', 'WAR', 'INT', 'SKILL',
     'LOC', 'ACTED', 'ALIVE', 'LOYALTY', 'EQUIP', 'PERSONA', 'SPEECH', 'LIKES', 'CATCH', 'BIO', 'CHARGE'],
    SEED_CHARS().concat(genRandomChars_()).concat(SEED_LEGENDS()).map(function (r) { return r.concat([randInt_(0, 66)]); }));

  writeSheet_(ss, SHEETS.ITEM,
    ['ID', 'NAME', 'TYPE', 'WAR', 'LEAD', 'INT', 'OWNER', 'DESC'], SEED_ITEMS());

  writeSheet_(ss, SHEETS.DUNGEON,
    ['ID', 'NAME', 'TER', 'LEVEL', 'FLOORS', 'PROGRESS', 'CLEARED', 'MONSTER', 'REWARD_GOLD', 'REWARD_ITEM', 'RECRUIT'],
    SEED_DUNGEONS());

  writeSheet_(ss, SHEETS.DIPLO, ['FA', 'FB', 'STATUS', 'EXPIRE'], SEED_DIPLO());

  return '✅ 遊戲已初始化，試算表 ID：' + ss.getId();
}

function getOrCreateSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP_SHEET_ID);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('諸國爭霸 - 遊戲存檔');
  props.setProperty(PROP_SHEET_ID, ss.getId());
  return ss;
}

function writeSheet_(ss, name, header, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  const data = [header].concat(rows.length ? rows : []);
  sh.getRange(1, 1, data.length, header.length).setValues(data);
}

function randFactor_(min, max) { return min + Math.random() * (max - min); }

// AI 人設接口：把角色卡組成人設文字。現在沒用到（零 AI），未來接 LLM 就是 system prompt。
function buildCharacterCard(ch) {
  return ['你要扮演：' + ch.name + '（' + UNIT_LABEL[ch.unit] + '）',
    '性格：' + ch.persona, '說話風格：' + ch.speech, '喜好：' + ch.likes,
    '口頭禪：' + ch.catch, '背景：' + ch.bio,
    '請全程以此人設、用繁體中文與玩家互動，不要跳出角色。'].join('\n');
}
