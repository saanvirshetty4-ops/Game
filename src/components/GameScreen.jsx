// The game screen. React owns the layout; the Three.js/Matter.js engine owns the
// canvas inside #gcWrap and starts when the screen mounts.
import { useLayoutEffect, useRef } from 'react';
import { startGameEngine, cleanupEngine } from '../game/engine.js';
import Hud from './Hud.jsx';
import PowerRow from './PowerRow.jsx';
import EvoStrip from './EvoStrip.jsx';

export default function GameScreen({ onOpenSheet }){
  const screenRef=useRef(null);
  const gcRef=useRef(null);

  useLayoutEffect(()=>{
    const cleanup=startGameEngine(screenRef.current, gcRef.current);
    return cleanup;
  },[]);

  return (
    <div className="screen active" id="game" ref={screenRef}>
      <Hud />
      <PowerRow onOpenSheet={onOpenSheet} />
      <div className="canvaswrap"><div id="gcWrap" ref={gcRef}></div></div>
      <div className="evoStrip" id="evoStrip"><EvoStrip /></div>
    </div>
  );
}
