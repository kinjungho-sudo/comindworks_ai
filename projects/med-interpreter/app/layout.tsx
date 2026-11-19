import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediBridge 안내데스크 통역",
  description: "병원 안내데스크용 양방향 실시간 통역",
  appleWebApp: { capable: true, title: "MediBridge", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false,
  themeColor: "#f4f7f8", viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
