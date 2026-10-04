"use client";

import { useOptimistic, useState, useTransition } from "react";
import { BroomIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import {
  clearCompletedAction,
  deleteTodoAction,
  toggleTodoAction,
  updateTodoTitleAction,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Todo } from "@/lib/todo-repository";
import { TodoRow } from "./TodoRow";

type Filter = "all" | "open" | "done";

type OptimisticChange =
  | { type: "toggle"; id: number }
  | { type: "rename"; id: number; title: string }
  | { type: "delete"; id: number }
  | { type: "clear-completed" };

function applyChange(todos: Todo[], change: OptimisticChange): Todo[] {
  switch (change.type) {
    case "toggle":
      return todos.map((todo) => (todo.id === change.id ? { ...todo, completed: !todo.completed } : todo));
    case "rename":
      return todos.map((todo) => (todo.id === change.id ? { ...todo, title: change.title } : todo));
    case "delete":
      return todos.filter((todo) => todo.id !== change.id);
    case "clear-completed":
      return todos.filter((todo) => !todo.completed);
  }
}

function toFormData(fields: Record<string, string | number>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, String(value));
  return formData;
}

const FILTERS: { value: Filter; label: string; match: (todo: Todo) => boolean }[] = [
  { value: "all", label: "all", match: () => true },
  { value: "open", label: "open", match: (todo) => !todo.completed },
  { value: "done", label: "done", match: (todo) => todo.completed },
];

export function TodoBoard({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [optimisticTodos, applyOptimistic] = useOptimistic(todos, applyChange);
  const [, startTransition] = useTransition();

  // 失敗時は transition 終了とともに楽観的更新が自動で巻き戻るので、理由だけ表示する
  const run = (change: OptimisticChange, action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      try {
        const result = await action();
        if (result.error) setError(result.error);
      } catch {
        setError("通信に失敗しました。接続を確認して再度お試しください");
      }
    });
  };

  const active = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const visible = optimisticTodos.filter(active.match);
  const hasCompleted = optimisticTodos.some((todo) => todo.completed);

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="gap-1.5 px-3 text-xs">
                {f.label}
                <span className="text-muted-foreground tabular-nums">
                  {optimisticTodos.filter(f.match).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasCompleted}
          onClick={() => run({ type: "clear-completed" }, clearCompletedAction)}
          className="text-muted-foreground hover:text-destructive"
        >
          <BroomIcon />
          完了済みを削除
        </Button>
      </div>

      {error && (
        <p role="alert" className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          error: {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-muted-foreground">
          <TerminalWindowIcon className="size-8 opacity-60" />
          <p className="text-sm">{filter === "done" ? "完了したタスクはありません" : "タスクはありません"}</p>
          <p className="text-xs opacity-70">0 rows returned</p>
        </div>
      ) : (
        <ul className="divide-y">
          {visible.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={(t) =>
                run({ type: "toggle", id: t.id }, () => toggleTodoAction(toFormData({ id: t.id })))
              }
              onDelete={(t) =>
                run({ type: "delete", id: t.id }, () => deleteTodoAction(toFormData({ id: t.id })))
              }
              onRename={(t, title) =>
                run({ type: "rename", id: t.id, title }, () =>
                  updateTodoTitleAction(toFormData({ id: t.id, title })),
                )
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
