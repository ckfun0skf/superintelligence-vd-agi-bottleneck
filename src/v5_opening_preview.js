import * as THREE from '../assets/vendor/three.module.js';

// V5 Task 1: opening and core question, 00:00–00:22.2.
// Time is deterministic: the media player is the clock; renderFrame(frame) maps
// that time to 24 fps. No generated image/video assets are used.
const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION = 22.2;
const COLOR = {
  black: 0x02050b,
  cyan: 0x54e6ff,
  ice: 0xdffaff,
  blue: 0x318aff,
  violet: 0x766dff,
  gold: 0xffc56b,
  mint: 0x69f4c7,
  pink: 0xff76ce,
  red: 0xff3b56,
};
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
function windowFade(t, start, fadeIn, end, fadeOut) {
  return smooth((t - start) / fadeIn) * (1 - smooth((t - end) / fadeOut));
}
function seededRandom(seed = 20261013) {
  return () => {
    let x = seed += 0x6d2b79f5;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom();
const rr = (lo, hi) => lo + (hi - lo) * rand();
const V3 = THREE.Vector3;

const container = document.getElementById('canvas-container');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(COLOR.black, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if (standalone) container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR.black);
scene.fog = new THREE.FogExp2(COLOR.black, 0.0065);
const camera = new THREE.PerspectiveCamera(39, W / H, 0.1, 260);
const aim = new V3(0, 0, -2);
scene.add(camera);

function meshMaterial(color, opacity = 1, additive = true) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  material.userData.baseOpacity = opacity;
  return material;
}
function glowPointsMaterial(size, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uSize: { value: size }, uOpacity: { value: opacity } },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uSize;
      void main() {
        vColor = color;
        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPos;
        gl_PointSize = uSize * 42.0 / max(1.0, -viewPos.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.08, 0.5, d);
        gl_FragColor = vec4(vColor, alpha * uOpacity);
      }
    `,
  });
}
function addSphere(parent, radius, color, opacity = 1, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments * 0.7))),
    meshMaterial(color, opacity),
  );
  parent.add(mesh);
  return mesh;
}
function addBeam(parent, from, to, radius, color, opacity = 0.6) {
  const a = from.clone();
  const b = to.clone();
  const direction = b.clone().sub(a);
  const length = direction.length();
  const material = meshMaterial(color, opacity);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8, 1), material);
  beam.position.copy(a).add(b).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new V3(0, 1, 0), direction.normalize());
  parent.add(beam);
  return beam;
}
function addTorus(parent, radius, tube, color, opacity = 0.7) {
  const object = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 80), meshMaterial(color, opacity));
  parent.add(object);
  return object;
}
function addTextSprite(parent, text, { width, y = 0, z = 0, fontSize = 56, color = '#a9f5ff', glow = '#39dfff', weight = 700, mono = false }) {
  const font = `${weight} ${fontSize}px ${mono ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : 'Arial, sans-serif'}`;
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  measureContext.font = font;
  const measuredWidth = Math.min(1900, Math.ceil(measureContext.measureText(text).width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(180, measuredWidth + 100);
  canvas.height = fontSize >= 100 ? 320 : 160;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glow;
  ctx.shadowBlur = fontSize >= 100 ? 20 : 10;
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  material.userData.baseOpacity = 1;
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, y, z);
  sprite.scale.set(width, width * canvas.height / canvas.width, 1);
  parent.add(sprite);
  return sprite;
}
function setAlpha(parent, alpha) {
  const amount = clamp(alpha);
  parent.traverse(object => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.uniforms?.uOpacity) material.uniforms.uOpacity.value = amount;
      else if (material.userData.baseOpacity !== undefined) material.opacity = material.userData.baseOpacity * amount;
    }
  });
}
function makePoints(parent, positions, colors, size, opacity = 1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.boundingSphere = new THREE.Sphere(new V3(), 180);
  const material = glowPointsMaterial(size, opacity);
  const object = new THREE.Points(geometry, material);
  parent.add(object);
  return { geometry, material, object };
}

// Persistent star volume: distant, middle and near particles move at different rates.
const STAR_COUNT = 1250;
const starData = [];
const starPositions = new Float32Array(STAR_COUNT * 3);
const starColors = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const z = rr(-118, 17);
  const x = rr(-66, 66);
  const y = rr(-38, 38);
  const depth = z > 2 ? 1.0 : z > -34 ? 0.56 : 0.24;
  const color = new THREE.Color(i % 31 === 0 ? COLOR.gold : i % 17 === 0 ? COLOR.ice : COLOR.cyan);
  starData.push({ x, y, z, depth, phase: rr(0, 6.283), speed: rr(0.06, 0.42) });
  starPositions.set([x, y, z], i * 3);
  starColors.set([color.r * depth, color.g * depth, color.b * depth], i * 3);
}
const starCloud = makePoints(scene, starPositions, starColors, 5.2, 0.8);
window.__V5_SHARED_STAR_GEOMETRY = starCloud.geometry;

// Opening acceleration: many separate trajectories converge, then sweep past camera.
const opening = new THREE.Group();
opening.name = 'particles accelerate into a shared stream';
scene.add(opening);
const openingRibbonData = [];
const openingCount = 680;
const openingPositions = new Float32Array(openingCount * 3);
const openingColors = new Float32Array(openingCount * 3);
for (let i = 0; i < openingCount; i++) {
  openingRibbonData.push({ angle: rr(0, Math.PI * 2), phase: rr(0, 1), lane: rr(0, 1), rate: rr(0.20, 0.43) });
  const c = new THREE.Color(i % 13 === 0 ? COLOR.ice : COLOR.cyan);
  openingColors.set([c.r, c.g, c.b], i * 3);
}
const openingCloud = makePoints(opening, openingPositions, openingColors, 9.0, 0.95);
const openingCore = addSphere(opening, 1.5, COLOR.ice, 0.95, 22);
const openingRings = [
  addTorus(opening, 2.8, 0.065, COLOR.cyan, 0.48),
  addTorus(opening, 4.2, 0.040, COLOR.blue, 0.3),
];
openingRings[0].rotation.x = Math.PI * 0.31;
openingRings[1].rotation.y = Math.PI * 0.37;

// 3D code metaphor: readable syntax fragments float at different depths and
// are assembled into a moving, executable sequence—no background HUD panel.
const code = new THREE.Group();
code.name = 'write code';
scene.add(code);
const codeRows = [
  { text: 'function solve(input) {', x: -1.3, y: 3.1, z: -2.6, width: 18.5, color: '#b8f8ff' },
  { text: '  if (signal > threshold) {', x: 1.5, y: 1.4, z: 0.2, width: 19.6, color: '#84efff' },
  { text: '    return refine(answer);', x: 2.7, y: -0.2, z: -1.2, width: 18.0, color: '#f4d58d' },
  { text: '  }', x: 0.6, y: -1.9, z: 0.8, width: 3.5, color: '#8ff0ff' },
  { text: '}', x: -1.1, y: -3.1, z: -2.0, width: 2.0, color: '#b8f8ff' },
];
const codeSprites = codeRows.map(row => {
  const sprite = addTextSprite(code, row.text, { width: row.width, y: row.y, z: row.z, fontSize: 60, color: row.color, glow: '#39dfff', mono: true });
  sprite.position.x = row.x;
  sprite.position.z = row.z;
  return sprite;
});
const codeFlow = [];
for (let i = 0; i < 8; i++) {
  const from = new V3(-8 + (i % 3) * 2.0, 3.6 - i * 0.85, -4 + (i % 2) * 2.0);
  const to = new V3(5 - (i % 4) * 0.9, 3.0 - i * 0.85, -1.2 + (i % 3) * 0.5);
  codeFlow.push({ from, to, phase: i * 0.11, bead: addSphere(code, 0.10 + (i % 3) * 0.025, i % 4 ? COLOR.cyan : COLOR.gold, 0.9, 10) });
}

// 3D branching problem: one route carries a visible pulse to a solution node.
const puzzle = new THREE.Group();
puzzle.name = 'solve complex problems';
scene.add(puzzle);
const puzzlePositions = [
  new V3(0, 4.0, 0),
  new V3(-5.1, 0.8, -1.6), new V3(0, 0.6, 0), new V3(5.1, 0.8, 1.6),
  new V3(-7.0, -3.5, -2.7), new V3(-3.2, -3.7, -0.5),
  new V3(-1.5, -3.6, -1.1), new V3(1.5, -3.6, 1.0),
  new V3(3.2, -3.7, 0.2), new V3(7.0, -3.5, 2.7),
];
const puzzleEdges = [[0,1],[0,2],[0,3],[1,4],[1,5],[2,6],[2,7],[3,8],[3,9]];
const preferredPath = new Set([1, 6]);
const puzzleBeams = puzzleEdges.map(([a, b], i) => ({
  a, b, i,
  beam: addBeam(puzzle, puzzlePositions[a], puzzlePositions[b], preferredPath.has(i) ? 0.075 : 0.047, preferredPath.has(i) ? COLOR.cyan : COLOR.blue, 0.24),
}));
const puzzleNodes = puzzlePositions.map((position, i) => {
  const node = new THREE.Group();
  node.position.copy(position);
  puzzle.add(node);
  const color = i === 9 ? COLOR.gold : i === 0 ? COLOR.ice : COLOR.cyan;
  const core = addSphere(node, i === 0 ? 0.32 : i === 9 ? 0.31 : 0.23, color, 0.92, 14);
  const halo = addTorus(node, i === 0 ? 0.52 : 0.37, 0.035, color, 0.42);
  halo.rotation.x = Math.PI * 0.25;
  return { node, core, halo };
});
const puzzleSignal = addSphere(puzzle, 0.19, COLOR.ice, 1, 14);
const puzzleSignalHalo = addSphere(puzzle, 0.34, COLOR.gold, 0.32, 14);

// Information processing: noisy streams enter a spatial sorting aperture and
// emerge as coherent clusters. The visible particle trajectory explains action.
const information = new THREE.Group();
information.name = 'process enormous amounts of information';
scene.add(information);
const sortingGate = addTorus(information, 2.6, 0.12, COLOR.cyan, 0.75);
sortingGate.rotation.x = Math.PI * 0.11;
const gateCore = addSphere(information, 0.48, COLOR.ice, 0.75, 18);
const INFO_COUNT = 760;
const infoData = [];
const infoPositions = new Float32Array(INFO_COUNT * 3);
const infoColors = new Float32Array(INFO_COUNT * 3);
const categoryColors = [COLOR.cyan, COLOR.pink, COLOR.mint, COLOR.gold].map(c => new THREE.Color(c));
for (let i = 0; i < INFO_COUNT; i++) {
  const category = i % 4;
  const clusterX = category % 2 === 0 ? -7.4 : 7.4;
  const clusterY = category < 2 ? 3.6 : -3.6;
  const target = new V3(clusterX + rr(-1.2, 1.2), clusterY + rr(-1.1, 1.1), -12 + rr(-2.0, 2.0));
  const start = new V3(rr(-9.5, 9.5), rr(-8.5, 8.5), rr(13, 21));
  const c = categoryColors[category];
  infoData.push({ start, target, category, phase: rr(0, 6.283), bend: rr(-2.2, 2.2) });
  infoPositions.set([start.x, start.y, start.z], i * 3);
  infoColors.set([c.r, c.g, c.b], i * 3);
}
const informationPoints = makePoints(information, infoPositions, infoColors, 7.0, 1.0);
const clusterRings = [];
for (let i = 0; i < 4; i++) {
  const ring = addTorus(information, 0.8, 0.045, [COLOR.cyan, COLOR.pink, COLOR.mint, COLOR.gold][i], 0.45);
  ring.position.set(i % 2 === 0 ? -7.4 : 7.4, i < 2 ? 3.6 : -3.6, -12);
  clusterRings.push(ring);
}

// Generational neural networks form a volumetric sequence, increasingly large
// and dense along the camera's Z path. Edges are substantive, not decoration.
const generations = [];
const generationLayout = [
  { x: -7.5, y: 2.4, z: -14.0, radius: 2.8, count: 40, color: COLOR.blue },
  { x: -2.7, y: -2.4, z: -7.0, radius: 3.4, count: 56, color: COLOR.cyan },
  { x: 2.8, y: 2.2, z: 0.0, radius: 4.2, count: 74, color: COLOR.mint },
  { x: 7.3, y: -1.8, z: 7.0, radius: 5.0, count: 92, color: COLOR.ice },
];
for (let g = 0; g < generationLayout.length; g++) {
  const spec = generationLayout[g];
  const group = new THREE.Group();
  group.name = `generation ${g + 1}`;
  group.position.set(spec.x, spec.y, spec.z);
  scene.add(group);
  const pts = [];
  const cols = [];
  const nodePoints = [];
  for (let i = 0; i < spec.count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / spec.count);
    const theta = i * 2.399963 + g * 0.37;
    const jitter = 0.82 + rr(0, 0.22);
    const p = new V3(
      spec.radius * Math.sin(phi) * Math.cos(theta) * jitter,
      spec.radius * Math.cos(phi) * jitter,
      spec.radius * Math.sin(phi) * Math.sin(theta) * jitter,
    );
    nodePoints.push(p);
    pts.push(p.x, p.y, p.z);
    const c = new THREE.Color(i % 11 === 0 ? COLOR.ice : spec.color);
    const boost = i % 11 === 0 ? 1.0 : 0.68;
    cols.push(c.r * boost, c.g * boost, c.b * boost);
  }
  const nodes = makePoints(group, new Float32Array(pts), new Float32Array(cols), 8.2 + g * 0.55, 0.9);
  const edgePositions = [];
  const edgeColors = [];
  for (let i = 1; i < nodePoints.length; i++) {
    const parent = Math.floor((i - 1) / 2);
    edgePositions.push(...nodePoints[parent].toArray(), ...nodePoints[i].toArray());
    const c = new THREE.Color(spec.color);
    edgeColors.push(c.r * 0.45, c.g * 0.45, c.b * 0.45, c.r * 0.45, c.g * 0.45, c.b * 0.45);
    if (i > 7 && i % 5 === 0) {
      const alternate = Math.max(0, i - 3);
      edgePositions.push(...nodePoints[alternate].toArray(), ...nodePoints[i].toArray());
      edgeColors.push(c.r * 0.25, c.g * 0.25, c.b * 0.25, c.r * 0.25, c.g * 0.25, c.b * 0.25);
    }
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));
  const edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  edgeMaterial.userData.baseOpacity = 0.45;
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  group.add(edges);
  const pulse = addSphere(group, 0.18 + g * 0.025, COLOR.gold, 0.85, 12);
  const glow = addTorus(group, spec.radius * 1.14, 0.027, spec.color, 0.42);
  generations.push({ group, nodes, edges, pulse, glow, nodePoints, spec, index: g });
}

// The closing AGI question disperses into a field that can become the next task's tree.
const BURST_COUNT = 920;
const burstData = [];
const burstPositions = new Float32Array(BURST_COUNT * 3);
const burstColors = new Float32Array(BURST_COUNT * 3);
for (let i = 0; i < BURST_COUNT; i++) {
  const theta = rr(0, Math.PI * 2);
  const zAngle = Math.acos(rr(-1, 1));
  const direction = new V3(Math.sin(zAngle) * Math.cos(theta), Math.cos(zAngle), Math.sin(zAngle) * Math.sin(theta)).normalize();
  const start = direction.clone().multiplyScalar(rr(0.3, 5.6));
  const end = direction.clone().multiplyScalar(rr(14, 34));
  const color = new THREE.Color(i % 10 === 0 ? COLOR.pink : i % 7 === 0 ? COLOR.ice : COLOR.cyan);
  burstData.push({ start, end, drift: rr(0.10, 0.55), phase: rr(0, Math.PI * 2) });
  burstPositions.set([start.x, start.y, start.z], i * 3);
  burstColors.set([color.r, color.g, color.b], i * 3);
}
const scatterGroup = new THREE.Group();
scatterGroup.name = 'outward scatter, ready for the next scene';
scene.add(scatterGroup);
const burstCloud = makePoints(scatterGroup, burstPositions, burstColors, 7.0, 0.0);

// Titles stay locked to the camera as the 3D world surges behind them.
const titleLayer = new THREE.Group();
camera.add(titleLayer);
const scrimCanvas = document.createElement('canvas');
scrimCanvas.width = 1024;
scrimCanvas.height = 256;
const scrimContext = scrimCanvas.getContext('2d');
scrimContext.save();
scrimContext.translate(512, 128);
scrimContext.scale(1, 0.24);
const scrimGradient = scrimContext.createRadialGradient(0, 0, 24, 0, 0, 640);
scrimGradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
scrimGradient.addColorStop(0.56, 'rgba(0, 0, 0, 0.42)');
scrimGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
scrimContext.fillStyle = scrimGradient;
scrimContext.fillRect(-640, -640, 1280, 1280);
scrimContext.restore();
const titleScrim = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 5.0),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(scrimCanvas), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
);
titleScrim.position.set(0, 0, -21.82);
titleScrim.renderOrder = 5;
titleLayer.add(titleScrim);
const howTitle = addTextSprite(titleLayer, 'HOW FAR CAN INTELLIGENCE GO?', {
  width: 22.2, y: 0, z: -22, fontSize: 128, color: '#f3fcff', glow: '#36dcff', weight: 800,
});
const agiTitle = addTextSprite(titleLayer, "WHY HAVEN'T WE REACHED AGI?", {
  width: 22.0, y: 0, z: -22, fontSize: 128, color: '#ff2947', glow: '#ff153e', weight: 800,
});
howTitle.renderOrder = 6;
agiTitle.renderOrder = 6;
const DUST_COUNT = 560;
const dustData = [];
const dustPositions = new Float32Array(DUST_COUNT * 3);
const dustColors = new Float32Array(DUST_COUNT * 3);
for (let i = 0; i < DUST_COUNT; i++) {
  const x = rr(-10.0, 10.0);
  const y = rr(-1.2, 1.2);
  const z = rr(-0.10, 0.10);
  const direction = new V3(x + rr(-3, 3), y * 1.8 + rr(-1.5, 1.5), rr(-1.0, 1.0)).normalize();
  const color = new THREE.Color(i % 5 === 0 ? COLOR.pink : COLOR.red);
  dustData.push({ start: new V3(x, y, z), end: new V3(x, y, z).addScaledVector(direction, rr(8, 17)), phase: rr(0, 6.28) });
  dustPositions.set([x, y, z - 22], i * 3);
  dustColors.set([color.r, color.g * 0.58, color.b * 0.70], i * 3);
}
const titleDust = makePoints(titleLayer, dustPositions, dustColors, 5.4, 0.0);

// Publish the exact end-state particle field and camera so the reasoning scene
// can inherit this same 3D state instead of cutting to a newly generated cloud.
const handoffCount = BURST_COUNT + DUST_COUNT;
const handoffPositions = new Float32Array(handoffCount * 3);
const handoffColors = new Float32Array(handoffCount * 3);
const handoffCameraPosition = new V3();
const handoffCameraTarget = new V3();
const handoffPoint = new V3();
window.__V5_HANDOFF_FIELD = { positions: handoffPositions, colors: handoffColors, count: handoffCount, cameraPosition: handoffCameraPosition, cameraTarget: handoffCameraTarget };
function updateHandoffField() {
  scene.updateMatrixWorld(true);
  const burst = burstCloud.geometry.attributes.position.array;
  for (let i = 0; i < BURST_COUNT; i++) {
    const j = i * 3;
    handoffPoint.set(burst[j], burst[j + 1], burst[j + 2]).applyMatrix4(scatterGroup.matrixWorld);
    handoffPositions[j] = handoffPoint.x; handoffPositions[j + 1] = handoffPoint.y; handoffPositions[j + 2] = handoffPoint.z;
    handoffColors[j] = burstColors[j]; handoffColors[j + 1] = burstColors[j + 1]; handoffColors[j + 2] = burstColors[j + 2];
  }
  const dust = titleDust.geometry.attributes.position.array;
  for (let i = 0; i < DUST_COUNT; i++) {
    const j = (BURST_COUNT + i) * 3, k = i * 3;
    handoffPoint.set(dust[i * 3], dust[i * 3 + 1], dust[i * 3 + 2]).applyMatrix4(titleDust.object.matrixWorld);
    handoffPositions[j] = handoffPoint.x; handoffPositions[j + 1] = handoffPoint.y; handoffPositions[j + 2] = handoffPoint.z;
    handoffColors[j] = dustColors[k]; handoffColors[j + 1] = dustColors[k + 1]; handoffColors[j + 2] = dustColors[k + 2];
  }
  handoffCameraPosition.copy(camera.position);
  handoffCameraTarget.copy(aim);
}

function cameraAt(t) {
  if (t < 4.3) {
    const q = smooth(t / 4.3);
    camera.position.set(Math.sin(t * 0.32) * 0.9, Math.sin(t * 0.45) * 0.42, 38 - q * 6.0);
    aim.set(0, 0, 0);
  } else if (t < 8.18) {
    const q = t - 4.3;
    camera.position.set(Math.sin(q * 0.34) * 1.8, Math.sin(q * 0.25) * 0.7, 29 - smooth(q / 3.88) * 1.0);
    aim.set(0, 0, -0.5);
  } else if (t < 10.62) {
    const q = t - 8.18;
    camera.position.set(3.0 + Math.sin(q * 0.45) * 1.0, 1.0 + Math.sin(q * 0.32) * 0.7, 30.0 - smooth(q / 2.44) * 1.0);
    aim.set(0, 0, -2.3);
  } else if (t < 17.02) {
    const q = t - 10.62;
    camera.position.set(Math.sin(q * 0.22) * 2.8, Math.sin(q * 0.16) * 0.8, 36 - smooth(q / 6.4) * 4.0);
    aim.set(0, 0, -3.0);
  } else {
    const q = t - 17.02;
    const push = smooth(q / 2.1);
    camera.position.set(Math.sin(q * 0.20) * 2.1, Math.sin(q * 0.23) * 0.55, 32 - push * 13.0 - Math.max(0, q - 2.1) * 0.45);
    aim.set(0, 0, -1.8);
  }
  camera.lookAt(aim);
}
function updateStars(t) {
  const position = starCloud.geometry.attributes.position;
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = starData[i];
    const z = ((s.z + t * s.speed + 135) % 135) - 118;
    const depthParallax = s.depth;
    position.setXYZ(i,
      s.x + Math.sin(t * 0.26 + s.phase) * 0.22 * depthParallax,
      s.y + Math.cos(t * 0.21 + s.phase) * 0.16 * depthParallax,
      z,
    );
  }
  position.needsUpdate = true;
}
function updateOpening(t) {
  const active = windowFade(t, 0.0, 0.45, 3.98, 0.38);
  opening.visible = active > 0.001;
  const position = openingCloud.geometry.attributes.position;
  const acceleration = 0.14 + 0.7 * smooth(t / 4.2);
  for (let i = 0; i < openingCount; i++) {
    const d = openingRibbonData[i];
    const phase = (d.phase + t * acceleration * d.rate) % 1;
    const z = 18 - phase * 100;
    const radius = 0.5 + phase * (8.0 + d.lane * 23.0);
    const angle = d.angle + t * (0.38 + d.rate) + phase * 7.2;
    position.setXYZ(i,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.62,
      z + Math.sin(angle * 2 + d.phase) * 1.2,
    );
  }
  position.needsUpdate = true;
  openingCloud.material.uniforms.uOpacity.value = 0.9 * active;
  opening.scale.setScalar(0.78 + 0.28 * smooth(t / 4.2));
  opening.rotation.z = Math.sin(t * 0.28) * 0.10;
  openingCore.scale.setScalar(0.42 + easeOut(t / 2.8) * 0.65);
  openingCore.material.opacity = 0.95 * active;
  openingRings.forEach((ring, i) => {
    ring.rotation.z = t * (i ? -0.23 : 0.31);
    ring.rotation.x += 0; // keep the selected 3D tilt deterministic
    ring.material.opacity = (i ? 0.30 : 0.48) * active;
  });
}
function updateCode(t) {
  const active = windowFade(t, 4.18, 0.25, 6.12, 0.52);
  setAlpha(code, active);
  code.position.set(-0.3 + Math.sin(t * 0.42) * 0.26, 0.15 + Math.cos(t * 0.36) * 0.12, 0);
  code.rotation.y = Math.sin(t * 0.32) * 0.15;
  code.scale.setScalar(0.86 + 0.14 * smooth((t - 4.15) / 0.72));
  codeSprites.forEach((sprite, i) => {
    const reveal = smooth((t - (4.10 + i * 0.13)) / 0.22);
    sprite.material.opacity = active * reveal;
    sprite.position.x = codeRows[i].x - (1 - reveal) * 1.2;
  });
  codeFlow.forEach((particle, i) => {
    const u = (t * 0.40 + particle.phase) % 1;
    particle.bead.position.copy(particle.from).lerp(particle.to, easeOut(u));
    particle.bead.material.opacity = active * (0.38 + 0.55 * Math.sin(Math.PI * u));
  });
}
function updatePuzzle(t) {
  const active = windowFade(t, 6.03, 0.42, 8.36, 0.45);
  setAlpha(puzzle, active);
  puzzle.position.set(0, 0.1 + Math.sin(t * 0.42) * 0.16, 0);
  puzzle.rotation.y = Math.sin(t * 0.32) * 0.11;
  puzzleNodes.forEach((n, i) => {
    const reveal = smooth((t - (6.08 + (i === 0 ? 0 : 0.15 + i * 0.07))) / 0.30);
    n.node.scale.setScalar(reveal * (0.96 + 0.07 * Math.sin(t * 3.8 - i)));
    n.core.material.opacity = 0.92 * active * reveal;
    n.halo.material.opacity = 0.42 * active * reveal;
    n.halo.rotation.z = t * 0.7 + i * 0.4;
  });
  puzzleBeams.forEach(({ beam, i }) => {
    const reveal = smooth((t - (6.16 + i * 0.10)) / 0.34);
    beam.material.opacity = (preferredPath.has(i) ? 0.75 : 0.27) * active * reveal;
    beam.material.color.setHex(preferredPath.has(i) ? COLOR.gold : COLOR.cyan);
  });
  const q = Math.max(0, t - 6.45);
  const pathSequence = [
    [0, 2], [2, 7],
  ];
  const travelDuration = 0.48;
  const loop = pathSequence.length * travelDuration + 0.22;
  const phase = q % loop;
  const segment = Math.min(pathSequence.length - 1, Math.floor(phase / travelDuration));
  const u = easeOut((phase - segment * travelDuration) / travelDuration);
  const [fromIndex, toIndex] = pathSequence[segment];
  puzzleSignal.position.copy(puzzlePositions[fromIndex]).lerp(puzzlePositions[toIndex], u);
  puzzleSignalHalo.position.copy(puzzleSignal.position);
  puzzleSignal.material.opacity = active * 0.96;
  puzzleSignalHalo.material.opacity = active * 0.26;
}
function updateInformation(t) {
  const active = windowFade(t, 8.18, 0.4, 10.66, 0.48);
  setAlpha(information, active);
  const q = Math.max(0, t - 8.25);
  const progress = easeOut(q / 1.8);
  const position = informationPoints.geometry.attributes.position;
  infoData.forEach((d, i) => {
    const delayed = easeOut((q - (i % 16) * 0.015) / 1.72);
    const p = d.start.clone().lerp(d.target, delayed);
    p.y += Math.sin(q * 2.8 + d.phase) * 0.34 * (1 - delayed);
    p.z += Math.cos(q * 1.7 + d.phase) * 0.48 * (1 - delayed);
    position.setXYZ(i, p.x, p.y, p.z);
  });
  position.needsUpdate = true;
  informationPoints.material.uniforms.uOpacity.value = active;
  sortingGate.rotation.z = t * 0.2;
  sortingGate.material.opacity = 0.75 * active * (0.72 + 0.28 * Math.sin(t * 5));
  gateCore.scale.setScalar(0.5 + 0.16 * Math.sin(t * 5.2));
  gateCore.material.opacity = 0.72 * active;
  clusterRings.forEach((ring, i) => {
    const amount = smooth((q - 0.65 - i * 0.09) / 0.52);
    ring.scale.setScalar(0.15 + amount * (0.85 + 0.12 * Math.sin(t * 3 + i)));
    ring.material.opacity = 0.46 * active * amount;
    ring.rotation.z = t * (0.2 + i * 0.03);
  });
}
function updateGenerations(t) {
  const q = Math.max(0, t - 10.62);
  const scatterContrast = 1 - 0.82 * smooth((t - 18.88) / 0.42);
  generations.forEach(({ group, nodes, edges, pulse, glow, spec, index, nodePoints }) => {
    const inAt = 10.72 + index * 0.72;
    const appear = smooth((t - inAt) / 0.65) * (1 - smooth((t - 18.94) / 0.64));
    const scaling = smooth((t - 17.02) / 2.35);
    const baseScale = 0.76 + index * 0.10;
    group.visible = appear > 0.001;
    group.scale.setScalar((baseScale + scaling * (0.44 + index * 0.035)) * (0.82 + 0.18 * smooth((t - inAt) / 0.8)));
    group.rotation.y = Math.sin(t * 0.52 + index) * 0.14;
    group.rotation.x = Math.sin(t * 0.34 + index * 0.7) * 0.08;
    nodes.material.uniforms.uOpacity.value = 0.88 * appear * scatterContrast;
    edges.material.opacity = 0.42 * appear * (1 - scaling * 0.28) * scatterContrast;
    glow.material.opacity = 0.38 * appear * scatterContrast;
    glow.rotation.x = t * 0.18 + index * 0.45;
    glow.rotation.y = t * 0.26;
    // A signal pulse travels across the actual node graph on every generation.
    const pulseIndex = Math.floor((q * (4.2 + index * 0.36) + index * 6) % Math.max(1, nodePoints.length - 1));
    const p1 = nodePoints[pulseIndex];
    const p2 = nodePoints[Math.min(nodePoints.length - 1, pulseIndex + 1)];
    const u = (q * (4.2 + index * 0.36) + index * 6) % 1;
    pulse.position.copy(p1).lerp(p2, easeOut(u));
    pulse.material.opacity = 0.82 * appear;
    pulse.scale.setScalar(0.78 + 0.22 * Math.sin(t * 9 + index));
  });
  const scaling = smooth((t - 17.02) / 2.3);
  const scatter = smooth((t - 18.80) / 1.0);
  const position = burstCloud.geometry.attributes.position;
  burstData.forEach((d, i) => {
    const p = d.start.clone().lerp(d.end, scatter);
    p.x += Math.sin(t * 0.9 + d.phase) * d.drift * scatter;
    p.y += Math.cos(t * 0.75 + d.phase) * d.drift * scatter;
    position.setXYZ(i, p.x, p.y, p.z);
  });
  position.needsUpdate = true;
  burstCloud.material.uniforms.uOpacity.value = smooth((t - 18.88) / 0.34) * (0.22 + 0.78 * scatter);
  scatterGroup.rotation.y = t * 0.035;
  // Stronger inward camera push as the spoken idea moves from scaling to AGI.
  return scaling;
}
function updateQuestion(t) {
  const how = windowFade(t, 14.62, 0.44, 18.88, 0.34);
  const agi = windowFade(t, 18.92, 0.20, 21.42, 0.48);
  titleScrim.material.opacity = 0.82 * Math.max(how, agi);
  howTitle.material.opacity = 0.96 * how;
  agiTitle.material.opacity = 0.98 * agi;
  const dissolve = smooth((t - 20.78) / 0.72);
  const position = titleDust.geometry.attributes.position;
  dustData.forEach((d, i) => {
    const p = d.start.clone().lerp(d.end, dissolve);
    p.x += Math.sin(t * 1.8 + d.phase) * 0.14 * dissolve;
    p.y += Math.cos(t * 1.3 + d.phase) * 0.12 * dissolve;
    position.setXYZ(i, p.x, p.y, p.z - 22);
  });
  position.needsUpdate = true;
  titleDust.material.uniforms.uOpacity.value = smooth((t - 20.65) / 0.25) * (0.12 + 0.88 * dissolve);
}
function renderFrame(frame) {
  const t = clamp(frame / FPS, 0, DURATION);
  cameraAt(t);
  updateStars(t);
  updateOpening(t);
  updateCode(t);
  updatePuzzle(t);
  updateInformation(t);
  updateGenerations(t);
  updateQuestion(t);
  if (t >= DURATION - 1 / FPS) updateHandoffField();
  renderer.render(scene, camera);
  return { frame, time: t };
}

function resize() {
  const width = Math.max(1, container.clientWidth || window.innerWidth);
  const height = Math.max(1, container.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (standalone) renderFrame(Math.round((window.__playerTime || 0) * FPS));
}
if (standalone) {
  window.addEventListener('resize', resize);
  window.renderFrame = renderFrame;
  window.__sceneReady = true;
  resize();
}
export { renderFrame, resize };
