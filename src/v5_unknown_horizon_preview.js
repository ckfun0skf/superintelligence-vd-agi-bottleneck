import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, box, beam } from './v5_autodrive_world.js';

// V5 Task 7 — the instrumental uncertainty bridge (02:44.35–03:00.00).
// The preceding spoken question ends at 02:44.22; the next narration begins at 03:00.70.
const FPS = 24, DURATION = 15.65;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, .0018);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, .1, 360);
scene.add(camera);
const aim = new THREE.Vector3(0, .28, 0);
let seed = 20261016;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const smoothstep = x => { x = clamp(x); return x * x * (3 - 2 * x); };

// Continue the exact brain position, color, camera, and star rotation from Task 6.
const COUNT = 4600;
const startPositions = new Float32Array(COUNT * 3), startColors = new Float32Array(COUNT * 3);
let cameraStart = new THREE.Vector3(0, 2.35, 20.3), aimStart = new THREE.Vector3(0, 0, -2.6), starStart = 0, incomingReady = false;

// A quiet, deep star field maintains spatial continuity without competing with the horizon.
const STAR_COUNT = 520, starPos = new Float32Array(STAR_COUNT * 3), starCol = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const j = i * 3;
  starPos.set([(random() - .5) * 94, (random() - .5) * 58, -24 - random() * 150], j);
  const col = new THREE.Color(i % 29 === 0 ? 0x75bfff : 0x315875);
  const f = i % 29 === 0 ? .38 : .20; starCol.set([col.r * f, col.g * f, col.b * f], j);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 190);
const starMat = new THREE.PointsMaterial({ size: .040, vertexColors: true, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

// Four paths recede in 3D perspective: a literal horizon/route, not a doorway or calendar.
const pathGroup = new THREE.Group(); scene.add(pathGroup);
const laneColors = [C.cyan, C.blue, C.green, C.yellow];
const laneXs = [-6.1, -2.0, 2.0, 6.1];
function lanePoint(i, u) {
  const z = THREE.MathUtils.lerp(-5, -78, u);
  const perspective = 1 - .94 * u;
  const x = laneXs[i] * perspective;
  const y = THREE.MathUtils.lerp(-1.62, -.10, u) + Math.sin(u * Math.PI) * .18;
  return new THREE.Vector3(x, y, z);
}
const curves = laneXs.map((_, i) => new THREE.CatmullRomCurve3([
  lanePoint(i, 0), lanePoint(i, .27), lanePoint(i, .62), lanePoint(i, 1),
]));
const laneMaterials = [];
for (let i = 0; i < 4; i++) {
  const material = new THREE.MeshBasicMaterial({ color: laneColors[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const rail = new THREE.Mesh(new THREE.TubeGeometry(curves[i], 144, .040, 8, false), material);
  pathGroup.add(rail); laneMaterials.push(material);
}
// Date-free distance ticks make the depth read as a timeline without inventing dates.
const tickMaterials = [];
for (const u of [.10, .21, .35, .51, .69, .86]) {
  const pts = laneXs.map((_, i) => lanePoint(i, u));
  const left = pts[0], right = pts[3];
  const geo = new THREE.BufferGeometry().setFromPoints([left, right]);
  const mat = new THREE.LineBasicMaterial({ color: 0x7db8ce, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  pathGroup.add(new THREE.Line(geo, mat)); tickMaterials.push(mat);
  for (let i = 0; i < 4; i++) {
    const p = pts[i], tipA = p.clone().add(new THREE.Vector3(-.12 * (1 - u), 0, 0)), tipB = p.clone().add(new THREE.Vector3(.12 * (1 - u), 0, 0));
    const tickGeo = new THREE.BufferGeometry().setFromPoints([tipA, tipB]);
    const tickMat = new THREE.LineBasicMaterial({ color: laneColors[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    pathGroup.add(new THREE.Line(tickGeo, tickMat)); tickMaterials.push(tickMat);
  }
}

// Three-dimensional candidates retain recognizable shapes from the prior capability systems.
const tokenGroup = new THREE.Group(); scene.add(tokenGroup);
const tokens = [];
function glow(parent, x, y, z, radius, color, opacity = .95) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), basicMat(color, opacity, true));
  m.position.set(x, y, z); parent.add(m); return m;
}
for (let i = 0; i < 4; i++) {
  const root = new THREE.Group(); tokenGroup.add(root);
  if (i === 0) {
    const nodes = [[-.42,-.18,0],[-.12,.10,0],[.16,.34,0],[.45,.47,0],[.16,-.12,0],[.46,-.32,0]];
    for (const [a,b] of [[0,1],[1,2],[2,3],[2,4],[4,5]]) beam(root,new THREE.Vector3(...nodes[a]),new THREE.Vector3(...nodes[b]),.035,C.cyan,.94,true);
    nodes.forEach(([x,y,z],k)=>glow(root,x,y,z,.075,k===3?C.green:C.ice,.98));
  } else if (i === 1) {
    box(root,0,-.21,0,[.92,.12,.72],0x183345,.98,false);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(.35,.35,.35),basicMat(0x7ed9ec,.99,false)); cube.position.set(-.19,.12,.05); root.add(cube);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.37,.37,.37)),new THREE.LineBasicMaterial({color:C.ice,transparent:true,opacity:.92,depthWrite:false,toneMapped:false})); edge.position.copy(cube.position); root.add(edge);
    glow(root,.39,.16,.08,.065,C.yellow,.96);
  } else if (i === 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.34,.045,8,48),basicMat(C.green,.94,true)); root.add(ring);
    for(let k=0;k<3;k++){const a=k*Math.PI*2/3;glow(root,Math.cos(a)*.34,Math.sin(a)*.34,.03,.065,k===1?C.yellow:C.ice,.98);}
  } else {
    for(let k=0;k<3;k++){
      const y=.30-k*.25;
      beam(root,new THREE.Vector3(-.38,y,0),new THREE.Vector3(.22,y,0),.025,0x547080,.9,false);
      glow(root,-.40,y,.02,.042,C.ice,.96);
      beam(root,new THREE.Vector3(.26,y-.04,.03),new THREE.Vector3(.34,y-.12,.03),.035,C.green,.98,true);
      beam(root,new THREE.Vector3(.34,y-.12,.03),new THREE.Vector3(.49,y+.09,.03),.035,C.green,.98,true);
    }
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.59,.018,6,56),basicMat(laneColors[i],.70,true)); rim.position.z=-.08; root.add(rim);
  tokens.push(root);
}

// Deterministically stream the same Task 6 brain points along the four futures.
const targetPositions = new Float32Array(COUNT * 3), currentPositions = new Float32Array(COUNT * 3), targetColors = new Float32Array(COUNT * 3), currentColors = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const j = i * 3, lane = i % 4, u = .035 + random() * .90, point = curves[lane].getPointAt(u);
  const spread = .045 + random() * .16;
  targetPositions.set([point.x + (random()-.5)*spread,point.y+(random()-.5)*spread,point.z+(random()-.5)*spread*2],j);
  const col = new THREE.Color(laneColors[lane]); targetColors.set([col.r*.76,col.g*.76,col.b*.76],j);
  currentPositions.set(startPositions.subarray(j,j+3),j); currentColors.set(startColors.subarray(j,j+3),j);
}
const cloudGeo = new THREE.BufferGeometry();
cloudGeo.setAttribute('position',new THREE.BufferAttribute(currentPositions,3).setUsage(THREE.DynamicDrawUsage));
cloudGeo.setAttribute('color',new THREE.BufferAttribute(currentColors,3).setUsage(THREE.DynamicDrawUsage));
cloudGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,-34),95);
// Match Task 6's .024 local points after its 1.78 group scale and normal blend,
// so the opening horizon frame retains the brain's exact apparent size and density.
const cloudMat = new THREE.PointsMaterial({size:.04272,vertexColors:true,transparent:true,opacity:.60,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false,sizeAttenuation:true});
const cloud = new THREE.Points(cloudGeo,cloudMat); scene.add(cloud);
const haloMat = new THREE.PointsMaterial({size:.1068,color:0x61cfff,transparent:true,opacity:.020,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,sizeAttenuation:true});
const haloCloud = new THREE.Points(cloudGeo,haloMat); scene.add(haloCloud);
const linksGeo = new THREE.BufferGeometry(); linksGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0,0,-34),95);
const linksMat = new THREE.LineBasicMaterial({color:0x3a84ff,transparent:true,opacity:.060,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
const links = new THREE.LineSegments(linksGeo,linksMat); scene.add(links);
let linkPairs=[],linkPositions;

// Camera-facing titles keep the previous question continuous across the scene boundary.
const whenTitle = makeText(THREE,camera,'WHEN WILL THEY ARRIVE?',{width:11.4,size:74,color:'#fff0c6',glow:'#ffcf72',x:0,y:3.92,z:-16});
const horizonTitle = makeText(THREE,camera,'NO CERTAIN TIMELINE',{width:11.8,size:76,color:'#e7faff',glow:'#55e5ff',x:0,y:3.92,z:-16});

function prepareIncoming(){
  if(incomingReady)return;
  const source=window.__V5_CAPABILITY_EXIT_FIELD||{};
  if(source.positions?.length>=COUNT*3){
    startPositions.set(source.positions.subarray(0,COUNT*3));
    if(source.colors?.length>=COUNT*3)startColors.set(source.colors.subarray(0,COUNT*3));
  }else{
    for(let i=0;i<COUNT;i++){
      const j=i*3,a=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z);
      startPositions.set([r*Math.cos(a)*3,z*2.3,r*Math.sin(a)*3-4.6],j);
      const col=new THREE.Color(C.cyan);startColors.set([col.r,col.g,col.b],j);
    }
  }
  if(source.cameraPosition)cameraStart.copy(source.cameraPosition);
  if(source.cameraTarget)aimStart.copy(source.cameraTarget);
  starStart=Number.isFinite(source.starRotationY)?source.starRotationY:0;
  // Rebuild the same short-range blue links around the inherited brain points.
  const cell=.392,radiusSq=.2606,grid=new Map(),pairs=[];
  const key=(x,y,z)=>`${x},${y},${z}`;
  for(let i=0;i<COUNT;i++){
    const j=i*3,x=startPositions[j],y=startPositions[j+1],z=startPositions[j+2],cx=Math.floor(x/cell),cy=Math.floor(y/cell),cz=Math.floor(z/cell);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
      const near=grid.get(key(cx+dx,cy+dy,cz+dz));if(!near)continue;
      for(const k of near){const q=k*3,ax=x-startPositions[q],ay=y-startPositions[q+1],az=z-startPositions[q+2];if(ax*ax+ay*ay+az*az<radiusSq)pairs.push(k,i);}
    }
    const k=key(cx,cy,cz);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);
  }
  linkPairs=pairs;linkPositions=new Float32Array(pairs.length/2*6);
  for(let e=0;e<pairs.length/2;e++){
    const j=e*6,a=pairs[e*2]*3,b=pairs[e*2+1]*3;
    linkPositions.set(startPositions.subarray(a,a+3),j);linkPositions.set(startPositions.subarray(b,b+3),j+3);
  }
  linksGeo.setAttribute('position',new THREE.BufferAttribute(linkPositions,3).setUsage(THREE.DynamicDrawUsage));
  linksGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,-34),95);
  currentPositions.set(startPositions);currentColors.set(startColors);incomingReady=true;
}

function renderFrame(frame) {
  prepareIncoming();
  const t=clamp(Number(frame)/FPS,0,DURATION);
  const morph=smoothstep((t-1.15)/3.55), paths=smoothstep((t-.75)/2.7), titleSwap=smoothstep((t-3.45)/1.05);
  const cameraPush=smoothstep(t/10.0), cameraDrift=Math.sin(t*.19)*.34;
  camera.position.set(THREE.MathUtils.lerp(cameraStart.x,0,cameraPush)+cameraDrift,
    THREE.MathUtils.lerp(cameraStart.y,1.05,cameraPush)+Math.sin(t*.16)*.10,
    THREE.MathUtils.lerp(cameraStart.z,2.0,cameraPush));
  aim.set(THREE.MathUtils.lerp(aimStart.x,0,cameraPush),THREE.MathUtils.lerp(aimStart.y,-.42,cameraPush),THREE.MathUtils.lerp(aimStart.z,-28,cameraPush));
  camera.lookAt(aim); camera.updateMatrixWorld(true);
  stars.rotation.y=starStart+t*.0016; stars.rotation.x=Math.sin(t*.10)*.006;
  starMat.opacity=.48*(.86+.14*Math.sin(t*.72));
  for(let i=0;i<COUNT;i++){
    const j=i*3,wiggle=(1-morph)*.035;
    currentPositions[j]=THREE.MathUtils.lerp(startPositions[j],targetPositions[j],morph)+Math.sin(t*.8+i*.31)*wiggle;
    currentPositions[j+1]=THREE.MathUtils.lerp(startPositions[j+1],targetPositions[j+1],morph)+Math.cos(t*.7+i*.27)*wiggle;
    currentPositions[j+2]=THREE.MathUtils.lerp(startPositions[j+2],targetPositions[j+2],morph)+Math.sin(t*.62+i*.23)*wiggle;
    for(let k=0;k<3;k++)currentColors[j+k]=THREE.MathUtils.lerp(startColors[j+k],targetColors[j+k],morph);
  }
  cloudGeo.attributes.position.needsUpdate=true;cloudGeo.attributes.color.needsUpdate=true;
  cloudMat.opacity=THREE.MathUtils.lerp(.60,.82,morph)*(1-.22*smoothstep((t-11.6)/3.7));
  haloMat.opacity=.020*(1-smoothstep((t-.8)/1.25));
  for(let e=0;e<linkPairs.length/2;e++){
    const j=e*6,a=linkPairs[e*2]*3,b=linkPairs[e*2+1]*3;
    linkPositions[j]=currentPositions[a];linkPositions[j+1]=currentPositions[a+1];linkPositions[j+2]=currentPositions[a+2];
    linkPositions[j+3]=currentPositions[b];linkPositions[j+4]=currentPositions[b+1];linkPositions[j+5]=currentPositions[b+2];
  }
  linksGeo.attributes.position.needsUpdate=true;linksMat.opacity=.060*(1-smoothstep((t-.75)/1.55));
  pathGroup.rotation.y=Math.sin(t*.16)*.035;
  laneMaterials.forEach(m=>m.opacity=.74*paths);
  tickMaterials.forEach((m,i)=>m.opacity=(i%5===0?.34:.58)*paths);
  // Candidates glide at different rates and sometimes change relative order along their paths.
  tokens.forEach((root,i)=>{
    const u=clamp(.16+i*.012+t*[.023,.010,.028,.004][i]+Math.sin(t*.32+i*1.7)*.05,.06,.90);
    root.position.copy(curves[i].getPointAt(u));
    root.position.y+=Math.sin(t*.58+i*2.1)*.12;
    root.rotation.y=Math.sin(t*.28+i)*.16;root.rotation.z=Math.sin(t*.23+i*1.8)*.055;
    const fade=smoothstep((t-1.4)/1.8)*(1-.22*smoothstep((t-12.8)/2.5));root.scale.setScalar((1.45+.12*Math.sin(t*.8+i))*fade);
  });
  const whenA=(1-smoothstep((t-2.0)/1.55))*(1-smoothstep((t-1.6)/.45)*.15);
  setTextAlpha(whenTitle,whenA);
  setTextAlpha(horizonTitle,smoothstep((t-3.15)/.95)*(1-smoothstep((t-12.7)/1.25)));
  if(t>=DURATION-1/FPS){
    const worldPositions=new Float32Array(COUNT*3),v=new THREE.Vector3();
    cloud.updateMatrixWorld(true);
    for(let i=0;i<COUNT;i++){const j=i*3;v.set(currentPositions[j],currentPositions[j+1],currentPositions[j+2]).applyMatrix4(cloud.matrixWorld);worldPositions.set([v.x,v.y,v.z],j);}
    window.__V5_HORIZON_EXIT_FIELD={count:COUNT,positions:worldPositions,colors:new Float32Array(currentColors),cameraPosition:camera.position.clone(),cameraTarget:aim.clone(),starRotationY:stars.rotation.y};
  }
  renderer.render(scene,camera);window.__sceneTime=164.35+t;
}
function resize(){const w=Math.max(1,host.clientWidth||window.innerWidth),h=Math.max(1,host.clientHeight||Math.round(w*9/16));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(standalone)renderFrame(Math.round(((window.__playerTime||164.35)-164.35)*FPS));}
if(standalone){window.renderFrame=renderFrame;window.__sceneReady=true;window.addEventListener('resize',resize);resize();renderFrame(0);window.dispatchEvent(new Event('v5scene-ready'));}
export {renderFrame,resize};
