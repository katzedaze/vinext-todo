/** リクエストごとの nonce を作る（base64 の 128 ビット乱数） */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Content-Security-Policy を組み立てる。
 * - script: nonce 付きのものだけ実行する。vinext はリクエストヘッダーの CSP から nonce を読み取り、
 *   自身が出力するインラインスクリプトにも付ける。'strict-dynamic' で、それらが読み込むチャンクも許可する
 * - style: Radix がツールチップの位置などを style 属性で指定するため 'unsafe-inline' が必要
 * - 開発時は Vite の HMR（WebSocket）と React の開発用ビルド（eval）を許可する
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
