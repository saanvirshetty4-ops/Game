// Shop catalogue and purchase logic, copied verbatim from the original game.
import { state, save, emit, toast } from './store.js';

export const SHOP = {
  skins:[
    {nm:'Classic Jelly',ds:'Soft glossy jelly balls',cost:0,fn:()=>{state.skin='jelly';}},
    {nm:'Gems',ds:'Faceted, sparkly, translucent',cost:90,fn:()=>{state.skin='gems';}},
  ],
  themes:[
    {nm:'Glass Box',ds:'Default container',cost:0,fn:()=>{state.theme='jar';}},
    {nm:'Wooden Crate',ds:'Rustic container',cost:110,fn:()=>{state.theme='barrel';}},
  ],
  power:[
    {nm:'Shake ×1',ds:'Tilt and jiggle the whole box',cost:55,fn:()=>{state.inventory.shake++;}},
    {nm:'Bomb ×1',ds:'Tap any jelly to pop it instantly',cost:70,fn:()=>{state.inventory.bomb++;}},
    {nm:'Undo ×1',ds:'Take back last drop',cost:45,fn:()=>{state.inventory.undo++;}},
    {nm:'Tiny Pop ×1',ds:'Blast every smallest jelly at once',cost:65,fn:()=>{state.inventory.tinypop=(state.inventory.tinypop||0)+1;}},
  ],
  more:[
    {nm:'No Ads',ds:'$3.99/mo — needs real app-store billing, not wired up in this preview',cost:-1,fn:()=>{toast('Real payments need app-store billing — not available in this preview.');}},
    {nm:'Coin Pack',ds:'100 coins for ~$1.99 — needs real app-store billing, not wired up in this preview',cost:-1,fn:()=>{toast('Real payments need app-store billing — not available in this preview.');}}
  ]
};

export function isOwned(tab, item){
  return (tab==='skins' && ((item.nm==='Classic Jelly'&&state.skin==='jelly')||(item.nm==='Gems'&&state.skin==='gems'))) ||
         (tab==='themes' && ((item.nm==='Glass Box'&&state.theme==='jar')||(item.nm==='Wooden Crate'&&state.theme==='barrel')));
}

export function swatchColorFor(tab, item){
  return tab==='power' ? '#FF6FB0' : (item.nm.includes('Gem')?'#8C7CFF':(item.nm.includes('Crate')?'#8A5A32':(item.nm.includes('No Ads')?'#4DE1C4':(item.nm.includes('Coin')?'#FFD866':'#FF9E6D'))));
}

export function priceLabel(tab, owned, item){
  return item.cost<0 ? (item.nm.includes('No Ads')?'$3.99/mo':'$1.99') : (owned? 'Equipped' : (item.cost===0?'Equip':'🪙 '+item.cost));
}

export function buyItem(tab, item){
  if(item.cost>0){ if(state.coins<item.cost) return; state.coins-=item.cost; }
  item.fn();
  save();
  emit();   // refreshes home numbers, shop grid and power counters
  if(item.cost>=0) toast(item.nm+(tab==='power'?' added!':' equipped!'));
}
