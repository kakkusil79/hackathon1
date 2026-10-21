"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Search, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/actions/orders";
import { CustomerAvatar } from "@/components/customer-avatar";
import { OrderRow as OrderRowItem, type OrderRowData } from "@/components/order-card";
import { EmptyState } from "@/components/page-header";
import { StatusBadge, StatusSelect } from "@/components/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NEXT_STATUS, ORDER_STATUSES, PICKUP_LABEL, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { addDaysKey, formatDateKey, formatWon, kstDateKey, kstTime, WEEKDAYS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

export type OrderRow = OrderRowData & { customerId: string; customerName: string; customerPhone: string };

export function OrdersView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  const todays = orders.filter((o) => kstDateKey(o.pickupAt) === todayKey && o.status !== "CANCELED");
  const open = orders.filter((o) => kstDateKey(o.pickupAt) >= todayKey && !["COMPLETED", "CANCELED"].includes(o.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2 sm:max-w-lg">
        <MiniStat label="오늘 픽업" value={`${todays.length}건`} />
        <MiniStat label="남은 오늘" value={`${todays.filter((o) => o.status !== "COMPLETED").length}건`} accent />
        <MiniStat label="진행 중" value={`${open.length}건`} />
      </div>

      <Tabs defaultValue="list">
        <TabsList className="h-11 rounded-xl p-1">
          <TabsTrigger value="list" className="rounded-lg px-3">
            <List /> 목록
          </TabsTrigger>
          <TabsTrigger value="kanban" className="rounded-lg px-3">
            <Columns3 /> 칸반
          </TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-lg px-3">
            <CalendarDays /> 캘린더
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-3">
          <ListView orders={orders} todayKey={todayKey} />
        </TabsContent>
        <TabsContent value="kanban" className="mt-3">
          <KanbanView orders={orders} todayKey={todayKey} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-3">
          <CalendarView orders={orders} todayKey={todayKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border px-3 py-2.5 shadow-soft", accent ? "border-primary/20 bg-accent" : "bg-card")}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", accent && "text-accent-foreground")}>{value}</p>
    </div>
  );
}

function dayLabel(key: string, todayKey: string) {
  if (key === todayKey) return "오늘";
  if (key === addDaysKey(todayKey, 1)) return "내일";
  if (key === addDaysKey(todayKey, -1)) return "어제";
  return null;
}

/* ───────────── 목록 (날짜별 묶음) ───────────── */

const PERIODS = [
  { value: "today", label: "오늘" },
  { value: "week", label: "7일" },
  { value: "upcoming", label: "다가올 주문" },
  { value: "past", label: "지난 주문" },
  { value: "all", label: "전체" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

function ListView({ orders, todayKey }: { orders: OrderRow[]; todayKey: string }) {
  const [period, setPeriod] = useState<Period>("week");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
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
    const map = new Map<string, OrderRow[]>();
    for (const o of list) {
      const key = kstDateKey(o.pickupAt);
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    const entries = [...map.entries()];
    return period === "past" ? entries.reverse() : entries;
  }, [orders, period, status, query, todayKey]);

  const count = groups.reduce((s, [, l]) => s + l.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="고객명·전화번호·상품 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
          {PERIODS.map((p) => (
            <Pill key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <Pill active={status === "ALL"} onClick={() => setStatus("ALL")} subtle>
          모든 상태
        </Pill>
        {ORDER_STATUSES.map((s) => (
          <Pill key={s} active={status === s} onClick={() => setStatus(s)} subtle>
            <span className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />
            {STATUS_LABEL[s]}
          </Pill>
        ))}
      </div>

      {count === 0 && <EmptyState emoji="🔍" title="조건에 맞는 주문이 없어요" description="기간이나 상태를 바꿔 보세요." />}

      {groups.map(([key, list]) => {
        const sum = list.filter((o) => o.status !== "CANCELED").reduce((s, o) => s + o.totalPrice, 0);
        const label = dayLabel(key, todayKey);
        return (
          <section key={key} className="flex flex-col gap-2">
            <div className="sticky top-14 z-20 -mx-4 flex items-baseline justify-between bg-background/90 px-4 py-2 backdrop-blur md:top-0 md:mx-0 md:px-1">
              <h3 className="font-bold">
                {label && <span className="mr-1.5 text-primary">{label}</span>}
                {formatDateKey(key)}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {list.length}건 · {formatWon(sum)}
              </span>
            </div>
            {list.map((o) => (
              <OrderRowItem key={o.id} order={o} timeOnly />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Pill({
  active,
  onClick,
  subtle = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? subtle
            ? "bg-accent text-accent-foreground ring-1 ring-primary/20"
            : "bg-foreground text-background"
          : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
      )}
    >
      {children}
    </button>
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
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
      {KANBAN_COLUMNS.map((col) => {
        const list = visible.filter((o) => o.status === col);
        return (
          <div key={col} className="flex w-[84%] shrink-0 snap-center flex-col rounded-2xl bg-muted/70 p-2 md:w-auto">
            <div className="flex items-center gap-2 px-2 pt-1 pb-3">
              <span className={cn("size-2 rounded-full", STATUS_DOT[col])} />
              <span className="text-sm font-bold">{STATUS_LABEL[col]}</span>
              <span className="rounded-full bg-background px-2 text-xs font-semibold text-muted-foreground tabular-nums">
                {list.length}
              </span>
              {col === "COMPLETED" && <span className="ml-auto text-[11px] text-muted-foreground">오늘</span>}
            </div>
            <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
              {list.map((o) => (
                <KanbanCard key={o.id} order={o} todayKey={todayKey} />
              ))}
              {list.length === 0 && (
                <p className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">비어 있어요</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dDay(key: string, todayKey: string) {
  const diff = Math.round((Date.parse(key) - Date.parse(todayKey)) / 86400000);
  if (diff === 0) return { text: "오늘", cls: "bg-primary text-primary-foreground" };
  if (diff === 1) return { text: "내일", cls: "bg-accent text-accent-foreground" };
  if (diff < 0) return { text: "지남", cls: "bg-rose-100 text-rose-700" };
  return { text: `D-${diff}`, cls: "bg-muted text-muted-foreground" };
}

function KanbanCard({ order: o, todayKey }: { order: OrderRow; todayKey: string }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[o.status];
  const key = kstDateKey(o.pickupAt);
  const d = dDay(key, todayKey);
  const overdue = key < todayKey && o.status !== "COMPLETED";
  const PickupIcon = o.pickupType === "PICKUP" ? Store : Truck;

  return (
    <div className={cn("rounded-xl border bg-card p-3 shadow-soft", overdue && "border-rose-200")}>
      <div className="flex items-center gap-1.5 text-xs">
        <span className={cn("rounded-md px-1.5 py-0.5 font-bold", overdue ? "bg-rose-100 text-rose-700" : d.cls)}>{d.text}</span>
        <span className="font-semibold tabular-nums">
          {formatDateKey(key)} {kstTime(o.pickupAt)}
        </span>
        <PickupIcon className="ml-auto size-3.5 text-muted-foreground" aria-label={PICKUP_LABEL[o.pickupType]} />
      </div>
      <Link href={`/orders/${o.id}`} className="mt-2 flex items-center gap-2">
        <CustomerAvatar name={o.customerName} seed={o.customerPhone} size="sm" className="size-6 text-[10px]" />
        <span className="font-semibold hover:underline">{o.customerName}</span>
      </Link>
      <p className="mt-1.5 line-clamp-2 text-sm text-foreground/75">{o.itemsSummary}</p>
      {o.memo && <p className="mt-1 line-clamp-1 text-xs text-amber-700">📝 {o.memo}</p>}
      {next && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateOrderStatus(o.id, next);
              if (res.ok) toast.success(`${o.customerName}님 주문 → ${STATUS_LABEL[next]}`);
              else toast.error(res.error);
            })
          }
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:bg-accent disabled:opacity-50"
        >
          {STATUS_LABEL[next]}(으)로 <ArrowRight className="size-4" />
        </button>
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
  const selectedLabel = dayLabel(selected, todayKey);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border bg-card p-3 shadow-soft sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg font-bold">
            {y}년 {m}월
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMonth(todayKey.slice(0, 7));
                setSelected(todayKey);
              }}
              className="h-8 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
            >
              오늘
            </button>
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="이전 달" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="다음 달" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn("py-2", i === 0 && "text-rose-500", i === 6 && "text-sky-600")}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`empty-${i}`} />;
            const list = byDay.get(key) ?? [];
            const statuses = [...new Set(list.map((o) => o.status))].slice(0, 4);
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start gap-1 rounded-xl p-1 transition-colors sm:aspect-auto sm:min-h-20 sm:items-start sm:p-2",
                  key === selected ? "bg-accent ring-2 ring-primary/40" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {Number(key.slice(8))}
                </span>
                {list.length > 0 && (
                  <>
                    <span className="text-[11px] font-bold text-foreground tabular-nums sm:text-xs">{list.length}건</span>
                    <span className="flex gap-0.5">
                      {statuses.map((s) => (
                        <span key={s} className={cn("size-1.5 rounded-full", STATUS_DOT[s])} />
                      ))}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <p className="mb-3 font-bold">
          {selectedLabel && <span className="mr-1.5 text-primary">{selectedLabel}</span>}
          {formatDateKey(selected)} <span className="font-normal text-muted-foreground">· {selectedOrders.length}건</span>
        </p>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {selectedOrders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">주문이 없는 날이에요</p>}
          {selectedOrders.map((o) => (
            <div key={o.id} className="flex gap-3 rounded-xl bg-muted/60 p-3">
              <span className="w-11 shrink-0 pt-0.5 text-sm font-bold tabular-nums">{kstTime(o.pickupAt)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/orders/${o.id}`} className="truncate text-sm font-semibold hover:underline">
                    {o.customerName}
                  </Link>
                  <StatusSelect orderId={o.id} status={o.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{o.itemsSummary}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3">
          {ORDER_STATUSES.filter((s) => s !== "CANCELED").map((s) => (
            <StatusBadge key={s} status={s} className="bg-transparent px-0 ring-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
