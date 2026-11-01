// Only the approved revision7 replacements use a responsive puzzle viewport.
export const hasIntegratedViewport=p=>p?.contentRevision===7&&['s1-038','s1-048'].includes(p.id);
export const standardViewport=()=>({w:900,h:580});
export function resizePuzzleCamera(camera,from,to){
 if(![from.w,from.h,to.w,to.h].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('Invalid viewport');
 return{x:camera.x*to.w/from.w,y:camera.y*to.h/from.h,w:camera.w*to.w/from.w,h:camera.h*to.h/from.h};
}
export function scalePuzzleCamera(camera,factor,frame){
 if(!Number.isFinite(factor)||factor<=0||![frame.w,frame.h].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('Invalid camera scale');
 const w=Math.max(frame.w*.2,Math.min(frame.w*2,camera.w*factor)),h=w*frame.h/frame.w;
 return{x:camera.x+(camera.w-w)/2,y:camera.y+(camera.h-h)/2,w,h};
}

/** Mobile numbered labels are screen-sized; geographical anchors never move.
 * Separate only colliding labels, with short leaders back to their true anchors.
 * Off-screen points stay off-screen when the player zooms or pans. */
export function mobileDotPositions(points,width,height){
 const gap=46,pad=24,inside=p=>p[0]>=0&&p[0]<=width&&p[1]>=0&&p[1]<=height;
 const active=points.map(inside),positions=points.map(p=>[...p]);
 const clamp=(p)=>{p[0]=Math.max(pad,Math.min(width-pad,p[0]));p[1]=Math.max(pad,Math.min(height-pad,p[1]));};
 positions.forEach((p,i)=>{if(active[i])clamp(p)});
 for(let pass=0;pass<160;pass++){
  let overlap=false;
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
   if(!active[i]||!active[j])continue;
   const a=positions[i],b=positions[j];let dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
   if(d>=gap-.01)continue;overlap=true;if(d<.001){dx=1;dy=0;d=1}
   const shift=(gap-d)/2+.025;
   a[0]-=dx/d*shift;a[1]-=dy/d*shift;b[0]+=dx/d*shift;b[1]+=dy/d*shift;clamp(a);clamp(b);
  }
  if(!overlap)break;
 }
 return positions;
}
