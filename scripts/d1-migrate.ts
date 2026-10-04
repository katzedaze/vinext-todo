// D1 のマイグレーションを適用する。使い方: node scripts/d1-migrate.ts --local | --remote
import { spawnSync } from "node:child_process";
import { D1_DATABASE_ID, PLACEHOLDER_D1_DATABASE_ID } from "../cloudflare.config.ts";

const target = process.argv[2];
if (target !== "--local" && target !== "--remote") {
  console.error("usage: node scripts/d1-migrate.ts --local | --remote");
  process.exit(1);
}

if (target === "--remote" && D1_DATABASE_ID === PLACEHOLDER_D1_DATABASE_ID) {
  console.error(
    "cloudflare.config.ts の D1_DATABASE_ID が仮の値のままです。`cf d1 create` の出力で置き換えてください。",
  );
  process.exit(1);
}

const args = ["exec", "cf", "d1", "migrations", "apply", D1_DATABASE_ID, "--dir", "migrations"];
if (target === "--local") args.push("--local", "--persist-to", ".cloudflare/state");

const result = spawnSync("pnpm", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
