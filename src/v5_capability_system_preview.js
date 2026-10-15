import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, box, beam } from './v5_autodrive_world.js';

const brainResponse = await fetch(new URL('../assets/models/v5_brain_surface_points.bin', import.meta.url));
if (!brainResponse.ok) throw new Error(`Brain particle asset failed to load (${brainResponse.status}).`);
const brainSurfacePositions = new Float32Array(await brainResponse.arrayBuffer());
if (!brainSurfacePositions.length || brainSurfacePositions.length % 3) throw new Error('Brain particle asset is malformed.');

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
const anchors = [new THREE.Vector3(-6.25, 1.30, -.8), new THREE.Vector3(-2.65, -1.42, 1.2), new THREE.Vector3(2.65, -1.42, 1.2), new THREE.Vector3(6.25, 1.30, -.8)];
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
  const spec = moduleSpecs[i], root = new THREE.Group(); root.position.copy(spec.pos); root.scale.setScalar(1.22); scene.add(root);
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
const agiLabel=makeText(THREE,hub,'AI MODEL',{width:2.75,size:142,color:'#f2fcff',glow:'#55e5ff',x:0,y:-.12,z:.92});
const conduits=[];
for(let i=0;i<modules.length;i++){
  const s=modules[i].pos, e=new THREE.Vector3(Math.sign(s.x)*.92,s.y*.18,-4.15), mid=new THREE.Vector3(s.x*.48,s.y*.40,-2.65);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(s.x*.83,s.y*.80,s.z-.12),mid,e]);
  const line=tube(scene,curve,.062,modules[i].color,.70),pulse=glowBall(scene,0,0,0,.135,modules[i].color,.99);
  conduits.push({curve,line,pulse,phase:i*.19,color:modules[i].color});
}

// Bake a compact point-cloud hologram from the CC-BY GLB in sample-3d/brain.html.
// The point order and generated explosion vectors are seeded for frame-exact replay.
function buildBrainLinks(positions) {
  const cell=.22, radiusSq=cell*cell*1.7, grid=new Map(), links=[];
  const key=(x,y,z)=>`${x},${y},${z}`;
  for(let i=0;i<positions.length/3;i++){
    const j=i*3,x=positions[j],y=positions[j+1],z=positions[j+2],cx=Math.floor(x/cell),cy=Math.floor(y/cell),cz=Math.floor(z/cell);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
      const near=grid.get(key(cx+dx,cy+dy,cz+dz));if(!near)continue;
      for(const k of near){const q=k*3,ax=x-positions[q],ay=y-positions[q+1],az=z-positions[q+2];if(ax*ax+ay*ay+az*az<radiusSq)links.push(x,y,z,positions[q],positions[q+1],positions[q+2]);}
    }
    const k=key(cx,cy,cz);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);
  }
  return new Float32Array(links);
}
const brainCount=brainSurfacePositions.length/3,brainCount3=brainSurfacePositions.length;
const brainGroup=new THREE.Group();brainGroup.position.set(0,.12,-4.65);brainGroup.scale.setScalar(1.34);scene.add(brainGroup);
const brainMorphPositions=new Float32Array(brainCount3),brainColors=new Float32Array(brainCount3),burstDirections=new Float32Array(brainCount3),burstRadii=new Float32Array(brainCount);
const brainBase=new THREE.Color(0x16b8ec),brainAccent=new THREE.Color(0x7d59ff);
for(let i=0;i<brainCount;i++){
  const j=i*3,mix=.06+random()*.30,col=brainBase.clone().lerp(brainAccent,mix);brainColors.set([col.r,col.g,col.b],j);
  const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);burstDirections.set([r*Math.cos(a),z,r*Math.sin(a)],j);burstRadii[i]=2.35+random()*2.35;
}
const brainGeometry=new THREE.BufferGeometry();
brainGeometry.setAttribute('position',new THREE.BufferAttribute(brainMorphPositions,3).setUsage(THREE.DynamicDrawUsage));
brainGeometry.setAttribute('color',new THREE.BufferAttribute(brainColors,3));brainGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),8.2);
const brainPointMat=new THREE.PointsMaterial({size:.024,vertexColors:true,transparent:true,opacity:.60,blending:THREE.NormalBlending,depthWrite:false,sizeAttenuation:true,toneMapped:false});brainPointMat.userData.baseOpacity=.60;
const brainHaloMat=new THREE.PointsMaterial({size:.060,color:0x61cfff,transparent:true,opacity:.020,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true,toneMapped:false});brainHaloMat.userData.baseOpacity=.020;
brainGroup.add(new THREE.Points(brainGeometry,brainPointMat),new THREE.Points(brainGeometry,brainHaloMat));
const brainLinkGeometry=new THREE.BufferGeometry();brainLinkGeometry.setAttribute('position',new THREE.BufferAttribute(buildBrainLinks(brainSurfacePositions),3));
const brainLineMat=new THREE.LineBasicMaterial({color:0x3a84ff,transparent:true,opacity:.060,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});brainLineMat.userData.baseOpacity=.060;
brainGroup.add(new THREE.LineSegments(brainLinkGeometry,brainLineMat));
const impactGroup=new THREE.Group();impactGroup.position.copy(hub.position);scene.add(impactGroup);
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(.82,.045,10,72),basicMat(C.ice,0,true));impactGroup.add(impactRing);
const impactRing2=new THREE.Mesh(new THREE.TorusGeometry(.82,.022,8,72),basicMat(C.yellow,0,true));impactGroup.add(impactRing2);
const impactCore=glowBall(impactGroup,0,0,.02,.42,C.ice,0);
const unknownQuestion=makeText(THREE,camera,'WHICH CAPABILITIES?',{width:11.8,size:74,color:'#e7faff',glow:'#55e5ff',x:0,y:3.92,z:-16});
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
  // Preserve the real server-room silhouette through the particle handoff.
  fadeGroup(rackEcho,1-smooth((t-.08)/.86)); fadeGroup(floorEcho,1-.62*smooth((t-.18)/.88));
  const particleAlpha=.72*(1-smooth((t-.62)/.74)),p=inGeo.attributes.position.array;
  for(let i=0;i<IN;i++){
    const j=i*3,u=smooth(t/.88),arc=Math.sin(Math.PI*u)*.34;
    p[j]=THREE.MathUtils.lerp(inStart[j],inTarget[j],u);
    p[j+1]=THREE.MathUtils.lerp(inStart[j+1],inTarget[j+1],u)+arc;
    p[j+2]=THREE.MathUtils.lerp(inStart[j+2],inTarget[j+2],u)+Math.sin(Math.PI*u)*.75;
  }
  inGeo.attributes.position.needsUpdate=true; inMat.uniforms.uOpacity.value=particleAlpha;
  if(stars.material.uniforms?.uOpacity) stars.material.uniforms.uOpacity.value=starOpacity*(.90-.46*finalPush);
  stars.rotation.y=inheritedStar+t*.0009; stars.rotation.x=Math.sin(t*.035)*.004;
  setTextAlpha(titleNoSingle,win(t,.28,7.82,.30,.28));
  setTextAlpha(titleTogether,win(t,8.04,12.35,.10,.30));

  const orbitStart=14.55,collisionTime=16.44,burstPeak=16.80,formEnd=17.84;
  const orbit=clamp((t-orbitStart)/(collisionTime-orbitStart)),orbitEased=orbit*orbit;
  modules.forEach((m,i)=>{
    const activateAt=8.08+i*.72;
    const latent=.28*win(t,1.18,activateAt,.72,.16),activated=win(t,activateAt,collisionTime,.20,.20);
    let orbitAlpha=1;
    if(t>=orbitStart){
      const x=m.pos.x,y=m.pos.y-.10,r0=Math.hypot(x,y/.70),theta0=Math.atan2(y/.70,x);
      const turn=theta0+Math.PI*3.3*orbitEased,r=THREE.MathUtils.lerp(r0,.10,smooth(orbit));
      m.root.position.set(Math.cos(turn)*r,.10+Math.sin(turn)*r*.70,THREE.MathUtils.lerp(m.pos.z,-4.65,smooth(orbit)));
      const impactShrink=smooth((orbit-.78)/.22);m.root.scale.setScalar(1.22*(1-.72*impactShrink));
      m.root.rotation.y=.12*Math.sin(turn);
      orbitAlpha=1-smooth((orbit-.72)/.28);
    }else{m.root.position.copy(m.pos);m.root.scale.setScalar(1.22);m.root.rotation.y=0;}
    const alpha=Math.max(latent,activated)*orbitAlpha;fadeGroup(m.root,alpha);
    const labelOrbitAlpha=t<orbitStart?1:1-smooth((orbit-.16)/.36);setTextAlpha(m.name,activated*labelOrbitAlpha);
    if(m.pulse&&m.route){const u=(t*.42)%1;m.pulse.position.copy(m.route.getPointAt(u));m.pulse.material.opacity=.98*alpha;}
    if(m.cube){m.cube.position.y=.38+.50*Math.abs(Math.sin((t-8.8)*2.25));m.cube.rotation.set((t-8.8)*.76,(t-8.8)*.94,(t-8.8)*1.05);m.cubeEdge.position.copy(m.cube.position);m.cubeEdge.rotation.copy(m.cube.rotation);}
    if(m.loopPulse){const u=(t*.17+.11)%1,aPos=m.loop.geometry.parameters?.radius||.65,ang=u*Math.PI*2;m.loopPulse.position.set(Math.cos(ang)*aPos,.25+Math.sin(ang)*aPos,.40);}
  });

  // Each newly activated capability opens a dedicated tether and sends a signal
  // pulse toward the central AI Model; all four stay active until the orbit begins.
  conduits.forEach((c,i)=>{
    const activateAt=8.08+i*.72,on=win(t,activateAt,orbitStart,.18,.22),elapsed=Math.max(0,t-activateAt);
    c.line.material.opacity=.76*on;
    const u=(elapsed*1.08)%1;c.pulse.position.copy(c.curve.getPointAt(u));
    c.pulse.material.opacity=.98*on*(.46+.54*Math.pow(Math.sin(elapsed*3.4),6));
  });
  const coreA=win(t,8.12,collisionTime,.5,.08);fadeGroup(hub,coreA);
  const missing=win(t,orbitStart,burstPeak+.22,.16,.30);
  missingSpark.material.opacity=.96*missing*(.45+.55*Math.sin(t*9)**2);
  ringEndA.material.opacity=.92*coreA*(.40+.60*missing);ringEndB.material.opacity=.92*coreA*(.40+.60*missing);
  setTextAlpha(agiLabel,coreA);
  setTextAlpha(titleMissing,win(t,orbitStart,17.16,.18,.12));

  // A single impact throws the same deterministic particles outward, then draws
  // them back onto the CC-BY brain surface as the next sentence begins.
  const burstStart=collisionTime-.08,launch=clamp((t-burstStart)/(burstPeak-burstStart)),expansion=1-Math.pow(1-launch,3),formation=smooth((t-burstPeak)/(formEnd-burstPeak));
  for(let i=0;i<brainCount;i++){
    const j=i*3,r=burstRadii[i]*expansion;
    brainMorphPositions[j]=THREE.MathUtils.lerp(burstDirections[j]*r,brainSurfacePositions[j],formation);
    brainMorphPositions[j+1]=THREE.MathUtils.lerp(burstDirections[j+1]*r,brainSurfacePositions[j+1],formation);
    brainMorphPositions[j+2]=THREE.MathUtils.lerp(burstDirections[j+2]*r,brainSurfacePositions[j+2],formation);
  }
  brainGeometry.attributes.position.needsUpdate=true;
  const brainAlpha=smooth((t-(collisionTime-.08))/.12);brainGroup.visible=brainAlpha>.006;
  brainGroup.rotation.y=(t-burstPeak)*.78;brainGroup.rotation.x=.07+Math.sin(t*.34)*.055;brainGroup.rotation.z=Math.sin(t*.21)*.035;
  brainPointMat.opacity=.60*brainAlpha;brainHaloMat.opacity=.020*brainAlpha;brainLineMat.opacity=.060*brainAlpha*formation;
  const impact=win(t,collisionTime,collisionTime+.68,.035,.30),impactProgress=clamp((t-collisionTime)/.68);
  impactGroup.visible=impact>.004;impactRing.scale.setScalar(.55+impactProgress*4.2);impactRing2.scale.setScalar(.65+impactProgress*3.55);
  impactRing.material.opacity=.95*impact*(1-.24*impactProgress);impactRing2.material.opacity=.84*impact;
  impactCore.material.opacity=.92*impact*(1-smooth(impactProgress/.30));

  setTextAlpha(unknownQuestion,win(t,17.20,20.38,.16,.24));
  setTextAlpha(whenQuestion,win(t,20.40,23.98,.22,.18));
  if(t>=DURATION-1/FPS){
    brainGroup.updateMatrixWorld(true);
    const positions=new Float32Array(brainCount3),colors=new Float32Array(brainCount3),v=new THREE.Vector3();
    for(let i=0;i<brainCount;i++){const j=i*3;v.set(brainMorphPositions[j],brainMorphPositions[j+1],brainMorphPositions[j+2]).applyMatrix4(brainGroup.matrixWorld);positions.set([v.x,v.y,v.z],j);colors.set(brainColors.subarray(j,j+3),j);}
    window.__V5_CAPABILITY_EXIT_FIELD={count:brainCount,positions,colors,cameraPosition:camera.position.clone(),cameraTarget:aim.clone(),starRotationY:stars.rotation.y};
  }
  renderer.render(scene,camera);window.__sceneTime=t;
}
function resize(){const w=Math.max(1,host.clientWidth||window.innerWidth),h=Math.max(1,host.clientHeight||Math.round(w*9/16));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(standalone)renderFrame(Math.round((window.__playerTime||140.38)*FPS)-Math.round(140.38*FPS));}
if(standalone){window.renderFrame=renderFrame;window.__sceneReady=true;window.addEventListener('resize',resize);resize();renderFrame(0);window.dispatchEvent(new Event('v5scene-ready'));}
export {renderFrame,resize};
