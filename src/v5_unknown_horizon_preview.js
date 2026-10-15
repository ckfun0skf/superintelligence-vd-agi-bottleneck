import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, basicMat, box, beam, setAlpha, makeText, setTextAlpha } from './v5_autodrive_world.js';

// V5 Task 7 — brain dive, first-person star-dust flight, and Task 8 handoff.
// Absolute segment: 164.35–180.70 s. The new music begins at 177.455 s;
// the next narration begins at 180.70 s.
const FPS = 24, START = 164.35, END = 180.70, DURATION = END - START;
const MUSIC_CUE = 177.455 - START;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, .0011);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, .06, 520); scene.add(camera);
const aim = new THREE.Vector3(0, .28, 0);
let seed = 20261017;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const smoothstep = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// Keep the Task 6 brain exactly at its prior world-space exit position on frame 0.
const COUNT = 4600;
const startPositions = new Float32Array(COUNT * 3), startColors = new Float32Array(COUNT * 3);
const spacePositions = new Float32Array(COUNT * 3), spaceColors = new Float32Array(COUNT * 3);
const finalPositions = new Float32Array(COUNT * 3), finalColors = new Float32Array(COUNT * 3);
const currentPositions = new Float32Array(COUNT * 3), currentColors = new Float32Array(COUNT * 3);
let cameraStart = new THREE.Vector3(0, 2.35, 20.3), aimStart = new THREE.Vector3(0, .28, 0), starStart = 0, incomingReady = false;
const brainCenter = new THREE.Vector3(0, .12, -4.65);
const entryForward = brainCenter.clone().sub(cameraStart).normalize();
const entryPosition = brainCenter.clone().addScaledVector(entryForward, 1.25);
const flightStart = entryPosition.clone();

// A seeded curved flight path, viewed from the camera's first-person position.
function flightPath(u) {
  u = clamp(u);
  const s = Math.sin(Math.PI * u), envelope = s * s;
  return new THREE.Vector3(
    flightStart.x + 4.2 * envelope * Math.sin(2 * Math.PI * 1.35 * u),
    flightStart.y + 2.8 * envelope * Math.sin(2 * Math.PI * 1.05 * u + .3),
    flightStart.z - 56 * u,
  );
}
function flightTangent(u) {
  const a = flightPath(clamp(u - .001)), b = flightPath(clamp(u + .001));
  const d = b.sub(a);
  if (d.lengthSq() < .0001) d.set(0, 0, -1);
  return d.normalize();
}

// Distant stars preserve the deep 3D space as the inherited hologram fills frame.
const BACK_COUNT = 760, backPos = new Float32Array(BACK_COUNT * 3), backCol = new Float32Array(BACK_COUNT * 3);
for (let i = 0; i < BACK_COUNT; i++) {
  const j = i * 3;
  backPos.set([(random() - .5) * 100, (random() - .5) * 62, -22 - random() * 190], j);
  const col = new THREE.Color(i % 43 === 0 ? 0x9edfff : (i % 11 === 0 ? 0x608eb3 : 0x315875));
  const f = i % 43 === 0 ? .50 : (i % 11 === 0 ? .25 : .15);
  backCol.set([col.r * f, col.g * f, col.b * f], j);
}
const backGeo = new THREE.BufferGeometry();
backGeo.setAttribute('position', new THREE.BufferAttribute(backPos, 3));
backGeo.setAttribute('color', new THREE.BufferAttribute(backCol, 3));
backGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -105), 260);
const backMat = new THREE.PointsMaterial({ size: .045, vertexColors: true, transparent: true, opacity: .36, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
const backgroundStars = new THREE.Points(backGeo, backMat); scene.add(backgroundStars);

// Star-dust targets are seeded around the exact route that the camera will fly.
const spaceCols = [new THREE.Color(0x82cfff), new THREE.Color(0xdaf5ff), new THREE.Color(0x5c9dff), new THREE.Color(0x9fd9db), new THREE.Color(0xffd891)];
function buildSpaceField() {
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3, u = random(), center = flightPath(u), a = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (7 + random() * 11);
    spacePositions.set([center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius * .72, center.z + (random() - .5) * 38], j);
    const ci = random() < .08 ? 1 : random() < .12 ? 4 : random() < .18 ? 2 : random() < .28 ? 3 : 0;
    const c = spaceCols[ci].clone().multiplyScalar(ci === 1 ? .96 : .82);
    spaceColors.set([c.r, c.g, c.b], j);
  }
}

// Form the opening of the next scene from the same flying star particles:
// a compact explorer machine faces a new obstacle with a route that can branch.
const nextWorld = new THREE.Group(); scene.add(nextWorld);
const machineCenter = new THREE.Vector3(0, -1.34, -67.25);
const leftRoute = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -1.78, -68.15), new THREE.Vector3(-.85, -1.78, -69.65),
  new THREE.Vector3(-2.0, -1.78, -71.35), new THREE.Vector3(-3.25, -1.78, -76.3),
]);
const rightRoute = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -1.78, -68.15), new THREE.Vector3(.85, -1.78, -69.65),
  new THREE.Vector3(2.0, -1.78, -71.35), new THREE.Vector3(3.25, -1.78, -76.3),
]);
function sampleBoxPoint(center, dims) {
  const face = Math.floor(random() * 6), u = random() - .5, v = random() - .5;
  const p = new THREE.Vector3();
  if (face === 0) p.set(center.x + dims[0] / 2, center.y + v * dims[1], center.z + u * dims[2]);
  else if (face === 1) p.set(center.x - dims[0] / 2, center.y + v * dims[1], center.z + u * dims[2]);
  else if (face === 2) p.set(center.x + u * dims[0], center.y + dims[1] / 2, center.z + v * dims[2]);
  else if (face === 3) p.set(center.x + u * dims[0], center.y - dims[1] / 2, center.z + v * dims[2]);
  else if (face === 4) p.set(center.x + u * dims[0], center.y + v * dims[1], center.z + dims[2] / 2);
  else p.set(center.x + u * dims[0], center.y + v * dims[1], center.z - dims[2] / 2);
  return p;
}
function putFinal(i, p, color) {
  const j = i * 3, c = new THREE.Color(color);
  finalPositions.set([p.x, p.y, p.z], j); finalColors.set([c.r, c.g, c.b], j);
}
function sampleRoutePoint(curve) {
  const u = random(), p = curve.getPointAt(u), a = random() * Math.PI * 2, r = .045 + random() * .12;
  return p.add(new THREE.Vector3(Math.cos(a) * r, (random() - .5) * .045, Math.sin(a) * r));
}
let idx = 0;
// Rover chassis and sensor housing.
const bodyCenter = machineCenter.clone().add(new THREE.Vector3(0, .05, 0));
for (; idx < 1450; idx++) putFinal(idx, sampleBoxPoint(bodyCenter, [1.72, .56, 1.82]), 0x61dfff);
const cabinCenter = machineCenter.clone().add(new THREE.Vector3(0, .49, .20));
for (; idx < 1970; idx++) putFinal(idx, sampleBoxPoint(cabinCenter, [1.12, .42, .92]), 0x9beaff);
// Four thick wheels, sampled as 3D torus surfaces.
const wheelCenters = [
  [-.91, -.24, -.58], [.91, -.24, -.58], [-.91, -.24, .58], [.91, -.24, .58],
].map(([x, y, z]) => machineCenter.clone().add(new THREE.Vector3(x, y, z)));
for (; idx < 2690; idx++) {
  const wheel = wheelCenters[Math.floor(random() * wheelCenters.length)], a = random() * Math.PI * 2, b = random() * Math.PI * 2;
  const major = .29, minor = .105, r = major + minor * Math.cos(b);
  putFinal(idx, wheel.clone().add(new THREE.Vector3(minor * Math.sin(b), Math.cos(a) * r, Math.sin(a) * r)), 0x69a9d3);
}
// The branching route is a physical path laid onto a dark terrain slab.
for (; idx < 3570; idx++) putFinal(idx, sampleRoutePoint(idx % 2 ? leftRoute : rightRoute), idx % 2 ? 0x55e5ff : 0x74e7ad);
// A plainly visible unfamiliar road barrier/object ahead of the rover.
const obstacleCenter = new THREE.Vector3(0, -1.10, -73.25);
for (; idx < 4420; idx++) putFinal(idx, sampleBoxPoint(obstacleCenter, [1.42, 1.10, .62]), 0xffcf72);
// Small cyan sensor glints form on the rover's forward-facing camera.
const sensorCenter = machineCenter.clone().add(new THREE.Vector3(0, .64, -.58));
for (; idx < COUNT; idx++) {
  const a = random() * Math.PI * 2, r = .12 + random() * .09;
  putFinal(idx, sensorCenter.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -.14)), 0xbaf8ff);
}

// Solid 3D anchors fade in as the point cloud gathers, so the next scene reads literally.
const deck = box(nextWorld, 0, -1.93, -74.0, [14.5, .18, 24], 0x081623, .97, false);
const deckEdgeMat = new THREE.LineBasicMaterial({ color: 0x244253, transparent: true, opacity: .42, depthWrite: false, toneMapped: false });
deckEdgeMat.userData.baseOpacity = .42;
const deckEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14.5, .18, 24)), deckEdgeMat); deckEdges.position.copy(deck.position); nextWorld.add(deckEdges);
const routeMatL = basicMat(C.cyan, .95, true), routeMatR = basicMat(C.green, .90, true);
nextWorld.add(new THREE.Mesh(new THREE.TubeGeometry(leftRoute, 100, .065, 8, false), routeMatL));
nextWorld.add(new THREE.Mesh(new THREE.TubeGeometry(rightRoute, 100, .065, 8, false), routeMatR));
const rover = new THREE.Group(); rover.position.copy(machineCenter); nextWorld.add(rover);
box(rover, 0, .05, 0, [1.72, .56, 1.82], 0x102638, .98, false);
box(rover, 0, .49, .20, [1.12, .42, .92], 0x1e4356, .97, false);
const bodyEdgeMat = new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: .68, depthWrite: false, toneMapped: false }); bodyEdgeMat.userData.baseOpacity = .68;
const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.73, .57, 1.83)), bodyEdgeMat);
bodyEdges.position.set(0, .05, 0); rover.add(bodyEdges);
const cabEdgeMat = new THREE.LineBasicMaterial({ color: 0x9beaff, transparent: true, opacity: .52, depthWrite: false, toneMapped: false }); cabEdgeMat.userData.baseOpacity = .52;
const cabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.14, .44, .94)), cabEdgeMat);
cabEdges.position.set(0, .49, .20); rover.add(cabEdges);
for (const [x, y, z] of [[-.91,-.24,-.58],[.91,-.24,-.58],[-.91,-.24,.58],[.91,-.24,.58]]) {
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .22, 20), basicMat(0x0a151e, .99, false));
  tire.rotation.z = Math.PI / 2; tire.position.set(x, y, z); rover.add(tire);
  const hub = new THREE.Mesh(new THREE.TorusGeometry(.27, .048, 8, 24), basicMat(0x43c9f4, .94, true));
  hub.rotation.y = Math.PI / 2; hub.position.set(x + (x > 0 ? .12 : -.12), y, z); rover.add(hub);
}
const lidarMast = new THREE.Mesh(new THREE.CylinderGeometry(.028, .04, .17, 10), basicMat(0x3285a1, .90, true)); lidarMast.position.set(0, .78, .10); rover.add(lidarMast);
const lidarDome = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), basicMat(0x45d6ff, .86, true)); lidarDome.position.set(0, .89, .10); rover.add(lidarDome);
const lidarRing = new THREE.Mesh(new THREE.TorusGeometry(.125, .014, 8, 24), basicMat(0xa8efff, .82, true)); lidarRing.rotation.x = Math.PI / 2; lidarRing.position.set(0, .89, .10); rover.add(lidarRing);
for (const x of [-.55, .55]) box(rover, x, .20, .935, [.20, .10, .035], 0xff6d50, .90, true);
const sensor = new THREE.Group(); sensor.position.set(0, .64, -.58); rover.add(sensor);
const sensorShell = new THREE.Mesh(new THREE.SphereGeometry(.21, 16, 12), basicMat(0x164459, .98, false)); sensor.add(sensorShell);
const lens = new THREE.Mesh(new THREE.SphereGeometry(.115, 16, 12), basicMat(C.ice, .96, true)); lens.position.set(0, 0, -.14); sensor.add(lens);
for (const x of [-.48, .48]) box(rover, x, .04, -.94, [.20, .10, .065], C.cyan, .92, true);
const obstacle = new THREE.Group(); obstacle.position.copy(obstacleCenter); nextWorld.add(obstacle);
box(obstacle, 0, 0, 0, [1.42, 1.10, .62], 0x3a2814, .98, false);
const obstacleEdgeMat = new THREE.LineBasicMaterial({ color: C.yellow, transparent: true, opacity: .88, depthWrite: false, toneMapped: false }); obstacleEdgeMat.userData.baseOpacity = .88;
const obstacleOutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.44, 1.12, .64)), obstacleEdgeMat); obstacle.add(obstacleOutline);
for (const x of [-.42, 0, .42]) box(obstacle, x, 0, .325, [.12, .82, .035], x === 0 ? C.red : C.yellow, .90, true);

// Brain point cloud, subtle halo, and short-range connectivity continue Task 6's material.
const cloudGeo = new THREE.BufferGeometry();
cloudGeo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3).setUsage(THREE.DynamicDrawUsage));
cloudGeo.setAttribute('color', new THREE.BufferAttribute(currentColors, 3).setUsage(THREE.DynamicDrawUsage));
cloudGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -32), 240);
const cloudMat = new THREE.PointsMaterial({ size: .04272, vertexColors: true, transparent: true, opacity: .60, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false, sizeAttenuation: true });
const cloud = new THREE.Points(cloudGeo, cloudMat); scene.add(cloud);
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { uSize: { value: .04272 }, uOpacity: { value: 0 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.12,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}',
});
const dustCloud = new THREE.Points(cloudGeo, dustMat); scene.add(dustCloud);
const haloMat = new THREE.PointsMaterial({ size: .1068, color: 0x61cfff, transparent: true, opacity: .020, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, sizeAttenuation: true });
const haloCloud = new THREE.Points(cloudGeo, haloMat); scene.add(haloCloud);
const linksGeo = new THREE.BufferGeometry(); linksGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -32), 240);
const linksMat = new THREE.LineBasicMaterial({ color: 0x3a84ff, transparent: true, opacity: .060, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const links = new THREE.LineSegments(linksGeo, linksMat); scene.add(links);
let linkPairs = [], linkPositions;

// Individual short star trails emphasize speed without connecting unrelated stars.
const STREAK_COUNT = Math.floor(COUNT / 2), streakPos = new Float32Array(STREAK_COUNT * 2 * 3), streakCol = new Float32Array(STREAK_COUNT * 2 * 3);
const streakGeo = new THREE.BufferGeometry();
streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3).setUsage(THREE.DynamicDrawUsage));
streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
streakGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -32), 280);
const streakMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const streaks = new THREE.LineSegments(streakGeo, streakMat); streaks.frustumCulled = false; scene.add(streaks);

const whenTitle = makeText(THREE, camera, 'WHEN WILL THEY ARRIVE?', { width: 11.4, size: 74, color: '#fff0c6', glow: '#ffcf72', x: 0, y: 3.92, z: -16 });

function prepareIncoming() {
  if (incomingReady) return;
  const source = window.__V5_CAPABILITY_EXIT_FIELD || {};
  if (source.positions?.length >= COUNT * 3) {
    startPositions.set(source.positions.subarray(0, COUNT * 3));
    if (source.colors?.length >= COUNT * 3) startColors.set(source.colors.subarray(0, COUNT * 3));
  } else {
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3, a = random() * Math.PI * 2, z = random() * 2 - 1, r = Math.sqrt(1 - z * z);
      startPositions.set([r * Math.cos(a) * 3, z * 2.3, r * Math.sin(a) * 3 - 4.65], j);
      const c = new THREE.Color(C.cyan); startColors.set([c.r, c.g, c.b], j);
    }
  }
  if (source.cameraPosition) cameraStart.copy(source.cameraPosition);
  if (source.cameraTarget) aimStart.copy(source.cameraTarget);
  entryForward.copy(brainCenter).sub(cameraStart).normalize();
  entryPosition.copy(brainCenter).addScaledVector(entryForward, 1.25);
  flightStart.copy(entryPosition);
  buildSpaceField();
  starStart = Number.isFinite(source.starRotationY) ? source.starRotationY : 0;
  const cell = .392, radiusSq = .2606, grid = new Map(), pairs = [];
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3, x = startPositions[j], y = startPositions[j + 1], z = startPositions[j + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const near = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!near) continue;
      for (const k of near) {
        const q = k * 3, ax = x - startPositions[q], ay = y - startPositions[q + 1], az = z - startPositions[q + 2];
        if (ax * ax + ay * ay + az * az < radiusSq) pairs.push(k, i);
      }
    }
    const k = key(cx, cy, cz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
  }
  linkPairs = pairs; linkPositions = new Float32Array(pairs.length / 2 * 6);
  for (let e = 0; e < pairs.length / 2; e++) {
    const j = e * 6, a = pairs[e * 2] * 3, b = pairs[e * 2 + 1] * 3;
    linkPositions[j] = startPositions[a]; linkPositions[j + 1] = startPositions[a + 1]; linkPositions[j + 2] = startPositions[a + 2];
    linkPositions[j + 3] = startPositions[b]; linkPositions[j + 4] = startPositions[b + 1]; linkPositions[j + 5] = startPositions[b + 2];
  }
  linksGeo.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3).setUsage(THREE.DynamicDrawUsage));
  linksGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -32), 240);
  currentPositions.set(startPositions); currentColors.set(startColors); incomingReady = true;
}

const v = new THREE.Vector3();
function renderFrame(frame) {
  prepareIncoming();
  const t = clamp(Number(frame) / FPS, 0, DURATION);
  const zoomProgress = smoothstep(t / 5.2);
  const dustProgress = smoothstep((t - 4.70) / .95);
  const flightU = clamp((t - 5.2) / (MUSIC_CUE - 5.2));
  const flightEase = smoothstep(flightU);
  const merge = smoothstep((t - MUSIC_CUE) / 2.78);

  // Slow push through the still-recognizable brain, ending just inside its 3D volume.
  if (t < 5.2) {
    camera.position.copy(cameraStart).lerp(entryPosition, zoomProgress);
    aim.copy(aimStart).lerp(entryPosition.clone().addScaledVector(entryForward, 9), zoomProgress);
    camera.fov = 34 + 2.5 * zoomProgress;
    camera.lookAt(aim);
    camera.rotateZ(.035 * Math.sin(t * .62) * zoomProgress);
  } else {
    // Accelerate into a long curved flight; heading, pitch, and bank all change in 3D.
    const pos = flightPath(flightEase), dir = flightTangent(flightEase);
    const turnEnvelope = Math.sin(Math.PI * flightU) ** 2;
    dir.x += .30 * Math.sin(flightU * Math.PI * 3.2) * turnEnvelope;
    dir.y += .22 * Math.sin(flightU * Math.PI * 2.4 + .5) * turnEnvelope;
    dir.normalize();
    camera.position.copy(pos);
    aim.copy(pos).addScaledVector(dir, 12);
    aim.y -= 2.0 * merge;
    camera.fov = lerp(36.5, 57, smoothstep(flightU * 1.7)) * (1 - .30 * merge);
    camera.lookAt(aim);
    const roll = (.95 * Math.sin(flightU * Math.PI * 3.2) + .38 * Math.sin(flightU * Math.PI * 6.0)) * turnEnvelope * (1 - merge);
    camera.rotateZ(roll);
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  backgroundStars.rotation.y = starStart + t * .002;
  backMat.opacity = .30 + .12 * (1 - merge);

  // The Brain gently rolls as the camera closes in; at the new-music cue,
  // those same points remap from the flight volume to the next-scene objects.
  const brainYaw = .07 * Math.sin(t * .48) * (1 - dustProgress), brainPitch = .035 * Math.sin(t * .37) * (1 - dustProgress);
  const cy = Math.cos(brainYaw), sy = Math.sin(brainYaw), cx = Math.cos(brainPitch), sx = Math.sin(brainPitch);
  for (let i = 0; i < COUNT; i++) {
    const j = i * 3;
    if (dustProgress > .999) {
      currentPositions[j] = lerp(spacePositions[j], finalPositions[j], merge);
      currentPositions[j + 1] = lerp(spacePositions[j + 1], finalPositions[j + 1], merge);
      currentPositions[j + 2] = lerp(spacePositions[j + 2], finalPositions[j + 2], merge);
      for (let k = 0; k < 3; k++) currentColors[j + k] = lerp(spaceColors[j + k], finalColors[j + k], merge);
    } else {
      const x = startPositions[j] - brainCenter.x, y = startPositions[j + 1] - brainCenter.y, z = startPositions[j + 2] - brainCenter.z;
      const rx = x * cy + z * sy, rz = -x * sy + z * cy;
      const brainX = brainCenter.x + rx;
      const brainY = brainCenter.y + y * cx - rz * sx;
      const brainZ = brainCenter.z + y * sx + rz * cx;
      const spacedX = lerp(brainX, spacePositions[j], dustProgress), spacedY = lerp(brainY, spacePositions[j + 1], dustProgress), spacedZ = lerp(brainZ, spacePositions[j + 2], dustProgress);
      currentPositions[j] = lerp(spacedX, finalPositions[j], merge);
      currentPositions[j + 1] = lerp(spacedY, finalPositions[j + 1], merge);
      currentPositions[j + 2] = lerp(spacedZ, finalPositions[j + 2], merge);
      for (let k = 0; k < 3; k++) {
        const a = lerp(startColors[j + k], spaceColors[j + k], dustProgress);
        currentColors[j + k] = lerp(a, finalColors[j + k], merge);
      }
    }
  }
  cloudGeo.attributes.position.needsUpdate = true; cloudGeo.attributes.color.needsUpdate = true;
  cloudMat.opacity = .60 * (1 - dustProgress);
  dustMat.uniforms.uOpacity.value = .94 * dustProgress * (1 - .08 * merge);
  dustMat.uniforms.uSize.value = lerp(.04272, .092, dustProgress);
  haloMat.opacity = .020 * (1 - dustProgress);
  const linkAlpha = .060 * (1 - dustProgress);
  if (linkAlpha > .001) {
    for (let e = 0; e < linkPairs.length / 2; e++) {
      const j = e * 6, a = linkPairs[e * 2] * 3, b = linkPairs[e * 2 + 1] * 3;
      linkPositions[j] = currentPositions[a]; linkPositions[j + 1] = currentPositions[a + 1]; linkPositions[j + 2] = currentPositions[a + 2];
      linkPositions[j + 3] = currentPositions[b]; linkPositions[j + 4] = currentPositions[b + 1]; linkPositions[j + 5] = currentPositions[b + 2];
    }
    linksGeo.attributes.position.needsUpdate = true;
  }
  linksMat.opacity = linkAlpha;

  // Short, independent trails move with the camera's forward vector: stars, not wires.
  const flightOn = smoothstep((t - 5.15) / .65) * (1 - smoothstep((t - MUSIC_CUE) / .48));
  const forward = t < 5.2 ? entryForward.clone() : flightTangent(flightEase);
  if (flightOn > .001) {
    for (let n = 0; n < STREAK_COUNT; n++) {
      const i = n * 2, j = i * 3, k = n * 6;
      v.set(currentPositions[j], currentPositions[j + 1], currentPositions[j + 2]);
      const distance = v.distanceTo(camera.position), speedFactor = .15 + .85 * clamp(distance / 25);
      const len = (.16 + .86 * speedFactor) * flightOn;
      streakPos[k] = v.x; streakPos[k + 1] = v.y; streakPos[k + 2] = v.z;
      streakPos[k + 3] = v.x - forward.x * len; streakPos[k + 4] = v.y - forward.y * len; streakPos[k + 5] = v.z - forward.z * len;
      const r = currentColors[j], g = currentColors[j + 1], b = currentColors[j + 2];
      streakCol[k] = r; streakCol[k + 1] = g; streakCol[k + 2] = b;
      streakCol[k + 3] = r * .18; streakCol[k + 4] = g * .18; streakCol[k + 5] = b * .18;
    }
    streakGeo.attributes.position.needsUpdate = true; streakGeo.attributes.color.needsUpdate = true;
  }
  streakMat.opacity = .95 * flightOn;
  setAlpha(nextWorld, merge);
  const titleAlpha = 1 - smoothstep((t - .78) / 1.15);
  setTextAlpha(whenTitle, titleAlpha);

  if (t >= DURATION - 1 / FPS) {
    const positions = new Float32Array(COUNT * 3);
    positions.set(currentPositions);
    window.__V5_HORIZON_EXIT_FIELD = { count: COUNT, positions, colors: new Float32Array(currentColors), cameraPosition: camera.position.clone(), cameraTarget: aim.clone(), starRotationY: backgroundStars.rotation.y };
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
