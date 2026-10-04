import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { waveStats, hoursMid, STATUS_LABEL } from '@/lib/logic';
import { WAVE_NAME, TSTATUS_CLASS, impactClass } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function Timeline() {
  const { tasks, resolved } = await loadAll();
  const rs = new Set<string>(resolved);
  const waves = [0, 1, 2, 3, 4, 5];
  return (
    <>
      <h1>ציר זמן · גלי עבודה</h1>
      <p className="muted">כל גל מורכב ממשימות לפי סדר ההשפעה על ההמרה. ההתקדמות מחושבת ממשימות שבוצעו (+ אחוז ההתקדמות של משימות בעבודה). הערכות המאמץ הן הערכות בלבד.</p>
      <div className="timeline" style={{ marginTop: 14 }}>
        {waves.map((w) => {
          const s = waveStats(tasks, w);
          const ts = tasks.filter((t) => t.wave === w);
          const hrs = ts.reduce((a, t) => a + (hoursMid(t) || 0), 0);
          const complete = s.total > 0 && s.done === s.total;
          return (
            <div key={w} className={`wave ${complete ? 'complete' : ''}`}>
              <div className="card">
                <div className="row between">
                  <h3>גל {w} · {WAVE_NAME[w]}</h3>
                  <span className={`chip ${complete ? 'ok' : 'brand'}`}>{s.pct}%</span>
                </div>
                <div className="bar lg" style={{ margin: '8px 0' }} role="progressbar" aria-valuenow={s.pct} aria-valuemin={0} aria-valuemax={100}>
                  <i className="done" style={{ width: `${(s.done / s.total) * 100}%` }} />
                  <i className="prog" style={{ width: `${Math.max(0, s.pct - (s.done / s.total) * 100)}%` }} />
                  <i className="blocked" style={{ width: `${(s.blocked / s.total) * 100}%` }} />
                </div>
                <div className="row small muted">
                  <span>{s.total} משימות</span><span>· {s.done} בוצעו</span><span>· {s.in_progress} בעבודה</span><span>· {s.open} פתוחות</span>
                  <span style={{ color: s.blocked ? 'var(--red)' : undefined }}>· {s.blocked} חסומות</span><span>· כ-{Math.round(hrs)} שעות (הערכה)</span>
                </div>
                <details open={!complete && w <= 2} style={{ marginTop: 8 }}>
                  <summary>המשימות בגל</summary>
                  {ts.map((t) => {
                    const bl = (t.blockers || []).filter((b: string) => !rs.has(b));
                    return (
                      <div className="trow" key={t.id}>
                        <Link href={`/board?task=${t.id}`} className="tid">{t.id}</Link>
                        <span className="t">{t.title}</span>
                        {bl.length > 0 && <span className="chip bad">ממתין ל-{bl.join(', ')}</span>}
                        <span className={`chip ${impactClass(t.impact_level)}`}>{t.impact}</span>
                        <span className={`chip ${TSTATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}{t.status === 'in_progress' ? ` ${t.progress}%` : ''}</span>
                      </div>
                    );
                  })}
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
