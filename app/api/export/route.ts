import { NextResponse } from 'next/server';
import { botOk, COOKIE, verifySession } from '@/lib/auth';
import { select } from '@/lib/db';

// Full data export (used by scripts/export-data.mjs to write /data/*.json for the git audit trail).
// ?snapshots=full includes snapshot payloads.
export async function GET(req: Request) {
  const cookie = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!botOk(req) && !(await verifySession(cookie))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const full = new URL(req.url).searchParams.get('snapshots') === 'full';
  const [tasks, decisions, inputs, issues, findings, snapshots, activity_log] = await Promise.all([
    select('tasks', { order: 'sort' }), select('decisions', { order: 'id' }), select('inputs', { order: 'id' }), select('issues', { order: 'id' }),
    select('findings', { order: 'id' }), select('snapshots', { order: 'captured_at', cols: full ? '*' : 'id, captured_at, label, source, content_hash, created_by' }),
    select('activity_log', { order: 'id' }),
  ]);
  return NextResponse.json({ ok: true, exported_at: new Date().toISOString(), tasks, decisions, inputs, issues, findings, snapshots, activity_log });
}
