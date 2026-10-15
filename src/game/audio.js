// All sound, music and haptics. Logic copied verbatim from the original game.
import { state, save, emit } from './store.js';

let actx;
const _lastSnd = {};

function canPlay(key, gapMs){
  const now = performance.now();
  if(!_lastSnd[key] || now - _lastSnd[key] > gapMs){ _lastSnd[key] = now; return true; }
  return false;
}

const PENTA = [0,2,4,7,9];
function pf(i){ return 261.63*Math.pow(2,(PENTA[((i%5)+5)%5]+12*Math.floor(i/5))/12); }

function tn(freq,dur,vol,type,delay,fromMul){
  if(!state.settings.sound || state.settings.soundVol<=0) return;
  vol *= (state.settings.soundVol==null?1:state.settings.soundVol);
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime+(delay||0);
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type||'sine';
    if(fromMul){ o.frequency.setValueAtTime(freq*fromMul,t0); o.frequency.exponentialRampToValueAtTime(freq,t0+0.05); }
    else o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(vol,t0+0.008); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0+dur+0.03);
  }catch(e){}
}

function buzz(ms){
  if(!state.settings.haptics || (state.settings.hapticsVol||0)<=0) return;
  try{ navigator.vibrate && navigator.vibrate(Math.max(1,Math.round(ms*(state.settings.hapticsVol||1)))); }catch(e){}
}

function chime(tier,combo){
  if(!state.settings.sound || !canPlay('chime',40)) return;
  const f=pf(tier+((combo||1)-1));
  tn(f,0.38,0.09,'sine',0,0.82);
  tn(f*0.5,0.16,0.05,'sine',0,1.6);
  tn(f*2,0.26,0.035,'sine',0.012);
  if(tier>=4) tn(f*3,0.22,0.02,'sine',0.03);
  if((combo||1)>=3){ tn(f*2,0.16,0.03,'triangle',0.09); tn(f*3,0.2,0.025,'triangle',0.16); }
}

function clickSound(){ if(canPlay('click',50)) tn(880,0.06,0.035,'triangle',0,0.8); }
function gameOverSound(){ tn(392,0.45,0.07,'sine',0); tn(330,0.45,0.07,'sine',0.2); tn(262,0.7,0.08,'sine',0.4); }
function coinSound(){ tn(1319,0.14,0.045,'triangle',0); tn(1760,0.24,0.045,'triangle',0.09); }

function popSound(i){
  if(!state.settings.sound) return;
  const f=pf((i%12)+2);
  tn(f*1.6,0.09,0.06,'sine',0,1.5);
  tn(f*0.5,0.13,0.045,'sine',0,1.2);
}

function waterSound(){
  if(!state.settings.sound) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime, dur=1.7, len=Math.floor(actx.sampleRate*dur);
    const buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    const src=actx.createBufferSource(); src.buffer=buf;
    const lp=actx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(220,t0); lp.frequency.exponentialRampToValueAtTime(1300,t0+dur*0.8);
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.05,t0+0.4); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    src.connect(lp); lp.connect(g); g.connect(actx.destination); src.start(t0);
  }catch(e){}
  for(let k=0;k<7;k++) tn(500+Math.random()*700,0.07,0.03,'sine',0.1+k*0.17+Math.random()*0.08,0.6);
}

function thud(){
  if(!state.settings.sound || !canPlay('thud',150)) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.value=110; g.gain.value=0.04;
    o.connect(g); g.connect(actx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+0.1); o.stop(actx.currentTime+0.11);
  }catch(e){}
}

function squish(){
  if(!state.settings.sound || !canPlay('squish',120)) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(200,t0);
    o.frequency.exponentialRampToValueAtTime(110,t0+0.06);
    o.frequency.exponentialRampToValueAtTime(160,t0+0.12);
    g.gain.setValueAtTime(0.035,t0);
    o.connect(g); g.connect(actx.destination); o.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001,t0+0.14); o.stop(t0+0.15);
  }catch(e){}
}

function dropSound(){
  if(!canPlay('drop',150)) return;
  tn(430,0.11,0.055,'sine',0,0.6);
  tn(860,0.06,0.02,'sine',0.02);
}

function hitSound(){
  if(!state.settings.sound || !canPlay('hit',150)) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(150,t0); o.frequency.exponentialRampToValueAtTime(80,t0+0.05);
    g.gain.setValueAtTime(0.045,t0);
    o.connect(g); g.connect(actx.destination); o.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001,t0+0.08); o.stop(t0+0.09);
  }catch(e){}
}

function splashSound(){
  if(!state.settings.sound || !canPlay('splash',150)) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(420,t0); o.frequency.exponentialRampToValueAtTime(680,t0+0.05);
    g.gain.setValueAtTime(0.03,t0);
    o.connect(g); g.connect(actx.destination); o.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001,t0+0.09); o.stop(t0+0.1);
  }catch(e){}
}

function settleSound(){
  if(!state.settings.sound || !canPlay('settle',400)) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.value=125; g.gain.setValueAtTime(0.02,t0);
    o.connect(g); g.connect(actx.destination); o.start(t0);
    g.gain.exponentialRampToValueAtTime(0.001,t0+0.07); o.stop(t0+0.08);
  }catch(e){}
}

/* ---------- music ---------- */

let musicTimer = null, musicStep = 0;
const MELODY = [0,2,4,2,5,4,2,0, 4,5,7,5,4,2,0,2];

function musicNote(i){
  try{
    const f=pf(i)/2, t0=actx.currentTime;
    [[f,0.014],[f*2,0.005]].forEach(([fr,v])=>{
      const o=actx.createOscillator(), g=actx.createGain();
      o.type='sine'; o.frequency.value=fr;
      const mv=(state.settings.musicVol==null?1:state.settings.musicVol); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*mv,t0+0.25); g.gain.exponentialRampToValueAtTime(0.0001,t0+1.9);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0+2);
    });
  }catch(e){}
}

function startMusic(){
  if(!state.settings.music || (state.settings.musicVol||0)<=0 || musicTimer) return;
  try{ actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); }catch(e){}
  musicTimer=setInterval(()=>{ if(state.settings.music && (state.settings.musicVol||0)>0) musicNote(MELODY[musicStep++%MELODY.length]); },640);
}

function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } }

function resumeAudio(){
  try{ if(actx && actx.state==='suspended') actx.resume(); }catch(e){}
}

/* ---------- settings toggles (0% -> 50% -> 100%) ---------- */

function toggleSetting(k){
  const volKey=k+'Vol';
  const cur=state.settings[volKey]==null?1:state.settings[volKey];
  const steps=[0,0.5,1]; const idx=steps.findIndex(s=>Math.abs(s-cur)<0.01);
  const next=steps[(idx+1+steps.length)%steps.length];
  state.settings[volKey]=next; state.settings[k]=next>0;
  if(k==='music'){ if(state.settings.music && next>0) startMusic(); else stopMusic(); }
  if(k==='haptics' && next>0) buzz(20);
  save();
  emit();
}

export {
  canPlay, tn, buzz, chime, clickSound, gameOverSound, coinSound, popSound, waterSound,
  thud, squish, dropSound, hitSound, splashSound, settleSound,
  startMusic, stopMusic, resumeAudio, toggleSetting
};
