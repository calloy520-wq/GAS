// ==========================================
// 第二部分：資料存取層 (Data Access)
//   一次把整局讀進記憶體物件 → 運算 → 一次寫回。
//   MVP 規模(十幾格地圖/武將)這樣最單純也夠快。
// ==========================================

// 讀取整局遊戲狀態，回傳結構化物件
function loadGame() {
  const ss = getOrCreateSpreadsheet_();

  const stateRows = readSheet_(ss, SHEETS.STATE);
  const facRows   = readSheet_(ss, SHEETS.FACTION);
  const terRows   = readSheet_(ss, SHEETS.TERRITORY);
  const genRows   = readSheet_(ss, SHEETS.GENERAL);

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
      alive: Number(r[C_FAC.ALIVE]) === 1
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
      adj: String(r[C_TER.ADJ] || '').split(',').map(function (a) { return a.trim(); }).filter(String)
    };
  });

  const generals = genRows.map(function (r) {
    return {
      id: String(r[C_GEN.ID]), name: String(r[C_GEN.NAME]),
      owner: String(r[C_GEN.OWNER]),
      lead: Number(r[C_GEN.LEAD]) || 0,
      war: Number(r[C_GEN.WAR]) || 0,
      int: Number(r[C_GEN.INT]) || 0,
      loc: String(r[C_GEN.LOC]),
      acted: Number(r[C_GEN.ACTED]) === 1,
      alive: Number(r[C_GEN.ALIVE]) === 1
    };
  });

  return { state: state, factions: factions, territories: territories, generals: generals };
}

// 把整局寫回試算表
function saveGame(game) {
  const ss = getOrCreateSpreadsheet_();

  writeSheet_(ss, SHEETS.STATE,
    ['TURN', 'PHASE', 'WINNER', 'LOG'],
    [[game.state.turn, game.state.phase, game.state.winner, game.state.log]]);

  writeSheet_(ss, SHEETS.FACTION,
    ['ID', 'NAME', 'IS_PLAYER', 'GOLD', 'COLOR', 'ALIVE'],
    game.factions.map(function (f) {
      return [f.id, f.name, f.isPlayer ? 1 : 0, Math.round(f.gold), f.color, f.alive ? 1 : 0];
    }));

  writeSheet_(ss, SHEETS.TERRITORY,
    ['ID', 'NAME', 'OWNER', 'TROOPS', 'MAX_TROOPS', 'INCOME', 'DEV', 'X', 'Y', 'ADJ'],
    game.territories.map(function (t) {
      return [t.id, t.name, t.owner, Math.round(t.troops), t.maxTroops, t.income, t.dev, t.x, t.y, t.adj.join(',')];
    }));

  writeSheet_(ss, SHEETS.GENERAL,
    ['ID', 'NAME', 'OWNER', 'LEAD', 'WAR', 'INT', 'LOC', 'ACTED', 'ALIVE'],
    game.generals.map(function (g) {
      return [g.id, g.name, g.owner, g.lead, g.war, g.int, g.loc, g.acted ? 1 : 0, g.alive ? 1 : 0];
    }));
}

// 讀取某工作表(去掉表頭)。若不存在回傳空陣列。
function readSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  return values.slice(1); // 去掉 header
}

// ------------------------------------------
// 便利查詢工具
// ------------------------------------------
function findTerritory(game, id) {
  return game.territories.filter(function (t) { return t.id === id; })[0] || null;
}
function findGeneral(game, id) {
  return game.generals.filter(function (g) { return g.id === id; })[0] || null;
}
function findFaction(game, id) {
  return game.factions.filter(function (f) { return f.id === id; })[0] || null;
}
function playerFaction(game) {
  return game.factions.filter(function (f) { return f.isPlayer; })[0] || null;
}
// 某勢力擁有的領地
function territoriesOf(game, facId) {
  return game.territories.filter(function (t) { return t.owner === facId; });
}
// 某領地上、仍存活的守將(第一位)
function generalAt(game, terId, facId) {
  return game.generals.filter(function (g) {
    return g.alive && g.loc === terId && (facId ? g.owner === facId : true);
  })[0] || null;
}
