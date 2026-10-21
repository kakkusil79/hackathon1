import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// 한국어 UI에 가장 널리 쓰이는 Pretendard (가변 폰트, 로컬 번들)
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-sans",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "떡주문관리",
  description: "우리 떡집 주문·고객 관리",
};

export const viewport: Viewport = {
  // 아이폰 하단 홈 바 영역까지 고려해 하단 탭바 여백을 계산한다
  viewportFit: "cover",
  themeColor: "#fbf8f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <Nav />
        <div className="md:pl-60">
          <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
            {children}
          </main>
        </div>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
