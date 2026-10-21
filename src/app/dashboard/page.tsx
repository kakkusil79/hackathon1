import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, Banknote, ClipboardList, Receipt, UserPlus } from "lucide-react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DailyRevenueChart, ProductBarChart, WeekdayBarChart } from "@/components/dashboard-charts";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { categoryEmoji, ORDER_STATUSES, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { addDaysKey, formatDateKey, formatWon, fromKst, kstDateKey, weekdayOfKey, WEEKDAYS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="📊 대시보드" title="가게 운영 현황" description="최근 30일 매출·상품·고객 흐름과 앞으로 7일 생산 계획이에요." />
      <Suspense fallback={<LoadingBlock rows={4} />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

function sumBetween(orders: { pickupAt: Date; totalPrice: number }[], from: string, to: string) {
  return orders
    .filter((o) => {
      const k = kstDateKey(o.pickupAt);
      return k >= from && k <= to;
    })
    .reduce((s, o) => ({ revenue: s.revenue + o.totalPrice, count: s.count + 1 }), { revenue: 0, count: 0 });
}

async function Dashboard() {
  await connection();
  const today = kstDateKey(new Date());
  const from30 = addDaysKey(today, -29);
  const from60 = addDaysKey(today, -59);
  const to7 = addDaysKey(today, 7);

  const [orders, newCustomers, prevNewCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { pickupAt: { gte: fromKst(from60), lt: fromKst(to7) } },
      include: { customer: true, items: { include: { product: true } } },
    }),
    prisma.customer.count({ where: { createdAt: { gte: fromKst(from30) } } }),
    prisma.customer.count({ where: { createdAt: { gte: fromKst(from60), lt: fromKst(from30) } } }),
  ]);

  const valid = orders.filter((o) => o.status !== "CANCELED");
  const past = valid.filter((o) => {
    const k = kstDateKey(o.pickupAt);
    return k >= from30 && k <= today;
  });
  const upcoming = valid.filter((o) => kstDateKey(o.pickupAt) >= today);

  // KPI + 이전 기간 대비
  const todayOrders = valid.filter((o) => kstDateKey(o.pickupAt) === today);
  const todayLeft = todayOrders.filter((o) => o.status !== "COMPLETED").length;
  const weekStart = addDaysKey(today, -((weekdayOfKey(today) + 6) % 7)); // 월요일
  const elapsed = (weekdayOfKey(today) + 6) % 7;
  const thisWeek = sumBetween(valid, weekStart, today);
  const lastWeek = sumBetween(valid, addDaysKey(weekStart, -7), addDaysKey(weekStart, -7 + elapsed));
  const cur30 = sumBetween(valid, from30, today);
  const prev30 = sumBetween(valid, from60, addDaysKey(from30, -1));
  const avg = cur30.count ? Math.round(cur30.revenue / cur30.count) : 0;
  const prevAvg = prev30.count ? Math.round(prev30.revenue / prev30.count) : 0;

  // 일별 매출 (최근 30일)
  const daily = Array.from({ length: 30 }, (_, i) => {
    const key = addDaysKey(from30, i);
    const list = past.filter((o) => kstDateKey(o.pickupAt) === key);
    return { key, label: formatDateKey(key), revenue: list.reduce((s, o) => s + o.totalPrice, 0), orders: list.length };
  });

  // 상품별 판매 (최근 30일)
  const productMap = new Map<string, { name: string; unit: string; qty: number; revenue: number }>();
  for (const o of past)
    for (const i of o.items) {
      const prev = productMap.get(i.productId) ?? { name: i.product.name, unit: i.product.unit, qty: 0, revenue: 0 };
      productMap.set(i.productId, { ...prev, qty: prev.qty + i.quantity, revenue: prev.revenue + i.quantity * i.unitPrice });
    }
  const products = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);

  // 요일별 주문 건수 (최근 30일)
  const weekday = WEEKDAYS.map((label, idx) => ({
    label,
    orders: past.filter((o) => weekdayOfKey(kstDateKey(o.pickupAt)) === idx).length,
  }));
  const busiest = weekday.reduce((a, b) => (b.orders > a.orders ? b : a));

  // 상태별 건수 (오늘 이후)
  const futureAll = orders.filter((o) => kstDateKey(o.pickupAt) >= today);
  const statusCounts = ORDER_STATUSES.map((s) => ({ status: s, count: futureAll.filter((o) => o.status === s).length }));
  const statusTotal = Math.max(1, futureAll.length);

  // 단골 TOP 5 (최근 30일 금액)
  const customerMap = new Map<string, { id: string; name: string; phone: string; count: number; total: number }>();
  for (const o of past) {
    const prev = customerMap.get(o.customerId) ?? { id: o.customerId, name: o.customer.name, phone: o.customer.phone, count: 0, total: 0 };
    customerMap.set(o.customerId, { ...prev, count: prev.count + 1, total: prev.total + o.totalPrice });
  }
  const topCustomers = [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  // 앞으로 7일 생산 계획
  const planMap = new Map<string, { name: string; category: string | null; unit: string; qty: number; orders: number }>();
  for (const o of upcoming.filter((o) => o.status !== "COMPLETED"))
    for (const i of o.items) {
      const prev = planMap.get(i.productId) ?? { name: i.product.name, category: i.product.category, unit: i.product.unit, qty: 0, orders: 0 };
      planMap.set(i.productId, { ...prev, qty: prev.qty + i.quantity, orders: prev.orders + 1 });
    }
  const plan = [...planMap.values()].sort((a, b) => b.orders - a.orders || b.qty - a.qty);
  const maxPlanOrders = Math.max(1, ...plan.map((p) => p.orders));

  const kpis = [
    { label: "이번 주 매출", value: formatWon(thisWeek.revenue), icon: Banknote, cur: thisWeek.revenue, prev: lastWeek.revenue, note: "지난주 같은 기간 대비" },
    { label: "최근 30일 매출", value: formatWon(cur30.revenue), icon: Receipt, cur: cur30.revenue, prev: prev30.revenue, note: "이전 30일 대비" },
    { label: "평균 객단가", value: formatWon(avg), icon: ClipboardList, cur: avg, prev: prevAvg, note: `30일 ${cur30.count}건 기준` },
    { label: "신규 고객", value: `${newCustomers}명`, icon: UserPlus, cur: newCustomers, prev: prevNewCustomers, note: "최근 30일" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 오늘 요약 */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.56_0.14_42)] p-6 text-primary-foreground shadow-soft">
        <div className="pointer-events-none absolute -top-6 -right-4 text-[120px] leading-none opacity-15 select-none">🍡</div>
        <p className="text-sm opacity-80">{formatDateKey(today)} · 오늘의 가게</p>
        <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          오늘 나갈 주문 {todayOrders.length}건 중 <span className="underline decoration-white/40 underline-offset-4">{todayLeft}건</span> 남았어요
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/orders" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
            주문 현황 보기
          </Link>
          <Link href="/" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-white/90">
            + 새 주문
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const diff = k.prev ? Math.round(((k.cur - k.prev) / k.prev) * 100) : null;
          const Icon = k.icon;
          return (
            <div key={k.label} className="flex flex-col rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight tabular-nums md:text-2xl">{k.value}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                {diff !== null && (
                  <span className={cn("flex items-center font-semibold", diff >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {diff >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {Math.abs(diff)}%
                  </span>
                )}
                {diff === null && k.prev === 0 && k.note.includes("대비") ? "비교할 이전 기간 데이터 없음" : k.note}
              </p>
            </div>
          );
        })}
      </div>

      <Panel title="일별 매출" description="최근 30일 · 픽업일 기준 · 취소 제외">
        <DailyRevenueChart data={daily} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="상품별 매출" description="최근 30일 · 막대를 눌러 판매량 확인">
          <ProductBarChart data={products} />
        </Panel>
        <Panel
          title="요일별 주문"
          description={
            <>
              최근 30일 · 가장 바쁜 요일은 <b className="text-foreground">{busiest.label}요일</b> ({busiest.orders}건)
            </>
          }
        >
          <WeekdayBarChart data={weekday} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="7일 생산 계획" description={`오늘~${formatDateKey(addDaysKey(today, 6))} 미완료 주문 합계`}>
          {plan.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">예정된 주문이 없어요</p>}
          <div className="flex flex-col gap-3">
            {plan.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {categoryEmoji(p.category)} {p.name}
                  </span>
                  <span className="font-bold tabular-nums">
                    {p.qty}
                    {p.unit}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">· {p.orders}건</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(p.orders / maxPlanOrders) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="단골 TOP 5" description="최근 30일 주문 금액">
          <div className="flex flex-col gap-1">
            {topCustomers.map((c, idx) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
                <span className="w-4 text-center text-sm font-bold text-muted-foreground">{idx + 1}</span>
                <CustomerAvatar name={c.name} seed={c.phone} size="sm" />
                <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
                <span className="text-right">
                  <span className="block text-sm font-bold tabular-nums">{formatWon(c.total)}</span>
                  <span className="block text-[11px] text-muted-foreground">{c.count}건</span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="주문 상태" description="오늘 이후 픽업 예정 주문">
          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
            {statusCounts
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.status} className={cn("h-full border-r-2 border-card last:border-r-0", STATUS_DOT[s.status])} style={{ width: `${(s.count / statusTotal) * 100}%` }} />
              ))}
          </div>
          <div className="flex flex-col gap-1">
            {statusCounts.map((s) => (
              <Link key={s.status} href="/orders" className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted">
                <span className={cn("size-2 rounded-full", STATUS_DOT[s.status])} />
                <span className="flex-1 text-sm">{STATUS_LABEL[s.status]}</span>
                <span className="font-bold tabular-nums">{s.count}건</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-bold">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}
