// The evolution strip at the bottom of the jar: every tier, smallest to biggest,
// with the coin milestones on the last three.
import { Fragment } from 'react';
import { useStore } from '../game/store.js';
import { TIERS } from '../game/constants.js';
import { colorFor } from '../game/threeUtils.js';

export default function EvoStrip(){
  useStore();   // re-renders when the jelly skin changes
  const minS=16, maxS=30;
  return TIERS.map((tr,i)=>{
    const hex='#'+colorFor(i).getHexString();
    const size=Math.round(minS+(maxS-minS)*(i/(TIERS.length-1)));
    const milestone = i>=TIERS.length-3 ? (i-(TIERS.length-4))*10 : null;
    return (
      <Fragment key={i}>
        {i>0 && <div className="evoArrow">›</div>}
        <div className="evoItem">
          <div className="evoBall" style={{width:size+'px', height:size+'px', background:`radial-gradient(circle at 35% 30%,#fff,${hex} 65%)`}}></div>
          {milestone!==null && <div className="evoCoin">{milestone}</div>}
        </div>
      </Fragment>
    );
  });
}
