import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo | vinext",
  description: "vinext + Cloudflare D1 Todo app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
