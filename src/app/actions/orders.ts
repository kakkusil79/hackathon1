"use server";

import { revalidateAll, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { fromKst, normalizePhone } from "@/lib/format";
import {
  createOrderSchema,
  orderStatusSchema,
  phoneSchema,
  type CreateOrderInput,
} from "@/lib/validations";

export type CustomerLookup = {
  id: string;
  name: string;
  phone: string;
  memo: string | null;
  orderCount: number;
  recentOrders: {
    id: string;
    pickupAt: string;
    status: string;
    totalPrice: number;
    items: { productId: string; productName: string; quantity: number; isActive: boolean }[];
  }[];
} | null;

export async function lookupCustomer(
  phone: string,
): Promise<ActionResult<CustomerLookup>> {
  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const customer = await prisma.customer.findUnique({
    where: { phone: normalizePhone(parsed.data) },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { pickupAt: "desc" },
        take: 3,
        include: { items: { include: { product: true } } },
      },
    },
  });
  if (!customer) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      memo: customer.memo,
      orderCount: customer._count.orders,
      recentOrders: customer.orders.map((o) => ({
        id: o.id,
        pickupAt: o.pickupAt.toISOString(),
        status: o.status,
        totalPrice: o.totalPrice,
        items: o.items.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          quantity: i.quantity,
          isActive: i.product.isActive,
        })),
      })),
    },
  };
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<ActionResult<{ orderId: string }>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  if (v.pickupType === "DELIVERY" && !v.address) {
    return { ok: false, error: "배송 주소를 입력해 주세요" };
  }

  // 가격은 클라이언트 값을 믿지 않고 DB에서 다시 읽는다
  const products = await prisma.product.findMany({
    where: { id: { in: v.items.map((i) => i.productId) } },
  });
  const priceById = new Map(products.map((p) => [p.id, p.price]));
  if (v.items.some((i) => !priceById.has(i.productId))) {
    return { ok: false, error: "존재하지 않는 상품이 포함되어 있어요" };
  }

  const items = v.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPrice: priceById.get(i.productId)!,
  }));
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const phone = normalizePhone(v.phone);

  const order = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone },
      update: { name: v.customerName },
      create: { phone, name: v.customerName },
    });
    return tx.order.create({
      data: {
        customerId: customer.id,
        pickupAt: fromKst(v.pickupDate, v.pickupTime),
        pickupType: v.pickupType,
        address: v.pickupType === "DELIVERY" ? v.address : null,
        memo: v.memo || null,
        totalPrice,
        items: { create: items },
      },
    });
  });

  revalidateAll();
  return { ok: true, data: { orderId: order.id } };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  const parsed = orderStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "잘못된 상태입니다" };

  await prisma.order.update({ where: { id: orderId }, data: { status: parsed.data } });
  revalidateAll();
  return { ok: true };
}

export async function updateOrderMemo(orderId: string, memo: string): Promise<ActionResult> {
  await prisma.order.update({
    where: { id: orderId },
    data: { memo: memo.trim().slice(0, 500) || null },
  });
  revalidateAll();
  return { ok: true };
}
