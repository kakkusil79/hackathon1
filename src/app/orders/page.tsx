import { connection } from "next/server";
import { Suspense } from "react";
import { OrdersView, type OrderRow } from "@/components/orders-view";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { addDaysKey, fromKst, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function OrdersPage() {
  return (
    <>
      <PageHeader eyebrow="📋 주문 현황" title="주문 한눈에 보기" description="날짜별 목록, 진행 단계별 칸반, 월간 캘린더로 확인하고 상태를 바로 바꿔요." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <OrdersLoader />
      </Suspense>
    </>
  );
}

async function OrdersLoader() {
  await connection();
  const todayKey = kstDateKey(new Date());
  const orders = await prisma.order.findMany({
    where: {
      pickupAt: { gte: fromKst(addDaysKey(todayKey, -90)), lt: fromKst(addDaysKey(todayKey, 180)) },
    },
    orderBy: { pickupAt: "asc" },
    include: { customer: true, items: { include: { product: true } } },
  });

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    pickupAt: o.pickupAt.toISOString(),
    status: o.status,
    pickupType: o.pickupType,
    totalPrice: o.totalPrice,
    memo: o.memo,
    customerId: o.customerId,
    customerName: o.customer.name,
    customerPhone: o.customer.phone,
    itemsSummary: o.items.map((i) => `${i.product.name} ${i.quantity}${i.product.unit}`).join(", "),
  }));

  return <OrdersView orders={rows} todayKey={todayKey} />;
}
