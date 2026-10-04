import { loadAll } from '@/lib/data';
import TaskBoard from '@/components/TaskBoard';
import { Subnav, WORK_NAV } from '@/components/Nav';

export const dynamic = 'force-dynamic';

export default async function Board({ searchParams }: { searchParams: Promise<{ task?: string; col?: string }> }) {
  const sp = await searchParams;
  const { tasks, decisions, inputs, findings, resolved } = await loadAll();
  return (
    <div className="board-page">
      <header className="page-head">
        <h1>לוח משימות</h1>
        <p className="lede">כל משימה נפתחת לפרטים, סטטוס והעתקת פרומפט.</p>
      </header>
      <Subnav items={WORK_NAV} />
      <TaskBoard
        tasks={tasks.map(({ prompt, ...t }) => ({ ...t, hasPrompt: !!prompt, promptLen: prompt?.length || 0 }))}
        decisions={decisions.map((d) => ({ id: d.id, title: d.title, status: d.status }))}
        inputs={inputs.map((i) => ({ id: i.id, title: i.title, status: i.status }))}
        findings={findings.map((f) => ({ id: f.id, title: f.title }))}
        resolved={resolved}
        initialTask={sp.task || null}
        initialColumn={sp.col || null}
      />
    </div>
  );
}
