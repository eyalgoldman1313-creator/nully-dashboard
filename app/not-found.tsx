import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="state">
      <h1>העמוד לא נמצא</h1>
      <p>אין עמוד בכתובת הזו.</p>
      <Link className="btn primary" href="/">חזרה לסקירה</Link>
    </div>
  );
}
