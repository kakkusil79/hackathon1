import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingBlock, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateKey, formatWon, kstDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <>
      <PageHeader title="고객" description="누적 주문과 마지막 주문일로 단골을 한눈에 확인하세요." />
      <Suspense fallback={<LoadingBlock />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomerList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = sp.sort === "total" || sp.sort === "count" ? sp.sort : "recent";

  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q.replace(/\D/g, "") || q } }] }
      : undefined,
    include: {
      orders: {
        where: { status: { not: "CANCELED" } },
        select: { totalPrice: true, pickupAt: true },
      },
    },
  });

  const rows = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      memo: c.memo,
      count: c.orders.length,
      total: c.orders.reduce((s, o) => s + o.totalPrice, 0),
      last: c.orders.reduce<Date | null>((max, o) => (!max || o.pickupAt > max ? o.pickupAt : max), null),
    }))
    .sort((a, b) => {
      if (sort === "total") return b.total - a.total;
      if (sort === "count") return b.count - a.count;
      return (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0);
    });

  return (
    <div className="flex flex-col gap-3">
      <Form action="/customers" className="flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="이름 또는 전화번호" className="w-60" />
        <select name="sort" defaultValue={sort} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="정렬">
          <option value="recent">최근 주문순</option>
          <option value="count">주문 횟수순</option>
          <option value="total">누적 금액순</option>
        </select>
        <Button type="submit" variant="outline">
          검색
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">{rows.length}명</span>
      </Form>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead className="text-right">주문</TableHead>
              <TableHead className="text-right">누적 금액</TableHead>
              <TableHead>마지막 주문</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  고객이 없어요
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">{c.phone}</TableCell>
                <TableCell className="text-right tabular-nums">{c.count}건</TableCell>
                <TableCell className="text-right tabular-nums">{formatWon(c.total)}</TableCell>
                <TableCell>{c.last ? formatDateKey(kstDateKey(c.last)) : "-"}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{c.memo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
