/** Fit real saved route points with a screen-space safety margin; no animated camera. */
export function routeFrame(points,width,height,{margin=52,minWidth=260}={}) {
 if(!points.length||points.some(p=>p.length!==2||!p.every(Number.isFinite))||!Number.isFinite(width)||!Number.isFinite(height)||width<=2*margin||height<=2*margin)throw new TypeError('Route needs finite points and a usable viewport');
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),ratio=width/height;
 const w=Math.max(minWidth,(right-left)/(1-2*margin/width),(bottom-top)*ratio/(1-2*margin/height)),h=w/ratio;
 return {rect:[(left+right-w)/2,(top+bottom-h)/2,w,h],portraitScale:w/width};
}
