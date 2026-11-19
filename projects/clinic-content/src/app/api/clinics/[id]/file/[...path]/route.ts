// 병원 폴더의 보고서·대조표·미리보기 파일 보기 (output/·docs/reviews/ 안만, 읽기 전용)
import fs from "node:fs";
import path from "node:path";
import { getClinic, handle, HttpError, safeJoin } from "@/lib/server/core";

type Ctx = { params: Promise<{ id: string; path: string[] }> };
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json",
};

// 주소 예: /api/clinics/vands-busan/file/output/2026-11-30_x/naver/preview.html (상대 경로 그림도 그대로 열림)
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id, path: parts } = await params;
  const rel = parts.map(decodeURIComponent).join("/");
  if (!/^(output|docs\/reviews)\//.test(rel)) throw new HttpError(403, "output/·docs/reviews/ 안의 파일만 볼 수 있습니다");
  const clinic = getClinic(id);
  const full = safeJoin(clinic.dir, rel);
  const inside = [path.join(clinic.dir, "output"), path.join(clinic.dir, "docs", "reviews")].some((d) => full.startsWith(d + path.sep));
  if (!inside) throw new HttpError(403, "output/·docs/reviews/ 안의 파일만 볼 수 있습니다");
  const type = TYPES[path.extname(full).toLowerCase()];
  if (!type) throw new HttpError(415, "볼 수 없는 파일 형식");
  if (!fs.existsSync(full)) throw new HttpError(404, "파일이 없습니다");
  return new Response(fs.readFileSync(full), {
    headers: { "content-type": type, "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
});
