/** Isolated additive persistence experiment. Not imported by the live page.
 * Callers provide Storage and retain one session instance for memory-only play.
 * Immutable content-addressed records avoid cross-tab read/modify/write loss.
 */
const PREFIX = 'geodots:v1:';
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const puzzleId = i => `s1-${String(i + 1).padStart(3, '0')}`;
const validId = id => typeof id === 'string' && /^s1-(00[1-9]|0[1-5][0-9]|060)$/.test(id);
function dateOrNull(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const date = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v ? v : null;
}
async function digest(raw) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function createProgressSession(storage) {
  const memory = new Map();
  function read(key, issues) {
    try { return storage.getItem(key); }
    catch { issues.push({key, reason: 'storage-read-failed'}); return memory.get(key) ?? null; }
  }
  async function append(kind, value, issues) {
    const raw = JSON.stringify(value);
    const key = `${PREFIX}${kind}:${await digest(raw)}`;
    // Memory is a fallback, never proof that a write persisted.
    memory.set(key, raw);
    try {
      const previous = storage.getItem(key);
      if (previous !== null && previous !== raw) throw new Error('immutable conflict');
      if (previous === null) storage.setItem(key, raw);
      if (storage.getItem(key) !== raw) throw new Error('write not confirmed');
      return true;
    } catch {
      issues.push({key, reason: 'storage-write-failed'});
      return false;
    }
  }
  function parse(raw, key, issues) {
    if (raw === null) return null;
    try { return JSON.parse(raw); }
    catch { issues.push({key, reason: 'malformed-json'}); return null; }
  }
  async function migrate() {
    const issues = [];
    let allSaved = true;
    const imported = new Set();
    let language = null;
    for (let i = 0; i < 60; i++) {
      const id = puzzleId(i);
      for (const source of ['borderPuzzleProgress', 'borderPuzzleBestTimes']) {
        const key = `${source}:${i}`;
        const raw = read(key, issues);
        if (raw === null) continue;
        // Preserve original bytes before recording a migrated achievement.
        const snapshotSaved = await append('legacy-snapshot', {schemaVersion: 1, key, raw}, issues);
        allSaved = snapshotSaved && allSaved;
        const value = parse(raw, key, issues);
        let event = null;
        if (source === 'borderPuzzleProgress') {
          if (!plain(value) || typeof value.solved !== 'boolean') {
            issues.push({key, reason: 'invalid-progress'});
          } else if (value.solved === true) {
            event = {schemaVersion: 1, puzzleId: id, source: 'legacy-solved',
                     completedDate: dateOrNull(value.solvedDate)};
          }
        } else if (!Array.isArray(value)) {
          issues.push({key, reason: 'invalid-best-times'});
        } else {
          const times = value.filter(t => typeof t === 'number' && Number.isFinite(t) && t >= 0);
          if (times.length !== value.length) issues.push({key, reason: 'invalid-best-time-elements'});
          if (times.length) event = {schemaVersion: 1, puzzleId: id, source: 'legacy-best-times',
                                   completedDate: null, bestTimes: times};
        }
        if (event) {
          imported.add(id);
          // If backup fails, retain playable evidence in memory, but do not
          // mark the persistent migration complete or skip the backup on retry.
          if (snapshotSaved) allSaved = await append('completion', event, issues) && allSaved;
          else {
            const rawEvent = JSON.stringify(event);
            memory.set(`${PREFIX}completion:${await digest(rawEvent)}`, rawEvent);
            allSaved = false;
          }
        }
      }
    }
    const langRaw = read('borderPuzzleLang', issues);
    if (langRaw !== null) {
      allSaved = await append('legacy-snapshot', {schemaVersion: 1, key: 'borderPuzzleLang', raw: langRaw}, issues) && allSaved;
      if (langRaw === 'en' || langRaw === 'fr') language = langRaw;
      else issues.push({key: 'borderPuzzleLang', reason: 'invalid-language'});
    }
    // No permanent "done" shortcut: reconcile surviving legacy evidence on every run.
    return {schemaVersion: 1, imported: [...imported].sort(), language,
            persisted: allSaved && !issues.some(i => i.reason.startsWith('storage-')),
            migrationComplete: allSaved && issues.length === 0, issues};
  }
  async function completions() {
    const issues = [];
    const records = new Map(memory);
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(`${PREFIX}completion:`)) {
          const value = storage.getItem(key);
          if (value !== null) records.set(key, value);
        }
      }
    } catch { issues.push({reason: 'storage-read-failed'}); }
    const byId = new Map();
    for (const [key, raw] of records) {
      if (!key.startsWith(`${PREFIX}completion:`)) continue;
      const event = parse(raw, key, issues);
      if (!plain(event) || event.schemaVersion !== 1 || !validId(event.puzzleId)
          || !['legacy-solved', 'legacy-best-times', 'solve'].includes(event.source)
          || key !== `${PREFIX}completion:${await digest(raw)}`) {
        issues.push({key, reason: 'invalid-completion'}); continue;
      }
      const prior = byId.get(event.puzzleId) ?? {puzzleId: event.puzzleId, completedDate: null, evidence: []};
      const date = dateOrNull(event.completedDate);
      if (date && (!prior.completedDate || date < prior.completedDate)) prior.completedDate = date;
      prior.evidence.push(event);
      byId.set(event.puzzleId, prior);
    }
    return {records: [...byId.values()].sort((a, b) => a.puzzleId.localeCompare(b.puzzleId)), issues};
  }
  async function recordSolve({puzzleId: id, attemptId, completedDate = null}) {
    if (!validId(id) || typeof attemptId !== 'string' || !attemptId.trim()) throw new TypeError('Invalid solve identity');
    const issues = [];
    const persisted = await append('completion', {schemaVersion: 1, puzzleId: id, attemptId,
      completedDate: dateOrNull(completedDate), source: 'solve'}, issues);
    return {persisted, issues};
  }
  return {migrate, completions, recordSolve};
}
