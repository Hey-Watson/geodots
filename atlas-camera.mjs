/** Atlas-only approved Mercator camera. Individual puzzle projections are untouched. */
import {fitProjection} from './core/geography.mjs';
export const NORMAL=[0,0,900,500];
export const SOUTHERN_CAMERA_LIMIT=-72;
export const SOUTHERN_GEOMETRY_CLIP=-74;
export const projection=()=>fitProjection([-180,-60,180,84],900,500,18);
export const MAX_HEIGHT=projection().forward([0,SOUTHERN_CAMERA_LIMIT])[1];
export const MAX_CAMERA=[(900-MAX_HEIGHT*1.8)/2,0,MAX_HEIGHT*1.8,MAX_HEIGHT];
export function atlasCamera(camera,factor=1,dx=0,dy=0) {
  const[x,y,w,h]=camera;
  if(![x,y,w,h,factor,dx,dy].every(Number.isFinite)||w<=0||h<=0||factor<=0)throw new RangeError('Invalid Atlas camera');
  const ratio=h/w;
  let width=Math.max(90,Math.min(MAX_HEIGHT/ratio,w*factor)),height=width*ratio;
  const worldAspect=Math.abs(w/h-1.8)<1e-7;
  // One ordinary + returns the extended world view to its original framing.
  if(worldAspect&&factor<1&&h>500&&height<500){width=900;height=500}
  if(worldAspect&&factor!==1&&height>=500)return[(900-width)/2,0,width,height];
  const left=width>=900?(900-width)/2:Math.max(0,Math.min(900-width,x+(w-width)/2+dx));
  const top=Math.max(0,Math.min(MAX_HEIGHT-height,y+(h-height)/2+dy));
  return[left,top,width,height];
}
const running=new WeakMap();
export function cancelCamera(svg){const ticket=running.get(svg);if(ticket)cancelAnimationFrame(ticket);running.delete(svg);svg?.removeAttribute('data-camera-moving')}
export function animateCamera(svg,target,{reduced=false}={}) {
  if(!svg)return;
  cancelCamera(svg);
  const put=next=>svg.putAtlasCamera?svg.putAtlasCamera(next):svg.setAttribute('viewBox',next.join(' '));
  if(reduced){put(target);return}
  const start=svg.getAttribute('viewBox').trim().split(/\s+/).map(Number),began=performance.now();
  svg.setAttribute('data-camera-moving','true');
  const tick=now=>{
    if(!svg.isConnected){running.delete(svg);return}
    const t=Math.min(1,(now-began)/380),u=(1-Math.cos(Math.PI*t))/2;
    put(start.map((v,i)=>v+(target[i]-v)*u));
    if(t<1)running.set(svg,requestAnimationFrame(tick));else{running.delete(svg);svg.removeAttribute('data-camera-moving')}
  };
  running.set(svg,requestAnimationFrame(tick));
}
