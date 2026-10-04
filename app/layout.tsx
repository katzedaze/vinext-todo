import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// フォントはリポジトリに同梱する（app/fonts/、OFL-1.1）。next/font/google はビルド時の取得に失敗すると
// 黙って Google Fonts の CDN 読み込みに切り替わり、CSP に止められるため使わない
const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Latin.woff2",
  weight: "100 800",
  display: "swap",
  // 既定の sans-serif ではなく等幅を優先する。日本語など同梱外の文字は BIZ UDGothic などで表示する
  fallback: ["ui-monospace", "Cascadia Code", "BIZ UDGothic", "monospace"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Todo | vinext",
  description: "vinext + Cloudflare D1 Todo app",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#12151c" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // proxy.ts が発行した CSP の nonce。インラインのテーマスクリプトにも付けないと実行されない
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // dark クラスは THEME_INIT_SCRIPT が描画前に付けるので、サーバーの HTML とは一致しない
    <html lang="ja" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
