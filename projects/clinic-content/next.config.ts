import type { NextConfig } from "next";

// 맥미니 로컬 전용 도구. 파일 시스템과 파이썬 엔진을 직접 쓰므로 정적 생성·캐시를 쓰지 않는다.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
