import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, setAlpha, makeMapParticleTargets, createAutoDriveWorld, createProbabilityHud } from './v5_autodrive_world.js';

// V5 Task 4: Autonomous learning, 01:22–01:50.
// This is the same trip, same protest and same city from Task 3, continued in a
// cyber-tactical visual language: identify -> predict -> test -> notice mismatch -> reroute.
const FPS = 24, DURATION = 28.0;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, 0.0032);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 300); scene.add(camera);
const aim = new THREE.Vector3(0, 0, 0);
let seed = 20261041; function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function makeStars() {
  let geo = window.__V5_SHARED_STAR_GEOMETRY;
  if (!geo) { const n = 760, p = new Float32Array(n * 3), c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p.set([(random() - .5) * 84, (random() - .5) * 52, -24 - random() * 96], i * 3); const q = new THREE.Color(i % 19 ? 0x3f91b0 : 0x78baff); c.set([q.r * .42, q.g * .42, q.b * .42], i * 3); } geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 4.8 }, uOpacity: { value: .5 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
  const s = new THREE.Points(geo, m); scene.add(s); return s;
}
const stars = makeStars(); const world = createAutoDriveWorld(THREE, scene, camera); const probabilities = createProbabilityHud(THREE, camera);

const headlines = {
  information: makeText(THREE, camera, 'INFORMATION IS ONLY THE INPUT', { width: 12.5, size: 58, x: 0, y: 3.75, z: -14 }),
  identify: makeText(THREE, camera, 'IDENTIFYING...', { width: 9.6, size: 84, color: '#e4fbff', glow: '#55e5ff', x: 0, y: 4.15, z: -14 }),
  predict: makeText(THREE, camera, 'PREDICTING MULTIPLE ROUTE OUTCOMES', { width: 13.6, size: 49, x: 0, y: 3.75, z: -14 }),
  mismatch: makeText(THREE, camera, 'REALITY CHANGED: THE PROTEST MOVED', { width: 14.0, size: 50, color: '#ffdce2', glow: '#ff3854', x: 0, y: 3.75, z: -14 }),
  revise: makeText(THREE, camera, 'NEXT TRIP: ROUTE A IS NOW THE BEST CHANCE', { width: 14.0, size: 45, color: '#d6ffea', glow: '#74e7ad', x: 0, y: 3.75, z: -14 }),
  partial: makeText(THREE, camera, 'AI CAN PERFORM PARTS OF THIS PROCESS', { width: 13.5, size: 51, x: 0, y: 3.75, z: -14 }),
  longTerm: makeText(THREE, camera, 'DOES THE LEARNING LAST OVER MANY TRIPS?', { width: 14.0, size: 48, color: '#ffe5b1', glow: '#ffcf72', x: 0, y: 3.75, z: -14 }),
  investigate: makeText(THREE, camera, 'NEXT: CHECK WHETHER THE NORTH ROAD IS CLEAR', { width: 14.8, size: 43, x: 0, y: 3.75, z: -14 }),
  correct: makeText(THREE, camera, 'BRAKE. RECHECK. CHOOSE A SAFER ROUTE.', { width: 13.6, size: 48, color: '#d6ffea', glow: '#74e7ad', x: 0, y: 3.75, z: -14 }),
  challenge: makeText(THREE, camera, 'RELIABLE SELF-CORRECTION REMAINS HARD', { width: 14.6, size: 46, color: '#ffe5b1', glow: '#ffcf72', x: 0, y: 3.75, z: -14 }),
};
const nextTripLabel = makeText(THREE, camera, 'TRIP 03  ·  START → DESTINATION  ·  ROUTE A', { width: 10.5, size: 42, color: '#baffd8', glow: '#55e5a1', x: 0, y: 2.80, z: -14 });
const sourceLabels = [
  makeText(THREE, camera, 'LIVE CAMERA  ·  MAP  ·  TRAFFIC FEED', { width: 8.6, size: 43, x: -3.95, y: 2.55, z: -14, align: 'left' }),
  makeText(THREE, camera, 'DETECT  →  PREDICT  →  ACT', { width: 7.5, size: 44, x: -3.95, y: 1.68, z: -14, align: 'left' }),
];

// Re-form the same city-grid particle field delivered by Task 3, not an unrelated loop.
const IN = 460, mapTargets = makeMapParticleTargets(IN, 4077), inPos = new Float32Array(IN * 3), inColor = new Float32Array(IN * 3), inSource = new Float32Array(IN * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPos, 3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColor, 3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 160);
const inMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 5.0 }, uOpacity: { value: .76 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const inCloud = new THREE.Points(inGeo, inMat); scene.add(inCloud); let incomingReady = false;
let inheritedCamera = new THREE.Vector3(0, 22.5, 25.5), inheritedAim = new THREE.Vector3(0, 0, 0), inheritedStar = 0;
function prepareIncoming() {
  if (incomingReady) return; const field = window.__V5_WORLD_EXIT_FIELD;
  for (let i = 0; i < IN; i++) { const j = i * 3; if (field?.positions && field.count) { const k = Math.floor((i + .5) * field.count / IN) * 3; inSource.set(field.positions.subarray(k, k + 3), j); inPos.set(field.positions.subarray(k, k + 3), j); if (field.colors) inColor.set(field.colors.subarray(k, k + 3), j); } else { inSource.set([mapTargets[j] + (random() - .5) * 3, 0.4 + random() * 3, mapTargets[j + 2] + (random() - .5) * 3], j); inPos.set(inSource.subarray(j, j + 3), j); const c = new THREE.Color(i % 4 ? C.cyan : C.green); inColor.set([c.r, c.g, c.b], j); } }
  if (field?.cameraPosition) inheritedCamera.copy(field.cameraPosition); if (field?.cameraTarget) inheritedAim.copy(field.cameraTarget); inheritedStar = Number.isFinite(field?.starRotationY) ? field.starRotationY : 0;
  inGeo.attributes.position.needsUpdate = true; inGeo.attributes.color.needsUpdate = true; incomingReady = true;
}
const OUT = 460, outTarget = makeMapParticleTargets(OUT, 4077), outPos = new Float32Array(OUT * 3), outColors = new Float32Array(OUT * 3);
const outGeo = new THREE.BufferGeometry(); outGeo.setAttribute('position', new THREE.BufferAttribute(outPos, 3).setUsage(THREE.DynamicDrawUsage)); outGeo.setAttribute('color', new THREE.BufferAttribute(outColors, 3)); outGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 160);
const outMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 5.0 }, uOpacity: { value: 0 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const outCloud = new THREE.Points(outGeo, outMat); scene.add(outCloud);
for (let i = 0; i < OUT; i++) { const c = new THREE.Color(i % 5 === 0 ? C.green : i % 3 === 0 ? C.yellow : C.cyan); outColors.set([c.r, c.g, c.b], i * 3); outPos.set(outTarget.subarray(i * 3, i * 3 + 3), i * 3); }

// The incident log makes long-term reliability concrete: predicted chance vs what actually happened.
function historyRow(y, label, color) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(6.2, .82, .12), basicMat(0x0b1926, .93, false)); panel.position.set(-5.05, y, -14.05); camera.add(panel);
  const accent = new THREE.Mesh(new THREE.BoxGeometry(.10, .68, .04), basicMat(color, .96, true)); accent.position.set(-8.02, y, -13.92); camera.add(accent);
  const text = makeText(THREE, camera, label, { width: 5.9, size: 36, color: '#e6fbff', glow: color === C.red ? '#ff3854' : color === C.green ? '#74e7ad' : '#ffcf72', x: -5.0, y, z: -13.88, align: 'left' });
  return { panel, accent, text };
}
const logTitle = makeText(THREE, camera, 'SAME CITY · DIFFERENT TRIPS', { width: 6.2, size: 39, color: '#ffe5b1', glow: '#ffcf72', x: -5.0, y: 1.62, z: -13.86, align: 'left' });
const tripRows = [historyRow(.78, 'TRIP 01   ROUTE B   BLOCKED', C.red), historyRow(-.16, 'TRIP 02   ROUTE C   +4 MIN', C.yellow), historyRow(-1.10, 'TRIP 03   82%   ROUTE A ON TIME', C.green)];
const routeBeacon = new THREE.Mesh(new THREE.TorusGeometry(.64, .07, 8, 40), basicMat(C.cyan, .92, true)); routeBeacon.rotation.x = Math.PI / 2; routeBeacon.position.set(5, .26, 5); world.city.add(routeBeacon);
const probe = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), basicMat(C.ice, .98, true)); probe.position.set(5, 1.15, 5); world.city.add(probe);
const investigateTag = makeText(THREE, world.city, 'CHECK NORTH DETOUR', { width: 4.5, size: 62, color: '#dff8ff', x: 5, y: 2.5, z: 4.4 });

function setHeadlines(t) {
  const windows = {
    information: [0, 3.25], identify: [3.30, 6.25], predict: [6.3, 9.55], mismatch: [9.55, 11.35], revise: [11.35, 13.2], partial: [13.2, 17.05], longTerm: [17.15, 21.12], investigate: [21.12, 23.62], correct: [23.62, 26.0], challenge: [25.92, 27.78],
  };
  for (const [key, s] of Object.entries(headlines)) { const [a, b] = windows[key]; setTextAlpha(s, win(t, a, b, .18, .18)); }
  sourceLabels.forEach(s => setTextAlpha(s, win(t, .25, 3.2, .20, .25)));
  setTextAlpha(logTitle, win(t, 17.2, 21.1, .22, .24));
  tripRows.forEach((r, i) => { const a = win(t, 17.4 + i * .5, 21.1, .20, .25); r.panel.material.opacity = .93 * a; r.accent.material.opacity = .96 * a; setTextAlpha(r.text, a); });
  const explore = win(t, 21.1, 23.62, .22, .22); setTextAlpha(investigateTag, explore);
  routeBeacon.material.opacity = .92 * explore * (.55 + .45 * Math.sin(t * 5) ** 2); probe.material.opacity = .98 * explore;
}
function nearestRouteProgress(routeIndex, x, z) {
  const curve = world.routes[routeIndex].curve; let bestU = 0, bestD = Infinity;
  for (let i = 0; i <= 1800; i++) { const u = i / 1800, p = curve.getPointAt(u), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bestD) { bestD = d; bestU = u; } }
  return bestU;
}
const cBranch = nearestRouteProgress(2, 3, 5);
function animateCar(t) {
  const cStart = cBranch + .025;
  const car = world.heroCar;
  if (t < 7.3) { car.scale.setScalar(1); world.placeCar(2, THREE.MathUtils.lerp(cStart, 1, smooth(t / 7.3))); return; }
  if (t < 11.10) { car.scale.setScalar(1); world.placeCar(2, 1); return; }
  if (t < 11.45) { car.scale.setScalar(1 - smooth((t - 11.10) / .35)); world.placeCar(2, 1); return; }
  if (t < 11.80) { world.placeCar(0, 0); car.scale.setScalar(smooth((t - 11.45) / .35)); return; }
  if (t < 17.0) { car.scale.setScalar(1); world.placeCar(0, smooth((t - 11.80) / 5.20)); return; }
  car.scale.setScalar(1); world.placeCar(0, 1);
}
function renderFrame(frame) {
  const t = clamp(Number(frame) / FPS, 0, DURATION); prepareIncoming();
  const p = inGeo.attributes.position.array, form = smooth(t / .78);
  for (let i = 0; i < IN; i++) { const j = i * 3; p[j] = THREE.MathUtils.lerp(inSource[j], mapTargets[j], form); p[j + 1] = THREE.MathUtils.lerp(inSource[j + 1], mapTargets[j + 1], form); p[j + 2] = THREE.MathUtils.lerp(inSource[j + 2], mapTargets[j + 2], form); }
  inGeo.attributes.position.needsUpdate = true; inMat.uniforms.uOpacity.value = 0;
  const cityAlpha = 1 - smooth((t - 26.88) / 1.12); setAlpha(world.city, cityAlpha); world.city.visible = cityAlpha > .005;
  const spread = 1;
  world.setCrowdSpread(spread);
  const protestMove = smooth((t - 9.52) / 1.20); world.protest.position.set(-3 + protestMove * 8, -0.24, protestMove * 5); if (protestMove > .62) world.spillover.visible = false;
  const routeScores = t < 9.52 ? [0, 20, 80] : t < 11.2 ? [0, 0, 100] : [88, 0, 12];
  const routeChoice = routeScores.indexOf(Math.max(...routeScores));
  const mapSplit = smooth((t - 6.0) / .55) * (1 - smooth((t - 21.1) / .60));
  const mapSide = THREE.MathUtils.lerp(-1, 1, smooth((t - 16.95) / .45)); world.setMapLayout(mapSplit, mapSide);
  const blockedRoutes = t < 9.52 ? [0] : t < 10.72 ? [0, 1] : t < 11.2 ? [1] : [1];
  world.setRouteState({ visible: t > 6.25 ? [0, 1, 2] : [2], selected: routeChoice, blockedRoutes, alpha: (t < 6.25 ? .72 : win(t, 6.25, 27.2, .24, .28)) * cityAlpha, scores: routeScores });
  animateCar(t);
  world.setBrake(t >= 9.55 && t < 11.35);
  const oldPred = win(t, 6.25, 11.2, .24, .18), newPred = win(t, 11.36, 16.95, .24, .28);
  probabilities.show(Math.max(oldPred, newPred), routeScores, routeChoice, blockedRoutes);
  const histor = win(t, 17.2, 21.12, .20, .25); if (histor > 0) probabilities.show(Math.max(oldPred, newPred) * (1 - histor), routeScores, routeChoice, blockedRoutes);
  setTextAlpha(nextTripLabel, win(t, 11.2, 17.15, .22, .24));
  setHeadlines(t);
  const outStart = 26.84, mix = smooth((t - outStart) / 1.08), q = outGeo.attributes.position.array;
  for (let i = 0; i < OUT; i++) { const j = i * 3; q[j] = outTarget[j] + Math.sin(i * 5.1 + t) * .09 * mix; q[j + 1] = outTarget[j + 1] + .10 + (1 - mix) * .20; q[j + 2] = outTarget[j + 2] + Math.cos(i * 9.2 + t) * .09 * mix; }
  outGeo.attributes.position.needsUpdate = true; outMat.uniforms.uOpacity.value = .64 * smooth((t - 26.82) / .28);
  const camBlend = smooth(t / .65); camera.position.copy(inheritedCamera).lerp(new THREE.Vector3(0, 22.5, 25.5), camBlend); aim.copy(inheritedAim).lerp(new THREE.Vector3(0, 0, 0), camBlend); camera.lookAt(aim);
  const focus = smooth((t - 21.0) / 2.0); camera.position.x = Math.sin(t * .11) * .25 + focus * 1.0; camera.position.z = 25.5 - focus * .6; camera.lookAt(aim); camera.updateMatrixWorld(true);
  const detect = win(t, 3.15, 6.18, .28, .34); world.setDetection(t + .6, detect * cityAlpha, Math.max(0, (t - 3.55) / .52));
  stars.rotation.y = inheritedStar + t * .0010; stars.rotation.x = Math.sin(t * .05) * .006;
  renderer.render(scene, camera); window.__sceneTime = t;
  if (t >= DURATION - 1 / FPS) window.__V5_LEARNING_EXIT_FIELD = { count: OUT, positions: new Float32Array(outPos), colors: new Float32Array(outColors), cameraPosition: camera.position.clone(), cameraTarget: aim.clone(), starRotationY: stars.rotation.y };
}
function resize() { const w = Math.max(1, host.clientWidth || window.innerWidth), h = Math.max(1, host.clientHeight || Math.round(w * 9 / 16)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (standalone) renderFrame(Math.round((window.__playerTime || 0) * FPS)); }
if (standalone) { window.renderFrame = renderFrame; window.__sceneReady = true; window.addEventListener('resize', resize); resize(); renderFrame(0); window.dispatchEvent(new Event('v5scene-ready')); }
export { renderFrame, resize };
