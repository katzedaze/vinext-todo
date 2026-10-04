import { deleteTodoAction, toggleTodoAction } from "@/app/actions";
import type { Todo } from "@/lib/todos";

export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <form action={toggleTodoAction}>
        <input type="hidden" name="id" value={todo.id} />
        <button
          type="submit"
          aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-sm ${
            todo.completed
              ? "border-orange-600 bg-orange-600 text-white"
              : "border-slate-300 hover:border-orange-500"
          }`}
        >
          {todo.completed ? "✓" : ""}
        </button>
      </form>
      <span className={`flex-1 break-all ${todo.completed ? "text-slate-400 line-through" : ""}`}>
        {todo.title}
      </span>
      <form action={deleteTodoAction}>
        <input type="hidden" name="id" value={todo.id} />
        <button
          type="submit"
          aria-label={`「${todo.title}」を削除`}
          className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          削除
        </button>
      </form>
    </li>
  );
}
