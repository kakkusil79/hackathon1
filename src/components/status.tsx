"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/actions/orders";
import { ORDER_STATUSES, STATUS_CLASS, STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="주문 상태"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          const res = await updateOrderStatus(orderId, next);
          if (res.ok) toast.success(`'${STATUS_LABEL[next as OrderStatus]}'(으)로 변경했어요`);
          else toast.error(res.error);
        });
      }}
      className={cn(
        "h-7 cursor-pointer rounded-full border-0 px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        STATUS_CLASS[status],
      )}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
