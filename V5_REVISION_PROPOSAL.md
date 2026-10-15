# SUPER INTELLIGENT — V5 視覺修訂提案

**Status: Tasks 1–8 are complete and approved (Tasks 3–4 use the shared autonomous-driving roadblock example). Task 7 received positive direction feedback; its 02:57.455 star-dust-to-rover handoff is clarified by Task 8. Task 9 (03:18.00–03:30.00) continues the same horizon, lights a physical path of breakthroughs, reveals the final question on “what,” and resolves to the supplied circular logo and larger technical wordmark. The 00:00–03:30 continuous preview has passed local visual and audio-sync QA and is ready for user review. Full-film rendering has not started.**

## 一、V5 目標

以 V4 已建立的深黑 3D 粒子空間為美術基礎，集中修正旁白正提出具體因果或限制、但畫面退回抽象光球／泛用連線／靜態符號的段落。每個視覺動作都要能回答「旁白正在講什麼？觀眾此刻應該看懂什麼？」；減少只為科技感而閃爍的裝飾線條。

每次只完成一個任務段落並更新同步預覽頁；使用者確認後才開始下一個場景任務。

V5 的方向不是把使用者提供的 motion-design 參考片整套照搬：**借用它清晰的視覺節奏、強而易讀的動態層級和重點落點，但不複製其 HUD、網格或平面畫布。**核心仍是有前景／中景／遠景、Z 軸視差、明確鏡頭運動和立體粒子體積的 Three.js 場景。

## 二、保留項目與硬性約束

- 保留 3:30 英文旁白與現有音樂，不重錄、不重混；正式輸出仍以既有 WAV 混音作音源。
- 保留 16:9、24 fps、1920×1080 H.264/AAC 規格及使用者提供的圓形 Logo、品牌字和結尾安全留白。
- 保留深黑色 3D 粒子空間、可辨識的前中後景粒子、受控的鏡頭視差和電影感景深；不使用無意義的 HUD／網格，也不把主要分鏡做成平面圖表。
- 保留 V4 已較清楚的決策樹、Text/Image/Video 輸入符號、四步學習迴圈、四種算力資源及互相依賴的能力模組；改善其節拍、因果訊息與轉場，不因追求「更多元素」而重畫全部內容。
- 視覺先以確定性 Three.js/WebGL 製作；不預設使用生成式圖片或影片。**目前提案不需要模型生成點數**；主要成本是本機瀏覽器逐格算圖時間。

## 三、按旁白時間的修訂分鏡

| 時間 | 旁白／要傳達的意思 | V5 畫面及動作 | 鏡頭／轉場與需避免的問題 |
|---|---|---|---|
| **00:00–00:10** | AI 已能寫程式、解複雜問題、處理大量資訊。 | 同一批空間粒子依序形成三個短促、容易辨認的微場景：程式符號被整理成可執行序列；一個多分支難題沿正確路徑解開；混亂資料流被分揀成有序群組。三段共享同一粒子材質和空間，避免像互不相干的貼圖輪播。 | 每個概念約 1.5–2 秒，鏡頭穿越粒子場，近景粒子有較明顯視差；場景退成背景網路，順勢接上主問題。避免用抽象光球代表全部三種能力。 |
| **00:10–00:22** | “How far can this go?”；智能持續擴展；“Why haven’t we reached AGI?” | 旁白說到 **“How far can this go?”** 時，`HOW FAR CAN INTELLIGENCE GO?` 以大字在畫面中央分層顯現，背景粒子沿深度向鏡頭擴張；“keeps scaling” 時作連續推近／放大。到 AGI 問句時，粒子場向外散開，舊白字先拆散退場，再單獨出現紅色發光問題。 | 兩個問題不重疊；字卡開始點跟隨語音，不提前搶台。由散粒子的方向和速度銜接下一段決策樹，避免到 22 秒突然跳出全新的線框。 |
| **00:22.2–00:50.76** | 有答案不等於可靠推理；一個錯誤能讓後續結論失效；需在新案例維持一致。 | 承接前段散開的粒子，在**同一畫布、鏡頭和星場**中逐層重組成決策樹；訊號沿節點實際移動。先表達多步依賴，再讓一個錯誤中間節點亮紅並污染下游；陌生測例進入後，三個新輸入重複走過一條成功路徑，呈現「可靠＝跨新問題維持一致」。句尾樹體散成粒子，留下下一段可延續的空間狀態。 | 轉場交接開場輸出的真實粒子位置、顏色、星場及鏡頭狀態，不硬切新雲或遠近視角；節點持續傳訊號並保留構圖安全邊距。末段先收束文字／訊號，再讓整棵樹分散。 |
| **00:50.76–01:22** | AI能從文字、影像、影片學模式，但認出模式不等於理解原因；在陌生情境需預測後果、考慮隱藏變數，並在現實推翻預期時更新。 | 以立體城市道路作唯一案例：道路封閉報告、行車影像及即時影片匯入同一車程；AI先辨識「道路封閉」，再框出示威人群和排隊車流以顯示成因。預測時A 0%、B 63%、C 37%（A封鎖紅、B最佳綠、C次佳黃）；示威擴散封住B後，重新計算A 0%、B 0%、C 100%，車輛短距離轉入C。 | Task3與Task4共用相同城市、車輛、示威和封路位置。道路候選線沿實際街道中心並浮在路面上方；街廓退離車道，路口採分離的四向斑馬線。辨識框轉色後由城市外側戰術HUD引線標註目標，並在機率面板進場前退場。三條互斥路線的機率每組合計100%；封鎖狀態優先顯示紅色。 |
| **01:22–01:50** | 人類會提問、做實驗、從失敗學習和改變想法；AI可做部分步驟，但長期可靠學習、決定下一步查什麼和自行修錯仍是挑戰。 | 同一車輛沿Task3末段Route C續行至目的地。之後明確開始新一趟行程，顯示A 88%、B 0%、C 12%（A綠、B封鎖紅、C黃），並沿Route A由起點行至目的地；示威移動、路線狀態與機率更新同步發生。長期學習以不同車程的預測／實際結果紀錄呈現，結尾保留尚未解決的新路況。 | 保持同一城市及機率語意；封鎖路線即使排名變化仍保持紅色，互斥機率合計100%。車輛沿連續道路曲線行駛、不倒退跳位，並在跨行程紀錄出現前抵達終點；旅行切換以明確的 `TRIP 03 · START → DESTINATION · ROUTE A` 標記說明。 |
| **01:50–02:20** | 智能擴展需要晶片／計算、能源、資料和時間；規模增加不保證通用或可靠智能；品質有成本。 | 保留四種可辨識資源輸入匯入模型，但讓它們的作用看得見：計算節點忙碌、能量流逐漸下降、資料樣本被使用、時間環走過。更大的資源流產生更多輸出，卻在陌生測試中失敗，直接呈現「規模 ≠ 保證」。只有旁白提出可靠度與成本取捨時，才讓兩條輸出／成本尺度並排出現。 | 資源輸入到模型的連線加粗，關鍵箭頭需能在 1080p 清楚看見；標籤和圖示留在標題安全區內。避免靜態四角標籤、過幼線條、成本條在旁白尚未談成本前提早出現。 |
| **02:20.4–02:44.35** | “Perhaps there is no single barrier to AGI”; multiple advances work together; current approaches may be missing something fundamental; it remains unknown which capability will matter or when. | Preserve all four capability shapes as they dim after “no single barrier.” At “many advances,” activate them one at a time without clearing/rebuilding them; each activation lights a dedicated tether and sends a moving pulse into the central AI Model. During “missing something fundamental,” accelerate the four modules around the center and pull them into a collision, then burst their deterministic particles outward. At “which capabilities / when,” reform the same particles into a rotating blue 3D brain hologram, with the unknown questions above; hold the final question through the following instrumental bridge before the next narration begins. | Continue from Task 5’s real server-room particle/camera handoff. Keep modules larger and spaced apart before the orbit; fade labels before they overlap. Time the collision near 02:36–02:37 and complete the brain silhouette around 02:38. Use a seeded point cloud sampled from the credited CC BY 4.0 GLB embedded by the user-provided `sample-3d/brain.html`. Preview runs 140.38–164.35 s to retain the spoken tail. |
| **02:44.35–03:00.70** | 前一句「which capabilities…or when they will arrive」在02:44.22結束；純音樂橋段到下一首配樂於**02:57.455**切入；下一句 “AGI may not require a machine that knows everything” 約於**03:00.70**開始。 | Task6的腦部全息保留開場後慢慢放大；鏡頭穿入腦部，近景粒子變成太空星塵，切成第一身太空船視角高速向前飛、左右轉向及翻滾。新配樂切入時，同一批星塵開始聚合，先形成一部小型探索機器，再顯出前方陌生障礙與可分岔路徑，作為下一幕開端，不加無旁白字幕。 | 第一格精確沿用Task6末格Brain粒子／相機；先讓Brain完全充滿16:9畫面，再只看見粒子星塵。星軌只作短小獨立拖影，不互相亂連。聚合起點鎖在原混音比對出的177.455秒，於180.70秒下一句開始時保留清楚的Task8場景雛形與輸出粒子狀態。 |
| **03:00.70–03:18.00** | “AGI may not require a machine that knows everything. It may require a system that can learn, reason, and adapt across an extraordinary range of unfamiliar situations. The destination remains uncertain.” | 從Task7星塵聚成的機器開始，鏡頭揭示一輛有六個獨立輪組、懸吊、雙眼相機和感測桅杆的**野外探測車**。它掃描擋路岩石、記錄障礙並把直行失敗路徑標紅（learn）；並排顯示撞岩直線、陡坡路與綠色安全繞行路（reason）；選路後以獨立輪組上下伸縮並在新裂溝前重新改道（adapt）。鏡頭跟車穿越岩石、橫向裂溝及窄門三種具體陌生地形；最後車輛到達未勘測地平線，路徑在霧中中止並出現“DESTINATION UNCERTAIN”。 | Task7最後相機、星場、點雲與機器／路面物件直接複製到Task8開場，先看見同一輛小車，再在首秒逐步揭示其六輪探測車結構。learn/reason/adapt三個字分別貼合逐字時間碼（03:07.86、03:08.80、03:09.86）；不使用抽象神經網路代替適應過程，不讓多條路線遮住車輛或物理路面。Task8於03:18.00收束，下一句“but every breakthrough”保留給Task9。 |
| **03:18–03:30** | “but every breakthrough brings us closer to understanding what intelligence really requires.” 乾聲相對混音偏移約180.005秒：**but 03:18.465**；**what 03:22.085**；**requires 03:24.345**結束。 | Task8最後的車、地平線與相機姿態原樣延續。說到“but/every/breakthrough”時，前方一段實體路徑上的平台逐一亮起；“brings us closer”時鏡頭沿路推進，粒子流向遠方的圓形目標環。到“what intelligence really requires”時，清楚呈現兩行大字 **WHAT DOES INTELLIGENCE / REALLY REQUIRE?**。旁白結束後，沿用原始圓形Logo圖像（以圓形alpha遮罩呈現）、旋轉光環、大字科技感 **SUPER INTELLIGENT** 及標語 `Imagine Beyond Tomorrow.`；保留最後數秒停留。 | Task8→Task9用最後地形／車輛／星場及相機狀態做真實物件handoff，不硬切。標題按“what”的詞級時點進場，與Logo分開呈現；品牌字在Logo清晰後才亮起，元素置於16:9安全區，最後畫面留足閱讀時間。片尾音軌保留原混音直到03:30。 |

## 四、全片動畫與可讀性規則

1. **一個主訊息、一個主焦點：**同一拍不要同時出現兩個標題或兩組解釋型圖表；次要粒子只做空間、方向或尺度提示。
2. **讓因果可見：**若旁白說錯誤、預測、成本或學習，畫面必須顯示是哪個輸入、哪條路徑、哪個結果改變，而不只加文字標籤。
3. **真正的 3D 線索：**每段至少保留可讀的前／中／遠景深度、適量視差和有理由的鏡頭位移；線條連接物件而非滿屏隨機閃爍。文字保持在面向鏡頭的清晰層，不為 3D 效果犧牲易讀性。
4. **粗細與安全區：**關鍵路徑使用能在 1080p 辨認的較粗線／亮度階層；細節線只作次級裝飾。字卡置於約 8% 內縮的安全區，避免下緣和左右裁切。
5. **明確交接：**每次換概念先讓舊物件退場，再以其粒子／運動方向構成下一幕；不讓下幕在舊幕仍佔視線中心時突然出現。
6. **標題跟詞走：**標題在旁白實際提出該問題或關鍵詞時進場，留出可讀停留，不跨句與下一個問題混疊。

## 五、製作／審核流程與通過標準

### Gate 1 — 鎖定節拍與離線測試

- 按逐字旁白時間確認所有入場點、標題時點、場景退場點和停留長度。
- 在分支版本建立獨立的 `v5-preview.html` 與 V5 場景模組；保留 V4 預覽頁與成片，不覆蓋。
- 先用 GitHub Pages 同步播放器作互動審片入口，透過拖曳時間軸檢查旁白對位；需要看真實像素品質時，再輸出短段 720p MP4，不先算全片。

### Gate 2 — 分段連續預覽

1. **00:00–01:22：**開場、粒子重組決策樹、模式到因果預測；Task3/4採同一自動駕駛城市案例，已通過使用者確認。
2. **01:22–01:50：**Task4沿Route C接續同一車程；確認辨識框、示威移動後重算／改選Route A及跨行程記錄易理解並有足夠停留。
3. **01:50–02:20：**算力成本與規模限制；Task5已通過使用者審閱。
4. **02:20.4–02:44.35:** Task 6 capability activation, central collision/burst, and rotating brain hologram; approved.
5. **02:44.35–03:00.70:** Task 7 cinematic brain-to-star-dust flight and particle handoff at the 02:57.455 music cue; positive direction feedback received, and its rover identity is clarified by Task 8.
6. **03:00.70–03:18.00:** Task 8 complete six-wheel field-rover scene (learn/reason/adapt, unfamiliar terrain, uncertain horizon); local visual/audio-sync QA complete, awaiting user review.
7. **03:18.00–03:30.00:** Task 9 horizon-to-breakthrough path, final question, and circular-logo brand lock-up; local visual/audio-sync QA complete, awaiting user review.

每段以現有旁白／音樂作同一主時鐘；通過該段後才進到下一段的精修。互動預覽仍不是交付母帶，最終才用 Puppeteer/Three.js 逐格算圖並 FFmpeg 封裝。

### Gate 3 — 全片輸出與 QC

- 只在全部分段畫面獲確認後，算圖 1920×1080、24 fps 的 5,040 格全片視覺母帶，再封裝既有 WAV 混音。
- 全片檢查：旁白重點都有相符的畫面動作；沒有舊／新場景殘留重疊；標題、Logo、底部標籤均在安全區；音畫同步；影片可完整解碼。
- 產出獨立版本 `V5`，保留 V4 回退，不以有互動控制項的網頁截圖作成片影格。

## 六、目前不包含的工作

- 不更改英文旁白或重新生成旁白／配樂。
- 不將使用者提供的 motion-design 參考片直接複製成 HUD、平面網格或版型。
- 不先生成一條完整 3:30 MP4；先用同步網頁和分段預覽降低等待與反覆算圖成本。
- 其餘任務仍遵循分段審核：目前00:00–03:30.00的連續預覽已包含Task9片尾；獲使用者確認後才進入整段V5全片QC與逐格算圖。

---

**提案基礎：**V4 旁白—畫面審查與修訂計畫、既有逐字稿時間碼、已確認的深黑 3D 粒子畫布偏好，以及前段預覽對因果畫面／空間感的回饋。
