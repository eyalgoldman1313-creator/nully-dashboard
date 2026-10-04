// Pure business logic (also used by scripts/test-logic.mjs through a tiny transpile-free copy of the same rules).
export type Task = any;

export const STATUS_LABEL: Record<string, string> = { open: 'פתוח', in_progress: 'בעבודה', blocked: 'חסום', done: 'בוצע' };
export const STATUSES = ['open', 'in_progress', 'blocked', 'done'] as const;

/** ids that count as "resolved" for blocker purposes: decided decisions, provided inputs, finished tasks */
export function resolvedSet(tasks: any[], decisions: any[], inputs: any[]) {
  const s = new Set<string>();
  decisions.forEach((d) => d.status === 'decided' && s.add(d.id));
  inputs.forEach((i) => i.status === 'provided' && s.add(i.id));
  tasks.forEach((t) => t.status === 'done' && s.add(t.id));
  return s;
}
export const unresolved = (list: string[] | null | undefined, resolved: Set<string>) => (list || []).filter((b) => !resolved.has(b));

/**
 * Release / re-block tasks after any change. Returns the list of status changes (and mutates copies passed in).
 * - blocked task whose blockers are all resolved  -> open (auto_released = true)
 * - open task that was auto-released and now has an unresolved blocker again -> blocked
 * Iterates because finishing a task can resolve a blocker of another one (T4.1 -> T4.2).
 */
export function reconcile(tasks: any[], decisions: any[], inputs: any[]) {
  const changes: { id: string; from: string; to: string; reason: string }[] = [];
  for (let round = 0; round < 6; round++) {
    const resolved = resolvedSet(tasks, decisions, inputs);
    let again = false;
    for (const t of tasks) {
      const bl = t.blockers || [];
      if (!bl.length) continue;
      const open = unresolved(bl, resolved);
      if (t.status === 'blocked' && open.length === 0) {
        changes.push({ id: t.id, from: 'blocked', to: 'open', reason: `כל החוסמים נסגרו (${bl.join(', ')})` });
        t.status = 'open'; t.auto_released = true; again = true;
      } else if (t.status === 'open' && t.auto_released && open.length > 0) {
        changes.push({ id: t.id, from: 'open', to: 'blocked', reason: `חוסם נפתח מחדש (${open.join(', ')})` });
        t.status = 'blocked'; t.auto_released = false; again = true;
      }
    }
    if (!again) break;
  }
  return changes;
}

export const hoursMid = (t: any) => (t.effort_min_h != null ? (Number(t.effort_min_h) + Number(t.effort_max_h ?? t.effort_min_h)) / 2 : null);

export function waveStats(tasks: any[], wave: number) {
  const ts = tasks.filter((t) => t.wave === wave);
  const c = { open: 0, in_progress: 0, blocked: 0, done: 0 } as Record<string, number>;
  ts.forEach((t) => (c[t.status] = (c[t.status] || 0) + 1));
  const total = ts.length;
  const pct = total ? Math.round(((c.done + ts.filter((t) => t.status === 'in_progress').reduce((a, t) => a + (t.progress || 0) / 100, 0)) / total) * 100) : 0;
  return { total, ...c, pct } as any;
}
