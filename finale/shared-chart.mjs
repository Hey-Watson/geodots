/** The owner's Shared Chart reference, redrawn as calibrated surveying linework. */
const ink='#152e3e',brass='#b08d57',paper='#e9dfcb';
const point=(angle,r)=>{const a=angle*Math.PI/180;return[48+Math.sin(a)*r,48-Math.cos(a)*r]};
const numbers=p=>p.map(n=>n.toFixed(3)).join(' ');
const circle=(r,width,extra='')=>`<circle cx="48" cy="48" r="${r}" fill="none" stroke="${ink}" stroke-width="${width}" ${extra}/>`;
export function sharedChartGeometry(detail='desktop'){
 const mobile=detail==='mobile',ticks=mobile?8:36;
 const calibration=Array.from({length:ticks},(_,i)=>{
  const angle=mobile?22.5+i*45:i*10;if(!mobile&&i%9===0)return'';
  const long=mobile||i%3===0;
  return `<path d="M${numbers(point(angle,long?25.8:27.7))} ${numbers(point(angle,29.2))}"/>`;
 }).join('');
 const stations=[0,90,180,270].map(angle=>{const [x,y]=point(angle,30.5);return `<circle cx="${x}" cy="${y}" r="${mobile?1.65:1.35}"/>`}).join('');
 const observations=mobile?'':[45,135,225,315].map(angle=>[23.5,35.5].map((r,i)=>{const[x,y]=point(angle,r);return `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${i ? .65 : .85}"/>`}).join('')).join('');
 return `<g class="shared-chart-geometry" transform="translate(4.8 4.8) scale(.9)">
  ${circle(35.5,mobile?1:.6,`stroke-dasharray="${mobile?'4 2.3':'2.7 1.25'}"`)}
  ${circle(30.5,mobile?2.3:1.8)}
  ${circle(mobile?22:23.5,mobile?1.8:1.1)}
  ${circle(mobile?13:16.5,mobile?1.15:.65,'stroke-dasharray="1.8 1.2"')}
  ${mobile?'':circle(10,.65,'stroke-dasharray="1.5 1"')}
  <path d="M2 48H94M48 1.5V94.5" fill="none" stroke="${ink}" stroke-width="${mobile?1.65:1.15}"/>
  ${mobile?'':`<path d="M${numbers(point(45,35.5))} ${numbers(point(225,35.5))}M${numbers(point(135,35.5))} ${numbers(point(315,35.5))}" fill="none" stroke="${ink}" stroke-width=".45" stroke-dasharray="1.8 2.2"/>`}
  <g fill="none" stroke="${ink}" stroke-width="${mobile?1.2:.6}">${calibration}</g>
  <g fill="${ink}">${stations}${observations}<circle cx="7.5" cy="48" r="${mobile?1.6:1.5}"/><circle cx="88.5" cy="48" r="${mobile?1.6:1.5}"/>${mobile?'':'<circle cx="48" cy="12.5" r="1.05"/><circle cx="48" cy="83.5" r="1.05"/>'}</g>
  <g fill="${paper}" stroke="${ink}" stroke-width="${mobile?1.5:1.1}"><circle cx="48" cy="3.8" r="1.7"/><circle cx="48" cy="92.2" r="1.7"/></g>
  <circle cx="48" cy="48" r="4.5" fill="${brass}" stroke="${ink}" stroke-width="${mobile?1.5:1.15}"/>
  ${mobile?'':'<circle cx="48" cy="48" r="3.25" fill="none" stroke="#d3b47f" stroke-width=".45"/>'}
 </g>`;
}
export function sharedChartSVG(detail='desktop',{standalone=false}={}){
 return `<svg xmlns="http://www.w3.org/2000/svg" class="shared-chart-${detail}" viewBox="0 0 96 96" preserveAspectRatio="none" ${standalone?`width="384" height="384" role="img" aria-label="The Shared Chart — ${detail} surveying impression"`:'aria-hidden="true" focusable="false"'}>${sharedChartGeometry(detail)}</svg>`;
}
