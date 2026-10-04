import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestD1 } from "./test-utils/d1";
import {
  MAX_TODOS_PER_OWNER,
  clearCompleted,
  createTodo,
  deleteTodo,
  listTodos,
  purgeInactiveOwners,
  refreshOwner,
  toggleTodo,
  touchOwner,
  updateTodoTitle,
} from "./todo-repository";

const ALICE = "alice-hash";
const BOB = "bob-hash";

let db: D1Database;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, dispose } = await createTestD1());
});

afterEach(async () => {
  await dispose();
});

describe("listTodos", () => {
  test("returns open todos first, newest first within each group", async () => {
    await createTodo(db, ALICE, "first");
    await createTodo(db, ALICE, "second");
    await createTodo(db, ALICE, "third");
    const [third] = await listTodos(db, ALICE);
    await toggleTodo(db, ALICE, third.id);

    const titles = (await listTodos(db, ALICE)).map((todo) => todo.title);

    expect(titles).toEqual(["second", "first", "third"]);
  });

  test("maps rows to Todo objects", async () => {
    await createTodo(db, ALICE, "task");

    const [todo] = await listTodos(db, ALICE);

    expect(todo).toMatchObject({ title: "task", completed: false });
    expect(todo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("owner isolation", () => {
  test("never exposes or modifies another owner's todos", async () => {
    await createTodo(db, ALICE, "alice task");
    const [aliceTodo] = await listTodos(db, ALICE);

    await toggleTodo(db, BOB, aliceTodo.id);
    await updateTodoTitle(db, BOB, aliceTodo.id, "hijacked");
    await deleteTodo(db, BOB, aliceTodo.id);

    expect(await listTodos(db, BOB)).toEqual([]);
    expect(await listTodos(db, ALICE)).toEqual([aliceTodo]);
  });

  test("clearCompleted only removes the caller's completed todos", async () => {
    await createTodo(db, ALICE, "alice done");
    await createTodo(db, BOB, "bob done");
    const [aliceTodo] = await listTodos(db, ALICE);
    const [bobTodo] = await listTodos(db, BOB);
    await toggleTodo(db, ALICE, aliceTodo.id);
    await toggleTodo(db, BOB, bobTodo.id);

    await clearCompleted(db, ALICE);

    expect(await listTodos(db, ALICE)).toEqual([]);
    expect(await listTodos(db, BOB)).toHaveLength(1);
  });
});

describe("createTodo", () => {
  test("refuses to exceed the per-owner limit", async () => {
    const statements = Array.from({ length: MAX_TODOS_PER_OWNER }, (_, i) =>
      db.prepare("INSERT INTO todos (owner_hash, title) VALUES (?, ?)").bind(ALICE, `task ${i}`),
    );
    await db.batch(statements);

    expect(await createTodo(db, ALICE, "one too many")).toBe(false);
    expect(await createTodo(db, BOB, "other owner is unaffected")).toBe(true);
    expect(await listTodos(db, ALICE)).toHaveLength(MAX_TODOS_PER_OWNER);
  });
});

describe("updates", () => {
  test("toggleTodo flips completion both ways", async () => {
    await createTodo(db, ALICE, "task");
    const [todo] = await listTodos(db, ALICE);

    await toggleTodo(db, ALICE, todo.id);
    expect((await listTodos(db, ALICE))[0].completed).toBe(true);

    await toggleTodo(db, ALICE, todo.id);
    expect((await listTodos(db, ALICE))[0].completed).toBe(false);
  });

  test("updateTodoTitle renames the todo", async () => {
    await createTodo(db, ALICE, "old");
    const [todo] = await listTodos(db, ALICE);

    await updateTodoTitle(db, ALICE, todo.id, "new");

    expect((await listTodos(db, ALICE))[0].title).toBe("new");
  });

  test("deleteTodo removes the todo", async () => {
    await createTodo(db, ALICE, "task");
    const [todo] = await listTodos(db, ALICE);

    await deleteTodo(db, ALICE, todo.id);

    expect(await listTodos(db, ALICE)).toEqual([]);
  });
});

describe("inactive owner cleanup", () => {
  async function lastSeen(owner: string): Promise<string | null> {
    return db
      .prepare("SELECT last_seen FROM owners WHERE owner_hash = ?")
      .bind(owner)
      .first<string>("last_seen");
  }

  async function ageOwner(owner: string, days: number) {
    await db
      .prepare("UPDATE owners SET last_seen = datetime('now', ?) WHERE owner_hash = ?")
      .bind(`-${days} days`, owner)
      .run();
  }

  test("touchOwner registers and refreshes an owner", async () => {
    await touchOwner(db, ALICE);
    await ageOwner(ALICE, 10);
    const before = await lastSeen(ALICE);

    await touchOwner(db, ALICE);

    expect(await lastSeen(ALICE)).not.toBe(before);
  });

  test("refreshOwner extends existing owners but never registers new ones", async () => {
    await touchOwner(db, ALICE);
    await ageOwner(ALICE, 10);
    const before = await lastSeen(ALICE);

    await refreshOwner(db, ALICE);
    await refreshOwner(db, "forged-owner");

    expect(await lastSeen(ALICE)).not.toBe(before);
    expect(await lastSeen("forged-owner")).toBeNull();
  });

  test("purgeInactiveOwners removes only owners past the retention period", async () => {
    await touchOwner(db, ALICE);
    await createTodo(db, ALICE, "stale task");
    await touchOwner(db, BOB);
    await createTodo(db, BOB, "active task");
    await ageOwner(ALICE, 91);
    await ageOwner(BOB, 89);

    await purgeInactiveOwners(db, 90);

    expect(await listTodos(db, ALICE)).toEqual([]);
    expect(await lastSeen(ALICE)).toBeNull();
    expect(await listTodos(db, BOB)).toHaveLength(1);
    expect(await lastSeen(BOB)).not.toBeNull();
  });
});
