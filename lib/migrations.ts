// migrations/ の SQL を D1 に適用する（Node 上で Miniflare の D1 に対して使う。アプリ本体からは読み込まない）
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(import.meta.dirname, "../migrations");

// wrangler / cf と同じ記録用テーブル。どちらで適用しても二重に適用されない
const TRACKING_TABLE = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

/** SQL ファイルを文に分ける。D1 の exec は 1 行 1 文しか受け付けないので、各文を 1 行にまとめる */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, "")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** 未適用のマイグレーションを番号順に適用し、適用したファイル名を返す */
export async function applyMigrations(db: D1Database, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(TRACKING_TABLE.replace(/\s+/g, " "));
  const { results } = await db.prepare("SELECT name FROM d1_migrations").all<{ name: string }>();
  const applied = new Set(results.map((row) => row.name));

  const pending = readdirSync(dir)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();
  for (const file of pending) {
    const statements = splitSqlStatements(readFileSync(join(dir, file), "utf8")).map((sql) =>
      db.prepare(sql),
    );
    await db.batch([...statements, db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").bind(file)]);
  }
  return pending;
}
