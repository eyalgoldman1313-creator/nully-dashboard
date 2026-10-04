import { select, upsert, del } from './db';
import { reconcile } from './logic';

export type Actor = { name: string; type: 'user' | 'bot' };
const now = () => new Date().toISOString();
const TASK_FIELDS = ['status', 'progress', 'notes', 'assignee', 'title', 'effort', 'details'];
const FINDING_FIELDS = ['status', 'status_note', 'note', 'severity', 'title', 'evidence_site', 'evidence_reference', 'recommendation'];
const ISSUE_STATUS = ['open', 'in_progress', 'resolved', 'wontfix'];
const TASK_STATUS = ['open', 'in_progress', 'blocked', 'done'];
const FINDING_STATUS = ['open', 'fixed', 'wontfix', 'out_of_scope'];

async function log(a: Actor, entity_type: string, entity_id: string | null, action: string, summary: string, details?: any) {
  await upsert('activity_log', { actor: a.name, actor_type: a.type, entity_type, entity_id, action, summary, details: details ?? null });
}
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const fail = (m: string, status = 400) => Object.assign(new Error(m), { status });

/** After any change, release/re-block tasks and persist + log it. */
async function settle(a: Actor) {
  const [tasks, decisions, inputs] = await Promise.all([select('tasks'), select('decisions'), select('inputs')]);
  const changes = reconcile(tasks, decisions, inputs);
  const out: string[] = [];
  for (const c of changes) {
    const t = tasks.find((x) => x.id === c.id);
    await upsert('tasks', { id: c.id, status: c.to, auto_released: t.auto_released, updated_at: now(), updated_by: 'system' });
    const msg = c.to === 'open' ? `${c.id} שוחררה: ${c.reason}` : `${c.id} נחסמה שוב: ${c.reason}`;
    await log({ name: 'system', type: 'bot' }, 'task', c.id, c.to === 'open' ? 'auto_unblock' : 'auto_block', msg, { trigger_by: a.name });
    out.push(msg);
  }
  return out;
}

export async function applyAction(a: Actor, body: any): Promise<any> {
  const act = body?.action as string;
  switch (act) {
    case 'task_update': {
      const [t] = await select('tasks', { filter: { id: body.id } });
      if (!t) throw fail('task not found', 404);
      const patch: any = pick(body, TASK_FIELDS);
      if (patch.status && !TASK_STATUS.includes(patch.status)) throw fail('bad status');
      if (patch.progress != null) patch.progress = Math.max(0, Math.min(100, Math.round(Number(patch.progress))));
      if (patch.status === 'done') patch.progress = 100;
      if (patch.status && patch.status !== t.status) {
        patch.auto_released = false;
        if ((patch.status === 'in_progress' || patch.status === 'done') && !body.force) {
          const [decisions, inputs, tasks] = await Promise.all([select('decisions'), select('inputs'), select('tasks')]);
          const { resolvedSet, unresolved } = await import('./logic');
          const open = unresolved(t.blockers, resolvedSet(tasks, decisions, inputs));
          if (open.length) throw fail(`blocked_by:${open.join(',')}`, 409);
        }
      }
      const row = { id: t.id, ...patch, updated_at: now(), updated_by: a.name };
      await upsert('tasks', row);
      const parts: string[] = [];
      if (patch.status && patch.status !== t.status) parts.push(`סטטוס ${t.status} → ${patch.status}`);
      if (patch.progress != null && patch.progress !== t.progress) parts.push(`התקדמות ${t.progress}% → ${patch.progress}%`);
      if (patch.notes !== undefined && patch.notes !== t.notes) parts.push('עודכנו הערות');
      if (patch.assignee !== undefined && patch.assignee !== t.assignee) parts.push(`אחראי: ${patch.assignee || '—'}`);
      for (const k of ['title', 'effort', 'details']) if (patch[k] !== undefined && patch[k] !== t[k]) parts.push(`עודכן ${k}`);
      await log(a, 'task', t.id, 'task_update', `${t.id} ${t.title}: ${parts.join(', ') || 'ללא שינוי'}`, { before: pick(t, Object.keys(patch)), after: patch, note: body.reason });
      return { ok: true, released: await settle(a) };
    }
    case 'task_create': {
      if (!body.id || !body.title) throw fail('id and title required');
      const exists = await select('tasks', { filter: { id: body.id } });
      if (exists.length) throw fail('task exists', 409);
      const row = { id: body.id, wave: body.wave ?? 3, title: body.title, status: 'open', progress: 0, sort: 999, blockers: [], partial_blockers: [], depends_on: body.depends_on ?? [], finding_ids: body.finding_ids ?? [],
        ...pick(body, ['source', 'impact', 'impact_level', 'effort', 'details', 'prompt', 'kind', 'notes']), updated_at: now(), updated_by: a.name };
      await upsert('tasks', row);
      await log(a, 'task', body.id, 'task_create', `נוספה משימה ${body.id}: ${body.title}`);
      return { ok: true };
    }
    case 'decision_choose': {
      const [d] = await select('decisions', { filter: { id: body.id } });
      if (!d) throw fail('decision not found', 404);
      const opt = (d.options || []).find((o: any) => o.id === body.option);
      if (!opt) throw fail('unknown option');
      if (opt.disabled) throw fail('option disabled');
      if (a.type === 'bot' && !body.on_behalf_of_eyal) throw fail('bots may only record a decision on behalf of Eyal (on_behalf_of_eyal: true)', 403);
      await upsert('decisions', { id: d.id, status: 'decided', chosen: opt.id, note: body.note ?? null, decided_by: a.type === 'user' ? 'eyal' : `${a.name} (בשם אייל)`, decided_at: now(), updated_at: now(), updated_by: a.name });
      await log(a, 'decision', d.id, 'decision_choose', `${d.id} ${d.title}: נבחר "${opt.label}"${body.note ? ' — ' + body.note : ''}`, { option: opt.id, note: body.note ?? null, previous: d.chosen });
      return { ok: true, released: await settle(a) };
    }
    case 'decision_reset': {
      const [d] = await select('decisions', { filter: { id: body.id } });
      if (!d) throw fail('decision not found', 404);
      await upsert('decisions', { id: d.id, status: 'open', chosen: null, note: null, decided_by: null, decided_at: null, updated_at: now(), updated_by: a.name });
      await log(a, 'decision', d.id, 'decision_reset', `${d.id} ${d.title}: ההחלטה נפתחה מחדש`);
      return { ok: true, released: await settle(a) };
    }
    case 'decision_update': {
      const [d] = await select('decisions', { filter: { id: body.id } });
      if (!d) throw fail('decision not found', 404);
      const patch = pick(body, ['evidence', 'recommended', 'options', 'question', 'decided_note', 'note']);
      await upsert('decisions', { id: d.id, ...patch, updated_at: now(), updated_by: a.name });
      await log(a, 'decision', d.id, 'decision_update', `${d.id}: עודכנו ${Object.keys(patch).join(', ')}`);
      return { ok: true };
    }
    case 'input_update': {
      const [i] = await select('inputs', { filter: { id: body.id } });
      if (!i) throw fail('input not found', 404);
      if (body.status && !['needed', 'provided'].includes(body.status)) throw fail('bad status');
      await upsert('inputs', { id: i.id, ...pick(body, ['status', 'note']), updated_at: now(), updated_by: a.name });
      await log(a, 'input', i.id, 'input_update', `${i.id} ${i.title}: ${body.status === 'provided' ? 'סומן כסופק' : body.status === 'needed' ? 'סומן כחסר' : 'עודכנה הערה'}${body.note ? ' — ' + body.note : ''}`);
      return { ok: true, released: await settle(a) };
    }
    case 'issue_add': {
      if (!body.title?.trim()) throw fail('title required');
      const all = await select('issues', { cols: 'id' });
      const max = all.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, '')) || 0), 0);
      const id = `I${max + 1}`;
      await upsert('issues', { id, title: body.title.trim(), body: body.body ?? null, kind: body.kind || 'note', status: 'open', source: a.type === 'user' ? 'dashboard' : 'bot', author: a.type === 'user' ? 'eyal' : a.name, related: body.related ?? [], created_at: now(), updated_at: now() });
      await log(a, 'issue', id, 'issue_add', `נוסף פריט ${id}: ${body.title.trim()}`);
      return { ok: true, id };
    }
    case 'issue_update': {
      const [i] = await select('issues', { filter: { id: body.id } });
      if (!i) throw fail('issue not found', 404);
      if (body.status && !ISSUE_STATUS.includes(body.status)) throw fail('bad status');
      await upsert('issues', { id: i.id, ...pick(body, ['status', 'title', 'body', 'resolution', 'kind']), updated_at: now() });
      await log(a, 'issue', i.id, 'issue_update', `${i.id} ${i.title}: ${body.status ? 'סטטוס → ' + body.status : 'עודכן'}`);
      return { ok: true };
    }
    case 'issue_delete': {
      const [i] = await select('issues', { filter: { id: body.id } });
      if (!i) throw fail('issue not found', 404);
      await del('issues', i.id);
      await log(a, 'issue', i.id, 'issue_delete', `נמחק פריט ${i.id}: ${i.title}`);
      return { ok: true };
    }
    case 'finding_update': {
      const [f] = await select('findings', { filter: { id: body.id } });
      if (!f) throw fail('finding not found', 404);
      const patch: any = pick(body, FINDING_FIELDS);
      if (patch.status && !FINDING_STATUS.includes(patch.status)) throw fail('bad status');
      await upsert('findings', { id: f.id, ...patch, updated_at: now(), updated_by: a.name });
      await log(a, 'finding', f.id, 'finding_update', `${f.id} ${f.title}: ${patch.status && patch.status !== f.status ? `סטטוס ${f.status} → ${patch.status}` : 'עודכן'}`, { before: pick(f, Object.keys(patch)), after: patch });
      return { ok: true };
    }
    case 'finding_create': {
      if (!body.id || !body.title) throw fail('id and title required');
      await upsert('findings', { id: body.id, title: body.title, severity: body.severity ?? 'medium', severity_level: body.severity_level ?? 2, category: body.category ?? null, status: 'open', in_scope: true, task_ids: body.task_ids ?? [],
        ...pick(body, ['evidence_site', 'evidence_reference', 'recommendation', 'impact', 'effort']), updated_at: now(), updated_by: a.name });
      await log(a, 'finding', body.id, 'finding_create', `נוסף ממצא ${body.id}: ${body.title}`);
      return { ok: true };
    }
    case 'push_snapshot': {
      const s = body.snapshot;
      if (!s?.id || !s?.data) throw fail('snapshot {id, data} required');
      const prev = await select('snapshots', { order: 'captured_at desc', limit: 1, cols: 'id, content_hash' });
      if (prev[0]?.content_hash && prev[0].content_hash === s.content_hash && !body.force) return { ok: true, unchanged: true, id: prev[0].id };
      await upsert('snapshots', { id: s.id, captured_at: s.captured_at ?? now(), label: s.label ?? null, source: s.source ?? null, content_hash: s.content_hash ?? null, created_by: a.name, data: s.data });
      await log(a, 'snapshot', s.id, 'snapshot', `נשמר צילום מצב של הטיוטה${s.label ? ' (' + s.label + ')' : ''} — ${s.id}`, { hash: s.content_hash });
      return { ok: true, id: s.id, previous: prev[0]?.id ?? null };
    }
    case 'log': {
      await log(a, body.entity_type ?? 'note', body.entity_id ?? null, 'note', String(body.summary ?? '').slice(0, 500), body.details);
      return { ok: true };
    }
    case 'bulk': {
      const results: any[] = [];
      for (const sub of body.actions ?? []) {
        try { results.push(await applyAction(a, sub)); } catch (e: any) { results.push({ ok: false, error: e.message }); }
      }
      return { ok: true, results };
    }
    default:
      throw fail('unknown action: ' + act);
  }
}
