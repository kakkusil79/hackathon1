import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, MapPin, Phone, Plus, Store, Truck } from "lucide-react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { MemoEditor } from "@/components/memo-editor";
import { LoadingBlock } from "@/components/page-header";
import { StatusStepper } from "@/components/status";
import { categoryEmoji, PICKUP_LABEL } from "@/lib/constants";
import { formatDateTime, formatWon } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!order) notFound();
  const PickupIcon = order.pickupType === "PICKUP" ? Store : Truck;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/orders" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 주문 현황
      </Link>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              주문번호 #{order.id.slice(-6).toUpperCase()} · 접수 {formatDateTime(order.createdAt)}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{order.customer.name}님 주문</h1>
          </div>
          <p className="text-right text-2xl font-bold tracking-tight tabular-nums">{formatWon(order.totalPrice)}</p>
        </div>
        <StatusStepper orderId={order.id} status={order.status} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <PickupIcon className="size-4" /> {PICKUP_LABEL[order.pickupType]}
          </p>
          <p className="text-xl font-bold tabular-nums">{formatDateTime(order.pickupAt)}</p>
          {order.address && (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" /> {order.address}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft">
          <Link href={`/customers/${order.customerId}`} className="flex items-center gap-3">
            <CustomerAvatar name={order.customer.name} seed={order.customer.phone} />
            <div className="min-w-0">
              <p className="font-bold hover:underline">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground tabular-nums">{order.customer.phone}</p>
            </div>
          </Link>
          {order.customer.memo && <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">📝 {order.customer.memo}</p>}
          <div className="mt-auto grid grid-cols-2 gap-2">
            <a
              href={`tel:${order.customer.phone}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold hover:bg-muted"
            >
              <Phone className="size-4" /> 전화
            </a>
            <Link
              href={`/?phone=${order.customer.phone.replace(/\D/g, "")}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-accent"
            >
              <Plus className="size-4" /> 새 주문
            </Link>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <p className="border-b border-dashed px-5 py-4 font-bold">주문 상품</p>
        <ul className="flex flex-col divide-y px-5">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-xl">{categoryEmoji(i.product.category)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.product.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatWon(i.unitPrice)} × {i.quantity}
                  {i.product.unit}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatWon(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-dashed bg-muted/40 px-5 py-4">
          <span className="text-sm text-muted-foreground">합계</span>
          <span className="text-xl font-bold tabular-nums">{formatWon(order.totalPrice)}</span>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <p className="mb-3 font-bold">메모</p>
        <MemoEditor orderId={order.id} initial={order.memo ?? ""} />
      </section>
    </div>
  );
}
