"use server";

import { revalidateAll, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { customerSchema, productSchema } from "@/lib/validations";

export type ProductInput = { name: string; category?: string; unit: string; price: number };

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const exists = await prisma.product.findUnique({ where: { name: parsed.data.name } });
  if (exists) return { ok: false, error: "같은 이름의 상품이 이미 있어요" };

  await prisma.product.create({
    data: { ...parsed.data, category: parsed.data.category || null },
  });
  revalidateAll();
  return { ok: true };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const dup = await prisma.product.findFirst({
    where: { name: parsed.data.name, NOT: { id } },
  });
  if (dup) return { ok: false, error: "같은 이름의 상품이 이미 있어요" };

  await prisma.product.update({
    where: { id },
    data: { ...parsed.data, category: parsed.data.category || null },
  });
  revalidateAll();
  return { ok: true };
}

export async function setProductActive(id: string, isActive: boolean): Promise<ActionResult> {
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidateAll();
  return { ok: true };
}

export async function updateCustomer(
  id: string,
  input: { name: string; memo?: string },
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.customer.update({
    where: { id },
    data: { name: parsed.data.name, memo: parsed.data.memo || null },
  });
  revalidateAll();
  return { ok: true };
}
