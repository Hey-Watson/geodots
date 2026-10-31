import {placementCorrect} from './model.mjs';
/** Mount one reusable native Trace → Reveal → Place challenge. */
export function mountChallenge(root,CFG,{saved,reducedMotion,onChange,onComplete,onNext,translate=s=>s}){
function listen(target,type,fn){target.addEventListener(type,fn,{signal:abort.signal})}

const $=id=>root.querySelector('#'+id), NS='http://www.w3.org/2000/svg';
const givenCount=CFG.startingCount??4;
const state={step:givenCount,picks:CFG.sequence.slice(0,givenCount),errors:0,busy:false,stage:'trace',keyboard:[460,250],timers:[]};
const reduced=()=>reducedMotion();
const svg=(tag, attrs, parent)=>{const e=document.createElementNS(NS,tag);for(let [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(parent)parent.appendChild(e);return e};
const pointForNumber=n=>{const i=CFG.cells.indexOf(n);return[(i%6)*100+50,Math.floor(i/6)*100+50]};
let destroyed=false;const frames=new Set(),timeouts=new Set(),abort=new AbortController();
const requestAnimationFrame=fn=>{let id=window.requestAnimationFrame(t=>{frames.delete(id);if(!destroyed)fn(t)});frames.add(id);return id};
const schedule=(fn,t)=>{const n=setTimeout(()=>{timeouts.delete(n);if(!destroyed)fn()},t);timeouts.add(n);state.timers.push(n)};
const say=s=>{$('uwLive').textContent=translate(s)};
const numberLabel=(n,status='')=>translate('Number')+' '+n+(status?', '+translate(status):'');
function show(id){state.stage=id.replace('Scene','');queueMicrotask(()=>{if(!destroyed)onChange(snapshot())});for(let v of ['traceScene','unresolvedScene','placeScene','resultScene'])$(v).hidden=(v!==id);window.scrollTo({top:0,behavior:'instant'});const h=$(id).querySelector('h1');h?.setAttribute('tabindex','-1');h?.focus({preventScroll:true})}
function makeGrid(){const grid=$('numberGrid');grid.replaceChildren();CFG.cells.forEach(num=>{const b=document.createElement('button');b.type='button';b.className='cell';b.textContent=num;b.dataset.uwNumber=num;b.setAttribute('aria-label',numberLabel(num));b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>select(num));grid.appendChild(b)});}
function setPattern(){const p=$('pattern');p.replaceChildren();const end=state.step, start=Math.max(0,end-givenCount);state.picks.slice(start,end).forEach((n,i)=>{if(i){const a=document.createElement('span');a.className='arrow';a.textContent='→';p.appendChild(a)}const v=document.createElement('span');v.className='value';v.textContent=n;p.appendChild(v)});const ar=document.createElement('span');ar.className='arrow';ar.textContent='→';p.appendChild(ar);const q=document.createElement('span');q.className='question';q.textContent='?';p.appendChild(q);p.setAttribute('aria-label',state.picks.slice(start,end).join(', ')+', '+translate('what comes next?'));$('progressText').textContent=String(state.step).padStart(2,'0')+' / 12 '+translate('traced');$('meterFill').style.width=((state.step-givenCount)/(12-givenCount)*100)+'%'}
function addLabel(n){let [x,y]=pointForNumber(n);const label=svg('text',{x,y,class:'edge-number'},$('edgeLabels'));label.textContent=n;const cell=$('numberGrid').querySelector(`[data-uw-number="${n}"]`);label.style.fontSize=(parseFloat(getComputedStyle(cell).fontSize)*600/$('drawing').getBoundingClientRect().width)+'px'}
function addSegment(start,end,animate){const p=pointForNumber(start),q=pointForNumber(end);const path=svg('path',{d:`M${p[0]} ${p[1]} L${q[0]} ${q[1]}`,class:'stroke-trace'},$('edges'));if(animate&&!reduced()){let len=Math.hypot(q[0]-p[0],q[1]-p[1]);path.style.strokeDasharray=`${len}`;path.style.strokeDashoffset=`${len}`;requestAnimationFrame(()=>{path.style.transition='stroke-dashoffset 360ms cubic-bezier(.2,.8,.25,1)';path.style.strokeDashoffset='0'})}return path}
function init(){
  show('traceScene');
  state.timers.forEach(clearTimeout);state.timers=[];
  state.picks=CFG.sequence.slice(0,givenCount);state.step=givenCount;state.errors=0;state.busy=false;state.keyboard=[460,250];
  $('board').classList.remove('morphing','unresolved');$('morphShape').setAttribute('d','');
  $('edges').replaceChildren();$('edgeLabels').replaceChildren();$('unresolvedTrace').setAttribute('d','');
  makeGrid();
  for(let i=1;i<givenCount;i++)addSegment(state.picks[i-1],state.picks[i],false);
  for(let n of state.picks){const cell=$('numberGrid').querySelector(`[data-uw-number="${n}"]`);cell.classList.add('used');cell.disabled=true;cell.setAttribute('aria-label',numberLabel(n,'starting coordinate'));cell.removeAttribute('aria-pressed');addLabel(n)}
  $('feedback').textContent='';$('prompt').textContent=CFG.cue||'';$('hintButton').hidden=false;
  setPattern();show('traceScene')
}
// Any player-made choice can be tapped again. Rewinding to an earlier square
// removes that square and later selections so the connected path stays coherent.
// The configured starting coordinates remain fixed (four in protected challenges).
function rewindFrom(n){
  const from=state.picks.indexOf(n);
  if(from<givenCount)return;
  state.picks.splice(from);
  state.step=state.picks.length;
  $('edges').replaceChildren();$('edgeLabels').replaceChildren();
  for(let i=1;i<state.picks.length;i++)addSegment(state.picks[i-1],state.picks[i],false);
  for(const num of CFG.cells){
    const cell=$('numberGrid').querySelector(`[data-uw-number="${num}"]`);
    const position=state.picks.indexOf(num);
    const given=position>=0&&position<givenCount;
    const chosen=position>=givenCount;
    cell.classList.toggle('used',given||chosen);
    cell.classList.toggle('chosen',chosen);
    cell.disabled=given;
    if(given){cell.setAttribute('aria-label',numberLabel(num,'starting coordinate'));cell.removeAttribute('aria-pressed')}
    else{cell.setAttribute('aria-label',chosen?numberLabel(num,'selected; tap to retrace from here'):numberLabel(num));cell.setAttribute('aria-pressed',String(chosen))}
    if(position>=0)addLabel(num);
  }
  $('feedback').textContent='';
  setPattern();say(state.step+' '+translate('of 12 positions traced'));
}
function select(n){
  if(state.stage!=='trace'||state.busy)return;
  const index=state.picks.indexOf(n);
  if(index>=givenCount){rewindFrom(n);return}
  if(index>=0||state.step>=CFG.sequence.length)return;
  const cell=$('numberGrid').querySelector(`[data-uw-number="${n}"]`);
  if(!cell)return;
  cell.classList.add('used','chosen');
  cell.setAttribute('aria-pressed','true');
  cell.setAttribute('aria-label',numberLabel(n,'selected; tap to retrace from here'));
  addSegment(state.picks.at(-1),n,true);addLabel(n);
  state.picks.push(n);state.step++;setPattern();
  say(state.step+' '+translate('of 12 positions traced'));
  if(state.step===CFG.sequence.length){
    if(state.picks.every((picked,i)=>picked===CFG.sequence[i]))finishTrace();
    else finishUnresolved();
  }
}
function finishUnresolved(){
  state.busy=true;$('prompt').textContent='';$('feedback').textContent='';$('hintButton').hidden=true;
  addSegment(state.picks.at(-1),state.picks[0],true);
  $('unresolvedTrace').setAttribute('d',pathD(state.picks.map(pointForNumber)));
  schedule(()=>{
    $('board').classList.add('unresolved');
    schedule(()=>{
      show('unresolvedScene');say('The shore was missed and remains hidden. Retrace the line.');
    },reduced()?180:700);
  },reduced()?160:420);
}
function perimeterSamples(pts,count){let segments=[],sum=0;for(let i=0;i<pts.length;i++){let a=pts[i],b=pts[(i+1)%pts.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);segments.push({a,b,len,at:sum});sum+=len}return Array.from({length:count},(_,i)=>{let d=sum*i/count;let s=segments.find(v=>d<=v.at+v.len)||segments.at(-1);let t=(d-s.at)/s.len;return[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t]})}
function shapePoints(){const doc=$('drawing');const p=svg('path',{d:CFG.realCoast,visibility:'hidden'},doc);let len=p.getTotalLength(),raw=Array.from({length:(CFG.traceProfile==='madagascar-v4'?120:240)},(_,i)=>{let a=p.getPointAtLength(i*len/(CFG.traceProfile==='madagascar-v4'?120:240));return[a.x,a.y]});p.remove();let xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;if(CFG.traceProfile==='madagascar-v4'){let scale=Math.min(215/(Math.max(...xs)-Math.min(...xs)),475/(Math.max(...ys)-Math.min(...ys)));return raw.map(p=>[300+(p[0]-cx)*scale,300+(p[1]-cy)*scale])}return raw}
function alignTargets(from,to){let N=from.length,best=1e100,chosen=null;for(let flip=0;flip<2;flip++)for(let shift=0;shift<N;shift++){let score=0;for(let i=0;i<N;i++){let j=flip?((shift-i+N)%N):((shift+i)%N),dx=from[i][0]-to[j][0],dy=from[i][1]-to[j][1];score+=dx*dx+dy*dy}if(score<best){best=score;chosen=from.map((_,i)=>to[flip?(shift-i+N)%N:(shift+i)%N])}}return chosen}
const pathD=arr=>'M'+arr.map(p=>`${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L')+' Z';
function finishTrace(){state.busy=true;$('feedback').textContent='';$('prompt').textContent='';$('hintButton').hidden=true;const original=state.picks.map(pointForNumber),a=perimeterSamples(original,CFG.traceProfile==='madagascar-v4'?120:240),b=alignTargets(a,shapePoints()),m=$('morphShape');m.setAttribute('d',pathD(a));addSegment(state.picks.at(-1),state.picks[0],true);schedule(()=>{$('board').classList.add('morphing');if(reduced()){m.setAttribute('d',CFG.traceProfile==='madagascar-v4'?pathD(b):CFG.realCoast);schedule(()=>{initPlace();show('placeScene')},CFG.traceProfile==='madagascar-v4'?800:220);return}let start=null,duration=CFG.traceProfile==='madagascar-v4'?1220:1500;function frame(t){if(!start)start=t;let x=Math.min(1,(t-start)/duration),smooth=x*x*(3-2*x);let pts=a.map((p,i)=>[p[0]+(b[i][0]-p[0])*smooth,p[1]+(b[i][1]-p[1])*smooth]);m.setAttribute('d',pathD(pts));if(x<1)requestAnimationFrame(frame);else {m.setAttribute('d',CFG.traceProfile==='madagascar-v4'?pathD(b):CFG.realCoast);schedule(()=>{initPlace();show('placeScene')},CFG.traceProfile==='madagascar-v4'?750:1000)}}requestAnimationFrame(frame)},450)}
// All geography and map artwork are embedded. No storage or network access.
const RAD=Math.PI/180;
function forward([lon,lat]){return[460+lon*RAD*CFG.projection.scale,250-(Math.log(Math.tan(Math.PI/4+lat*RAD/2))-CFG.projection.cy)*CFG.projection.scale]}
function inverse([x,y]){return[(x-460)/CFG.projection.scale/RAD,(2*Math.atan(Math.exp(CFG.projection.cy-(y-250)/CFG.projection.scale))-Math.PI/2)/RAD]}
function ringContains([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function acceptsPoint(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&CFG.acceptance.some(rings=>ringContains([x,y],rings[0])&&!rings.slice(1).some(r=>ringContains([x,y],r)))}
function makeMapGrid(){const g=$('worldGrid');g.replaceChildren();for(let lon=-180;lon<=180;lon+=30){const a=forward([lon,-60]),b=forward([lon,84]);svg('path',{d:`M${a}L${b}`,class:'gridline','vector-effect':'non-scaling-stroke'},g)}for(let lat=-60;lat<=80;lat+=20){const a=forward([-180,lat]),b=forward([180,lat]);svg('path',{d:`M${a}L${b}`,class:'gridline','vector-effect':'non-scaling-stroke'},g)}}
let camera={x:0,y:0,w:920,h:500},cursorVisible=false;
const pointers=new Map();let gesture=null,suppressClick=false;
function mapBox(){return $('worldSvg').getBoundingClientRect()}
function clientPoint(x,y){const map=$('worldSvg'),ctm=map.getScreenCTM();if(!ctm)return null;const p=map.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(ctm.inverse());return[q.x,q.y]}
function updateCursor(){const map=$('worldSvg'),c=$('mapCursor'),ctm=map.getScreenCTM();if(!ctm)return;const unit=1/Math.hypot(ctm.a,ctm.b);c.setAttribute('visibility',cursorVisible?'visible':'hidden');c.setAttribute('transform',`translate(${state.keyboard})`);c.querySelector('circle').setAttribute('r',9*unit);c.querySelector('path').setAttribute('d',`M${-14*unit} 0H${14*unit}M0 ${-14*unit}V${14*unit}`)}
function putCamera(next){
  const b=mapBox();
  // A resize can arrive during a hidden-scene transition. Keep the last valid
  // camera rather than writing NaN/Infinity into the SVG and saved draft.
  if(b.width<=0||b.height<=0||!['x','y','w'].every(k=>Number.isFinite(next[k])))return;
  const ratio=b.width/b.height,w=Math.max(.4,Math.min(1450,next.w));
  const h=w/ratio;
  camera={x:next.x,y:next.y,w,h};
  camera.x=w>=920?(920-w)/2:Math.max(-12,Math.min(932-w,camera.x));
  camera.y=h>=500?(500-h)/2:Math.max(-8,Math.min(508-h,camera.y));
  $('worldSvg').setAttribute('viewBox',`${camera.x} ${camera.y} ${w} ${h}`);
  $('zoomIn').disabled=w<=.401;$('zoomOut').disabled=w>=1449.99;
  updateCursor();
}
function initialMapView(full=false){const b=mapBox(),ratio=b.width/Math.max(1,b.height),mobile=window.matchMedia('(max-width:650px)').matches;const w=full||!mobile?Math.max(920,500*ratio):500*ratio;putCamera({x:(920-w)/2,y:(500-w/ratio)/2,w});state.keyboard=[camera.x+camera.w/2,camera.y+camera.h/2];updateCursor()}
function zoomMap(factor,anchor=null){const p=anchor||(cursorVisible?state.keyboard:[camera.x+camera.w/2,camera.y+camera.h/2]);const w=Math.max(.4,Math.min(1450,camera.w*factor)),f=w/camera.w;putCamera({x:p[0]-(p[0]-camera.x)*f,y:p[1]-(p[1]-camera.y)*f,w})}
function initPlace(){
  $('placeFeedback').textContent='';$('locationHint').hidden=false;$('mapFX').replaceChildren();
  state.errors=0;state.busy=false;cursorVisible=false;pointers.clear();gesture=null;suppressClick=false;
  requestAnimationFrame(()=>openWorldOverview(false));
}
function atPlace(x,y){
  if(state.stage!=='place'||state.placementMode!=='detail'||state.busy)return;
  const good=placementCorrect(CFG,[x,y]),map=$('worldSvg'),ctm=map.getScreenCTM(),unit=ctm?1/Math.hypot(ctm.a,ctm.b):1;
  state.keyboard=[x,y];cursorVisible=true;updateCursor();
  const pulse=svg('circle',{cx:x,cy:y,r:9*unit,fill:'none',stroke:good?'#e9c989':'#bd8276','stroke-width':2,'vector-effect':'non-scaling-stroke'},$('mapFX'));
  if(!reduced())pulse.animate([{r:9*unit,opacity:1},{r:34*unit,opacity:0}],{duration:650});
  schedule(()=>pulse.remove(),reduced()?160:700);
  if(good){
    state.busy=true;
    const placed=svg('path',{d:CFG.mapCoast,fill:'#90b49e',stroke:'#edcf8b','stroke-width':1.7,'stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},$('mapFX'));
    const halo=svg('circle',{cx:CFG.anchor[0],cy:CFG.anchor[1],r:18*unit,fill:'none',stroke:'#dfbf83','stroke-width':2.3,'vector-effect':'non-scaling-stroke'},$('mapFX'));
    if(!reduced()){placed.animate([{opacity:0},{opacity:1}],{duration:600});halo.animate([{r:18*unit,opacity:.9},{r:70*unit,opacity:0}],{duration:1100,fill:'forwards'})}
    $('placeFeedback').textContent=translate('The Atlas remembers.');say(translate('Correct location.')+' '+CFG.name+'.');
    onComplete(snapshot(),[x,y]).then(ok=>{if(destroyed)return;if(ok)schedule(()=>show('resultScene'),reduced()?220:1450);else{state.busy=false;$('placeFeedback').textContent=translate('This shore could not be recorded. Try placing it again.')}});
  }else{
    state.errors++;$('placeFeedback').textContent=translate(state.errors>=2?'The Atlas has not found this shore.':'That shore lies elsewhere.');say('Not the right region yet.');
  }
}
function beginGesture(){
  const a=[...pointers.values()];if(!a.length){gesture=null;return}
  if(a.length===1)gesture={camera:{...camera},x:a[0].x,y:a[0].y,dragged:false};
  else{const x=(a[0].x+a[1].x)/2,y=(a[0].y+a[1].y)/2;gesture={camera:{...camera},x,y,distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),anchor:clientPoint(x,y),dragged:true};suppressClick=true}
}
$('worldSvg').addEventListener('pointerdown',e=>{if(state.stage!=='place'||state.busy||e.button>0)return;if(!pointers.size)suppressClick=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});$('worldSvg').setPointerCapture(e.pointerId);beginGesture()});
$('worldSvg').addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pointers.values()],b=mapBox();
  if(a.length>=2&&gesture.distance){
    const distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(distance<5)return;
    const w=Math.max(.4,Math.min(1450,gesture.camera.w*gesture.distance/distance)),h=w*b.height/b.width;
    const rx=((a[0].x+a[1].x)/2-b.left)/b.width,ry=((a[0].y+a[1].y)/2-b.top)/b.height;
    putCamera({x:gesture.anchor[0]-rx*w,y:gesture.anchor[1]-ry*h,w});suppressClick=true;
  }else if(a.length===1&&!gesture.distance){
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(Math.hypot(dx,dy)>7)gesture.dragged=true;
    if(gesture.dragged){putCamera({x:gesture.camera.x-dx*gesture.camera.w/b.width,y:gesture.camera.y-dy*gesture.camera.h/b.height,w:gesture.camera.w});suppressClick=true}
  }
});
function endPointer(e){if(gesture?.dragged)suppressClick=true;pointers.delete(e.pointerId);if(pointers.size)beginGesture();else gesture=null}
$('worldSvg').addEventListener('pointerup',endPointer);$('worldSvg').addEventListener('pointercancel',e=>{suppressClick=true;endPointer(e)});
$('worldSvg').addEventListener('click',e=>{if(suppressClick){suppressClick=false;return}const p=clientPoint(e.clientX,e.clientY);if(p)atPlace(...p)});
$('worldSvg').addEventListener('wheel',e=>{e.preventDefault();if(state.busy)return;zoomMap(Math.exp(Math.max(-600,Math.min(600,e.deltaY))*.0015),clientPoint(e.clientX,e.clientY))},{passive:false});
$('worldSvg').addEventListener('keydown',e=>{
  if(state.busy)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    e.preventDefault();const step=camera.w/(e.shiftKey?150:30),[x,y]=state.keyboard;
    state.keyboard=[Math.max(0,Math.min(920,x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0))),Math.max(0,Math.min(500,y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)))];cursorVisible=true;
    let nx=camera.x,ny=camera.y;const margin=camera.w*.08;
    if(state.keyboard[0]<nx+margin)nx=state.keyboard[0]-margin;if(state.keyboard[0]>nx+camera.w-margin)nx=state.keyboard[0]-camera.w+margin;
    if(state.keyboard[1]<ny+margin)ny=state.keyboard[1]-margin;if(state.keyboard[1]>ny+camera.h-margin)ny=state.keyboard[1]-camera.h+margin;
    putCamera({...camera,x:nx,y:ny});
    const [lon,lat]=inverse(state.keyboard);say(`${translate('Pin at')} ${Math.abs(lat).toFixed(1)} ${translate('degrees')} ${translate(lat>=0?'north':'south')}, ${Math.abs(lon).toFixed(1)} ${translate('degrees')} ${translate(lon>=0?'east':'west')}.`);
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();atPlace(...state.keyboard)}
  else if(e.key==='+'||e.key==='='){e.preventDefault();zoomMap(1/1.8)}else if(e.key==='-'){e.preventDefault();zoomMap(1.8)}else if(e.key==='Home'){e.preventDefault();openWorldOverview()}
});
$('zoomIn').addEventListener('click',()=>zoomMap(1/1.8));$('zoomOut').addEventListener('click',()=>zoomMap(1.8));$('worldView').addEventListener('click',()=>openWorldOverview());
listen(window,'resize',()=>{if(state.stage==='trace'){for(const label of $('edgeLabels').children){const cell=$('numberGrid').querySelector(`[data-uw-number="${label.textContent}"]`);label.style.fontSize=(parseFloat(getComputedStyle(cell).fontSize)*600/$('drawing').getBoundingClientRect().width)+'px'}return}if(state.stage!=='place'||state.placementMode!=='detail')return;const centre=[camera.x+camera.w/2,camera.y+camera.h/2],ratio=mapBox().width/mapBox().height;putCamera({x:centre[0]-camera.w/2,y:centre[1]-camera.w/ratio/2,w:camera.w})});
$('hintButton').addEventListener('click',()=>{$('feedback').textContent=CFG.hint});
$('locationHint').addEventListener('click',()=>{$('placeFeedback').textContent=CFG.geoHint});

$('retrace').addEventListener('click',init);
makeMapGrid();
// Overview choices are independent of the puzzle answer and its saved region.
// All frame coordinates below are broad navigation extents, not coverage grants.
const overviewRegions=[
 {id:'north-america',name:'North America & Caribbean',bounds:[-170,5,-45,80]},
 {id:'south-america',name:'South America',bounds:[-85,-58,-32,15]},
 {id:'europe',name:'Europe',bounds:[-25,33,50,72]},
 {id:'africa',name:'Africa',bounds:[-25,-36,55,38]},
 {id:'asia',name:'Asia',bounds:[30,-12,180,80]},
 {id:'west-pacific',name:'Western Pacific & Oceania',bounds:[100,-58,180,30]},
 {id:'east-pacific',name:'Central & eastern Pacific',bounds:[-180,-58,-90,35]},
 {id:'southern-oceans',name:'South Atlantic & Indian Ocean',bounds:[-70,-60,120,-20]}
];
let overviewSelection=null,overviewPin=[460,250],overviewDown=null;
function makeOverview(){
 const land=$('worldSvg').querySelector('.land').cloneNode(true);
 land.setAttribute('class','overview-land');$('overviewLand').appendChild(land);
 const grid=$('worldGrid').cloneNode(true);grid.removeAttribute('id');$('overviewGrid').appendChild(grid);
 const select=$('chooseRegion');
 for(const region of overviewRegions){const option=document.createElement('option');option.value=region.id;option.textContent=region.name;select.appendChild(option)}
}
function overviewPoint(e){const map=$('overviewSvg'),ctm=map.getScreenCTM();if(!ctm)return null;const p=map.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(ctm.inverse());return[Math.max(0,Math.min(920,q.x)),Math.max(0,Math.min(500,q.y))]}
function setOverviewSelection(selection,label='Selected region'){
 overviewSelection=selection;const r=$('overviewSelection');
 for(const [k,v] of Object.entries(selection))r.setAttribute(k,v);
 r.hidden=false;r.removeAttribute('visibility');
 overviewPin=[selection.x+selection.width/2,selection.y+selection.height/2];
 $('inspectRegion').disabled=false;$('inspectRegion').textContent=translate('Inspect this region');
 $('overviewStatus').textContent=translate(label);
}
function chooseOverviewPoint(p){
 const width=160,height=110;
 setOverviewSelection({x:Math.max(0,Math.min(920-width,p[0]-width/2)),y:Math.max(0,Math.min(500-height,p[1]-height/2)),width,height});
 const [lon,lat]=inverse(p);say(`${translate('Region selected around')} ${Math.abs(lat).toFixed(0)} ${translate('degrees')} ${translate(lat>=0?'north':'south')}, ${Math.abs(lon).toFixed(0)} ${translate('degrees')} ${translate(lon>=0?'east':'west')}. ${translate('Inspect this region to explore.')}`);
 $('chooseRegion').value='';
}
function openWorldOverview(focus=true){
 if(state.stage!=='place'||state.busy)return;
 state.placementMode='overview';overviewSelection=null;overviewPin=[460,250];$('mapFX').replaceChildren();$('placeFeedback').textContent='';
 $('detailPlacement').hidden=true;$('worldOverview').hidden=false;
 $('overviewSelection').setAttribute('visibility','hidden');$('inspectRegion').disabled=true;$('inspectRegion').textContent=translate('Select a region');
 $('overviewStatus').textContent='';$('chooseRegion').value='';
 if(focus)$('overviewSvg').focus({preventScroll:true});
}
function inspectChosenRegion(){
 if(!overviewSelection||state.busy||state.stage!=='place')return;
 state.placementMode='detail';$('worldOverview').hidden=true;$('detailPlacement').hidden=false;
 // Only the player's chosen rectangle determines the detailed view.
 const r=overviewSelection,b=mapBox(),ratio=b.width/Math.max(1,b.height);
 const width=Math.max(r.width,r.height*ratio)*1.04;
 putCamera({x:r.x+r.width/2-width/2,y:r.y+r.height/2-width/ratio/2,w:width});
 state.keyboard=[r.x+r.width/2,r.y+r.height/2];cursorVisible=false;updateCursor();
 $('worldSvg').focus({preventScroll:true});
}
$('overviewSvg').addEventListener('pointerdown',e=>{overviewDown={x:e.clientX,y:e.clientY}});
$('overviewSvg').addEventListener('pointercancel',()=>{overviewDown=null});
$('overviewSvg').addEventListener('click',e=>{if(state.stage!=='place'||state.placementMode!=='overview'||state.busy)return;if(overviewDown&&Math.hypot(e.clientX-overviewDown.x,e.clientY-overviewDown.y)>9){overviewDown=null;return}overviewDown=null;const p=overviewPoint(e);if(p)chooseOverviewPoint(p)});
$('overviewSvg').addEventListener('keydown',e=>{
 if(state.busy||state.placementMode!=='overview')return;
 const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(dirs[e.key]){e.preventDefault();const step=e.shiftKey?5:25,d=dirs[e.key];chooseOverviewPoint([Math.max(0,Math.min(920,overviewPin[0]+d[0]*step)),Math.max(0,Math.min(500,overviewPin[1]+d[1]*step))])}
 else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(overviewSelection)inspectChosenRegion();else chooseOverviewPoint(overviewPin)}
 else if(e.key==='Home'||e.key==='Escape'){e.preventDefault();openWorldOverview()}
});
$('chooseRegion').addEventListener('change',e=>{
 const region=overviewRegions.find(r=>r.id===e.target.value);if(!region)return;
 const a=forward(region.bounds.slice(0,2)),b=forward(region.bounds.slice(2));
 setOverviewSelection({x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),width:Math.abs(b[0]-a[0]),height:Math.abs(b[1]-a[1])},region.name);
 say(region.name+' selected for inspection.');
});
$('inspectRegion').addEventListener('click',inspectChosenRegion);
makeOverview();



function snapshot(){return{picks:[...state.picks],stage:state.stage,errors:state.errors,mode:state.placementMode,camera:{...camera},selection:overviewSelection?{...overviewSelection}:null,keyboard:[...state.keyboard],region:$('chooseRegion').value}}
function changed(){if(!destroyed)onChange(snapshot())}
for(const type of ['click','keydown','change','pointerup','wheel'])root.addEventListener(type,()=>queueMicrotask(changed),{signal:abort.signal,passive:type==='wheel'});
$('nextShore').addEventListener('click',onNext,{signal:abort.signal});
init();
if(saved){
 const picks=saved.picks??[];const solved=picks.length===12&&picks.every((n,i)=>n===CFG.sequence[i]);
 if(solved&&['place','result'].includes(saved.stage)){
  state.picks=[...picks];state.step=12;state.busy=false;
  if(saved.stage==='result')show('resultScene');
  else{initPlace();show('placeScene');requestAnimationFrame(()=>requestAnimationFrame(()=>{state.errors=saved.errors??0;if(saved.mode==='detail'&&saved.selection){setOverviewSelection(saved.selection);inspectChosenRegion();if(saved.camera)putCamera(saved.camera);if(saved.keyboard)state.keyboard=saved.keyboard;updateCursor()}else if(saved.selection){setOverviewSelection(saved.selection);$('chooseRegion').value=saved.region??''}changed()}))}
 }else for(const n of picks.slice(givenCount))select(n);
}
// Translate static UI after mounting without touching SVG paths or numerical data.
const failureHeading=$('unresolvedScene').querySelector('h1');if(failureHeading.firstChild?.nodeType===3)failureHeading.firstChild.textContent=translate(failureHeading.firstChild.textContent.trim());
for(const el of root.querySelectorAll('h1,h1 span,.eyebrow,button:not(.cell),option')){if(el.children.length===0&&el.textContent.trim())el.textContent=translate(el.textContent.trim())}
return{snapshot,destroy(){if(destroyed)return;destroyed=true;abort.abort();for(const id of frames)window.cancelAnimationFrame(id);for(const id of timeouts)clearTimeout(id);for(const a of root.getAnimations({subtree:true}))a.cancel()}};
}
