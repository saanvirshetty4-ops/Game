// Transient message pill at the top of the screen.
import { useEffect, useState } from 'react';
import { useStore, getToast } from '../game/store.js';

export default function Toast(){
  useStore();
  const { msg, version } = getToast();
  const [show,setShow]=useState(false);

  useEffect(()=>{
    if(!msg) return;
    setShow(true);
    const h=setTimeout(()=>setShow(false),1600);
    return ()=>clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[version]);

  return <div className={'toast'+(show?' show':'')}>{msg}</div>;
}
