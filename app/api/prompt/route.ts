import { NextResponse } from 'next/server';
import { select } from '@/lib/db';

// Returns one task's Claude Code prompt (no login required); keeps the board payload small.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || '';
  const [t] = await select('tasks', { filter: { id }, cols: 'id, prompt' });
  if (!t) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, id: t.id, prompt: t.prompt });
}
