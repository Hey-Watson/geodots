/** Read-only, revision-safe Atlas derivation. Never writes progress or rewards. */
export function validAtlasPuzzles(records,ledger){
 const revisions=new Map(ledger.map(e=>[e.id,e]));
 return new Set(records.filter(r=>{
  const e=revisions.get(r.puzzleId);
  return r.id?.startsWith('round:')&&e&&(r.contentRevision??1)===e.proposedRevision&&[e.proposedHash,...(e.compatiblePreviousHashes??[])].includes(r.contentHash);
 }).map(r=>r.puzzleId));
}
export function deriveAtlasCoverage({records,puzzles,ledger,plan,register,includeProposed=true}){
 const valid=validAtlasPuzzles(records,ledger),completed=new Set(records.filter(r=>r.id?.startsWith('completion:')).map(r=>r.puzzleId));
 const puzzleNames=new Set(puzzles.filter(p=>valid.has(p.id)).flatMap(p=>p.nodes.map(n=>n.name)));
 const puzzleEntities=new Set(register.entities.filter(e=>puzzleNames.has(e.name)).map(e=>e.id));
 const completedExpeditions=new Set(plan.regions.filter(r=>r.puzzleIds.every(id=>valid.has(id)&&completed.has(id))).map(r=>r.id));
 const expeditionEntities=new Set(includeProposed?register.entities.filter(e=>['approved-expedition','provisional'].includes(e.status)&&e.completionOnly&&e.assignedExpedition&&completedExpeditions.has(e.assignedExpedition)&&!puzzleEntities.has(e.id)).map(e=>e.id):[]);
 return{validPuzzles:valid,puzzleEntities,expeditionEntities,completedExpeditions,chartedEntities:new Set([...puzzleEntities,...expeditionEntities])};
}
/** A revealed story, invitation or unlocked puzzle is insufficient: require the atomic earned token/outcome. */
export function earnedAtlasLandmarks(records,landmarks){
 const byId=new Map(records.map(r=>[r.id,r]));
 return landmarks.filter(l=>{
  const token=byId.get(`token:${l.id}`),outcome=token&&byId.get(`outcome:${l.id}:${token.attemptId}`);
  return token?.landmarkId===l.id&&outcome?.landmarkId===l.id&&outcome.correct===true&&outcome.eligibility==='eligible'&&!outcome.revealOnly&&l.puzzleIds.some(id=>byId.has(`completion:${id}`));
 });
}
export function atlasCamera(camera,factor=1,dx=0,dy=0){
 const [x,y,w,h]=camera;if(![x,y,w,h,factor,dx,dy].every(Number.isFinite)||w<=0||h<=0||factor<=0)throw new RangeError('Invalid Atlas camera');
 const width=Math.max(90,Math.min(1800,w*factor)),height=width*h/w;
 return[Math.max(-900,Math.min(1800,x+(w-width)/2+dx)),Math.max(-500,Math.min(1000,y+(h-height)/2+dy)),width,height];
}
/** A separate azimuthal-equidistant South Pole inset: 60°S rim, no claims. */
export function antarcticPoint([lon,lat],radius=108){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||lat< -90||lat> -60)throw new RangeError('Outside Antarctic inset');
 const a=lon*Math.PI/180,r=(90+lat)/30*radius;return[130+r*Math.sin(a),130-r*Math.cos(a)];
}
/** Deterministic screen-distance connected clusters. Only earned, visible points are passed in. */
export function clusterLandmarks(landmarks,project,camera,width,height,diameter=46){
 const[x,y,w,h]=camera,scale=Math.min(width/w,height/h);
 const points=landmarks.map(l=>({landmark:l,point:project(l.referencePoint)})).filter(p=>p.point[0]>=x&&p.point[0]<=x+w&&p.point[1]>=y&&p.point[1]<=y+h).sort((a,b)=>a.landmark.id.localeCompare(b.landmark.id));
 const groups=[];for(const p of points){let members=[p];for(let i=groups.length-1;i>=0;i--)if(groups[i].some(q=>members.some(m=>Math.hypot(q.point[0]-m.point[0],q.point[1]-m.point[1])*scale<diameter))){members.push(...groups[i]);groups.splice(i,1);i=groups.length}groups.push(members)}
 return groups.map(members=>({ids:members.map(p=>p.landmark.id).sort(),point:[0,1].map(i=>members.reduce((n,p)=>n+p.point[i],0)/members.length),members}));
}
