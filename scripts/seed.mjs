#!/usr/bin/env node
// Seeds the DB from data/seed/*.json (parsed from the analysis files) + the first snapshot.
// Refuses to run on a non-empty DB unless --force (a re-seed would overwrite Eyal's statuses/decisions).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { SUPABASE_URL, SUPABASE_ANON_KEY, DASH_DB_TOKEN } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DASH_DB_TOKEN) { console.error('missing SUPABASE_URL / SUPABASE_ANON_KEY / DASH_DB_TOKEN'); process.exit(2); }
async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: DASH_DB_TOKEN, ...args }) });
  const t = await r.text(); if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
}
const sel = (table, o = {}) => rpc('nd_select', { p_table: table, p_filter: o.filter ?? {}, p_order: o.order ?? null, p_limit: o.limit ?? null, p_cols: o.cols ?? '*' });
const up = (table, row) => rpc('nd_upsert', { p_table: table, p_row: row });
const load = (f) => JSON.parse(readFileSync(join(root, 'data', 'seed', f), 'utf8'));

const existing = await sel('tasks', { cols: 'id', limit: 1 });
if (existing.length && !process.argv.includes('--force')) { console.log('DB already seeded; use --force to overwrite'); process.exit(0); }
for (const [table, file] of [['tasks', 'tasks.json'], ['decisions', 'decisions.json'], ['findings', 'findings.json'], ['inputs', 'inputs.json'], ['issues', 'issues.json']]) {
  const rows = load(file);
  for (const row of rows) await up(table, row);
  console.log(`seeded ${table}: ${rows.length}`);
}
await up('activity_log', { actor: 'bot:grok-bot', actor_type: 'bot', entity_type: 'system', entity_id: null, action: 'seed', summary: 'הנתונים נטענו מקבצי הניתוח (work-plan, characterization, nully-vs-references, claude-code-prompts)', details: null });
try {
  const snap = JSON.parse(readFileSync(join(root, 'data', 'snapshots', 'latest.json'), 'utf8'));
  await up('snapshots', { id: snap.id, captured_at: snap.captured_at, label: snap.label, source: snap.source, content_hash: snap.content_hash, created_by: 'bot:shopify-snapshot', data: snap.data });
  await up('activity_log', { actor: 'bot:shopify-snapshot', actor_type: 'bot', entity_type: 'snapshot', entity_id: snap.id, action: 'snapshot', summary: `נשמר צילום מצב ראשוני של הטיוטה (${snap.label || snap.id})`, details: { hash: snap.content_hash } });
  console.log('seeded snapshot', snap.id);
} catch (e) { console.log('no snapshot seeded:', e.message); }
