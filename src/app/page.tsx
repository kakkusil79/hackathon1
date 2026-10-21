import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderForm } from "@/components/order-form";
import { LoadingBlock } from "@/components/page-header";
import { StatusSelect } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PICKUP_LABEL } from "@/lib/constants";
import { addDaysKey, formatWon, fromKst, kstDateKey, kstTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* min-w-0: 가로 스크롤 영역이 그리드 칸을 화면 밖으로 밀어내지 않도록 */}
      <section className="min-w-0">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">새 주문 받기</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          전화번호를 먼저 입력하면 단골 고객의 지난 주문을 바로 불러옵니다.
        </p>
        <Suspense fallback={<LoadingBlock />}>
          <OrderFormLoader />
        </Suspense>
      </section>
      <aside>
        <Suspense fallback={<LoadingBlock />}>
          <TodayPickups />
        </Suspense>
      </aside>
    </div>
  );
}

async function OrderFormLoader() {
  await connection();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, unit: true, price: true },
  });
  return <OrderForm products={products} todayKey={kstDateKey(new Date())} />;
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

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>오늘 픽업·배송 {orders.length}건</CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
        {orders.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">오늘 예정된 주문이 없어요</p>
        )}
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                {kstTime(o.pickupAt)} · {o.customer.name}
              </Link>
              <StatusSelect orderId={o.id} status={o.status} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {o.items.map((i) => `${i.product.name} ${i.quantity}${i.product.unit}`).join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {PICKUP_LABEL[o.pickupType]} · {formatWon(o.totalPrice)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
