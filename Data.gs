// ============================================================
// 戰國海與劍之歌 · D&D 版 — 遊戲資料（規則常數 / 職業 / 裝備 / 怪物 / 骰子）
// 全部戰鬥與骰子在 GAS 後端運算，前端只負責畫面。
// ============================================================

// ---- 全域設定 ----
var CFG = {
  BATTLE_SLOTS: 4,     // 戰鬥位（含主角）
  SUPPORT_SLOTS: 2,    // 後勤位
  ROSTER_MAX: 10,      // 角色倉庫上限（含主角）
  START_GOLD: 180,
  DISMISS_REFUND: 20,  // 遣散給對方的遣散費（從玩家金幣扣）
  MAX_FLOOR: 30
};

// ---- D&D 六大屬性 ----
var ABILITIES = ['str','dex','con','int','wis','cha'];
var ABILITY_NAME = { str:'力量', dex:'敏捷', con:'體質', int:'智力', wis:'睿知', cha:'魅力' };
var ABILITY_ICON = { str:'💪', dex:'🎯', con:'❤️', int:'🧠', wis:'👁️', cha:'💬' };

function mod(score){ return Math.floor((score - 10) / 2); }        // 屬性修正
function profByLevel(lv){ return 2 + Math.floor((lv - 1) / 4); }  // 熟練加值 2→+1/4級

// ---- 戰鬥職業（填戰鬥位，會下場打）----
// hd = hit die(每級生命骰)；atk = 主攻屬性；dmg = 徒手/基礎傷害骰；skill = 招牌技
var COMBAT_CLASSES = {
  fighter:{ nm:'足輕', ico:'⚔️', hd:10, atk:'str', role:'前排', dmg:[1,8],
    grow:{str:2,con:1}, skill:{ nm:'渾身斬', kind:'double', desc:'一回合追加一次強力揮砍' },
    blurb:'血厚攻高的前線支柱，越級越猛。' },
  paladin:{ nm:'武士', ico:'🛡️', hd:10, atk:'str', role:'坦補', dmg:[1,8],
    grow:{str:1,con:1,cha:1}, skill:{ nm:'忠義斬', kind:'smite', desc:'對敵人造成額外聖傷，並小幅治療自己' },
    blurb:'進退有據、忠義兼備的重甲武士。' },
  rogue:{ nm:'忍者', ico:'🗡️', hd:8, atk:'dex', role:'爆發', dmg:[1,6],
    grow:{dex:2,cha:1}, skill:{ nm:'暗殺', kind:'sneak', desc:'必定暴擊、追加骰傷' },
    blurb:'高暴擊高閃避，收割殘血的行家。' },
  ranger:{ nm:'弓足輕', ico:'🏹', hd:10, atk:'dex', role:'遠程', dmg:[1,8],
    grow:{dex:2,wis:1}, skill:{ nm:'強弓連射', kind:'multi', desc:'對單體連續射三箭' },
    blurb:'穩定輸出的遠程射手。' },
  wizard:{ nm:'陰陽師', ico:'🔮', hd:6, atk:'int', role:'群攻', dmg:[1,6],
    grow:{int:2,con:1}, skill:{ nm:'式神火', kind:'aoe', desc:'烈焰吞噬全體敵人' },
    blurb:'脆皮但一式清場。' },
  cleric:{ nm:'巫女', ico:'✨', hd:8, atk:'wis', role:'戰醫', dmg:[1,6],
    grow:{wis:2,con:1}, skill:{ nm:'祓魔祈禱', kind:'heal', desc:'治療全隊並復活一名陣亡者' },
    blurb:'能打能奶，戰線的定海神針。' }
};

// ---- 後勤/輔助職業（填後勤位，不下場、給整場增益）----
var SUPPORT_CLASSES = {
  bard:{ nm:'琵琶法師', ico:'🎵', buff:'atk', val:2, grow:{cha:2,dex:1},
    desc:'激勵全隊：戰鬥位攻擊檢定 +2' },
  merchant:{ nm:'豪商', ico:'💰', buff:'gold', val:0.4, grow:{cha:2,int:1},
    desc:'尋寶：金幣與掉落率提升 40%' },
  scholar:{ nm:'軍師', ico:'📖', buff:'xp', val:0.35, grow:{int:2,wis:1},
    desc:'博學：經驗值 +35%、自動鑑定戰利品' },
  medic:{ nm:'藥師', ico:'⛑️', buff:'heal', val:0.12, grow:{wis:2,int:1},
    desc:'照護：每層結束自動治療全隊 12% 生命' },
  diviner:{ nm:'卜部', ico:'🍀', buff:'crit', val:0.1, grow:{wis:1,cha:2},
    desc:'預知：全隊暴擊率 +10%、迴避陷阱' }
};

function classInfo(job){ return COMBAT_CLASSES[job] || SUPPORT_CLASSES[job] || null; }
function isSupport(job){ return !!SUPPORT_CLASSES[job]; }

// ---- 種族庫（創角時一次性屬性加值；與立繪外觀無關）----
var RACES = {
  human:   { nm:'人間', ico:'🧑', grow:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, perk:'萬能：全屬性 +1' },
  elf:     { nm:'妖狐', ico:'🦊', grow:{dex:2,int:1}, perk:'敏銳：敏捷+2 智力+1' },
  darkelf: { nm:'夜叉', ico:'😈', grow:{dex:2,cha:1}, perk:'魅影：敏捷+2 魅力+1' },
  beast:   { nm:'犬神', ico:'🐺', grow:{str:2,con:1}, perk:'野性：力量+2 體質+1' },
  dragon:  { nm:'龍神', ico:'🐉', grow:{str:2,cha:1}, perk:'龍血：力量+2 魅力+1' },
  demon:   { nm:'鬼', ico:'👹', grow:{cha:2,int:1}, perk:'魔性：魅力+2 智力+1' },
  angel:   { nm:'天狗', ico:'👺', grow:{wis:2,cha:1}, perk:'天佑：睿知+2 魅力+1' },
  vampire: { nm:'鵺', ico:'🧛', grow:{cha:2,dex:1}, perk:'夜裔：魅力+2 敏捷+1' }
};
function raceInfo(r){ return RACES[r] || null; }

// ---- 技能專長（D&D 生活/雜項技巧）：由職業＋種族自動決定，探索時做檢定 ----
var SKILLS = {
  perception:{ nm:'察覺', ab:'wis' },
  stealth:   { nm:'隱匿', ab:'dex' },
  athletics: { nm:'運動', ab:'str' },
  medicine:  { nm:'醫療', ab:'int' },
  survival:  { nm:'求生', ab:'wis' },
  sleight:   { nm:'巧手', ab:'dex' },
  persuasion:{ nm:'交涉', ab:'cha' }
};
var CLASS_SKILLS = {
  fighter:['athletics','survival'], paladin:['athletics','persuasion'],
  rogue:['stealth','sleight'],      ranger:['survival','perception'],
  wizard:['perception','medicine'], cleric:['medicine','persuasion'],
  bard:['persuasion','sleight'],    merchant:['persuasion','sleight'],
  scholar:['perception','medicine'],medic:['medicine','survival'], diviner:['perception','survival']
};
var RACE_SKILLS = {
  human:['persuasion'], elf:['perception'], darkelf:['stealth'], beast:['survival'],
  dragon:['athletics'], demon:['persuasion'], angel:['medicine'], vampire:['stealth']
};
// ---- 稀有度（招募資質）----
var RACE_KEYS = ['human','elf','darkelf','beast','dragon','demon','angel','vampire'];
var RARITY = [
  { key:'common', nm:'常見', star:'⭐',          w:50, costMul:1.0,  allBonus:0, bestOf2:false, floor:0 },
  { key:'fine',   nm:'精良', star:'⭐⭐',        w:27, costMul:1.8,  allBonus:0, bestOf2:false, floor:0, twoBonus:true },
  { key:'rare',   nm:'稀有', star:'⭐⭐⭐',      w:15, costMul:3.4,  allBonus:1, bestOf2:false, floor:0 },
  { key:'epic',   nm:'史詩', star:'⭐⭐⭐⭐',    w:7,  costMul:6.0,  allBonus:1, bestOf2:true,  floor:0 },
  { key:'legend', nm:'傳說', star:'⭐⭐⭐⭐⭐',  w:1,  costMul:11.0, allBonus:2, bestOf2:true,  floor:12 }
];
var RARITY_BY = {}; RARITY.forEach(function(r){ RARITY_BY[r.key]=r; });
function rarityInfo(k){ return RARITY_BY[k] || RARITY_BY.common; }

function charSkills(c){
  var s = {}; (CLASS_SKILLS[c.job]||[]).forEach(function(k){ s[k]=1; }); (RACE_SKILLS[c.race]||[]).forEach(function(k){ s[k]=1; });
  return Object.keys(s);
}

// ---- 怪癖／稱號（探索事件留下的好/壞特質，改能力值）----
var TRAITS = {
  slayer:  { nm:'屠龍者', ico:'🐲', good:true,  grow:{str:1},       desc:'擊破頭目的證明・力量+1' },
  unbreak: { nm:'不屈',   ico:'🛡️', good:true,  grow:{con:1},       desc:'九死一生更強韌・體質+1' },
  sharp:   { nm:'神準',   ico:'🎯', good:true,  grow:{dex:1},       desc:'一擊致命的直覺・敏捷+1' },
  veteran: { nm:'老兵',   ico:'🎖️', good:true,  grow:{str:1,con:1}, desc:'身經百戰・力量體質+1' },
  lucky:   { nm:'幸運兒', ico:'🍀', good:true,  grow:{cha:1},       desc:'運氣站在他這邊・魅力+1' },
  sage:    { nm:'博學',   ico:'📖', good:true,  grow:{int:1},       desc:'見多識廣・智力+1' },
  wound:   { nm:'舊傷',   ico:'🩹', good:false, grow:{con:-1},      desc:'沒好全的傷・體質-1' },
  fearful: { nm:'懼暗',   ico:'😨', good:false, grow:{wis:-1},      desc:'對深淵的恐懼・睿知-1' },
  shaky:   { nm:'手抖',   ico:'🥶', good:false, grow:{dex:-1},      desc:'握不穩武器・敏捷-1' }
};
var TRAIT_GOOD = ['slayer','unbreak','sharp','veteran','lucky','sage'];
var TRAIT_BAD  = ['wound','fearful','shaky'];
function traitInfo(k){ return TRAITS[k] || null; }

// ---- 羈絆好感度（火焰紋章式・同隊出戰累積）----
function bondLevel(pts){ pts=pts||0; if (pts>=50) return 4; if (pts>=30) return 3; if (pts>=15) return 2; if (pts>=5) return 1; return 0; }
var BOND_NM = ['—','C','B','A','S'];
function bondKey(a, b){ return [a,b].sort().join('|'); }
function hasSkill(c, skill){ return charSkills(c).indexOf(skill) >= 0; }

// ---- 裝備 ----
// 武器：dmg 傷害骰 [n,d] 即 nDd；bonus 命中/傷害加值
var WEAPONS = [
  { id:'w_dagger', nm:'匕首',   ico:'🔪', dmg:[1,4], bonus:0, price:20,  tier:1 },
  { id:'w_short',  nm:'短劍',   ico:'🗡️', dmg:[1,6], bonus:0, price:45,  tier:1 },
  { id:'w_long',   nm:'長劍',   ico:'⚔️', dmg:[1,8], bonus:0, price:90,  tier:2 },
  { id:'w_bow',    nm:'長弓',   ico:'🏹', dmg:[1,8], bonus:1, price:110, tier:2 },
  { id:'w_great',  nm:'巨劍',   ico:'🗡️', dmg:[2,6], bonus:0, price:200, tier:3 },
  { id:'w_staff',  nm:'秘法杖', ico:'🪄', dmg:[1,8], bonus:2, price:220, tier:3 },
  { id:'w_flame',  nm:'烈焰之刃', ico:'🔥', dmg:[2,6], bonus:2, price:420, tier:4 }
];
// 防具：ac 護甲加值
var ARMORS = [
  { id:'a_cloth',  nm:'布衣',   ico:'👕', ac:1, price:20,  tier:1 },
  { id:'a_leather',nm:'皮甲',   ico:'🧥', ac:2, price:50,  tier:1 },
  { id:'a_chain',  nm:'鎖子甲', ico:'🥋', ac:4, price:120, tier:2 },
  { id:'a_plate',  nm:'板甲',   ico:'🛡️', ac:6, price:260, tier:3 },
  { id:'a_dragon', nm:'龍鱗鎧', ico:'🐲', ac:8, price:480, tier:4 }
];
// 飾品：mod 對某屬性 +N，或特效
var TRINKETS = [
  { id:'t_str', nm:'力量指環', ico:'💍', ab:'str', val:2, price:100, tier:2 },
  { id:'t_dex', nm:'敏捷護符', ico:'📿', ab:'dex', val:2, price:100, tier:2 },
  { id:'t_con', nm:'體質護身', ico:'🧿', ab:'con', val:2, price:100, tier:2 },
  { id:'t_int', nm:'智慧之冠', ico:'👑', ab:'int', val:2, price:120, tier:3 },
  { id:'t_luck',nm:'幸運四葉', ico:'🍀', ab:'cha', val:2, price:120, tier:3 }
];
// 獨門神器（頭目樓層首殺限定，飾品欄・多屬性）
var UNIQUE_GEAR = {
  u_hazhi:  { id:'u_hazhi',  nm:'霸主之證', ico:'💠', abs:{str:1,dex:1,con:1},               floor:10 },
  u_heart:  { id:'u_heart',  nm:'深海之心', ico:'🌀', abs:{int:1,wis:1,cha:1},               floor:15 },
  u_soul:   { id:'u_soul',   nm:'魔王殘魂', ico:'☠️', abs:{str:2,con:1},                     floor:20 },
  u_legend: { id:'u_legend', nm:'傳說之證', ico:'🌟', abs:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, floor:25 }
};
var UNIQUE_BY_FLOOR = {}; for (var _uk in UNIQUE_GEAR){ UNIQUE_BY_FLOOR[UNIQUE_GEAR[_uk].floor] = UNIQUE_GEAR[_uk]; }

function gearById(id){
  if (id && UNIQUE_GEAR[id]) return UNIQUE_GEAR[id];
  var all = WEAPONS.concat(ARMORS).concat(TRINKETS);
  for (var i=0;i<all.length;i++) if (all[i].id===id) return all[i];
  return null;
}
function gearSlot(id){
  if (id && (id.indexOf('t_')===0 || id.indexOf('u_')===0)) return 'trinket';
  if (id && id.indexOf('w_')===0) return 'weapon';
  if (id && id.indexOf('a_')===0) return 'armor';
  return null;
}

// ---- 怪物（依樓層縮放）----
var MONSTERS = [
  { nm:'河童', ico:'🐸', hd:1, ac:12, dmg:[1,4], atk:2, xp:12, gold:[4,10] },
  { nm:'化け鼠', ico:'🐀', hd:1, ac:11, dmg:[1,4], atk:1, xp:8,  gold:[3,7] },
  { nm:'骸骨武者', ico:'💀', hd:2, ac:13, dmg:[1,6], atk:3, xp:18, gold:[6,14] },
  { nm:'山犬',   ico:'🐺', hd:2, ac:13, dmg:[1,6], atk:4, xp:20, gold:[5,12] },
  { nm:'土蜘蛛', ico:'🕷️', hd:2, ac:14, dmg:[1,6], atk:4, xp:22, gold:[6,15] },
  { nm:'赤鬼',   ico:'👹', hd:3, ac:14, dmg:[1,8], atk:5, xp:35, gold:[12,26] },
  { nm:'岩武者', ico:'🗿', hd:4, ac:16, dmg:[2,6], atk:6, xp:50, gold:[16,34] },
  { nm:'幽霊',   ico:'👻', hd:3, ac:15, dmg:[1,8], atk:5, xp:40, gold:[10,28] }
];
var BOSSES = [
  { nm:'鬼王', ico:'👑', hd:6,  ac:15, dmg:[2,6], atk:6,  xp:120, gold:[40,80] },
  { nm:'鵺',   ico:'😈', hd:9,  ac:16, dmg:[2,8], atk:8,  xp:220, gold:[70,140] },
  { nm:'八岐大蛇', ico:'🐉', hd:12, ac:18, dmg:[3,6], atk:10, xp:380, gold:[120,240] },
  { nm:'酒呑童子', ico:'☠️', hd:15, ac:19, dmg:[3,8], atk:12, xp:600, gold:[200,400] }
];

// ---- 主線階級（靠探索最深層自動晉升）----
var RANKS = [
  { nm:'足輕', floor:0 }, { nm:'郎党', floor:5 }, { nm:'若武者', floor:10 },
  { nm:'侍大将', floor:15 }, { nm:'家老', floor:20 }, { nm:'軍神', floor:25 }
];
function rankOf(deepest){ var ix=0; for (var i=0;i<RANKS.length;i++){ if ((deepest||0) >= RANKS[i].floor) ix=i; } return ix; }

// ---- 公會委託（支線任務）----
function genQuest(deepest){
  var dd = Math.max(1, deepest||0);
  var r = Math.random();
  if (r < 0.4){ var tgt = (deepest||0) + 1; return { id:'q'+uid(), type:'depth', target:tgt, prog:(deepest||0),
    name:'探索到第 '+tgt+' 層', desc:'抵達地下城第 '+tgt+' 層', reward: 40 + tgt*25 }; }
  if (r < 0.75){ var n = 6 + dd*2; return { id:'q'+uid(), type:'kill', target:n, prog:0,
    name:'清剿 '+n+' 隻魔物', desc:'累積擊敗 '+n+' 隻敵人', reward: 40 + n*7 }; }
  var gold = 60 + dd*35; return { id:'q'+uid(), type:'gold', target:gold, prog:0,
    name:'賺取 '+gold+' 🪙', desc:'累積探索賺到 '+gold+' 金幣', reward: Math.round(gold*0.7) };
}

// ---- 大航海式貿易：商品、市集、浮動價格 ----
var GOODS = [
  { id:'salt',  nm:'鹽',     ico:'🧂', base:20 },
  { id:'herb',  nm:'藥草',   ico:'🌿', base:35 },
  { id:'spice', nm:'香料',   ico:'🌶️', base:48 },
  { id:'iron',  nm:'鐵礦',   ico:'⚙️', base:55 },
  { id:'coffee',nm:'茶葉',   ico:'🍵', base:62 },
  { id:'wine',  nm:'清酒',   ico:'🍶', base:70 },
  { id:'fur',   nm:'毛皮',   ico:'🦊', base:88 },
  { id:'silk',  nm:'生絲',   ico:'🧵', base:95 },
  { id:'china', nm:'陶磁器', ico:'🏺', base:125 },
  { id:'powder',nm:'火薬',   ico:'🧨', base:135 },
  { id:'pearl', nm:'真珠',   ico:'🦪', base:160 },
  { id:'ivory', nm:'蒔絵',   ico:'🖌️', base:185 },
  { id:'gem',   nm:'寶石',   ico:'💎', base:210 },
  { id:'amber', nm:'鯨蠟',   ico:'🐋', base:300 }
];
var GOOD_BY = {}; GOODS.forEach(function(g){ GOOD_BY[g.id]=g; });
// 每個港口：x,y=世界地圖座標(%，依日本地形北→南排列)；cheap=產地(便宜) dear=需求地(貴)；sig=招牌名產
var MARKETS = [
  { id:'merc',  nm:'尾張・清洲', ico:'🏯', x:48, y:42, cheap:['iron','herb'],   dear:['silk','pearl'],  sig:'iron',   blurb:'織田家的根據地，鄰近關鍛冶之鄉，精鐵聞名' },
  { id:'whale', nm:'松前',       ico:'🐋', x:66, y:8,  cheap:['amber','salt'],  dear:['wine','china'],  sig:'amber',  blurb:'蝦夷地極北的捕鯨藩地——鯨蠟唯一的產地' },
  { id:'port',  nm:'堺',         ico:'⛵', x:42, y:48, cheap:['silk','china'],  dear:['spice','powder'],sig:'silk',   blurb:'會合眾自治的天下貿易港，生絲集散地' },
  { id:'gold',  nm:'佐渡',       ico:'⛏️', x:50, y:24, cheap:['gem','china'],   dear:['salt','coffee'], sig:'gem',    blurb:'金山遍地的離島，寶石與礦產璀璨' },
  { id:'bean',  nm:'宇治',       ico:'🍵', x:38, y:46, cheap:['coffee','spice'],dear:['iron','silk'],   sig:'coffee', blurb:'山城茶園之鄉，茶香飄十里' },
  { id:'oasis', nm:'出雲',       ico:'⛩️', x:24, y:48, cheap:['spice','salt'],  dear:['wine','fur'],    sig:'spice',  blurb:'神話之國的古老市集，異國香料的集散地' },
  { id:'volcano',nm:'薩摩',      ico:'🌋', x:14, y:64, cheap:['powder','iron'], dear:['herb','silk'],   sig:'powder', blurb:'火山之國，隼人剽悍，火藥與精鐵的源頭' },
  { id:'temple',nm:'高野山',     ico:'🛕', x:40, y:54, cheap:['ivory','gem'],   dear:['salt','herb'],   sig:'ivory',  blurb:'僧兵駐守的靈山古剎，蒔絵漆器與古物' },
  { id:'snow',  nm:'越後',       ico:'🏔️', x:44, y:30, cheap:['fur','gem'],     dear:['spice','pearl'], sig:'fur',    blurb:'上杉軍鎮守的雪國邊境，頂級毛皮' },
  { id:'coral', nm:'琉球',       ico:'🏝️', x:10, y:82, cheap:['pearl','wine'],  dear:['iron','fur'],    sig:'pearl',  blurb:'南方島國，採珠人與朱印船的樂園' }
];
var MARKET_BY = {}; MARKETS.forEach(function(m){ MARKET_BY[m.id]=m; });
var CARGO_MAX = 20;
// ---- 城市攻佔：各港駐軍（越遠越強）＋領地稅收 ----
var GARRISONS = {
  merc:   { nm:'清洲城兵',   hull:90,  cannon:9,  gold:[80,160]  },
  whale:  { nm:'松前藩兵',   hull:120, cannon:11, gold:[120,240] },
  port:   { nm:'堺會合衆',   hull:130, cannon:12, gold:[140,260] },
  gold:   { nm:'佐渡金山衆', hull:200, cannon:18, gold:[260,480] },
  bean:   { nm:'宇治茶座衆', hull:150, cannon:14, gold:[190,350] },
  oasis:  { nm:'出雲武者団', hull:160, cannon:15, gold:[200,360] },
  volcano:{ nm:'薩摩隼人隊', hull:210, cannon:19, gold:[270,500] },
  temple: { nm:'高野山僧兵', hull:230, cannon:20, gold:[300,560] },
  snow:   { nm:'越後上杉軍', hull:150, cannon:14, gold:[180,340] },
  coral:  { nm:'琉球水軍',   hull:180, cannon:16, gold:[230,420] }
};
var HOLD_TAX_BASE = 26;             // 每領地每「稅收週期」基礎稅金（×等級）
var HOLD_CYCLE_MS = 5*60*1000;      // 稅收約 5 分鐘累積一次
var HOLD_LV_MAX = 5;                // 領地治理等級上限
function holdUpgradeCost_(lv){ return Math.round(300 * Math.pow(1.7, lv-1)); }

// ============================================================
//  🏯 內政經營：領地兵營／太守／兵糧（信長之野望風的經營層）
//  領地治理稅收之外，另外開兵營產「兵糧」、花兵糧+金幣「徵兵」，
//  養出的「駐軍」是打大型戰事（宣戰／出征）用的抽象兵力資源——
//  跟玩家收藏的夥伴角色完全分開，打輸只損耗兵力，絕不動到角色本體。
// ============================================================
var HOLD_BARRACKS_MAX   = 3;                       // 兵營等級上限
var HOLD_BARRACKS_COST  = [0, 260, 700, 1600];      // 蓋到第 i 級的造價（index=目標等級）
var HOLD_TROOP_CAP      = [0, 60, 140, 260];        // 兵營等級對應的駐軍上限
var HOLD_SUPPLY_BASE    = 8;                        // 每「稅收週期」兵糧產出基數（×兵營等級）
var HOLD_TROOP_GOLD     = 6;                        // 徵兵：每名士兵金幣成本
var HOLD_TROOP_SUPPLY   = 3;                        // 徵兵：每名士兵兵糧成本
var HOLD_RECRUIT_BATCH  = 10;                       // 每次徵兵的批量
function holdBarracksCost_(lv){ return HOLD_BARRACKS_COST[Math.min(HOLD_BARRACKS_MAX, lv+1)] || 0; }
function holdTroopCap_(lv){ return HOLD_TROOP_CAP[Math.min(HOLD_BARRACKS_MAX, lv)] || 0; }
// 太守加成：指派夥伴經營該地，依其等級給稅收／兵糧產出小額加成（純被動頭銜，不佔戰鬥/後勤位）
function governorBonus_(pl, hold){
  if (!hold || !hold.governor) return 0;
  var c = (pl.roster||[]).filter(function(x){ return x && x.id===hold.governor; })[0];
  return c ? Math.min(0.30, (c.level||1)*0.02) : 0;
}
// ---- 海事里程碑（航海術 / 商業 等級解鎖）----
var SEA_UNLOCKS = {
  nav: [
    { lv:2,  t:'夜航術：出航更安全、常撈到好東西' },
    { lv:4,  t:'艦隊擴編 +1（可多養一艘船）' },
    { lv:6,  t:'接舷好手：接舷俘虜更容易成功' },
    { lv:8,  t:'艦隊擴編 +1（艦隊上限 7 艘）' },
    { lv:10, t:'遠洋霸權：航程再大幅縮短、砲擊更準' }
  ],
  com: [
    { lv:2,  t:'議價高手：進出貨更好價' },
    { lv:4,  t:'商會人脈：投資分紅提高' },
    { lv:6,  t:'囤貨倉庫：貨艙上限 +6' },
    { lv:8,  t:'商隊網絡：自動商隊效率提升' },
    { lv:10, t:'商業帝國：領地稅收與分紅大幅提升' }
  ]
};

// ---- 船艦 / 海戰 ----
function startShip(){ return { name:'初心丸', hullMax:60, hull:60, cannon:6, cargoBonus:0, crew:8, speed:6, gunTier:1, tier:1 }; }
// 旗艦船級（每級決定各項上限；升級到上限需「船體擴建」提升船級）
var FLAG_TIERS = [
  { nm:'小早船',   ico:'⛵', maxHull:120, maxCannon:12, maxCargo:20, maxCrew:16, maxGun:2, up:0 },
  { nm:'関船',     ico:'🚤', maxHull:190, maxCannon:18, maxCargo:34, maxCrew:24, maxGun:3, up:1400 },
  { nm:'安宅船',   ico:'⚓', maxHull:290, maxCannon:28, maxCargo:46, maxCrew:38, maxGun:4, up:3600 },
  { nm:'御座船',   ico:'🚢', maxHull:430, maxCannon:42, maxCargo:66, maxCrew:54, maxGun:5, up:8500 }
];
function shipTierIx(s){ return Math.max(0, Math.min(FLAG_TIERS.length-1, ((s&&s.tier)||1)-1)); }
function shipCaps(s){ return FLAG_TIERS[shipTierIx(s)]; }
function flagGunMul(s){ return 1 + 0.15*(((s&&s.gunTier)||1)-1); }   // 砲管等級：每級 +15% 砲擊
function classUpCost(s){ var t=(s&&s.tier)||1; return (t < FLAG_TIERS.length) ? FLAG_TIERS[t].up : 0; }
// 砲彈類別（開戰前的戰術裝填）
var AMMO = {
  round: { nm:'實心彈', ico:'🔴', ds:'均衡・對船身傷害最高' },
  chain: { nm:'鏈彈',   ico:'⛓️', ds:'打斷索具・削弱敵還擊、打帶跑必逃' },
  grape: { nm:'霰彈',   ico:'🍇', ds:'殺傷水手・大幅提升接舷俘虜成功率' }
};
function effectiveCargoMax(pl){ return CARGO_MAX + ((pl.ship&&pl.ship.cargoBonus)||0) + ((pl.com&&pl.com.lv>=6)?6:0); }
var SHIP_UP = {
  hull:   { nm:'強化船身', ico:'🛠️', stat:'hullMax',    step:30, base:120 },
  cannon: { nm:'加裝火砲', ico:'💣', stat:'cannon',     step:3,  base:150 },
  cargo:  { nm:'擴充貨艙', ico:'📦', stat:'cargoBonus', step:8,  base:130 },
  crew:   { nm:'招募水手', ico:'⚓', stat:'crew',       step:4,  base:90  },
  speed:  { nm:'改良帆裝', ico:'💨', stat:'speed',      step:1,  base:110 }
};
var ENEMY_SHIPS = [
  { nm:'廻船',     ico:'⛵',  hull:45,  cannon:4,  speed:8, gold:[30,70],   loot:2 },
  { nm:'武装廻船', ico:'🚢',  hull:80,  cannon:7,  speed:6, gold:[70,150],  loot:3 },
  { nm:'倭寇船',   ico:'🏴‍☠️', hull:120, cannon:11, speed:7, gold:[120,240], loot:4 },
  { nm:'南蛮船',   ico:'⚓',  hull:185, cannon:16, speed:5, gold:[220,420], loot:6 }
];
// 鹵獲敵船→可編入艦隊的戰利品船（或拆解換金）
function makePrize_(enemy){
  var hull = enemy.hull, cannon = enemy.cannon;
  return { id:'f'+uid(), cls:'prize', nm:'鹵獲・'+enemy.nm, ico:enemy.ico,
    hullMax:hull, hull:hull, cannon:cannon, cargoBonus:Math.max(4,Math.round(hull/12)),
    speed:(enemy.speed||6), role:'idle', route:null, escort:false, lastAt:0,
    scrapGold:Math.round((hull + cannon*8)/2) };
}

// ---- 船商：可購買的船種（組艦隊用）----
var SHIP_CLASSES = [
  { cls:'trader',  nm:'弁才船', ico:'⛵', hullMax:70,  cannon:5,  cargoBonus:14, speed:5,  price:600  },
  { cls:'clipper', nm:'小早',   ico:'🚤', hullMax:65,  cannon:7,  cargoBonus:10, speed:10, price:900  },
  { cls:'frigate', nm:'関船',   ico:'⚔️', hullMax:130, cannon:15, cargoBonus:6,  speed:6,  price:1500 },
  { cls:'galleon', nm:'安宅船', ico:'🚢', hullMax:160, cannon:12, cargoBonus:26, speed:4,  price:2400 }
];
var SHIP_CLASS_BY = {}; SHIP_CLASSES.forEach(function(s){ SHIP_CLASS_BY[s.cls]=s; });

// ============================================================
//  🏴‍☠️ 傳說船艦・海圖奇譚（一生一次的特殊船艦，各有專屬劇情與守護者）
//  取得＝滿足條件 → 出資追尋 → 打贏守護者海戰 → 收為旗艦。
//  數值高於一般旗艦、另帶專屬特效（perk），並登入結局圖鑑。
// ============================================================
var LEGEND_SHIPS = [
  { id:'ghost', nm:'怨霊丸', ico:'👻', tier:4, gunTier:5,
    hullMax:260, cannon:32, speed:14, cargoBonus:14, crew:34,
    perk:'夜霧幽襲', perkDesc:'幽靈之速冠絕四海——打帶跑幾乎必定脫離，夜襲先手兇狠。',
    lore:'終年迷霧的死亡海域，一艘沒有活人的船逆風而行。船員早已化作怨靈，唯有執念還在掌舵。',
    need:{ nav:6, clues:6 }, needTxt:'航海術 Lv6 ＋ 秘寶線索 ≥6（要在夜霧海域追它）',
    hint:{ nav:3 }, rumor:'酒場角落，一名獨眼老船頭壓低聲音：「夜霧海域…有艘沒有活人的船在打轉。夠格的船頭才追得上。」',
    guardian:{ nm:'亡霊船頭', ico:'☠️', hull:210, cannon:24, speed:12 },
    intro:['濃霧裡浮出一片破帆——傳說中的幽靈船「怨霊丸」。','甲板上的怨靈緩緩轉頭，空洞的眼窩鎖定了你：「活人…也想加入我們的航程嗎？」','（要奪下這艘船，得先讓亡霊船頭重歸安息。）'],
    win:['最後一輪齊射轟碎了執念的鎖鏈，亡霊船頭化作霧氣消散：「自由了…她是你的了。」','幽藍的鬼火沿著桅杆亮起，「怨霊丸」認你為新的船頭。'] },
  { id:'golden', nm:'黄金丸', ico:'🪙', tier:4, gunTier:3,
    hullMax:320, cannon:20, speed:6, cargoBonus:46, crew:44,
    perk:'富甲天下', perkDesc:'傳說級的巨大貨艙，售貨價再 +8%——跑商發財神器。',
    lore:'百年前滿載金山黃金沉沒的廻船隊旗艦，據說船艙塞滿了半個天下的財富。',
    need:{ com:6, gold:5000 }, needTxt:'商業 Lv6 ＋ 5000🪙（雇打撈隊）',
    hint:{ com:3 }, rumor:'碼頭豪商神秘兮兮：「百年前沉沒的黃金船隊…有人拼出了半張海圖。有本錢的商人才玩得起這場打撈。」',
    guardian:{ nm:'倭寇打撈隊', ico:'🏴‍☠️', hull:240, cannon:20, speed:7 },
    intro:['海圖殘片拼出了沉船座標——你雇來打撈隊，卻發現一群倭寇也聞風而至。','「金子是我們的！」倭寇船逼近，只有打退他們，寶船才屬於你。'],
    win:['倭寇狼狽退去，打撈索緩緩拉起這艘塞滿黃金的巨舟。','「黄金丸」重見天日——光是艙裡的舊財寶就夠你笑好幾天。'] },
  { id:'dragon', nm:'龍神丸', ico:'🐉', tier:4, gunTier:6,
    hullMax:420, cannon:48, speed:7, cargoBonus:16, crew:56,
    perk:'龍息齊射', perkDesc:'以龍神骸骨為龍骨，砲擊威能碾壓一切（海戰砲擊 +6）。',
    lore:'海神龍神的巨大骸骨沉睡在最深的海溝，被古老工匠打造成不沉的戰艦。',
    need:{ deepest:15, fame:2800 }, needTxt:'地城深潛 ≥15 層 ＋ 威名 ≥2800（旗本以上）',
    hint:{ deepest:10 }, rumor:'一位斷了腿的老船頭盯著你：「最深的海溝底下…睡著龍神的骸骨。夠深、夠有名望的人，才聽得懂祂的呼喚。」',
    guardian:{ nm:'龍宮の守護獣', ico:'🐙', hull:330, cannon:32, speed:8 },
    intro:['循著古老海圖潛入最深海溝，龍骨戰艦「龍神丸」靜臥其中——','一頭巨大的龍宮守護獸盤據其上，向你噴出墨黑的潮水。要它的船，先過牠這關。'],
    win:['守護獸發出最後的哀鳴，沉入黑暗。龍骨深處亮起古老的紋樣——','「龍神丸」承認了你的膽識，龍神之力自此為你所用。'] }
];
var LEGEND_INQUIRE_COST = 150;   // 打聽一則傳說船傳聞的花費
var LEGEND_BY = {}; LEGEND_SHIPS.forEach(function(s){ LEGEND_BY[s.id]=s; });
function legendShipById(id){ return LEGEND_BY[id]||null; }
// 由傳說定義生成一艘可用旗艦
function makeLegendFlagship_(L){ return { name:L.nm, ico:L.ico, hullMax:L.hullMax, hull:L.hullMax,
  cannon:L.cannon, cargoBonus:L.cargoBonus, crew:L.crew, speed:L.speed, gunTier:L.gunTier, tier:L.tier,
  legend:L.id, perk:L.perk }; }

var FLEET_MAX = 5;
var TRADE_CYCLE_MS = 5*60*1000;   // 每「航海日」約 5 分鐘一趟

// NPC 海上商船名號（海域巡弋用）
var NPC_NAMES = ['千鳥丸','黒富士丸','朝凪丸','早船丸','金鹿丸','南風丸','翡翠丸','浪花丸','北辰丸','将軍丸'];
// 接舷俘虜後可招降的敗方船員名號
var CAPTIVE_NAMES = ['独眼の甚八','片腕の六','赤鬚','傷面の三','鉄鉤の八','匕首の丞','流れ者の蒼','老砲術の棠','無口の西','跛の工','鮫牙','黒手の弁','海狼','折れ帆の楊'];

// ============================================================
//  NPC 勢力 / 好感度（rep -1000~+1000）
//  掠奪/貿易/攻佔會自動增減好感；串起船長贖金、招降兵種、友好折扣。
// ============================================================
var FACTIONS = [
  { id:'guild',  nm:'廻船問屋衆', ico:'🏛️', kind:'trade',   foe:'league', jobs:['merchant','scholar','bard'],  blurb:'壟斷四海航路的豪商聯盟' },
  { id:'navy',   nm:'幕府水軍',   ico:'⚓',  kind:'navy',    foe:'pirate', jobs:['fighter','paladin','cleric'], blurb:'維護海疆秩序的幕府艦隊' },
  { id:'pirate', nm:'倭寇衆',     ico:'☠️',  kind:'pirate',  foe:'navy',   jobs:['rogue','ranger','fighter'],   blurb:'橫行四海的無旗船隊' },
  { id:'league', nm:'南蠻貿易同盟', ico:'🧭', kind:'explore', foe:'guild',  jobs:['ranger','scholar','wizard'],  blurb:'與南蠻通商、追尋秘寶新土的自由結社' }
];
var FACTION_BY = {}; FACTIONS.forEach(function(f){ FACTION_BY[f.id]=f; });
var REP_TIERS = [ {nm:'世仇',ico:'💢'},{nm:'敵對',ico:'⚔️'},{nm:'中立',ico:'🤝'},{nm:'友好',ico:'😊'},{nm:'盟友',ico:'🎖️'} ];
function repTier(v){ v=v||0; if (v<=-600) return 0; if (v<-200) return 1; if (v<200) return 2; if (v<600) return 3; return 4; }
function repClamp(v){ return Math.max(-1000, Math.min(1000, Math.round(v||0))); }
// 敵船依類型歸屬勢力（＋強度階；招降稀有度與勢力兵種靠它）
var SHIP_FACTION = { '廻船':'league', '武装廻船':'guild', '倭寇船':'pirate', '南蛮船':'navy' };
function shipFaction_(nm){ return SHIP_FACTION[nm] || 'pirate'; }
// 港口歸屬勢力（沒列到＝中立）
var MARKET_FACTION = { merc:'navy', whale:'league', port:'guild', gold:'guild', oasis:'league', temple:'league', coral:'pirate' };
function marketFac_(id){ return MARKET_FACTION[id] || ''; }
// 勢力懸賞（好感達中立可接；商會＝跑商賣貨，其餘＝獵殺宿敵的船）
function genBounty(facId, pl){
  var fac = FACTION_BY[facId] || {}, dd = (pl&&pl.deepest)||0;
  if (fac.kind === 'trade'){
    var n = 4 + Math.floor(dd/8);
    return { fac:facId, type:'deliver', target:n, prog:0, name:'在'+fac.nm+'的港口賣出 '+n+' 箱貨物', reward:100+n*35, rep:160 };
  }
  var foe = fac.foe, fn = (FACTION_BY[foe]||{}).nm || '敵對勢力', n2 = 2 + Math.floor(dd/12);
  return { fac:facId, type:'hunt', foeFac:foe, target:n2, prog:0, name:'掠奪或擊沉 '+n2+' 艘'+fn+'的船', reward:140+n2*70, rep:160 };
}
// 在地任務：每港每日一件（以港+日 seed 決定），停泊該港可接。剿匪／濟港／尋人。
function portTaskFor(pid, day, dd){
  var h = hashNoise('pt'+pid+day), mk = MARKET_BY[pid]||{}, fac = marketFac_(pid);
  dd = dd||0;
  if (h < 0.40) return { type:'raid',   ico:'🎯', fac:fac, gold:120+dd*12, rep:60, fame:15, desc:'替 '+(mk.nm||'本港')+' 剷除外海的近海海盜' };
  if (h < 0.72) return { type:'supply', ico:'📦', fac:fac, gold:200+dd*8,  rep:80, fame:20, desc:(mk.nm||'本港')+' 鬧糧荒——捐 3 箱貨物（或付 300🪙）賑濟' };
  return              { type:'search', ico:'🔎', fac:fac, gold:0,         rep:40, fame:10, desc:'出資 200🪙 協助 '+(mk.nm||'本港')+' 懸賞尋人' };
}

function npcTradersForDay(day){
  var list=[];
  for (var i=0;i<5;i++){
    var seed = day*97 + i*31;
    var nm = NPC_NAMES[seed % NPC_NAMES.length];
    var port = MARKETS[seed % MARKETS.length];
    var ti = seed % ENEMY_SHIPS.length;
    var es = ENEMY_SHIPS[ti];
    list.push({ id:'npc'+i, nm:nm, ico:es.ico, portNm:port.nm, portIco:port.ico,
      hull:es.hull, cannon:es.cannon, speed:es.speed||6, gold:es.gold, loot:es.loot,
      fac:shipFaction_(es.nm), tier:ti, cls:es.nm });
  }
  return list;
}

// ---- 威名 / 爵位（總目標：多面向合成的名聲分數）----
var PEERAGE = [{t:0,nm:'無名浪人',ico:'🚶'},{t:300,nm:'廻船若頭',ico:'⛵'},{t:800,nm:'堺豪商',ico:'💰'},{t:1600,nm:'水軍武者',ico:'🗡️'},{t:2800,nm:'旗本',ico:'🎖️'},{t:4500,nm:'大身旗本',ico:'🏅'},{t:7000,nm:'国主',ico:'👑'},{t:10000,nm:'大名',ico:'💠'},{t:15000,nm:'天下人',ico:'🌊'}];
function fameOf(pl){ var f=0; f+=(pl.deepest||0)*40; f+=Math.floor((pl.gold||0)/120)+Math.floor((pl.invest||0)/120); if(pl.holdings)Object.keys(pl.holdings).forEach(function(k){ f+=50+((pl.holdings[k]&&pl.holdings[k].lv)||1)*50; }); f+=((pl.fleet||[]).length)*40; f+=(((pl.nav&&pl.nav.lv)||1)+((pl.com&&pl.com.lv)||1))*18; f+=(pl.questsDone||0)*12; (pl.roster||[]).forEach(function(c){ if(c)f+=(c.level||1)*3; }); if(pl.uniques)f+=Object.keys(pl.uniques).length*80; f+=(pl.fameBonus||0); return Math.round(f); }
function peerageOf(f){ var ix=0; for(var i=0;i<PEERAGE.length;i++){ if(f>=PEERAGE[i].t) ix=i; } return ix; }
function hashNoise(str){ var h=2166136261; for (var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return ((h>>>0)%1000)/1000; }
function tradeDayBucket(){ return Math.floor(Date.now()/(1000*60*60*4)); }   // 每 4 小時波動一次
// ---- 世界隨機事件（每日一件，全世界共享・以當日 seed 決定）----
function eventDay(){ return Math.floor(Date.now()/(1000*60*60*24)); }
function worldEvent(){
  var d=eventDay(), roll=hashNoise('evt'+d);
  if (roll<0.34) return { type:'calm', ico:'☀️', t:'風平浪靜的一天，適合穩紮穩打。' };
  if (roll<0.53){ var g=GOODS[Math.floor(hashNoise('g'+d)*GOODS.length)]; return { type:'surge', good:g.id, ico:'📈', t:g.ico+g.nm+' 搶購熱潮 —— 各地售價大漲，手上有貨快脫手！' }; }
  if (roll<0.70){ var g2=GOODS[Math.floor(hashNoise('g2'+d)*GOODS.length)]; return { type:'crash', good:g2.id, ico:'📉', t:g2.ico+g2.nm+' 行情崩盤 —— 進貨超便宜，逢低囤貨！' }; }
  if (roll<0.87){ var m=MARKETS[Math.floor(hashNoise('m'+d)*MARKETS.length)]; return { type:'festival', port:m.id, ico:'🎉', t:m.ico+m.nm+' 舉辦慶典 —— 當地物價高漲，運貨去賣正好！' }; }
  var m2=MARKETS[Math.floor(hashNoise('m2'+d)*MARKETS.length)]; return { type:'pirate', port:m2.id, ico:'🏴‍☠️', t:m2.ico+m2.nm+' 外海海盜猖獗 —— 今日掠奪收穫更豐，但風高浪急！' };
}
function eventPriceMul(marketId, goodId){
  var e=worldEvent();
  if (e.type==='surge' && e.good===goodId) return 1.3;
  if (e.type==='crash' && e.good===goodId) return 0.7;
  if (e.type==='festival' && e.port===marketId) return 1.18;
  return 1;
}
// 回傳某市集某商品的市價（波動後・含世界事件）
function tradePrice(marketId, goodId, day){
  var good=GOOD_BY[goodId], mk=MARKET_BY[marketId]; if (!good||!mk) return 0;
  var mod = mk.cheap.indexOf(goodId)>=0 ? 0.6 : (mk.dear.indexOf(goodId)>=0 ? 1.5 : 1.0);
  var fl = 0.8 + hashNoise(marketId+'_'+goodId+'_'+day)*0.5;      // 0.8 ~ 1.3
  return Math.max(1, Math.round(good.base*mod*fl*eventPriceMul(marketId,goodId)));
}

// 依樓層產出戰利品池（回傳裝備 id 或 null）
function lootTierForFloor(floor){
  if (floor >= 20) return 4;
  if (floor >= 12) return 3;
  if (floor >= 6)  return 2;
  return 1;
}
