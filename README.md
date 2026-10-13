# SUPER INTELLIGENT — AGI Bottleneck

V4 的確定性 Three.js/WebGL 動態紀錄片與音畫同步互動預覽；V5 延用同一風格，以單頁播放器逐段審核並保持場景連續。

## 預覽

- [V4 全片互動預覽](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/)
- [V5 連續預覽：開場＋推理（00:00–00:50.76）](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/v5-preview.html)

V5 單頁使用原旁白／配樂作音訊主時鐘，同步畫面；控制列、時間軸及細分章節均位於畫布下方。無需先輸出 MP4 即可聽看、拖曳及逐段檢查。V4 原有預覽與成片保留不變。

V4 全片播放器使用 `assets/audio/final_mix.mp3` 作主時鐘。播放／暫停、時間軸拖曳、倍速及章節跳轉都會同步音訊與畫面；章節列可收合但主要控制仍保留。首次播放請按 **播放**（瀏覽器要求使用者操作後才能播放聲音）。

## 本機預覽

靜態 ES modules 需透過 HTTP 提供（不要直接以 `file://` 開啟）：

```bash
python3 -m http.server 8000
```

然後開啟 <http://localhost:8000/>。V4 頁從指定 CDN 載入 Three.js；V5 開場頁使用 repo 內固定版本的 Three.js。兩頁的旁白音訊及品牌 Logo 素材都放在 repo 中。

## 本機算圖／最終封裝

完整 FFmpeg 算圖、H.264 編碼、WAV 音軌封裝和 QC 教學見 [`FFMPEG_RENDER_GUIDE.md`](FFMPEG_RENDER_GUIDE.md)。

## V5 連續審核

V5 使用**單一互動預覽頁與連續旁白時間軸**；目前已整合開場及推理（00:00–00:50.76），用同一個WebGL canvas及同一條音軌播放，開場粒子直接重組成決策樹。下一段模式辨識旁白由00:50.76開始，尚待製作。已核准的完整分鏡、3D視覺方向、轉場規則與審核關卡見 [`V5_REVISION_PROPOSAL.md`](V5_REVISION_PROPOSAL.md)。

## 專案內容

- `index.html` — V4 16:9 畫布與其下方的播放器、時間軸、章節跳轉及同步音軌；提供V5預覽入口
- `v5-preview.html` — 唯一V5互動預覽頁，單一音軌／時間軸涵蓋00:00–00:50.76，章節控制位於畫布下方
- `src/v5_continuous_preview.js` — 單一renderer及跨場景粒子／相機handoff總控
- `src/v4_particle_documentary.js` — 保留的 V4 Three.js 全片場景
- `src/v5_opening_preview.js` — V5 第一任務的可重現 3D 開場場景與即時播放器同步
- `src/v5_reasoning_preview.js` — V5 第二任務的 3D 決策樹、訊號傳遞及錯誤傳播場景
- `assets/audio/v5_continuous_preview_00_50_76.mp3` — 從原始無損混音裁出的連續V5預覽音軌（00:00–00:50.76）
- `assets/vendor/three.module.js`、`three.core.js` — V5 頁使用的 Three.js 0.186.1 固定版本及其模組相依檔
- `assets/audio/` — 完整混音（MP3 播放版及 WAV 無損母檔）、七段分軌旁白及兩段配樂
- `render_v4.js` — Puppeteer／Chromium 逐格算圖工具；離線算圖時隱藏網頁控制列
- `render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4` — 最終成片規格記錄於 `V4_DELIVERY_NOTES.md`；大型成片未放入 repo

音訊資產清單及來源格式見 [`assets/audio/README.md`](assets/audio/README.md)。**任務1已通過審閱；任務2已延伸至完整旁白句尾並與任務1合併，現於單頁預覽中待審閱。**後續段落逐次確認再製作。
