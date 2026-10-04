#!/usr/bin/env node
/**
 * Export the dashboard data back to JSON files in /data so that git history is the audit trail.
 *   DASHBOARD_URL=https://... BOT_TOKEN=... node scripts/export-data.mjs [--commit]
 * Writes data/{tasks,decisions,inputs,issues,findings,activity_log}.json, data/snapshots/*.json and data/snapshots/index.json.
 * With --commit it runs `git add data && git commit` (only when something changed).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { DASHBOARD_URL, BOT_TOKEN } = process.env;
if (!DASHBOARD_URL || !BOT_TOKEN) { console.error('DASHBOARD_URL and BOT_TOKEN are required'); process.exit(2); }
const r = await fetch(`${DASHBOARD_URL.replace(/\/$/, '')}/api/export?snapshots=full`, { headers: { Authorization: `Bearer ${BOT_TOKEN}` } });
if (!r.ok) { console.error('export failed', r.status); process.exit(1); }
const j = await r.json();
const dir = join(root, 'data'); mkdirSync(join(dir, 'snapshots'), { recursive: true });
const w = (f, v) => writeFileSync(join(dir, f), JSON.stringify(v, null, 2) + '\n');
for (const k of ['tasks', 'decisions', 'inputs', 'issues', 'findings', 'activity_log']) w(`${k}.json`, j[k]);
for (const s of j.snapshots) writeFileSync(join(dir, 'snapshots', `${s.id}.json`), JSON.stringify(s, null, 2) + '\n');
w('snapshots/index.json', j.snapshots.map(({ data, ...m }) => m));
if (j.snapshots.length) writeFileSync(join(dir, 'snapshots', 'latest.json'), JSON.stringify(j.snapshots[j.snapshots.length - 1], null, 2) + '\n');
console.log(`exported: tasks=${j.tasks.length} decisions=${j.decisions.length} findings=${j.findings.length} issues=${j.issues.length} inputs=${j.inputs.length} activity=${j.activity_log.length} snapshots=${j.snapshots.length}`);
if (process.argv.includes('--commit')) {
  try {
    execSync('git add data', { cwd: root, stdio: 'ignore' });
    const dirty = execSync('git status --porcelain data', { cwd: root }).toString().trim();
    if (dirty) { execSync(`git commit -q -m "data: export ${new Date().toISOString()}"`, { cwd: root }); console.log('committed'); } else console.log('no changes');
  } catch (e) { console.error('git commit failed:', e.message); }
}
