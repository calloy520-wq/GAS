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

// ---------- 稀有度招募 ----------
function rollRarity(){
  var tot=0; RARITY.forEach(function(r){ tot+=r.w; });
  var x = Math.random()*tot;
  for (var i=0;i<RARITY.length;i++){ x-=RARITY[i].w; if (x<0) return RARITY[i].key; }
  return 'common';
}
function rollBaseByRarity(rk){
  var r = rarityInfo(rk), base={};
  ABILITIES.forEach(function(a){
    var v = r.bestOf2 ? Math.max(roll4d6dropLow(), roll4d6dropLow()) : roll4d6dropLow();
    if (r.floor) v = Math.max(r.floor, v);
    v += (r.allBonus||0);
    base[a] = Math.min(20, v);
  });
  if (r.twoBonus){ var ks=ABILITIES.slice(); for (var i=0;i<2;i++){ var k=ks.splice(Math.floor(Math.random()*ks.length),1)[0]; base[k]=Math.min(20, base[k]+1); } }
  return base;
}
function genCandidate(deepest, rosterSize){
  var support = Math.random() < 0.32;
  var pool = support ? Object.keys(SUPPORT_CLASSES) : Object.keys(COMBAT_CLASSES);
  var job = pool[Math.floor(Math.random()*pool.length)];
  var race = RACE_KEYS[Math.floor(Math.random()*RACE_KEYS.length)];
  var rk = rollRarity();
  var base = rollBaseByRarity(rk);
  var cost = Math.round((60 + (deepest||0)*8) * rarityInfo(rk).costMul * (1 + (rosterSize||0)*0.12));
  return { cid:'cand'+uid(), job:job, race:race, rarity:rk, base:base, cost:cost };
}

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
  if (t && t.abs && t.abs[a]) v += t.abs[a];
  if (c.traits) c.traits.forEach(function(k){ var tr=TRAITS[k]; if (tr && tr.grow && tr.grow[a]) v += tr.grow[a]; });
  return v;
}
// 授予特質（去重、上限 4、重算生命）
function awardTrait(c, key){
  if (!TRAITS[key]) return null;
  if (!c.traits) c.traits = [];
  if (c.traits.length >= 4 || c.traits.indexOf(key) >= 0) return null;
  c.traits.push(key);
  var oldMax = c.maxhp; c.maxhp = maxHpOf(c);
  if (c.hp > 0) c.hp = Math.min(c.maxhp, c.hp + Math.max(0, c.maxhp - oldMax));
  if (c.hp > c.maxhp) c.hp = c.maxhp;
  return key;
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

// 技能檢定：全隊取「最擅長者」擲 d20＋屬性修正＋(熟練?熟練加值:0)，比 DC
function skillCheck(party, skill, dc){
  var ab = SKILLS[skill].ab, best=-99, by=null;
  party.forEach(function(c){
    var v = d(20) + mod(abilityOf(c, ab)) + (hasSkill(c, skill) ? profByLevel(c.level) : 0);
    if (v > best){ best=v; by=c; }
  });
  return { pass: best >= dc, total:best, by:by || party[0], skill:skill };
}

// ============================================================
//  地下城 DM — 一鍵自動探索到指定樓層
//  team: { battle:[char,...], support:[char,...] }  皆為完整角色物件的複本
//  回傳完整戰報物件
// ============================================================
function runDungeon(team, startFloor, targetFloor){
  startFloor = Math.max(1, Math.min(CFG.MAX_FLOOR, startFloor|0 || 1));
  targetFloor = Math.max(startFloor, Math.min(CFG.MAX_FLOOR, targetFloor|0));
  var heroes = team.battle.filter(Boolean);
  var supports = team.support.filter(Boolean);

  // 後勤增益彙整
  var buff = { atk:0, gold:0, xp:0, heal:0, crit:0 };
  supports.forEach(function(s){
    var sc = SUPPORT_CLASSES[s.job]; if (!sc) return;
    buff[sc.buff] += sc.val;
  });

  var report = { start:startFloor, target:targetFloor, reached:startFloor-1, cleared:false, wiped:false,
    gold:0, xp:0, kills:0, loot:[], floors:[], levelUps:[], traitGains:[] };

  // 復原戰鬥狀態（_allies 供牧師群補/復活使用）
  heroes.forEach(function(h){ if (h.hp<=0) h.hp = 1; h._cs = combatStats(h); h._charge = 0; h._allies = heroes; });
  var party = heroes.concat(supports);                       // 技能檢定用全隊（含後勤）

  for (var f=startFloor; f<=targetFloor; f++){
    var floorLog = { floor:f, encounters:[], gold:0, xp:0, loot:[], boss:false, event:null, skills:[] };
    var isBoss = (f % 5 === 0);
    var dc = 10 + Math.floor(f*0.7);

    // 探索技能檢定（非起始層）
    if (f>startFloor){
      // 察覺：找隱藏財寶
      var per = skillCheck(party, 'perception', dc);
      if (per.pass && Math.random()<0.5){ var pg=Math.round(rint(8,18)*(1+buff.gold)); report.gold+=pg; floorLog.gold+=pg; floorLog.skills.push('🔍 '+per.by.name+' 察覺發現暗格 +'+pg+'🪙'); }
      // 陷阱：運動/求生 檢定閃避
      if (!isBoss && Math.random()<0.22){
        var save = skillCheck(party,'athletics',dc); var save2 = skillCheck(party,'survival',dc);
        if (save.pass || save2.pass || (buff.crit>0 && Math.random()<0.6)){ floorLog.skills.push('🤸 '+((save.pass?save.by:save2.pass?save2.by:party[0]).name)+' 憑身手避開了陷阱'); }
        else { var trapDmg=rint(2,4+f); var victim=pickAlive(heroes); if(victim){ victim.hp=Math.max(0,victim.hp-trapDmg); floorLog.skills.push('🩸 觸發陷阱！'+victim.name+' −'+trapDmg+(victim.hp<=0?'（倒下）':'')); } }
      }
    }

    // 隱匿：潛行偷襲 → 先手一輪
    var surprise = false;
    if (!isBoss){ var st = skillCheck(party,'stealth',dc); if (st.pass && Math.random()<0.5){ surprise=true; floorLog.skills.push('🥷 '+st.by.name+' 帶隊潛行，取得偷襲先手'); } }

    // 遭遇戰
    var enemies = spawnEnemies(f, isBoss);
    floorLog.boss = isBoss;
    var enc = resolveCombat(heroes, enemies, buff, f, surprise);
    floorLog.encounters.push(enc);
    report.kills += (enc.killed||0);

    // 全滅判定
    if (aliveList(heroes).length === 0){
      report.wiped = true; report.reached = f;
      floorLog.wipe = true; report.floors.push(floorLog);
      break;
    }

    // 打贏頭目 → 有機率獲得正面稱號
    if (isBoss && Math.random() < 0.6){
      var winner = pick(aliveList(heroes));
      if (winner){ var tk = awardTrait(winner, pick(TRAIT_GOOD));
        if (tk){ report.traitGains.push({ name:winner.name, key:tk, good:true }); floorLog.skills.push('🏅 '+winner.name+' 因擊破頭目獲得稱號「'+TRAITS[tk].nm+'」'); } }
    }

    // 每層結算：金幣 / 經驗 / 掉落
    var gGold = Math.round(enc.gold * (1 + buff.gold));
    var gXp   = Math.round(enc.xp   * (1 + buff.xp));
    report.gold += gGold; report.xp += gXp;
    floorLog.gold += gGold; floorLog.xp += gXp;

    // 掉落（boss 必掉，普通有機率；商人加成＋巧手開鎖）
    var deft = skillCheck(party,'sleight',dc);
    var dropChance = (isBoss ? 1 : 0.28 + buff.gold*0.2 + (deft.pass?0.25:0));
    if (Math.random() < dropChance){
      var g = rollLoot(f, isBoss);
      if (g){ report.loot.push(g.id); floorLog.loot.push(g); if(deft.pass && Math.random()<0.4) floorLog.skills.push('🔓 '+deft.by.name+' 巧手開鎖，多拿了戰利品'); }
    }

    // 醫者增益 ＋ 醫療技能：每層自動治療
    if (buff.heal > 0){
      heroes.forEach(function(h){ if (h.hp>0){ var heal=Math.round(h.maxhp*buff.heal); h.hp=Math.min(h.maxhp,h.hp+heal); } });
    }
    var med = skillCheck(party,'medicine',dc);
    if (med.pass){ heroes.forEach(function(h){ if (h.hp>0){ h.hp=Math.min(h.maxhp, h.hp+Math.round(h.maxhp*0.05)); } }); floorLog.skills.push('⛑️ '+med.by.name+' 施以急救，全隊小幅回復'); }

    report.reached = f;
    report.floors.push(floorLog);
  }

  report.cleared = (report.reached >= targetFloor && !report.wiped);

  // 九死一生：曾倒下但撐過整趟的夥伴 → 留下不屈（正）或舊傷/懼暗（負）
  if (!report.wiped){
    heroes.forEach(function(h){
      if (h._downed && h.hp > 0 && Math.random() < 0.5){
        var tk = awardTrait(h, Math.random()<0.4 ? 'unbreak' : pick(TRAIT_BAD));
        if (tk) report.traitGains.push({ name:h.name, key:tk, good:!!TRAITS[tk].good });
      }
    });
  }

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
    var n = 1 + (Math.random()<0.55?1:0) + (floor>=6 && Math.random()<0.45?1:0) + (floor>=14 && Math.random()<0.5?1:0);
    for (var j=0;j<n;j++) list.push(mkMonster(pick(MONSTERS), floor, false));
  }
  return list;
}
function mkMonster(m, floor, boss){
  var scale = 1 + (floor-1)*0.19 + Math.max(0,floor-15)*0.05;   // 深層(>15)額外變硬
  var goldScale = 1 + (floor-1)*0.15;                            // 金幣隨樓層成長：深潛更值錢（修正中期太窮）
  var maxhp = Math.round((m.hd*6 + m.hd) * scale);
  return { nm:m.nm, ico:m.ico, ac:m.ac + Math.floor(floor/5), maxhp:maxhp, hp:maxhp,
    atkBonus:m.atk + Math.floor(floor/3), dmg:m.dmg,
    xp:Math.round(m.xp*scale), gold:Math.round(rint(m.gold[0],m.gold[1])*goldScale), boss:!!boss };
}

// ---------- 一場遭遇戰（回合制、GAS 擲骰）----------
function resolveCombat(heroes, enemies, buff, floor, surprise){
  var log = { enemies: enemies.map(function(e){return {nm:e.nm,ico:e.ico};}),
    rounds:0, gold:0, xp:0, killed:0, lines:[] };
  // 結構化戰鬥事件（給前端播放戰鬥畫面用）
  enemies.forEach(function(e,i){ e._i = i; });
  log.party = heroes.map(function(h){ var ci=COMBAT_CLASSES[h.job]||SUPPORT_CLASSES[h.job]||{}; return { id:h.id, name:h.name, portrait:h.portrait||'', ico:ci.ico||'❓', hp:h.hp, maxhp:h.maxhp }; });
  log.foes = enemies.map(function(e){ return { nm:e.nm, ico:e.ico, hp:e.hp, maxhp:e.hp }; });
  log.ev = [];
  // 偷襲先手：我方先免費行動一輪
  if (surprise){
    log.lines.push('🥷 偷襲先手'); log.ev.push({ a:'surprise' });
    aliveList(heroes).forEach(function(h){ if (aliveList(enemies).length===0) return; heroAttack(h, enemies, buff, log); });
  }
  var guard = 0;
  while (aliveList(heroes).length>0 && aliveList(enemies).length>0 && guard<40){
    guard++; log.rounds++;
    log.lines.push('R'+log.rounds); log.ev.push({ r:log.rounds });   // 回合分隔（前端轉「第 N 回合」）
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
      var natural = d(20);
      var atk = natural + e.atkBonus;
      var cs = t._cs || combatStats(t);
      if (atk >= cs.ac || natural === 20){
        var dmg = rollDice(e.dmg[0], e.dmg[1]) + Math.floor(floor/3);
        t.hp = Math.max(0, t.hp - dmg);
        if (t.hp<=0) t._downed = true;
        log.lines.push('🩸 '+e.ico+e.nm+' 打中 '+t.name+' −'+dmg+(t.hp<=0?' 💀 倒下':''));
        log.ev.push({ a:'foe', by:e._i, tgt:t.id, dmg:dmg, kill:t.hp<=0 });
      } else {
        log.lines.push('💨 '+e.ico+e.nm+' 撲空');
        log.ev.push({ a:'foe', by:e._i, tgt:t.id, miss:true });
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
  var atk = natural + cs.atkBonus + (buff.atk||0) + (h._bondAtk||0);
  var crit = (natural === 20) || (Math.random() < (buff.crit||0));
  if (atk >= t.ac || natural === 20){
    var dmg = rollDice(cs.dmgDice[0], cs.dmgDice[1]) + cs.dmgBonus;
    if (crit) dmg += rollDice(cs.dmgDice[0], cs.dmgDice[1]);
    t.hp = Math.max(0, t.hp - dmg);
    log.lines.push((crit?'✦ ':'⚔️ ')+h.name+' 擊中 '+t.ico+t.nm+' −'+dmg+(crit?'（暴擊！）':'')+(t.hp<=0?' 💀':''));
    if (log.ev) log.ev.push({ a:'hero', by:h.id, tgt:t._i, dmg:dmg, crit:crit, kill:t.hp<=0 });
  } else {
    log.lines.push('💨 '+h.name+' 攻擊 '+t.ico+t.nm+' 落空');
    if (log.ev) log.ev.push({ a:'hero', by:h.id, tgt:t._i, miss:true });
  }
}
function heroSkill(h, enemies, buff, log){
  var ci = COMBAT_CLASSES[h.job]; var cs = h._cs || (h._cs = combatStats(h));
  var k = ci.skill.kind;
  if (k === 'aoe'){
    var tot=0, hits=[]; aliveList(enemies).forEach(function(e){ var dmg=rollDice(cs.dmgDice[0],cs.dmgDice[1])+cs.dmgBonus; e.hp=Math.max(0,e.hp-dmg); tot+=dmg; hits.push({tgt:e._i,dmg:dmg,kill:e.hp<=0}); });
    log.lines.push('🔥 '+h.name+' 施放「'+ci.skill.nm+'」橫掃全體 −'+tot);
    if (log.ev) log.ev.push({ a:'skill', by:h.id, nm:ci.skill.nm, ico:'🔥', hits:hits });
  } else if (k === 'heal'){
    var team = h._team || [];
    // 治療全隊 + 復活一名（team 由 runDungeon 綁定）
    (h._allies||[]).forEach(function(a){ if(a.hp>0){ a.hp=Math.min(a.maxhp, a.hp+rollDice(2,8)+mod(abilityOf(h,'wis'))); } });
    var dead=(h._allies||[]).filter(function(a){return a.hp<=0;})[0];
    if (dead){ dead.hp=Math.round(dead.maxhp*0.4); log.lines.push('✨ '+h.name+'「聖光」復活了 '+dead.name); if(log.ev)log.ev.push({a:'skill',by:h.id,nm:'聖光',ico:'✨',heal:true,revive:dead.id,allies:(h._allies||[]).map(function(a){return{id:a.id,hp:a.hp};})}); }
    else { log.lines.push('✨ '+h.name+'施放「聖光」治療全隊'); if(log.ev)log.ev.push({a:'skill',by:h.id,nm:'聖光',ico:'✨',heal:true,allies:(h._allies||[]).map(function(a){return{id:a.id,hp:a.hp};})}); }
  } else if (k === 'multi'){
    var t=frontAlive(enemies); if(t){ var tot2=0, mh=[]; for(var i=0;i<3;i++){ if(t.hp<=0)t=frontAlive(enemies); if(!t)break; var dmg=rollDice(cs.dmgDice[0],cs.dmgDice[1])+cs.dmgBonus; t.hp=Math.max(0,t.hp-dmg); tot2+=dmg; mh.push({tgt:t._i,dmg:dmg,kill:t.hp<=0});} log.lines.push('🏹 '+h.name+'「瞄準連射」−'+tot2); if(log.ev)log.ev.push({a:'skill',by:h.id,nm:'瞄準連射',ico:'🏹',hits:mh}); }
  } else if (k === 'double' || k==='smite' || k==='sneak'){
    var tt=frontAlive(enemies); if(tt){ var mult=(k==='sneak'?3:2); var dmg=0; for(var j=0;j<mult;j++) dmg+=rollDice(cs.dmgDice[0],cs.dmgDice[1]); dmg+=cs.dmgBonus; tt.hp=Math.max(0,tt.hp-dmg);
      if(k==='smite') h.hp=Math.min(h.maxhp,h.hp+rollDice(1,6));
      log.lines.push(ci.ico+' '+h.name+'「'+ci.skill.nm+'」重擊 '+tt.ico+tt.nm+' −'+dmg+(tt.hp<=0?' 💀':''));
      if (log.ev) log.ev.push({ a:'skill', by:h.id, nm:ci.skill.nm, ico:ci.ico, hits:[{tgt:tt._i,dmg:dmg,kill:tt.hp<=0}] }); }
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
