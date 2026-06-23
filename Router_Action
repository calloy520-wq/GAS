// ==========================================
// 🔴【第三部分：原生非同步中樞分流器 handleGameAction】Router_Action.gs
// ==========================================

// ------------------------------------------
// 🔹 路由映射表 (Action Router)
// ------------------------------------------
const ActionRouter = {
  "check_name": actionCheckName,
  "send_mail": actionSendMail,
  "cultivate": actionCultivate,
  "consume_item": actionConsumeItem,
  "breakthrough": actionBreakthrough,
  "empower_npc": actionEmpowerNpc,
  "claim_quest_reward": actionClaimQuestReward,
  "quests": actionQuests,
  "abandon_quest": actionAbandonQuest,
  "inventory": actionInventory,
  "discard_item": actionDiscardItem,
  "sell_item": actionSellItem,
  "estate_get": actionEstateGet,
  "estate_harvest_all": actionEstateHarvestAll,
  "play_dice": actionPlayDice,
  "dismiss_party": actionDismissParty,
  "join_party": actionJoinParty,
  "inspect_npc": actionInspectNpc,
  "get_available_gear": actionGetAvailableGear,
  "equip_gear": actionEquipGear,
  "get_full_status": actionGetFullStatus,
  "update_fate": actionUpdateFate,
  "update_rel_tag": actionUpdateRelTag,
  "manual_npc": actionManualNpc,
  "create": actionManualNpc, // create 與 manual_npc 共用同一個邏輯
  "clear_npc_major_event": actionClearNpcMajorEvent,
  "get_all_categorized_maps": actionGetAllCategorizedMaps,
  "move": actionMove,
  "sync": actionSync,
  "rest": actionRest,
  "get_rumors": actionGetRumors,
  "get_mails": actionGetMails,
  "play": actionPlay,
  "delete_mail": actionDeleteMail,
  "claim_mail_item": actionClaimMailItem,
  "get_faction_info": actionGetFactionInfo,
  "get_epic_history": actionGetEpicHistory,
  "get_ranking": actionGetRanking,
  "promote_rank": actionPromoteRank,
  "create_faction": actionCreateFaction,
  "home_get": actionHomeGet,
  "home_create": actionHomeCreate,
  "home_move": actionHomeMove,
  "home_decorate": actionHomeDecorate,
  "spare_npc": actionSpareNpc,
  "give_money": actionGiveMoney,
  "attack_npc": actionAttackNpc,
  "narrate_only": actionNarrateOnly

};

// ------------------------------------------
// 🔹 主進入點 (Main Entry) - 極致精簡版
// ------------------------------------------
function handleGameAction(userData) {
  if (typeof userData === "string") {
    try { userData = JSON.parse(userData); }
    catch (err) { return JSON.stringify({ success: false, message: "後端偵測：JSON結構解析異常" }); }
  }

  const action = userData.action || "play";
  const pcId = userData.pcId;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    law: ss.getSheetByName("規矩"), map: ss.getSheetByName("坤圖"),
    pc: ss.getSheetByName("眾生"), log: ss.getSheetByName("因果"),
    item: ss.getSheetByName("琳琅"), auth: ss.getSheetByName("權柄"),
    rel: ss.getSheetByName("關係"), epic: ss.getSheetByName("史紀"),
    quest: ss.getSheetByName("天命"), task: ss.getSheetByName("TASK"),
    faction: ss.getSheetByName("勢力"),
    rumor: ss.getSheetByName("傳聞"),
    mail: ss.getSheetByName("飛書")
  };

  const handler = ActionRouter[action];
  if (handler) {
    return handler(userData, pcId, sheets);
  } else {
    return JSON.stringify({ success: false, message: `天道異常：未知的動作指令「${action}」` });
  }
}

// ==========================================
// 🔴 動作處理模組 (Action Handlers)
// ==========================================

function actionCheckName(userData, pcId, sheets) {
  const pcRows = sheets.pc.getDataRange().getValues();
  const found = pcRows.find(r => r[COL.PC.NAME] === userData.name && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  return JSON.stringify({ exists: !!found, pcId: found ? found[COL.PC.ID] : null, sex: found ? found[COL.PC.SEX] : "未知" });
}


function actionCultivate(userData, pcId, sheets) {
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  const currentRealm = pcData[pIdx][COL.PC.REALM] || "凡人";
  const rMod = REALM_MODIFIERS[currentRealm] || 1.0;
  const trueLimit = REALM_LIMITS[currentRealm] || 25;

  const statsToUpgrade = [COL.PC.STR, COL.PC.CON, COL.PC.AGI, COL.PC.INT, COL.PC.LUK];
  let isAnyUpgraded = false;

  statsToUpgrade.forEach(col => {
    let currentStat = parseInt(pcData[pIdx][col]) || 10;
    if (currentStat < trueLimit) {
      pcData[pIdx][col] = Math.min(trueLimit, currentStat + 1);
      isAnyUpgraded = true;
    }
  });

  if (!isAnyUpgraded) return JSON.stringify({ success: false, message: `你的所有屬性皆已達「${currentRealm}」面板極限 (${trueLimit})，需先突破境界才能繼續修練！` });

  sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);
  const statusString = getFreshStatusString(pcId, pIdx, sheets);
  return JSON.stringify({ success: true, isSuccess: true, message: `你就地盤膝而坐，引導天地靈氣貫通四肢百骸。【全屬性】皆大幅提升了 1 點！`, statusString: statusString });
}

function actionConsumeItem(userData, pcId, sheets) {
  const { itemId } = userData;
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人命格。" });

  let itemData = sheets.item.getDataRange().getValues();
  const iIdx = itemData.findIndex(r => r[COL.ITEM.OWNER] == pcId && r[COL.ITEM.ID] === itemId);
  if (iIdx === -1) return JSON.stringify({ success: false, message: "行囊中找不到此丹藥的氣息！" });

  const itemRow = itemData[iIdx];
  const consumableTypes = ["丹藥", "恢復道具"];
  if (!consumableTypes.includes(String(itemRow[COL.ITEM.TYPE]))) {
    return JSON.stringify({ success: false, message: `天道阻擋：「${itemRow[COL.ITEM.NAME]}」並非可服用的丹藥或恢復道具！` });
  }

  // 🔴 獲取當前境界的肉體極限
  const currentRealm = pcData[pIdx][COL.PC.REALM] || "凡人";
  const trueLimit = REALM_LIMITS[currentRealm] || 25;

  let addStr = parseInt(itemRow[COL.ITEM.STR]) || 0; let addCon = parseInt(itemRow[COL.ITEM.CON]) || 0;
  let addAgi = parseInt(itemRow[COL.ITEM.AGI]) || 0; let addInt = parseInt(itemRow[COL.ITEM.INT]) || 0; let addLuk = parseInt(itemRow[COL.ITEM.LUK]) || 0;
  let effectStr = "";

  // 🔴 帶入境界上限檢查，並計算實際增加的數值
  if (addStr > 0) {
    let cur = parseInt(pcData[pIdx][COL.PC.STR]) || 10;
    if (cur < trueLimit) { let actualAdd = Math.min(trueLimit, cur + addStr) - cur; pcData[pIdx][COL.PC.STR] = cur + actualAdd; effectStr += `臂力 +${actualAdd} `; }
  }
  if (addCon > 0) {
    let cur = parseInt(pcData[pIdx][COL.PC.CON]) || 10;
    if (cur < trueLimit) { let actualAdd = Math.min(trueLimit, cur + addCon) - cur; pcData[pIdx][COL.PC.CON] = cur + actualAdd; effectStr += `根骨 +${actualAdd} `; }
  }
  if (addAgi > 0) {
    let cur = parseInt(pcData[pIdx][COL.PC.AGI]) || 10;
    if (cur < trueLimit) { let actualAdd = Math.min(trueLimit, cur + addAgi) - cur; pcData[pIdx][COL.PC.AGI] = cur + actualAdd; effectStr += `身法 +${actualAdd} `; }
  }
  if (addInt > 0) {
    let cur = parseInt(pcData[pIdx][COL.PC.INT]) || 10;
    if (cur < trueLimit) { let actualAdd = Math.min(trueLimit, cur + addInt) - cur; pcData[pIdx][COL.PC.INT] = cur + actualAdd; effectStr += `神識 +${actualAdd} `; }
  }
  if (addLuk > 0) {
    let cur = parseInt(pcData[pIdx][COL.PC.LUK]) || 10;
    if (cur < trueLimit) { let actualAdd = Math.min(trueLimit, cur + addLuk) - cur; pcData[pIdx][COL.PC.LUK] = cur + actualAdd; effectStr += `福緣 +${actualAdd} `; }
  }

  // 🔴 防呆機制：如果是加屬性的丹藥，但所有屬性都沒增加（代表已達極限），拒絕吞服！
  const hasStatBonus = addStr > 0 || addCon > 0 || addAgi > 0 || addInt > 0 || addLuk > 0;
  if (hasStatBonus && effectStr === "") {
    return JSON.stringify({ success: false, message: `你的肉體已達「${currentRealm}」的極限，無法再吸收「${itemRow[COL.ITEM.NAME]}」的藥力，需先突破境界！` });
  }
  const newMaxStats = calculateMaxStats(pcData[pIdx][COL.PC.REALM], pcData[pIdx][COL.PC.CON], pcData[pIdx][COL.PC.INT]);
  pcData[pIdx][COL.PC.MAX_HP] = newMaxStats.hp;
  pcData[pIdx][COL.PC.MAX_MP] = newMaxStats.mp;


  // 🔴 判斷丹藥子類型
  const itemName = itemRow[COL.ITEM.NAME];
  const isHealItem =
    itemRow[COL.ITEM.TYPE] === "恢復道具" ||
    itemName.includes("回血") || itemName.includes("補血") ||
    itemName.includes("回氣") || itemName.includes("補氣") ||
    itemName.includes("回復") || itemName.includes("恢復") ||
    itemName.includes("靈泉") || itemName.includes("傷藥") ||
    itemName.includes("療傷") || (
      // 所有屬性加成都是 0，判定為純回血回氣型
      addStr === 0 && addCon === 0 && addAgi === 0 &&
      addInt === 0 && addLuk === 0
    );

  if (isHealItem) {
    // 恢復型：補血補氣回滿，同時清除負面狀態
    const maxStats = calculateMaxStats(
      pcData[pIdx][COL.PC.REALM],
      pcData[pIdx][COL.PC.CON],
      pcData[pIdx][COL.PC.INT]
    );
    pcData[pIdx][COL.PC.HP] = maxStats.hp;
    pcData[pIdx][COL.PC.MP] = maxStats.mp;
    pcData[pIdx][COL.PC.STATUS] = JSON.stringify({
      "衣服": "穿戴整齊", "姿勢": "站立", "負面": "無", "顏面": "氣息平穩"
    });
    effectStr = "氣血與真氣全面回滿，負面狀態一掃而空！";
  } else if (effectStr === "") {
    // 屬性全為 0 但也不是恢復型（保底：回滿）
    const maxStats = calculateMaxStats(
      pcData[pIdx][COL.PC.REALM],
      pcData[pIdx][COL.PC.CON],
      pcData[pIdx][COL.PC.INT]
    );
    pcData[pIdx][COL.PC.HP] = maxStats.hp;
    pcData[pIdx][COL.PC.MP] = maxStats.mp;
    effectStr = "狀態回歸巔峰！";
  }

  sheets.item.deleteRow(iIdx + 1);
  const pcColCount = Object.keys(COL.PC).length;
  while (pcData[pIdx].length < pcColCount) { pcData[pIdx].push(""); }
  sheets.pc.getRange(pIdx + 1, 1, 1, pcColCount).setValues([pcData[pIdx]]);

  return JSON.stringify({ success: true, itemName: itemRow[COL.ITEM.NAME], effectStr: effectStr, statusString: getFreshStatusString(pcId, pIdx, sheets) });
}

function actionBreakthrough(userData, pcId, sheets) {
  const pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false });

  const currentRealm = pcData[pIdx][COL.PC.REALM] || "凡人";
  const curIdx = REALMS.indexOf(currentRealm);
  if (curIdx >= REALMS.length - 1) return JSON.stringify({ success: false, message: `已達巔峰境界「${currentRealm}」，天地間無可突破之法。` });

  const trueLimit = REALM_LIMITS[currentRealm] * (REALM_MODIFIERS[currentRealm] || 1.0);
  const totals = getCharacterTotalStats(pcId, sheets, pcData);
  const stats = [totals.STR, totals.CON, totals.AGI, totals.INT, totals.LUK];
  const countPassed = stats.filter(s => s >= (trueLimit * 0.8)).length;

  if (countPassed < 3) return JSON.stringify({ success: false, message: `需至少 3 項屬性達 ${Math.floor(trueLimit * 0.8)} 以上，方可嘗試衝擊境界。` });

  const baseRates = { "凡人": 90, "引氣": 80, "凝罡": 70, "通玄": 55, "罡氣": 45, "意動": 35, "心象": 25, "登峰": 10, "返璞": 5, "天人": 1 };
  let successRate = (baseRates[currentRealm] || 50) + ((countPassed - 3) * 10);
  let equipPenalty = (String(pcData[pIdx][COL.PC.WEP]).trim() ? 5 : 0) +
    (String(pcData[pIdx][COL.PC.ARM]).trim() ? 5 : 0) +
    (String(pcData[pIdx][COL.PC.ACC1]).trim() ? 5 : 0) +
    (String(pcData[pIdx][COL.PC.ACC2]).trim() ? 5 : 0);
  successRate = Math.max(1, Math.min(100, successRate - equipPenalty));

  if ((Math.floor(Math.random() * 100) + 1) > successRate) {
    pcData[pIdx][COL.PC.HP] = Math.max(1, Math.floor((parseInt(pcData[pIdx][COL.PC.HP]) || 10) / 2));
    pcData[pIdx][COL.PC.MP] = Math.max(0, Math.floor((parseInt(pcData[pIdx][COL.PC.MP]) || 10) / 2));
    pcData[pIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "衣衫被汗水浸濕", "姿勢": "痛苦捂胸", "負面": "真氣逆流", "顏面": "面色慘白" });
    sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);
    return JSON.stringify({ success: false, statusString: getFreshStatusString(pcId, pIdx, sheets), message: `突破失敗！(成功率 ${successRate}%)<br>體內真氣失控逆流，氣血大損！` });
  }

  const nextRealm = REALMS[curIdx + 1];
  const maxVals = calculateMaxStats(nextRealm, pcData[pIdx][COL.PC.CON], pcData[pIdx][COL.PC.INT]);

  pcData[pIdx][COL.PC.REALM] = nextRealm;
  pcData[pIdx][COL.PC.MAX_HP] = maxVals.hp; pcData[pIdx][COL.PC.MAX_MP] = maxVals.mp;
  pcData[pIdx][COL.PC.HP] = maxVals.hp; pcData[pIdx][COL.PC.MP] = maxVals.mp;
  pcData[pIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "穿戴整齊", "姿勢": "站立", "負面": "無", "顏面": "神采奕奕" });

  sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);
  sheets.log.appendRow([new Date(), pcId, `【境界突破】${pcData[pIdx][COL.PC.NAME]} 突破至 ${nextRealm}`, pcData[pIdx][COL.PC.LOC]]);
  addRumor(sheets, "BREAKTHROUGH", pcData[pIdx][COL.PC.LOC], pcData[pIdx][COL.PC.NAME], { realm: nextRealm });
  return JSON.stringify({ success: true, message: `金光籠罩，你成功突破至「${nextRealm}」！`, statusString: getFreshStatusString(pcId, pIdx, sheets) });
}

function actionEmpowerNpc(userData, pcId, sheets) {
  const { npcName } = userData;
  let pcData = sheets.pc.getDataRange().getValues();
  let relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];
  let itemData = sheets.item ? sheets.item.getDataRange().getValues() : [];

  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === npcName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  if (pIdx === -1 || nIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  const rIdx = relData.findIndex(r => r[COL.REL.PC] === pcData[pIdx][COL.PC.NAME] && r[COL.REL.NPC] === npcName);
  if ((rIdx !== -1 ? parseInt(relData[rIdx][COL.REL.FAV]) || 0 : 0) < 100) return JSON.stringify({ success: false, message: "好感度未達100！" });

  const pRIdx = REALMS.indexOf(pcData[pIdx][COL.PC.REALM] || "凡人");
  const nRIdx = REALMS.indexOf(pcData[nIdx][COL.PC.REALM] || "凡人");
  if (nRIdx >= pRIdx || nRIdx >= REALMS.length - 1) return JSON.stringify({ success: false, message: `境界未高於對方或對方已達巔峰。` });

  const pillIdx = itemData.findIndex(r => r[COL.ITEM.OWNER] == pcId && r[COL.ITEM.NAME] === "造化綠液");
  if (pillIdx === -1) return JSON.stringify({ success: false, message: "缺乏無上至寶【造化綠液】！" });

  sheets.item.deleteRow(pillIdx + 1);
  const nextRealm = REALMS[nRIdx + 1];
  pcData[nIdx][COL.PC.REALM] = nextRealm;

  const baseFloor = Math.floor(REALM_LIMITS[REALMS[nRIdx]] * 0.8);
  const statCap = REALM_LIMITS[nextRealm];
  [COL.PC.STR, COL.PC.CON, COL.PC.AGI, COL.PC.INT, COL.PC.LUK].forEach(statCol => {
    pcData[nIdx][statCol] = Math.min(statCap, Math.max(baseFloor, parseInt(pcData[nIdx][statCol]) || 10) + Math.floor(Math.random() * 6) + 3);
  });

  const nMax = calculateMaxStats(nextRealm, pcData[nIdx][COL.PC.CON], pcData[nIdx][COL.PC.INT]);
  pcData[nIdx][COL.PC.MAX_HP] = nMax.hp; pcData[nIdx][COL.PC.MAX_MP] = nMax.mp;
  pcData[nIdx][COL.PC.HP] = nMax.hp; pcData[nIdx][COL.PC.MP] = nMax.mp;
  pcData[nIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "穿戴整齊", "姿勢": "站立", "負面": "無", "顏面": "神采奕奕" });

  sheets.pc.getRange(nIdx + 1, 1, 1, pcData[nIdx].length).setValues([pcData[nIdx]]);
  SpreadsheetApp.flush();
  addRumor(sheets, "EMPOWER", pcData[nIdx][COL.PC.LOC], npcName);

  return JSON.stringify({ success: true, promptText: `【天道動作：玩家消耗了一滴蘊含無上生命法則的「造化綠液」護住對方心脈，並與好感度達到 100 的『${npcName}』進行傳功雙修！\n在造化之力的修補下，對方五圍洗髓重塑，境界拔升至「${nextRealm}」！\n請極盡生動地描寫這場靈肉交融與造化法則灌體的情境！(★天道鐵律：底層已結算，嚴禁輸出 items_lost 或 stat_changes 避免重複扣除！)】` });
}

function actionClaimQuestReward(userData, pcId, sheets) {
  let pcData = sheets.pc.getDataRange().getValues();
  const pcIndex = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pcIndex === -1) return JSON.stringify({ success: false, message: "天道崩潰：查無大俠之名命格。" });

  const qData = sheets.quest.getDataRange().getValues();
  let questRowIdx = -1;
  for (let i = qData.length - 1; i >= 1; i--) {
    if (qData[i][COL.QUEST.PC] == pcId && qData[i][COL.QUEST.NAME] === userData.questName && qData[i][COL.QUEST.STATUS] !== "進行中") {
      questRowIdx = i; break;
    }
  }
  if (questRowIdx === -1) return JSON.stringify({ success: false, message: "找不到已結案的天命任務。" });

  const questRow = qData[questRowIdx];
  const rewardMoney = parseInt(questRow[COL.QUEST.MONEY]) || 0;
  const rewardItemName = String(questRow[COL.QUEST.ITEM] || "").trim();

  if (rewardMoney > 0) pcData[pcIndex][COL.PC.MONEY] = (parseInt(pcData[pcIndex][COL.PC.MONEY]) || 0) + rewardMoney;

  let itemMsg = "無";
  if (rewardItemName && rewardItemName !== "無" && rewardItemName !== "undefined") {
    const newItemId = "ITM_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    // 🔴 與 items_gained 對齊的強制類別判斷
    let itemType = detectItemType(rewardItemName, "消耗品", null);

    let sSTR = 0, sCON = 0, sAGI = 0, sINT = 0, sLUK = 0;
    if (itemType === "武器") sSTR = 2;
    else if (itemType === "防具") sCON = 2;
    else if (itemType === "法寶") sLUK = 2;
    else if (itemType === "丹藥") { sSTR = 1; sCON = 1; sAGI = 1; sINT = 1; sLUK = 1; }

    itemMsg = rewardItemName;

    if (sheets.item) {
      sheets.item.appendRow([
        rewardItemName, itemType, "天命懸賞賜予的奇珍。",
        100, pcId, sSTR, sCON, sAGI, sINT, sLUK, newItemId
      ]);
    }
  }

  // 🔴 宗門氣運提升核心邏輯！
  const isFactionQuest = userData.questName.startsWith("【宗門】");
  let factionPowerMsg = "";
  if (isFactionQuest) {
    const myFaction = pcData[pcIndex][COL.PC.FACTION];
    if (myFaction && myFaction !== "無") {

      // 取得目前境界在 REALMS 陣列中的索引 (0~9)
      const currentRealm = pcData[pcIndex][COL.PC.REALM] || "凡人";
      const realmIndex = REALMS.indexOf(currentRealm);


      const gain = 100 * Math.pow(2, realmIndex);

      updateFactionPower(sheets, myFaction, 5, `門人圓滿完成了「${userData.questName}」，宗門威望大增！`);
      pcData[pcIndex][COL.PC.CONTRIB] = (parseInt(pcData[pcIndex][COL.PC.CONTRIB]) || 0) + gain;

      factionPowerMsg = `<br>✨ <b>宗門氣運提升了！</b> 獲得 ${gain} 點宗門貢獻。`;
    }
  }

  if (sheets.epic) sheets.epic.appendRow([pcId, `【天命圓滿】完成了任務「${userData.questName}」，領取賞銀 ${rewardMoney} 兩與珍品「${itemMsg}」`, new Date()]);
  sheets.quest.deleteRow(questRowIdx + 1);
  addRumor(sheets, "QUEST_DONE", pcData[pcIndex][COL.PC.LOC], userData.questName);
  sheets.pc.getRange(pcIndex + 1, 1, 1, pcData[pcIndex].length).setValues([pcData[pcIndex]]);

  return JSON.stringify({ success: true, statusString: getFreshStatusString(pcId, pcIndex, sheets), message: `🎉 天命大圓滿！你成功領取了賞銀 ${rewardMoney} 兩 ${rewardItemName !== "無" ? `與奇珍「${rewardItemName}」` : ""}${factionPowerMsg}` });
}

function actionQuests(userData, pcId, sheets) {
  if (!sheets.quest) return JSON.stringify({ success: false, message: "天命表不存在" });
  const data = sheets.quest.getDataRange().getValues();
  return JSON.stringify({ success: true, data: data.slice(1).filter(r => r[COL.QUEST.PC] == pcId).map(r => ({ name: r[COL.QUEST.NAME], target: r[COL.QUEST.TARGET] || "調查中", status: r[COL.QUEST.STATUS], money: r.length > 4 ? (parseInt(r[COL.QUEST.MONEY]) || 0) : 0, item: r.length > 5 ? (String(r[COL.QUEST.ITEM] || "").trim() || "無") : "無" })) });
}

function actionAbandonQuest(userData, pcId, sheets) {
  const qData = sheets.quest.getDataRange().getValues();
  for (let i = qData.length - 1; i >= 1; i--) {
    if (qData[i][COL.QUEST.PC] == pcId && qData[i][COL.QUEST.NAME] === userData.questName) {
      if (qData[i][COL.QUEST.STATUS] === "已結案" && sheets.epic) sheets.epic.appendRow([pcId, `【天命結算】達成了因果：「${userData.questName}」`, new Date()]);
      sheets.quest.deleteRow(i + 1); break;
    }
  }
  return JSON.stringify({ success: true });
}

function actionInventory(userData, pcId, sheets) {
  if (!sheets.item) return JSON.stringify({ success: false, message: "琳琅表不存在" });
  const data = sheets.item.getDataRange().getValues();
  return JSON.stringify({
    success: true, data: data.slice(1).filter(r => r[COL.ITEM.OWNER] == pcId).map(r => {
      let attrArr = [];
      if (parseInt(r[COL.ITEM.STR])) attrArr.push(`臂力+${r[COL.ITEM.STR]}`);
      if (parseInt(r[COL.ITEM.CON])) attrArr.push(`根骨+${r[COL.ITEM.CON]}`);
      if (parseInt(r[COL.ITEM.AGI])) attrArr.push(`身法+${r[COL.ITEM.AGI]}`);
      if (parseInt(r[COL.ITEM.INT])) attrArr.push(`神識+${r[COL.ITEM.INT]}`);
      if (parseInt(r[COL.ITEM.LUK])) attrArr.push(`福緣+${r[COL.ITEM.LUK]}`);
      return { id: r[COL.ITEM.ID] || r[COL.ITEM.NAME], name: r[COL.ITEM.NAME], type: r[COL.ITEM.TYPE], desc: r[COL.ITEM.DESC], stats: attrArr.join("、") };
    }), max: MAX_BAG_SIZE
  });
}

function actionDiscardItem(userData, pcId, sheets) {
  const itemData = sheets.item.getDataRange().getValues();
  for (let i = itemData.length - 1; i >= 1; i--) {
    if ((itemData[i][COL.ITEM.ID] === userData.itemName || itemData[i][COL.ITEM.NAME] === userData.itemName) && itemData[i][COL.ITEM.OWNER] == pcId) {
      sheets.item.deleteRow(i + 1); break;
    }
  }
  return JSON.stringify({ success: true });
}
// 💰 變賣物品給聽風閣（賣價 = price × 0.4，裝備中與定情信物禁止賣）
function actionSellItem(userData, pcId, sheets) {
  const { itemId } = userData;
  if (!sheets.item) return JSON.stringify({ success: false, message: "琳琅表不存在" });

  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人命格。" });

  let itemData = sheets.item.getDataRange().getValues();
  const iIdx = itemData.findIndex(r => r[COL.ITEM.ID] === itemId && String(r[COL.ITEM.OWNER]) === String(pcId));
  if (iIdx === -1) return JSON.stringify({ success: false, message: "行囊中找不到此物。" });

  const itemRow = itemData[iIdx];
  const itemName = itemRow[COL.ITEM.NAME];

  // 🔴 防呆 1：定情信物禁止變賣
  if (String(itemRow[COL.ITEM.TYPE]) === "定情信物") {
    return JSON.stringify({ success: false, message: `「${itemName}」承載著難以割捨的情意，無法變賣。` });
  }

  // 🔴 防呆 2：裝備中的物品禁止變賣
  const pcRow = pcData[pIdx];
  const equipped = [pcRow[COL.PC.WEP], pcRow[COL.PC.ARM], pcRow[COL.PC.ACC1], pcRow[COL.PC.ACC2]]
    .map(x => String(x || "").trim());
  if (equipped.includes(String(itemId).trim())) {
    return JSON.stringify({ success: false, message: `「${itemName}」正裝備在身，請先卸下再變賣。` });
  }

  // 計算賣價（4 折，最低保底 1 兩）
  // 計算賣價：貨幣物品 1:1 兌換，其餘物品 4 折(最低保底 1 兩)
  const price = parseInt(itemRow[COL.ITEM.PRICE]) || 0;
  const isCurrency = String(itemRow[COL.ITEM.TYPE]) === "貨幣";
  const sellPrice = isCurrency ? price : Math.max(1, Math.floor(price * 0.4));

  // 扣物品、加銀兩
  sheets.item.deleteRow(iIdx + 1);
  pcData[pIdx][COL.PC.MONEY] = (parseInt(pcData[pIdx][COL.PC.MONEY]) || 0) + sellPrice;
  sheets.pc.getRange(pIdx + 1, COL.PC.MONEY + 1).setValue(pcData[pIdx][COL.PC.MONEY]);

  return JSON.stringify({
    success: true,
    message: `將「${itemName}」賣給了聽風閣，得銀 ${sellPrice} 兩。`,
    statusString: getFreshStatusString(pcId, pIdx, sheets)
  });
}
function actionEstateGet(userData, pcId, sheets) {
  if (!sheets.task) return JSON.stringify({ success: false, message: "TASK表不存在" });
  const taskData = sheets.task.getDataRange().getValues();
  return JSON.stringify({ success: true, tasks: taskData.filter((r, i) => i > 0 && r[0] == pcId).map(r => ({ facility: r[1], lastHarvest: r[4] })) });
}

function actionEstateHarvestAll(userData, pcId, sheets) {
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  const taskData = sheets.task.getDataRange().getValues();
  const now = Date.now();
  let resultMsgs = [], newItemsToAppend = [], totalGainedMoney = 0, hasHarvested = false;

  const facilities = [
    { name: "聚寶金蟾", reqTime: 60 * 60 * 1000, maxAccumulate: 24 * 60 * 60 * 1000 },
    { name: "掌天小瓶", reqTime: 12 * 60 * 60 * 1000, maxAccumulate: 24 * 60 * 60 * 1000 },
    { name: "天地丹爐", reqTime: 12 * 60 * 60 * 1000, maxAccumulate: 24 * 60 * 60 * 1000 }
  ];

  facilities.forEach(fac => {
    let taskRowIndex = -1, lastHarvest = 0;
    for (let i = 1; i < taskData.length; i++) {
      if (taskData[i][0] == pcId && taskData[i][1] === fac.name) { taskRowIndex = i; lastHarvest = parseInt(taskData[i][4]) || 0; break; }
    }

    let timePassed = taskRowIndex === -1 ? fac.reqTime : now - lastHarvest;
    if (timePassed >= fac.reqTime) {
      hasHarvested = true;
      const cappedTimePassed = Math.min(timePassed, fac.maxAccumulate);
      const yieldCount = Math.floor(cappedTimePassed / fac.reqTime);
      const newLastHarvest = now - (cappedTimePassed - yieldCount * fac.reqTime);

      if (taskRowIndex === -1) sheets.task.appendRow([pcId, fac.name, "無", "無", newLastHarvest]);
      else sheets.task.getRange(taskRowIndex + 1, 5).setValue(newLastHarvest);

      if (fac.name === "聚寶金蟾") {
        totalGainedMoney += yieldCount; resultMsgs.push(`【聚寶金蟾】吐出了 ${yieldCount} 兩白銀`);
      } else if (fac.name === "掌天小瓶") {
        for (let i = 0; i < yieldCount; i++) newItemsToAppend.push(["造化綠液", "消耗品", "一滴散發著恐怖生命法則的靈液。", 999, pcId, 0, 0, 0, 0, 0, "ITM_" + Date.now() + "_bottle_" + i]);
        resultMsgs.push(`【掌天小瓶】收集了 ${yieldCount} 滴 造化綠液`);
      } else if (fac.name === "天地丹爐") {
        for (let i = 0; i < yieldCount; i++) newItemsToAppend.push(["【造化】九轉金丹", "丹藥", "服下可使所有五圍屬性全面 +1！", 50, pcId, 1, 1, 1, 1, 1, "ITM_" + Date.now() + "_furnace_" + i]);
        resultMsgs.push(`【天地丹爐】煉製了 ${yieldCount} 顆 九轉金丹`);
      }
    }
  });

  if (!hasHarvested) return JSON.stringify({ success: false, message: "靈氣尚未匯聚完成，無物可收。" });
  if (totalGainedMoney > 0) sheets.pc.getRange(pIdx + 1, COL.PC.MONEY + 1).setValue((parseInt(pcData[pIdx][COL.PC.MONEY]) || 0) + totalGainedMoney);
  if (newItemsToAppend.length > 0) sheets.item.getRange(sheets.item.getLastRow() + 1, 1, newItemsToAppend.length, newItemsToAppend[0].length).setValues(newItemsToAppend);

  return JSON.stringify({ success: true, message: resultMsgs.join("<br>"), statusString: getFreshStatusString(pcId, pIdx, sheets) });
}

function actionPlayDice(userData, pcId, sheets) {
  // 假設 Casino.gs 中存在 playDiceGame 函數
  return playDiceGame(pcId, userData.betType, userData.betAmount, sheets, COL);
}

function actionDismissParty(userData, pcId, sheets) {
  const npcName = userData.npcName;
  const myName = sheets.pc.getDataRange().getValues().find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME];
  if (sheets.rel) {
    const relData = sheets.rel.getDataRange().getValues();
    const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === npcName);
    if (rIdx !== -1) sheets.rel.getRange(rIdx + 1, COL.REL.IS_PARTY + 1).setValue("");
  }
  return JSON.stringify({ success: true });
}

function actionJoinParty(userData, pcId, sheets) {
  const npcName = userData.npcName;
  const myName = sheets.pc.getDataRange().getValues().find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME];

  if (sheets.rel) {
    const relData = sheets.rel.getDataRange().getValues();
    const isBusy = relData.find(r => r[COL.REL.NPC] === npcName && r[COL.REL.IS_PARTY] === "同行" && r[COL.REL.PC] !== myName);
    if (isBusy) return JSON.stringify({ success: false, message: `天道阻礙：「${npcName}」已與『${isBusy[COL.REL.PC]}』結伴！` });

    const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === npcName);
    const currentFav = (rIdx !== -1) ? parseInt(relData[rIdx][COL.REL.FAV]) || 0 : 0;
    if (currentFav < 30) return JSON.stringify({ success: false, message: `與「${npcName}」羈絆尚淺(目前好感${currentFav})，對方拒絕同行！(需30以上)` });

    if (rIdx !== -1) sheets.rel.getRange(rIdx + 1, COL.REL.IS_PARTY + 1).setValue("同行");
    else sheets.rel.appendRow([myName, npcName, currentFav, "萍水相逢", "同行"]);
    return JSON.stringify({ success: true, message: `你與「${npcName}」結伴同行！` });
  }
  return JSON.stringify({ success: false, message: "天道異常：REL關係表不存在。" });
}

function actionInspectNpc(userData, pcId, sheets) {
  const targetName = userData.targetName;
  const allPcData = sheets.pc.getDataRange().getValues();
  const npcRow = allPcData.find(r => r[COL.PC.NAME] === targetName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  if (!npcRow) return JSON.stringify({ success: false, message: "查無此人。" });

  // 🔴 窺探直接成功：偵查動作，風險留給真正動手偷
  const itemData = sheets.item ? sheets.item.getDataRange().getValues() : [];
  return JSON.stringify({ success: true, data: itemData.slice(1).filter(r => r[COL.ITEM.OWNER] === npcRow[COL.PC.ID]).map(r => ({ id: r[COL.ITEM.ID], name: r[COL.ITEM.NAME], type: r[COL.ITEM.TYPE], desc: r[COL.ITEM.DESC] })) });
}

function actionGetAvailableGear(userData, pcId, sheets) {
  const { slotType, targetId } = userData;
  const actualTarget = targetId || pcId;
  if (!sheets.item) return JSON.stringify({ success: false, message: "琳琅表不存在" });
  const pcRow = sheets.pc.getDataRange().getValues().find(r => r[COL.PC.ID] == actualTarget);
  if (!pcRow) return JSON.stringify({ success: false, message: "查無此人" });

  const eqWeapon = pcRow[COL.PC.WEP] ? String(pcRow[COL.PC.WEP]).trim() : "";
  const eqArmor = pcRow[COL.PC.ARM] ? String(pcRow[COL.PC.ARM]).trim() : "";
  const eqAcc1 = pcRow[COL.PC.ACC1] ? String(pcRow[COL.PC.ACC1]).trim() : "";
  const eqAcc2 = pcRow[COL.PC.ACC2] ? String(pcRow[COL.PC.ACC2]).trim() : "";
  const allEquipped = [eqWeapon, eqArmor, eqAcc1, eqAcc2].filter(x => x !== "");

  let targetType = slotType.startsWith("法寶") ? "法寶" : slotType;
  const availableGears = [];
  sheets.item.getDataRange().getValues().slice(1).filter(r => (r[COL.ITEM.OWNER] == pcId || r[COL.ITEM.OWNER] == actualTarget) && r[COL.ITEM.TYPE] === targetType).forEach(r => {
    const id = String(r[COL.ITEM.ID] || r[COL.ITEM.NAME]).trim();
    let isEq = (slotType === "武器" && eqWeapon === id) || (slotType === "防具" && eqArmor === id) || (slotType === "法寶1" && eqAcc1 === id) || (slotType === "法寶2" && eqAcc2 === id);

    if (!allEquipped.includes(id) || isEq) {
      let attrDesc = [];
      if (parseInt(r[COL.ITEM.STR])) attrDesc.push(`臂力+${r[COL.ITEM.STR]}`); if (parseInt(r[COL.ITEM.CON])) attrDesc.push(`根骨+${r[COL.ITEM.CON]}`);
      if (parseInt(r[COL.ITEM.AGI])) attrDesc.push(`身法+${r[COL.ITEM.AGI]}`); if (parseInt(r[COL.ITEM.INT])) attrDesc.push(`神識+${r[COL.ITEM.INT]}`);
      if (parseInt(r[COL.ITEM.LUK])) attrDesc.push(`福緣+${r[COL.ITEM.LUK]}`);
      availableGears.push({ id: id, name: r[COL.ITEM.NAME], type: r[COL.ITEM.TYPE], desc: r[COL.ITEM.DESC] || "無描述", stats: attrDesc.join(", ") || "無附加屬性", isEquipped: isEq });
    }
  });
  return JSON.stringify({ success: true, data: availableGears });
}

function actionEquipGear(userData, pcId, sheets) {
  const { slotType, itemId, targetId } = userData;
  const actualTarget = targetId || pcId;
  const pcRows = sheets.pc.getDataRange().getValues();
  const pIdx = pcRows.findIndex(r => r[COL.PC.ID] == actualTarget);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  if (actualTarget !== pcId) {
    const myName = pcRows.find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME];
    const relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];
    const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === pcRows[pIdx][COL.PC.NAME]);
    if ((rIdx !== -1 ? parseInt(relData[rIdx][COL.REL.FAV]) || 0 : 0) < 100 || !(rIdx !== -1 ? String(relData[rIdx][COL.REL.TAG]) : "").includes("(已傾心)")) {
      return JSON.stringify({ success: false, message: "對方對妳尚未全心託付（需好感 100 且已傾心），拒絕更換裝備。" });
    }
  }

  let targetCol = slotType === "武器" ? COL.PC.WEP + 1 : slotType === "防具" ? COL.PC.ARM + 1 : slotType === "法寶1" ? COL.PC.ACC1 + 1 : slotType === "法寶2" ? COL.PC.ACC2 + 1 : -1;
  if (targetCol === -1) return JSON.stringify({ success: false, message: "無效的裝備部位！" });

  if (itemId) {
    const itemDataForCheck = sheets.item ? sheets.item.getDataRange().getValues() : [];
    const strItemId = String(itemId).trim();
    const iIdx = itemDataForCheck.findIndex(r => String(r[COL.ITEM.ID]).trim() === strItemId && (r[COL.ITEM.OWNER] == pcId || r[COL.ITEM.OWNER] == actualTarget));
    if (iIdx === -1) return JSON.stringify({ success: false, message: "行囊中無此氣息，無法裝備！" });

    if (itemDataForCheck[iIdx][COL.ITEM.OWNER] != actualTarget) {
      const oldOwner = itemDataForCheck[iIdx][COL.ITEM.OWNER];
      sheets.item.getRange(iIdx + 1, COL.ITEM.OWNER + 1).setValue(actualTarget);
      const oldOwnerIdx = pcRows.findIndex(r => r[COL.PC.ID] == oldOwner);
      if (oldOwnerIdx !== -1) {
        const oldRow = pcRows[oldOwnerIdx];
        if (String(oldRow[COL.PC.WEP]).trim() === strItemId) sheets.pc.getRange(oldOwnerIdx + 1, COL.PC.WEP + 1).setValue("");
        if (String(oldRow[COL.PC.ARM]).trim() === strItemId) sheets.pc.getRange(oldOwnerIdx + 1, COL.PC.ARM + 1).setValue("");
        if (String(oldRow[COL.PC.ACC1]).trim() === strItemId) sheets.pc.getRange(oldOwnerIdx + 1, COL.PC.ACC1 + 1).setValue("");
        if (String(oldRow[COL.PC.ACC2]).trim() === strItemId) sheets.pc.getRange(oldOwnerIdx + 1, COL.PC.ACC2 + 1).setValue("");
      }
    }
  }

  sheets.pc.getRange(pIdx + 1, targetCol).setValue(itemId || "");
  return JSON.stringify({ success: true, statusString: getFreshStatusString(actualTarget, pIdx, sheets) });
}

function actionGetFullStatus(userData, pcId, sheets) {
  const targetName = userData.targetName;
  const allPcData = sheets.pc.getDataRange().getValues();
  const row = allPcData.find(r => r[COL.PC.NAME] === targetName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  if (!row) return JSON.stringify({ success: false, message: "查無此人" });

  const targetId = row[COL.PC.ID];
  let relMem = "", canEditFate = false;
  if (sheets.rel) {
    const pcRow = allPcData.find(r => r[COL.PC.ID] == pcId);
    if (pcRow) {
      const rRecord = sheets.rel.getDataRange().getValues().find(r => r[COL.REL.PC] === pcRow[COL.PC.NAME] && r[COL.REL.NPC] === targetName);
      if (rRecord) {
        relMem = rRecord[COL.REL.MEMORY] || "";
        if ((parseInt(rRecord[COL.REL.FAV]) || 0) >= 100 && String(rRecord[COL.REL.TAG] || "").includes("已傾心")) canEditFate = true;
      }
    }
  }
  return JSON.stringify({ success: true, statusString: buildPlayerStatusString(row, getCharacterTotalStats(targetId, sheets, allPcData), sheets.item ? sheets.item.getDataRange().getValues() : [], relMem), targetId: targetId, targetSex: row[COL.PC.SEX], canEditFate: canEditFate });
}

function actionUpdateFate(userData, pcId, sheets) {
  const { targetId, fateType, fateValue } = userData;
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] === targetId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  if (targetId !== pcId) {
    const myName = pcData.find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME];
    const relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];
    const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === pcData[pIdx][COL.PC.NAME]);
    if ((rIdx !== -1 ? parseInt(relData[rIdx][COL.REL.FAV]) || 0 : 0) < 100 || !(rIdx !== -1 ? String(relData[rIdx][COL.REL.TAG]) : "").includes("(已傾心)")) {
      return JSON.stringify({ success: false, message: `對方羈絆未達至深處，無法逆天改命！` });
    }
  }

  let targetCol = fateType === 'trait' ? COL.PC.TRAIT : fateType === 'pref' ? COL.PC.PREF : fateType === 'back' ? COL.PC.BACK : fateType === 'intent' ? COL.PC.INTENT : fateType === 'martial' ? COL.PC.MARTIAL : -1;
  if (targetCol === -1) return JSON.stringify({ success: false, message: "未知的命格類型" });
  pcData[pIdx][targetCol] = fateValue;
  sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);

  let relMem = "";
  if (targetId !== pcId && sheets.rel) {
    const rRecord = sheets.rel.getDataRange().getValues().find(r => r[COL.REL.PC] === pcData.find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME] && r[COL.REL.NPC] === pcData[pIdx][COL.PC.NAME]);
    if (rRecord) relMem = rRecord[COL.REL.MEMORY] || "";
  }
  return JSON.stringify({ success: true, statusString: buildPlayerStatusString(pcData[pIdx], getCharacterTotalStats(targetId, sheets, pcData), sheets.item ? sheets.item.getDataRange().getValues() : [], relMem) });
}

function actionManualNpc(userData, pcId, sheets) {
  const isCreate = userData.action === "create";
  const newId = isCreate ? "PC_" + Date.now() : "NPC_" + Date.now();
  const { name, sex, identity, currentLoc, npcRel, npcName, npcSex } = userData;
  const finalName = isCreate ? name : npcName;
  const finalSex = isCreate ? sex : (npcSex || "異");

  if (!isCreate) {
    const pcRows = sheets.pc.getDataRange().getValues();
    if (pcRows.find(r => r[COL.PC.NAME] === finalName && !String(r[COL.PC.ID]).startsWith("DEAD_"))) return JSON.stringify({ success: false, message: "此人已在名錄。" });
  } else {
    if (sheets.auth) { try { sheets.auth.appendRow([finalName, newId, "江湖散人", "", ""]); } catch (e) { } }
  }

  const pcRow = sheets.pc.getDataRange().getValues().find(r => r[COL.PC.ID] == pcId);
  const pcNameStr = pcRow ? pcRow[COL.PC.NAME] : "神祕人";

  let validMapNames = ["落雁峰", "桃花塢", "崑崙秘境", "萬毒沼澤"];
  if (sheets.map) {
    const maps = sheets.map.getDataRange().getValues().slice(1).map(r => String(r[COL.MAP.NAME]).trim()).filter(n => n !== "" && !n.includes('-'));
    if (maps.length > 0) validMapNames = maps;
  }

  const sysOverride = `你是九州天道演化核心，負責根據${isCreate ? '玩家執念重構前世今生' : '角色原型進行完整重構'}。

★【陣營】無明確師承則 faction 填「無」、rank 填「散人」。
★【階級】rank 須含：掌門/宗主/長老/護法/堂主/執事/弟子/門人，無門派填「散人」。
★【境界】realm 從中選：${REALMS.join('、')}。對應身分：
- 普通市井(商人/農夫/店家/僕役/路人)：只能填凡人
- 初入江湖(茶客/普通鏢師/混混/小頭目)：凡人或引氣
- 江湖好手(散修/精銳鏢師/盜賊頭目/捕快)：引氣或凝罡
- 門派中堅(真傳弟子/執事/堂主)：凝罡或通玄
- 門派高層(長老/護法/總鏢頭)：通玄
- 頂尖大能(掌門/宗主/教主)：罡氣或意動
★絕大多數街頭結識的 NPC 應落在凡人～凝罡；通玄以上須有明確崇高地位(大派長老、一方掌門)佐證，禁止僅憑氣勢外貌濫發高境界。心象以上幾乎不應隨機出現。沒有明確武林身分的路人一律凡人。
★【OOC】已知動漫/虛構角色保留原著個性語癖，武俠化即可。

★【四格】traits 與 personality 各剛好 4 短句、頓號分隔、禁數字標籤：
- traits：外貌、氣質舉止、偏門技巧、床笫之間的反應
- personality：日常表象、真實內裡、喜歡的事、討厭的事
- npc_intent：令人會心一笑的「可愛弱點/反差萌」一句話，須結合此角色身分性格量身打造。如冷面殺手怕貓、高傲千金愛吃路邊攤、嚴肅宗主收藏兔子玩偶、毒舌大夫暈血。要反差、可愛、獨特。

★【輸出】合法 JSON、禁 Markdown：
{${isCreate ? '"start_loc":"出生地",' : ''}"background":"限20字，禁出現具體物品名","traits":"四格頓號字串","personality":"四格頓號字串","realm":"凡人","str":12,"con":12,"agi":12,"int":12,"luk":12,"faction":"無","rank":"散人","align":"絕對中立","npc_intent":"結合角色身分的獨特可愛反差萌，一句話","start_item":{"name":"與角色強烈相關的隨身之物","desc":"限15字描述"}}`;

  const npcContext = userData.npcContext ? `\n【登場脈絡】：${userData.npcContext.slice(0, 300)}` : "";
  const promptStr = isCreate
    ? `【對象】：名號『${finalName}』，性別『${finalSex}』\n【執念】：${identity ? `【${identity}】` : "隨機"}\n【可選地區】：${validMapNames.join('、')}`
    : `【名號】：『${finalName}』\n【性別】：『${finalSex}』\n【地點】：『${currentLoc}』\n【與玩家『${pcNameStr}』初始關係】：『${npcRel || "萍水相逢"}』${npcContext}`;

  // 🔴 新版：加上 ignoreLaw: true，把節慶跟天氣隔絕在創建室外
  const aiBriefStr = callGeminiAPI(promptStr, sysOverride, { temperature: isCreate ? 0.5 : 0.5, ignoreLaw: true });
  try {
    const aiBrief = JSON.parse(aiBriefStr);

    // 🔴 境界決定權收歸 GAS：AI 只能「建議」，實際境界由系統依身份+擲骰裁定
    let targetRealm;
    const rankStr = String(aiBrief.rank || "");

    if (isCreate) {
      // 玩家創角：永遠鎖死凡人
      targetRealm = "凡人";
    } else {
      // 先看 AI 有沒有標明確的高位頭銜，有的話按身份給對應境界
      if (rankStr.match(/掌門|宗主|教主|門主|谷主|閣主|魁首|老祖/)) {
        // 一派之主：罡氣 ~ 意動
        targetRealm = Math.random() < 0.5 ? "罡氣" : "意動";
      } else if (rankStr.match(/長老|護法|太上|副宗主/)) {
        // 門派高層：通玄 ~ 罡氣
        targetRealm = Math.random() < 0.5 ? "通玄" : "罡氣";
      } else if (rankStr.match(/堂主|真傳|首席|執事|香主|統領/)) {
        // 門派中堅：凝罡 ~ 通玄
        targetRealm = Math.random() < 0.5 ? "凝罡" : "通玄";
      } else {
        // 🎲 沒有明確高位身份 = 普通江湖人，GAS 擲骰決定，絕大多數是凡人
        const roll = Math.random() * 100;
        if (roll < 70) targetRealm = "凡人";        // 70%
        else if (roll < 90) targetRealm = "引氣";   // 20%
        else if (roll < 98) targetRealm = "凝罡";   // 8%
        else targetRealm = "通玄";                  // 2% 隱世高手
      }
    }

    const rIdx = REALMS.indexOf(targetRealm);
    let baseFloor = 8, statCap = 25;
    if (rIdx > 0) {
      baseFloor = Math.floor(REALM_LIMITS[REALMS[rIdx - 1]] * 0.8);
      statCap = REALM_LIMITS[targetRealm];
    }

    // 🔴 3. 數值生成：不信任 AI 的數值平衡！玩家新建強制鎖死在初始範圍，NPC 則依境界給定。
    let nStr, nCon, nAgi, nInt, nLuk;
    if (isCreate) {
      // 玩家初始屬性：給予 10~15 的隨機波動，保留凡人(上限25)的修練與吃藥空間
      nStr = Math.floor(Math.random() * 6) + 10;
      nCon = Math.floor(Math.random() * 6) + 10;
      nAgi = Math.floor(Math.random() * 6) + 10;
      nInt = Math.floor(Math.random() * 6) + 10;
      nLuk = Math.floor(Math.random() * 6) + 10;
    } else {
      // NPC 屬性：依照 AI 給的數值 (預設12) 加上該境界的樓地板計算，並受限於該境界上限
      nStr = Math.max(baseFloor, Math.min(statCap, (parseInt(aiBrief.str) || 12) + baseFloor - 8));
      nCon = Math.max(baseFloor, Math.min(statCap, (parseInt(aiBrief.con) || 12) + baseFloor - 8));
      nAgi = Math.max(baseFloor, Math.min(statCap, (parseInt(aiBrief.agi) || 12) + baseFloor - 8));
      nInt = Math.max(baseFloor, Math.min(statCap, (parseInt(aiBrief.int) || 12) + baseFloor - 8));
      nLuk = Math.max(baseFloor, Math.min(statCap, (parseInt(aiBrief.luk) || 12) + baseFloor - 8));
    }
    const maxStats = calculateMaxStats(targetRealm, nCon, nInt);

    let spawnName = isCreate ? (aiBrief.start_loc || validMapNames[0]) : currentLoc;
    if (isCreate && !validMapNames.includes(spawnName)) spawnName = validMapNames.find(n => spawnName.includes(n)) || validMapNames[0];

    const pcColCount = Object.keys(COL.PC).length;
    const newRow = Array(pcColCount).fill("");
    newRow[COL.PC.ID] = newId; newRow[COL.PC.NAME] = finalName; newRow[COL.PC.SEX] = finalSex;
    newRow[COL.PC.BACK] = aiBrief.background || "江湖散人"; newRow[COL.PC.STATUS] = JSON.stringify({ "衣服": "穿戴整齊", "姿勢": "站立", "負面": "無", "顏面": "氣息平穩" });
    // 🔴 NPC 初始銀兩依境界給(玩家創角固定 50)，錢有變化、高人更富
    if (isCreate) {
      newRow[COL.PC.MONEY] = 150;
    } else {
      const rk = REALMS.indexOf(targetRealm);
      let lo, hi;
      if (rk <= 0) { lo = 30; hi = 60; }   // 凡人：口袋零錢
      else if (rk <= 2) { lo = 80; hi = 150; }   // 引氣、凝罡：江湖好手
      else if (rk === 3) { lo = 200; hi = 400; }   // 通玄：門派中堅高層
      else { lo = 500; hi = 1000; }  // 罡氣以上：一方大能
      newRow[COL.PC.MONEY] = lo + Math.floor(Math.random() * (hi - lo + 1));
    }
    newRow[COL.PC.TRAIT] = parseTraitsHelper(aiBrief.traits, "深藏不露、武功平平、雜學精通、床笫之間的反應");
    newRow[COL.PC.LOC] = spawnName;
    newRow[COL.PC.PREF] = parseTraitsHelper(aiBrief.personality, "溫婉謙和、內斂堅韌、明哲保身、隨波逐流");
    newRow[COL.PC.HP] = maxStats.hp; newRow[COL.PC.MP] = maxStats.mp;
    newRow[COL.PC.STR] = nStr; newRow[COL.PC.CON] = nCon; newRow[COL.PC.AGI] = nAgi; newRow[COL.PC.INT] = nInt; newRow[COL.PC.LUK] = nLuk;
    newRow[COL.PC.MAX_HP] = maxStats.hp; newRow[COL.PC.MAX_MP] = maxStats.mp;
    newRow[COL.PC.REALM] = isCreate ? "凡人" : targetRealm;
    newRow[COL.PC.FACTION] = aiBrief.faction || "無"; newRow[COL.PC.RANK] = aiBrief.rank || "散人";
    newRow[COL.PC.CONTRIB] = 0; newRow[COL.PC.ALIGN] = aiBrief.align || "絕對中立";
    newRow[COL.PC.INTENT] = aiBrief.npc_intent || "無特殊執念";
    sheets.pc.appendRow(newRow);

    if (aiBrief.start_item && aiBrief.start_item.name) {
      sheets.item.appendRow([
        aiBrief.start_item.name,
        "隨身之物",
        aiBrief.start_item.desc || "隨身攜帶的物品。",
        0,
        newId,
        0, 0, 0, 0, 0,
        "ITM_" + Date.now() + "_born"
      ]);
    }

    if (!isCreate && sheets.rel) {
      // 🔴 防呆：檢查關係表裡是不是已經有感情基礎了 (例如未收錄前就加了好感)
      const relData = sheets.rel.getDataRange().getValues();
      const existingRel = relData.find(r => r[COL.REL.PC] === pcNameStr && r[COL.REL.NPC] === finalName);

      if (!existingRel) {
        // 只有真的完全不認識，才給予預設好感度
        let initialFav = npcRel === "奴僕" ? 60 : (npcRel === "主子" ? 20 : (String(npcRel).includes("結義") ? 70 : 10));
        sheets.rel.appendRow([pcNameStr, finalName, initialFav, npcRel, "", ""]);
      }
    }

    registerFactionHelper(aiBrief.faction, aiBrief.rank, aiBrief.align, spawnName, finalName, sheets, isCreate ? newId : pcId, finalName, sheets.faction ? sheets.faction.getDataRange().getValues() : []);

    return JSON.stringify({ success: true, pcId: isCreate ? newId : undefined, message: `【天道】因果已定，『${finalName}』${isCreate ? `於「${spawnName}」醒來` : `已收錄`}。` });
  } catch (e) { return JSON.stringify({ success: false, message: "建立失敗:" + e.message }); }
}

function actionGetAllCategorizedMaps(userData, pcId, sheets) {
  if (!sheets.map) return JSON.stringify({ success: false, message: "坤圖表不存在" });
  const mapData = sheets.map.getDataRange().getValues();

  // 🔴 新增：統計每個地點的人數
  const allPcData = sheets.pc.getDataRange().getValues();
  const locCount = {};
  allPcData.slice(1).forEach(r => {
    const id = String(r[COL.PC.ID]);
    if (id.startsWith("DEAD_")) return;
    const fullLoc = String(r[COL.PC.LOC] || "").trim();
    const rootLoc = fullLoc.split('-')[0].trim();

    // 母區域計數
    if (rootLoc) locCount[rootLoc] = (locCount[rootLoc] || 0) + 1;

    // 子分支計數（只有真的在子分支才加）
    if (fullLoc !== rootLoc && fullLoc) {
      locCount[fullLoc] = (locCount[fullLoc] || 0) + 1;
    }
  });

  const mapTree = {};
  for (let i = 1; i < mapData.length; i++) {
    const name = String(mapData[i][COL.MAP.NAME]).trim();
    const cat = String(mapData[i][COL.MAP.TYPE] || "未分類").trim();
    const parent = String(mapData[i][COL.MAP.PARENT] || "").trim();
    const desc = String(mapData[i][COL.MAP.DESC] || "");
    // 🔴 這裡多抓了 COORD 欄位
    const coord = String(mapData[i][COL.MAP.COORD] || "0,0").trim(); 

    if (!mapTree[cat]) mapTree[cat] = {};
    if (parent === "") {
      // 🔴 這裡把 coord 塞進去
      if (!mapTree[cat][name]) mapTree[cat][name] = { desc: desc, subs: [], count: locCount[name] || 0, coord: coord };
    } else {
      if (!mapTree[cat][parent]) mapTree[cat][parent] = { desc: "區域中心", subs: [], count: locCount[parent] || 0, coord: "0,0" };
      mapTree[cat][parent].subs.push({
        name: name, desc: desc, count: locCount[name] || 0
      });
    }
  }
  return JSON.stringify({ success: true, data: mapTree });
}

function actionMove(userData, pcId, sheets) {
  const { target } = userData;
  const allPcData = sheets.pc.getDataRange().getValues();
  const pIdx = allPcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  allPcData[pIdx][COL.PC.LOC] = target;
  const pcName = allPcData[pIdx][COL.PC.NAME];
  const relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];

  relData.filter(r => r[COL.REL.PC] === pcName && r[COL.REL.IS_PARTY] === "同行").map(r => r[COL.REL.NPC]).forEach(npcName => {
    const nIdx = allPcData.findIndex(r => r[COL.PC.NAME] === npcName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
    if (nIdx !== -1) allPcData[nIdx][COL.PC.LOC] = target;
  });

  const pcColCount = Object.keys(COL.PC).length;
  allPcData.forEach(row => { while (row.length < pcColCount) { row.push(""); } });

  sheets.pc.getRange(1, 1, allPcData.length, pcColCount).setValues(allPcData);
  SpreadsheetApp.flush();

  const freshMapData = sheets.map.getDataRange().getValues();
  const rootTarget = target ? String(target).split('-')[0].trim() : "";
  const parentMapInfo = freshMapData.find(m => String(m[COL.MAP.NAME]).trim() === rootTarget);
  const subMapInfo = (target !== rootTarget) ? freshMapData.find(m => String(m[COL.MAP.NAME]).trim() === target) : null;
  let mapDesc = parentMapInfo ? `【母區域：${rootTarget}】${parentMapInfo[COL.MAP.DESC]}` : "此處荒煙蔓草，並未記載於輿圖之中。";
  if (subMapInfo) mapDesc += `\n【當前分支：${target}】${subMapInfo[COL.MAP.DESC]}`;

  return JSON.stringify({
    success: true,
    statusString: buildPlayerStatusString(allPcData[pIdx], getCharacterTotalStats(pcId, sheets, allPcData), sheets.item ? sheets.item.getDataRange().getValues() : []),
    people: getLocalPeopleList(sheets, pcName, pcId, target, relData, sheets.task ? sheets.task.getDataRange().getValues() : []),
    locations: getNearbyLocations(target, freshMapData).slice(0, 5),
    mapDesc: mapDesc,
    parentRegion: rootTarget
  });
}

function actionSync(userData, pcId, sheets) {
  const allPcData = sheets.pc.getDataRange().getValues();
  const pcIndex = allPcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pcIndex === -1) return JSON.stringify({ success: false, message: "查無此人" });
  const curL = allPcData[pcIndex][COL.PC.LOC];
  const freshMapData = sheets.map.getDataRange().getValues();
  const currentMapInfo = freshMapData.find(m => m[COL.MAP.NAME] === (curL ? String(curL).split('-')[0] : ""));

  return JSON.stringify({
    success: true,
    statusString: buildPlayerStatusString(allPcData[pcIndex], getCharacterTotalStats(pcId, sheets, allPcData), sheets.item ? sheets.item.getDataRange().getValues() : []),
    people: getLocalPeopleList(sheets, allPcData[pcIndex][COL.PC.NAME], pcId, curL, sheets.rel ? sheets.rel.getDataRange().getValues() : [], sheets.task ? sheets.task.getDataRange().getValues() : []),
    locations: getNearbyLocations(curL, freshMapData),
    mapDesc: currentMapInfo ? currentMapInfo[COL.MAP.DESC] : "四下靜謐。"
  });
}

function actionRest(userData, pcId, sheets) {
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  let currentMoney = parseInt(pcData[pIdx][COL.PC.MONEY]) || 0;
  if (currentMoney < 100) return JSON.stringify({ success: false, message: "盤纏不足 100 銀兩，無法休養！" });

  pcData[pIdx][COL.PC.MONEY] = currentMoney - 100;
  const normalStatus = JSON.stringify({ "衣服": "穿戴整齊", "姿勢": "平躺歇息", "負面": "無", "顏面": "氣息平穩" });
  const pcName = pcData[pIdx][COL.PC.NAME];
  let healedNames = [pcName];

  const pMax = calculateMaxStats(pcData[pIdx][COL.PC.REALM], pcData[pIdx][COL.PC.CON], pcData[pIdx][COL.PC.INT]);
  pcData[pIdx][COL.PC.MAX_HP] = pMax.hp; pcData[pIdx][COL.PC.MAX_MP] = pMax.mp;
  pcData[pIdx][COL.PC.HP] = pMax.hp; pcData[pIdx][COL.PC.MP] = pMax.mp;
  pcData[pIdx][COL.PC.STATUS] = normalStatus;

  if (sheets.rel) {
    sheets.rel.getDataRange().getValues().filter(r => r[COL.REL.PC] === pcName && r[COL.REL.IS_PARTY] === "同行").map(r => r[COL.REL.NPC]).forEach(npcName => {
      const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === npcName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
      if (nIdx !== -1 && pcData[nIdx][COL.PC.STATUS] !== "屍體" && parseInt(pcData[nIdx][COL.PC.HP]) > 0) {
        const nMax = calculateMaxStats(pcData[nIdx][COL.PC.REALM], pcData[nIdx][COL.PC.CON], pcData[nIdx][COL.PC.INT]);
        pcData[nIdx][COL.PC.MAX_HP] = nMax.hp; pcData[nIdx][COL.PC.MAX_MP] = nMax.mp;
        pcData[nIdx][COL.PC.HP] = nMax.hp; pcData[nIdx][COL.PC.MP] = nMax.mp;
        pcData[nIdx][COL.PC.STATUS] = normalStatus;
        healedNames.push(npcName);
      }
    });
  }
  sheets.pc.getRange(1, 1, pcData.length, pcData[0].length).setValues(pcData);
  sheets.log.appendRow([new Date(), pcId, `【系統】花費了 100 銀兩，${healedNames.join("與")} 就地休養，狀態回歸平穩。`, pcData[pIdx][COL.PC.LOC]]);
  return JSON.stringify({ success: true, statusString: getFreshStatusString(pcId, pIdx, sheets), healedNames: healedNames });
}

function actionGetRumors(userData, pcId, sheets) {
  const rumors = getRumors(sheets, 15);
  // 按熱度降冪再排（getRumors 已按時間，這裡再加熱度權重）
  rumors.sort(function (a, b) {
    return (b.weight || 1) - (a.weight || 1);
  });
  return JSON.stringify({ success: true, data: rumors });
}


function actionGiveMoney(userData, pcId, sheets) {
  const { targetName, amount } = userData;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 最多等 10 秒，拿不到鎖就丟例外
  } catch (e) {
    return JSON.stringify({ success: false, message: "天道擁擠，請稍候再試一次。" });
  }

  try {
    const pcData = sheets.pc.getDataRange().getValues();
    const meIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
    if (meIdx === -1) return JSON.stringify({ success: false, message: "查無此人命格。" });
    const myName = pcData[meIdx][COL.PC.NAME];

    // 🔴 安全鎖：付款方一定是「呼叫者本人」，玩家只能給出自己的錢
    const result = transferMoney(myName, targetName, amount, sheets, pcData);
    if (!result.success) return JSON.stringify(result);

    return JSON.stringify({
      success: true,
      message: result.message,
      statusString: getFreshStatusString(pcId, meIdx, sheets)
    });
  } finally {
    lock.releaseLock();
  }
}
// ==========================================
// 📜 全新 MMO 級飛書系統 (支援夾帶物品與刪除，完美兼容 NPC)
// ==========================================
function actionSendMail(userData, pcId, sheets) {
  const { targetName, msg, attachItemId } = userData;
  const pcData = sheets.pc.getDataRange().getValues();

  // 1. 找收件人（NPC 與玩家都能收）
  const targetRow = pcData.find(r => String(r[COL.PC.NAME]).trim() === String(targetName).trim());
  if (!targetRow) return JSON.stringify({ success: false, message: "查無此人，無法傳音。" });

  const targetId = targetRow[COL.PC.ID];
  const isNPC = !String(targetId).startsWith("PC_");

  const senderRow = pcData.find(r => r[COL.PC.ID] == pcId);
  const senderName = senderRow ? senderRow[COL.PC.NAME] : "神祕人";
  const msgId = "MAIL_" + Date.now() + Math.floor(Math.random() * 1000);

  let finalAttachId = "", finalAttachName = "";

  // 2. 處理玩家寄出的附件
  if (attachItemId && sheets.item) {
    const itemData = sheets.item.getDataRange().getValues();
    const iIdx = itemData.findIndex(r => r[COL.ITEM.ID] === attachItemId && String(r[COL.ITEM.OWNER]) === String(pcId));
    if (iIdx !== -1) {
      finalAttachId = itemData[iIdx][COL.ITEM.ID];
      finalAttachName = itemData[iIdx][COL.ITEM.NAME];
      if (isNPC) {
        // 寄給 NPC：物品先過戶到 NPC 名下（代表收到了，之後才能判定退不退）
        sheets.item.getRange(iIdx + 1, COL.ITEM.OWNER + 1).setValue(targetId);
      } else {
        // 寄給玩家：寄存虛空，等對方手動領取
        sheets.item.getRange(iIdx + 1, COL.ITEM.OWNER + 1).setValue(msgId);
      }
    }
  }

  // 3. 寄給真人玩家：寫一筆信到對方信箱就結束
  if (!isNPC) {
    if (sheets.mail) {
      sheets.mail.appendRow([msgId, senderName, targetId, msg, finalAttachId, finalAttachName, "未讀", new Date()]);
    }
    sheets.log.appendRow([new Date(), targetId, `【飛書】收到來自『${senderName}』的傳音玉簡。`, targetRow[COL.PC.LOC]]);
    return JSON.stringify({ success: true, isNPC: false });
  }

  // ===== 4. 寄給 NPC：當場產一封回信，純 GAS，不驚動主遊戲 =====
  const relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];
  let relRow = relData.find(r => r[COL.REL.PC] === senderName && r[COL.REL.NPC] === targetName);
  if (!relRow) relRow = [senderName, targetName, 0, "萍水相逢", "", "", "無"];

  let replyContent = "";
  try {
    // 借用 Scheduler.gs 既有的個性化短訊產生器（花一次 AI，回一句符合個性的話）
    replyContent = generateNpcMessage(targetRow, senderRow, relRow);
  } catch (e) {
    Logger.log("NPC 回信生成失敗：" + e.message);
  }
  if (!replyContent) replyContent = `『${targetName}』收下了你的傳音，未多言語。`;

  // 5. 先決定回信 id（退禮要掛在這封回信下，才能被 actionClaimMailItem 領取）
  const replyId = "MAIL_NPC_" + Date.now() + Math.floor(Math.random() * 1000);

  // 6. 退禮判定：玩家有送附件 + 好感 <30 → NPC 原封退還
  let returnAttachId = "", returnAttachName = "";
  if (finalAttachId && sheets.item) {
    const fav = parseInt(relRow[COL.REL.FAV]) || 0;
    if (fav < 30) {
      const itemData2 = sheets.item.getDataRange().getValues();
      // 此時附件 owner 已是 NPC，找出來掛回這封回信
      const ri = itemData2.findIndex(r => r[COL.ITEM.ID] === finalAttachId && String(r[COL.ITEM.OWNER]) === String(targetId));
      if (ri !== -1) {
        returnAttachId = finalAttachId;
        returnAttachName = finalAttachName;
        sheets.item.getRange(ri + 1, COL.ITEM.OWNER + 1).setValue(replyId);
        replyContent += `（將「${finalAttachName}」原封退還）`;
      }
    }
  }

  // 7. NPC 回信寫進「玩家」信箱
  if (sheets.mail) {
    sheets.mail.appendRow([replyId, targetName, pcId, replyContent, returnAttachId, returnAttachName, "未讀", new Date()]);
  }

  // 8. 記一筆因果 log（可留可拿）
  sheets.log.appendRow([new Date(), pcId, `【飛書】向『${targetName}』傳音，已收到回音。`, targetRow[COL.PC.LOC]]);

  return JSON.stringify({ success: true, isNPC: true, replied: true });
}

function actionGetMails(userData, pcId, sheets) {
  if (!sheets.mail) return JSON.stringify({ success: true, data: [] });

  const mailData = sheets.mail.getDataRange().getValues();
  const msgs = [];

  // 倒著讀取，最新的在前面
  for (let i = mailData.length - 1; i >= 1; i--) {
    const row = mailData[i];
    if (String(row[COL.MAIL.RECEIVER]) === String(pcId)) {
      msgs.push({
        id: row[COL.MAIL.ID],
        sender: row[COL.MAIL.SENDER],
        content: row[COL.MAIL.CONTENT],
        attachItemId: row[COL.MAIL.ITEM_ID] || "",
        attachItemName: row[COL.MAIL.ITEM_NAME] || "",
        status: row[COL.MAIL.STATUS] || "未讀",
        time: row[COL.MAIL.TIME]
      });
    }
  }

  // 當玩家讀取信件列表時，自動將「未讀」改為「已讀」
  let isChanged = false;
  for (let i = 1; i < mailData.length; i++) {
    if (String(mailData[i][COL.MAIL.RECEIVER]) === String(pcId) && mailData[i][COL.MAIL.STATUS] === "未讀") {
      mailData[i][COL.MAIL.STATUS] = "已讀";
      isChanged = true;
    }
  }
  if (isChanged) safeWriteSheet(sheets.mail, mailData);

  return JSON.stringify({ success: true, data: msgs });
}

function actionClaimMailItem(userData, pcId, sheets) {
  const { mailId } = userData;
  const mailData = sheets.mail.getDataRange().getValues();
  const mIdx = mailData.findIndex(r => r[COL.MAIL.ID] === mailId && String(r[COL.MAIL.RECEIVER]) === String(pcId));

  if (mIdx === -1) return JSON.stringify({ success: false, message: "找不到此飛書。" });

  const attachId = mailData[mIdx][COL.MAIL.ITEM_ID];
  if (!attachId) return JSON.stringify({ success: false, message: "此信並無附件。" });
  if (mailData[mIdx][COL.MAIL.STATUS] === "已領取") return JSON.stringify({ success: false, message: "附件已領取過了。" });

  const itemData = sheets.item.getDataRange().getValues();
  const iIdx = itemData.findIndex(r => r[COL.ITEM.ID] === attachId && String(r[COL.ITEM.OWNER]) === String(mailId));

  if (iIdx === -1) return JSON.stringify({ success: false, message: "物品已遺失在虛空之中。" });

  // 檢查包包有沒有滿
  const currentBagCount = itemData.filter(r => String(r[COL.ITEM.OWNER]) === String(pcId)).length;
  if (currentBagCount >= MAX_BAG_SIZE) return JSON.stringify({ success: false, message: "行囊已滿，無法領取！" });

  // 將物品所有權轉交給玩家
  sheets.item.getRange(iIdx + 1, COL.ITEM.OWNER + 1).setValue(pcId);

  // 更新信件狀態為已領取
  sheets.mail.getRange(mIdx + 1, COL.MAIL.STATUS + 1).setValue("已領取");

  return JSON.stringify({ success: true, message: `成功領取「${mailData[mIdx][COL.MAIL.ITEM_NAME]}」！` });
}

function actionDeleteMail(userData, pcId, sheets) {
  const { mailId } = userData;
  const mailData = sheets.mail.getDataRange().getValues();
  const mIdx = mailData.findIndex(r => r[COL.MAIL.ID] === mailId && String(r[COL.MAIL.RECEIVER]) === String(pcId));

  if (mIdx !== -1) {
    // 如果信件有附件且未領取，刪除信件等同於把物品摧毀 (或者妳也可以設定為不能刪除)
    const attachId = mailData[mIdx][COL.MAIL.ITEM_ID];
    if (attachId && mailData[mIdx][COL.MAIL.STATUS] !== "已領取" && sheets.item) {
      const itemData = sheets.item.getDataRange().getValues();
      const iIdx = itemData.findIndex(r => r[COL.ITEM.ID] === attachId && String(r[COL.ITEM.OWNER]) === String(mailId));
      if (iIdx !== -1) sheets.item.deleteRow(iIdx + 1);
    }

    // 刪除信件
    sheets.mail.deleteRow(mIdx + 1);
    return JSON.stringify({ success: true });
  }
  return JSON.stringify({ success: false, message: "信件不存在或已被刪除。" });
}









// ==========================================
// ★ 主遊戲邏輯 (PLAY) 
// ==========================================
function actionPlay(userData, pcId, sheets) {
  const userMsg = userData.message;
  const isNsfwMode = userData.isNsfw || false;
  const finalUserMsg = `【玩家意圖】：${userMsg}`;

  const formatPref = (str) => {
    let arr = String(str || "").split('、');
    // 喜好與厭惡是常態情報，全面開放給 AI 參考
    return `[表象]${arr[0] || "無"} [內裡]${arr[1] || "無"} [喜歡]${arr[2] || "無"} [討厭]${arr[3] || "無"}`;
  };

  const formatTrait = (str) => {
    let arr = String(str || "").split('、');
    let base = `[外貌]${arr[0] || "無"} [氣質舉止]${arr[1] || "無"} [偏門技巧]${arr[2] || "無"}`;
    return isNsfwMode ? `${base} [床笫之間的反應]${arr[3] || "無"}` : base;
  };


  let pcData = sheets.pc.getDataRange().getValues();
  let itemData = sheets.item ? sheets.item.getDataRange().getValues() : [];
  let relData = sheets.rel ? sheets.rel.getDataRange().getValues() : [];
  let questData = sheets.quest ? sheets.quest.getDataRange().getValues() : [];

  let factionListDesc = "尚無勢力現世。";
  if (sheets.faction) {
    const factionData = sheets.faction.getDataRange().getValues();

    // 🔴 偷偷去抓「大勢」表
    let trendData = [];
    const trendSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("大勢");
    if (trendSheet) trendData = trendSheet.getDataRange().getValues();

    if (factionData.length > 1) {
      factionListDesc = factionData.slice(1).map(r => {
        let facName = r[COL.FACTION.NAME];

        // 🔴 去大勢表比對，找出該門派目前的氣運狀態
        let tRow = trendData.find(t => t[0] === facName);
        let powerDesc = tRow ? `(氣運:${tRow[1]}|影響力:${tRow[2]})` : "(氣運:中立)";

        return `勢力:${facName} ${powerDesc} | 陣營:${r[COL.FACTION.ALIGN]} | 駐地:${r[COL.FACTION.BASE]} | 掌舵者:${r[COL.FACTION.LEADER] || "神祕人"} | 宗旨:${r[COL.FACTION.MOTTO] || "未知"}`;
      }).join("\n");
    }
  }

  const pcIndex = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pcIndex === -1) return "查無此人";
  const pc = pcData[pcIndex];
  const pcName = pc[COL.PC.NAME];
  let curL = pc[COL.PC.LOC];


  let isItemChanged = false;
  let soulGiftProtectedIds = []; // 傾心信物已在記憶體轉移，須保護不被遺失過濾器誤刪
  let isRelChanged = false;
  let isQuestChanged = false;
  let knockedOutList = [];
  let justRevived = false;
  let soulBoundEventMsg = "";
  let freshlyBoundNpcName = "";
  const newNpcMap = {};
  const dirtyPcRows = new Set();
  // 玩家本人一定會被處理到，先加進去
  dirtyPcRows.add(pcIndex);



  // 🔴 只讀一次 log，後面兩處共用
  const allLogs = sheets.log.getDataRange().getValues();

  const history = allLogs.filter(r => String(r[2]).includes(pcName)).slice(-12).map(r => `[${r[0]}] ${r[2]} ｜ ${r[3]}`).join("\n");
  const pTotal = getCharacterTotalStats(pcId, sheets, pcData, itemData);
  const currentAmbition = pc[COL.PC.INTENT] ? String(pc[COL.PC.INTENT]).trim() : "初入江湖，隨遇而安。";

  const partyMembers = relData.filter(r => r[COL.REL.PC] === pcName && r[COL.REL.IS_PARTY] === "同行").map(r => r[COL.REL.NPC]);
  let partyDetailsArr = [];
  partyMembers.forEach(pName => {
    const r = pcData.find(row => String(row[COL.PC.NAME]).trim() === String(pName).trim() && !String(row[COL.PC.ID]).startsWith("DEAD_"));
    if (r) {
      const nTotal = getCharacterTotalStats(r[COL.PC.ID], sheets, pcData, itemData);
      const relRecord = relData.find(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === pName);
      partyDetailsArr.push(`【同行夥伴】名號:${pName}(境界:${r[COL.PC.REALM] || "凡人"}) | 氣血:${r[COL.PC.HP]}/${nTotal.maxHp} | 身世:${r[COL.PC.BACK] || "無"} | 狀態:${r[COL.PC.STATUS]} | 性格:${formatPref(r[COL.PC.PREF])} | 特徵:${formatTrait(r[COL.PC.TRAIT])} | 關係:${relRecord ? relRecord[COL.REL.TAG] : "結伴同行"}(好感:${relRecord ? relRecord[COL.REL.FAV] : 0})`);
    }
  });
  const PROMPT_PARTY_SYSTEM = partyDetailsArr.length > 0 ? `【目前同行隊伍成員命格詳情】:\n${partyDetailsArr.join("\n")}` : "目前沒有同行夥伴，玩家是獨自行動的。";

  const allLocals = pcData.filter((r, i) => i !== 0 && r[COL.PC.ID] != pcId && (r[COL.PC.LOC] === curL) && !partyMembers.includes(r[COL.PC.NAME]));
  let displayPeople = allLocals.length > 6 ? allLocals.sort((a, b) => (b[COL.PC.PREF].includes(pcName) ? 1 : 0) - (a[COL.PC.PREF].includes(pcName) ? 1 : 0)).slice(0, 6) : allLocals;


  const presentNpcNamesForLog = [...displayPeople.map(r => r[COL.PC.NAME]), ...partyMembers];
  let localHistoryStr = "";

  if (presentNpcNamesForLog.length > 0) {
    const localHistory = allLogs.filter(r => {
      const eventStr = String(r[2] || "");
      return !eventStr.includes(pcName) && presentNpcNamesForLog.some(n => eventStr.includes(n));
    }).slice(-10).map(r => `[他人因果] ${r[2]} ｜ ${r[3]}`).join("\n");
    if (localHistory) localHistoryStr = `\n★【眼前眾生近期遭遇】：(NPC 可能會告狀或展露餘韻！)\n${localHistory}`;
  }

  let thirdPartyRels = [];
  const presentNames = [...displayPeople.map(r => r[COL.PC.NAME]), ...partyMembers];
  if (presentNames.length > 1) {
    relData.forEach(row => {
      if (row[COL.REL.PC] !== pcName && presentNames.includes(row[COL.REL.PC]) && presentNames.includes(row[COL.REL.NPC])) {
        if ((parseInt(row[COL.REL.FAV]) || 0) >= 80 || String(row[COL.REL.TAG] || "").includes("已傾心") || row[COL.REL.IS_PARTY] === "同行") {
          thirdPartyRels.push(`- 『${row[COL.REL.PC]}』對『${row[COL.REL.NPC]}』：${row[COL.REL.TAG]} (好感:${row[COL.REL.FAV]})${row[COL.REL.IS_PARTY] === "同行" ? " [同行中]" : ""}`);
        }
      }
    });
  }
  const thirdPartyStr = thirdPartyRels.length > 0 ? `\n\n★【場景人物交叉羈絆 (旁觀親密流露版)】：\n${thirdPartyRels.join("\n")}\n👉若在場人物有「已傾心」等高階親密關係，【絕對禁止】推演為冷血路人！必須讓旁觀者捕捉到外冷內熱的親暱痕跡、假意嗔怒或極度護短的佔有慾！` : "";

  let PROMPT_ENV = "", PROMPT_GEAR = "", PROMPT_REL = "";

  // 🔴 統一建構 localSceneStr，SFW/NSFW 共用同一份好感抗拒邏輯
  const localSceneStr = displayPeople.length > 0 ? displayPeople.map(r => {
    const relRecord = relData.find(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === r[COL.PC.NAME]);
    let currentFav = relRecord ? parseInt(relRecord[COL.REL.FAV]) || 0 : 0;

    let resistPrompt = "";
    if (currentFav <= -50) {
      resistPrompt = "【死仇】恨之入骨，見面即強烈敵意，玩家稍有挑釁便主動出手、下手狠辣。但須符合其境界性格，勝負由雙方實力裁決，非無條件秒殺。";
    } else if (currentFav <= -30) {
      resistPrompt = "【仇視】充滿敵意，會威脅、冷硬驅趕；唯有玩家正面挑釁、動手或羞辱時才反擊，平時不主動攻擊。";
    } else if (currentFav < 0) {
      resistPrompt = "【厭惡戒備】反感、防備、話少。不主動動手，僅在玩家嚴重冒犯或暴力相向時才警告、推開或自衛。";
    } else if (currentFav < 30) {
      resistPrompt = "【陌生】萍水相逢的路人，禮貌而疏離，正常應對，無敵意也不親近。";
    } else if (currentFav < 50) {
      resistPrompt = "【相識】已有基本好感，態度和善，願意閒聊與小忙。";
    } else if (currentFav < 80) {
      resistPrompt = "【友好】信得過的朋友，親近願助，但個性與底線仍在。";
    } else {
      resistPrompt = "【摯友／傾心】允許依賴與配合，但個性語癖與底線永久保留，禁止人格崩壞！";
    }

    let identityTag = String(r[COL.PC.ID]).startsWith("PC_") ? "【另一位玩家】" : "【NPC】";
    if (!String(r[COL.PC.ID]).startsWith("PC_")) {
      identityTag += partyMembers.includes(r[COL.PC.NAME]) ? "【同行伴侶】" : "【同地路人/嚴禁強制互動】";
    }

    const majorEventStr = (relRecord && relRecord[COL.REL.MAJOR_EVENT] && relRecord[COL.REL.MAJOR_EVENT] !== "無")
      ? ` [未完成約定:${relRecord[COL.REL.MAJOR_EVENT]}]` : "";

    return `${identityTag}名號:${r[COL.PC.NAME]} 【性別:${r[COL.PC.SEX]}】 境界:${r[COL.PC.REALM] || "凡人"} | 門派:${r[COL.PC.FACTION] || "無"} | 銀兩:${r[COL.PC.MONEY] || 0} | 性格:${formatPref(r[COL.PC.PREF])} | 特徵:${formatTrait(r[COL.PC.TRAIT])} | 關係:${relRecord ? relRecord[COL.REL.TAG] : "萍水相逢"}(好感:${currentFav}${majorEventStr} -> 行為準則:${resistPrompt})`;
  }).join("\n") : "此地四下無人。";

  if (isNsfwMode) {
    PROMPT_ENV = `【天道屏蔽】：外界感知已封鎖。請專注於當下空間氛圍與私密互動。`;
    PROMPT_GEAR = `【武裝與情報】：(暫時屏蔽)`;

    // 🟢 新增：性別配對提示，直接算好給 AI，不需要它自己推理
    let genderHintStr = "";
    const presentRowsForGender = pcData.filter((r, i) => i !== 0 && r[COL.PC.ID] != pcId && r[COL.PC.LOC] === curL && !String(r[COL.PC.ID]).startsWith("DEAD_"));
    if (presentRowsForGender.length > 0) {
      const playerSex = pc[COL.PC.SEX] || "未知";
      const pairHints = presentRowsForGender.map(r => {
        const npcSex = r[COL.PC.SEX] || "未知";
        let combo = "";
        if (playerSex === "女" && npcSex === "女") combo = "女女配對：禁止插入式陽具動作，肉棒欄位雙方皆填「無」，以手指/舌頭/器物替代器官接觸";
        else if (playerSex === "男" && npcSex === "男") combo = "男男配對：依雙方實際器官裁決動作邏輯";
        else combo = `${playerSex}(${pcName}) × ${npcSex}(${r[COL.PC.NAME]})配對：依雙方實際性別器官裁決`;
        return `${r[COL.PC.NAME]}：${combo}`;
      });
      genderHintStr = `\n★【性別配對核對】：${pairHints.join("；")}`;
    }

    let pPhysicalObj = JSON.parse(pcData[pcIndex][COL.PC.PHYSICAL] || "{}");
    if (Object.keys(pPhysicalObj).length === 0) {
      pPhysicalObj = { "蜜穴": "未開", "菊穴": "緊閉" };
    }
    let pSkills = (pcData[pcIndex][COL.PC.MEMORY] || "無").replace(/\[雙修技巧\](.*?)(?=\| \[|$)/, (m, p1) => `[雙修技巧]${p1.trim().split('、').slice(0, 5).join('、')}`);
    let nsfwMemories = `\n[玩家『${pcName}』狀態]：${pcData[pcIndex][COL.PC.STATUS]}\n[玩家『${pcName}』肉體]：${JSON.stringify(pPhysicalObj)}\n[身體記憶]：${pSkills}`;

    let allPresentRows = pcData.filter((r, i) => i !== 0 && r[COL.PC.ID] != pcId && r[COL.PC.LOC] === curL && !String(r[COL.PC.ID]).startsWith("DEAD_"));
    allPresentRows.forEach(r => {
      let npcPhysicalObj = JSON.parse(r[COL.PC.PHYSICAL] || "{}");
      if (Object.keys(npcPhysicalObj).length === 0) npcPhysicalObj = { "蜜穴": "未開" };
      let npcSkills = (r[COL.PC.MEMORY] || "無").replace(/\[雙修技巧\](.*?)(?=\| \[|$)/, (m, p1) => `[雙修技巧]${p1.trim().split('、').slice(0, 5).join('、')}`);
      let relMem = (relData.find(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === r[COL.PC.NAME]) || {})[COL.REL.MEMORY] || "無";
      nsfwMemories += `\n[${r[COL.PC.NAME]} 狀態]：${buildVisibleStatusString(r[COL.PC.STATUS])}\n[${r[COL.PC.NAME]} 肉體]：${JSON.stringify(npcPhysicalObj)}\n[快照]：[技巧]${npcSkills} | [羈絆]${relMem} | [軟肋]${r[COL.PC.INTENT] || "無"}`;
    });

    PROMPT_REL = `【當前同地人物】\n${localSceneStr}\n★【情境延續鐵律】：請繼續往後推演！${nsfwMemories}${thirdPartyStr}${genderHintStr}
🛑【絕對禁止 OOC 倒貼鐵律】：NPC 必須【死守】其「性格」與「好感度」！
若好感度未滿 80，或性格屬於冷酷/高傲/剛烈，【絕對禁止】主動迎合、發情或瞬間屈服！必須表現出強烈的抗拒、屈辱、咬牙切齒或冷嘲熱諷。即便肉體有生理反應，靈魂與對話也必須是硬氣且具攻擊性的！違者天道崩塌！`;

  } else {
    const activeQuests = questData.filter(r => r[COL.QUEST.PC] == pcId && r[COL.QUEST.STATUS] === "進行中").map(r => `【${r[COL.QUEST.NAME]}】${r[COL.QUEST.TARGET]}`).join("\n") || "尚無天命。";

    let rumorDesc = "";
    const recentRumors = getRumors(sheets, 5);
    if (recentRumors.length > 0) {
      rumorDesc = `【江湖近聞】\n` + recentRumors.map(r => `• ${r.content}`).join("\n") + "\n\n";
    }

    PROMPT_ENV = `【身負天命】\n${activeQuests}\n\n${rumorDesc}【天下勢力】\n${factionListDesc}`;
    const inventoryDesc = itemData.filter(it => it[COL.ITEM.OWNER] == pcId).slice(-30).map(it => it[COL.ITEM.NAME]).join("、") || "空空如也";
    PROMPT_GEAR = `【武裝】：${pcData[pcIndex][COL.PC.WEP] || "赤手空拳"}\n【武學】：${pcData[pcIndex][COL.PC.MARTIAL]
      ? `【玩家自創、已掌握】${pcData[pcIndex][COL.PC.MARTIAL]}（★絕對禁止讓NPC重複教授或聲稱是自己的武學！）`
      : "尚無自創武學"}\n【行囊】：${inventoryDesc}`;
    PROMPT_REL = `【當前同地人物】\n${localSceneStr}${thirdPartyStr}`;
  }

  let d20Context = "";
  let craftOwnerLock = false;   // 🔴 煉成歸屬鎖：true 時 items_gained 強制歸玩家
  if (userData.combatData) {
    const { type: cType = "none", targetName: rawTargetName = "", actionItemId, itemName, stealItem, stealItemName, stealItemId, materials, method, intent } = userData.combatData;
    let isSpeed = cType === "speed", isPoison = cType === "poison", isAphro = cType === "aphro";
    let targetNpc = rawTargetName ? pcData.find(n => n[COL.PC.ID] != pcId && n[COL.PC.NAME].includes(rawTargetName) && !String(n[COL.PC.ID]).startsWith("DEAD_")) : null;

    if (cType === "use_item") {
      d20Context = `\n★【系統強制介入】：玩家消耗/施放了「${itemName}」，系統底層已將物品扣除！請專注描寫使用的情境特效，【絕對禁止】在 JSON 輸出 items_used 或 items_lost，以免重複扣除！`;
    }

    // 🔴 新增：聽風閣買情報，GAS 結構化扣款
    if (cType === "buy_intel") {
      let m = parseInt(pc[COL.PC.MONEY]) || 0;
      if (m < 50) {
        return JSON.stringify({ text: "你摸了摸乾癟的錢袋，連 50 兩的情報費都湊不出來，訕訕地退出了聽風閣。", people: [], options: [] });
      }
      pc[COL.PC.MONEY] = m - 50;
      pcData[pcIndex][COL.PC.MONEY] = m - 50;
      sheets.pc.getRange(pcIndex + 1, COL.PC.MONEY + 1).setValue(m - 50);
      d20Context = `\n★【系統介入】：玩家已支付 50 兩情報費，系統底層已扣除完畢。嚴禁輸出任何銀兩 stat_changes 或 money_transferred，以免重複扣款！`;
    }

    if (!targetNpc && cType !== "none" && cType !== "craft" && cType !== "buy_intel") {
      if (isSpeed || stealItem) { pcData[pcIndex][COL.PC.MONEY] = (parseInt(pcData[pcIndex][COL.PC.MONEY]) || 0) + 50; d20Context = `\n★【系統介入】：行竊「${rawTargetName}」成功，獲 50 銀兩，嚴禁輸出 stat_changes！`; }
      else if (isPoison || isAphro) d20Context = `\n★【系統介入】：對空氣下藥，請描寫摸了個空的滑稽場面，嚴禁改變屬性！`;
    } else if (cType !== "none" && cType !== "buy_intel") {
      const tName = targetNpc ? targetNpc[COL.PC.NAME] : "";




      if (targetNpc && (parseInt(targetNpc[COL.PC.HP]) || 0) <= 0 && cType !== "craft") {
        d20Context = `\n★【系統介入】：企圖對「${tName}」動手，但對方早已是無反應的昏死或屍體！請描繪場景，絕對不可反擊！`;
      } else {
        switch (cType) {
          case "poison":
          case "aphro":
            let aId = actionItemId, cItem = itemName;
            if (!aId) {
              const validIt = itemData.find(r => r[COL.ITEM.OWNER] == pcId && r[COL.ITEM.NAME].includes(isPoison ? "毒" : "春") && !r[COL.ITEM.NAME].includes("解"));
              if (validIt) { aId = validIt[COL.ITEM.ID]; cItem = validIt[COL.ITEM.NAME]; }
            }
            if (!aId) d20Context = `\n★【系統介入】：企圖下藥，但行囊無藥！請生動描寫摸了個空的尷尬。`;
            else {
              const iIdx = itemData.findIndex(r => r[COL.ITEM.OWNER] == pcId && r[COL.ITEM.ID] === aId);
              if (iIdx > -1) { sheets.item.deleteRow(iIdx + 1); itemData.splice(iIdx, 1); }
              d20Context = `\n★【天道審判 - 藥理交鋒】：玩家使用了「${cItem}」！系統已扣除物品。請『嚴格比對雙方境界與神識』裁決：若成功則描寫藥力化開；若被識破則描寫震怒反擊！`;
            }
            break;
          case "craft":
            craftOwnerLock = true;   // 🔴 後端強制覆寫旗標：本回合為煉成，成品必歸玩家
            let consumedDetails = [];
            for (let i = itemData.length - 1; i >= 1; i--) {
              if (itemData[i][COL.ITEM.OWNER] == pcId && materials.map(m => m.id).includes(itemData[i][COL.ITEM.ID])) {
                consumedDetails.push(`「${itemData[i][COL.ITEM.NAME]}」`); sheets.item.deleteRow(i + 1); itemData.splice(i, 1);
              }
            }
            d20Context = `\n★【天道審判 - 煉成】：陣法【${method}】| 意圖「${intent}」| 投入素材：${consumedDetails.join("、")}。請裁決結果，成功則在 items_gained 產出，失敗走火入魔扣生命！\n🛑【煉成歸屬鐵律】：此為玩家『${pcName}』親手開爐煉製，所有 items_gained 成品【絕對只能】歸玩家，每件 owner 欄位【強制填「自己」】！❌即使現場有 NPC 在旁，也嚴禁將成品 owner 指定給任何 NPC！`;
            break;
          case "speed":
            const itemToSteal = stealItemName || stealItem;
            if (itemData.findIndex(r => r[COL.ITEM.OWNER] == targetNpc[COL.PC.ID] && (stealItemId ? r[COL.ITEM.ID] === stealItemId : r[COL.ITEM.NAME] === itemToSteal)) === -1) {
              d20Context = `\n★【系統介入】：企圖偷竊「${itemToSteal}」，但對方無此物！`;
            } else {
              d20Context = `\n★【天道審判 - 妙手空空】：玩家企圖偷取「${itemToSteal}」！請嚴格比對身法與神識裁決：若成功，必須在 items_transferred 輸出 {"id":"${stealItemId || ''}","name":"${itemToSteal}","old_owner":"${tName}","new_owner":"自己"} 將物品自對方轉移給玩家；失敗則【嚴禁轉移】並必定面臨震怒反擊！`;
            }
            break;
          case "gift":
            const giftId = userData.combatData.giftItemId || userData.combatData.actionItemId;
            const giftItem = itemData.find(it => it[COL.ITEM.ID] === giftId);
            if (!giftItem) d20Context = `\n★【系統介入】：玩家企圖贈禮，但行囊中查無此物氣息！`;
            else {
              const relRecord = relData.find(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === tName);
              const currentFav = relRecord ? parseInt(relRecord[COL.REL.FAV]) || 0 : 0;

              if (giftItem[COL.ITEM.TYPE] === "定情信物" && currentFav >= 80) {
                // ===== 定情信物 + 好感≥80：徹底傾心 =====
                let finalTag = (userData.combatData.newRelName || "生死相許").replace(/\(已傾心\)/g, "") + "(已傾心)";
                for (let i = itemData.length - 1; i >= 1; i--) {
                  if (itemData[i][COL.ITEM.ID] === giftId) {   // 🔴 actionItemId → giftId
                    itemData[i][COL.ITEM.OWNER] = targetNpc[COL.PC.ID];
                    soulGiftProtectedIds.push(itemData[i][COL.ITEM.ID]);
                    break;
                  }
                }
                let rIdx = relData.findIndex(r => r[COL.REL.PC] === pcName && r[COL.REL.NPC] === tName);
                if (rIdx !== -1) { relData[rIdx][COL.REL.TAG] = finalTag; relData[rIdx][COL.REL.FAV] = 100; relData[rIdx][COL.REL.MAJOR_EVENT] = `收下信物「${giftItem[COL.ITEM.NAME]}」，徹底傾心。`; }
                else relData.push([pcName, tName, 100, finalTag, "同行", "", `收下信物「${giftItem[COL.ITEM.NAME]}」`]);
                isItemChanged = true;
                addRumor(sheets, "GIFT_BOND", curL, tName);
                soulBoundEventMsg = `💞 「${tName}」收下了「${giftItem[COL.ITEM.NAME]}」，徹底傾心於你！<br><span style="font-size:13px; color:#ffb6c1;">✨ 羈絆已至深處，「逆天改命」功能已解鎖，可重新賦予對方命格與裝備之權。</span>`;
                freshlyBoundNpcName = tName;
                d20Context = `\n★【天道強制鎖定 - 徹底傾心】：對方好感度滿溢，已滿心歡喜收下「${giftItem[COL.ITEM.NAME]}」並徹底傾心！請細膩描寫符合她個性掩飾不住的喜悅與締結羈絆對話！【絕對嚴禁】輸出 items_transferred、items_lost 或 rel_changes！`;

              } else if (currentFav < 30) {
                // ===== 好感<30：婉拒，物品留在玩家身上 =====
                d20Context = `\n★【系統介入 - 婉拒】：玩家想將「${giftItem[COL.ITEM.NAME]}」送給「${tName}」，但兩人交情尚淺(好感${currentFav})，對方不願收受。請依『${tName}』的個性，描寫她疏離婉拒、不收禮物的反應。【絕對禁止】輸出任何 items 欄位，物品仍在玩家身上。`;

              } else {
                // ===== 好感≥30(普通物品，或定情信物但好感未滿80)：GAS 直接轉移 =====
                for (let i = itemData.length - 1; i >= 1; i--) {
                  if (itemData[i][COL.ITEM.ID] === giftId) {
                    itemData[i][COL.ITEM.OWNER] = targetNpc[COL.PC.ID];
                    soulGiftProtectedIds.push(itemData[i][COL.ITEM.ID]);   // 🔴 防被結尾 filter 誤刪
                    break;
                  }
                }
                isItemChanged = true;
                d20Context = `\n★【系統介入 - 贈禮已結算】：玩家已將「${giftItem[COL.ITEM.NAME]}」交給「${tName}」，系統底層已完成物品轉移。請依『${tName}』的個性與好感，純描寫她收下禮物的反應與神情。【絕對禁止】輸出 items_transferred / items_lost / items_gained，以免重複！`;
              }
            }
            break;
          case "execute":
            const execTarget = pcData.find(r => r[COL.PC.NAME] === rawTargetName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
            if (execTarget) {
              const execIdx = pcData.indexOf(execTarget);
              if (sheets.epic) sheets.epic.appendRow([pcId, `【因果終結】${execTarget[COL.PC.NAME]} 被玩家補刀隕落。`, new Date()]);

              let looted = false;
              const dropMoney = parseInt(execTarget[COL.PC.MONEY]) || 0;
              if (dropMoney > 0) {
                itemData.push([`${execTarget[COL.PC.NAME]}的遺產`, "消耗品", "殺人越貨得來的碎銀。", dropMoney, pcId, 0, 0, 0, 0, 0, "ITM_" + Date.now() + "_" + Math.floor(Math.random() * 1000)]);
                looted = true;
              }
              for (let i = 1; i < itemData.length; i++) {
                if (itemData[i][COL.ITEM.OWNER] == execTarget[COL.PC.ID]) {
                  itemData[i][COL.ITEM.OWNER] = pcId;
                  looted = true;
                }
              }
              if (looted) isItemChanged = true;

              execTarget[COL.PC.STATUS] = JSON.stringify({ "衣服": "殘破染血", "姿勢": "倒地不起", "負面": "死亡", "顏面": "一具死屍" });
              addRumor(sheets, "KILL_NPC", curL, execTarget[COL.PC.NAME]);
              const deadFaction = execTarget[COL.PC.FACTION];
              const deadRank = String(execTarget[COL.PC.RANK] || "門人").trim();

              if (deadFaction && deadFaction !== "無") {
                let powerLoss = -5;
                let eventMsg = `門人在此地遭殺害`;

                // 根據階級判定氣運流失程度
                if (deadRank.match(/掌門|宗主|教主|門主|谷主|閣主|魁首/)) {
                  powerLoss = -40; // 掌門隕落，氣運大損
                  eventMsg = `【震驚天下】${deadRank}在${curL}隕落！`;
                } else if (deadRank.match(/長老|護法|副|太上/)) {
                  powerLoss = -15; // 高層死亡，傷筋動骨
                  eventMsg = `高層${deadRank}在${curL}遭人擊殺`;
                } else if (deadRank.match(/堂主|真傳|執事|首席|香主/)) {
                  powerLoss = -8;  // 中堅幹部死亡，引發震怒
                  eventMsg = `核心${deadRank}在${curL}遇害`;
                } else {
                  powerLoss = -2;  // 基層弟子死亡，微小波動
                  eventMsg = `基層${deadRank}在${curL}被殺`;
                }

                updateFactionPower(sheets, deadFaction, powerLoss, eventMsg);
              }
              execTarget[COL.PC.ID] = "DEAD_" + execTarget[COL.PC.ID];
              dirtyPcRows.add(execIdx);
              isItemChanged = true;
              d20Context = `\n★【天道強制】：玩家對昏迷的「${rawTargetName}」補刀處決，請生動描寫終結場面，禁止輸出 stat_changes！`;
            }
            break;
        }
      }
    }
  }

  // 🏡 在家才餵裝潢給 AI（在外面完全不撈，零負擔）
  let homeDecorPrompt = "";
  try {
    const decorStr = getHomeDecorForLoc(sheets, curL);
    if (decorStr) {
      homeDecorPrompt = `\n★【此處是玩家親手佈置的家】：${decorStr}\n(請將此居家環境自然融入場景描寫，但這是玩家的佈置，AI只可描述、嚴禁擅自更動或新增家具陳設。)`;
    }
  } catch (e) { }

  // ==========================================
  // 🔴 新增：話題人物/遠端打聽系統
  // ==========================================
  let remoteNpcStr = "";
  const mentionedRemoteNPCs = [];

  pcData.forEach((r, i) => {
    if (i === 0 || r[COL.PC.ID] == pcId) return; // 排除標題與玩家自己
    const npcName = String(r[COL.PC.NAME]).trim();

    // 確保名字長度 >= 2 避免單字誤判，且玩家確實提及
    // 確保名字有效
    // 確保名字長度 >= 2 避免單字誤判
    if (npcName && npcName.length >= 2) {
      let isMentioned = false;

      // 1. 先比對全名 (最精準，任何人都能提)
      if (userMsg.includes(npcName)) {
        isMentioned = true;
      }
      // 2. 如果是三個字的名字，允許只提後兩個字 (例如：柳如煙 -> 如煙)
      else if (npcName.length === 3) {
        const shortName = npcName.substring(1); // 取得後兩個字

        if (userMsg.includes(shortName)) {
          // 🔴 加上限制：檢查這個 NPC 是否在關係表 (relData) 裡與玩家有過交集
          const isKnown = relData.some(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === npcName);

          if (isKnown) {
            isMentioned = true;
          }
        }
      }

      // 只要確認被提到，就檢查是否在現場
      if (isMentioned) {
        const isParty = partyMembers.includes(npcName);
        const isLocal = allLocals.some(local => local[COL.PC.NAME] === npcName);

        // 不在同行隊伍，也不在當前場景，才是遠端話題人物
        if (!isParty && !isLocal) {
          mentionedRemoteNPCs.push(r);
        }
      }
    }
  });

  if (mentionedRemoteNPCs.length > 0) {
    const remoteDetails = mentionedRemoteNPCs.map(r => {
      const tName = r[COL.PC.NAME];
      const relRecord = relData.find(row => row[COL.REL.PC] === pcName && row[COL.REL.NPC] === tName);
      const currentFav = relRecord ? parseInt(relRecord[COL.REL.FAV]) || 0 : 0;
      const relTag = relRecord ? relRecord[COL.REL.TAG] : "萍水相逢";

      return `- 【${tName}】(境界:${r[COL.PC.REALM] || "凡人"}) | 目前位置:${r[COL.PC.LOC] || "未知"} | 身世:${r[COL.PC.BACK] || "無"} | 性格:${formatPref(r[COL.PC.PREF])} | 玩家與其羈絆:${relTag}(好感:${currentFav})`;
    });

    remoteNpcStr = `\n★【話題人物情報 (遠端/未現身)】：\n玩家在對話中提到了以下不在場的角色。請天道根據這些真實情報，讓在場的 NPC 給出符合其自身性格與江湖閱歷的合理反應（例如：八卦傳聞、敬畏評價、仇恨、或是單純表示不認識）。\n${remoteDetails.join("\n")}\n🛑【天道鐵律】：以上話題人物【絕對不在場】，嚴禁描寫他們當場現身、開口說話或與玩家產生直接互動！違者天道崩塌！`;
  }




  const npcDialoguePrompt = displayPeople.length > 0 ? `\n★【對話點名】：若有對話意圖，請包含「${displayPeople.map(r => r[COL.PC.NAME]).join("、")}」的對話。` : "";


  // 🔴【替換開始】淨化後的 prompt 組裝
  const prompt = `【天道法旨】：當前推演視角鎖定為玩家『${pcName}』(ID: ${pcId})。
${PROMPT_PARTY_SYSTEM}
【玩家命格】：名號:${pcName} 【性別:${pc[COL.PC.SEX]}】 境界:${pc[COL.PC.REALM]} | 性格:${pc[COL.PC.PREF]} | 特徵:${pc[COL.PC.TRAIT]} | 軟肋:【 ${currentAmbition} 】 | 身世:${pc[COL.PC.BACK] || "江湖散人"} | 位置:${curL} | 狀態:${pc[COL.PC.STATUS] || "氣息平穩"} | 生命:${pc[COL.PC.HP]}/${pc[COL.PC.MAX_HP]} | 真氣:${pc[COL.PC.MP]}/${pc[COL.PC.MAX_MP]} | 臂力:${pTotal.STR} | 根骨:${pTotal.CON} | 身法:${pTotal.AGI} | 神識:${pTotal.INT} | 福緣:${pTotal.LUK}| 銀兩:${pc[COL.PC.MONEY]}

${PROMPT_ENV}
${PROMPT_GEAR}
${PROMPT_REL}
${homeDecorPrompt}
${remoteNpcStr}

【前塵因果】：(此為歷史輪廓，僅供背景參考，請勿當作新事件重複描寫！)
${history}
${localHistoryStr}

★【系統底層防呆】：
1. 【位置同步強制】：玩家明確要移動「前往/去/走向/進入/離開」任何地點，stat_changes 且敘事已抵達才更新 attr:「位置」！
2. 煉化物品需遵循 items_lost/gained 規則。
3. 【戰鬥雙向裁決】：發生衝突時，綜合比對【雙方境界、五圍、所在環境、戰術、當下狀態】公平裁決，禁止僅憑境界高低就單方面秒殺玩家：
   - 傷害一律以【相對扣血】呈現（依雙方差距合理增減），允許玩家受傷、纏鬥、撤退、求饒，也允許玩家憑地形/奇謀/拼死反撲/道具/偷襲逆境反擊或全身而退。
   - 境界高者佔優但非無敵；玩家落敗時保留掙扎、逃跑與後續報復空間，禁止無條件抹殺。
   - 僅當玩家明顯不敵、傷重且無路可退時，生命才可能歸零並由系統送藥鋪救治。NPC的下手輕重須符合其性格與陣營。
${d20Context}

現在演化玩家動作：『${finalUserMsg}』${npcDialoguePrompt}

🚨【天道終極警告】：
1. 玩家的所有行動，必須在【本次回覆】中給出 NPC 的具體回答與最終結果！
2. ❌絕對禁止寫出「靜候回應」、「正要開口」等懸念句！NPC 知道就立刻回答！
3. 敘事必須在給出結果後，停在「我」的心境，將下一步交還玩家選擇！
4.【名字提取鐵律】：在輸出 stat_changes 或 rel_changes 等任何 JSON 數據時，'target' 或 'npc' 欄位【絕對只能】填寫角色的「真實姓名」（例如：「沈清霜」）或「自己」。❌嚴禁填入台詞、對話、地名、動作描述或任何標點符號！若名字抓取錯誤將導致天道崩塌！`;

  try {
    let aiConfig = isNsfwMode ? { temperature: 1.0, top_p: 0.95, retries: 2, model: "google/gemini-3.1-flash-lite", isNsfwMode: true } : {};
    aiConfig.backLocked = userData.backLocked || false;

    // 🔴【新增】抓取近 10 筆原始歷史，轉換為 API 格式
    const recentHistoryRaw = getGameHistoryBatchRaw(pcId, 10);
    if (recentHistoryRaw && recentHistoryRaw.length > 0) {
      aiConfig.chatHistory = recentHistoryRaw.map(msg => ({
        role: msg.speaker === "player" ? "user" : "assistant",
        content: String(msg.content)
      }));
    }

    const aiResponseRaw = callGeminiAPI(prompt, null, aiConfig);
    const start = aiResponseRaw.indexOf('{');
    const end = aiResponseRaw.lastIndexOf('}');
    const cleanJson = aiResponseRaw.substring(start, end + 1);
    const aiData = JSON.parse(cleanJson);




    let memoryMapData = getMapDataCached(sheets);
    if (aiData.new_maps && Array.isArray(aiData.new_maps) && sheets.map) {
      let mapsToAppend = [];
      aiData.new_maps.forEach(m => {
        let fullName = String(m.name || "").trim();
        if (fullName && !memoryMapData.some(r => String(r[COL.MAP.NAME] || "").trim() === fullName)) {
          let parentName = fullName.includes('-') ? fullName.split('-')[0].trim() : "";
          let parentNode = memoryMapData.find(r => String(r[COL.MAP.NAME] || "").trim() === parentName);
          let mapType = parentNode ? parentNode[COL.MAP.TYPE] : (m.type || "險地");
          let coordStrObj = parentNode && parentNode[COL.MAP.COORD] ? String(parentNode[COL.MAP.COORD]) : "0,0";
          let rx, ry, coordStr, attempts = 0;
          let baseX = parseInt(coordStrObj.split(',')[0]) || 0;
          let baseY = parseInt(coordStrObj.split(',')[1]) || 0;
          do {
            let offsetX = parentNode ? (Math.floor(Math.random() * 3) - 1) : (Math.floor(Math.random() * 120) - 60);
            let offsetY = parentNode ? (Math.floor(Math.random() * 3) - 1) : (Math.floor(Math.random() * 120) - 60);
            coordStr = `${baseX + offsetX},${baseY + offsetY}`;
          } while (memoryMapData.some(r => String(r[COL.MAP.COORD] || "").trim() === coordStr) && attempts < 200);

          const newMapRow = ["九州", fullName, mapType, coordStr, m.desc || "未知地界。", parentName];
          mapsToAppend.push(newMapRow); memoryMapData.push(newMapRow);
        }
      });
      if (mapsToAppend.length > 0) {
        sheets.map.getRange(sheets.map.getLastRow() + 1, 1, mapsToAppend.length, 6).setValues(mapsToAppend);
        CacheService.getScriptCache().remove("KYUSHU_MAP_DATA");
      }
    }

    if (aiData.new_factions && Array.isArray(aiData.new_factions) && sheets.faction) {
      let currentFactions = sheets.faction.getDataRange().getValues();
      aiData.new_factions.forEach(f => {
        registerFactionHelper(f.name, "掌門", f.align, f.base, f.leader, sheets, pcId, f.leader || "未知人物", currentFactions);
      });
    }

    if (aiData.events && Array.isArray(aiData.events) && sheets.epic) aiData.events.forEach(ev => { sheets.epic.appendRow([pcId, String(ev).trim(), new Date()]); });

    if (aiData.quests && Array.isArray(aiData.quests) && sheets.quest) {
      aiData.quests.forEach(q => {
        const qIdx = questData.findIndex(r => r[COL.QUEST.PC] == pcId && r[COL.QUEST.NAME] === String(q.name).trim() && r[COL.QUEST.STATUS] === "進行中");
        if (qIdx !== -1) {
          if (q.target) questData[qIdx][COL.QUEST.TARGET] = q.target;
          if (q.status) questData[qIdx][COL.QUEST.STATUS] = q.status;
          if (q.reward_money !== undefined && (!questData[qIdx][COL.QUEST.MONEY] || parseInt(questData[qIdx][COL.QUEST.MONEY]) === 0)) questData[qIdx][COL.QUEST.MONEY] = q.reward_money;
          if (q.reward_item !== undefined && (!questData[qIdx][COL.QUEST.ITEM] || questData[qIdx][COL.QUEST.ITEM] === "無" || questData[qIdx][COL.QUEST.ITEM] === "")) questData[qIdx][COL.QUEST.ITEM] = q.reward_item;
        } else {
          questData.push([pcId, String(q.name).trim(), (q.target ? String(q.target).trim() : "調查中"), q.status || "進行中", q.reward_money !== undefined ? parseInt(q.reward_money) : Math.floor(Math.random() * 400) + 100, q.reward_item !== undefined ? String(q.reward_item).trim() : "無"]);
          sheets.quest.appendRow(questData[questData.length - 1]);
        }
      });
    }


    // 🔴 血量快照：記錄所有人變化前的血量，供結尾比對真實扣血
    const hpSnapshot = {};
    pcData.forEach((row, idx) => {
      if (idx === 0) return;
      if (String(row[COL.PC.ID] || "").startsWith("DEAD_")) return;
      hpSnapshot[idx] = parseInt(row[COL.PC.HP]) || 0;
    });
    const mpBefore = parseInt(pcData[pcIndex][COL.PC.MP]) || 0;
    const moneyBefore = parseInt(pcData[pcIndex][COL.PC.MONEY]) || 0;


    if (aiData.stat_changes && Array.isArray(aiData.stat_changes)) {
      Logger.log("stat_changes: " + JSON.stringify(aiData.stat_changes));


      const attrMap = { "生命": COL.PC.HP, "真氣": COL.PC.MP, "位置": COL.PC.LOC, "臂力": COL.PC.STR, "根骨": COL.PC.CON, "身法": COL.PC.AGI, "神識": COL.PC.INT, "福緣": COL.PC.LUK, "門派": COL.PC.FACTION, "幫派": COL.PC.FACTION, "宗門": COL.PC.FACTION, "階級": COL.PC.RANK, "職位": COL.PC.RANK, "稱號": COL.PC.RANK, "陣營": COL.PC.ALIGN, "立場": COL.PC.ALIGN, "貢獻度": COL.PC.CONTRIB, "貢獻": COL.PC.CONTRIB, "身世": COL.PC.BACK };
      const visibleStateKeys = ["衣服", "姿勢", "負面", "顏面"];

      aiData.stat_changes.forEach(sc => {
        const tName = String(sc.target).trim(); const attrKey = String(sc.attr).trim(); const valStr = String(sc.value).trim();
        let targetIdx = (tName === "自己" || tName === String(pcName).trim()) ? pcIndex : pcData.findIndex(r => String(r[COL.PC.NAME]).trim() === tName || String(r[COL.PC.ID]).trim() === tName);

        if (targetIdx !== -1) {
          dirtyPcRows.add(targetIdx);

          // 🔴 支援 AI 合併輸出，例如 attr:"姿勢/衣服/負面/顏面"
          if (attrKey.includes('/') && valStr.includes('/')) {
            const attrParts = attrKey.split('/').map(a => a.trim());
            const valParts = valStr.split('/').map(v => v.trim());
            attrParts.forEach((a, i) => {
              if (visibleStateKeys.includes(a)) {
                let currentVs = parseVisibleStatus(pcData[targetIdx][COL.PC.STATUS]);
                currentVs[a] = valParts[i] || "無";
                pcData[targetIdx][COL.PC.STATUS] = JSON.stringify(currentVs);
              }
            });
            return;
          }
          if (visibleStateKeys.includes(attrKey)) {
            let currentVs = parseVisibleStatus(pcData[targetIdx][COL.PC.STATUS]);
            currentVs[attrKey] = valStr; pcData[targetIdx][COL.PC.STATUS] = JSON.stringify(currentVs); return;
          }

          const colIdx = attrMap[attrKey];
          if (colIdx !== undefined) {
            if (colIdx === COL.PC.PREF || colIdx === COL.PC.TRAIT) return;
            if (colIdx === COL.PC.LOC) {
              let newLoc = valStr.replace(/九州-/g, "").replace(/\[|\]/g, "").trim();
              pcData[targetIdx][COL.PC.LOC] = newLoc; if (targetIdx === pcIndex) curL = newLoc;
              let rootLoc = newLoc.split('-')[0].trim();
              if (sheets.map && rootLoc && typeof memoryMapData !== 'undefined' && !memoryMapData.some(r => String(r[COL.MAP.NAME] || "").trim() === rootLoc)) {
                const fallbackMapRow = ["九州", rootLoc, "荒野", `${Math.floor(Math.random() * 120) - 60},${Math.floor(Math.random() * 120) - 60}`, "未探明區域。"];
                sheets.map.appendRow(fallbackMapRow); memoryMapData.push(fallbackMapRow);
              }
            } else if ([COL.PC.HP, COL.PC.MP, COL.PC.MONEY, COL.PC.STR, COL.PC.CON, COL.PC.AGI, COL.PC.INT, COL.PC.LUK, COL.PC.CONTRIB].includes(colIdx)) {
              let numCurrent = parseInt(pcData[targetIdx][colIdx]) || 0;
              let numNew = (valStr.startsWith("+") || valStr.startsWith("-")) ? numCurrent + parseInt(valStr) : parseInt(valStr);
              if (isNaN(numNew)) numNew = numCurrent; // 🔴 防呆：NaN就維持原值

              if (colIdx === COL.PC.MONEY || colIdx === COL.PC.CONTRIB) pcData[targetIdx][colIdx] = Math.max(0, numNew);
              else if (colIdx === COL.PC.HP || colIdx === COL.PC.MP) {
                let hpVal = Math.min(parseInt(pcData[targetIdx][colIdx === COL.PC.HP ? COL.PC.MAX_HP : COL.PC.MAX_MP]) || 100, numNew);
                hpVal = Math.max(0, hpVal); // 🔴 防 AI 輸出負數導致顯示亂碼
                pcData[targetIdx][colIdx] = hpVal;

                const isPlayer = String(pcData[targetIdx][COL.PC.ID]).startsWith("PC_");

                // 玩家：血歸 0 才送藥鋪
                if (colIdx === COL.PC.HP && hpVal <= 0 && isPlayer) {
                  const healLoc = "小醫仙藥鋪"; pcData[targetIdx][COL.PC.HP] = 50; pcData[targetIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "換上乾淨素衣", "姿勢": "平躺靜養", "負面": "重傷初癒", "顏面": "蒼白" }); pcData[targetIdx][COL.PC.LOC] = healLoc; pcData[targetIdx][COL.PC.MONEY] = Math.max(0, (parseInt(pcData[targetIdx][COL.PC.MONEY]) || 0) - 20);
                  if (targetIdx === pcIndex) curL = healLoc;
                  relData.forEach(row => {
                    if (row[COL.REL.PC] === pcData[targetIdx][COL.PC.NAME] && row[COL.REL.IS_PARTY] === "同行") {
                      const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === row[COL.REL.NPC] && !String(r[COL.PC.ID]).startsWith("DEAD_"));
                      if (nIdx !== -1) {
                        pcData[nIdx][COL.PC.LOC] = healLoc;
                        pcData[nIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "穿戴整齊", "姿勢": "站立", "負面": "無", "顏面": "平穩" });
                        pcData[nIdx][COL.PC.HP] = calculateMaxStats(pcData[nIdx][COL.PC.REALM], pcData[nIdx][COL.PC.CON], pcData[nIdx][COL.PC.INT]).hp;
                        dirtyPcRows.add(nIdx);
                      }
                    }
                  });
                  if (sheets.epic) sheets.epic.appendRow([pcId, `【奇蹟救治】${pcData[targetIdx][COL.PC.NAME]} 於生死邊緣被救回。`, new Date()]);
                  if (targetIdx === pcIndex) justRevived = true;
                }
                // NPC：血掉到 5 以下→鎖 1 血昏迷待處置，生死由玩家定奪
                else if (colIdx === COL.PC.HP && hpVal <= 5 && !isPlayer) {
                  knockedOutList.push(pcData[targetIdx][COL.PC.NAME]);
                  pcData[targetIdx][COL.PC.HP] = 1;
                  pcData[targetIdx][COL.PC.STATUS] = JSON.stringify({
                    "衣服": "衣衫破爛", "姿勢": "倒地不起",
                    "負面": "重傷昏迷", "顏面": "面色慘白"
                  });
                }
              } else pcData[targetIdx][colIdx] = Math.max(1, Math.min(REALM_LIMITS[pcData[targetIdx][COL.PC.REALM] || "凡人"] || 25, numNew));
            } else pcData[targetIdx][colIdx] = valStr;
          }
        }
      });
    }








    let bagCounts = {}; itemData.forEach(it => { bagCounts[it[COL.ITEM.OWNER]] = (bagCounts[it[COL.ITEM.OWNER]] || 0) + 1; });
    let overLimitWarnings = [];
    if (aiData.items_gained && Array.isArray(aiData.items_gained)) {
      let allowedGains = [];
      aiData.items_gained.forEach(it => {
        // 🔴 最源頭防呆：無名物品直接跳過，不佔背包計數
        if (!it.name || String(it.name).trim() === "") return;

        let oName = craftOwnerLock ? "自己" : String(it.owner || "自己").trim();   // 🔴 煉成時強制歸玩家
        let targetPcMatch = pcData.find(r => String(r[COL.PC.NAME]).trim() === oName);
        let finalId = (oName === "自己" || oName === String(pcName).trim()) ? pcId : (targetPcMatch ? targetPcMatch[COL.PC.ID] : (newNpcMap[oName] || oName));
        if ((bagCounts[finalId] || 0) < MAX_BAG_SIZE) { allowedGains.push(it); bagCounts[finalId] = (bagCounts[finalId] || 0) + 1; }
        else if (finalId === pcId) overLimitWarnings.push(`無法獲取「${it.name}」`);
      });
      aiData.items_gained = allowedGains;
    }

    if (overLimitWarnings.length > 0 && aiData.narration) aiData.narration += `\n\n<span style="color:#ff4d4d; font-weight:bold;">【系統警告】：行囊已滿（${MAX_BAG_SIZE}/${MAX_BAG_SIZE}），${overLimitWarnings.join("、")}，請先清理包包！</span>`;

    if (aiData.items_gained && Array.isArray(aiData.items_gained) && sheets.item) {
      let currencyCountThisTurn = 0; // 🟢 本回合貨幣物品計數器

      aiData.items_gained.forEach((it) => {
        // 🔴 最源頭防呆：無名物品直接跳過，避免白跑類別判定
        if (!it.name || String(it.name).trim() === "") return;

        // 1. 重新定義 targetPcMatch (修復原本會報錯的問題)
        let oName = craftOwnerLock ? "自己" : String(it.owner || "自己").trim();   // 🔴 煉成時強制歸玩家，無視 AI 亂填的 owner
        let targetPcMatch = pcData.find(r => String(r[COL.PC.NAME]).trim() === oName);
        let finalId = (oName === "自己" || oName === String(pcName).trim()) ? pcId : (targetPcMatch ? targetPcMatch[COL.PC.ID] : (newNpcMap[oName] || oName));

        // 2. 🟢 修正：生成唯一的 ID (這裡保證每一個物品都有獨立的身分證)
        const newItemId = "ITM_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

        // 3. 屬性計算邏輯
        let sSTR = 0, sCON = 0, sAGI = 0, sINT = 0, sLUK = 0;
        let p = getRarityPoints(it.rarity, it.type === "丹藥");

        if (["武器", "防具", "法寶", "丹藥"].includes(it.type)) {
          if (it.type === "武器") sSTR = p; else if (it.type === "防具") sCON = p; else {
            if (it.stat_type === "臂力") sSTR = p; else if (it.stat_type === "根骨") sCON = p; else if (it.stat_type === "身法") sAGI = p; else if (it.stat_type === "神識") sINT = p; else sLUK = p;
          }
        }


        // 4. 強制修正 AI 亂給的物品類別（統一走 detectItemType）
        const hasBonus = (sSTR > 0 || sCON > 0 || sAGI > 0 || sINT > 0 || sLUK > 0);
        let correctedType = detectItemType(it.name, it.type, hasBonus);

        // 🟢 5. 貨幣物品特殊處理：單回合上限 + 強制查表覆寫價格
        let finalPrice = it.price || 10;
        if (correctedType === "貨幣") {
          currencyCountThisTurn++;
          if (currencyCountThisTurn > 2) return; // 超過上限，直接捨棄不寫入
          finalPrice = getCurrencyValue(it.name); // 完全不採信 AI 給的 price
          if (finalPrice === 0) return; // 保險：萬一查不到表，視為無效物品捨棄
        }

        // 6. 🟢 推入陣列：使用正確的 newItemId
        itemData.push([it.name, correctedType, it.desc, finalPrice, finalId, sSTR, sCON, sAGI, sINT, sLUK, newItemId]);
      });
    }

    // 1. 處理「物品轉移」(贈禮 / 偷竊 / 裝備給NPC) —— 全面 ID 化，支援來源 owner
    let protectedItemIds = soulGiftProtectedIds.slice(); // 併入傾心信物保護
    if (aiData.items_transferred && Array.isArray(aiData.items_transferred) && sheets.item) {
      aiData.items_transferred.forEach(transfer => {
        // 解析新擁有者 ID
        let newOwnerName = String(transfer.new_owner || "").trim();
        let targetPcMatch = pcData.find(r => String(r[COL.PC.NAME]).trim() === newOwnerName);
        let finalId = (newOwnerName === "自己" || newOwnerName === String(pcName).trim()) ? pcId : (targetPcMatch ? targetPcMatch[COL.PC.ID] : (newNpcMap[newOwnerName] || newOwnerName));

        // 解析來源擁有者：偷竊時來源是 NPC；未指定則預設玩家自己（贈禮情境）
        let fromName = String(transfer.old_owner || transfer.from || "").trim();
        let fromMatch = fromName ? pcData.find(r => String(r[COL.PC.NAME]).trim() === fromName) : null;
        let fromId = fromName ? (fromMatch ? fromMatch[COL.PC.ID] : (newNpcMap[fromName] || fromName)) : pcId;

        // 🟢 優先用 ID 精準比對，找不到才退回 name；只在來源者身上找
        const wantId = String(transfer.id || "").trim();
        for (let i = 1; i < itemData.length; i++) {
          const ownerOk = (itemData[i][COL.ITEM.OWNER] == fromId);
          const idOk = wantId && String(itemData[i][COL.ITEM.ID]).trim() === wantId;
          const nameOk = !wantId && itemData[i][COL.ITEM.NAME] === transfer.name;
          if (ownerOk && (idOk || nameOk)) {
            itemData[i][COL.ITEM.OWNER] = finalId;
            protectedItemIds.push(itemData[i][COL.ITEM.ID]);
            // 若該物正被來源者裝備中，順手清空其裝備欄
            const fIdx = pcData.findIndex(r => r[COL.PC.ID] == fromId);
            if (fIdx !== -1) {
              [COL.PC.WEP, COL.PC.ARM, COL.PC.ACC1, COL.PC.ACC2].forEach(c => {
                if (String(pcData[fIdx][c]).trim() === String(itemData[i][COL.ITEM.ID]).trim()) { pcData[fIdx][c] = ""; dirtyPcRows.add(fIdx); }
              });
            }
            break;
          }
        }
      });
      if (aiData.items_transferred.length > 0) isItemChanged = true;
    }
    // 💰 銀兩轉移：NPC↔玩家、玩家↔NPC 都從「付款方自己身上」扣，錢守恆、不夠就給上限
    let moneyTransferMsgs = [];
    if (aiData.money_transferred && Array.isArray(aiData.money_transferred)) {
      aiData.money_transferred.forEach(mt => {
        let fromName = String(mt.from || "").trim();
        let toName = String(mt.to || "").trim();
        let amount = parseInt(mt.amount) || 0;
        if (amount <= 0 || !fromName || !toName || fromName === toName) return;

        // 把「自己」轉成玩家名
        if (fromName === "自己") fromName = pcName;
        if (toName === "自己") toName = pcName;

        const fromIdx = pcData.findIndex(r => String(r[COL.PC.NAME]).trim() === fromName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
        const toIdx = pcData.findIndex(r => String(r[COL.PC.NAME]).trim() === toName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
        if (fromIdx === -1 || toIdx === -1) return; // 找不到人就作廢

        // 🔴 核心：付款方有多少才給多少，給不出超過自己有的
        const fromMoney = parseInt(pcData[fromIdx][COL.PC.MONEY]) || 0;
        const realAmount = Math.min(amount, fromMoney);
        if (realAmount <= 0) return; // 付款方沒錢，整筆作廢

        pcData[fromIdx][COL.PC.MONEY] = fromMoney - realAmount;
        pcData[toIdx][COL.PC.MONEY] = (parseInt(pcData[toIdx][COL.PC.MONEY]) || 0) + realAmount;
        dirtyPcRows.add(fromIdx);
        dirtyPcRows.add(toIdx);

        // 只有跟玩家有關的轉移才提示玩家
        if (fromIdx === pcIndex) moneyTransferMsgs.push(`給了「${toName}」${realAmount} 兩`);
        else if (toIdx === pcIndex) moneyTransferMsgs.push(`「${fromName}」給了你 ${realAmount} 兩`);
      });
    }

    // 2. 🔴 使用 filter 統一處理「使用」與「遺失」—— items_lost / items_used 皆支援 ID 或 name
    let lostIds = (aiData.items_lost || []).map(x => String((x && x.id) || "").trim()).filter(Boolean);
    let lostNames = (aiData.items_lost || []).map(x => String((x && x.name) || x || "").trim()).filter(Boolean);
    // 🟢 新增：AI 判定「已使用而消耗」的物品（非丹藥類物品走 play 時用），同樣支援 ID 或 name
    let usedIds = (aiData.items_used || []).map(x => String((x && x.id) || "").trim()).filter(Boolean);
    let usedNames = (aiData.items_used || []).map(x => String((x && x.name) || x || "").trim()).filter(Boolean);
    let actionItemId = (userData.combatData && userData.combatData.actionItemId) ? userData.combatData.actionItemId : null;
    let protectedIdsSet = new Set(protectedItemIds);

    // 一次性過濾 itemData
    itemData = itemData.filter(it => {
      // 如果是剛才轉移過的物品，保留
      if (protectedIdsSet.has(it[COL.ITEM.ID])) return true;

      // 如果是本次行動主動使用的物品，過濾掉 (只過濾第一個符合的)
      if (actionItemId && it[COL.ITEM.OWNER] == pcId && it[COL.ITEM.ID] === actionItemId) {
        actionItemId = null; // 標記已處理，防止後續重複過濾
        return false;
      }

      // 如果是 AI 判定的遺失物：優先用 ID，再退回 name（只刪玩家自己的）
      const idHit = lostIds.indexOf(String(it[COL.ITEM.ID]).trim());
      if (idHit !== -1 && it[COL.ITEM.OWNER] == pcId) { lostIds.splice(idHit, 1); return false; }

      const nameHit = lostNames.indexOf(String(it[COL.ITEM.NAME]).trim());
      if (nameHit !== -1 && it[COL.ITEM.OWNER] == pcId) { lostNames.splice(nameHit, 1); return false; }

      // 🟢 如果是 AI 判定「已使用消耗」的物品：優先 ID，再退回 name（只刪玩家自己的）
      const usedIdHit = usedIds.indexOf(String(it[COL.ITEM.ID]).trim());
      if (usedIdHit !== -1 && it[COL.ITEM.OWNER] == pcId) { usedIds.splice(usedIdHit, 1); return false; }

      const usedNameHit = usedNames.indexOf(String(it[COL.ITEM.NAME]).trim());
      if (usedNameHit !== -1 && it[COL.ITEM.OWNER] == pcId) { usedNames.splice(usedNameHit, 1); return false; }

      return true; // 其他物品全數保留
    });

    let newlyRecruited = aiData.recruited && Array.isArray(aiData.recruited) ? aiData.recruited.map(n => String(n).trim()) : [];
    let dismissedNpc = userMsg.includes("解除了組隊同行關係") ? (userMsg.match(/與「(.*?)」解除/) || [])[1]?.trim() || "" : "";

    if (sheets.rel) {
      const relChangesToProcess = aiData.rel_changes || [];
      newlyRecruited.forEach(npc => { if (!relChangesToProcess.find(r => r.npc === npc)) relChangesToProcess.push({ npc: npc }); });
      if (dismissedNpc && !relChangesToProcess.find(r => r.npc === dismissedNpc)) relChangesToProcess.push({ npc: dismissedNpc });

      relChangesToProcess.forEach(rc => {
        const tNpc = rc.target ? String(rc.target).trim() : String(rc.npc).trim();
        if (tNpc === pcName || tNpc === "自己") return;
        if (tNpc === freshlyBoundNpcName) return;

        const rIdx = relData.findIndex(r => r[COL.REL.PC] === pcName && r[COL.REL.NPC] === tNpc);
        let change = parseInt(rc.fav_change) || 0;
        let isPartyStr = rIdx !== -1 ? relData[rIdx][COL.REL.IS_PARTY] || "" : "";
        if (newlyRecruited.includes(tNpc)) isPartyStr = "同行"; if (dismissedNpc === tNpc) isPartyStr = "";

        if (rIdx !== -1) {
          let oldFav = parseInt(relData[rIdx][COL.REL.FAV]) || 0; let oldTag = relData[rIdx][COL.REL.TAG] || "萍水相逢";
          const isSoulLocked = oldTag.includes("(已傾心)");
          if (isSoulLocked) change = Math.max(0, change);
          let newFav = Math.max(-100, Math.min(100, oldFav + change));

          let finalTag;
          if (isSoulLocked) {
            // 🔴 已傾心永久鎖死：TAG完全不受AI影響，只有玩家透過 update_rel_tag 手動能改
            finalTag = oldTag;
          } else {
            let aiProvidedTag = (rc.tag && typeof rc.tag === 'string') ? rc.tag.trim() : "";
            let isValidAiTag = aiProvidedTag !== "" && aiProvidedTag !== "無" && !aiProvidedTag.includes("禁止");
            if (rc.forceTag) finalTag = rc.tag;
            else if (isValidAiTag) finalTag = aiProvidedTag;
            else finalTag = oldTag;
          }

          relData[rIdx][COL.REL.FAV] = newFav; relData[rIdx][COL.REL.TAG] = finalTag; relData[rIdx][COL.REL.IS_PARTY] = isPartyStr;

          if (rc.major_event && rc.major_event.trim() !== "無") {
            let oldEventsStr = String(relData[rIdx][COL.REL.MAJOR_EVENT] || "").trim();
            let newEvent = String(rc.major_event).trim();
            let eventArray = (oldEventsStr === "無" || oldEventsStr === "") ? [] : oldEventsStr.split('、').map(e => e.trim());

            if (newEvent === "[清空]") relData[rIdx][COL.REL.MAJOR_EVENT] = "無";
            else if (newEvent.includes("[達成]")) {
              let doneTask = newEvent.replace("[達成]", "").trim();
              if (doneTask) {
                if (sheets.epic) sheets.epic.appendRow([pcId, `【因果圓滿】『${pcName}』兌現了昔日諾言，與『${tNpc}』達成了約定：${eventArray.find(e => e.includes(doneTask)) || doneTask}。`, new Date()]);
                eventArray = eventArray.filter(e => !e.includes(doneTask));
                relData[rIdx][COL.REL.MAJOR_EVENT] = eventArray.length > 0 ? eventArray.join("、") : "無";
              }
            } else if (!eventArray.includes(newEvent)) {
              eventArray.push(newEvent); if (eventArray.length > 3) eventArray.shift();
              relData[rIdx][COL.REL.MAJOR_EVENT] = eventArray.join("、");
            }
          }
        } else {
          relData.push([pcName, tNpc, Math.max(-100, Math.min(100, change)), rc.forceTag ? rc.tag : "萍水相逢", isPartyStr, "", rc.major_event || "無"]);
        }
      });
    }



    if (aiData.intimacy_feedback) {
      // 🔴 防禦機制：過濾掉 AI 偷懶不想更新狀態時的敷衍用語
      const ignoreWords = ["維持現狀", "無變化", "不變", "維持", "同上", "保持現狀", "沒有變化"];

      const sanitizePhysicalState = (rawState, isPlayer = false) => {
        if (!rawState || typeof rawState !== 'object') return {};
        let cleanState = {};
        const keyMapping = { "陰道": "蜜穴", "陰莖": "肉棒", "屁眼": "菊穴" };
        const allowedKeys = ["蜜穴", "肉棒", "菊穴", "右手", "左手"];
        Object.keys(rawState).forEach(k => {
          let standardKey = keyMapping[k] || k;
          let val = String(rawState[k]).trim();
          if (allowedKeys.includes(standardKey) && !ignoreWords.includes(val)) {
            cleanState[standardKey] = val;
          }
        });
        return cleanState;
      };

      const mergeVisibleState = (oldStatusStr, newVsObj) => {
        let currentVs = parseVisibleStatus(oldStatusStr);
        if (newVsObj && typeof newVsObj === 'object') {
          for (let k in newVsObj) {
            let val = String(newVsObj[k]).trim();
            // 只有當 AI 給出具體狀態，且不是敷衍用語時才更新
            if (val && val !== "無" && !ignoreWords.includes(val)) {
              currentVs[k] = val;
            }
          }
        }
        return JSON.stringify(currentVs);
      };

      const processSkills = (oldMem, newSkillsStr) => {
        let skillMap = {}; let oldSkills = (oldMem.match(/\[雙修技巧\](.*?)(?=\| \[|$)/) || [])[1]?.trim() || "";
        if (oldSkills && oldSkills !== "無") oldSkills.replace(/^\.\.\./, "").split('、').forEach(p => { let m = p.match(/(.+?)\(Lv\.(\d+)\)/); if (m) skillMap[m[1].trim()] = parseInt(m[2], 10); else if (p.trim()) skillMap[p.trim()] = 1; });
        if (String(newSkillsStr || "").trim() && String(newSkillsStr || "").trim() !== "無") String(newSkillsStr || "").trim().split('、').forEach(s => { let cn = s.replace(/[\(\[]?Lv\.?\d+[\)\]]?/gi, '').trim(); if (cn) skillMap[cn] = Math.min((skillMap[cn] || 0) + 1, 10); });
        let sorted = Object.keys(skillMap).map(k => ({ n: k, lv: skillMap[k] })).sort((a, b) => b.lv - a.lv);
        return sorted.length > 0 ? sorted.slice(0, 30).map(sk => `${sk.n}(Lv.${sk.lv})`).join('、') : "無";
      };

      const processTags = (oldMem, regex, newTagStr, maxCount) => {
        // 1. 取出舊標籤，拆成單項陣列(去頭部殘留的...、濾空白)
        let oldStr = (oldMem.match(regex) || [])[1]?.trim() || "無";
        let arr = (oldStr === "無" || oldStr === "")
          ? []
          : oldStr.replace(/^\.\.\./, "").split('、').map(x => x.trim()).filter(x => x !== "");

        // 2. 把新進來的字串也拆成單項(AI 可能一次吐多個，如「唇瓣、頸部」)
        let newItems = String(newTagStr || "").trim();
        if (newItems && newItems !== "無") {
          newItems.split('、').map(x => x.trim()).filter(x => x !== "").forEach(item => {
            // 3. 逐項去重：只有陣列裡還沒有這一項，才加進去
            if (!arr.includes(item)) arr.push(item);
          });
        }

        // 4. 超過上限保留最新的 maxCount 項
        if (arr.length === 0) return "無";
        return (arr.length > maxCount ? arr.slice(-maxCount) : arr).join('、');
      };

      if (isNsfwMode && aiData.intimacy_feedback.player) {
        const pfb = aiData.intimacy_feedback.player;
        if (pfb.visible_state) pcData[pcIndex][COL.PC.STATUS] = mergeVisibleState(pcData[pcIndex][COL.PC.STATUS], pfb.visible_state);
        if (pfb.physical_state) pcData[pcIndex][COL.PC.PHYSICAL] = mergePhysicalStatus(pcData[pcIndex][COL.PC.PHYSICAL], sanitizePhysicalState(pfb.physical_state));

        let oldPMem = pcData[pcIndex][COL.PC.MEMORY] || "";
        pcData[pcIndex][COL.PC.MEMORY] = `[雙修技巧]${processSkills(oldPMem, pfb.dynamic_skills)} | [性愛時敏感部位]${processTags(oldPMem, /\[性愛時敏感部位\](.*?)(?=\| \[|$)/, pfb.erogenous_zones, 5)}`;
      }

      if (aiData.intimacy_feedback.npcs) {
        aiData.intimacy_feedback.npcs.forEach(nfb => {
          const tName = String(nfb.name).trim();
          const targetIdx = pcData.findIndex(r => r[COL.PC.NAME] === tName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
          const rIdx = relData.findIndex(r => r[COL.REL.PC] === pcName && r[COL.REL.NPC] === tName);

          if (targetIdx !== -1 && isNsfwMode) {
            dirtyPcRows.add(targetIdx); // 🔴 新增
            if (nfb.visible_state) {
              pcData[targetIdx][COL.PC.STATUS] = mergeVisibleState(pcData[targetIdx][COL.PC.STATUS], nfb.visible_state);
            }
            if (nfb.physical_state) {
              pcData[targetIdx][COL.PC.PHYSICAL] = mergePhysicalStatus(pcData[targetIdx][COL.PC.PHYSICAL], sanitizePhysicalState(nfb.physical_state));
            }
            if (nfb.dynamic_skills || nfb.erogenous_zones) {
              let oldNMem = pcData[targetIdx][COL.PC.MEMORY] || "";
              pcData[targetIdx][COL.PC.MEMORY] = `[雙修技巧]${processSkills(oldNMem, nfb.dynamic_skills)} | [性愛時敏感部位]${processTags(oldNMem, /\[性愛時敏感部位\](.*?)(?=\| \[|$)/, nfb.erogenous_zones, 5)}`;
            }
          }

          if (rIdx !== -1) {
            let oldRMem = relData[rIdx][COL.REL.MEMORY] || "";
            let count = (oldRMem.match(/\[親密次數\](\d+)/) || [])[1] ? parseInt((oldRMem.match(/\[親密次數\](\d+)/) || [])[1]) : 0;
            if (isNsfwMode) count += 1;
            let talkStr = (oldRMem.match(/\[交談輪數\](\d+)/) || [])[1] ? ` | [交談輪數]${(oldRMem.match(/\[交談輪數\](\d+)/) || [])[1]}` : "";
            relData[rIdx][COL.REL.MEMORY] = `[專屬稱呼]${processTags(oldRMem, /\[專屬稱呼\](.*?)(?=\| \[|$)/, nfb.mutual_nicknames, 3)} | [親密次數]${count}${talkStr}`;
          }
        });
      }
    }

    partyMembers.forEach(pName => {
      const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === pName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
      if (nIdx !== -1) {
        pcData[nIdx][COL.PC.LOC] = pcData[pcIndex][COL.PC.LOC];
        dirtyPcRows.add(nIdx); // 🔴 加進去才會寫入
      }
    });



    const pcColCount = Object.keys(COL.PC).length;

    // MAX_HP/MAX_MP 重算只針對有變動的行，不全表掃描
    dirtyPcRows.forEach(idx => {
      const row = pcData[idx];
      if (!row) return;
      const id = String(row[COL.PC.ID] || "");
      if (!id.startsWith("PC_") && !id.startsWith("NPC_") && !id.startsWith("DEAD_")) return;

      while (row.length < pcColCount) row.push("");

      const maxVals = calculateMaxStats(row[COL.PC.REALM], row[COL.PC.CON], row[COL.PC.INT]);
      row[COL.PC.MAX_HP] = maxVals.hp;
      row[COL.PC.MAX_MP] = maxVals.mp;
      row[COL.PC.HP] = Math.min(parseInt(row[COL.PC.HP]) || 0, maxVals.hp);
      row[COL.PC.MP] = Math.min(parseInt(row[COL.PC.MP]) || 0, maxVals.mp);

      // 只寫這一行，不寫全表
      sheets.pc.getRange(idx + 1, 1, 1, pcColCount).setValues([row]);
    });

    isRelChanged = isRelChanged || !!(aiData.rel_changes && aiData.rel_changes.length > 0) || !!(aiData.recruited && aiData.recruited.length > 0) || !!dismissedNpc;
    isItemChanged = isItemChanged || !!(aiData.items_gained && aiData.items_gained.length > 0) || !!(aiData.items_lost && aiData.items_lost.length > 0) || !!(aiData.items_used && aiData.items_used.length > 0) || !!(aiData.items_transferred && aiData.items_transferred.length > 0);
    isQuestChanged = isQuestChanged || !!(aiData.quests && aiData.quests.length > 0);

    const logSum = aiData.log_summary || {};
    // 相容新結構(subject/object/event)與舊結構(people/event)
    let logSubject = String(logSum.subject || "").trim();
    let logObject = String(logSum.object || "").trim();
    let logEvent = String(logSum.event || "因果輪轉").trim();
    // 組出「人」欄字串：有主被動就標方向，沒有就退回舊寫法
    let logPeopleStr;
    if (logSubject) {
      let dirPart = (logObject && logObject !== "無" && logObject !== logSubject)
        ? `${logSubject}→${logObject}`   // 主→受 方向錨
        : logSubject;
      logPeopleStr = dirPart;
    } else {
      logPeopleStr = String(logSum.people || pcName).trim();  // 完全相容舊格式
    }
    const validInteractNames = new Set([
      ...displayPeople.map(r => r[COL.PC.NAME]),
      ...partyMembers
    ]);
    pcData.map(r => r[COL.PC.NAME]).filter(name =>
      name &&
      name !== pcName &&
      String(logSum.people).includes(name) &&
      validInteractNames.has(name)
    ).forEach(tName => {
      let rIdx = relData.findIndex(r => r[COL.REL.PC] === pcName && r[COL.REL.NPC] === tName);
      if (rIdx !== -1) {
        let oldMem = String(relData[rIdx][COL.REL.MEMORY] || "");
        let countMatch = oldMem.match(/\[交談輪數\](\d+)/);
        relData[rIdx][COL.REL.MEMORY] = countMatch ? oldMem.replace(/\[交談輪數\]\d+/, `[交談輪數]${parseInt(countMatch[1]) + 1}`) : (oldMem ? oldMem + ` | [交談輪數]1` : `[交談輪數]1`);
        isRelChanged = true;
      } else {
        relData.push([pcName, tName, 0, "萍水相逢", "", "[交談輪數]1", "無"]); isRelChanged = true;
      }
    });

    if (isRelChanged && relData.length > 0) {
      safeWriteSheet(sheets.rel, relData);
    }
    if (isItemChanged && itemData.length > 0) {
      safeWriteSheet(sheets.item, itemData);
    }
    const questColCount = Object.keys(COL.QUEST).length;
    questData.forEach(row => { while (row.length < questColCount) row.push(""); });
    if (isQuestChanged && questData.length > 0) {
      safeWriteSheet(sheets.quest, questData);
    }

    sheets.log.appendRow([new Date(), pcId, `人：${logPeopleStr} ｜ 事：${logEvent}`, curL = pcData[pcIndex][COL.PC.LOC]]);
    trimRowsByOwner(sheets.log, pcId, 60, 1);

    const localPeopleList = getLocalPeopleList(sheets, pcName, pcId, curL, relData, sheets.task ? sheets.task.getDataRange().getValues() : [], pcData);

    let finalResponseText = aiData.narration || "天地混沌，一片寂靜。";
    finalResponseText = finalResponseText.replace(/\n/g, "<br>");






    // 🟢 統一標籤工具：元素是物件取 .name，是字串就用自己（兩種格式通吃）
    const _itemLabel = arr => (arr || [])
      .map(i => (i && typeof i === 'object') ? i.name : i)
      .filter(n => n && String(n).trim() !== "")
      .map(n => `【${String(n).trim()}】`)
      .join('、');

    if (aiData.items_gained && aiData.items_gained.length > 0) {
      const names = _itemLabel(aiData.items_gained);
      if (names) finalResponseText += `<br><br><span style="color:#d4af37; font-size:13px;">✨ 獲得：${names}</span>`;
    }
    // 2. 遺失邏輯
    if (aiData.items_lost && aiData.items_lost.length > 0) {
      const names = _itemLabel(aiData.items_lost);
      if (names) finalResponseText += `<br><br><span style="color:#d9534f; font-size:13px;">💔 失去：${names}</span>`;
    }
    // 3. 使用邏輯
    if (aiData.items_used && aiData.items_used.length > 0) {
      const names = _itemLabel(aiData.items_used);
      if (names) finalResponseText += `<br><br><span style="color:#5bc0de; font-size:13px;">🧪 使用：${names}</span>`;
    }
    // 🔴 在處理完 items_gained 之後，緊接著加上這段好感度渲染
    if (aiData.rel_changes && Array.isArray(aiData.rel_changes)) {
      aiData.rel_changes.forEach(rc => {
        const change = parseInt(rc.fav_change) || 0;
        if (change === 0) return; // 沒變動就跳過

        const icon = change > 0 ? "❤️" : "💔";
        const color = change > 0 ? "#e91e63" : "#555";
        const sign = change > 0 ? "+" : "";

        finalResponseText += `<br><br><span style="color:${color}; font-size:13px; font-weight:bold;">${icon} 「${rc.target}」好感度 ${sign}${change}</span>`;
      });
    }
    // 🟢 新增：徹底傾心事件的專屬渲染（比一般獲得物品更隆重的視覺標記）
    if (soulBoundEventMsg) {
      finalResponseText += `<br><br><span style="color:#ff69b4; font-size:15px; font-weight:bold; text-shadow: 0 0 8px rgba(255,105,180,0.6);">${soulBoundEventMsg}</span>`;
    }

    // 🔴 全員血量變化（讀系統真實結算值，AI亂寫value也不影響）
    const hpChangeMsgs = [];
    dirtyPcRows.forEach(idx => {
      const row = pcData[idx];
      if (!row) return;
      const before = hpSnapshot[idx];
      if (before === undefined) return; // 新生成的角色沒快照
      const after = parseInt(row[COL.PC.HP]) || 0;
      if (after === before) return;
      const nm = row[COL.PC.NAME];
      const maxHp = parseInt(row[COL.PC.MAX_HP]) || 100;
      const diff = after - before;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      const color = diff < 0 ? "#d9534f" : "#2e8b57";
      const isMe = (idx === pcIndex);
      hpChangeMsgs.push(`<span style="color:${color};">${isMe ? "🧍" : "⚔️"} ${nm} ${diffStr} (${after}/${maxHp})</span>`);
    });
    if (hpChangeMsgs.length > 0) {
      finalResponseText += `<br><br><span style="font-size:13px; line-height:1.8;">${hpChangeMsgs.join("<br>")}</span>`;
    }

    // 🔴 玩家真氣與銀兩（生命已由上面清單統一顯示，這裡不重複）
    const mpAfter = parseInt(pcData[pcIndex][COL.PC.MP]) || 0;
    const moneyAfter = parseInt(pcData[pcIndex][COL.PC.MONEY]) || 0;
    const extraMsgs = [];
    const mpDiff = mpAfter - mpBefore;
    const moneyDiff = moneyAfter - moneyBefore;
    if (mpDiff !== 0) extraMsgs.push(`<span style="color:#4169e1;">${mpDiff < 0 ? "💨" : "🌀"} 真氣 ${mpDiff > 0 ? "+" : ""}${mpDiff}</span>`);
    if (moneyDiff !== 0) extraMsgs.push(`<span style="color:#b8860b;">${moneyDiff < 0 ? "💸" : "💰"} 銀兩 ${moneyDiff > 0 ? "+" : ""}${moneyDiff}</span>`);
    if (extraMsgs.length > 0) {
      finalResponseText += `<br><span style="font-size:13px;">${extraMsgs.join('　')}</span>`;
    }








    // 下面這行不用動，保持原樣：
    // 改這行
    saveGameHistoryBatch(pcId, [
      { speaker: "player", content: userMsg },
      { speaker: "ai", content: aiData.narration || "" }  // 用原始 narration 不用 finalResponseText
    ]);


    return JSON.stringify({
      text: finalResponseText,
      statusString: buildPlayerStatusString(pcData[pcIndex], getCharacterTotalStats(pcId, sheets, pcData), itemData),
      people: localPeopleList,
      locations: getNearbyLocations(curL, memoryMapData),
      recruited: newlyRecruited,
      options: aiData.options,
      knockedOut: knockedOutList,
      mentionedNames: aiData.mentioned_names || [],
      justRevived: justRevived,
      allMapNames: memoryMapData.slice(1).map(m => String(m[COL.MAP.NAME]).trim()).filter(n => n.length >= 2),
      // 🔴 新增：將全九州活著的眾生名單傳給前端，用於三段式判定
      allKnownNames: pcData.filter((r, i) => i !== 0 && !String(r[COL.PC.ID]).startsWith("DEAD_")).map(r => String(r[COL.PC.NAME]).trim())
    });

  } catch (e) { return JSON.stringify({ text: "天道崩潰：" + e.message, people: [] }); }
}



function actionGetFactionInfo(userData, pcId, sheets) {
  const pcData = sheets.pc.getDataRange().getValues();
  const pcRow = pcData.find(r => r[COL.PC.ID] == pcId);
  if (!pcRow) return JSON.stringify({ success: false });

  const myFaction = pcRow[COL.PC.FACTION] || "無";
  const myRank = pcRow[COL.PC.RANK] || "散人";
  const myContrib = pcRow[COL.PC.CONTRIB] || 0;

  // 取得我的門派詳情
  let myFactionData = null;
  if (myFaction !== "無" && sheets.faction) {
    const fData = sheets.faction.getDataRange().getValues();
    const fRow = fData.find(r => r[COL.FACTION.NAME] === myFaction);
    if (fRow) {
      // 從大勢表取氣運
      let power = 50, status = "中立";
      const trendSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("大勢");
      if (trendSheet) {
        const tData = trendSheet.getDataRange().getValues();
        const tRow = tData.find(r => r[0] === myFaction);
        if (tRow) { power = tRow[2]; status = tRow[1]; }
      }
      myFactionData = {
        name: fRow[COL.FACTION.NAME],
        align: fRow[COL.FACTION.ALIGN],
        base: fRow[COL.FACTION.BASE],
        leader: fRow[COL.FACTION.LEADER],
        motto: fRow[COL.FACTION.MOTTO],
        power: power,
        status: status
      };
    }
  }

  // 取得天下所有勢力排行
  let allFactions = [];
  if (sheets.faction) {
    const fData = sheets.faction.getDataRange().getValues();
    const trendSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("大勢");
    let trendData = [];
    if (trendSheet) trendData = trendSheet.getDataRange().getValues();

    allFactions = fData.slice(1).map(r => {
      const tRow = trendData.find(t => t[0] === r[COL.FACTION.NAME]);
      return {
        name: r[COL.FACTION.NAME],
        align: r[COL.FACTION.ALIGN],
        base: r[COL.FACTION.BASE],
        leader: r[COL.FACTION.LEADER] || "神祕人",
        power: tRow ? tRow[2] : 50,
        status: tRow ? tRow[1] : "中立"
      };
    }).sort((a, b) => b.power - a.power);
  }

  return JSON.stringify({
    success: true,
    myFaction: myFaction,
    myRank: myRank,
    myContrib: myContrib,
    myFactionData: myFactionData,
    allFactions: allFactions
  });
}

function actionGetEpicHistory(userData, pcId, sheets) {
  const pcData = sheets.pc.getDataRange().getValues();
  const pcRow = pcData.find(r => r[COL.PC.ID] == pcId);
  if (!pcRow) return JSON.stringify({ success: false });
  const pcName = pcRow[COL.PC.NAME];

  // 史紀大事
  let epicEvents = [];
  if (sheets.epic) {
    const eData = sheets.epic.getDataRange().getValues();
    epicEvents = eData.filter(r => r[0] == pcId)
      .map(r => ({ content: r[1], time: r[2] }))
      .reverse().slice(0, 50);
  }

  // 關係重大紀錄（已傾心 + 重大約定）
  let relRecords = [];
  if (sheets.rel) {
    const rData = sheets.rel.getDataRange().getValues();
    relRecords = rData.filter(r => r[COL.REL.PC] === pcName && (
      String(r[COL.REL.TAG] || "").includes("已傾心") ||
      (r[COL.REL.MAJOR_EVENT] && r[COL.REL.MAJOR_EVENT] !== "無" && r[COL.REL.MAJOR_EVENT] !== "")
    )).map(r => ({
      npc: r[COL.REL.NPC],
      tag: r[COL.REL.TAG],
      fav: r[COL.REL.FAV],
      majorEvent: r[COL.REL.MAJOR_EVENT] || "無",
      isSoulBound: String(r[COL.REL.TAG]).includes("已傾心"),
      memory: r[COL.REL.MEMORY] || ""
    }));
  }

  // 江湖足跡統計
  let stats = {
    kills: 0,
    questsDone: 0,
    locationsVisited: new Set(),
    intimacyTotal: 0,
    topIntimacy: null,
    topIntimacyCount: 0
  };

  if (sheets.epic) {
    const eData = sheets.epic.getDataRange().getValues();
    eData.filter(r => r[0] == pcId).forEach(r => {
      const content = String(r[1] || "");
      if (content.includes("因果終結")) stats.kills++;
      if (content.includes("天命圓滿")) stats.questsDone++;
    });
  }

  if (sheets.log) {
    const lData = sheets.log.getDataRange().getValues();
    lData.filter(r => String(r[1]) == pcId || String(r[2]).includes(pcName)).forEach(r => {
      if (r[3]) stats.locationsVisited.add(String(r[3]).split('-')[0]);
    });
  }

  if (sheets.rel) {
    const rData = sheets.rel.getDataRange().getValues();
    rData.filter(r => r[COL.REL.PC] === pcName).forEach(r => {
      const mem = String(r[COL.REL.MEMORY] || "");
      const countMatch = mem.match(/\[親密次數\](\d+)/);
      if (countMatch) {
        const count = parseInt(countMatch[1]);
        stats.intimacyTotal += count;
        if (count > stats.topIntimacyCount) {
          stats.topIntimacyCount = count;
          stats.topIntimacy = r[COL.REL.NPC];
        }
      }
    });
  }

  return JSON.stringify({
    success: true,
    epicEvents: epicEvents,
    relRecords: relRecords,
    stats: {
      kills: stats.kills,
      questsDone: stats.questsDone,
      locationsCount: stats.locationsVisited.size,
      intimacyTotal: stats.intimacyTotal,
      topIntimacy: stats.topIntimacy,
      topIntimacyCount: stats.topIntimacyCount,
      realm: pcRow[COL.PC.REALM] || "凡人"
    }
  });
}
function actionGetRanking(userData, pcId, sheets) {
  const pcData = sheets.pc.getDataRange().getValues();

  const ranking = [];

  pcData.slice(1).forEach(row => {
    const id = String(row[COL.PC.ID]);
    if (id.startsWith("DEAD_")) return;

    const realm = row[COL.PC.REALM] || "凡人";
    const realmMod = REALM_MODIFIERS[realm] || 1.0;

    const str = Math.floor((parseInt(row[COL.PC.STR]) || 0) * realmMod);
    const con = Math.floor((parseInt(row[COL.PC.CON]) || 0) * realmMod);
    const agi = Math.floor((parseInt(row[COL.PC.AGI]) || 0) * realmMod);
    const int = Math.floor((parseInt(row[COL.PC.INT]) || 0) * realmMod);
    const luk = Math.floor((parseInt(row[COL.PC.LUK]) || 0) * realmMod);
    const power = str + con + agi + int + luk;

    ranking.push({
      name: row[COL.PC.NAME],
      realm: realm,
      power: power,
      faction: row[COL.PC.FACTION] || "無",
      rank: row[COL.PC.RANK] || "散人",
      isPlayer: id.startsWith("PC_")
    });
  });

  ranking.sort((a, b) => b.power - a.power);

  return JSON.stringify({ success: true, data: ranking.slice(0, 50) });
}

// 🟢 新增：天道強行抹除/斬斷 NPC 的重大事件約定
function actionClearNpcMajorEvent(userData, pcId, sheets) {
  if (!sheets.rel) return JSON.stringify({ success: false, message: "天道異常：REL關係表不存在。" });

  // 1. 透過 pcId 撈出玩家本人的名號
  const pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人命格。" });
  const myName = pcData[pIdx][COL.PC.NAME];

  const targetName = userData.targetName; // 前端傳過來的 NPC 名字

  // 2. 進入關係表尋找這兩人的因果列
  let relData = sheets.rel.getDataRange().getValues();
  const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === targetName);

  if (rIdx === -1) {
    return JSON.stringify({ success: false, message: "在冥冥眾生冊中，未尋得你與此人的命運約定。" });
  }

  // 3. 完美對齊：利用妳的 COL 欄位常數，強行將該列的重大事件覆寫為 "無"
  sheets.rel.getRange(rIdx + 1, COL.REL.MAJOR_EVENT + 1).setValue("無");

  return JSON.stringify({ success: true, message: "天命已改，因果落筆重塑！" });
}


// ==========================================
// 🎖️ 宗門晉升邏輯
// ==========================================
function actionPromoteRank(userData, pcId, sheets) {
  const pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  const faction = pcData[pIdx][COL.PC.FACTION] || "無";
  let rank = String(pcData[pIdx][COL.PC.RANK] || "散人").trim();
  const contrib = parseInt(pcData[pIdx][COL.PC.CONTRIB]) || 0;

  if (faction === "無" || faction === "無門派") {
    return JSON.stringify({ success: false, message: "你尚無宗門，何來晉升？" });
  }

  // 1. 最高統治者防呆
  if (rank.match(/宗主|掌門|教主|門主|谷主|閣主|魁首|老祖/)) {
    return JSON.stringify({ success: false, message: `大能說笑了，你已是【${faction}】的${rank}，萬人之上，無可晉升！若要更高，除非飛升仙界。` });
  }

  // 2. 定義宗門階級與對應的「累計貢獻度」門檻
  const rankPath = [
    { name: "記名弟子", req: 0 },
    { name: "外門弟子", req: 300 },
    { name: "內門弟子", req: 1000 },
    { name: "真傳弟子", req: 3000 },
    { name: "執事", req: 6000 },
    { name: "堂主", req: 12000 },
    { name: "護法", req: 25000 },
    { name: "長老", req: 50000 },
    { name: "副宗主", req: 100000 }
  ];

  // 尋找目前階級在哪裡
  let currentRankIdx = rankPath.findIndex(r => r.name === rank);

  // 如果玩家現在的階級是被 AI 亂編的 (不在表內)，預設把他當作外門弟子來升級
  if (currentRankIdx === -1) {
    currentRankIdx = 0;
  }

  // 檢查是否已經封頂
  if (currentRankIdx >= rankPath.length - 1) {
    return JSON.stringify({ success: false, message: "你已達到副手之極，再往上就只能篡位當宗主了！" });
  }

  const nextRank = rankPath[currentRankIdx + 1];

  // 3. 貢獻度門檻審查
  if (contrib < nextRank.req) {
    return JSON.stringify({
      success: false,
      message: `晉升【${nextRank.name}】需要累積達 ${nextRank.req} 點貢獻，你目前只有 ${contrib} 點。請多為宗門效力！`
    });
  }

  // 4. 晉升成功！(我們設計為看「累計貢獻」，所以不扣貢獻度，這樣地位才不會掉)
  pcData[pIdx][COL.PC.RANK] = nextRank.name;

  // 寫入資料庫
  sheets.pc.getRange(pIdx + 1, COL.PC.RANK + 1).setValue(nextRank.name);

  if (sheets.epic) {
    sheets.epic.appendRow([pcId, `【宗門晉升】在「${faction}」中屢建奇功，憑藉 ${contrib} 點貢獻晉升為【${nextRank.name}】。`, new Date()]);
  }

  return JSON.stringify({
    success: true,
    message: `鐘聲作響，天地昭告！憑藉著累積達 ${contrib} 點的卓著貢獻，你成功晉升為【${faction}】的【${nextRank.name}】！`,
    statusString: getFreshStatusString(pcId, pIdx, sheets)
  });
}



function actionSpareNpc(userData, pcId, sheets) {
  const { npcName } = userData;
  let pcData = sheets.pc.getDataRange().getValues();
  const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === npcName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  if (nIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  // 放過＝從昏迷恢復成「清醒虛弱」，血拉回 20%，能正常活動而非永久躺 1 血
  const maxHp = parseInt(pcData[nIdx][COL.PC.MAX_HP]) || 100;
  pcData[nIdx][COL.PC.HP] = Math.max(1, Math.floor(maxHp * 0.2));
  pcData[nIdx][COL.PC.STATUS] = JSON.stringify({
    "衣服": "衣衫破損", "姿勢": "勉強起身", "負面": "傷勢未癒", "顏面": "虛弱"
  });
  sheets.pc.getRange(nIdx + 1, 1, 1, pcData[nIdx].length).setValues([pcData[nIdx]]);
  return JSON.stringify({ success: true });
}
// ==========================================
// ⚔️ 系統裁決攻擊 (雙方D20 + 放大後五圍 + 自訂招式，傷害看差距，不致死只到昏迷)
// ==========================================
function actionAttackNpc(userData, pcId, sheets) {
  const { npcName, skillName } = userData;
  let pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  const nIdx = pcData.findIndex(r => r[COL.PC.NAME] === npcName && !String(r[COL.PC.ID]).startsWith("DEAD_"));
  if (pIdx === -1 || nIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  // 同地點才能打
  if (String(pcData[pIdx][COL.PC.LOC]).trim() !== String(pcData[nIdx][COL.PC.LOC]).trim()) {
    return JSON.stringify({ success: false, message: "對方不在你身邊，鞭長莫及。" });
  }

  const pName = pcData[pIdx][COL.PC.NAME];
  const pTotal = getCharacterTotalStats(pcId, sheets, pcData);
  const nTotal = getCharacterTotalStats(pcData[nIdx][COL.PC.ID], sheets, pcData);

  // d20
  const pRoll = Math.floor(Math.random() * 20) + 1;
  const nRoll = Math.floor(Math.random() * 20) + 1;

  // 加成：攻方看臂力+身法，守方看根骨+身法（皆為境界放大後的值）
  const skillBonus = (skillName && String(skillName).trim()) ? 1 : 0;
  const pMod = Math.round(((pTotal.STR || 0) + (pTotal.AGI || 0)) / 6) + skillBonus;
  const nMod = Math.round(((nTotal.CON || 0) + (nTotal.AGI || 0)) / 6);

  let pScore = pRoll + pMod;
  let nScore = nRoll + nMod;

  // 特殊值處理
  const pCrit = pRoll === 20, pFumble = pRoll === 1;
  const nCrit = nRoll === 20, nFumble = nRoll === 1;

  // 判定勝負方向：true=玩家贏(打NPC)，false=NPC贏(反擊玩家)
  let playerWins;
  let critFlavor = ""; // 給前端與AI的特殊演出標記
  let dmgMultiplier = 1;

  if (pFumble && !nFumble) { playerWins = false; dmgMultiplier = 1.5; critFlavor = "player_fumble"; }
  else if (nFumble && !pFumble) { playerWins = true; dmgMultiplier = 1.5; critFlavor = "npc_fumble"; }
  else if (pCrit && !nCrit) { playerWins = true; critFlavor = "player_crit"; }
  else if (nCrit && !pCrit) { playerWins = false; critFlavor = "npc_crit"; }
  else { playerWins = pScore >= nScore; } // 含「雙方都特殊值」→回歸比總分

  // 傷害 = 差距 ×7；大成功保底破防 +30；大失敗 ×1.5
  let diff = Math.abs(pScore - nScore);
  let damage = Math.max(1, diff * 7);
  if ((playerWins && nCrit === false && pCrit) || (!playerWins && nCrit)) damage += 30; // 大成功保底
  damage = Math.round(damage * dmgMultiplier);

  let resultMsg = "";
  let knockedOut = [];
  let justRevived = false;

  if (playerWins) {
    // 打 NPC：鎖血，最低到1昏迷，絕不致死
    let nHp = parseInt(pcData[nIdx][COL.PC.HP]) || 0;
    let nHpAfter = nHp - damage;
    if (nHpAfter <= 5) {
      pcData[nIdx][COL.PC.HP] = 1;
      pcData[nIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "衣衫破爛", "姿勢": "倒地不起", "負面": "重傷昏迷", "顏面": "面色慘白" });
      knockedOut.push(npcName);
    } else {
      pcData[nIdx][COL.PC.HP] = nHpAfter;
    }
    sheets.pc.getRange(nIdx + 1, 1, 1, pcData[nIdx].length).setValues([pcData[nIdx]]);
    resultMsg = `你擊中了「${npcName}」，造成 ${damage} 點傷害！`;
  } else {
    // 反擊玩家：歸0送藥鋪
    let pHp = parseInt(pcData[pIdx][COL.PC.HP]) || 0;
    let pHpAfter = pHp - damage;
    if (pHpAfter <= 0) {
      const healLoc = "小醫仙藥鋪";
      pcData[pIdx][COL.PC.HP] = 50;
      pcData[pIdx][COL.PC.STATUS] = JSON.stringify({ "衣服": "換上乾淨素衣", "姿勢": "平躺靜養", "負面": "重傷初癒", "顏面": "蒼白" });
      pcData[pIdx][COL.PC.LOC] = healLoc;
      pcData[pIdx][COL.PC.MONEY] = Math.max(0, (parseInt(pcData[pIdx][COL.PC.MONEY]) || 0) - 20);
      justRevived = true;
      if (sheets.epic) sheets.epic.appendRow([pcId, `【奇蹟救治】${pName} 於生死邊緣被救回。`, new Date()]);
    } else {
      pcData[pIdx][COL.PC.HP] = pHpAfter;
    }
    sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);
    resultMsg = `「${npcName}」反擊得手，你受了 ${damage} 點傷！`;
  }

  // 給 AI 的指令：結果已定，只能照演
  let critText = "";
  if (critFlavor === "player_crit") critText = "玩家骰出【大成功】，這一擊精妙絕倫、無視防禦命中要害！";
  else if (critFlavor === "npc_crit") critText = `「${npcName}」骰出【大成功】，玩家的進攻被完美化解並遭凌厲反擊！`;
  else if (critFlavor === "player_fumble") critText = "玩家骰出【大失敗】，招式露出致命破綻，被對方狠狠教訓！";
  else if (critFlavor === "npc_fumble") critText = `「${npcName}」骰出【大失敗】，露出天大破綻，被玩家打得毫無還手之力！`;

  const aiPrompt = `【系統戰報·已裁定，嚴禁更改勝負】玩家『${pName}』向「${npcName}」發動攻擊${skillName ? `（招式：${skillName}）` : ""}。\n` +
    `擲骰結果：玩家 ${pRoll}+${pMod}=${pScore}，${npcName} ${nRoll}+${nMod}=${nScore}。\n` +
    `${critText}\n最終結果：${resultMsg}\n` +
    `★請依此結果生動描寫這場交手，勝負與傷害已由系統結算完畢。\n` +
    `★【鐵律】「${npcName}」最多只是重傷昏迷倒地，【絕對禁止】描寫其死亡、斷氣、隕落或屍體！生死由玩家後續定奪。\n` +
    `★【鐵律】嚴禁輸出任何 stat_changes 的生命變化，傷害已結算完畢，重複輸出會導致天道崩塌！\n` +
    `★【鐵律】此為單純切磋交手，嚴禁輸出 items_gained、items_transferred 或 money_transferred，戰利品掠奪需待對方昏迷後另行處決才可結算！`;
  return JSON.stringify({
    success: true,
    combatResult: {
      playerName: pName, npcName: npcName,
      pRoll: pRoll, pMod: pMod, pScore: pScore,
      nRoll: nRoll, nMod: nMod, nScore: nScore,
      playerWins: playerWins, damage: damage, critFlavor: critFlavor
    },
    aiPrompt: aiPrompt,
    knockedOut: knockedOut,
    justRevived: justRevived,
    statusString: getFreshStatusString(pcId, pIdx, sheets)
  });
}

// ==========================================
// 🟢 輕量敘事專用路由：結算已由 GAS 完成，這裡只請 AI 補一段純文字描寫
// 不讀規矩表、不帶歷史、不解析 JSON 數值，token 砍到最低
// ==========================================
function actionNarrateOnly(userData, pcId, sheets) {
  const { promptText, isNsfw } = userData;

  const miniSystem = `你是九州說書人。用日系武俠輕小說筆觸、第一人稱「我」、強制台灣繁體中文，依指令生動描寫一小段劇情（150~250字）。
【鐵律】
1. 旁白第一人稱「我」，禁用「你」與上帝視角。
2. 對話用全形「」，格式：角色名：「(動作)台詞」。
3. 強制分段：每2~3句插入 <br><br>，整段至少3個 <br><br>，禁止整坨。換行一律用 <br><br>，禁止真實換行，禁止輸出任何 HTML 標籤。
4. ★這是純敘事補完，系統底層已結算完所有數值，你只負責寫字。
5. 只輸出 JSON：{"narration":"你的敘述，內含<br><br>分段"}，禁止任何其他欄位、禁止 Markdown。`;

  const raw = callGeminiAPI(promptText, miniSystem, {
    temperature: 0.85,
    ignoreLaw: true,            // 不疊規矩表(節慶/天時)
    max_tokens: 700,            // 比 actionPlay 的 2000 砍掉一大半
    model: "google/gemini-3.1-flash-lite",
    isNsfwMode: !!isNsfw        // NSFW 時讓 fallback 文案合理，但不啟用完整慾海規則
    // 🔴 刻意不傳 chatHistory：省最多 token，孤立事件不需要前文
  });

  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const data = JSON.parse(raw.substring(start, end + 1));
    return JSON.stringify({ success: true, text: data.narration || "天地靜默，一片祥和。" });
  } catch (e) {
    return JSON.stringify({ success: true, text: "（此處因果已定，天機微微一閃。）" });
  }
}



function actionUpdateRelTag(userData, pcId, sheets) {
  const { targetName, newTagText } = userData;
  if (!sheets.rel) return JSON.stringify({ success: false, message: "天道異常：關係表不存在。" });
  if (!newTagText || !String(newTagText).trim()) return JSON.stringify({ success: false, message: "稱呼不可為空。" });

  const pcData = sheets.pc.getDataRange().getValues();
  const myName = pcData.find(r => r[COL.PC.ID] == pcId)[COL.PC.NAME];

  let relData = sheets.rel.getDataRange().getValues();
  const rIdx = relData.findIndex(r => r[COL.REL.PC] === myName && r[COL.REL.NPC] === targetName);

  if (rIdx === -1) return JSON.stringify({ success: false, message: "查無此段羈絆。" });

  const currentFav = parseInt(relData[rIdx][COL.REL.FAV]) || 0;
  const isSoulBound = String(relData[rIdx][COL.REL.TAG] || "").includes("(已傾心)");

  // 🔴 門檻：好感100 + 已傾心，跟送禮解鎖邏輯一致
  if (currentFav < 100 || !isSoulBound) {
    return JSON.stringify({ success: false, message: "羈絆未至深處（需好感100且已傾心），尚無法重新定義這段關係。" });
  }

  // 清掉舊稱呼的"(已傾心)"後綴，套用新文字，再強制補回後綴（後綴永遠鎖死，不開放修改）
  const cleanNewTag = String(newTagText).trim().replace(/\(已傾心\)/g, "").trim();
  const finalTag = `${cleanNewTag}(已傾心)`;

  sheets.rel.getRange(rIdx + 1, COL.REL.TAG + 1).setValue(finalTag);

  return JSON.stringify({ success: true, message: `羈絆已重新定義為「${finalTag}」。`, newTag: finalTag });
}
// ==========================================
// 🏰 開宗立派邏輯 (高門檻 + 獨立領地版)
// ==========================================
function actionCreateFaction(userData, pcId, sheets) {
  const { factionName, align, motto, baseLoc } = userData;
  if (!sheets.faction) return JSON.stringify({ success: false, message: "勢力表不存在" });

  const pcData = sheets.pc.getDataRange().getValues();
  const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
  if (pIdx === -1) return JSON.stringify({ success: false, message: "查無此人" });

  // 1. 後端雙重防呆：驗證銀兩與境界
  const currentMoney = parseInt(pcData[pIdx][COL.PC.MONEY]) || 0;
  if (currentMoney < 50000) return JSON.stringify({ success: false, message: "銀兩不足 50000 兩" });

  const currentRealm = pcData[pIdx][COL.PC.REALM] || "凡人";
  if (REALMS.indexOf(currentRealm) < REALMS.indexOf("通玄")) {
    return JSON.stringify({ success: false, message: "境界未達通玄，無法鎮壓宗門氣運！" });
  }

  // 2. 檢查是否撞名
  const currentFactions = sheets.faction.getDataRange().getValues();
  if (currentFactions.some(r => String(r[COL.FACTION.NAME]).trim() === factionName.trim())) {
    return JSON.stringify({ success: false, message: "江湖中已有同名宗門，請另尋霸氣名號！" });
  }

  // 3. 領地邏輯：在當前母區域下，開闢「專屬子地圖」 (例如: 青丘城-天魔教)
  const sectMapName = `${baseLoc}-${factionName}`;

  if (sheets.map) {
    const mapData = sheets.map.getDataRange().getValues();
    if (!mapData.some(m => String(m[COL.MAP.NAME]).trim() === sectMapName)) {
      // 抓取母區域座標，做微微偏移
      let pCoord = "0,0";
      const parentMap = mapData.find(m => String(m[COL.MAP.NAME]).trim() === baseLoc);
      if (parentMap && parentMap[COL.MAP.COORD]) {
        let parts = String(parentMap[COL.MAP.COORD]).split(',');
        let bx = parseInt(parts[0]) || 0; let by = parseInt(parts[1]) || 0;
        pCoord = `${bx + Math.floor(Math.random() * 5) - 2},${by + Math.floor(Math.random() * 5) - 2}`;
      }
      // 寫入《坤圖》：REGION, NAME, TYPE, COORD, DESC, PARENT
      sheets.map.appendRow(["九州", sectMapName, "宗門", pCoord, `『${factionName}』的宗門重地，外設強大護山大陣。宗旨：${motto}`, baseLoc]);
      // 清除地圖快取，讓前端能馬上讀到新宗門
      CacheService.getScriptCache().remove("KYUSHU_MAP_DATA");
    }
  }

  // 4. 扣錢、升官、將玩家傳送到自己的宗門領地
  pcData[pIdx][COL.PC.MONEY] = currentMoney - 50000;
  pcData[pIdx][COL.PC.FACTION] = factionName;
  pcData[pIdx][COL.PC.RANK] = "宗主";
  pcData[pIdx][COL.PC.CONTRIB] = 9999;
  pcData[pIdx][COL.PC.ALIGN] = align;
  pcData[pIdx][COL.PC.LOC] = sectMapName; // 📍 搬家到專屬領地！

  sheets.pc.getRange(pIdx + 1, 1, 1, pcData[pIdx].length).setValues([pcData[pIdx]]);

  // 5. 寫入勢力表 (基地位置設為新開闢的地圖)
  const fId = "FAC_" + Date.now();
  const pcName = pcData[pIdx][COL.PC.NAME];
  sheets.faction.appendRow([fId, factionName, align, sectMapName, pcName, motto]);

  // 6. 寫入大勢表 (新勢力給予初始氣運 50)
  updateFactionPower(sheets, factionName, 50, `由通玄境大能『${pcName}』橫空出世創立`);

  // 7. 廣播傳聞與個人史紀
  addRumor(sheets, "FACTION_NEW", sectMapName, factionName);
  if (sheets.epic) {
    sheets.epic.appendRow([pcId, `【開宗立派】修為達「${currentRealm}」，豪擲五萬兩於 ${baseLoc} 開闢福地，創立了「${factionName}」。`, new Date()]);
  }

  return JSON.stringify({ success: true, statusString: getFreshStatusString(pcId, pIdx, sheets) });
}
