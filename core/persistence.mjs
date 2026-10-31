/** Transactional records with an explicit memory-only fallback. No global profile overwrite. */
export async function openStore({indexedDB:providedIndexedDB,name='geodots-preview-v1',onFailure=()=>{}}={}) {
  let database=null, memory=new Map(), persistent=false, queue=Promise.resolve();
  try {
    // Some privacy modes throw on property access, before open() can be called.
    const indexedDB=providedIndexedDB===undefined?globalThis.indexedDB:providedIndexedDB;
    database=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(name,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('records',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Storage upgrade blocked'));
    });
    database.onversionchange=()=>{database.close();persistent=false;onFailure('database-changed')};
    persistent=true;
  } catch {onFailure('storage-unavailable')}
  const clone=v=>structuredClone(v);
  const fallback=fn=>{const result=fn(memory);return {value:clone(result),persisted:false}};
  function transact(fn) {
    const operation=queue.then(async()=>{
      if(!persistent||!database)return fallback(fn);
      try {
        return await new Promise((resolve,reject)=>{
          const transaction=database.transaction('records','readwrite');
          const records=transaction.objectStore('records');let result,working;
          const request=records.getAll();
          request.onsuccess=()=>{
            try {
              working=new Map(request.result.map(record=>[record.id,record]));
              const original=new Map([...working].map(([id,v])=>[id,JSON.stringify(v)]));
              result=fn(working);
              if(result && typeof result.then==='function')throw new Error('Transaction mutator must be synchronous');
              for(const [id,value]of working)if(original.get(id)!==JSON.stringify(value))records.put(value);
            }catch(e){transaction.abort();reject(e)}
          };
          transaction.oncomplete=()=>{memory=working;resolve({value:clone(result),persisted:true})};
          transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error??new Error('aborted'));
        });
      }catch(e){
        // Validation/conflict is returned by mutators, not thrown. A storage failure
        // is visible and memory remains playable; no durable-save claim follows.
        persistent=false;onFailure('storage-write-failed');return fallback(fn);
      }
    });
    queue=operation.catch(()=>{});return operation;
  }
  return {transact,async records(){return (await transact(records=>[...records.values()])).value},
    get persistent(){return persistent},close(){database?.close()}};
}
