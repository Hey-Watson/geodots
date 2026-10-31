/** Real saved chart waypoints. Links are symbolic exploration, never travel claims. */
export function chartWaypoint(puzzle){
 const nodes=puzzle.nodes,mean=nodes.reduce((a,n)=>[a[0]+n.position[0]/nodes.length,a[1]+n.position[1]/nodes.length],[0,0]);
 const n=[...nodes].sort((a,b)=>Math.hypot(a.position[0]-mean[0],a.position[1]-mean[1])-Math.hypot(b.position[0]-mean[0],b.position[1]-mean[1]))[0];
 return {name:n.name,territoryId:n.territoryId??null,position:[...n.position]};
}
export function journeyEntries(records){
 const byId=new Map();
 for(const r of records)if(r.id.startsWith('journey:')&&r.completedAt&&r.waypoint?.position?.every(Number.isFinite))byId.set(r.puzzleId,r);
 // Baseline actual first solves may already have a dated, saved geographic footprint.
 for(const c of records.filter(r=>r.id.startsWith('completion:')&&r.source==='solve'&&r.completedAt)){
  if(byId.has(c.puzzleId))continue;const round=records.find(r=>r.id.startsWith('round:')&&r.attemptId===c.attemptId&&r.geographicFootprint?.length);
  if(round)byId.set(c.puzzleId,{id:`journey:${c.puzzleId}`,puzzleId:c.puzzleId,completedAt:c.completedAt,waypoint:chartWaypoint({nodes:round.geographicFootprint}),source:'saved-first-solve'});
 }
 return [...byId.values()].sort((a,b)=>a.completedAt.localeCompare(b.completedAt)||a.id.localeCompare(b.id));
}
