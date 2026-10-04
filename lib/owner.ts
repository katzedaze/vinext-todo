// 訪問者ごとにリストを分けるための匿名 ID。ランダムな UUID を httpOnly Cookie に入れ、
// D1 には SHA-256 ハッシュだけを保存する（DB が漏れても Cookie を偽造できない）
import { cookies } from "next/headers";

export const OWNER_COOKIE = "todo_owner";
const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ブラウザが許す上限（400 日）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function hashOwnerId(ownerId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ownerId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidOwnerId(value: string | undefined): value is string {
  return value !== undefined && UUID_PATTERN.test(value);
}

/** 既存の訪問者 ID のハッシュを返す。Cookie がなければ null（Server Component から呼ぶ） */
export async function readOwnerHash(): Promise<string | null> {
  const ownerId = (await cookies()).get(OWNER_COOKIE)?.value;
  return isValidOwnerId(ownerId) ? hashOwnerId(ownerId) : null;
}

/** 訪問者 ID のハッシュを返す。Cookie がなければ発行する（Cookie を書けるのは Server Action のみ） */
export async function ensureOwnerHash(): Promise<string> {
  const cookieStore = await cookies();
  const current = cookieStore.get(OWNER_COOKIE)?.value;
  if (isValidOwnerId(current)) return hashOwnerId(current);

  const ownerId = crypto.randomUUID();
  cookieStore.set(OWNER_COOKIE, ownerId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return hashOwnerId(ownerId);
}
