import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, basicMat, box, beam, setAlpha, makeText, setTextAlpha } from './v5_autodrive_world.js';

// V5 Task 8 — a field rover learns, reasons, and adapts in unfamiliar terrain.
// Absolute segment: 180.70–198.00 s (the opening 0.70 s of narration_07 is silent).
const FPS = 24, START = 180.70, END = 198.00, DURATION = END - START, COUNT = 4600;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, .0011);
const camera = new THREE.PerspectiveCamera(39, 16 / 9, .06, 520); scene.add(camera);
const smoothstep = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
let seed = 20261018;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }

// Task 7's points and cloned scene objects create the exact opening frame.
let incomingReady = false, incomingWorld = null, incomingStars = null;
let incomingCameraPosition = new THREE.Vector3(0, 1.8, -60), incomingCameraTarget = new THREE.Vector3(0, 0, -68);
let incomingCameraQuaternion = new THREE.Quaternion(), incomingCameraFov = 39;
const pointPositions = new Float32Array(COUNT * 3), pointColors = new Float32Array(COUNT * 3);
const cloudGeo = new THREE.BufferGeometry();
cloudGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3).setUsage(THREE.DynamicDrawUsage));
cloudGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
cloudGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -32), 240);
const cloudMat = new THREE.PointsMaterial({ size: .04272, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false, sizeAttenuation: true });
scene.add(new THREE.Points(cloudGeo, cloudMat));
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { uSize: { value: .092 }, uOpacity: { value: 0 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.12,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}',
});
scene.add(new THREE.Points(cloudGeo, dustMat));

const world = new THREE.Group(); world.name = 'Task 8 unfamiliar field course'; scene.add(world);
const rover = new THREE.Group();
const wheelAssemblies = [];
let courseCurve, pathBlocked, pathSteep, pathSafe, pathContinuation, scanLines, scanMaterial, scanRing, scanRingMaterial;
let mainTitle, roverLabel, learnTitle, reasonTitle, adaptTitle, situationsTitle, uncertainTitle, memoryLabel;
let prepared = false, exitReady = false;

function rememberOpacity(material) { material.userData.baseOpacity = material.opacity; return material; }
function lineCurve(points, color, radius, opacity = .88) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const material = basicMat(color, opacity, true);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius, 8, false), material);
  world.add(mesh); return { curve, mesh, material };
}
function addRock(x, y, z, sx, sy, sz, color, rot = 0) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), basicMat(color, .98, false));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rot * .28, rot, rot * .16); world.add(m); return m;
}

function buildRover() {
  rover.position.set(0, -1.34, -67.25); world.add(rover);
  const chassis = box(rover, 0, .07, 0, [1.95, .54, 2.42], 0x102737, .99, false);
  const deck = box(rover, 0, .40, -.03, [1.62, .18, 1.64], 0x1a5268, .98, false);
  box(rover, 0, .18, -1.20, [1.72, .20, .14], 0x26627a, .98, false);
  const chassisEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.97, .56, 2.44)), rememberOpacity(new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .76, depthWrite: false, toneMapped: false })));
  chassisEdge.position.set(0, .07, 0); rover.add(chassisEdge);
  const deckEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.64, .20, 1.66)), rememberOpacity(new THREE.LineBasicMaterial({ color: 0x9aeaff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })));
  deckEdge.position.copy(deck.position); rover.add(deckEdge);
  // Six independent wheel pods make this unmistakably a field/exploration rover.
  for (const side of [-1, 1]) for (const z of [-.92, 0, .92]) {
    const pod = new THREE.Group(); pod.position.set(side * 1.03, -.22, z); rover.add(pod);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .27, 18), basicMat(0x07121b, .99, false));
    tire.rotation.z = Math.PI / 2; pod.add(tire);
    const tread = new THREE.Mesh(new THREE.TorusGeometry(.285, .028, 6, 20), basicMat(0x50748a, .92, false));
    tread.rotation.y = Math.PI / 2; pod.add(tread);
    const hub = new THREE.Mesh(new THREE.TorusGeometry(.205, .045, 8, 20), basicMat(side < 0 ? C.cyan : C.green, .94, true));
    hub.rotation.y = Math.PI / 2; hub.position.x = side * .15; pod.add(hub);
    const spokeMat = basicMat(0x6c91a6, .88, false);
    for (let s = 0; s < 5; s++) {
      const a = s * Math.PI * 2 / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(.035, .30, .045), spokeMat);
      spoke.position.set(side * .16, Math.cos(a) * .14, Math.sin(a) * .14); spoke.rotation.x = a; pod.add(spoke);
    }
    beam(rover, new THREE.Vector3(side * .66, -.02, z * .94), new THREE.Vector3(side * 1.03, -.22, z), .055, 0x387d96, .88, false);
    wheelAssemblies.push({ pod, baseY: -.22, phase: wheelAssemblies.length * .83 + z * 1.9, side, z });
  }
  // Raised instrument mast, stereo cameras, and a small communications antenna.
  beam(rover, new THREE.Vector3(0, .48, -.38), new THREE.Vector3(0, .97, -.43), .055, 0x4ea9c8, .94, false);
  box(rover, 0, 1.04, -.43, [.58, .32, .36], 0x1c5064, .98, false);
  box(rover, 0, 1.04, -.625, [.62, .07, .045], C.cyan, .92, true);
  for (const x of [-.17, .17]) {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), basicMat(C.ice, .96, true));
    lens.position.set(x, 1.05, -.64); rover.add(lens);
  }
  const dish = new THREE.Mesh(new THREE.TorusGeometry(.11, .018, 8, 18), basicMat(C.yellow, .82, true));
  dish.position.set(.57, .58, .3); dish.rotation.y = Math.PI / 2; rover.add(dish);
  for (const x of [-.66, .66]) {
    box(rover, x, .34, .68, [.46, .05, .55], 0x2b6172, .9, false);
    const panelFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.47, .06, .56)), rememberOpacity(new THREE.LineBasicMaterial({ color: 0x71d4e8, transparent: true, opacity: .60, depthWrite: false, toneMapped: false })));
    panelFrame.position.set(x, .34, .68); rover.add(panelFrame);
  }
  box(rover, 0, -.02, -1.255, [1.72, .12, .12], 0x53dcff, .92, true);
  for (const x of [-.68, .68]) box(rover, x, .20, 1.22, [.20, .12, .045], C.red, .90, true);
  rover.userData.chassis = chassis;
}

function buildTerrain() {
  // Rugged ground slab, ledges, and low-contrast tactical grid.
  const ground = box(world, 0, -2.20, -87.5, [34, .34, 72], 0x0b1720, .99, false);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(34, .34, 72)), rememberOpacity(new THREE.LineBasicMaterial({ color: 0x355165, transparent: true, opacity: .44, depthWrite: false, toneMapped: false })));
  edge.position.copy(ground.position); world.add(edge);
  for (let z = -62; z >= -116; z -= 4) {
    const stripe = box(world, 0, -2.018, z, [31, .014, .018], 0x345065, .28, true);
    stripe.material.userData.baseOpacity = .28;
  }
  // First unknown: a blocking rock cluster in the rover's straight-ahead path.
  addRock(-.55, -1.65, -73.0, 1.12, .76, .79, 0x8b6244, .32);
  addRock(.55, -1.78, -73.6, .72, .58, .62, 0x624f41, 1.14);
  addRock(-1.55, -1.86, -72.65, .52, .40, .58, 0x48616b, .72);
  addRock(1.3, -1.88, -74.15, .58, .43, .46, 0x60737a, 1.7);
  // A transverse fissure; the course bends around its end rather than floating over it.
  const fissure = box(world, 0, -2.017, -83.0, [8.2, .026, .98], 0x02050b, .99, false);
  for (const side of [-1, 1]) {
    const lip = box(world, side * 4.2, -1.96, -83.0, [.20, .16, 1.34], 0x42525b, .98, false);
    lip.rotation.z = side * -.12;
  }
  // A narrow sensor gate is the third, visibly different test.
  for (const x of [-1.9, 1.9]) {
    box(world, x, -1.18, -90.7, [.26, 1.72, .36], 0x443a2a, .98, false);
    const postEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.28, 1.74, .38)), rememberOpacity(new THREE.LineBasicMaterial({ color: C.yellow, transparent: true, opacity: .9, depthWrite: false, toneMapped: false })));
    postEdge.position.set(x, -1.18, -90.7); world.add(postEdge);
    box(world, x, -.45, -90.48, [.30, .12, .12], C.yellow, .92, true);
  }
  box(world, 0, -.35, -90.7, [3.94, .13, .12], 0x3a3a32, .96, false);
  // A final broken ridge marks the edge of the rover's known map.
  addRock(-4.2, -1.48, -96.4, 2.2, 1.0, 1.0, 0x6b5544, .8);
  addRock(3.9, -1.52, -97.4, 2.3, .98, 1.15, 0x725e4c, 1.8);
  addRock(-1.0, -1.76, -98.0, 1.3, .62, .75, 0x3f555f, .45);
  // A distant low-poly ridge gives the final unknown horizon a physical destination plane.
  addRock(-12.0, -.52, -111.0, 9.5, 2.8, 2.8, 0x14232d, .42);
  addRock(11.0, -.70, -112.0, 10.5, 3.0, 3.2, 0x182933, 1.02);
  addRock(0.0, -.36, -114.0, 7.0, 1.7, 2.0, 0x101e27, .75);

  // Three candidate tracks: blocked straight, risky slope, and the chosen route.
  pathBlocked = lineCurve([[0,-1.91,-68.2],[0,-1.91,-70.4],[0,-1.91,-72.2]], C.red, .068, .95);
  pathSteep = lineCurve([[0,-1.91,-68.2],[-1.9,-1.91,-70.5],[-3.0,-1.91,-72.0],[-3.9,-1.91,-75.0],[-3.4,-1.91,-78.0]], C.yellow, .054, .86);
  pathSafe = lineCurve([[0,-1.91,-68.2],[1.5,-1.91,-70.5],[2.7,-1.91,-73.0],[2.8,-1.91,-77.4],[1.2,-1.91,-79.4],[-5.35,-1.91,-81.1],[-5.35,-1.91,-84.7],[0,-1.91,-88.0],[0,-1.91,-94.0]], C.green, .074, .98);
  courseCurve = new THREE.CatmullRomCurve3([
    [0,-1.34,-67.25],[0,-1.34,-70.5],[2.7,-1.34,-73.2],[2.8,-1.34,-77.4],
    [1.2,-1.34,-79.4],[-5.35,-1.34,-81.1],[-5.35,-1.34,-84.7],[0,-1.34,-88.0],[0,-1.34,-94.0],
  ].map(p => new THREE.Vector3(...p)));
  pathContinuation = lineCurve([[0,-1.91,-94.0],[0,-1.91,-98.5],[.3,-1.91,-104.0],[0,-1.91,-111.0]], C.cyan, .048, .74);
  buildRover();
}

function prepareIncoming() {
  if (prepared) return;
  const field = window.__V5_HORIZON_EXIT_FIELD || {};
  if (field.positions?.length >= COUNT * 3) pointPositions.set(field.positions.subarray(0, COUNT * 3));
  if (field.colors?.length >= COUNT * 3) pointColors.set(field.colors.subarray(0, COUNT * 3));
  if (field.nextWorld) { incomingWorld = field.nextWorld; scene.add(incomingWorld); }
  if (field.backgroundStars) { incomingStars = field.backgroundStars; scene.add(incomingStars); }
  if (field.cameraPosition) incomingCameraPosition.copy(field.cameraPosition);
  if (field.cameraTarget) incomingCameraTarget.copy(field.cameraTarget);
  if (field.cameraQuaternion) incomingCameraQuaternion.copy(field.cameraQuaternion);
  if (Number.isFinite(field.cameraFov)) incomingCameraFov = field.cameraFov;
  camera.position.copy(incomingCameraPosition); camera.quaternion.copy(incomingCameraQuaternion); camera.fov = incomingCameraFov; camera.updateProjectionMatrix();
  buildTerrain();
  mainTitle = makeText(THREE, camera, 'AGI MAY NOT NEED TO KNOW EVERYTHING', { width: 15.3, size: 64, color: '#e4faff', glow: '#3fd7ff', x: 0, y: 4.10, z: -14 });
  roverLabel = makeText(THREE, camera, 'FIELD ROVER · UNIT 01', { width: 8.5, size: 48, color: '#b7e9f4', glow: '#39bddf', x: -3.9, y: -3.48, z: -13, align: 'left' });
  learnTitle = makeText(THREE, camera, 'LEARN', { width: 11.0, size: 116, color: '#c8f8ff', glow: '#45dfff', x: -4.3, y: 2.72, z: -13 });
  reasonTitle = makeText(THREE, camera, 'REASON', { width: 11.0, size: 116, color: '#d5efff', glow: '#65adff', x: -4.3, y: 2.72, z: -13 });
  adaptTitle = makeText(THREE, camera, 'ADAPT', { width: 11.0, size: 116, color: '#dbffec', glow: '#59e9a5', x: -4.3, y: 2.72, z: -13 });
  situationsTitle = makeText(THREE, camera, 'UNFAMILIAR SITUATIONS', { width: 12.5, size: 56, color: '#def9ff', glow: '#44cce9', x: 0, y: 2.82, z: -14 });
  uncertainTitle = makeText(THREE, camera, 'DESTINATION UNCERTAIN', { width: 15.2, size: 76, color: '#fff0c8', glow: '#ffbd65', x: 0, y: 4.02, z: -15 });
  memoryLabel = makeText(THREE, camera, 'OBSTACLE RECORDED', { width: 7.8, size: 42, color: '#c7f7ff', glow: '#3fd7ff', x: -4.0, y: 1.65, z: -13, align: 'left' });
  const rayPositions = new Float32Array(6 * 2 * 3);
  const rayGeo = new THREE.BufferGeometry(); rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3).setUsage(THREE.DynamicDrawUsage));
  scanMaterial = rememberOpacity(new THREE.LineBasicMaterial({ color: 0x75eaff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scanLines = new THREE.LineSegments(rayGeo, scanMaterial); scanLines.frustumCulled = false; scene.add(scanLines);
  scanRingMaterial = basicMat(C.cyan, 0, true);
  scanRing = new THREE.Mesh(new THREE.TorusGeometry(1, .018, 6, 64), scanRingMaterial); scanRing.rotation.x = Math.PI / 2; scene.add(scanRing);
  prepared = true;
}

const rayStart = new THREE.Vector3(), rayEnd = new THREE.Vector3();
function renderFrame(frame) {
  prepareIncoming();
  const t = clamp(Number(frame) / FPS, 0, DURATION);
  const reveal = smoothstep(t / 1.15);
  const learn = smoothstep((t - 6.75) / .38);
  const reason = smoothstep((t - 7.92) / .32);
  const adapt = smoothstep((t - 9.00) / .36);
  const unfamiliar = smoothstep((t - 11.9) / .40);
  const horizon = smoothstep((t - 14.55) / .72);

  // Replace the ambiguous handoff silhouette with a clearly articulated six-wheel rover.
  if (incomingWorld) setAlpha(incomingWorld, 1 - reveal);
  if (incomingStars?.material) incomingStars.material.opacity = .30 - .16 * reveal;
  setAlpha(world, reveal);
  dustMat.uniforms.uOpacity.value = .8648 * (1 - reveal);
  cloudMat.opacity = 0;
  scene.fog.density = lerp(.0011, .018, reveal * horizon);

  const driveU = smoothstep((t - 8.96) / 5.55);
  const roverPoint = courseCurve.getPointAt(driveU);
  rover.position.copy(roverPoint);
  const tangent = courseCurve.getTangentAt(Math.min(.999, driveU + .0008)).normalize();
  rover.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  rover.scale.setScalar(lerp(.22, 1, smoothstep(t / .68)));
  const terrainResponse = Math.max(smoothstep((t - 9.55) / .45) * (1 - smoothstep((t - 10.6) / .35)), smoothstep((t - 11.2) / .28) * (1 - smoothstep((t - 13.45) / .36)));
  for (const wheel of wheelAssemblies) {
    wheel.pod.position.y = wheel.baseY + terrainResponse * (.09 + .10 * Math.max(0, Math.sin(t * 5.5 + wheel.phase)));
    wheel.pod.rotation.x = -driveU * 18 + terrainResponse * .10 * Math.sin(t * 4.4 + wheel.phase);
  }
  const orbit = lerp(.94, .16, horizon) + .075 * Math.sin(t * .24) * (1 - horizon);
  const offset = new THREE.Vector3(9.3 * Math.sin(orbit), 5.5 - 1.6 * horizon, 8.7 * Math.cos(orbit) + 1.2 * horizon);
  const cameraGoal = rover.position.clone().add(offset);
  const targetGoal = rover.position.clone().add(new THREE.Vector3(0, .56, -3.7 - 5.3 * horizon));
  if (t > 0) {
    const settle = smoothstep(t / .68);
    camera.position.copy(incomingCameraPosition).lerp(cameraGoal, settle);
    camera.lookAt(incomingCameraTarget.clone().lerp(targetGoal, settle));
    camera.fov = lerp(incomingCameraFov, lerp(41, 46, unfamiliar), settle);
    camera.fov = lerp(camera.fov, 43, horizon * .82);
    camera.updateProjectionMatrix();
    camera.rotateZ(.025 * Math.sin(t * .7) * (1 - horizon));
  } else {
    camera.position.copy(incomingCameraPosition); camera.quaternion.copy(incomingCameraQuaternion); camera.fov = incomingCameraFov; camera.updateProjectionMatrix();
  }

  // The failed straight path is mapped first; only then do alternatives appear and the rover commits.
  const blockedAlpha = .92 * learn * (1 - smoothstep((t - 8.34) / .34));
  const steepAlpha = .75 * reason * (1 - smoothstep((t - 9.5) / .52));
  const safeAlpha = .98 * reason * (1 - horizon * .84);
  pathBlocked.material.opacity = .95 * reveal * blockedAlpha;
  pathSteep.material.opacity = .86 * reveal * steepAlpha;
  pathSafe.material.opacity = .98 * reveal * safeAlpha;
  pathContinuation.material.opacity = .74 * reveal * (adapt * (1 - horizon) + horizon * .18);

  // Six short scanning rays map the obstructing rocks as the word “learn” lands.
  const scanAlpha = .86 * smoothstep((t - 6.75) / .24) * (1 - smoothstep((t - 8.60) / .30)) * reveal;
  scanMaterial.opacity = scanAlpha;
  if (scanAlpha > .005) {
    rover.localToWorld(rayStart.set(0, 1.04, -.67));
    const attr = scanLines.geometry.attributes.position;
    for (let n = 0; n < 6; n++) {
      const j = n * 6, a = n * Math.PI / 3 + t * 2.4;
      rayEnd.set(-.55 + Math.cos(a) * .78, -1.48 + Math.sin(a) * .48, -73.15 + Math.sin(a * .7) * .38);
      attr.array[j] = rayStart.x; attr.array[j + 1] = rayStart.y; attr.array[j + 2] = rayStart.z;
      attr.array[j + 3] = rayEnd.x; attr.array[j + 4] = rayEnd.y; attr.array[j + 5] = rayEnd.z;
    }
    attr.needsUpdate = true;
  }
  scanRing.position.set(-.55, -1.99, -73.15); scanRing.scale.setScalar(.82 + .20 * Math.sin(t * 5.2));
  scanRingMaterial.opacity = scanAlpha * .62;

  const titleAlpha = smoothstep(t / .22) * (1 - smoothstep((t - 4.25) / .62));
  setTextAlpha(mainTitle, titleAlpha);
  setTextAlpha(roverLabel, smoothstep((t - .22) / .42) * (1 - smoothstep((t - 4.3) / .45)));
  setTextAlpha(memoryLabel, .96 * smoothstep((t - 6.92) / .20) * (1 - smoothstep((t - 7.96) / .18)));
  setTextAlpha(learnTitle, smoothstep((t - 6.88) / .18) * (1 - smoothstep((t - 8.00) / .16)));
  setTextAlpha(reasonTitle, smoothstep((t - 7.91) / .18) * (1 - smoothstep((t - 9.08) / .18)));
  setTextAlpha(adaptTitle, smoothstep((t - 8.96) / .18) * (1 - smoothstep((t - 9.98) / .25)));
  setTextAlpha(situationsTitle, smoothstep((t - 11.84) / .22) * (1 - smoothstep((t - 14.48) / .34)));
  setTextAlpha(uncertainTitle, smoothstep((t - 14.70) / .20));

  // A restrained point pulse marks newly surveyed ground; no decorative wire web.
  rover.userData.chassis.material.color.setHex(t > 9.0 ? 0x123241 : 0x102737);

  if (t >= DURATION - 1 / FPS && !exitReady) {
    const positions = new Float32Array(COUNT * 3), colors = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color(C.cyan), new THREE.Color(C.ice), new THREE.Color(C.green), new THREE.Color(C.yellow)];
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3, u = random(), p = courseCurve.getPointAt(u), a = random() * Math.PI * 2, r = 1.4 + random() * 9.0;
      positions.set([p.x + Math.cos(a) * r, p.y + .4 + random() * 8.4, p.z - random() * 28], j);
      const c = palette[Math.floor(random() * palette.length)]; colors.set([c.r, c.g, c.b], j);
    }
    window.__V5_TASK8_EXIT_FIELD = { count: COUNT, positions, colors, cameraPosition: camera.position.clone(), cameraTarget: targetGoal, cameraQuaternion: camera.quaternion.clone(), cameraFov: camera.fov };
    exitReady = true;
  }
  renderer.render(scene, camera);
  window.__sceneTime = START + t;
}

function resize() {
  const w = Math.max(1, host.clientWidth || window.innerWidth), h = Math.max(1, host.clientHeight || Math.round(w * 9 / 16));
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (standalone) renderFrame(Math.round(((window.__playerTime || START) - START) * FPS));
}
if (standalone) {
  window.renderFrame = renderFrame; window.__sceneReady = true; window.addEventListener('resize', resize); resize(); renderFrame(0); window.dispatchEvent(new Event('v5scene-ready'));
}
export { renderFrame, resize };
