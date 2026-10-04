"use server";

import { revalidatePath } from "next/cache";
import { clearCompleted, createTodo, deleteTodo, toggleTodo } from "@/lib/todos";
import { parseId, validateTitle } from "@/lib/validation";

export type AddTodoState = { error: string | null };

export async function addTodoAction(_prev: AddTodoState, formData: FormData): Promise<AddTodoState> {
  const result = validateTitle(formData.get("title"));
  if (!result.ok) return { error: result.error };
  try {
    await createTodo(result.title);
  } catch (error) {
    console.error("Failed to create todo", error);
    return { error: "追加に失敗しました。時間をおいて再度お試しください" };
  }
  revalidatePath("/");
  return { error: null };
}

export async function toggleTodoAction(formData: FormData): Promise<void> {
  const id = parseId(formData.get("id"));
  if (id === null) return;
  await toggleTodo(id);
  revalidatePath("/");
}

export async function deleteTodoAction(formData: FormData): Promise<void> {
  const id = parseId(formData.get("id"));
  if (id === null) return;
  await deleteTodo(id);
  revalidatePath("/");
}

export async function clearCompletedAction(): Promise<void> {
  await clearCompleted();
  revalidatePath("/");
}
