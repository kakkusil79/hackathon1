import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSans = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "떡주문관리",
  description: "우리 떡집 주문·고객 관리",
};

export const viewport: Viewport = {
  // 아이폰 하단 홈 바 영역까지 고려해 하단 탭바 여백을 계산한다
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-6">
          {children}
        </main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
