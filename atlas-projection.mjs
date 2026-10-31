/** Original spherical Mercator world fit; source shapes and scale unchanged.
 * Antarctic source intersections stop at74S, below the72S camera limit.
 */
import {projection} from './atlas-camera.mjs';
export const atlasProjection=projection;
export function atlasGeometryPath(geometry,projection=atlasProjection()) {
 const parts=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 return parts.map(rings=>rings.map(ring=>ring.map((point,i)=>{
  const [x,y]=projection.forward(point);return`${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;
 }).join('')+'Z').join('')).join('');
}
