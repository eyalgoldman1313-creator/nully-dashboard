import Link from 'next/link';
import { loadAll, loadSnapshot } from '@/lib/data';
import { waveStats, hoursMid, STATUS_LABEL } from '@/lib/logic';
import { fmtDate, impactClass } from '@/lib/labels';
import { diffSnapshots } from '@/lib/diff';
import Effort from '@/components/Effort';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { tasks, decisions, inputs, issues, findings, snaps, activity } = await loadAll();
  const count = (s: string) => tasks.filter((t) => t.status === s).length;
  const done = count('done'), prog = count('in_progress'), blocked = count('blocked'), open = count('open');
  const pct = Math.round(((done + tasks.filter((t) => t.status === 'in_progress').reduce((a, t) => a + (t.progress || 0) / 100, 0)) / tasks.length) * 100);
  const hoursTotal = tasks.reduce((a, t) => a + (hoursMid(t) || 0), 0);
  const hoursDone = tasks.filter((t) => t.status === 'done').reduce((a, t) => a + (hoursMid(t) || 0), 0);
  const openDecisions = decisions.filter((d) => d.status === 'open');
  const neededInputs = inputs.filter((i) => i.status === 'needed');
  const openFindings = findings.filter((f) => f.status === 'open' && f.in_scope);
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in_progress');
  const next = tasks.filter((t) => t.status === 'open').sort((a, b) => b.impact_level - a.impact_level || a.sort - b.sort).slice(0, 7);
  let changeCount: number | null = null;
  if (snaps.length >= 2) {
    const [b, a] = await Promise.all([loadSnapshot(snaps[0].id), loadSnapshot(snaps[1].id)]);
    changeCount = diffSnapshots(a.data, b.data).length;
  }
  const blocksCount = (id: string) => tasks.filter((t) => (t.blockers || []).includes(id) || (t.partial_blockers || []).includes(id)).length;

  return (
    <>
      <h1>שלום אייל 👋</h1>
      <p className="muted">מעקב אחרי השיפורים בטיוטה <b>Nully Horizon RTL</b> <span className="ltr">(154899021876)</span> · החנות <span className="ltr">nully-shop.com</span> עדיין לא פורסמה · המיקוד: <b>שיעור המרה, משפך לקוח ו-UX</b>.</p>

      <div className="grid g4" style={{ marginTop: 12 }}>
        <div className="card stat"><b>{pct}%</b><span>התקדמות כללית ({done} מתוך {tasks.length} משימות בוצעו)</span>
          <div className="bar" style={{ marginTop: 8 }}><i className="done" style={{ width: `${(done / tasks.length) * 100}%` }} /><i className="prog" style={{ width: `${pct - (done / tasks.length) * 100}%` }} /></div></div>
        <Link href="/board" className="card stat" style={{ color: 'inherit' }}><b>{open}</b><span>פתוחות · {prog} בעבודה · <span style={{ color: 'var(--red)' }}>{blocked} חסומות</span></span></Link>
        <Link href="/decisions" className="card stat" style={{ color: 'inherit' }}><b style={{ color: openDecisions.length ? 'var(--amber)' : 'var(--green)' }}>{openDecisions.length}</b><span>החלטות ממתינות לך{openDecisions.length ? `: ${openDecisions.map((d) => d.id).join(', ')}` : ''}</span></Link>
        <Link href="/decisions#inputs" className="card stat" style={{ color: 'inherit' }}><b>{neededInputs.length}</b><span>נכסים/קלטים שחסרים ממך</span></Link>
        <Link href="/findings" className="card stat" style={{ color: 'inherit' }}><b>{openFindings.length}</b><span>ממצאים פתוחים (מתוך {findings.filter((f) => f.in_scope).length} בתחום)</span></Link>
        <Link href="/issues" className="card stat" style={{ color: 'inherit' }}><b>{openIssues.length}</b><span>הערות ושאלות פתוחות</span></Link>
        <div className="card stat"><b>{Math.round(hoursTotal - hoursDone)}</b><span>שעות עבודה שנותרו (הערכה: אמצע הטווח)</span></div>
        <Link href="/changes" className="card stat" style={{ color: 'inherit' }}><b>{changeCount ?? '—'}</b><span>{changeCount == null ? 'נשמר צילום בסיס של הטיוטה. אחרי השינוי הבא נראה כאן מה השתנה' : 'שינויים בטיוטה מאז הצילום הקודם'}</span></Link>
      </div>

      {openDecisions.length > 0 && (
        <section>
          <h2>⏳ ממתין להחלטה שלך</h2>
          <div className="grid g2">
            {openDecisions.map((d) => (
              <Link key={d.id} href={`/decisions#${d.id}`} className="card pending" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="row between"><h3><span className="tid">{d.id}</span> · {d.title}</h3><span className="chip warn">פותח {blocksCount(d.id)} משימות</span></div>
                <p className="muted small">{d.question}</p>
                {d.recommended && <p className="small">המלצה: <b>{d.options.find((o: any) => o.id === d.recommended)?.label}</b></p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>🎯 המשימות הבאות לביצוע (לפי השפעה)</h2>
        <div className="card">
          {next.map((t) => (
            <div className="trow" key={t.id}>
              <Link href={`/board?task=${t.id}`} className="tid">{t.id}</Link>
              <span className="t">{t.title}</span>
              <span className={`chip ${impactClass(t.impact_level)}`}>{t.impact}</span>
              <span className="chip"><Effort text={t.effort} /></span>
              {(t.partial_blockers || []).length > 0 && <span className="chip warn">חלקית ממתין ל-{t.partial_blockers.join(', ')}</span>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>🕘 פעילות אחרונה</h2>
        <div className="card">
          {activity.slice(0, 8).map((a) => (
            <div className="trow" key={a.id}>
              <span className={`chip ${a.actor_type === 'user' ? 'brand' : 'info'}`}>{a.actor_type === 'user' ? 'אייל' : a.actor}</span>
              <span className="t">{a.summary}</span>
              <span className="muted tiny">{fmtDate(a.at)}</span>
            </div>
          ))}
          <p style={{ marginTop: 8 }}><Link href="/activity">לכל היומן ←</Link></p>
        </div>
      </section>
    </>
  );
}
