"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, ClipboardList, Package, PhoneIncoming, Plus, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

const LINKS: NavItem[] = [
  { href: "/", label: "주문 입력", short: "주문", icon: PhoneIncoming },
  { href: "/orders", label: "주문 현황", short: "현황", icon: ClipboardList },
  { href: "/customers", label: "고객", short: "고객", icon: Users },
  { href: "/products", label: "상품", short: "상품", icon: Package },
  { href: "/dashboard", label: "대시보드", short: "통계", icon: BarChart3 },
];

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.58_0.14_40)] text-lg shadow-soft">
        🍡
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight">떡주문관리</span>
        {!compact && <span className="block text-[11px] text-muted-foreground">우리 떡집 주문·고객 노트</span>}
      </span>
    </Link>
  );
}

/** usePathname은 런타임 값이므로 Suspense 안에서만 읽는다 */
function WithPathname({ render }: { render: (pathname: string | null) => React.ReactNode }) {
  return (
    <Suspense fallback={render(null)}>
      <PathnameReader render={render} />
    </Suspense>
  );
}

function PathnameReader({ render }: { render: (pathname: string | null) => React.ReactNode }) {
  return render(usePathname());
}

export function Nav() {
  return (
    <>
      {/* 데스크톱: 왼쪽 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-sidebar px-4 py-5 md:flex">
        <Logo />
        <Link
          href="/"
          className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="size-4" /> 새 주문 받기
        </Link>
        <WithPathname
          render={(pathname) => (
            <nav className="mt-6 flex flex-col gap-1">
              {LINKS.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active && "stroke-[2.4]")} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        />
        <p className="mt-auto rounded-xl bg-muted px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          모든 고객·주문 정보는 시연용 가상 데이터입니다.
        </p>
      </aside>

      {/* 휴대폰: 상단 바 */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/85 px-4 backdrop-blur-lg md:hidden">
        <Logo compact />
      </header>

      {/* 휴대폰: 하단 탭바 (가운데 주문 버튼 강조) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <WithPathname
          render={(pathname) => {
            const [order, ...rest] = LINKS;
            const slots = [rest[0], rest[1], order, rest[2], rest[3]];
            return (
              <div className="grid h-16 grid-cols-5">
                {slots.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  if (item.href === "/") {
                    return (
                      <Link key={item.href} href="/" className="flex flex-col items-center justify-end pb-1.5">
                        <span
                          className={cn(
                            "-mt-6 mb-1 flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.58_0.14_40)] text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition active:scale-95",
                          )}
                        >
                          <Plus className="size-6 stroke-[2.5]" />
                        </span>
                        <span className={cn("text-[11px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                          {item.short}
                        </span>
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className={cn("size-[22px]", active && "stroke-[2.4]")} />
                      {item.short}
                    </Link>
                  );
                })}
              </div>
            );
          }}
        />
      </nav>
    </>
  );
}
