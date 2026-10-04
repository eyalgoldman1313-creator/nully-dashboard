'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAct, useConfirm } from './ui';
import Effort from './Effort';
import Md from './Md';
import Icon from './Icon';
import Modal from './Modal';
import { STATUS_LABEL, STATUSES } from '@/lib/logic';
import { TSTATUS_CLASS, WAVE_NAME } from '@/lib/labels';

type Props = { tasks: any[]; decisions: any[]; inputs: any[]; findings: any[]; resolved: string[]; initialTask: string | null; initialColumn?: string | null };

function kindText(kind?: string) {
  if (!kind) return '';
  return kind.replaceAll('🤖', 'בוט').replaceAll('🏪', 'חנות');
}

function CopyPrompt({ id, className = 'btn' }: { id: string; className?: string }) {
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
  return (
    <button type="button" className={className} onClick={go} disabled={state === 'busy'}>
      {state === 'done' ? <><Icon name="check" />הועתק</> : state === 'err' ? 'שגיאה בהעתקה' : <><Icon name="copy" />העתקת פרומפט</>}
    </button>
  );
}

export default function TaskBoard({ tasks, decisions, inputs, findings, resolved, initialTask, initialColumn }: Props) {
  const { act, busy, Toast } = useAct();
  const { confirm, dialog } = useConfirm();
  const rs = useMemo(() => new Set(resolved), [resolved]);
  const [wave, setWave] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(initialTask);
  const startCol = initialColumn && (STATUSES as readonly string[]).includes(initialColumn) ? initialColumn : 'open';
  const [mobileStatus, setMobileStatus] = useState(startCol);
  const [doneOpen, setDoneOpen] = useState(startCol === 'done');
  const filtered = tasks.filter((t) => (wave === 'all' || String(t.wave) === wave) && (!q || (t.id + ' ' + t.title + ' ' + (t.source || '')).toLowerCase().includes(q.toLowerCase())));
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const title = (id: string) => decisions.find((d) => d.id === id)?.title || inputs.find((i) => i.id === id)?.title || byId[id]?.title || '';
  const task = sel ? byId[sel] : null;

  useEffect(() => {
    if (initialColumn) document.getElementById('col-' + initialColumn)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [initialColumn]);

  async function setStatus(t: any, status: string, extra: any = {}) {
    try { await act({ action: 'task_update', id: t.id, status, ...extra }, `${t.id} → ${STATUS_LABEL[status]}`); }
    catch (e: any) {
      if (String(e.message).startsWith('blocked_by:')) {
        const ok = await confirm({
          title: 'המשימה עדיין חסומה',
          body: `המשימה ${t.id} חסומה על ידי ${e.message.slice(11)}. להמשיך בכל זאת?`,
          confirmLabel: 'המשך בכל זאת',
          danger: true,
        });
        if (ok) await act({ action: 'task_update', id: t.id, status, force: true, ...extra }, `${t.id} → ${STATUS_LABEL[status]}`);
      }
    }
  }

  return (
    <>
      <div className="filters">
        <label className="inline-field">גל
          <select value={wave} onChange={(e) => setWave(e.target.value)} aria-label="גל">
            <option value="all">כל הגלים</option>
            {[0, 1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>גל {w} · {WAVE_NAME[w]}</option>)}
          </select>
        </label>
        <label className="inline-field">חיפוש
          <input aria-label="חיפוש משימה" dir="auto" placeholder="מזהה, כותרת או מקור" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="meta">{filtered.length} משימות</span>
      </div>

      <div className="seg board-tabs" role="tablist" aria-label="סטטוס">
        {STATUSES.map((st) => {
          const n = filtered.filter((t) => t.status === st).length;
          return (
            <button key={st} type="button" role="tab" aria-selected={mobileStatus === st} className={mobileStatus === st ? 'on' : ''} onClick={() => setMobileStatus(st)}>
              {STATUS_LABEL[st]} <span className="num">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="kanban">
        {(['open', 'in_progress', 'blocked'] as const).map((st) => (
          <Column key={st} st={st} tasks={filtered.filter((t) => t.status === st)} active={mobileStatus === st} onOpen={setSel} />
        ))}
        <section className={`col col-done st-done${mobileStatus === 'done' ? ' is-active' : ''}${doneOpen ? ' is-open' : ''}`} id="col-done" aria-label={STATUS_LABEL.done}>
          <button type="button" className="col-head done-toggle" aria-expanded={doneOpen} onClick={() => setDoneOpen((v) => !v)}>
            <h2><i className="col-mark" aria-hidden="true" />{STATUS_LABEL.done}</h2>
            <span className="col-count">{filtered.filter((t) => t.status === 'done').length}</span>
            <Icon name="chevron" mirror className="done-chev" />
          </button>
          <div className="col-body">
            {filtered.filter((t) => t.status === 'done').map((t) => <TaskCard key={t.id} t={t} onOpen={() => setSel(t.id)} />)}
            {!filtered.some((t) => t.status === 'done') && <p className="empty-col">אין משימות שבוצעו.</p>}
          </div>
        </section>
      </div>

      {task && <Detail key={task.id} t={task} close={() => setSel(null)} open={setSel} rs={rs} title={title} byId={byId} findings={findings} act={act} busy={busy} setStatus={setStatus} />}
      {dialog}
      {Toast}
    </>
  );
}

function TaskCard({ t, onOpen }: { t: any; onOpen: () => void }) {
  return (
    <article className={`tcard st-${t.status}`}>
      <button type="button" className="tcard-open" onClick={onOpen}>
        <span className="tcard-title">{t.title}</span>
        <span className="tcard-meta"><span className="tid">{t.id}</span><span aria-hidden="true">·</span><span>גל {t.wave}</span></span>
      </button>
    </article>
  );
}

function Column({ st, tasks, active, onOpen }: { st: string; tasks: any[]; active: boolean; onOpen: (id: string) => void }) {
  return (
    <section className={`col st-${st}${active ? ' is-active' : ''}`} id={`col-${st}`} aria-label={STATUS_LABEL[st]}>
      <div className="col-head">
        <h2><i className="col-mark" aria-hidden="true" />{STATUS_LABEL[st]}</h2>
        <span className="col-count">{tasks.length}</span>
      </div>
      <div className="col-body">
        {tasks.map((t) => <TaskCard key={t.id} t={t} onOpen={() => onOpen(t.id)} />)}
        {!tasks.length && <p className="empty-col">אין משימות.</p>}
      </div>
    </section>
  );
}

function refOf(id: string) {
  if (id.startsWith('D') || /^A\d|^E1$/.test(id)) return '/decisions#' + id;
  if (id.startsWith('F')) return '/findings#' + id;
  return null;
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
  function commitProgress(v: number) {
    act({ action: 'task_update', id: t.id, progress: v }, 'התקדמות עודכנה');
  }
  const dep = (id: string, openTone: string) => {
    const ok = rs.has(id);
    const href = refOf(id);
    const inner = (
      <>
        <span className={`chip ${ok ? 'ok' : openTone}`}>{ok ? 'נסגר' : 'פתוח'}</span>
        <bdi className="tid">{id}</bdi>
        {title(id) ? <bdi dir="auto">{String(title(id))}</bdi> : null}
      </>
    );
    return href
      ? <Link key={id} href={href}>{inner}</Link>
      : <span key={id} className="row">{inner}</span>;
  };
  return (
    <Modal variant="sheet" titleId="task-title" onClose={close}>
      <div className="row between">
        <span className="meta"><span className="tid">{t.id}</span> · גל {t.wave} · {WAVE_NAME[t.wave]}</span>
        <button type="button" className="btn" onClick={close} aria-label="סגירה"><Icon name="close" /></button>
      </div>
      <h2 id="task-title">{t.title}</h2>
      <p className="meta">
        <span className={`chip ${TSTATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
        {' · '}{t.impact} · מאמץ <Effort text={t.effort} />{kindText(t.kind) ? <> · {kindText(t.kind)}</> : null}
      </p>
      {t.wait_note && <p className="note-warn" dir="auto">{t.wait_note}</p>}
      <p className="meta">מקור: <bdi dir="auto">{t.source}</bdi></p>

      <h3>סטטוס</h3>
      <div className="seg" role="group" aria-label="שינוי סטטוס">
        {STATUSES.map((s) => <button key={s} type="button" className={t.status === s ? 'on' : ''} disabled={busy || t.status === s} onClick={() => setStatus(t, s)}>{STATUS_LABEL[s]}</button>)}
      </div>

      <h3>תלויות וחסמים</h3>
      <p><b>חסמים ({(t.blockers || []).length})</b></p>
      {(t.blockers || []).length ? <div className="link-list">{t.blockers.map((b: string) => dep(b, 'bad'))}</div> : <p className="muted">אין</p>}
      {(t.partial_blockers || []).length > 0 && <><p><b>חסם חלקי</b></p><div className="link-list">{t.partial_blockers.map((b: string) => dep(b, 'warn'))}</div></>}
      <p><b>תלוי במשימות</b></p>
      {(t.depends_on || []).length ? (
        <div className="link-list">
          {(t.depends_on as string[]).map((d) => (
            <button key={d} type="button" className="btn start" onClick={() => open(d)}>
              <span className="tid">{d}</span>
              <span className={`chip ${byId[d]?.status === 'done' ? 'ok' : 'info'}`}>{STATUS_LABEL[byId[d]?.status] || '—'}</span>
            </button>
          ))}
        </div>
      ) : <p className="muted">אין</p>}
      {(t.needs_inputs || []).length > 0 && <><p><b>נדרש ממך</b></p><div className="link-list">{(t.needs_inputs as string[]).map((i) => dep(i, 'warn'))}</div></>}
      {(t.finding_ids || []).length > 0 && (
        <><p><b>ממצאים קשורים</b></p>
          <div className="link-list">
            {(t.finding_ids as string[]).map((f) => (
              <Link key={f} href={'/findings#' + f}><span className="tid">{f}</span><bdi dir="auto">{String(findings.find((x: any) => x.id === f)?.title || '')}</bdi></Link>
            ))}
          </div>
        </>
      )}

      {t.status === 'in_progress' && (
        <>
          <label htmlFor="prog">התקדמות: <span className="num">{progress}%</span></label>
          <input id="prog" type="range" min={0} max={100} step={5} value={progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${progress} אחוז`}
            onChange={(e) => setProgress(+e.target.value)}
            onPointerUp={(e) => commitProgress(+(e.target as HTMLInputElement).value)}
            onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) commitProgress(+(e.target as HTMLInputElement).value); }} />
        </>
      )}

      <h3>פרטי המשימה</h3>
      <Md text={t.details} />

      <div className="row">
        <CopyPrompt id={t.id} />
        <button type="button" className="btn" onClick={preview}>{showPrompt ? 'הסתרת פרומפט' : 'הצגת פרומפט'}</button>
      </div>
      {showPrompt && <div className="pre" dir="auto">{promptText ?? 'טוען…'}</div>}

      <label htmlFor="as">אחראי</label>
      <input id="as" dir="auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Claude Code / אייל / בוט…" />
      <label htmlFor="nt">הערות</label>
      <textarea id="nt" dir="auto" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="sticky-actions">
        <button type="button" className="btn primary" disabled={busy} onClick={() => act({ action: 'task_update', id: t.id, notes, assignee }, 'נשמר')}>שמירה</button>
      </div>
    </Modal>
  );
}
