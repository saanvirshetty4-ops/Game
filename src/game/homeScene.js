// The animated 3D jelly scene shown behind the home screen.
import * as THREE from 'three';
import { TIERS } from './constants.js';
import { makeJellyMesh, getGlossMat } from './threeUtils.js';
import { chime } from './audio.js';

let hScene, hCam, hRen=null, hJellies=[], hSparks=[], hRAF=null, hT=0, hBoost=0;

function initHome3D(wrap){
  const w=wrap.clientWidth, h=wrap.clientHeight;
  if(!w||!h) return false;
  if(hRen){ try{ hRen.dispose(); }catch(e){} }
  wrap.innerHTML='';
  hScene=new THREE.Scene();
  hCam=new THREE.PerspectiveCamera(36,w/h,1,4000);
  const dist=(h/2)/Math.tan(THREE.MathUtils.degToRad(18));
  hCam.position.set(0,h*0.08,dist); hCam.lookAt(0,0,0);
  hRen=new THREE.WebGLRenderer({antialias:true,alpha:true});
  hRen.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  hRen.setSize(w,h); hRen.setClearColor(0x000000,0);
  hRen.toneMapping=THREE.ACESFilmicToneMapping; hRen.toneMappingExposure=1.08; hRen.outputEncoding=THREE.sRGBEncoding;
  wrap.appendChild(hRen.domElement);
  hScene.add(new THREE.HemisphereLight(0xffffff,0x3a2a70,0.75));
  const dl=new THREE.DirectionalLight(0xffffff,1.1); dl.position.set(120,220,260); hScene.add(dl);
  const p1=new THREE.PointLight(0xff6fd8,0.9,1200); p1.position.set(-260,140,220); hScene.add(p1);
  const p2=new THREE.PointLight(0x4de1ff,0.8,1200); p2.position.set(280,60,200); hScene.add(p2);
  const ground=-h*0.30;
  hJellies=[];
  const defs=[{tier:0,base:h*0.0135,x:0,z:0,amp:h*0.11,ph:0},{tier:4,base:h*0.0034,x:-w*0.27,z:-40,amp:h*0.08,ph:1.7},{tier:1,base:h*0.0068,x:w*0.28,z:-25,amp:h*0.09,ph:3.1},{tier:6,base:h*0.0021,x:w*0.02,z:-90,amp:h*0.05,ph:4.4}];
  defs.forEach(d=>{
    const mesh=makeJellyMesh(d.tier); mesh.castShadow=false; mesh.scale.setScalar(d.base); hScene.add(mesh);
    const r=TIERS[d.tier].r*d.base;
    const sh=new THREE.Mesh(new THREE.CircleGeometry(r*1.05,28), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.28,depthWrite:false}));
    sh.rotation.x=-Math.PI/2; sh.position.set(d.x,ground+1,d.z); hScene.add(sh);
    hJellies.push({mesh,sh,r0:TIERS[d.tier].r,base:d.base,x:d.x,z:d.z,amp:d.amp,ph:d.ph,ground,r});
  });
  hSparks=[];
  const gm=getGlossMat();
  for(let i=0;i<16;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gm.map,color:i%2?0xffe08a:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    sp.position.set((Math.random()-0.5)*w*0.95,(Math.random()-0.2)*h*0.6,-60+Math.random()*120);
    const s=8+Math.random()*16; sp.scale.set(s,s,1); hScene.add(sp);
    hSparks.push({sp,s,ph:Math.random()*7,sp2:0.03+Math.random()*0.05});
  }
  hRen.domElement.addEventListener('pointerdown',()=>{ hBoost=1; chime(Math.floor(Math.random()*6)+2,1); });
  return true;
}

function homeLoop(){
  hRAF=requestAnimationFrame(homeLoop); hT++;
  hBoost*=0.965;
  hJellies.forEach(j=>{
    const sp=0.045*(1+hBoost*0.8);
    const b=Math.abs(Math.sin(hT*sp+j.ph));
    const near=Math.pow(1-b,9);
    const sy=1-0.3*near+0.07*b, sx=1+0.22*near-0.03*b;
    j.mesh.scale.set(j.base*sx,j.base*sy,j.base*sx);
    const amp=j.amp*(1+hBoost*1.1);
    j.mesh.position.set(j.x+Math.sin(hT*0.013+j.ph)*4, j.ground+j.r0*j.base*sy+b*amp, j.z);
    const sc=1-b*0.35; j.sh.scale.set(sc,sc,sc); j.sh.material.opacity=0.28*(0.5+0.5*(1-b));
  });
  hSparks.forEach(s=>{ const k=0.5+0.5*Math.sin(hT*s.sp2+s.ph); s.sp.scale.set(s.s*k,s.s*k,1); s.sp.material.opacity=k; });
  hRen.render(hScene,hCam);
}

// Called when the home screen mounts.
export function startHome3D(wrap){
  if(!initHome3D(wrap)) return false;
  if(!hRAF) homeLoop();
  return true;
}

export function stopHome3D(){
  if(hRAF){ cancelAnimationFrame(hRAF); hRAF=null; }
}

// Called when the home screen unmounts, so no WebGL context is leaked.
export function disposeHome3D(){
  stopHome3D();
  if(hRen){
    // Free the geometries and materials of this visit (the cached gloss texture
    // and three.js' shared sprite geometry are left untouched on purpose).
    hJellies.forEach(j=>{
      if(j.mesh){ if(j.mesh.geometry) j.mesh.geometry.dispose(); if(j.mesh.material) j.mesh.material.dispose(); }
      if(j.sh){ j.sh.geometry.dispose(); j.sh.material.dispose(); }
    });
    hSparks.forEach(s=>{ if(s.sp && s.sp.material) s.sp.material.dispose(); });
    try{ hRen.dispose(); if(hRen.forceContextLoss) hRen.forceContextLoss(); }catch(e){}
    hRen=null;
  }
  hJellies=[]; hSparks=[];
}
