import { beforeEach, describe, expect, test, vi } from "vitest";
import { INVALID_ID, LIMIT_REACHED, RATE_LIMITED, SAVE_FAILED } from "@/lib/messages";

const repository = vi.hoisted(() => ({
  createTodo: vi.fn(),
  updateTodoTitle: vi.fn(),
  toggleTodo: vi.fn(),
  deleteTodo: vi.fn(),
  clearCompleted: vi.fn(),
  touchOwner: vi.fn(),
  purgeInactiveOwners: vi.fn(),
}));
const isMutationAllowed = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const fakeDb = vi.hoisted(() => ({}) as D1Database);

vi.mock("@/lib/todo-repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...repository,
}));
vi.mock("@/lib/cloudflare", () => ({ getDb: () => fakeDb, isMutationAllowed }));
vi.mock("@/lib/owner", () => ({ ensureOwnerHash: async () => "owner-hash" }));
vi.mock("next/cache", () => ({ revalidatePath }));

const actions = await import("@/app/actions");

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const initial = { error: null };

beforeEach(() => {
  vi.clearAllMocks();
  isMutationAllowed.mockResolvedValue(true);
  repository.createTodo.mockResolvedValue(true);
  vi.spyOn(Math, "random").mockReturnValue(0.5); // 既定では掃除を走らせない
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addTodoAction", () => {
  test("creates a trimmed todo for the current owner and revalidates", async () => {
    const result = await actions.addTodoAction(initial, form({ title: "  write tests  " }));

    expect(result).toEqual({ error: null });
    expect(repository.createTodo).toHaveBeenCalledWith(fakeDb, "owner-hash", "write tests");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  test("rejects an empty title without touching the database", async () => {
    const result = await actions.addTodoAction(initial, form({ title: "   " }));

    expect(result.error).not.toBeNull();
    expect(repository.createTodo).not.toHaveBeenCalled();
  });

  test("reports the per-owner limit", async () => {
    repository.createTodo.mockResolvedValue(false);

    const result = await actions.addTodoAction(initial, form({ title: "task" }));

    expect(result).toEqual({ error: LIMIT_REACHED });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("stops when rate limited", async () => {
    isMutationAllowed.mockResolvedValue(false);

    const result = await actions.addTodoAction(initial, form({ title: "task" }));

    expect(result).toEqual({ error: RATE_LIMITED });
    expect(repository.createTodo).not.toHaveBeenCalled();
  });

  test("returns a friendly error when the database fails", async () => {
    repository.createTodo.mockRejectedValue(new Error("D1 unavailable"));

    const result = await actions.addTodoAction(initial, form({ title: "task" }));

    expect(result).toEqual({ error: SAVE_FAILED });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("id-based actions", () => {
  test.each([
    ["toggleTodoAction", actions.toggleTodoAction, repository.toggleTodo],
    ["deleteTodoAction", actions.deleteTodoAction, repository.deleteTodo],
  ] as const)("%s passes the parsed id", async (_name, action, repoFn) => {
    const result = await action(form({ id: "42" }));

    expect(result).toEqual({ error: null });
    expect(repoFn).toHaveBeenCalledWith(fakeDb, "owner-hash", 42);
  });

  test.each([
    ["toggleTodoAction", actions.toggleTodoAction],
    ["deleteTodoAction", actions.deleteTodoAction],
  ] as const)("%s rejects an invalid id", async (_name, action) => {
    expect(await action(form({ id: "abc" }))).toEqual({ error: INVALID_ID });
  });
});

describe("updateTodoTitleAction", () => {
  test("renames the todo", async () => {
    const result = await actions.updateTodoTitleAction(form({ id: "7", title: " renamed " }));

    expect(result).toEqual({ error: null });
    expect(repository.updateTodoTitle).toHaveBeenCalledWith(fakeDb, "owner-hash", 7, "renamed");
  });

  test("rejects an invalid id or title", async () => {
    expect(await actions.updateTodoTitleAction(form({ id: "0", title: "x" }))).toEqual({ error: INVALID_ID });
    expect((await actions.updateTodoTitleAction(form({ id: "7", title: "" }))).error).not.toBeNull();
    expect(repository.updateTodoTitle).not.toHaveBeenCalled();
  });
});

describe("clearCompletedAction", () => {
  test("clears the current owner's completed todos", async () => {
    expect(await actions.clearCompletedAction()).toEqual({ error: null });
    expect(repository.clearCompleted).toHaveBeenCalledWith(fakeDb, "owner-hash");
  });
});

describe("owner activity and cleanup", () => {
  test("records owner activity before each mutation", async () => {
    await actions.toggleTodoAction(form({ id: "1" }));

    expect(repository.touchOwner).toHaveBeenCalledWith(fakeDb, "owner-hash");
    expect(repository.purgeInactiveOwners).not.toHaveBeenCalled();
  });

  test("occasionally purges inactive owners", async () => {
    vi.mocked(Math.random).mockReturnValue(0);

    await actions.toggleTodoAction(form({ id: "1" }));

    expect(repository.purgeInactiveOwners).toHaveBeenCalledWith(fakeDb);
  });

  test("a failed purge does not fail the user's action", async () => {
    vi.mocked(Math.random).mockReturnValue(0);
    repository.purgeInactiveOwners.mockRejectedValue(new Error("busy"));

    const result = await actions.toggleTodoAction(form({ id: "1" }));

    expect(result).toEqual({ error: null });
    expect(console.error).toHaveBeenCalledWith("Failed to purge inactive owners", expect.any(Error));
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
