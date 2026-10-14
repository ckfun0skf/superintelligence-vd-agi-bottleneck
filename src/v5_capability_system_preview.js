import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, box, beam } from './v5_autodrive_world.js';

// V5 Task 6 — No single barrier (02:20.4–02:44.35).
// Four concrete capabilities converge on one incomplete AGI system; the open gap
// is an unknown, not a fabricated fifth capability or a literal doorway.
const FPS = 24, DURATION = 23.98;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, 0.0028);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 320); scene.add(camera);
const aim = new THREE.Vector3(0, .28, 0);
let seed = 20261015;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function fadeGroup(group, alpha) {
  const a = clamp(alpha); group.visible = a > .006;
  group.traverse(o => {
    if (!o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) { m.transparent = true; m.depthWrite = false; m.opacity = (m.userData.baseOpacity ?? 1) * a; }
  });
}
function glowBall(parent, x, y, z, radius, color, opacity = .95) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), basicMat(color, opacity, true));
  m.position.set(x, y, z); parent.add(m); return m;
}
function tube(parent, curve, radius, color, opacity = .7) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 8, false), basicMat(color, opacity, true));
  parent.add(m); return m;
}
function meshMatClone(root) {
  const copy = root.clone(true);
  copy.traverse(o => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
  });
  return copy;
}

// Clone the exact last rendered rack, floor, and star positions so Task 5's final
// frame remains tangible while its rack silhouette dissolves into the new system.
const computeHandoff = window.__V5_COMPUTE_HANDOFF_OBJECTS || {};
const rackEcho = computeHandoff.rackBank ? meshMatClone(computeHandoff.rackBank) : new THREE.Group();
const floorEcho = computeHandoff.floor ? meshMatClone(computeHandoff.floor) : new THREE.Group();
scene.add(rackEcho, floorEcho);
let stars;
if (computeHandoff.stars) {
  stars = meshMatClone(computeHandoff.stars); scene.add(stars);
} else {
  const count = 680, p = new Float32Array(count * 3), c = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { p.set([(random() - .5) * 92, (random() - .5) * 56, -30 - random() * 120], i * 3); const q = new THREE.Color(i % 17 ? 0x287693 : 0x547da6); c.set([q.r * .30, q.g * .30, q.b * .30], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 3.3 }, uOpacity: { value: .35 } },
    vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
    fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
  stars = new THREE.Points(geo, mat); scene.add(stars);
}
const starOpacity = stars.material.uniforms?.uOpacity ? stars.material.uniforms.uOpacity.value : .35;

// A particle handoff starts on the real server-bank silhouette and fans toward
// the four capability modules during the opening sentence.
const IN = 360, inPos = new Float32Array(IN * 3), inStart = new Float32Array(IN * 3), inTarget = new Float32Array(IN * 3), inColor = new Float32Array(IN * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPos, 3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColor, 3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 180);
const inMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 4.3 }, uOpacity: { value: 0 } },
  vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',
  fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
scene.add(new THREE.Points(inGeo, inMat));
let inheritedCamera = new THREE.Vector3(0, 3.05, 22.4), inheritedAim = new THREE.Vector3(0, .28, 0), inheritedStar = 0, incomingReady = false;
const anchors = [new THREE.Vector3(-5.25, 1.05, -.8), new THREE.Vector3(-1.85, -1.0, 1.2), new THREE.Vector3(1.85, -1.0, 1.2), new THREE.Vector3(5.25, 1.05, -.8)];
function prepareIncoming() {
  if (incomingReady) return;
  const field = window.__V5_COMPUTE_EXIT_FIELD;
  for (let i = 0; i < IN; i++) {
    const j = i * 3, group = i % 4, a = random() * Math.PI * 2, r = .18 + random() * .92;
    if (field?.positions && field.count) { const k = Math.floor((i + .5) * field.count / IN) * 3; inStart.set(field.positions.subarray(k, k + 3), j); if (field.colors) inColor.set(field.colors.subarray(k, k + 3), j); }
    else { inStart.set([(random() - .5) * 1.5, random() * 4, -1.5], j); const col = new THREE.Color(i % 4 ? C.cyan : C.green); inColor.set([col.r, col.g, col.b], j); }
    inTarget.set([anchors[group].x + Math.cos(a) * r, anchors[group].y + Math.sin(a) * r, anchors[group].z + (random() - .5) * 1.3], j);
    inPos.set(inStart.subarray(j, j + 3), j);
  }
  if (field?.cameraPosition) inheritedCamera.copy(field.cameraPosition);
  if (field?.cameraTarget) inheritedAim.copy(field.cameraTarget);
  inheritedStar = Number.isFinite(field?.starRotationY) ? field.starRotationY : 0;
  inGeo.attributes.position.needsUpdate = true; inGeo.attributes.color.needsUpdate = true; incomingReady = true;
}

// Four dimensional, physical capability modules: branching choices, a falling
// cube and platform, a learning loop, and repeated successful tests.
const moduleSpecs = [
  { name: 'REASONING', color: C.cyan, pos: anchors[0] },
  { name: 'WORLD MODEL', color: C.blue, pos: anchors[1] },
  { name: 'LEARNING', color: C.green, pos: anchors[2] },
  { name: 'RELIABILITY', color: C.yellow, pos: anchors[3] },
];
const modules = [];
for (let i = 0; i < moduleSpecs.length; i++) {
  const spec = moduleSpecs[i], root = new THREE.Group(); root.position.copy(spec.pos); scene.add(root);
  // Heavy base and one illuminated front edge make each capability read as a
  // physical system instead of a floating decorative node.
  box(root, 0, -1.02, 0, [2.65, .16, 1.62], 0x0b1722, .99, false);
  box(root, 0, -.925, .84, [2.48, .055, .035], spec.color, .78, true);
  const name = makeText(THREE, root, spec.name, { width: 3.65, size: 142, color: '#e8fbff', glow: spec.name === 'RELIABILITY' ? '#ffcf72' : '#55e5ff', x: 0, y: -1.48, z: .88 });
  const obj = { ...spec, root, name, iconParts: [], pulse: null, route: null };
  if (i === 0) {
    const pts = [new THREE.Vector3(-.85, -.38, .28), new THREE.Vector3(-.30, -.02, .28), new THREE.Vector3(.10, .40, .28), new THREE.Vector3(.70, .68, .28), new THREE.Vector3(.70, .12, .28)];
    for (const [a, b] of [[0,1],[1,2],[2,3],[2,4]]) beam(root, pts[a], pts[b], .06, C.cyan, .86, true);
    for (const p of [pts[0],pts[1],pts[2],pts[3],pts[4]]) glowBall(root,p.x,p.y,p.z,.115,p===pts[3]?C.green:C.ice,.98);
    obj.route = new THREE.CatmullRomCurve3([pts[0],pts[1],pts[2],pts[3]]); obj.pulse = glowBall(root,0,0,.34,.135,C.ice,.99);
  } else if (i === 1) {
    box(root, 0, -.20, .10, [1.55, .13, .98], 0x183345, .99, false);
    box(root, 0, -.105, .61, [1.43, .045, .08], C.blue, .8, true);
    const trajectory = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.65,.72,.27),new THREE.Vector3(0,1.22,.27),new THREE.Vector3(.63,.40,.27));
    tube(root,trajectory,.025,C.cyan,.72);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.48,.48,.48),basicMat(0x7ed9ec,.98,false)); body.position.set(-.42,.65,.35); root.add(body);
    const cap = new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(.51,.51,.51)),new THREE.LineBasicMaterial({color:C.ice,transparent:true,opacity:.88,depthWrite:false,toneMapped:false})); cap.position.copy(body.position); root.add(cap);
    glowBall(root,.62,.42,.28,.095,C.yellow,.95); obj.cube = body; obj.cubeEdge = cap; obj.trajectory = trajectory;
  } else if (i === 2) {
    const loop = new THREE.TorusGeometry(.65,.065,10,64); const ring = new THREE.Mesh(loop,basicMat(C.green,.84,true)); ring.position.set(0,.25,.27); root.add(ring); obj.loop = ring;
    for (let k=0;k<4;k++){const a=k*Math.PI/2; glowBall(root,Math.cos(a)*.65,.25+Math.sin(a)*.65,.30,.105,k===1?C.yellow:C.ice,.98);}
    obj.loopPulse = glowBall(root,.65,.25,.40,.13,C.ice,.99);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.15,.30,3),basicMat(C.green,.95,true)); arrow.position.set(.61,.58,.28); arrow.rotation.z=-.72; root.add(arrow); obj.arrow=arrow;
  } else {
    for (let k=0;k<3;k++){
      const y=.48-k*.43; beam(root,new THREE.Vector3(-.77,y,.28),new THREE.Vector3(.34,y,.28),.035,0x385664,.92,false);
      glowBall(root,-.78,y,.31,.075,C.ice,.95); glowBall(root,.30,y,.34,.095,C.green,.99);
      const a=new THREE.Vector3(.43,y-.055,.34),b=new THREE.Vector3(.54,y-.16,.34),c=new THREE.Vector3(.77,y+.12,.34);
      beam(root,a,b,.045,C.green,.99,true); beam(root,b,c,.045,C.green,.99,true);
    }
  }
  modules.push(obj);
}

// The shared AGI hub is a visibly incomplete circular system. Four thick feeds
// arrive, but the open arc stays empty when the narration says something may be missing.
const hub = new THREE.Group(); hub.position.set(0,.10,-4.65); scene.add(hub);
const hubShell = new THREE.Mesh(new THREE.SphereGeometry(.74,24,18),basicMat(0x102235,.94,false)); hub.add(hubShell);
const hubCore = glowBall(hub,0,0,.68,.24,C.ice,.92);
const openRing = new THREE.Mesh(new THREE.TorusGeometry(1.16,.075,12,72,Math.PI*1.72),basicMat(C.cyan,.84,true)); hub.add(openRing);
const gapAngle = Math.PI*1.72;
const ringEndA=glowBall(hub,1.16,0,0,.105,C.yellow,.85);
const ringEndB=glowBall(hub,Math.cos(gapAngle)*1.16,Math.sin(gapAngle)*1.16,0,.105,C.yellow,.85);
const missingSpark=glowBall(hub,.9,.43,.12,.075,C.yellow,0);
const agiLabel=makeText(THREE,hub,'AGI?',{width:2.45,size:174,color:'#f2fcff',glow:'#55e5ff',x:0,y:-.12,z:.92});
const conduits=[];
for(let i=0;i<modules.length;i++){
  const s=modules[i].pos, e=new THREE.Vector3(Math.sign(s.x)*.92,s.y*.18,-4.15), mid=new THREE.Vector3(s.x*.48,s.y*.40,-2.65);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(s.x*.83,s.y*.80,s.z-.12),mid,e]);
  const line=tube(scene,curve,.062,modules[i].color,.70),pulse=glowBall(scene,0,0,0,.135,modules[i].color,.99);
  conduits.push({curve,line,pulse,phase:i*.19,color:modules[i].color});
}

// A sparse, perspective time horizon becomes visible only after the four known
// modules retreat; these are unknown milestones, not a fabricated fifth module.
const horizon = new THREE.Group(); scene.add(horizon);
const horizonNodes=[];
for(let i=0;i<9;i++){
  const z=-5-i*2.35,x=Math.sin(i*1.71)*(.55+i*.08),y=Math.cos(i*1.31)*(.62+i*.05);
  const node=glowBall(horizon,x,y,z,i%3===0?.11:.072,i%3===0?C.yellow:C.cyan,.88); horizonNodes.push({node,x,y,z,phase:i*.8});
}
const horizonCurves=[];
for(let i=0;i<horizonNodes.length-1;i++){
  const a=horizonNodes[i],b=horizonNodes[i+1],curve=new THREE.LineCurve3(new THREE.Vector3(a.x,a.y,a.z),new THREE.Vector3(b.x,b.y,b.z));
  const link=new THREE.Line(new THREE.BufferGeometry().setFromPoints([curve.v1,curve.v2]),new THREE.LineBasicMaterial({color:0x318aff,transparent:true,opacity:.20,depthWrite:false,toneMapped:false})); horizon.add(link); horizonCurves.push(link);
}
// A literal, undated clock and physical timeline replace the abstract horizon
// during the final question about when advances will arrive.
const timeDisplay=new THREE.Group();timeDisplay.position.set(0,.12,-4.75);scene.add(timeDisplay);
const clockFace=new THREE.Mesh(new THREE.CircleGeometry(1.12,64),basicMat(0x0b1824,.98,false));clockFace.position.z=.08;timeDisplay.add(clockFace);
const clockRim=new THREE.Mesh(new THREE.TorusGeometry(1.18,.085,12,72),basicMat(C.yellow,.95,true));timeDisplay.add(clockRim);
for(let i=0;i<12;i++){
  const a=i*Math.PI/6,x=Math.sin(a),y=Math.cos(a),r=i%3===0?1.00:.94;
  const mark=glowBall(timeDisplay,x*r,y*r,.17,i%3===0?.078:.045,i%3===0?C.yellow:C.ice,.96);
}
const hourHand=beam(timeDisplay,new THREE.Vector3(0,0,.23),new THREE.Vector3(.10,.55,.23),.055,C.ice,.98,true);
const minuteHand=beam(timeDisplay,new THREE.Vector3(0,0,.26),new THREE.Vector3(.76,-.08,.26),.035,C.yellow,.98,true);
const clockHub=glowBall(timeDisplay,0,0,.30,.095,C.ice,.99);
const timeline=new THREE.Group();scene.add(timeline);
beam(timeline,new THREE.Vector3(-5.4,-1.62,-3.35),new THREE.Vector3(5.4,-1.62,-3.35),.043,C.cyan,.78,true);
for(let i=0;i<=10;i++){
  const x=-5+i,major=i%2===0;
  beam(timeline,new THREE.Vector3(x,-1.62,-3.35),new THREE.Vector3(x,-1.62+(major?.40:.22),-3.35),major?.035:.022,major?C.ice:C.blue,.82,true);
  if([1,5,9].includes(i))glowBall(timeline,x,-1.53,-3.25,.11,i===5?C.yellow:C.cyan,.96);
}
const unknownQuestion=makeText(THREE,camera,'WHICH CAPABILITY?',{width:10.4,size:76,color:'#e7faff',glow:'#55e5ff',x:0,y:3.92,z:-16});
const whenQuestion=makeText(THREE,camera,'WHEN WILL THEY ARRIVE?',{width:11.4,size:74,color:'#fff0c6',glow:'#ffcf72',x:0,y:3.92,z:-16});
const titleNoSingle=makeText(THREE,camera,'NO SINGLE BARRIER TO AGI',{width:14.2,size:74,color:'#e8fbff',glow:'#55e5ff',x:0,y:4.02,z:-16});
const titleTogether=makeText(THREE,camera,'MANY ADVANCES. ONE SYSTEM.',{width:14.5,size:72,color:'#e8fbff',glow:'#55e5ff',x:0,y:4.02,z:-16});
const titleMissing=makeText(THREE,camera,'MISSING SOMETHING FUNDAMENTAL?',{width:15.0,size:62,color:'#fff0c6',glow:'#ffcf72',x:0,y:4.02,z:-16});

function renderFrame(frame) {
  const t=clamp(Number(frame)/FPS,0,DURATION); prepareIncoming();
  const cameraBlend=smooth(t/.82), finalPush=smooth((t-18.2)/5.7);
  camera.position.set(THREE.MathUtils.lerp(inheritedCamera.x,0,cameraBlend)+Math.sin(t*.08)*.18,
    THREE.MathUtils.lerp(inheritedCamera.y,2.35,cameraBlend)+Math.sin(t*.09)*.12,
    THREE.MathUtils.lerp(inheritedCamera.z,23.4,cameraBlend)-finalPush*3.1);
  aim.copy(inheritedAim).lerp(new THREE.Vector3(0,0,-1.1),cameraBlend); aim.z-=finalPush*1.5; camera.lookAt(aim); camera.updateMatrixWorld(true);
  // Rack, floor, and seed particles overlap for a short, readable handoff.
  fadeGroup(rackEcho,1-smooth((t-.08)/.86)); fadeGroup(floorEcho,1-.62*smooth((t-.18)/.88));
  const settle=smooth(t/1.04), particleAlpha=.72*(1-smooth((t-.62)/.74));
  const p=inGeo.attributes.position.array;
  for(let i=0;i<IN;i++){
    const j=i*3,u=smooth(t/.88),arc=Math.sin(Math.PI*u)*.34;
    p[j]=THREE.MathUtils.lerp(inStart[j],inTarget[j],u);
    p[j+1]=THREE.MathUtils.lerp(inStart[j+1],inTarget[j+1],u)+arc;
    p[j+2]=THREE.MathUtils.lerp(inStart[j+2],inTarget[j+2],u)+Math.sin(Math.PI*u)*.75;
  }
  inGeo.attributes.position.needsUpdate=true; inMat.uniforms.uOpacity.value=particleAlpha;
  if(stars.material.uniforms?.uOpacity) stars.material.uniforms.uOpacity.value=starOpacity*(.90-.46*finalPush);
  stars.rotation.y=inheritedStar+t*.0009; stars.rotation.x=Math.sin(t*.035)*.004;
  // First sentence: a single alleged bottleneck is questioned; no module is highlighted.
  setTextAlpha(titleNoSingle,win(t,.28,7.82,.30,.28));
  // The four modules are staged one by one while the narration says advances work together.
  setTextAlpha(titleTogether,win(t,8.04,12.35,.24,.30));
  modules.forEach((m,i)=>{
    const latent=.28*win(t,1.18,8.06,.72,.28), revealed=win(t,8.24+i*.72,20.32,.42,.34), a=Math.max(latent,revealed); fadeGroup(m.root,a);
    setTextAlpha(m.name,win(t,8.20+i*.72,20.25,.38,.32));
    if(m.pulse&&m.route){const u=(t*.42)%1;m.pulse.position.copy(m.route.getPointAt(u));m.pulse.material.opacity=.98*a;}
    if(m.cube){m.cube.position.y=.38+.50*Math.abs(Math.sin((t-8.8)*2.25));m.cube.rotation.set((t-8.8)*.76,(t-8.8)*.94,(t-8.8)*1.05);m.cubeEdge.position.copy(m.cube.position);m.cubeEdge.rotation.copy(m.cube.rotation);}
    if(m.loopPulse){const u=(t*.17+.11)%1,aPos=m.loop.geometry.parameters?.radius||.65;const ang=u*Math.PI*2;m.loopPulse.position.set(Math.cos(ang)*aPos, .25+Math.sin(ang)*aPos,.40);}
  });
  const feeds=win(t,9.05,17.65,.45,.38);
  conduits.forEach((c,i)=>{
    const on=feeds*(1-smooth((t-13.4)/.75)); c.line.material.opacity=.70*on;
    const u=(t*.21+c.phase)%1;c.pulse.position.copy(c.curve.getPointAt(u));c.pulse.material.opacity=.98*on;
  });
  const coreA=win(t,8.12,20.36,.5,.58); fadeGroup(hub,coreA);
  const missing=win(t,13.7,18.1,.55,.45);
  missingSpark.material.opacity=.96*missing*(.45+.55*Math.sin(t*9)**2);
  ringEndA.material.opacity=.92*coreA*(.40+.60*missing); ringEndB.material.opacity=.92*coreA*(.40+.60*missing);
  setTextAlpha(agiLabel,coreA);
  setTextAlpha(titleMissing,win(t,13.48,17.15,.28,.16));
  // The decisive capability and arrival time remain unknown; known modules clear first.
  const unknown=win(t,17.34,23.98,.30,.20),clockA=win(t,20.28,23.98,.42,.18),knownExit=1-smooth((t-20.0)/.45);
  fadeGroup(horizon,unknown*(1-.92*clockA)); fadeGroup(timeDisplay,clockA); fadeGroup(timeline,clockA);
  setTextAlpha(unknownQuestion,win(t,17.20,20.38,.16,.24));
  setTextAlpha(whenQuestion,win(t,20.40,23.98,.22,.18));
  hourHand.rotation.z=Math.sin(t*2.1)*.52; minuteHand.rotation.z=-t*1.4;
  horizonNodes.forEach(n=>{n.node.position.x=n.x+Math.sin(t*.43+n.phase)*.15;n.node.position.y=n.y+Math.cos(t*.37+n.phase)*.12;});
  conduits.forEach(c=>{if(t>17.0)c.line.material.opacity=.70*feeds*knownExit;});
  if(t>=DURATION-1/FPS){
    const positions=new Float32Array(horizonNodes.length*3),colors=new Float32Array(horizonNodes.length*3);
    horizonNodes.forEach((n,i)=>{positions.set([n.node.position.x,n.node.position.y,n.node.position.z],i*3);const q=new THREE.Color(i%3===0?C.yellow:C.cyan);colors.set([q.r,q.g,q.b],i*3);});
    window.__V5_CAPABILITY_EXIT_FIELD={count:horizonNodes.length,positions,colors,cameraPosition:camera.position.clone(),cameraTarget:aim.clone(),starRotationY:stars.rotation.y};
  }
  renderer.render(scene,camera); window.__sceneTime=t;
}
function resize(){const w=Math.max(1,host.clientWidth||window.innerWidth),h=Math.max(1,host.clientHeight||Math.round(w*9/16));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(standalone)renderFrame(Math.round((window.__playerTime||140.38)*FPS)-Math.round(140.38*FPS));}
if(standalone){window.renderFrame=renderFrame;window.__sceneReady=true;window.addEventListener('resize',resize);resize();renderFrame(0);window.dispatchEvent(new Event('v5scene-ready'));}
export {renderFrame,resize};
