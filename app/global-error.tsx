'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: 'Heebo, Arial, sans-serif', margin: 0, padding: 24, lineHeight: 1.65, background: '#f3f5f8', color: '#161b28' }}>
        <h1 style={{ fontSize: '1.75rem' }}>משהו השתבש</h1>
        <p>לא הצלחנו לטעון את הלוח.</p>
        <button type="button" onClick={reset} style={{ minHeight: 44, padding: '8px 16px', font: 'inherit', background: '#0d5c59', color: '#fff', border: 0, borderRadius: 8 }}>ניסיון נוסף</button>
      </body>
    </html>
  );
}
