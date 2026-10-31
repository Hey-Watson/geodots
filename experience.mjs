/** Interruptible presentation only. Callers save progression before invoking a scene. */
import {routeFrame} from './core/viewport.mjs';
let cancelCurrent=()=>{};
export function cancelScene(){cancelCurrent();cancelCurrent=()=>{}}
export function frameAtlasTravel(svg,points){
 const world=svg.closest('.atlas-world');world.classList.add('travel-frame');
 const viewport=Math.min(innerHeight,globalThis.visualViewport?.height??innerHeight);
 svg.style.height=`${Math.max(160,Math.min(500,viewport-180))}px`;
 const box=svg.getBoundingClientRect(),frame=routeFrame(points,box.width,box.height);
 svg.setAttribute('viewBox',frame.rect.join(' '));
 svg.querySelector('.companion-portrait')?.setAttribute('transform',`scale(${frame.portraitScale})`);
 // One deliberate reposition before the passage. Scrolling and camera stay still during motion.
 window.scrollTo({top:Math.max(0,scrollY+svg.getBoundingClientRect().top-14),behavior:'instant'});
 return {...frame,height:box.height};
}
export function ceremony({kind,html,reduced=false,duration=2400,label='Continue',onFrame=()=>{}}){
 cancelScene();if(reduced)return Promise.resolve();
 return new Promise(resolve=>{const d=document.createElement('dialog');d.id='ceremony';d.className=`ceremony ${kind}`;d.setAttribute('aria-labelledby','ceremonyTitle');d.innerHTML=html+`<button class="ceremony-skip secondary">${label}</button>`;document.body.append(d);let raf,done=false;const start=performance.now();
 const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);d.close();d.remove();resolve()};cancelCurrent=finish;d.querySelector('button').onclick=finish;d.addEventListener('cancel',e=>{e.preventDefault();finish()});d.showModal();d.querySelector('button').focus();
 const tick=now=>{const t=Math.min(1,(now-start)/duration);onFrame(d,t);if(t===1)finish();else raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
 });
}
export function travel(element,points,{reduced=false,personality='vessel',onDone=()=>{}}={}){
 cancelScene();if(!element||!points.length){onDone();return}const last=points.at(-1),put=(x,y,turn=0)=>element.setAttribute('transform',`translate(${x} ${y}) rotate(${turn})`);put(...last);
 if(reduced){onDone();return}
 // With no earlier dated waypoint, arrive at the real first point without inventing a route origin.
 if(points.length===1){let raf,done=false;const start=performance.now();const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);put(...last);element.style.opacity='';element.classList.remove('travelling');onDone()};cancelCurrent=finish;element.classList.add('travelling');element.dataset.personality=personality;element.dataset.passage='arrival';const tick=now=>{const t=Math.min(1,(now-start)/650);element.style.opacity=String(t);element.setAttribute('transform',`translate(${last.join(' ')}) scale(${.75+.25*t})`);if(t===1)finish();else raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return finish}
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);let raf,done=false;const start=performance.now(),duration=1800;
 const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);put(...last);element.classList.remove('travelling');onDone()};cancelCurrent=finish;element.classList.add('travelling');element.dataset.personality=personality;element.dataset.passage='route';
 const tick=now=>{const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);let distance=ease*total,index=0;while(index<lengths.length-1&&distance>lengths[index])distance-=lengths[index++];const a=points[index],b=points[index+1],u=lengths[index]?distance/lengths[index]:1;
 const lift=personality==='wayfinder'?-Math.sin(Math.PI*t)*12:personality==='vessel'?Math.sin(t*Math.PI*5)*2:0,turn=personality==='compass'?Math.sin(Math.PI*t)*28:personality==='wayfinder'?Math.sin(Math.PI*t)*-9:Math.sin(t*Math.PI*4)*3;
 put(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u+lift,turn);if(t===1)finish();else raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return finish;
}
