import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, setAlpha, makeMapParticleTargets, createAutoDriveWorld, createProbabilityHud } from './v5_autodrive_world.js';

// V5 Task 3: Patterns vs causes, 00:50.76–01:22.00.
// A single autonomous-driving case continues into Task 4: a protest closes a road,
// the system predicts route outcomes, then updates when the crowd spreads.
const FPS = 24, DURATION = 31.24;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, 0.0032);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 300); scene.add(camera);
const aim = new THREE.Vector3(0, 0, 0); const UP = new THREE.Vector3(0, 1, 0);
let seed = 20261031; function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function makeStars() {
  let geo = window.__V5_SHARED_STAR_GEOMETRY;
  if (!geo) { const n = 760, p = new Float32Array(n * 3), c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p.set([(random() - .5) * 84, (random() - .5) * 52, -24 - random() * 96], i * 3); const q = new THREE.Color(i % 19 ? 0x3f91b0 : 0x78baff); c.set([q.r * .42, q.g * .42, q.b * .42], i * 3); } geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 4.8 }, uOpacity: { value: .5 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
  const s = new THREE.Points(geo, m); scene.add(s); return s;
}
const stars = makeStars();
const world = createAutoDriveWorld(THREE, scene, camera); const probabilities = createProbabilityHud(THREE, camera);
const title = makeText(THREE, camera, 'PATTERN ≠ CAUSE', { width: 11.2, size: 66, x: 0, y: 4.25, z: -14, color: '#e8f7ff', glow: '#55e5ff' });
const sourceLines = [
  makeText(THREE, camera, 'TEXT  ·  ROAD-CLOSURE REPORT', { width: 5.6, size: 42, x: -5.1, y: 2.45, z: -14, align: 'left' }),
  makeText(THREE, camera, 'IMAGE  ·  DASHCAM FRAME', { width: 5.6, size: 42, x: -5.1, y: 1.55, z: -14, align: 'left' }),
  makeText(THREE, camera, 'VIDEO  ·  LIVE STREET FEED', { width: 5.6, size: 42, x: -5.1, y: 0.65, z: -14, align: 'left' }),
];
const status = {
  input: makeText(THREE, camera, 'TEXT  +  IMAGE  +  LIVE VIDEO', { width: 12.0, size: 64, x: 0, y: 3.65, z: -14 }),
  pattern: makeText(THREE, camera, 'PATTERN FOUND: ROAD CLOSED', { width: 12.0, size: 58, x: 0, y: 3.65, z: -14 }),
  cause: makeText(THREE, camera, 'THE BLOCKAGE IS CAUSED BY A PROTEST', { width: 13.2, size: 52, x: 0, y: 3.65, z: -14, color: '#ffe5b1', glow: '#ffcf72' }),
  unfamiliar: makeText(THREE, camera, 'UNFAMILIAR SITUATION', { width: 10.5, size: 58, x: 0, y: 3.65, z: -14 }),
  predict: makeText(THREE, camera, 'PREDICT: WHICH ROUTE HAS LEAST IMPACT?', { width: 14.0, size: 50, x: 0, y: 3.65, z: -14 }),
  hidden: makeText(THREE, camera, 'HIDDEN VARIABLE: THE CROWD IS SPREADING', { width: 14.5, size: 48, x: 0, y: 3.65, z: -14, color: '#ffe5b1', glow: '#ffcf72' }),
  contradiction: makeText(THREE, camera, 'REALITY: ROUTE B IS BLOCKED TOO', { width: 13.8, size: 52, x: 0, y: 3.65, z: -14, color: '#ffdce2', glow: '#ff3854' }),
  update: makeText(THREE, camera, 'UPDATE: REROUTE THROUGH ROUTE C', { width: 13.5, size: 54, x: 0, y: 3.65, z: -14, color: '#d6ffea', glow: '#74e7ad' }),
};

// Task 2's scattered particle field flows onto the very same 3D street grid.
const IN = 460, mapTargets = makeMapParticleTargets(IN, 4077), inPos = new Float32Array(IN * 3), inColor = new Float32Array(IN * 3), inSource = new Float32Array(IN * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPos, 3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColor, 3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 160);
const inMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 5.2 }, uOpacity: { value: .78 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const inCloud = new THREE.Points(inGeo, inMat); scene.add(inCloud);
const IN_COLORS = [new THREE.Color(C.cyan), new THREE.Color(C.blue), new THREE.Color(C.yellow)];
let incomingReady = false, inheritedCamera = new THREE.Vector3(0, 0, 28), inheritedAim = new THREE.Vector3(0, 0, 0), inheritedStar = 0;
function prepareIncoming() {
  if (incomingReady) return;
  const field = window.__V5_REASONING_EXIT_FIELD;
  for (let i = 0; i < IN; i++) {
    const j = i * 3;
    if (field?.positions && field.count) { const k = Math.floor((i + .5) * field.count / IN) * 3; inSource.set(field.positions.subarray(k, k + 3), j); inPos.set(field.positions.subarray(k, k + 3), j); if (field.colors) inColor.set(field.colors.subarray(k, k + 3), j); else inColor.set([IN_COLORS[i % 3].r, IN_COLORS[i % 3].g, IN_COLORS[i % 3].b], j); }
    else { inSource.set([mapTargets[j] + (random() - .5) * 8, 1 + random() * 8, mapTargets[j + 2] + (random() - .5) * 6], j); inPos.set(inSource.subarray(j, j + 3), j); inColor.set([IN_COLORS[i % 3].r, IN_COLORS[i % 3].g, IN_COLORS[i % 3].b], j); }
  }
  if (field?.cameraPosition) inheritedCamera.copy(field.cameraPosition); if (field?.cameraTarget) inheritedAim.copy(field.cameraTarget); inheritedStar = Number.isFinite(field?.starRotationY) ? field.starRotationY : 0;
  inGeo.attributes.position.needsUpdate = true; inGeo.attributes.color.needsUpdate = true; incomingReady = true;
}

// Exit particles lie along the same road grid so Task 4 can reopen the same case without an abstract shape.
const OUT = 460, outTarget = makeMapParticleTargets(OUT, 4077), outPos = new Float32Array(OUT * 3), outColors = new Float32Array(OUT * 3);
const outGeo = new THREE.BufferGeometry(); outGeo.setAttribute('position', new THREE.BufferAttribute(outPos, 3).setUsage(THREE.DynamicDrawUsage)); outGeo.setAttribute('color', new THREE.BufferAttribute(outColors, 3)); outGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 160);
const outMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 5.0 }, uOpacity: { value: 0 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const outCloud = new THREE.Points(outGeo, outMat); scene.add(outCloud);
for (let i = 0; i < OUT; i++) { const c = new THREE.Color(i % 5 === 0 ? C.green : i % 3 === 0 ? C.blue : C.cyan); outColors.set([c.r, c.g, c.b], i * 3); outPos.set(outTarget.subarray(i * 3, i * 3 + 3), i * 3); }

const statusMap = Object.entries(status);
function placeCar(t) {
  if (t < 17.1) { world.placeCar(1, 0.025); return; }
  if (t < 21.15) { world.placeCar(1, .025 + smooth((t - 17.1) / 4.05) * .315); return; }
  if (t < 24.2) { world.placeCar(1, .34 + smooth((t - 21.15) / 3.05) * .28); return; }
  if (t < 28.65) { world.placeCar(1, .62); return; }
  if (t < 30.1) { world.placeCar(1, .62); return; }
  world.placeCar(2, .02 + smooth((t - 30.1) / 1.14) * .05);
}
function renderFrame(frame) {
  const t = clamp(Number(frame) / FPS, 0, DURATION); prepareIncoming();
  const arrive = smooth(t / 1.2); const p = inGeo.attributes.position.array;
  for (let i = 0; i < IN; i++) { const j = i * 3; p[j] = THREE.MathUtils.lerp(inSource[j], mapTargets[j], arrive); p[j + 1] = THREE.MathUtils.lerp(inSource[j + 1], mapTargets[j + 1], arrive); p[j + 2] = THREE.MathUtils.lerp(inSource[j + 2], mapTargets[j + 2], arrive); }
  inGeo.attributes.position.needsUpdate = true; inMat.uniforms.uOpacity.value = .78 * (1 - smooth((t - .92) / .56));
  const cityIn = smooth(t / .95); const cityOut = 1; setAlpha(world.city, cityIn * cityOut);
  world.city.visible = cityIn * cityOut > .005;
  world.setCrowdSpread(win(t, 24.1, 31.24, .9, .1));
  const routeIntro = win(t, 16.55, 32.0, .28, .25) * cityIn * cityOut;
  const predicted = t >= 28.48 ? [34, 20, 82] : [18, 76, 44];
  const chosen = t >= 28.48 ? 2 : 1;
  world.setRouteState({ visible: t > 16.55 ? [0, 1, 2] : [], selected: chosen, blocked: true, alpha: routeIntro, scores: predicted });
  placeCar(t);
  const forecast = win(t, 16.72, 28.48, .28, .22), predA = win(t, 20.95, 28.45, .35, .18), updatedA = win(t, 28.48, 31.0, .24, .16);
  probabilities.show(Math.max(forecast, predA, updatedA), predicted, chosen);
  setTextAlpha(title, win(t, 9.95, 16.3, .24, .20));
  sourceLines.forEach((s, i) => setTextAlpha(s, win(t, .25 + i * .48, 4.12, .20, .35)));
  statusMap.forEach(([key, s]) => {
    let a = 0;
    if (key === 'input') a = win(t, .20, 4.55, .25, .30);
    if (key === 'pattern') a = win(t, 4.88, 9.62, .24, .20);
    if (key === 'cause') a = win(t, 10.35, 16.4, .26, .22);
    if (key === 'unfamiliar') a = win(t, 17.0, 20.85, .22, .28);
    if (key === 'predict') a = win(t, 21.15, 24.12, .20, .22);
    if (key === 'hidden') a = win(t, 24.36, 28.48, .22, .18);
    if (key === 'contradiction') a = win(t, 28.70, 30.12, .16, .18);
    if (key === 'update') a = win(t, 30.34, 31.24, .16, .16);
    setTextAlpha(s, a);
  });
  const mapOut = smooth((t - 30.35) / .84); const op = smooth((t - 30.45) / .18), q = outGeo.attributes.position.array;
  for (let i = 0; i < OUT; i++) { const j = i * 3; const start = outTarget[j]; const startY = outTarget[j + 1]; const startZ = outTarget[j + 2]; q[j] = start + Math.sin(i * 12.989 + t) * .10 * mapOut; q[j + 1] = startY + .15 + (1 - mapOut) * .28; q[j + 2] = startZ + Math.cos(i * 7.11 + t) * .10 * mapOut; }
  outGeo.attributes.position.needsUpdate = true; outMat.uniforms.uOpacity.value = 0;
  const camIn = smooth(t / .75); camera.position.copy(inheritedCamera).lerp(new THREE.Vector3(0, 22.5, 25.5), camIn); aim.copy(inheritedAim).lerp(new THREE.Vector3(0, 0, 0), camIn); camera.lookAt(aim);
  camera.position.x += Math.sin(t * .20) * .24; camera.position.z += Math.cos(t * .16) * .18; camera.lookAt(aim); camera.updateMatrixWorld(true);
  world.setDetection(t, win(t, 4.65, 10.72, .40, .28) * cityIn * cityOut, Math.max(0, (t - 5.8) / .55));
  stars.rotation.y = inheritedStar + t * .0010; stars.rotation.x = Math.sin(t * .05) * .006;
  renderer.render(scene, camera); window.__sceneTime = t;
  if (t >= DURATION - 1 / FPS) window.__V5_WORLD_EXIT_FIELD = { count: OUT, positions: new Float32Array(outPos), colors: new Float32Array(outColors), cameraPosition: camera.position.clone(), cameraTarget: aim.clone(), starRotationY: stars.rotation.y };
}
function resize() { const w = Math.max(1, host.clientWidth || window.innerWidth), h = Math.max(1, host.clientHeight || Math.round(w * 9 / 16)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (standalone) renderFrame(Math.round((window.__playerTime || 0) * FPS)); }
if (standalone) { window.renderFrame = renderFrame; window.__sceneReady = true; window.addEventListener('resize', resize); resize(); renderFrame(0); window.dispatchEvent(new Event('v5scene-ready')); }
export { renderFrame, resize };
