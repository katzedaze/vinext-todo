import { Progress } from "@/components/ui/progress";
import type { Todo } from "@/lib/todo-repository";

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border bg-card px-4 py-3">
      <span className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

export function StatsPanel({ todos }: { todos: Todo[] }) {
  const total = todos.length;
  const done = todos.filter((todo) => todo.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section aria-label="進捗" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="total" value={total} />
        <Stat label="open" value={total - done} />
        <Stat label="done" value={done} />
        <Stat label="progress" value={`${rate}%`} accent />
      </div>
      <Progress value={rate} aria-label={`完了率 ${rate}%`} className="h-1" />
    </section>
  );
}
