import * as THREE from '../assets/vendor/three.module.js';
import { C, clamp, smooth, win, basicMat, makeText, setTextAlpha, setAlpha } from './v5_autodrive_world.js';

// V5 Task 5: The cost of intelligence, 01:50–02:20.
// Four concrete inputs feed a growing 3D compute network. More capacity
// unlocks functions, but the unfamiliar-task bridge remains incomplete.
const FPS = 24, DURATION = 30.0;
const host = document.getElementById('canvas-container');
if (!host) throw new Error('V5 canvas container is missing.');
const standalone = !window.__V5_SHARED_RENDERER;
const renderer = window.__V5_SHARED_RENDERER || new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(C.black, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
if (standalone) host.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.black); scene.fog = new THREE.FogExp2(C.black, 0.0035);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 300); scene.add(camera);
const aim = new THREE.Vector3(0, 0, 0);
let seed = 20261051; function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function starsLayer() {
  let geo = window.__V5_SHARED_STAR_GEOMETRY;
  if (!geo) { const n = 760, p = new Float32Array(n * 3), c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p.set([(random() - .5) * 84, (random() - .5) * 52, -24 - random() * 96], i * 3); const q = new THREE.Color(i % 19 ? 0x3f91b0 : 0x78baff); c.set([q.r * .42, q.g * .42, q.b * .42], i * 3); } geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uSize: { value: 4.8 }, uOpacity: { value: .50 } }, vertexShader: 'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader: 'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
  return new THREE.Points(geo, mat);
}
const stars = starsLayer(); scene.add(stars);

function beam(parent, a, b, radius, color, opacity = .7, additive = true) {
  const d = b.clone().sub(a); const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(.001, d.length()), 7), basicMat(color, opacity, additive));
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); parent.add(m); return m;
}
function box(parent, x, y, z, dims, color, opacity = 1, additive = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...dims), basicMat(color, opacity, additive)); m.position.set(x,y,z); parent.add(m); return m;
}
function sphere(parent, x, y, z, radius, color, opacity = .95) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), basicMat(color, opacity, true)); m.position.set(x,y,z); parent.add(m); return m;
}
function hudText(value, opts = {}) { return makeText(THREE, camera, value, { width: 13, size: 58, x: 0, y: 3.85, z: -14, ...opts }); }

// Capture Task 4's final city-grid particles and let them flow into the new core.
const IN = 460, inPos = new Float32Array(IN * 3), inColor = new Float32Array(IN * 3), inSource = new Float32Array(IN * 3), inTarget = new Float32Array(IN * 3);
const inGeo = new THREE.BufferGeometry(); inGeo.setAttribute('position', new THREE.BufferAttribute(inPos,3).setUsage(THREE.DynamicDrawUsage)); inGeo.setAttribute('color', new THREE.BufferAttribute(inColor,3)); inGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(),160);
const inMat = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false, uniforms:{uSize:{value:5.1},uOpacity:{value:0}}, vertexShader:'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}', fragmentShader:'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const incoming = new THREE.Points(inGeo,inMat); scene.add(incoming); let incomingReady=false;
let inheritedCamera=new THREE.Vector3(0,22.5,25.5), inheritedAim=new THREE.Vector3(0,0,0), inheritedStar=0;
function prepareIncoming() {
  if (incomingReady) return;
  const field=window.__V5_LEARNING_EXIT_FIELD;
  for(let i=0;i<IN;i++) { const j=i*3; if(field?.positions && field.count) { const k=Math.floor((i+.5)*field.count/IN)*3; inSource.set(field.positions.subarray(k,k+3),j); inPos.set(field.positions.subarray(k,k+3),j); if(field.colors) inColor.set(field.colors.subarray(k,k+3),j); } else { inSource.set([(random()-.5)*12,(random()-.5)*8,(random()-.5)*5],j); inPos.set(inSource.subarray(j,j+3),j); const c=new THREE.Color(i%4?C.cyan:C.green); inColor.set([c.r,c.g,c.b],j); } }
  if(field?.cameraPosition) inheritedCamera.copy(field.cameraPosition); if(field?.cameraTarget) inheritedAim.copy(field.cameraTarget); inheritedStar=Number.isFinite(field?.starRotationY)?field.starRotationY:0;
  // Particles settle around actual processor nodes, so the handoff explains the new object.
  for(let i=0;i<IN;i++){const j=i*3,k=i%45,x=Math.floor(k/9),y=Math.floor((k%9)/3),z=k%3;inTarget.set([-2+x+((i%3)-1)*.055,-1.25+y*1.25+((i%5)-2)*.045,-1.6+z*1.6+((i%7)-3)*.035],j);}
  inGeo.attributes.position.needsUpdate=true; inGeo.attributes.color.needsUpdate=true; incomingReady=true;
}

// 3D compute core: a volumetric lattice of processors and visibly connected paths.
const core = new THREE.Group(); scene.add(core); core.position.set(.10,.05,0);
const nx=5, ny=3, nz=3, nodes=[], edges=[];
const at=(x,y,z)=> (x*ny+y)*nz+z;
for(let x=0;x<nx;x++) for(let y=0;y<ny;y++) for(let z=0;z<nz;z++) {
  const pos=new THREE.Vector3(-2.0+x*1.0,-1.25+y*1.25,-1.6+z*1.6);
  const base=sphere(core,pos.x,pos.y,pos.z,.145,(x+y+z)%4===0?C.ice:C.cyan,.72);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.22,.018,6,18),basicMat(C.blue,.54,true)); halo.position.copy(pos); halo.rotation.x=Math.PI/2;
  nodes.push({pos,base,halo,x,y,z});
  for(const [dx,dy,dz] of [[1,0,0],[0,1,0],[0,0,1]]) if(x+dx<nx&&y+dy<ny&&z+dz<nz) {
    const dest=new THREE.Vector3(-2+(x+dx)*1.0,-1.25+(y+dy)*1.25,-1.6+(z+dz)*1.6);
    const link=beam(core,pos,dest,.022,C.blue,.22,true); edges.push({a:pos,b:dest,mesh:link,phase:random()});
  }
}
const coreFrame=new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.0,3.55,4.05)),new THREE.LineBasicMaterial({color:C.cyan,transparent:true,opacity:.28,depthWrite:false,toneMapped:false})); coreFrame.position.set(0,.1,0); core.add(coreFrame);
const pulses=[];
for(let i=0;i<18;i++){const p=sphere(core,0,0,0,.075,i%4===0?C.green:C.ice,.9); pulses.push({mesh:p,edge:Math.floor(random()*edges.length),phase:random()});}
const OUT=240,outPos=new Float32Array(OUT*3),outSource=new Float32Array(OUT*3),outColor=new Float32Array(OUT*3);
const outGeo=new THREE.BufferGeometry();outGeo.setAttribute('position',new THREE.BufferAttribute(outPos,3).setUsage(THREE.DynamicDrawUsage));outGeo.setAttribute('color',new THREE.BufferAttribute(outColor,3));outGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),160);
const outMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uSize:{value:5.0},uOpacity:{value:0}},vertexShader:'attribute vec3 color; varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 v=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*v;gl_PointSize=uSize*42.0/max(1.0,-v.z);}',fragmentShader:'varying vec3 vColor; uniform float uOpacity; void main(){float d=length(gl_PointCoord-vec2(.5));float a=1.0-smoothstep(.08,.5,d);gl_FragColor=vec4(vColor,a*uOpacity);}' });
const outCloud=new THREE.Points(outGeo,outMat);scene.add(outCloud);
for(let i=0;i<OUT;i++){const n=nodes[i%nodes.length],j=i*3;outSource.set([n.pos.x+.10,n.pos.y+.05,n.pos.z],j);const c=new THREE.Color(i%5===0?C.green:C.cyan);outColor.set([c.r,c.g,c.b],j);outPos.set(outSource.subarray(j,j+3),j);}

// Physical resource icons arranged as one feed column; labels stay near their matching object.
const resources=[];
function resourceBase(name,color,y){const g=new THREE.Group();g.position.set(-6.8,y,0);scene.add(g); resources.push({name,color,y,g,activeAt:99,stream:null,particles:[]});return g;}
// COMPUTE: a silicon die with pins and a matrix of glowing cores.
{
 const g=resourceBase('COMPUTE',C.cyan,2.28); box(g,0,0,0,[1.55,.78,1.15],0x102b3c,.98); box(g,0,.41,0,[1.08,.12,.80],0x236b87,.92,true);
 for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)box(g,x*.20,.50,z*.20,[.09,.035,.09],C.ice,.86,true);
 for(let i=0;i<4;i++){box(g,-.73+i*.48,-.47,0,[.10,.20,1.38],0x4fc4e4,.83,true);box(g,0,-.47,-.53+i*.35,[1.72,.20,.08],0x4fc4e4,.83,true);}
}
// ENERGY: a large battery reservoir visibly drains into the core.
{
 const g=resourceBase('ENERGY',C.yellow,.76); box(g,0,0,0,[1.20,.72,.86],0x282516,.98); box(g,.65,.02,0,[.18,.34,.32],0xffcf72,.98,true);
 const fill=box(g,-.06,.03,.445,[.82,.40,.045],C.yellow,.94,true); g.userData.fill=fill;
 for(let i=0;i<3;i++)box(g,-.34+i*.28,.04,.49,[.12,.25,.04],0xffefa9,.88,true);
}
// DATA: distinct sample wafers move toward the training lattice.
{
 const g=resourceBase('DATA',C.green,-.76); for(let i=0;i<4;i++){const plate=box(g,-.20+i*.11,i*.10-.13,(i%2)*.13,[1.08,.10,.78],0x1b5147,.98); for(let k=0;k<4;k++)sphere(g,-.54+k*.24,i*.10-.07,.43+(i%2)*.03,.052,i%2?C.ice:C.green,.98,true);}
}
// TIME: an unmistakable clock ring with moving hands.
let clockHands=[];
{
 const g=resourceBase('TIME',C.blue,-2.28); const ring=new THREE.Mesh(new THREE.TorusGeometry(.51,.075,10,48),basicMat(C.cyan,.92,true)); ring.position.z=.12; g.add(ring);
 const face=sphere(g,0,0,.05,.39,0x102636,.96); face.scale.z=.24;
 clockHands.push(beam(g,new THREE.Vector3(0,0,.20),new THREE.Vector3(.23,.12,.20),.035,C.ice,.95,true));
 clockHands.push(beam(g,new THREE.Vector3(0,0,.23),new THREE.Vector3(-.02,.31,.23),.023,C.yellow,.95,true));
 for(let i=0;i<12;i++){const a=i*Math.PI/6;sphere(g,Math.cos(a)*.42,Math.sin(a)*.42,.20,.035,C.ice,.90);}
}
// Resources enter through four separate thick conduits; pulses animate from icon to core.
for(const r of resources){
 const start=new THREE.Vector3(-5.9,r.y,0), end=new THREE.Vector3(-2.05,Math.max(-1.4,Math.min(1.5,r.y*.58)),0);
 r.path=new THREE.LineCurve3(start,end); r.conduit=beam(scene,start,end,.038,r.color,.35,true);
 for(let i=0;i<3;i++){const q=sphere(scene,0,0,0,.085,r.color,.94);r.particles.push({mesh:q,phase:i/3});}
 r.label=makeText(THREE,camera,r.name,{width:3.8,size:78,color:'#e6fbff',glow:r.name==='ENERGY'?'#ffcf72':r.name==='DATA'?'#74e7ad':'#55e5ff',x:-6.0,y:r.y-.68,z:-13.9,align:'center'});
}

// Capability branches illuminate as compute scales; the unfamiliar AGI test still has a gap.
const outputs=new THREE.Group(); scene.add(outputs); outputs.position.set(5.2,.2,0);
const outputNodes=[];
for(let i=0;i<3;i++){
 const y=1.45-i*1.35, color=i===0?C.cyan:i===1?C.green:C.yellow;
 const n=sphere(outputs,0,y,0,.30,color,.44); const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.035,7,32),basicMat(color,.42,true));ring.position.set(0,y,0);ring.rotation.x=Math.PI/2;
 const stem=beam(outputs,new THREE.Vector3(-1.0,y,.05),new THREE.Vector3(-.31,y,.05),.026,color,.36,true);
 const dot=sphere(outputs,-1.12,y,.05,.08,C.ice,.8); outputNodes.push({n,ring,stem,dot});
}
const test=new THREE.Group(); scene.add(test); test.position.set(7.15,-.10,0);
const testCube=new THREE.Mesh(new THREE.IcosahedronGeometry(.75,1),basicMat(0x203043,.95,false)); test.add(testCube);
const testWire=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.84,1)),new THREE.LineBasicMaterial({color:C.red,transparent:true,opacity:.92,depthWrite:false,toneMapped:false})); test.add(testWire);
const testRing=new THREE.Mesh(new THREE.TorusGeometry(1.05,.045,8,48),basicMat(C.red,.65,true));testRing.rotation.x=Math.PI/2;test.add(testRing);
const bridgeA=beam(scene,new THREE.Vector3(4.1,.2,0),new THREE.Vector3(5.7,.2,0),.040,C.green,.82,true);
const bridgeB=beam(scene,new THREE.Vector3(6.15,.2,0),new THREE.Vector3(6.72,.2,0),.038,C.red,.80,true);
const gapSpark=sphere(scene,6.38,.2,0,.105,C.red,.96);

// Stable camera-space titles; each appears only when the corresponding words are spoken.
const title=hudText('THE COST OF COMPUTATION',{width:13.5,size:62,color:'#e7faff',glow:'#55e5ff'});
const scaleTitle=hudText('MORE COMPUTE  →  NEW CAPABILITIES',{width:13.8,size:49,y:3.82});
const noGuarantee=hudText('MORE COMPUTE ≠ GUARANTEED AGI',{width:14.0,size:50,color:'#ffdce2',glow:'#ff3854',y:3.82});
const question=hudText('HOW MUCH RELIABLE INTELLIGENCE — AT WHAT COST?',{width:15.3,size:42,color:'#ffe5b1',glow:'#ffcf72',y:3.82});
const computeCaption=hudText('TRAINING + RUNNING',{width:5.2,size:40,x:-5.25,y:3.0,align:'left'});
const capabilityTag=makeText(THREE,camera,'CAPABILITIES UNLOCKED',{width:5.0,size:43,color:'#d6ffea',glow:'#74e7ad',x:5.15,y:2.67,z:-13.9});
const agiTag=makeText(THREE,camera,'UNFAMILIAR TASK  ·  STILL UNRESOLVED',{width:7.0,size:35,color:'#ffdce2',glow:'#ff3854',x:5.85,y:-2.05,z:-13.9});
const capabilityLabels=['CODE','SOLVE','PLAN'].map((v,i)=>makeText(THREE,camera,v,{width:3.2,size:64,color:'#dff8ff',glow:'#55e5ff',x:5.18,y:1.45-i*1.35,z:-13.82}));

// Final comparison: useful intelligence grows, yet its resource bill rises sharply.
const compare=new THREE.Group(); camera.add(compare); compare.position.set(0,-2.30,-13.85);
function makeGauge(x,label,color){
 const panel=box(compare,x,0,0,[5.2,1.18,.06],0x091725,.94,false); panel.material.depthTest=false;panel.renderOrder=20;
 const base=box(compare,x,-.22,.08,[4.15,.17,.05],0x223344,.98,false);base.material.depthTest=false;base.renderOrder=21;
 const fill=box(compare,x-2.073,-.22,.12,[4.15,.13,.05],color,.98,true);fill.scale.x=.001;fill.material.depthTest=false;fill.renderOrder=22;
 const text=makeText(THREE,compare,label,{width:4.8,size:52,color:'#e6fbff',glow:color===C.red?'#ff3854':color===C.yellow?'#ffcf72':'#55e5ff',x,y:.19,z:.15});text.renderOrder=25;
 return {panel,base,fill,text,x};
}
const reliableGauge=makeGauge(-3.0,'RELIABLE OUTPUT',C.cyan), costGauge=makeGauge(3.0,'RESOURCE COST',C.yellow);

function setGauge(g,value){const v=clamp(value);g.fill.scale.x=Math.max(.001,v);g.fill.position.x=g.x-2.075+(4.15*v)/2;}
function setVisible(o,a){o.material.opacity=clamp(a);}
function renderFrame(frame){
 const t=clamp(Number(frame)/FPS,0,DURATION);prepareIncoming();
 const form=smooth(t/1.25);
 for(let i=0;i<IN;i++){const j=i*3;inPos[j]=THREE.MathUtils.lerp(inSource[j],inTarget[j],form);inPos[j+1]=THREE.MathUtils.lerp(inSource[j+1],inTarget[j+1],form);inPos[j+2]=THREE.MathUtils.lerp(inSource[j+2],inTarget[j+2],form);}
 inGeo.attributes.position.needsUpdate=true;
 inMat.uniforms.uOpacity.value=.78*(1-smooth(t/1.6));
 const titleA=win(t,5.35,9.50,.22,.22);setTextAlpha(title,titleA);
 setTextAlpha(computeCaption,win(t,9.65,17.08,.18,.2));
 setTextAlpha(scaleTitle,win(t,17.1,21.05,.18,.22));
 setTextAlpha(noGuarantee,win(t,20.75,24.05,.18,.22));
 setTextAlpha(question,win(t,24.2,29.95,.22,.20));
 const startResources=[12.78,13.58,14.78,15.76];
 const dissolve=smooth((t-23.35)/.72);
 resources.forEach((r,i)=>{
   const alpha=win(t,startResources[i],23.95,.32,.50); r.g.visible=alpha>.01; setAlpha(r.g,alpha); setTextAlpha(r.label,alpha);
   r.activeAt=startResources[i]; const flow=win(t,r.activeAt,29.4,.26,.5);
   setVisible(r.conduit,.35*flow*(1-dissolve));
   r.particles.forEach(q=>{const u=(t*.34+q.phase)%1;const p=r.path.getPointAt(u);q.mesh.position.copy(p);q.mesh.visible=flow>.02; q.mesh.material.opacity=.9*flow*(1-dissolve);});
 });
 // Battery drains as power is consumed; the clock hands continue moving.
 const e=resources[1], energyUse=clamp((t-13.58)/15.5); if(e.g.userData.fill){e.g.userData.fill.scale.x=Math.max(.08,1-energyUse*.68);e.g.userData.fill.position.x=-.06-.41*energyUse*.68;}
 clockHands[0].rotation.z=-t*.33;clockHands[1].rotation.z=t*.75;
 // Compute grows in volume and throughput, with denser, faster pulses during scaling.
 const scaleIn=smooth(t/1.1), expansion=smooth((t-17.15)/3.4), shrink=smooth((t-28.95)/.9);
 const endBeamAlpha=smooth((t-28.85)/.95);
 const finalScale=THREE.MathUtils.lerp(.62,1.42,expansion)*(1-.94*endBeamAlpha)*scaleIn;
 core.scale.setScalar(finalScale);core.rotation.y=Math.sin(t*.16)*.08;core.rotation.x=Math.sin(t*.13)*.035;
 const baseShow=smooth(t/.65)*(1-.98*endBeamAlpha), density=THREE.MathUtils.lerp(.42,1,expansion);coreFrame.material.opacity=.24*baseShow;
 edges.forEach((e,i)=>{e.mesh.material.opacity=(.18+.18*density)*baseShow*(.65+.35*Math.sin(t*2.2+e.phase*6));});
 nodes.forEach((n,i)=>{const pulse=.62+.38*Math.sin(t*(2.2+expansion*4)+i*.83);n.base.material.opacity=(.38+.42*pulse)*baseShow;n.halo.material.opacity=(.24+.3*pulse)*baseShow;});
 pulses.forEach(p=>{const e=edges[p.edge],u=(t*(.22+expansion*.62)+p.phase)%1;p.mesh.position.copy(e.a).lerp(e.b,u);p.mesh.material.opacity=.48+.5*baseShow;});
 // Outputs appear on the spoken promise of new capabilities; the separate unknown test stays red.
 const capability=win(t,18.55,24.10,.26,.34);outputNodes.forEach((n,i)=>{const a=capability*(.62+.38*Math.sin(t*4+i));n.n.material.opacity=.015+.90*a;n.ring.material.opacity=.015+.82*a;n.stem.material.opacity=.015+.80*a;n.dot.material.opacity=.015+.80*a;setTextAlpha(capabilityLabels[i],a);});
 setTextAlpha(capabilityTag,win(t,18.65,20.9,.2,.3));
 const fail=win(t,21.0,24.2,.24,.28);test.visible=fail>.01;setAlpha(test,fail);bridgeA.material.opacity=.82*capability;bridgeB.material.opacity=.78*fail;gapSpark.material.opacity=.9*fail;
 setTextAlpha(agiTag,win(t,21.25,24.08,.22,.24));
 // Resource meters build only for the final question: high spending, incomplete reliability.
 const compareA=win(t,24.1,29.8,.26,.22);compare.visible=compareA>.005;
 compare.children.forEach(o=>{if(o.material)o.material.opacity=(o.material.userData.baseOpacity??1)*compareA;});
 setTextAlpha(reliableGauge.text,compareA);setTextAlpha(costGauge.text,compareA);
 setGauge(reliableGauge,THREE.MathUtils.lerp(.08,.56,smooth((t-24.4)/1.4)));
 setGauge(costGauge,THREE.MathUtils.lerp(.04,.94,smooth((t-24.4)/1.7)));
 compare.scale.setScalar(.88+.12*smooth((t-24.1)/.5));
 // The network contracts into a clean stream at the section boundary.
 core.position.x=.10;core.scale.setScalar(finalScale*(1-.72*endBeamAlpha));
 camera.position.copy(inheritedCamera).lerp(new THREE.Vector3(0,6.8,21),smooth(t/.9));
 camera.position.x=Math.sin(t*.10)*.32 + THREE.MathUtils.lerp(0,-.35,expansion);
 camera.position.z=21-1.0*expansion+1.1*endBeamAlpha;
 aim.set(THREE.MathUtils.lerp(0,.35,expansion),0,0);camera.lookAt(aim);camera.updateMatrixWorld(true);
 stars.rotation.y=inheritedStar+t*.0011;stars.rotation.x=Math.sin(t*.045)*.006;
 for(let i=0;i<OUT;i++){const j=i*3,u=i/(OUT-1);outPos[j]=THREE.MathUtils.lerp(outSource[j],-3.7+u*7.4,endBeamAlpha);outPos[j+1]=THREE.MathUtils.lerp(outSource[j+1],Math.sin(u*Math.PI*2+t)*.055,endBeamAlpha);outPos[j+2]=THREE.MathUtils.lerp(outSource[j+2],0,endBeamAlpha);}
 outGeo.attributes.position.needsUpdate=true;outMat.uniforms.uOpacity.value=.68*endBeamAlpha;
 renderer.render(scene,camera);window.__sceneTime=110+t;
 if(t>=DURATION-1/FPS)window.__V5_COMPUTE_EXIT_FIELD={count:OUT,positions:new Float32Array(outPos),colors:new Float32Array(outColor),cameraPosition:camera.position.clone(),cameraTarget:aim.clone(),starRotationY:stars.rotation.y};
}
function resize(){const w=Math.max(1,host.clientWidth||window.innerWidth),h=Math.max(1,host.clientHeight||Math.round(w*9/16));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(standalone)renderFrame(Math.round((window.__playerTime||110)*FPS)-110*FPS);}
if(standalone){window.renderFrame=renderFrame;window.__sceneReady=true;window.addEventListener('resize',resize);resize();renderFrame(0);window.dispatchEvent(new Event('v5scene-ready'));}
export {renderFrame,resize};
