import { loadAll } from '@/lib/data';
import DecisionsClient from '@/components/DecisionsClient';

export const dynamic = 'force-dynamic';

export default async function Decisions() {
  const { decisions, inputs, tasks } = await loadAll();
  const slim = tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, blockers: t.blockers, partial_blockers: t.partial_blockers }));
  return (
    <>
      <header className="page-head">
        <h1>החלטות וקלטים</h1>
        <p className="lede">אישור בחירה משחרר משימות שהיו חסומות רק בגללה. כל שינוי נרשם ביומן.</p>
      </header>
      <DecisionsClient decisions={decisions} inputs={inputs} tasks={slim} />
    </>
  );
}
