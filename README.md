# SUPER INTELLIGENT — AGI Bottleneck

V4 的確定性 Three.js/WebGL 動態紀錄片與音畫同步互動預覽；V5 以場景為單位逐段審核。

## 預覽

- [V4 全片互動預覽](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/)
- [V5 任務 1：開場與核心問題（00:00–00:22.2）](https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/v5-preview.html)

V5 開場頁使用該 22.2 秒的原旁白／配樂片段，透過音訊媒體時間同步畫面；控制列、時間軸及細分章節均位於畫布下方。無需先輸出 MP4 即可聽看、拖曳及逐段檢查。V4 原有預覽與成片保留不變。

V4 全片播放器使用 `assets/audio/final_mix.mp3` 作主時鐘。播放／暫停、時間軸拖曳、倍速及章節跳轉都會同步音訊與畫面；章節列可收合但主要控制仍保留。首次播放請按 **播放**（瀏覽器要求使用者操作後才能播放聲音）。

## 本機預覽

靜態 ES modules 需透過 HTTP 提供（不要直接以 `file://` 開啟）：

```bash
python3 -m http.server 8000
```

然後開啟 <http://localhost:8000/>。V4 頁從指定 CDN 載入 Three.js；V5 開場頁使用 repo 內固定版本的 Three.js。兩頁的旁白音訊及品牌 Logo 素材都放在 repo 中。

## 本機算圖／最終封裝

完整 FFmpeg 算圖、H.264 編碼、WAV 音軌封裝和 QC 教學見 [`FFMPEG_RENDER_GUIDE.md`](FFMPEG_RENDER_GUIDE.md)。

## V5 分段審核

V5 按 8 個敘事場景逐次實作、部署及審核。任務 1（00:00–00:22.2）預覽已完成並等待審閱；其餘場景保持未修改。已核准的完整分鏡、3D視覺方向、轉場規則與審核關卡見 [`V5_REVISION_PROPOSAL.md`](V5_REVISION_PROPOSAL.md)。

## 專案內容

- `index.html` — V4 16:9 畫布與其下方的播放器、時間軸、章節跳轉及同步音軌；提供V5預覽入口
- `v5-preview.html` — V5 任務1互動頁面，包含00:00–00:22.2旁白同步、時間軸及事件章節
- `src/v4_particle_documentary.js` — 保留的 V4 Three.js 全片場景
- `src/v5_opening_preview.js` — V5 第一任務的可重現 3D 開場場景與即時播放器同步
- `assets/audio/v5_task01_opening_00_22.mp3` — 從原始混音無損母檔裁出的V5開場預覽音軌
- `assets/vendor/three.module.js`、`three.core.js` — V5 頁使用的 Three.js 0.186.1 固定版本及其模組相依檔
- `assets/audio/` — 完整混音（MP3 播放版及 WAV 無損母檔）、七段分軌旁白及兩段配樂
- `render_v4.js` — Puppeteer／Chromium 逐格算圖工具；離線算圖時隱藏網頁控制列
- `render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4` — 最終成片規格記錄於 `V4_DELIVERY_NOTES.md`；大型成片未放入 repo

音訊資產清單及來源格式見 [`assets/audio/README.md`](assets/audio/README.md)。V5依序修改，**目前只有任務1開場預覽**；待使用者審閱後，每段逐次確認再進行下一段。
