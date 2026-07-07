// ==========================================
// 第四部分：Web 進入點與玩家指令路由（行動點制）
// ==========================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('諸國爭霸')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const ACTION_ROUTER = {
  'get_state': actionGetState,
  'attack':    actionAttack,
  'recruit':   actionRecruit,
  'develop':   actionDevelop,
  'move':      actionMove,
  'search':    actionSearch,
  'explore':   actionExplore,
  'talk':      actionTalk,
  'equip':     actionEquip,
  'unequip':   actionUnequip,
  'end_turn':  actionEndTurn,
  'new_game':  actionNewGame
};

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
function errorResp_(msg) { return { ok: false, message: msg }; }

function buildView_(game) {
  const player = playerFaction(game);
  // 附上每個角色的有效三圍與裝備，方便前端顯示
  const chars = game.chars.filter(function (c) { return c.alive; }).map(function (c) {
    const eff = effStats(game, c);
    return {
      id: c.id, name: c.name, owner: c.owner, unit: c.unit, level: c.level, exp: c.exp,
      expNext: c.level * 100,
      lead: c.lead, war: c.war, int: c.int, eff: eff, skill: c.skill,
      loc: c.loc, acted: c.acted, loyalty: c.loyalty, equip: c.equip,
      persona: c.persona, speech: c.speech, likes: c.likes, catch: c.catch, bio: c.bio,
      equipItems: equippedItems(game, c.id).map(function (i) { return i.id; })
    };
  });
  return {
    turn: game.state.turn, phase: game.state.phase, winner: game.state.winner, log: game.state.log,
    playerFactionId: player ? player.id : 'F1',
    ap: player ? player.ap : 0,
    rules: RULES, unitLabel: UNIT_LABEL, unitAdv: UNIT_ADV, skills: SKILLS, abilities: ABILITIES,
    factions: game.factions, territories: game.territories, chars: chars,
    items: game.items.filter(function (i) { return i.owner !== 'LOCKED'; }), // 未取得的迷宮寶物不外顯
    dungeons: game.dungeons || []
  };
}

// ---- 通用檢查 ----
function requireNotOver_(game) { if (game.state.winner) throw new Error('遊戲已結束，請重開新局。'); }
function requireAP_(game, cost) {
  const p = playerFaction(game);
  if (p.ap < cost) throw new Error('行動點不足（剩 ' + p.ap + '），請結束回合。');
}
function spendAP_(game, cost) { playerFaction(game).ap -= cost; }

function requirePlayerChar_(game, charId) {
  const player = playerFaction(game);
  const ch = findChar(game, charId);
  if (!ch || !ch.alive) throw new Error('找不到該角色。');
  if (ch.owner !== player.id) throw new Error('這不是你的角色。');
  return { player: player, ch: ch };
}
function requireUnacted_(ch) { if (ch.acted) throw new Error(ch.name + ' 本回合已行動過了。'); }

// ------------------------------------------
function actionGetState() { return okResp_(loadGame()); }

function actionNewGame() {
  initGame();
  const game = loadGame();
  return okResp_(game, '亂世將起。招賢納士、開疆闢土，統一天下就靠妳的號令了。');
}

// ------------------------------------------
// 攻擊 { charId, targetId, marchTroops } — 1 AP
// ------------------------------------------
function actionAttack(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch;
  const from = findTerritory(game, ch.loc);
  const to = findTerritory(game, p.targetId);
  if (!from) return errorResp_('角色所在地異常。');
  if (!to) return errorResp_('找不到目標領地。');
  if (from.owner !== ctx.player.id) return errorResp_('你不再擁有出兵領地。');
  if (to.owner === ctx.player.id) return errorResp_('不能攻打自己的領地。');
  if (from.adj.indexOf(to.id) < 0) return errorResp_(to.name + ' 與 ' + from.name + ' 不相鄰。');

  const march = Math.floor(Number(p.marchTroops) || 0);
  if (march <= 0) return errorResp_('請指定出征兵力。');
  if (march > from.troops) return errorResp_('出征兵力超過 ' + from.name + ' 守軍。');

  spendAP_(game, 1);
  const log = resolveBattle_(game, ch, from, to, march);
  updateAliveAndWinner_(game);
  saveGame(game);
  return okResp_(game, log + winnerSuffix_(game));
}

// ------------------------------------------
// 徵兵 { charId } — 1 AP
// ------------------------------------------
function actionRecruit(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch, player = ctx.player;
  const ter = findTerritory(game, ch.loc);
  if (!ter || ter.owner !== player.id) return errorResp_('只能在自己的領地徵兵。');
  if (ter.troops >= ter.maxTroops) return errorResp_(ter.name + ' 兵力已達上限。');
  const add = Math.min(RULES.RECRUIT_BATCH, ter.maxTroops - ter.troops);
  const cost = add * RULES.RECRUIT_COST_PER_TROOP;
  if (player.gold < cost) return errorResp_('銀兩不足，需要 ' + cost + '。');

  spendAP_(game, 1);
  ter.troops += add; player.gold -= cost; ch.acted = true;
  saveGame(game);
  return okResp_(game, '🪖 ' + ch.name + ' 在 ' + ter.name + ' 徵兵 ' + add + '（花費 ' + cost + '）。');
}

// ------------------------------------------
// 開發 { charId } — 1 AP
// ------------------------------------------
function actionDevelop(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch, player = ctx.player;
  const ter = findTerritory(game, ch.loc);
  if (!ter || ter.owner !== player.id) return errorResp_('只能開發自己的領地。');
  if (player.gold < RULES.DEVELOP_COST) return errorResp_('銀兩不足，需要 ' + RULES.DEVELOP_COST + '。');

  spendAP_(game, 1);
  player.gold -= RULES.DEVELOP_COST; ter.dev += 1;
  ter.income += RULES.DEVELOP_INCOME_GAIN; ter.maxTroops += RULES.DEVELOP_MAXTROOPS_GAIN;
  ch.acted = true;
  saveGame(game);
  return okResp_(game, '🏗️ ' + ch.name + ' 開發 ' + ter.name +
    '（收入+' + RULES.DEVELOP_INCOME_GAIN + '，兵上限+' + RULES.DEVELOP_MAXTROOPS_GAIN + '）。');
}

// ------------------------------------------
// 移動 { charId, targetId } — 1 AP
// ------------------------------------------
function actionMove(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch, player = ctx.player;
  const from = findTerritory(game, ch.loc);
  const to = findTerritory(game, p.targetId);
  if (!from || !to) return errorResp_('領地資料異常。');
  if (to.owner !== player.id) return errorResp_('只能移動到自己的領地。');
  if (from.adj.indexOf(to.id) < 0) return errorResp_('目標領地不相鄰。');

  spendAP_(game, 1);
  ch.loc = to.id; ch.acted = true;
  saveGame(game);
  return okResp_(game, '🐎 ' + ch.name + ' 移動到 ' + to.name + '。');
}

// ------------------------------------------
// 搜索 { charId } — 1 AP + 銀兩，在角色所在地發掘在野女將並招攬
// ------------------------------------------
function actionSearch(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch, player = ctx.player;
  const ter = findTerritory(game, ch.loc);
  if (!ter || ter.owner !== player.id) return errorResp_('只能在自己的領地搜索。');
  if (player.gold < RULES.SEARCH_COST_GOLD) return errorResp_('銀兩不足，搜索需要 ' + RULES.SEARCH_COST_GOLD + '。');

  spendAP_(game, 1);
  player.gold -= RULES.SEARCH_COST_GOLD;
  ch.acted = true;

  const freePool = game.chars.filter(function (c) { return c.alive && c.owner === 'F0' && !c.loc; });
  if (freePool.length === 0) { saveGame(game); return okResp_(game, '🔍 ' + ch.name + ' 四處打探，但已無在野之才可尋。'); }

  // 60% 機率找到（以智謀微幅加成）
  const found = Math.random() < Math.min(0.85, 0.5 + effStats(game, ch).int / 400);
  if (!found) { saveGame(game); return okResp_(game, '🔍 ' + ch.name + ' 在 ' + ter.name + ' 遍尋不著合適人才……（花費 ' + RULES.SEARCH_COST_GOLD + '）'); }

  const recruit = freePool[Math.floor(Math.random() * freePool.length)];
  recruit.owner = player.id; recruit.loc = ter.id; recruit.loyalty = 35; recruit.acted = true;
  saveGame(game);
  return okResp_(game, '🌟 ' + ch.name + ' 在 ' + ter.name + ' 尋得在野女將【' + recruit.name + '｜' +
    UNIT_LABEL[recruit.unit] + '】！她說：' + recruit.catch + '　（已加入，駐於 ' + ter.name + '）');
}

// ------------------------------------------
// 探索 { charId } — 1 AP，挑戰角色所在領地的迷宮下一層
// ------------------------------------------
function actionExplore(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId); requireUnacted_(ctx.ch);
  const ch = ctx.ch;
  const ter = findTerritory(game, ch.loc);
  if (!ter || ter.owner !== ctx.player.id) return errorResp_('只能在自己領地的迷宮探索。');
  const dun = dungeonAt(game, ch.loc);
  if (!dun) return errorResp_('這裡沒有迷宮。');
  if (dun.cleared) return errorResp_(dun.name + ' 已通關。');

  spendAP_(game, 1);
  const log = dungeonExplore_(game, ch, dun);
  saveGame(game);
  return okResp_(game, log);
}

// ------------------------------------------
// 談話/安撫 { charId } — 1 AP，提升好感度，達門檻觸發角色事件
// ------------------------------------------
function actionTalk(p) {
  const game = loadGame(); requireNotOver_(game); requireAP_(game, 1);
  const ctx = requirePlayerChar_(game, p.charId);
  const ch = ctx.ch;

  spendAP_(game, 1);
  const before = ch.loyalty;
  ch.loyalty = Math.min(100, ch.loyalty + RULES.TALK_LOYALTY_GAIN);

  let msg = '💬 妳與 ' + ch.name + ' 談心。' + ch.name + '：「' + ch.catch + '」　好感度 ' + before + ' → ' + ch.loyalty + '。';

  // 事件門檻：跨越 50 / 100
  const ev = triggerLoyaltyEvent_(ch, before, ch.loyalty);
  if (ev) msg += '　' + ev;

  saveGame(game);
  return okResp_(game, msg);
}

// 好感事件（非成人）：跨門檻給永久小加成 + 依 persona 的劇情文字
function triggerLoyaltyEvent_(ch, before, after) {
  if (before < 50 && after >= 50) {
    ch.war = Math.min(RULES.STAT_CAP, ch.war + 2);
    return '💗【心防漸開】' + ch.name + ' 難得露出真心的笑容（' + ch.persona.split('，')[0] + '）。武力永久+2。';
  }
  if (before < 100 && after >= 100) {
    ch.war = Math.min(RULES.STAT_CAP, ch.war + 3);
    ch.lead = Math.min(RULES.STAT_CAP, ch.lead + 3);
    return '💞【生死相許】' + ch.name + ' 立誓此生只為妳而戰！武力+3、統率+3。';
  }
  return '';
}

// ------------------------------------------
// 裝備 { charId, itemId } / 卸下 { itemId } — 不耗 AP
// ------------------------------------------
function actionEquip(p) {
  const game = loadGame(); requireNotOver_(game);
  const ctx = requirePlayerChar_(game, p.charId);
  const item = findItem(game, p.itemId);
  if (!item) return errorResp_('找不到該裝備。');
  if (item.owner && item.owner !== ctx.ch.id) {
    const holder = findChar(game, item.owner);
    if (holder && holder.owner === ctx.player.id) { /* 允許在自己人之間轉移 */ }
    else return errorResp_('該裝備不在寶庫中。');
  }
  item.owner = ctx.ch.id;
  saveGame(game);
  return okResp_(game, '🗡️ ' + ctx.ch.name + ' 裝備了【' + item.name + '】。');
}

function actionUnequip(p) {
  const game = loadGame(); requireNotOver_(game);
  const item = findItem(game, p.itemId);
  if (!item) return errorResp_('找不到該裝備。');
  const holder = findChar(game, item.owner);
  const player = playerFaction(game);
  if (!holder || holder.owner !== player.id) return errorResp_('這件裝備不屬於你。');
  item.owner = '';
  saveGame(game);
  return okResp_(game, '📦 卸下了【' + item.name + '】，收回寶庫。');
}

// ------------------------------------------
// 結束回合 → AI 行動 → 收入/回補 → 新回合、重置 AP 與行動狀態
// ------------------------------------------
function actionEndTurn() {
  const game = loadGame(); requireNotOver_(game);

  game.state.phase = 'AI';
  const aiLogs = aiPhase_(game);
  economyPhase_(game);
  updateAliveAndWinner_(game);

  game.chars.forEach(function (c) { c.acted = false; });
  game.state.turn += 1;
  game.state.phase = 'PLAYER';
  const player = playerFaction(game);
  resetAP_(game, player);

  const income = territoriesOf(game, player.id).reduce(function (s, t) { return s + t.income; }, 0);
  let summary = '📅 第 ' + game.state.turn + ' 回合（行動點 ' + player.ap + '）。本回合收入 +' + income + '。';
  if (aiLogs.length) summary += ' 敵軍動向：' + aiLogs.join(' ');
  summary += winnerSuffix_(game);

  saveGame(game);
  return okResp_(game, summary);
}

function winnerSuffix_(game) {
  if (game.state.winner === 'WIN')  return ' 🎉🎉 天下一統，霸業已成！';
  if (game.state.winner === 'LOSE') return ' 💀 妳的勢力已被消滅……';
  return '';
}
