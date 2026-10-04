'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="state">
      <h1>משהו השתבש</h1>
      <p>לא הצלחנו לטעון את העמוד. אפשר לנסות שוב.</p>
      <button type="button" className="btn primary" onClick={reset}>ניסיון נוסף</button>
      {error?.message ? <details className="section"><summary>פרטי השגיאה</summary><p className="meta" dir="auto">{error.message}</p></details> : null}
    </div>
  );
}
