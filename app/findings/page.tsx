import { loadAll } from '@/lib/data';
import FindingsClient from '@/components/FindingsClient';
import { FINDINGS_NAV, Subnav } from '@/components/Nav';

export const dynamic = 'force-dynamic';
export default async function Findings() {
  const { findings, tasks } = await loadAll();
  return (
    <>
      <header className="page-head">
        <h1>ממצאים</h1>
        <p className="lede">השוואת הטיוטה מול אתרי ייחוס. החומרה היא הערכה, לא מדידה. נושאי משפט ורגולציה מסומנים כמחוץ לתחום.</p>
      </header>
      <Subnav items={FINDINGS_NAV} />
      <FindingsClient findings={findings} tasks={tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))} />
    </>
  );
}
