import {openStore} from '../core/persistence.mjs';
import {chapterDatabase,draftKey,completionKey,normaliseDraft,sequenceCorrect,placementCorrect,chapterState} from './model.mjs';
/** Separate database; stable IDs/revisions retain history as the catalogue grows. */
export async function openChapterProgress(content,{store:providedStore,onFailure=()=>{}}={}){
 const store=providedStore??await openStore({name:chapterDatabase,onFailure});
 let queue=Promise.resolve();
 const run=fn=>{const task=queue.then(()=>store.transact(fn));queue=task.catch(()=>{});return task};
 return{
  get persistent(){return store.persistent},
  async state(){await queue;return chapterState(content,await store.records())},
  async draft(c){await queue;const rows=await store.records();const row=rows.find(r=>r.id===draftKey(c));const draft=normaliseDraft(c,row?.snapshot);if(draft.stage==='result'&&!rows.some(r=>r.id===completionKey(c)))draft.stage='place';return draft},
  async save(c,snapshot){const clean=normaliseDraft(c,snapshot);return run(rows=>{rows.set(draftKey(c),{id:draftKey(c),challengeId:c.id,revision:c.revision,fingerprint:c.fingerprint,snapshot:clean});rows.set('chapter:position',{id:'chapter:position',challengeId:c.id});return true})},
  async complete(c,snapshot,point){
   if(!sequenceCorrect(c,snapshot.picks)||!placementCorrect(c,point))return{value:false,persisted:store.persistent};
   return run(rows=>{const id=completionKey(c);if(!rows.has(id))rows.set(id,{id,challengeId:c.id,revision:c.revision,fingerprint:c.fingerprint,completedAt:new Date().toISOString(),placement:[...point]});rows.set(draftKey(c),{id:draftKey(c),challengeId:c.id,revision:c.revision,fingerprint:c.fingerprint,snapshot:normaliseDraft(c,{...snapshot,stage:'result'})});return true});
  },
  async flush(){await queue},
  async close(){await queue;store.close()}
 };
}
