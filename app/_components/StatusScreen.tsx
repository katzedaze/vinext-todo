import type { ReactNode } from "react";

type Props = {
  code: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** エラー画面・404 画面で共通のレイアウト */
export function StatusScreen({ code, title, description, children }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-4 border bg-card p-6">
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">✖</span> exit {code}
        </p>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2">{children}</div>
      </div>
    </main>
  );
}
