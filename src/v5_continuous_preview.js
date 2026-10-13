import * as THREE from '../assets/vendor/three.module.js';

const FPS = 24;
const CUT = 22.2;
const DURATION = 50.76;
const container = document.getElementById('canvas-container');
if (!container) throw new Error('V5 preview canvas container is missing.');

// One WebGL renderer and one canvas are shared by every finished V5 passage.
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x02050b, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
container.appendChild(renderer.domElement);
window.__V5_SHARED_RENDERER = renderer;

let opening;
let reasoning;
let handoffReady = false;
let currentTime = 0;

function renderAt(time) {
  const seconds = Math.max(0, Math.min(DURATION, Number(time) || 0));
  currentTime = seconds;
  window.__playerTime = seconds;
  if (seconds < CUT) {
    opening.renderFrame(Math.round(seconds * FPS));
  } else {
    // Render the final opening frame once to snapshot its exact particle,
    // star-field and camera state; the next scene inherits that same state.
    if (!handoffReady) {
      opening.renderFrame(Math.round(CUT * FPS));
      handoffReady = true;
    }
    reasoning.renderFrame(Math.round((seconds - CUT) * FPS));
  }
  window.__sceneTime = seconds;
}

function resize() {
  const width = Math.max(1, container.clientWidth || window.innerWidth);
  const height = Math.max(1, container.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false);
  if (opening && reasoning) {
    opening.resize();
    reasoning.resize();
    renderAt(currentTime);
  }
}

try {
  opening = await import('./v5_opening_preview.js');
  reasoning = await import('./v5_reasoning_preview.js');
  window.renderFrame = frame => renderAt(Math.max(0, Number(frame) || 0) / FPS);
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  resize();
  renderAt(window.__playerTime || 0);
  window.__sceneReady = true;
  window.dispatchEvent(new Event('v5scene-ready'));
} catch (error) {
  console.error('V5 continuous preview failed to initialize:', error);
  const status = document.getElementById('status');
  if (status) status.textContent = 'V5場景載入失敗；請重新載入頁面。';
  window.__sceneReady = false;
}
