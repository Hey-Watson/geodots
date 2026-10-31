import {isPrivatePreview,hasCurrentCompletion} from './release-presentation.mjs';
import {chapterEntrance,journeyAvailability} from './chapter-entrance.mjs';
import {shouldStartIntroduction} from './story/content.mjs';
import {atlasCamera,animateCamera,cancelCamera} from './atlas-camera.mjs';
import {puzzleId,stageFor,nextUnsolved,expeditionProgress,freeCatalogue} from './core/puzzle.mjs';
import {fitProjection,countryCandidates} from './core/geography.mjs';
import {openStore} from './core/persistence.mjs';
import {createSession} from './core/session.mjs';
import {createProgressSession} from './legacy-progress.mjs';
import {COPY,PEOPLE} from './copy.mjs';
import {companionPresence} from './companion-presence.mjs';
import {journeyEntries} from './core/journey.mjs';
import {ceremony,cancelScene,travel,frameAtlasTravel} from './experience.mjs';
import {CONFIG} from './config.mjs';
import {earnedAtlasLandmarks} from './core/atlas.mjs';
import {atlasProjection,atlasLand,atlasState,atlasMarkerLayer,atlasControls,bindAtlasMap} from './atlas-view.mjs';
const atlasSimulation=CONFIG.preview===true&&CONFIG.productionApproved===false&&location.pathname==='/atlas-simulation.html';
let atlasComponents,atlasCoverage,suppressAtlasClickUntil=0;
import {hasIntegratedViewport,standardViewport,resizePuzzleCamera,scalePuzzleCamera} from './core/integrated-viewport.mjs';
import {validatePlan,regionFor,regionState as deriveRegionState} from './core/progression.mjs';
const $=id=>document.getElementById(id), E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thresholds=[0,5,20,45],media=matchMedia('(prefers-reduced-motion: reduce)');
let store,session,puzzles,grammar,landmarks,expeditions,regionPlan,revisionLedger,territoryMeta,revealGeometry=null,geometry=null,silhouettes={},records=[],catalogue;
let S={view:'play',index:0,draft:null,selected:null,language:'en',companion:null,reduced:false,message:'',zoom:{x:0,y:0,w:900,h:580},landmark:null,pin:null,mode:'pin',guessCountry:'',outcome:null,attemptId:null,archiveFilter:'all',archiveRegion:null,justEarned:null,panel:'clues',atlasGroup:'asia',inspect:null,clueScroll:0,nameScroll:0,dotScroll:0,progress:null,atlasRegion:'opening',pendingDiscovery:null,pendingEvolution:null,feedback:null,atlasMode:'landmarks',atlasRoutes:!atlasSimulation,focusRect:null,journeyFramed:false,journeyPortraitScale:1,journeyHeight:500};
let suppressClickUntil=0,discoveryTimer=null,navigationTicket=0;
let unchartedChapter=null,unchartedMountTicket=0;
let storyReader=null,storyMountTicket=0;
const entranceOptions=()=>({features:CONFIG.features,mainIds:(puzzles??[]).map(p=>p.id),completedIds:puzzles?completed():[],simulation:atlasSimulation});
const availability=()=>journeyAvailability(entranceOptions());
const entranceState=()=>chapterEntrance(entranceOptions());
const unchartedEnabled=()=>availability().chapter;
const finaleViews=new Set(['restored','folio','epilogue']);
const finaleAllowed=view=>view==='restored'?availability().choices:finaleViews.has(view)&&availability().finale;
const entranceView=()=>availability().choices?'restored':availability().finale?'folio':'uncharted';
let finaleReader=null,finaleMountTicket=0,finaleKind=null,finaleOpening=null,finaleOfferTimer=null,finaleOffering=false;
const finaleSeen=()=>Boolean(record('presentation:finale:sixtieth-chart'));
function scheduleFinaleOffer(){
 clearTimeout(finaleOfferTimer);
 if(finaleOffering||!availability().choices||finaleSeen()||S.view!=='atlas')return;
 const ticket=navigationTicket;
 finaleOfferTimer=setTimeout(async()=>{
  if(ticket!==navigationTicket||S.view!=='atlas'||!availability().choices||finaleSeen())return;
  if(document.hidden||busy||atlasExperienceBusy||!geometry||$('modal').open||$('ceremony')||!$('motionControl').hidden){scheduleFinaleOffer();return}
  finaleOffering=true;
  try{const shown=await saveResult(await session.presentation('finale','sixtieth-chart'));if(shown.first&&ticket===navigationTicket&&S.view==='atlas')await go('restored')}
  finally{finaleOffering=false}
 },220);
}
const sealedFolioVisible=()=>entranceState()==='locked';
let previousEntrance=null,unsealStarted=-Infinity;
function sealedFolioArt(unlocked=false){return `<svg class="sealed-folio-engraving ${unlocked?'folio-open':''}" viewBox="0 0 64 64" aria-hidden="true"><path class="folio-paper" d="M15 11 48 8v45l-33 3z"/><path d="M15 11c-5 0-7 3-7 7v33c0 4 3 7 7 5M12 17v32m5-31 24-2M18 45l22-2M20 22l13-1m-13 5 9-1M18 51l22-2M45 10v41M19 14v-3m0 40v3"/><path class="folio-strap" d="M49 29h9v8h-9"/><g class="folio-fastening"><path class="folio-clasp" d="m38 27 7-3 7 3v11l-7 4-7-4z"/><path d="m40 29 5-2 5 2v7l-5 3-5-3z"/><circle cx="45" cy="32" r="1.7"/><path d="M45 34v3"/></g></svg>`}


let busy=false,motionTimer=null,motionFollowup=null,motionTicket=0,saveFailure=false,geometryPromise,mapLoadError=false;
const t=key=>COPY[S.language][key]??key;
const name=n=>grammar[n]?(S.language==='fr'?grammar[n].french_name:n):(S.language==='fr'?'Ancienne réponse archivée':'Earlier answer archived');
const record=id=>records.find(r=>r.id===id);
const completed=()=>new Set(records.filter(r=>r.id.startsWith('completion:')&&puzzles.some(p=>p.id===r.puzzleId)).map(r=>r.puzzleId));
const tokens=()=>records.filter(r=>r.id.startsWith('token:'));
const exposed=()=>new Set(records.filter(r=>r.id.startsWith('exposure:')).map(r=>r.landmarkId));
const stage=()=>stageFor(completed());
const visibleStage=()=>S.pendingEvolution?S.pendingEvolution-1:stage();
let atlasExperienceBusy=false,modalOpener=null;
const notify=message=>{$('live').textContent='';requestAnimationFrame(()=>$('live').textContent=message)};
function warn(){saveFailure=true;if($('saveWarning')){$('saveWarning').hidden=false;$('saveWarning').textContent=t('notSaved')}}
async function refresh(){records=await store.records();if(regionPlan)S.progress=deriveRegionState(new Map(records.map(r=>[r.id,r])),regionPlan);if(!atlasSimulation&&!store.persistent)warn()}
async function fetchJSON(path){const response=await fetch(path);if(!response.ok)throw new Error(`${path}: ${response.status}`);return response.json()}
const route=()=>`#${S.view}${S.view==='play'?`/${S.index+1}`:S.view==='discovery'?`/${S.landmark}`:''}`;
function setRoute(){history.replaceState(null,'',route())}
function region(p){return regionFor(regionPlan,p.id)?.title[S.language]??p.originalRegion}
const allowed=index=>Boolean(S.progress?.regions.some(r=>r.open&&r.puzzleIds.includes(puzzleId(index))))||completed().has(puzzleId(index));
function nextPlayable(after=S.index){for(let step=1;step<=60;step++){const i=(after+step)%60;if(allowed(i)&&!completed().has(puzzleId(i)))return i}return null}
const known=l=>exposed().has(l.id);
const discoveryTitle=(l,i=landmarks.indexOf(l))=>known(l)?l.title[S.language]:`${local('Discovery','Découverte')} ${String(i+1).padStart(2,'0')}`;
function cancelDiscoveryTransition(){clearTimeout(discoveryTimer);S.pendingDiscovery=null}
function scheduleDiscovery(l){if(!l||known(l)||record(`challenge:${l.id}`))return;const attempt=S.draft.attemptId,ticket=navigationTicket;S.pendingDiscovery=l.id;discoveryTimer=setTimeout(()=>{if(ticket===navigationTicket&&S.view==='play'&&S.draft?.attemptId===attempt&&S.draft.solved)inviteDiscovery(l)},S.reduced||media.matches?100:1150)}
function primary(label,action,extra=''){return `<button class="primary" data-action="${action}" ${extra}>${E(label)}</button>`}
function overview(label,title,text,right=''){return `<div class="page-heading"><div><div class="eyebrow">${E(label)}</div><h1>${E(title)}</h1>${text?`<p class="lede">${E(text)}</p>`:''}</div>${right?`<div class="heading-right">${right}</div>`:''}</div>`}
const companionAppearance=()=>({id:S.companion,stage:visibleStage()});
function art(id=S.companion,s=visibleStage()){return `assets/${id}-${s+1}.jpg`}
async function inviteDiscovery(l){
 if(!l||known(l)||!isUnlocked(l))return;cancelDiscoveryTransition();await saveResult(await session.inviteDiscovery(l));
 dialog(local('A landmark awaits','Un lieu remarquable vous attend'),`<div class="discovery-invitation"><div class="invitation-mark" aria-hidden="true">✧</div><div class="eyebrow">${local('DISCOVERY UNLOCKED','NOUVELLE DÉCOUVERTE')}</div><p id="discoveryPrompt">${local('Can you find this remarkable place on the map?','Saurez-vous situer ce lieu remarquable sur la carte ?')}</p><button class="primary" autofocus data-begin-discovery="${landmarks.indexOf(l)}">${local('Begin Discovery','Commencer la découverte')}</button></div>`,{focusSelector:'[data-begin-discovery]',descriptionId:'discoveryPrompt'});
}
async function revealEvolution(){
 if(S.pendingEvolution===null||!S.companion)return;const next=S.pendingEvolution,id=S.companion,p=PEOPLE[id];S.pendingEvolution=null;
 const shown=await saveResult(await session.presentation('evolution',String(next)));if(!shown.first){render();return}
 await ceremony({kind:'evolution',reduced:S.reduced||media.matches,duration:1900,label:t('skipMotion'),html:`<div class="evolution-room"><div class="eyebrow">${local('A NEW BEARING','UN NOUVEAU CAP')}</div><h2 id="ceremonyTitle">${E(p[S.language])}</h2><div class="evolution-art"><img class="former-stage" src="${art(id,next-1)}" alt=""><div class="evolution-rings" aria-hidden="true"></div><img class="new-stage" src="${art(id,next)}" alt="${E(p.stages[S.language][next])}"></div><h3>${E(p.stages[S.language][next])}</h3><p>${thresholds[next]} ${t('completed')} · ${t('stage')} ${next+1}/4</p></div>`});render();notify(local('Your companion has evolved.','Votre compagnon a évolué.'));
}
function companionStrip(){
 if(!S.companion)return `<div class="companion-strip"><div class="companion-copy"><div class="eyebrow">${t('progress')}</div><h3>${t('noCompanion')}</h3></div><button class="secondary" data-action="companions">${t('chooseCompanion')}</button></div>`;
 const p=PEOPLE[S.companion],s=visibleStage();
 return `<div class="companion-strip" id="companionStrip" data-companion="${S.companion}"><img class="companion-art" src="${art()}" alt="${E(p[S.language])}, ${E(p.stages[S.language][s])}"><div class="companion-copy"><div class="eyebrow">${t('progress')}</div><h3>${E(p[S.language])} · ${E(p.stages[S.language][s])}</h3><div class="stage-track" aria-label="${t('stage')} ${s+1} / 4">${thresholds.map((n,i)=>`<i class="${i<=s?'active':''}"></i>`).join('')}</div><p>${s<3?`${t('nextStage')}: ${thresholds[s+1]} ${t('completed')}`:''}</p></div><button class="switch" data-action="companions">${t('switch')}</button><div class="companion-progress"><strong>${completed().size}<span class="num" style="font-size:15px;color:#a6ad9c"> / 60</span></strong><p>${t('completed')}</p></div></div>`;
}
function header(){
 document.documentElement.lang=S.language;document.body.classList.toggle('motion-off',S.reduced||media.matches);
 document.querySelector('.skip-link').textContent=local('Skip to content','Aller au contenu');$('nav').ariaLabel=local('Main navigation','Navigation principale');
 const entrance=entranceState(),justOpened=previousEntrance==='locked'&&entrance==='unlocked';if(justOpened)unsealStarted=performance.now();const unsealElapsed=performance.now()-unsealStarted;previousEntrance=entrance;
 $('nav').classList.toggle('has-bonus',entrance==='unlocked');$('nav').classList.toggle('has-teaser',entrance==='locked');
 $('nav').innerHTML=['play','atlas','cabinet',...(entrance==='unlocked'?[entranceView()]:[])].map(v=>`<button data-view="${v}" class="${S.view===v?'active':''} ${v===entranceView()?`folio-chapter-entry ${unsealElapsed<800?'folio-just-opened':''}`:''}" ${S.view===v?'aria-current="page"':''} ${v===entranceView()&&unsealElapsed<800?`style="--folio-elapsed:-${unsealElapsed}ms"`:''}>${v===entranceView()?sealedFolioArt(true)+`<span>${v==='restored'?local('The restored Atlas','L’Atlas restauré'):v==='folio'?local('The Final Folio','Le dernier folio'):local('The Uncharted World','Le Monde inexploré')}</span>`:t(v)}</button>`).join('')+(entrance==='locked'?`<button class="sealed-folio-entry" data-action="sealed-folio" aria-label="${local('A sealed folio','Un folio scellé')}" aria-haspopup="dialog">${sealedFolioArt()}</button>`:'');
 if(justOpened)notify(availability().finale?local('The Atlas opens.','L’Atlas s’ouvre.'):local('The Uncharted World','Le Monde inexploré'));
 $('language').textContent=S.language==='en'?'FR':'EN';$('language').ariaLabel=S.language==='en'?'Passer en français':'Switch to English';
 $('settings').textContent=t('settings');$('companionButton').innerHTML=S.companion?`<img src="${art()}" alt="">`:`<span class="initial">+</span>`;$('companionButton').ariaLabel=t('chooseCompanion');
 if($('storyButton')){$('storyButton').textContent=local('The Unfinished Atlas','L’Atlas inachevé');$('storyButton').disabled=!session;}$('previewLabel').textContent=isPrivatePreview(CONFIG)?t('preview'):'';$('previewLabel').closest('.preview-bar').hidden=!isPrivatePreview(CONFIG);$('footerMotto').textContent=t('motto');$('sourcesButton').textContent=t('sources');$('skipMotion').textContent=t('skipMotion');
 if(saveFailure){$('saveWarning').hidden=false;$('saveWarning').textContent=t('notSaved')}
}
let integratedViewport=null,integratedResizeObserver=null;
function puzzleFrame(p=puzzles?.[S.index]){return S.view==='play'&&hasIntegratedViewport(p)&&integratedViewport?integratedViewport:standardViewport()}
function fitIntegratedViewport(){
 integratedResizeObserver?.disconnect();
 if(S.view!=='play'||!hasIntegratedViewport(puzzles[S.index]))return;
 const surface=$('puzzleChart')?.querySelector('.chart-surface');if(!surface)return;
 const fit=()=>{const svg=$('graphMap');if(!svg||S.view!=='play'||!hasIntegratedViewport(puzzles[S.index]))return false;
  const rect=svg.getBoundingClientRect(),next={w:Math.round(rect.width),h:Math.round(rect.height)},old=integratedViewport??standardViewport();
  if(next.w<1||next.h<1||next.w===old.w&&next.h===old.h)return false;
  const focused=document.activeElement?.closest('.graph-node')?.dataset.node;
  S.zoom=resizePuzzleCamera(S.zoom,old,next);integratedViewport=next;svg.outerHTML=graphSVG();
  if(focused!==undefined)$('node-'+focused)?.focus({preventScroll:true});return true;
 };fit();integratedResizeObserver=new ResizeObserver(()=>{if(fit())bindMaps()});integratedResizeObserver.observe(surface);
}
function projectionForPuzzle(p){
 const points=p.nodes.map(n=>n.position),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
 const dx=Math.max(hiX-loX,4),dy=Math.max(hiY-loY,4),sx=dx*.14,sy=dy*.11;
 const frame=puzzleFrame(p);return fitProjection([Math.max(-179.9,loX-sx),Math.max(-80,loY-sy),Math.min(179.9,hiX+sx),Math.min(80,hiY+sy)],frame.w,frame.h,hasIntegratedViewport(p)?28:75);
}
function pathRing(ring,projection){return ring.map((point,i)=>{try{const [x,y]=projection.forward(point);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`}catch{return ''}}).join('')+'Z'}
function paths(geom,projection){const parts=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];return parts.map(rings=>rings.map(r=>pathRing(r,projection)).join('')).join('')}
function grid(){let str='';for(let x=0;x<=900;x+=75)str+=`<path class="graticule" d="M${x} 0V580"/>`;for(let y=0;y<=580;y+=58)str+=`<path class="graticule" d="M0 ${y}H900"/>`;return `<g aria-hidden="true">${str}<text x="40" y="43" class="north">N</text><path d="M45 76V50m-5 7 5-7 5 7" fill="none" stroke="#bda06d"/></g>`}
function graphSVG(){
 const p=puzzles[S.index],projection=projectionForPuzzle(p),points=p.nodes.map(n=>projection.forward(n.position));
 const solved=S.draft.solved;
 const outline=solved&&revealGeometry?p.nodes.map(n=>{const feature=revealGeometry.features.find(f=>f.properties.name===n.name);return feature?`<path class="reveal-country" d="${paths(feature.geometry,projection)}" fill-rule="evenodd"/>`:''}).join(''):'';
 const edges=p.edges.map(([a,b])=>{const i=p.nodes.findIndex(n=>n.name===a),j=p.nodes.findIndex(n=>n.name===b);return `<line class="border-edge" x1="${points[i][0]}" y1="${points[i][1]}" x2="${points[j][0]}" y2="${points[j][1]}"/>`}).join('');
 const nodes=p.nodes.map((n,i)=>{
  const nearest=Math.min(...points.filter((_,j)=>j!==i).map(q=>Math.hypot(q[0]-points[i][0],q[1]-points[i][1])));const hit=Math.min(55,nearest*.46),ring=Math.min(hasIntegratedViewport(p)?18:23,nearest*(hasIntegratedViewport(p)?.36:.31));const assigned=solved?n.name:S.draft.assignments[i],links=p.edges.flatMap(e=>e.includes(n.name)?[p.nodes.findIndex(candidate=>candidate.name===e.find(v=>v!==n.name))+1]:[]);
  const label=`${t('node')} ${i+1}. ${assigned?name(assigned):t('unassigned')}. ${t('linkedTo')} ${links.join(', ')}`;
  return `<g style="--hit:${hit}px;--ring:${ring}px;--number:${hasIntegratedViewport(p)?13:ring<18?12:18}px" class="graph-node ${S.selected===i?'selected':''} ${assigned?'assigned':''}" transform="translate(${points[i][0]},${points[i][1]})" role="button" tabindex="0" aria-label="${E(label)}" aria-pressed="${S.selected===i}" data-node="${i}" id="node-${i}"><circle class="node-hit" r="29"/><circle class="node-ring" r="16"/><text class="node-number" text-anchor="middle" y="4">${String(i+1).padStart(2,'0')}</text>${assigned?`<text class="node-label" text-anchor="middle" y="-28">${E(name(assigned))}</text>`:''}</g>`;
 }).join('');
 return `<svg class="chart" id="graphMap" viewBox="${S.zoom.x} ${S.zoom.y} ${S.zoom.w} ${S.zoom.h}" aria-label="${E(t('chart'))}" role="group">${grid()}<g>${outline}</g><g>${edges}</g>${nodes}</svg>`;
}
function chartTools(){return `<div class="chart-zoom"><button data-zoom="in" aria-label="${t('zoomIn')}">+</button><button data-zoom="out" aria-label="${t('zoomOut')}">−</button><button class="reset" data-zoom="reset" aria-label="${E(t('resetMap'))}">${local('Reset','Recentrer')}</button></div>`}
function currentRound(r){const e=revisionLedger.find(e=>e.id===r.puzzleId);return Boolean(e)&&(r.contentRevision??1)===e.proposedRevision&&[e.proposedHash,...(e.compatiblePreviousHashes??[])].includes(r.contentHash)}
function bestTime(){const values=records.filter(r=>r.id.startsWith(`round:${puzzleId(S.index)}:`)&&currentRound(r)).map(r=>r.elapsedSeconds).filter(Number.isFinite);return values.length?Math.min(...values):null}
function historicalBest(){const values=records.filter(r=>r.id.startsWith(`round:${puzzleId(S.index)}:`)) .map(r=>r.elapsedSeconds);try{const a=JSON.parse(record(`legacy:borderPuzzleBestTimes:${S.index}`)?.latestRaw??record(`legacy:borderPuzzleBestTimes:${S.index}`)?.raw??'[]');if(Array.isArray(a))values.push(...a)}catch{}const valid=values.filter(n=>Number.isFinite(n)&&n>=0);return valid.length?Math.min(...valid):null}

function feedbackText(){return S.feedback?.kind==='incorrect'?`${t('tryAgain')}${S.draft.checks>=4?` ${S.feedback.correct} / ${S.feedback.total} ${local(S.feedback.correct===1?'correct place':'correct places',S.feedback.correct===1?'bien placé':'bien placés')}.`:''}`:S.feedback?.kind==='conflict'?t('conflict'):S.message}
const local=(en,fr)=>S.language==='fr'?fr:en;
function tokenArt(l,classes='',sizes='(max-width: 760px) 42vw, 240px'){
 const base=`assets/token-${l.id}`;
 return `<img data-earned-art class="${classes}" src="${base}-320.webp" srcset="${base}-320.webp 320w, ${base}-640.webp 640w, ${base}-960.webp 960w" sizes="${sizes}" width="960" height="960" loading="lazy" decoding="async" alt="${E(l.title[S.language])}">`;
}
document.addEventListener('error',event=>{const img=event.target;if(!img.matches?.('img[data-earned-art]'))return;img.style.display='none';if(!img.parentElement.querySelector('.art-unavailable')){const message=document.createElement('p');message.className='art-unavailable';message.setAttribute('role','status');message.textContent=local('Your token is earned. Its engraving could not load.','Votre jeton est obtenu. Sa gravure n’a pas pu être chargée.');img.after(message)}},true);
function emptyMount(l,index){return `<div class="unrevealed-mount" aria-label="${E(t('notOwned'))}"><span class="mount-number">${String(index+1).padStart(2,'0')}</span><span class="mount-rule"></span></div>`}
function landmarkState(l){const owned=record(`token:${l.id}`),outcomes=records.filter(r=>r.id.startsWith('outcome:')&&r.landmarkId===l.id);return owned?t('alreadyOwned'):outcomes.some(o=>!o.revealOnly)?local('Attempt saved · no token','Tentative enregistrée · sans jeton'):exposed().has(l.id)?local('Story revealed · no token','Histoire révélée · sans jeton'):isUnlocked(l)?t('ready'):''}

function play(){
 const p=puzzles[S.index],id=p.id,complete=completed().has(id),bonus=landmarks.find(l=>l.puzzleIds.includes(id));
 const solved=S.draft.solved,used=Object.values(S.draft.assignments),offered=[...p.nodes.map(n=>n.name),...(p.decoys??[])].sort((a,b)=>name(a).localeCompare(name(b),S.language));
 const next=nextPlayable(),best=bestTime(),historic=historicalBest();
 const clues=`<div class="continuous-clue-heading"><h2>${local('Clues','Indices')}</h2><span class="num">${p.clues.length}</span><button data-action="geography-notes">${local('Geography notes','Notes géographiques')}</button></div><ol class="clue-list" tabindex="0" aria-label="${E(t('clues'))}">${(S.language==='fr'?p.clues_fr:p.clues).map((c,i)=>`<li><span class="num">${String(i+1).padStart(2,'0')}</span><span>${E(c)}</span></li>`).join('')}</ol>`;
 const names=`<div class="dot-selector" role="group" aria-label="${E(t('selected'))}">${p.nodes.map((n,i)=>`<button data-node="${i}" class="${S.selected===i?'selected':''} ${S.draft.assignments[i]?'filled':''}" aria-pressed="${S.selected===i}" aria-label="${E(t('node'))} ${i+1}: ${E(S.draft.assignments[i]?name(S.draft.assignments[i]):t('unassigned'))}">${i+1}</button>`).join('')}</div><p class="tray-instruction">${S.selected===null?t('chooseDot'):`${t('selected')} <strong>${S.selected+1}</strong>`}</p><div class="place-tray" role="group" aria-label="${E(t('places'))}">${offered.map(n=>`<button data-country="${E(n)}" ${S.selected===null?'disabled':''} class="${used.includes(n)?'used':''}" aria-label="${E(name(n))}${used.includes(n)?`, ${t('assigned')} ${Number(Object.keys(S.draft.assignments).find(k=>S.draft.assignments[k]===n))+1}`:''}">${E(name(n))}${used.includes(n)?`<span class="name-dot">${Number(Object.keys(S.draft.assignments).find(k=>S.draft.assignments[k]===n))+1}</span>`:''}</button>`).join('')}</div>`;
 const historicalNotice=S.draft.previousAttemptRecord?`<button class="history-note" data-action="history">${local('Earlier attempt · view history','Tentative antérieure · voir l’historique')}</button>`:'';
 return `<div class="play-heading"><div><span class="eyebrow">${t('chartRoom')}</span><p class="play-expedition">${E(region(p))}</p><div class="play-title-line"><h1>${t('puzzle')} ${String(S.index+1).padStart(2,'0')}</h1>${companionPresence(companionAppearance(),'chart-companion')}</div></div><button class="secondary" data-action="archive">${t('archive')}</button></div>${completed().size===60?`<div class="notice"><h3>${t('allComplete')}</h3><p>${t('allCompleteText')}</p></div>`:''}<div class="play-grid compact-play continuous-play"><div class="chart-column"><div class="chart-frame${hasIntegratedViewport(p)?' integrated-eurasia-chart':''}" id="puzzleChart"><div class="chart-head"><span>${t('scope')}</span><span>${p.nodes.length} ${local('PLACES','LIEUX')}</span></div><div class="chart-surface">${graphSVG()}</div><div class="chart-toolbar">${chartTools()}<button class="text-button" data-action="help">${t('how')}</button></div></div><details class="access-list"><summary>${t('accessList')}</summary><ol>${p.nodes.map((n,i)=>`<li><button data-node="${i}">${t('node')} ${i+1}</button>${E(S.draft.assignments[i]?name(S.draft.assignments[i]):t('unassigned'))} · ${t('linkedTo')} ${p.edges.flatMap(e=>e.includes(n.name)?[p.nodes.findIndex(candidate=>candidate.name===e.find(v=>v!==n.name))+1]:[]).join(', ')}</li>`).join('')}</ol></details></div><aside class="field-notes workspace-notes"><div class="clue-pane">${clues}</div>${!solved?`<div class="names-pane">${names}</div><div class="check-bar"><span class="assignment-count num">${used.length}/${p.nodes.length}</span>${primary(t('check'),'check')}<button class="text-button" data-action="clear">${local('Clear','Effacer')}</button></div><p class="status-line" role="status">${E(feedbackText())}</p>`:''}${historicalNotice}${complete?`<div class="result-panel"><div class="completion-marker">${t('completedOnce')}</div>${solved?`<h2 id="completionTitle" tabindex="-1">${t('complete')}</h2><p>${t('solvedText')}</p>`:`<p>${hasCurrentCompletion(records,id,revisionLedger)?local('Previously completed.','Carte déjà complétée.'):local('Previously completed. This chart has changed.','Carte déjà complétée. Son contenu a changé.')}</p>`}<div class="result-meta"><span><span class="num">${S.draft.checks}</span> ${S.draft.checks===1?t('checkOne'):t('checks')}</span>${best!==null?`<span>${local('Best on this chart','Meilleur temps sur cette carte')} <span class="num">${best}s</span></span>`:''}${historic!==null?`<span>${local('Earlier best','Ancien meilleur temps')} <span class="num">${historic}s</span></span>`:''}</div><div class="actions">${next!==null?primary(t('next'),'next'):`<button class="primary" data-view="atlas">${availability().choices&&!finaleSeen()?local('Continue','Continuer'):local('Choose an expedition','Choisir une expédition')}</button>`}${bonus?`<button class="secondary" data-open-discovery="${landmarks.indexOf(bonus)}">${t('discover')}</button>`:''}</div><button class="text-button" data-action="replay">${t('replay')}</button></div>`:''}</aside></div>${S.progress?.opportunities?`<div class="unlock-notice"><span>${local('An expedition choice is ready.','Vous pouvez choisir une nouvelle expédition.')}</span><button data-view="atlas">${local('Choose your next region','Choisir la prochaine région')} →</button></div>`:''}${companionStrip()}`;
}
function isUnlocked(l){return l.puzzleIds.some(id=>completed().has(id))}
function discoveryCards(){return landmarks.map((l,i)=>`<button class="discovery-card" data-open-discovery="${i}" ${isUnlocked(l)?'':'disabled'}><span class="eyebrow">${String(i+1).padStart(2,'0')}</span><h3>${E(discoveryTitle(l,i))}</h3>${landmarkState(l)?`<span class="availability">${E(landmarkState(l))}</span>`:''}</button>`).join('')}

const expeditionIntroductions={
 'opening':['An opening journey through South and Southeast Asia.','Une première exploration de l’Asie du Sud et du Sud-Est.'],
 'silk-road':['From Central Asia to the Caucasus and across Eurasia.','De l’Asie centrale au Caucase, à travers l’Eurasie.'],
 'eastern-mediterranean':['From the eastern Mediterranean to the Gulf and beyond.','De la Méditerranée orientale au Golfe et au-delà.'],
 'sahara-sahel':['Across the Sahara and Sahel to Africa’s Atlantic coast.','À travers le Sahara et le Sahel, jusqu’aux côtes atlantiques de l’Afrique.'],
 'congo-guinea':['West and Central Africa, from the Gulf of Guinea towards the Congo.','De l’Afrique de l’Ouest à l’Afrique centrale, du golfe de Guinée vers le Congo.'],
 'lakes-south':['From the Great Lakes through eastern and southern Africa.','Des Grands Lacs à l’Afrique de l’Est et à l’Afrique australe.'],
 'balkans':['The Balkans at the crossroads of Central and Southeast Europe.','Les Balkans, à la croisée de l’Europe centrale et du Sud-Est.'],
 'europe-crossroads':['Borders across Western, Central, Eastern and Northern Europe.','Les frontières de l’Europe de l’Ouest, du Centre, de l’Est et du Nord.'],
 'north-central-america':['From Canada and the United States through Mexico to Central America.','Du Canada et des États-Unis à l’Amérique centrale, en passant par le Mexique.'],
 'south-america':['From the Andes and Amazon to the southern cone.','Des Andes et de l’Amazonie au cône Sud.']
};
function atlasScope(r){const copy=expeditionIntroductions[r.id];return copy?local(...copy):r.scope[S.language]}
function atlasOptions(){
 const names=new Set(puzzles.filter(p=>regionFor(regionPlan,p.id)?.id===S.atlasRegion).flatMap(p=>p.nodes.map(n=>n.name)));
 return{features:atlasComponents.features,register:atlasCoverage,records,puzzles,ledger:revisionLedger,plan:regionPlan,landmarks,language:S.language,mode:S.atlasMode,simulation:atlasSimulation,routes:S.atlasRoutes,focus:new Set(atlasCoverage.entities.filter(e=>names.has(e.name)).map(e=>e.id))};
}
function atlasMarkers(camera,width,height){return atlasMarkerLayer({...atlasOptions(),camera,width,height})}
function bindCurrentAtlas(){bindAtlasMap($('atlasMap'),{reduced:()=>S.reduced||media.matches,markers:atlasMarkers,onCamera:c=>{S.focusRect=c.join(' ')},onDrag:()=>{suppressAtlasClickUntil=performance.now()+500}})}
function openAtlasDiscoveries(ids){
 const earned=earnedAtlasLandmarks(records,landmarks).find(l=>ids.length===1&&l.id===ids[0]);
 if(earned)inspectToken(landmarks.indexOf(earned));
}
function resetAtlasTravelFrame(){
 S.journeyFramed=false;const svg=$('atlasMap');svg?.style.removeProperty('height');svg?.closest('.atlas-world')?.classList.remove('travel-frame');
}
function moveAtlas(command){
 stopMotion();resetAtlasTravelFrame();const c=(S.focusRect??'0 0 900 500').split(' ').map(Number),p=atlasProjection();let next;
 if(command==='europe'){const a=p.forward([-26,72]),b=p.forward([42,34]),box=$('atlasMap')?.getBoundingClientRect(),aspect=box?.width&&box?.height?box.width/box.height:900/500,w=Math.max((b[0]-a[0])*1.15,(b[1]-a[1])*1.15*aspect),h=w/aspect;next=[(a[0]+b[0])/2-w/2,(a[1]+b[1])/2-h/2,w,h]}
 else next=atlasCamera(c,command==='in'?.75:command==='out'?4/3:1,command==='east'?c[2]*.12:command==='west'?-c[2]*.12:0,command==='south'?c[3]*.12:command==='north'?-c[3]*.12:0);
 S.journeyFramed=false;animateCamera($('atlasMap'),next,{reduced:S.reduced||media.matches});
}
function atlasMap(){
 if(!geometry)return `<div class="loading"><p>${mapLoadError?(S.language==='fr'?'La carte est indisponible. Les énigmes restent accessibles.':'The map is unavailable. Puzzles remain accessible.'):(S.language==='fr'?'Chargement de la géographie…':'Loading the geography…')}</p>${mapLoadError?`<button class="secondary" data-action="retry-map">${S.language==='fr'?'Réessayer':'Retry map'}</button>`:''}</div>`;
 const p=atlasProjection(),countries=atlasLand(atlasOptions()),camera=(S.focusRect??'0 0 900 500').split(' ').map(Number);
 const entries=journeyEntries(records),chartPoints=entries.map(r=>p.forward(r.waypoint.position));
 const route=chartPoints.length>1?`<path class="atlas-route" d="${chartPoints.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join('')}"/>`:'';
 const dots=chartPoints.map(([x,y],i)=>`<circle class="atlas-dot ${i===chartPoints.length-1?'latest-waypoint':''}" cx="${x}" cy="${y}" r="${i===chartPoints.length-1?6:3}"/>`).join('');
 const last=chartPoints.at(-1),companion=S.companion&&last?`<g id="journeyCompanion" transform="translate(${last.join(' ')})" role="img" aria-label="${E(PEOPLE[S.companion][S.language])} · ${local('latest chart waypoint','dernier point cartographié')} ${E(name(entries.at(-1).waypoint.name))}"><g class="companion-portrait" transform="scale(${S.journeyFramed?S.journeyPortraitScale:1})"><circle r="22" class="companion-map-ring"/><image href="${art()}" x="-19" y="-19" width="38" height="38" clip-path="url(#companionPortrait)" preserveAspectRatio="xMidYMid slice"/></g></g>`:'';
 return `<svg class="chart" id="atlasMap" ${S.journeyFramed?`style="height:${S.journeyHeight}px"`:""} viewBox="${S.focusRect??'0 0 900 500'}" role="group" tabindex="0" aria-describedby="atlasKeyboard" aria-label="${E(local('World Atlas with earned geographical coverage','Atlas mondial et géographie cartographiée'))}"><defs><clipPath id="atlasCameraClip" clipPathUnits="userSpaceOnUse"><rect id="atlasCameraRect" x="${camera[0]}" y="${camera[1]}" width="${camera[2]}" height="${camera[3]}"/></clipPath><clipPath id="companionPortrait"><circle r="19"/></clipPath></defs><g clip-path="url(#atlasCameraClip)">${countries}${S.atlasRoutes?route+dots:''}${companion}<g id="atlasMarkers"></g></g></svg>${entries.length?`<div class="latest-caption">${local('Latest waypoint','Dernier point cartographié')} · ${E(name(entries.at(-1).waypoint.name))}<span class="num">${new Date(entries.at(-1).completedAt).toLocaleDateString(S.language)}</span></div>`:''}`;
}
function chosenGeography(id){const r=regionPlan.regions.find(r=>r.id===id),names=new Set(puzzles.filter(p=>r.puzzleIds.includes(p.id)).flatMap(p=>p.nodes.map(n=>n.name))),projection=atlasProjection(),points=puzzles.filter(p=>r.puzzleIds.includes(p.id)).flatMap(p=>p.nodes.map(n=>projection.forward(n.position)));const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),w=Math.max(130,(Math.max(...xs)-Math.min(...xs))*1.45),h=Math.max(w*500/900,(Math.max(...ys)-Math.min(...ys))*1.45),width=Math.max(w,h*900/500),cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;return{region:r,names,projection,rect:[cx-width/2,cy-width*500/900/2,width,width*500/900]}}
async function regionCeremony(id){
 stopMotion();S.journeyFramed=false;atlasExperienceBusy=true;try{await ensureGeometry();const first=await saveResult(await session.presentation('region',`${regionPlan.id}:${id}`));if(!first.first)return;
 const {region:r,names,projection:p,rect}=chosenGeography(id);S.focusRect=rect.join(' ');
 const shapes=atlasComponents?.features.filter(f=>!f.properties.antarctica).map(f=>`<path data-component="${f.properties.id}" data-entity="${f.properties.entityId??''}" class="${names.has(f.properties.name)?'region-new':'region-context'}" vector-effect="non-scaling-stroke" fill-rule="evenodd" pathLength="1" d="${paths(f.geometry,p)}"/>`).join('')??'';
 await ceremony({kind:'region-opening',reduced:S.reduced||media.matches,duration:2600,label:t('skipMotion'),html:`<div class="region-scene"><svg viewBox="0 0 900 500" aria-hidden="true">${shapes}</svg><div class="region-title"><div class="eyebrow">${local('NEW EXPEDITION UNLOCKED','NOUVELLE EXPÉDITION OUVERTE')}</div><h2 id="ceremonyTitle">${E(r.title[S.language])}</h2><p>${local('Your next chapter begins here.','Un nouveau chapitre commence ici.')}</p></div></div>`,onFrame:(d,t)=>{const u=Math.min(1,t/.42),e=u*u*(3-2*u);d.querySelector('svg').setAttribute('viewBox',rect.map((v,i)=>[0,0,900,500][i]+(v-[0,0,900,500][i])*e).join(' '))}});
 }finally{atlasExperienceBusy=false}
}
async function atlasExperience(){
 if(atlasExperienceBusy||S.view!=='atlas'||!geometry||$('modal').open||$('ceremony')||document.hidden)return;
 if(busy){requestAnimationFrame(atlasExperience);return}
 atlasExperienceBusy=true;const ticket=navigationTicket;let retry=false;
 try{
  if(S.pendingEvolution!==null){await revealEvolution();if(ticket!==navigationTicket||S.view!=='atlas')return}
  const entries=journeyEntries(records),last=entries.at(-1);if(!last||record(`presentation:travel:${last.puzzleId}`))return;
  const p=atlasProjection(),points=entries.slice(-2).map(r=>p.forward(r.waypoint.position)),svg=$('atlasMap');
  if(S.companion&&svg){S.journeyFramed=true;const frame=frameAtlasTravel(svg,points);S.focusRect=frame.rect.join(' ');S.journeyPortraitScale=frame.portraitScale;S.journeyHeight=frame.height;await new Promise(requestAnimationFrame);if(!svg.isConnected){retry=true;return}if(ticket!==navigationTicket||S.view!=='atlas'||document.hidden||$('modal').open||$('ceremony'))return}
  const response=await saveResult(await session.presentation('travel',last.puzzleId));if(!response.first||ticket!==navigationTicket||S.view!=='atlas')return;
  if(S.companion){$('motionText').textContent=local('Charting a new waypoint','Un nouveau point sur votre carte');if(!S.reduced&&!media.matches)$('motionControl').hidden=false;travel($('journeyCompanion'),points,{reduced:S.reduced||media.matches,personality:S.companion,onDone:()=>{$('motionControl').hidden=true}})}
 }finally{atlasExperienceBusy=false;if(retry)queueMicrotask(atlasExperience)}
}

function atlas(){
 const state=S.progress,current=state.regions.find(r=>r.id===S.atlasRegion)??state.regions[0],nextId=current.puzzleIds.find(id=>!completed().has(id))??current.puzzleIds[0];
 return overview(t('atlas'),t('atlasTitle'),local('Where will you chart next?','Quelle région explorerez-vous ?'),`<div class="atlas-count"><strong>${completed().size}<span> / 60</span></strong><p>${t('completed')}</p></div>`)+`${state.opportunities?`<div class="unlock-notice"><p>${state.opportunities} ${local(state.opportunities===1?'expedition choice available.':'expedition choices available.',state.opportunities===1?'choix d’expédition disponible.':'choix d’expédition disponibles.')}</p></div>`:`<p class="progress-line">${state.nextMilestone!==null?`${completed().size} / ${state.nextMilestone} ${local('charts toward your next expedition','cartes pour votre prochaine expédition')}`:local('Every expedition is within reach.','Toutes les expéditions sont à votre portée.')}</p>`}${atlasControls(atlasOptions())}<div class="atlas-world ${S.journeyFramed?'travel-frame':''}"><div class="chart-frame atlas-map"><div class="chart-head atlas-map-heading"><button class="text-button" data-action="world-map">${local('Whole atlas','Tout l’atlas')}</button></div><div class="chart-surface">${atlasMap()}</div><div class="atlas-key"><span class="key-explored">${local('Charted through puzzles','Par les énigmes')}</span><span class="key-expedition">${local('Charted through expeditions','Par les expéditions')}</span><span>${local('Charting history · Landmark Discoveries','Cartes datées · découvertes de sites')}</span></div></div><div class="atlas-log"><span class="eyebrow">${current.open?local('SELECTED EXPEDITION','EXPÉDITION SÉLECTIONNÉE'):local('SEALED EXPEDITION','EXPÉDITION FERMÉE')}</span><h2>${E(current.title[S.language])}</h2><p>${current.completed} / ${current.puzzleIds.length} ${t('completed')}</p>${current.open?`<button class="primary" data-resume="${Number(nextId.slice(-3))-1}">${t('continue')} →</button>`:state.opportunities?`<button class="primary" data-region-choice="${current.id}">${local('Choose this region','Choisir cette région')}</button>`:`<p>${local('Complete more charts to open an expedition.','Complétez d’autres cartes pour ouvrir une expédition.')}</p>`}</div>${S.companion?`<div class="atlas-companion" id="companionStrip" data-companion="${S.companion}"><img class="companion-art" src="${art()}" alt="${E(PEOPLE[S.companion][S.language])}"><div><span class="eyebrow">${t('selectedCompanion')}</span><h3>${E(PEOPLE[S.companion][S.language])}</h3><p>${E(PEOPLE[S.companion].stages[S.language][visibleStage()])} · ${t('stage')} ${stage()+1}/4</p></div><button data-action="companions">${t('switch')}</button></div>`:`<div class="atlas-companion no-companion"><p>${t('noCompanion')}</p><button class="secondary" data-action="companions">${t('chooseCompanion')}</button></div>`}</div><div class="expedition-choices">${state.regions.map(r=>`<article class="expedition-choice ${r.open?'open':state.opportunities?'eligible':'sealed'}${r.open&&r.completed===r.puzzleIds.length?' completed':''}"><button class="expedition-select" data-region-focus="${r.id}" aria-pressed="${r.id===S.atlasRegion}"><span class="eyebrow">${r.open&&r.completed===r.puzzleIds.length?'<span aria-hidden="true" class="expedition-status-mark">✓</span> '+local('COMPLETE','ACHEVÉE'):r.open?local('OPEN','OUVERTE'):state.opportunities?local('YOUR CHOICE','À VOTRE CHOIX'):'<svg class="expedition-seal" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg> '+local('SEALED','FERMÉE')}</span><h3>${E(r.title[S.language])}</h3><p>${r.completed}/${r.puzzleIds.length} ${r.open?local('charts completed','cartes complétées'):local('charts','cartes')}</p></button><p class="expedition-scope">${E(atlasScope(r))}</p>${r.open?`<button class="secondary" data-expedition="${r.id}">${t('openExpedition')} →</button>`:state.opportunities?`<button class="primary" data-region-choice="${r.id}">${local('Open this expedition','Ouvrir cette expédition')}</button>`:''}</article>`).join('')}</div><div class="section-rule"><h2>${t('availableDiscoveries')}</h2></div><p class="discovery-collection-intro">${local('Remarkable places await throughout your expeditions.','Des lieux remarquables vous attendent au fil de vos expéditions.')}</p><div class="atlas-discoveries">${discoveryCards()}</div>${unchartedEnabled()?'<section id="atlasShores" aria-label="'+E(local('The Uncharted World','Le Monde inexploré'))+'" aria-busy="true"></section>':''}`;
}

function cabinet(){return overview(t('cabinet'),t('cabinetTitle'),'',`<div class="stat"><strong>${tokens().length}<span style="font-size:19px"> / ${landmarks.length}</span></strong><p>${t('tokenCount')}</p></div>`)+`<div class="collection-heading"><span class="eyebrow">${local('COLLECTION I','COLLECTION I')}</span></div><div class="cabinet-grid">${landmarks.map((l,i)=>{const owned=record(`token:${l.id}`),title=discoveryTitle(l,i);return `<article class="cabinet-cell ${owned?'owned':'unowned'}" id="cabinet-discovery-${i}"><button class="token-mount" data-inspect-discovery="${i}" aria-label="${E(local('Inspect','Examiner'))} ${E(title)}${landmarkState(l)?': '+E(landmarkState(l)):''}">${owned?tokenArt(l):emptyMount(l,i)}</button><span class="object-number num">${String(i+1).padStart(2,'0')} / ${landmarks.length}</span><h3>${E(title)}</h3>${landmarkState(l)?`<p class="ownership">${E(landmarkState(l))}${owned?' · '+E(owned.practice?local('Earned in practice','Obtenu à l’entraînement'):local('First-attempt success','Réussite au premier essai')):''}</p>`:''}<button class="inspect-link" data-inspect-discovery="${i}">${local('Inspect discovery','Examiner la découverte')} ↗</button></article>`}).join('')}</div>${companionStrip()}`}
function inspectToken(index){const l=landmarks[index],owned=l&&record(`token:${l.id}`),seen=l&&known(l);if(!l)return;dialog(discoveryTitle(l,index),`<div class="inspection">${owned?tokenArt(l,'inspection-art','(max-width: 760px) 70vw, 320px'):emptyMount(l,index)}<div><span class="eyebrow">${E(landmarkState(l))}</span>${seen?`<div class="fact"><p>${E(l.fact[S.language])}</p><a href="${E(l.factSource)}" target="_blank" rel="noopener">${t('source')} ↗</a></div>`:`<p>${local('A place and its story are waiting beyond the chart.','Un lieu et son histoire vous attendent au-delà de la carte.')}</p>`}<button class="secondary" data-open-discovery="${index}" ${isUnlocked(l)?'':'disabled'}>${seen?t('viewFact'):t('discover')}</button></div></div>`)}

function companions(){const earned=stage();return overview(t('companion'),t('companionTitle'),t('companionIntro'))+`<div class="people-grid">${Object.entries(PEOPLE).map(([id,p])=>`<article class="person-card ${S.companion===id?'selected':''}"><div class="hero"><img src="${art(id,visibleStage())}" alt="${E(p[S.language])}, ${E(p.stages[S.language][visibleStage()])}"></div><div class="person-body"><div class="eyebrow">${t('companion')}</div><h2>${E(p[S.language])}</h2><div class="stage-gallery">${thresholds.map((n,i)=>i<=visibleStage()?`<img src="${art(id,i)}" alt="${E(p.stages[S.language][i])}, ${n} ${t('completed')}" class="${i===visibleStage()?'current':''}">`:`<div class="stage-mystery" aria-label="${t('stage')} ${i+1}, ${n} ${t('completed')}"><span>${['I','II','III','IV'][i]}</span><small>${n}</small></div>`).join('')}</div><div class="current-stage">${t('stage')} ${visibleStage()+1} · ${E(p.stages[S.language][visibleStage()])}</div>${primary(`${t('travelWith')} ${p[S.language]}`,'choose-companion',`data-person="${id}"`)}</div></article>`).join('')}</div><div class="people-foot"><button class="secondary" data-action="no-companion">${t('none')}</button></div>`}
function regionFeatures(l){
 if(!geometry)return [];
 const [x1,y1,x2,y2]=l.bounds;
 return geometry.features.filter(f=>{const str=[];const walk=c=>typeof c[0]==='number'?str.push(c):c.forEach(walk);walk(f.geometry.coordinates);return str.some(([x,y])=>x>=x1&&x<=x2&&y>=y1&&y<=y2)});
}
function landmarkMap(l){
 if(!geometry)return `<div class="loading"><p>${mapLoadError?(S.language==='fr'?'La carte est indisponible. Vous pouvez choisir un pays.':'The map is unavailable. You can still choose a country.'):(S.language==='fr'?'Chargement de la carte…':'Loading the map…')}</p>${mapLoadError?`<button class="secondary" data-action="retry-map">${S.language==='fr'?'Réessayer':'Retry map'}</button>`:''}</div>`;
 const p=fitProjection(l.bounds),features=regionFeatures(l),countries=features.map(f=>`<path class="land" d="${paths(f.geometry,p)}" fill-rule="evenodd"/>`).join('');
 const pin=S.pin?p.forward(S.pin):null,target=S.outcome?p.forward(l.referencePoint):null;
 const line=pin&&target?`<line class="distance-line" x1="${pin[0]}" y1="${pin[1]}" x2="${target[0]}" y2="${target[1]}"/>`:'';
 const marker=pin?`<g transform="translate(${pin[0]},${pin[1]})"><circle class="guess-marker" r="7"/><path d="M0 -18V-10M0 10V18M-18 0H-10M10 0H18" stroke="#efd4a2" stroke-width="1.6"/></g>`:'';
 const actual=target?`<g transform="translate(${target[0]},${target[1]})"><circle class="target-marker" r="10"/><circle r="3" fill="#f4e5bb"/></g>`:'';
 return `<svg class="chart" id="landmarkMap" viewBox="${S.zoom.x} ${S.zoom.y} ${S.zoom.w} ${S.zoom.h}" role="group" tabindex="0" aria-label="${E(t('pinHint'))}. ${E(t('pinKeyboard'))}">${grid()}${countries}${line}${marker}${actual}</svg>`;
}
function discovery(){
 const l=landmarks.find(l=>l.id===S.landmark);if(!l)return '';
 const o=S.outcome,owned=record(`token:${l.id}`),canConfirm=S.mode==='country'?Boolean(S.guessCountry):Boolean(S.pin&&S.guessCountry);
 const options=(geometry?geometry.features.map(f=>f.properties.name):Object.keys(grammar)).sort((a,b)=>name(a).localeCompare(name(b),S.language));
 let result='';
 if(o){const heading=o.revealOnly?t('revealTitle'):owned?.attemptId===o.attemptId?t('earned'):local('Your recorded attempt','Votre tentative enregistrée');result=`<div class="outcome-tag">${o.revealOnly?t('reveal'):o.practice?t('practice'):t('first')}</div><h2 id="resultTitle" tabindex="-1">${heading}</h2>${owned?`<div class="token-well">${tokenArt(l,'token-art result-token','(max-width: 760px) 60vw, 255px')}</div>`:''}<p class="outcome-result">${o.eligibility==='decision-required'?t('practicePending'):owned?(owned.attemptId===o.attemptId?t('earnedText'):t('alreadyOwned')):t('missText')}</p>${o.distanceMeters!==null&&Number.isFinite(o.distanceMeters)?`<div class="pin-readout"><span>${t('distance')}</span><strong>${(o.distanceMeters/1000).toLocaleString(S.language,{maximumFractionDigits:1})} km</strong></div>`:''}<p class="recorded-guess">${local('Your answer','Votre réponse')}: ${o.answer?E(o.answer.mode==='pin'?`${o.answer.pin[1].toFixed(3)}°, ${o.answer.pin[0].toFixed(3)}° · ${name(o.answer.country)}`:name(o.answer.country)):t('reveal')}<br>${local('Reference territory','Territoire de référence')}: ${l.acceptedCountries.map(name).map(E).join(' / ')}</p><p class="precision-note">${t('referenceNote')}</p><div class="actions">${primary(t('next'),'next')}<button class="secondary" data-action="view-token">${t('viewToken')}</button></div><button class="text-button" data-action="practice">${t('newAttempt')}</button>`}
 else result=`<div class="attempt-status">${exposed().has(l.id)?t('practice'):t('first')}</div><div class="mode-tabs" role="group" aria-label="${E(t('discovery'))}"><button data-mode="pin" class="${S.mode==='pin'?'active':''}" aria-pressed="${S.mode==='pin'}">${t('pinMode')}</button><button data-mode="country" class="${S.mode==='country'?'active':''}" aria-pressed="${S.mode==='country'}">${t('countryMode')}</button></div>${S.mode==='pin'?`<p class="map-description">${t('pinHint')}</p><div class="pin-readout"><span>${t('yourPin')}</span><strong id="pinReadout">${S.pin?`${S.pin[1].toFixed(3)}°, ${S.pin[0].toFixed(3)}°`:t('unassigned')}</strong></div>`:`<p class="map-description">${t('countryNote')}</p>`}<label class="select-label" for="countrySelect">${S.mode==='pin'?t('confirmGuessCountry'):t('country')}</label><select id="countrySelect"><option value="">${t('chooseCountry')}</option>${options.map(n=>`<option value="${E(n)}" ${S.guessCountry===n?'selected':''}>${E(name(n))}</option>`).join('')}</select>${S.mode==='pin'&&S.pin&&!countryCandidates(S.pin,geometry?.features??[]).length?`<p class="boundary-note" role="status">${t('noCountry')}</p>`:''}${S.mode==='pin'?`<details class="boundary-note"><summary>${local('Near a coast or border?','Près d’une côte ou frontière ?')}</summary><p>${t('geometryNote')}</p><label for="pinLatitude">${local('Latitude (−90 to 90)','Latitude (−90 à 90)')}</label><input id="pinLatitude" type="number" min="-90" max="90" step="any" value="${S.pin?.[1]??''}"><label for="pinLongitude">${local('Longitude (−180 to 180)','Longitude (−180 à 180)')}</label><input id="pinLongitude" type="number" min="-180" max="180" step="any" value="${S.pin?.[0]??''}"><button data-action="coordinate-pin">${local('Place this pin','Placer ce repère')}</button></details>`:''}<div class="actions" style="margin-top:18px">${primary(S.mode==='pin'?t('confirm'):t('confirmCountry'),'confirm-landmark',canConfirm?'':'disabled')}</div>`;
 return `<div class="discovery-heading"><div><span class="eyebrow">${t('discovery')}</span><h1 id="discoveryTitle" tabindex="-1">${E(l.title[S.language])}</h1></div>${!o&&exposed().has(l.id)?`<p>${t('practicePending')}</p>`:''}</div>`+`<div class="discovery-grid"><div><div class="chart-frame landmark-map"><div class="chart-head"><span>${o?E(l.title[S.language]):t('yourPin')}</span><span>WGS84</span></div><div class="chart-surface">${landmarkMap(l)}</div><div class="chart-toolbar">${chartTools()}${!o?`<div class="map-arrow-controls" aria-label="${E(t('pinKeyboard'))}"><button data-pin-move="north" aria-label="${local('Move pin north','Déplacer vers le nord')}">↑</button><button data-pin-move="south" aria-label="${local('Move pin south','Déplacer vers le sud')}">↓</button><button data-pin-move="west" aria-label="${local('Move pin west','Déplacer vers l’ouest')}">←</button><button data-pin-move="east" aria-label="${local('Move pin east','Déplacer vers l’est')}">→</button></div>`:''}</div></div><p class="map-caption">Natural Earth</p></div><aside class="field-notes ${o?'result-panel-state':'attempt-panel'}" id="landmarkResult">${result}${o?`<div class="fact"><div class="eyebrow">${t('fact')}</div><p>${E(l.fact[S.language])}</p><a href="${E(l.factSource)}" target="_blank" rel="noopener">${t('source')} ↗</a></div>`:''}</aside></div>${companionStrip()}`;
}
/** Optional native bonus surface. Gate-off navigation and main-game rendering are unchanged. */
function renderUncharted(){
 const root=$('unchartedChapter');
 if(root&&unchartedChapter){unchartedChapter.setPreferences({language:S.language,reduced:S.reduced,companion:companionAppearance()});return}
 if(root)return;
 $('main').innerHTML='<section id="unchartedChapter" aria-label="'+E(local('The Uncharted World','Le Monde inexploré'))+'"><p role="status">'+local('Unfolding the next chart…','La carte se déplie…')+'</p></section>';
 const target=$('unchartedChapter'),ticket=++unchartedMountTicket;
 import('./uncharted/chapter.mjs').then(m=>ticket===unchartedMountTicket&&S.view==='uncharted'&&unchartedEnabled()?m.mountUncharted(target,{language:S.language,reduced:S.reduced,companion:companionAppearance(),onExit:()=>go('atlas')}):null).then(controller=>{if(!controller)return;if(ticket!==unchartedMountTicket||S.view!=='uncharted'||!unchartedEnabled()){controller.destroy();return}unchartedChapter=controller}).catch(error=>{if(target.isConnected){target.innerHTML='<h1>'+local('This chapter could not open','Ce chapitre n’a pas pu être ouvert')+'</h1><button data-view="atlas">'+local('Return to My Atlas','Revenir à mon Atlas')+'</button>'}console.error(error)});
}
function renderFinale(){
 const kind=S.view,root=$('seriesOneFinale');
 if(root&&finaleReader&&finaleKind===kind){if(finaleOpening==='choices'){finaleOpening=null;finaleReader.showChoices()}finaleReader.setPreferences({language:S.language,reduced:S.reduced||media.matches,companion:companionAppearance()});return}
 if(root&&finaleKind===kind)return;
 finaleReader?.destroy();finaleReader=null;finaleKind=kind;
 $('main').innerHTML='<div id="seriesOneFinale"><p role="status">'+local('Opening the Atlas…','L’Atlas s’ouvre…')+'</p></div>';
 const target=$('seriesOneFinale'),ticket=++finaleMountTicket,startAtChoices=finaleOpening==='choices';finaleOpening=null;
 const coverage=atlasState({...atlasOptions(),mode:'expeditions'}),labelNames=['Canada','Brazil','Peru','France','Finland','Russia','Egypt','South Africa','India','China'];
 const labels=labelNames.flatMap(name=>{const node=puzzles.filter(p=>coverage.validPuzzles.has(p.id)).flatMap(p=>p.nodes).find(n=>n.name===name);return node?[{...node,fr:grammar[name]?.french_name??name}]:[]});
 import('./finale/reader.mjs').then(m=>{
  if(ticket!==finaleMountTicket||S.view!==kind||!finaleAllowed(kind))return null;
  return m.mountFinale(target,{kind,startAtChoices,language:S.language,reduced:S.reduced||media.matches,companion:companionAppearance(),features:atlasComponents.features,puzzles,plan:regionPlan,chartedEntities:coverage.chartedEntities,labels,choices:availability().choices,chapter:availability().chapter,
   onExit:()=>go('atlas'),onChoices:()=>go('restored','choices'),onExplore:()=>go('uncharted'),onFolio:()=>go('folio'),
   onEpilogue:async()=>{await saveResult(await session.presentation('finale','letter-read'));await go('epilogue')},
   onFinish:async()=>{await saveResult(await session.presentation('finale','epilogue-read'));await go('atlas')}
  });
 }).then(controller=>{if(!controller)return;if(ticket!==finaleMountTicket||S.view!==kind||!finaleAllowed(kind)){controller.destroy();return}finaleReader=controller;if(kind==='restored'&&finaleOpening==='choices'){finaleOpening=null;controller.showChoices()}}).catch(error=>{console.error(error);if(target.isConnected)target.innerHTML=`<h1>${local('These pages could not open','Ces pages n’ont pas pu s’ouvrir')}</h1><button data-view="atlas">${local('Return to My Atlas','Revenir à mon Atlas')}</button>`});
}
function renderStory(){
 const root=$('storyIntroduction');
 if(root&&storyReader){storyReader.setPreferences({language:S.language,reduced:S.reduced,companion:companionAppearance()});return}
 if(root)return;
 $('main').innerHTML=`<div id="storyIntroduction"><p role="status">${local('Opening the Atlas…','L’Atlas s’ouvre…')}</p></div>`;
 const target=$('storyIntroduction'),ticket=++storyMountTicket;
 import('./story/reader.mjs').then(m=>m.mountStory(target,{features:atlasComponents.features,language:S.language,reduced:S.reduced,companion:companionAppearance(),onOpen:()=>go('atlas'),onSkip:()=>go('atlas')})).then(controller=>{if(ticket!==storyMountTicket||S.view!=='story'){controller.destroy();return}storyReader=controller}).catch(error=>{console.error(error);if(target.isConnected)target.innerHTML=`<h1>${local('The introduction could not open','L’introduction n’a pas pu s’ouvrir')}</h1><button class="primary" data-view="atlas">${local('Open the Atlas','Ouvrir l’Atlas')}</button>`});
}
function render({focus=false}={}){
 if(S.view==='uncharted'&&!unchartedEnabled()||finaleViews.has(S.view)&&!finaleAllowed(S.view))S.view='atlas';
 const sameChart=S.view==='play'&&$('main').dataset.puzzle===puzzleId(S.index),previousClues=sameChart&&$('main').dataset.language===S.language?document.querySelector('.clue-pane'):null;
 if(S.view==='play'&&$('main').dataset.puzzle===puzzleId(S.index)){const c=document.querySelector('.clue-list'),n=document.querySelector('.place-tray'),d=document.querySelector('.dot-selector');if(c)S.clueScroll=c.scrollTop;if(n)S.nameScroll=n.scrollTop;if(d)S.dotScroll=d.scrollLeft}
 $('main').dataset.puzzle=S.view==='play'?puzzleId(S.index):'';$('main').dataset.language=S.language;
 document.body.dataset.surface=S.view;const active=document.activeElement?.id, activeAction=document.activeElement?.dataset?.action, activeCountry=document.activeElement?.dataset?.country;header();
 offlineStatus();
 if(finaleViews.has(S.view)&&finaleAllowed(S.view)){storyMountTicket++;storyReader?.destroy();storyReader=null;unchartedMountTicket++;unchartedChapter?.destroy();unchartedChapter=null;renderFinale();setRoute();return}
 finaleMountTicket++;finaleReader?.destroy();finaleReader=null;finaleKind=null;
 if(S.view==='story'){unchartedMountTicket++;unchartedChapter?.destroy();unchartedChapter=null;renderStory();setRoute();return}
 storyMountTicket++;storyReader?.destroy();storyReader=null;
 if(S.view==='uncharted'&&unchartedEnabled()){renderUncharted();setRoute();return}
 unchartedMountTicket++;unchartedChapter?.destroy();unchartedChapter=null;
 $('main').innerHTML=S.view==='play'?play():S.view==='atlas'?atlas():S.view==='cabinet'?cabinet():S.view==='companions'?companions():discovery();
 if(previousClues)document.querySelector('.clue-pane')?.replaceWith(previousClues);const clueList=document.querySelector('.clue-list');if(clueList)clueList.scrollTop=S.clueScroll;const tray=document.querySelector('.place-tray'),dots=document.querySelector('.dot-selector');if(tray)tray.scrollTop=S.nameScroll;if(dots){dots.scrollLeft=S.dotScroll;const selected=dots.querySelector('.selected');if(selected){const a=selected.getBoundingClientRect(),b=dots.getBoundingClientRect();if(a.right>b.right)dots.scrollLeft+=a.right-b.right;if(a.left<b.left)dots.scrollLeft-=b.left-a.left;S.dotScroll=dots.scrollLeft}}fitIntegratedViewport();bindMaps();bindCurrentAtlas();setRoute();if(S.view==='atlas'){queueMicrotask(atlasExperience);const shores=$('atlasShores');if(shores)import('./uncharted/atlas-collection.mjs').then(m=>{if(shores.isConnected&&S.view==='atlas'&&unchartedEnabled())return m.renderAtlasShores(shores,{language:S.language})}).catch(error=>{console.error(error);if(shores.isConnected){shores.removeAttribute('aria-busy');shores.textContent=local('Charted shores could not be loaded.','Les côtes cartographiées n’ont pas pu être chargées.')}})}if(focus)$('main').focus({preventScroll:true});else if(active&&$(active))$(active).focus({preventScroll:true});else if(activeCountry)document.querySelector(`[data-country="${CSS.escape(activeCountry)}"]`)?.focus({preventScroll:true});else if(activeAction)document.querySelector(`[data-action="${activeAction}"]`)?.focus({preventScroll:true});
}
function clearMotionState(){document.querySelectorAll('.animate-map,.animate-token,.animate-companion,.animate-seal').forEach(e=>e.classList.remove('animate-map','animate-token','animate-companion','animate-seal'));$('motionControl').hidden=true}
function stopMotion(){cancelCamera($('atlasMap'));cancelScene();motionTicket++;clearTimeout(motionTimer);clearTimeout(motionFollowup);clearMotionState()}
async function motion(kind,target,duration){stopMotion();const ticket=motionTicket;if(S.reduced||media.matches||document.hidden||!target)return;const image=target.querySelector('.result-token');if(image){try{await image.decode()}catch{}}if(ticket!==motionTicket||!target.isConnected||S.reduced||media.matches)return;target.classList.add(`animate-${kind}`);$('motionText').textContent=kind==='seal'?local('Opening an expedition','Ouverture d’une expédition'):t(kind==='map'?'mapReveal':kind==='token'?'tokenReveal':'companionMove');$('motionControl').hidden=false;motionTimer=setTimeout(clearMotionState,duration)}
async function saveResult(response){if(!atlasSimulation&&!response.persisted)warn();await refresh();channel?.postMessage({changed:true});return response.value}
async function go(view,index=null){
 if(view==='uncharted'&&!unchartedEnabled()||finaleViews.has(view)&&!finaleAllowed(view)){setRoute();return}
 clearTimeout(finaleOfferTimer);
 if(view==='restored')finaleOpening=index==='choices'?'choices':null;
 if(S.view==='uncharted')await unchartedChapter?.flush();
 navigationTicket++;cancelDiscoveryTransition();stopMotion();S.message='';S.feedback=null;S.selected=null;S.zoom={x:0,y:0,w:900,h:580};integratedViewport=null;
 if(S.pendingEvolution!==null&&view!=='discovery'&&view!=='story')await revealEvolution();
 if(finaleViews.has(view))await saveResult(await session.presentation('finale','sixtieth-chart'));
 if(view==='story')await saveResult(await session.presentation('introduction','series-one'));
 if(view==='play'){
  if(index!==null&&index!==S.index){S.clueScroll=0;S.nameScroll=0;S.dotScroll=0}if(index!==null)S.index=index;
  const result=await session.load(S.index);await refresh();
  if(result.value.locked){S.view='atlas';S.atlasRegion=result.value.regionId??'opening';S.message=local('This expedition is still sealed. Choose an eligible region in your Atlas.','Cette expédition est encore fermée. Choisissez une région accessible dans votre Atlas.');ensureGeometry();render({focus:true});notify(S.message);window.scrollTo(0,0);return}
  S.draft=result.value;if(S.draft.solved)ensureReveal();
 }
 S.view=view;if(view==='atlas'){await ensureGeometry()}render({focus:true});window.scrollTo({top:0,behavior:'instant'});if(view==='atlas')scheduleFinaleOffer();
}
async function openLandmark(id,{source='manual'}={}){
 const l=landmarks.find(l=>l.id===id);if(!l||!isUnlocked(l))return;
 const ticket=++navigationTicket;cancelDiscoveryTransition();stopMotion();const response=await saveResult(await session.beginDiscovery(l,{source,puzzleAttemptId:S.draft?.attemptId??null}));if(!response.ok||ticket!==navigationTicket)return;
 S.view='discovery';S.landmark=id;S.pin=null;S.guessCountry='';S.mode='pin';S.zoom={x:0,y:0,w:900,h:580};
 applyDiscovery(response);ensureGeometry();render({focus:true});$('discoveryTitle')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
}
function applyDiscovery(response){const draft=response.draft;S.outcome=response.outcome??null;S.attemptId=response.state.attemptId;S.pin=draft?.pin??null;S.guessCountry=draft?.guessCountry??'';S.mode=draft?.mode??'pin'}
function syncDiscovery(){if(S.view!=='discovery')return;const state=record(`discovery-state:${S.landmark}`);if(!state)return;if(state.attemptId!==S.attemptId||state.status==='confirmed'&&!S.outcome)applyDiscovery({state,draft:record(`discovery-draft:${S.landmark}`),outcome:state.outcomeId?record(state.outcomeId):null})}
async function ensureReveal(){if(!revealGeometry){try{revealGeometry=await fetchJSON('data/reveal-territories.geojson');if(S.view==='play'&&S.draft?.solved)render()}catch{}}}

function ensureGeometry(){if(geometry)return Promise.resolve(geometry);if(!geometryPromise)geometryPromise=fetchJSON('data/world-review.geojson').then(g=>{mapLoadError=false;geometry=g;if(['atlas','discovery'].includes(S.view))render();return g}).catch(()=>{geometryPromise=null;mapLoadError=true;if(['atlas','discovery'].includes(S.view))render();notify(S.language==='fr'?'La carte n’a pas pu être chargée.':'The map could not be loaded.');return null});return geometryPromise}
function dialog(title,content,{focusSelector=null,descriptionId=null}={}){
 stopMotion();const modal=$('modal');if(!modal.open)modalOpener=document.activeElement;
 modal.innerHTML=`<div class="dialog-head"><h2 id="modalTitle">${E(title)}</h2><button data-action="close" aria-label="${t('close')}">×</button></div>${content}`;modal.setAttribute('aria-modal','true');if(descriptionId)modal.setAttribute('aria-describedby',descriptionId);else modal.removeAttribute('aria-describedby');
 if(!modal.open)modal.showModal();(modal.querySelector(focusSelector??'[autofocus],button,input,select,a[href]'))?.focus({preventScroll:true});
}
$('modal').addEventListener('close',()=>queueMicrotask(()=>{const active=document.activeElement;if(!$('modal').open&&(active===document.body||active?.classList.contains('skip-link')||$('modal').contains(active))){const opener=modalOpener?.isConnected&&!modalOpener.classList?.contains('skip-link')?modalOpener:$('completionTitle')??$('main');opener?.focus({preventScroll:true})}}));
function archive(){
 const selected=S.archiveRegion?regionPlan.regions.find(e=>e.id===S.archiveRegion):null,ids=selected?.puzzleIds;
 dialog(t('choosePuzzle'),`<div class="archive-filter">${['all','done','inProgress'].map(f=>`<button data-filter="${f}" class="${S.archiveFilter===f?'active':''}">${t(f)}</button>`).join('')}</div><div class="archive-grid">${puzzles.map((p,i)=>{const done=completed().has(p.id),draft=record(session.draftKey(i)),show=(!ids||ids.includes(p.id))&&(S.archiveFilter==='all'||S.archiveFilter==='done'&&done||S.archiveFilter==='inProgress'&&draft&&!draft.solved&&Object.keys(draft.assignments??{}).length);return show?`<button data-puzzle="${i}" ${allowed(i)?'':'disabled'} class="${done?'completed':''} ${i===S.index?'current':''} ${allowed(i)?'available':'sealed'}" aria-label="${t('puzzle')} ${i+1}, ${E(region(p))}, ${done?t('done'):allowed(i)?local('available','disponible'):local('sealed','fermée')}">${String(i+1).padStart(2,'0')}${allowed(i)?'':'<span aria-hidden="true">·</span>'}</button>`:''}).join('')}</div><button class="secondary" data-view="atlas">${local('Choose an expedition in My Atlas','Choisir une expédition dans Mon Atlas')}</button>`);
}
function geographyNotes(){const p=puzzles[S.index];dialog(local('Geography of this chart','Géographie de cette carte'),`<p>${local('Lines show real land borders between the named countries or approved territories, including borders along rivers and lakes. Sea crossings and point contacts do not count. Each country has one name, including its separated parts. “Only” and connection counts refer to the dots shown on this chart.','Les lignes indiquent de vraies frontières terrestres entre les pays ou territoires retenus, y compris sur un fleuve ou un lac. Les traversées maritimes et les simples contacts ponctuels ne comptent pas. Chaque pays porte un seul nom, y compris ses parties séparées. « Uniquement » et le nombre de liaisons concernent les points de cette carte.')}</p><ul>${p.geographicNotes.map(n=>`<li><strong>${E(name(n.territory))}</strong>: ${E(S.language==='fr'?n.statusFr:n.status)}</li>`).join('')}</ul><a href="https://geodata.state.gov/geonetwork/srv/api/records/3bdb81a0-c1b9-439a-a0b1-85dac30c59b2" target="_blank" rel="noopener">${local('Boundary reference','Référence géographique')}</a>`)}

async function updateDraft(action){S.conflict=false;const value=await saveResult(await session.update(puzzles[S.index],S.draft,action));if(value.conflict){S.conflict=true;if(value.draft)S.draft=value.draft;S.feedback={kind:'conflict'};S.message=t('conflict');notify(S.message);return null}S.draft=value.draft;return value.result}
async function handleAction(button){
 const a=button.dataset.action;
 if(a==='story'){$('modal').close();await go('story');return}
 if(a==='sealed-folio'){if(!sealedFolioVisible())return;dialog(local('A sealed folio','Un folio scellé'),`<div class="sealed-folio-teaser">${sealedFolioArt()}<p id="sealedFolioMessage">${local('Some pages of the Atlas remain sealed.','Certaines pages de l’Atlas restent scellées.')}</p></div>`,{descriptionId:'sealedFolioMessage'});return}
 if(a==='close'){$('modal').close();return}
 if(a==='geography-notes'){geographyNotes();return}
 if(a==='history'){dialog(local('Preserved attempt history','Historique de tentative conservé'),`<p>${local('Your earlier attempt, time and achievements are kept. This chart has changed, so its answers start afresh.','Votre tentative antérieure, son temps et ses récompenses sont conservés. Cette carte a changé : les réponses sont à retrouver.')}</p>`);return}
 if(a==='retry-map'){mapLoadError=false;ensureGeometry();render();return}
 if(a==='archive'){S.archiveFilter='all';S.archiveRegion=null;archive();return}
 if(a==='help'){dialog(t('how'),`<p>${t('step1')}</p><p style="margin-top:15px">${t('step2')}</p><p style="margin-top:15px">${t('step3')}</p><p class="scope-note">${t('step4')}</p><div class="actions">${primary(t('start'),'close')}</div>`);return}
 if(a==='clear'){await updateDraft({type:'clear'});S.selected=null;if(!S.conflict){S.message='';S.feedback=null}render();return}
 if(a==='check'){
  cancelDiscoveryTransition();const before=stage();const result=await updateDraft({type:'check'});if(S.conflict){render();return}S.feedback=result&&!result.solved?{kind:'incorrect',correct:result.correct,total:result.total}:null;S.message=result&&!result.solved?feedbackText():'';if(stage()>before&&S.companion&&!record(`presentation:evolution:${stage()}`))S.pendingEvolution=stage();render();notify(result?.solved?t('complete'):S.message);if(result?.solved){const ticket=navigationTicket,bonus=landmarks.find(l=>l.puzzleIds.includes(puzzles[S.index].id)),willDiscover=bonus&&!known(bonus)&&!record(`challenge:${bonus.id}`);ensureReveal().then(()=>{if(ticket!==navigationTicket||S.view!=='play')return;motion('map',$('puzzleChart'),1050);if(S.pendingEvolution!==null&&!willDiscover)motionFollowup=setTimeout(()=>{if(ticket===navigationTicket&&S.view==='play')revealEvolution()},1100)});scheduleDiscovery(bonus)}return;
 }
 if(a==='replay'){cancelDiscoveryTransition();await updateDraft({type:'replay',index:S.index});S.selected=null;if(!S.conflict){S.message='';S.feedback=null}render();return}
 if(a==='next'){const next=nextPlayable(S.index);if(next!==null)await go('play',next);else{await go('atlas');notify(completed().size===60?t('allComplete'):local('Choose your next expedition.','Choisissez votre prochaine expédition.'))}return}
 if(a==='companions'){await go('companions');return}
 if(a==='choose-companion'||a==='no-companion'){S.companion=a==='no-companion'?null:button.dataset.person;if(!S.companion)S.pendingEvolution=null;await saveResult(await session.preference('companion',S.companion));const last=journeyEntries(records).at(-1),passagePending=Boolean(S.companion&&last&&!record(`presentation:travel:${last.puzzleId}`));await go('atlas');if(passagePending)return;const target=$('companionStrip');if(target&&S.companion){target.setAttribute('tabindex','-1');target.setAttribute('aria-label',`${PEOPLE[S.companion][S.language]}, ${PEOPLE[S.companion].stages[S.language][visibleStage()]}`);target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true})}motion('companion',target,1100);return}
 if(a==='confirm-landmark'||a==='reveal'){
  if(S.outcome)return;
  if(a==='confirm-landmark'&&S.mode==='pin'&&S.pin&&geometry){const candidates=countryCandidates(S.pin,geometry.features);if(candidates.length===1)S.guessCountry=candidates[0]}
  const l=landmarks.find(l=>l.id===S.landmark),answer=a==='reveal'?null:{mode:S.mode,country:S.guessCountry,...(S.mode==='pin'?{pin:S.pin}:{})};
  if(a!=='reveal'&&(!S.guessCountry||(S.mode==='pin'&&!S.pin)))return;
  const priorToken=record(`token:${l.id}`);
  const outcome=await saveResult(await session.confirmLandmark(l,S.attemptId,answer,{practiceTokens:CONFIG.practiceTokens,revealOnly:a==='reveal'}));if(outcome.blocked){syncDiscovery();render();notify(t('conflict'));return}S.outcome=outcome;
  render();$('resultTitle')?.focus({preventScroll:true});notify(record(`token:${l.id}`)?t('earned'):t('miss'));
  if(!priorToken&&record(`token:${l.id}`)){S.justEarned=l.id;motion('token',$('landmarkResult'),1900)}
  return;
 }
 if(a==='view-token'){await go('cabinet');const target=$(`cabinet-discovery-${landmarks.findIndex(l=>l.id===S.landmark)}`);if(target){target.scrollIntoView({block:'center',behavior:'instant'});motion('token',target,1400)}return}
 if(a==='skip-landmark'){await go('play');return}
 if(a==='world-map'){stopMotion();resetAtlasTravelFrame();animateCamera($('atlasMap'),[0,0,900,500],{reduced:S.reduced||media.matches});return}
 if(a==='practice'){const l=landmarks.find(l=>l.id===S.landmark),response=await saveResult(await session.beginDiscovery(l,{source:'practice',practice:true}));if(response.ok)applyDiscovery(response);render();return}
 if(a==='coordinate-pin'){const lat=$('pinLatitude'),lon=$('pinLongitude');if(lat.value!==''&&lon.value!==''&&lat.reportValidity()&&lon.reportValidity()){setPin([Number(lon.value),Number(lat.value)]);$('countrySelect')?.focus({preventScroll:true})}return}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button,[data-node],[data-atlas-discoveries]');if(!button||button.disabled)return;if(button.dataset.node!==undefined&&event.detail!==0&&performance.now()<suppressClickUntil&&(!(S.view==='play'&&hasIntegratedViewport(puzzles[S.index]))||button.closest('#graphMap')))return;
 const perform=async()=>{
  if(button.dataset.atlasDiscoveries){if(event.detail!==0&&performance.now()<suppressAtlasClickUntil)return;openAtlasDiscoveries(button.dataset.atlasDiscoveries.split(','));return}
  if(button.dataset.atlasMode){S.atlasMode=button.dataset.atlasMode;render();return}
  if(button.dataset.atlasRoutes){S.atlasRoutes=!S.atlasRoutes;render();return}
  if(button.dataset.atlasNav){moveAtlas(button.dataset.atlasNav);return}
  if(button.dataset.regionFocus){S.atlasRegion=button.dataset.regionFocus;render();return}
  if(button.dataset.regionChoice){const region=regionPlan.regions.find(r=>r.id===button.dataset.regionChoice);dialog(local('Open an expedition','Ouvrir une expédition'),`<h3>${E(region.title[S.language])}</h3><p>${E(atlasScope(region))}</p><p>${local('This uses one expedition choice. The expedition stays open.','Un choix d’expédition sera utilisé. L’expédition restera ouverte.')}</p><button class="primary" data-confirm-region="${region.id}">${local('Open this expedition','Ouvrir cette expédition')}</button>`);return}
  if(button.dataset.beginDiscovery!==undefined){$('modal').close();await openLandmark(landmarks[Number(button.dataset.beginDiscovery)].id);return}
  if(button.dataset.confirmRegion){const result=await saveResult(await session.chooseRegion(button.dataset.confirmRegion));$('modal').close();if(result.ok){S.atlasRegion=button.dataset.confirmRegion;await regionCeremony(button.dataset.confirmRegion);render();notify(local('Your expedition is open.','Votre expédition est ouverte.'))}else notify(local('This choice is not available yet.','Ce choix n’est pas encore disponible.'));return}
  if(button.dataset.inspectDiscovery!==undefined){inspectToken(Number(button.dataset.inspectDiscovery));return}
  if(button.dataset.openDiscovery!==undefined){$('modal').close();const l=landmarks[Number(button.dataset.openDiscovery)];if(record(`challenge:${l.id}`)||known(l))await openLandmark(l.id);else await inviteDiscovery(l);return}
  if(button.dataset.panel){S.panel=button.dataset.panel;if(S.panel==='names'&&S.selected===null)S.selected=puzzles[S.index].nodes.findIndex((n,i)=>!S.draft.assignments[i]);if(S.selected<0)S.selected=0;render();return}
  if(button.dataset.inspect){inspectToken(button.dataset.inspect);return}
  if(button.dataset.atlasGroup){S.atlasGroup=button.dataset.atlasGroup;render();return}
  if(button.dataset.resume!==undefined){await go('play',Number(button.dataset.resume));return}
  if(button.dataset.view){$('modal').close();await go(button.dataset.view,button.dataset.view==='restored'?'choices':null);return}
  if(button.dataset.puzzle!==undefined){$('modal').close();await go('play',Number(button.dataset.puzzle));return}
  if(button.dataset.filter){S.archiveFilter=button.dataset.filter;archive();return}
  if(button.dataset.expedition){S.archiveRegion=button.dataset.expedition;S.archiveFilter='all';archive();return}
  if(button.dataset.landmark){$('modal').close();await openLandmark(button.dataset.landmark);return}
  if(button.dataset.node!==undefined&&S.view==='play'&&!S.draft.solved){S.selected=Number(button.dataset.node);render();if(event.detail===0)document.querySelector('.place-tray button:not(.used)')?.focus({preventScroll:true});notify(`${t('selected')} ${S.selected+1}`);return}
  if(button.dataset.country){if(S.selected===null){S.message=t('chooseDot');render();notify(S.message);return}await updateDraft({type:'assign',index:S.selected,name:button.dataset.country});if(!S.conflict){const next=puzzles[S.index].nodes.findIndex((n,i)=>!S.draft.assignments[i]);S.selected=next<0?null:next;S.message='';S.feedback=null;notify(next<0?local('All dots named. Ready to check.','Tous les points sont nommés. Vérifiez la carte.'):`${t('selected')} ${next+1}`)}render();if(S.selected===null&&!S.conflict)document.querySelector('[data-action="check"]')?.focus({preventScroll:true});return}
  if(button.dataset.mode){S.mode=button.dataset.mode;persistDiscoveryDraft();render();return}
  if(button.dataset.zoom){zoomMap(button.dataset.zoom);return}
  if(button.dataset.pinMove){movePin(button.dataset.pinMove);return}
  if(button.dataset.action){await handleAction(button);return}
  if(button.id==='companionButton'){await go('companions');return}
  if(button.id==='language'){S.message='';S.language=S.language==='en'?'fr':'en';await saveResult(await session.preference('language',S.language));render();if($('modal').open)$('modal').close();notify(S.language==='fr'?t('frenchDraft'):'English');return}
  if(button.id==='settings'){dialog(t('settings'),`<label class="check-label"><input type="checkbox" id="reduceMotion" ${S.reduced?'checked':''}>${t('reduce')}</label><p>${t('reduceHelp')}</p><p style="margin-top:18px">${t('sound')}</p>`);return}
  if(button.id==='sourcesButton'){dialog(t('notesTitle'),`<p>${t(isPrivatePreview(CONFIG)?'notes':'productionNotes')}</p><ul>${landmarks.filter(known).map(l=>`<li><a href="${E(l.source)}" target="_blank" rel="noopener">${E(l.title[S.language])}</a></li>`).join('')}</ul>`);return}
  if(button.id==='skipMotion'){const pending=S.pendingDiscovery;stopMotion();if(pending)await inviteDiscovery(landmarks.find(l=>l.id===pending))}
 };
 if(busy&&!button.dataset.zoom)return;busy=true;perform().catch(error=>{console.error(error);S.message=String(error.message);notify(S.message)}).finally(()=>busy=false);
});
document.addEventListener('scroll',event=>{if(event.target.classList?.contains('clue-list'))S.clueScroll=event.target.scrollTop;if(event.target.classList?.contains('place-tray'))S.nameScroll=event.target.scrollTop;if(event.target.classList?.contains('dot-selector'))S.dotScroll=event.target.scrollLeft},true);
document.addEventListener('change',async event=>{
 if(event.target.id==='reduceMotion'){S.reduced=event.target.checked;stopMotion();await saveResult(await session.preference('reduced',S.reduced));header()}
 if(event.target.id==='countrySelect'){S.guessCountry=event.target.value;if(S.mode==='pin'&&S.pin&&geometry){const candidates=countryCandidates(S.pin,geometry.features);if(candidates.length===1&&S.guessCountry!==candidates[0]){S.guessCountry=candidates[0];notify(local('This territory follows your pin. Choose a country or territory to answer without a pin.','Ce territoire correspond à votre repère. Choisissez un pays ou territoire pour répondre sans repère.'))}}persistDiscoveryDraft();const scroll=window.scrollY;render();window.scrollTo(0,scroll)}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Tab'){
  const modal=document.querySelector('dialog[open]');
  if(modal){const controls=[...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'),first=controls[0],last=controls.at(-1),active=document.activeElement;
   if(first&&(!modal.contains(active)||event.shiftKey&&active===first||!event.shiftKey&&active===last)){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true})}
  }
 }
 const marker=event.target.closest('[data-atlas-discoveries]');if(marker?.tagName.toLowerCase()==='g'&&['Enter',' '].includes(event.key)){event.preventDefault();marker.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}
 const node=event.target.closest('[data-node]');
 if(node&&['Enter',' '].includes(event.key)){event.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}
 if(node&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const count=puzzles[S.index].nodes.length;const next=(Number(node.dataset.node)+(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)+count)%count;$(`node-${next}`)?.focus();return}
 if(event.target.id==='landmarkMap'&&!S.outcome){const keys={ArrowUp:'north',ArrowDown:'south',ArrowLeft:'west',ArrowRight:'east'};if(keys[event.key]){event.preventDefault();movePin(keys[event.key],event.shiftKey);return}if(event.key==='+'||event.key==='-'){event.preventDefault();zoomMap(event.key==='+'?'in':'out')}}
});
function zoomMap(direction){
 if(S.view==='play'&&hasIntegratedViewport(puzzles[S.index])){const frame=puzzleFrame();S.zoom=direction==='reset'?{x:0,y:0,...frame}:scalePuzzleCamera(S.zoom,direction==='in'?.8:1.25,frame)}else if(direction==='reset')S.zoom={x:0,y:0,w:900,h:580};else{const f=direction==='in'?.8:1.25,w=Math.max(180,Math.min(1800,S.zoom.w*f)),h=w*580/900;S.zoom={x:S.zoom.x+(S.zoom.w-w)/2,y:S.zoom.y+(S.zoom.h-h)/2,w,h}}
 const svg=$('graphMap')??$('landmarkMap');svg?.setAttribute('viewBox',`${S.zoom.x} ${S.zoom.y} ${S.zoom.w} ${S.zoom.h}`);
}
function movePin(direction,fine=false){const l=landmarks.find(l=>l.id===S.landmark);if(!l||S.outcome)return;const p=fitProjection(l.bounds);let q=S.pin?p.forward(S.pin):[450,290],amount=(fine?1:8)*S.zoom.w/900;if(direction==='north')q[1]-=amount;if(direction==='south')q[1]+=amount;if(direction==='west')q[0]-=amount;if(direction==='east')q[0]+=amount;try{setPin(p.inverse(q));$('landmarkMap')?.focus({preventScroll:true})}catch{}}
function persistDiscoveryDraft(){if(S.view!=='discovery'||S.outcome)return;const l=landmarks.find(l=>l.id===S.landmark);session.saveDiscoveryDraft(l,{attemptId:S.attemptId,pin:S.pin,guessCountry:S.guessCountry,mode:S.mode}).then(saveResult).then(result=>{if(!result.ok){syncDiscovery();if(S.view==='discovery')render()}})}
function setPin(point){S.pin=point;const candidates=geometry?countryCandidates(point,geometry.features):[];S.guessCountry=candidates.length===1?candidates[0]:'';const scroll=window.scrollY;render();window.scrollTo(0,scroll);persistDiscoveryDraft();notify(`${t('yourPin')}: ${point[1].toFixed(2)}, ${point[0].toFixed(2)}. ${S.guessCountry?name(S.guessCountry):t('noCountry')}`)}
function bindMaps(){
 const svg=$('graphMap')??$('landmarkMap');if(!svg)return;
 const pointers=new Map();let start=null,panned=false,pinched=false,pinch=null;
 svg.addEventListener('pointerdown',e=>{
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!e.target.closest('[data-node]'))svg.setPointerCapture(e.pointerId);
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:{...S.zoom}};pinched=true;return}
  start={x:e.clientX,y:e.clientY,zoom:{...S.zoom}};panned=false;pinched=false;
 });
 svg.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),factor=pinch.distance/distance,w=Math.max(180,Math.min(1800,pinch.zoom.w*factor)),h=w*580/900;S.zoom=S.view==='play'&&hasIntegratedViewport(puzzles[S.index])?scalePuzzleCamera(pinch.zoom,factor,puzzleFrame()):{x:pinch.zoom.x+(pinch.zoom.w-w)/2,y:pinch.zoom.y+(pinch.zoom.h-h)/2,w,h};svg.setAttribute('viewBox',Object.values(S.zoom).join(' '));return}
  if(!start||pinched)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>6)panned=true;if(panned){suppressClickUntil=performance.now()+500;svg.setPointerCapture(e.pointerId);const rect=svg.getBoundingClientRect();S.zoom={...start.zoom,x:start.zoom.x-dx*start.zoom.w/rect.width,y:start.zoom.y-dy*start.zoom.h/rect.height};svg.setAttribute('viewBox',Object.values(S.zoom).join(' '))}
 });
 const release=e=>{
  const was=pointers.has(e.pointerId);pointers.delete(e.pointerId);if(!was)return;
  if(start&&!panned&&!pinched&&S.view==='play'&&!S.draft.solved){
   // Resolve the actual coordinate, because mobile browsers may retarget a small
   // SVG hit to a neighbouring label. Numbered 44px controls remain available.
   const nearest=[...svg.querySelectorAll('.graph-node')].map(g=>{const q=new DOMPoint(0,0).matrixTransform(g.getScreenCTM());return {index:Number(g.dataset.node),distance:Math.hypot(q.x-e.clientX,q.y-e.clientY)}}).sort((a,b)=>a.distance-b.distance)[0];
   if(nearest?.distance<=22){suppressClickUntil=performance.now()+450;S.selected=nearest.index;render();notify(`${t('selected')} ${S.selected+1}`)}
  }
  if(start&&!panned&&!pinched&&S.view==='discovery'&&!S.outcome&&S.mode==='pin'){
   const matrix=svg.getScreenCTM();if(matrix){const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());const l=landmarks.find(l=>l.id===S.landmark);try{setPin(fitProjection(l.bounds).inverse([point.x,point.y]))}catch{}}
  }
  if(!pointers.size){start=null;pinch=null}
 };
 svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',()=>{pointers.clear();start=null;pinch=null});
}
media.addEventListener('change',()=>{stopMotion();header();finaleReader?.setPreferences({language:S.language,reduced:S.reduced||media.matches,companion:companionAppearance()})});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMotion();cancelDiscoveryTransition()}else if(S.view==='atlas')queueMicrotask(atlasExperience)});
const channel=!atlasSimulation&&typeof BroadcastChannel==='function'?new BroadcastChannel('geodots-preview-v1'):null;
channel?.addEventListener('message',async()=>{await refresh();syncDiscovery();if(S.view!=='play')render();else header()});
window.addEventListener('storage',async()=>{await refresh();header()});
window.addEventListener('hashchange',()=>{const [view,n]=location.hash.slice(1).split('/'),story=view==='story'||S.view==='story',narrative=finaleViews.has(view)||finaleViews.has(S.view);if(!story&&!narrative&&view!=='uncharted'&&S.view!=='uncharted')return;if(['play','atlas','cabinet','companions','uncharted','story',...finaleViews].includes(view))go(view,view==='play'&&Number(n)>=1&&Number(n)<=60?Number(n)-1:null)});
document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();go('play')});
let offlineReady=false,offlineFailed=false;
function offlineStatus(){if(atlasSimulation){if($('offlineStatus'))$('offlineStatus').textContent=local('Isolated simulation · changes are not saved.','Simulation isolée · modifications non enregistrées.');return}const el=$('offlineStatus');if(!el)return;el.textContent=offlineFailed?local('Offline cache unavailable. Keep this page open.','Cache hors ligne indisponible. Gardez cette page ouverte.'):offlineReady?(navigator.onLine?local('Charts ready offline.','Cartes prêtes hors ligne.'):local('Offline · progress stays on this device.','Hors ligne · progression sur cet appareil.')):local('Preparing offline charts…','Préparation des cartes hors ligne…')}
async function prepareOffline(){if(!('serviceWorker'in navigator)){offlineFailed=true;offlineStatus();return}try{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;offlineReady=true}catch{offlineFailed=true}offlineStatus()}
window.addEventListener('online',offlineStatus);window.addEventListener('offline',offlineStatus);
async function init(){
 [puzzles,grammar,landmarks,regionPlan,revisionLedger,territoryMeta,atlasComponents,atlasCoverage]=await Promise.all([fetchJSON(CONFIG.puzzlesURL),fetchJSON('data/french-territory-labels.json'),fetchJSON('data/landmarks.json'),fetchJSON(CONFIG.regionalPlanURL),fetchJSON('data/content-revisions.json'),fetchJSON('data/territory-metadata.json'),fetchJSON('data/atlas-components.geojson'),fetchJSON('data/atlas-coverage.json')]);
 validatePlan(regionPlan,puzzles.map(p=>p.id));expeditions=regionPlan.regions;
 catalogue=freeCatalogue(await fetchJSON('data/series1-manifest.json'));
 store=atlasSimulation?await(await import('./atlas-simulation.mjs')).createAtlasSimulation({puzzles,ledger:revisionLedger,plan:regionPlan,landmarks}):await openStore({onFailure:warn});session=createSession(store,{progression:regionPlan,contentRevisions:Object.fromEntries(revisionLedger.map(e=>[e.id,{revision:e.proposedRevision,hash:e.proposedHash,compatibleHashes:e.compatiblePreviousHashes??[]}]))});
 let legacyStorage;try{legacyStorage=atlasSimulation?{getItem(){return null},setItem(){},get length(){return 0},key(){return null}}:localStorage}catch{legacyStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},get length(){return 0},key(){return null}}}
 const legacy=createProgressSession(legacyStorage);const migration=atlasSimulation?{issues:[],language:'en'}:await legacy.migrate();const recovered=atlasSimulation?[]:(await legacy.completions()).records;
 const snapshots=[];for(let i=0;i<60;i++)for(const prefix of ['borderPuzzleProgress','borderPuzzleBestTimes']){const key=`${prefix}:${i}`;try{const raw=legacyStorage.getItem(key);if(raw!==null)snapshots.push({key,raw})}catch{warn()}}
 await session.importLegacy(snapshots,recovered);await refresh();
 S.language=record('preference:language')?.value??migration.language??'en';if(!COPY[S.language])S.language='en';
 S.companion=record('preference:companion')?.value??null;if(!PEOPLE[S.companion])S.companion=null;
 S.reduced=record('preference:reduced')?.value===true;if(S.companion&&record(`milestone:${stage()}`)&&!record(`presentation:evolution:${stage()}`))S.pendingEvolution=stage();
 const hash=atlasSimulation?['atlas']:location.hash.slice(1).split('/');
 S.index=hash[0]==='play'&&Number(hash[1])>=1&&Number(hash[1])<=60?Number(hash[1])-1:nextPlayable(-1)??0;
 let startIntroduction=!atlasSimulation&&(hash[0]==='story'||shouldStartIntroduction(records,{persistent:store.persistent,hasLegacy:snapshots.length>0,hasRoute:Boolean(location.hash)}));
 if(startIntroduction){const shown=await saveResult(await session.presentation('introduction','series-one'));if(hash[0]!=='story'&&!shown.first)startIntroduction=false;}
 const pending=records.filter(r=>r.id.startsWith('draft:')&&!r.solved&&Object.keys(r.assignments??{}).length);
 if(!location.hash&&pending.length)S.index=Number(pending.at(-1).puzzleId.slice(-3))-1;
 const loaded=startIntroduction?null:await session.load(S.index);await refresh();
 S.view=['atlas','cabinet','companions',...(unchartedEnabled()?['uncharted']:[]),...[...finaleViews].filter(finaleAllowed)].includes(hash[0])?hash[0]:'play';
 if(startIntroduction)S.view='story';
 else if(loaded.value.locked){S.view='atlas';S.atlasRegion=loaded.value.regionId??'opening';S.message=local('That expedition is still sealed.','Cette expédition est encore fermée.')}else S.draft=loaded.value;
 if(!startIntroduction&&!location.hash&&!pending.length&&availability().choices&&!finaleSeen())S.view='atlas';
 if(finaleViews.has(S.view))await saveResult(await session.presentation('finale','sixtieth-chart'));
 render();offlineStatus();prepareOffline();if(S.draft?.solved)ensureReveal();
 if(S.view==='atlas')ensureGeometry();
 if(hash[0]==='discovery'&&landmarks.some(l=>l.id===hash[1])&&isUnlocked(landmarks.find(l=>l.id===hash[1])))await openLandmark(hash[1]);
 if(S.view==='play'&&S.draft?.solved){const l=landmarks.find(l=>l.puzzleIds.includes(puzzles[S.index].id));if(l&&record(`invitation:${l.id}`)&&!record(`challenge:${l.id}`)&&!known(l))await inviteDiscovery(l)}
 if(S.view==='atlas')scheduleFinaleOffer();
 if(migration.issues.some(i=>i.reason.startsWith('storage-')))warn();
}
init().catch(error=>{console.error(error);$('main').innerHTML=`<div class="loading"><h1>${local('Unable to open the chart room','La salle des cartes n’a pas pu s’ouvrir')}</h1><p>${local('The puzzle data could not be loaded.','Les énigmes n’ont pas pu être chargées.')}</p><button class="secondary" onclick="location.reload()">${local('Retry','Réessayer')}</button></div>`});
