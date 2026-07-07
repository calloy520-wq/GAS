// ==========================================
// 第三部分：戰鬥結算與敵方 AI 引擎
//   全部由 GAS 純數值運算，不呼叫任何 API。
// ==========================================

// ------------------------------------------
// ★ 戰鬥結算
//   attacker: 進攻武將物件；fromTer: 出兵領地；toTer: 目標領地；marchTroops: 出征兵力
//   回傳結算文字敘述，並直接改動 game 內的領地/武將。
// ------------------------------------------
function resolveBattle_(game, attacker, fromTer, toTer, marchTroops) {
  const atkFac = findFaction(game, attacker.owner);
  const defGen = generalAt(game, toTer.id, toTer.owner); // 守方武將(可能沒有)
  const defFac = findFaction(game, toTer.owner);

  // 戰力 = 兵力 × (100 + 統率/武力加成) / 100 × 亂數
  const atkPower = marchTroops * (100 + attacker.war) / 100 * randFactor_(0.85, 1.15);
  const defBonus = (defGen ? defGen.lead : 0) + RULES.CITY_DEFENSE_BONUS;
  const defPower = toTer.troops * (100 + defBonus) / 100 * randFactor_(0.85, 1.15);

  const total = atkPower + defPower || 1;
  const atkRatio = atkPower / total; // 進攻方優勢比

  // 傷亡：戰力比越劣勢，死越多
  const atkLoss = Math.min(marchTroops, Math.round(marchTroops * (1 - atkRatio) * 0.9));
  const defLoss = Math.min(toTer.troops, Math.round(toTer.troops * atkRatio * 0.9));
  const atkSurv = marchTroops - atkLoss;
  const defSurv = toTer.troops - defLoss;

  let log = '⚔️ ' + attacker.name + '(' + (atkFac ? atkFac.name : '?') + ') 出兵 ' + marchTroops +
            ' 攻打 ' + toTer.name + '(' + (defFac ? defFac.name : '中立') + ' 守軍 ' + toTer.troops + ')。';

  if (atkPower > defPower && atkSurv > 0) {
    // 進攻方獲勝，佔領
    const oldOwner = toTer.owner;
    toTer.owner = attacker.owner;
    toTer.troops = atkSurv;         // 出征存活兵入城駐守
    fromTer.troops -= marchTroops;  // 出兵領地扣除派出的兵
    attacker.loc = toTer.id;        // 主將進駐新城
    attacker.acted = true;
    log += ' 🏰 攻克！' + attacker.name + ' 佔領 ' + toTer.name + '，駐軍 ' + atkSurv + '。';

    // 俘虜守將
    if (defGen && defGen.alive) {
      if (Math.random() < RULES.CAPTURE_GENERAL_CHANCE) {
        defGen.owner = attacker.owner;
        defGen.loc = toTer.id;
        defGen.acted = true;
        log += ' 🎖️ 俘獲敵將 ' + defGen.name + '，歸順麾下！';
      } else {
        defGen.alive = false;
        log += ' ' + defGen.name + ' 力戰不敵，戰死。';
      }
    }
  } else {
    // 守方守住，進攻方撤退
    toTer.troops = defSurv;
    fromTer.troops -= atkLoss;      // 出兵領地承擔陣亡，生還者退回
    attacker.acted = true;
    log += ' 🛡️ 守軍擊退了進攻，' + attacker.name + ' 折損 ' + atkLoss + ' 兵退回 ' + fromTer.name + '。';
  }

  return log;
}

// ------------------------------------------
// ★ 回合結算：收入、兵力回補
// ------------------------------------------
function economyPhase_(game) {
  game.factions.forEach(function (f) {
    if (f.id === 'F0' || !f.alive) return;
    const owned = territoriesOf(game, f.id);
    let inc = 0;
    owned.forEach(function (t) {
      inc += t.income;
      // 自然回補兵力(不超過上限)
      t.troops = Math.min(t.maxTroops, t.troops + RULES.TROOP_REGEN);
    });
    f.gold += inc;
  });
}

// ------------------------------------------
// ★ 存亡與勝負判定
// ------------------------------------------
function updateAliveAndWinner_(game) {
  game.factions.forEach(function (f) {
    if (f.id === 'F0') return;
    f.alive = territoriesOf(game, f.id).length > 0;
  });
  const player = playerFaction(game);
  const enemies = game.factions.filter(function (f) {
    return f.id !== 'F0' && !f.isPlayer && f.alive;
  });
  if (!player || !player.alive) {
    game.state.winner = 'LOSE';
  } else if (enemies.length === 0) {
    game.state.winner = 'WIN';
  }
}

// ------------------------------------------
// ★ 敵方 AI 回合
//   每個 AI 勢力的每位可行動武將：
//   1) 若所在領地兵力明顯多於某個相鄰非我方領地 → 出兵攻打(留一半守城)
//   2) 否則若有錢 → 就地徵兵補強
// ------------------------------------------
function aiPhase_(game) {
  const logs = [];
  const aiFactions = game.factions.filter(function (f) {
    return f.id !== 'F0' && !f.isPlayer && f.alive;
  });

  aiFactions.forEach(function (fac) {
    const myGenerals = game.generals.filter(function (g) {
      return g.alive && g.owner === fac.id && !g.acted;
    });

    myGenerals.forEach(function (gen) {
      const here = findTerritory(game, gen.loc);
      if (!here || here.owner !== fac.id) return;

      // 找相鄰、非本勢力、且我方兵力有優勢的目標(挑守軍最弱的)
      let best = null;
      here.adj.forEach(function (nid) {
        const nt = findTerritory(game, nid);
        if (!nt || nt.owner === fac.id) return;
        if (here.troops > nt.troops * 1.2 && here.troops > 200) {
          if (!best || nt.troops < best.troops) best = nt;
        }
      });

      if (best) {
        const march = Math.floor(here.troops * 0.7); // 留三成守城
        if (march > 0) {
          logs.push(resolveBattle_(game, gen, here, best, march));
        }
      } else if (fac.gold >= RULES.RECRUIT_COST_PER_TROOP * RULES.RECRUIT_BATCH &&
                 here.troops < here.maxTroops) {
        const add = Math.min(RULES.RECRUIT_BATCH, here.maxTroops - here.troops);
        here.troops += add;
        fac.gold -= add * RULES.RECRUIT_COST_PER_TROOP;
        gen.acted = true;
        logs.push('🔁 ' + fac.name + '：' + gen.name + ' 在 ' + here.name + ' 徵兵 ' + add + '。');
      }
    });
  });

  return logs;
}
