// Persistent player state + transient runtime state, with a tiny pub/sub so React
// components can re-render whenever the (mutable) state objects change.
import { useSyncExternalStore } from 'react';
import { LEVEL_BASE, LEVEL_CAP, SAVE_KEY } from './constants.js';

// Saved between sessions (localStorage).
export const state = {
  coins:150, best:0, skin:'jelly', theme:'jar',
  settings:{sound:true, music:true, haptics:true, soundVol:1, musicVol:1, hapticsVol:1},
  inventory:{shake:0,bomb:0,undo:0,tinypop:0},
  level:1, totalScore:0, gamesPlayed:0
};

// Lives for the duration of one game run.
export const runtime = {
  score:0,
  nextHex:'#D6206B',
  undoEmpty:true,
  paused:false,
  gameActive:false,
  gameOver:null   // {score, gained, bonus, leveledUp, newLevel} while the Game Over sheet is up
};

export function levelForScore(total){
  return Math.min(LEVEL_CAP, Math.floor(total/LEVEL_BASE)+1);
}

export function save(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){}
}

export function load(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(raw) Object.assign(state, JSON.parse(raw)); }catch(e){}
}

export function resetGame(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  location.reload();
}

load();
if(!state.starterGranted){
  state.inventory.shake=Math.max(state.inventory.shake,1);
  state.inventory.bomb=Math.max(state.inventory.bomb,1);
  state.inventory.undo=Math.max(state.inventory.undo,1);
  state.inventory.tinypop=Math.max(state.inventory.tinypop||0,1);
  state.starterGranted=true; state.gamesPlayed=state.gamesPlayed||0; save();
}

/* ---------- tiny pub/sub ---------- */

let version = 0;
const listeners = new Set();

export function emit(){ version++; listeners.forEach(l=>l()); }

export function subscribe(listener){
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}

function getVersion(){ return version; }

// Subscribes the component and returns the (mutable) state object for convenience.
export function useStore(){
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return state;
}

/* ---------- toast ---------- */

let toastMsg = '';
let toastVersion = 0;

export function toast(msg){
  toastMsg = msg;
  toastVersion++;
  emit();
}

export function getToast(){
  return { msg:toastMsg, version:toastVersion };
}

/* ---------- runtime helpers ---------- */

export function setPaused(next){
  if(runtime.paused === next) return;
  if(next && !runtime.gameActive) return;
  runtime.paused = next;
  emit();
}

export function openPause(){ setPaused(true); }
export function resumeGame(){ setPaused(false); }

export function closeGameOver(){
  if(!runtime.gameOver) return;
  runtime.gameOver = null;
  emit();
}
