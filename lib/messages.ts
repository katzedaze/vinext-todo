import { MAX_TODOS_PER_OWNER } from "./todo-repository";

export const SAVE_FAILED = "保存に失敗しました。時間をおいて再度お試しください";
export const RATE_LIMITED = "操作が多すぎます。1 分ほど待ってから再度お試しください";
export const LIMIT_REACHED = `タスクは ${MAX_TODOS_PER_OWNER} 件までです。完了済みを削除してから追加してください`;
export const INVALID_ID = "不正なタスク ID です";
