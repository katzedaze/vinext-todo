import { bindings, defineConfig, defineWorker } from "cf/config";

// .env を読み込む（Git には含めない。ひな形は .env.example）。
// すでに設定済みの環境変数（CI のシークレットなど）は上書きしない
try {
  process.loadEnvFile();
} catch {
  // .env がなければ環境変数か仮の値を使う
}

export const PLACEHOLDER_D1_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

/**
 * D1 データベース ID。`cf d1 create --name vinext-todo-db` の出力を .env の D1_DATABASE_ID に書く。
 * 未設定（仮の値）でもローカル開発はできるが、本番へのマイグレーション・デプロイはできない。
 */
export const D1_DATABASE_ID = process.env.D1_DATABASE_ID || PLACEHOLDER_D1_DATABASE_ID;

export default defineConfig({
  worker: defineWorker({
    name: "vinext-todo",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-04",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "vinext-todo-db", id: D1_DATABASE_ID }),
      // 更新系の Server Action を IP ごとに 60 秒あたり 30 回までに制限する
      MUTATION_LIMITER: bindings.rateLimit({ namespace: "1001", simple: { limit: 30, period: 60 } }),
    },
  }),
});
