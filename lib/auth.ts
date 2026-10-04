// Stateless signed-cookie session (works in both Edge middleware and Node routes via Web Crypto).
export const COOKIE = 'nd_session';
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function passwordOk(input: string) {
  const s = process.env.SESSION_SECRET || '';
  const pw = process.env.DASHBOARD_PASSWORD || '';
  if (!s || !pw) return false;
  return safeEqual(await hmac(s, 'pw:' + input), await hmac(s, 'pw:' + pw));
}
export async function makeSession(days = 30) {
  const exp = Date.now() + days * 86400_000;
  return `${exp}.${await hmac(process.env.SESSION_SECRET || '', 'session:' + exp)}`;
}
export async function verifySession(token?: string | null) {
  if (!token || !process.env.SESSION_SECRET) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(process.env.SESSION_SECRET, 'session:' + exp));
}
export function botOk(req: Request) {
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return !!process.env.BOT_TOKEN && t.length > 0 && safeEqual(t, process.env.BOT_TOKEN);
}
