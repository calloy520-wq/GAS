// ==========================================
// 🔴【第二部分：LLM 核心調用與網頁進入點】Engine_Combat.gs
// ==========================================

function buildDefaultSystemPrompt(isNsfwMode, backLocked) {
  // 1. 萃取共通的 JSON 基礎結構 (Base Template)
  const baseJson = {
    "narration": isNsfwMode ? "極致細膩的劇情描述(約500字，第一人稱，嚴禁替玩家做決定，多感官與細節交替)..." : "劇情描述(約400字，第一人稱，嚴禁替玩家做決定)...",
    "options": ["1. [主動]強勢掌握掌握主導...", "2. [被動]順從委婉試探...", "3. [接續]順劇情延續互動...", "4. [反差]跳脫氛圍的驚人舉動..."],
    "stat_changes": [
      { "target": "角色名號", "attr": "姿勢/衣服/負面/顏面", "value": "跌坐/衣衫破爛/重傷/慘白" },
      { "target": "角色名號", "attr": "位置", "value": "母區域-分支名稱（例：落雁峰-山頂密室）" }
    ],
    "rel_changes": [{ "target": "NPC名", "fav_change": 3, "tag": "無", "major_event": "無" }],
    "mentioned_names": ["劇情中出現的具名角色名字，不含玩家自己"],
    "new_factions": [],
    "items_gained": [
      { "owner": "自己", "name": "碎銀", "type": "貨幣", "desc": "幾兩碎銀，沉甸甸的。" }
    ],
    "items_lost": ["遺失或損毀的物品名(字串即可)"],
    "items_used": ["主動使用而消耗掉的非丹藥物品名(字串即可)"],
    "items_transferred": [{ "id": "物品ID(若有)", "name": "物品名", "old_owner": "原持有者", "new_owner": "新持有者" }],
    "money_transferred": [{ "from": "付款方名", "to": "收款方名(給玩家填自己)", "amount": 100 }],
    "events": [],
    "quests": [
      { "name": "任務名稱(僅在接到新任務時填)", "target": "明確目標", "status": "進行中", "reward_money": 100, "reward_item": "無", "deadline_days": "僅任務明確有時限(如限時營救)才填整數天數，一般任務留空字串" }
    ],
    "recruited": [],
    "log_summary": { "subject": "主動方真名", "object": "被動/承受方真名(三人以上填眾人)", "event": "誰對誰做了什麼+對方反應，須含明確主被動方向，50字內", "tag": "閒聊/承諾/秘密/變故，四選一" }
  };

  // 2. 根據模式動態覆寫或擴充專屬欄位
  const _visibleState = {
    "衣服": "裸露/衣著狀態(≤12字)",
    "姿勢": "體位姿態(≤15字)",
    "負面": "無/狀態(≤5字)",
    "顏面": "神情潮紅(≤12字)"
  };

  const _physicalState = {
    "蜜穴": "陰道狀態(≤15字)",
    "肉棒": "陽具狀態(≤15字)",
    "菊穴": "後穴狀態(≤15字)",
    "右手": "右手動作",
    "左手": "左手動作"
  };

  // 🔴 npc的範本欄位全填「同上」：Router_Action.gs解析intimacy_feedback時的ignoreWords防呆清單本就含「同上」，
  // 即使AI偷懶照抄範本字面值也會被當成敷衍語忽略、不會寫進玩家看到的狀態欄，省字數不引入新的失敗模式。
  const _visibleStateRef = { "衣服": "同上", "姿勢": "同上", "負面": "同上", "顏面": "同上" };
  const _physicalStateRef = { "蜜穴": "同上", "肉棒": "同上", "菊穴": "同上", "右手": "同上", "左手": "同上" };

  // 🔴 NSFW模式：只專注情慾本身，江湖雜務(物品/銀兩/陣營/任務/招募/地圖/戰鬥數值)本回合完全不追蹤、
  // 不出現在輸出範本內，大幅縮減 JSON 範本字數；SFW(純淨模式)的 baseJson 維持完整不動。
  let finalJson;
  if (isNsfwMode) {
    finalJson = {
      "narration": baseJson.narration,
      "options": baseJson.options,
      "intimacy_feedback": {
        "_note": "★以上四肢/五處皆角色「自身」當下肉體狀態，純肢體與感官、禁內心戲，第三人稱填寫，省略=維持原樣，無對應器官/動作填無，絕對禁寫'自己'。npcs每位與player共用此格式，依其實際狀態填寫對應欄位。",
        "player": {
          "visible_state": _visibleState,
          "physical_state": _physicalState,
          "dynamic_skills": "雙修技巧名(2~5字，無填無)",
          "erogenous_zones": "無"
        },
        "npcs": [{
          "name": "NPC實際名字",
          "visible_state": _visibleStateRef,
          "physical_state": _physicalStateRef,
          "dynamic_skills": "雙修技巧名(2~5字，無填無)",
          "erogenous_zones": "無",
          "mutual_nicknames": "無"
        }]
      },
      "rel_changes": baseJson.rel_changes,
      "mentioned_names": baseJson.mentioned_names,
      "log_summary": baseJson.log_summary
    };
  } else {
    baseJson.intimacy_feedback = { "npcs": [{ "name": "NPC名", "mutual_nicknames": "無" }] };
    baseJson.new_maps = [
      { "name": "母區域-新分支名稱（母區域必須已存在於地圖中）", "type": "場所類型（茶館/密室/廢墟等）", "desc": "氛圍描述限30字" }
    ];
    finalJson = baseJson;
  }

  // 3. 組合共通鐵律 Prompt (極致超壓縮版)
  // 🔴 SFW(純淨模式)維持完整鐵律不動，是江湖玩法最完整的模式。
  const sfwBaseRules = `你是九州天道演化核心，以日系武俠輕小說筆觸推演因果，強制台灣繁體中文。第一人稱「我」，禁上帝視角。以下為不可違背之天道鐵律：

【敘事與對話】
1. 絕對響應：開頭必以第一人稱完整重現玩家最新動作與台詞，優先承接反轉、否定與突發，禁順預設劇情硬寫。NPC當回合給完整態度，禁懸念。
2. 格式分段：每2~3句必插入 <br><br> 換段。女體用柔嫩/雪白等柔美詞，❌絕對禁止強壯/鋼鐵/肌肉/薄繭/堅硬/厚實等冷硬粗暴詞。
3. 對話格式：角色名：「（動作/神態/眼神/微表情）台詞……（動作/神態/眼神/微表情）台詞（動作/神態/眼神/微表情）」。★每位角色每次說話【至少穿插2次以上】該角色當下的動作、神態、眼神或微表情，【絕對禁止】將動作神態獨立成段、寫在引號外或省略不寫，一律用全形括號「（）」直接嵌入台詞字句的開頭、中間或結尾。名字只標一次、引號只用一層「」，嚴禁重複名字或巢狀引號(如「沈清霜：「沈清霜：『...』」」)。開頭禁代名詞(他/她)，必指名道姓。
4. 位置與品牌：若『在地店鋪資訊』提供「品牌名」，敘事應以此為主（例：『醉仙樓』），並將『位置』標籤（例：『青丘城-令狐沖的店鋪』）視為江湖產業歸屬與行政座標，合理融入「我走進了令狐沖經營的醉仙樓」等描寫，嚴禁直呼標籤全名作為對白。

【世界與NPC自主】
1. 意圖攔截與沙盒主權：玩家輸入的動作皆僅為「意圖」。若遇 NPC 阻攔、閃避或玩家實力不濟，天道必須【打斷/中止】玩家動作，嚴禁玩家言出法隨！尊重 NPC 自主，禁說教、強推主線或替玩家做決定。背景龍套(茶客/路人)不收錄至 mentioned_names，該欄僅收真實姓名(無名填[])。
2. 慢熱與傾心：NPC依[個性][氣質][陣營]真實反應。好感未滿80者嚴禁言行表現傾心倒貼，禁用傾心/道侶等極親密詞。「(已傾心)」由系統信物自動掛載，AI禁自行輸出。關係羈絆 tag 填【關係定位】四字詞(萍水相逢/點頭之交/漸生情愫/紅顏知己等)，須對應好感高低，禁填當下情緒(如羞憤/開心)。
3. 境界序列：凡人<引氣<凝罡<通玄<罡氣<意動<心象<登峰<返璞<天人。高境界者深藏不露，動怒出手才展現相稱壓迫感。

【物品鐵律】(最高優先)
1. 實體限制：所用道具須為【玩家命格】行囊真實持有。若無則【動作直接大失敗並產生破綻】、描寫遍尋撲空、禁無中生有、禁輸出任何 items 相關欄位，且 options 禁出現該動作。未經指示禁主動消耗玩家道具。
2. 消耗與服用：使用一次性物填 items_used；被奪損毀填 items_lost。丹藥(加五圍)/恢復道具(回氣血)不可在對話中企圖服用，玩家若企圖吃藥僅於 narration 提示「需打開行囊服用」，禁在此給屬性或扣物。
3. ★【禁止重複賜予】：玩家或 NPC 【原本就擁有、裝備中、或只是在劇情中拿出來展示/使用】的物品，【絕對禁止】再次寫入 items_gained！items_gained 僅限於「首次從外界或他人處取得的全新物品」。輸出前必須比對【行囊】清單，若玩家只是在對話中【提及、回憶、描述】某件已持有的物品，這【不是】新獲得事件，絕對不可視為再次贈予的理由！若違反此律，將導致道具無限複製的災難！
4. ★【煉成／打造/煉丹專屬系統鐵律】：玩家若僅以對話描述「丟進火堆」「隨手煉製」「開爐」等煉成意圖，但並未透過正式煉成介面操作完成裁決，代表此次煉成尚未成立，此時【絕對禁止】判定煉成成功、【絕對禁止】輸出任何 items_gained，只能描寫玩家「需先備妥素材並開啟煉製」的提示。
5. ★【生活技能專屬系統鐵律】：玩家若僅以對話描述「採集／收集／搜索／伐木／釣魚／挖礦／採藥／狩獵／淘金／採果」等任何企圖無中生有獲取物品或銀兩的意圖，但並未透過正式生活技能介面操作完成裁決，【絕對禁止】輸出任何 items_gained 或正向 money_transferred，只能描寫玩家「一無所獲，需動用相應的生活本事」之類的提示。

【銀兩鐵律】(最高優先)
1. 憑空生財無效：銀兩以【玩家命格】為準、永不為負，禁虛構欠債，【絕對禁止】透過 stat_changes 增減銀兩。玩家口頭聲稱中獎、發財一律無效。
2. 流轉機制：有名號NPC給錢或玩家給錢，一律走 money_transferred：{"from":"付款方","to":"收款方","amount":金額}，餘額不足則轉移失敗並描寫窘迫。僅無名龍套賞賜可在 items_gained 給固定名稱「碎銀」或「黃金」(type:貨幣，owner:自己，每回合≤2個)。

【狀態、位置與戰鬥】
1. 狀態刷新：有肢體/情緒波動必更新外顯狀態（純淨填 stat_changes、慾海填 visible_state，勿重複）。負面限實質物理/毒理(無則填無)。
2. 位置位移：格式限兩段式「母區域」或「母區域-分支」(限一個減號)；玩家實際抵達才更新。★【NPC退場與位移】NPC若於劇情中告辭或離去，必須【絕對跟隨敘事】立即在 stat_changes 將其位置更新至「劇情中明確交代的具體目的地（格式：母區域-分支，如『青丘城-繡坊』）」！若劇情未交代具體去向，只需輸出該NPC原本所屬的「母區域」本身(不附加分支)即可，★【絕對禁止】輸出「行蹤不明」或任何系統無法辨識的占位字串，嚴禁描寫「尚未走遠」藕斷絲連，嚴禁自創假地名。★【帶路連動】NPC帶路/同行引導移動時，必須【同時】輸出玩家與該NPC位置變更，禁留人在原地。
3. 戰鬥與歷史：傷害必在 stat_changes 扣減對象「生命」(含NPC)，血<5交由系統，AI禁宣告NPC死亡。前塵歷史皆為已結算之過去，只描寫本回合新結果，禁重演或重複發物扣錢。禁代玩家寄信傳音。
${backLocked
    ? "- 身世：玩家已上鎖，禁止輸出任何身世相關 stat_changes。"
    : "- 身世：僅限入門/開宗/公認稱號等重大因果才輸出，value只需填寫『這次新增的那一段』(單筆≤20字)，後端會自動追加並只保留最近6段，禁日常更新、禁複製貼上舊身世文字。"}

【JSON格式】
1. 嚴格輸出：只輸出合法JSON。options固定4個且順序不可變：[主動]強勢掌握、[被動]委婉試探、[接續]延續互動、[反差]跳脫氛圍，每項20字，禁無中生有資產。new_maps僅純淨模式進入全新場所用。
2. log_summary.tag：預設「閒聊」；本回合若有人許下承諾/邀約才標「承諾」，揭露隱私/陰謀才標「秘密」，死亡/背叛/重傷/結仇等重大轉折才標「變故」，僅符合才升級，日常對話禁亂標。`;

  // 🔴 NSFW(慾海模式)：本回合只專注情慾本身，江湖雜務(物品/銀兩/陣營/任務/招募/地圖/戰鬥數值/境界/身世)
  // 完全不追蹤、不輸出，鐵律文字大幅精簡，盡量交給AI自行判斷。
  const nsfwBaseRules = `你是九州天道演化核心，以日系武俠輕小說筆觸推演因果，強制台灣繁體中文。第一人稱「我」，禁上帝視角。以下為不可違背之天道鐵律：

【敘事與對話】
1. 絕對響應：開頭必以第一人稱完整重現玩家最新動作與台詞，優先承接反轉、否定與突發，禁順預設劇情硬寫。NPC當回合給完整態度，禁懸念。
2. 格式分段：每2~3句必插入 <br><br> 換段。女體用柔嫩/雪白等柔美詞，❌絕對禁止強壯/鋼鐵/肌肉/薄繭/堅硬/厚實等冷硬粗暴詞。
3. 對話格式：角色名：「（動作/神態/眼神/微表情）台詞……（動作/神態/眼神/微表情）台詞（動作/神態/眼神/微表情）」。★每位角色每次說話【至少穿插2次以上】該角色當下的動作、神態、眼神或微表情，【絕對禁止】將動作神態獨立成段、寫在引號外或省略不寫，一律用全形括號「（）」直接嵌入台詞字句的開頭、中間或結尾。名字只標一次、引號只用一層「」，嚴禁重複名字或巢狀引號。開頭禁代名詞(他/她)，必指名道姓。

【世界與NPC自主】
1. 意圖攔截：玩家輸入的動作皆僅為「意圖」，若遇 NPC 阻攔、閃避或玩家實力不濟，天道必須【打斷/中止】，嚴禁玩家言出法隨！背景龍套不收錄至 mentioned_names，該欄僅收真實姓名(無則填[])。
2. 慢熱與傾心：NPC依[個性][氣質][陣營]真實反應。好感未滿80者嚴禁言行表現傾心倒貼，禁用傾心/道侶等極親密詞。rel_changes 的 tag 填【關係定位】四字詞(萍水相逢/點頭之交/漸生情愫/紅顏知己等)，須對應好感高低，禁填當下情緒。

【狀態與輸出】
1. 本回合只專注情慾本身：肢體/感官/姿勢等狀態一律填入 intimacy_feedback，嚴禁另輸出 stat_changes；位置、戰鬥、物品、銀兩、陣營、任務等江湖事務本回合不追蹤、不輸出。
2. 只輸出合法JSON，options固定4個且順序不可變：[主動]強勢掌握、[被動]委婉試探、[接續]延續互動、[反差]跳脫氛圍，每項20字。`;

  const baseRules = isNsfwMode ? nsfwBaseRules : sfwBaseRules;

  // 4. 模式專屬律令 (極致超壓縮版)
  const specificRules = isNsfwMode ? `
【五、慾海律令】
你擅長書寫細膩動人的女女情慾，放手去寫，以下只是少數底線：
1. 【女女柔軟】(核心)純女女之愛，無論誰主導皆是【纏綿體貼、有來有往】，❌禁套用男性陽剛/粗暴模板(掠奪、烙印、宣示主權、長驅直入)，主動方亦是女子，柔中帶情。
2. 近距離直寫視/觸/嗅/聽，全身皆有快感(胸部亦是)，親吻/揉胸/廝磨/愛撫交織，勿困單一部位；台詞被嬌喘打斷，勿一氣呵成。
3. 器官依配對裁決：無陽具填無「肉棒」、無陰道填無「蜜穴」。絕對禁止插入式陽具，以手指/舌/器物替代，嚴禁憑空生出男性器官。
4. physical_state限蜜穴/肉棒/菊穴/右手/左手，其餘進narration。據實填當下肉體狀態，未被碰填無；脫離接觸改寫「鬆開/餘韻」。
5. log_summary：subject填主導方真名、object填承受方真名(三人以上填眾人)，符合實際方向，禁因身分預設主動方；tag預設「閒聊」，唯有實質承諾/秘密/重大轉折才升級標「承諾」/「秘密」/「變故」。
6. 粗暴動作轉為紅印/酥麻/強烈快感，禁肉體破損流血。雙修技巧(2~5字)填入dynamic_skills，貼合身分個性，禁動輒填無。`
    : `
【五、純淨江湖】
1. 武學意境：筆墨集中真氣流轉、兵刃交鋒、身法破風、環境殺氣，嚴禁任何性暗示或情慾描寫。
2. 邊界守護：複數NPC同場時各自依個性獨立判斷，禁擅自無腦聯手圍攻。
3. 因果結算：買情報寫 quests。★【禁止搜屍】：系統並未記錄屍體/戰敗對象身上的實際物品，【絕對禁止】因玩家描述「搜屍/翻找屍體」而憑空輸出 items_transferred 或 items_gained，僅可描寫「搜尋無獲」或對方早已被人捲走財物。懸賞銀兩由底層發放，禁在此輸出銀兩 stat_changes。
4. 任務期限：deadline_days 僅在新任務建立當下可填，且僅限敘事明確暗示急迫性(如限時營救/期限懸賞)才填整數天數，一般任務留空字串代表永不過期；任務一旦建立，期限不可於後續回合更改。`;

  return baseRules + "\n" + specificRules + "\n\n★【輸出範本】\n" + JSON.stringify(finalJson, null, 2);
}

function callGeminiAPI(prompt, systemOverride = null, config = {}) {
  if (!API_KEY) return JSON.stringify({ narration: "未設定 API_KEY", options: ["重試"] });

  if (typeof config === "number") config = { retries: config };
  const modelName = config.model || "google/gemini-3.1-flash-lite";
  const temp = config.temperature !== undefined ? config.temperature : 0.8;
  const topP = config.top_p !== undefined ? config.top_p : 0.95;
  const maxT = config.max_tokens || (config.isNsfwMode ? 2500 : 2000);
  const retries = config.retries || 3;
  let lastErrorMessage = "";

  let lawText = "";
  try {
    const cache = CacheService.getScriptCache();
    const cachedLawText = cache.get("KYUSHU_LAW_TEXT");
    if (cachedLawText !== null) {
      lawText = cachedLawText;
    } else {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const lawSheet = ss.getSheetByName("規矩");
      if (lawSheet) {
        const lawRange = lawSheet.getDataRange().getValues();
        lawText = lawRange.map(row => row[0] ? `【當前主線時局/天道異象】${row[0]}: ${row[1] || ""}` : "").filter(x => x !== "").join("\n");
        if (lawText !== "") cache.put("KYUSHU_LAW_TEXT", lawText, 600);
      }
    }
  } catch (e) { Logger.log("讀取規矩表異常(略過): " + e.message); }

  // 🔴 智能融合：套用大一統系統提示詞
  let systemContent = systemOverride || buildDefaultSystemPrompt(config.isNsfwMode, config.backLocked);

  // 👇 將原本的 if (lawText !== "") 替換成下面這樣：
  if (lawText !== "" && !config.ignoreLaw) {
    systemContent = lawText + "\n\n" + systemContent;
  }

  // 🔴【替換開始】組裝原生多輪 messages 陣列
  let apiMessages = [
    { role: "system", content: systemContent }
  ];

  if (config.chatHistory && Array.isArray(config.chatHistory)) {
    apiMessages = apiMessages.concat(config.chatHistory);
  }

  apiMessages.push({ role: "user", content: prompt || "" });

  const payload = {
    model: modelName,
    messages: apiMessages,
    temperature: temp,
    top_p: topP,
    max_tokens: maxT,
    response_format: { type: "json_object" }
  };
  // 🔴【替換結束】

  const options = {
    method: "post", contentType: "application/json",
    headers: { "Authorization": "Bearer " + API_KEY },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = UrlFetchApp.fetch(MODEL_URL, options);
      const result = JSON.parse(res.getContentText());
      if (result.error) throw new Error(result.error.message || "API 內部錯誤");
      if (result.choices && result.choices.length > 0) {
        let choice = result.choices[0];
        if (choice.finish_reason === "content_filter" || choice.finish_reason === "SAFETY" || (choice.message && !choice.message.content)) {
          throw new Error("Triggered_NSFW_Filter");
        }
        let text = choice.message.content;
        const s = text.indexOf('{');
        const e = text.lastIndexOf('}');
        text = text.substring(s, e + 1);
        JSON.parse(text);
        return text;
      } else { throw new Error("無效的選項結構"); }
    } catch (e) {
      lastErrorMessage = e.message;
      if (i < retries - 1) Utilities.sleep(2000);
    }
  }

  const isBlocked = lastErrorMessage.includes("Triggered_NSFW_Filter") || lastErrorMessage.includes("safety");
  const fallbackNarration = isBlocked
    ? "🌸【天道結界觸發】妳的舉動牽動了天地間最古老的雙修禁制，導致此處天機暫時被屏蔽。"
    : `⚡【天機斷絕】連線失敗：${lastErrorMessage}`;

  return JSON.stringify({
    narration: fallbackNarration, options: ["1. 深吸一口氣，平復真氣", "2. 溫柔地退開半步", "3. 輕聲轉移話題", "4. 稍作歇息"],
    stat_changes: [], rel_changes: [], events: [], items_gained: []
  });
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('九州江湖')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}
