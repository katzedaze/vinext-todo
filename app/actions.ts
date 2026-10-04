"use server";

import { revalidatePath } from "next/cache";
import { getDb, isMutationAllowed } from "@/lib/cloudflare";
import { INVALID_ID, LIMIT_REACHED, RATE_LIMITED, SAVE_FAILED } from "@/lib/messages";
import { ensureOwnerHash } from "@/lib/owner";
import {
  clearCompleted,
  createTodo,
  deleteTodo,
  purgeInactiveOwners,
  toggleTodo,
  touchOwner,
  updateTodoTitle,
} from "@/lib/todo-repository";
import { parseId, validateTitle } from "@/lib/validation";

export type ActionResult = { error: string | null };
export type AddTodoState = ActionResult;

type MutationContext = { db: D1Database; ownerHash: string };

/** 更新操作のうちこの割合で、使われなくなった訪問者のデータを掃除する（Cron を使わずに済ませるため） */
const PURGE_PROBABILITY = 0.01;

async function purgeOccasionally(db: D1Database): Promise<void> {
  if (Math.random() >= PURGE_PROBABILITY) return;
  try {
    await purgeInactiveOwners(db);
  } catch (error) {
    // 掃除の失敗は利用者の操作とは無関係なので、記録だけして操作は成功扱いにする
    console.error("Failed to purge inactive owners", error);
  }
}

/** 訪問者の特定・レート制限・エラー処理・再検証をまとめて行う。run が文字列を返したらそれをエラーにする */
async function mutate(
  label: string,
  run: (context: MutationContext) => Promise<string | void>,
): Promise<ActionResult> {
  const db = getDb();
  try {
    const ownerHash = await ensureOwnerHash();
    if (!(await isMutationAllowed(ownerHash))) return { error: RATE_LIMITED };
    await touchOwner(db, ownerHash);
    const error = await run({ db, ownerHash });
    if (error) return { error };
  } catch (error) {
    console.error(`Failed to ${label}`, error);
    return { error: SAVE_FAILED };
  }
  await purgeOccasionally(db);
  revalidatePath("/");
  return { error: null };
}

export async function addTodoAction(_prev: AddTodoState, formData: FormData): Promise<AddTodoState> {
  const result = validateTitle(formData.get("title"));
  if (!result.ok) return { error: result.error };
  return mutate("create todo", async ({ db, ownerHash }) => {
    const created = await createTodo(db, ownerHash, result.title);
    if (!created) return LIMIT_REACHED;
  });
}

export async function updateTodoTitleAction(formData: FormData): Promise<ActionResult> {
  const id = parseId(formData.get("id"));
  if (id === null) return { error: INVALID_ID };
  const result = validateTitle(formData.get("title"));
  if (!result.ok) return { error: result.error };
  return mutate("update todo title", ({ db, ownerHash }) => updateTodoTitle(db, ownerHash, id, result.title));
}

export async function toggleTodoAction(formData: FormData): Promise<ActionResult> {
  const id = parseId(formData.get("id"));
  if (id === null) return { error: INVALID_ID };
  return mutate("toggle todo", ({ db, ownerHash }) => toggleTodo(db, ownerHash, id));
}

export async function deleteTodoAction(formData: FormData): Promise<ActionResult> {
  const id = parseId(formData.get("id"));
  if (id === null) return { error: INVALID_ID };
  return mutate("delete todo", ({ db, ownerHash }) => deleteTodo(db, ownerHash, id));
}

export async function clearCompletedAction(): Promise<ActionResult> {
  return mutate("clear completed todos", ({ db, ownerHash }) => clearCompleted(db, ownerHash));
}
