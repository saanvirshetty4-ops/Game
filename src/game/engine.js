// The physics/rendering engine for one game run: Matter.js world + Three.js jar.
// All gameplay constants and timings are copied verbatim from the original game.
import * as THREE from 'three';
import { Engine, World, Bodies, Body, Events } from 'matter-js';
import { TIERS, LEVEL_CAP } from './constants.js';
import { state, runtime, emit, save, toast, levelForScore } from './store.js';
import { colorFor, makeJellyMesh, makeBackdropTexture, getReticleMat, darken } from './threeUtils.js';
import {
  canPlay, tn, buzz, chime, hitSound, splashSound, squish, dropSound, popSound,
  thud, waterSound, gameOverSound, coinSound, settleSound, startMusic
} from './audio.js';

let scene, camera, renderer, W, H, dangerY, wallThickness=10;
let engine, world, walls=[];
let dropReady=true, nextTier=0, aimX=0, isBomb=false;
let bodies=[]; let meshes3d=new Map();
let mergeQueue=[]; let particles3d=[];
let aboveDanger=new Map();
let comboCount=0, comboTimer=0, comboFired=false;
let lastDroppedBody=null;
let previewMesh, dangerMesh, jarGroup, dropperMesh, opening;
let shake=0, camBase=null, dashMeshes=[];
let targeting=false, raycaster=new THREE.Raycaster();
let shakeAnimT=0, shakeActive=false;
const SHAKE_DUR=260, SHAKE_TILT=0.4; let shakeOrigGravity=1.0;
let popSeq=null, liquid=null, liquidLevel=0, liquidTarget=0;
let t=0;
let rafId=null;
let gcWrapEl=null;
let skipDropOnce=false;   // set when a tap picked a bomb target, so the same gesture cannot drop a ball
let backdropTex=null;

function toWorld(x,y){ return [x-W/2, H/2-y]; }

/* ---------- resource disposal ---------- */

// Sprites share three.js' module-level geometry and the cached gloss/reticle
// materials, so only their own geometry and material are ever released here.
function disposeMesh(obj){
  if(!obj) return;
  if(!obj.isSprite && obj.geometry) obj.geometry.dispose();
  const m=obj.material;
  if(Array.isArray(m)) m.forEach(x=>x&&x.dispose());
  else if(m) m.dispose();
}

function disposeLiquid(){
  if(!liquid) return;
  if(liquid.body && liquid.body.material && liquid.body.material.map) liquid.body.material.map.dispose();
  liquid=null;
}

// Frees every GPU resource owned by the run's scene (jar, dashes, balls, particles).
function disposeSceneResources(){
  if(scene){ scene.traverse(o=>{ if(o.isMesh) disposeMesh(o); }); }
  if(backdropTex){ backdropTex.dispose(); backdropTex=null; }
}

/* ---------- scene setup ---------- */

function initThree(scr, gcWrap){
  const cssW = scr.clientWidth, cssH = scr.clientHeight;
  W=Math.min(cssW*0.96,480); H=cssH*0.54; dangerY=0;
  gcWrap.innerHTML=''; gcWrap.style.width=cssW+'px'; gcWrap.style.height=cssH+'px'; gcWrap.style.touchAction='none';

  scene = new THREE.Scene();
  const fovDeg=38;
  const dist = ((cssH/2)/Math.tan(THREE.MathUtils.degToRad(fovDeg/2)))*1.15;
  camera = new THREE.PerspectiveCamera(fovDeg, cssW/cssH, 1, dist*4);
  camera.position.set(0, cssH*0.07, dist);
  camera.lookAt(0, cssH*0.03, 0);
  camBase=camera.position.clone();
  if(renderer){ try{ renderer.dispose(); if(renderer.forceContextLoss) renderer.forceContextLoss(); }catch(e){} }
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.domElement.style.touchAction='none'; renderer.domElement.style.userSelect='none';
  renderer.setSize(cssW,cssH);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputEncoding = THREE.sRGBEncoding;
  gcWrap.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffe9f7, 0x1a1226, 0.45));
  scene.add(new THREE.AmbientLight(0xffffff,0.15));
  const dl = new THREE.DirectionalLight(0xffffff,1.15);
  dl.position.set(55,170,190); dl.castShadow=true;
  dl.shadow.mapSize.set(512,512);
  dl.shadow.camera.left=-W; dl.shadow.camera.right=W; dl.shadow.camera.top=H; dl.shadow.camera.bottom=-H;
  dl.shadow.camera.near=50; dl.shadow.camera.far=500; dl.shadow.bias=-0.0015;
  scene.add(dl);
  const rim = new THREE.PointLight(0xffcbe8,0.4,500); rim.position.set(0,H*0.3,220); scene.add(rim);

  jarGroup = new THREE.Group(); scene.add(jarGroup);
  backdropTex = makeBackdropTexture();
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(W*3.4,H*3.6), new THREE.MeshBasicMaterial({map:backdropTex}));
  backdrop.position.z=-280; scene.add(backdrop);

  const isBarrel = state.theme==='barrel';
  const boxDepth = 130;
  const glass = !isBarrel;
  const wallColor = isBarrel?0x6B3E1F:0xDDEBFF;
  const floorColor = isBarrel?0x4a2c12:0xBFD4EE;
  const boxMat = new THREE.MeshPhysicalMaterial({color:wallColor, roughness:glass?0.1:0.75, metalness:0, clearcoat:glass?1:0.15, transparent:glass, opacity:glass?0.10:1, depthWrite:!glass, side:THREE.DoubleSide});
  const floorMat = new THREE.MeshPhysicalMaterial({color:floorColor, roughness:glass?0.2:0.8, metalness:0, transparent:glass, opacity:glass?0.28:1, depthWrite:!glass});
  const frameMat = new THREE.MeshPhysicalMaterial({color: isBarrel?0x8a5a32:0xA9B7CC, roughness:0.35, metalness:0.1, clearcoat:0.6});

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness,H,boxDepth), boxMat);
  leftWall.position.set(-W/2,0,0); jarGroup.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness,H,boxDepth), boxMat);
  rightWall.position.set(W/2,0,0); jarGroup.add(rightWall);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W,H), boxMat);
  backWall.position.set(0,0,-boxDepth/2); jarGroup.add(backWall);
  const floorMesh2 = new THREE.Mesh(new THREE.BoxGeometry(W,wallThickness,boxDepth), floorMat);
  floorMesh2.position.set(0,-H/2,0); floorMesh2.receiveShadow=true; jarGroup.add(floorMesh2);

  // frame edges: front rectangle, back rectangle, and 4 depth bars -> reads as a clear see-through box in perspective
  const fb=5, hz=boxDepth/2, hx=W/2, hy=H/2;
  const addBar=(sx,sy,sz,x,y,z)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), frameMat); m.position.set(x,y,z); jarGroup.add(m); };
  [hz,-hz].forEach(z=>{
    addBar(W+fb,fb,fb,0,hy,z); addBar(W+fb,fb,fb,0,-hy,z);
    addBar(fb,H+fb,fb,-hx,0,z); addBar(fb,H+fb,fb,hx,0,z);
  });
  [[-hx,hy],[hx,hy],[-hx,-hy],[hx,-hy]].forEach(([x,y])=>addBar(fb,fb,boxDepth,x,y,0));
  opening = new THREE.Object3D();
  jarGroup.add(opening);

  const dashMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.55});
  dashMeshes=[];
  for(let dy=H/2-6; dy>-H/2; dy-=16){
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.4,7,2), dashMat);
    dash.position.set(0,dy,4); scene.add(dash); dashMeshes.push(dash);
  }

  const dangerGeo = new THREE.PlaneGeometry(W-16,2.5);
  const dangerMat = new THREE.MeshBasicMaterial({color:0xffc861, transparent:true, opacity:0});
  dangerMesh = new THREE.Mesh(dangerGeo,dangerMat);
  dangerMesh.position.set(0, H/2-dangerY, 5); scene.add(dangerMesh);

  previewMesh = makePreviewMesh(); previewMesh.visible=false; scene.add(previewMesh);

  dropperMesh = new THREE.Group();
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(9,15,22,16,1,true), new THREE.MeshPhysicalMaterial({color:0xfff3f9, roughness:0.3, metalness:0.05, clearcoat:1, side:THREE.DoubleSide}));
  spout.rotation.x = Math.PI; dropperMesh.add(spout);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(10,3,10,20), new THREE.MeshPhysicalMaterial({color:0xffb3d9, roughness:0.2, clearcoat:1}));
  cap.rotation.x = Math.PI/2; cap.position.y=11; dropperMesh.add(cap);
  scene.add(dropperMesh);
}

// The preview ball is re-created whenever the queued tier (or bomb flag) changes.
function makePreviewMesh(){
  const mesh = makeJellyMesh(nextTier, isBomb);
  mesh.userData.tier=nextTier; mesh.userData.bomb=isBomb;
  return mesh;
}

/* ---------- physics world ---------- */

function buildWorld(){
  engine = Engine.create(); world = engine.world; engine.gravity.y=1.0;
  engine.positionIterations=16; engine.velocityIterations=12;
  const physWall=48;
  walls = [
    Bodies.rectangle(-physWall/2, H/2, physWall, H*2, {isStatic:true, label:'wall'}),
    Bodies.rectangle(W+physWall/2, H/2, physWall, H*2, {isStatic:true, label:'wall'}),
    Bodies.rectangle(W/2, H+physWall/2, W*2, physWall, {isStatic:true, label:'floor'})
  ];
  World.add(world, walls);
  bodies=[]; meshes3d.forEach(m=>{ scene.remove(m); disposeMesh(m); }); meshes3d.clear();
  particles3d.forEach(p=>{ scene.remove(p.mesh); disposeMesh(p.mesh); }); particles3d=[];
  mergeQueue=[]; aboveDanger.clear();
  popSeq=null; disposeLiquid(); liquidLevel=0; liquidTarget=0;
  runtime.score=0; comboCount=0; runtime.gameActive=true; dropReady=true; isBomb=false;
  // Per-run leftovers must never survive into a new run: a stale targeting flag
  // would eat the first tap, and a stale drop record would make undo look usable.
  targeting=false; lastDroppedBody=null; skipDropOnce=false;
  runtime.gameOver=null;
  nextTier=Math.floor(Math.random()*4); aimX=W/2;
  updateNextSwatch();
  emit();

  Events.on(engine,'collisionStart', e=>{
    e.pairs.forEach(p=>{
      const a=bodies.find(b=>b.body===p.bodyA), b=bodies.find(b=>b.body===p.bodyB);
      if(a && !b && (p.bodyB.label==='wall'||p.bodyB.label==='floor')){ a.squashAmp=-0.55; a.squashT=t; hitSound(); if(canPlay('splashfx',110)) splashFx(a.body.position.x,a.body.position.y,colorFor(a.tier).getHex()); return; }
      if(b && !a && (p.bodyA.label==='wall'||p.bodyA.label==='floor')){ b.squashAmp=-0.55; b.squashT=t; hitSound(); if(canPlay('splashfx',110)) splashFx(b.body.position.x,b.body.position.y,colorFor(b.tier).getHex()); return; }
      if(!a||!b) return;
      a.squashAmp=-0.35; a.squashT=t; b.squashAmp=-0.35; b.squashT=t;
      squish(); splashSound();
      if(a.isBomb || b.isBomb){ if(a.isBomb!==b.isBomb) mergeQueue.push({type:'bomb',a,b}); return; }
      if(a.tier===b.tier && a.tier<TIERS.length-1 && !a.merging && !b.merging){
        a.merging=true; b.merging=true; mergeQueue.push({type:'merge',a,b});
      }
    });
  });
}

function spawnBody(tier,x,y,bomb){
  const rad=TIERS[tier].r;
  const body = Bodies.circle(x,y,rad,{restitution:0.18, friction:0.4, frictionAir:0.001, density:0.0018});
  World.add(world, body);
  const rec = {body, tier, isBomb:!!bomb, squash:1, squashAmp:0, squashT:t-999, spawnT:t, zoff:(Math.random()-0.5)*24, wobblePhase:Math.random()*7};
  bodies.push(rec);
  const mesh = makeJellyMesh(tier, bomb);
  mesh.scale.set(0.1,0.1,0.1);
  scene.add(mesh); meshes3d.set(rec,mesh);
  return rec;
}

function removeBody(rec){
  const mesh = meshes3d.get(rec);
  if(mesh){ scene.remove(mesh); disposeMesh(mesh); }
  meshes3d.delete(rec);
  World.remove(world, rec.body);
  bodies = bodies.filter(x=>x!==rec);
}

/* ---------- particles ---------- */

function burst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=Math.random()*3+1.2, size=Math.random()*4+2;
    const geo=new THREE.SphereGeometry(size,6,6);
    const mat=new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9});
    const mesh=new THREE.Mesh(geo,mat);
    const [wx,wy]=toWorld(x,y); mesh.position.set(wx,wy,10);
    scene.add(mesh);
    particles3d.push({mesh, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp+1.5, life:1});
  }
}

function splashFx(x,y,color){
  const [wx,wy]=toWorld(x,y);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2,5,28), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.6, side:THREE.DoubleSide}));
  ring.position.set(wx,wy,6);
  scene.add(ring);
  particles3d.push({mesh:ring, isRing:true, vx:0, vy:0, life:1});
  for(let i=0;i<7;i++){
    const a=Math.random()*Math.PI*2, sp=Math.random()*2.2+0.8;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(Math.random()*2+1.1,6,6), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.85}));
    drop.position.set(wx,wy,6);
    scene.add(drop);
    particles3d.push({mesh:drop, vx:Math.cos(a)*sp, vy:Math.abs(Math.sin(a))*sp*0.5+0.8, life:1});
  }
}

/* ---------- merging ---------- */

function processMerges(){
  const seen=new Set();
  let scored=false;
  mergeQueue.forEach(m=>{
    if(seen.has(m.a)||seen.has(m.b)) return;
    seen.add(m.a); seen.add(m.b);
    const midx=(m.a.body.position.x+m.b.body.position.x)/2, midy=(m.a.body.position.y+m.b.body.position.y)/2;
    if(m.type==='merge'){
      removeBody(m.a); removeBody(m.b);
      const newTier=m.a.tier+1;
      const rec=spawnBody(newTier, midx, midy);
      rec.squashAmp=0.55; rec.squashT=t;
      burst(midx,midy, colorFor(newTier).getHex(), 16);
      splashFx(midx,midy, colorFor(newTier).getHex());
      comboCount = comboTimer>0 ? comboCount+1 : 1; comboTimer=42;
      const pts = TIERS[newTier].score * (1+Math.min(comboCount-1,4)*0.5);
      runtime.score += Math.round(pts); scored=true;
      chime(newTier,comboCount); buzz(18);
      floatText(midx,midy,'+'+Math.round(pts));
      if(comboCount>=2) floatText(midx,midy-34,'COMBO x'+comboCount,true);
      if(newTier>=5) shake=Math.max(shake,4+newTier);
      if(comboCount>=3 && !comboFired){ comboFired=true; }
      if(newTier===TIERS.length-1) toast('✨ Mega Jelly! Incredible.');
    } else {
      removeBody(m.a); removeBody(m.b);
      burst(midx,midy,0x333333,12); runtime.score+=5; scored=true; thud();
    }
  });
  mergeQueue=[];
  if(scored) emit();
}

/* ---------- bomb targeting ---------- */

function enterTargeting(){
  targeting=true; dropReady=false; if(previewMesh) previewMesh.visible=false; if(dropperMesh) dropperMesh.visible=false;
  toast('Tap a jelly to pop it! 🎯');
  meshes3d.forEach((mesh,rec)=>{
    const ring=new THREE.Sprite(getReticleMat());
    const r=TIERS[rec.tier].r;
    ring.scale.set(r*2.5,r*2.5,1); ring.position.set(0,0,r*0.9); ring.name='reticle';
    mesh.add(ring);
  });
}

function exitTargeting(){
  targeting=false; dropReady=true;
  meshes3d.forEach((mesh)=>{ const r=mesh.getObjectByName('reticle'); if(r) mesh.remove(r); });
}

function pointerToNDC(e){
  const rect=renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
}

function handleTargetTap(e){
  // Picking a target must not also drop the queued ball on the matching pointerup.
  skipDropOnce=true;
  const ndc=pointerToNDC(e);
  raycaster.setFromCamera(ndc,camera);
  const list=Array.from(meshes3d.values());
  const hits=raycaster.intersectObjects(list,false);
  if(hits.length){
    let targetRec=null;
    meshes3d.forEach((mesh,rec)=>{ if(mesh===hits[0].object) targetRec=rec; });
    if(targetRec){
      const p=targetRec.body.position, hex=colorFor(targetRec.tier).getHex();
      burst(p.x,p.y,hex,16); splashFx(p.x,p.y,hex); popSound(3);
      runtime.score+=TIERS[targetRec.tier].score*2; emit();
      floatText(p.x,p.y,'POP!',true);
      removeBody(targetRec);
    }
  } else { toast('Missed — tap directly on a jelly'); }
  exitTargeting();
}

const _dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
const _dragPt=new THREE.Vector3();

function pointerXY(e){
  const ndc=pointerToNDC(e);
  raycaster.setFromCamera(ndc,camera);
  if(raycaster.ray.intersectPlane(_dragPlane,_dragPt)) return _dragPt.x + W/2;
  return aimX;
}

function setupInput(){
  const dom = renderer.domElement;
  dom.addEventListener('pointermove', e=>{ if(!targeting) aimX=pointerXY(e); });
  dom.addEventListener('pointerdown', e=>{ skipDropOnce=false; if(targeting){ handleTargetTap(e); } else { aimX=pointerXY(e); } });
  dom.addEventListener('pointerup', e=>{ if(skipDropOnce||targeting) return; doDrop(); });
  dom.addEventListener('click', e=>{ if(skipDropOnce||targeting) return; doDrop(); });
}

function doDrop(){
  if(!runtime.gameActive || !dropReady || runtime.paused || targeting) return;
  dropReady=false; comboFired=false;
  const r=TIERS[nextTier].r;
  const x=Math.max(wallThickness+r, Math.min(W-wallThickness-r, aimX));
  const rec=spawnBody(nextTier, x, -34, isBomb);
  lastDroppedBody=rec; isBomb=false; dropSound(); buzz(12);
  setTimeout(()=>{ dropReady=true; }, 430);
  nextTier=Math.floor(Math.random()*4);
  updateNextSwatch();
  syncPowerBtns();   // a ball is now in play, so undo becomes available
}

function updateNextSwatch(){
  const col = colorFor(nextTier);
  runtime.nextHex = '#'+col.getHexString();
  emit();
}

function floatText(px,py,text,big){
  try{
    const [wx,wy]=toWorld(px,py); const v=new THREE.Vector3(wx,wy,0).project(camera);
    const el=gcWrapEl, x=(v.x*0.5+0.5)*el.clientWidth, y=(-v.y*0.5+0.5)*el.clientHeight;
    const d=document.createElement('div'); d.className='floatTxt'+(big?' big':''); d.textContent=text;
    d.style.left=x+'px'; d.style.top=y+'px';
    el.appendChild(d); setTimeout(()=>d.remove(),950);
  }catch(e){}
}

/* ---------- game over ---------- */

function buildLiquid(recs){
  const counts={};
  recs.forEach(r=>{ counts[r.tier]=(counts[r.tier]||0)+1; });
  const byCount=Object.keys(counts).map(Number).sort((a,b)=>counts[b]-counts[a]);
  const dominant = byCount.length? byCount[0] : 0;
  const domHex = darken('#'+colorFor(dominant).getHexString(), 0.32);
  const secondary = byCount.length>1 ? darken('#'+colorFor(byCount[1]).getHexString(),0.38) : domHex;
  const cv=document.createElement('canvas'); cv.width=8; cv.height=128; const x=cv.getContext('2d');
  const g=x.createLinearGradient(0,128,0,0); g.addColorStop(0,secondary); g.addColorStop(0.55,domHex); g.addColorStop(1,domHex);
  x.fillStyle=g; x.fillRect(0,0,8,128);
  const tex=new THREE.CanvasTexture(cv);
  const grp=new THREE.Group(); grp.position.set(0,-H/2+wallThickness/2,0);
  const iw=W-wallThickness-2, idp=130-10;
  const body=new THREE.Mesh(new THREE.BoxGeometry(iw,1,idp), new THREE.MeshPhysicalMaterial({map:tex, transparent:true, opacity:0.93, roughness:0.05, clearcoat:1, clearcoatRoughness:0.05, side:THREE.DoubleSide, emissive:0x000000}));
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(iw,idp,22,6), new THREE.MeshPhysicalMaterial({color:new THREE.Color(domHex), transparent:true, opacity:0.97, roughness:0.03, clearcoat:1, clearcoatRoughness:0.03, side:THREE.DoubleSide, emissive:new THREE.Color(domHex), emissiveIntensity:0.08}));
  surface.rotation.x=-Math.PI/2;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1,1.4,6,34), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.4}));
  rim.scale.set(iw/2,1,idp/2); rim.rotation.x=Math.PI/2;
  grp.add(body); grp.add(surface); grp.add(rim); grp.visible=false; scene.add(grp);
  liquid={group:grp, body, surface, foam:rim};
  if(opening) opening.visible=false;
}

function updateLiquid(){
  if(!liquid) return;
  const targetH=liquidTarget*H*0.66;
  liquidLevel+=(targetH-liquidLevel)*0.07;
  const lv=Math.max(0.01,liquidLevel);
  liquid.body.scale.y=lv; liquid.body.position.y=lv/2; liquid.surface.position.y=lv;
  liquid.foam.position.y=lv; liquid.foam.material.opacity=0.35+0.25*Math.sin(t*0.2);
  const pos=liquid.surface.geometry.attributes.position, amp=2+Math.min(6,Math.abs(targetH-liquidLevel)*0.15);
  for(let i=0;i<pos.count;i++){ const px=pos.getX(i), py=pos.getY(i); pos.setZ(i, Math.sin(px*0.055+t*0.14)*amp+Math.cos(py*0.07+t*0.11)*amp*0.6); }
  pos.needsUpdate=true; liquid.surface.geometry.computeVertexNormals();
  liquid.group.visible = lv>0.5;
}

// Ends an in-flight shake: restores gravity, friction, restitution and the jar tilt.
function finishShake(){
  shakeActive=false;
  if(jarGroup) jarGroup.rotation.z=0;
  if(engine) engine.gravity.y=shakeOrigGravity;
  bodies.forEach(b=>{
    if(b._origFriction!=null){
      Body.set(b.body,'friction',b._origFriction); Body.set(b.body,'restitution',b._origRestitution); Body.set(b.body,'frictionAir',b._origFrictionAir);
      b._origFriction=null;
    }
  });
}

function endGame(){
  if(popSeq) return;
  // A shake that is still running must not leave the jar tilted (and gravity
  // reduced) through the pop sequence — it stops the moment the run is over.
  if(shakeActive) finishShake();
  runtime.gameActive=false; dropReady=false;
  const recs=bodies.slice().sort((a,b)=>a.body.position.y-b.body.position.y);
  const interval=Math.max(95,Math.min(220,4200/Math.max(recs.length,1)));
  buildLiquid(recs);
  popSeq={recs, idx:0, next:performance.now()+350, interval, done:false, doneAt:0, shown:false};
}

function updatePopSeq(){
  const now=performance.now();
  if(!popSeq.done){
    while(popSeq.idx<popSeq.recs.length && now>=popSeq.next){
      const rec=popSeq.recs[popSeq.idx++]; popSeq.next+=popSeq.interval;
      if(bodies.includes(rec)){
        const p=rec.body.position, hex=colorFor(rec.tier).getHex();
        burst(p.x,p.y,hex,8); splashFx(p.x,p.y,hex); popSound(popSeq.idx);
        removeBody(rec);
      }
    }
    liquidTarget = popSeq.recs.length ? popSeq.idx/popSeq.recs.length : 1;
    if(popSeq.idx>=popSeq.recs.length){ popSeq.done=true; popSeq.doneAt=now; liquidTarget=1; waterSound(); }
  } else if(!popSeq.shown && now-popSeq.doneAt>1700){
    popSeq.shown=true; finishGameOver();
  }
}

function finishGameOver(){
  gameOverSound(); setTimeout(coinSound,600);
  const gained=Math.max(1, Math.round(runtime.score/10));
  state.coins+=gained;
  if(runtime.score>state.best) state.best=runtime.score;
  state.gamesPlayed=(state.gamesPlayed||0)+1;
  state.totalScore=(state.totalScore||0)+runtime.score;
  const prevLevel=state.level||1;
  const computedLevel=levelForScore(state.totalScore);
  const newLevel=Math.min(prevLevel+1, computedLevel, LEVEL_CAP);
  let bonus=0, leveledUp=false;
  if(newLevel>prevLevel){ leveledUp=true; bonus=30; state.coins+=bonus; state.level=newLevel; }
  save();
  runtime.gameOver={ score:runtime.score, gained, bonus, leveledUp, newLevel };
  emit();
  if(leveledUp) setTimeout(()=>tn(660,0.5,0.08,'triangle',0),300);
}

/* ---------- power-ups ---------- */

function syncPowerBtns(){
  runtime.undoEmpty = state.inventory.undo<=0 || !lastDroppedBody;
  emit();
}

export function usePower(kind){
  if(!runtime.gameActive || targeting) return;

  if(kind==='shake'){
    if(state.inventory.shake<=0){ toast("Out of Shakes — buy more in the shop 🛒"); return; }
    state.inventory.shake--; save(); syncPowerBtns();
    shakeAnimT=0; shakeActive=true;
    shakeOrigGravity=engine.gravity.y; engine.gravity.y=0.3;
    bodies.forEach(b=>{
      b._origFriction=b.body.friction; b._origRestitution=b.body.restitution; b._origFrictionAir=b.body.frictionAir;
      Body.set(b.body,'friction',0.01);
      Body.set(b.body,'restitution',0.6);
      Body.set(b.body,'frictionAir',0.0002);
    });
    toast('Shake!');
  } else if(kind==='bomb'){
    if(state.inventory.bomb<=0){ toast("Out of Bombs — buy more in the shop 🛒"); return; }
    state.inventory.bomb--; save(); syncPowerBtns();
    enterTargeting();
  } else if(kind==='undo'){
    if(state.inventory.undo<=0){ toast("Out of Undos — buy more in the shop 🛒"); return; }
    if(!lastDroppedBody || !bodies.includes(lastDroppedBody)){ toast("Nothing to undo"); return; }
    state.inventory.undo--; removeBody(lastDroppedBody);
    nextTier=lastDroppedBody.tier; updateNextSwatch();
    lastDroppedBody=null; dropReady=true;
    toast('Undone'); save(); syncPowerBtns();
  } else if(kind==='tinypop'){
    if((state.inventory.tinypop||0)<=0){ toast("Out of Tiny Pops — buy more in the shop 🛒"); return; }
    const smalls=bodies.filter(b=>b.tier===0);
    if(!smalls.length){ toast('No tiny balls to pop right now'); return; }
    state.inventory.tinypop--; save(); syncPowerBtns();
    toast('Tiny Pop! 💥');
    smalls.forEach((rec,i)=>{
      setTimeout(()=>{
        if(!bodies.includes(rec)) return;
        const p=rec.body.position, hex=colorFor(rec.tier).getHex();
        burst(p.x,p.y,hex,10); splashFx(p.x,p.y,hex); popSound(i);
        runtime.score+=TIERS[0].score; emit();
        removeBody(rec);
      }, i*70);
    });
  }
}

/* ---------- main loop ---------- */

function animate(){
  // A stale loop (engine already torn down by a remount) stops itself instead of
  // rescheduling forever: never queue the next frame once the run is gone.
  if(!renderer || !scene) return;
  rafId=requestAnimationFrame(animate);
  if(runtime.paused){ renderer.render(scene,camera); return; }
  t+=1;
  if(runtime.gameActive){
    Engine.update(engine,1000/60);
    const MAXV=22;
    bodies.forEach(b=>{
      const v=b.body.velocity;
      if(Math.abs(v.x)>MAXV || Math.abs(v.y)>MAXV){
        Body.setVelocity(b.body,{x:Math.max(-MAXV,Math.min(MAXV,v.x)), y:Math.max(-MAXV,Math.min(MAXV,v.y))});
      }
      const r=TIERS[b.tier].r, p=b.body.position;
      const minX=r+2, maxX=W-r-2, maxY=H+r+2;
      let nx=p.x, ny=p.y, hit=false;
      if(p.x<minX){ nx=minX; hit=true; } else if(p.x>maxX){ nx=maxX; hit=true; }
      if(p.y>maxY){ ny=maxY; hit=true; }
      if(hit){
        Body.setPosition(b.body,{x:nx,y:ny});
        Body.setVelocity(b.body,{x:b.body.velocity.x*-0.3, y:Math.min(0,b.body.velocity.y*-0.3)});
      }
    });
    if(shakeActive){
      shakeAnimT++;
      const life=shakeAnimT/SHAKE_DUR;
      const envelope = life<0.15? life/0.15 : Math.max(0,1-((life-0.15)/0.85));
      const amp=SHAKE_TILT*envelope;
      if(jarGroup) jarGroup.rotation.z=Math.sin(shakeAnimT*0.4)*amp;
      if(shakeAnimT % 7===0){
        const dir=Math.sin(shakeAnimT*0.4)>0?1:-1;
        bodies.forEach(b=>{
          const jx=dir*(4+Math.random()*3.5)*envelope, jy=-(2+Math.random()*2)*envelope;
          Body.setVelocity(b.body,{x:b.body.velocity.x*0.35+jx, y:b.body.velocity.y*0.35+jy});
        });
        hitSound();
      }
      if(shakeAnimT>SHAKE_DUR){ finishShake(); }
    }
    processMerges();
    if(comboTimer>0) comboTimer--; else { comboCount=0; comboFired=false; }
    const now=performance.now();
    let over=false;
    bodies.forEach(b=>{
      const topY=b.body.position.y - TIERS[b.tier].r;
      if(topY<dangerY && Math.abs(b.body.velocity.y)<0.5){
        if(!aboveDanger.has(b)) aboveDanger.set(b,now);
        else if(now-aboveDanger.get(b)>1900) over=true;
      } else aboveDanger.delete(b);
      const speed = Math.hypot(b.body.velocity.x,b.body.velocity.y);
      if(speed>1.4) b.wasMoving=true;
      else if(b.wasMoving && speed<0.25){ b.wasMoving=false; settleSound(); }
    });
    if(over) endGame();
  }
  bodies.forEach(rec=>{
    const mesh=meshes3d.get(rec); if(!mesh) return;
    const [wx,wy]=toWorld(rec.body.position.x, rec.body.position.y);
    mesh.position.set(wx,wy,rec.zoff);
    const age = t-rec.spawnT;
    const growIn = Math.min(1, age/10);
    const sAge = t-rec.squashT;
    const sDecay = Math.exp(-sAge*0.2);
    const sWobble = Math.cos(sAge*0.42);
    rec.squash = 1 + (rec.squashAmp||0)*sDecay*sWobble;
    const idle = 1 + Math.sin(t*0.06+rec.wobblePhase)*0.035;
    const stretch = 1+Math.min(Math.abs(rec.body.velocity.y)*0.012,0.16);
    const sx = growIn*(1/Math.sqrt(rec.squash))*idle/Math.sqrt(stretch);
    const sy = growIn*rec.squash*idle*stretch;
    mesh.scale.set(sx,sy,sx);
  });
  if(particles3d.length>170){ particles3d.splice(0, particles3d.length-170).forEach(p=>{ scene.remove(p.mesh); disposeMesh(p.mesh); }); }
  particles3d.forEach(p=>{
    if(p.isRing){
      p.life-=0.045; p.mesh.material.opacity=Math.max(0,p.life)*0.6;
      const s = (1-p.life)*10+1; p.mesh.scale.set(s,s,s);
    } else {
      p.mesh.position.x+=p.vx; p.mesh.position.y+=p.vy; p.vy-=0.12; p.life-=0.03;
      p.mesh.material.opacity=Math.max(0,p.life); p.mesh.scale.setScalar(Math.max(0.1,p.life));
    }
  });
  particles3d = particles3d.filter(p=>{ if(p.life<=0){ scene.remove(p.mesh); disposeMesh(p.mesh); return false;} return true; });

  if(dangerMesh){
    const nearDanger = bodies.some(b=> b.body.position.y - TIERS[b.tier].r < 34 && Math.abs(b.body.velocity.y)<1);
    const goal = nearDanger ? 0.35+0.25*Math.sin(t*0.16) : 0;
    dangerMesh.material.opacity += (goal-dangerMesh.material.opacity)*0.15;
  }
  if(previewMesh && runtime.gameActive && dropReady){
    previewMesh.visible=true;
    const r=TIERS[nextTier].r;
    const x=Math.max(wallThickness+r, Math.min(W-wallThickness-r, aimX));
    const [wx,wy]=toWorld(x, -34);
    previewMesh.position.set(wx,wy,8);
    const s=0.9+Math.sin(t*0.1)*0.05; previewMesh.scale.set(s,s,s);
    if(dropperMesh){ dropperMesh.visible=true; dropperMesh.position.set(wx,wy+34,8); }
    dashMeshes.forEach(d=>d.position.x=wx);
    if(previewMesh.userData.tier!==nextTier || previewMesh.userData.bomb!==isBomb){
      scene.remove(previewMesh); disposeMesh(previewMesh);
      previewMesh = makePreviewMesh();
      previewMesh.material.opacity*=0.8;
      scene.add(previewMesh);
    }
  } else if(previewMesh){ previewMesh.visible=false; if(dropperMesh) dropperMesh.visible=false; }

  if(popSeq) updatePopSeq();
  updateLiquid();
  if(shake>0.1 && camBase){ camera.position.set(camBase.x+(Math.random()-.5)*shake, camBase.y+(Math.random()-.5)*shake, camBase.z); shake*=0.86; }
  else if(camBase){ camera.position.copy(camBase); }
  renderer.render(scene,camera);
}

/* ---------- public API used by React ---------- */

// Called when the game screen mounts (and on every restart).
export function startGameEngine(screenEl, gcWrapElArg){
  gcWrapEl = gcWrapElArg;
  startMusic();
  initThree(screenEl, gcWrapElArg);
  buildWorld();
  setupInput();
  syncPowerBtns();
  cancelAnimationFrame(rafId);
  animate();
  return cleanupEngine;
}

// Called when the game screen unmounts (going home or restarting).
export function cleanupEngine(){
  runtime.gameActive=false;
  runtime.paused=false;
  targeting=false; lastDroppedBody=null; dropReady=true; isBomb=false; skipDropOnce=false;
  popSeq=null; disposeLiquid();
  cancelAnimationFrame(rafId); rafId=null;
  meshes3d.forEach(m=>disposeMesh(m)); meshes3d.clear();
  particles3d.forEach(p=>disposeMesh(p.mesh)); particles3d=[];
  bodies=[];
  disposeSceneResources();
  if(renderer){
    try{ renderer.dispose(); if(renderer.forceContextLoss) renderer.forceContextLoss(); }catch(e){}
    renderer=null;
  }
  emit();   // let React see the reset runtime (e.g. closes the pause sheet)
}

