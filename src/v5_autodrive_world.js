import * as THREE from '../assets/vendor/three.module.js';

// Shared literal 3D city scene used by V5 Tasks 3 and 4.
export const C = {
  black: 0x02050b, cyan: 0x55e5ff, ice: 0xe6fbff, blue: 0x318aff,
  green: 0x74e7ad, yellow: 0xffcf72, red: 0xff3854, slate: 0x172838,
};
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => smooth((t - a) / fi) * (1 - smooth((t - b) / fo));

export function basicMat(color, opacity = 1, additive = false) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  m.userData.baseOpacity = opacity;
  return m;
}
export function box(parent, x, y, z, dims, color, opacity = 1, additive = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...dims), basicMat(color, opacity, additive));
  m.position.set(x, y, z); parent.add(m); return m;
}
export function sphere(parent, radius, color, opacity = 1, additive = false, segments = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(8, Math.round(segments * 0.7))), basicMat(color, opacity, additive));
  parent.add(m); return m;
}
export function beam(parent, a, b, radius, color, opacity = 0.9, additive = true) {
  const from = a.clone(), to = b.clone(), d = to.clone().sub(from);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(0.001, d.length()), 8), basicMat(color, opacity, additive));
  m.position.copy(from).add(to).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m); return m;
}
export function setAlpha(g, a) {
  const alpha = clamp(a);
  g.traverse(o => { if (!o.material) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) m.opacity = (m.userData.baseOpacity ?? 1) * alpha; });
}
export function makeText(THREERef, parent, value, { width = 5, size = 76, color = '#e6fbff', glow = '#55e5ff', x = 0, y = 0, z = 0, weight = 800, align = 'center' } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 220;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.lineJoin = 'round'; ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.strokeStyle = 'rgba(1,5,12,.92)'; ctx.lineWidth = 12;
  const tx = align === 'left' ? 22 : align === 'right' ? canvas.width - 22 : canvas.width / 2;
  ctx.strokeText(value, tx, canvas.height / 2, canvas.width - 44); ctx.fillStyle = color; ctx.fillText(value, tx, canvas.height / 2, canvas.width - 44);
  const tex = new THREERef.CanvasTexture(canvas); tex.colorSpace = THREERef.SRGBColorSpace;
  const material = new THREERef.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 1 }); material.userData.baseOpacity = 1;
  const s = new THREERef.Sprite(material); s.scale.set(width, width * canvas.height / canvas.width, 1); s.position.set(x, y, z); s.renderOrder = 15; parent.add(s); return s;
}
export function setTextAlpha(s, a) { s.material.opacity = clamp(a); }

export function makeMapParticleTargets(count, seed = 20261013) {
  let state = seed >>> 0;
  const rand = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const roads = [
    [-10.5, 0, 10.5, 0], [-10.5, 5, 10.5, 5], [-10.5, -5, 10.5, -5],
    [-8, -6.8, -8, 6.8], [-3, -6.8, -3, 6.8], [3, -6.8, 3, 6.8], [8, -6.8, 8, 6.8],
  ];
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = roads[i % roads.length], u = rand();
    out.set([r[0] + (r[2] - r[0]) * u + (rand() - 0.5) * 0.45, 0.22 + rand() * 1.0, r[1] + (r[3] - r[1]) * u + (rand() - 0.5) * 0.45], i * 3);
  }
  return out;
}

function addPerson(parent, x, z, color = C.yellow) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.48, 8), basicMat(color, 0.96, false)); body.position.y = 0.35; g.add(body);
  const head = sphere(g, 0.14, C.ice, 0.95, false, 12); head.position.y = 0.68;
  const sign = box(g, 0, 1.05, 0, [0.74, 0.40, 0.10], C.yellow, 0.92, false);
  sign.rotation.y = (x % 2) * 0.16;
  const mark = box(g, 0, 1.05, 0.06, [0.42, 0.06, 0.035], C.red, 0.96, true);
  return g;
}
function addCar(parent, color, x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0.18, z); g.scale.setScalar(scale); parent.add(g);
  box(g, 0, 0.25, 0, [1.32, 0.42, 0.74], color, 0.98, false);
  box(g, -0.04, 0.54, 0, [0.70, 0.32, 0.58], 0x70bad0, 0.88, false);
  for (const sx of [-0.43, 0.43]) for (const sz of [-0.34, 0.34]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), basicMat(0x091018, 0.98, false));
    w.rotation.x = Math.PI / 2; w.position.set(sx, 0.15, sz); g.add(w);
  }
  return g;
}
function routeTube(parent, points, color, opacity) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.17, z)), false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 70, 0.10, 8, false), basicMat(color, opacity, true));
  parent.add(mesh); return { mesh, curve };
}
function makeFrame(parent, color = C.cyan) {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  parent.add(lines); return lines;
}

export function createAutoDriveWorld(THREERef, scene, camera) {
  const city = new THREE.Group(); city.name = 'shared autonomous-driving city'; scene.add(city);
  box(city, 0, -0.52, 0, [23, 0.36, 15.4], 0x07111b, 0.98, false);
  // Deep 3D blocks make the city read as a physical map rather than a flat HUD.
  const blocks = [
    [-10, 3.9, 3.0, 2.0, 2.8], [-5.5, 3.9, 3.1, 2.1, 3.6], [0.2, 3.9, 3.5, 2.2, 2.4], [5.4, 3.9, 3.0, 2.0, 3.2], [10, 3.9, 2.7, 2.1, 2.5],
    [-10, -3.9, 3.0, 2.0, 3.0], [-5.3, -3.9, 3.2, 2.0, 2.5], [0.2, -3.9, 3.6, 2.0, 3.4], [5.5, -3.9, 3.0, 2.0, 2.7], [10, -3.9, 2.7, 2.0, 3.5],
  ];
  blocks.forEach(([x, z, w, d, h], i) => {
    const b = box(city, x, h / 2 - 0.32, z, [w, h, d], [0x112536, 0x142d3e, 0x183044][i % 3], 0.96, false);
    const roof = box(city, x, h - 0.30, z, [w * 0.76, 0.06, d * 0.70], 0x27617b, 0.55, true);
    for (let j = 0; j < 3; j++) box(city, x - w * 0.30 + j * w * 0.30, 0.25, z + d / 2 + 0.03, [0.16, 0.22, 0.06], 0x55c8e8, 0.42, true);
    b.userData.roof = roof;
  });
  // Street grid, curb lines and dashed lane markings.
  const roadMat = 0x142432, lineMat = 0x426172;
  for (const z of [-5, 0, 5]) {
    box(city, 0, -0.29, z, [22.5, 0.10, 1.52], roadMat, 0.98, false);
    box(city, 0, -0.22, z - 0.78, [22.2, 0.055, 0.055], lineMat, 0.65, true);
    box(city, 0, -0.22, z + 0.78, [22.2, 0.055, 0.055], lineMat, 0.65, true);
    for (let x = -10; x <= 10; x += 1.6) box(city, x, -0.20, z, [0.68, 0.035, 0.045], 0x638596, 0.50, true);
  }
  for (const x of [-8, -3, 3, 8]) {
    box(city, x, -0.28, 0, [1.48, 0.10, 14.5], roadMat, 0.98, false);
    box(city, x - 0.75, -0.20, 0, [0.055, 0.05, 14.0], lineMat, 0.65, true);
    box(city, x + 0.75, -0.20, 0, [0.055, 0.05, 14.0], lineMat, 0.65, true);
  }
  // Intersection lights are tiny, legible points of spatial depth.
  for (const [x, z] of [[-8, 0], [-3, 0], [3, 0], [8, 0], [-3, 5], [3, -5]]) {
    const pole = box(city, x + 0.88, 0.6, z + 0.65, [0.11, 1.5, 0.11], 0x436176, 0.9, false);
    const lamp = sphere(city, 0.18, C.green, 0.82, true, 12); lamp.position.set(x + 0.88, 1.36, z + 0.65);
  }
  const routeA = routeTube(city, [[-9, 5], [-8, 5], [-3, 5], [-3, 0], [3, 0], [3, -5], [9, -5]], C.red, 0.16);
  const routeB = routeTube(city, [[-9, 5], [-8, 5], [-8, 6], [8, 6], [8, -5], [9, -5]], C.green, 0.12);
  const routeC = routeTube(city, [[-9, 5], [-8, 5], [-8, -6], [8, -6], [8, -5], [9, -5]], C.yellow, 0.12);
  const routes = [routeA, routeB, routeC];
  // A destination pad and start marker orient the route choice.
  const startPin = sphere(city, 0.30, C.cyan, 0.96, true, 16); startPin.position.set(-9, 0.26, 5);
  const goalPin = sphere(city, 0.46, C.green, 0.96, true, 16); goalPin.position.set(9, 0.35, -5);
  const goalRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.10, 8, 32), basicMat(C.green, 0.9, true)); goalRing.rotation.x = Math.PI / 2; goalRing.position.set(9, 0.20, -5); city.add(goalRing);
  const startLabel = makeText(THREERef, city, 'START', { width: 2.6, size: 76, color: '#baf7ff', x: -9, y: 1.25, z: 5.5 });
  const goalLabel = makeText(THREERef, city, 'DESTINATION', { width: 4.4, size: 72, color: '#c8ffe2', glow: '#74e7ad', x: 8.3, y: 1.55, z: -5.8 });
  const heroCar = addCar(city, 0x55c9f0, -9, 5, 1.08);
  const queueCars = [addCar(city, 0xffa44b, -7.1, 0, 0.8), addCar(city, 0xe8eef4, -5.6, 0, 0.8), addCar(city, 0x6298b8, -4.1, 0, 0.8)];
  // Protest demonstration and physical barricades close the direct route.
  const protest = new THREE.Group(); protest.position.set(-3, 0, 0); city.add(protest);
  const people = [];
  for (const [x, z] of [[-0.85, -0.55], [-0.35, 0.50], [0.20, -0.58], [0.75, 0.48], [1.10, -0.15], [-1.12, 0.18]]) people.push(addPerson(protest, x, z, C.yellow));
  const barriers = new THREE.Group(); protest.add(barriers);
  for (const z of [-0.58, 0.0, 0.58]) {
    const bar = box(barriers, 0.02, 0.53, z, [0.18, 0.88, 0.58], 0xe1e7ec, 0.95, false);
    for (let k = 0; k < 3; k++) box(barriers, 0.12, 0.30 + k * 0.24, z, [0.045, 0.12, 0.48], C.red, 0.96, true);
  }
  const closureSign = box(protest, 0.15, 1.55, -1.05, [1.35, 0.76, 0.12], C.red, 0.98, false);
  const closureText = makeText(THREERef, protest, 'CLOSED', { width: 1.25, size: 60, color: '#fff4f4', glow: '#ff3854', x: 0.15, y: 1.58, z: -0.95 });
  // The same demonstration later spills into the northern detour, changing the predicted best route.
  const spillover = new THREE.Group(); spillover.position.set(5, 0, 5); city.add(spillover); spillover.visible = false;
  for (const z of [-0.55, 0.0, 0.55]) {
    box(spillover, 0, 0.49, z, [0.18, 0.82, 0.54], 0xe1e7ec, 0.96, false);
    for (let k = 0; k < 3; k++) box(spillover, 0.11, 0.28 + k * 0.22, z, [0.045, 0.11, 0.46], C.red, 0.96, true);
  }
  for (const [x, z] of [[-0.75, -0.65], [0.60, 0.68], [0.95, -0.2]]) { const p = addPerson(spillover, x, z, C.yellow); p.scale.setScalar(0.82); }
  const spillLabel = makeText(THREERef, spillover, 'CROWD SPREAD', { width: 3.2, size: 56, color: '#ffe5b1', glow: '#ffcf72', x: 0, y: 1.65, z: -0.8 });
  const crowd = new THREE.Group(); protest.add(crowd);
  for (const [x, z] of [[-2.1, -1.0], [-1.8, 1.05], [2.0, -1.05], [2.15, 0.92], [-2.35, 0.0], [1.8, 0.0]]) { const p = addPerson(crowd, x, z, C.yellow); p.scale.setScalar(0.85); }
  const bbox1 = makeFrame(city, C.cyan), bbox2 = makeFrame(city, C.cyan), bbox3 = makeFrame(city, C.cyan);
  const boxes = [bbox1, bbox2, bbox3];
  bbox1.scale.set(3.6, 2.2, 2.9); bbox1.position.set(-3, 1.1, 0);
  bbox2.scale.set(2.0, 2.6, 2.1); bbox2.position.set(-3, 1.3, 0);
  bbox3.scale.set(4.7, 2.0, 1.8); bbox3.position.set(-5.5, 1.0, 0);
  // The callout beam physically points to the detected object, ending at a label.
  function callout(label, color = C.green) {
    const g = new THREE.Group(); city.add(g);
    const pointer = beam(g, new THREE.Vector3(), new THREE.Vector3(1, 2, 0), 0.045, color, 0.95, true);
    const dot = sphere(g, 0.11, color, 0.96, true, 12);
    const tag = makeText(THREERef, g, label, { width: 4.8, size: 90, color: '#e7fbff', glow: color === C.red ? '#ff3854' : '#55e5ff', x: 2.2, y: 2.15, z: 0.12, align: 'left' });
    return { group: g, pointer, dot, tag, target: new THREE.Vector3(), anchor: new THREE.Vector3() };
  }
  const callouts = [callout('ROAD CLOSED'), callout('PROTEST'), callout('TRAFFIC QUEUE')];
  function updateCallout(c, target, anchor, alpha, color) {
    c.target.copy(target); c.anchor.copy(anchor);
    const d = anchor.clone().sub(target); c.pointer.position.copy(target).add(anchor).multiplyScalar(0.5);
    c.pointer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); c.pointer.scale.y = d.length() / Math.max(0.001, c.pointer.geometry.parameters.height);
    c.pointer.material.color.setHex(color); c.dot.position.copy(target); c.dot.material.color.setHex(color); c.tag.position.set(anchor.x, anchor.y, anchor.z); c.tag.material.opacity = clamp(alpha); c.pointer.material.opacity = 0.9 * clamp(alpha); c.dot.material.opacity = 0.95 * clamp(alpha);
  }
  // The lidar and scan cone belong to the one moving hero car—no duplicate static scanner vehicle.
  const lidar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 6, 32), basicMat(C.cyan, 0.78, true)); lidar.position.set(0, 0.78, 0); heroCar.add(lidar);
  const coneGeom = new THREE.ConeGeometry(0.28, 1, 5, 1, true); const coneMat = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const scanCone = new THREE.Mesh(coneGeom, coneMat); scanCone.position.set(0.95, 0.44, 0); scanCone.rotation.z = -Math.PI / 2; heroCar.add(scanCone);
  // Pulsing 3D radar sweep rings on the actual road surface.
  const radar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 56), basicMat(C.cyan, 0.65, true)); radar.rotation.x = Math.PI / 2; radar.position.set(-3, 0.15, 0); city.add(radar);
  function setDetection(t, strength = 0, confirmStage = 1) {
    const targets = [new THREE.Vector3(-3, 1.10, 0), new THREE.Vector3(-3, 1.30, 0), new THREE.Vector3(-5.5, 1.0, 0)];
    const anchors = [new THREE.Vector3(-0.2, 3.45, 0), new THREE.Vector3(1.6, 4.35, 0), new THREE.Vector3(-6.7, 2.85, 0)];
    const a = clamp(strength);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const scan = (t * 0.48 + i * 0.34) % 1;
      if (confirmStage < i + 1) { b.position.set(-8 + scan * 10, 0.8 + i * 0.15, (i - 1) * 2.0); b.material.color.setHex(C.cyan); b.material.opacity = 0.55 * a; }
      else { b.position.copy(targets[i]); b.material.color.setHex(i === 0 ? C.green : i === 1 ? C.yellow : C.cyan); b.material.opacity = 0.88 * a; }
    }
    updateCallout(callouts[0], targets[0], anchors[0], a * smooth(confirmStage), C.green);
    updateCallout(callouts[1], targets[1], anchors[1], a * smooth(confirmStage - 1), C.yellow);
    updateCallout(callouts[2], targets[2], anchors[2], a * 0.8 * smooth(confirmStage - 2), C.cyan);
    callouts.forEach((c, i) => { c.group.visible = a > 0.01 && confirmStage > i; });
    radar.scale.setScalar(0.75 + ((t * 0.65) % 1) * 2.2); radar.material.opacity = 0.55 * a * (1 - ((t * 0.65) % 1) * 0.65);
    lidar.scale.setScalar(.90 + .12 * Math.sin(t * 7) ** 2); lidar.material.opacity = .30 + .48 * a;
    scanCone.material.opacity = .18 * a;
  }
  function placeCar(routeIndex, progress) {
    const route = routes[routeIndex]; const p = route.curve.getPointAt(clamp(progress)); const tangent = route.curve.getTangentAt(clamp(progress));
    heroCar.position.set(p.x, 0.18, p.z); heroCar.rotation.y = Math.atan2(-tangent.z, tangent.x);
  }
  function setCrowdSpread(amount) {
    crowd.scale.setScalar(0.85 + clamp(amount) * 0.70);
    crowd.position.x = clamp(amount) * 0.42;
    if (amount > 0.45) barriers.scale.z = 1 + clamp((amount - 0.45) / 0.55) * 0.6;
    spillover.visible = amount > 0.25;
    spillover.scale.setScalar(0.72 + smooth((amount - 0.25) / 0.55) * 0.28);
  }
  function setRouteState({visible = [0, 1, 2], selected = -1, blocked = false, alpha = 1} = {}) {
    routes.forEach((r, i) => {
      const isOn = visible.includes(i); r.mesh.visible = isOn;
      const c = i === selected ? C.green : (i === 0 || (blocked && i === 1) ? C.red : i === 2 ? C.yellow : C.cyan);
      r.mesh.material.color.setHex(c); r.mesh.material.opacity = alpha * (i === selected ? 0.95 : i === 0 || blocked && i === 1 ? 0.70 : 0.42);
      r.mesh.scale.set(1, i === selected ? 1.25 : 1, 1);
    });
  }
  return { city, blocks, routes, heroCar, queueCars, protest, people, crowd, barriers, spillover, closureSign, closureText, boxes, callouts, lidar, scanCone, radar, startPin, goalPin, startLabel, goalLabel, updateCallout, setDetection, placeCar, setCrowdSpread, setRouteState };
}

export function createProbabilityHud(THREERef, camera) {
  const group = new THREERef.Group(); camera.add(group);
  const panel = new THREERef.Mesh(new THREERef.BoxGeometry(5.0, 5.0, 0.14), basicMat(0x071522, 0.90, false)); panel.position.set(5.35, 0.05, -14); group.add(panel);
  const header = makeText(THREERef, group, 'CLEAR ARRIVAL CHANCE', { width: 4.8, size: 60, color: '#b9e9f5', x: 5.35, y: 1.95, z: -13.90 });
  const rows = [];
  const colors = [C.red, C.yellow, C.green];
  const ys = [1.05, 0, -1.05];
  for (let i = 0; i < 3; i++) {
    const card = new THREERef.Mesh(new THREERef.BoxGeometry(4.48, 0.83, 0.08), basicMat(0x152635, 0.95, false)); card.position.set(5.35, ys[i], -13.86); group.add(card);
    const rail = new THREERef.Mesh(new THREERef.BoxGeometry(0.10, 0.67, 0.04), basicMat(colors[i], 0.98, true)); rail.position.set(3.18, ys[i], -13.78); group.add(rail);
    const label = makeText(THREERef, group, '', { width: 4.0, size: 62, color: '#e6fbff', x: 5.35, y: ys[i], z: -13.72 });
    rows.push({ card, rail, label });
  }
  const legend = makeText(THREERef, group, 'LOW  RED   ·   MID  YELLOW   ·   HIGH  GREEN', { width: 4.9, size: 36, color: '#d1e7ee', x: 5.35, y: -2.13, z: -13.70 });
  group.visible = false;
  function show(alpha, values = [18, 44, 76], selected = 2) {
    group.visible = alpha > 0.001;
    group.traverse(o => { if (o.material) o.material.opacity = (o.material.userData.baseOpacity ?? 1) * clamp(alpha); });
    const ordered = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const rank = new Map(ordered.map((x, i) => [x.i, i]));
    rows.forEach((row, i) => {
      const col = rank.get(i) === 0 ? C.red : rank.get(i) === 2 ? C.green : C.yellow;
      row.card.material.color.setHex(i === selected ? 0x173c38 : 0x152635);
      row.rail.material.color.setHex(col); row.label.material.color.set(new THREERef.Color(col));
      row.label.material.opacity = clamp(alpha);
      // The index maps to route labels A/B/C and the percentage is the chance of a clear on-time trip.
      const routeName = ['ROUTE A', 'ROUTE B', 'ROUTE C'][i];
      const canvas = row.label.material.map.image; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 62px Arial, sans-serif'; ctx.lineJoin = 'round'; ctx.shadowColor = `#${col.toString(16).padStart(6,'0')}`; ctx.shadowBlur = 14; ctx.strokeStyle = 'rgba(1,5,12,.92)'; ctx.lineWidth = 12;
      const text = `${routeName}     ${values[i]}%`; ctx.strokeText(text, canvas.width / 2, canvas.height / 2, canvas.width - 40); ctx.fillStyle = '#e6fbff'; ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 40); row.label.material.map.needsUpdate = true;
    });
  }
  return { group, header, rows, legend, show };
}
