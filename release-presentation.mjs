/** Presentation only: never writes or migrates player records. */
export const isPrivatePreview=config=>config.preview!==false||config.productionApproved!==true;

/** Permanent completion may predate a replacement; a compatible solved round is current evidence. */
export function hasCurrentCompletion(records,puzzleId,ledger){
 const entry=ledger.find(e=>e.id===puzzleId);
 if(!entry)return false;
 const hashes=[entry.proposedHash,...(entry.compatiblePreviousHashes??[])];
 return records.some(r=>r.puzzleId===puzzleId&&
  (r.id===`completion:${puzzleId}`||r.id.startsWith(`round:${puzzleId}:`))&&
  (r.contentRevision??1)===entry.proposedRevision&&hashes.includes(r.contentHash));
}
