'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAct } from './ui';
import Md from './Md';
import Effort from './Effort';
import { SEV_LABEL, SEV_CLASS, FSTATUS_LABEL, TSTATUS_CLASS } from '@/lib/labels';
import { STATUS_LABEL } from '@/lib/logic';

export default function FindingsClient({ findings, tasks }: { findings: any[]; tasks: any[] }) {
  const { act, busy, Toast } = useAct();
  const [cat, setCat] = useState('all'); const [sev, setSev] = useState('all'); const [st, setSt] = useState('open'); const [scope, setScope] = useState(false);
  const cats = Array.from(new Set(findings.map((f) => f.category))).filter(Boolean);
  const list = findings.filter((f) => (cat === 'all' || f.category === cat) && (sev === 'all' || f.severity === sev) && (st === 'all' || (st === 'open' ? f.status === 'open' : f.status !== 'open')) && (scope || f.in_scope));
  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as any;
  findings.filter((f) => f.status === 'open' && f.in_scope).forEach((f) => { const k = f.severity === 'low-med' ? 'low' : f.severity; counts[k]++; });
  return (
    <>
      <div className="row" style={{ margin: '8px 0' }}>
        <span className="chip crit">קריטית: {counts.critical}</span><span className="chip high">גבוהה: {counts.high}</span><span className="chip med">בינונית: {counts.medium}</span><span className="chip low">נמוכה: {counts.low}</span>
        <span className="muted small">(ממצאים פתוחים בתחום)</span>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }} aria-label="קטגוריה"><option value="all">כל הקטגוריות</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={sev} onChange={(e) => setSev(e.target.value)} style={{ width: 'auto' }} aria-label="חומרה"><option value="all">כל החומרות</option>{['critical', 'high', 'medium', 'low-med', 'low'].map((s) => <option key={s} value={s}>{SEV_LABEL[s]}</option>)}</select>
        <select value={st} onChange={(e) => setSt(e.target.value)} style={{ width: 'auto' }} aria-label="סטטוס"><option value="open">פתוחים</option><option value="closed">תוקנו / נסגרו</option><option value="all">הכל</option></select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={scope} onChange={(e) => setScope(e.target.checked)} /> הצג גם נושאים מחוץ לתחום</label>
        <span className="muted small">{list.length} ממצאים</span>
      </div>
      <div className="grid">
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
    <article id={f.id} className="card" style={{ scrollMarginTop: 80, opacity: f.in_scope ? 1 : 0.8 }}>
      <details>
        <summary>
          <span className="tid">{f.id}</span> · <b>{f.title}</b>
          <span className="row" style={{ display: 'inline-flex', marginInlineStart: 8 }}>
            <span className={`chip ${SEV_CLASS[f.severity]}`}>חומרה: {SEV_LABEL[f.severity]}</span>
            <span className="chip">{f.category}</span>
            <span className={`chip ${f.status === 'open' ? 'warn' : f.status === 'fixed' ? 'ok' : ''}`}>{FSTATUS_LABEL[f.status]}</span>
          </span>
        </summary>
        <div style={{ marginTop: 10 }}>
          {f.status_note && <p className="small" style={{ color: 'var(--amber)', fontWeight: 700 }}>{f.status_note}</p>}
          <div className="row small muted"><span>השפעה: {f.impact}</span>{f.effort && <span>· מאמץ: {f.effort}</span>}{f.type && <span>· סוג: {f.type}</span>}</div>
          <div className="grid g2" style={{ marginTop: 10 }}>
            <div><h3>🏪 באתר שלך</h3><Md text={f.evidence_site} />{f.inference && <><h3>הסקה (לא נבדקה)</h3><Md text={f.inference} /></>}</div>
            <div><h3>🔎 אתרי ייחוס</h3>{f.evidence_reference ? <Md text={f.evidence_reference} /> : <p className="muted small">אין השוואה לאתרי ייחוס בממצא זה.</p>}{f.why && <><h3>למה זה חשוב</h3><Md text={f.why} /></>}</div>
          </div>
          <h3 style={{ marginTop: 10 }}>המלצה</h3>
          <Md text={f.recommendation} />
          {linked.length > 0 && <div style={{ marginTop: 8 }}><b className="small">משימות מטפלות:</b> <span className="row" style={{ display: 'inline-flex' }}>{linked.map((t: any) => <Link key={t.id} className={`chip ${TSTATUS_CLASS[t.status]}`} href={`/board?task=${t.id}`}>{t.id} · {t.title.slice(0, 30)} ({STATUS_LABEL[t.status]})</Link>)}</span></div>}
          {f.dependencies && <p className="small muted">תלויות: {f.dependencies}</p>}
          <label htmlFor={'fn' + f.id}>הערה</label>
          <textarea id={'fn' + f.id} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row" style={{ marginTop: 8 }}>
            {(['open', 'fixed', 'wontfix'] as const).map((s) => <button key={s} className={`btn sm ${f.status === s ? 'primary' : ''}`} disabled={busy || f.status === s} onClick={() => act({ action: 'finding_update', id: f.id, status: s, note }, `${f.id}: ${FSTATUS_LABEL[s]}`)}>{s === 'open' ? 'פתוח' : s === 'fixed' ? '✓ תוקן' : 'לא יטופל'}</button>)}
            <button className="btn sm" disabled={busy || note === (f.note || '')} onClick={() => act({ action: 'finding_update', id: f.id, note }, 'ההערה נשמרה')}>שמירת הערה</button>
          </div>
        </div>
      </details>
    </article>
  );
}
