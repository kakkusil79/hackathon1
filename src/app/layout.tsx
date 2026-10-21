import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-muted/40">
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
