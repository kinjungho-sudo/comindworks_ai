import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "병원 블로그·SNS 스튜디오",
  description: "병원 블로그·SNS 발행 전 점검·승인·심의 기록, 시술가 시세 (맥미니 로컬 전용)",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="font-bold">병원 블로그·SNS 스튜디오</Link>
            <span className="tag tag-mute">로컬 전용</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
