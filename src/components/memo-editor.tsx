"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateOrderMemo } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MemoEditor({ orderId, initial }: { orderId: string; initial: string }) {
  const [memo, setMemo] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="요청사항, 포장, 결제 여부 등" />
      <Button
        className="self-end"
        disabled={pending || memo === initial}
        onClick={() =>
          startTransition(async () => {
            const res = await updateOrderMemo(orderId, memo);
            if (res.ok) toast.success("메모를 저장했어요");
            else toast.error(res.error);
          })
        }
      >
        메모 저장
      </Button>
    </div>
  );
}
