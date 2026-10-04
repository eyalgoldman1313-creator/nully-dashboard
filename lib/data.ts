import { select } from './db';
import { reconcile, resolvedSet } from './logic';

export async function loadAll() {
  const [tasks, decisions, inputs, issues, findings, snaps, activity] = await Promise.all([
    select('tasks', { order: 'sort' }),
    select('decisions', { order: 'id' }),
    select('inputs', { order: 'id' }),
    select('issues', { order: 'created_at desc' }),
    select('findings', { order: 'id' }),
    select('snapshots', { order: 'captured_at desc', cols: 'id, captured_at, label, source, content_hash, created_by' }),
    select('activity_log', { order: 'at desc', limit: 300 }),
  ]);
  const byNum = (a: any, b: any) => Number(a.id.slice(1)) - Number(b.id.slice(1));
  findings.sort(byNum);
  const num = (x: string) => (x.match(/\d+/g) || []).map(Number);
  decisions.sort((a, b) => (a.id[0] === b.id[0] ? num(a.id)[0] - num(b.id)[0] : a.id.localeCompare(b.id)));
  inputs.sort((a, b) => (a.id[0] === b.id[0] ? num(a.id)[0] - num(b.id)[0] : a.id.localeCompare(b.id)));
  const resolved = [...resolvedSet(tasks, decisions, inputs)];
  return { tasks, decisions, inputs, issues, findings, snaps, activity, resolved };
}
export async function loadSnapshot(id: string) {
  const r = await select('snapshots', { filter: { id } });
  return r[0];
}
export { reconcile };
