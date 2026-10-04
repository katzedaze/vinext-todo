import Link from "next/link";
import { StatusScreen } from "@/app/_components/StatusScreen";

// Server Component から components/ui/button（radix-ui を読み込む）を import すると
// vinext の RSC ビルドが止まるため、ボタン風のリンクは Tailwind のクラスで直接作る
const LINK_CLASS =
  "inline-flex h-8 items-center bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/80";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="ページが見つかりません"
      description="URL が間違っているか、ページが移動した可能性があります。"
    >
      <Link href="/" className={LINK_CLASS}>
        タスク一覧へ戻る
      </Link>
    </StatusScreen>
  );
}
