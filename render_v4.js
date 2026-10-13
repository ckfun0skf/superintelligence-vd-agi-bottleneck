const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = __dirname;
const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION = 210;
const TOTAL = FPS * DURATION;
const OUT_DIR = path.join(ROOT, 'render');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/chromium';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function serve(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(ROOT, `.${relativePath}`);
  if ((file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) ||
      !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const stat = fs.statSync(file);
  const headers = {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  };
  const range = req.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || stat.size === 0) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }

    let start;
    let end;
    if (match[1] === '') {
      const suffixLength = Number(match[2]);
      start = Math.max(stat.size - suffixLength, 0);
      end = stat.size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === '' ? stat.size - 1 : Math.min(Number(match[2]), stat.size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }

    res.writeHead(206, {
      ...headers,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  fs.createReadStream(file).pipe(res);
}

const waitDrain = stream => new Promise(resolve => stream.once('drain', resolve));
const waitClose = proc => new Promise((resolve, reject) => {
  proc.once('error', reject);
  proc.once('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
});

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = http.createServer(serve);
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_BIN,
      args: [
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
    });

    await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__sceneReady === true, { timeout: 30000 });

    // Offline output is picture-only. Force the responsive player to exact video
    // dimensions and keep its web controls/status/navigation outside the frames.
    await page.addStyleTag({
      content: `
        html, body {
          width: ${W}px !important;
          height: ${H}px !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          overflow: hidden !important;
        }
        #player-shell {
          width: ${W}px !important;
          max-width: none !important;
          margin: 0 !important;
          display: block !important;
        }
        #stage-wrapper {
          width: ${W}px !important;
          height: ${H}px !important;
          max-width: none !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          box-shadow: none !important;
        }
        #ui-hud, #hud-toggle-btn, #audio-track { display: none !important; }
      `,
    });

    if (process.env.MODE === 'samples') {
      const samples = [
        1, 6, 14, 20, 23, 26, 31, 36, 42, 50, 53, 56, 60, 66, 72,
        78, 82, 85, 90, 96, 104, 110, 114, 116, 121, 128, 135, 140,
        144, 146, 152, 160, 170, 178, 182, 188, 196, 202, 208, 209,
      ];
      for (const sec of samples) {
        await page.evaluate(frame => window.renderFrame(frame), Math.round(sec * FPS));
        await page.screenshot({
          path: path.join(OUT_DIR, `v4_sample_${String(sec).padStart(3, '0')}.png`),
          type: 'png',
        });
      }
      console.log(`Wrote ${samples.length} V4 samples to ${OUT_DIR}`);
      return;
    }

    const output = path.join(OUT_DIR, 'agi_bottleneck_v4_particle_space_silent_1080p.mp4');
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-loglevel', 'error',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(FPS),
      '-i', 'pipe:0',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '16',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      output,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    for (let frame = 0; frame < TOTAL; frame += 1) {
      await page.evaluate(index => window.renderFrame(index), frame);
      const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ffmpeg.stdin.write(jpeg)) await waitDrain(ffmpeg.stdin);
      if (frame % (FPS * 10) === 0) {
        console.log(`Rendered ${String(frame / FPS).padStart(6, '0')}/${DURATION}s`);
      }
    }

    ffmpeg.stdin.end();
    await waitClose(ffmpeg);
    console.log(output);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
