// ==========================================
// 第二部分：資料存取層
//   整局讀進記憶體 → 運算 → 一次寫回。
// ==========================================

function loadGame() {
  const ss = getOrCreateSpreadsheet_();

  const stateRows = readSheet_(ss, SHEETS.STATE);
  const facRows   = readSheet_(ss, SHEETS.FACTION);
  const terRows   = readSheet_(ss, SHEETS.TERRITORY);
  const chRows    = readSheet_(ss, SHEETS.CHAR);
  const itRows    = readSheet_(ss, SHEETS.ITEM);
  const dunRows   = readSheet_(ss, SHEETS.DUNGEON);
  const dipRows   = readSheet_(ss, SHEETS.DIPLO);

  const s = stateRows[0] || [1, 'PLAYER', '', ''];
  const state = {
    turn:   Number(s[C_STATE.TURN]) || 1,
    phase:  String(s[C_STATE.PHASE] || 'PLAYER'),
    winner: String(s[C_STATE.WINNER] || ''),
    log:    String(s[C_STATE.LOG] || '')
  };

  const factions = facRows.map(function (r) {
    return {
      id: String(r[C_FAC.ID]), name: String(r[C_FAC.NAME]),
      isPlayer: Number(r[C_FAC.IS_PLAYER]) === 1,
      gold: Number(r[C_FAC.GOLD]) || 0,
      color: String(r[C_FAC.COLOR]),
      alive: Number(r[C_FAC.ALIVE]) === 1,
      ap: Number(r[C_FAC.AP]) || 0,
      ability: String(r[C_FAC.ABILITY] || '')
    };
  });

  const territories = terRows.map(function (r) {
    return {
      id: String(r[C_TER.ID]), name: String(r[C_TER.NAME]),
      owner: String(r[C_TER.OWNER]),
      troops: Number(r[C_TER.TROOPS]) || 0,
      maxTroops: Number(r[C_TER.MAX_TROOPS]) || 0,
      income: Number(r[C_TER.INCOME]) || 0,
      dev: Number(r[C_TER.DEV]) || 0,
      x: Number(r[C_TER.X]) || 0, y: Number(r[C_TER.Y]) || 0,
      adj: String(r[C_TER.ADJ] || '').split(',').map(function (a) { return a.trim(); }).filter(String),
      market: Number(r[C_TER.MARKET]) || 0,
      barracks: Number(r[C_TER.BARRACKS]) || 0,
      wall: Number(r[C_TER.WALL]) || 0,
      tower: Number(r[C_TER.TOWER]) || 0
    };
  });

  const chars = chRows.map(function (r) {
    return {
      id: String(r[C_CHAR.ID]), name: String(r[C_CHAR.NAME]),
      owner: String(r[C_CHAR.OWNER]),
      unit: String(r[C_CHAR.UNIT] || 'infantry'),
      level: Number(r[C_CHAR.LEVEL]) || 1,
      exp: Number(r[C_CHAR.EXP]) || 0,
      lead: Number(r[C_CHAR.LEAD]) || 0,
      war: Number(r[C_CHAR.WAR]) || 0,
      int: Number(r[C_CHAR.INT]) || 0,
      skill: String(r[C_CHAR.SKILL] || ''),
      loc: String(r[C_CHAR.LOC] || ''),
      acted: Number(r[C_CHAR.ACTED]) === 1,
      alive: Number(r[C_CHAR.ALIVE]) === 1,
      loyalty: Number(r[C_CHAR.LOYALTY]) || 0,
      equip: String(r[C_CHAR.EQUIP] || ''),
      persona: String(r[C_CHAR.PERSONA] || ''),
      speech: String(r[C_CHAR.SPEECH] || ''),
      likes: String(r[C_CHAR.LIKES] || ''),
      catch: String(r[C_CHAR.CATCH] || ''),
      bio: String(r[C_CHAR.BIO] || '')
    };
  });

  const items = itRows.map(function (r) {
    return {
      id: String(r[C_ITEM.ID]), name: String(r[C_ITEM.NAME]),
      type: String(r[C_ITEM.TYPE]),
      war: Number(r[C_ITEM.WAR]) || 0,
      lead: Number(r[C_ITEM.LEAD]) || 0,
      int: Number(r[C_ITEM.INT]) || 0,
      owner: String(r[C_ITEM.OWNER] || ''),
      desc: String(r[C_ITEM.DESC] || '')
    };
  });

  const dungeons = dunRows.map(function (r) {
    return {
      id: String(r[C_DUN.ID]), name: String(r[C_DUN.NAME]), ter: String(r[C_DUN.TER]),
      level: Number(r[C_DUN.LEVEL]) || 1,
      floors: Number(r[C_DUN.FLOORS]) || 1,
      progress: Number(r[C_DUN.PROGRESS]) || 0,
      cleared: Number(r[C_DUN.CLEARED]) === 1,
      monster: Number(r[C_DUN.MONSTER]) || 0,
      rewardGold: Number(r[C_DUN.REWARD_GOLD]) || 0,
      rewardItem: String(r[C_DUN.REWARD_ITEM] || ''),
      recruit: Number(r[C_DUN.RECRUIT]) === 1
    };
  });

  const diplo = dipRows.map(function (r) {
    return {
      a: String(r[C_DIPLO.FA]), b: String(r[C_DIPLO.FB]),
      status: String(r[C_DIPLO.STATUS] || 'war'),
      expire: Number(r[C_DIPLO.EXPIRE]) || 0
    };
  });

  return { state: state, factions: factions, territories: territories,
           chars: chars, items: items, dungeons: dungeons, diplo: diplo };
}

function saveGame(game) {
  const ss = getOrCreateSpreadsheet_();

  writeSheet_(ss, SHEETS.STATE,
    ['TURN', 'PHASE', 'WINNER', 'LOG'],
    [[game.state.turn, game.state.phase, game.state.winner, game.state.log]]);

  writeSheet_(ss, SHEETS.FACTION,
    ['ID', 'NAME', 'IS_PLAYER', 'GOLD', 'COLOR', 'ALIVE', 'AP', 'ABILITY'],
    game.factions.map(function (f) {
      return [f.id, f.name, f.isPlayer ? 1 : 0, Math.round(f.gold), f.color, f.alive ? 1 : 0, f.ap, f.ability];
    }));

  writeSheet_(ss, SHEETS.TERRITORY,
    ['ID', 'NAME', 'OWNER', 'TROOPS', 'MAX_TROOPS', 'INCOME', 'DEV', 'X', 'Y', 'ADJ', 'MARKET', 'BARRACKS', 'WALL', 'TOWER'],
    game.territories.map(function (t) {
      return [t.id, t.name, t.owner, Math.round(t.troops), t.maxTroops, t.income, t.dev, t.x, t.y, t.adj.join(','),
              t.market, t.barracks, t.wall, t.tower];
    }));

  writeSheet_(ss, SHEETS.CHAR,
    ['ID', 'NAME', 'OWNER', 'UNIT', 'LEVEL', 'EXP', 'LEAD', 'WAR', 'INT', 'SKILL',
     'LOC', 'ACTED', 'ALIVE', 'LOYALTY', 'EQUIP', 'PERSONA', 'SPEECH', 'LIKES', 'CATCH', 'BIO'],
    game.chars.map(function (c) {
      return [c.id, c.name, c.owner, c.unit, c.level, Math.round(c.exp), c.lead, c.war, c.int, c.skill,
              c.loc, c.acted ? 1 : 0, c.alive ? 1 : 0, c.loyalty, c.equip,
              c.persona, c.speech, c.likes, c.catch, c.bio];
    }));

  writeSheet_(ss, SHEETS.ITEM,
    ['ID', 'NAME', 'TYPE', 'WAR', 'LEAD', 'INT', 'OWNER', 'DESC'],
    game.items.map(function (i) {
      return [i.id, i.name, i.type, i.war, i.lead, i.int, i.owner, i.desc];
    }));

  writeSheet_(ss, SHEETS.DUNGEON,
    ['ID', 'NAME', 'TER', 'LEVEL', 'FLOORS', 'PROGRESS', 'CLEARED', 'MONSTER', 'REWARD_GOLD', 'REWARD_ITEM', 'RECRUIT'],
    (game.dungeons || []).map(function (d) {
      return [d.id, d.name, d.ter, d.level, d.floors, d.progress, d.cleared ? 1 : 0,
              d.monster, d.rewardGold, d.rewardItem, d.recruit ? 1 : 0];
    }));

  writeSheet_(ss, SHEETS.DIPLO, ['FA', 'FB', 'STATUS', 'EXPIRE'],
    (game.diplo || []).map(function (d) { return [d.a, d.b, d.status, d.expire]; }));
}

function readSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  return values.slice(1);
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
  return { war: war, lead: lead, int: intel };
}
