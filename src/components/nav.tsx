"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "주문 입력" },
  { href: "/orders", label: "주문 현황" },
  { href: "/customers", label: "고객" },
  { href: "/products", label: "상품" },
  { href: "/dashboard", label: "대시보드" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold">
          🍡 떡주문관리
        </Link>
        {/* 동적 라우트에서 usePathname은 런타임 값이므로 Suspense로 감싼다 */}
        <Suspense fallback={<NavLinks pathname={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
    </header>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="-mx-2 flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active =
          pathname !== null && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
