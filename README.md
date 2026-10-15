# SUPER INTELLIGENT — AGI Bottleneck

V4 的確定性 Three.js/WebGL 動態紀錄片與音畫同步互動預覽；V5 延用同一風格，以單頁播放器逐段審核並保持場景連續。

## 預覽

- [V4 全片互動預覽](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/)
- [V5 連續預覽：任務1至6（00:00–02:44.35）](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/v5-preview.html)

V5 單頁使用原旁白／配樂作音訊主時鐘，同步畫面；控制列、時間軸及細分章節均位於畫布下方。無需先輸出 MP4 即可聽看、拖曳及逐段檢查。V4 原有預覽與成片保留不變。

V4 全片播放器使用 `assets/audio/final_mix.mp3` 作主時鐘。播放／暫停、時間軸拖曳、倍速及章節跳轉都會同步音訊與畫面；章節列可收合但主要控制仍保留。首次播放請按 **播放**（瀏覽器要求使用者操作後才能播放聲音）。

## 本機預覽

靜態 ES modules 需透過 HTTP 提供（不要直接以 `file://` 開啟）：

```bash
python3 -m http.server 8000
```

然後開啟 <http://localhost:8000/>。V4 頁從指定 CDN 載入 Three.js；V5 頁使用 repo 內固定版本的 Three.js。兩頁的旁白音訊及品牌 Logo 素材都放在 repo 中。

## 本機算圖／最終封裝

完整 FFmpeg 算圖、H.264 編碼、WAV 音軌封裝和 QC 教學見 [`FFMPEG_RENDER_GUIDE.md`](FFMPEG_RENDER_GUIDE.md)。

## V5 連續審核

V5 使用**單一互動預覽頁與連續旁白時間軸**；目前整合00:00–02:44.35，使用同一個WebGL canvas及連續音軌播放。Task1／2以粒子與鏡頭狀態交接；Task3／4直接延續同一座城市、同一輛車與路線選擇；Task5將學習迴圈擴展成機房與資源成本；Task6保留四個具體能力模組，於「多項進展」時逐項啟動並向中心AI Model送訊號，接著加速環繞、碰撞爆散，再重組成自轉的人腦3D全息粒子模型。Brain點雲由repo內的CC BY 4.0範例模型確定性烘焙；來源與重現方式見 [`assets/models/README.md`](assets/models/README.md) 和 [`tools/extract_v5_brain_points.py`](tools/extract_v5_brain_points.py)。完整分鏡、3D視覺方向、轉場規則與審核關卡見 [`V5_REVISION_PROPOSAL.md`](V5_REVISION_PROPOSAL.md)。

## 專案內容

- `index.html` — V4 16:9 畫布與其下方的播放器、時間軸、章節跳轉及同步音軌；提供V5預覽入口
- `v5-preview.html` — 唯一V5互動預覽頁，單一音軌／時間軸涵蓋00:00–02:44.35，章節控制位於畫布下方
- `src/v5_continuous_preview.js` — 單一renderer及跨場景粒子／相機handoff總控
- `src/v4_particle_documentary.js` — 保留的 V4 Three.js 全片場景
- `src/v5_opening_preview.js` — V5 第一任務的可重現 3D 開場場景與即時播放器同步
- `src/v5_reasoning_preview.js` — V5 第二任務的 3D 決策樹、訊號傳遞及錯誤傳播場景
- `src/v5_patterns_preview.js` — V5 第三任務的自動駕駛感知、封路成因、三路線機率預測及失配更新場景
- `src/v5_learning_loop_preview.js` — V5 第四任務延續同一車程，使用Cyber掃描框、目標標籤、路線重算及跨行程記錄
- `src/v5_compute_cost_preview.js` — V5 第五任務以立體計算網絡呈現晶片、能源、資料、時間及規模不保證通用智能
- `src/v5_capability_system_preview.js` — V5 Task 6: sequentially activate four capability modules, send signals into the AI model, then collide, burst into particles, and reform as a rotating brain hologram
- `assets/models/v5_brain_surface_points.bin` — deterministic 4,600-point brain surface sampled from the credited CC BY 4.0 source model
- `tools/extract_v5_brain_points.py` — reproducible, fixed-seed brain-mesh-to-particle asset generator
- `src/v5_autodrive_world.js` — Task3／4共用城市道路、示威封路、立體車輛、檢測框與路線機率HUD
- `assets/audio/v5_continuous_preview_01_50_00.mp3` — 前一版連續V5預覽音軌（00:00–01:50.00，已由2:20版取代）
- `assets/audio/v5_continuous_preview_02_20_00.mp3` — 從原始無損混音裁出的Task5連續預覽音軌（00:00–02:20.00）
- `assets/audio/v5_continuous_preview_02_44_35.mp3` — 從原始無損混音裁出的Task6連續預覽音軌（00:00–02:44.35）
- `assets/vendor/three.module.js`、`three.core.js` — V5 頁使用的 Three.js 0.186.1 固定版本及其模組相依檔
- `assets/audio/` — 完整混音（MP3播放版及WAV無損母檔）、七段分軌旁白及兩段配樂
- `render_v4.js` — Puppeteer／Chromium 逐格算圖工具；離線算圖時隱藏網頁控制列
- `render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4` — 最終成片規格記錄於 `V4_DELIVERY_NOTES.md`；大型成片未放入repo

音訊資產清單及來源格式見 [`assets/audio/README.md`](assets/audio/README.md)。**任務1至5已完成目前修訂且Task5已獲確認；Task6涵蓋02:20.4–02:44.35，新版畫面已完成本機逐格與章節音畫同步驗收，現待使用者審閱。**Task7待Task6通過後再開始。
