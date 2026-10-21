import { avatarColor, TIER_CLASS, type CustomerTier } from "@/lib/customer";
import { cn } from "@/lib/utils";

export function CustomerAvatar({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        avatarColor(seed ?? name),
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-16 text-xl",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function TierBadge({ tier, className }: { tier: CustomerTier; className?: string }) {
  if (!tier) return null;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold", TIER_CLASS[tier], className)}>
      {tier === "VIP" ? "👑 VIP" : tier}
    </span>
  );
}
