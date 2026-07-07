// ==========================================
// 第二部分：資料存取層
//   整局讀進記憶體 → 運算 → 一次寫回。
// ==========================================

// ==========================================
// 第二部分：資料存取層（多人存檔：每位玩家一份整局 JSON，存於 Saves 分頁）
// ==========================================

// 清理玩家暱稱（上限20字，去頭尾空白）
function cleanPlayer_(name) { return String(name == null ? '' : name).trim().slice(0, 20); }

// 取得(或建立) Saves 分頁：欄位 PLAYER / JSON / UPDATED
function getSavesSheet_() {
  const ss = getOrCreateSpreadsheet_();
  let sh = ss.getSheetByName(SHEETS.SAVES);
  if (!sh) { sh = ss.insertSheet(SHEETS.SAVES); sh.getRange(1, 1, 1, 3).setValues([['PLAYER', 'JSON', 'UPDATED']]); }
  return sh;
}

// 讀取某玩家的整局；沒有存檔回傳 null
function loadGame(player) {
  player = cleanPlayer_(player);
  if (!player) return null;
  const sh = getSavesSheet_();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === player) {
      try { const g = JSON.parse(data[i][1]); g._player = player; return g; }
      catch (e) { return null; }
    }
  }
  return null;
}

// 寫回該玩家的整局（以 game._player 為 key，LockService 防並發衝突）
function saveGame(game) {
  const player = cleanPlayer_(game && game._player);
  if (!player) throw new Error('無玩家識別，無法存檔');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSavesSheet_();
    const data = sh.getDataRange().getValues();
    const json = JSON.stringify(game);
    const stamp = new Date();
    let row = -1;
    for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === player) { row = i + 1; break; } }
    if (row < 0) sh.appendRow([player, json, stamp]);
    else sh.getRange(row, 1, 1, 3).setValues([[player, json, stamp]]);
  } finally { lock.releaseLock(); }
}

// 依種子建立一局全新遊戲（含隨機路人＋傳說），回傳與遊戲一致的物件結構
function buildFreshGame(player) {
  const state = { turn: 1, phase: 'PLAYER', winner: '', bonds: '',
    log: '亂世將起，五雄並立。招賢納士、開疆闢土，' + RULES.TURN_LIMIT + ' 回合內統一天下！' };
  const factions = SEED_FACTIONS().map(function (r) {
    return { id: String(r[C_FAC.ID]), name: String(r[C_FAC.NAME]), isPlayer: Number(r[C_FAC.IS_PLAYER]) === 1,
      gold: Number(r[C_FAC.GOLD]) || 0, color: String(r[C_FAC.COLOR]), alive: Number(r[C_FAC.ALIVE]) === 1,
      ap: Number(r[C_FAC.AP]) || 0, ability: String(r[C_FAC.ABILITY] || '') };
  });
  const territories = SEED_TERRITORIES().map(function (r) {
    return { id: String(r[C_TER.ID]), name: String(r[C_TER.NAME]), owner: String(r[C_TER.OWNER]),
      troops: Number(r[C_TER.TROOPS]) || 0, maxTroops: Number(r[C_TER.MAX_TROOPS]) || 0,
      income: Number(r[C_TER.INCOME]) || 0, dev: 0, x: Number(r[C_TER.X]) || 0, y: Number(r[C_TER.Y]) || 0,
      adj: String(r[C_TER.ADJ] || '').split(',').map(function (a) { return a.trim(); }).filter(String),
      market: 0, barracks: 0, wall: 0, tower: 0 };
  });
  const chars = SEED_CHARS().concat(genRandomChars_()).concat(SEED_LEGENDS()).map(function (r) {
    return { id: String(r[C_CHAR.ID]), name: String(r[C_CHAR.NAME]), owner: String(r[C_CHAR.OWNER]),
      unit: String(r[C_CHAR.UNIT] || 'infantry'), level: Number(r[C_CHAR.LEVEL]) || 1, exp: Number(r[C_CHAR.EXP]) || 0,
      lead: Number(r[C_CHAR.LEAD]) || 0, war: Number(r[C_CHAR.WAR]) || 0, int: Number(r[C_CHAR.INT]) || 0,
      skill: String(r[C_CHAR.SKILL] || ''), loc: String(r[C_CHAR.LOC] || ''), acted: false, alive: true,
      loyalty: Number(r[C_CHAR.LOYALTY]) || 0, equip: String(r[C_CHAR.EQUIP] || ''),
      persona: String(r[C_CHAR.PERSONA] || ''), speech: String(r[C_CHAR.SPEECH] || ''),
      likes: String(r[C_CHAR.LIKES] || ''), catch: String(r[C_CHAR.CATCH] || ''), bio: String(r[C_CHAR.BIO] || ''),
      charge: randInt_(0, 66) };
  });
  const items = SEED_ITEMS().map(function (r) {
    return { id: String(r[C_ITEM.ID]), name: String(r[C_ITEM.NAME]), type: String(r[C_ITEM.TYPE]),
      war: Number(r[C_ITEM.WAR]) || 0, lead: Number(r[C_ITEM.LEAD]) || 0, int: Number(r[C_ITEM.INT]) || 0,
      owner: String(r[C_ITEM.OWNER] || ''), desc: String(r[C_ITEM.DESC] || '') };
  });
  const dungeons = SEED_DUNGEONS().map(function (r) {
    return { id: String(r[C_DUN.ID]), name: String(r[C_DUN.NAME]), ter: String(r[C_DUN.TER]),
      level: Number(r[C_DUN.LEVEL]) || 1, floors: Number(r[C_DUN.FLOORS]) || 1, progress: 0, cleared: false,
      monster: Number(r[C_DUN.MONSTER]) || 0, rewardGold: Number(r[C_DUN.REWARD_GOLD]) || 0,
      rewardItem: String(r[C_DUN.REWARD_ITEM] || ''), recruit: Number(r[C_DUN.RECRUIT]) === 1 };
  });
  const game = { state: state, factions: factions, territories: territories, chars: chars,
    items: items, dungeons: dungeons, diplo: [] };
  game._player = cleanPlayer_(player);
  return game;
}


// ------------------------------------------
// 查詢工具
// ------------------------------------------
function findTerritory(game, id) { return game.territories.filter(function (t) { return t.id === id; })[0] || null; }
function findChar(game, id)      { return game.chars.filter(function (c) { return c.id === id; })[0] || null; }
function findFaction(game, id)   { return game.factions.filter(function (f) { return f.id === id; })[0] || null; }
function findItem(game, id)      { return game.items.filter(function (i) { return i.id === id; })[0] || null; }
function findDungeon(game, id)   { return (game.dungeons || []).filter(function (d) { return d.id === id; })[0] || null; }
function dungeonAt(game, terId)  { return (game.dungeons || []).filter(function (d) { return d.ter === terId; })[0] || null; }

// ------------------------------------------
// 外交關係（對稱，未列於表者預設 war）
// ------------------------------------------
function relEntry(game, a, b) {
  return (game.diplo || []).filter(function (d) {
    return (d.a === a && d.b === b) || (d.a === b && d.b === a);
  })[0] || null;
}
function relStatus(game, a, b) {
  if (a === b) return 'self';
  if (a === 'F0' || b === 'F0') return 'neutral';
  const e = relEntry(game, a, b);
  return e ? e.status : 'war';
}
function setRel(game, a, b, status, expire) {
  game.diplo = (game.diplo || []).filter(function (d) {
    return !((d.a === a && d.b === b) || (d.a === b && d.b === a));
  });
  if (status !== 'war') game.diplo.push({ a: a, b: b, status: status, expire: expire || 0 });
}
function playerFaction(game)     { return game.factions.filter(function (f) { return f.isPlayer; })[0] || null; }
// 施設加成後的有效收入 / 兵力上限
function terIncome(t)    { return t.income + (t.market || 0) * RULES.MARKET_INCOME; }
function terMaxTroops(t) { return t.maxTroops + (t.barracks || 0) * RULES.BARRACKS_MAX; }
function territoriesOf(game, facId) { return game.territories.filter(function (t) { return t.owner === facId; }); }
// 某領地上、指定勢力仍存活的守將
function charAt(game, terId, facId) {
  return game.chars.filter(function (c) {
    return c.alive && c.loc === terId && (facId ? c.owner === facId : true);
  })[0] || null;
}

// ------------------------------------------
// 裝備加成：回傳角色的有效三圍（含所有裝備）
// ------------------------------------------
function equippedItems(game, charId) {
  return game.items.filter(function (i) { return i.owner === charId; });
}
function effStats(game, ch) {
  let war = ch.war, lead = ch.lead, intel = ch.int;
  equippedItems(game, ch.id).forEach(function (i) { war += i.war; lead += i.lead; intel += i.int; });
  // 羈絆被動：夥伴同陣營且存活時，雙方獲得加成
  activeBonds(game, ch).forEach(function (b) {
    war += b.bonus.war || 0; lead += b.bonus.lead || 0; intel += b.bonus.int || 0;
  });
  return { war: war, lead: lead, int: intel };
}
// 回傳某角色目前生效中的羈絆
function activeBonds(game, ch) {
  return BONDS.filter(function (b) {
    if (b.a !== ch.id && b.b !== ch.id) return false;
    const pid = b.a === ch.id ? b.b : b.a;
    const p = findChar(game, pid);
    return p && p.alive && p.owner === ch.owner;
  });
}
