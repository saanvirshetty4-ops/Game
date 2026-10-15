// Home screen: currency pills, 3D jelly stage, PLAY button and the dock.
import { useEffect, useRef } from 'react';
import { useStore, state, toast } from '../game/store.js';
import { startHome3D, disposeHome3D } from '../game/homeScene.js';

export default function HomeScreen({ onPlay, onOpenSheet }){
  const stageRef=useRef(null);
  useStore();   // coins / level

  // Same 40ms delay the original used before starting the 3D stage.
  useEffect(()=>{
    const h=setTimeout(()=>{ if(stageRef.current) startHome3D(stageRef.current); },40);
    return ()=>{ clearTimeout(h); disposeHome3D(); };
  },[]);

  return (
    <div className="screen active" id="home">
      <div className="homeBg">
        <i className="bokeh b1"></i><i className="bokeh b2"></i><i className="bokeh b3"></i><i className="bokeh b4"></i>
      </div>
      <div className="homeTop">
        <div className="pillCoin">🪙 <span>{state.coins}</span></div>
        <div className="pillCoin">⭐ Lv <span>{state.level||1}</span></div>
        <button className="pillBest" onClick={()=>onOpenSheet('profile')}>👤 Profile</button>
      </div>
      <div className="logo3d"><span className="l1">DROP</span><span className="l2">&amp; MERGE</span></div>
      <div className="homeStage" id="homeStage" ref={stageRef}></div>
      <div className="playWrap"><button className="bigbtn playBig" onClick={onPlay}>PLAY</button></div>
      <div className="dock">
        <div className="dockItem">
          <button className="hIconBtn" style={{'--c1':'#FF9CD6','--c2':'#E63C9B','--edge':'#9A2469'}} onClick={()=>onOpenSheet('shop')}>🛍️</button>
          <span>Shop</span>
        </div>
        <div className="dockItem">
          <button className="hIconBtn" style={{'--c1':'#FFC37A','--c2':'#F0722A','--edge':'#a84a14'}} onClick={()=>toast('Come back tomorrow for a daily reward!')}>🎁</button>
          <span>Daily</span>
        </div>
        <div className="dockItem">
          <button className="hIconBtn" style={{'--c1':'#7CEBFF','--c2':'#1FA0E6','--edge':'#0d6da3'}} onClick={()=>onOpenSheet('shop','themes')}>🎨</button>
          <span>Theme</span>
        </div>
        <div className="dockItem">
          <button className="hIconBtn" style={{'--c1':'#A6F58A','--c2':'#38B92B','--edge':'#1f7d18'}} onClick={()=>onOpenSheet('settings')}>⚙️</button>
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
}
