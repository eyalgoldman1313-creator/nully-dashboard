'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAct } from './ui';
import Md from './Md';
import { SEV_LABEL, SEV_CLASS, FSTATUS_LABEL } from '@/lib/labels';
import { STATUS_LABEL } from '@/lib/logic';

const SEV_ORDER = ['critical', 'high', 'medium', 'low-med', 'low'];
const sevRank = (s: string) => { const i = SEV_ORDER.indexOf(s); return i < 0 ? 9 : i; };
const idNum = (id: string) => Number((id.match(/\d+/) || ['0'])[0]);

const TONE: Record<string, string> = { open: 'info', in_progress: 'brand', blocked: 'bad', done: 'ok' };

export default function FindingsClient({ findings, tasks }: { findings: any[]; tasks: any[] }) {
  const { act, busy, Toast } = useAct();
  const [cat, setCat] = useState('all');
  const [sev, setSev] = useState('all');
  const [st, setSt] = useState('open');
  const [scope, setScope] = useState(false);
  const cats = Array.from(new Set(findings.map((f) => f.category))).filter(Boolean);
  const openScope = findings.filter((f) => f.status === 'open' && f.in_scope);
  const list = findings
    .filter((f) => (cat === 'all' || f.category === cat) && (sev === 'all' || f.severity === sev) && (st === 'all' || (st === 'open' ? f.status === 'open' : f.status !== 'open')) && (scope || f.in_scope))
    .slice()
    .sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || idNum(a.id) - idNum(b.id));

  return (
    <>
      <div className="seg" role="group" aria-label="סינון לפי חומרה">
        <button type="button" className={sev === 'all' ? 'on' : ''} aria-pressed={sev === 'all'} onClick={() => setSev('all')}>הכל</button>
        {SEV_ORDER.map((s) => (
          <button key={s} type="button" className={sev === s ? 'on' : ''} aria-pressed={sev === s} onClick={() => setSev(s)}>
            {SEV_LABEL[s]} <span className="num">{openScope.filter((f) => f.severity === s).length}</span>
          </button>
        ))}
      </div>
      <p className="meta">המספרים הם ממצאים פתוחים בתחום. הרשימה ממוינת לפי חומרה.</p>
      <div className="filters">
        <label className="inline-field">קטגוריה
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="קטגוריה"><option value="all">כל הקטגוריות</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="inline-field">סטטוס
          <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="סטטוס"><option value="open">פתוחים</option><option value="closed">תוקנו או נסגרו</option><option value="all">הכל</option></select>
        </label>
        <label className="check"><input type="checkbox" checked={scope} onChange={(e) => setScope(e.target.checked)} /> כולל נושאים מחוץ לתחום</label>
        <span className="meta">{list.length} ממצאים</span>
      </div>
      <h2 className="sr-only">רשימת הממצאים</h2>
      <div>
        {list.map((f) => <Finding key={f.id} f={f} tasks={tasks} act={act} busy={busy} />)}
      </div>
      {!list.length && <p className="muted">אין ממצאים בסינון הזה.</p>}
      {Toast}
    </>
  );
}

function Finding({ f, tasks, act, busy }: any) {
  const [note, setNote] = useState(f.note || '');
  const linked = (f.task_ids || []).map((id: string) => tasks.find((t: any) => t.id === id)).filter(Boolean);
  return (
    <article id={f.id} className="finding">
      <details>
        <summary className="finding-sum">
          <span className="tid">{f.id}</span>
          <h3>{f.title}</h3>
          <span className={`chip ${SEV_CLASS[f.severity]}`}>{SEV_LABEL[f.severity]}</span>
          {!f.in_scope && <span className="meta">מחוץ לתחום</span>}
        </summary>
        <div className="finding-body">
          {f.status_note && <p className="note-warn" dir="auto">{f.status_note}</p>}
          <p className="meta">
            <span className={`chip ${f.status === 'open' ? 'warn' : f.status === 'fixed' ? 'ok' : ''}`}>{FSTATUS_LABEL[f.status]}</span>
            {f.category ? <> · {f.category}</> : null}
            {f.impact ? <> · השפעה: {f.impact}</> : null}
            {f.effort ? <> · מאמץ: {f.effort}</> : null}
            {f.type ? <> · סוג: {f.type}</> : null}
          </p>
          <div className="grid g2">
            <div>
              <h4>באתר</h4>
              <Md text={f.evidence_site} />
              {f.inference && <><h4>הסקה (לא נבדקה)</h4><Md text={f.inference} /></>}
            </div>
            <div>
              <h4>אתרי ייחוס</h4>
              {f.evidence_reference ? <Md text={f.evidence_reference} /> : <p className="muted">אין השוואה לאתרי ייחוס בממצא זה.</p>}
              {f.why && <><h4>למה זה חשוב</h4><Md text={f.why} /></>}
            </div>
          </div>
          <h4>המלצה</h4>
          <Md text={f.recommendation} />
          {linked.length > 0 && (
            <div className="link-list">
              {linked.map((t: any) => (
                <Link key={t.id} href={`/board?task=${t.id}`}>
                  <span className="tid">{t.id}</span>
                  <bdi dir="auto">{t.title}</bdi>
                  <span className={`chip ${TONE[t.status] || ''}`}>{STATUS_LABEL[t.status]}</span>
                </Link>
              ))}
            </div>
          )}
          {f.dependencies && <p className="meta">תלויות: <bdi dir="auto">{f.dependencies}</bdi></p>}
          <label htmlFor={'fn' + f.id}>הערה</label>
          <textarea id={'fn' + f.id} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row">
            {(['open', 'fixed', 'wontfix'] as const).map((s) => (
              <button key={s} type="button" className={`btn ${f.status === s ? 'primary' : ''}`} disabled={busy || f.status === s} onClick={() => act({ action: 'finding_update', id: f.id, status: s, note }, `${f.id}: ${FSTATUS_LABEL[s]}`)}>
                {s === 'open' ? 'פתוח' : s === 'fixed' ? 'תוקן' : 'לא יטופל'}
              </button>
            ))}
            <button type="button" className="btn" disabled={busy || note === (f.note || '')} onClick={() => act({ action: 'finding_update', id: f.id, note }, 'ההערה נשמרה')}>שמירת הערה</button>
          </div>
        </div>
      </details>
    </article>
  );
}
