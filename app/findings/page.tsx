import { loadAll } from '@/lib/data';
import FindingsClient from '@/components/FindingsClient';
export const dynamic = 'force-dynamic';
export default async function Findings() {
  const { findings, tasks } = await loadAll();
  return (
    <>
      <h1>ממצאים · האתר שלך מול אתרי הייחוס</h1>
      <p className="muted">18 ממצאים (F1–F18) מהשוואת הטיוטה מול 13 אתרי ייחוס. חומרה ודירוג הם הערכה, לא מדידה. נושאי משפט ורגולציה מסומנים כמחוץ לתחום, לפי ההנחיה שלך.</p>
      <FindingsClient findings={findings} tasks={tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))} />
    </>
  );
}
