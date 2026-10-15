// Game Over sheet with the confetti burst, coin tally and level-up line.
import { useEffect, useState } from 'react';
import { useStore, state, runtime, toast } from '../game/store.js';

const CONFETTI_COLORS=['#FF6FB0','#FFD866','#4DE1C4','#4DB4FF','#B27CFF','#FF9E6D'];

function makeConfetti(){
  return Array.from({length:46},(_,i)=>({
    left: Math.random()*100+'%',
    background: CONFETTI_COLORS[i%CONFETTI_COLORS.length],
    animationDelay: (Math.random()*0.8)+'s',
    animationDuration: (2+Math.random()*1.6)+'s'
  }));
}

export default function GameOverOverlay({ onStart, onHome }){
  useStore();
  const over=runtime.gameOver;
  const [pieces,setPieces]=useState([]);

  // Fresh confetti every time a run ends (same as the original confetti() call).
  useEffect(()=>{
    setPieces(over ? makeConfetti() : []);
  },[over]);

  const share=()=>{
    if(!over) return;
    const text = `I scored ${over.score} in Drop & Merge! 🍮`;
    if(navigator.share){ navigator.share({text}).catch(()=>{}); }
    else { toast('Score: '+over.score+' — copy to share!'); }
  };

  return (
    <div className={'overlay'+(over?' open':'')} id="ovGameOver">
      <div className="sheet" style={{textAlign:'center'}}>
        <h2>Game Over</h2>
        <div className="finalScore" id="finalScore">{over?over.score:0}</div>
        <div className="coinsGained" id="coinsGained">
          +{over?over.gained:0}{over&&over.bonus?(' +'+over.bonus+' level bonus'):''} coins
        </div>
        {over && over.leveledUp &&
          <div className="coinsGained" style={{color:'#FFD866'}}>🎉 Level Up! Now Level {over.newLevel}</div>}
        <div className="gameOverRow">
          <button className="goBtn blue" onClick={share}>🔗<span>Share</span></button>
          <button className="goBtn blue" onClick={()=>toast('Best: '+state.best)}>🏆<span>Best</span></button>
          <button className="goBtn orange" onClick={onStart}>⏭️<span>Next</span></button>
        </div>
        <button className="smallbtn" onClick={onHome} style={{marginTop:'14px'}}>Home</button>
      </div>
      {pieces.map((p,i)=><i className="confetti" key={i} style={p}></i>)}
    </div>
  );
}
