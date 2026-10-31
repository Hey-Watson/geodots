/** Platform-neutral puzzle rules. Frozen content stays in the published JSON. */
export const puzzleId = index => {
  if (!Number.isInteger(index) || index < 0 || index >= 60) throw new RangeError('Unknown legacy slot');
  return `s1-${String(index + 1).padStart(3, '0')}`;
};
export function validateAssignment(puzzle, assignment) {
  const offered = new Set([...puzzle.nodes.map(n => n.name), ...(puzzle.decoys ?? [])]);
  const values = Object.entries(assignment);
  return values.every(([key, name]) => /^(0|[1-9]\d*)$/.test(key) && Number(key) < puzzle.nodes.length && offered.has(name))
    && new Set(values.map(([,name]) => name)).size === values.length;
}
export function assign(puzzle, current, index, name) {
  if (!Number.isInteger(index) || !puzzle.nodes[index]) throw new RangeError('Unknown node');
  const next = {...current};
  for (const [i, value] of Object.entries(next)) if (value === name) delete next[i];
  if (name == null || name === '') delete next[index]; else next[index] = name;
  if (!validateAssignment(puzzle, next)) throw new TypeError('Invalid assignment');
  return next;
}
export function check(puzzle, assignment) {
  if (!validateAssignment(puzzle, assignment)) throw new TypeError('Invalid assignment');
  const correct = puzzle.nodes.reduce((sum, node, i) => sum + Number(assignment[i] === node.name), 0);
  return {solved: correct === puzzle.nodes.length, correct, total: puzzle.nodes.length};
}
export function stageFor(completed, thresholds = [0, 5, 20, 45]) {
  const count = new Set(completed).size;
  return thresholds.reduce((stage, n, index) => count >= n ? index : stage, 0);
}
export function nextUnsolved(puzzles, completed, after = -1) {
  for (let offset = 1; offset <= puzzles.length; offset++) {
    const index = (after + offset) % puzzles.length;
    if (!completed.has(puzzleId(index))) return index;
  }
  return null;
}
export function expeditionProgress(expeditions, completed) {
  return expeditions.map(e => ({...e, completed: e.puzzleIds.filter(id => completed.has(id)).length,
    total: e.puzzleIds.length, complete: e.puzzleIds.length > 0 && e.puzzleIds.every(id => completed.has(id))}));
}
export function freeCatalogue(manifest) {
  const ids = manifest.entries.map((entry, index) => {
    if (entry.id !== puzzleId(index) || entry.legacy_index !== index) throw new Error('Legacy identity mismatch');
    return entry.id;
  });
  if (ids.length !== 60) throw new Error('Free inventory must contain sixty puzzles');
  return {schemaVersion: 1, version: 'series-one-1', packs: [{id:'series-one', contentVersion:1,
    type:'series', puzzleIds:ids, access:{web:'free',ios:'free'}, entitlement:null}]};
}
