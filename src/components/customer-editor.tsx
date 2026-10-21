"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCustomer } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CustomerEditor({ id, name: initialName, memo: initialMemo }: { id: string; name: string; memo: string }) {
  const [name, setName] = useState(initialName);
  const [memo, setMemo] = useState(initialMemo);
  const [pending, startTransition] = useTransition();
  const dirty = name !== initialName || memo !== initialMemo;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customer-name" className="text-xs text-muted-foreground">
          이름
        </Label>
        <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customer-memo" className="text-xs text-muted-foreground">
          고객 메모
        </Label>
        <Textarea
          id="customer-memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="예: 팥 알레르기, 매달 첫째 주 제사떡"
          className="rounded-xl"
        />
      </div>
      <Button
        className="self-end rounded-xl"
        disabled={pending || !dirty}
        onClick={() =>
          startTransition(async () => {
            const res = await updateCustomer(id, { name, memo });
            if (res.ok) toast.success("고객 정보를 저장했어요");
            else toast.error(res.error);
          })
        }
      >
        저장
      </Button>
    </div>
  );
}
