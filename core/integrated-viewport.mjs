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
