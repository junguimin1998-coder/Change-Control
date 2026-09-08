import type { Metadata } from "next";
import Providers from "@/components/Providers";
import TopNav from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "변경관리 시스템",
  description: "변경관리 신청/평가/계획/완료보고 워크플로우",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
