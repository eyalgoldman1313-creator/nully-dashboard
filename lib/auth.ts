// The dashboard UI has no login. Only the bot API (POST /api/bot-update, GET /api/export) is protected, via Bearer BOT_TOKEN.
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export function botOk(req: Request) {
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return !!process.env.BOT_TOKEN && t.length > 0 && safeEqual(t, process.env.BOT_TOKEN);
}
