"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/actions/orders";
import { StatusBadge, StatusSelect } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NEXT_STATUS, ORDER_STATUSES, PICKUP_LABEL, STATUS_LABEL } from "@/lib/constants";
import { addDaysKey, formatDateKey, formatDateTime, formatWon, kstDateKey, kstTime, WEEKDAYS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

export type OrderRow = {
  id: string;
  pickupAt: string;
  status: OrderStatus;
  pickupType: PickupType;
  totalPrice: number;
  memo: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
};

export function OrdersView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">리스트</TabsTrigger>
        <TabsTrigger value="kanban">칸반</TabsTrigger>
        <TabsTrigger value="calendar">캘린더</TabsTrigger>
      </TabsList>
      <TabsContent value="list" className="mt-2">
        <ListView orders={orders} todayKey={todayKey} />
      </TabsContent>
      <TabsContent value="kanban" className="mt-2">
        <KanbanView orders={orders} todayKey={todayKey} />
      </TabsContent>
      <TabsContent value="calendar" className="mt-2">
        <CalendarView orders={orders} todayKey={todayKey} />
      </TabsContent>
    </Tabs>
  );
}

/* ───────────── 리스트 ───────────── */

const PERIODS = [
  { value: "today", label: "오늘" },
  { value: "week", label: "앞으로 7일" },
  { value: "upcoming", label: "오늘 이후 전체" },
  { value: "past", label: "지난 주문" },
  { value: "all", label: "전체" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

function ListView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = orders.filter((o) => {
      const key = kstDateKey(o.pickupAt);
      if (period === "today" && key !== todayKey) return false;
      if (period === "week" && (key < todayKey || key > addDaysKey(todayKey, 6))) return false;
      if (period === "upcoming" && key < todayKey) return false;
      if (period === "past" && key >= todayKey) return false;
      if (status !== "ALL" && o.status !== status) return false;
      if (q && !`${o.customerName} ${o.customerPhone} ${o.itemsSummary} ${o.memo ?? ""}`.includes(q)) return false;
      return true;
    });
    return period === "past" ? list.reverse() : list;
  }, [orders, period, status, query, todayKey]);

  const total = filtered.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.totalPrice, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button key={p.value} size="sm" variant={period === p.value ? "default" : "outline"} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Button>
        ))}
        <select
          aria-label="상태 필터"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "ALL")}
          className="h-7 rounded-md border bg-background px-2 text-sm"
        >
          <option value="ALL">모든 상태</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <Input
          placeholder="고객명·전화번호·상품 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 w-56"
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length}건 · {formatWon(total)}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>픽업 일시</TableHead>
              <TableHead>고객</TableHead>
              <TableHead>상품</TableHead>
              <TableHead>방식</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  조건에 맞는 주문이 없어요
                </TableCell>
              </TableRow>
            )}
            {filtered.map((o) => (
              <TableRow key={o.id} className={cn(o.status === "CANCELED" && "opacity-50")}>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/orders/${o.id}`} className="hover:underline">
                    {formatDateTime(o.pickupAt)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/customers/${o.customerId}`} className="hover:underline">
                    {o.customerName}
                  </Link>
                  <span className="ml-1 text-xs text-muted-foreground">{o.customerPhone.slice(-4)}</span>
                </TableCell>
                <TableCell className="max-w-xs truncate">{o.itemsSummary}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{PICKUP_LABEL[o.pickupType]}</TableCell>
                <TableCell className="text-right tabular-nums">{formatWon(o.totalPrice)}</TableCell>
                <TableCell>
                  <StatusSelect orderId={o.id} status={o.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ───────────── 칸반 ───────────── */

const KANBAN_COLUMNS: OrderStatus[] = ["RECEIVED", "IN_PROGRESS", "READY", "COMPLETED"];

function KanbanView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  // 진행 중인 주문은 날짜와 상관없이, 완료 주문은 오늘 것만 보여 준다
  const visible = orders.filter((o) =>
    o.status === "COMPLETED" ? kstDateKey(o.pickupAt) === todayKey : o.status !== "CANCELED",
  );

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const list = visible.filter((o) => o.status === col);
        return (
          <div key={col} className="flex flex-col gap-2 rounded-xl bg-muted p-2">
            <div className="flex items-center justify-between px-1 py-1">
              <StatusBadge status={col} />
              <span className="text-xs text-muted-foreground">
                {list.length}건{col === "COMPLETED" && " (오늘)"}
              </span>
            </div>
            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
              {list.map((o) => (
                <KanbanCard key={o.id} order={o} todayKey={todayKey} />
              ))}
              {list.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">비어 있음</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ order: o, todayKey }: { order: OrderRow; todayKey: string }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[o.status];
  const key = kstDateKey(o.pickupAt);
  const overdue = key < todayKey && o.status !== "COMPLETED";

  return (
    <div className="rounded-lg border bg-background p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("font-medium", key === todayKey && "text-primary", overdue && "text-destructive")}>
          {key === todayKey ? "오늘" : formatDateKey(key)} {kstTime(o.pickupAt)}
          {overdue && " · 지남"}
        </span>
        <span className="text-muted-foreground">{PICKUP_LABEL[o.pickupType]}</span>
      </div>
      <Link href={`/orders/${o.id}`} className="mt-1 block font-medium hover:underline">
        {o.customerName}
      </Link>
      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{o.itemsSummary}</p>
      {o.memo && <p className="mt-1 line-clamp-1 text-xs text-amber-700 dark:text-amber-300">📝 {o.memo}</p>}
      {next && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateOrderStatus(o.id, next);
              if (res.ok) toast.success(`${o.customerName}님 주문 → ${STATUS_LABEL[next]}`);
              else toast.error(res.error);
            })
          }
        >
          {STATUS_LABEL[next]}(으)로 <ChevronRight />
        </Button>
      )}
    </div>
  );
}

/* ───────────── 캘린더 ───────────── */

function CalendarView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  const [month, setMonth] = useState(todayKey.slice(0, 7)); // "YYYY-MM"
  const [selected, setSelected] = useState(todayKey);

  const byDay = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (o.status === "CANCELED") continue;
      const key = kstDateKey(o.pickupAt);
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return map;
  }, [orders]);

  const [y, m] = month.split("-").map(Number);
  const firstKey = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leading = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDaysKey(firstKey, i)),
  ];
  while (cells.length % 7) cells.push(null);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }

  const selectedOrders = byDay.get(selected) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-xl border bg-background p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button size="icon-sm" variant="ghost" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            <ChevronLeft />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {y}년 {m}월
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setMonth(todayKey.slice(0, 7));
                setSelected(todayKey);
              }}
            >
              오늘
            </Button>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={() => shiftMonth(1)} aria-label="다음 달">
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn("py-1", i === 0 && "text-rose-500", i === 6 && "text-sky-600")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`empty-${i}`} />;
            const list = byDay.get(key) ?? [];
            const active = list.filter((o) => o.status !== "COMPLETED").length;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={cn(
                  "flex min-h-20 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-primary",
                  key === selected && "border-primary ring-1 ring-primary",
                  key === todayKey && "bg-primary/5",
                )}
              >
                <span className={cn("text-xs", key === todayKey && "font-bold text-primary")}>{Number(key.slice(8))}</span>
                {list.length > 0 && (
                  <>
                    <span className="rounded bg-primary px-1.5 text-xs font-medium text-primary-foreground">{list.length}건</span>
                    <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">
                      {active > 0 ? `미완료 ${active}` : "모두 완료"}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-background p-3">
        <p className="mb-2 font-bold">
          {formatDateKey(selected)} · {selectedOrders.length}건
        </p>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {selectedOrders.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">주문이 없어요</p>}
          {selectedOrders.map((o) => (
            <div key={o.id} className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="text-sm font-medium hover:underline">
                  {kstTime(o.pickupAt)} {o.customerName}
                </Link>
                <StatusSelect orderId={o.id} status={o.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{o.itemsSummary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
