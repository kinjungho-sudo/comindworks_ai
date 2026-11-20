import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://medibridge-desk.vercel.app";
const TITLE = "MediBridge — 병원 안내데스크 실시간 통역";
const DESC = "말하면 바로 통역됩니다. 한국어 ↔ 영어·중국어·일본어 등 10개 언어, 버튼 없이 자동으로 양방향 통역.";

// 카카오톡·문자·슬랙에 링크를 붙이면 opengraph-image.png 가 카드로 뜬다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  applicationName: "MediBridge",
  appleWebApp: { capable: true, title: "MediBridge", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "MediBridge", title: TITLE, description: DESC, url: SITE, locale: "ko_KR" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false,
  themeColor: "#ffffff", viewportFit: "cover",
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
