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
const HEALTHY_STEM = new THREE.Color(0x65cb83);
const DRY_STEM = new THREE.Color(0xb38453);
const HEALTHY_LEAF = new THREE.Color(GREEN);
const DRY_LEAF = new THREE.Color(0xb38453);
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

// Two matching outcomes make the visible pattern explicit; causes arrive later.
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
for (const x of [-6.1, 6.1]) {
  const p = makePlant(scene);
  p.group.position.set(x, -3.05, -0.6);
  p.group.scale.setScalar(0.82);
  patternPlants.push(p);
}
const patternTitle = addText(scene, 'PATTERNS ≠ CAUSES', { width: 24, size: 126, y: 6.45, z: -5.0, glow: '#4aaeff' });
const visibleResult = addText(scene, 'SAME VISIBLE RESULT', { width: 12, size: 72, y: 0.20, z: 1.2, color: '#d9f8ff' });

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
const rainCause = makeRainCloud(scene); rainCause.group.position.set(-6.1, 2.75, 1.0);
const waterCause = makeWaterCan(scene); waterCause.group.position.set(6.1, 2.65, 1.0);
const rainLabel = addText(scene, 'RAIN', { width: 4.8, size: 160, y: 4.20, z: 1.0, color: '#d9f4ff' }); rainLabel.position.x = -6.1;
const waterLabel = addText(scene, 'WATERING', { width: 6.0, size: 150, y: 4.20, z: 1.0, color: '#d9f4ff' }); waterLabel.position.x = 6.1;
const sameOutcome = addText(scene, 'SAME RESULT · DIFFERENT CAUSES', { width: 27, size: 92, y: 6.45, z: -4.2, glow: '#5fe5ff' });

// One plant stays in view through the full test so cause, prediction and outcome
// all refer to the same subject instead of unexplained duplicate plants.
const predictedPlant = makePlant(scene); predictedPlant.group.position.set(0, -3.0, 1.0); predictedPlant.group.scale.setScalar(0.96);
const predictLabel = addText(scene, 'MODEL EXPECTS: HEALTHY', { width: 18, size: 78, y: 2.35, z: 2.2, color: '#c8f8ff' });
const actualLabel = addText(scene, 'PREDICTED: HEALTHY', { width: 17, size: 76, y: 2.35, z: 2.2, color: '#ffd6bf', glow: '#ff8c6c' });
const nextLabel = addText(scene, 'NEXT PREDICTION: WILT', { width: 19, size: 74, y: 2.35, z: 2.2, color: '#dcfff1', glow: '#51eab3' });
const mismatch = new THREE.Group(); scene.add(mismatch);
beam(mismatch, new THREE.Vector3(4.85, 0.65, 3.0), new THREE.Vector3(5.75, -0.25, 3.0), 0.13, RED, 0.96);
beam(mismatch, new THREE.Vector3(4.85, -0.25, 3.0), new THREE.Vector3(5.75, 0.65, 3.0), 0.13, RED, 0.96);
const unfamiliarTitle = addText(scene, 'A NEW CASE', { width: 19, size: 118, y: 6.5, z: -4.0, glow: '#4aaeff' });
const predictTitle = addText(scene, 'PREDICT THE OUTCOME', { width: 23, size: 112, y: 6.5, z: -4.0, glow: '#4aaeff' });
const hiddenTitle = addText(scene, 'HIDDEN VARIABLE: DRY SOIL', { width: 26, size: 100, y: 6.5, z: -4.0, color: '#e7fbff', glow: '#64c9ff' });
const updateTitle = addText(scene, 'THE MODEL MUST UPDATE', { width: 24, size: 104, y: 6.5, z: -4.0, color: '#e7fbff', glow: '#66e8ba' });
const contradictionTitle = addText(scene, 'REALITY: THE PLANT WILTS', { width: 26, size: 100, y: 6.5, z: -4.0, color: '#ffe5de', glow: '#ff596d' });
const matchedTitle = addText(scene, 'UPDATED RULE: DRY SOIL → WILT', { width: 28, size: 88, y: 6.5, z: -4.0, color: '#dcfff1', glow: '#51eab3' });

// Soil cutaway and moisture meter expose the previously hidden variable.
const cutaway = new THREE.Group(); scene.add(cutaway);
const earthPanel = mesh(cutaway, new THREE.BoxGeometry(4.8, 1.05, 0.35), 0x65442f, 0.98, false); earthPanel.position.set(0, -3.78, 2.08);
const earthFront = mesh(cutaway, new THREE.BoxGeometry(4.55, 0.12, 0.08), DRY, 0.94, false); earthFront.position.set(0, -4.21, 2.30);
const moistureBack = mesh(cutaway, new THREE.BoxGeometry(0.48, 1.55, 0.24), 0x172635, 0.94, false); moistureBack.position.set(2.95, -3.72, 2.26);
const moistureFill = mesh(cutaway, new THREE.BoxGeometry(0.34, 1.20, 0.14), 0x3daaff, 0.98, true); moistureFill.position.set(2.95, -4.12, 2.42); moistureFill.scale.y = 0.12;
const moistureLabel = addText(cutaway, 'LOW SOIL MOISTURE', { width: 9.2, size: 82, y: -4.82, z: 2.55, color: '#d8f2ff' }); moistureLabel.position.x = 1.25;

const matchedCheck = new THREE.Group(); scene.add(matchedCheck);
beam(matchedCheck, new THREE.Vector3(4.78, 0.12, 3.0), new THREE.Vector3(5.10, -0.20, 3.0), 0.14, GREEN, 0.96);
beam(matchedCheck, new THREE.Vector3(5.10, -0.20, 3.0), new THREE.Vector3(5.82, 0.62, 3.0), 0.14, GREEN, 0.96);

// Exit particles form the next scene's starting field without a hard cut.
const OUT_COUNT = 420;
const outData = [], outPositions = new Float32Array(OUT_COUNT * 3), outColors = new Float32Array(OUT_COUNT * 3);
for (let i = 0; i < OUT_COUNT; i++) {
  const a = rr(0, Math.PI * 2), h = rr(-1, 1), r = Math.sqrt(1 - h * h);
  const source = new THREE.Vector3(Math.cos(a) * r * 1.8, -2.8 + h * 1.4, 1.0 + Math.sin(a) * r * 1.6);
  const end = new THREE.Vector3(rr(-1.15, 1.15), rr(-0.85, 0.85), rr(-0.75, 0.75));
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
  const active = windowAlpha(t, 7.9, 9.72, 0.45, 0.32);
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
function updatePlants(plants, alpha, { wilt = false, dry = false, showRoots = false, time = 0 } = {}) {
  const wiltAmount = typeof wilt === 'number' ? clamp(wilt) : (wilt ? 1 : 0);
  for (const plant of plants) {
    setGroupAlpha(plant.group, alpha);
    plant.roots.visible = showRoots && alpha > 0.01;
    const breeze = Math.sin(time * 1.5) * 0.035 * (1 - wiltAmount);
    plant.group.rotation.y = 0.035 * Math.sin(time * 0.55);
    plant.stem.rotation.z = THREE.MathUtils.lerp(0.04 * Math.sin(time * 1.5) + breeze, -0.50, wiltAmount);
    plant.stem.material.color.copy(HEALTHY_STEM).lerp(DRY_STEM, wiltAmount);
    plant.soil.material.color.setHex(dry ? DRY : SOIL);
    for (let i = 0; i < plant.leaves.length; i++) {
      const leaf = plant.leaves[i];
      leaf.material.color.copy(HEALTHY_LEAF).lerp(DRY_LEAF, wiltAmount);
      const healthyAngle = (i % 2 ? 0.46 : -0.50) + breeze * (i % 2 ? 1 : -1);
      leaf.rotation.z = THREE.MathUtils.lerp(healthyAngle, i % 2 ? 0.90 : -0.86, wiltAmount);
    }
  }
}
function updateExit(t) {
  const start = 30.30, gather = smooth((t - start) / 0.82), p = outGeo.attributes.position.array;
  for (let i = 0; i < OUT_COUNT; i++) {
    const d = outData[i], j = i * 3;
    p[j] = THREE.MathUtils.lerp(d.source.x, d.end.x, gather) + Math.sin(t * 1.3 + d.phase) * 0.10 * gather;
    p[j + 1] = THREE.MathUtils.lerp(d.source.y, d.end.y, gather) + Math.cos(t * 1.1 + d.phase) * 0.10 * gather;
    p[j + 2] = THREE.MathUtils.lerp(d.source.z, d.end.z, gather);
  }
  outGeo.attributes.position.needsUpdate = true;
  outMat.uniforms.uOpacity.value = 0.62 * smooth((t - start) / 0.14);
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
    const end = 9.62;
    const alpha = windowAlpha(t, input.start, end, 0.34, 0.32);
    setGroupAlpha(input.group, alpha);
    setTextAlpha(input.label, alpha);
  }
  if (videoProgress) videoProgress.scale.x = 0.10 + 0.86 * ((t * 0.22) % 1);

  const patternA = windowAlpha(t, 10.0, 16.78, 0.42, 0.26);
  updatePlants(patternPlants, patternA, { time: t });
  setTextAlpha(patternTitle, windowAlpha(t, 10.0, 13.72, 0.22, 0.25));
  setTextAlpha(visibleResult, windowAlpha(t, 10.18, 13.72, 0.28, 0.25));

  const causeA = windowAlpha(t, 13.82, 16.78, 0.44, 0.24);
  setGroupAlpha(rainCause.group, causeA); setGroupAlpha(waterCause.group, causeA);
  for (let i = 0; i < rainCause.drops.length; i++) rainCause.drops[i].position.y = -0.58 - ((t * 1.55 + i * 0.16) % 1.2);
  for (let i = 0; i < waterCause.drops.length; i++) waterCause.drops[i].position.y = 0.58 - ((t * 1.35 + i * 0.18) % 1.0);
  setTextAlpha(rainLabel, causeA); setTextAlpha(waterLabel, causeA);
  setTextAlpha(sameOutcome, windowAlpha(t, 13.92, 16.78, 0.34, 0.24));

  const previewPlantA = 0.92 * windowAlpha(t, 17.08, 21.42, 0.32, 0.38);
  const testA = windowAlpha(t, 21.05, 30.82, 0.42, 0.20);
  const plantA = Math.max(previewPlantA, testA);
  updatePlants([predictedPlant], plantA, { wilt: smooth((t - 28.30) / 0.50), dry: t >= 24.20, time: t });
  setTextAlpha(unfamiliarTitle, windowAlpha(t, 17.08, 20.65, 0.22, 0.34));
  setTextAlpha(predictTitle, windowAlpha(t, 20.98, 24.18, 0.22, 0.32));
  setTextAlpha(predictLabel, windowAlpha(t, 21.00, 28.30, 0.22, 0.16));
  setTextAlpha(hiddenTitle, windowAlpha(t, 24.20, 26.72, 0.34, 0.30));
  setTextAlpha(updateTitle, windowAlpha(t, 26.78, 28.30, 0.32, 0.14));
  setTextAlpha(contradictionTitle, windowAlpha(t, 28.45, 30.08, 0.16, 0.24));
  setTextAlpha(actualLabel, windowAlpha(t, 28.50, 30.08, 0.24, 0.24));
  setGroupAlpha(mismatch, windowAlpha(t, 28.50, 30.08, 0.22, 0.22));

  const hiddenA = windowAlpha(t, 24.20, 30.68, 0.34, 0.15);
  setGroupAlpha(cutaway, hiddenA);
  cutaway.position.y = -0.45 * (1 - smooth((t - 24.20) / 0.65));
  moistureFill.scale.y = 0.09;
  moistureFill.position.y = -4.52 + moistureFill.scale.y * 0.60;

  const matchA = windowAlpha(t, 30.10, 30.76, 0.24, 0.18);
  setGroupAlpha(matchedCheck, matchA);
  setTextAlpha(nextLabel, matchA);
  setTextAlpha(matchedTitle, matchA);

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
