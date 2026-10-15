// Pause sheet. Its open state lives in the store because the engine owns pausing.
import { useStore, runtime } from '../game/store.js';

export default function PauseOverlay({ onResume, onRestart, onHome }){
  useStore();
  const open=runtime.paused;
  return (
    <div className={'overlay'+(open?' open':'')} id="ovPause">
      <div className="sheet" style={{textAlign:'center'}}>
        <h2>Paused</h2>
        <div className="settingsBtnRow" style={{justifyContent:'center', marginTop:'10px'}}>
          <button className="settingsBigBtn green" onClick={onHome}>🏠</button>
          <button className="settingsBigBtn orange" onClick={onRestart}>🔄</button>
          <button className="settingsBigBtn yellow wide" onClick={onResume}>Resume</button>
        </div>
      </div>
    </div>
  );
}
