/** Real, unchanged Atlas component geometry. No fictional routes, dates or locations. */
import {atlasProjection} from '../atlas-projection.mjs';
const cache=new WeakMap();
const number=n=>n.toFixed(1);
function worldShapes(features){
 if(cache.has(features))return cache.get(features);
 const p=atlasProjection();
 const ring=points=>{const output=[];let last;for(let i=0;i<points.length;i++){const q=p.forward(points[i]);if(!last||i===points.length-1||Math.hypot(q[0]-last[0],q[1]-last[1])>=1){output.push(q);last=q}}return output.map(([x,y],i)=>`${i?'L':'M'}${number(x)},${number(y)}`).join('')+'Z'};
 const land=features.filter(f=>!f.properties.antarctica).map(f=>{const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;return `<path d="${parts.map(rings=>rings.map(ring).join('')).join('')}"/>`}).join('');
 const graticule=[-120,-60,0,60,120].map(lon=>{const a=p.forward([lon,80]),b=p.forward([lon,-60]);return `<path d="M${a.join(' ')}L${b.join(' ')}"/>`}).join('')+[-60,-30,0,30,60].map(lat=>{const a=p.forward([-180,lat]),b=p.forward([180,lat]);return `<path d="M${a.join(' ')}L${b.join(' ')}"/>`}).join('');
 const result={land,graticule};cache.set(features,result);return result;
}
/** Ten unfinished documents printed along the lower page margins, never controls. */
function unfinishedExpeditions(){
 const folio=(x,y)=>`<g class="story-expedition-folio" transform="translate(${x} ${y})" aria-hidden="true"><path class="story-folio-leaves" d="M2 3 32 0l3 3v45L4 52 1 49Z"/><path class="story-folio-face" d="m4 6 28-3v44L4 50Z"/><path class="story-folio-binding" d="M7 6v43"/><path class="story-folio-chart" d="M12 17h15M12 28h11m-6-16v25m9-25v11"/><path class="story-folio-unfinished" d="M12 40h8"/></g>`;
 return `<g class="story-unfinished-expeditions" aria-hidden="true"><g data-folio-page="left">${Array.from({length:5},(_,i)=>folio(144+i*53,537+i*3)).join('')}</g><g data-folio-page="right">${Array.from({length:5},(_,i)=>folio(500+i*45,553-i*3)).join('')}</g></g>`;
}
export function storyIllustration(features,kind,language){
 const{land,graticule}=worldShapes(features),fr=language==='fr';
 const labels={unfinished:fr?'Un atlas ouvert : une carte réelle, sans noms.':'An open atlas: real geography without place names.',authors:fr?'Les noms d’Elias Vale et d’Inès Varenne dans le même atlas.':'Elias Vale and Inès Varenne, together in one atlas.',perspectives:fr?'Une même géographie : ses frontières et ses lieux.':'One geography: its borders and its places.',decades:fr?'Des pages superposées et les noms des deux auteurs, estompés.':'Layered pages and the two authors’ fading names.',inheritance:fr?'Un atlas ouvert et dix folios d’expéditions inachevées, cinq sur chaque page.':'An open atlas with ten unfinished expedition folios, five on each page.',continuation:fr?'Les pages de l’atlas et la géographie qui les traverse.':'Atlas pages and the geography running through them.',borders:fr?'Des frontières actuelles apparaissent sur la carte réelle.':'Present-day borders emerge on the real map.',today:fr?'La carte contemporaine, prête à être explorée.':'A present-day map, ready to explore.',question:fr?'L’atlas et les noms d’Elias Vale et d’Inès Varenne.':'The atlas and the names Elias Vale and Inès Varenne.'};
 return `<svg class="story-folio-art art-${kind}" viewBox="0 0 920 720" role="img" aria-label="${labels[kind]}">
 <defs><clipPath id="story-land-clip"><rect x="70" y="145" width="780" height="435"/></clipPath><linearGradient id="story-paper" x2="1" y2="1"><stop stop-color="#29414a"/><stop offset="1" stop-color="#11232f"/></linearGradient><linearGradient id="story-spine"><stop stop-color="#081620"/><stop offset=".5" stop-color="#47605e"/><stop offset="1" stop-color="#081620"/></linearGradient></defs>
 <g class="story-page-stack" fill="none"><path d="M68 91 438 71Q460 77 482 71L852 91 858 631 485 653Q460 644 435 653L62 631Z"/><path d="M75 80 438 62Q460 68 482 62L845 80 851 620 485 641Q460 632 435 641L69 620Z"/></g>
 <path class="story-book-cover" d="M56 80 436 54Q460 62 484 54L864 80 864 621 485 656Q460 643 435 656L56 621Z"/>
 <path class="story-book-page" d="M68 70 438 46Q460 55 482 46L852 70V610L482 638Q460 625 438 638L68 610Z"/>
 <path class="story-page-rule" d="m89 92 348-23q23 8 46 0l348 23v498l-348 26q-23-11-46 0L89 590Z"/>
 <path class="story-spine" d="M451 54h18v576h-18z"/>
 <g clip-path="url(#story-land-clip)"><g class="story-map" transform="translate(130 150) scale(.73)"><g class="story-graticule">${graticule}</g><g class="story-real-land" fill-rule="evenodd">${land}</g></g></g>
 <g class="story-name-index"><path d="M116 541h190m-190 20h155m-155 20h173M574 541h200m-200 20h152m-152 20h180"/><circle cx="106" cy="541" r="1"/><circle cx="564" cy="541" r="1"/></g>
 <g class="story-authors"><path d="M121 492h248m183 0h248"/><text x="245" y="530" text-anchor="middle">Elias Vale</text><text x="675" y="530" text-anchor="middle">Inès Varenne</text><path d="M224 551h42m388 0h42"/></g>
 ${kind==='inheritance'?unfinishedExpeditions():`<g class="story-ten-folds" fill="none">${Array.from({length:10},(_,i)=>`<path d="M${130+i*64} 573v28l18-5v-25"/>`).join('')}</g>`}
 </svg>`;
}
