/** Bonus-only rules. No main puzzle, reward, Atlas or ending dependencies. */
export const chapterDatabase='geodots-uncharted-world-v1';
export const versionKey=c=>`${c.id}:r${c.revision}:${c.fingerprint}`;
export const draftKey=c=>'draft:'+versionKey(c);
export const completionKey=c=>'completion:'+versionKey(c);
export function validateContent(content){
 const ids=content.challenges.map(c=>c.id),future=content.future.map(c=>c.id);
 if(content.availableOrder.length!==ids.length||new Set(content.availableOrder).size!==ids.length||content.schemaVersion!==1||new Set([...ids,...future]).size!==content.plannedCount||content.availableOrder.some(id=>!ids.includes(id)))throw Error('Invalid chapter catalogue');
 for(const c of content.challenges){
  const givens=c.startingCount??4;if(!Number.isInteger(givens)||givens<4||givens>6)throw Error('Invalid starting evidence');
  if(c.kind!=='numbered-grid')throw Error('Challenge variation is not implemented');
  if(!Number.isInteger(c.revision)||!c.fingerprint||c.cells.length!==36||new Set(c.cells).size!==36||c.cells.some(n=>!Number.isInteger(n)||n<1||n>36)||c.sequence.length!==12||new Set(c.sequence).size!==12||c.sequence.some(n=>!c.cells.includes(n)))throw Error('Invalid numbered challenge');
  if(!c.realCoast||!c.mapCoast||!c.projection||!c.anchor)throw Error('Missing sourced geography');
 }
 return content;
}
export const sequenceCorrect=(c,picks)=>Array.isArray(picks)&&picks.length===12&&picks.every((n,i)=>n===c.sequence[i]);
export function ringContains([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function placementCorrect(c,[x,y]){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 // Preserve the approved V4 regional envelope in the shared chart coordinates.
 if(c.traceProfile==='madagascar-v4')return Math.hypot((x-c.anchor[0])*1.05,(y-c.anchor[1])*1.45)<62;
 return c.acceptance.some(rings=>ringContains([x,y],rings[0])&&!rings.slice(1).some(r=>ringContains([x,y],r)));
}
export function normaliseDraft(c,value){
 const givens=c.startingCount??4;
 const initial={picks:c.sequence.slice(0,givens),stage:'trace',errors:0,mode:'overview'};
 if(!value||!Array.isArray(value.picks))return initial;
 const p=value.picks;
 if(p.length<givens||p.length>12||new Set(p).size!==p.length||p.some(n=>!c.cells.includes(n))||c.sequence.slice(0,givens).some((n,i)=>n!==p[i]))return initial;
 const result={...initial,picks:[...p],errors:Math.max(0,Number.isInteger(value.errors)?value.errors:0)};
 result.stage=sequenceCorrect(c,p)&&['place','result'].includes(value.stage)?value.stage:'trace';
 if(result.stage==='place'){
  result.mode=value.mode==='detail'?'detail':'overview';
  const rect=value.selection;
  if(rect&&['x','y','width','height'].every(k=>Number.isFinite(rect[k]))&&rect.width>0&&rect.height>0)result.selection={...rect};
  const camera=value.camera;
  if(camera&&['x','y','w','h'].every(k=>Number.isFinite(camera[k]))&&camera.w>=.4&&camera.w<=1450)result.camera={...camera};
  if(Array.isArray(value.keyboard)&&value.keyboard.length===2&&value.keyboard.every(Number.isFinite))result.keyboard=[...value.keyboard];
  result.region=typeof value.region==='string'?value.region:'';
 }
 return result;
}
export function chapterState(content,records){
 const map=new Map(records.map(r=>[r.id,r])),order=content.availableOrder,completed=order.filter(id=>map.has(completionKey(content.challenges.find(c=>c.id===id))));
 return{completed,available:order.filter((id,i)=>i===0||completed.includes(order[i-1])),lastId:map.get('chapter:position')?.challengeId??order[0],plannedCount:content.plannedCount};
}
