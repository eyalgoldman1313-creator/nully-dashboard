'use client';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import Icon from './Icon';
import Modal from './Modal';

export async function callAction(body: any): Promise<any> {
  const r = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'שגיאה'), { status: r.status });
  return j;
}
export function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(null), 4500); }, []);
  const act = useCallback(async (body: any, okMsg?: string) => {
    setBusy(true);
    try {
      const j = await callAction(body);
      const rel = (j.released || []) as string[];
      say([okMsg || 'נשמר', ...rel].join(' · '));
      router.refresh();
      return j;
    } catch (e: any) {
      if (e.status === 409 && String(e.message).startsWith('blocked_by:')) throw e;
      say('שגיאה: ' + e.message);
      return null;
    } finally { setBusy(false); }
  }, [router, say]);
  const Toast = toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null;
  return { act, busy, say, Toast };
}

type ConfirmOpts = { title: string; body: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })), []);
  function answer(v: boolean) {
    state?.resolve(v);
    setState(null);
  }
  const dialog = state ? (
    <Modal variant="dialog" titleId="confirm-title" onClose={() => answer(false)}>
      <h2 id="confirm-title">{state.title}</h2>
      <p dir="auto">{state.body}</p>
      <div className="row confirm-actions">
        <button type="button" className={`btn ${state.danger ? 'danger' : 'primary'}`} onClick={() => answer(true)}>{state.confirmLabel || 'אישור'}</button>
        <button type="button" className="btn" onClick={() => answer(false)}>{state.cancelLabel || 'ביטול'}</button>
      </div>
    </Modal>
  ) : null;
  return { confirm, dialog };
}

export function CopyButton({ text, label = 'העתק פרומפט ל-Claude Code', className = 'btn' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setDone(true); setTimeout(() => setDone(false), 2200);
  }
  return <button type="button" className={className} onClick={copy}>{done ? <>הועתק <Icon name="check" /></> : <><Icon name="copy" />{label}</>}</button>;
}
