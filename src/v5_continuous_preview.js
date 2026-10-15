import * as THREE from '../assets/vendor/three.module.js';

const FPS = 24;
const CUT_1 = 22.2;
const CUT_2 = 50.76;
const CUT_3 = 82.0;
const CUT_4 = 110.0;
const CUT_5 = 140.38;
const CUT_6 = 164.35;
const DURATION = 180.0;
const CUT_1_FRAME = Math.round(CUT_1 * FPS);
const CUT_2_FRAME = Math.round(CUT_2 * FPS);
const CUT_3_FRAME = Math.round(CUT_3 * FPS);
const CUT_4_FRAME = Math.round(CUT_4 * FPS);
const CUT_5_FRAME = Math.round(CUT_5 * FPS);
const CUT_6_FRAME = Math.round(CUT_6 * FPS);
const DURATION_FRAME = Math.round(DURATION * FPS);
const container = document.getElementById('canvas-container');
if (!container) throw new Error('V5 preview canvas container is missing.');

// One WebGL renderer and one canvas are shared by every finished V5 passage.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
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
let patterns;
let learning;
let computeCost;
let capabilitySystem;
let unknownHorizon;
let openingHandoffReady = false;
let reasoningHandoffReady = false;
let patternsHandoffReady = false;
let learningHandoffReady = false;
let computeHandoffReady = false;
let capabilityHandoffReady = false;
let currentTime = 0;

function renderAt(time) {
  const seconds = Math.max(0, Math.min(DURATION, Number(time) || 0));
  const frame = Math.max(0, Math.min(DURATION_FRAME, Math.round(seconds * FPS)));
  currentTime = seconds;
  window.__playerTime = seconds;
  if (frame < CUT_1_FRAME) {
    opening.renderFrame(frame);
  } else {
    if (!openingHandoffReady) {
      opening.renderFrame(CUT_1_FRAME);
      openingHandoffReady = true;
    }
    if (frame < CUT_2_FRAME) {
      reasoning.renderFrame(frame - CUT_1_FRAME);
    } else {
      if (!reasoningHandoffReady) {
        reasoning.renderFrame(CUT_2_FRAME - CUT_1_FRAME);
        reasoningHandoffReady = true;
      }
      if (frame < CUT_3_FRAME) {
        patterns.renderFrame(frame - CUT_2_FRAME);
      } else if (frame < CUT_4_FRAME) {
        // Capture Task 3's exact final particle field and camera before Task 4 begins.
        if (!patternsHandoffReady) {
          patterns.renderFrame(CUT_3_FRAME - CUT_2_FRAME);
          patternsHandoffReady = true;
        }
        learning.renderFrame(frame - CUT_3_FRAME);
      } else if (frame < CUT_5_FRAME) {
        if (!learningHandoffReady) {
          learning.renderFrame(CUT_4_FRAME - CUT_3_FRAME);
          learningHandoffReady = true;
        }
        computeCost.renderFrame(frame - CUT_4_FRAME);
      } else if (frame < CUT_6_FRAME) {
        if (!computeHandoffReady) {
          computeCost.renderFrame(CUT_5_FRAME - CUT_4_FRAME);
          computeHandoffReady = true;
        }
        capabilitySystem.renderFrame(frame - CUT_5_FRAME);
      } else {
        if (!computeHandoffReady) {
          computeCost.renderFrame(CUT_5_FRAME - CUT_4_FRAME);
          computeHandoffReady = true;
        }
        if (!capabilityHandoffReady) {
          capabilitySystem.renderFrame(CUT_6_FRAME - CUT_5_FRAME);
          capabilityHandoffReady = true;
        }
        unknownHorizon.renderFrame(frame - CUT_6_FRAME);
      }
    }
  }
  window.__sceneTime = seconds;
}

function resize() {
  const width = Math.max(1, container.clientWidth || window.innerWidth);
  const height = Math.max(1, container.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false);
  if (opening && reasoning && patterns && learning && computeCost && capabilitySystem && unknownHorizon) {
    opening.resize();
    reasoning.resize();
    patterns.resize();
    learning.resize();
    computeCost.resize();
    capabilitySystem.resize();
    unknownHorizon.resize();
    renderAt(currentTime);
  }
}

try {
  opening = await import('./v5_opening_preview.js');
  reasoning = await import('./v5_reasoning_preview.js');
  patterns = await import('./v5_patterns_preview.js');
  learning = await import('./v5_learning_loop_preview.js');
  computeCost = await import('./v5_compute_cost_preview.js');
  capabilitySystem = await import('./v5_capability_system_preview.js');
  unknownHorizon = await import('./v5_unknown_horizon_preview.js');
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
