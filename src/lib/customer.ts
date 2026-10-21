export type CustomerTier = "VIP" | "단골" | "신규" | null;

/** 취소 제외 주문 수와 등록일로 고객 등급을 정한다 */
export function customerTier(orderCount: number, createdAt: Date | string): CustomerTier {
  if (orderCount >= 8) return "VIP";
  if (orderCount >= 4) return "단골";
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  if (days <= 30) return "신규";
  return null;
}

export const TIER_CLASS: Record<Exclude<CustomerTier, null>, string> = {
  VIP: "bg-gradient-to-r from-amber-400 to-orange-400 text-white",
  단골: "bg-accent text-accent-foreground",
  신규: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

export function avatarColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
