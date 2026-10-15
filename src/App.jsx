// App shell: which screen is visible and which sheet (if any) is open.
// Everything visual is either a screen, a sheet or the toast, exactly like the
// original single-file markup.
import { useEffect, useState } from 'react';
import { resumeGame, closeGameOver } from './game/store.js';
import { clickSound, resumeAudio, startMusic } from './game/audio.js';
import SplashScreen from './components/SplashScreen.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import Toast from './components/Toast.jsx';
import PauseOverlay from './components/PauseOverlay.jsx';
import ProfileOverlay from './components/ProfileOverlay.jsx';
import ShopOverlay from './components/ShopOverlay.jsx';
import SettingsOverlay from './components/SettingsOverlay.jsx';
import GameOverOverlay from './components/GameOverOverlay.jsx';

export default function App(){
  const [screen,setScreen]=useState('splash');
  const [gameKey,setGameKey]=useState(0);   // bumps to restart a run in place
  const [sheet,setSheet]=useState(null);
  const [shopTab,setShopTab]=useState('skins');

  // Splash screen lasts 3.5s, then the home screen appears (as in the original).
  useEffect(()=>{
    const h=setTimeout(()=>setScreen('home'),3500);
    return ()=>clearTimeout(h);
  },[]);

  // Global click sound + music wake-up, as in the original document listeners.
  useEffect(()=>{
    const onPointerDown=(e)=>{ if(e.target.closest && e.target.closest('button')) clickSound(); };
    const onClick=()=>{ resumeAudio(); startMusic(); };
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('click',onClick);
    return ()=>{
      document.removeEventListener('pointerdown',onPointerDown);
      document.removeEventListener('click',onClick);
    };
  },[]);

  const openSheet=(name,tab)=>{ if(tab) setShopTab(tab); setSheet(name); };
  const closeSheet=()=>setSheet(null);

  const startGame=()=>{ setScreen('game'); setGameKey(k=>k+1); };

  const goHome=()=>{ resumeGame(); closeGameOver(); setScreen('home'); };

  const goHomeFromSettings=()=>{ closeSheet(); if(screen==='game') goHome(); };

  return (
    <>
      {screen==='splash' && <SplashScreen />}
      {screen==='home' && <HomeScreen onPlay={startGame} onOpenSheet={openSheet} />}
      {screen==='game' && <GameScreen key={gameKey} onOpenSheet={openSheet} />}

      <Toast />
      <PauseOverlay onResume={resumeGame} onRestart={startGame} onHome={goHome} />
      <ProfileOverlay open={sheet==='profile'} onClose={closeSheet} />
      <ShopOverlay open={sheet==='shop'} tab={shopTab} onTab={setShopTab} onClose={closeSheet} />
      <SettingsOverlay open={sheet==='settings'} onClose={closeSheet} onHome={goHomeFromSettings} />
      <GameOverOverlay onStart={startGame} onHome={goHome} />
    </>
  );
}
