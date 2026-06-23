// ---------------------------------------------------------
// 🎲 長樂坊：靈紋骰局核心邏輯 (獨立模組)
// ---------------------------------------------------------
function playDiceGame(pcId, betType, betAmount, sheets, COL) {
  try {
    // 1. 取得玩家資料庫與當前銀兩
    const pcData = sheets.pc.getDataRange().getValues();
    const pIdx = pcData.findIndex(r => r[COL.PC.ID] == pcId);
    if (pIdx === -1) return JSON.stringify({ success: false, message: "天道異常：找不到玩家本體。" });

    let playerMoney = parseInt(pcData[pIdx][COL.PC.MONEY]) || 0;

    // 2. 防呆與限額檢查
    if (betAmount < 100 || betAmount > 10000) {
      return JSON.stringify({ success: false, message: "下注金額必須在 100 至 10,000 兩之間。" });
    }
    if (playerMoney < betAmount) {
      return JSON.stringify({ success: false, message: "囊中羞澀！大俠，妳的銀兩不夠啊。" });
    }

    // 3. 擴充核心：賠率與勝利條件設定檔
    const BET_CONFIG = {
      "大": { payout: 2, checkWin: (sum, isTriple) => !isTriple && sum >= 11 && sum <= 17 }, // 1賠1，遇豹子通殺
      "小": { payout: 2, checkWin: (sum, isTriple) => !isTriple && sum >= 4 && sum <= 10 },
      "任意豹子": { payout: 25, checkWin: (sum, isTriple) => isTriple }, // 1賠24
      "豹子666": { payout: 151, checkWin: (sum, isTriple, dice) => isTriple && sum === 18 } // 1賠150
    };

    if (!BET_CONFIG[betType]) {
      return JSON.stringify({ success: false, message: "天道異常：未知的下注類型。" });
    }

    // 4. 擲出三顆骰子 (GAS 絕對安全的隨機數)
    const dice = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    const sum = dice.reduce((a, b) => a + b, 0);
    const isTriple = (dice[0] === dice[1] && dice[1] === dice[2]);

    // 5. 判斷勝負與結算金額
    const rule = BET_CONFIG[betType];
    const isWin = rule.checkWin(sum, isTriple, dice);
    let winnings = 0;
    let resultMsg = `開出【${dice.join(', ')}】共 ${sum} 點。`;
    let newMoney = playerMoney;

    if (isWin) {
      winnings = betAmount * rule.payout;
      newMoney += (winnings - betAmount); // 加上贏得的淨利潤
      resultMsg += `\n🎉 恭喜！押中「${betType}」，贏得 ${winnings - betAmount} 兩白銀！`;
    } else {
      newMoney -= betAmount; // 扣除下注本金
      resultMsg += isTriple ? `\n💀 天煞豹子！莊家通殺！妳失去了 ${betAmount} 兩。` : `\n差了一點！妳失去了 ${betAmount} 兩。`;
    }

    // 6. 物理寫入資料庫 (真實扣款/加錢)
    sheets.pc.getRange(pIdx + 1, COL.PC.MONEY + 1).setValue(newMoney);

    // 7. 更新玩家狀態字串 (為了讓前端 UI 的錢包瞬間跳動)
    const r = pcData[pIdx];
    r[COL.PC.MONEY] = newMoney;
    const freshItemData = sheets.item ? sheets.item.getDataRange().getValues() : [];
    const statusString = buildPlayerStatusString(r, getCharacterTotalStats(pcId, sheets, pcData), freshItemData);

    // 8. 回傳給前端播放動畫
    return JSON.stringify({
      success: true,
      diceResult: dice,
      sum: sum,
      isWin: isWin,
      winnings: winnings,
      message: resultMsg,
      statusString: statusString // 攜帶新狀態回傳
    });

  } catch (e) {
    return JSON.stringify({ success: false, message: "賭坊運作異常：" + e.toString() });
  }
}
