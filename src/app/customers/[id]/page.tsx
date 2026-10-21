import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, Phone, Plus } from "lucide-react";
import { CustomerAvatar, TierBadge } from "@/components/customer-avatar";
import { CustomerEditor } from "@/components/customer-editor";
import { OrderRow } from "@/components/order-card";
import { EmptyState, LoadingBlock } from "@/components/page-header";
import { categoryEmoji } from "@/lib/constants";
import { customerTier } from "@/lib/customer";
import { formatDateKey, formatWon, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { pickupAt: "desc" },
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!customer) notFound();

  const valid = customer.orders.filter((o) => o.status !== "CANCELED");
  const total = valid.reduce((s, o) => s + o.totalPrice, 0);
  const tier = customerTier(valid.length, customer.createdAt);
  const favorites = [
    ...valid
      .flatMap((o) => o.items)
      .reduce((map, i) => {
        const prev = map.get(i.productId) ?? { name: i.product.name, category: i.product.category, unit: i.product.unit, qty: 0, times: 0 };
        map.set(i.productId, { ...prev, qty: prev.qty + i.quantity, times: prev.times + 1 });
        return map;
      }, new Map<string, { name: string; category: string | null; unit: string; qty: number; times: number }>())
      .values(),
  ].sort((a, b) => b.times - a.times || b.qty - a.qty);
  const maxTimes = favorites[0]?.times ?? 1;

  const stats = [
    { label: "누적 주문", value: `${valid.length}건` },
    { label: "누적 금액", value: formatWon(total) },
    { label: "평균 객단가", value: valid.length ? formatWon(Math.round(total / valid.length)) : "-" },
    { label: "고객 등록", value: formatDateKey(kstDateKey(customer.createdAt)) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/customers" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> 고객 목록
      </Link>

      {/* 프로필 */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="h-16 bg-gradient-to-r from-accent via-secondary to-muted" />
        <div className="-mt-8 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <CustomerAvatar name={customer.name} seed={customer.phone} size="lg" className="ring-4 ring-card" />
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                <TierBadge tier={tier} />
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">{customer.phone}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-64">
            <a href={`tel:${customer.phone}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold hover:bg-muted">
              <Phone className="size-4" /> 전화
            </a>
            <Link
              href={`/?phone=${customer.phone.replace(/\D/g, "")}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              <Plus className="size-4" /> 새 주문
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`px-5 py-3 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="px-1 font-bold">주문 이력 <span className="font-normal text-muted-foreground">{customer.orders.length}건</span></h2>
          {customer.orders.length === 0 && <EmptyState title="아직 주문이 없어요" />}
          {customer.orders.map((o) => (
            <OrderRow
              key={o.id}
              order={{
                id: o.id,
                pickupAt: o.pickupAt.toISOString(),
                status: o.status,
                pickupType: o.pickupType,
                totalPrice: o.totalPrice,
                memo: o.memo,
                itemsSummary: o.items.map((i) => `${i.product.name} ${i.quantity}${i.product.unit}`).join(", "),
              }}
            />
          ))}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-3 font-bold">자주 찾는 떡</h2>
            {favorites.length === 0 && <p className="text-sm text-muted-foreground">아직 없어요</p>}
            <div className="flex flex-col gap-3">
              {favorites.slice(0, 5).map((f) => (
                <div key={f.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {categoryEmoji(f.category)} {f.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {f.times}회 · {f.qty}
                      {f.unit}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(f.times / maxTimes) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-3 font-bold">고객 정보</h2>
            <CustomerEditor id={customer.id} name={customer.name} memo={customer.memo ?? ""} />
          </section>
        </div>
      </div>
    </div>
  );
}
