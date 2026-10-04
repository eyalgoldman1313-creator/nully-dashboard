import { loadAll, loadSnapshot } from '@/lib/data';
import { diffSnapshots, AREAS, type Change } from '@/lib/diff';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';

const KIND: Record<string, [string, string]> = { added: ['נוסף', 'ok'], removed: ['הוסר', 'bad'], changed: ['שונה', 'warn'], moved: ['סדר שונה', 'info'] };
const short = (v: any) => (v == null ? '—' : String(v));

function Val({ v, cls }: { v: any; cls: string }) {
  const s = short(v);
  return <div className={`val ${cls}`}>{s.length > 600 ? s.slice(0, 600) + '…' : s}</div>;
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
      <h1>שינויים בטיוטה · צילום מול צילום</h1>
      <p className="muted">הצילום נלקח <b>בקריאה בלבד</b> מ-Shopify (Admin GraphQL) ומתעד את סדר הסקשנים והגדרות עמוד הבית ועמוד המוצר, המוצר והמחירים, מדיניות ותפריטים. בכל הרצה חדשה של הסקריפט נוצר צילום נוסף וההשוואה מתעדכנת.</p>

      <div className="card">
        <form className="row" method="get">
          <label style={{ margin: 0 }}>קודם <select name="a" defaultValue={aId} style={{ minWidth: 220 }}>{snaps.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.captured_at)}{s.label ? ' · ' + s.label : ''}</option>)}</select></label>
          <label style={{ margin: 0 }}>חדש <select name="b" defaultValue={bId} style={{ minWidth: 220 }}>{snaps.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.captured_at)}{s.label ? ' · ' + s.label : ''}</option>)}</select></label>
          <label style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="files" value="1" defaultChecked={showFiles} style={{ width: 'auto', minHeight: 0 }} /> כולל קבצי ערכה</label>
          <button className="btn primary">השוואה</button>
        </form>
        <p className="tiny muted" style={{ marginTop: 8 }}>{snaps.length} צילומים שמורים. להרצת צילום חדש (בקופסה): <code>node scripts/shopify-snapshot.mjs --push</code></p>
      </div>

      {!A && B && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3>✅ נשמר צילום הבסיס הראשון</h3>
          <p>זה הצילום היחיד כרגע, ולכן עוד אין מה להשוות. אחרי השינוי הבא בערכה (או בחנות) מריצים צילום נוסף, והשינויים יופיעו כאן.</p>
        </div>
      )}

      {A && B && (
        <section>
          <h2>מה השתנה: {fmtDate(A.captured_at)} ← {fmtDate(B.captured_at)}</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className={`chip ${visible.length ? 'warn' : 'ok'}`}>{visible.length} שינויים</span>
            {byArea.map(([a, l]) => <a key={a} href={'#' + encodeURIComponent(a)} className="chip info">{a}: {l.length}</a>)}
          </div>
          {!visible.length && <div className="card"><p>אין הבדלים בין שני הצילומים{!showFiles ? ' (מלבד קבצי ערכה, אם סימנת "כולל קבצי ערכה")' : ''}.</p></div>}
          {byArea.map(([area, list]) => (
            <div key={area} id={area} className="card" style={{ marginBottom: 12, scrollMarginTop: 80 }}>
              <h3>{area} <span className="chip">{list.length}</span></h3>
              {list.map((c, i) => (
                <div key={i} className={`chg ${c.kind}`}>
                  <div className="row"><span className={`chip ${KIND[c.kind][1]}`}>{KIND[c.kind][0]}</span><b className="small" dir="auto">{c.path}</b></div>
                  {c.before !== undefined && <Val v={c.before} cls="old" />}
                  {c.after !== undefined && <Val v={c.after} cls="new" />}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {d && (
        <section>
          <h2>תוכן הצילום ({fmtDate(B.captured_at)}{B.label ? ' · ' + B.label : ''})</h2>
          <div className="grid g2">
            <div className="card"><h3>סדר סקשנים · דף הבית</h3>
              <ol className="small">{d.templates['templates/index.json']?.sections.map((s: any) => <li key={s.id}><span className="ltr">{s.id}</span> <span className="muted ltr">({s.type})</span>{s.disabled && <span className="chip warn"> כבוי</span>}</li>)}</ol></div>
            <div className="card"><h3>סדר סקשנים · דף מוצר</h3>
              <ol className="small">{d.templates['templates/product.json']?.sections.map((s: any) => <li key={s.id}><span className="ltr">{s.id}</span> <span className="muted ltr">({s.type})</span>{s.disabled && <span className="chip warn"> כבוי</span>}</li>)}</ol></div>
            <div className="card"><h3>מוצר ווריאנטים</h3>
              {d.products.map((p: any) => (
                <div key={p.handle}><p><b>{p.title}</b> <span className="chip">{p.status}</span> <span className="ltr muted">{p.handle}</span></p>
                  <table className="tbl"><thead><tr><th>וריאנט</th><th>מחיר</th><th>לפני</th><th>חד-פעמי</th></tr></thead>
                    <tbody>{p.variants.map((v: any) => <tr key={v.title}><td>{v.title}</td><td>{v.price}</td><td>{v.compareAtPrice ?? '—'}</td><td className="ltr">{v.onetimePrice ? (safeAmount(v.onetimePrice)) : '—'}</td></tr>)}</tbody></table>
                  <p className="small muted">תוכניות מנוי: {p.sellingPlanGroups.length ? p.sellingPlanGroups.map((g: any) => g.name).join(', ') : 'אין (sellingPlanGroups ריק)'}</p></div>
              ))}</div>
            <div className="card"><h3>תפריטים ומדיניות</h3>
              {d.menus.map((m: any) => <p key={m.handle} className="small"><b>{m.title}</b> <span className="ltr muted">({m.handle})</span>: {m.items.map((i: any) => i.title).join(' · ') || '—'}</p>)}
              <p className="small"><b>מדיניות:</b> {d.policies.map((p: any) => p.title).join(', ') || 'אין'}</p>
              <p className="small muted">ערכה: {d.theme.name} ({d.theme.role}) · עודכנה {fmtDate(d.theme.updatedAt)} · {Object.keys(d.files).length} קבצים · שפות: {d.locales.map((l: any) => l.locale).join(', ')}</p></div>
          </div>
        </section>
      )}

      <section>
        <h2>צילומים שמורים</h2>
        <div className="card"><table className="tbl"><thead><tr><th>נלקח</th><th>תווית</th><th>מקור</th><th>hash</th></tr></thead>
          <tbody>{snaps.map((s) => <tr key={s.id}><td>{fmtDate(s.captured_at)}</td><td>{s.label || '—'}</td><td className="small">{s.created_by}</td><td className="ltr">{s.content_hash}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
function safeAmount(v: string) { try { const j = JSON.parse(v); return `${j.amount} ${j.currency_code}`; } catch { return v; } }
