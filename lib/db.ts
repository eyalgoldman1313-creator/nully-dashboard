// Thin wrapper over the Supabase RPC gateway (tables are private; only SECURITY DEFINER functions are callable
// and each one verifies DASH_DB_TOKEN server-side).
const url = () => process.env.SUPABASE_URL!;
async function rpc(fn: string, args: any) {
  const r = await fetch(`${url()}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: process.env.DASH_DB_TOKEN, ...args }),
    cache: 'no-store',
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${fn} ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
export const select = (table: string, o: { filter?: any; order?: string; limit?: number; cols?: string } = {}) =>
  rpc('nd_select', { p_table: table, p_filter: o.filter ?? {}, p_order: o.order ?? null, p_limit: o.limit ?? null, p_cols: o.cols ?? '*' }) as Promise<any[]>;
export const upsert = (table: string, row: any) => rpc('nd_upsert', { p_table: table, p_row: row }) as Promise<any>;
export const del = (table: string, id: string) => rpc('nd_delete', { p_table: table, p_id: id });
