"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, ClipboardList, Package, PhoneIncoming, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "주문 입력", icon: PhoneIncoming },
  { href: "/orders", label: "주문 현황", icon: ClipboardList },
  { href: "/customers", label: "고객", icon: Users },
  { href: "/products", label: "상품", icon: Package },
  { href: "/dashboard", label: "대시보드", icon: BarChart3 },
];

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/" className="shrink-0 text-lg font-bold">
            🍡 떡주문관리
          </Link>
          {/* 동적 라우트에서 usePathname은 런타임 값이므로 Suspense로 감싼다 */}
          <Suspense fallback={<TopLinks pathname={null} />}>
            <ActiveLinks variant="top" />
          </Suspense>
        </div>
      </header>
      {/* 휴대폰: 엄지로 누르기 쉬운 하단 탭바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <Suspense fallback={<BottomLinks pathname={null} />}>
          <ActiveLinks variant="bottom" />
        </Suspense>
      </nav>
    </>
  );
}

function ActiveLinks({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  return variant === "top" ? <TopLinks pathname={pathname} /> : <BottomLinks pathname={pathname} />;
}

function TopLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="hidden gap-1 md:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
            isActive(pathname, link.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function BottomLinks({ pathname }: { pathname: string | null }) {
  return (
    <div className="grid h-16 grid-cols-5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
