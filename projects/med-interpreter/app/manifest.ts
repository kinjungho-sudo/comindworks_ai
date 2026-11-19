import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MediBridge 안내데스크 통역",
    short_name: "MediBridge",
    description: "병원 안내데스크용 양방향 실시간 통역",
    start_url: "/",
    display: "fullscreen",
    orientation: "portrait",
    background_color: "#f4f7f8",
    theme_color: "#f4f7f8",
    icons: [
      { src: "/brand.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
