const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const ROOT = __dirname;
const W = 1920, H = 1080, FPS = 24, DURATION = 210, TOTAL = DURATION * FPS;
const OUT_DIR = path.join(ROOT, 'render');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.jpg':'image/jpeg', '.json':'application/json', '.css':'text/css', '.png':'image/png' };
function serve(req,res) {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const rel=pathname==='/'?'/index.html':pathname;
  const file=path.resolve(ROOT,'.'+rel);
  if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}
const waitDrain=stream=>new Promise(resolve=>stream.once('drain',resolve));
const waitClose=proc=>new Promise((resolve,reject)=>{proc.once('error',reject);proc.once('close',code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}`)))});
(async()=>{
  fs.mkdirSync(OUT_DIR,{recursive:true});
  const server=http.createServer(serve);await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
    const page=await browser.newPage();await page.setViewport({width:W,height:H,deviceScaleFactor:1});page.on('pageerror',err=>console.error('PAGE ERROR:',err.message));page.on('console',msg=>{if(msg.type()==='error')console.error('CONSOLE ERROR:',msg.text())});
    await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__sceneReady===true,{timeout:30000});
    if(process.env.MODE==='samples'){
      const samples=[1,6,14,20,23,26,31,36,42,50,53,56,60,66,72,78,82,85,90,96,104,110,114,116,121,128,135,140,144,146,152,160,170,178,182,188,196,202,208,209];
      for(const sec of samples){await page.evaluate(f=>window.renderFrame(f),Math.round(sec*FPS));await page.screenshot({path:path.join(OUT_DIR,`v4_sample_${String(sec).padStart(3,'0')}.png`),type:'png'});}
      console.log(`Wrote ${samples.length} V4 samples to ${OUT_DIR}`);return;
    }
    const out=path.join(OUT_DIR,'agi_bottleneck_v4_particle_space_silent_1080p.mp4');
    const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
    for(let frame=0;frame<TOTAL;frame++){
      await page.evaluate(f=>window.renderFrame(f),frame);const jpg=await page.screenshot({type:'jpeg',quality:95});if(!ff.stdin.write(jpg))await waitDrain(ff.stdin);if(frame%(FPS*10)===0)console.log(`Rendered ${String(frame/FPS).padStart(6,'0')}/${DURATION}s`);
    }
    ff.stdin.end();await waitClose(ff);console.log(out);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exit(1)});
