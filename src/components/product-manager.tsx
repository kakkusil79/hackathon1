"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createProduct, setProductActive, updateProduct } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryEmoji } from "@/lib/constants";
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

type Draft = { name: string; category: string; unit: string; price: string };
const EMPTY: Draft = { name: "", category: "", unit: "", price: "" };

export function ProductManager({ products }: { products: ProductRow[] }) {
  // null: 닫힘, "new": 새 상품, 그 외: 수정 중인 상품
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const maxSold = Math.max(1, ...products.map((p) => p.soldOrders));
  const visible = filter === "active" ? products.filter((p) => p.isActive) : products;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-semibold transition-all",
                filter === f ? "bg-card shadow-soft" : "text-muted-foreground",
              )}
            >
              {f === "active" ? `판매 중 ${products.filter((p) => p.isActive).length}` : `전체 ${products.length}`}
            </button>
          ))}
        </div>
        <Button onClick={() => setEditing("new")} className="h-10 rounded-xl px-4">
          <Plus /> 새 상품
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => (
          <ProductTile key={p.id} product={p} maxSold={maxSold} onEdit={() => setEditing(p)} />
        ))}
      </div>

      <ProductDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        target={editing}
        categories={categories}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function ProductTile({ product: p, maxSold, onEdit }: { product: ProductRow; maxSold: number; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex flex-col rounded-2xl border bg-card p-4 shadow-soft transition", !p.isActive && "opacity-60")}>
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-2xl">{categoryEmoji(p.category)}</span>
        <button
          type="button"
          role="switch"
          aria-checked={p.isActive}
          aria-label={`${p.name} 판매 여부`}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setProductActive(p.id, !p.isActive);
              if (res.ok) toast.success(p.isActive ? `'${p.name}' 판매 중지` : `'${p.name}' 판매 재개`);
              else toast.error(res.error);
            })
          }
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50",
            p.isActive ? "bg-emerald-500" : "bg-stone-300",
          )}
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", p.isActive ? "left-[18px]" : "left-0.5")} />
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{p.category || "기타"}</p>
      <p className="font-bold">{p.name}</p>
      <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">
        {formatWon(p.price)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">/ {p.unit}</span>
      </p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>누적 {p.soldOrders}건</span>
          <span>
            {p.soldQty.toLocaleString("ko-KR")}
            {p.unit}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary/60" style={{ width: `${(p.soldOrders / maxSold) * 100}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-accent"
      >
        <Pencil className="size-3.5" /> 수정
      </button>
    </div>
  );
}

function ProductDialog({
  target,
  categories,
  onClose,
}: {
  target: ProductRow | "new" | null;
  categories: string[];
  onClose: () => void;
}) {
  const isNew = target === "new";
  const initial: Draft =
    target && target !== "new"
      ? { name: target.name, category: target.category, unit: target.unit, price: String(target.price) }
      : EMPTY;
  const [v, setV] = useState<Draft>(initial);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = { ...v, price: Number(v.price) };
      const res = isNew ? await createProduct(input) : await updateProduct((target as ProductRow).id, input);
      if (res.ok) {
        toast.success(isNew ? `'${v.name}'을(를) 추가했어요` : `'${v.name}' 수정 완료`);
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl p-5 sm:max-w-md">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isNew ? "새 상품 추가" : "상품 수정"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-name">상품명</Label>
              <Input id="p-name" autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="예: 쑥떡" className="h-11 rounded-xl" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="p-category">분류</Label>
              <Input id="p-category" list="p-categories" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} placeholder="예: 일반떡" className="h-11 rounded-xl" />
              <datalist id="p-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setV({ ...v, category: c })}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-xs font-medium",
                      v.category === c ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {categoryEmoji(c)} {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-unit">단위</Label>
              <Input id="p-unit" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="되, kg, 개" className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-price">가격(원)</Label>
              <Input id="p-price" type="number" inputMode="numeric" min={0} value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} placeholder="30000" className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl">
              취소
            </Button>
            <Button type="submit" disabled={pending} className="h-11 rounded-xl px-6">
              {isNew ? "추가하기" : "저장하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
