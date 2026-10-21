import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { lookupCustomer } from "@/app/actions/orders";
import { OrderForm } from "@/components/order-form";
import { Skeleton } from "@/components/page-header";
import { StatusSelect } from "@/components/status";
import { PICKUP_LABEL } from "@/lib/constants";
import { addDaysKey, formatDateKey, formatWon, fromKst, kstDateKey, kstTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold tracking-wide text-primary">📞 전화 주문</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">새 주문 받기</h1>
        <p className="mt-1 text-sm text-muted-foreground">번호 → 상품 → 픽업 시간, 세 단계면 끝나요.</p>
      </div>
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-72" />
            </div>
            <Skeleton className="hidden h-80 lg:block" />
          </div>
        }
      >
        <OrderFormLoader searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrderFormLoader({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  // 고객 상세의 "이 고객으로 주문" 버튼에서 넘어온 경우 고객을 미리 불러온다
  const phone = typeof sp.phone === "string" ? sp.phone : "";
  const [products, initial] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, unit: true, price: true },
    }),
    phone ? lookupCustomer(phone) : null,
  ]);

  return (
    <OrderForm
      key={phone}
      products={products}
      todayKey={kstDateKey(new Date())}
      initialPhone={initial?.ok && initial.data ? initial.data.phone : ""}
      initialCustomer={initial?.ok ? initial.data : null}
    >
      <Suspense fallback={<Skeleton className="h-48" />}>
        <TodayPickups />
      </Suspense>
    </OrderForm>
  );
}

async function TodayPickups() {
  await connection();
  const today = kstDateKey(new Date());
  const orders = await prisma.order.findMany({
    where: {
      pickupAt: { gte: fromKst(today), lt: fromKst(addDaysKey(today, 1)) },
      status: { not: "CANCELED" },
    },
    orderBy: { pickupAt: "asc" },
    include: { customer: true, items: { include: { product: true } } },
  });
  const left = orders.filter((o) => o.status !== "COMPLETED").length;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-bold">오늘 나갈 주문</h2>
        <span className="text-xs text-muted-foreground">
          {formatDateKey(today)} · {orders.length}건 중 {left}건 남음
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {orders.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">오늘 예정된 주문이 없어요 ☕</p>}
        {orders.map((o) => (
          <div key={o.id} className="flex gap-3 rounded-xl bg-muted/60 p-3">
            <span className="w-11 shrink-0 pt-0.5 text-sm font-bold tabular-nums">{kstTime(o.pickupAt)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="truncate text-sm font-semibold hover:underline">
                  {o.customer.name}
                </Link>
                <StatusSelect orderId={o.id} status={o.status} />
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {o.items.map((i) => `${i.product.name} ${i.quantity}${i.product.unit}`).join(", ")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {PICKUP_LABEL[o.pickupType]} · {formatWon(o.totalPrice)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
