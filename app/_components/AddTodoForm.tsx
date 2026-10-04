"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { CircleNotchIcon, KeyReturnIcon } from "@phosphor-icons/react";
import { addTodoAction, type AddTodoState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

const initialState: AddTodoState = { error: null };
const noopSubscribe = () => () => {};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(addTodoAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // サーバーとハイドレーション中は false、ハイドレーション後は true。E2E はこれを待ってから操作する
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isPending && state.error === null) formRef.current?.reset();
  }, [isPending, state]);

  // "/" で入力欄にフォーカスする（エディタ・GitHub と同じ操作感）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      ref={formRef}
      action={formAction}
      data-hydrated={isHydrated ? "true" : undefined}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-primary"
          >
            $
          </span>
          <label htmlFor="title" className="sr-only">
            新しいタスク
          </label>
          <Input
            ref={inputRef}
            id="title"
            name="title"
            required
            maxLength={MAX_TITLE_LENGTH}
            placeholder="todo add <タスク名>"
            autoComplete="off"
            aria-invalid={state.error ? true : undefined}
            className="h-10 bg-card pr-3 pl-7 text-sm sm:pr-12"
          />
          <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
        </div>
        <Button type="submit" disabled={isPending} className="h-10 px-4">
          {isPending ? <CircleNotchIcon className="animate-spin" /> : <KeyReturnIcon />}
          追加
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          error: {state.error}
        </p>
      )}
    </form>
  );
}
