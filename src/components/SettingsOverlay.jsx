// Settings sheet: sound / music / vibrate cycle 0% -> 50% -> 100%.
import { useStore, state, resetGame } from '../game/store.js';
import { toggleSetting } from '../game/audio.js';

function pctOf(k){
  const v=state.settings[k+'Vol']==null?1:state.settings[k+'Vol'];
  return Math.round(v*100)+'%';
}
function clsOf(k){ return 'iconBtn'+(state.settings[k]?' on':''); }

export default function SettingsOverlay({ open, onClose, onHome }){
  useStore();
  return (
    <div className={'overlay'+(open?' open':'')} id="ovSettings"
         onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="sheet" style={{textAlign:'center'}}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h2>Settings</h2>
        <div className="iconToggleRow">
          <div className="iconToggle">
            <button className={clsOf('sound')} id="swSound" onClick={()=>toggleSetting('sound')}>🔊</button>
            <span>Sound</span><small id="pctSound">{pctOf('sound')}</small>
          </div>
          <div className="iconToggle">
            <button className={clsOf('music')} id="swMusic" onClick={()=>toggleSetting('music')}>🎵</button>
            <span>Music</span><small id="pctMusic">{pctOf('music')}</small>
          </div>
          <div className="iconToggle">
            <button className={clsOf('haptics')} id="swHaptics" onClick={()=>toggleSetting('haptics')}>📳</button>
            <span>Vibrate</span><small id="pctHaptics">{pctOf('haptics')}</small>
          </div>
        </div>
        <div className="settingsBtnRow">
          <button className="settingsBigBtn green" onClick={onHome}>🏠</button>
          <button className="settingsBigBtn orange" onClick={resetGame}>🔄</button>
          <button className="settingsBigBtn yellow wide" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
  );
}
