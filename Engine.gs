// ==========================================
// 第三部分：戰鬥（兵種相剋＋必殺＋裝備＋勢力能力）、養成、經濟、敵方 AI
//   全部純數值運算，不呼叫任何外部 API。
// ==========================================

// 兵種相剋倍率：attacker 對 defender
function unitMult_(atkUnit, defUnit) {
  const adv = UNIT_ADV[atkUnit] || [];
  const defAdv = UNIT_ADV[defUnit] || [];
  if (adv.indexOf(defUnit) >= 0) return RULES.ADV_MULT;      // 我克敵
  if (defAdv.indexOf(atkUnit) >= 0) return RULES.DISADV_MULT; // 敵克我
  return 1.0;
}

// 技能是否發動：基礎率 + 智謀/1000，陣營「魔導共鳴」再 +15%
function skillFires_(game, ch) {
  if (!ch || !ch.skill || !SKILLS[ch.skill]) return false;
  const fac = findFaction(game, ch.owner);
  let chance = RULES.SKILL_BASE_CHANCE + effStats(game, ch).int / 1000;
  if (fac && fac.ability === 'arcana') chance += 0.15;
  chance = Math.min(RULES.SKILL_CHANCE_CAP, chance);
  return Math.random() < chance;
}

// ------------------------------------------
// ★ 戰鬥結算
//   attacker: 進攻角色；fromTer: 出兵地；toTer: 目標地；marchTroops: 出征兵力
//   直接改動 game，回傳結算敘述字串。
// ------------------------------------------
function resolveBattle_(game, attacker, fromTer, toTer, marchTroops) {
  const atkFac = findFaction(game, attacker.owner);
  const defGen = charAt(game, toTer.id, toTer.owner);
  const defFac = findFaction(game, toTer.owner);
  const atkEff = effStats(game, attacker);

  let notes = [];

  // 基礎戰力
  let atkPower = marchTroops * (100 + atkEff.war) / 100 * randFactor_(0.9, 1.1);
  let cityBonus = RULES.CITY_DEFENSE_BONUS;
  let defExtra = defGen ? effStats(game, defGen).lead : 0;

  // 兵種相剋
  const uMult = defGen ? unitMult_(attacker.unit, defGen.unit) : 1.0;
  atkPower *= uMult;
  if (uMult > 1) notes.push('兵種克制！' + UNIT_LABEL[attacker.unit] + '剋' + UNIT_LABEL[defGen.unit]);
  else if (uMult < 1) notes.push('兵種被剋…' + UNIT_LABEL[defGen.unit] + '剋' + UNIT_LABEL[attacker.unit]);

  // 勢力能力：曙光突襲（進攻+10%）
  if (atkFac && atkFac.ability === 'vanguard') atkPower *= 1.10;

  // 進攻方技能
  let healSkill = false;
  if (skillFires_(game, attacker)) {
    const sk = SKILLS[attacker.skill];
    if (sk.type === 'atk') { atkPower *= (1 + sk.power); notes.push('✨' + attacker.name + '發動「' + sk.name + '」'); }
    else if (sk.type === 'heal') { healSkill = true; notes.push('✨' + attacker.name + '發動「' + sk.name + '」'); }
    if (sk.ignoreCityDef) { cityBonus = 0; notes.push('（無視守城）'); }
  }

  // 守方戰力
  let defBonus = defExtra + cityBonus;
  if (defFac && defFac.ability === 'fortress' && toTer.owner !== 'F0') defBonus += 15;
  // 守方技能（鐵壁）
  if (defGen && skillFires_(game, defGen)) {
    const dsk = SKILLS[defGen.skill];
    if (dsk.type === 'guard') { defBonus += dsk.power * 100; notes.push('🛡' + defGen.name + '發動「' + dsk.name + '」'); }
  }
  let defPower = toTer.troops * (100 + defBonus) / 100 * randFactor_(0.9, 1.1);

  const total = atkPower + defPower || 1;
  const atkRatio = atkPower / total;

  let atkLoss = Math.min(marchTroops, Math.round(marchTroops * (1 - atkRatio) * 0.9));
  if (healSkill) atkLoss = Math.round(atkLoss * (1 - SKILLS[attacker.skill].power)); // 治癒減傷
  const defLoss = Math.min(toTer.troops, Math.round(toTer.troops * atkRatio * 0.9));
  const atkSurv = marchTroops - atkLoss;
  const defSurv = toTer.troops - defLoss;

  let log = '⚔️ ' + attacker.name + '(' + (atkFac ? atkFac.name : '?') + ' · ' + UNIT_LABEL[attacker.unit] +
            ') 率 ' + marchTroops + ' 兵攻 ' + toTer.name +
            '(' + (defFac ? defFac.name : '中立') + ' 守軍' + toTer.troops + (defGen ? '／' + defGen.name : '') + ')。';
  if (notes.length) log += ' ' + notes.join('，') + '。';

  attacker.acted = true;

  if (atkPower > defPower && atkSurv > 0) {
    toTer.owner = attacker.owner;
    toTer.troops = atkSurv;
    fromTer.troops -= marchTroops;
    attacker.loc = toTer.id;
    log += ' 🏰攻克！駐軍 ' + atkSurv + '。';
    gainExp_(game, attacker, RULES.EXP_BASE_WIN + Math.round(defLoss / 10), function (m) { log += ' ' + m; });

    if (defGen && defGen.alive) {
      if (Math.random() < RULES.CAPTURE_GENERAL_CHANCE) {
        defGen.owner = attacker.owner; defGen.loc = toTer.id; defGen.acted = true; defGen.loyalty = 25;
        log += ' 🎖️俘獲 ' + defGen.name + '，暫時歸順（忠誠低，需安撫）！';
      } else {
        defGen.alive = false;
        log += ' ' + defGen.name + ' 戰死。';
      }
    }
  } else {
    toTer.troops = defSurv;
    fromTer.troops -= atkLoss;
    log += ' 🛡️守軍擊退，' + attacker.name + ' 折損 ' + atkLoss + ' 退回 ' + fromTer.name + '。';
    gainExp_(game, attacker, Math.round((RULES.EXP_BASE_WIN + defLoss / 10) / 2), function (m) { log += ' ' + m; });
    // 守將也獲得經驗
    if (defGen) gainExp_(game, defGen, Math.round(atkLoss / 8), function () {});
  }

  return log;
}

// ------------------------------------------
// ★ 經驗與升級
// ------------------------------------------
function expForNext_(level) { return level * 100; }
function gainExp_(game, ch, amount, onLog) {
  const fac = findFaction(game, ch.owner);
  if (fac && fac.ability === 'veteran') amount = Math.round(amount * (1 + RULES.VETERAN_BONUS)); // 白狼精兵
  ch.exp += amount;
  let ups = 0;
  while (ch.exp >= expForNext_(ch.level)) {
    ch.exp -= expForNext_(ch.level);
    ch.level += 1; ups += 1;
    ch.war  = Math.min(RULES.STAT_CAP, ch.war  + RULES.LEVEL_STAT_GAIN);
    ch.lead = Math.min(RULES.STAT_CAP, ch.lead + RULES.LEVEL_STAT_GAIN);
    ch.int  = Math.min(RULES.STAT_CAP, ch.int  + RULES.LEVEL_STAT_GAIN);
  }
  if (ups > 0 && onLog) onLog('📈' + ch.name + ' 升到 Lv.' + ch.level + '！');
}

// ------------------------------------------
// ★ 迷宮探索（單人闖關，不動用領地兵力）
//   一次探索 = 挑戰下一層。回傳結算敘述字串，直接改動 game。
// ------------------------------------------
function dungeonExplore_(game, ch, dun) {
  const eff = effStats(game, ch);
  const player = findFaction(game, ch.owner);
  const floor = dun.progress + 1;

  // 女將戰力（含裝備），必殺可觸發加成
  let hero = (eff.war * 4 + eff.lead + eff.int) * randFactor_(0.85, 1.15);
  let notes = [];
  if (skillFires_(game, ch)) {
    const sk = SKILLS[ch.skill];
    const boost = sk.type === 'guard' ? sk.power * 0.5 : sk.power;
    hero *= (1 + boost);
    notes.push('✨發動「' + sk.name + '」');
  }
  // 怪物戰力：隨樓層遞增
  const monster = dun.monster * (1 + (floor - 1) * 0.45);

  let log = '🗿 ' + ch.name + ' 探索【' + dun.name + '】第 ' + floor + '/' + dun.floors + ' 層。' +
            (notes.length ? notes.join('') + '。' : '');
  ch.acted = true;

  if (hero <= monster) {
    log += ' 👾 遭遇強敵，' + ch.name + ' 負傷撤退，未能前進（下回合可再挑戰）。';
    return log;
  }

  // 通關這一層
  dun.progress = floor;
  player.gold += RULES.DUNGEON_FLOOR_GOLD;
  gainExp_(game, ch, RULES.DUNGEON_FLOOR_EXP, function (m) { log += ' ' + m; });
  log += ' 🗡️擊破守關怪物，銀兩+' + RULES.DUNGEON_FLOOR_GOLD + '。';

  if (dun.progress >= dun.floors) {
    dun.cleared = true;
    player.gold += dun.rewardGold;
    log += ' 🏆【通關】' + dun.name + '！獲得寶藏 ' + dun.rewardGold + ' 銀兩';
    // 寶物入寶庫
    if (dun.rewardItem) {
      const it = findItem(game, dun.rewardItem);
      if (it && it.owner === 'LOCKED') { it.owner = ''; log += '、寶物【' + it.name + '】入寶庫'; }
    }
    // 招募深處在野女將
    if (dun.recruit) {
      const pool = game.chars.filter(function (c) { return c.alive && c.owner === 'F0' && !c.loc; });
      if (pool.length) {
        const r = pool[Math.floor(Math.random() * pool.length)];
        r.owner = ch.owner; r.loc = ch.loc; r.loyalty = 40;
        log += '，並救出被困的在野女將【' + r.name + '｜' + UNIT_LABEL[r.unit] + '】加入！';
      }
    }
    log += '。';
    gainExp_(game, ch, RULES.DUNGEON_FLOOR_EXP * 2, function (m) { log += ' ' + m; });
  }
  return log;
}

// ------------------------------------------
// ★ 經濟：收入 + 兵力回補
// ------------------------------------------
function economyPhase_(game) {
  game.factions.forEach(function (f) {
    if (f.id === 'F0' || !f.alive) return;
    let inc = 0;
    territoriesOf(game, f.id).forEach(function (t) {
      inc += t.income;
      t.troops = Math.min(t.maxTroops, t.troops + RULES.TROOP_REGEN);
    });
    if (f.ability === 'wealth') inc = Math.round(inc * (1 + RULES.WEALTH_BONUS)); // 蒼海貿易
    f.gold += inc;
  });
}

// ------------------------------------------
// ★ 存亡與勝負
// ------------------------------------------
function updateAliveAndWinner_(game) {
  game.factions.forEach(function (f) {
    if (f.id === 'F0') return;
    f.alive = territoriesOf(game, f.id).length > 0;
  });
  const player = playerFaction(game);
  const enemies = game.factions.filter(function (f) { return f.id !== 'F0' && !f.isPlayer && f.alive; });
  if (!player || !player.alive) game.state.winner = 'LOSE';
  else if (enemies.length === 0) game.state.winner = 'WIN';
}

// 依領地數重算某勢力的行動點
function resetAP_(game, fac) {
  fac.ap = RULES.AP_BASE + Math.floor(territoriesOf(game, fac.id).length / RULES.AP_PER_TERRITORIES);
}

// 停戰到期解除（回到戰爭）
function expireCeasefires_(game) {
  game.diplo = (game.diplo || []).filter(function (d) {
    return !(d.status === 'ceasefire' && d.expire && game.state.turn >= d.expire);
  });
}

// 回合上限時的結局評定（勝負未定時呼叫）
function computeEnding_(game) {
  const player = playerFaction(game);
  if (!player || !player.alive) { game.state.winner = 'LOSE'; return; }
  const playerCount = territoriesOf(game, player.id).length;
  let maxOther = 0;
  game.factions.forEach(function (f) {
    if (f.id === 'F0' || f.isPlayer || !f.alive) return;
    const c = territoriesOf(game, f.id).length;
    if (c > maxOther) maxOther = c;
  });
  game.state.winner = (playerCount >= maxOther) ? 'TIMEUP_A' : 'TIMEUP_B';
}

// ------------------------------------------
// ★ 敵方 AI 回合（規則式，非 LLM）
// ------------------------------------------
function aiPhase_(game) {
  const logs = [];
  const aiFactions = game.factions.filter(function (f) { return f.id !== 'F0' && !f.isPlayer && f.alive; });

  aiFactions.forEach(function (fac) {
    const myChars = game.chars.filter(function (c) { return c.alive && c.owner === fac.id && !c.acted && c.loc; });

    myChars.forEach(function (ch) {
      const here = findTerritory(game, ch.loc);
      if (!here || here.owner !== fac.id) return;

      // 找相鄰、非我方、兵力有優勢的目標
      let best = null;
      here.adj.forEach(function (nid) {
        const nt = findTerritory(game, nid);
        if (!nt || nt.owner === fac.id) return;
        // 尊重同盟/停戰：不攻打盟友或停戰對象
        const rel = relStatus(game, fac.id, nt.owner);
        if (rel === 'ally' || rel === 'ceasefire') return;
        if (here.troops > nt.troops * 1.15 && here.troops > 200) {
          if (!best || nt.troops < best.troops) best = nt;
        }
      });

      if (best) {
        const march = Math.floor(here.troops * 0.7);
        if (march > 0) logs.push(resolveBattle_(game, ch, here, best, march));
      } else if (fac.gold >= RULES.RECRUIT_COST_PER_TROOP * RULES.RECRUIT_BATCH && here.troops < here.maxTroops) {
        const add = Math.min(RULES.RECRUIT_BATCH, here.maxTroops - here.troops);
        here.troops += add; fac.gold -= add * RULES.RECRUIT_COST_PER_TROOP; ch.acted = true;
        logs.push('🔁 ' + fac.name + '：' + ch.name + ' 於 ' + here.name + ' 徵兵 ' + add + '。');
      }
    });
  });

  return logs;
}
