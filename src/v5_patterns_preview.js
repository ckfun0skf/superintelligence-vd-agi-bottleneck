import * as THREE from '../assets/vendor/three.module.js';

// V5 Task 3: Patterns vs causes, 00:50.76–01:22.00 (31.24 seconds).
// Every visual is deterministic and driven by the shared audio master clock.
const FPS = 24;
const DURATION = 31.24;
const BLACK = 0x02050b;
const CYAN = 0x55e5ff;
const ICE = 0xe6fbff;
const BLUE = 0x318aff;
const GOLD = 0xffcf72;
const PINK = 0xff69c5;
const GREEN = 0x74e7ad;
const RED = 0xff3854;
const SOIL = 0x704a34;
const DRY = 0xb87a50;
const settleColor = new THREE.Color(CYAN);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const windowAlpha = (t, start, end, fi = 0.45, fo = 0.5) => smooth((t - start) / fi) * (1 - smooth((t - end) / fo));
let seed = 20261031;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const rr = (a, b) => a + (b - a) * random();

const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(BLACK, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BLACK);
scene.fog = new THREE.FogExp2(BLACK, 0.0045);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 280);
scene.add(camera);
const cameraTarget = new THREE.Vector3(0, 0.25, 0);
const UP = new THREE.Vector3(0, 1, 0);

function material(color, opacity = 1, additive = true, depthTest = true) {
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, depthTest,
    toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  m.userData.baseOpacity = opacity;
  return m;
}
function pointMaterial(size, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uSize: { value: size }, uOpacity: { value: opacity } },
    vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}`,
    fragmentShader: `varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=1.0-smoothstep(0.08,0.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}`,
  });
}
function mesh(parent, geometry, color, opacity = 1, additive = true) {
  const o = new THREE.Mesh(geometry, material(color, opacity, additive));
  parent.add(o);
  return o;
}
function sphere(parent, radius, color, opacity = 1, additive = true, segments = 18) {
  return mesh(parent, new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments * 0.68))), color, opacity, additive);
}
function beam(parent, a, b, radius, color, opacity = 0.8) {
  const from = a.clone(), to = b.clone(), d = to.clone().sub(from), length = d.length();
  const o = mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 10, 1), color, opacity, true);
  o.position.copy(from).add(to).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(UP, d.normalize());
  return o;
}
function setGroupAlpha(group, alpha) {
  const a = clamp(alpha);
  group.traverse(object => {
    if (!object.material) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const m of list) m.opacity = (m.userData.baseOpacity ?? 1) * a;
  });
}
function addText(parent, text, { width = 9, size = 88, color = '#e6fbff', glow = '#55e5ff', y = 0, z = 0, weight = 800 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 300;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.lineJoin = 'round'; ctx.shadowColor = glow; ctx.shadowBlur = 22;
  ctx.strokeStyle = 'rgba(1, 5, 12, .82)'; ctx.lineWidth = 15;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  m.userData.baseOpacity = 1;
  const sprite = new THREE.Sprite(m);
  sprite.scale.set(width, width * canvas.height / canvas.width, 1);
  sprite.position.set(0, y, z); sprite.renderOrder = 8;
  parent.add(sprite);
  return sprite;
}
function setTextAlpha(sprite, alpha) { sprite.material.opacity = clamp(alpha); }
function shapeMesh(parent, points, color, z, opacity = 0.9) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const o = mesh(parent, new THREE.ShapeGeometry(shape), color, opacity, false);
  o.position.z = z;
  return o;
}

// Reuse the opening's exact star volume so depth and parallax remain coherent.
let starGeometry = window.__V5_SHARED_STAR_GEOMETRY;
if (!starGeometry) {
  const count = 760, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([rr(-42, 42), rr(-25, 25), rr(-120, -24)], i * 3);
    const c = new THREE.Color(i % 19 === 0 ? 0x78baff : 0x3f91b0);
    colors.set([c.r * 0.46, c.g * 0.46, c.b * 0.46], i * 3);
  }
  starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
const stars = new THREE.Points(starGeometry, pointMaterial(5.2, 0.8));
scene.add(stars);

// Task 2's final scattered reasoning particles become Task 3's incoming stream.
const IN_COUNT = 420;
const incomingData = [];
const incomingSource = new Float32Array(IN_COUNT * 3);
const incomingPositions = new Float32Array(IN_COUNT * 3);
const incomingColors = new Float32Array(IN_COUNT * 3);
const incomingGeo = new THREE.BufferGeometry();
incomingGeo.setAttribute('position', new THREE.BufferAttribute(incomingPositions, 3).setUsage(THREE.DynamicDrawUsage));
incomingGeo.setAttribute('color', new THREE.BufferAttribute(incomingColors, 3));
incomingGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 170);
const incomingMat = pointMaterial(5.4, 0.82);
const incomingCloud = new THREE.Points(incomingGeo, incomingMat);
scene.add(incomingCloud);
let incomingReady = false;
let inheritedCamera = new THREE.Vector3(0, 0, 20.7);
let inheritedAim = new THREE.Vector3(0, 0.25, 0);
let inheritedStarRotation = 0.05712;
for (let i = 0; i < IN_COUNT; i++) {
  const phase = rr(0, Math.PI * 2);
  const slot = i % 3;
  incomingData.push({ phase, slot, jitter: new THREE.Vector3(rr(-2.5, 2.5), rr(-1.8, 1.8), rr(-2.4, 2.4)) });
  const c = new THREE.Color(i % 3 === 0 ? 0xff4159 : i % 3 === 1 ? 0x419cff : 0xffd074);
  incomingColors.set([c.r, c.g, c.b], i * 3);
  const fallback = [rr(-14, 14), rr(-8, 8), rr(-10, 10)];
  incomingSource.set(fallback, i * 3);
  incomingPositions.set(fallback, i * 3);
}
function prepareIncoming() {
  if (incomingReady) return;
  const field = window.__V5_REASONING_EXIT_FIELD;
  if (!field || !field.positions || !field.colors || !field.count) return;
  for (let i = 0; i < IN_COUNT; i++) {
    const sourceIndex = Math.floor((i + 0.5) * field.count / IN_COUNT), j = sourceIndex * 3;
    incomingPositions[j] = field.positions[j];
    incomingPositions[j + 1] = field.positions[j + 1];
    incomingPositions[j + 2] = field.positions[j + 2];
    incomingSource[j] = field.positions[j];
    incomingSource[j + 1] = field.positions[j + 1];
    incomingSource[j + 2] = field.positions[j + 2];
    incomingColors[j] = field.colors[j];
    incomingColors[j + 1] = field.colors[j + 1];
    incomingColors[j + 2] = field.colors[j + 2];
  }
  incomingGeo.attributes.position.needsUpdate = true;
  incomingGeo.attributes.color.needsUpdate = true;
  inheritedCamera.copy(field.cameraPosition || inheritedCamera);
  inheritedAim.copy(field.cameraTarget || inheritedAim);
  inheritedStarRotation = Number.isFinite(field.starRotationY) ? field.starRotationY : inheritedStarRotation;
  incomingReady = true;
}

// Three literal, dimensional input icons — not generic cards or floating lines.
const inputs = [];
const inputXs = [-8.3, 0, 8.3];
function panelBase(parent, color) {
  const g = new THREE.Group(); parent.add(g);
  const back = mesh(g, new THREE.BoxGeometry(5.3, 4.2, 0.42), 0x0b1a27, 0.84, false);
  back.position.z = -0.22;
  const frame = mesh(g, new THREE.BoxGeometry(5.48, 4.38, 0.18), color, 0.62, true);
  frame.material.wireframe = true;
  const inset = mesh(g, new THREE.BoxGeometry(4.94, 3.82, 0.12), 0x101d2c, 0.9, false);
  inset.position.z = 0.08;
  return g;
}
// Text: stacked page sheets and thick readable writing strokes.
{
  const g = panelBase(scene, CYAN); g.position.set(inputXs[0], 1.1, -1.5);
  for (let sheet = 0; sheet < 2; sheet++) {
    const page = mesh(g, new THREE.BoxGeometry(2.9, 2.45, 0.16), 0x14283a, 0.82, false);
    page.position.set(-0.35 + sheet * 0.24, 0.04 + sheet * 0.12, 0.22 + sheet * 0.05);
  }
  for (let i = 0; i < 5; i++) {
    const width = i === 4 ? 1.3 : 2.25 - (i % 2) * 0.35;
    const row = mesh(g, new THREE.BoxGeometry(width, 0.12, 0.06), CYAN, 0.82, true);
    row.position.set(-0.35 + (width - 2.25) / 2, 0.72 - i * 0.38, 0.34 + (i % 2) * 0.015);
  }
  const label = addText(g, 'TEXT', { width: 3.8, size: 84, y: -2.55, z: 0.45 });
  inputs.push({ group: g, label, start: 6.75, slot: 0 });
}
// Image: a framed landscape with a sun, a horizon and two solid mountain planes.
{
  const g = panelBase(scene, PINK); g.position.set(inputXs[1], 1.1, 0);
  const sun = sphere(g, 0.34, GOLD, 0.94, true, 20); sun.position.set(1.25, 0.72, 0.35);
  shapeMesh(g, [[-1.9, -0.82], [-0.55, 0.8], [0.25, -0.82]], 0x55e5ff, 0.35, 0.82);
  shapeMesh(g, [[-0.15, -0.82], [1.15, 0.4], [2.05, -0.82]], 0x318aff, 0.37, 0.8);
  const horizon = mesh(g, new THREE.BoxGeometry(3.9, 0.10, 0.06), GREEN, 0.78, true); horizon.position.set(0, -0.86, 0.4);
  const label = addText(g, 'IMAGE', { width: 4.2, size: 84, y: -2.55, z: 0.45 });
  inputs.push({ group: g, label, start: 7.72, slot: 1 });
}
// Video: a dimensional screen, play symbol and a moving progress rail.
let videoProgress;
{
  const g = panelBase(scene, GREEN); g.position.set(inputXs[2], 1.1, 1.5);
  const screen = mesh(g, new THREE.BoxGeometry(3.8, 2.25, 0.14), 0x091622, 0.92, false); screen.position.set(0, 0.12, 0.24);
  shapeMesh(g, [[-0.35, -0.64], [-0.35, 0.85], [0.95, 0.1]], ICE, 0.38, 0.94);
  videoProgress = mesh(g, new THREE.BoxGeometry(3.4, 0.10, 0.08), GREEN, 0.92, true);
  videoProgress.position.set(-0.1, -1.03, 0.40); videoProgress.scale.x = 0.08;
  const label = addText(g, 'VIDEO', { width: 3.8, size: 84, y: -2.55, z: 0.45 });
  inputs.push({ group: g, label, start: 8.58, slot: 2 });
}

// Feature particles stream from the three input formats into repeated outcomes.
const FLOW_COUNT = 360;
const flowData = [];
const flowPos = new Float32Array(FLOW_COUNT * 3), flowCol = new Float32Array(FLOW_COUNT * 3);
for (let i = 0; i < FLOW_COUNT; i++) {
  const slot = i % 3, phase = rr(0, 1), side = rr(-1, 1);
  flowData.push({ slot, phase, side });
  const c = new THREE.Color([CYAN, PINK, GREEN][slot]);
  flowCol.set([c.r, c.g, c.b], i * 3);
}
const flowGeo = new THREE.BufferGeometry();
flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3).setUsage(THREE.DynamicDrawUsage));
flowGeo.setAttribute('color', new THREE.BufferAttribute(flowCol, 3));
flowGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 45);
const flowMat = pointMaterial(6.1, 0);
const featureFlow = new THREE.Points(flowGeo, flowMat); scene.add(featureFlow);

// Three identical plant outcomes form a literal, easy-to-read pattern.
function makePlant(parent, { soilColor = SOIL, leafColor = GREEN } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const pot = mesh(g, new THREE.CylinderGeometry(1.02, 0.77, 1.12, 12, 1, true), 0x8a573d, 0.96, false);
  pot.position.y = 0.52;
  const base = mesh(g, new THREE.CylinderGeometry(0.77, 0.79, 0.12, 12), 0x62402f, 0.95, false); base.position.y = 0.08;
  const soil = mesh(g, new THREE.CylinderGeometry(0.98, 0.98, 0.16, 12), soilColor, 0.98, false); soil.position.y = 1.05;
  const stem = mesh(g, new THREE.CylinderGeometry(0.075, 0.11, 1.45, 10), 0x65cb83, 0.98, false); stem.position.set(0, 1.86, 0.02);
  const leaves = [];
  const leafSpecs = [
    [-0.48, 1.63, 0.30, -0.50], [0.48, 1.89, 0.28, 0.46],
    [-0.43, 2.28, 0.24, -0.42], [0.42, 2.54, 0.22, 0.46],
    [-0.17, 2.90, 0.12, -0.25], [0.20, 3.13, 0.10, 0.28],
  ];
  for (const [x, y, z, rz] of leafSpecs) {
    const leaf = sphere(g, 0.5, leafColor, 0.94, false, 16);
    leaf.scale.set(0.68, 0.22, 0.34); leaf.position.set(x, y, z); leaf.rotation.z = rz; leaves.push(leaf);
  }
  const roots = new THREE.Group(); g.add(roots);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4;
    const r = new THREE.Vector3(Math.cos(a) * 0.60, -0.25 - (i % 2) * 0.11, Math.sin(a) * 0.46);
    const root = beam(roots, new THREE.Vector3(0, 1.02, 0), r, 0.035, 0xb99767, 0.88);
    roots.add(root);
  }
  roots.visible = false;
  return { group: g, pot, base, soil, stem, leaves, roots };
}
const patternPlants = [];
for (const x of [-7.8, 0, 7.8]) {
  const p = makePlant(scene);
  p.group.position.set(x, -3.05, -4.5 + (x === 0 ? 1.2 : 0));
  p.group.scale.setScalar(0.70);
  patternPlants.push(p);
}
const patternRing = mesh(scene, new THREE.TorusGeometry(5.4, 0.07, 10, 96), CYAN, 0.7, true);
patternRing.position.set(0, -0.75, -4.0); patternRing.rotation.x = 0.28;
const patternTitle = addText(scene, 'PATTERNS ≠ CAUSES', { width: 24, size: 126, y: 6.45, z: -5.0, glow: '#4aaeff' });

// A compact rain cloud and watering can create different causes for the same plant growth.
function makeRainCloud(parent) {
  const g = new THREE.Group(); parent.add(g);
  const cloudParts = [
    { x: -0.72, y: 0, r: 0.58 }, { x: 0, y: 0.28, r: 0.78 }, { x: 0.78, y: 0.02, r: 0.57 },
  ];
  for (const p of cloudParts) { const s = sphere(g, p.r, 0x7dc8ff, 0.9, false); s.position.set(p.x, p.y, 0); }
  const drops = [];
  for (let i = 0; i < 7; i++) {
    const d = sphere(g, 0.10, CYAN, 0.95, true, 12);
    d.position.set(-0.86 + (i % 4) * 0.57, -0.64 - Math.floor(i / 4) * 0.44, 0.18);
    drops.push(d);
  }
  return { group: g, drops };
}
function makeWaterCan(parent) {
  const g = new THREE.Group(); parent.add(g);
  const body = mesh(g, new THREE.BoxGeometry(1.55, 1.12, 0.9), 0x3c98c6, 0.96, false); body.position.set(-0.10, 0, 0);
  const rim = mesh(g, new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12), 0x73d5ff, 0.94, false); rim.position.set(0.2, 0.67, 0);
  const spout = beam(g, new THREE.Vector3(0.45, 0.38, 0), new THREE.Vector3(1.35, 0.82, 0), 0.12, 0x53bce9, 0.94);
  const handle = mesh(g, new THREE.TorusGeometry(0.48, 0.085, 10, 28, Math.PI), 0x8bdbf5, 0.92, false);
  handle.position.set(-0.55, 0.23, 0.35); handle.rotation.z = Math.PI;
  const nozzle = sphere(g, 0.19, CYAN, 0.95, true, 14); nozzle.position.set(1.37, 0.83, 0);
  const drops = [];
  for (let i = 0; i < 6; i++) { const d = sphere(g, 0.08, CYAN, 0.94, true, 10); d.position.set(1.52 + i * 0.12, 0.62 - i * 0.16, 0.15); drops.push(d); }
  return { group: g, drops };
}
const rainCause = makeRainCloud(scene); rainCause.group.position.set(-7.1, 3.0, 0.5);
const waterCause = makeWaterCan(scene); waterCause.group.position.set(7.0, 2.65, 0.5);
const causePlants = [];
for (const x of [-7.1, 7.0]) {
  const p = makePlant(scene); p.group.position.set(x, -3.1, -0.3); p.group.scale.setScalar(0.66); causePlants.push(p);
}
const rainLabel = addText(scene, 'RAIN', { width: 4.8, size: 76, y: 5.25, z: 0.7, color: '#d9f4ff' }); rainLabel.position.x = -7.1;
const waterLabel = addText(scene, 'WATERING', { width: 6.0, size: 76, y: 5.25, z: 0.7, color: '#d9f4ff' }); waterLabel.position.x = 7.0;
const sameOutcome = addText(scene, 'SAME GROWTH · DIFFERENT CAUSE', { width: 25.5, size: 94, y: 6.55, z: -4.2, glow: '#5fe5ff' });

// New, unfamiliar setup: model forecast is set against what actually happens.
const experimentStage = mesh(scene, new THREE.CylinderGeometry(6.0, 6.3, 0.3, 64), 0x162b3b, 0.54, false);
experimentStage.position.set(0, -4.08, -0.6); experimentStage.material.wireframe = true;
const predictedPlant = makePlant(scene); predictedPlant.group.position.set(-4.25, -3.65, 1.0); predictedPlant.group.scale.setScalar(0.77);
const observedPlant = makePlant(scene); observedPlant.group.position.set(4.25, -3.65, 1.0); observedPlant.group.scale.setScalar(0.77);
const predictLabel = addText(scene, 'PREDICTED', { width: 8.8, size: 76, y: 2.3, z: 2.0, color: '#c8f8ff' }); predictLabel.position.x = -4.25;
const actualLabel = addText(scene, 'OBSERVED', { width: 8.5, size: 76, y: 2.3, z: 2.0, color: '#ffd6bf', glow: '#ff8c6c' }); actualLabel.position.x = 4.25;
const mismatch = addText(scene, '≠', { width: 2.6, size: 180, y: -0.3, z: 3.0, color: '#ff5870', glow: '#ff3854' });
const unfamiliarTitle = addText(scene, 'UNFAMILIAR SITUATION', { width: 24, size: 118, y: 6.5, z: -4.0, glow: '#4aaeff' });
const predictTitle = addText(scene, 'PREDICT THE OUTCOME', { width: 23, size: 112, y: 6.5, z: -4.0, glow: '#4aaeff' });
const hiddenTitle = addText(scene, 'HIDDEN: SOIL MOISTURE', { width: 25, size: 112, y: 6.5, z: -4.0, color: '#e7fbff', glow: '#64c9ff' });
const updateTitle = addText(scene, 'UPDATE THE MODEL', { width: 21, size: 112, y: 6.5, z: -4.0, color: '#e7fbff', glow: '#66e8ba' });
const contradictionTitle = addText(scene, 'PREDICTION ≠ REALITY', { width: 25, size: 108, y: 6.5, z: -4.0, color: '#ffe5de', glow: '#ff596d' });

// Soil cutaway and moisture meter expose the previously hidden variable.
const cutaway = new THREE.Group(); scene.add(cutaway);
const earthPanel = mesh(cutaway, new THREE.BoxGeometry(5.1, 1.35, 0.35), SOIL, 0.98, false); earthPanel.position.set(4.25, -3.65, 2.08);
const earthFront = mesh(cutaway, new THREE.BoxGeometry(4.8, 0.12, 0.08), DRY, 0.94, false); earthFront.position.set(4.25, -4.16, 2.30);
const moistureBack = mesh(cutaway, new THREE.BoxGeometry(0.38, 1.7, 0.24), 0x172635, 0.94, false); moistureBack.position.set(7.45, -3.20, 2.26);
const moistureFill = mesh(cutaway, new THREE.BoxGeometry(0.24, 1.25, 0.14), 0x3daaff, 0.98, true); moistureFill.position.set(7.45, -3.75, 2.42); moistureFill.scale.y = 0.08;
const moistureLabel = addText(cutaway, 'SOIL MOISTURE', { width: 6.8, size: 58, y: -4.65, z: 2.55, color: '#d8f2ff' }); moistureLabel.position.x = 6.15;
const rootsReveal = new THREE.Group(); scene.add(rootsReveal);
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  const end = new THREE.Vector3(4.25 + Math.cos(a) * (0.7 + (i % 3) * 0.22), -3.70 - (i % 4) * 0.22, 2.25 + Math.sin(a) * 0.12);
  beam(rootsReveal, new THREE.Vector3(4.25, -2.75, 2.18), end, 0.045, 0xb99a72, 0.88);
}

// Causal paths are thick and spatial: both water sources change soil moisture,
// which changes the plant. This replaces a misleading direct correlation.
const causalGraph = new THREE.Group(); scene.add(causalGraph);
const rainToSoil = beam(causalGraph, new THREE.Vector3(-7.0, 2.6, -2.0), new THREE.Vector3(0, -3.25, -1.6), 0.085, CYAN, 0.82);
const waterToSoil = beam(causalGraph, new THREE.Vector3(7.0, 2.35, -2.0), new THREE.Vector3(0, -3.25, -1.6), 0.085, BLUE, 0.82);
const soilToPlant = beam(causalGraph, new THREE.Vector3(0, -3.2, -1.4), new THREE.Vector3(0, 0.8, -1.0), 0.09, GREEN, 0.9);
const causalPulses = [];
for (let i = 0; i < 3; i++) {
  const p = sphere(causalGraph, 0.18, [CYAN, BLUE, GREEN][i], 0.98, true, 14);
  causalPulses.push(p);
}
const graphNodeRain = sphere(causalGraph, 0.42, CYAN, 0.96, true); graphNodeRain.position.set(-7.0, 2.6, -2.0);
const graphNodeWater = sphere(causalGraph, 0.42, BLUE, 0.96, true); graphNodeWater.position.set(7.0, 2.35, -2.0);
const graphNodeSoil = sphere(causalGraph, 0.62, 0x63b8ff, 0.96, true); graphNodeSoil.position.set(0, -3.25, -1.6);
const rainGraphLabel = addText(causalGraph, 'RAIN', { width: 3.5, size: 54, y: 3.35, z: -1.6 }); rainGraphLabel.position.x = -7.0;
const waterGraphLabel = addText(causalGraph, 'WATER', { width: 4.2, size: 54, y: 3.35, z: -1.6 }); waterGraphLabel.position.x = 7.0;

// After correction, a fresh test shows the predicted and observed result aligned.
const testExpected = makePlant(scene); testExpected.group.position.set(-3.65, -3.65, -5.0); testExpected.group.scale.setScalar(0.57);
const testObserved = makePlant(scene); testObserved.group.position.set(3.65, -3.65, -5.0); testObserved.group.scale.setScalar(0.57);
const matchedCheck = addText(scene, '✓', { width: 2.6, size: 170, y: -0.4, z: 1.6, color: '#8dffd0', glow: '#41f0ad' });
const matchedTitle = addText(scene, 'UPDATED MODEL · BETTER PREDICTION', { width: 27, size: 92, y: 6.5, z: -4.0, color: '#dcfff1', glow: '#51eab3' });

// Exit particles form the next scene's starting field without a hard cut.
const OUT_COUNT = 420;
const outData = [], outPositions = new Float32Array(OUT_COUNT * 3), outColors = new Float32Array(OUT_COUNT * 3);
for (let i = 0; i < OUT_COUNT; i++) {
  const a = rr(0, Math.PI * 2), h = rr(-1, 1), r = Math.sqrt(1 - h * h);
  const source = new THREE.Vector3(Math.cos(a) * r * 1.8, -2.8 + h * 1.4, 1.0 + Math.sin(a) * r * 1.6);
  const dir = new THREE.Vector3(rr(-1, 1), rr(-0.8, 0.8), rr(-1, 1)).normalize();
  const end = source.clone().addScaledVector(dir, rr(8, 15));
  outData.push({ source, end, phase: rr(0, Math.PI * 2) });
  const c = new THREE.Color(i % 4 === 0 ? GREEN : i % 3 === 0 ? BLUE : CYAN);
  outColors.set([c.r, c.g, c.b], i * 3);
}
const outGeo = new THREE.BufferGeometry();
outGeo.setAttribute('position', new THREE.BufferAttribute(outPositions, 3).setUsage(THREE.DynamicDrawUsage));
outGeo.setAttribute('color', new THREE.BufferAttribute(outColors, 3));
outGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -2, 0), 40);
const outMat = pointMaterial(5.4, 0);
const outCloud = new THREE.Points(outGeo, outMat); scene.add(outCloud);

function updateIncoming(t) {
  const p = incomingGeo.attributes.position.array, c = incomingGeo.attributes.color.array;
  const u = smooth(t / 3.95);
  const color = new THREE.Color();
  for (let i = 0; i < IN_COUNT; i++) {
    const d = incomingData[i], j = i * 3, slotX = inputXs[d.slot];
    const targetX = slotX + d.jitter.x * 0.26;
    const targetY = 1.1 + d.jitter.y * 0.26;
    const targetZ = [-1.5, 0, 1.5][d.slot] + d.jitter.z * 0.26;
    const x = incomingSource[j] * (1 - u) + targetX * u + Math.sin(t * 1.2 + d.phase) * 0.12 * u;
    const y = incomingSource[j + 1] * (1 - u) + targetY * u + Math.cos(t + d.phase) * 0.10 * u;
    const z = incomingSource[j + 2] * (1 - u) + targetZ * u + Math.sin(t * 0.8 + d.phase) * 0.12 * u;
    p[j] = x; p[j + 1] = y; p[j + 2] = z;
    color.setRGB(incomingColors[j], incomingColors[j + 1], incomingColors[j + 2]).lerp(settleColor, u * 0.52);
    c[j] = color.r; c[j + 1] = color.g; c[j + 2] = color.b;
  }
  incomingGeo.attributes.position.needsUpdate = true;
  incomingGeo.attributes.color.needsUpdate = true;
  incomingMat.uniforms.uOpacity.value = 0.82 * (1 - smooth((t - 2.45) / 1.65));
}
function updateFlow(t) {
  const p = flowGeo.attributes.position.array;
  const active = windowAlpha(t, 7.9, 10.45, 0.45, 0.55);
  const target = new THREE.Vector3(0, -0.75, -3.8);
  for (let i = 0; i < FLOW_COUNT; i++) {
    const d = flowData[i], j = i * 3, sx = inputXs[d.slot], phase = (d.phase + t * 0.34) % 1;
    const x = sx * (1 - phase) + target.x * phase + d.side * Math.sin(phase * Math.PI) * 1.0;
    const y = 1.0 * (1 - phase) + target.y * phase + Math.sin(phase * Math.PI * 2 + d.slot) * 1.0;
    const z = [-1.5, 0, 1.5][d.slot] * (1 - phase) + target.z * phase + Math.cos(phase * Math.PI * 2 + d.phase * 2) * 0.95;
    p[j] = x; p[j + 1] = y; p[j + 2] = z;
  }
  flowGeo.attributes.position.needsUpdate = true;
  flowMat.uniforms.uOpacity.value = 0.78 * active;
}
function updatePlants(plants, alpha, { wilt = false, dry = false, showRoots = false } = {}) {
  for (const plant of plants) {
    setGroupAlpha(plant.group, alpha);
    plant.roots.visible = showRoots && alpha > 0.01;
    plant.stem.rotation.z = wilt ? -0.38 : 0.04 * Math.sin(alpha * 4);
    plant.stem.material.color.setHex(wilt ? DRY : 0x65cb83);
    plant.soil.material.color.setHex(dry ? DRY : SOIL);
    for (let i = 0; i < plant.leaves.length; i++) {
      const leaf = plant.leaves[i];
      leaf.material.color.setHex(wilt ? 0xb38453 : GREEN);
      leaf.rotation.z = wilt ? (i % 2 ? 0.75 : -0.72) : (i % 2 ? 0.46 : -0.5);
    }
  }
}
function updateCausalPulses(t) {
  const phase = ((t - 26.75) * 0.9) % 1;
  const a = new THREE.Vector3(-7.0, 2.6, -2.0), b = new THREE.Vector3(0, -3.25, -1.6), c = new THREE.Vector3(0, 0.8, -1.0);
  causalPulses[0].position.copy(a).lerp(b, phase);
  causalPulses[1].position.copy(new THREE.Vector3(7.0, 2.35, -2.0)).lerp(b, (phase + 0.30) % 1);
  causalPulses[2].position.copy(b).lerp(c, (phase + 0.58) % 1);
  causalGraph.rotation.y = 0.025 * Math.sin(t * 0.8);
}
function updateExit(t) {
  const start = 30.35, spread = smooth((t - start) / 0.82), p = outGeo.attributes.position.array;
  for (let i = 0; i < OUT_COUNT; i++) {
    const d = outData[i], j = i * 3;
    p[j] = THREE.MathUtils.lerp(d.source.x, d.end.x, spread) + Math.sin(t * 1.3 + d.phase) * 0.16 * spread;
    p[j + 1] = THREE.MathUtils.lerp(d.source.y, d.end.y, spread) + Math.cos(t * 1.1 + d.phase) * 0.16 * spread;
    p[j + 2] = THREE.MathUtils.lerp(d.source.z, d.end.z, spread);
  }
  outGeo.attributes.position.needsUpdate = true;
  outMat.uniforms.uOpacity.value = 0.82 * smooth((t - start) / 0.18);
}
function updateCamera(t) {
  if (t < 4.8) {
    const u = smooth(t / 4.8);
    camera.position.copy(inheritedCamera).lerp(new THREE.Vector3(0, 0.3, 29), u);
    const aim = inheritedAim.clone().lerp(new THREE.Vector3(0, 0.2, 0), u);
    camera.lookAt(aim);
  } else if (t < 10.2) {
    const q = t - 4.8;
    camera.position.set(2.3 * Math.sin(q * 0.3), 0.7 + Math.sin(q * 0.37) * 0.6, 29 - smooth(q / 5.4) * 1.6);
    camera.lookAt(0, 0.1, -0.6);
  } else if (t < 16.7) {
    const q = t - 10.2;
    camera.position.set(3.2 * Math.sin(q * 0.27), 0.7 + Math.sin(q * 0.33) * 0.8, 27 - 1.0 * smooth(q / 6.5));
    camera.lookAt(0, -0.1, -1.8);
  } else if (t < 21.2) {
    const u = smooth((t - 16.7) / 4.5);
    camera.position.set(3.2 * (1 - u), 0.7 * (1 - u), 26 - u * 1.0);
    camera.lookAt(0, 0, 0);
  } else {
    const q = t - 21.2;
    camera.position.set(2.5 * Math.sin(q * 0.22), 0.8 + Math.sin(q * 0.31) * 0.65, 25.0 - smooth(q / 10.0) * 1.5);
    camera.lookAt(0, 0.15, -0.2);
  }
  stars.rotation.y = inheritedStarRotation + t * 0.0013;
  stars.rotation.x = Math.sin(t * 0.06) * 0.008;
}
function renderFrame(frame) {
  const t = clamp(Number(frame) / FPS, 0, DURATION);
  prepareIncoming();
  updateIncoming(t);
  updateFlow(t);

  for (const input of inputs) {
    const end = 10.05;
    const alpha = windowAlpha(t, input.start, end, 0.34, 0.82);
    setGroupAlpha(input.group, alpha);
    setTextAlpha(input.label, alpha);
  }
  if (videoProgress) videoProgress.scale.x = 0.10 + 0.86 * ((t * 0.22) % 1);

  const patternA = windowAlpha(t, 9.65, 14.60, 0.58, 0.40);
  updatePlants(patternPlants, patternA);
  patternRing.material.opacity = 0.72 * patternA * (0.75 + 0.25 * Math.sin(t * 1.8));
  patternRing.rotation.z = t * 0.18;
  setTextAlpha(patternTitle, windowAlpha(t, 10.10, 14.70, 0.30, 0.45));

  const causeA = windowAlpha(t, 14.88, 16.55, 0.45, 0.40);
  setGroupAlpha(rainCause.group, causeA); setGroupAlpha(waterCause.group, causeA);
  updatePlants(causePlants, causeA);
  for (let i = 0; i < rainCause.drops.length; i++) rainCause.drops[i].position.y = -0.58 - ((t * 1.55 + i * 0.16) % 1.2);
  for (let i = 0; i < waterCause.drops.length; i++) waterCause.drops[i].position.y = 0.58 - ((t * 1.35 + i * 0.18) % 1.0);
  setTextAlpha(rainLabel, causeA); setTextAlpha(waterLabel, causeA);
  setTextAlpha(sameOutcome, windowAlpha(t, 15.45, 16.52, 0.4, 0.42));

  const unfamiliarA = windowAlpha(t, 17.08, 21.10, 0.48, 0.48);
  experimentStage.material.opacity = 0.54 * unfamiliarA;
  setTextAlpha(unfamiliarTitle, windowAlpha(t, 17.18, 20.48, 0.38, 0.52));

  const forecastA = windowAlpha(t, 21.05, 30.45, 0.45, 0.35);
  const previewPlantA = 0.68 * windowAlpha(t, 17.08, 21.60, 0.48, 0.45);
  const predictionMove = smooth((t - 20.00) / 1.05);
  predictedPlant.group.position.x = -4.25 * predictionMove;
  predictLabel.position.x = -4.25 * predictionMove;
  updatePlants([predictedPlant], Math.max(previewPlantA, forecastA), { wilt: false, dry: false });
  updatePlants([observedPlant], windowAlpha(t, 24.82, 30.45, 0.30, 0.35), { wilt: true, dry: true, showRoots: t >= 24.92 });
  setTextAlpha(predictLabel, forecastA);
  setTextAlpha(actualLabel, windowAlpha(t, 24.88, 30.45, 0.32, 0.35));
  setTextAlpha(predictTitle, windowAlpha(t, 21.55, 24.1, 0.36, 0.4));
  setTextAlpha(mismatch, windowAlpha(t, 25.30, 29.9, 0.24, 0.35));

  const hiddenA = windowAlpha(t, 24.75, 30.45, 0.35, 0.35);
  setGroupAlpha(cutaway, hiddenA); setGroupAlpha(rootsReveal, hiddenA);
  moistureFill.scale.y = 0.08 + 0.31 * smooth((t - 26.9) / 0.75);
  moistureFill.position.y = -4.17 + moistureFill.scale.y * 0.61;
  setTextAlpha(hiddenTitle, windowAlpha(t, 24.92, 26.95, 0.34, 0.45));

  const graphA = windowAlpha(t, 26.75, 30.45, 0.45, 0.35);
  setGroupAlpha(causalGraph, graphA);
  updateCausalPulses(t);
  setTextAlpha(updateTitle, windowAlpha(t, 27.0, 28.48, 0.34, 0.38));
  setTextAlpha(contradictionTitle, windowAlpha(t, 28.48, 30.38, 0.30, 0.35));

  const matchA = windowAlpha(t, 30.34, 31.26, 0.16, 0.20);
  updatePlants([testExpected, testObserved], matchA);
  setTextAlpha(matchedCheck, matchA);
  setTextAlpha(matchedTitle, windowAlpha(t, 30.48, 31.26, 0.16, 0.14));

  updateExit(t);

  updateCamera(t);
  camera.position.x += Math.sin(t * 0.31) * 0.035;
  renderer.render(scene, camera);
  window.__sceneTime = t;
  if (t >= DURATION - 1 / FPS) {
    window.__V5_WORLD_EXIT_FIELD = {
      count: OUT_COUNT,
      positions: new Float32Array(outPositions),
      colors: new Float32Array(outColors),
      cameraPosition: camera.position.clone(),
      cameraTarget: cameraTarget.clone(),
      starRotationY: stars.rotation.y,
    };
  }
}
function resize() {
  const width = Math.max(1, host.clientWidth || window.innerWidth);
  const height = Math.max(1, host.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false);
  camera.aspect = width / height; camera.updateProjectionMatrix();
  if (standalone) renderFrame(Math.round((window.__playerTime || 0) * FPS));
}
if (standalone) {
  window.renderFrame = renderFrame;
  window.__sceneReady = true;
  window.addEventListener('resize', resize);
  resize(); renderFrame(0);
  window.dispatchEvent(new Event('v5scene-ready'));
}
export { renderFrame, resize };
