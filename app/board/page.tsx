import { loadAll } from '@/lib/data';
import TaskBoard from '@/components/TaskBoard';

export const dynamic = 'force-dynamic';

export default async function Board({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const sp = await searchParams;
  const { tasks, decisions, inputs, findings, resolved } = await loadAll();
  return (
    <>
      <h1>לוח משימות</h1>
      <p className="muted">פתוח · בעבודה · חסום · בוצע. לחיצה על כרטיס פותחת פרטים, תלויות, והכפתור להעתקת הפרומפט ל-Claude Code.</p>
      <TaskBoard
        tasks={tasks.map(({ prompt, ...t }) => ({ ...t, hasPrompt: !!prompt, promptLen: prompt?.length || 0 }))}
        decisions={decisions.map((d) => ({ id: d.id, title: d.title, status: d.status }))}
        inputs={inputs.map((i) => ({ id: i.id, title: i.title, status: i.status }))}
        findings={findings.map((f) => ({ id: f.id, title: f.title }))}
        resolved={resolved}
        initialTask={sp.task || null}
      />
    </>
  );
}
