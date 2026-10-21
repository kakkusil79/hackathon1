import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

export const ORDER_STATUSES = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELED",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "제작중",
  READY: "준비완료",
  COMPLETED: "수령완료",
  CANCELED: "취소",
};

export const STATUS_CLASS: Record<OrderStatus, string> = {
  RECEIVED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  READY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  COMPLETED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  CANCELED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
};

/** 칸반에서 "다음 단계" 버튼이 이동시킬 상태 */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: "IN_PROGRESS",
  IN_PROGRESS: "READY",
  READY: "COMPLETED",
};

export const PICKUP_LABEL: Record<PickupType, string> = {
  PICKUP: "매장 픽업",
  DELIVERY: "배송",
};
