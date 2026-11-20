import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = {
  title: "시술가 시세",
  description: "주변 피부과 강남언니 이벤트가 조사 결과 (내부 참고용)",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={noto.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
