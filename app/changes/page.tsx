import { loadAll, loadSnapshot } from '@/lib/data';
import { diffSnapshots, AREAS, type Change } from '@/lib/diff';
import { fmtDate } from '@/lib/labels';
import { HISTORY_NAV, Subnav } from '@/components/Nav';

export const dynamic = 'force-dynamic';

const KIND: Record<string, [string, string]> = { added: ['נוסף', 'ok'], removed: ['הוסר', 'bad'], changed: ['שונה', 'warn'], moved: ['סדר שונה', 'info'] };
const VERB: Record<string, string> = { added: 'נוסף', removed: 'הוסר', changed: 'שונה', moved: 'סדר שונה ב' };
const short = (v: any) => (v == null ? '—' : String(v));

function ils(v: any) {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
}
function safeAmount(v: string) {
  try {
    const j = JSON.parse(v);
    const n = Number(j.amount);
    if (j.currency_code === 'ILS' && Number.isFinite(n)) return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
    if (Number.isFinite(n)) return `${new Intl.NumberFormat('he-IL').format(n)} ${j.currency_code}`;
    return `${j.amount} ${j.currency_code}`;
  } catch { return v; }
}
function summarize(list: Change[]) {
  const bits = list.slice(0, 3).map((c) => `${VERB[c.kind] || c.kind} ${c.path}`);
  const more = list.length > 3 ? ` ועוד ${list.length - 3}` : '';
  return bits.join(' · ') + more;
}

function Val({ v, cls }: { v: any; cls: string }) {
  const s = short(v);
  return <div className={`val ${cls}`} dir="auto">{s.length > 600 ? s.slice(0, 600) + '…' : s}</div>;
}

export default async function Changes({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; files?: string }> }) {
  const sp = await searchParams;
  const { snaps } = await loadAll();
  const bId = sp.b || snaps[0]?.id;
  const aId = sp.a || snaps.find((s) => s.id !== bId)?.id;
  const [A, B] = await Promise.all([aId ? loadSnapshot(aId) : null, bId ? loadSnapshot(bId) : null]);
  const changes: Change[] = A && B ? diffSnapshots(A.data, B.data) : [];
  const showFiles = sp.files === '1';
  const visible = changes.filter((c) => showFiles || c.area !== 'קבצי ערכה');
  const byArea = AREAS.map((a) => [a, visible.filter((c) => c.area === a)] as const).filter(([, l]) => l.length);
  const d = B?.data;

  return (
    <>
      <header className="page-head">
        <h1>שינויים בטיוטה</h1>
        <p className="lede">השוואה בין שני צילומים שנלקחו בקריאה בלבד מ־Shopify: סדר סקשנים, מוצר, מחירים, מדיניות ותפריטים.</p>
      </header>
      <Subnav items={HISTORY_NAV} />

      <form className="surface filters" method="get">
        <label className="inline-field">צילום קודם
          <select name="a" defaultValue={aId}>{snaps.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.captured_at)}{s.label ? ' · ' + s.label : ''}</option>)}</select>
        </label>
        <label className="inline-field">צילום חדש
          <select name="b" defaultValue={bId}>{snaps.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.captured_at)}{s.label ? ' · ' + s.label : ''}</option>)}</select>
        </label>
        <label className="check"><input type="checkbox" name="files" value="1" defaultChecked={showFiles} /> כולל קבצי ערכה</label>
        <button className="btn primary" type="submit">השוואה</button>
      </form>
      <p className="meta">{snaps.length} צילומים שמורים. צילום חדש רץ מהקופסה: <code>node scripts/shopify-snapshot.mjs --push</code></p>

      {!A && B && (
        <div className="surface section">
          <h2>נשמר צילום הבסיס הראשון</h2>
          <p>זה הצילום היחיד כרגע, ולכן עוד אין מה להשוות. אחרי השינוי הבא בערכה או בחנות מריצים צילום נוסף, והשינויים יופיעו כאן.</p>
        </div>
      )}

      {A && B && (
        <section className="section">
          <h2>מה השתנה</h2>
          <p className="meta">{fmtDate(A.captured_at)} עד {fmtDate(B.captured_at)} · {visible.length} שינויים{!showFiles ? ' (בלי קבצי ערכה)' : ''}</p>
          {!visible.length && <p>אין הבדלים בין שני הצילומים.</p>}
          {byArea.map(([area, list]) => (
            <section key={area} id={area} className="section">
              <h3>{area}</h3>
              <p className="area-sum">{summarize(list)}.</p>
              <details>
                <summary>פרטים טכניים ({list.length})</summary>
                {list.map((c, i) => (
                  <div key={i} className="chg">
                    <p><span className={`chip ${KIND[c.kind][1]}`}>{KIND[c.kind][0]}</span> <bdi dir="auto">{c.path}</bdi></p>
                    {c.before !== undefined && <Val v={c.before} cls="old" />}
                    {c.after !== undefined && <Val v={c.after} cls="new" />}
                  </div>
                ))}
              </details>
            </section>
          ))}
        </section>
      )}

      {d && (
        <section className="section">
          <h2>תוכן הצילום ({fmtDate(B.captured_at)}{B.label ? ' · ' + B.label : ''})</h2>
          <div className="grid g2">
            <div>
              <h3>סדר סקשנים · דף הבית</h3>
              <ol>{(d.templates['templates/index.json']?.sections || []).map((s: any) => <li key={s.id}><span className="ltr">{s.id}</span> <span className="muted ltr">({s.type})</span>{s.disabled && <span className="chip warn">כבוי</span>}</li>)}</ol>
            </div>
            <div>
              <h3>סדר סקשנים · דף מוצר</h3>
              <ol>{(d.templates['templates/product.json']?.sections || []).map((s: any) => <li key={s.id}><span className="ltr">{s.id}</span> <span className="muted ltr">({s.type})</span>{s.disabled && <span className="chip warn">כבוי</span>}</li>)}</ol>
            </div>
            <div>
              <h3>מוצר ווריאנטים</h3>
              {d.products.map((p: any) => (
                <div key={p.handle}>
                  <p><b>{p.title}</b> <span className="chip">{p.status}</span> <span className="ltr muted">{p.handle}</span></p>
                  <div className="table-wrap">
                    <table className="tbl">
                      <thead><tr><th>וריאנט</th><th className="num">מחיר</th><th className="num">לפני</th><th className="num">חד־פעמי</th></tr></thead>
                      <tbody>{p.variants.map((v: any) => (
                        <tr key={v.title}>
                          <td>{v.title}</td>
                          <td className="num"><bdi>{ils(v.price)}</bdi></td>
                          <td className="num"><bdi>{ils(v.compareAtPrice)}</bdi></td>
                          <td className="num"><bdi>{v.onetimePrice ? safeAmount(v.onetimePrice) : '—'}</bdi></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <p className="meta">תוכניות מנוי: {p.sellingPlanGroups.length ? p.sellingPlanGroups.map((g: any) => g.name).join(', ') : 'אין'}</p>
                </div>
              ))}
            </div>
            <div>
              <h3>תפריטים ומדיניות</h3>
              {d.menus.map((m: any) => <p key={m.handle}><b>{m.title}</b> <span className="ltr muted">({m.handle})</span>: {m.items.map((i: any) => i.title).join(' · ') || '—'}</p>)}
              <p><b>מדיניות:</b> {d.policies.map((p: any) => p.title).join(', ') || 'אין'}</p>
              <p className="meta">ערכה: {d.theme.name} ({d.theme.role}) · עודכנה {fmtDate(d.theme.updatedAt)} · {Object.keys(d.files).length} קבצים · שפות: {d.locales.map((l: any) => l.locale).join(', ')}</p>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2>צילומים שמורים</h2>
        <div className="table-wrap surface">
          <table className="tbl">
            <thead><tr><th>נלקח</th><th>תווית</th><th>מקור</th><th>hash</th></tr></thead>
            <tbody>{snaps.map((s) => <tr key={s.id}><td className="num">{fmtDate(s.captured_at)}</td><td><bdi dir="auto">{s.label || '—'}</bdi></td><td><bdi dir="auto">{s.created_by}</bdi></td><td className="ltr">{s.content_hash}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
