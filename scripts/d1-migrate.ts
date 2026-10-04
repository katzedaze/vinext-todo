// D1 のマイグレーションを適用する。使い方: node scripts/d1-migrate.ts --local | --remote
import { spawnSync } from "node:child_process";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { D1_DATABASE_ID, PLACEHOLDER_D1_DATABASE_ID } from "../cloudflare.config.ts";
import { applyMigrations } from "../lib/migrations.ts";

// 開発サーバー・プレビューと同じ保存先（@cloudflare/vite-plugin の既定。中に d1/ が作られる）
const LOCAL_STATE_DIR = ".cloudflare/state/v3";

/**
 * ローカルは Miniflare で直接適用する。`cf d1 migrations apply --local` は Linux（CI）で
 * 適用後に終了しないことがあるため使わない。記録用テーブルは cf / wrangler と互換
 */
async function migrateLocal(): Promise<number> {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: "export default { fetch() { return new Response(null); } }",
      compatibilityDate: "2026-10-04",
      d1Databases: { DB: D1_DATABASE_ID },
    }),
    resourcePersistencePath: LOCAL_STATE_DIR,
  });
  try {
    const db = (await mf.getD1Database("DB")) as unknown as D1Database;
    const applied = await applyMigrations(db);
    const summary = applied.length ? `applied: ${applied.join(", ")}` : "no pending migrations";
    process.stdout.write(`${summary}\n`);
    return 0;
  } finally {
    await mf.dispose();
  }
}

function migrateRemote(): number {
  if (D1_DATABASE_ID === PLACEHOLDER_D1_DATABASE_ID) {
    console.error(
      ".env の D1_DATABASE_ID が未設定です。`cf d1 create` の出力の uuid を書いてください（.env.example 参照）。",
    );
    return 1;
  }
  const args = ["exec", "cf", "d1", "migrations", "apply", D1_DATABASE_ID, "--dir", "migrations"];
  const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
  return result.status ?? 1;
}

// process.exit() で即終了すると、Windows では Miniflare の後始末と競合して Node が異常終了することがある。
// 終了コードだけ設定し、イベントループが空になって自然に終わるのを待つ
const target = process.argv[2];
if (target === "--local") process.exitCode = await migrateLocal();
else if (target === "--remote") process.exitCode = migrateRemote();
else {
  console.error("usage: node scripts/d1-migrate.ts --local | --remote");
  process.exitCode = 1;
}
