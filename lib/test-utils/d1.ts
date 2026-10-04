import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

/** migrations/ を適用済みの、メモリ上の D1 を作る */
export async function createTestD1(): Promise<{ db: D1Database; dispose: () => Promise<void> }> {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: "export default { fetch() { return new Response(null); } }",
      compatibilityDate: "2026-10-04",
      d1Databases: ["DB"],
    }),
  );
  const db = (await mf.getD1Database("DB")) as unknown as D1Database;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // D1 の exec は 1 行 1 文しか受け付けないので、文ごとに 1 行へまとめて流す
    const statements = sql
      .replace(/--.*$/gm, "")
      .split(";")
      .map((statement) => statement.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const statement of statements) await db.exec(statement);
  }

  return { db, dispose: () => mf.dispose() };
}
