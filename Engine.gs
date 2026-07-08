// ============================================================
// 傭兵之城 · D&D 版 — 引擎（骰子 / 建角 / 升級 / 地下城 DM）
// 所有隨機與戰鬥都在此後端執行，回傳結算給前端。
// ============================================================

// ---------- 骰子 ----------
function d(sides){ return Math.floor(Math.random() * sides) + 1; }
function rollDice(n, sides){ var s=0; for (var i=0;i<n;i++) s+=d(sides); return s; }
function roll4d6dropLow(){
  var a=[d(6),d(6),d(6),d(6)];
  a.sort(function(x,y){return x-y;});
  return a[1]+a[2]+a[3];               // 去掉最低
}
function rint(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function uid(){ return 'c' + Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36); }

// ---------- 建立角色 ----------
function validBase_(base){
  if (!base) return false;
  for (var i=0;i<ABILITIES.length;i++){ var v=base[ABILITIES[i]]; if (typeof v!=='number' || v<3 || v>18) return false; }
  return true;
}
function makeChar(name, job, portrait, seed, base, race){
  var ci = classInfo(job);
  if (!ci) throw new Error('未知職業：' + job);
  var useBase = validBase_(base);
  var bb = {};
  ABILITIES.forEach(function(a){ bb[a] = useBase ? base[a] : roll4d6dropLow(); });
  // 種族一次性屬性加值（創角時套用）
  var ri = raceInfo(race);
  if (ri){ for (var a in ri.grow){ bb[a] = Math.min(20, (bb[a]||10) + ri.grow[a]); } }
  base = bb;
  var c = {
    id: uid(), name: (name||'無名').slice(0,16), job: job, race: (ri? race : 'human'), support: isSupport(job),
    portrait: portrait || '', seed: seed || 0,
    level: 1, xp: 0, base: base,
    equip: { weapon:null, armor:null, trinket:null },
    hp: 0, maxhp: 0
  };
  c.maxhp = maxHpOf(c);
  c.hp = c.maxhp;
  return c;
}

// 有效屬性 = 基礎 + 飾品
function abilityOf(c, a){
  var v = c.base[a] || 10;
  var t = c.equip && c.equip.trinket ? gearById(c.equip.trinket) : null;
  if (t && t.ab === a) v += t.val;
  return v;
}
function maxHpOf(c){
  var ci = classInfo(c.job); var hd = ci.hd || 8;
  var conM = mod(abilityOf(c,'con'));
  var hp = hd + conM;                                   // 1級：滿骰
  var per = Math.floor(hd/2) + 1 + conM;                // 之後每級：平均值
  hp += (c.level - 1) * Math.max(1, per);
  return Math.max(1, hp);
}
// 戰鬥衍生數值
function combatStats(c){
  var ci = classInfo(c.job);
  var atkAb = ci.atk;
  var prof = profByLevel(c.level);
  var w = c.equip.weapon ? gearById(c.equip.weapon) : null;
  var a = c.equip.armor ? gearById(c.equip.armor) : null;
  var atkBonus = mod(abilityOf(c, atkAb)) + prof + (w ? w.bonus : 0);
  var dmgDice = w ? w.dmg : ci.dmg;
  var dmgBonus = mod(abilityOf(c, atkAb)) + (w ? w.bonus : 0);
  var ac = 10 + mod(abilityOf(c,'dex')) + (a ? a.ac : 0);
  return { atkBonus:atkBonus, dmgDice:dmgDice, dmgBonus:dmgBonus, ac:ac, atkAb:atkAb, prof:prof };
}

// ---------- 升級 ----------
function xpForNext(level){ return level * 100 + (level-1)*(level-1)*20; }
function grantXp(c, amount){
  c.xp += amount; var ups = [];
  while (c.xp >= xpForNext(c.level)){
    c.xp -= xpForNext(c.level);
    c.level++;
    var ci = classInfo(c.job);
    var g = ci.grow || {};
    for (var a in g){ c.base[a] = Math.min(20, (c.base[a]||10) + g[a]); }
    var oldMax = c.maxhp;
    c.maxhp = maxHpOf(c);
    if (c.hp > 0) c.hp += (c.maxhp - oldMax);            // 升級補回增加的血（陣亡者維持 0，須回旅館救治）
    ups.push({ level:c.level, hp:c.maxhp });
  }
  return ups;
}

// ============================================================
//  地下城 DM — 一鍵自動探索到指定樓層
//  team: { battle:[char,...], support:[char,...] }  皆為完整角色物件的複本
//  回傳完整戰報物件
// ============================================================
function runDungeon(team, targetFloor){
  targetFloor = Math.max(1, Math.min(CFG.MAX_FLOOR, targetFloor|0));
  var heroes = team.battle.filter(Boolean);
  var supports = team.support.filter(Boolean);

  // 後勤增益彙整
  var buff = { atk:0, gold:0, xp:0, heal:0, crit:0 };
  supports.forEach(function(s){
    var sc = SUPPORT_CLASSES[s.job]; if (!sc) return;
    buff[sc.buff] += sc.val;
  });

  var report = { target:targetFloor, reached:0, cleared:false, wiped:false,
    gold:0, xp:0, loot:[], floors:[], levelUps:[] };

  // 復原戰鬥狀態（_allies 供牧師群補/復活使用）
  heroes.forEach(function(h){ if (h.hp<=0) h.hp = 1; h._cs = combatStats(h); h._charge = 0; h._allies = heroes; });

  for (var f=1; f<=targetFloor; f++){
    var floorLog = { floor:f, encounters:[], gold:0, xp:0, loot:[], boss:false, event:null };
    var isBoss = (f % 5 === 0);

    // 事件（非首層有機率）
    if (!isBoss && f>1){
      var er = Math.random();
      if (er < 0.14){ var tg = Math.round(rint(6,16) * (1+buff.gold)); report.gold+=tg; floorLog.gold+=tg; floorLog.event='💰 發現寶箱 +'+tg+'🪙'; }
      else if (er < 0.24){ var trapDmg = rint(2, 4+f); var victim = pickAlive(heroes);
        if (buff.crit>0 && Math.random()<0.6){ floorLog.event='🍀 占卜師預警，全隊避開了陷阱'; }
        else if (victim){ victim.hp = Math.max(0, victim.hp-trapDmg); floorLog.event='🩸 觸發陷阱！'+victim.name+' 受到 '+trapDmg+' 傷害'; if(victim.hp<=0) floorLog.event+='（倒下）'; }
      }
    }

    // 遭遇戰
    var enemies = spawnEnemies(f, isBoss);
    floorLog.boss = isBoss;
    var enc = resolveCombat(heroes, enemies, buff, f);
    floorLog.encounters.push(enc);

    // 全滅判定
    if (aliveList(heroes).length === 0){
      report.wiped = true; report.reached = f;
      floorLog.wipe = true; report.floors.push(floorLog);
      break;
    }

    // 每層結算：金幣 / 經驗 / 掉落
    var gGold = Math.round(enc.gold * (1 + buff.gold));
    var gXp   = Math.round(enc.xp   * (1 + buff.xp));
    report.gold += gGold; report.xp += gXp;
    floorLog.gold += gGold; floorLog.xp += gXp;

    // 掉落（boss 必掉，普通有機率；商人加成）
    var dropChance = (isBoss ? 1 : 0.28 + buff.gold*0.2);
    if (Math.random() < dropChance){
      var g = rollLoot(f, isBoss);
      if (g){ report.loot.push(g.id); floorLog.loot.push(g); }
    }

    // 醫者：每層自動治療
    if (buff.heal > 0){
      heroes.forEach(function(h){ if (h.hp>0){ var heal=Math.round(h.maxhp*buff.heal); h.hp=Math.min(h.maxhp,h.hp+heal); } });
    }

    report.reached = f;
    report.floors.push(floorLog);
  }

  report.cleared = (report.reached >= targetFloor && !report.wiped);

  // 經驗分配 → 升級（戰鬥位全額，後勤位半額）
  heroes.forEach(function(h){ report.levelUps = report.levelUps.concat(tagUps(h, grantXp(h, report.xp))); });
  supports.forEach(function(s){ report.levelUps = report.levelUps.concat(tagUps(s, grantXp(s, Math.round(report.xp*0.5)))); });

  return report;
}

function tagUps(c, ups){ return ups.map(function(u){ return { name:c.name, level:u.level }; }); }

function spawnEnemies(floor, isBoss){
  var list = [];
  if (isBoss){
    var b = BOSSES[Math.min(BOSSES.length-1, Math.floor((floor-1)/5))];
    list.push(mkMonster(b, floor, true));
    var adds = Math.min(2, Math.floor(floor/8));
    for (var i=0;i<adds;i++) list.push(mkMonster(pick(MONSTERS), floor, false));
  } else {
    var n = 1 + (Math.random()<0.55?1:0) + (floor>=6 && Math.random()<0.4?1:0);
    for (var j=0;j<n;j++) list.push(mkMonster(pick(MONSTERS), floor, false));
  }
  return list;
}
function mkMonster(m, floor, boss){
  var scale = 1 + (floor-1)*0.12;
  var maxhp = Math.round((m.hd*6 + m.hd) * scale);
  return { nm:m.nm, ico:m.ico, ac:m.ac + Math.floor(floor/6), maxhp:maxhp, hp:maxhp,
    atkBonus:m.atk + Math.floor(floor/5), dmg:m.dmg,
    xp:Math.round(m.xp*scale), gold:rint(m.gold[0],m.gold[1]), boss:!!boss };
}

// ---------- 一場遭遇戰（回合制、GAS 擲骰）----------
function resolveCombat(heroes, enemies, buff, floor){
  var log = { enemies: enemies.map(function(e){return {nm:e.nm,ico:e.ico};}),
    rounds:0, gold:0, xp:0, killed:0, lines:[] };
  var guard = 0;
  while (aliveList(heroes).length>0 && aliveList(enemies).length>0 && guard<40){
    guard++; log.rounds++;
    // 我方行動
    aliveList(heroes).forEach(function(h){
      if (aliveList(enemies).length===0) return;
      h._charge = (h._charge||0) + 1;
      var ci = COMBAT_CLASSES[h.job];
      if (ci && h._charge >= 3){ h._charge = 0; heroSkill(h, enemies, buff, log); }
      else heroAttack(h, enemies, buff, log);
    });
    // 敵方行動
    aliveList(enemies).forEach(function(e){
      var t = pickAlive(heroes); if (!t) return;
      var atk = d(20) + e.atkBonus;
      var cs = t._cs || combatStats(t);
      if (atk >= cs.ac || atk - e.atkBonus === 20){
        var dmg = rollDice(e.dmg[0], e.dmg[1]) + Math.floor(floor/6);
        t.hp = Math.max(0, t.hp - dmg);
        if (t.hp<=0) log.lines.push('💀 '+t.name+' 被'+e.nm+'擊倒');
      }
    });
  }
  // 結算掉落
  enemies.forEach(function(e){ if (e.hp<=0){ log.gold+=e.gold; log.xp+=e.xp; log.killed++; } });
  return log;
}

function heroAttack(h, enemies, buff, log){
  var cs = h._cs || (h._cs = combatStats(h));
  var t = frontAlive(enemies); if (!t) return;
  var natural = d(20);
  var atk = natural + cs.atkBonus + (buff.atk||0);
  var crit = (natural === 20) || (Math.random() < (buff.crit||0));
  if (atk >= t.ac || natural === 20){
    var dmg = rollDice(cs.dmgDice[0], cs.dmgDice[1]) + cs.dmgBonus;
    if (crit) dmg += rollDice(cs.dmgDice[0], cs.dmgDice[1]);
    t.hp = Math.max(0, t.hp - dmg);
  }
}
function heroSkill(h, enemies, buff, log){
  var ci = COMBAT_CLASSES[h.job]; var cs = h._cs || (h._cs = combatStats(h));
  var k = ci.skill.kind;
  if (k === 'aoe'){
    aliveList(enemies).forEach(function(e){ var dmg=rollDice(cs.dmgDice[0],cs.dmgDice[1])+cs.dmgBonus; e.hp=Math.max(0,e.hp-dmg); });
    log.lines.push('🔥 '+h.name+'施放「'+ci.skill.nm+'」橫掃全體');
  } else if (k === 'heal'){
    var team = h._team || [];
    // 治療全隊 + 復活一名（team 由 runDungeon 綁定）
    (h._allies||[]).forEach(function(a){ if(a.hp>0){ a.hp=Math.min(a.maxhp, a.hp+rollDice(2,8)+mod(abilityOf(h,'wis'))); } });
    var dead=(h._allies||[]).filter(function(a){return a.hp<=0;})[0];
    if (dead){ dead.hp=Math.round(dead.maxhp*0.4); log.lines.push('✨ '+h.name+'「聖光」復活了 '+dead.name); }
    else log.lines.push('✨ '+h.name+'施放「聖光」治療全隊');
  } else if (k === 'multi'){
    var t=frontAlive(enemies); if(t){ for(var i=0;i<3;i++){ if(t.hp<=0)t=frontAlive(enemies); if(!t)break; var dmg=rollDice(cs.dmgDice[0],cs.dmgDice[1])+cs.dmgBonus; t.hp=Math.max(0,t.hp-dmg);} log.lines.push('🏹 '+h.name+'「瞄準連射」'); }
  } else if (k === 'double' || k==='smite' || k==='sneak'){
    var tt=frontAlive(enemies); if(tt){ var mult=(k==='sneak'?3:2); var dmg=0; for(var j=0;j<mult;j++) dmg+=rollDice(cs.dmgDice[0],cs.dmgDice[1]); dmg+=cs.dmgBonus; tt.hp=Math.max(0,tt.hp-dmg);
      if(k==='smite') h.hp=Math.min(h.maxhp,h.hp+rollDice(1,6));
      log.lines.push(ci.ico+' '+h.name+'「'+ci.skill.nm+'」重擊'); }
  } else { heroAttack(h, enemies, buff, log); }
}

function rollLoot(floor, isBoss){
  var tier = lootTierForFloor(floor);
  if (isBoss) tier = Math.min(4, tier+1);
  var pool = WEAPONS.concat(ARMORS).concat(TRINKETS).filter(function(g){ return g.tier <= tier && g.tier >= Math.max(1,tier-1); });
  if (!pool.length) return null;
  return pick(pool);
}

// ---------- 小工具 ----------
function aliveList(arr){ return arr.filter(function(u){ return u.hp>0; }); }
function pickAlive(arr){ var a=aliveList(arr); return a.length?a[Math.floor(Math.random()*a.length)]:null; }
function frontAlive(arr){ return aliveList(arr)[0]; }
