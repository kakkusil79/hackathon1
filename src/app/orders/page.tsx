import { connection } from "next/server";
import { Suspense } from "react";
import { OrdersView, type OrderRow } from "@/components/orders-view";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { addDaysKey, fromKst, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="주문 현황" description="리스트·칸반·캘린더로 주문을 보고 상태를 바로 바꿀 수 있어요." />
      <Suspense fallback={<LoadingBlock />}>
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
