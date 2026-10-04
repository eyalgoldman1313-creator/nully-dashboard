import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { fmtDate } from '@/lib/labels';
export const dynamic = 'force-dynamic';

export default async function Activity({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { who } = await searchParams;
  const { activity } = await loadAll();
  const list = activity.filter((a) => !who || (who === 'user' ? a.actor_type === 'user' : a.actor_type === 'bot'));
  const tab = (k: string, label: string) => <Link href={k ? `/activity?who=${k}` : '/activity'} className={`chip ${(who || '') === k ? 'brand' : ''}`} style={{ padding: '5px 14px' }}>{label}</Link>;
  return (
    <>
      <h1>יומן פעילות</h1>
      <p className="muted">מי שינה מה: שינויים שאייל עושה בלוח, ושינויים שהבוטים מבצעים דרך ה-API / קבצי הנתונים. הנתונים מיוצאים גם לקבצי JSON ב-<code>/data</code> שבמאגר לצורך היסטוריית git.</p>
      <div className="row" style={{ margin: '8px 0' }}>{tab('', 'הכל')}{tab('user', 'אייל (בלוח)')}{tab('bot', 'בוטים')}<a className="chip info" href="/api/export" style={{ padding: '5px 14px' }}>⬇ ייצוא JSON</a></div>
      <div className="card">
        {list.map((a) => (
          <div className="trow" key={a.id}>
            <span className={`chip ${a.actor_type === 'user' ? 'brand' : 'info'}`}>{a.actor_type === 'user' ? 'אייל' : a.actor}</span>
            <span className="chip">{a.action}</span>
            <span className="t">{a.summary}{a.details?.note ? <span className="muted"> — {String(a.details.note)}</span> : null}</span>
            <span className="muted tiny">{fmtDate(a.at)}</span>
          </div>
        ))}
        {!list.length && <p className="muted">אין פעילות.</p>}
      </div>
    </>
  );
}
