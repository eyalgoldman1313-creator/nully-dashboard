'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAct, useConfirm } from './ui';
import Md from './Md';
import Icon from './Icon';
import { fmtDate } from '@/lib/labels';
import { STATUS_LABEL } from '@/lib/logic';

function Card({ d, tasks, act, busy, onReset }: any) {
  const [sel, setSel] = useState<string | null>(d.chosen || d.recommended || null);
  const [note, setNote] = useState(d.note || '');
  const blocked = tasks.filter((t: any) => (t.blockers || []).includes(d.id) || (t.partial_blockers || []).includes(d.id));
  const staticList: string[] = d.unblocks || [];
  const list = Array.from(new Set([...staticList, ...blocked.map((t: any) => t.id)]));
  const decided = d.status === 'decided';
  const chosen = d.options.find((o: any) => o.id === d.chosen);
  return (
    <article id={d.id} className="card">
      <div className="row between">
        <h3><span className="tid">{d.id}</span> · {d.title}</h3>
        <span className={`chip ${decided ? 'ok' : 'warn'}`}>{decided ? 'הוכרעה' : 'ממתינה'}</span>
      </div>
      <p>{d.question}</p>

      {d.options.length > 0 && (
        <div role="radiogroup" aria-label="אפשרויות">
          {d.options.map((o: any) => (
            <label key={o.id} className={`opt ${sel === o.id ? 'sel' : ''} ${o.disabled || decided ? 'dis' : ''}`}>
              <input type="radio" name={d.id} disabled={o.disabled || decided} checked={sel === o.id} onChange={() => setSel(o.id)} />
              <b>{o.label}</b>
              {d.recommended === o.id && <span className="meta"> · <Icon name="star" /> המלצה</span>}
              {d.chosen === o.id && <span className="chip ok">נבחר</span>}
              {o.disabled && <span className="meta"> · לא רלוונטי כרגע</span>}
              {o.detail && <div className="meta" dir="auto">{o.detail}</div>}
            </label>
          ))}
        </div>
      )}

      {decided ? (
        <div>
          {chosen ? <p><b>ההכרעה:</b> <bdi dir="auto">{chosen.label}</bdi></p> : null}
          {d.decided_note && <p className="muted" dir="auto">{d.decided_note}</p>}
          {d.note && <p><b>הערה:</b> <bdi dir="auto">{d.note}</bdi></p>}
          {d.decided_by ? <p className="meta">הוכרע על ידי <bdi dir="auto">{d.decided_by}</bdi> · {fmtDate(d.decided_at)}</p> : null}
          {d.options.length > 0 && <button type="button" className="btn" disabled={busy} onClick={() => onReset(d.id)}><Icon name="undo" mirror />פתיחה מחדש</button>}
        </div>
      ) : (
        <>
          <label htmlFor={'n' + d.id}>הערה (לא חובה)</label>
          <textarea id={'n' + d.id} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: מאשר בתנאי ש…" />
          <div className="row">
            <button type="button" className="btn primary" disabled={busy || !sel} onClick={() => act({ action: 'decision_choose', id: d.id, option: sel, note }, `${d.id} הוכרעה`)}>אישור הבחירה</button>
            {d.recommended && sel !== d.recommended && <button type="button" className="btn" disabled={busy} onClick={() => { setSel(d.recommended); act({ action: 'decision_choose', id: d.id, option: d.recommended, note }, `${d.id}: אושרה ההמלצה`); }}>אישור ההמלצה</button>}
          </div>
        </>
      )}

      {list.length > 0 && (
        <div>
          <p><b>{decided ? 'משימות שההחלטה משחררת' : 'מה ההחלטה פותחת'}</b></p>
          <div className="link-list">
            {list.map((id) => {
              const t = tasks.find((x: any) => x.id === id);
              return (
                <Link key={id} href={`/board?task=${id}`}>
                  <span className="tid">{id}</span>
                  {t ? <><bdi dir="auto">{t.title}</bdi><span className={`chip ${t.status === 'done' ? 'ok' : t.status === 'blocked' ? 'bad' : t.status === 'in_progress' ? 'brand' : 'info'}`}>{STATUS_LABEL[t.status]}</span></> : null}
                </Link>
              );
            })}
          </div>
          {!decided && blocked.length > 0 && <p className="meta">משימה שנשארת חסומה גם אחרי ההחלטה, בגלל חסם אחר, תישאר חסומה.</p>}
        </div>
      )}

      {d.evidence && <details><summary>ראיות ופירוט</summary><Md text={d.evidence} /></details>}
      <p className="meta">מקור: <bdi dir="auto">{d.source}</bdi></p>
    </article>
  );
}

function InputRow({ i, tasks, act, busy }: any) {
  const [note, setNote] = useState(i.note || '');
  const [open, setOpen] = useState(false);
  const provided = i.status === 'provided';
  const blocked = tasks.filter((t: any) => (t.blockers || []).includes(i.id) || (t.partial_blockers || []).includes(i.id));
  const list = Array.from(new Set([...(i.tasks || []), ...blocked.map((t: any) => t.id)]));
  const statusLabel = provided ? 'סופק' : i.kind === 'admin_action' ? 'ממתין לביצוע' : 'חסר';
  return (
    <li id={i.id} className="check-row">
      <div className="check-main">
        <span className="tid">{i.id}</span>
        <div>
          <h3>{i.title}</h3>
          <p className="meta">
            <span className={`chip ${provided ? 'ok' : 'warn'}`}>{statusLabel}</span>
            {i.fmt && i.kind !== 'admin_action' ? <> · <bdi dir="auto">{i.fmt}</bdi></> : null}
          </p>
          {i.kind === 'admin_action' && i.fmt && <details><summary>צעדי הביצוע</summary><Md text={i.fmt} /></details>}
          {list.length > 0 && (
            <p className="meta">משימות: {list.map((id: string, idx: number) => (
              <span key={id}>{idx > 0 ? ' · ' : ''}<Link href={`/board?task=${id}`} className="tid">{id}</Link></span>
            ))}</p>
          )}
          {i.note && !open && <p className="meta">הערה: <bdi dir="auto">{i.note}</bdi></p>}
          {open && <textarea dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder="הערה" aria-label={`הערה עבור ${i.id}`} />}
        </div>
      </div>
      <div className="row">
        <button type="button" className={`btn ${provided ? '' : 'ok'}`} disabled={busy} onClick={() => act({ action: 'input_update', id: i.id, status: provided ? 'needed' : 'provided', note }, provided ? 'סומן כחסר' : `${i.id} סופק`)}>
          {provided ? <><Icon name="undo" mirror />סימון כחסר</> : <><Icon name="check" />סימון כסופק</>}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(!open)}>{open ? 'סגירה' : 'הערה'}</button>
      </div>
    </li>
  );
}

export default function DecisionsClient({ decisions, inputs, tasks }: any) {
  const { act, busy, Toast } = useAct();
  const { confirm, dialog } = useConfirm();
  const [section, setSection] = useState<'decisions' | 'inputs'>('decisions');
  const [tab, setTab] = useState<'pending' | 'decided' | 'all'>('pending');
  const [inputTab, setInputTab] = useState<'needed' | 'provided' | 'all'>('needed');
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const list = decisions.filter((d: any) => tab === 'all' || (tab === 'pending' ? d.status === 'open' : d.status === 'decided'));
  const pendingCount = decisions.filter((d: any) => d.status === 'open').length;
  const needed = inputs.filter((i: any) => i.status === 'needed');
  const inputList = inputs.filter((i: any) => inputTab === 'all' || i.status === inputTab);

  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!h) return;
    if (h === 'inputs' || inputs.some((i: any) => i.id === h)) setSection('inputs');
    setPendingHash(h);
  }, [inputs]);
  useEffect(() => {
    if (!pendingHash) return;
    document.getElementById(pendingHash)?.scrollIntoView({ block: 'start' });
  }, [pendingHash, section]);

  async function onReset(id: string) {
    const ok = await confirm({
      title: 'פתיחת ההחלטה מחדש',
      body: 'משימות שנפתחו בגלל ההחלטה ייחסמו שוב.',
      confirmLabel: 'פתיחה מחדש',
      danger: true,
    });
    if (ok) await act({ action: 'decision_reset', id }, 'ההחלטה נפתחה מחדש');
  }

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setSection((s) => (s === 'decisions' ? 'inputs' : 'decisions'));
  }

  return (
    <>
      <div className="seg" role="tablist" aria-label="החלטות או קלטים" onKeyDown={onTabKey}>
        <button type="button" role="tab" id="tab-dec" aria-selected={section === 'decisions'} aria-controls="panel-dec" className={section === 'decisions' ? 'on' : ''} onClick={() => setSection('decisions')}>החלטות ({pendingCount} ממתינות)</button>
        <button type="button" role="tab" id="tab-in" aria-selected={section === 'inputs'} aria-controls="panel-in" className={section === 'inputs' ? 'on' : ''} onClick={() => setSection('inputs')}>קלטים שחסרים ({needed.length})</button>
      </div>

      <div role="tabpanel" id="panel-dec" aria-labelledby="tab-dec" hidden={section !== 'decisions'}>
        <h2>החלטות</h2>
        <div className="seg" aria-label="סינון החלטות">
          <button type="button" className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>ממתינות ({pendingCount})</button>
          <button type="button" className={tab === 'decided' ? 'on' : ''} onClick={() => setTab('decided')}>הוכרעו ({decisions.length - pendingCount})</button>
          <button type="button" className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>הכל</button>
        </div>
        <div className="grid g2">{list.map((d: any) => <Card key={d.id} d={d} tasks={tasks} act={act} busy={busy} onReset={onReset} />)}</div>
        {!list.length && <p className="muted">אין החלטות בקטגוריה הזו.</p>}
      </div>

      <div role="tabpanel" id="panel-in" aria-labelledby="tab-in" hidden={section !== 'inputs'}>
        <h2 id="inputs">קלטים ונכסים</h2>
        <p className="lede">סימון פריט כסופק משחרר משימות שחיכו רק לו.</p>
        <div className="seg" aria-label="סינון קלטים">
          <button type="button" className={inputTab === 'needed' ? 'on' : ''} onClick={() => setInputTab('needed')}>חסרים ({needed.length})</button>
          <button type="button" className={inputTab === 'provided' ? 'on' : ''} onClick={() => setInputTab('provided')}>סופקו ({inputs.length - needed.length})</button>
          <button type="button" className={inputTab === 'all' ? 'on' : ''} onClick={() => setInputTab('all')}>הכל</button>
        </div>
        <ul className="check-list surface">
          {inputList.map((i: any) => <InputRow key={i.id} i={i} tasks={tasks} act={act} busy={busy} />)}
        </ul>
        {!inputList.length && <p className="muted">אין פריטים בקטגוריה הזו.</p>}
      </div>
      {dialog}
      {Toast}
    </>
  );
}
