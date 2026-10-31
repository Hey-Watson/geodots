import {atlasCamera,animateCamera,cancelCamera} from './atlas-camera.mjs';
import {atlasProjection,atlasGeometryPath} from './atlas-projection.mjs';
export {atlasProjection} from './atlas-projection.mjs';
import {deriveAtlasCoverage,earnedAtlasLandmarks} from './core/atlas.mjs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(language,en,fr)=>language==='fr'?fr:en;
export function atlasState(options){return deriveAtlasCoverage({...options,includeProposed:options.mode!=='puzzles'})}
export function atlasLand(options){
 const{features,mode,language,focus}=options,state=atlasState(options),p=atlasProjection();
 return features.map(f=>{
  const q=f.properties,status=!q.antarctica&&state.puzzleEntities.has(q.entityId)?'puzzle':!q.antarctica&&state.expeditionEntities.has(q.entityId)?'expedition':'uncharted';
  const label=escape(language==='fr'?q.nameFr:q.name)+' · '+text(language,status==='puzzle'?'Puzzle charted':status==='expedition'?'Expedition charted':'Uncharted',status==='puzzle'?'Cartographié par les énigmes':status==='expedition'?'Cartographié par les expéditions':'Non cartographié');
  return`<path role="img" aria-label="${label}" data-component="${q.id}" ${q.antarctica?'data-antarctica="uncharted" ':''}data-entity="${q.entityId??''}" data-coverage="${status}" class="atlas-land ${status==='puzzle'?'explored':status==='expedition'?'expedition-charted':''} ${mode==='uncharted'&&status!=='uncharted'?'atlas-muted':''} ${focus.has(q.entityId)?'in-focus':''}" fill-rule="evenodd" d="${atlasGeometryPath(f.geometry,p)}"><title>${label}</title></path>`
 }).join('');
}
/** Exclusive 44px target cells centred on the pin heads. Voronoi clipping keeps
 * overlapping visuals from stealing a neighbour's hit area; no anchors move. */
export function markerTarget(point,points,scale){
 let cell=[[-22,-22],[22,-22],[22,22],[-22,22]];
 for(const q of [...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1])){
  if(q===point)continue;
  const dx=(q[0]-point[0])*scale,dy=(q[1]-point[1])*scale,d=Math.hypot(dx,dy);
  if(d===0)continue;
  const bound=d*d/2-.3*d,output=[];
  for(let i=0;i<cell.length;i++){
   const a=cell[i],b=cell[(i+1)%cell.length],fa=a[0]*dx+a[1]*dy-bound,fb=b[0]*dx+b[1]*dy-bound;
   if(fa<=0)output.push(a);
   if((fa<=0)!==(fb<=0)){const t=fa/(fa-fb);output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
  }
  cell=output;
 }
 return cell;
}
/** One earned record, one exact WGS84 anchor. Heads use20CSSpx on desktop,18px in compact world views,22px in compact detail.
 * The existing44px individual list remains available in dense world views. */
export function atlasMarkerLayer({records,landmarks,mode,language,camera=[0,0,900,500],width=900,height=500}){
 if(!['landmarks','uncharted'].includes(mode))return'';
 const p=atlasProjection(),scale=Math.min(width/camera[2],height/camera[3]),radius=width<600?(camera[2]>600?9:11):10,cy=-radius-5;
 const points=earnedAtlasLandmarks(records,landmarks).map(l=>({l,point:p.forward(l.referencePoint)})).filter(({point:[x,y]})=>x>=camera[0]&&x<=camera[0]+camera[2]&&y>=camera[1]&&y<=camera[1]+camera[3]);
 const positions=points.map(q=>q.point);
 return points.map(({l,point})=>{
  const target=markerTarget(point,positions,scale).map(([x,y])=>`${x},${y+cy}`).join(' '),label=escape(l.title[language]);
  return`<g role="button" tabindex="0" class="atlas-landmark" data-atlas-discoveries="${l.id}" data-point="${l.referencePoint.join(',')}" transform="translate(${point.join(' ')})" aria-label="${label}"><title>${label}</title><g class="marker-screen" transform="scale(${1/scale})"><polygon class="marker-hit" points="${target}"/><path class="marker-pointer" d="M-5 -8L0 0L5 -8Z"/><circle class="marker-face" cy="${cy}" r="${radius}"/><circle class="marker-core" cy="${cy}" r="3.3"/></g></g>`;
 }).join('');
}
export function atlasControls(options){
 const{language,mode,records,landmarks,simulation}=options,earned=earnedAtlasLandmarks(records,landmarks);
 const modes=[['puzzles','Puzzles','Énigmes'],['expeditions','Expeditions','Expéditions'],['landmarks','Discoveries','Découvertes'],...(simulation?[['uncharted','Uncharted','Non cartographié']]:[])];
 return`${simulation?`<div class="simulation-banner" role="status">${text(language,'ISOLATED SIMULATION · 60 current puzzles, ten expeditions, twenty earned tokens. Memory only; your saved game is untouched.','SIMULATION ISOLÉE · 60 énigmes actuelles, dix expéditions, vingt jetons obtenus. En mémoire uniquement ; votre sauvegarde reste intacte.')}</div>`:''}<div class="atlas-layers" role="group" aria-label="${text(language,'Atlas views','Vues de l’Atlas')}">${modes.map(([id,en,fr])=>`<button id="atlas-mode-${id}" data-atlas-mode="${id}" aria-pressed="${mode===id}">${text(language,en,fr)}</button>`).join('')}</div><div class="atlas-navigation" role="group" aria-label="${text(language,'World map controls','Commandes de la carte mondiale')}">${[['in','+','Zoom in','Agrandir'],['out','−','Zoom out','Réduire'],['west','←','Pan west','Vers l’ouest'],['east','→','Pan east','Vers l’est'],['north','↑','Pan north','Vers le nord'],['south','↓','Pan south','Vers le sud'],['europe','Europe','Europe detail','Détail de l’Europe']].map(([key,label,en,fr])=>`<button id="atlas-nav-${key}" data-atlas-nav="${key}" aria-label="${text(language,en,fr)}">${label}</button>`).join('')}<button id="atlas-routes" data-atlas-routes="toggle" aria-pressed="${options.routes}">${text(language,'Charting history','Cartes datées')}</button></div><p id="atlasKeyboard" class="sr-only">${text(language,'World map: arrow keys pan, plus and minus zoom, Home resets. Each earned marker opens its own record. At world scale, use Europe detail, zoom or the accessible list to select nearby discoveries.','Carte mondiale : les flèches déplacent la vue, plus et moins règlent le zoom, Début recentre. Chaque repère ouvre sa fiche. À l’échelle mondiale, utilisez le détail de l’Europe, le zoom ou la liste accessible pour choisir les découvertes proches.')}</p>${earned.length?`<div class="atlas-earned-list"><details><summary>${text(language,'Your Landmark Discoveries','Vos découvertes de sites')}</summary><div>${earned.map(l=>`<button data-atlas-discoveries="${l.id}">${escape(l.title[language])}</button>`).join('')}</div></details></div>`:''}`;
}
let resizeObserver,cameraObserver;
export function bindAtlasMap(svg,{markers,onCamera,onDrag,reduced=false}){
 resizeObserver?.disconnect();cameraObserver?.disconnect();if(!svg)return;
 const camera=()=>svg.getAttribute('viewBox').trim().split(/\s+/).map(Number);
 // A noninteractive overlay raises the hovered/focused pin without reordering
 // the20 original keyboard controls or intercepting any neighbouring target.
 const emphasis=document.createElementNS('http://www.w3.org/2000/svg','g');emphasis.id='atlasMarkerEmphasis';emphasis.setAttribute('aria-hidden','true');emphasis.setAttribute('pointer-events','none');svg.querySelector('#atlasMarkers').after(emphasis);
 const tip=document.createElement('div');tip.id='atlasMarkerTooltip';tip.className='atlas-marker-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;svg.parentElement.append(tip);
 const markerId=node=>node?.closest?.('.atlas-landmark')?.dataset.atlasDiscoveries;
 let hovered=null;
 const showMarker=id=>{
  emphasis.replaceChildren();tip.hidden=true;
  const marker=[...svg.querySelectorAll('.atlas-landmark')].find(n=>n.dataset.atlasDiscoveries===id);if(!marker)return;
  const copy=marker.querySelector('.marker-screen').cloneNode(true);copy.querySelector('.marker-hit').remove();emphasis.setAttribute('transform',marker.getAttribute('transform'));emphasis.append(copy);
  tip.textContent=marker.getAttribute('aria-label');tip.hidden=false;
  const face=marker.querySelector('.marker-face'),point=new DOMPoint(0,Number(face.getAttribute('cy'))).matrixTransform(face.getScreenCTM()),surface=svg.parentElement.getBoundingClientRect(),box=tip.getBoundingClientRect(),r=Number(face.getAttribute('r'));
  tip.style.left=`${Math.max(8,Math.min(surface.width-box.width-8,point.x-surface.left-box.width/2))}px`;
  const above=point.y-surface.top-r-box.height-10;tip.style.top=`${Math.max(8,above>=8?above:point.y-surface.top+r+10)}px`;
 };
 const activeMarker=()=>hovered??markerId(document.activeElement);
 const refresh=()=>{const focused=markerId(document.activeElement),rect=svg.getBoundingClientRect();svg.querySelector('#atlasMarkers').innerHTML=markers(camera(),rect.width,rect.height);if(focused){const same=[...svg.querySelectorAll('.atlas-landmark')].find(n=>n.dataset.atlasDiscoveries===focused);(same??svg).focus({preventScroll:true})}showMarker(activeMarker())};
 svg.addEventListener('pointerover',e=>{const id=markerId(e.target);if(id){hovered=id;showMarker(activeMarker())}});
 svg.addEventListener('pointerout',e=>{hovered=markerId(e.relatedTarget)??null;showMarker(activeMarker())});
 svg.addEventListener('pointerleave',()=>{hovered=null;showMarker(activeMarker())});
 svg.addEventListener('focusin',e=>{hovered=null;showMarker(markerId(e.target))});
 svg.addEventListener('focusout',e=>showMarker(markerId(e.relatedTarget)??hovered));
 svg.addEventListener('keydown',e=>{if(e.key==='Escape')tip.hidden=true});
 let lastCamera;const sync=()=>{const key=svg.getAttribute('viewBox');if(key===lastCamera)return;lastCamera=key;const next=camera(),clip=svg.querySelector('#atlasCameraRect');if(clip)['x','y','width','height'].forEach((key,i)=>clip.setAttribute(key,next[i]));onCamera(next);refresh()};
 const put=next=>{svg.setAttribute('viewBox',next.join(' '));sync()};svg.putAtlasCamera=put;
 // Companion travel also changes viewBox directly; keep its clip and markers aligned.
 cameraObserver=new MutationObserver(sync);cameraObserver.observe(svg,{attributes:true,attributeFilter:['viewBox']});sync();resizeObserver=new ResizeObserver(refresh);resizeObserver.observe(svg);
 const pointers=new Map();let start=null,pinch=null,moved=false;
 svg.addEventListener('pointerdown',e=>{cancelCamera(svg);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){start={x:e.clientX,y:e.clientY,camera:camera()};moved=false}if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),camera:camera()};moved=true}});
 svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>0)put(atlasCamera(pinch.camera,pinch.distance/distance));return}if(start&&!pinch){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)moved=true;if(moved){svg.setPointerCapture(e.pointerId);const rect=svg.getBoundingClientRect(),scale=Math.min(rect.width/start.camera[2],rect.height/start.camera[3]);put(atlasCamera(start.camera,1,-dx/scale,-dy/scale))}}});
 const release=e=>{pointers.delete(e.pointerId);if(moved)onDrag();if(!pointers.size){start=null;pinch=null;if(moved)refresh()}};svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',e=>{pointers.clear();start=null;pinch=null;onDrag()});
 svg.addEventListener('keydown',e=>{if(e.target!==svg)return;const c=camera(),actions={ArrowLeft:()=>atlasCamera(c,1,-c[2]*.12,0),ArrowRight:()=>atlasCamera(c,1,c[2]*.12,0),ArrowUp:()=>atlasCamera(c,1,0,-c[3]*.12),ArrowDown:()=>atlasCamera(c,1,0,c[3]*.12),'+':()=>atlasCamera(c,.75),'-':()=>atlasCamera(c,1.333333),Home:()=>[0,0,900,500]};if(actions[e.key]){e.preventDefault();animateCamera(svg,actions[e.key](),{reduced:typeof reduced==='function'?reduced():reduced})}});
}
