"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProduct, setProductActive, updateProduct } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3">
        <span className="mr-2 text-sm font-medium">새 상품</span>
        <Input placeholder="상품명" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-36" />
        <Input placeholder="분류 (예: 답례떡)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-36" />
        <Input placeholder="단위 (예: 되)" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="w-28" />
        <Input placeholder="가격" type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="w-28" />
        <Button type="submit" disabled={pending}>
          추가
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품명</TableHead>
              <TableHead>분류</TableHead>
              <TableHead>단위</TableHead>
              <TableHead>가격</TableHead>
              <TableHead className="text-right">누적 판매</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <ProductRowEditor key={`${p.id}-${p.name}-${p.price}-${p.unit}-${p.category}`} product={p} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ProductRowEditor({ product: p }: { product: ProductRow }) {
  const [v, setV] = useState({ name: p.name, category: p.category, unit: p.unit, price: String(p.price) });
  const [pending, startTransition] = useTransition();
  const dirty = v.name !== p.name || v.category !== p.category || v.unit !== p.unit || v.price !== String(p.price);

  return (
    <TableRow className={cn(!p.isActive && "opacity-50")}>
      <TableCell>
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="h-7 w-32" aria-label="상품명" />
      </TableCell>
      <TableCell>
        <Input value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} className="h-7 w-28" aria-label="분류" />
      </TableCell>
      <TableCell>
        <Input value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} className="h-7 w-16" aria-label="단위" />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} className="h-7 w-24" aria-label="가격" />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {p.soldQty.toLocaleString("ko-KR")}
        {p.unit} <span className="text-muted-foreground">({p.soldOrders}건)</span>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {dirty && (
          <Button
            size="sm"
            disabled={pending}
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
        )}
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
      </TableCell>
    </TableRow>
  );
}
