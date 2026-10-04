import { clearCompletedAction } from "@/app/actions";
import { AddTodoForm } from "@/app/_components/AddTodoForm";
import { TodoItem } from "@/app/_components/TodoItem";
import { listTodos } from "@/lib/todos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await listTodos();
  const remaining = todos.filter((todo) => !todo.completed).length;
  const hasCompleted = todos.length > remaining;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <section className="mx-auto flex max-w-xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            vinext + Cloudflare D1
          </p>
          <h1 className="mt-1 text-4xl font-semibold">Todo</h1>
        </header>

        <AddTodoForm />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {todos.length === 0 ? (
            <p className="px-4 py-10 text-center text-slate-500">タスクはまだありません</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </ul>
          )}
          <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>残り {remaining} 件</span>
            {hasCompleted && (
              <form action={clearCompletedAction}>
                <button type="submit" className="hover:text-red-600">
                  完了済みを削除
                </button>
              </form>
            )}
          </footer>
        </div>
      </section>
    </main>
  );
}
