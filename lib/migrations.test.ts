import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { applyMigrations, splitSqlStatements } from "./migrations";
import { createTestD1 } from "./test-utils/d1";

describe("splitSqlStatements", () => {
  test("drops comments and joins each statement onto one line", () => {
    const sql = "-- comment\nCREATE TABLE a (\n  id INTEGER\n);\n\nINSERT INTO a VALUES (1); -- trailing\n";

    expect(splitSqlStatements(sql)).toEqual(["CREATE TABLE a ( id INTEGER )", "INSERT INTO a VALUES (1)"]);
  });
});

describe("applyMigrations", () => {
  let db: D1Database;
  let dispose: () => Promise<void>;
  let dir: string;

  beforeEach(async () => {
    ({ db, dispose } = await createTestD1()); // 本番の migrations/ は適用済み
    dir = mkdtempSync(join(tmpdir(), "migrations-"));
  });

  afterEach(async () => {
    await dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  test("applies pending files in order and records them", async () => {
    writeFileSync(join(dir, "0002_second.sql"), "INSERT INTO notes VALUES ('second');");
    writeFileSync(join(dir, "0001_first.sql"), "CREATE TABLE notes (body TEXT);");

    expect(await applyMigrations(db, dir)).toEqual(["0001_first.sql", "0002_second.sql"]);
    const { results } = await db.prepare("SELECT body FROM notes").all();
    expect(results).toEqual([{ body: "second" }]);
  });

  test("skips migrations that are already recorded", async () => {
    writeFileSync(join(dir, "0001_first.sql"), "CREATE TABLE notes (body TEXT);");
    await applyMigrations(db, dir);

    expect(await applyMigrations(db, dir)).toEqual([]);
  });

  test("records the real migrations like wrangler / cf do", async () => {
    const { results } = await db
      .prepare("SELECT name FROM d1_migrations ORDER BY id")
      .all<{ name: string }>();

    expect(results.map((row) => row.name)).toEqual(["0001_create_todos.sql", "0002_create_owners.sql"]);
  });
});
