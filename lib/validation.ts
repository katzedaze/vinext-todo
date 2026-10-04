export const MAX_TITLE_LENGTH = 200;

export type TitleResult = { ok: true; title: string } | { ok: false; error: string };

export function validateTitle(input: unknown): TitleResult {
  if (typeof input !== "string") return { ok: false, error: "タイトルを入力してください" };
  const title = input.trim();
  if (title.length === 0) return { ok: false, error: "タイトルを入力してください" };
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください` };
  }
  return { ok: true, title };
}

export function parseId(input: unknown): number | null {
  if (typeof input !== "string" || !/^\d+$/.test(input)) return null;
  const id = Number(input);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
