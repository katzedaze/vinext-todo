"use client";

import { useEffect } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { StatusScreen } from "@/app/_components/StatusScreen";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      title="読み込みに失敗しました"
      description="データベースに接続できなかった可能性があります。少し待ってから再読み込みしてください。"
    >
      <Button onClick={reset}>
        <ArrowClockwiseIcon />
        再読み込み
      </Button>
    </StatusScreen>
  );
}
