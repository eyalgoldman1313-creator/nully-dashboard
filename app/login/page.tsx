'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Form() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (r.ok) { const n = sp.get('next'); router.push(n && n.startsWith('/') ? n : '/'); router.refresh(); }
    else setErr('סיסמה שגויה');
  }
  return (
    <form className="card login" onSubmit={submit}>
      <h1>Nully · לוח בקרה</h1>
      <p className="muted">הכניסה מוגנת בסיסמה.</p>
      <label htmlFor="pw">סיסמה</label>
      <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" autoFocus />
      {err && <p className="err">{err}</p>}
      <div style={{ marginTop: 14 }}><button className="btn primary" disabled={busy || !pw} style={{ width: '100%' }}>{busy ? 'נכנס…' : 'כניסה'}</button></div>
    </form>
  );
}
export default function Login() { return <Suspense><Form /></Suspense>; }
