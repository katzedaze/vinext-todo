import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/csp";

// ページのリクエストごとに nonce を発行し、CSP をレスポンスに付ける。
// リクエストヘッダーにも同じ CSP を入れると、vinext が nonce を読み取ってインラインスクリプトに付ける
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  // 静的ファイルとプリフェッチには不要
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
