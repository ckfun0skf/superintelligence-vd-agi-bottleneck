# 以 Three.js + Puppeteer + FFmpeg 輸出影片

本指南說明這個 repo 的 V4 影片如何從確定性的 Three.js 場景製作成 MP4：瀏覽器逐格更新場景並輸出 JPEG，FFmpeg 將影格串流編碼成無聲 H.264 母帶，再將原始 WAV 混音封裝成 AAC 音軌。畫面算圖與音訊混合是兩個明確步驟，方便先檢查視覺，再完成最終成片。

> `render_v4.js` 會把播放器控制項隱藏並將畫布固定為 1920×1080，因此播放按鈕、時間軸和章節按鈕不會烙印進影片。

## 1. 影片規格與素材

- 解析度：1920×1080（16:9）
- 幀率：24 fps
- 長度：210 秒（3:30）
- 總影格數：24 × 210 = **5,040 格**，影格編號 0–5,039
- 視覺：`src/v4_particle_documentary.js` 的 Three.js 場景
- 無損最終混音：`assets/audio/final_mix_source.wav`
- 網頁預覽用混音：`assets/audio/final_mix.mp3`

場景提供 `window.renderFrame(frame)`。函式依影格編號設定動畫時間 `frame / 24`，更新粒子、物件、相機、標題，再呼叫 WebGL renderer。算圖不依賴即時播放時鐘；同一個 frame 輸入會得到同一個場景狀態。

## 2. 安裝需求

建議環境：Node.js 22.12 或以上、可執行 WebGL 的 Chromium/Chrome、FFmpeg（含 ffprobe）及網絡連線（頁面透過 import map 從 unpkg 載入 Three.js 0.186.1）。Ubuntu 的 Chromium 預設位置是 `/usr/bin/chromium`。

在 repo 根目錄安裝 Puppeteer 的鎖定版本：

```bash
npm init -y                 # 只在repo尚無 package.json時執行
npm install --save-dev puppeteer@25.13.0
```

確認工具與版本：

```bash
node --version
ffmpeg -version | head -n 1
ffprobe -version | head -n 1
```

若 Chromium 不在 `/usr/bin/chromium`，可用 `CHROME_BIN` 指定執行檔：

```bash
CHROME_BIN=/path/to/chromium MODE=samples node render_v4.js
```

## 3. 先做關鍵畫格抽樣

正式全片需要輸出 5,040 格；應先驗證場景與算圖環境。以下抽樣模式只輸出預設關鍵時間的 PNG，不建立影片：

```bash
MODE=samples node render_v4.js
```

圖片會放在 `render/v4_sample_*.png`。檢查標題進退場、轉場、新舊元素是否重疊、畫面邊緣裁切，以及粒子／相機動態是否符合旁白。

## 4. 逐格渲染無聲畫面

執行：

```bash
node render_v4.js
```

算圖流程：

1. 啟動本機 HTTP server，供 Chromium 載入 `index.html`、場景模組、Three.js 和音訊 metadata。
2. 啟動 headless Chromium，建立 1920×1080 viewport，載入 Three.js 場景。
3. 加入離線算圖專用樣式：播放器控制列隱藏，16:9 畫布精確填滿 1920×1080 viewport。
4. 對每一格呼叫 `window.renderFrame(frame)`，並截取 JPEG（quality 95）。
5. 以 stdin pipe 將 JPEG 依序送入 FFmpeg，避免在硬碟上保存 5,040 張中間影格。
6. FFmpeg 使用 H.264/libx264、`yuv420p` 和 CRF 16 建立無聲 MP4。

無聲母帶輸出位置：

```text
render/agi_bottleneck_v4_particle_space_silent_1080p.mp4
```

大部分時間會花在瀏覽器逐格計算及截圖；FFmpeg 是邊讀取影格、邊進行編碼。程序每 10 秒影片內容會列印一次進度。全片總影格數固定，但實際算圖時間會隨 CPU、Chromium/WebGL 軟體渲染速度而變動。

## 5. 將原始混音封裝成最終 MP4

用 repo 內的無損混音 WAV 作為來源，將音訊編成 AAC；視訊採用 stream copy，不重複損失畫質：

```bash
ffmpeg -hide_banner -y \
  -i render/agi_bottleneck_v4_particle_space_silent_1080p.mp4 \
  -i assets/audio/final_mix_source.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy \
  -c:a aac -b:a 320k -ar 44100 \
  -t 210 -movflags +faststart \
  render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4
```

選項說明：

- `-map 0:v:0 -map 1:a:0`：只取第一個輸入的影片及第二個輸入的音訊，避免意外加入其他 streams。
- `-c:v copy`：複製已完成的 H.264 影像，不重新編碼。
- `-c:a aac -b:a 320k -ar 44100`：把 WAV 混音轉成適合 MP4 的 44.1 kHz AAC 音訊。
- `-t 210`：將輸出長度限制為 210 秒，與本片時間線一致。
- `-movflags +faststart`：將 MP4 索引移到檔案前端，方便網頁串流播放。

## 6. 驗證影片

先檢查容器、影像／音訊 codec、畫面尺寸、幀率及時長：

```bash
ffprobe -v error \
  -show_entries format=duration,size \
  -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels \
  -of json render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4
```

再完整解碼一次以偵測封裝或影格錯誤：

```bash
ffmpeg -v error -i render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4 -f null -
```

可抽取代表時間點人工檢查畫面：

```bash
mkdir -p render/qc
for sec in 10 22 55 85 115 145 180 198 209; do
  ffmpeg -y -v error -ss "$sec" \
    -i render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4 \
    -frames:v 1 "render/qc/frame_${sec}.jpg"
done
```

檢查轉場前後是否有舊元素殘留、文字是否入安全區、音軌是否存在，以及總長是否為 03:30。播放器預覽使用 MP3 以降低瀏覽器下載量；最終 MP4 的音訊來源則是 WAV 母檔。

## 整體流程摘要

```text
Three.js renderFrame(frame)
    → Puppeteer / Chromium 截取 JPEG 影格
    → FFmpeg image2pipe 編碼 H.264 無聲母帶
    → FFmpeg 封裝 WAV 混音為 AAC
    → ffprobe / 完整解碼 / 關鍵畫格 QC
```
