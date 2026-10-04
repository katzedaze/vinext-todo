import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { applyMigrations } from "../migrations";

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
  await applyMigrations(db);
  return { db, dispose: () => mf.dispose() };
}
