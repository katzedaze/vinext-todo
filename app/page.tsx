import { CloudIcon, DatabaseIcon, GitBranchIcon } from "@phosphor-icons/react/ssr";
import { AddTodoForm } from "@/app/_components/AddTodoForm";
import { StatsPanel } from "@/app/_components/StatsPanel";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { TodoBoard } from "@/app/_components/TodoBoard";
import { getDb } from "@/lib/cloudflare";
import { readOwnerHash } from "@/lib/owner";
import { listTodos, refreshOwner, type Todo } from "@/lib/todo-repository";

export const dynamic = "force-dynamic";

/** 一覧を取得し、閲覧も利用とみなして最終利用日時を延ばす（未使用データの自動削除の対象から外す） */
async function loadTodos(ownerHash: string): Promise<Todo[]> {
  const db = getDb();
  const [todos] = await Promise.all([listTodos(db, ownerHash), refreshOwner(db, ownerHash)]);
  return todos;
}

export default async function Home() {
  // 初回訪問（Cookie なし）は空のリスト。最初の追加時に Server Action が Cookie を発行する
  const ownerHash = await readOwnerHash();
  const todos = ownerHash ? await loadTodos(ownerHash) : [];
  const open = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2.5 bg-primary" aria-hidden />
            <span className="font-semibold">vinext-todo</span>
            <span className="text-muted-foreground">/ main</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
              online
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary">~/tasks</span> $ todo list
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Task Board</h1>
        </div>

        <StatsPanel todos={todos} />
        <AddTodoForm />
        <TodoBoard todos={todos} />
      </main>

      <footer className="border-t bg-card/80 text-[11px] text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <GitBranchIcon /> main
            </span>
            <span>{open} open</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <DatabaseIcon /> D1
            </span>
            <span className="flex items-center gap-1">
              <CloudIcon /> Cloudflare Workers
            </span>
            <span>UTF-8</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
