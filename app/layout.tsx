import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
