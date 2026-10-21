import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CustomerEditor } from "@/components/customer-editor";
import { LoadingBlock } from "@/components/page-header";
import { StatusSelect } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PICKUP_LABEL } from "@/lib/constants";
import { formatDateKey, formatDateTime, formatWon, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { pickupAt: "desc" },
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!customer) notFound();

  const valid = customer.orders.filter((o) => o.status !== "CANCELED");
  const total = valid.reduce((s, o) => s + o.totalPrice, 0);
  const favorites = [
    ...valid
      .flatMap((o) => o.items)
      .reduce((map, i) => {
        const prev = map.get(i.productId) ?? { name: i.product.name, unit: i.product.unit, qty: 0, times: 0 };
        map.set(i.productId, { ...prev, qty: prev.qty + i.quantity, times: prev.times + 1 });
        return map;
      }, new Map<string, { name: string; unit: string; qty: number; times: number }>())
      .values(),
  ].sort((a, b) => b.times - a.times || b.qty - a.qty);

  const stats = [
    { label: "누적 주문", value: `${valid.length}건` },
    { label: "누적 금액", value: formatWon(total) },
    { label: "평균 주문 금액", value: valid.length ? formatWon(Math.round(total / valid.length)) : "-" },
    { label: "마지막 주문", value: valid[0] ? formatDateKey(kstDateKey(valid[0].pickupAt)) : "-" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
        ← 고객 목록
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {customer.phone} · 등록 {formatDateKey(kstDateKey(customer.createdAt))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>주문 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>픽업 일시</TableHead>
                  <TableHead>상품</TableHead>
                  <TableHead>방식</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      주문이 없어요
                    </TableCell>
                  </TableRow>
                )}
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/orders/${o.id}`} className="hover:underline">
                        {formatDateTime(o.pickupAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {o.items.map((i) => `${i.product.name} ${i.quantity}${i.product.unit}`).join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{PICKUP_LABEL[o.pickupType]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatWon(o.totalPrice)}</TableCell>
                    <TableCell>
                      <StatusSelect orderId={o.id} status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>자주 주문한 상품</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {favorites.length === 0 && <p className="text-sm text-muted-foreground">아직 없어요</p>}
              {favorites.slice(0, 5).map((f, idx) => (
                <div key={f.name} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-2 text-muted-foreground">{idx + 1}</span>
                    {f.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {f.times}회 · {f.qty}
                    {f.unit}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>고객 정보 수정</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerEditor id={customer.id} name={customer.name} memo={customer.memo ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
