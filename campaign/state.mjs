/** This marker is independent of every game save and preference. */
export const ENTRY_KEY='geodots:sealed-atlas:entered';
export function hasEntered(storage) {
  try { return storage.getItem(ENTRY_KEY)==='yes'; } catch { return false; }
}
export function rememberEntry(storage) {
  try { storage.setItem(ENTRY_KEY,'yes'); } catch { /* Current visit still opens. */ }
}
export function correctCode(value,config) {
  return typeof value==='string' && /^[0-9]{4}$/.test(value) && value===config.campaignCode;
}
