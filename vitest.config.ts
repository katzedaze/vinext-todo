import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// vite.config.ts（vinext / Cloudflare プラグイン）は読み込まず、Node 上で素直にテストする
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts", "app/actions.ts"],
      // Cloudflare バインディングへの薄い入口と生成コードは E2E で確認する
      exclude: ["lib/**/*.test.ts", "lib/test-utils/**", "lib/cloudflare.ts", "lib/utils.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
