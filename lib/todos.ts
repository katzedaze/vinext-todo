import { env } from "cloudflare:workers";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

type TodoRow = { id: number; title: string; completed: number; created_at: string };

const SCHEMA = `CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

let schemaReady: Promise<unknown> | null = null;

// isolate ごとに一度だけテーブルを用意する（ローカル・本番どちらも migration 手順が不要）
async function db(): Promise<D1Database> {
  schemaReady ??= env.DB.prepare(SCHEMA)
    .run()
    .catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  await schemaReady;
  return env.DB;
}

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, completed: row.completed === 1, createdAt: row.created_at };
}

export async function listTodos(): Promise<Todo[]> {
  const { results } = await (await db())
    .prepare("SELECT id, title, completed, created_at FROM todos ORDER BY completed ASC, id DESC")
    .all<TodoRow>();
  return results.map(toTodo);
}

export async function createTodo(title: string): Promise<void> {
  await (await db()).prepare("INSERT INTO todos (title) VALUES (?)").bind(title).run();
}

export async function toggleTodo(id: number): Promise<void> {
  await (await db()).prepare("UPDATE todos SET completed = 1 - completed WHERE id = ?").bind(id).run();
}

export async function deleteTodo(id: number): Promise<void> {
  await (await db()).prepare("DELETE FROM todos WHERE id = ?").bind(id).run();
}

export async function clearCompleted(): Promise<void> {
  await (await db()).prepare("DELETE FROM todos WHERE completed = 1").run();
}
