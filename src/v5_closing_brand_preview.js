import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, basicMat, box, makeText, setTextAlpha } from './v5_autodrive_world.js';

// V5 Task 9 — the final narrated thought and supplied circular brand lock-up.
// Absolute segment: 198.00–210.00 s; narration_07 is mixed at approximately 180.005 s.
const FPS = 24, START = 198.0, END = 210.0, DURATION = END - START, COUNT = 4600;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, .018);
const camera = new THREE.PerspectiveCamera(39, 16 / 9, .06, 520); scene.add(camera);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = x => { x = clamp(x); return x * x * (3 - 2 * x); };
let prepared = false, incomingWorld = null, incomingStars = null, uncertainTitle = null;
let startPosition = new THREE.Vector3(), startQuaternion = new THREE.Quaternion(), startFov = 39, forward = new THREE.Vector3(0, 0, -1);
let progressRig, stations = [], routeSegments = [], destinationGate, gateRingA, gateRingB;
let titleLineA, titleLineB, logoSprite, logoRingA, logoRingB, brandWord, brandTagline, brandGroup;
const clonedMaterialOpacity = new WeakMap();

const particlePositions = new Float32Array(COUNT * 3), particleTargets = new Float32Array(COUNT * 3), particleColors = new Float32Array(COUNT * 3);
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
particleGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 260);
const particleMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { uSize: { value: .105 }, uOpacity: { value: 0 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.12,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}',
});
const breakthroughParticles = new THREE.Points(particleGeometry, particleMaterial); breakthroughParticles.frustumCulled = false; scene.add(breakthroughParticles);

function cloneWorldWithIndependentMaterials(source) {
  if (!source) return null;
  const copy = source.clone(true);
  copy.traverse(object => {
    if (!object.material) return;
    const cloneOne = material => {
      const cloned = material.clone();
      clonedMaterialOpacity.set(cloned, cloned.opacity);
      cloned.userData.v5OriginalTransparent = material.transparent;
      cloned.userData.v5OriginalDepthWrite = material.depthWrite;
      if (material.color) cloned.userData.v5BaseColor = material.color.clone();
      if (material.emissive) cloned.userData.v5BaseEmissive = material.emissive.clone();
      return cloned;
    };
    object.material = Array.isArray(object.material) ? object.material.map(cloneOne) : cloneOne(object.material);
  });
  return copy;
}
function fadeGroup(group, alpha) {
  if (!group) return;
  const value = clamp(alpha);
  group.traverse(object => {
    if (!object.material) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of mats) material.opacity = (clonedMaterialOpacity.get(material) ?? material.userData.baseOpacity ?? 1) * value;
  });
}
function fadeWorld(group, alpha) {
  if (!group) return;
  const value = clamp(alpha);
  group.traverse(object => {
    if (!object.material) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of mats) {
      const baseOpacity = clonedMaterialOpacity.get(material) ?? material.opacity;
      material.opacity = material.userData.v5OriginalTransparent ? baseOpacity * value : baseOpacity;
      material.transparent = Boolean(material.userData.v5OriginalTransparent);
      material.depthWrite = Boolean(material.userData.v5OriginalDepthWrite);
      if (material.color && material.userData.v5BaseColor) material.color.copy(material.userData.v5BaseColor).multiplyScalar(value);
      if (material.emissive && material.userData.v5BaseEmissive) material.emissive.copy(material.userData.v5BaseEmissive).multiplyScalar(value);
    }
  });
}
function rememberMaterials(group) {
  group.traverse(object => {
    if (!object.material) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of mats) clonedMaterialOpacity.set(material, material.opacity);
  });
}
function brandText(value, width, { size = 88, color = '#f2fbff', stroke = '#38cfff', glow = '#2586ff', weight = 800 } = {}) {
  const probe = document.createElement('canvas').getContext('2d');
  const font = `${weight} ${size}px "DejaVu Sans", Arial, sans-serif`;
  probe.font = font;
  const measured = Math.ceil(probe.measureText(value).width);
  const canvas = document.createElement('canvas'); canvas.width = measured + 112; canvas.height = size + 92;
  const ctx = canvas.getContext('2d'); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.shadowColor = glow; ctx.shadowBlur = 18; ctx.lineWidth = 2.3; ctx.strokeStyle = stroke; ctx.strokeText(value, canvas.width / 2, canvas.height / 2);
  ctx.shadowBlur = 4; ctx.fillStyle = color; ctx.fillText(value, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, blending: THREE.NormalBlending });
  const sprite = new THREE.Sprite(material); sprite.scale.set(width, width * canvas.height / canvas.width, 1); sprite.renderOrder = 30; return sprite;
}
function circleTexture(image) {
  // Apply the same circular crop used by the approved V4 ending; the supplied pixels remain unaltered inside the mask.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'); ctx.save(); ctx.beginPath(); ctx.arc(512, 512, 480, 0, Math.PI * 2); ctx.clip();
  const scale = Math.max(1024 / image.width, 1024 / image.height), w = image.width * scale, h = image.height * scale;
  ctx.drawImage(image, (1024 - w) / 2, (1024 - h) / 2, w, h); ctx.restore();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; return texture;
}
async function loadSuppliedLogo() {
  brandGroup = new THREE.Group(); camera.add(brandGroup);
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = './assets/super_intelligent_logo.jpg'; });
  const texture = circleTexture(image);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, blending: THREE.NormalBlending });
  logoSprite = new THREE.Sprite(material); logoSprite.scale.set(9.0, 9.0, 1); logoSprite.position.set(0, 2.05, -20); logoSprite.renderOrder = 25;
  brandGroup.add(logoSprite);
  logoRingA = new THREE.Mesh(new THREE.TorusGeometry(4.78, .105, 12, 96), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  logoRingB = new THREE.Mesh(new THREE.TorusGeometry(4.34, .045, 10, 96), new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  logoRingA.position.set(0, 2.05, -20.12); logoRingB.position.set(0, 2.05, -20.08); logoRingB.rotation.z = .18;
  brandGroup.add(logoRingA, logoRingB);
  brandWord = brandText('SUPER INTELLIGENT', 16.2, { size: 126, color: '#effcff', stroke: '#38cfff', glow: '#2586ff', weight: 900 });
  brandWord.position.set(0, -3.62, -20); brandGroup.add(brandWord);
  brandTagline = brandText('Imagine Beyond Tomorrow.', 11.7, { size: 58, color: '#a8f0ff', stroke: '#2ebfff', glow: '#208bff', weight: 700 });
  brandTagline.position.set(0, -5.18, -20); brandGroup.add(brandTagline);
}

function addStation(center, activation) {
  const group = new THREE.Group(); group.position.set(...center); progressRig.add(group);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.15, .38, 2.8), basicMat(0x102b39, .94, false)); group.add(slab);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.18, .41, 2.83)), new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .86, depthWrite: false, toneMapped: false })); group.add(edge);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.52, .045, 2.25), basicMat(0x214655, .94, false)); pad.position.y = .205; group.add(pad);
  // Tall paired beacons make each lit milestone readable over the terrain silhouette.
  box(group, -1.08, 1.34, 0, [.13, 2.48, .16], C.cyan, .92, true);
  box(group, 1.08, 1.34, 0, [.13, 2.48, .16], C.cyan, .92, true);
  box(group, 0, 2.52, 0, [2.22, .15, .17], C.cyan, .92, true);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.70, .052, 8, 42), basicMat(C.cyan, .95, true)); ring.rotation.x = -Math.PI / 2; ring.position.y = .245; group.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.21, 14, 12), basicMat(C.ice, .98, true)); core.position.set(0, .37, 0); group.add(core);
  rememberMaterials(group); stations.push({ group, ring, core, activation });
}
function addRouteSegment(a, b, activation) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, .052, 8, false), basicMat(C.cyan, .88, true)); progressRig.add(mesh); rememberMaterials(mesh);
  routeSegments.push({ mesh, activation });
}
function prepareIncoming() {
  if (prepared) return;
  const field = window.__V5_TASK8_EXIT_FIELD || {};
  if (field.cameraPosition) camera.position.copy(field.cameraPosition);
  if (field.cameraQuaternion) camera.quaternion.copy(field.cameraQuaternion);
  if (Number.isFinite(field.cameraFov)) camera.fov = field.cameraFov;
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  startPosition.copy(camera.position); startQuaternion.copy(camera.quaternion); startFov = camera.fov; forward.set(0, 0, -1).applyQuaternion(startQuaternion).normalize();
  incomingWorld = cloneWorldWithIndependentMaterials(field.world); if (incomingWorld) scene.add(incomingWorld);
  incomingStars = field.backgroundStars?.clone(true) || null;
  if (incomingStars) { incomingStars.material = Array.isArray(incomingStars.material) ? incomingStars.material.map(m => m.clone()) : incomingStars.material.clone(); rememberMaterials(incomingStars); scene.add(incomingStars); }
  const src = field.positions, cols = field.colors;
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3;
    if (src?.length >= j + 3) particlePositions.set(src.subarray(j, j + 3), j);
    else particlePositions.set([startPosition.x, startPosition.y, startPosition.z], j);
    if (cols?.length >= j + 3) particleColors.set(cols.subarray(j, j + 3), j);
    else particleColors.set([.30, .75, .94], j);
  }
  const initial = new THREE.Vector3();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(startQuaternion), normal = new THREE.Vector3(0, 0, 1).applyQuaternion(startQuaternion);
  const gateCenter = startPosition.clone().addScaledVector(forward, 55).addScaledVector(up, -1.0);
  let seed = 0x56a91d23;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3, a = random() * Math.PI * 2, r = 4.0 + (random() - .5) * .9, depth = (random() - .5) * 1.6;
    initial.copy(gateCenter).addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).addScaledVector(normal, depth);
    particleTargets.set([initial.x, initial.y, initial.z], j);
  }
  particleGeometry.attributes.position.needsUpdate = true; particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  // Same end-frame horizon and rover as Task 8, now held as the actual first frame of Task 9.
  uncertainTitle = makeText(THREE, camera, 'DESTINATION UNCERTAIN', { width: 15.2, size: 76, color: '#fff0c8', glow: '#ffbd65', x: 0, y: 4.02, z: -15 });
  setTextAlpha(uncertainTitle, 1);
  progressRig = new THREE.Group(); progressRig.position.copy(startPosition); progressRig.quaternion.copy(startQuaternion); scene.add(progressRig);
  const stationCenters = [[0, -2.45, -17], [-1.15, -2.28, -26], [1.0, -2.10, -35], [-.35, -1.92, -44]];
  const activations = [.48, .80, 1.20, 2.00];
  for (let i = 0; i < stationCenters.length; i++) addStation(stationCenters[i], activations[i]);
  const routePoints = [[0, -2.1, -10], ...stationCenters.map(p => [p[0], p[1] + .31, p[2]]), [0, -1.0, -55]];
  for (let i = 0; i < routePoints.length - 1; i++) addRouteSegment(routePoints[i], routePoints[i + 1], i < activations.length ? activations[i] : 1.85);
  destinationGate = new THREE.Group(); destinationGate.position.set(0, -1.0, -55); progressRig.add(destinationGate);
  gateRingA = new THREE.Mesh(new THREE.TorusGeometry(3.35, .12, 14, 96), basicMat(C.cyan, .95, true));
  gateRingB = new THREE.Mesh(new THREE.TorusGeometry(2.78, .045, 10, 96), basicMat(C.blue, .68, true)); gateRingB.rotation.z = .12;
  destinationGate.add(gateRingA, gateRingB); rememberMaterials(destinationGate);

  titleLineA = brandText('WHAT DOES INTELLIGENCE', 17.4, { size: 64, color: '#effcff', stroke: '#38cfff', glow: '#2586ff', weight: 900 });
  titleLineB = brandText('REALLY REQUIRE?', 13.6, { size: 80, color: '#effcff', stroke: '#38cfff', glow: '#2586ff', weight: 900 });
  titleLineA.position.set(0, .92, -16); titleLineB.position.set(0, -.83, -16); camera.add(titleLineA, titleLineB);
  prepared = true;
}

async function renderFrame(frame) {
  prepareIncoming();
  const t = clamp(Number(frame) / FPS, 0, DURATION);
  const uncertaintyOut = 1 - smoothstep(t / .58);
  setTextAlpha(uncertainTitle, uncertaintyOut);
  // Fade the actual Task 8 rover/environment only after the first breakthrough words begin.
  const worldOut = 1 - smoothstep((t - .20) / 2.10);
  fadeWorld(incomingWorld, worldOut);
  fadeGroup(incomingStars, 1 - smoothstep((t - 1.15) / 3.6));
  const cameraMove = smoothstep((t - 2.30) / 1.80);
  camera.position.copy(startPosition).addScaledVector(forward, 17.5 * cameraMove);
  camera.quaternion.copy(startQuaternion); camera.fov = lerp(startFov, 39, cameraMove); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);

  // Physical stepping platforms light one by one on “every breakthrough”.
  const stationHold = 1 - smoothstep((t - 3.02) / .55);
  for (const s of stations) {
    const on = smoothstep((t - s.activation) / .24) * stationHold;
    fadeGroup(s.group, on);
    s.ring.rotation.y = t * .48 + s.activation;
    s.core.material.color.setHex(C.green);
    s.core.scale.setScalar(.82 + .32 * Math.max(0, Math.sin(t * 8 - s.activation * 4)));
  }
  for (const segment of routeSegments) {
    const on = smoothstep((t - segment.activation) / .32) * (1 - smoothstep((t - 3.18) / .52));
    fadeGroup(segment.mesh, on);
  }
  const gateOn = smoothstep((t - 1.55) / 1.10) * (1 - smoothstep((t - 3.22) / .52));
  fadeGroup(destinationGate, gateOn);
  if (gateRingA) { gateRingA.rotation.z = t * .24; gateRingB.rotation.z = -.17 * t; }

  // The same course particles stream toward the destination, then resolve into the supplied logo.
  const gather = smoothstep((t - 1.18) / 5.15);
  const p = particleGeometry.attributes.position.array;
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3;
    p[j] = lerp(particlePositions[j], particleTargets[j], gather);
    p[j + 1] = lerp(particlePositions[j + 1], particleTargets[j + 1], gather);
    p[j + 2] = lerp(particlePositions[j + 2], particleTargets[j + 2], gather);
  }
  particleGeometry.attributes.position.needsUpdate = true;
  particleMaterial.uniforms.uOpacity.value = .72 * smoothstep((t - .62) / .55) * (1 - smoothstep((t - 7.05) / .7));

  const question = smoothstep((t - 3.90) / .18) * (1 - smoothstep((t - 7.25) / .45));
  setTextAlpha(titleLineA, question); setTextAlpha(titleLineB, question);
  const logo = smoothstep((t - 7.78) / .78);
  const word = smoothstep((t - 8.30) / .62), tagline = smoothstep((t - 8.62) / .62);
  if (logoSprite) logoSprite.material.opacity = logo;
  if (logoRingA) logoRingA.material.opacity = .82 * logo;
  if (logoRingB) logoRingB.material.opacity = .58 * logo;
  if (brandWord) brandWord.material.opacity = word;
  if (brandTagline) brandTagline.material.opacity = tagline;
  if (logoRingA) logoRingA.rotation.z = t * .19;
  if (logoRingB) logoRingB.rotation.z = -.23 * t;
  if (brandGroup) brandGroup.scale.setScalar(.94 + .06 * smoothstep((t - 7.78) / 1.15));
  renderer.render(scene, camera);
  window.__sceneTime = START + t;
}

async function initialize() {
  await loadSuppliedLogo();
  if (standalone) {
    window.renderFrame = renderFrame;
    window.addEventListener('resize', resize);
    resize(); await renderFrame(0); window.__sceneReady = true; window.dispatchEvent(new Event('v5scene-ready'));
  }
}
function resize() {
  const width = Math.max(1, host.clientWidth || window.innerWidth), height = Math.max(1, host.clientHeight || Math.round(width * 9 / 16));
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  if (prepared) renderFrame(Math.round(((window.__playerTime || START) - START) * FPS));
}
await initialize();
export { renderFrame, resize };
