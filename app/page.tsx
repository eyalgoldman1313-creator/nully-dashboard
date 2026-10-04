import Link from 'next/link';
import { loadAll, loadSnapshot } from '@/lib/data';
import { hoursMid } from '@/lib/logic';
import { fmtDate } from '@/lib/labels';
import { diffSnapshots } from '@/lib/diff';
import Effort from '@/components/Effort';
import Icon from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { tasks, decisions, inputs, issues, findings, snaps, activity } = await loadAll();
  const count = (s: string) => tasks.filter((t) => t.status === s).length;
  const done = count('done'), prog = count('in_progress'), blocked = count('blocked'), open = count('open');
  const n = tasks.length;
  const pct = n ? Math.round(((done + tasks.filter((t) => t.status === 'in_progress').reduce((a, t) => a + (t.progress || 0) / 100, 0)) / n) * 100) : 0;
  const donePct = n ? (done / n) * 100 : 0;
  const hoursTotal = tasks.reduce((a, t) => a + (hoursMid(t) || 0), 0);
  const hoursDone = tasks.filter((t) => t.status === 'done').reduce((a, t) => a + (hoursMid(t) || 0), 0);
  const hoursLeft = Math.round(hoursTotal - hoursDone);
  const openDecisions = decisions.filter((d) => d.status === 'open');
  const neededInputs = inputs.filter((i) => i.status === 'needed');
  const openFindings = findings.filter((f) => f.status === 'open' && f.in_scope);
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in_progress');
  const next = tasks.filter((t) => t.status === 'open').sort((a, b) => b.impact_level - a.impact_level || a.sort - b.sort).slice(0, 5);
  let changeCount: number | null = null;
  if (snaps.length >= 2) {
    const [b, a] = await Promise.all([loadSnapshot(snaps[0].id), loadSnapshot(snaps[1].id)]);
    changeCount = diffSnapshots(a.data, b.data).length;
  }

  return (
    <>
      <header className="page-head">
        <h1>שלום אייל</h1>
        <p className="lede">טיוטת <b>Nully Horizon RTL</b> <span className="ltr">154899021876</span> · <span className="ltr">nully-shop.com</span> עדיין לא פורסמה. המיקוד: המרה, משפך ו־UX.</p>
      </header>

      <section className="needs" aria-labelledby="needs-h">
        <h2 id="needs-h">דורש את תשומת לבך</h2>
        {openDecisions.length > 0 ? openDecisions.map((d) => (
          <Link key={d.id} href={`/decisions#${d.id}`} className="need-row">
            <span className="tid">{d.id}</span>
            <span>
              <h3>{d.title}</h3>
              <p>{d.question}</p>
              {d.recommended && <p className="meta">המלצה: {d.options.find((o: any) => o.id === d.recommended)?.label}</p>}
            </span>
            <span className="chip warn">ממתינה</span>
          </Link>
        )) : <p>אין החלטות שממתינות לך.</p>}
        <div className="needs-foot">
          <Link href="/decisions">להחלטות</Link>
          <Link href="/decisions#inputs">{neededInputs.length} קלטים חסרים</Link>
          <Link href="/board?col=blocked">{blocked} משימות חסומות</Link>
        </div>
      </section>

      <section className="section" aria-labelledby="prog-h">
        <h2 id="prog-h">התקדמות</h2>
        <div className="surface progress-panel">
          <div className="progress-num">{pct}%</div>
          <div>
            <div className="bar lg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="התקדמות כללית">
              <i className="done" style={{ flexBasis: `${donePct}%` }} />
              <i className="prog" style={{ flexBasis: `${Math.max(0, pct - donePct)}%` }} />
            </div>
            <ul className="legend">
              <li><i className="swatch done" />בוצע</li>
              <li><i className="swatch prog" />חלק מעבודה</li>
              <li><i className="swatch rest" />היתרה</li>
            </ul>
            <p className="meta">{done} בוצעו · {prog} בעבודה · {open} פתוחות · {blocked} חסומות · מתוך {n} · כ־<span className="num">{hoursLeft}</span> שעות שנותרו</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="next-h">
        <div className="section-head">
          <h2 id="next-h">המשימות הבאות</h2>
          <Link className="more-link" href="/board">ללוח <Icon name="arrow" mirror /></Link>
        </div>
        <div className="surface">
          {next.map((t) => (
            <Link className="trow" key={t.id} href={`/board?task=${t.id}`}>
              <span className="tid">{t.id}</span>
              <span className="t">{t.title}</span>
              <span className="meta">{t.impact} · <Effort text={t.effort} />{(t.partial_blockers || []).length > 0 && <> · חלקית <bdi className="tid">{t.partial_blockers.join(', ')}</bdi></>}</span>
            </Link>
          ))}
          {!next.length && <p className="muted">אין משימות פתוחות כרגע.</p>}
        </div>
      </section>

      <p className="quiet-links section">
        <Link href="/findings">{openFindings.length} ממצאים פתוחים</Link>
        <span aria-hidden="true">·</span>
        <Link href="/issues">{openIssues.length} הערות פתוחות</Link>
        <span aria-hidden="true">·</span>
        <Link href="/changes">{changeCount == null ? 'צילום בסיס אחד' : `${changeCount} שינויים בטיוטה`}</Link>
      </p>

      <section className="section" aria-labelledby="act-h">
        <div className="section-head">
          <h2 id="act-h">פעילות אחרונה</h2>
          <Link className="more-link" href="/activity">לכל היומן <Icon name="arrow" mirror /></Link>
        </div>
        <div className="surface">
          {activity.slice(0, 5).map((a) => (
            <div className="trow" key={a.id}>
              <span className="meta">{a.actor_type === 'user' ? 'אייל' : <bdi dir="auto">{a.actor}</bdi>}</span>
              <span className="t"><bdi dir="auto">{a.summary}</bdi></span>
              <span className="meta num">{fmtDate(a.at)}</span>
            </div>
          ))}
          {!activity.length && <p className="muted">אין פעילות.</p>}
        </div>
      </section>
    </>
  );
}
