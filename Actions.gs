// ==========================================
// 第四部分：Web 進入點與玩家指令路由
//   前端用 google.script.run.handleAction(payload) 呼叫。
// ==========================================

// Web App 進入點：回傳遊戲網頁
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('諸國爭霸')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------
// ★ 指令路由表
// ------------------------------------------
const ACTION_ROUTER = {
  'get_state':  actionGetState,
  'attack':     actionAttack,
  'recruit':    actionRecruit,
  'develop':    actionDevelop,
  'move':       actionMove,
  'end_turn':   actionEndTurn,
  'new_game':   actionNewGame
};

// 前端唯一入口。payload = { action, ...params }
function handleAction(payload) {
  try {
    payload = payload || {};
    const fn = ACTION_ROUTER[payload.action];
    if (!fn) return errorResp_('未知的指令：' + payload.action);
    return fn(payload);
  } catch (e) {
    return errorResp_('系統錯誤：' + (e && e.message ? e.message : e));
  }
}

function okResp_(game, extraLog) {
  if (extraLog) game.state.log = extraLog;
  return { ok: true, view: buildView_(game) };
}
function errorResp_(msg) {
  return { ok: false, message: msg };
}

// 只回傳前端需要的精簡視圖(不含敏感/多餘欄位)
function buildView_(game) {
  const player = playerFaction(game);
  return {
    turn: game.state.turn,
    phase: game.state.phase,
    winner: game.state.winner,
    log: game.state.log,
    playerFactionId: player ? player.id : 'F1',
    rules: RULES,
    factions: game.factions,
    territories: game.territories,
    generals: game.generals.filter(function (g) { return g.alive; })
  };
}

// ------------------------------------------
// 指令：讀取當前狀態
// ------------------------------------------
function actionGetState() {
  const game = loadGame();
  return okResp_(game);
}

// ------------------------------------------
// 指令：重開新局
// ------------------------------------------
function actionNewGame() {
  initGame();
  const game = loadGame();
  return okResp_(game, '新的征程開始了。統一天下，就在你手中。');
}

// 共用：驗證玩家的武將可行動
function requirePlayerGeneral_(game, generalId) {
  const player = playerFaction(game);
  const gen = findGeneral(game, generalId);
  if (!gen || !gen.alive) throw new Error('找不到該武將。');
  if (gen.owner !== player.id) throw new Error('這不是你的武將。');
  if (gen.acted) throw new Error(gen.name + ' 本回合已行動過了。');
  return { player: player, gen: gen };
}

// ------------------------------------------
// 指令：攻擊 { generalId, targetId, marchTroops }
// ------------------------------------------
function actionAttack(p) {
  const game = loadGame();
  if (game.state.winner) return errorResp_('遊戲已結束，請重開新局。');

  const ctx = requirePlayerGeneral_(game, p.generalId);
  const gen = ctx.gen;
  const from = findTerritory(game, gen.loc);
  const to = findTerritory(game, p.targetId);
  if (!from) return errorResp_('武將所在地異常。');
  if (!to) return errorResp_('找不到目標領地。');
  if (from.owner !== ctx.player.id) return errorResp_('你不再擁有出兵領地。');
  if (to.owner === ctx.player.id) return errorResp_('不能攻打自己的領地。');
  if (from.adj.indexOf(to.id) < 0) return errorResp_(to.name + ' 與 ' + from.name + ' 不相鄰。');

  let march = Math.floor(Number(p.marchTroops) || 0);
  if (march <= 0) return errorResp_('請指定出征兵力。');
  if (march > from.troops) return errorResp_('出征兵力超過 ' + from.name + ' 現有守軍。');

  const log = resolveBattle_(game, gen, from, to, march);
  updateAliveAndWinner_(game);
  saveGame(game);
  return okResp_(game, log + winnerSuffix_(game));
}

// ------------------------------------------
// 指令：徵兵 { generalId }  在武將所在領地徵兵
// ------------------------------------------
function actionRecruit(p) {
  const game = loadGame();
  if (game.state.winner) return errorResp_('遊戲已結束，請重開新局。');

  const ctx = requirePlayerGeneral_(game, p.generalId);
  const gen = ctx.gen, player = ctx.player;
  const ter = findTerritory(game, gen.loc);
  if (!ter || ter.owner !== player.id) return errorResp_('只能在自己的領地徵兵。');
  if (ter.troops >= ter.maxTroops) return errorResp_(ter.name + ' 兵力已達上限。');

  const add = Math.min(RULES.RECRUIT_BATCH, ter.maxTroops - ter.troops);
  const cost = add * RULES.RECRUIT_COST_PER_TROOP;
  if (player.gold < cost) return errorResp_('銀兩不足，需要 ' + cost + '。');

  ter.troops += add;
  player.gold -= cost;
  gen.acted = true;
  saveGame(game);
  return okResp_(game, '🪖 ' + gen.name + ' 在 ' + ter.name + ' 徵兵 ' + add + ' (花費 ' + cost + ' 銀兩)。');
}

// ------------------------------------------
// 指令：開發 { generalId }  提升領地收入與兵力上限
// ------------------------------------------
function actionDevelop(p) {
  const game = loadGame();
  if (game.state.winner) return errorResp_('遊戲已結束，請重開新局。');

  const ctx = requirePlayerGeneral_(game, p.generalId);
  const gen = ctx.gen, player = ctx.player;
  const ter = findTerritory(game, gen.loc);
  if (!ter || ter.owner !== player.id) return errorResp_('只能開發自己的領地。');
  if (player.gold < RULES.DEVELOP_COST) return errorResp_('銀兩不足，開發需要 ' + RULES.DEVELOP_COST + '。');

  player.gold -= RULES.DEVELOP_COST;
  ter.dev += 1;
  ter.income += RULES.DEVELOP_INCOME_GAIN;
  ter.maxTroops += RULES.DEVELOP_MAXTROOPS_GAIN;
  gen.acted = true;
  saveGame(game);
  return okResp_(game, '🏗️ ' + gen.name + ' 開發 ' + ter.name +
    '，收入 +' + RULES.DEVELOP_INCOME_GAIN + '，兵力上限 +' + RULES.DEVELOP_MAXTROOPS_GAIN + '。');
}

// ------------------------------------------
// 指令：移動 { generalId, targetId }  移到相鄰己方領地
// ------------------------------------------
function actionMove(p) {
  const game = loadGame();
  if (game.state.winner) return errorResp_('遊戲已結束，請重開新局。');

  const ctx = requirePlayerGeneral_(game, p.generalId);
  const gen = ctx.gen, player = ctx.player;
  const from = findTerritory(game, gen.loc);
  const to = findTerritory(game, p.targetId);
  if (!from || !to) return errorResp_('領地資料異常。');
  if (to.owner !== player.id) return errorResp_('只能移動到自己的領地。');
  if (from.adj.indexOf(to.id) < 0) return errorResp_('目標領地不相鄰。');

  gen.loc = to.id;
  gen.acted = true;
  saveGame(game);
  return okResp_(game, '🐎 ' + gen.name + ' 移動到 ' + to.name + '。');
}

// ------------------------------------------
// 指令：結束回合  → 收入/回補 → AI 行動 → 新回合
// ------------------------------------------
function actionEndTurn() {
  const game = loadGame();
  if (game.state.winner) return errorResp_('遊戲已結束，請重開新局。');

  const logs = [];

  // 1) AI 各勢力行動
  game.state.phase = 'AI';
  const aiLogs = aiPhase_(game);

  // 2) 經濟結算(玩家與 AI 一起收入/回補)
  economyPhase_(game);

  // 3) 勝負判定
  updateAliveAndWinner_(game);

  // 4) 重置所有武將行動狀態，回合 +1
  game.generals.forEach(function (g) { g.acted = false; });
  game.state.turn += 1;
  game.state.phase = 'PLAYER';

  const player = playerFaction(game);
  const income = territoriesOf(game, player.id).reduce(function (s, t) { return s + t.income; }, 0);

  let summary = '📅 第 ' + game.state.turn + ' 回合。本回合收入 +' + income + ' 銀兩。';
  if (aiLogs.length) summary += ' 敵軍動向：' + aiLogs.join(' ');
  summary += winnerSuffix_(game);

  saveGame(game);
  return okResp_(game, summary);
}

function winnerSuffix_(game) {
  if (game.state.winner === 'WIN')  return ' 🎉🎉 你已統一天下，霸業已成！';
  if (game.state.winner === 'LOSE') return ' 💀 你的勢力已被消滅，天下再無青龍軍……';
  return '';
}
