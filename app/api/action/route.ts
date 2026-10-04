import { NextResponse } from 'next/server';
import { applyAction } from '@/lib/actions';

// Used by the dashboard UI (session cookie is enforced by middleware). Actor is always Eyal.
const ALLOWED = new Set(['task_update', 'decision_choose', 'decision_reset', 'input_update', 'issue_add', 'issue_update', 'issue_delete', 'finding_update']);
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !ALLOWED.has(body.action)) return NextResponse.json({ ok: false, error: 'bad action' }, { status: 400 });
  try {
    return NextResponse.json(await applyAction({ name: 'eyal', type: 'user' }, body));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status || 500 });
  }
}
