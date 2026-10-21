import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DailyRevenueChart, ProductBarChart, WeekdayBarChart } from "@/components/dashboard-charts";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUSES } from "@/lib/constants";
import { addDaysKey, formatDateKey, formatWon, fromKst, kstDateKey, weekdayOfKey, WEEKDAYS } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="대시보드" description="최근 30일 기준 매출·상품·고객 현황과 앞으로 7일 생산 계획입니다." />
      <Suspense fallback={<LoadingBlock />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  await connection();
  const today = kstDateKey(new Date());
  const from30 = addDaysKey(today, -29);
  const to7 = addDaysKey(today, 7);

  const [orders, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { pickupAt: { gte: fromKst(from30), lt: fromKst(to7) } },
      include: { customer: true, items: { include: { product: true } } },
    }),
    prisma.customer.count({ where: { createdAt: { gte: fromKst(from30) } } }),
  ]);

  const valid = orders.filter((o) => o.status !== "CANCELED");
  const past = valid.filter((o) => kstDateKey(o.pickupAt) <= today);
  const upcoming = valid.filter((o) => kstDateKey(o.pickupAt) >= today);

  // KPI
  const todayOrders = valid.filter((o) => kstDateKey(o.pickupAt) === today);
  const weekStart = addDaysKey(today, -((weekdayOfKey(today) + 6) % 7)); // 월요일
  const weekRevenue = valid
    .filter((o) => {
      const k = kstDateKey(o.pickupAt);
      return k >= weekStart && k <= today;
    })
    .reduce((s, o) => s + o.totalPrice, 0);
  const revenue30 = past.reduce((s, o) => s + o.totalPrice, 0);
  const inProgress = valid.filter((o) => o.status !== "COMPLETED").length;

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

  // 상태별 건수 (오늘 이후 + 오늘)
  const statusCounts = ORDER_STATUSES.map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s && kstDateKey(o.pickupAt) >= today).length,
  }));

  // 단골 TOP 5 (최근 30일 금액)
  const customerMap = new Map<string, { id: string; name: string; count: number; total: number }>();
  for (const o of past) {
    const prev = customerMap.get(o.customerId) ?? { id: o.customerId, name: o.customer.name, count: 0, total: 0 };
    customerMap.set(o.customerId, { ...prev, count: prev.count + 1, total: prev.total + o.totalPrice });
  }
  const topCustomers = [...customerMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  // 앞으로 7일 생산 계획
  const planMap = new Map<string, { name: string; unit: string; qty: number; orders: number }>();
  for (const o of upcoming.filter((o) => o.status !== "COMPLETED"))
    for (const i of o.items) {
      const prev = planMap.get(i.productId) ?? { name: i.product.name, unit: i.product.unit, qty: 0, orders: 0 };
      planMap.set(i.productId, { ...prev, qty: prev.qty + i.quantity, orders: prev.orders + 1 });
    }
  const plan = [...planMap.values()].sort((a, b) => b.qty - a.qty);

  const kpis = [
    { label: "오늘 픽업·배송", value: `${todayOrders.length}건`, sub: `${todayOrders.filter((o) => o.status !== "COMPLETED").length}건 남음` },
    { label: "이번 주 매출", value: formatWon(weekRevenue), sub: `${formatDateKey(weekStart)}부터` },
    { label: "최근 30일 매출", value: formatWon(revenue30), sub: `${past.length}건 · 평균 ${formatWon(past.length ? Math.round(revenue30 / past.length) : 0)}` },
    { label: "미완료 주문", value: `${inProgress}건`, sub: `신규 고객 ${newCustomers}명 (30일)` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>일별 매출</CardTitle>
          <CardDescription>최근 30일 · 픽업일 기준 · 취소 제외</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyRevenueChart data={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>상품별 매출</CardTitle>
            <CardDescription>최근 30일 · 판매 수량은 막대에 마우스를 올려 확인</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductBarChart data={products} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>요일별 주문 건수</CardTitle>
            <CardDescription>
              최근 30일 · 가장 바쁜 요일은 <b className="text-foreground">{busiest.label}요일</b> ({busiest.orders}건)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeekdayBarChart data={weekday} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>앞으로 7일 생산 계획</CardTitle>
            <CardDescription>오늘~{formatDateKey(addDaysKey(today, 6))} 미완료 주문 합계</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상품</TableHead>
                  <TableHead className="text-right">필요 수량</TableHead>
                  <TableHead className="text-right">주문</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      예정된 주문이 없어요
                    </TableCell>
                  </TableRow>
                )}
                {plan.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {p.qty}
                      {p.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{p.orders}건</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>단골 TOP 5</CardTitle>
            <CardDescription>최근 30일 주문 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {topCustomers.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell className="w-6 text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{c.count}건</TableCell>
                    <TableCell className="text-right tabular-nums">{formatWon(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>주문 상태</CardTitle>
            <CardDescription>오늘 이후 픽업 예정 주문</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {statusCounts.map((s) => (
              <Link
                key={s.status}
                href="/orders"
                className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted"
              >
                <StatusBadge status={s.status} />
                <span className="font-medium tabular-nums">{s.count}건</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
