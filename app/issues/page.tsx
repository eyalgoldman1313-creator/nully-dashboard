import { loadAll } from '@/lib/data';
import IssuesClient from '@/components/IssuesClient';
import { FINDINGS_NAV, Subnav } from '@/components/Nav';

export const dynamic = 'force-dynamic';
export default async function Issues() {
  const { issues } = await loadAll();
  return (
    <>
      <header className="page-head">
        <h1>הערות ונושאים פתוחים</h1>
        <p className="lede">שאלות, הערות ורעיונות. אפשר להוסיף ולסגור כאן, והבוטים מוסיפים דרך ה־API.</p>
      </header>
      <Subnav items={FINDINGS_NAV} />
      <IssuesClient issues={issues} />
    </>
  );
}
