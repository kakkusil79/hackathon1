"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { CalendarDays, Loader2, Minus, Phone, Plus, RotateCcw, Store, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { createOrder, lookupCustomer, type CustomerLookup } from "@/app/actions/orders";
import { CustomerAvatar, TierBadge } from "@/components/customer-avatar";
import { StatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { categoryEmoji, PICKUP_LABEL, QUICK_MEMOS, QUICK_TIMES } from "@/lib/constants";
import { customerTier } from "@/lib/customer";
import { addDaysKey, formatDateKey, formatDateTime, formatWon, normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

type Product = { id: string; name: string; category: string | null; unit: string; price: number };
type Found = NonNullable<CustomerLookup>;
type Lookup = { state: "idle" | "loading" | "new" } | { state: "found"; customer: Found };

export function OrderForm({
  products,
  todayKey,
  initialPhone = "",
  initialCustomer = null,
  children,
}: {
  products: Product[];
  todayKey: string;
  initialPhone?: string;
  initialCustomer?: CustomerLookup;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState(initialPhone);
  const [lookup, setLookup] = useState<Lookup>(
    initialCustomer ? { state: "found", customer: initialCustomer } : { state: "idle" },
  );
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? "");
  const [items, setItems] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<string>("전체");
  const [pickupDate, setPickupDate] = useState(addDaysKey(todayKey, 1));
  const [pickupTime, setPickupTime] = useState("10:00");
  const [pickupType, setPickupType] = useState<PickupType>("PICKUP");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, startSubmit] = useTransition();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(() => ["전체", ...new Set(products.map((p) => p.category ?? "기타"))], [products]);
  const visibleProducts = category === "전체" ? products : products.filter((p) => (p.category ?? "기타") === category);

  const cart = Object.entries(items)
    .map(([id, qty]) => ({ product: productById.get(id), qty }))
    .filter((c): c is { product: Product; qty: number } => !!c.product && c.qty > 0);
  const total = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const hasCustomer = (lookup.state === "found" || lookup.state === "new") && customerName.trim().length > 0;
  const blocker = !hasCustomer
    ? lookup.state === "new"
      ? "고객 이름을 입력해 주세요"
      : "전화번호를 먼저 입력해 주세요"
    : cart.length === 0
      ? "상품을 눌러 담아 주세요"
      : pickupType === "DELIVERY" && !address.trim()
        ? "배송 주소를 입력해 주세요"
        : null;

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

  function repeatOrder(order: Found["recentOrders"][number]) {
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

  function toggleMemo(text: string) {
    setMemo((prev) => {
      const parts = prev.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.includes(text) ? parts.filter((p) => p !== text).join(", ") : [...parts, text].join(", ");
    });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    phoneRef.current?.focus();
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (blocker) {
      toast.error(blocker);
      return;
    }
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
        description: `${formatDateKey(pickupDate)} ${pickupTime} · ${formatWon(total)}`,
        action: { label: "주문 보기", onClick: () => router.push(`/orders/${orderId}`) },
      });
      reset();
    });
  }

  const dateChips = [0, 1, 2].map((d) => ({ key: addDaysKey(todayKey, d), label: ["오늘", "내일", "모레"][d] }));
  const customDate = !dateChips.some((c) => c.key === pickupDate);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* ── 1. 고객 ── */}
        <Step n={1} title="누구의 주문인가요?" done={hasCustomer}>
          <div className="relative">
            <Phone className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={phoneRef}
              autoFocus={!initialPhone}
              inputMode="tel"
              autoComplete="off"
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
              className="h-14 w-full rounded-2xl border bg-background pr-24 pl-12 text-xl font-semibold tracking-wider tabular-nums outline-none transition placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <Button
              type="button"
              variant="secondary"
              className="absolute top-1/2 right-2 h-10 -translate-y-1/2 rounded-xl px-4"
              disabled={lookup.state === "loading"}
              onClick={() => runLookup(phone)}
            >
              {lookup.state === "loading" ? <Loader2 className="animate-spin" /> : "조회"}
            </Button>
          </div>

          {lookup.state === "idle" && (
            <p className="text-xs text-muted-foreground">번호 11자리를 입력하면 단골 고객과 지난 주문을 자동으로 찾아요.</p>
          )}

          {lookup.state === "new" && (
            <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-semibold text-emerald-900">🎉 처음 주문하는 고객이에요</p>
              <Input
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="고객 이름 (예: 김떡순)"
                aria-label="고객 이름"
                className="h-11 rounded-xl bg-background"
              />
            </div>
          )}

          {lookup.state === "found" && (
            <CustomerFound
              customer={lookup.customer}
              name={customerName}
              onNameChange={setCustomerName}
              onRepeat={repeatOrder}
            />
          )}
        </Step>

        {/* ── 2. 상품 ── */}
        <Step n={2} title="어떤 떡을 담을까요?" done={cart.length > 0} aside={itemCount > 0 ? `${itemCount}개 담음` : undefined}>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors",
                  category === c ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "전체" ? c : `${categoryEmoji(c)} ${c}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((p) => {
              const qty = items[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border bg-card transition-all",
                    qty > 0 ? "border-primary/60 ring-2 ring-primary/15" : "hover:border-primary/40 hover:shadow-soft",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => changeQty(p.id, 1)}
                    className="flex flex-1 flex-col gap-1 p-3 text-left active:bg-muted/60"
                  >
                    <span className="flex items-start justify-between">
                      <span className="text-2xl leading-none">{categoryEmoji(p.category)}</span>
                      {qty > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground tabular-nums">
                          {qty}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 font-semibold">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatWon(p.price)} / {p.unit}
                    </span>
                  </button>
                  {qty > 0 && (
                    <div className="flex items-center justify-between border-t bg-accent/50 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => changeQty(p.id, -1)}
                        aria-label={`${p.name} 하나 빼기`}
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-background"
                      >
                        {qty === 1 ? <X className="size-4" /> : <Minus className="size-4" />}
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={qty}
                        onChange={(e) => setQty(p.id, Number(e.target.value))}
                        aria-label={`${p.name} 수량`}
                        className="w-12 bg-transparent text-center text-sm font-bold tabular-nums outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => changeQty(p.id, 1)}
                        aria-label={`${p.name} 하나 더하기`}
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-background"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Step>

        {/* ── 3. 픽업 ── */}
        <Step n={3} title="언제, 어떻게 받으시나요?" done={hasCustomer && cart.length > 0 && !blocker}>
          <Field label="날짜">
            <div className="flex flex-wrap gap-2">
              {dateChips.map((c) => (
                <Chip key={c.key} active={pickupDate === c.key} onClick={() => setPickupDate(c.key)}>
                  {c.label} <span className="opacity-70">{formatDateKey(c.key)}</span>
                </Chip>
              ))}
              <label
                className={cn(
                  "relative flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                  customDate ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                )}
              >
                <CalendarDays className="size-4" />
                {customDate ? formatDateKey(pickupDate) : "다른 날"}
                <input
                  type="date"
                  value={pickupDate}
                  min={todayKey}
                  onChange={(e) => e.target.value && setPickupDate(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="픽업 날짜 직접 선택"
                />
              </label>
            </div>
          </Field>

          <Field label="시간">
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_TIMES.map((t) => (
                <Chip key={t} active={pickupTime === t} onClick={() => setPickupTime(t)}>
                  {t}
                </Chip>
              ))}
              <Input
                type="time"
                step={600}
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                aria-label="픽업 시간 직접 입력"
                className="h-9 w-32 rounded-xl"
              />
            </div>
          </Field>

          <Field label="받는 방법">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:w-80">
              {(["PICKUP", "DELIVERY"] as const).map((t) => {
                const Icon = t === "PICKUP" ? Store : Truck;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPickupType(t)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                      pickupType === t ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {PICKUP_LABEL[t]}
                  </button>
                );
              })}
            </div>
            {pickupType === "DELIVERY" && (
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="배송 주소 (예: 가상시 떡볶구 인절미로 12)"
                aria-label="배송 주소"
                className="mt-2 h-11 rounded-xl"
              />
            )}
          </Field>

          <Field label="메모">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_MEMOS.map((m) => {
                const on = memo.split(",").map((s) => s.trim()).includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMemo(m)}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                      on ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on ? "✓ " : "+ "}
                    {m}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="요청사항을 자유롭게 적어 주세요"
              rows={2}
              aria-label="메모"
              className="rounded-xl"
            />
          </Field>
        </Step>
      </div>

      {/* ── 데스크톱: 주문서 요약 ── */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
        <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-soft lg:block">
          <div className="flex items-center justify-between border-b border-dashed px-5 py-4">
            <p className="font-bold">주문서</p>
            {cart.length > 0 && (
              <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                초기화
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              {hasCustomer ? (
                <>
                  <CustomerAvatar name={customerName} seed={phone} size="sm" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">{customerName}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{phone}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">고객을 먼저 찾아 주세요</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {cart.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">담은 상품이 없어요</p>}
              {cart.map(({ product, qty }) => (
                <div key={product.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span>
                    {product.name} <span className="text-muted-foreground">× {qty}{product.unit}</span>
                  </span>
                  <span className="tabular-nums">{formatWon(product.price * qty)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-muted px-3 py-2.5 text-sm">
              📅 {formatDateKey(pickupDate)} {pickupTime} · {PICKUP_LABEL[pickupType]}
            </div>
          </div>
          <div className="border-t border-dashed px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">합계</span>
              <span className="text-2xl font-bold tracking-tight tabular-nums">{formatWon(total)}</span>
            </div>
            <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={submitting || !!blocker}>
              {submitting ? <Loader2 className="animate-spin" /> : "주문 저장하기"}
            </Button>
            {blocker && <p className="mt-2 text-center text-xs text-muted-foreground">{blocker}</p>}
          </div>
        </div>
        {children}
      </div>

      {/* 고정 저장 바에 가려지지 않도록 하는 여백 */}
      <div aria-hidden className="h-16 lg:hidden" />

      {/* ── 휴대폰: 하단 고정 저장 바 (탭바 바로 위) ── */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur-lg lg:hidden md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {blocker ?? `${itemCount}개 · ${formatDateKey(pickupDate)} ${pickupTime}`}
            </p>
            <p className="text-lg font-bold tabular-nums">{formatWon(total)}</p>
          </div>
          <Button type="submit" size="lg" className="h-11 rounded-xl px-6 text-base" disabled={submitting || !!blocker}>
            {submitting ? <Loader2 className="animate-spin" /> : "주문 저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Step({
  n,
  title,
  done,
  aside,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
            done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? "✓" : n}
        </span>
        <h2 className="flex-1 font-bold">{title}</h2>
        {aside && <span className="text-xs font-semibold text-primary">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl border px-3 text-sm font-medium whitespace-nowrap tabular-nums transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function CustomerFound({
  customer,
  name,
  onNameChange,
  onRepeat,
}: {
  customer: Found;
  name: string;
  onNameChange: (v: string) => void;
  onRepeat: (o: Found["recentOrders"][number]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const tier = customerTier(customer.orderCount, customer.createdAt);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-accent/40 p-3">
        <CustomerAvatar name={name || customer.name} seed={customer.phone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {editing ? (
              <Input
                autoFocus
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={() => setEditing(false)}
                aria-label="고객 이름"
                className="h-8 w-36 rounded-lg bg-background"
              />
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="font-bold hover:underline" title="이름 수정">
                {name}님
              </button>
            )}
            <TierBadge tier={tier} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            누적 {customer.orderCount}건
            {customer.memo && <> · 📝 {customer.memo}</>}
          </p>
        </div>
      </div>

      {customer.recentOrders.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground">최근 주문 · 눌러서 그대로 담기</p>
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {customer.recentOrders.map((o, idx) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onRepeat(o)}
                className="group flex min-w-[78%] snap-start flex-col gap-2 rounded-2xl border bg-card p-3 text-left transition hover:border-primary/50 hover:shadow-soft sm:min-w-0"
              >
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {idx === 0 && <b className="mr-1 text-primary">최근</b>}
                    {formatDateTime(o.pickupAt)}
                  </span>
                  <StatusBadge status={o.status as OrderStatus} />
                </span>
                <span className="line-clamp-2 flex-1 text-sm font-medium">
                  {o.items.map((i) => `${i.productName} ${i.quantity}`).join(", ")}
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-sm font-bold tabular-nums">{formatWon(o.totalPrice)}</span>
                  <span className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition group-hover:brightness-110">
                    <RotateCcw className="size-3" /> 다시 담기
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
