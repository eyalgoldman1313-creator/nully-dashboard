import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifySession } from '@/lib/auth';

// Everything requires the session cookie except the login page/endpoint and the bot endpoints
// (which authenticate with a bearer token inside the route handlers).
const PUBLIC = ['/login', '/api/login', '/api/bot-update', '/api/export', '/favicon.ico', '/icon.svg'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (await verifySession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const u = req.nextUrl.clone();
  u.pathname = '/login';
  u.search = pathname === '/' ? '' : '?next=' + encodeURIComponent(pathname + req.nextUrl.search);
  return NextResponse.redirect(u);
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
