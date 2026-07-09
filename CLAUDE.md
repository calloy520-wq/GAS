# CLAUDE.md — 《海與劍之歌》專案指南

免費多人網頁 RPG，跑在 **Google Apps Script**。主軸：**⚔️地下城 × 🌊大航海 × 👑爭霸**（傭兵團 × 大航海 × 騎砍）。
玩家＝傭兵團長／船長。使用者是繁體中文玩家，喜歡我**直接把功能做完＋測試＋部署**。

> 📖 **完整功能地圖看 [`docs/遊戲說明書.md`](docs/遊戲說明書.md)** —— 動工前先讀，別只憑摘要。

## 檔案分工
| 檔案 | 職責 |
|---|---|
| `Data.gs` | 規則常數與資料表（職業/種族/稀有度/裝備/怪物/貨品/港口/船艦/威名/世界事件） |
| `Engine.gs` | 骰子與戰鬥引擎（建角/升級/技能檢定/`runDungeon`地城/`resolveCombat`回合戰） |
| `Store.gs` | 資料層（Sheet 讀寫/快取/`ensureShape_`補洞/`sanitize_`夾值/名冊） |
| `Code.gs` | 路由 `api()`→`route_()`→`apiXxx_()` + 海事/貿易/海戰/艦隊/領地/職務邏輯 |
| `Index.html` | 整個前端 SPA（CSS＋渲染＋離線 mock）。超大、長行。 |

## 架構要點
- 前端唯一後端入口：`google.script.run.api(action, payloadJson)` → 回 `{ok,data}` JSON 字串。
- **伺服器權威**：所有隨機/戰鬥/經濟在後端算完再回傳；前端只畫面 + 播放結構化事件動畫（地城 `ev`、海戰 `nev`）。
- 存檔在綁定 Google Sheet 的 `Players` 分頁。player 資料模型見說明書 §2。

## ⚠️ 動工前必記的雷區
1. **離線 mock 鏡像**：`Index.html` 有一整套 `*C`/`*_C` 後綴函式與常數（`tradePriceC`/`MARKETS_C`/`resolveNavalC`/`GARRISONS_C`…）鏡像伺服器邏輯。
   **改伺服器規則/資料 → 一定同步這些鏡像**，否則線上/離線不一致。
2. **新增港口** → 同步 `MARKETS`＋`MARKETS_C`、`GARRISONS`＋`GARRISONS_C`。
3. **改 player 欄位** → 同步 `ensureShape_`（Store.gs）與 `ensureC`（Index.html mock）補洞。
4. **頭像 `pthumb` 永遠回傳原網址**（`return url`）；靠 CSS `object-fit:cover` 裁切＋瀏覽器快取。
   **絕不**改請求別的尺寸——會逼 Pollinations 重新生成（慢＋常破圖＋失快取）。載入失敗 `onerror` 退回職業圖示。
5. **樂觀更新**：改狀態用 `saveP(cb)`（先改畫面、300ms 去抖存檔）；重讀伺服器前先 `flushSave()`。
6. **免費 AI**（Pollinations 頭像/傳聞/戰記）一律要有**模板保底**（sandbox 無網路）。

## 解鎖節奏（漸進，別破壞）
- 新玩家**不自帶船**。地城**第 5 層** → 領主城堡領新手船（開放貿易/海戰）。**第 10 層** → 解鎖船商/艦隊。
- 前端 `seaOpen()` / `fleetOpen()` 控制顯示，別讓新手一次看到全部功能。

## 開發・部署・測試
- **只有 push 到 `main` 會部署**（GitHub Action → clasp push + deploy，`/exec` 網址不變）。功能先在指定 feature 分支開發。
- commit 訊息用繁體中文、清楚描述做了什麼。
- **測試用 Playwright**：chromium 在 `/opt/pw-browsers/`，`NODE_PATH=/opt/node22/lib/node_modules`；
  用 node http server 服務 `Index.html`，`page.evaluate` seed `window.P` 後呼叫 `renderXxx`/`openXxx` 驗證。mock 有 250ms 假延遲，測流程留等待時間。
- `.claspignore` 只推 `*.gs`/`*.html`/`appsscript.json`；`.md` 不上傳（本檔與說明書不影響部署）。

## 內容界線
種族奴隸制／人口販賣（「賣黑奴」等）**不做**。硬核「抓人換錢」改用正派包裝：俘虜贖金、解放奴隸任務線。
