import * as THREE from '../assets/vendor/three.module.js';

// V5 Task 2: connected reasoning and error propagation, 00:22.2–00:45.6.
// The clip-local media time is the deterministic animation clock.
const FPS = 24;
const DURATION = 23.4; // Includes the final 0.6 s needed to complete the spoken sentence.
const BLACK = 0x02050b;
const CYAN = 0x55e5ff;
const ICE = 0xe6fbff;
const BLUE = 0x318aff;
const GOLD = 0xffcf72;
const RED = 0xff3854;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
function windowFade(t, start, fadeIn, end, fadeOut) {
  return smooth((t - start) / fadeIn) * (1 - smooth((t - end) / fadeOut));
}
let seed = 20261013;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const rr = (a, b) => a + (b - a) * random();

const host = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(BLACK, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(BLACK);
scene.fog = new THREE.FogExp2(BLACK, 0.0045);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 260);
scene.add(camera);

function basicMaterial(color, opacity = 1, additive = true) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
}
function glowPointsMaterial(size, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uSize: { value: size }, uOpacity: { value: opacity } },
    vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}`,
    fragmentShader: `varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=1.0-smoothstep(0.08,0.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}`,
  });
}
function addText(parent, text, { width = 24, y = 5.9, z = -24, size = 92, color = '#e6fbff', glow = '#55e5ff', weight = 800 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 260;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.lineJoin = 'round'; ctx.shadowColor = glow; ctx.shadowBlur = 22;
  ctx.strokeStyle = 'rgba(1, 5, 12, 0.72)'; ctx.lineWidth = 14;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 60);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sprite.position.set(0, y, z); sprite.scale.set(width, width * canvas.height / canvas.width, 1);
  sprite.material.opacity = 0; sprite.renderOrder = 6; sprite.userData.baseScale = sprite.scale.clone();
  parent.add(sprite);
  return sprite;
}

// A deep star field establishes foreground, middle distance, and a far plane.
const STAR_COUNT = 680;
const starPos = new Float32Array(STAR_COUNT * 3);
const starCol = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  starPos[i * 3] = rr(-38, 38); starPos[i * 3 + 1] = rr(-23, 23); starPos[i * 3 + 2] = rr(-86, -30);
  const c = new THREE.Color(i % 13 === 0 ? 0x78baff : 0x3f91b0);
  starCol.set([c.r, c.g, c.b], i * 3);
}
const starsGeo = new THREE.BufferGeometry();
starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starsGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
const stars = new THREE.Points(starsGeo, glowPointsMaterial(2.6, 0.42)); scene.add(stars);

// Five levels: the first three build under the opening claim; the last two
// grow into frame when the narration moves to dozens of dependent decisions.
const nodes = [];
const levelOffsets = [0, 1, 3, 7, 15];
const levelWidths = [0, 7, 13, 19, 22];
const nodePositions = [];
for (let depth = 0; depth <= 4; depth++) {
  const count = 2 ** depth;
  for (let local = 0; local < count; local++) {
    const index = levelOffsets[depth] + local;
    const x = depth === 0 ? 0 : (local / (count - 1) - 0.5) * levelWidths[depth];
    const y = 3.25 - depth * 1.68;
    const lateral = depth ? local / (count - 1) * 2 - 1 : 0;
    const z = depth * 0.24 + lateral * depth * 1.45 + Math.sin(local * 1.71 + depth) * 0.38;
    const pos = new THREE.Vector3(x, y, z);
    const parent = depth === 0 ? -1 : Math.floor((index - 1) / 2);
    nodePositions[index] = pos;
    nodes[index] = { index, depth, local, parent, pos, reveal: 0, corrupt: 0, color: new THREE.Color(), core: null, halo: null };
  }
}
const network = new THREE.Group(); scene.add(network);
for (const node of nodes) {
  const r = node.depth === 0 ? 0.23 : 0.15 - node.depth * 0.008;
  node.core = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), basicMaterial(CYAN, 0.92));
  node.core.position.copy(node.pos); network.add(node.core);
  node.halo = new THREE.Mesh(new THREE.TorusGeometry(r * 1.8, 0.026, 8, 32), basicMaterial(CYAN, 0.44));
  node.halo.position.copy(node.pos); node.halo.rotation.set(0.55 + node.depth * 0.12, 0.35 * node.local, 0.2); network.add(node.halo);
}
const edges = [];
const UP = new THREE.Vector3(0, 1, 0);
for (const node of nodes) {
  if (node.parent < 0) continue;
  const from = nodePositions[node.parent], to = node.pos;
  const direction = to.clone().sub(from); const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 1, 9, 1), basicMaterial(CYAN, 0.48));
  mesh.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
  mesh.visible = false; network.add(mesh);
  edges.push({ parent: node.parent, child: node.index, from, direction: direction.normalize(), length, mesh, color: new THREE.Color() });
}

// The outgoing red/cyan particles from the previous scene become actual tree nodes.
const TRANSITION_COUNT = 520;
const transitionData = [];
const transitionPositions = new Float32Array(TRANSITION_COUNT * 3);
const transitionColors = new Float32Array(TRANSITION_COUNT * 3);
const startColor = new THREE.Color(RED), settleColor = new THREE.Color(CYAN);
const particleColor = new THREE.Color();
const cyanColor = new THREE.Color(CYAN), blueColor = new THREE.Color(BLUE), goldColor = new THREE.Color(GOLD), redColor = new THREE.Color(RED);
for (let i = 0; i < TRANSITION_COUNT; i++) {
  const targetIndex = Math.floor(random() * 7); // isolated answer points first connect the shallow reasoning tree
  const start = new THREE.Vector3(rr(-20, 20), rr(-12, 12), rr(8, 29));
  const target = nodes[targetIndex].pos.clone().add(new THREE.Vector3(rr(-0.42, 0.42), rr(-0.42, 0.42), rr(-0.42, 0.42)));
  const delay = rr(0, 0.48);
  transitionData.push({ start, target, delay, duration: rr(0.52, 0.90), phase: rr(0, Math.PI * 2) });
  transitionPositions.set([start.x, start.y, start.z], i * 3);
  transitionColors.set([startColor.r, startColor.g, startColor.b], i * 3);
}
const transitionGeo = new THREE.BufferGeometry();
transitionGeo.setAttribute('position', new THREE.BufferAttribute(transitionPositions, 3));
transitionGeo.setAttribute('color', new THREE.BufferAttribute(transitionColors, 3));
const transitionMat = glowPointsMaterial(6.0, 0.0);
const transitionCloud = new THREE.Points(transitionGeo, transitionMat); scene.add(transitionCloud);

const signal = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), basicMaterial(ICE, 0.98));
const signalHalo = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), basicMaterial(CYAN, 0.2));
signal.add(signalHalo); signal.visible = false; network.add(signal);
const errorPulse = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), basicMaterial(RED, 0.98));
const errorHalo = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 12), basicMaterial(RED, 0.22));
errorPulse.add(errorHalo); errorPulse.visible = false; network.add(errorPulse);
const errorRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 48), basicMaterial(RED, 0));
errorRing.visible = false; network.add(errorRing);

// Soft, camera-locked title treatment; the 3D reasoning tree remains the subject.
const titleLayer = new THREE.Group(); camera.add(titleLayer);
const shadeCanvas = document.createElement('canvas'); shadeCanvas.width = 1024; shadeCanvas.height = 256;
const shadeCtx = shadeCanvas.getContext('2d'); shadeCtx.save(); shadeCtx.translate(512, 128); shadeCtx.scale(1, 0.25);
const shade = shadeCtx.createRadialGradient(0, 0, 20, 0, 0, 620);
shade.addColorStop(0, 'rgba(0,0,0,0.72)'); shade.addColorStop(0.55, 'rgba(0,0,0,0.38)'); shade.addColorStop(1, 'rgba(0,0,0,0)');
shadeCtx.fillStyle = shade; shadeCtx.fillRect(-640, -640, 1280, 1280); shadeCtx.restore();
const titleScrim = new THREE.Mesh(new THREE.PlaneGeometry(27, 4.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadeCanvas), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
titleScrim.position.set(0, 5.8, -23.85); titleScrim.renderOrder = 5; titleLayer.add(titleScrim);
const titleAnswers = addText(titleLayer, 'ANSWERS ≠ RELIABLE REASONING', { width: 24.5, y: 5.8, z: -24, size: 92, color: '#e6fbff', glow: '#49dfff' });
const titleSteps = addText(titleLayer, 'DOZENS OF DEPENDENT STEPS', { width: 24.5, y: 5.8, z: -24, size: 92, color: '#e6fbff', glow: '#49dfff' });
const titleError = addText(titleLayer, 'ONE SMALL ERROR → WRONG RESULT', { width: 24.5, y: 5.8, z: -24, size: 88, color: '#ff5369', glow: '#ff2347' });
const titleReliability = addText(titleLayer, 'ONE RIGHT ANSWER ≠ RELIABILITY', { width: 24.5, y: 5.8, z: -24, size: 86, color: '#ffe0a1', glow: '#ffbd50' });
const titlePhases = [
  { sprite: titleAnswers, start: 0.35, in: 0.55, end: 7.40, out: 0.48 },
  { sprite: titleSteps, start: 7.88, in: 0.45, end: 14.55, out: 0.38 },
  { sprite: titleError, start: 14.96, in: 0.22, end: 18.78, out: 0.32 },
  { sprite: titleReliability, start: 19.10, in: 0.28, end: 23.05, out: 0.35 },
];

const corruptRoot = 6;
const corruptSet = new Set([6, 13, 14, 27, 28, 29, 30]);
const signalPath = [0, 2, 6, 14, 30];
const correctLeaf = 20;
function revealFor(node, t) {
  let start, finish;
  if (node.depth === 0) { start = 0.28; finish = 0.82; }
  else if (node.depth <= 2) { start = 0.42 + node.depth * 0.28 + node.local * 0.035; finish = start + 0.54; }
  else { start = 7.88 + (node.depth - 3) * 0.38 + node.local * 0.018; finish = start + 0.60; }
  return smooth((t - start) / (finish - start));
}
function corruptionFor(node, t) {
  if (!corruptSet.has(node.index)) return 0;
  const start = 14.96 + (node.depth - 2) * 0.34;
  return smooth((t - start) / 0.26);
}
function updateTransition(t) {
  const pos = transitionGeo.attributes.position.array;
  const col = transitionGeo.attributes.color.array;
  const cloudOpacity = 0.82 * (1 - smooth((t - 1.18) / 1.12));
  for (let i = 0; i < TRANSITION_COUNT; i++) {
    const p = transitionData[i];
    const u = smooth((t - p.delay) / p.duration);
    const arc = Math.sin(u * Math.PI) * 0.6;
    const x = p.start.x + (p.target.x - p.start.x) * u + Math.cos(p.phase + t * 1.8) * arc;
    const y = p.start.y + (p.target.y - p.start.y) * u + Math.sin(p.phase + t * 2.2) * arc;
    const z = p.start.z + (p.target.z - p.start.z) * u + Math.sin(p.phase + t) * arc * 0.7;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    particleColor.copy(startColor).lerp(settleColor, u);
    col[i * 3] = particleColor.r; col[i * 3 + 1] = particleColor.g; col[i * 3 + 2] = particleColor.b;
  }
  transitionGeo.attributes.position.needsUpdate = true; transitionGeo.attributes.color.needsUpdate = true;
  transitionMat.uniforms.uOpacity.value = cloudOpacity;
}
function updateTree(t) {
  const pulsePhase = Math.max(0, t - 9.48);
  const pulseCycle = (pulsePhase % 2.36) / 2.36 * 4;
  const pulseIndex = Math.min(3, Math.floor(pulseCycle));
  const pulseLocal = smooth(pulseCycle - pulseIndex);
  const pathA = signalPath[pulseIndex], pathB = signalPath[pulseIndex + 1];
  const shouldSignal = t >= 9.48 && t < 14.96;
  if (shouldSignal) {
    signal.position.copy(nodePositions[pathA]).lerp(nodePositions[pathB], pulseLocal);
    signal.visible = true;
    const beat = 0.88 + 0.12 * Math.sin(t * 13);
    signal.scale.setScalar(beat);
  } else signal.visible = false;

  for (const node of nodes) {
    node.reveal = revealFor(node, t);
    node.corrupt = corruptionFor(node, t);
    const activePath = signalPath.includes(node.index) && t >= 9.48 && t < 14.96 ? 0.35 : 0;
    const answerGlow = node.index === correctLeaf ? smooth((t - 19.1) / 0.34) * (1 - smooth((t - 22.1) / 0.46)) : 0;
    node.color.copy(node.depth < 2 ? cyanColor : blueColor);
    node.color.lerp(goldColor, activePath * 0.72 + answerGlow * 0.92);
    node.color.lerp(redColor, node.corrupt * 0.98);
    const pulseAmt = 0.82 + 0.18 * Math.sin(t * 5.5 + node.index * 1.7);
    const scale = node.reveal * pulseAmt * (1 + answerGlow * 0.55);
    node.core.scale.setScalar(scale);
    node.halo.scale.setScalar(scale);
    node.core.material.color.copy(node.color);
    node.core.material.opacity = node.reveal * (0.90 + answerGlow * 0.08);
    node.halo.material.color.copy(node.color);
    node.halo.material.opacity = node.reveal * (0.34 + activePath * 0.35 + answerGlow * 0.46);
    node.halo.rotation.z += 0.004 + node.depth * 0.0006;
  }

  for (const edge of edges) {
    const child = nodes[edge.child], parent = nodes[edge.parent];
    const progress = Math.min(child.reveal, parent.reveal);
    edge.mesh.visible = progress > 0.008;
    const drawLength = Math.max(0.001, edge.length * progress);
    edge.mesh.position.copy(edge.from).addScaledVector(edge.direction, drawLength * 0.5);
    edge.mesh.scale.set(1, drawLength, 1);
    const onSignal = signalPath.includes(edge.parent) && signalPath.includes(edge.child) && Math.abs(signalPath.indexOf(edge.child) - pulseIndex) <= 1 && shouldSignal;
    edge.color.copy(cyanColor);
    if (onSignal) edge.color.lerp(goldColor, 0.55);
    const edgeCorrupt = Math.max(parent.corrupt, child.corrupt);
    edge.color.lerp(redColor, edgeCorrupt * 0.98);
    edge.mesh.material.color.copy(edge.color);
    edge.mesh.material.opacity = progress * (onSignal ? 0.88 : 0.50) * (1 + edgeCorrupt * 0.28);
  }

  const errorT = t - 14.96;
  if (errorT >= 0 && errorT < 2.0) {
    errorPulse.visible = true;
    const wave = clamp(errorT / 1.42) * 2;
    const seg = Math.min(1, Math.floor(wave));
    const u = smooth(wave - seg);
    const a = seg === 0 ? 6 : 14, b = seg === 0 ? 14 : 30;
    errorPulse.position.copy(nodePositions[a]).lerp(nodePositions[b], u);
    errorPulse.scale.setScalar(0.82 + 0.20 * Math.sin(t * 16));
    errorRing.visible = true; errorRing.position.copy(nodePositions[corruptRoot]);
    const burst = clamp(errorT / 0.75);
    errorRing.scale.setScalar(0.7 + burst * 3.2);
    errorRing.material.opacity = (1 - smooth((errorT - 0.05) / 0.70)) * 0.92;
  } else {
    errorPulse.visible = false; errorRing.visible = false;
  }
}
function updateTitles(t) {
  let maxOpacity = 0;
  for (const phase of titlePhases) {
    const alpha = windowFade(t, phase.start, phase.in, phase.end, phase.out);
    phase.sprite.material.opacity = alpha;
    const base = phase.sprite.userData.baseScale;
    const pop = 0.94 + 0.06 * (1 - Math.pow(1 - alpha, 2));
    phase.sprite.scale.set(base.x * pop, base.y * pop, base.z);
    maxOpacity = Math.max(maxOpacity, alpha);
  }
  titleScrim.material.opacity = maxOpacity * 0.78;
}
function updateTestCase(t) {
  const u = smooth((t - 21.1) / 2.0);
  testCase.visible = u > 0.001;
  testCase.position.set(15 * (1 - u), -0.3 + 3.5 * u, 14 * (1 - u) + 3.2 * u);
  testCase.scale.setScalar(0.25 + 0.75 * u);
  testHalo.scale.setScalar(0.65 + 0.45 * Math.sin(t * 5.0) * u);
  testCase.material.opacity = u * 0.96;
  testHalo.material.opacity = u * 0.48;
  testLabel.material.opacity = u * 0.94;
}
const testCase = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), basicMaterial(ICE, 0));
const testHalo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 10, 40), basicMaterial(CYAN, 0));
testCase.add(testHalo); scene.add(testCase); testCase.visible = false;
const testLabel = addText(testCase, 'NEW TEST', { width: 7.5, y: 0.90, z: 0, size: 96, color: '#bcefff', glow: '#42cfff' });
testLabel.position.x = 1.65;
function renderFrame(frame) {
  const t = clamp(frame / FPS, 0, DURATION);
  updateTransition(t);
  updateTree(t);
  updateTitles(t);
  updateTestCase(t);
  network.rotation.y = -0.44 * Math.sin(t * 0.17);
  network.rotation.x = -0.11 * Math.sin(t * 0.20);
  camera.position.set(8.5 * Math.sin(t * 0.17), 1.8 * Math.sin(t * 0.21), 38 - 8 * smooth(t / 2.8) - 1.8 * smooth((t - 7.88) / 6.8));
  camera.lookAt(0, 0.25, 0.0);
  stars.rotation.y = t * 0.002;
  renderer.render(scene, camera);
  window.__sceneTime = t;
}
function resize() {
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  renderFrame(Math.round((window.__playerTime || 0) * FPS));
}
window.renderFrame = renderFrame;
window.__sceneReady = true;
window.addEventListener('resize', resize);
resize();
renderFrame(0);
window.dispatchEvent(new Event('v5scene-ready'));
