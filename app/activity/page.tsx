import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { fmtDate } from '@/lib/labels';
import { HISTORY_NAV, Subnav } from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function Activity({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { who } = await searchParams;
  const { activity } = await loadAll();
  const list = activity.filter((a) => !who || (who === 'user' ? a.actor_type === 'user' : a.actor_type === 'bot'));
  const tab = (k: string, label: string) => (
    <Link href={k ? `/activity?who=${k}` : '/activity'} className={(who || '') === k ? 'on' : ''} aria-current={(who || '') === k ? 'page' : undefined}>{label}</Link>
  );
  return (
    <>
      <header className="page-head">
        <h1>יומן פעילות</h1>
        <p className="lede">שינויים מהלוח ושינויים שהבוטים מבצעים. היסטוריה נשמרת גם בקבצי JSON במאגר.</p>
      </header>
      <Subnav items={HISTORY_NAV} />
      <div className="row between">
        <nav className="seg" aria-label="סינון לפי מבצע">{tab('', 'הכל')}{tab('user', 'אייל')}{tab('bot', 'בוטים')}</nav>
        <a className="btn" href="/api/export">ייצוא JSON</a>
      </div>
      <div className="surface">
        {list.map((a) => (
          <div className="trow" key={a.id}>
            <span className="meta">{a.actor_type === 'user' ? 'אייל' : <bdi dir="auto">{a.actor}</bdi>}</span>
            <bdi className="meta ltr">{a.action}</bdi>
            <span className="t"><bdi dir="auto">{a.summary}</bdi>{a.details?.note ? <span className="muted"> — <bdi dir="auto">{String(a.details.note)}</bdi></span> : null}</span>
            <span className="meta num">{fmtDate(a.at)}</span>
          </div>
        ))}
        {!list.length && <p className="muted">אין פעילות.</p>}
      </div>
    </>
  );
}
