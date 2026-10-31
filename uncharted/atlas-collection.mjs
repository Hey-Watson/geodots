import {chapterDatabase,chapterState,validateContent} from './model.mjs';
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Read the chapter's own earned ledger. Never create a database or write a save. */
export function readChapterRecords(database=globalThis.indexedDB){
 return new Promise((resolve,reject)=>{
  if(!database){reject(Error('Chapter storage unavailable'));return}
  const request=database.open(chapterDatabase);let absent=false;
  request.onupgradeneeded=()=>{absent=true;request.transaction.abort()};
  request.onerror=()=>absent?resolve([]):reject(request.error);
  request.onblocked=()=>reject(Error('Chapter storage blocked'));
  request.onsuccess=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('records')){db.close();reject(Error('Chapter records unavailable'));return}
   const tx=db.transaction('records','readonly'),rows=tx.objectStore('records').getAll();
   tx.oncomplete=()=>{db.close();resolve(rows.result)};
   tx.onabort=tx.onerror=()=>{db.close();reject(tx.error??Error('Chapter read failed'))};
  };
 });
}
export function earnedShores(content,records){
 const earned=new Set(chapterState(content,records).completed);
 return content.availableOrder.filter(id=>earned.has(id)).map(id=>content.challenges.find(c=>c.id===id));
}
function coordinate(value,positive,negative){const minutes=Math.round(Math.abs(value)*60);return Math.floor(minutes/60)+'°'+String(minutes%60).padStart(2,'0')+'′ '+(value>=0?positive:negative)}
export function collectionHTML(content,records,language='en'){
 const local=(en,fr)=>language==='fr'?fr:en,shores=earnedShores(content,records);
 return `<div class="section-rule"><h2>${local('The Uncharted World','Le Monde inexploré')}</h2></div>
 ${shores.length?`<div class="atlas-shores">${shores.map(c=>{
  const copy=c.copy[language],pattern='atlas-shore-'+c.id,position=coordinate(c.probe[1],'N','S')+' · '+coordinate(c.probe[0],'E',local('W','O'));
  return `<article class="atlas-shore" data-earned-shore="${E(c.id)}"><svg viewBox="${E(c.specimenBox)}" aria-hidden="true"><defs><pattern id="${pattern}" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M1 0V11" stroke="#c3c7a8" stroke-opacity=".5" stroke-width="1.3"/></pattern></defs><path class="atlas-shore-wash" d="${E(c.realCoast)}"/><path class="atlas-shore-line" d="${E(c.realCoast)}" fill="url(#${pattern})" vector-effect="non-scaling-stroke"/></svg><div><span class="eyebrow">${local('SHORE CHARTED','CÔTE CARTOGRAPHIÉE')}</span><h3>${E(copy.name)}</h3><p class="atlas-shore-position">${E(position)}</p><p>${E(copy.geoHint)}</p></div></article>`;
 }).join('')}</div>`:''}
 <button class="secondary atlas-shores-action" data-view="uncharted">${local('Explore The Uncharted World','Explorer le Monde inexploré')} →</button>`;
}
let catalogue;
export async function renderAtlasShores(root,{language='en'}={}){
 catalogue??=fetch(new URL('content.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Chapter catalogue unavailable');return r.json()}).then(c=>{validateContent(c);return c}).catch(error=>{catalogue=null;throw error});
 const [content,records]=await Promise.all([catalogue,readChapterRecords()]);
 if(!root.isConnected)return;
 root.innerHTML=collectionHTML(content,records,language);root.removeAttribute('aria-busy');root.dataset.ready='true';
}
