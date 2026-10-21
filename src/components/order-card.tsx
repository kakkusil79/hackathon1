import Link from "next/link";
import { StatusSelect } from "@/components/status";
import { PICKUP_LABEL } from "@/lib/constants";
import { formatDateTime, formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

/** 휴대폰 화면에서 표 대신 쓰는 주문 카드 */
export function OrderCard({
  order: o,
}: {
  order: {
    id: string;
    pickupAt: string;
    status: OrderStatus;
    pickupType: PickupType;
    totalPrice: number;
    itemsSummary: string;
    memo?: string | null;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
  };
}) {
  return (
    <div className={cn("rounded-xl border bg-background p-3", o.status === "CANCELED" && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/orders/${o.id}`} className="font-medium tabular-nums">
          {formatDateTime(o.pickupAt)}
        </Link>
        <StatusSelect orderId={o.id} status={o.status} />
      </div>
      {o.customerName && (
        <Link href={`/customers/${o.customerId}`} className="mt-1 inline-block text-sm">
          {o.customerName}
          {o.customerPhone && (
            <span className="ml-1 text-xs text-muted-foreground">{o.customerPhone.slice(-4)}</span>
          )}
        </Link>
      )}
      <Link href={`/orders/${o.id}`} className="mt-1 block text-sm text-muted-foreground">
        {o.itemsSummary}
      </Link>
      {o.memo && <p className="mt-1 line-clamp-1 text-xs text-amber-700 dark:text-amber-300">📝 {o.memo}</p>}
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-xs text-muted-foreground">{PICKUP_LABEL[o.pickupType]}</span>
        <span className="font-medium tabular-nums">{formatWon(o.totalPrice)}</span>
      </div>
    </div>
  );
}
