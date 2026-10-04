import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const isCI = Boolean(process.env.CI);

// ビルド済みの Worker をローカルの workerd で動かして確認する（`pnpm build` を先に実行しておく）
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // ローカルの D1 は書き込みが 1 本ずつなので、並列数を上げすぎると待ち行列ができてタイムアウトする
  workers: isCI ? 2 : 4,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // 起動直後の workerd は PC とスマホの並列実行で応答が遅れることがあるため、既定の 5 秒より長く待つ
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm db:migrate:local && pnpm start --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
