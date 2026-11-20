import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "시술가 시세",
  description: "주변 피부과 강남언니 이벤트가 조사 결과 (내부 참고용, 로그인 필요)",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
