"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Todo } from "@/lib/todo-repository";
import { formatTokyo, toIsoUtc } from "@/lib/time";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

type Props = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
};

function formatId(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

function IconAction({
  label,
  tooltip,
  onClick,
  className,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          aria-label={label}
          className={`text-muted-foreground sm:opacity-60 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${className ?? ""}`}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function TodoRow({ todo, onToggle, onDelete, onRename }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  // Enter / Esc で編集を終えた直後に入力欄が消えて blur が起きても、二重保存や取り消し後の保存をしない
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const startEditing = () => {
    isFinishedRef.current = false;
    setDraft(todo.title);
    setIsEditing(true);
  };

  const finish = (shouldSave: boolean) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setIsEditing(false);
    const title = draft.trim();
    if (shouldSave && title && title !== todo.title) onRename(todo, title);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) finish(true);
    if (event.key === "Escape") finish(false);
  };

  const titleClass = todo.completed
    ? "text-muted-foreground line-through decoration-muted-foreground/60"
    : "";

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 sm:items-center">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo)}
        aria-label={todo.completed ? `「${todo.title}」を未完了に戻す` : `「${todo.title}」を完了にする`}
        className="mt-0.5 sm:mt-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="hidden w-12 shrink-0 text-xs text-muted-foreground tabular-nums sm:block">
          {formatId(todo.id)}
        </span>
        {isEditing ? (
          <Input
            ref={inputRef}
            value={draft}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => finish(true)}
            aria-label="タスク名を編集"
            className="h-7 flex-1 text-sm"
          />
        ) : (
          <span
            onDoubleClick={startEditing}
            title="ダブルクリックで編集"
            className={`min-w-0 flex-1 text-sm wrap-break-word ${titleClass}`}
          >
            {todo.title}
          </span>
        )}
        <span className="flex items-center gap-2 text-xs text-muted-foreground sm:contents">
          <span className="tabular-nums sm:hidden">{formatId(todo.id)}</span>
          <time dateTime={toIsoUtc(todo.createdAt)} className="shrink-0 tabular-nums">
            {formatTokyo(todo.createdAt)}
          </time>
          <Badge
            variant="outline"
            className={todo.completed ? "border-success/40 text-success" : "text-muted-foreground"}
          >
            {todo.completed ? "DONE" : "OPEN"}
          </Badge>
        </span>
      </div>

      <div className="flex shrink-0 items-center">
        <IconAction label={`「${todo.title}」を編集`} tooltip="編集" onClick={startEditing}>
          <PencilSimpleIcon />
        </IconAction>
        <IconAction
          label={`「${todo.title}」を削除`}
          tooltip="削除"
          onClick={() => onDelete(todo)}
          className="hover:text-destructive"
        >
          <TrashIcon />
        </IconAction>
      </div>
    </li>
  );
}
