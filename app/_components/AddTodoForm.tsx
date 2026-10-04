"use client";

import { useActionState, useEffect, useRef } from "react";
import { addTodoAction, type AddTodoState } from "@/app/actions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

const initialState: AddTodoState = { error: null };

export function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(addTodoAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && state.error === null) formRef.current?.reset();
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label htmlFor="title" className="sr-only">
          新しいタスク
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={MAX_TITLE_LENGTH}
          placeholder="やることを入力…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {isPending ? "追加中…" : "追加"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
