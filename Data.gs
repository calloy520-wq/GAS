// ============================================================
// 傭兵之城 · D&D 版 — 遊戲資料（規則常數 / 職業 / 裝備 / 怪物 / 骰子）
// 全部戰鬥與骰子在 GAS 後端運算，前端只負責畫面。
// ============================================================

// ---- 全域設定 ----
var CFG = {
  BATTLE_SLOTS: 4,     // 戰鬥位（含主角）
  SUPPORT_SLOTS: 2,    // 後勤位
  ROSTER_MAX: 10,      // 角色倉庫上限（含主角）
  START_GOLD: 120,
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
  fighter:{ nm:'戰士', ico:'⚔️', hd:10, atk:'str', role:'前排', dmg:[1,8],
    grow:{str:2,con:1}, skill:{ nm:'猛擊', kind:'double', desc:'一回合追加一次強力揮砍' },
    blurb:'血厚攻高的前線支柱，越級越猛。' },
  paladin:{ nm:'聖騎士', ico:'🛡️', hd:10, atk:'str', role:'坦補', dmg:[1,8],
    grow:{str:1,con:1,cha:1}, skill:{ nm:'神聖斬', kind:'smite', desc:'對敵人造成額外聖傷，並小幅治療自己' },
    blurb:'既能扛又能奶的重甲騎士。' },
  rogue:{ nm:'盜賊', ico:'🗡️', hd:8, atk:'dex', role:'爆發', dmg:[1,6],
    grow:{dex:2,cha:1}, skill:{ nm:'偷襲', kind:'sneak', desc:'必定暴擊、追加骰傷' },
    blurb:'高暴擊高閃避，收割殘血的行家。' },
  ranger:{ nm:'遊俠', ico:'🏹', hd:10, atk:'dex', role:'遠程', dmg:[1,8],
    grow:{dex:2,wis:1}, skill:{ nm:'瞄準連射', kind:'multi', desc:'對單體連續射三箭' },
    blurb:'穩定輸出的遠程獵手。' },
  wizard:{ nm:'法師', ico:'🔮', hd:6, atk:'int', role:'群攻', dmg:[1,6],
    grow:{int:2,con:1}, skill:{ nm:'火球術', kind:'aoe', desc:'烈焰吞噬全體敵人' },
    blurb:'脆皮但一發火球清場。' },
  cleric:{ nm:'牧師', ico:'✨', hd:8, atk:'wis', role:'戰醫', dmg:[1,6],
    grow:{wis:2,con:1}, skill:{ nm:'聖光', kind:'heal', desc:'治療全隊並復活一名陣亡者' },
    blurb:'能打能奶，戰線的定海神針。' }
};

// ---- 後勤/輔助職業（填後勤位，不下場、給整場增益）----
var SUPPORT_CLASSES = {
  bard:{ nm:'吟遊詩人', ico:'🎵', buff:'atk', val:2, grow:{cha:2,dex:1},
    desc:'激勵全隊：戰鬥位攻擊檢定 +2' },
  merchant:{ nm:'商人', ico:'💰', buff:'gold', val:0.4, grow:{cha:2,int:1},
    desc:'尋寶：金幣與掉落率提升 40%' },
  scholar:{ nm:'學者', ico:'📖', buff:'xp', val:0.35, grow:{int:2,wis:1},
    desc:'博學：經驗值 +35%、自動鑑定戰利品' },
  medic:{ nm:'醫者', ico:'⛑️', buff:'heal', val:0.12, grow:{wis:2,int:1},
    desc:'照護：每層結束自動治療全隊 12% 生命' },
  diviner:{ nm:'占卜師', ico:'🍀', buff:'crit', val:0.1, grow:{wis:1,cha:2},
    desc:'預知：全隊暴擊率 +10%、迴避陷阱' }
};

function classInfo(job){ return COMBAT_CLASSES[job] || SUPPORT_CLASSES[job] || null; }
function isSupport(job){ return !!SUPPORT_CLASSES[job]; }

// ---- 種族庫（創角時一次性屬性加值；與立繪外觀無關）----
var RACES = {
  human:   { nm:'人類', ico:'🧑', grow:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, perk:'萬能：全屬性 +1' },
  elf:     { nm:'精靈', ico:'🧝', grow:{dex:2,int:1}, perk:'敏銳：敏捷+2 智力+1' },
  darkelf: { nm:'黑暗精靈', ico:'🌑', grow:{dex:2,cha:1}, perk:'魅影：敏捷+2 魅力+1' },
  beast:   { nm:'獸耳', ico:'🐾', grow:{str:2,con:1}, perk:'野性：力量+2 體質+1' },
  dragon:  { nm:'龍族', ico:'🐲', grow:{str:2,cha:1}, perk:'龍血：力量+2 魅力+1' },
  demon:   { nm:'魔族', ico:'😈', grow:{cha:2,int:1}, perk:'魔性：魅力+2 智力+1' },
  angel:   { nm:'天使', ico:'😇', grow:{wis:2,cha:1}, perk:'聖佑：睿知+2 魅力+1' },
  vampire: { nm:'吸血鬼', ico:'🧛', grow:{cha:2,dex:1}, perk:'夜裔：魅力+2 敏捷+1' }
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
function gearById(id){
  var all = WEAPONS.concat(ARMORS).concat(TRINKETS);
  for (var i=0;i<all.length;i++) if (all[i].id===id) return all[i];
  return null;
}
function gearSlot(id){
  if (id && id.indexOf('w_')===0) return 'weapon';
  if (id && id.indexOf('a_')===0) return 'armor';
  if (id && id.indexOf('t_')===0) return 'trinket';
  return null;
}

// ---- 怪物（依樓層縮放）----
var MONSTERS = [
  { nm:'哥布林', ico:'👺', hd:1, ac:12, dmg:[1,4], atk:2, xp:12, gold:[4,10] },
  { nm:'巨鼠',   ico:'🐀', hd:1, ac:11, dmg:[1,4], atk:1, xp:8,  gold:[3,7] },
  { nm:'骷髏兵', ico:'💀', hd:2, ac:13, dmg:[1,6], atk:3, xp:18, gold:[6,14] },
  { nm:'座狼',   ico:'🐺', hd:2, ac:13, dmg:[1,6], atk:4, xp:20, gold:[5,12] },
  { nm:'毒蛛',   ico:'🕷️', hd:2, ac:14, dmg:[1,6], atk:4, xp:22, gold:[6,15] },
  { nm:'食人妖', ico:'👹', hd:3, ac:14, dmg:[1,8], atk:5, xp:35, gold:[12,26] },
  { nm:'石魔像', ico:'🗿', hd:4, ac:16, dmg:[2,6], atk:6, xp:50, gold:[16,34] },
  { nm:'幽魂',   ico:'👻', hd:3, ac:15, dmg:[1,8], atk:5, xp:40, gold:[10,28] }
];
var BOSSES = [
  { nm:'哥布林王', ico:'👑', hd:6,  ac:15, dmg:[2,6], atk:6,  xp:120, gold:[40,80] },
  { nm:'巨魔領主', ico:'😈', hd:9,  ac:16, dmg:[2,8], atk:8,  xp:220, gold:[70,140] },
  { nm:'骨龍',     ico:'🐉', hd:12, ac:18, dmg:[3,6], atk:10, xp:380, gold:[120,240] },
  { nm:'巫妖',     ico:'☠️', hd:15, ac:19, dmg:[3,8], atk:12, xp:600, gold:[200,400] }
];

// ---- 主線階級（靠探索最深層自動晉升）----
var RANKS = [
  { nm:'見習傭兵', floor:0 }, { nm:'銅牌傭兵', floor:5 }, { nm:'銀牌傭兵', floor:10 },
  { nm:'金牌傭兵', floor:15 }, { nm:'白金傭兵', floor:20 }, { nm:'傳說傭兵', floor:25 }
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

// 依樓層產出戰利品池（回傳裝備 id 或 null）
function lootTierForFloor(floor){
  if (floor >= 20) return 4;
  if (floor >= 12) return 3;
  if (floor >= 6)  return 2;
  return 1;
}
