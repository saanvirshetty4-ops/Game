// Three.js helpers: colours, textures and the jelly mesh factory.
import * as THREE from 'three';
import { TIERS, JELLY_COLORS } from './constants.js';
import { state } from './store.js';

export function colorFor(tier){
  if(state.skin==='gems'){ const hue=(tier*36)%360; return new THREE.Color(`hsl(${hue},75%,60%)`); }
  return new THREE.Color(JELLY_COLORS[tier]);
}

let bumpTex;
export function makeBumpTexture(){
  if(bumpTex) return bumpTex;
  const c=document.createElement('canvas'); c.width=128; c.height=128;
  const cx=c.getContext('2d');
  cx.fillStyle='#808080'; cx.fillRect(0,0,128,128);
  for(let i=0;i<400;i++){
    const x=Math.random()*128,y=Math.random()*128,rad=Math.random()*2.4+0.4;
    const v=100+Math.floor(Math.random()*100);
    cx.fillStyle=`rgb(${v},${v},${v})`; cx.beginPath(); cx.arc(x,y,rad,0,7); cx.fill();
  }
  bumpTex = new THREE.CanvasTexture(c);
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
  return bumpTex;
}

export function makeBackdropTexture(){
  const c=document.createElement('canvas'); c.width=256; c.height=512;
  const cx=c.getContext('2d');
  const g=cx.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#4A3FB8'); g.addColorStop(0.55,'#2A2378'); g.addColorStop(1,'#140F45');
  cx.fillStyle=g; cx.fillRect(0,0,256,512);
  const blobs=[['#FF6FB0',40,110,120],['#4DE1C4',220,260,130],['#8C7CFF',110,430,140],['#FFD866',230,60,70]];
  blobs.forEach(([col,x,y,r])=>{
    const rg=cx.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0,col+'44'); rg.addColorStop(1,col+'00');
    cx.fillStyle=rg; cx.beginPath(); cx.arc(x,y,r,0,7); cx.fill();
  });
  return new THREE.CanvasTexture(c);
}

let reticleMat = null;
export function getReticleMat(){
  if(reticleMat) return reticleMat;
  const cv=document.createElement('canvas'); cv.width=128; cv.height=128; const x=cv.getContext('2d');
  x.strokeStyle='#FF3B30'; x.lineWidth=6;
  x.beginPath(); x.arc(64,64,48,0,7); x.stroke();
  x.lineWidth=4;
  [[64,4,64,26],[64,102,64,124],[4,64,26,64],[102,64,124,64]].forEach(([x1,y1,x2,y2])=>{ x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke(); });
  x.fillStyle='#FF3B30'; x.beginPath(); x.arc(64,64,5,0,7); x.fill();
  reticleMat=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv), transparent:true, depthTest:false, toneMapped:false});
  return reticleMat;
}

let glossMat = null;
export function getGlossMat(){
  if(glossMat) return glossMat;
  const cv=document.createElement('canvas'); cv.width=64; cv.height=64; const x=cv.getContext('2d');
  const g=x.createRadialGradient(32,32,2,32,32,30); g.addColorStop(0,'rgba(255,255,255,0.95)'); g.addColorStop(0.5,'rgba(255,255,255,0.45)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,64,64);
  glossMat=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv), transparent:true, depthWrite:false, toneMapped:false});
  return glossMat;
}

export function makeJellyMesh(tier, bomb){
  const r = TIERS[tier].r;
  const geo = new THREE.SphereGeometry(r, 22, 16);
  let mat;
  if(bomb){
    mat = new THREE.MeshPhysicalMaterial({color:0x18151f, roughness:0.28, metalness:0.4, clearcoat:1, clearcoatRoughness:0.15});
  } else {
    const col = colorFor(tier);
    const gemMode = state.skin==='gems';
    mat = new THREE.MeshPhysicalMaterial({
      color:col, roughness: gemMode?0.1:0.18, metalness:0,
      clearcoat:1, clearcoatRoughness:0.1,
      emissive:col, emissiveIntensity: gemMode?0.14:0.26,
      bumpMap: makeBumpTexture(), bumpScale: r*0.01
    });
  }
  const mesh = new THREE.Mesh(geo,mat);
  mesh.castShadow=true; mesh.receiveShadow=true;
  if(!bomb){
    const gm=getGlossMat();
    const s1=new THREE.Sprite(gm); s1.scale.set(r*0.8,r*0.5,1); s1.position.set(-r*0.36,r*0.42,r*0.74); mesh.add(s1);
    const s2=new THREE.Sprite(gm); s2.scale.set(r*0.2,r*0.2,1); s2.position.set(-r*0.02,r*0.74,r*0.6); mesh.add(s2);
  }
  return mesh;
}

export function darken(hex,f){
  const n=parseInt(hex.slice(1),16), r=Math.floor((n>>16)*f), g2=Math.floor((n>>8&255)*f), b=Math.floor((n&255)*f);
  return '#'+((1<<24)|(r<<16)|(g2<<8)|b).toString(16).slice(1);
}
