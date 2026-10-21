import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { CustomerAvatar, TierBadge } from "@/components/customer-avatar";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/page-header";
import { customerTier } from "@/lib/customer";
import { formatDateKey, formatWon, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "recent", label: "최근 주문순" },
  { value: "count", label: "주문 많은순" },
  { value: "total", label: "금액 높은순" },
] as const;

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <>
      <PageHeader eyebrow="👥 고객" title="우리 가게 고객" description="단골과 신규 고객, 누적 주문을 한눈에 확인하세요." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomerList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = sp.sort === "total" || sp.sort === "count" ? sp.sort : "recent";

  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q.replace(/\D/g, "") || q } }] }
      : undefined,
    include: {
      orders: {
        where: { status: { not: "CANCELED" } },
        select: { totalPrice: true, pickupAt: true },
      },
    },
  });

  const rows = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      memo: c.memo,
      tier: customerTier(c.orders.length, c.createdAt),
      count: c.orders.length,
      total: c.orders.reduce((s, o) => s + o.totalPrice, 0),
      last: c.orders.reduce<Date | null>((max, o) => (!max || o.pickupAt > max ? o.pickupAt : max), null),
    }))
    .sort((a, b) => {
      if (sort === "total") return b.total - a.total;
      if (sort === "count") return b.count - a.count;
      return (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0);
    });

  const counts = {
    VIP: rows.filter((r) => r.tier === "VIP").length,
    단골: rows.filter((r) => r.tier === "단골").length,
    신규: rows.filter((r) => r.tier === "신규").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Form action="/customers" className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="이름 또는 전화번호 검색"
            aria-label="고객 검색"
            className="h-10 w-full rounded-xl border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <input type="hidden" name="sort" value={sort} />
        </Form>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={{ pathname: "/customers", query: { ...(q ? { q } : {}), sort: s.value } }}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium",
                sort === s.value ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        전체 <b className="text-foreground">{rows.length}</b>명 · 👑 VIP {counts.VIP} · 단골 {counts.단골} · 신규 {counts.신규}
      </p>

      {rows.length === 0 && <EmptyState emoji="🔍" title="찾는 고객이 없어요" description="이름이나 번호를 다시 확인해 주세요." />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <CustomerAvatar name={c.name} seed={c.phone} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{c.name}</span>
                  <TierBadge tier={c.tier} />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">{c.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-2.5 text-center">
              <Stat label="주문" value={`${c.count}건`} />
              <Stat label="누적" value={c.total >= 10000 ? `${Math.round(c.total / 10000)}만원` : formatWon(c.total)} />
              <Stat label="최근" value={c.last ? formatDateKey(kstDateKey(c.last)).replace(/\(.\)/, "") : "-"} />
            </div>
            {c.memo && <p className="truncate text-xs text-muted-foreground">📝 {c.memo}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
