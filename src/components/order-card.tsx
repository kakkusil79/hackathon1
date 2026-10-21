import Link from "next/link";
import { Store, Truck } from "lucide-react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { StatusSelect } from "@/components/status";
import { PICKUP_LABEL } from "@/lib/constants";
import { formatDateTime, formatWon, kstTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

export type OrderRowData = {
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

/**
 * 주문 한 줄. 휴대폰에서는 카드처럼 쌓이고, 넓은 화면에서는 한 줄 행으로 펼쳐진다.
 * timeOnly: 날짜별로 묶인 목록 안에서는 시간만 보여 준다.
 */
export function OrderRow({ order: o, timeOnly = false }: { order: OrderRowData; timeOnly?: boolean }) {
  const PickupIcon = o.pickupType === "PICKUP" ? Store : Truck;

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 rounded-2xl border bg-card p-3.5 transition hover:border-primary/30 hover:shadow-soft",
        "md:grid-cols-[88px_minmax(140px,180px)_1fr_auto_auto] md:items-center md:gap-4 md:rounded-xl md:px-4 md:py-3",
        o.status === "CANCELED" && "opacity-55",
      )}
    >
      <Link href={`/orders/${o.id}`} className="font-bold tabular-nums md:text-sm">
        {timeOnly ? kstTime(o.pickupAt) : formatDateTime(o.pickupAt)}
        <span className="absolute inset-0 md:hidden" aria-hidden />
      </Link>
      <div className="relative z-10 justify-self-end md:order-last">
        <StatusSelect orderId={o.id} status={o.status} />
      </div>

      {o.customerName ? (
        <Link
          href={`/customers/${o.customerId}`}
          className="relative z-10 col-span-2 flex min-w-0 items-center gap-2 md:col-span-1"
        >
          <CustomerAvatar name={o.customerName} seed={o.customerPhone} size="sm" className="size-7 text-[11px]" />
          <span className="truncate text-sm font-semibold hover:underline">{o.customerName}</span>
          {o.customerPhone && <span className="text-xs text-muted-foreground tabular-nums">{o.customerPhone.slice(-4)}</span>}
        </Link>
      ) : (
        <span className="hidden md:block" />
      )}

      <Link href={`/orders/${o.id}`} className="relative z-10 col-span-2 min-w-0 md:col-span-1">
        <p className="truncate text-sm text-foreground/80">{o.itemsSummary}</p>
        {o.memo && <p className="mt-0.5 truncate text-xs text-amber-700">📝 {o.memo}</p>}
      </Link>

      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-end">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <PickupIcon className="size-3.5" />
          {PICKUP_LABEL[o.pickupType]}
        </span>
        <span className="text-sm font-bold tabular-nums md:w-24 md:text-right">{formatWon(o.totalPrice)}</span>
      </div>
    </div>
  );
}
