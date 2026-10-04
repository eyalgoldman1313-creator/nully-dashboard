import { NextResponse } from 'next/server';
import { botOk } from '@/lib/auth';
import { applyAction } from '@/lib/actions';

/**
 * Write API for bots. Auth: `Authorization: Bearer $BOT_TOKEN`.
 * Body: { actor: "bot:<name>", action: "...", ...fields }   (see README for the action list)
 * Actions: task_update, task_create, decision_update, decision_choose (needs on_behalf_of_eyal), decision_reset,
 *          input_update, issue_add, issue_update, issue_delete, finding_update, finding_create, push_snapshot, log, bulk
 */
export async function POST(req: Request) {
  if (!botOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ ok: false, error: 'action required' }, { status: 400 });
  const raw = String(body.actor || 'bot:unknown').slice(0, 60);
  const name = raw.startsWith('bot:') ? raw : 'bot:' + raw;
  try {
    return NextResponse.json(await applyAction({ name, type: 'bot' }, body));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status || 500 });
  }
}
export async function GET(req: Request) {
  if (!botOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, endpoint: 'POST /api/bot-update', docs: 'see README.md › Bot API' });
}
