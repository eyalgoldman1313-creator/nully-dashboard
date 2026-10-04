import { loadAll } from '@/lib/data';
import IssuesClient from '@/components/IssuesClient';
export const dynamic = 'force-dynamic';
export default async function Issues() {
  const { issues } = await loadAll();
  return (
    <>
      <h1>הערות ונושאים פתוחים</h1>
      <p className="muted">מקום להוסיף שאלות, הערות ורעיונות. הבוטים מוסיפים פריטים דרך ה-API, ואתה יכול להוסיף ולסגור כאן.</p>
      <IssuesClient issues={issues} />
    </>
  );
}
