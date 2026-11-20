import type { NextConfig } from "next";

// 시술가 시세 앱 (Vercel 배포, 로그인 필수). 데이터는 맥미니 조사 결과를 data/에 묶어 함께 배포한다.
const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/**": ["./data/**/*.json"] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ] }];
  },
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
