import * as THREE from '../assets/vendor/three.module.js';

// V5 Task 4: Autonomous learning, 01:22–01:50 (28 seconds).
// A literal marble-and-ramp experiment anchors the hypothesis / test / observation / revision loop.
const FPS = 24;
const DURATION = 28.0;
const BLACK = 0x02050b;
const CYAN = 0x55e5ff;
const ICE = 0xe6fbff;
const BLUE = 0x318aff;
const GOLD = 0xffcf72;
const GREEN = 0x74e7ad;
const RED = 0xff3854;
const DARK = 0x132536;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const alphaWindow = (t, start, end, fi = 0.35, fo = 0.35) => smooth((t - start) / fi) * (1 - smooth((t - end) / fo));
let seed = 20261013;
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
const cameraAim = new THREE.Vector3(0, 0.25, 0);
const UP = new THREE.Vector3(0, 1, 0);

function mat(color, opacity = 1, additive = true, depthTest = true) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  m.userData.baseOpacity = opacity;
  return m;
}
function pointMat(size, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uSize: { value: size }, uOpacity: { value: opacity } },
    vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}`,
    fragmentShader: `varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=1.0-smoothstep(0.08,0.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}`,
  });
}
function group(parent, name = '') { const g = new THREE.Group(); g.name = name; parent.add(g); return g; }
function mesh(parent, geometry, color, opacity = 1, additive = true) { const o = new THREE.Mesh(geometry, mat(color, opacity, additive)); parent.add(o); return o; }
function sphere(parent, radius, color, opacity = 1, additive = true, segments = 20) { return mesh(parent, new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments * 0.7))), color, opacity, additive); }
function box(parent, x, y, z, color, dims, opacity = 1, additive = false) { const o = mesh(parent, new THREE.BoxGeometry(...dims), color, opacity, additive); o.position.set(x, y, z); return o; }
function beam(parent, a, b, radius, color, opacity = 0.8, additive = true) {
  const from = a.clone(), to = b.clone(), d = to.clone().sub(from), length = d.length();
  const o = mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 12, 1), color, opacity, additive);
  o.position.copy(from).add(to).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(UP, d.normalize());
  return o;
}
function tube(parent, curve, radius, color, opacity = 0.8) { return mesh(parent, new THREE.TubeGeometry(curve, 56, radius, 10, false), color, opacity, true); }
function setAlpha(g, value) {
  const a = clamp(value);
  g.traverse(o => { if (!o.material) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.opacity = (m.userData.baseOpacity ?? 1) * a; });
}
function text(parent, value, { width = 8, size = 72, color = '#e6fbff', glow = '#55e5ff', x = 0, y = 0, z = 0, weight = 800 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 300;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.lineJoin = 'round'; ctx.shadowColor = glow; ctx.shadowBlur = 20; ctx.strokeStyle = 'rgba(1,5,12,.88)'; ctx.lineWidth = 16;
  ctx.strokeText(value, canvas.width / 2, canvas.height / 2, canvas.width - 60); ctx.fillStyle = color; ctx.fillText(value, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 }); material.userData.baseOpacity = 1;
  const s = new THREE.Sprite(material); s.scale.set(width, width * canvas.height / canvas.width, 1); s.position.set(x, y, z); s.renderOrder = 8; parent.add(s); return s;
}
function textAlpha(s, value) { s.material.opacity = clamp(value); }

// Shared deep-space star volume and the exact particle/camera handoff from Task 3.
let starGeometry = window.__V5_SHARED_STAR_GEOMETRY;
if (!starGeometry) {
  const count = 760, p = new Float32Array(count * 3), c = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { p.set([rr(-42, 42), rr(-25, 25), rr(-120, -24)], i * 3); const q = new THREE.Color(i % 19 === 0 ? 0x78baff : 0x3f91b0); c.set([q.r * 0.46, q.g * 0.46, q.b * 0.46], i * 3); }
  starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); starGeometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
}
const stars = new THREE.Points(starGeometry, pointMat(5.2, 0.78)); scene.add(stars);
let inheritedCamera = new THREE.Vector3(1.4, 0.55, 24.2), inheritedAim = new THREE.Vector3(0, 0.1, 0), inheritedStarRotation = 0.09;

// Four large, readable stages form one tilted 3D path. The physical experiment stays in the center.
const loop = group(scene, 'hypothesis experiment observation revision loop');
loop.scale.set(0.84, 0.82, 0.82);
const nodeDefs = [
  { name: 'HYPOTHESIS', p: new THREE.Vector3(-7.3, 2.4, 2.0), label: new THREE.Vector3(-7.3, 3.48, 2.0) },
  { name: 'EXPERIMENT', p: new THREE.Vector3(0, 5.3, -2.1), label: new THREE.Vector3(0, 6.25, -2.1) },
  { name: 'OBSERVATION', p: new THREE.Vector3(7.3, 2.4, 2.0), label: new THREE.Vector3(7.3, 3.48, 2.0) },
  { name: 'REVISION', p: new THREE.Vector3(0, -4.95, 4.4), label: new THREE.Vector3(0, -6.05, 4.4) },
];
const loopCurve = new THREE.CatmullRomCurve3(nodeDefs.map(d => d.p), true, 'centripetal');
const loopBase = tube(loop, loopCurve, 0.055, 0x153347, 0.62);
const loopGlow = tube(loop, loopCurve, 0.024, CYAN, 0.12);
const loopNodes = nodeDefs.map((d, i) => {
  const g = group(loop, d.name);
  const core = sphere(g, 0.48, i === 2 ? GOLD : CYAN, 0.88, true);
  const halo = mesh(g, new THREE.TorusGeometry(0.78, 0.09, 12, 48), i === 2 ? GOLD : CYAN, 0.42, true); halo.rotation.x = 0.12;
  const cap = sphere(g, 0.19, ICE, 0.95, true); cap.position.z = 0.32;
  g.position.copy(d.p);
  const label = text(g, d.name, { width: 6.1, size: 112, color: '#d9f8ff', glow: '#55e5ff', x: d.label.x - d.p.x, y: d.label.y - d.p.y, z: 0.1 });
  return { group: g, core, halo, label };
});
const loopPulse = group(scene, 'learning loop signal');
sphere(loopPulse, 0.34, ICE, 1, true, 24); sphere(loopPulse, 0.56, CYAN, 0.16, true, 20);

// Concrete experiment: a ball, a ramp, a visible target, and one variable changed after failure.
const rig = group(scene, 'marble ramp test');
rig.scale.setScalar(1.2);
box(rig, 0, -3.55, 0, 0x102233, [13.5, 0.54, 5.2], 0.92, false);
box(rig, 0, -3.85, 0, 0x08131d, [14.0, 0.18, 5.6], 0.9, false);
const rampPivot = group(rig, 'adjustable ramp'); rampPivot.position.set(-4.5, 0.72, 0.2);
const rampDeck = box(rampPivot, 3.62, 0, 0, 0x315a77, [7.25, 0.28, 1.65], 0.98, false); rampDeck.material.color.setHex(0x23445c);
const rampTop = box(rampPivot, 3.62, 0.18, 0, 0x63dfff, [7.05, 0.07, 1.34], 0.9, true);
for (const side of [-0.78, 0.78]) { const rail = box(rampPivot, 3.62, 0.38, side, CYAN, [7.18, 0.16, 0.11], 0.88, true); rail.rotation.z = 0; }
rampPivot.rotation.z = -0.22;
const startMarker = sphere(rig, 0.18, ICE, 0.9, true); startMarker.position.set(-4.2, 1.28, 0.48);
const targetRing = mesh(rig, new THREE.TorusGeometry(0.58, 0.13, 12, 48), GREEN, 0.9, true); targetRing.rotation.x = 0.08;
const targetCore = sphere(rig, 0.12, GREEN, 0.86, true); const targetFlag = box(rig, 0, 0, 0, GREEN, [0.12, 1.0, 0.12], 0.75, true);
const marble = group(rig, 'test marble'); const marbleCore = sphere(marble, 0.64, 0xf6fbff, 0.98, true, 28); sphere(marble, 0.90, CYAN, 0.16, true, 24);
const expectedDots = [];
for (let i = 0; i < 14; i++) { const d = sphere(rig, 0.085, CYAN, 0.68, true, 12); expectedDots.push(d); }
const actualDots = [];
for (let i = 0; i < 8; i++) { const d = sphere(rig, 0.075, GOLD, 0.0, true, 12); actualDots.push(d); }
const failX = group(rig, 'missed target');
for (const angle of [Math.PI / 4, -Math.PI / 4]) { const bar = box(failX, 0, 0, 0, RED, [0.18, 1.0, 0.18], 0.9, true); bar.rotation.z = angle; }
const markLight = sphere(rig, 0.2, RED, 0.0, true); const targetPost = box(rig, 0, 0, 0, 0x396078, [0.1, 0.82, 0.1], 0.8, false);

function rampPoint(progress, angle) {
  return new THREE.Vector3(-4.5 + 7.25 * progress * Math.cos(angle), 0.72 + 7.25 * progress * Math.sin(angle) + 0.48, 0.52);
}
function setTarget(angle) {
  const p = rampPoint(0.83, angle); targetRing.position.copy(p); targetCore.position.copy(p); targetPost.position.set(p.x, p.y - 0.36, p.z - 0.16); targetFlag.position.set(p.x + 0.5, p.y + 0.46, p.z);
}
setTarget(-0.22);

// A small notebook stores observed outcomes; it never competes with the active experiment.
const logbook = group(scene, 'persistent experiment log');
const logCover = box(logbook, 0, 0, 0, 0x173044, [5.6, 3.8, 0.36], 0.92, false);
const logSpine = box(logbook, -2.57, 0, 0.22, CYAN, [0.16, 3.45, 0.08], 0.85, true);
const logTitle = text(logbook, 'TRIAL RECORD', { width: 5.6, size: 104, x: 0.05, y: 1.24, z: 0.38 });
const row1 = text(logbook, '01   SHORT', { width: 4.8, size: 104, color: '#ff9aa9', glow: '#ff3854', x: 0.18, y: 0.26, z: 0.4 });
const row2 = text(logbook, '02   REACHED', { width: 5.0, size: 104, color: '#b7ffe0', glow: '#74e7ad', x: 0.1, y: -0.68, z: 0.4 });
const row3 = text(logbook, '03   DRIFTED', { width: 5.0, size: 104, color: '#ffd88b', glow: '#ffcf72', x: 0.12, y: -1.62, z: 0.4 });
logbook.position.set(8.6, -1.0, 4.0); logbook.rotation.y = -0.18; logbook.rotation.z = -0.08;

// Three tangible candidate tests branch from the next-investigation decision.
const choices = [];
function choiceOption(label, y, kind) {
  const g = group(scene, `candidate test ${label}`); g.position.set(10.1, y, 4.2);
  const panel = box(g, 0, 0, 0, 0x112334, [3.7, 1.72, 0.22], 0.9, false);
  const rim = mesh(g, new THREE.BoxGeometry(3.86, 1.88, 0.10), CYAN, 0.72, true); rim.material.wireframe = false; rim.material.opacity = 0.14;
  if (kind === 'slope') { const plank = box(g, -0.2, -0.05, 0.28, 0x5adcf5, [1.72, 0.20, 0.72], 0.92, false); plank.rotation.z = -0.42; }
  if (kind === 'surface') { box(g, -0.20, -0.25, 0.28, 0x315a77, [1.75, 0.18, 0.88], 0.95, false); for (let j = 0; j < 4; j++) box(g, -0.82 + j * 0.40, -0.10, 0.38, GOLD, [0.10, 0.28, 0.78], 0.9, true); }
  if (kind === 'mass') { sphere(g, 0.32, ICE, 0.96, true, 20).position.set(-0.48, -0.02, 0.36); sphere(g, 0.52, GOLD, 0.96, true, 20).position.set(0.48, -0.02, 0.36); }
  const labelSprite = text(g, label, { width: 3.4, size: 102, x: 0, y: -0.60, z: 0.46 });
  choices.push({ group: g, panel, rim, label: labelSprite, selected: kind === 'surface' });
}
choiceOption('SLOPE', 3.25, 'slope'); choiceOption('SURFACE', 0.0, 'surface'); choiceOption('MASS', -3.25, 'mass');
const branchPulses = choices.map(() => sphere(scene, 0.22, ICE, 0.95, true, 18));
const branchRoutes = choices.map(c => {
  const start = nodeDefs[2].p.clone().multiply(loop.scale);
  const end = c.group.position.clone().add(new THREE.Vector3(0, 0, 0.5));
  const mid = start.clone().lerp(end, 0.56).add(new THREE.Vector3(0.35, 0, 0.8));
  return tube(scene, new THREE.CatmullRomCurve3([start, mid, end]), 0.045, CYAN, 0.34);
});

// A visibly different, still-unresolved unfamiliar test approaches the loop at the end.
const unknownCase = group(scene, 'unfamiliar case'); unknownCase.position.set(9.6, -0.2, 5.3); unknownCase.scale.setScalar(1.16);
box(unknownCase, 0, -1.05, 0, 0x26384a, [3.5, 0.32, 1.55], 0.88, false);
const oddRamp = box(unknownCase, -0.45, -0.05, 0, 0x40627a, [2.5, 0.24, 0.74], 0.92, false); oddRamp.rotation.z = 0.34;
const unknownBall = sphere(unknownCase, 0.45, GOLD, 0.96, true, 24); unknownBall.position.set(-1.12, 0.78, 0.35);
const unknownBlock = box(unknownCase, 0.85, -0.02, 0.38, RED, [0.70, 0.94, 0.64], 0.9, true);
const unknownLabel = text(unknownCase, 'UNFAMILIAR CASE', { width: 6.1, size: 70, color: '#ffe0a4', glow: '#ffcf72', x: 0, y: 1.65, z: 0.5 });

// A compact visual intake contrasts passive information with active experimentation.
const intake = group(scene, 'information archive'); intake.position.set(-10.3, -0.5, 3.6);
for (let i = 0; i < 3; i++) { const page = box(intake, i * 0.18, 0.06 + i * 0.10, i * 0.05, 0x1b3e55, [2.4, 2.55, 0.12], 0.86, false); page.rotation.z = -0.04 * i; for (let r = 0; r < 4; r++) box(intake, -0.12 + i * 0.18, 0.60 - r * 0.38 + i * 0.1, 0.12 + i * 0.05, r % 2 ? CYAN : BLUE, [1.38 - (r % 2) * 0.14, 0.075, 0.035], 0.76, true); }
const intakeLabel = text(intake, 'INFORMATION', { width: 3.5, size: 48, x: 0.15, y: -1.65, z: 0.5 });
const intakeBits = [];
for (let i = 0; i < 24; i++) { const b = sphere(scene, rr(0.07, 0.13), i % 3 ? BLUE : CYAN, 0.82, true, 12); intakeBits.push({ mesh: b, phase: i / 24, offset: rr(-0.55, 0.55) }); }

const headlines = {
  information: text(scene, 'INFORMATION ISN’T ENOUGH', { width: 15.0, size: 74, y: 7.72 }),
  hypothesis: text(scene, 'PREDICT: REACH THE MARK', { width: 13.4, size: 70, y: 7.72 }),
  failure: text(scene, 'THE BALL FALLS SHORT', { width: 13.6, size: 74, color: '#ffd9df', glow: '#ff3854', y: 7.72 }),
  revision: text(scene, 'RAISE THE RAMP · RETEST', { width: 14.0, size: 70, color: '#e6fbff', glow: '#55e5ff', y: 7.72 }),
  ai: text(scene, 'AI CAN DO PARTS', { width: 11.6, size: 76, y: 7.72 }),
  lasting: text(scene, 'DOES LEARNING LAST?', { width: 13.2, size: 74, color: '#ffe5b1', glow: '#ffcf72', y: 7.72 }),
  next: text(scene, 'WHAT SHOULD IT TEST NEXT?', { width: 15.0, size: 70, y: 7.72 }),
  correct: text(scene, 'CAN IT CORRECT ITS OWN ERROR?', { width: 16.0, size: 66, color: '#ffd9df', glow: '#ff3854', y: 7.72 }),
  challenge: text(scene, 'A NEW CASE · THE LOOP PAUSES', { width: 16.0, size: 66, color: '#ffe5b1', glow: '#ffcf72', y: 7.72 }),
};

// Particle cloud that inherits Task 3's exact final positions, colors and camera state.
const IN_COUNT = 420, inPositions = new Float32Array(IN_COUNT * 3), inSource = new Float32Array(IN_COUNT * 3), inTarget = new Float32Array(IN_COUNT * 3), inColors = new Float32Array(IN_COUNT * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPositions, 3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColors, 3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 180);
const inMat = pointMat(5.4, 0.84), incoming = new THREE.Points(inGeo, inMat); scene.add(incoming);
for (let i = 0; i < IN_COUNT; i++) { const a = i / IN_COUNT * Math.PI * 2, r = 4.3 + 1.4 * Math.sin(i * 0.17); inTarget.set([Math.cos(a) * r, Math.sin(a) * r * 0.64, Math.sin(a * 2.0) * 3.2], i * 3); inSource.set([rr(-12, 12), rr(-8, 8), rr(-8, 8)], i * 3); inPositions.set(inSource.subarray(i * 3, i * 3 + 3), i * 3); const c = new THREE.Color(i % 3 === 0 ? CYAN : i % 3 === 1 ? BLUE : GOLD); inColors.set([c.r, c.g, c.b], i * 3); }
let incomingReady = false;
function prepareIncoming() {
  if (incomingReady) return;
  const field = window.__V5_WORLD_EXIT_FIELD;
  if (!field || !field.positions || !field.colors || !field.count) return;
  for (let i = 0; i < IN_COUNT; i++) { const si = Math.floor((i + 0.5) * field.count / IN_COUNT) * 3, j = i * 3; inSource[j] = field.positions[si]; inSource[j + 1] = field.positions[si + 1]; inSource[j + 2] = field.positions[si + 2]; inPositions[j] = inSource[j]; inPositions[j + 1] = inSource[j + 1]; inPositions[j + 2] = inSource[j + 2]; inColors[j] = field.colors[si]; inColors[j + 1] = field.colors[si + 1]; inColors[j + 2] = field.colors[si + 2]; }
  inGeo.attributes.position.needsUpdate = true; inGeo.attributes.color.needsUpdate = true;
  inheritedCamera.copy(field.cameraPosition || inheritedCamera); inheritedAim.copy(field.cameraTarget || inheritedAim); inheritedStarRotation = Number.isFinite(field.starRotationY) ? field.starRotationY : inheritedStarRotation; incomingReady = true;
}

const OUT_COUNT = 420, outPos = new Float32Array(OUT_COUNT * 3), outColors = new Float32Array(OUT_COUNT * 3), outData = [];
const outGeo = new THREE.BufferGeometry(); outGeo.setAttribute('position', new THREE.BufferAttribute(outPos, 3).setUsage(THREE.DynamicDrawUsage)); outGeo.setAttribute('color', new THREE.BufferAttribute(outColors, 3)); outGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 180);
const outMat = pointMat(5.2, 0.68), outgoing = new THREE.Points(outGeo, outMat); scene.add(outgoing);
for (let i = 0; i < OUT_COUNT; i++) { const u = i / OUT_COUNT, p = loopCurve.getPointAt(u); outData.push({ source: p.clone().add(new THREE.Vector3(rr(-2.5, 2.5), rr(-2.3, 2.3), rr(-1.0, 1.0))), end: new THREE.Vector3(rr(-24, 24), rr(-14, 14), rr(-12, 12)) }); const c = new THREE.Color(i % 4 === 0 ? GOLD : i % 3 === 0 ? GREEN : CYAN); outColors.set([c.r, c.g, c.b], i * 3); }

function stageWeights(t) {
  const pulse = [0, 0, 0, 0];
  const windows = [[6.4, 7.95], [8.0, 9.55], [9.55, 11.25], [11.15, 13.22]];
  for (let i = 0; i < 4; i++) pulse[i] = 0.18 + 0.82 * alphaWindow(t, windows[i][0], windows[i][1], 0.22, 0.22);
  if (t >= 13.25 && t < 16.95) pulse[0] = 0.95;
  if (t >= 13.25 && t < 16.95) pulse[1] = 0.95 * (0.5 + 0.5 * Math.sin(t * 2.2));
  if (t >= 13.25 && t < 16.95) pulse[2] = 0.8;
  if (t >= 13.25 && t < 16.95) pulse[3] = 0.13; // AI completes some, not all, of the loop.
  if (t >= 17.4 && t < 20.95) for (let i = 0; i < 4; i++) pulse[i] = 0.4 + 0.58 * (0.5 + 0.5 * Math.sin(t * 2.1 - i * 1.4));
  if (t >= 21.15 && t < 23.65) { pulse[0] = 0.48; pulse[1] = 0.66; pulse[2] = 0.92; pulse[3] = 0.3; }
  if (t >= 23.65) { pulse[0] = 0.3; pulse[1] = 0.18; pulse[2] = 0.78; pulse[3] = 0.14; }
  return pulse;
}
function updateIncoming(t) {
  const form = smooth(t / 3.25), p = inGeo.attributes.position.array;
  for (let i = 0; i < IN_COUNT; i++) { const j = i * 3, q = form; p[j] = THREE.MathUtils.lerp(inSource[j], inTarget[j], q); p[j + 1] = THREE.MathUtils.lerp(inSource[j + 1], inTarget[j + 1], q); p[j + 2] = THREE.MathUtils.lerp(inSource[j + 2], inTarget[j + 2], q); }
  inGeo.attributes.position.needsUpdate = true; inMat.uniforms.uOpacity.value = 0.82 * (1 - smooth((t - 2.6) / 1.05));
}
function updateRig(t, rigAlpha) {
  const angleMix = smooth((t - 11.42) / 0.72), angle = THREE.MathUtils.lerp(-0.22, -0.36, angleMix);
  rampPivot.rotation.z = angle; setTarget(angle);
  const firstRun = smooth((t - 8.02) / 1.36), secondRun = smooth((t - 12.02) / 0.98);
  const firstP = Math.min(0.35, firstRun * 0.35), secondP = 0.83 * secondRun;
  const reset = smooth((t - 11.40) / 0.62);
  let progress = t < 11.42 ? firstP : THREE.MathUtils.lerp(0.35, secondP, reset);
  if (t > 13.0) progress = 0.83;
  const repeatFailure = alphaWindow(t, 23.72, 26.08, 0.18, 0.22);
  if (repeatFailure > 0) progress = THREE.MathUtils.lerp(0.83, 0.35, smooth((t - 23.72) / 0.55));
  const ballA = Math.max(alphaWindow(t, 6.2, 16.75, 0.3, 0.55), repeatFailure);
  marble.visible = ballA > 0.005; marble.position.copy(rampPoint(progress, angle));
  marble.rotation.x = t * 2.1; marble.rotation.z = -angle + Math.sin(t * 4.2) * 0.03;
  const mismatch = (t >= 9.55 && t < 11.4) || repeatFailure > 0.08;
  targetRing.material.color.setHex(mismatch ? RED : GREEN);
  targetCore.material.color.setHex(mismatch ? RED : GREEN);
  const tp = rampPoint(0.83, angle); markLight.position.copy(tp); markLight.material.opacity = rigAlpha * (mismatch ? 0.9 * repeatFailure + (t >= 9.55 && t < 11.4 ? 0.9 : 0) : 0.0);
  const postTop = tp.clone().add(new THREE.Vector3(0.55, 0.46, -0.15)); targetFlag.position.copy(postTop); failX.position.copy(tp).add(new THREE.Vector3(0.45, 0.65, 0.35));
  const predictedA = alphaWindow(t, 6.45, 9.6, 0.32, 0.28);
  for (let i = 0; i < expectedDots.length; i++) { const u = (i + 1) / (expectedDots.length + 1), pt = rampPoint(0.83 * u, angle); expectedDots[i].position.copy(pt); expectedDots[i].position.y += 0.34; expectedDots[i].material.opacity = 0.72 * predictedA; }
  const failA = Math.max(alphaWindow(t, 9.55, 11.45, 0.18, 0.22), repeatFailure);
  failX.material && (failX.visible = failA > 0.02); failX.traverse(o => { if (o.material) o.material.opacity = (o.material.userData.baseOpacity ?? 1) * failA; });
  for (let i = 0; i < actualDots.length; i++) { const u = (i + 1) / (actualDots.length + 1) * 0.35, pt = rampPoint(u, angle); actualDots[i].position.copy(pt); actualDots[i].position.y += 0.34; actualDots[i].material.opacity = 0.75 * failA; }
  const revisedA = alphaWindow(t, 11.35, 13.25, 0.22, 0.3);
  targetRing.material.opacity = 0.9 * ballA * rigAlpha; targetCore.material.opacity = 0.86 * ballA * rigAlpha; targetFlag.material.opacity = 0.75 * ballA * rigAlpha;
  // The physical fulcrum rises as the hypothesis is revised.
  const supportY = THREE.MathUtils.lerp(-0.15, -0.60, angleMix);
  supportBase.position.set(-1.55, supportY, 0.08); supportBase.material.opacity = 0.92 * rigAlpha;
  supportFoot.position.set(-1.55, supportY - 0.19, 0.08); supportFoot.material.opacity = 0.76 * rigAlpha;
  if (revisedA > 0.01 && t > 12.0) { const a = rampPoint(0.83, angle); targetRing.material.color.setHex(GREEN); targetCore.material.color.setHex(GREEN); }
  return { angle, ballA, firstRun, secondRun, failA, predictedA };
}
const supportBase = box(rig, -1.55, -0.15, 0.08, 0x355a72, [1.05, 0.35, 1.15], 0.92, false);
const supportFoot = box(rig, -1.55, -0.34, 0.08, CYAN, [1.28, 0.12, 1.34], 0.76, true);

function updateChoices(t) {
  const a = alphaWindow(t, 21.18, 23.7, 0.25, 0.28);
  const obs = nodeDefs[2].p.clone().multiply(loop.scale);
  const u = smooth((t - 21.3) / 1.5);
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i], selected = c.selected;
    setAlpha(c.group, a * (selected ? 1 : 0.72));
    c.rim.material.color.setHex(selected ? CYAN : 0x436075);
    c.rim.material.opacity = a * (selected ? 0.16 : 0.09);
    c.panel.material.color.setHex(selected ? 0x173b50 : 0x112334);
    const dest = c.group.position.clone().add(new THREE.Vector3(0, 0, 1.0));
    const mid = obs.clone().lerp(dest, u).add(new THREE.Vector3(0.35, 0, 0.8 * Math.sin(u * Math.PI)));
    const pulse = branchPulses[i]; pulse.position.copy(mid); pulse.material.opacity = a * (selected ? 0.95 : 0.28);
    setAlpha(branchRoutes[i], a * (selected ? 0.72 : 0.24));
  }
}
function updateCamera(t) {
  if (t < 3.4) {
    const u = smooth(t / 3.4); camera.position.copy(inheritedCamera).lerp(new THREE.Vector3(0, 0.35, 28.8), u); cameraAim.copy(inheritedAim).lerp(new THREE.Vector3(0, 0.0, 0), u);
  } else if (t < 13.3) {
    const q = t - 3.4; camera.position.set(Math.sin(q * 0.16) * 1.15, 0.2 + Math.sin(q * 0.22) * 0.3, 26.5 - smooth(q / 10) * 0.8); cameraAim.set(0, 0, 0);
  } else if (t < 21.2) {
    const q = t - 13.3; camera.position.set(1.1 + Math.sin(q * 0.19) * 1.45, 0.25 + Math.sin(q * 0.18) * 0.34, 25.7 - smooth(q / 8) * 0.6); cameraAim.set(0.35, 0.1, 0.3);
  } else {
    const u = smooth((t - 21.2) / 5.8); camera.position.set(1.2 + u * 1.6 + Math.sin(t * 0.16) * 0.4, 0.2, 25.0 - 0.25 * u); cameraAim.set(0.6 + u * 1.0, 0, 0.5);
  }
  stars.rotation.y = inheritedStarRotation + t * 0.0012; stars.rotation.x = Math.sin(t * 0.055) * 0.008;
}
function renderFrame(frame) {
  const t = clamp(Number(frame) / FPS, 0, DURATION); prepareIncoming(); updateIncoming(t);
  const loopA = alphaWindow(t, 2.35, 27.28, 0.65, 0.55);
  setAlpha(loop, loopA);
  const weights = stageWeights(t);
  for (let i = 0; i < loopNodes.length; i++) { const w = weights[i]; loopNodes[i].core.material.color.setHex(i === 2 && t > 9.5 && t < 11.4 ? RED : (i === 2 && t > 17.4 ? GOLD : CYAN)); loopNodes[i].halo.material.color.copy(loopNodes[i].core.material.color); setAlpha(loopNodes[i].group, loopA * w); }
  const partial = t >= 13.25 && t < 16.95;
  loopGlow.material.opacity = (partial ? 0.25 : 0.5) * loopA;
  const progress = t < 6.4 ? 0 : t < 13.25 ? clamp((t - 6.4) / 6.85) : t < 17.4 ? clamp((t - 13.25) / 3.7) : (t - 17.4) * 0.42;
  const pulsePoint = loopCurve.getPointAt(((progress % 1) + 1) % 1).multiply(loop.scale); loopPulse.position.copy(pulsePoint); setAlpha(loopPulse, loopA * (partial ? (progress % 1 < 0.73 ? 0.95 : 0.08) : 0.9));

  const intakeA = alphaWindow(t, 3.35, 6.55, 0.35, 0.3); setAlpha(intake, intakeA);
  for (const d of intakeBits) { const q = (d.phase + t * 0.42) % 1; d.mesh.position.set(-13.1 + q * 2.45, -0.25 + d.offset + Math.sin(q * 6 + d.phase * 5) * 0.34, 3.4 + Math.sin(q * Math.PI * 2) * 0.55); d.mesh.material.opacity = 0.78 * intakeA; }
  const rigA = alphaWindow(t, 4.8, 26.85, 0.65, 0.55); setAlpha(rig, rigA); const rigState = updateRig(t, rigA);
  const bookAlpha = alphaWindow(t, 17.35, 21.08, 0.42, 0.35); setAlpha(logbook, bookAlpha); textAlpha(logTitle, bookAlpha); textAlpha(row1, bookAlpha); textAlpha(row2, bookAlpha); textAlpha(row3, bookAlpha);
  // A third, inconsistent later trial makes the long-term retention problem visible.
  if (t > 19.55) { row3.material.color.set('#ffe0a4'); }
  updateChoices(t);
  const unknownA = alphaWindow(t, 26.0, 28.25, 0.38, 0.42); setAlpha(unknownCase, unknownA);
  const unknownPulse = smooth((t - 26.45) / 0.8); unknownBall.position.x = -1.12 + unknownPulse * 0.7; unknownBlock.material.color.setHex(t > 26.95 ? RED : 0x6d92a7);

  textAlpha(headlines.information, alphaWindow(t, 3.35, 6.25, 0.25, 0.22));
  textAlpha(headlines.hypothesis, alphaWindow(t, 6.42, 9.52, 0.22, 0.24));
  textAlpha(headlines.failure, alphaWindow(t, 9.55, 11.4, 0.16, 0.20));
  textAlpha(headlines.revision, alphaWindow(t, 11.36, 13.18, 0.20, 0.22));
  textAlpha(headlines.ai, alphaWindow(t, 13.26, 16.95, 0.25, 0.26));
  textAlpha(headlines.lasting, alphaWindow(t, 17.38, 21.03, 0.24, 0.28));
  textAlpha(headlines.next, alphaWindow(t, 21.18, 23.68, 0.22, 0.24));
  textAlpha(headlines.correct, alphaWindow(t, 23.72, 26.12, 0.22, 0.24));
  textAlpha(headlines.challenge, alphaWindow(t, 26.12, 28.25, 0.24, 0.42));

  const outStart = 27.08, spread = smooth((t - outStart) / 0.75), op = smooth((t - outStart) / 0.18), out = outGeo.attributes.position.array;
  for (let i = 0; i < OUT_COUNT; i++) { const d = outData[i], j = i * 3; out[j] = THREE.MathUtils.lerp(d.source.x, d.end.x, spread); out[j + 1] = THREE.MathUtils.lerp(d.source.y, d.end.y, spread); out[j + 2] = THREE.MathUtils.lerp(d.source.z, d.end.z, spread); }
  outGeo.attributes.position.needsUpdate = true; outMat.uniforms.uOpacity.value = 0.64 * op;
  updateCamera(t); renderer.render(scene, camera); window.__sceneTime = t;
  if (t >= DURATION - 1 / FPS) window.__V5_LEARNING_EXIT_FIELD = { count: OUT_COUNT, positions: new Float32Array(outPos), colors: new Float32Array(outColors), cameraPosition: camera.position.clone(), cameraTarget: cameraAim.clone(), starRotationY: stars.rotation.y };
}
function resize() {
  const width = Math.max(1, host.clientWidth || window.innerWidth), height = Math.max(1, host.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); if (standalone) renderFrame(Math.round((window.__playerTime || 0) * FPS));
}
if (standalone) { window.renderFrame = renderFrame; window.__sceneReady = true; window.addEventListener('resize', resize); resize(); renderFrame(0); window.dispatchEvent(new Event('v5scene-ready')); }
export { renderFrame, resize };
