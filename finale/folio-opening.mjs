import {sharedChartGeometry,sharedChartSVG} from './shared-chart.mjs';
const cartographerMark=()=>`<g class="shared-chart-desktop">${sharedChartGeometry('desktop')}</g><g class="shared-chart-mobile">${sharedChartGeometry('mobile')}</g>`;
export const folioSeal=()=>`<span class="folio-paper-seal" aria-hidden="true">${sharedChartSVG('desktop')}${sharedChartSVG('mobile')}</span>`;
/** Presentation-only: the same Atlas back-cover geometry anchors one physical sheet. */
export function concealedFolio(svg){
 const defs=svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0]??'';
 const start=svg.indexOf('<g class="finale-closed-book'),end=svg.indexOf('<g class="finale-letter-object');
 if(start<0||end<start)throw Error('Atlas back-cover geometry unavailable');
 let cover=svg.slice(start,end),closing=cover.lastIndexOf('</g>');
 const pocket=`<g class="folio-binding-lining">
  <path class="folio-cover-lining" d="M255 151 658 128 676 560 274 591Z"/>
  <path class="folio-binding-thread" d="M261 161 279 582"/>
  <path class="folio-source-paper" data-folio-source d="M341 299 591 284 600 431 350 447Z"/>
  <g class="folio-bound-seal" transform="translate(463.4 322.6) rotate(-3.3) scale(.931)" aria-hidden="true">${cartographerMark()}</g>
  <path class="folio-pocket-face" d="M266 331 667 306 677 561 276 592Z"/>
  <path class="folio-hidden-seam" d="M266 331Q460 315 667 306"/>
  <path class="folio-paper-lip" d="m342 300 249-15 1 4-249 15Z"/>
 </g>`;
 cover=cover.slice(0,closing)+pocket+cover.slice(closing);
 const label=svg.match(/aria-label="([^"]*)"/)?.[1]??'';
 return `<svg class="finale-atlas-art craft-atlas folio-concealed-atlas" viewBox="0 0 920 720" role="img" aria-label="${label}">${defs}${cover}</svg>`
  .replace(/id="([^"]+)"/g,(_,id)=>`id="folio-origin-${id}"`).replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#folio-origin-${id})`);
}
/** Uses the real rendered source and reading surface, so mobile needs no separate flight path. */
export function openFolioSheet(root){
 const sheet=root.querySelector('.finale-letter-reading'),origin=root.querySelector('.folio-origin'),source=origin?.querySelector('[data-folio-source]');
 let animations=[],settled=false;
 const onVisibility=()=>{if(document.hidden)finish()};
 function finish(){
  if(settled)return;settled=true;
  for(const animation of animations)animation.cancel();animations=[];
  window.removeEventListener('resize',finish);document.removeEventListener('visibilitychange',onVisibility);
  root.classList.remove('folio-opening');root.dataset.folioMotion='settled';
  sheet?.querySelectorAll('.folio-paper-sheen,.folio-paper-seal').forEach(detail=>detail.remove());
 }
 if(!sheet||!source||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return{finish}}
 const from=source.getBoundingClientRect(),to=sheet.getBoundingClientRect();
 if(!from.width||!from.height||!to.width||!to.height){finish();return{finish}}
 const dx=from.left-to.left,dy=from.top-to.top,sx=from.width/to.width,sy=from.height/to.height;
 const pose=(x,y,scaleX,scaleY,tilt=0,turn=0)=>`translate(${x}px,${y}px) perspective(1100px) rotateX(${tilt}deg) rotateZ(${turn}deg) scale(${scaleX},${scaleY})`;
 const baseDuration=1700,sealPause=400,duration=baseDuration+sealPause,at=ms=>ms/duration,easing='linear',curve='cubic-bezier(.22,.6,.35,1)';
 root.dataset.folioMotion='opening';
 window.addEventListener('resize',finish);document.addEventListener('visibilitychange',onVisibility);
 try{
  animations.push(sheet.animate([
   {offset:0,transform:pose(dx,dy,sx,sy,0,-3.3),easing:curve,clipPath:'inset(0 0 77% 0)',boxShadow:'1px 3px 2px #07141b66'},
   {offset:at(476),transform:pose(dx+from.width*.04,dy-from.height*.64,sx,sy,3,-3.3),easing:'linear',clipPath:'inset(0 0 0 0)',boxShadow:'3px 12px 11px #07141b55'},
   {offset:at(876),transform:pose(dx+from.width*.04,dy-from.height*.64,sx,sy,3,-3.3),easing:curve,clipPath:'inset(0 0 0 0)',boxShadow:'3px 12px 11px #07141b55'},
   {offset:at(1794),transform:pose(0,-4,1,.985,5,-.15),easing:curve,clipPath:'inset(0 0 0 0)',boxShadow:'3px 13px 16px #07141b33'},
   {offset:1,transform:'none',clipPath:'inset(0 0 0 0)',boxShadow:'5px 6px 0 #b59f7626'}
  ],{duration,easing,fill:'both'}));
  // Words remain available to assistive technology while ink gently appears on the settled sheet.
  for(const paragraph of sheet.querySelectorAll('p'))animations.push(paragraph.animate([{opacity:0},{opacity:0,offset:.7},{opacity:1}],{duration:baseDuration,delay:sealPause,easing:'ease-out',fill:'both'}));
  const sheen=sheet.querySelector('.folio-paper-sheen');
  if(sheen)animations.push(sheen.animate([{opacity:.85},{opacity:.55,offset:.48},{opacity:0}],{duration:baseDuration,delay:sealPause,easing:'ease-out',fill:'both'}));
  const seal=sheet.querySelector('.folio-paper-seal');
  if(seal){
   // Wax keeps its physical size as paper opens; the fold then covers it.
   const curveAt=x=>{let lo=0,hi=1;const cubic=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;for(let i=0;i<18;i++){const t=(lo+hi)/2;if(cubic(t,.22,.35)<x)lo=t;else hi=t}return cubic((lo+hi)/2,.6,1)};
   const sealFrames=[0,876,...Array.from({length:11},(_,i)=>908+i*32),1250,2100].map(ms=>{
    const progress=curveAt(Math.max(0,Math.min(1,(ms-876)/918))),covered=Math.max(0,Math.min(1,(ms-1000)/250));
    return{offset:at(ms),opacity:ms>=1250?0:1,transform:`scale(${sx/(sx+(1-sx)*progress)},${sy/(sy+(.985-sy)*progress)})`,clipPath:`inset(0 0 ${covered*100}% 0)`};
   });
   animations.push(seal.animate(sealFrames,{duration,easing:'linear',fill:'both'}));
  }
  const sheetAnimation=animations[0];sheetAnimation.finished.then(finish,()=>{});
 }catch{finish()}
 return{finish};
}
