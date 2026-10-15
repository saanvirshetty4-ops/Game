// The two columns of power-up buttons (shake/bomb/tiny-pop on the left,
// undo/shop on the right).
import { useStore, state, runtime } from '../game/store.js';
import { usePower } from '../game/engine.js';

export default function PowerRow({ onOpenSheet }){
  useStore();
  return (
    <>
      <div className="powrow powrow-left">
        <button className={'powbtn'+(state.inventory.shake<=0?' empty':'')} id="btnShake" onClick={()=>usePower('shake')}>
          🫨<span className="cnt" id="cntShake">{state.inventory.shake}</span>
        </button>
        <button className={'powbtn'+(state.inventory.bomb<=0?' empty':'')} id="btnBomb" onClick={()=>usePower('bomb')}>
          🎯<span className="cnt" id="cntBomb">{state.inventory.bomb}</span>
        </button>
        <button className={'powbtn'+((state.inventory.tinypop||0)<=0?' empty':'')} id="btnTiny" onClick={()=>usePower('tinypop')}>
          💥<span className="cnt" id="cntTiny">{state.inventory.tinypop||0}</span>
        </button>
      </div>
      <div className="powrow powrow-right">
        <button className={'powbtn'+(runtime.undoEmpty?' empty':'')} id="btnUndo" onClick={()=>usePower('undo')}>
          ↩️<span className="cnt" id="cntUndo">{state.inventory.undo}</span>
        </button>
        <button className="powbtn" id="btnShopPow" onClick={()=>onOpenSheet('shop')}>🛒</button>
      </div>
    </>
  );
}
