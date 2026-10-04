import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { waveStats, hoursMid, STATUS_LABEL } from '@/lib/logic';
import { WAVE_NAME, TSTATUS_CLASS } from '@/lib/labels';
import { Subnav, WORK_NAV } from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function Timeline() {
  const { tasks, resolved } = await loadAll();
  const rs = new Set<string>(resolved);
  const waves = [0, 1, 2, 3, 4, 5];
  return (
    <>
      <header className="page-head">
        <h1>ציר זמן</h1>
        <p className="lede">ששת גלי העבודה, לפי ההשפעה על ההמרה. האחוז כולל משימות שבוצעו וחלק יחסי ממשימות בעבודה.</p>
      </header>
      <Subnav items={WORK_NAV} />
      <div className="timeline">
        {waves.map((w) => {
          const s = waveStats(tasks, w);
          const ts = tasks.filter((t) => t.wave === w);
          const hrs = ts.reduce((a, t) => a + (hoursMid(t) || 0), 0);
          const complete = s.total > 0 && s.done === s.total;
          const donePct = s.total ? (s.done / s.total) * 100 : 0;
          const blockedPct = s.total ? (s.blocked / s.total) * 100 : 0;
          return (
            <section key={w} className={`wave ${complete ? 'complete' : ''}`}>
              <div className="row between">
                <h2>גל {w} · {WAVE_NAME[w]}</h2>
                <span className={`chip ${complete ? 'ok' : 'brand'}`}><span className="num">{s.pct}%</span></span>
              </div>
              <div className="bar lg" role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`התקדמות גל ${w}`}>
                <i className="done" style={{ flexBasis: `${donePct}%` }} />
                <i className="prog" style={{ flexBasis: `${Math.max(0, s.pct - donePct)}%` }} />
                <i className="blocked" style={{ flexBasis: `${blockedPct}%` }} />
              </div>
              <ul className="legend">
                <li><i className="swatch done" />בוצע {s.done}</li>
                <li><i className="swatch prog" />בעבודה {s.in_progress}</li>
                <li><i className="swatch rest" />פתוח {s.open}</li>
                <li><i className="swatch blocked" />חסום {s.blocked}</li>
                <li>כ־<span className="num">{Math.round(hrs)}</span> שעות</li>
              </ul>
              <p className="meta">{s.total} משימות</p>
              <details className="wave-tasks" open={!complete && w <= 2}>
                <summary>המשימות בגל</summary>
                {ts.map((t) => {
                  const bl = (t.blockers || []).filter((b: string) => !rs.has(b));
                  return (
                    <Link className="trow" key={t.id} href={`/board?task=${t.id}`}>
                      <span className="tid">{t.id}</span>
                      <span className="t">{t.title}</span>
                      <span className={`chip ${TSTATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}{t.status === 'in_progress' ? ` ${t.progress}%` : ''}</span>
                      <span className="meta">{t.impact}{bl.length > 0 && <> · ממתין ל־<bdi className="tid">{bl.join(', ')}</bdi></>}</span>
                    </Link>
                  );
                })}
                {!ts.length && <p className="muted">אין משימות בגל הזה.</p>}
              </details>
            </section>
          );
        })}
      </div>
    </>
  );
}
