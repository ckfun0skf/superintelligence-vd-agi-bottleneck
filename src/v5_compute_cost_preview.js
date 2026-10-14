import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, setAlpha, box, beam } from './v5_autodrive_world.js';

// Task 5 — The cost of computation (01:50–02:20).
// Literal visual thread: a recognizable AI server room, its required inputs,
// useful capabilities, a plainly labeled unfamiliar test, and its resource bill.
const FPS = 24, DURATION = 30;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, 0.0025);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 300); scene.add(camera);
const aim = new THREE.Vector3(0, .15, 0);
let seed = 20261014;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function hudText(value, opts = {}) { return makeText(THREE, camera, value, { width: 12, size: 68, x: 0, y: 4.2, z: -16, ...opts }); }
function frontBox(parent, x, y, z, w, h, d, color, opacity = 1, additive = false) {
  const m = box(parent, x, y, z, [w, h, d], color, opacity, additive);
  m.material.depthTest = false; m.material.depthWrite = false; m.renderOrder = 10; return m;
}
function fadeGroup(group, alpha) {
  const a = clamp(alpha); group.visible = a > .006;
  group.traverse(o => {
    if (!o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) { m.transparent = true; m.depthWrite = false; m.opacity = (m.userData.baseOpacity ?? 1) * a; }
  });
}

// A restrained inherited starfield preserves the V5 spatial depth, not the foreground story.
let starGeo = window.__V5_SHARED_STAR_GEOMETRY;
if (!starGeo) {
  const p = new Float32Array(600 * 3), c = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) { p.set([(random() - .5) * 90, (random() - .5) * 54, -28 - random() * 100], i * 3); const q = new THREE.Color(i % 17 ? 0x287693 : 0x547da6); c.set([q.r * .28, q.g * .28, q.b * .28], i * 3); }
  starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
}
const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  uniforms: { uSize: { value: 3.2 }, uOpacity: { value: .3 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' }));
scene.add(stars);

// The first hero is unmistakably a server rack: rails, hot-swap bays, fans and status LEDs.
const rackBank = new THREE.Group(); scene.add(rackBank);
const rackUnits = [];
function createRack(x, z, index) {
  const g = new THREE.Group(); g.position.set(x, .78, z); rackBank.add(g);
  const dark = 0x101c2a, face = 0x14283a, trim = 0x32637a;
  box(g, 0, 0, 0, [1.62, 4.25, 1.34], dark, .99, false);
  box(g, 0, 0, .69, [1.47, 4.05, .06], 0x09121c, .99, false);
  for (const sx of [-.77, .77]) box(g, sx, 0, .73, [.075, 4.16, .12], trim, .96, false);
  box(g, 0, 2.03, .73, [1.50, .12, .13], C.cyan, .84, true);
  box(g, 0, -2.13, .02, [1.9, .22, 1.55], 0x0b121c, .98, false);
  const fans = [], leds = [];
  for (let row = 0; row < 6; row++) {
    const y = 1.55 - row * .62;
    box(g, 0, y, .79, [1.34, .53, .08], face, .98, false);
    box(g, 0, y - .25, .845, [1.27, .035, .025], trim, .78, true);
    for (let k = 0; k < 3; k++) {
      const fan = new THREE.Group(); fan.position.set(-.43 + k * .43, y + .015, .87); g.add(fan);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.145, .024, 7, 24), basicMat(row % 2 ? C.blue : C.cyan, .78, true)); fan.add(ring);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .06, 12), basicMat(0x9ceeff, .92, true)); hub.rotation.x = Math.PI / 2; hub.position.z = .015; fan.add(hub);
      for (let b = 0; b < 4; b++) { const blade = box(fan, 0, .085, .02, [.035, .13, .018], 0x6bbdd2, .62, true); blade.rotation.z = b * Math.PI / 2; }
      fans.push({ fan, phase: row * .7 + k * .45 });
    }
    for (let q = 0; q < 3; q++) { const led = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), basicMat(q === 1 ? C.green : C.cyan, .3, true)); led.position.set(.59 + q * .11, y + .12, .88); g.add(led); leds.push({ led, phase: row * .6 + q }); }
  }
  const nameplate = box(g, 0, 1.80, .86, [.64, .18, .045], 0x163647, .98, false);
  nameplate.material.depthWrite = false;
  const id = makeText(THREE, g, 'AI', { width: .38, size: 112, color: '#e8fcff', glow: '#55e5ff', x: 0, y: 1.78, z: .91 });
  rackUnits.push({ g, fans, leds, index, id });
  return g;
}
// Central cabinet first, then a bank that expands around it as capacity grows.
const rackSpecs = [
  { x: 0, z: -2.4, start: 0 }, { x: -1.75, z: -2.55, start: 2.2 }, { x: 1.75, z: -2.55, start: 2.2 },
  { x: -3.5, z: -3.4, start: 17.3 }, { x: 3.5, z: -3.4, start: 17.3 },
];
rackSpecs.forEach((r, i) => createRack(r.x, r.z, i));
// Floor perspective strips and rack-room aisle make the opening feel like a real place.
const floor = new THREE.Group(); scene.add(floor);
box(floor, 0, -1.48, -2.7, [13.2, .10, 10.6], 0x07131e, .95, false);
for (let i = -5; i <= 5; i++) {
  const x = i * 1.15; beam(floor, new THREE.Vector3(x, -1.41, -7.4), new THREE.Vector3(x, -1.41, 2.2), .012, 0x24617a, .27, true);
}
for (let z = -7; z <= 2; z += 1.4) beam(floor, new THREE.Vector3(-6.4, -1.405, z), new THREE.Vector3(6.4, -1.405, z), .012, 0x24617a, .24, true);

// Handoff points are mapped onto the actual face/edges of the central server cabinet.
const IN = 360, inPos = new Float32Array(IN * 3), inColor = new Float32Array(IN * 3), inSource = new Float32Array(IN * 3), inTarget = new Float32Array(IN * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPos, 3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColor, 3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 160);
const inMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 4.2 }, uOpacity: { value: 0 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const incoming = new THREE.Points(inGeo, inMat); scene.add(incoming); let incomingReady = false;
let inheritedCamera = new THREE.Vector3(0, 4.5, 20), inheritedAim = new THREE.Vector3(), inheritedStar = 0;
function prepareIncoming() {
  if (incomingReady) return;
  const field = window.__V5_LEARNING_EXIT_FIELD;
  for (let i = 0; i < IN; i++) {
    const j = i * 3;
    if (field?.positions && field.count) { const k = Math.floor((i + .5) * field.count / IN) * 3; inSource.set(field.positions.subarray(k, k + 3), j); if (field.colors) inColor.set(field.colors.subarray(k, k + 3), j); }
    else { inSource.set([(random() - .5) * 8, (random() - .5) * 5, -2 - random() * 3], j); const c = new THREE.Color(C.cyan); inColor.set([c.r, c.g, c.b], j); }
    // A front-facing rack silhouette with visible bay positions, not an arbitrary lattice.
    const col = i % 12, row = Math.floor(i / 12) % 6, x = -.65 + col * .118, y = 2.1 - row * .69;
    inTarget.set([x, y + .78, -1.62], j);
    inPos.set(inSource.subarray(j, j + 3), j);
  }
  if (field?.cameraPosition) inheritedCamera.copy(field.cameraPosition);
  if (field?.cameraTarget) inheritedAim.copy(field.cameraTarget);
  inheritedStar = Number.isFinite(field?.starRotationY) ? field.starRotationY : 0;
  inGeo.attributes.position.needsUpdate = true; inGeo.attributes.color.needsUpdate = true; incomingReady = true;
}

// Four tangible resource props, all on one baseline with their label attached directly below.
const resources = [];
const resourceSpecs = [
  { name: 'CHIPS', color: C.cyan, x: -5.25, at: 12.86 }, { name: 'ELECTRICITY', color: C.yellow, x: -1.75, at: 13.66 },
  { name: 'DATA', color: C.green, x: 1.75, at: 14.86 }, { name: 'TIME', color: C.blue, x: 5.25, at: 15.86 },
];
function resource(name, color, x, y, at) {
  const g = new THREE.Group(); g.position.set(x, y, 2.05); scene.add(g); resources.push({ name, color, x, at, g, feed: null, pulses: [], iconParts: [] }); return g;
}
// CHIPS: a recognizable processor package with pins and individual silicon blocks.
{
  const g = resource('CHIPS', C.cyan, resourceSpecs[0].x, -1.72, resourceSpecs[0].at);
  box(g, 0, 0, 0, [1.42, .86, .26], 0x102b3c, .99, false); box(g, 0, .12, .16, [.82, .54, .07], 0x287d9b, .96, false);
  for (let i = 0; i < 5; i++) { box(g, -.31 + i * .155, .12, .205, [.075, .075, .025], C.ice, .92, true); }
  for (let i = 0; i < 4; i++) { box(g, - .5 + i * .33, -.48, .02, [.12, .22, .52], C.cyan, .75, true); box(g, 0, -.48, -.25 + i * .16, [1.66, .17, .07], C.cyan, .75, true); }
}
// ELECTRICITY: a battery with a bright, animated charge level and a lightning mark.
{
  const g = resource('ELECTRICITY', C.yellow, resourceSpecs[1].x, -1.72, resourceSpecs[1].at); box(g, 0, 0, 0, [1.14, .88, .32], 0x1d241d, .99, false); box(g, .66, .02, 0, [.17, .38, .30], 0xffdc87, .99, true);
  const charge = box(g, -.05, .02, .18, [.78, .55, .06], C.yellow, .95, true); g.userData.charge = charge;
  const bolt = new THREE.Shape(); bolt.moveTo(.07,.33); bolt.lineTo(-.10,.02); bolt.lineTo(.03,.02); bolt.lineTo(-.06,-.30); bolt.lineTo(.17,.06); bolt.lineTo(.04,.06); bolt.closePath();
  const boltMesh = new THREE.Mesh(new THREE.ShapeGeometry(bolt), basicMat(0xfff2bb, .98, true)); boltMesh.position.z = .23; g.add(boltMesh);
}
// DATA: three visible database cylinders with sample marks on their face.
{
  const g = resource('DATA', C.green, resourceSpecs[2].x, -1.72, resourceSpecs[2].at);
  for (let i = 0; i < 3; i++) {
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .15, 32), basicMat(i === 1 ? 0x1e554b : 0x236e61, .98, false));
    disk.rotation.x = Math.PI / 2; disk.position.set(0, -.15 + i * .26, .02 + i * .10); g.add(disk);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.49, .025, 6, 32), basicMat(C.green, .82, true)); rim.position.copy(disk.position); rim.rotation.x = Math.PI / 2; g.add(rim);
  }
  for (let i = 0; i < 4; i++) { const dot = new THREE.Mesh(new THREE.SphereGeometry(.052, 8, 6), basicMat(C.ice, .95, true)); dot.position.set(-.27 + i * .18, .54, .16); g.add(dot); }
}
// TIME: an actual dial with a rotating hand, not a generic status mark.
{
  const g = resource('TIME', C.blue, resourceSpecs[3].x, -1.72, resourceSpecs[3].at), r = resources[3];
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.50, .065, 10, 40), basicMat(C.cyan, .94, true)); g.add(ring); r.ring = ring;
  const face = new THREE.Mesh(new THREE.CircleGeometry(.43, 40), basicMat(0x122534, .99, false)); face.position.z = .035; g.add(face);
  r.handA = beam(g, new THREE.Vector3(0, 0, .10), new THREE.Vector3(.24, .13, .10), .035, C.ice, .96, true);
  r.handB = beam(g, new THREE.Vector3(0, 0, .12), new THREE.Vector3(-.04, .30, .12), .023, C.yellow, .98, true);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const dot = new THREE.Mesh(new THREE.SphereGeometry(.027, 8, 6), basicMat(C.ice, .9, true)); dot.position.set(Math.sin(a) * .39, Math.cos(a) * .39, .10); g.add(dot); }
}
for (const r of resources) {
  r.label = makeText(THREE, r.g, r.name, { width: r.name === 'ELECTRICITY' ? 3.0 : 2.45, size: 132, color: '#e8fbff', glow: r.name === 'ELECTRICITY' ? '#ffcf72' : r.name === 'DATA' ? '#74e7ad' : '#55e5ff', x: 0, y: -.82, z: .40 });
  const start = new THREE.Vector3(r.x, -1.34, 2.10), mid = new THREE.Vector3(r.x * .48, -.40, .9), end = new THREE.Vector3(r.x * .16, -.35, -1.68);
  const curve = new THREE.CatmullRomCurve3([start, mid, end]); r.feed = new THREE.Mesh(new THREE.TubeGeometry(curve, 42, .045, 7, false), basicMat(r.color, .72, true)); scene.add(r.feed);
  r.path = curve;
  for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), basicMat(r.color, .98, true)); scene.add(p); r.pulses.push({ mesh: p, phase: i * .48 }); }
}

// Camera-space HUD primitives: high contrast, with consistent labels and spacing.
function hudPanel(x, y, w, h, color = 0x091725) {
  const g = new THREE.Group(); g.position.set(x, y, -15.5); camera.add(g);
  const p = frontBox(g, 0, 0, 0, w, h, .08, color, .95, false); p.renderOrder = 4;
  const top = frontBox(g, 0, h / 2 - .045, .07, w, .045, .03, C.cyan, .7, true); top.renderOrder = 5;
  return g;
}
// Cost of computation panel, shown as the rack begins drawing power.
const powerPanel = hudPanel(4.65, .82, 4.0, 2.35, 0x101b25);
const powerTitle = makeText(THREE, powerPanel, 'POWER DRAW', { width: 3.55, size: 94, color: '#fff0bd', glow: '#ffcf72', x: 0, y: .66, z: .16 });
frontBox(powerPanel, 0, -.08, .15, 2.85, .36, .08, 0x233241, .99, false);
const powerFill = frontBox(powerPanel, -1.37, -.08, .21, 2.75, .26, .06, C.yellow, .98, true);
const powerIcon = new THREE.Group(); powerIcon.position.set(0, -.68, .18); powerPanel.add(powerIcon);
frontBox(powerIcon, 0, 0, 0, .72, .38, .08, 0x1a2d39, .98, false);
frontBox(powerIcon, .40, .015, 0, .12, .20, .08, C.yellow, .98, true);

// Titles are large enough to read as titles, not tiny labels.
const computeStamp = hudText('AI COMPUTE CENTER', { width: 8.6, size: 72, color: '#dffaff', glow: '#55e5ff', x: 0, y: 3.55, z: -16 });
const costTitle = hudText('THE COST OF COMPUTATION', { width: 15.4, size: 74, color: '#fff0c6', glow: '#ffcf72', y: 3.55 });
const trainingTitle = hudText('TRAINING + RUNNING', { width: 15.5, size: 88, color: '#e8fbff', glow: '#55e5ff', y: 3.55 });
const trainingSub = hudText('POWERFUL SYSTEMS REQUIRE FOUR INPUTS', { width: 12.5, size: 46, color: '#a8dce9', glow: '#318aff', y: 2.62 });
const scaleTitle = hudText('MORE COMPUTE  →  NEW CAPABILITIES', { width: 15.0, size: 66, color: '#e8fbff', glow: '#55e5ff', y: 3.55 });
const noGuarantee = hudText('MORE COMPUTE ≠ GENERAL INTELLIGENCE', { width: 15.5, size: 56, color: '#ffe5e9', glow: '#ff3854', y: 3.55 });
const question = hudText('HOW MUCH RELIABLE INTELLIGENCE — AT WHAT COST?', { width: 15.6, size: 50, color: '#fff0c6', glow: '#ffcf72', y: 3.55 });

// Capability cards use recognizable outputs (code, completed task, checklist).
const capabilityCards = [];
for (let i = 0; i < 3; i++) {
  const y = 1.65 - i * 1.48, g = new THREE.Group(); g.position.set(5.0, y, -15.4); camera.add(g);
  const panel = frontBox(g, 0, 0, 0, 4.2, 1.15, .08, 0x0b1b2a, .98, false); panel.renderOrder = 6;
  frontBox(g, -1.52, 0, .08, 1.05, .83, .05, [0x103041,0x14352f,0x332b19][i], .98, false).renderOrder = 7;
  const icon = makeText(THREE, g, ['</>', '✓', '≡'][i], { width: 1.16, size: [134,172,160][i], color: ['#78eaff','#74e7ad','#ffcf72'][i], glow: ['#55e5ff','#74e7ad','#ffcf72'][i], x: -1.52, y: 0, z: .17 }); icon.renderOrder = 12;
  const label = makeText(THREE, g, ['CODE', 'SOLVE', 'PLAN'][i], { width: 2.05, size: 156, color: '#e7faff', glow: '#55e5ff', x: .78, y: 0, z: .17, align: 'left' }); label.renderOrder = 12;
  capabilityCards.push({ g, panel, icon, label, index: i });
}

// The unproven ability is shown as a labeled new task with an incomplete route and a visible stop.
const testGroup = new THREE.Group(); testGroup.position.set(4.75, -.62, -15.0); camera.add(testGroup);
frontBox(testGroup, 0, 0, 0, 4.65, 2.65, .12, 0x0b1724, .98, false).renderOrder = 4;
const mazeBase = frontBox(testGroup, 0, 0, .10, 3.95, 1.78, .08, 0x102132, .99, false); mazeBase.renderOrder = 5;
// A compact, familiar top-down maze, extruded into a little 3D test board.
const wallMat = 0x7aa2b1;
const mazeWalls = [
  [-1.35,.57,1.05,.10],[-.25,.57,.10,.72],[.42,.57,1.0,.10],[1.32,.57,.10,.70],
  [-.85,.06,.10,.80],[-.18,.10,.88,.10],[.62,.04,.10,.76],[1.0,-.28,.78,.10],
  [-1.33,-.57,1.0,.10],[-.44,-.50,.10,.46],[.18,-.60,.88,.10],[1.30,-.53,.10,.48],
];
for (const [x,y,w,h] of mazeWalls) { const m=frontBox(testGroup,x,y,.20,w,h,.20,wallMat,.92,false); m.renderOrder=7; }
const routePts = [new THREE.Vector3(-1.68,-.68,.24),new THREE.Vector3(-1.55,.26,.24),new THREE.Vector3(-.55,.26,.24),new THREE.Vector3(-.55,-.23,.24),new THREE.Vector3(.34,-.23,.24),new THREE.Vector3(.34,.26,.24),new THREE.Vector3(.95,.26,.24)];
const testRoute = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts),52,.038,7,false),basicMat(C.cyan,.9,true));testRoute.renderOrder=9;testGroup.add(testRoute);
const redStop = frontBox(testGroup,1.45,.25,.31,.14,.58,.09,C.red,.98,true);redStop.renderOrder=10;
const miniCar = new THREE.Group(); miniCar.scale.setScalar(1.55); testGroup.add(miniCar);
box(miniCar,0,0,0,[.46,.25,.26],C.cyan,.99,false); box(miniCar,0,.17,-.01,[.30,.14,.23],0xa7e8f3,.98,false);
for (const wx of [-.19,.19]) { const wheel = new THREE.Mesh(new THREE.TorusGeometry(.085,.026,8,18),basicMat(0x07111b,.98,false)); wheel.position.set(wx,-.10,.15); miniCar.add(wheel); }
box(miniCar,0,.34,-.01,[.035,.20,.035],C.ice,.96,true);
const robotSensor = new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),basicMat(C.yellow,.98,true)); robotSensor.position.set(0,.47,.04); miniCar.add(robotSensor);
const robotHalo = new THREE.Mesh(new THREE.TorusGeometry(.34,.035,8,28),basicMat(C.yellow,.92,true)); robotHalo.position.z=-.06; miniCar.add(robotHalo);
miniCar.traverse(o=>{if(o.isMesh){o.renderOrder=12;o.material.depthTest=false;o.material.depthWrite=false;}});
const failX = makeText(THREE,testGroup,'×',{width:.62,size:195,color:'#ff536b',glow:'#ff3854',x:1.45,y:.67,z:.35}); failX.renderOrder=15;
const newTaskTag = makeText(THREE,camera,'UNFAMILIAR TASK',{width:4.4,size:94,color:'#dffaff',glow:'#55e5ff',x:4.75,y:1.28,z:-14.7});
const failedTag = makeText(THREE,camera,'NO SOLUTION',{width:3.6,size:84,color:'#ffdce2',glow:'#ff3854',x:4.75,y:-2.22,z:-14.7});

// Final cost question: concrete repeated results versus an almost-depleted power store.
const compareLeft = hudPanel(-3.35,-1.65,5.55,2.45,0x091a23);
const reliableLabel = makeText(THREE,compareLeft,'REPEATABLE OUTPUT',{width:4.8,size:92,color:'#cffff0',glow:'#74e7ad',x:0,y:.74,z:.16});
const trials = [];
for(let i=0;i<3;i++){
  const x=-1.55+i*1.55; frontBox(compareLeft,x,-.18,.17,1.35,.96,.07,0x122d2b,.99,false);
  const num=makeText(THREE,compareLeft,`TEST ${i+1}`,{width:1.30,size:220,color:'#c4eee1',glow:'#74e7ad',x,y:.07,z:.26});
  const check=new THREE.Group(); compareLeft.add(check);
  beam(check,new THREE.Vector3(x-.14,-.27,.31),new THREE.Vector3(x-.02,-.39,.31),.05,C.green,.99,true);
  beam(check,new THREE.Vector3(x-.02,-.39,.31),new THREE.Vector3(x+.20,-.13,.31),.05,C.green,.99,true);
  trials.push({num,check});
}
const compareRight = hudPanel(3.35,-1.65,5.55,2.45,0x1c1910);
const costLabel = makeText(THREE,compareRight,'COMPUTE COST',{width:4.8,size:92,color:'#fff0c6',glow:'#ffcf72',x:0,y:.74,z:.16});
// Large, literal battery with a bold bolt and a clearly labeled high-cost state.
frontBox(compareRight,-.35,-.10,.18,3.15,.82,.10,0x25313a,.99,false);
frontBox(compareRight,1.42,-.10,.19,.25,.42,.12,C.yellow,.98,true);
const finalCharge=frontBox(compareRight,-.425,-.10,.27,2.65,.52,.07,C.yellow,.98,true);
const boltShape=new THREE.Shape(); boltShape.moveTo(.14,.48); boltShape.lineTo(-.16,.02); boltShape.lineTo(.06,.02); boltShape.lineTo(-.10,-.48); boltShape.lineTo(.27,.03); boltShape.lineTo(.07,.03); boltShape.closePath();
const finalBolt=new THREE.Mesh(new THREE.ShapeGeometry(boltShape),basicMat(0xffe18c,.99,true)); finalBolt.position.set(-2.08,-.10,.31); finalBolt.scale.setScalar(1.25); compareRight.add(finalBolt);
const highCost=makeText(THREE,compareRight,'HIGH COST',{width:2.45,size:118,color:'#ffd27b',glow:'#ffcf72',x:.95,y:-.80,z:.27});

// Small cost-meter support in the first spoken portion.
const resourceStart = resourceSpecs.map(x=>x.at);
function renderFrame(frame) {
  const t = clamp(Number(frame) / FPS, 0, DURATION); prepareIncoming();
  const reveal = smooth(t / .95);
  for (let i=0;i<IN;i++) { const j=i*3; inPos[j]=THREE.MathUtils.lerp(inSource[j],inTarget[j],reveal); inPos[j+1]=THREE.MathUtils.lerp(inSource[j+1],inTarget[j+1],reveal); inPos[j+2]=THREE.MathUtils.lerp(inSource[j+2],inTarget[j+2],reveal); }
  inGeo.attributes.position.needsUpdate=true; inMat.uniforms.uOpacity.value=.12*(1-smooth(t/.50));

  // Large first, then pull back and reveal the recognizable server-room scale.
  const pull = smooth(t / 6.0), expanded = smooth((t - 17.1) / 1.5);
  const introCamZ = THREE.MathUtils.lerp(15.4, 22.4, pull);
  const introCamY = THREE.MathUtils.lerp(1.65, 3.05, pull);
  const settle = smooth(t/.72);
  camera.position.set(THREE.MathUtils.lerp(inheritedCamera.x,0,settle),THREE.MathUtils.lerp(THREE.MathUtils.clamp(inheritedCamera.y,.8,4.5),introCamY,settle),THREE.MathUtils.lerp(THREE.MathUtils.clamp(inheritedCamera.z,12,25),introCamZ,settle));
  let panX = -1.85 * smooth((t-20.3)/.75) * (1-smooth((t-24.1)/.85));
  camera.position.x += panX; camera.lookAt(aim.set(0,.28,0)); camera.updateMatrixWorld(true);
  rackBank.position.x = 0;
  const introScale = THREE.MathUtils.lerp(1.34,.94,pull);
  for (const unit of rackUnits) {
    const spec=rackSpecs[unit.index];
    const phase = unit.index===0 ? 0 : spec.start;
    let a = unit.index===0 ? .78+.22*smooth(t/.34) : smooth((t-phase)/.9);
    if (unit.index>=3) a *= smooth((t-17.0)/1.1);
    unit.g.visible=a>.006;
    unit.g.position.x=THREE.MathUtils.lerp(spec.x*1.5,spec.x,smooth((t-phase)/1.0));
    unit.g.scale.setScalar((unit.index===0?introScale:1) * (1+.08*expanded));
    fadeGroup(unit.g,a);
    unit.fans.forEach(v=>{v.fan.rotation.z=t*(1.1+expanded*.85)+v.phase;});
    unit.leds.forEach(v=>{v.led.material.opacity=(.23+.66*(.5+.5*Math.sin(t*5+v.phase)))*a;});
  }
  // Intro animation continues through the real-time narration gap: fan spin, rack lights, and camera travel.
  setTextAlpha(computeStamp,win(t,.22,5.10,.3,.25));
  setTextAlpha(costTitle,win(t,5.55,9.55,.22,.25));
  setTextAlpha(trainingTitle,win(t,9.90,16.95,.24,.30));
  setTextAlpha(trainingSub,win(t,10.08,16.95,.28,.30));
  setTextAlpha(scaleTitle,win(t,17.35,20.38,.22,.26));
  setTextAlpha(noGuarantee,win(t,20.68,24.18,.22,.24));
  setTextAlpha(question,win(t,24.56,29.99,.25,.12));

  const powerA=win(t,5.55,9.58,.25,.28); fadeGroup(powerPanel,powerA);
  powerFill.scale.x=THREE.MathUtils.lerp(.05,1,smooth((t-5.7)/3.7));
  powerFill.position.x=-1.37+(2.75*powerFill.scale.x)/2;

  // Matching resource icon and label enter exactly on their spoken word; one aligned row.
  resources.forEach((r,i)=>{
    const a=win(t,r.at,17.0,.34,.35); fadeGroup(r.g,a); r.g.scale.setScalar(.88+.32*smooth((t-r.at)/.45));
    r.label.material.opacity=a;
    const flow=win(t,r.at+.25,17.0,.28,.35); r.feed.material.opacity=.72*flow; r.feed.visible=flow>.005;
    r.pulses.forEach(p=>{const u=(t*.38+p.phase)%1;p.mesh.position.copy(r.path.getPointAt(u));p.mesh.visible=flow>.02;p.mesh.material.opacity=.92*flow;});
  });
  const energy=resources[1];
  if(energy.g.userData.charge){const use=clamp((t-13.66)/3.4);energy.g.userData.charge.scale.x=Math.max(.16,1-use*.68);energy.g.userData.charge.position.x=-.05-.30*use;}
  const clock=resources[3]; if(clock.handA){clock.handA.rotation.z=-t*.45;clock.handB.rotation.z=t*.74;}

  // More compute = a physically wider/brighter bank; three readable tasks appear on the right.
  capabilityCards.forEach((c,i)=>{
    const a=win(t,18.55+i*.35,20.42,.28,.28); c.g.visible=a>.01; fadeGroup(c.g,a);
    c.g.position.x=THREE.MathUtils.lerp(5.6,5.0,smooth((t-18.5)/.55));
  });

  // An explicitly named new task: the route search reaches a dead end and stops.
  const testA=win(t,20.94,24.10,.32,.24); fadeGroup(testGroup,testA);
  const progress=smooth((t-21.18)/1.22);
  const pathIndex=Math.min(routePts.length-1,Math.floor(progress*(routePts.length-1)));
  const pathU=progress*(routePts.length-1)-pathIndex;
  const carPoint=routePts[pathIndex].clone().lerp(routePts[Math.min(pathIndex+1,routePts.length-1)],pathU);
  miniCar.position.copy(carPoint); miniCar.position.z=.42; miniCar.rotation.z=pathIndex%2===0?0:Math.PI/2;
  robotHalo.material.opacity=.58+.32*(.5+.5*Math.sin(t*8));
  setTextAlpha(newTaskTag,win(t,20.94,24.10,.30,.24));
  setTextAlpha(failedTag,win(t,22.48,24.18,.22,.24));
  failX.material.opacity=win(t,22.32,24.18,.2,.24);
  redStop.material.opacity=.98*win(t,22.14,24.18,.18,.24);

  // Closing question: repeated test results sit opposite a visibly draining power store.
  const compareA=win(t,24.56,29.98,.28,.12);
  fadeGroup(compareLeft,compareA);fadeGroup(compareRight,compareA);
  trials.forEach(v=>setTextAlpha(v.num,compareA));
  setTextAlpha(reliableLabel,compareA);setTextAlpha(costLabel,compareA);setTextAlpha(highCost,compareA);
  const discharge=smooth((t-24.75)/4.5), charge=Math.max(.12,1-.78*discharge); finalCharge.scale.x=charge;finalCharge.position.x=-1.75+1.325*charge;
  // Keep a recognizable server bank in the final frame; no collapse into an unexplained line.
  const close = smooth((t-24.0)/.85);
  rackBank.position.x=THREE.MathUtils.lerp(panX,0,close);
  rackBank.scale.setScalar(THREE.MathUtils.lerp(1.02,.78,close));
  stars.rotation.y=(Number.isFinite(inheritedCamera.y)?0:0)+t*.0007; stars.rotation.x=Math.sin(t*.035)*.004;

  // Invisible handoff samples are laid over the actual server-bank silhouette for Task 6.
  const OUT=300;
  if(!window.__v5ComputeExitPositions){window.__v5ComputeExitPositions=new Float32Array(OUT*3);window.__v5ComputeExitColors=new Float32Array(OUT*3);}
  const outPos=window.__v5ComputeExitPositions,outColor=window.__v5ComputeExitColors;
  for(let i=0;i<OUT;i++){
    const unit=rackUnits[i%rackUnits.length],row=Math.floor(i/12)%6,col=i%12,j=i*3;
    outPos[j]=rackBank.position.x+unit.g.position.x+(-.67+col*.122)*unit.g.scale.x;
    outPos[j+1]=.78+1.55-row*.62;
    outPos[j+2]=unit.g.position.z+1.0;
    const cc=new THREE.Color(i%4===0?C.green:C.cyan);outColor[j]=cc.r;outColor[j+1]=cc.g;outColor[j+2]=cc.b;
  }
  renderer.render(scene,camera); window.__sceneTime=110+t;
  if(t>=DURATION-1/FPS) window.__V5_COMPUTE_EXIT_FIELD={count:OUT,positions:new Float32Array(outPos),colors:new Float32Array(outColor),cameraPosition:camera.position.clone(),cameraTarget:aim.clone(),starRotationY:stars.rotation.y};
}
function resize(){const w=Math.max(1,host.clientWidth||window.innerWidth),h=Math.max(1,host.clientHeight||Math.round(w*9/16));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(standalone)renderFrame(Math.round((window.__playerTime||110)*FPS)-110*FPS);}
if(standalone){window.renderFrame=renderFrame;window.__sceneReady=true;window.addEventListener('resize',resize);resize();renderFrame(0);window.dispatchEvent(new Event('v5scene-ready'));}
export {renderFrame,resize};
