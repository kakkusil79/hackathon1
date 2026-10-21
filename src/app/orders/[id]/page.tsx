import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemoEditor } from "@/components/memo-editor";
import { LoadingBlock } from "@/components/page-header";
import { StatusSelect } from "@/components/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PICKUP_LABEL } from "@/lib/constants";
import { formatDateTime, formatWon } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/orders" className="text-sm text-muted-foreground hover:underline">
        ← 주문 현황
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {order.customer.name}님 주문
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            접수 {formatDateTime(order.createdAt)} · 주문번호 {order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <StatusSelect orderId={order.id} status={order.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>고객</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href={`/customers/${order.customerId}`} className="font-medium hover:underline">
              {order.customer.name}
            </Link>
            <span>{order.customer.phone}</span>
            {order.customer.memo && <span className="text-muted-foreground">📝 {order.customer.memo}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{PICKUP_LABEL[order.pickupType]}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="text-lg font-bold">{formatDateTime(order.pickupAt)}</span>
            {order.address && <span>{order.address}</span>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>상품</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.product.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatWon(i.unitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.quantity}
                    {i.product.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatWon(i.unitPrice * i.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>합계</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatWon(order.totalPrice)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>메모</CardTitle>
        </CardHeader>
        <CardContent>
          <MemoEditor orderId={order.id} initial={order.memo ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
