import {appearanceKey,companionPresence} from '../companion-presence.mjs';
import {validateContent} from './model.mjs';
import {openChapterProgress} from './progress.mjs';
import {mountChallenge} from './challenge.mjs';
import {scenes} from './scenes.mjs';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataURL=new URL('content.json',import.meta.url),worldURL=new URL('world-map.svg',import.meta.url);
let assets;
async function loadAssets(){if(!assets)assets=Promise.all([fetch(dataURL).then(r=>{if(!r.ok)throw Error('Unable to load shores');return r.json()}),fetch(worldURL).then(r=>{if(!r.ok)throw Error('Unable to load coastlines');return r.text()})]).then(([data,text])=>{const doc=new DOMParser().parseFromString(text,'image/svg+xml');const land=doc.querySelector('.land');if(!land)throw Error('Missing world coastline');return{content:validateContent(data),world:land.innerHTML}}).catch(e=>{assets=null;throw e});return assets}
const french={
 'Numbered grid from 1 to 36':'Grille numérotée de 1 à 36','Get a hint':'Obtenir un indice','Map view':'Vue de la carte','Zoom in':'Agrandir','Zoom out':'Réduire','Show a geographical clue':'Afficher un indice géographique',
 'Pin at':'Repère à','Region selected around':'Région sélectionnée vers','degrees':'degrés','north':'nord','south':'sud','east':'est','west':'ouest','Inspect this region to explore.':'Explorez cette région pour l’examiner.',
 'Number':'Nombre','starting coordinate':'repère initial','selected; tap to retrace from here':'sélectionné ; touchez pour reprendre le tracé ici','what comes next?':'quel nombre vient ensuite ?','traced':'tracés','of 12 positions traced':'repères tracés sur 12','Correct location.':'Position correcte.','The shore was missed and remains hidden. Retrace the line.':'La côte vous a échappé et reste cachée. Reprenez le tracé.',
 'Follow the pattern.':'Suivez la suite.',
 'The shore was missed.':'La côte vous a échappé.','It remains hidden.':'Elle reste cachée.','Retrace the line':'Reprenez le tracé','Find its place.':'Trouvez sa place.','A shore charted':'Une côte cartographiée',
 'Trace the next shore':'Tracez la côte suivante','Hint':'Un indice','A clue':'Un indice','World overview':'Vue du monde','Choose a region…':'Choisissez une région…','Select a region':'Choisissez une région','Inspect this region':'Explorer cette région','Selected region':'Région sélectionnée','The Atlas remembers.':'L’Atlas se souvient.','That shore lies elsewhere.':'Cette côte se trouve ailleurs.','The Atlas has not found this shore.':'L’Atlas n’a pas retrouvé cette côte.','Not the right region yet.':'Ce n’est pas encore la bonne région.','This shore could not be recorded. Try placing it again.':'Cette côte n’a pas pu être enregistrée. Essayez de la replacer.',
 'North America & Caribbean':'Amérique du Nord et Caraïbes','South America':'Amérique du Sud','Europe':'Europe','Africa':'Afrique','Asia':'Asie','Western Pacific & Oceania':'Pacifique occidental et Océanie','Central & eastern Pacific':'Pacifique central et oriental','South Atlantic & Indian Ocean':'Atlantique Sud et océan Indien'
};
export async function mountUncharted(root,{language='en',reduced=false,companion=null,onExit=()=>{}}={}){
 const {content,world}=await loadAssets();if(!root.isConnected)return{destroy(){},flush:async()=>{},setPreferences(){}};
 let prefs={language,reduced,companion},engine=null,current=null,screen='opening',destroyed=false,failed=false,ticket=0,operation=Promise.resolve();
 const local=(en,fr)=>prefs.language==='fr'?fr:en;
 const translate=s=>prefs.language==='fr'?(french[s]??s):s;
 root.classList.add('uncharted-root');
 if(!document.querySelector('link[data-uncharted-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('chapter.css',import.meta.url);style.dataset.unchartedStyle='';document.head.append(style)}
 function warning(){failed=true;const target=root.querySelector('.uw-save-warning');if(target){target.hidden=false;target.textContent=local('Progress cannot be saved on this device. Keep this page open.','La progression ne peut pas être enregistrée sur cet appareil. Gardez cette page ouverte.')}}
 const progress=await openChapterProgress(content,{onFailure:warning});
 const save=async(c,value)=>{const response=await progress.save(c,value);if(!response.persisted)warning();return response};
 async function flush(){if(engine&&current)await save(current,engine.snapshot());await progress.flush()}
 async function release(){await flush();engine?.destroy();engine=null;current=null}
 function focus(){root.querySelector('h1')?.setAttribute('tabindex','-1');root.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}
 function toolbar(index=null){return `<div class="uw-toolbar"><button type="button" data-uw="leave">${local('Return to My Atlas','Revenir à mon Atlas')}</button>${index!==null?`<button type="button" data-uw="opening">${local('Chapter','Le chapitre')}</button>${index>0?`<button type="button" data-uw="previous">${local('Previous shore','Côte précédente')}</button>`:''}`:''}</div><p class="uw-save-warning" role="status" hidden></p>`}
 function coordinate(value,positive,negative){
  const total=Math.round(Math.abs(value)*60),degrees=Math.floor(total/60),minutes=String(total%60).padStart(2,'0');
  return degrees+'°'+minutes+'′ '+(value>=0?positive:negative);
 }
 function islandPlate(c,featured=false){
  const pattern='uw-engraving-'+c.id,positionId='uw-position-'+c.id;
  const position=coordinate(c.probe[1],'N','S')+'  '+coordinate(c.probe[0],'E',local('W','O'));
  return `<button type="button" class="uw-charted-island${featured?' uw-hero-coast':''}" data-uw-open="${E(c.id)}" aria-label="${E(local('Revisit ','Revoir ')+c.copy[prefs.language].name)}" aria-describedby="${positionId}">
   <svg class="uw-coast-engraving" viewBox="${E(c.specimenBox)}" aria-hidden="true">
    <defs><pattern id="${pattern}" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M1 0V11" stroke="#c3c7a8" stroke-opacity=".5" stroke-width="1.3"/></pattern></defs>
    <path class="uw-coast-wash" d="${E(c.realCoast)}"/>
    <path class="uw-coastline" d="${E(c.realCoast)}" fill="url(#${pattern})" vector-effect="non-scaling-stroke"/>
   </svg>
   <span class="uw-island-caption"><span class="uw-island-name">${E(c.copy[prefs.language].name)}</span><span class="uw-island-position" id="${positionId}">${E(position)}</span></span>
  </button>`;
 }
 async function opening(pause=false){
  const turn=++ticket;await release();if(destroyed||turn!==ticket)return;screen=pause?'pause':'opening';root.classList.remove('wide-shore');root.classList.add('uw-overview');const state=await progress.state();if(destroyed||turn!==ticket)return;
  const finished=state.completed.length===content.plannedCount;
  const next=state.available.includes(state.lastId)&&!state.completed.includes(state.lastId)?state.lastId:state.available.find(id=>!state.completed.includes(id));
  const charted=state.completed.map(id=>content.challenges.find(c=>c.id===id));
  const latest=charted.at(-1),earlier=charted.slice(0,-1);
  const tally=local(state.completed.length+' of '+content.plannedCount+' shores charted',state.completed.length+' '+(state.completed.length===1?'côte cartographiée':'côtes cartographiées')+' sur '+content.plannedCount);
  root.innerHTML=toolbar()+`<section class="uw-folio${latest?'':' is-unbegun'}" aria-labelledby="uw-chapter-title">
   <div class="uw-spread">
    <header class="uw-folio-intro">
     <h1 id="uw-chapter-title">${finished?local('The last shore,<br><em>charted.</em>','La dernière côte,<br><em>cartographiée.</em>'):local('The Uncharted<br><em>World.</em>','Le Monde<br><em>inexploré.</em>')}</h1>
     <div class="uw-folio-invitation">${companionPresence(prefs.companion,'uw-companion')}
      <p class="story">${finished?local('The last line settles.','Le dernier trait s’apaise.'):local('Twenty islands lie beyond the familiar charts.<br>Trace their shores. Find where they belong.','Vingt îles restent à explorer.<br>Tracez leurs côtes. Trouvez leur place dans le monde.')}</p>
      <p class="uw-charted-tally" role="status">${E(tally)}</p>
      ${next?`<button class="primary uw-next-action" type="button" data-uw-open="${E(next)}">${local('Trace the next shore','Tracez la côte suivante')}</button>`:`<button class="primary uw-next-action" type="button" data-uw="leave">${local('Return to My Atlas','Revenir à mon Atlas')}</button>`}
     </div>
    </header>
    ${latest?islandPlate(latest,true):''}
   </div>
   ${earlier.length?`<div class="uw-charted-islands" role="group" aria-label="${local('Charted shores','Côtes cartographiées')}">${earlier.map(c=>islandPlate(c)).join('')}</div>`:''}
  </section>`;
  if(failed)warning();focus();
 }
 async function open(id,{replay=false}={}){
  const turn=++ticket;await release();const state=await progress.state();const base=content.challenges.find(c=>c.id===id);if(destroyed||turn!==ticket)return;
  if(!base||!state.available.includes(id)){await opening();return}
  root.classList.remove('uw-overview');current=base;screen='challenge';const index=content.availableOrder.indexOf(id),cfg={...base,...base.copy[prefs.language]};const saved=replay?null:await progress.draft(base);if(destroyed||turn!==ticket)return;
  root.classList.toggle('wide-shore',id==='uw-jamaica'||base.layout==='wide');root.innerHTML=toolbar(index)+scenes(cfg,world,index)+`<button class="quiet-help" type="button" data-uw="replay">${local('Retrace the line','Reprenez le tracé')}</button>`;
  engine=mountChallenge(root,cfg,{saved,reducedMotion:()=>prefs.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches,translate,
   onChange:snapshot=>{if(!destroyed)save(base,snapshot).catch(warning)},
   onComplete:async(snapshot,point)=>{const result=await progress.complete(base,snapshot,point);if(!result.persisted)warning();return result.value},
   onNext:()=>enqueue(async()=>{const next=content.availableOrder[index+1];if(next)await open(next);else await opening(true)})
  });
  for(const selector of ['#numberGrid','#hintButton','.map-tools','#zoomIn','#zoomOut','#locationHint']){const control=root.querySelector(selector);control.setAttribute('aria-label',translate(control.getAttribute('aria-label')))}
  const choice=root.querySelector('#chooseRegion');choice.setAttribute('aria-label',local('Choose a region to inspect','Choisir une région à explorer'));
  root.querySelector('#overviewSvg').setAttribute('aria-label',local('World overview. Select a region to inspect. Arrow keys move; Enter inspects.','Vue du monde. Sélectionnez une région à explorer. Les flèches déplacent le cadre ; Entrée l’ouvre.'));
  root.querySelector('#worldSvg').setAttribute('aria-label',local('Map. Drag or pinch to explore. Arrow keys move the pin, plus and minus zoom, Enter places.','Carte. Glissez ou pincez pour explorer. Les flèches déplacent le repère, plus et moins règlent le zoom, Entrée le place.'));
  if(failed)warning();focus();
 }
 function enqueue(fn){operation=operation.then(()=>destroyed?undefined:fn()).catch(e=>{console.error(e);warning()});return operation}
 const abort=new AbortController();root.addEventListener('click',e=>{
  const button=e.target.closest('[data-uw],[data-uw-open]');if(!button||button.disabled)return;
  enqueue(async()=>{if(button.dataset.uwOpen){await open(button.dataset.uwOpen);return}switch(button.dataset.uw){case'leave':await flush();onExit();break;case'opening':await opening();break;case'previous':await open(content.availableOrder[Math.max(0,content.availableOrder.indexOf(current?.id)-1)]);break;case'replay':await open(current.id,{replay:true});break}});
 },{signal:abort.signal});
 await opening();
 return{
  flush,
  async setPreferences(next){if(next.language===prefs.language&&next.reduced===prefs.reduced&&appearanceKey(next.companion)===appearanceKey(prefs.companion))return;return enqueue(async()=>{const id=current?.id,pause=screen==='pause';await flush();prefs=next;if(id)await open(id);else await opening(pause)})},
  destroy(){if(destroyed)return;root.classList.remove('uw-overview');destroyed=true;ticket++;abort.abort();if(engine&&current)save(current,engine.snapshot()).catch(()=>{});engine?.destroy();engine=null;progress.close().catch(()=>{})}
 };
}
