// Shop sheet: skins, themes, power-ups and the (placeholder) in-app purchases.
import { useStore, state } from '../game/store.js';
import { SHOP, isOwned, swatchColorFor, priceLabel, buyItem } from '../game/shop.js';

const TABS = Object.keys(SHOP);

export default function ShopOverlay({ open, tab, onTab, onClose }){
  useStore();
  return (
    <div className={'overlay'+(open?' open':'')} id="ovShop"
         onClick={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="sheet">
        <button className="close-x" onClick={onClose}>✕</button>
        <h2>Shop</h2>
        <div className="tabs">
          {TABS.map(k=>(
            <button key={k} className={'tab'+(k===tab?' active':'')} onClick={()=>onTab(k)}>
              {k[0].toUpperCase()+k.slice(1)}
            </button>
          ))}
        </div>
        <div className="shop-grid" id="shopGrid">
          {SHOP[tab].map(item=>{
            const owned=isOwned(tab,item);
            const disabled = owned || (item.cost>0 && state.coins<item.cost);
            return (
              <div className="shop-item" key={item.nm}>
                <div className="ic" style={{background:`radial-gradient(circle at 35% 30%,#fff,${swatchColorFor(tab,item)} 65%)`}}></div>
                <div className="nm">{item.nm}</div>
                <div className="ds">{item.ds}</div>
                <button className={'buy'+(owned?' active2':'')} disabled={disabled} onClick={()=>buyItem(tab,item)}>
                  {priceLabel(tab,owned,item)}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
