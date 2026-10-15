// Profile sheet: coins, best score, games played and level progress.
import { useStore, state } from '../game/store.js';
import { LEVEL_BASE, LEVEL_CAP } from '../game/constants.js';

export default function ProfileOverlay({ open, onClose }){
  useStore();
  const need=Math.min(LEVEL_CAP, state.level||1)*LEVEL_BASE;
  return (
    <div className={'overlay'+(open?' open':'')} id="ovProfile"
         onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="sheet" style={{textAlign:'center'}}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h2>Profile</h2>
        <div className="row"><span>🪙 Coins</span><b>{state.coins}</b></div>
        <div className="row"><span>🏆 Best score</span><b>{state.best}</b></div>
        <div className="row"><span>🎮 Games played</span><b>{state.gamesPlayed||0}</b></div>
        <div className="row" style={{borderBottom:'none'}}>
          <span>⭐ Level</span>
          <b>{state.level+' ('+state.totalScore+' / '+need+' XP)'}</b>
        </div>
      </div>
    </div>
  );
}
