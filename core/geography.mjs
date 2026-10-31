/** Full geometry and WGS84 calculations, with no dependency on display paths. */
const RAD = Math.PI / 180;
export function validPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
}
export function mercator([lon,lat]) {
  if (!validPoint([lon,lat]) || Math.abs(lat) >= 85.05112878) throw new RangeError('Outside Mercator map');
  return [lon * RAD, Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2))];
}
export function inverseMercator([x,y]) {
  const p = [x / RAD, (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD];
  if (!validPoint(p)) throw new RangeError('Outside map'); return p;
}
export function fitProjection(bounds, width=900, height=580, padding=58) {
  const lo = mercator([bounds[0],bounds[1]]), hi = mercator([bounds[2],bounds[3]]);
  const scale = Math.min((width-2*padding)/(hi[0]-lo[0]), (height-2*padding)/(hi[1]-lo[1]));
  const cx=(lo[0]+hi[0])/2, cy=(lo[1]+hi[1])/2;
  return {forward(p){const [x,y]=mercator(p);return [width/2+(x-cx)*scale,height/2-(y-cy)*scale]},
    inverse([x,y]){return inverseMercator([(x-width/2)/scale+cx,cy-(y-height/2)/scale])}};
}
function ringContains(p, ring) {
  const coords=[];
  for (let [x,y] of ring) {
    const origin = coords.length ? coords.at(-1)[0] : p[0];
    x += 360 * Math.round((origin-x)/360); coords.push([x,y]);
  }
  const center=coords.reduce((sum,v)=>sum+v[0],0)/coords.length;
  const x=p[0]+360*Math.round((center-p[0])/360), y=p[1];
  let inside=false;
  for(let i=0,j=coords.length-1;i<coords.length;j=i++) {
    const a=coords[i],b=coords[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function contains(p, geometry) {
  if (!validPoint(p)) return false;
  const parts=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
  return parts.some(rings=>ringContains(p,rings[0]) && !rings.slice(1).some(r=>ringContains(p,r)));
}
export function countryCandidates(p, features) {
  return features.filter(f=>contains(p,f.geometry)).map(f=>f.properties.name);
}
export function geodesicMeters(p1,p2) {
  if (!validPoint(p1)||!validPoint(p2)) throw new TypeError('Invalid WGS84 coordinate');
  if(p1[0]===p2[0]&&p1[1]===p2[1])return 0;
  // Vincenty inverse on WGS84. A non-converging inverse is withheld, never guessed.
  const a=6378137,f=1/298.257223563,b=(1-f)*a;
  const U1=Math.atan((1-f)*Math.tan(p1[1]*RAD)),U2=Math.atan((1-f)*Math.tan(p2[1]*RAD));
  const sinU1=Math.sin(U1),cosU1=Math.cos(U1),sinU2=Math.sin(U2),cosU2=Math.cos(U2);
  const L=((p2[0]-p1[0]+540)%360-180)*RAD;
  let lambda=L,sinSigma,cosSigma,sigma,sinAlpha,cosSqAlpha,cos2SigmaM;
  for(let i=0;i<200;i++) {
    const s=Math.sin(lambda),c=Math.cos(lambda);
    sinSigma=Math.hypot(cosU2*s,cosU1*sinU2-sinU1*cosU2*c);
    if(sinSigma===0)return 0;
    cosSigma=sinU1*sinU2+cosU1*cosU2*c;sigma=Math.atan2(sinSigma,cosSigma);
    sinAlpha=cosU1*cosU2*s/sinSigma;cosSqAlpha=1-sinAlpha*sinAlpha;
    cos2SigmaM=cosSqAlpha>1e-15?cosSigma-2*sinU1*sinU2/cosSqAlpha:0;
    const C=f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
    const next=L+(1-C)*f*sinAlpha*(sigma+C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM**2)));
    if(Math.abs(next-lambda)<1e-12) {
      const uSq=cosSqAlpha*(a*a-b*b)/(b*b),A=1+uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq))),B=uSq/1024*(256+uSq*(-128+uSq*(74-47*uSq)));
      const delta=B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM**2)-B/6*cos2SigmaM*(-3+4*sinSigma**2)*(-3+4*cos2SigmaM**2)));
      return b*A*(sigma-delta);
    }
    lambda=next;
  }
  return null;
}
export function scoreAnswer(content, answer) {
  if (!['country','pin'].includes(answer.mode)) throw new TypeError('Unknown answer mode');
  if (answer.mode==='pin' && !validPoint(answer.pin)) throw new TypeError('Invalid pin');
  const correct=content.acceptedCountries.includes(answer.country);
  const distanceMeters=answer.mode==='pin' && content.referencePoint ? geodesicMeters(answer.pin,content.referencePoint) : null;
  const precision=answer.mode==='pin' && content.precisionApproved && Number.isFinite(content.precisionMeters) && distanceMeters!==null
    ? correct && distanceMeters<=content.precisionMeters : null;
  return {correct,distanceMeters,precision,referenceVersion:content.referenceVersion};
}
