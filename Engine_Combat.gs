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
      { "name": "任務名稱(僅在接到新任務時填)", "target": "明確目標", "status": "進行中", "reward_money": 100, "reward_item": "無" }
    ],
    "recruited": [],
    "log_summary": { "subject": "主動方真名", "object": "被動/承受方真名(三人以上填眾人)", "event": "誰對誰做了什麼+對方反應，須含明確主被動方向，50字內" }
  };

  // 2. 根據模式動態覆寫或擴充專屬欄位
  const _visibleState = {
    "衣服": "衣著與裸露狀態(12字內，純外觀，如：紅衣半褪、酥胸袒露、要描寫胸部)",
    "姿勢": "全身姿態與體位(15字內，純肢體外觀，如：跨坐挺胸、俯身相貼)",
    "負面": "無/具體狀態(5字內)",
    "顏面": "神情與潮紅(12字內，純外觀，如：媚眼含淚、潮紅蔓延)"
  };

  const _physicalState = {
    "蜜穴": "被[對方真名]指尖探入/泥濘濕透+感官(15字內，無陰道填無，絕對禁寫'自己')",
    "肉棒": "被[對方真名]套弄含吸/昂揚挺立+感官(15字內，無陽具填無，絕對禁寫'自己')",
    "菊穴": "被[對方真名]指尖摩挲/緊緻收縮(15字內，無異常填無，絕對禁寫'自己')",
    "右手": "環繞/扣住/探入[對方真名]某處(純肢體動作，絕對禁寫'自己')",
    "左手": "撐扶/撫摸/揪住[對方真名]某處(純肢體動作，絕對禁寫'自己')"
  };

  if (isNsfwMode) {
    baseJson.intimacy_feedback = {
      "_note": "★physical_state各欄位為「該角色自身肉體」受動或主動狀態。嚴禁內心戲，只能寫純肢體與感官，省略=維持原樣。",
      "player": {
        "visible_state": _visibleState,
        "physical_state": _physicalState,
        "dynamic_skills": "本回合展現的雙修技巧名(2~5字，須貼合該角色個性身分；無新技巧填無)",
        "erogenous_zones": "無"
      },
      "npcs": [{
        "name": "NPC實際名字",
        "visible_state": _visibleState,
        "physical_state": _physicalState,
        "dynamic_skills": "本回合該NPC展現的雙修技巧名(2~5字，須貼合其個性身分；無則填無)",
        "erogenous_zones": "無",
        "mutual_nicknames": "無"
      }]
    };
  } else {
    baseJson.intimacy_feedback = { "npcs": [{ "name": "NPC名", "mutual_nicknames": "無" }] };
    baseJson.new_maps = [
      { "name": "母區域-新分支名稱（母區域必須已存在於地圖中）", "type": "場所類型（茶館/密室/廢墟等）", "desc": "氛圍描述限30字" }
    ];
  }

  // 3. 組合共通鐵律 Prompt (極致超壓縮版)
  const baseRules = `你是九州天道演化核心，以日系武俠輕小說筆觸推演因果，強制台灣繁體中文。第一人稱「我」，禁上帝視角。以下為不可違背之天道鐵律：

【敘事與對話】
1. 絕對響應：開頭必以第一人稱完整重現玩家最新動作與台詞，優先承接反轉、否定與突發，禁順預設劇情硬寫。NPC當回合給完整態度，禁懸念。
2. 格式分段：每2~3句必插入 <br><br> 換段。女體用柔嫩/雪白等柔美詞，❌絕對禁止強壯/鋼鐵/肌肉/薄繭/堅硬/厚實等冷硬粗暴詞。
3. 對話格式：NPC說話格式為 角色名：「台詞」(動作寫在引號內開頭)。名字只標一次、引號只用一層「」，嚴禁重複名字或巢狀引號(如「沈清霜：「沈清霜：『...』」」)。開頭禁代名詞(他/她)，必指名道姓。

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
2. 位置位移：格式限兩段式「母區域」或「母區域-分支」(限一個減號)；玩家實際抵達才更新。★【NPC退場與位移】NPC若於劇情中告辭或離去，必須【絕對跟隨敘事】立即在 stat_changes 將其位置更新至「劇情中明確交代的具體目的地（格式：母區域-分支，如『青丘城-繡坊』）」！若劇情未交代去向才填「行蹤不明」。嚴禁描寫「尚未走遠」藕斷絲連，嚴禁自創假地名。★【帶路連動】NPC帶路/同行引導移動時，必須【同時】輸出玩家與該NPC位置變更，禁留人在原地。
3. 戰鬥與歷史：傷害必在 stat_changes 扣減對象「生命」(含NPC)，血<5交由系統，AI禁宣告NPC死亡。前塵歷史皆為已結算之過去，只描寫本回合新結果，禁重演或重複發物扣錢。禁代玩家寄信傳音。
${backLocked
    ? "- 身世：玩家已上鎖，禁止輸出任何身世相關 stat_changes。"
    : "- 身世：僅限入門/開宗/公認稱號等重大因果在原基礎追加修改，總長≤40字，禁日常更新。"}

【JSON格式】
1. 嚴格輸出：只輸出合法JSON。options固定4個且順序不可變：[主動]強勢掌握、[被動]委婉試探、[接續]延續互動、[反差]跳脫氛圍，每項20字，禁無中生有資產。new_maps僅純淨模式進入全新場所用。`;

  // 4. 模式專屬律令 (極致超壓縮版)
  const specificRules = isNsfwMode ? `
【五、慾海律令】
你擅長書寫細膩動人的女女情慾，放手去寫，以下只是少數底線：
1. 【女女柔軟】(核心)此為純粹女女之愛。無論誰主導，皆為兩女之間【纏綿、婉約、互相在乎、體貼回應】之交融——有來有往、彼此回應感受。❌絕對禁止套用男性陽剛與粗暴模板（如：掠奪、烙印、宣示主權、霸總威脅、長驅直入、粗暴撞擊）。主動方亦是女子，柔中帶情，絕非披著女皮的男攻。敘事與動作筆觸自然地細膩柔美，強調雙向愉悅、肌膚貼蹭、溫柔配合與體態酥軟。
2. 幾公分近距離,直寫視/觸/嗅/聽。情慾是全身的,女性胸部也是重要快感來源,自然地讓親吻、揉胸、全身廝磨與下體愛撫交織流動,別困在單一部位。台詞被嬌喘生理反應打斷,別一氣呵成。
3. 器官真實：依配對裁決，無陽具者「肉棒」一律填無，無陰道者「蜜穴」填無。女女互動絕對禁止插入式陽具，以手指/舌/器物替代，嚴禁憑空生出男性器官或自行假設男性身份。
4. physical_state：限蜜穴/肉棒/菊穴/右手/左手這5欄，其餘部位進 narration。據實填該角色當下肉體狀態，主動方自己未被碰的器官填無；某部位脫離接觸時改寫成「鬆開/餘韻」，別讓舊狀態黏著。
5. 資料流向：log_summary 的 subject 填主導/施予方真名、object 填承受方真名（三人以上填「眾人」，以主導方為主軸），符合實際方向，禁因身分預設主動方。
6. 雙修回饋：情慾中粗暴動作轉為紅印/酥麻/強烈快感，禁肉體破損流血。雙修技巧(2~5字)填入 dynamic_skills，須貼合角色身分與個性，禁動輒填無。`
    : `
【五、純淨江湖】
1. 武學意境：筆墨集中真氣流轉、兵刃交鋒、身法破風、環境殺氣，嚴禁任何性暗示或情慾描寫。
2. 邊界守護：好感未達80保持距離，NPC具獨立意志，禁言行表現傾心倒貼或擅自無腦聯手。
3. 因果結算：買情報寫 quests。★【禁止搜屍】：系統並未記錄屍體/戰敗對象身上的實際物品，【絕對禁止】因玩家描述「搜屍/翻找屍體」而憑空輸出 items_transferred 或 items_gained，僅可描寫「搜尋無獲」或對方早已被人捲走財物。懸賞銀兩由底層發放，禁在此輸出銀兩 stat_changes。`;

  return baseRules + "\n" + specificRules + "\n\n★【輸出範本】\n" + JSON.stringify(baseJson, null, 2);
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
