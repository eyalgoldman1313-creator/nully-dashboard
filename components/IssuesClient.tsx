'use client';
import { useState } from 'react';
import { useAct } from './ui';
import { fmtDate, ISTATUS_LABEL, KIND_LABEL } from '@/lib/labels';

export default function IssuesClient({ issues }: { issues: any[] }) {
  const { act, busy, Toast } = useAct();
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [kind, setKind] = useState('note');
  const [filter, setFilter] = useState<'open' | 'closed' | 'all'>('open');
  const isOpen = (i: any) => i.status === 'open' || i.status === 'in_progress';
  const list = issues.filter((i) => filter === 'all' || (filter === 'open' ? isOpen(i) : !isOpen(i)));
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await act({ action: 'issue_add', title, body, kind }, 'נוסף');
    if (r) { setTitle(''); setBody(''); }
  }
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>＋ פריט חדש</h3>
        <label htmlFor="it">כותרת</label>
        <input id="it" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לזכור / לבדוק / לשאול?" />
        <label htmlFor="ib">פרטים (לא חובה)</label>
        <textarea id="ib" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="row" style={{ marginTop: 10 }}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 'auto' }} aria-label="סוג">
            {['note', 'question', 'bug', 'idea'].map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <button className="btn primary" disabled={busy || !title.trim()}>הוספה</button>
        </div>
      </form>
      <div className="seg" style={{ marginTop: 14 }}>
        <button className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>פתוחים ({issues.filter(isOpen).length})</button>
        <button className={filter === 'closed' ? 'on' : ''} onClick={() => setFilter('closed')}>סגורים ({issues.filter((i) => !isOpen(i)).length})</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>הכל</button>
      </div>
      <div className="grid g2">
        {list.map((i) => (
          <article key={i.id} className="card">
            <div className="row between"><h3><span className="tid">{i.id}</span> · {i.title}</h3><span className={`chip ${isOpen(i) ? 'warn' : 'ok'}`}>{ISTATUS_LABEL[i.status]}</span></div>
            {i.body && i.body !== i.title && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{i.body}</p>}
            <p className="tiny muted"><span className="chip">{KIND_LABEL[i.kind] || i.kind}</span> {i.author === 'eyal' ? 'אייל' : i.author} · {fmtDate(i.created_at)}{i.source ? ` · ${i.source}` : ''}</p>
            <div className="row">
              {isOpen(i) ? <button className="btn sm ok" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'resolved' }, 'נסגר')}>✓ סגור</button>
                : <button className="btn sm" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'open' }, 'נפתח מחדש')}>↩ פתח מחדש</button>}
              {i.status === 'open' && <button className="btn sm" disabled={busy} onClick={() => act({ action: 'issue_update', id: i.id, status: 'in_progress' }, 'בטיפול')}>בטיפול</button>}
              <button className="btn sm danger" disabled={busy} onClick={() => confirm('למחוק את הפריט?') && act({ action: 'issue_delete', id: i.id }, 'נמחק')}>מחיקה</button>
            </div>
          </article>
        ))}
      </div>
      {!list.length && <p className="muted">אין פריטים.</p>}
      {Toast}
    </>
  );
}
