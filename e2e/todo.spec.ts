import { expect, test, type Page } from "@playwright/test";

function uniqueTitle(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function addTodo(page: Page, title: string) {
  const input = page.getByRole("textbox", { name: "新しいタスク" });
  await input.fill(title);
  await input.press("Enter");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();
  await expect(input).toHaveValue("");
}

/** 操作を行い、それが呼んだ Server Action（POST）の応答まで待つ。画面は楽観的に先に変わるため */
async function withAction(page: Page, act: () => Promise<void>) {
  const response = page.waitForResponse((res) => res.request().method() === "POST");
  await act();
  await response;
}

function row(page: Page, title: string) {
  return page.getByRole("listitem").filter({ hasText: title });
}

// クリックがハイドレーション前に起きると React のハンドラが動かないため、ハイドレーション完了の印を待つ
// レート制限は IP 単位なので、テストごとに別の IP を名乗って互いの制限に巻き込まれないようにする。
// 本番では Cloudflare がこのヘッダーを必ず上書きするため、クライアントが偽装することはできない
async function waitForHydration(page: Page) {
  await page.locator("form[data-hydrated]").waitFor();
}

function randomIp(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 254) + 1).join(".");
}

async function open(page: Page, path = "/") {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": randomIp() });
  await page.goto(path);
  await waitForHydration(page);
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("starts with an empty list for a new visitor", async ({ page }) => {
  await expect(page.getByText("タスクはありません")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "完了率 0%" })).toBeVisible();
});

test("adds a todo and shows the creation time in Tokyo time", async ({ page }) => {
  const title = uniqueTitle("追加");

  await addTodo(page, title);

  await expect(row(page, title).getByText("OPEN")).toBeVisible();
  await expect(row(page, title).locator("time")).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  await expect(page.getByRole("tab", { name: /all 1/ })).toBeVisible();
});

test("rejects a whitespace-only title", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "新しいタスク" });
  await input.fill("   ");
  await input.press("Enter");

  await expect(page.getByRole("alert")).toContainText("タイトルを入力してください");
});

test("focuses the input with the / shortcut", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is desktop only");
  await page.locator("body").press("/");

  await expect(page.getByRole("textbox", { name: "新しいタスク" })).toBeFocused();
});

test("toggles completion and filters by status", async ({ page }) => {
  const done = uniqueTitle("完了");
  const open = uniqueTitle("未完了");
  await addTodo(page, done);
  await addTodo(page, open);

  await page.getByRole("checkbox", { name: `「${done}」を完了にする` }).click();
  await expect(row(page, done).getByText("DONE")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "完了率 50%" })).toBeVisible();

  await page.getByRole("tab", { name: /done/ }).click();
  await expect(row(page, done)).toBeVisible();
  await expect(row(page, open)).toHaveCount(0);

  await page.getByRole("tab", { name: /open/ }).click();
  await expect(row(page, open)).toBeVisible();
  await expect(row(page, done)).toHaveCount(0);
});

test("renames a todo with Enter and keeps it after reload", async ({ page }) => {
  const title = uniqueTitle("旧名");
  const renamed = uniqueTitle("新名");
  await addTodo(page, title);

  await page.getByRole("button", { name: `「${title}」を編集` }).click();
  const editor = page.getByRole("textbox", { name: "タスク名を編集" });
  await editor.fill(renamed);
  await withAction(page, () => editor.press("Enter"));

  await expect(row(page, renamed)).toBeVisible();
  await page.reload();
  await waitForHydration(page);
  await expect(row(page, renamed)).toBeVisible();
  await expect(row(page, title)).toHaveCount(0);
});

test("cancels editing with Escape", async ({ page }) => {
  const title = uniqueTitle("そのまま");
  await addTodo(page, title);

  await page.getByText(title).dblclick();
  const editor = page.getByRole("textbox", { name: "タスク名を編集" });
  await editor.fill("捨てる変更");
  await editor.press("Escape");

  await expect(editor).toHaveCount(0);
  await expect(row(page, title)).toBeVisible();
});

test("deletes a todo and clears completed ones", async ({ page }) => {
  const removed = uniqueTitle("削除");
  const finished = uniqueTitle("片付け");
  await addTodo(page, removed);
  await addTodo(page, finished);

  await withAction(page, () => page.getByRole("button", { name: `「${removed}」を削除` }).click());
  await expect(row(page, removed)).toHaveCount(0);

  await withAction(page, () => page.getByRole("checkbox", { name: `「${finished}」を完了にする` }).click());
  await withAction(page, () => page.getByRole("button", { name: "完了済みを削除" }).click());
  await expect(page.getByText("タスクはありません")).toBeVisible();

  await page.reload();
  await waitForHydration(page);
  await expect(page.getByText("タスクはありません")).toBeVisible();
});

test("keeps each visitor's list private", async ({ page, browser }) => {
  const title = uniqueTitle("秘密");
  await addTodo(page, title);

  const otherVisitor = await browser.newContext();
  const otherPage = await otherVisitor.newPage();
  await open(otherPage);

  await expect(otherPage.getByText("タスクはありません")).toBeVisible();
  await expect(otherPage.getByText(title)).toHaveCount(0);
  await otherVisitor.close();
});

test("cycles the theme and remembers it", async ({ page }) => {
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^テーマ:/ });

  await toggle.click(); // system → light
  await expect(html).not.toHaveClass(/dark/);
  await toggle.click(); // light → dark
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await waitForHydration(page);
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: /^テーマ: ダーク/ })).toBeVisible();
});

test("shows a 404 page for unknown routes", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  await page.getByRole("link", { name: "タスク一覧へ戻る" }).click();
  await expect(page).toHaveURL("/");
});

test("rate limits rapid mutations from the same IP", async ({ page, isMobile }) => {
  test.skip(isMobile, "server-side behavior; one project is enough");
  const input = page.getByRole("textbox", { name: "新しいタスク" });

  // 制限は 60 秒あたり 30 回。31 回目以降は拒否される
  for (let i = 0; i < 31; i++) {
    await input.fill(`連打 ${i}`);
    await withAction(page, () => input.press("Enter"));
  }

  await expect(page.getByRole("alert")).toContainText("操作が多すぎます");
  await expect(page.getByRole("listitem")).toHaveCount(30);
});

test("sends a nonce-based CSP that every script satisfies", async ({ page, isMobile }) => {
  test.skip(isMobile, "server-side behavior; one project is enough");
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  const response = await page.goto("/");
  await waitForHydration(page);

  const csp = response?.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();
  const scriptSrc = csp.split("; ").find((directive) => directive.startsWith("script-src")) ?? "";
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");

  // ページ内のスクリプトはすべて同じ nonce を持つ（ブラウザは nonce 属性を DOM から隠すので .nonce で読む）
  const nonces = await page
    .locator("script")
    .evaluateAll((scripts) => scripts.map((script) => (script as HTMLScriptElement).nonce));
  expect(nonces.length).toBeGreaterThan(0);
  expect(new Set(nonces)).toEqual(new Set([nonce]));

  // テーマの初期化スクリプトが実際に動いていること（CSP で止められていない）
  await addTodo(page, uniqueTitle("CSP"));
  expect(violations).toEqual([]);
});
