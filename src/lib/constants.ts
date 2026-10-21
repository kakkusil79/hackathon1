import type { OrderStatus, PickupType } from "@/generated/prisma/enums";

export const ORDER_STATUSES = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELED",
] as const satisfies readonly OrderStatus[];

/** 진행 단계 (취소 제외) */
export const STATUS_FLOW: OrderStatus[] = ["RECEIVED", "IN_PROGRESS", "READY", "COMPLETED"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "제작중",
  READY: "준비완료",
  COMPLETED: "수령완료",
  CANCELED: "취소",
};

/** 상태 배지(옅은 배경 + 진한 글자) */
export const STATUS_CLASS: Record<OrderStatus, string> = {
  RECEIVED: "bg-sky-50 text-sky-800 ring-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 ring-amber-200",
  READY: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  COMPLETED: "bg-stone-100 text-stone-600 ring-stone-200",
  CANCELED: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** 상태 점 색 */
export const STATUS_DOT: Record<OrderStatus, string> = {
  RECEIVED: "bg-sky-500",
  IN_PROGRESS: "bg-amber-500",
  READY: "bg-emerald-500",
  COMPLETED: "bg-stone-400",
  CANCELED: "bg-rose-500",
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

const CATEGORY_EMOJI: Record<string, string> = {
  답례떡: "🎁",
  "돌·백일떡": "🌈",
  "명절·제사떡": "🌕",
  일반떡: "🍡",
};

export function categoryEmoji(category: string | null | undefined) {
  return (category && CATEGORY_EMOJI[category]) ?? "🍡";
}

/** 주문 메모 빠른 입력 */
export const QUICK_MEMOS = ["개별 포장", "스티커 부착", "계좌이체 완료", "현장 결제", "덜 달게", "오전 일찍"];

/** 픽업 시간 빠른 선택 */
export const QUICK_TIMES = ["09:00", "10:00", "11:00", "13:00", "15:00", "17:00"];
