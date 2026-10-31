import {assign,check,puzzleId} from './puzzle.mjs';
import {chartWaypoint} from './journey.mjs';
import {scoreAnswer} from './geography.mjs';
import {initialiseRegions,regionState,canPlay,chooseRegion as applyRegionChoice,regionFor} from './progression.mjs';
const clone=v=>structuredClone(v);
export function createSession(store,{now=()=>Date.now(),id=()=>crypto.randomUUID(),progression=null,contentRevisions={}}={}) {
  const contentFor=index=>contentRevisions[puzzleId(index)]??{revision:1,hash:null};
  const draftKey=index=>contentFor(index).revision===1?`draft:${puzzleId(index)}`:`draft:${puzzleId(index)}:r${contentFor(index).revision}`;
  const newDraft=(index,legacy={})=>({id:draftKey(index),puzzleId:puzzleId(index),contentRevision:contentFor(index).revision,contentHash:contentFor(index).hash??null,
    attemptId:id(),revision:0,assignments:{},checks:Number.isInteger(legacy.checks)&&legacy.checks>=0?legacy.checks:0,
    startedAt:Number.isFinite(legacy.startedAt)&&legacy.startedAt>0?legacy.startedAt:now(),solved:false,elapsedSeconds:null});
  function access(records,index){
    if(!progression)return null;
    const state=initialiseRegions(records,progression,now);
    if(state.requiresReview)return {locked:true,requiresReview:true};
    return canPlay(records,progression,puzzleId(index))?null:{locked:true,puzzleId:puzzleId(index),regionId:regionFor(progression,puzzleId(index))?.id};
  }
  function archive(records,draft,reason){
    const key=`draft-history:${draft.puzzleId}:r${draft.contentRevision??1}:${draft.attemptId}`;
    if(!records.has(key))records.set(key,{id:key,puzzleId:draft.puzzleId,contentRevision:draft.contentRevision??1,reason,original:clone(draft),assignments:clone(draft.assignments??{}),archivedAt:new Date(now()).toISOString()});
    return key;
  }
  async function load(index) {
    puzzleId(index); // Validate before entering the storage transaction.
    return store.transact(records=>{
      const denied=access(records,index);if(denied)return denied;
      const key=draftKey(index),target=contentFor(index),existing=records.get(key);
      if(existing&&(existing.contentRevision??1)===target.revision&&(!target.hash||existing.contentHash===target.hash))return existing;
      let history=null;
      if(existing&&target.compatibleHashes?.includes(existing.contentHash)){
        history=archive(records,existing,'editorial-only-compatible-content');
        const migrated={...clone(existing),contentHash:target.hash,revision:existing.revision+1,previousAttemptRecord:history,editorialMigration:true};records.set(key,migrated);return migrated;
      }
      if(existing)history=archive(records,existing,'content-hash-or-revision-changed');
      const previous=[...records.values()].filter(r=>r.puzzleId===puzzleId(index)&&r.id.startsWith('draft:')&&r.id!==key&&(r.contentRevision??1)<target.revision).sort((a,b)=>(a.contentRevision??1)-(b.contentRevision??1));
      for(const prior of previous)history=archive(records,prior,'new-content-revision; exact prior active key preserved');
      const legacyRecord=records.get(`legacy:borderPuzzleProgress:${index}`);
      let legacy={};try{legacy=JSON.parse(legacyRecord?.latestRaw??legacyRecord?.raw??'{}')}catch{}
      const draft=newDraft(index,target.revision===1?legacy??{}:{});
      if(history)draft.previousAttemptRecord=history;
      else if(target.revision!==1&&legacyRecord)draft.previousAttemptRecord=legacyRecord.id;
      records.set(key,draft);return draft;
    });
  }
  async function update(puzzle,draft,action) {
    return store.transact(records=>{
      const index=Number(draft.puzzleId.slice(-3))-1;
      const denied=access(records,index);if(denied)return {...denied,conflict:true};
      // A retained old key is historical evidence, never an active revision.
      const target=contentRevisions[draft.puzzleId];
      if(target&&((puzzle.contentRevision??1)!==target.revision||(draft.contentRevision??1)!==target.revision||draft.id!==draftKey(index)||(draft.contentHash??null)!==(target.hash??null)))return {conflict:true,contentChanged:true,draft:records.get(draftKey(index))??null};
      const newer=[...records.values()].find(r=>r.puzzleId===draft.puzzleId&&r.id.startsWith('draft:')&&(r.contentRevision??1)>(draft.contentRevision??1));
      if(newer)return {conflict:true,contentChanged:true,draft:newer};
      const existing=records.get(draft.id);
      if((puzzle.contentRevision??1)!==(existing?.contentRevision??1))return {conflict:true,contentChanged:true,draft:existing};
      if(existing&&draft.contentHash!==existing.contentHash)return {conflict:true,contentChanged:true,draft:existing};
      if(!existing || existing.attemptId!==draft.attemptId || existing.revision!==draft.revision)return {conflict:true,draft:existing};
      const next=clone(existing);let result=null;
      if(action.type==='assign'&&!next.solved){try{next.assignments=assign(puzzle,next.assignments,action.index,action.name)}catch{return {conflict:true,invalidAssignment:true,draft:existing}}}
      if(action.type==='clear'&&!next.solved)next.assignments={};
      if(action.type==='check'&&!next.solved) {
        result=check(puzzle,next.assignments);next.checks++;
        if(result.solved) {
          next.solved=true;next.elapsedSeconds=Math.max(0,Math.round((now()-next.startedAt)/1000));
          const key=`completion:${draft.puzzleId}`;
          const firstCompletion=!records.has(key);
          if(firstCompletion)records.set(`journey:${draft.puzzleId}`,{id:`journey:${draft.puzzleId}`,puzzleId:draft.puzzleId,completedAt:new Date(now()).toISOString(),waypoint:chartWaypoint(puzzle),contentRevision:next.contentRevision??1,contentHash:next.contentHash,source:'unique-solve'});
          if(firstCompletion)records.set(key,{id:key,puzzleId:draft.puzzleId,source:'solve',contentRevision:next.contentRevision??1,contentHash:next.contentHash??null,completedAt:new Date(now()).toISOString(),attemptId:draft.attemptId});
          if(firstCompletion){const count=[...records.values()].filter(r=>r.id.startsWith('completion:')).length,stage=[5,20,45].indexOf(count)+1;if(stage&&!records.has(`milestone:${stage}`))records.set(`milestone:${stage}`,{id:`milestone:${stage}`,stage,uniqueCompletions:count,earnedAt:new Date(now()).toISOString(),puzzleId:draft.puzzleId})}
          const roundId=`round:${draft.puzzleId}:${draft.attemptId}`;
          if(!records.has(roundId))records.set(roundId,{id:roundId,puzzleId:draft.puzzleId,attemptId:draft.attemptId,contentRevision:next.contentRevision??1,contentHash:next.contentHash??null,solvedAt:new Date(now()).toISOString(),geographicFootprint:puzzle.nodes.map(n=>({name:n.name,territoryId:n.territoryId??null,position:n.position})),elapsedSeconds:next.elapsedSeconds,checks:next.checks});
        }
      }
      if(action.type==='replay')Object.assign(next,newDraft(action.index),{revision:next.revision});
      next.revision++;records.set(next.id,next);return {draft:next,result,conflict:false};
    });
  }
  async function importLegacy(snapshots,completions) {
    return store.transact(records=>{
      for(const snapshot of snapshots) {
        // The original site saved timer/check progress, not unfinished assignments.
        // Preserve exact raw evidence and honour access without pretending it solves revision 2.
        const match=/^borderPuzzleProgress:(\d+)$/.exec(snapshot.key);
        if(match&&Number(match[1])<60){try{const old=JSON.parse(snapshot.raw);if(old&&typeof old==='object'&&!Array.isArray(old)&&(Number.isFinite(old.startedAt)&&old.startedAt>0||Number.isInteger(old.checks)&&old.checks>0)){const pid=puzzleId(Number(match[1])),accessKey=`historical-access:${pid}`;if(!records.has(accessKey))records.set(accessKey,{id:accessKey,puzzleId:pid,source:'legacy-unfinished-progress',evidenceRecord:`legacy:${snapshot.key}`})}}catch{}}
        const key=`legacy:${snapshot.key}`;
        if(!records.has(key))records.set(key,{id:key,raw:snapshot.raw});
        else {
          const previous=records.get(key);
          if((previous.latestRaw??previous.raw)!==snapshot.raw)records.set(key,{...previous,latestRaw:snapshot.raw,
            history:[...new Set([...(previous.history??[previous.raw]),snapshot.raw])]});
        }
      }
      for(const completion of completions) {
        const key=`completion:${completion.puzzleId}`;
        if(!records.has(key))records.set(key,{id:key,...clone(completion),source:'legacy-import'});
        else if(completion.completedDate) {
          const previous=records.get(key);
          if(!previous.completedDate||completion.completedDate<previous.completedDate)records.set(key,{
            ...previous,completedDate:completion.completedDate,legacyEvidence:clone(completion.evidence??[])});
        }
      }
      if(progression)initialiseRegions(records,progression,now);
      return completions.length;
    });
  }
  async function confirmLandmark(content,attemptId,answer,{practiceTokens='unresolved',revealOnly=false}={}) {
    if(!['unresolved','allow','deny'].includes(practiceTokens))throw new TypeError('Unknown practice policy');
    const validatedScore=revealOnly?{correct:false,distanceMeters:null,precision:null}:scoreAnswer(content,answer);
    return store.transact(records=>{
      if(progression&&content.puzzleIds&&!content.puzzleIds.some(pid=>records.has(`completion:${pid}`)))return {blocked:true,reason:'linked-puzzle-required'};
      const key=`outcome:${content.id}:${attemptId}`;
      if(records.has(key))return records.get(key);
      const stateKey=`discovery-state:${content.id}`,state=records.get(stateKey);
      if(state&&(state.attemptId!==attemptId||state.status!=='active'))return {blocked:true,reason:'attempt-changed'};
      const exposureKey=`exposure:${content.id}`;
      const practice=records.has(exposureKey);
      const score=validatedScore;
      const eligible=!revealOnly&&score.correct&&(!practice||practiceTokens==='allow');
      const outcome={id:key,landmarkId:content.id,attemptId,contentVersion:content.contentVersion,
        rulesVersion:'landmark-1',...clone(score),answer:revealOnly?null:clone(answer),practice,revealOnly,
        eligibility:practice&&practiceTokens==='unresolved'?'decision-required':eligible?'eligible':'ineligible',
        submittedAt:new Date(now()).toISOString()};
      records.set(key,outcome);
      if(state)records.set(stateKey,{...state,status:'confirmed',outcomeId:key});
      const firstKey=`first-attempt:${content.id}`;
      if(!revealOnly&&!records.has(firstKey)){
        const attempts=[...records.values()].filter(r=>r.landmarkId===content.id&&r.id.startsWith('outcome:')&&!r.revealOnly).sort((a,b)=>(a.submittedAt??'').localeCompare(b.submittedAt??''));
        const exposure=records.get(exposureKey),first=attempts.find(r=>r.attemptId===exposure?.attemptId)??attempts[0];
        records.set(firstKey,{id:firstKey,landmarkId:content.id,outcomeId:first.id,attemptId:first.attemptId,correct:first.correct,practice:first.practice,submittedAt:first.submittedAt});
      }
      if(!records.has(exposureKey))records.set(exposureKey,{id:exposureKey,landmarkId:content.id,attemptId,seenAt:outcome.submittedAt});
      const tokenKey=`token:${content.id}`;
      if(eligible&&!records.has(tokenKey))records.set(tokenKey,{id:tokenKey,landmarkId:content.id,attemptId,earnedAt:outcome.submittedAt,practice,
        contentVersion:content.contentVersion,precision:score.precision});
      else if(eligible&&score.precision===true&&records.has(tokenKey))records.set(tokenKey,{...records.get(tokenKey),precision:true,precisionAttemptId:attemptId});
      return outcome;
    });
  }
  async function preference(key,value) {
    return store.transact(records=>{records.set(`preference:${key}`,{id:`preference:${key}`,value});return value});
  }
  async function progressionStatus(){return store.transact(records=>progression?initialiseRegions(records,progression,now):null)}
  async function chooseRegion(regionId){return store.transact(records=>progression?applyRegionChoice(records,progression,regionId,now):{ok:false,reason:'no-plan'})}
  // Current challenge state is separate from immutable outcome/token history.
  function discoveryState(records,content,{practice=false}={}){
    const key=`discovery-state:${content.id}`,draftKey=`discovery-draft:${content.id}`;
    let state=records.get(key);
    if(!state){
      const draft=records.get(draftKey),outcomes=[...records.values()].filter(r=>r.landmarkId===content.id&&r.id.startsWith('outcome:'));
      const last=outcomes.sort((a,b)=>(a.submittedAt??'').localeCompare(b.submittedAt??'')).at(-1);
      if(draft&&!records.has(`outcome:${content.id}:${draft.attemptId}`))state={id:key,landmarkId:content.id,attemptId:draft.attemptId,status:'active'};
      else if(last)state={id:key,landmarkId:content.id,attemptId:last.attemptId,status:'confirmed',outcomeId:last.id};
    }
    if(!state||practice&&state.status==='confirmed'){
      const attemptId=id();state={id:key,landmarkId:content.id,attemptId,status:'active'};
      records.set(draftKey,{id:draftKey,landmarkId:content.id,attemptId,pin:null,guessCountry:'',mode:'pin'});
    }
    records.set(key,state);
    return {ok:true,state,draft:records.get(draftKey),outcome:state.status==='confirmed'?records.get(state.outcomeId):null};
  }
  async function beginDiscovery(content,{source='manual',puzzleAttemptId=null,practice=false}={}){
    return store.transact(records=>{
      if(content.puzzleIds&&!content.puzzleIds.some(pid=>records.has(`completion:${pid}`)))return {ok:false,reason:'linked-puzzle-required'};
      const key=`challenge:${content.id}`;
      if(!records.has(key))records.set(key,{id:key,landmarkId:content.id,contentVersion:content.contentVersion,source,puzzleAttemptId,beganAt:new Date(now()).toISOString()});
      return {...discoveryState(records,content,{practice}),challenge:records.get(key)};
    });
  }
  async function presentation(kind,eventId){return store.transact(records=>{const key=`presentation:${kind}:${eventId}`;if(records.has(key))return {first:false};records.set(key,{id:key,presentedAt:new Date(now()).toISOString()});return {first:true}})}
  async function inviteDiscovery(content){return store.transact(records=>{if(!content.puzzleIds.some(pid=>records.has(`completion:${pid}`)))return {ok:false};const key=`invitation:${content.id}`;if(!records.has(key))records.set(key,{id:key,landmarkId:content.id,offeredAt:new Date(now()).toISOString()});return {ok:true}})}
  async function saveDiscoveryDraft(content,draft){return store.transact(records=>{
    if(!content.puzzleIds.some(pid=>records.has(`completion:${pid}`)))return {ok:false};
    const state=records.get(`discovery-state:${content.id}`);
    if(!state||state.status!=='active'||state.attemptId!==draft.attemptId)return {ok:false,reason:'attempt-changed'};
    const key=`discovery-draft:${content.id}`;records.set(key,{id:key,...clone(draft),landmarkId:content.id});return {ok:true};
  })}
  return {presentation,inviteDiscovery,saveDiscoveryDraft,load,update,importLegacy,confirmLandmark,preference,progressionStatus,chooseRegion,beginDiscovery,draftKey};
}
