// Cloudflare のバインディングへの入口。テストではこのモジュールをモックする
import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export function getDb(): D1Database {
  return env.DB;
}

/** 更新系リクエストを IP ごとに制限する。IP が取れないとき（ローカルなど）は訪問者 ID で代用する */
export async function isMutationAllowed(fallbackKey: string): Promise<boolean> {
  const ip = (await headers()).get("cf-connecting-ip");
  const { success } = await env.MUTATION_LIMITER.limit({ key: ip ?? fallbackKey });
  return success;
}
