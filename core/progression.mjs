/** Private configurable player-choice expedition foundation. No token, purchase or precision dependency. */
export function validatePlan(plan,ids){
 if(!plan||!Array.isArray(plan.regions)||!plan.regions.length)throw new TypeError('Invalid region plan');
 const regionIds=plan.regions.map(r=>r.id),members=plan.regions.flatMap(r=>r.puzzleIds);
 if(new Set(regionIds).size!==regionIds.length||!regionIds.includes(plan.openingRegion)||plan.regions.some(r=>!r.puzzleIds.length))throw new TypeError('Invalid opening/regions');
 if(new Set(members).size!==members.length||members.length!==ids.length||members.some(id=>!ids.includes(id)))throw new TypeError('Region inventory mismatch');
 if(plan.unlockThresholds.length!==regionIds.length-1||plan.unlockThresholds.some((t,i)=>!Number.isInteger(t)||t<1||i>0&&t<=plan.unlockThresholds[i-1]))throw new TypeError('Invalid milestones');
 return plan;
}
export const regionFor=(plan,id)=>plan.regions.find(r=>r.puzzleIds.includes(id));
const key=(plan,id)=>`region:${plan.id}:${id}`;
const signature=plan=>JSON.stringify({opening:plan.openingRegion,thresholds:plan.unlockThresholds,regions:plan.regions.map(r=>({id:r.id,puzzles:[...r.puzzleIds].sort()})).sort((a,b)=>a.id.localeCompare(b.id))});
export function initialiseRegions(records,plan,now=()=>Date.now()){
 const init=`progression:${plan.id}`,previous=records.get(init),configSignature=signature(plan);
 if(previous&&previous.configSignature!==configSignature)return {requiresReview:true};
 if(!previous){
  // Preserve all previously available charts when the reviewed proposal is refined.
  for(const prior of plan.supersedes??[])for(const oldRegion of prior.regions??[]){
   if(!records.has(`region:${prior.id}:${oldRegion.id}`))continue;
   for(const region of plan.regions)if(region.puzzleIds.some(id=>oldRegion.puzzleIds.includes(id))&&!records.has(key(plan,region.id)))records.set(key(plan,region.id),{id:key(plan,region.id),regionId:region.id,source:'migrated-availability',previousPlan:prior.id,previousRegion:oldRegion.id,openedAt:new Date(now()).toISOString()});
  }
 }
 if(!previous)records.set(init,{id:init,configSignature,approvalStatus:plan.approvalStatus,createdAt:new Date(now()).toISOString()});
 if(!records.has(key(plan,plan.openingRegion)))records.set(key(plan,plan.openingRegion),{id:key(plan,plan.openingRegion),regionId:plan.openingRegion,source:'opening',openedAt:new Date(now()).toISOString()});
 // Existing progress is honoured permanently, including an unfinished historical draft.
 for(const record of [...records.values()]){
  if(!record.puzzleId)continue;
  const historical=record.id.startsWith('completion:')||record.id.startsWith('historical-access:')||(record.id.startsWith('draft:')||record.id.startsWith('draft-history:'))&&Object.keys(record.assignments??{}).length>0;
  if(!historical)continue;const region=regionFor(plan,record.puzzleId);
  if(region&&!records.has(key(plan,region.id)))records.set(key(plan,region.id),{id:key(plan,region.id),regionId:region.id,source:record.id.startsWith('completion:')?'historical-completion':'historical-draft',evidenceRecord:record.id,openedAt:new Date(now()).toISOString()});
 }
 return regionState(records,plan);
}
export function regionState(records,plan){
 const values=[...records.values()],ids=new Set(values.filter(r=>r.id.startsWith('completion:')&&regionFor(plan,r.puzzleId)).map(r=>r.puzzleId));
 const opened=new Set(plan.regions.filter(r=>records.has(key(plan,r.id))).map(r=>r.id)),spent=values.filter(r=>r.id.startsWith(`region:${plan.id}:`)&&r.source==='player-choice').length;
 const earned=plan.unlockThresholds.filter(t=>ids.size>=t).length,remaining=plan.regions.length-opened.size;
 return {completed:ids.size,opened:[...opened],spent,earned,opportunities:Math.min(remaining,Math.max(0,earned-spent)),nextMilestone:plan.unlockThresholds[earned]??null,regions:plan.regions.map(r=>({...r,open:opened.has(r.id),completed:r.puzzleIds.filter(id=>ids.has(id)).length}))};
}
export function canPlay(records,plan,id){return Boolean(regionFor(plan,id))&&(records.has(key(plan,regionFor(plan,id).id))||records.has(`completion:${id}`));}
export function chooseRegion(records,plan,regionId,now=()=>Date.now()){
 const state=initialiseRegions(records,plan,now);if(state.requiresReview)return {ok:false,reason:'configuration-changed'};
 const region=plan.regions.find(r=>r.id===regionId);if(!region)return {ok:false,reason:'unknown-region'};
 if(records.has(key(plan,regionId)))return {ok:true,alreadyOpen:true,state:regionState(records,plan)};
 if(state.opportunities<1)return {ok:false,reason:'milestone-not-earned',state};
 records.set(key(plan,regionId),{id:key(plan,regionId),regionId,source:'player-choice',opportunity:state.spent+1,uniqueCompletionsAtChoice:state.completed,openedAt:new Date(now()).toISOString()});
 return {ok:true,alreadyOpen:false,state:regionState(records,plan)};
}
