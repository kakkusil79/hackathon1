"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProduct, setProductActive, updateProduct } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  isActive: boolean;
  soldQty: number;
  soldOrders: number;
};

const EMPTY = { name: "", category: "", unit: "", price: "" };

export function ProductManager({ products }: { products: ProductRow[] }) {
  const [draft, setDraft] = useState(EMPTY);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createProduct({ ...draft, price: Number(draft.price) });
      if (res.ok) {
        toast.success(`'${draft.name}'을(를) 추가했어요`);
        setDraft(EMPTY);
      } else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-xl border bg-background p-3 md:flex md:flex-wrap md:items-center">
        <span className="col-span-2 text-sm font-medium md:mr-2">새 상품</span>
        <Input placeholder="상품명" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="md:w-36" />
        <Input placeholder="분류 (예: 답례떡)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="md:w-36" />
        <Input placeholder="단위 (예: 되)" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="md:w-28" />
        <Input placeholder="가격" type="number" inputMode="numeric" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="md:w-28" />
        <Button type="submit" disabled={pending} className="col-span-2 md:col-span-1">
          추가
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={`${p.id}-${p.name}-${p.price}-${p.unit}-${p.category}`} product={p} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product: p }: { product: ProductRow }) {
  const [v, setV] = useState({ name: p.name, category: p.category, unit: p.unit, price: String(p.price) });
  const [pending, startTransition] = useTransition();
  const dirty = v.name !== p.name || v.category !== p.category || v.unit !== p.unit || v.price !== String(p.price);
  const id = (field: string) => `${p.id}-${field}`;

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-background p-3", !p.isActive && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {p.name}
          {!p.isActive && <span className="ml-2 text-xs text-muted-foreground">판매 중지</span>}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          누적 {p.soldQty.toLocaleString("ko-KR")}
          {p.unit} · {p.soldOrders}건
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("name")} className="text-xs text-muted-foreground">상품명</Label>
          <Input id={id("name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("category")} className="text-xs text-muted-foreground">분류</Label>
          <Input id={id("category")} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("unit")} className="text-xs text-muted-foreground">단위</Label>
          <Input id={id("unit")} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("price")} className="text-xs text-muted-foreground">가격(원)</Label>
          <Input
            id={id("price")}
            type="number"
            inputMode="numeric"
            min={0}
            value={v.price}
            onChange={(e) => setV({ ...v, price: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setProductActive(p.id, !p.isActive);
              if (res.ok) toast.success(p.isActive ? `'${p.name}' 판매 중지` : `'${p.name}' 판매 재개`);
              else toast.error(res.error);
            })
          }
        >
          {p.isActive ? "판매 중지" : "판매 재개"}
        </Button>
        <Button
          size="sm"
          disabled={pending || !dirty}
          onClick={() =>
            startTransition(async () => {
              const res = await updateProduct(p.id, { ...v, price: Number(v.price) });
              if (res.ok) toast.success(`'${v.name}' 수정 완료 (${formatWon(Number(v.price))})`);
              else toast.error(res.error);
            })
          }
        >
          저장
        </Button>
      </div>
    </div>
  );
}
