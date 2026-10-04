'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAct } from './ui';
import Effort from './Effort';
import Md from './Md';
import { STATUS_LABEL, STATUSES } from '@/lib/logic';
import { TSTATUS_CLASS, impactClass, WAVE_NAME } from '@/lib/labels';

type Props = { tasks: any[]; decisions: any[]; inputs: any[]; findings: any[]; resolved: string[]; initialTask: string | null };

function CopyPrompt({ id, className = 'btn primary sm' }: { id: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  async function go(e: React.MouseEvent) {
    e.stopPropagation(); setState('busy');
    try {
      const r = await fetch('/api/prompt?id=' + encodeURIComponent(id)); const j = await r.json();
      if (!j.prompt) throw new Error('no prompt');
      try { await navigator.clipboard.writeText(j.prompt); }
      catch { const ta = document.createElement('textarea'); ta.value = j.prompt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      setState('done'); setTimeout(() => setState('idle'), 2200);
    } catch { setState('err'); setTimeout(() => setState('idle'), 2500); }
  }
  return <button type="button" className={className} onClick={go} disabled={state === 'busy'}>{state === 'done' ? 'הועתק ✓' : state === 'err' ? 'שגיאה' : '📋 העתק פרומפט'}</button>;
}

export default function TaskBoard({ tasks, decisions, inputs, findings, resolved, initialTask }: Props) {
  const { act, busy, Toast } = useAct();
  const rs = useMemo(() => new Set(resolved), [resolved]);
  const [wave, setWave] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(initialTask);
  const filtered = tasks.filter((t) => (wave === 'all' || String(t.wave) === wave) && (!q || (t.id + ' ' + t.title + ' ' + (t.source || '')).toLowerCase().includes(q.toLowerCase())));
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const title = (id: string) => decisions.find((d) => d.id === id)?.title || inputs.find((i) => i.id === id)?.title || byId[id]?.title || '';
  const task = sel ? byId[sel] : null;

  async function setStatus(t: any, status: string, extra: any = {}) {
    try { await act({ action: 'task_update', id: t.id, status, ...extra }, `${t.id} → ${STATUS_LABEL[status]}`); }
    catch (e: any) {
      if (String(e.message).startsWith('blocked_by:') && confirm(`המשימה ${t.id} עדיין חסומה ע"י ${e.message.slice(11)}. להמשיך בכל זאת?`))
        await act({ action: 'task_update', id: t.id, status, force: true, ...extra }, `${t.id} → ${STATUS_LABEL[status]}`);
    }
  }

  return (
    <>
      <div className="row" style={{ margin: '10px 0' }}>
        <select value={wave} onChange={(e) => setWave(e.target.value)} style={{ width: 'auto' }} aria-label="גל">
          <option value="all">כל הגלים</option>
          {[0, 1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>גל {w} · {WAVE_NAME[w]}</option>)}
        </select>
        <input placeholder="חיפוש משימה…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <span className="muted small">{filtered.length} משימות</span>
      </div>
      <div className="kanban">
        {STATUSES.map((st) => {
          const col = filtered.filter((t) => t.status === st);
          return (
            <section className="col" key={st} aria-label={STATUS_LABEL[st]}>
              <h3><span>{STATUS_LABEL[st]}</span><span className={`chip ${TSTATUS_CLASS[st]}`}>{col.length}</span></h3>
              {col.map((t) => {
                const openBl = (t.blockers || []).filter((b: string) => !rs.has(b));
                const openPartial = (t.partial_blockers || []).filter((b: string) => !rs.has(b));
                return (
                  <article className="tcard" key={t.id} onClick={() => setSel(t.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(t.id)}>
                    <div className="row between"><span className="tid">{t.id}</span><span className="chip">גל {t.wave}</span></div>
                    <h4>{t.title}</h4>
                    <div className="row">
                      <span className={`chip ${impactClass(t.impact_level)}`}>השפעה: {t.impact}</span>
                      <span className="chip">⏱ <Effort text={t.effort} /></span>
                    </div>
                    {openBl.length > 0 && <div className="row" style={{ marginTop: 6 }}>{openBl.map((b: string) => <span key={b} className="chip bad">🔒 {b}</span>)}</div>}
                    {openPartial.length > 0 && <div className="row" style={{ marginTop: 6 }}>{openPartial.map((b: string) => <span key={b} className="chip warn">חלקית ממתין ל-{b}</span>)}</div>}
                    {t.status === 'in_progress' && <div className="bar" style={{ marginTop: 8 }}><i className="prog" style={{ width: `${t.progress}%` }} /></div>}
                    <div className="row" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      {t.status === 'open' && <button className="btn sm" disabled={busy} onClick={() => setStatus(t, 'in_progress')}>▶ התחל</button>}
                      {t.status === 'in_progress' && <button className="btn sm ok" disabled={busy} onClick={() => setStatus(t, 'done')}>✓ סיום</button>}
                      {t.status === 'done' && <button className="btn sm" disabled={busy} onClick={() => setStatus(t, 'open')}>↩ פתח מחדש</button>}
                      {t.hasPrompt && <CopyPrompt id={t.id} className="btn sm primary" />}
                    </div>
                  </article>
                );
              })}
              {!col.length && <p className="muted small" style={{ padding: 6 }}>אין משימות</p>}
            </section>
          );
        })}
      </div>

      {task && <Detail key={task.id} t={task} close={() => setSel(null)} open={setSel} rs={rs} title={title} byId={byId} findings={findings} act={act} busy={busy} setStatus={setStatus} />}
      {Toast}
    </>
  );
}

function Detail({ t, close, open, rs, title, byId, findings, act, busy, setStatus }: any) {
  const [notes, setNotes] = useState(t.notes || '');
  const [assignee, setAssignee] = useState(t.assignee || '');
  const [progress, setProgress] = useState<number>(t.progress || 0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  async function preview() {
    setShowPrompt(!showPrompt);
    if (promptText == null) { const j = await (await fetch('/api/prompt?id=' + t.id)).json(); setPromptText(j.prompt || ''); }
  }
  const chip = (id: string, kind: string) => {
    const ok = rs.has(id);
    const href = id.startsWith('D') || /^A\d|^E1$/.test(id) ? '/decisions#' + id : null;
    return (
      <span key={id} className={`chip ${ok ? 'ok' : kind}`} title={title(id)}>
        {ok ? '✓' : '🔒'} {href ? <Link href={href} style={{ color: 'inherit' }}>{id}</Link> : id}{title(id) ? ` · ${String(title(id)).slice(0, 34)}` : ''}
      </span>
    );
  };
  return (
    <div className="modal-bg" onClick={close} role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <span><span className="tid">{t.id}</span> · גל {t.wave} · {WAVE_NAME[t.wave]}</span>
          <button className="btn sm" onClick={close} aria-label="סגור">✕</button>
        </div>
        <h2 style={{ margin: '6px 0' }}>{t.title}</h2>
        <div className="row">
          <span className={`chip ${TSTATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
          <span className={`chip ${impactClass(t.impact_level)}`}>השפעה: {t.impact}</span>
          <span className="chip">מאמץ: <Effort text={t.effort} /></span>
          <span className="chip">{t.kind}</span>
        </div>
        {t.wait_note && <p className="small" style={{ color: 'var(--amber)', fontWeight: 700 }}>{t.wait_note}</p>}
        <p className="small muted">מקור: {t.source}</p>

        <label>סטטוס</label>
        <div className="seg">
          {STATUSES.map((s) => <button key={s} className={t.status === s ? 'on' : ''} disabled={busy || t.status === s} onClick={() => setStatus(t, s)}>{STATUS_LABEL[s]}</button>)}
        </div>

        <h3>תלויות וחסמים</h3>
        <div className="small">
          <p><b>חסמים ({(t.blockers || []).length}):</b> {(t.blockers || []).length ? <span className="row" style={{ display: 'inline-flex' }}>{t.blockers.map((b: string) => chip(b, 'bad'))}</span> : <span className="muted">אין</span>}</p>
          {(t.partial_blockers || []).length > 0 && <p><b>חסם חלקי:</b> <span className="row" style={{ display: 'inline-flex' }}>{t.partial_blockers.map((b: string) => chip(b, 'warn'))}</span></p>}
          <p><b>תלוי במשימות:</b> {(t.depends_on || []).length ? (t.depends_on as string[]).map((d) => <button key={d} className={`chip ${byId[d]?.status === 'done' ? 'ok' : ''}`} onClick={() => open(d)} style={{ cursor: 'pointer', marginInlineEnd: 4 }}>{d} · {STATUS_LABEL[byId[d]?.status] || ''}</button>) : <span className="muted">אין</span>}</p>
          {(t.needs_inputs || []).length > 0 && <p><b>נדרש מאייל:</b> {(t.needs_inputs as string[]).map((i) => chip(i, ''))}</p>}
          {(t.finding_ids || []).length > 0 && <p><b>ממצאים קשורים:</b> {(t.finding_ids as string[]).map((f) => <Link key={f} className="chip info" href={'/findings#' + f} style={{ marginInlineEnd: 4 }}>{f} · {String(findings.find((x: any) => x.id === f)?.title || '').slice(0, 30)}</Link>)}</p>}
        </div>

        {t.status === 'in_progress' && (
          <>
            <label>התקדמות: {progress}%</label>
            <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(+e.target.value)} onMouseUp={() => act({ action: 'task_update', id: t.id, progress }, 'התקדמות עודכנה')} onTouchEnd={() => act({ action: 'task_update', id: t.id, progress }, 'התקדמות עודכנה')} />
          </>
        )}

        <h3 style={{ marginTop: 14 }}>פרטי המשימה</h3>
        <Md text={t.details} />

        <div className="row" style={{ margin: '12px 0' }}>
          <CopyPrompt id={t.id} />
          <button className="btn sm" onClick={preview}>{showPrompt ? 'הסתר' : 'הצג'} פרומפט</button>
        </div>
        {showPrompt && <div className="pre" dir="rtl">{promptText ?? 'טוען…'}</div>}

        <label htmlFor="as">אחראי</label>
        <input id="as" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Claude Code / אייל / בוט…" />
        <label htmlFor="nt">הערות</label>
        <textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="sticky-actions">
          <button className="btn primary" disabled={busy} onClick={() => act({ action: 'task_update', id: t.id, notes, assignee }, 'נשמר')}>שמירת הערות</button>
        </div>
      </div>
    </div>
  );
}
