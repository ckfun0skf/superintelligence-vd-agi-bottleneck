# SUPER INTELLIGENT — AGI Bottleneck

V4 的確定性 Three.js/WebGL 動態紀錄片與 GitHub Pages 互動預覽播放器。

## 線上預覽

GitHub Pages：<https://ckfun0skf.github.io/superintelligence-vd-agi-bottleneck/>

播放器以 `assets/audio/final_mix.mp3` 的媒體時間作為主時鐘，因此拖曳、暫停、倍速及播放進度都會同步驅動畫面。首次播放請按 **Play**（瀏覽器要求使用者操作後才能播放聲音）。

- 播放／暫停：按鈕或 `Space`
- 拖曳時間軸：跳轉至指定時間，畫面與音訊一起定位
- 倍速：循環切換 0.5×、1×、1.5×、2×
- 章節按鈕：跳轉至對應章節
- `H`：顯示／隱藏控制面板

## 本機執行

靜態 ES modules 需要透過 HTTP 提供（不要直接以 `file://` 開啟）：

```bash
python3 -m http.server 8000
```

然後開啟 <http://localhost:8000/>。Three.js 由 import map 指定的 CDN 載入；音訊與 Logo 由此 repo 提供。

## 專案內容

- `index.html` — 16:9 預覽播放器、時間軸、章節跳轉及同步音軌
- `src/v4_particle_documentary.js` — V4 Three.js 場景與以音訊媒體時鐘驅動的即時播放
- `assets/audio/` — 完整混音（MP3 播放版及 WAV 無損母檔）、七段分軌旁白及兩段配樂
- `render_v4.js` — Puppeteer／Chromium 逐格算圖工具
- `render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4` — 最終成片規格記錄於 `V4_DELIVERY_NOTES.md`；大型成片未放入 repo

音訊資產清單及來源格式見 [`assets/audio/README.md`](assets/audio/README.md)。
