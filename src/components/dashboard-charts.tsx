"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatWon } from "@/lib/format";

// 단일 시리즈 차트만 쓰므로 브랜드 테라코타 한 색만 사용 (globals.css의 --viz-1, 흰 배경 대비 3:1 이상 검증)
const SERIES = "var(--viz-1)";
const GRID = "var(--border)";
const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

function compactWon(v: number) {
  if (v >= 10000) return `${Math.round(v / 1000) / 10}만`;
  return v.toLocaleString("ko-KR");
}

function ChartTooltip({
  active,
  payload,
  title,
  rows,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  title: (p: Record<string, unknown>) => string;
  rows: (p: Record<string, unknown>) => [string, string][];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Record<string, unknown>;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{title(p)}</p>
      {rows(p).map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium tabular-nums">{v}</span>
        </p>
      ))}
    </div>
  );
}

export function DailyRevenueChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        {/* 주문이 없는 날이 많아 선으로 이으면 연속처럼 보이므로 일별 막대로 표시 */}
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactWon} width={48} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                title={(p) => String(p.label)}
                rows={(p) => [
                  ["매출", formatWon(Number(p.revenue))],
                  ["주문", `${p.orders}건`],
                ]}
              />
            )}
          />
          <Bar dataKey="revenue" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductBarChart({ data }: { data: { name: string; unit: string; qty: number; revenue: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 32 + 24) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactWon} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: "var(--foreground)" }} tickLine={false} axisLine={false} width={80} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                title={(p) => String(p.name)}
                rows={(p) => [
                  ["매출", formatWon(Number(p.revenue))],
                  ["판매량", `${p.qty}${p.unit}`],
                ]}
              />
            )}
          />
          <Bar
            dataKey="revenue"
            fill={SERIES}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            label={{ position: "right", fill: "var(--muted-foreground)", fontSize: 12, formatter: (v: unknown) => compactWon(Number(v)) }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayBarChart({ data }: { data: { label: string; orders: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ ...AXIS_TICK, fill: "var(--foreground)" }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={(props) => (
              <ChartTooltip active={props.active}
                payload={props.payload} title={(p) => `${p.label}요일`} rows={(p) => [["주문", `${p.orders}건`]]} />
            )}
          />
          <Bar dataKey="orders" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
