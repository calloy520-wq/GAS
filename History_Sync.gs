// History_Sync.gs

function trimRowsByOwner(sheet, pcId, keepCount, idColIndex0Based) {
  if (!sheet) return;
  const totalRows = sheet.getLastRow();
  if (totalRows <= 1) return;
  const idCol = sheet.getRange(2, idColIndex0Based + 1, totalRows - 1, 1).getValues();
  const myRowNumbers = [];
  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(pcId)) myRowNumbers.push(i + 2);
  }
  if (myRowNumbers.length > keepCount) {
    const toDelete = myRowNumbers.slice(0, myRowNumbers.length - keepCount);
    for (let i = toDelete.length - 1; i >= 0; i--) {
      sheet.deleteRows(toDelete[i], 1);
    }
  }
}
// 🔴 因果log專用：依tag分級保留，避免承諾/秘密/變故被閒聊擠出歷史
const IMPORTANT_LOG_TAGS = new Set(["承諾", "秘密", "變故"]);

function trimLogRowsByOwner(sheet, pcId, keepCount, importantCap) {
  if (!sheet) return;
  const totalRows = sheet.getLastRow();
  if (totalRows <= 1) return;
  const data = sheet.getRange(2, 1, totalRows - 1, 5).getValues();
  const myRows = [];
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][1]) === String(pcId)) myRows.push({ rowNum: i + 2, tag: String(data[i][4] || "") });
  }
  if (myRows.length <= keepCount) return;

  const casual = myRows.filter(r => !IMPORTANT_LOG_TAGS.has(r.tag));
  const important = myRows.filter(r => IMPORTANT_LOG_TAGS.has(r.tag));

  let overBy = myRows.length - keepCount;
  let toDelete = casual.slice(0, Math.min(overBy, casual.length));
  overBy -= toDelete.length;
  if (overBy > 0 && important.length > importantCap) {
    toDelete = toDelete.concat(important.slice(0, Math.min(overBy, important.length - importantCap)));
  }

  toDelete.sort((a, b) => b.rowNum - a.rowNum).forEach(r => sheet.deleteRows(r.rowNum, 1));
}

// 🔴 取歷史時優先保留承諾/秘密/變故，剩餘額度才依recency填閒聊，避免重要事被擠出視窗
function pickRelevantLogs(rows, limit) {
  const important = rows.filter(r => IMPORTANT_LOG_TAGS.has(String(r[4] || "")));
  const casual = rows.filter(r => !IMPORTANT_LOG_TAGS.has(String(r[4] || "")));
  const importantSlice = important.slice(-limit);
  const casualSlice = casual.slice(-Math.max(0, limit - importantSlice.length));
  return importantSlice.concat(casualSlice).sort((a, b) => new Date(a[0]) - new Date(b[0]));
}

function saveGameHistoryBatch(pcId, entries) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("歷史暫存");
  if (!sheet) return;
  const rowsToAppend = entries.map(entry => [new Date(), pcId, entry.speaker, entry.content]);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
  trimRowsByOwner(sheet, pcId, 40, 1);
}

function getGameHistory(pcId, pcName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("歷史暫存");
  if (!sheet) return "";
  
  // 🟡 效能優化：限制讀取範圍
  // 如果資料量大，不建議讀取整張表，這裡讀取最後 1000 行應該足夠應付大部分對話需求
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ""; 
  
  // 讀取最後 1000 行 (或不足 1000 行時讀取全部)
  const startRow = Math.max(2, lastRow - 1000);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 4).getValues();
  // 篩選該玩家 ID 的紀錄
  const playerHistory = data.filter(row => String(row[1]) === String(pcId));
  
  // 取最後 10 筆
  const lastTen = playerHistory.slice(-10);
  
  let html = "";
  lastTen.forEach(row => {
    const role = row[2]; 
    const content = row[3];
    
    // 🛡️ 內容洗滌器
    const safeContent = content ? content.toString().replace(/\n/g, "<br>") : "天道無言。";
    
    if (role === "player") {
      html += `<div class="msg-player"><span class="msg-name">${pcName}</span><span class="msg-text">${safeContent}</span></div>`;
    } else {
      html += `<div class="msg-ai"><b>【天道演化】</b>${safeContent}</div>`;
    }
  });
  
  return html;
}
function getGameHistoryBatchRaw(pcId, limit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("歷史暫存");
  if (!sheet) return [];
  
  // 🟡 效能優化：限制讀取範圍，邏輯同上
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const startRow = Math.max(2, lastRow - 1000);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 4).getValues();
  
  const playerHistory = data.filter(row => String(row[1]) === String(pcId));
  
  // 取最後指定筆數
  const recentRows = playerHistory.slice(-limit);
  
  return recentRows.map(row => ({
    speaker: row[2],
    content: row[3]
  }));
}
