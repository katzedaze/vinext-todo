// D1 への読み書き。D1Database を引数で受け取るので、テストではローカルの D1 を渡せる

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

type TodoRow = { id: number; title: string; completed: number; created_at: string };

export const MAX_TODOS_PER_OWNER = 100;
/** この日数使われていない訪問者のデータは削除する */
export const INACTIVE_OWNER_RETENTION_DAYS = 90;

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, completed: row.completed === 1, createdAt: row.created_at };
}

export async function listTodos(db: D1Database, ownerHash: string): Promise<Todo[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, completed, created_at FROM todos
       WHERE owner_hash = ? ORDER BY completed ASC, id DESC LIMIT ?`,
    )
    .bind(ownerHash, MAX_TODOS_PER_OWNER)
    .all<TodoRow>();
  return results.map(toTodo);
}

/** 上限に達していれば追加せず false を返す。件数確認と追加を 1 文で行い、同時リクエストでも上限を超えない */
export async function createTodo(db: D1Database, ownerHash: string, title: string): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO todos (owner_hash, title)
       SELECT ?1, ?2 WHERE (SELECT COUNT(*) FROM todos WHERE owner_hash = ?1) < ?3`,
    )
    .bind(ownerHash, title, MAX_TODOS_PER_OWNER)
    .run();
  return result.meta.changes > 0;
}

export async function updateTodoTitle(
  db: D1Database,
  ownerHash: string,
  id: number,
  title: string,
): Promise<void> {
  await db
    .prepare("UPDATE todos SET title = ? WHERE id = ? AND owner_hash = ?")
    .bind(title, id, ownerHash)
    .run();
}

export async function toggleTodo(db: D1Database, ownerHash: string, id: number): Promise<void> {
  await db
    .prepare("UPDATE todos SET completed = 1 - completed WHERE id = ? AND owner_hash = ?")
    .bind(id, ownerHash)
    .run();
}

export async function deleteTodo(db: D1Database, ownerHash: string, id: number): Promise<void> {
  await db.prepare("DELETE FROM todos WHERE id = ? AND owner_hash = ?").bind(id, ownerHash).run();
}

export async function clearCompleted(db: D1Database, ownerHash: string): Promise<void> {
  await db.prepare("DELETE FROM todos WHERE owner_hash = ? AND completed = 1").bind(ownerHash).run();
}

/** 更新操作のたびに呼び、訪問者の最終利用日時を記録する（初回は登録する） */
export async function touchOwner(db: D1Database, ownerHash: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO owners (owner_hash, last_seen) VALUES (?, datetime('now'))
       ON CONFLICT (owner_hash) DO UPDATE SET last_seen = excluded.last_seen`,
    )
    .bind(ownerHash)
    .run();
}

/** 閲覧時に呼ぶ。既存の訪問者の最終利用日時だけを延ばし、偽の Cookie で行が増えないよう新規登録はしない */
export async function refreshOwner(db: D1Database, ownerHash: string): Promise<void> {
  await db
    .prepare("UPDATE owners SET last_seen = datetime('now') WHERE owner_hash = ?")
    .bind(ownerHash)
    .run();
}

/** 一定期間使われていない訪問者のタスクと記録を削除する */
export async function purgeInactiveOwners(
  db: D1Database,
  retentionDays: number = INACTIVE_OWNER_RETENTION_DAYS,
): Promise<void> {
  const cutoff = `-${retentionDays} days`;
  await db.batch([
    db
      .prepare(
        `DELETE FROM todos WHERE owner_hash IN
           (SELECT owner_hash FROM owners WHERE last_seen < datetime('now', ?))`,
      )
      .bind(cutoff),
    db.prepare("DELETE FROM owners WHERE last_seen < datetime('now', ?)").bind(cutoff),
  ]);
}
