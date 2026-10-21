import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/constants";

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^01\d{8,9}$/, "휴대폰 번호를 확인해 주세요"));

export const createOrderSchema = z.object({
  phone: phoneSchema,
  customerName: z.string().trim().min(1, "고객 이름을 입력해 주세요").max(30),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "상품을 하나 이상 담아 주세요"),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "픽업 날짜를 선택해 주세요"),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, "픽업 시간을 선택해 주세요"),
  pickupType: z.enum(["PICKUP", "DELIVERY"]),
  address: z.string().trim().max(200).optional(),
  memo: z.string().trim().max(500).optional(),
});
export type CreateOrderInput = z.input<typeof createOrderSchema>;

export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const productSchema = z.object({
  name: z.string().trim().min(1, "상품명을 입력해 주세요").max(30),
  category: z.string().trim().max(20).optional(),
  unit: z.string().trim().min(1, "단위를 입력해 주세요").max(10),
  price: z.coerce.number().int().min(0, "가격을 확인해 주세요"),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(30),
  memo: z.string().trim().max(500).optional(),
});
