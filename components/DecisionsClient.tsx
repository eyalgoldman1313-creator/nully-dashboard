'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAct } from './ui';
import Md from './Md';
import { fmtDate, TSTATUS_CLASS } from '@/lib/labels';
import { STATUS_LABEL } from '@/lib/logic';

function Card({ d, tasks, act, busy }: any) {
  const [sel, setSel] = useState<string | null>(d.chosen || d.recommended || null);
  const [note, setNote] = useState(d.note || '');
  const blocked = tasks.filter((t: any) => (t.blockers || []).includes(d.id) || (t.partial_blockers || []).includes(d.id));
  const staticList: string[] = d.unblocks || [];
  const list = Array.from(new Set([...staticList, ...blocked.map((t: any) => t.id)]));
  const decided = d.status === 'decided';
  const chosen = d.options.find((o: any) => o.id === d.chosen);
  return (
    <article id={d.id} className={`card ${decided ? 'decided' : 'pending'}`} style={{ scrollMarginTop: 80 }}>
      <div className="row between">
        <h3><span className="tid">{d.id}</span> · {d.title}</h3>
        <span className={`chip ${decided ? 'ok' : 'warn'}`}>{decided ? 'הוכרעה' : 'ממתינה להחלטה'}</span>
      </div>
      <p>{d.question}</p>

      {d.options.length > 0 && (
        <div role="radiogroup" aria-label="אפשרויות">
          {d.options.map((o: any) => (
            <label key={o.id} className={`opt ${sel === o.id ? 'sel' : ''} ${o.disabled || decided ? 'dis' : ''}`} style={{ fontWeight: 400 }}>
              <input type="radio" name={d.id} disabled={o.disabled || decided} checked={sel === o.id} onChange={() => setSel(o.id)} />
              <b>{o.label}</b>
              {d.recommended === o.id && <span className="chip brand" style={{ marginInlineStart: 8 }}>⭐ המלצה</span>}
              {d.chosen === o.id && <span className="chip ok" style={{ marginInlineStart: 8 }}>✓ נבחר</span>}
              {o.disabled && <span className="chip" style={{ marginInlineStart: 8 }}>לא רלוונטי כרגע</span>}
              {o.detail && <div className="small muted" style={{ marginTop: 4 }}>{o.detail}</div>}
            </label>
          ))}
        </div>
      )}

      {decided ? (
        <div className="small" style={{ marginTop: 8 }}>
          {chosen ? <p><b>ההכרעה:</b> {chosen.label}</p> : null}
          {d.decided_note && <p className="muted">{d.decided_note}</p>}
          {d.note && <p><b>הערה שלך:</b> {d.note}</p>}
          <p className="muted tiny">{d.decided_by ? `הוכרע ע"י ${d.decided_by} · ${fmtDate(d.decided_at)}` : ''}</p>
          {d.options.length > 0 && <button className="btn sm" disabled={busy} onClick={() => confirm('לפתוח את ההחלטה מחדש? משימות שנפתחו בגללה יחסמו שוב.') && act({ action: 'decision_reset', id: d.id }, 'ההחלטה נפתחה מחדש')}>↩ שינוי החלטה</button>}
        </div>
      ) : (
        <>
          <label htmlFor={'n' + d.id}>הערה (לא חובה)</label>
          <textarea id={'n' + d.id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: מאשר בתנאי ש…" />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={busy || !sel} onClick={() => act({ action: 'decision_choose', id: d.id, option: sel, note }, `${d.id} הוכרעה`)}>✓ אשר את הבחירה</button>
            {d.recommended && sel !== d.recommended && <button className="btn" disabled={busy} onClick={() => { setSel(d.recommended); act({ action: 'decision_choose', id: d.id, option: d.recommended, note }, `${d.id}: אושרה ההמלצה`); }}>⭐ אשר את ההמלצה</button>}
          </div>
        </>
      )}

      {list.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <b className="small">{decided ? 'משימות שההחלטה משחררת/שחררה' : 'מה ההחלטה פותחת'}:</b>
          <div className="row" style={{ marginTop: 4 }}>
            {list.map((id) => { const t = tasks.find((x: any) => x.id === id); return (
              <Link key={id} href={`/board?task=${id}`} className={`chip ${t ? TSTATUS_CLASS[t.status] : ''}`} title={t?.title}>{id}{t ? ` · ${t.title.slice(0, 28)} (${STATUS_LABEL[t.status]})` : ''}</Link>
            ); })}
          </div>
          {!decided && blocked.length > 0 && <p className="tiny muted">משימות שנשארות חסומות גם אחרי ההחלטה בגלל חסם אחר יישארו חסומות.</p>}
        </div>
      )}

      {d.evidence && <details style={{ marginTop: 12 }}><summary>ראיות ופירוט מלא</summary><Md text={d.evidence} /></details>}
      <p className="tiny muted" style={{ marginTop: 8 }}>מקור: {d.source}</p>
    </article>
  );
}

function InputRow({ i, tasks, act, busy }: any) {
  const [note, setNote] = useState(i.note || '');
  const [open, setOpen] = useState(false);
  const provided = i.status === 'provided';
  const blocked = tasks.filter((t: any) => (t.blockers || []).includes(i.id) || (t.partial_blockers || []).includes(i.id));
  const list = Array.from(new Set([...(i.tasks || []), ...blocked.map((t: any) => t.id)]));
  return (
    <article id={i.id} className="card" style={{ scrollMarginTop: 80 }}>
      <div className="row between">
        <h3><span className="tid">{i.id}</span> · {i.title}</h3>
        <span className={`chip ${provided ? 'ok' : 'warn'}`}>{provided ? 'סופק' : i.kind === 'admin_action' ? 'ממתין לביצוע שלך' : 'חסר'}</span>
      </div>
      {i.fmt && (i.kind === 'admin_action' ? <details><summary>צעדי הביצוע</summary><Md text={i.fmt} /></details> : <p className="small muted">פורמט/מיקום: {i.fmt}</p>)}
      <div className="row" style={{ margin: '6px 0' }}>{list.map((id) => <Link key={id} className="chip info" href={`/board?task=${id}`}>{id}</Link>)}</div>
      {open && <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה (למשל: הועלה ל-/workspace/uploads)" />}
      <div className="row" style={{ marginTop: 6 }}>
        <button className={`btn sm ${provided ? '' : 'ok'}`} disabled={busy} onClick={() => act({ action: 'input_update', id: i.id, status: provided ? 'needed' : 'provided', note }, provided ? 'סומן כחסר' : `${i.id} סופק`)}>{provided ? '↩ סמן כחסר' : '✓ סמן כסופק / בוצע'}</button>
        <button className="btn sm" onClick={() => setOpen(!open)}>הערה</button>
      </div>
      {i.note && !open && <p className="small muted">הערה: {i.note}</p>}
    </article>
  );
}

export default function DecisionsClient({ decisions, inputs, tasks }: any) {
  const { act, busy, Toast } = useAct();
  const [tab, setTab] = useState<'pending' | 'decided' | 'all'>('pending');
  const list = decisions.filter((d: any) => tab === 'all' || (tab === 'pending' ? d.status === 'open' : d.status === 'decided'));
  const pendingCount = decisions.filter((d: any) => d.status === 'open').length;
  return (
    <>
      <div className="seg">
        <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>ממתינות ({pendingCount})</button>
        <button className={tab === 'decided' ? 'on' : ''} onClick={() => setTab('decided')}>הוכרעו ({decisions.length - pendingCount})</button>
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>הכל</button>
      </div>
      <div className="grid g2">{list.map((d: any) => <Card key={d.id} d={d} tasks={tasks} act={act} busy={busy} />)}</div>
      {!list.length && <p className="muted">אין החלטות בקטגוריה הזו 🎉</p>}

      <h2 id="inputs" style={{ scrollMarginTop: 80 }}>קלטים ונכסים שחסרים ממך ({inputs.filter((i: any) => i.status === 'needed').length} חסרים)</h2>
      <p className="muted small">סימון פריט כסופק משחרר משימות שחיכו רק לו (למשל A1 → T0.3).</p>
      <div className="grid g2">{inputs.map((i: any) => <InputRow key={i.id} i={i} tasks={tasks} act={act} busy={busy} />)}</div>
      {Toast}
    </>
  );
}
