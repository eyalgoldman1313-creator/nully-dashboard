'use client';
import { useState } from 'react';
import { useAct, useConfirm } from './ui';
import Icon from './Icon';
import { fmtDate, ISTATUS_LABEL, KIND_LABEL } from '@/lib/labels';

export default function IssuesClient({ issues }: { issues: any[] }) {
  const { act, busy, Toast } = useAct();
  const { confirm, dialog } = useConfirm();
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [kind, setKind] = useState('note');
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const isOpen = (i: any) => i.status === 'open' || i.status === 'in_progress';
  const list = issues.filter((i) => filter === 'all' || (filter === 'open' ? isOpen(i) : !isOpen(i)));
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await act({ action: 'issue_add', title, body, kind }, 'נוסף');
    if (r) { setTitle(''); setBody(''); }
  }
  async function remove(id: string) {
    const ok = await confirm({ title: 'מחיקת הפריט', body: 'הפריט יימחק מהרשימה.', confirmLabel: 'מחיקה', danger: true });
    if (ok) await act({ action: 'issue_delete', id }, 'נמחק');
  }
  return (
    <>
      <form className="surface" onSubmit={add}>
        <h2>פריט חדש</h2>
        <label htmlFor="it">כותרת</label>
        <input id="it" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לזכור, לבדוק או לשאול?" />
        <label htmlFor="ib">פרטים (לא חובה)</label>
        <textarea id="ib" dir="auto" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="row">
          <label className="inline-field">סוג
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="סוג">
              {['note', 'question', 'bug', 'idea'].map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <button type="submit" className="btn primary" disabled={busy || !title.trim()}><Icon name="plus" />הוספה</button>
        </div>
      </form>
      <div className="section">
        <h2>הרשימה</h2>
        <div className="seg">
          <button type="button" className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>פתוחים ({issues.filter(isOpen).length})</button>
          <button type="button" className={filter === 'closed' ? 'on' : ''} onClick={() => setFilter('closed')}>סגורים ({issues.filter((i) => !isOpen(i)).length})</button>
          <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>הכל</button>
        </div>
        <div className="stack">
          {list.map((i) => (
            <article key={i.id} className="surface">
              <div className="row between">
                <h3><span className="tid">{i.id}</span> · <bdi dir="auto">{i.title}</bdi></h3>
                <span className={`chip ${isOpen(i) ? 'warn' : 'ok'}`}>{ISTATUS_LABEL[i.status]}</span>
              </div>
              {i.body && i.body !== i.title && <p dir="auto">{i.body}</p>}
              <p className="meta">{KIND_LABEL[i.kind] || i.kind} · <bdi dir="auto">{i.author === 'eyal' ? 'אייל' : i.author}</bdi> · {fmtDate(i.created_at)}{i.source ? <> · <bdi dir="auto">{i.source}</bdi></> : null}</p>
              <div className="row">
                {isOpen(i)
                  ? <button type="button" className="btn ok" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'resolved' }, 'נסגר')}><Icon name="check" />סגירה</button>
                  : <button type="button" className="btn" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'open' }, 'נפתח מחדש')}><Icon name="undo" mirror />פתיחה מחדש</button>}
                {i.status === 'open' && <button type="button" className="btn" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'in_progress' }, 'בטיפול')}>בטיפול</button>}
                <button type="button" className="btn danger" disabled={busy} onClick={() => remove(i.id)}>מחיקה</button>
              </div>
            </article>
          ))}
        </div>
        {!list.length && <p className="muted">אין פריטים.</p>}
      </div>
      {dialog}
      {Toast}
    </>
  );
}
