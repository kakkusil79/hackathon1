import { connection } from "next/server";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { ProductManager } from "@/components/product-manager";
import { prisma } from "@/lib/prisma";

export default function ProductsPage() {
  return (
    <>
      <PageHeader title="상품" description="떡 상품과 가격을 관리합니다. 판매 중지한 상품은 주문 입력 화면에서 숨겨져요." />
      <Suspense fallback={<LoadingBlock />}>
        <ProductsLoader />
      </Suspense>
    </>
  );
}

async function ProductsLoader() {
  await connection();
  const [products, sold] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ isActive: "desc" }, { category: "asc" }, { name: "asc" }] }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: { not: "CANCELED" } } },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
  ]);
  const soldById = new Map(sold.map((s) => [s.productId, { qty: s._sum.quantity ?? 0, orders: s._count._all }]));

  return (
    <ProductManager
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category ?? "",
        unit: p.unit,
        price: p.price,
        isActive: p.isActive,
        soldQty: soldById.get(p.id)?.qty ?? 0,
        soldOrders: soldById.get(p.id)?.orders ?? 0,
      }))}
    />
  );
}
