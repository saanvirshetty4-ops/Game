// Pause / coins / best / score / next-ball sign. The score number keeps the
// original "bump" pulse animation, re-triggered whenever the score changes.
import { useEffect, useRef } from 'react';
import { useStore, state, runtime, openPause } from '../game/store.js';

export default function Hud(){
  useStore();
  const scoreRef=useRef(null);
  const prevScore=useRef(runtime.score);

  useEffect(()=>{
    const el=scoreRef.current;
    if(!el || prevScore.current===runtime.score) return;
    prevScore.current=runtime.score;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  });

  return (
    <div className="hud">
      <div className="hudLeft">
        <button className="pauseBtn" id="btnPause" onClick={openPause}>⏸</button>
        <div className="coinPill">🪙 <span>{state.coins}</span></div>
      </div>
      <div className="scoreSign">
        <div className="crownRow">🏆 <span>{state.best}</span></div>
        <div className="scoreNum" id="hudScore" ref={scoreRef}>{runtime.score}</div>
      </div>
      <div className="nextBox">
        <span className="nextLabel">NEXT</span>
        <div className="nextSwatch" id="nextSwatch"
             style={{background:`radial-gradient(circle at 35% 30%, #fff, ${runtime.nextHex} 60%)`}}></div>
      </div>
    </div>
  );
}
