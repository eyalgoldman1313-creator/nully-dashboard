import { loadAll } from '@/lib/data';
import DecisionsClient from '@/components/DecisionsClient';

export const dynamic = 'force-dynamic';

export default async function Decisions() {
  const { decisions, inputs, tasks } = await loadAll();
  const slim = tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, blockers: t.blockers, partial_blockers: t.partial_blockers }));
  return (
    <>
      <h1>החלטות וקלטים</h1>
      <p className="muted">בחירת אפשרות (או אישור ההמלצה) תשחרר אוטומטית את המשימות שהיו חסומות רק בגללה. אפשר להוסיף הערה, וכל שינוי נרשם ביומן הפעילות.</p>
      <DecisionsClient decisions={decisions} inputs={inputs} tasks={slim} />
    </>
  );
}
