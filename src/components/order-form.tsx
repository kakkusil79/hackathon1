"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Minus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createOrder, lookupCustomer, type CustomerLookup } from "@/app/actions/orders";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDaysKey, formatDateKey, formatDateTime, formatWon, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

type Product = { id: string; name: string; category: string | null; unit: string; price: number };
type Lookup = { state: "idle" | "loading" | "new" } | { state: "found"; customer: NonNullable<CustomerLookup> };

export function OrderForm({ products, todayKey }: { products: Product[]; todayKey: string }) {
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [pickupDate, setPickupDate] = useState(addDaysKey(todayKey, 1));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [pickupType, setPickupType] = useState<PickupType>("PICKUP");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, startSubmit] = useTransition();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const byCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      const key = p.category ?? "기타";
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()];
  }, [products]);

  const cart = Object.entries(items)
    .map(([id, qty]) => ({ product: productById.get(id), qty }))
    .filter((c): c is { product: Product; qty: number } => !!c.product && c.qty > 0);
  const total = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);

  async function runLookup(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("전화번호를 끝까지 입력해 주세요");
      return;
    }
    setLookup({ state: "loading" });
    const res = await lookupCustomer(digits);
    if (!res.ok) {
      setLookup({ state: "idle" });
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setLookup({ state: "found", customer: res.data });
      setCustomerName(res.data.name);
    } else {
      setLookup({ state: "new" });
      setCustomerName("");
    }
  }

  function changeQty(productId: string, delta: number) {
    setItems((prev) => {
      const next = Math.max(0, Math.min(999, (prev[productId] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  }

  function setQty(productId: string, qty: number) {
    setItems((prev) => {
      const copy = { ...prev };
      if (!Number.isFinite(qty) || qty <= 0) delete copy[productId];
      else copy[productId] = Math.min(999, Math.floor(qty));
      return copy;
    });
  }

  function repeatOrder(order: NonNullable<CustomerLookup>["recentOrders"][number]) {
    const next: Record<string, number> = {};
    const skipped: string[] = [];
    for (const i of order.items) {
      if (i.isActive && productById.has(i.productId)) {
        next[i.productId] = (next[i.productId] ?? 0) + i.quantity;
      } else skipped.push(i.productName);
    }
    setItems(next);
    if (skipped.length) toast.warning(`판매 중지된 상품은 제외했어요: ${skipped.join(", ")}`);
    else toast.success("지난 주문 내용을 담았어요");
  }

  function reset() {
    setPhone("");
    setLookup({ state: "idle" });
    setCustomerName("");
    setItems({});
    setPickupDate(addDaysKey(todayKey, 1));
    setPickupTime("10:00");
    setPickupType("PICKUP");
    setAddress("");
    setMemo("");
    phoneRef.current?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startSubmit(async () => {
      const res = await createOrder({
        phone,
        customerName,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.qty })),
        pickupDate,
        pickupTime,
        pickupType,
        address: pickupType === "DELIVERY" ? address : undefined,
        memo,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const orderId = res.data.orderId;
      toast.success(`${customerName}님 주문을 저장했어요`, {
        action: { label: "주문 보기", onClick: () => router.push(`/orders/${orderId}`) },
      });
      reset();
    });
  }

  const showCustomer = lookup.state === "found" || lookup.state === "new";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* 1. 고객 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 고객</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              ref={phoneRef}
              autoFocus
              inputMode="tel"
              placeholder="010-0000-0000"
              aria-label="전화번호"
              value={phone}
              onChange={(e) => {
                const formatted = normalizePhone(e.target.value);
                setPhone(formatted);
                if (lookup.state !== "idle") setLookup({ state: "idle" });
                if (formatted.replace(/\D/g, "").length === 11) runLookup(formatted);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runLookup(phone);
                }
              }}
              className="h-11 max-w-xs text-lg tracking-wide"
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11"
              disabled={lookup.state === "loading"}
              onClick={() => runLookup(phone)}
            >
              <Search /> {lookup.state === "loading" ? "조회 중…" : "조회"}
            </Button>
          </div>

          {lookup.state === "new" && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
              처음 주문하는 고객이에요. 이름을 입력하면 저장할 때 고객으로 등록됩니다.
            </p>
          )}

          {showCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerName">고객 이름</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="예: 김떡순"
                className="max-w-xs"
              />
            </div>
          )}

          {lookup.state === "found" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <span className="font-medium">{lookup.customer.name}</span>님 · 누적 주문{" "}
                {lookup.customer.orderCount}건
                {lookup.customer.memo && (
                  <span className="ml-2 text-muted-foreground">📝 {lookup.customer.memo}</span>
                )}
              </p>
              {lookup.customer.recentOrders.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {lookup.customer.recentOrders.map((o, idx) => (
                    <div key={o.id} className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {idx === 0 ? "최근 " : ""}
                          {formatDateTime(o.pickupAt)}
                        </span>
                        <StatusBadge status={o.status as OrderStatus} />
                      </div>
                      <p className="flex-1 text-sm">
                        {o.items.map((i) => `${i.productName} ${i.quantity}`).join(", ")}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatWon(o.totalPrice)}</span>
                        <Button type="button" size="sm" variant={idx === 0 ? "default" : "outline"} onClick={() => repeatOrder(o)}>
                          <RotateCcw /> 지난 주문 그대로
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 상품 */}
      <Card>
        <CardHeader>
          <CardTitle>2. 상품</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {byCategory.map(([category, list]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{category}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => changeQty(p.id, 1)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary",
                      items[p.id] ? "border-primary bg-primary/5" : "bg-background",
                    )}
                  >
                    <span className="text-sm font-medium">
                      {p.name}
                      {items[p.id] ? <span className="ml-1 text-primary">×{items[p.id]}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatWon(p.price)} / {p.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <div className="rounded-lg border bg-background">
              {cart.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0">
                  <span className="flex-1 text-sm">{product.name}</span>
                  <Button type="button" size="icon-sm" variant="outline" onClick={() => changeQty(product.id, -1)} aria-label="하나 빼기">
                    <Minus />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(product.id, Number(e.target.value))}
                    className="h-7 w-16 text-center"
                    aria-label={`${product.name} 수량`}
                  />
                  <span className="w-6 text-xs text-muted-foreground">{product.unit}</span>
                  <Button type="button" size="icon-sm" variant="outline" onClick={() => changeQty(product.id, 1)} aria-label="하나 더하기">
                    <Plus />
                  </Button>
                  <span className="w-24 text-right text-sm tabular-nums">{formatWon(product.price * qty)}</span>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => setQty(product.id, 0)} aria-label="삭제">
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 font-bold">
                <span>합계</span>
                <span className="tabular-nums">{formatWon(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 픽업 */}
      <Card>
        <CardHeader>
          <CardTitle>3. 픽업·배송</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pickupDate">날짜</Label>
              <Input
                id="pickupDate"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((d) => {
                const key = addDaysKey(todayKey, d);
                return (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={pickupDate === key ? "default" : "outline"}
                    onClick={() => setPickupDate(key)}
                  >
                    {["오늘", "내일", "모레"][d]} {formatDateKey(key)}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pickupTime">시간</Label>
              <Input
                id="pickupTime"
                type="time"
                step={600}
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-36"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {(["PICKUP", "DELIVERY"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={pickupType === t ? "default" : "outline"}
                onClick={() => setPickupType(t)}
              >
                {t === "PICKUP" ? "매장 픽업" : "배송"}
              </Button>
            ))}
          </div>

          {pickupType === "DELIVERY" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">배송 주소</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="예: 가상시 떡볶구 인절미로 12" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 답례떡 포장 30개, 스티커 부착"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs text-muted-foreground">
            {cart.length}개 상품 · {formatDateKey(pickupDate)} {pickupTime}
          </p>
          <p className="text-lg font-bold tabular-nums">{formatWon(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={reset}>
            초기화
          </Button>
          <Button type="submit" size="lg" disabled={submitting || !showCustomer || cart.length === 0} className="px-6">
            {submitting ? "저장 중…" : "주문 저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}
