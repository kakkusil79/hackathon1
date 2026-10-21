"use client";

import { useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/actions/orders";
import { ORDER_STATUSES, STATUS_CLASS, STATUS_DOT, STATUS_FLOW, STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function useStatusChange(orderId: string) {
  const [pending, startTransition] = useTransition();
  const change = (next: OrderStatus) =>
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, next);
      if (res.ok) toast.success(`'${STATUS_LABEL[next]}'(으)로 변경했어요`);
      else toast.error(res.error);
    });
  return { pending, change };
}

/** 배지 모양의 상태 변경 드롭다운 (네이티브 select라 휴대폰에서도 편함) */
export function StatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { pending, change } = useStatusChange(orderId);

  return (
    <span
      className={cn(
        "relative inline-flex h-7 items-center rounded-full ring-1 ring-inset transition-opacity",
        STATUS_CLASS[status],
        pending && "opacity-50",
      )}
    >
      <span className={cn("pointer-events-none absolute left-2.5 size-1.5 rounded-full", STATUS_DOT[status])} />
      <select
        aria-label="주문 상태"
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as OrderStatus)}
        className="h-full cursor-pointer appearance-none rounded-full bg-transparent pr-7 pl-6 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 opacity-70" />
    </span>
  );
}

/** 주문 상세의 진행 단계 표시 (단계를 눌러 바로 변경) */
export function StatusStepper({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { pending, change } = useStatusChange(orderId);
  const current = STATUS_FLOW.indexOf(status);
  const canceled = status === "CANCELED";

  return (
    <div className={cn("flex flex-col gap-3", pending && "pointer-events-none opacity-60")}>
      <ol className="grid grid-cols-4 gap-1">
        {STATUS_FLOW.map((s, i) => {
          const done = !canceled && i <= current;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => change(s)}
                className="group flex w-full flex-col items-center gap-2"
                aria-current={i === current ? "step" : undefined}
              >
                <span className="flex w-full items-center">
                  <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-border")} />
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground group-hover:border-primary/50",
                      i === current && !canceled && "ring-4 ring-primary/15",
                    )}
                  >
                    {done && i < current ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      i === STATUS_FLOW.length - 1 ? "bg-transparent" : !canceled && i < current ? "bg-primary" : "bg-border",
                    )}
                  />
                </span>
                <span className={cn("text-xs font-medium", done ? "text-foreground" : "text-muted-foreground")}>
                  {STATUS_LABEL[s]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex justify-end">
        {canceled ? (
          <button type="button" onClick={() => change("RECEIVED")} className="text-xs font-medium text-primary hover:underline">
            취소된 주문입니다 · 다시 접수하기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (confirm("이 주문을 취소할까요?")) change("CANCELED");
            }}
            className="text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            주문 취소
          </button>
        )}
      </div>
    </div>
  );
}
