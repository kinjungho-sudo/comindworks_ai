// 저장한 배지를 홈페이지 사이트 폴더의 data/review-badge.json으로 보낸다 (review_watch.json의 homepage_badge_files).
// 홈페이지 배포는 홈페이지 쪽 규칙(개발 → QA → 운영)을 따른다. 여기서는 파일만 쓴다.
import fs from "node:fs";
import path from "node:path";
import { getClinic, handle, HttpError, readJson } from "@/lib/server/core";
import { type Badge, EMPTY_BADGE, homepageJson } from "@/lib/shared/badge";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const dir = getClinic(id).dir;
  const cfg = readJson<{ homepage_badge_files?: string[] }>(path.join(dir, "review_watch.json"), {});
  const targets = cfg.homepage_badge_files ?? [];
  if (!targets.length) throw new HttpError(409, "review_watch.json에 homepage_badge_files(홈페이지 data/review-badge.json 경로)가 없습니다");
  const b = readJson<Badge>(path.join(dir, "data", "review_badge.json"), EMPTY_BADGE);
  const data = homepageJson(b);
  if (!data.channels.length) throw new HttpError(400, "보낼 채널이 없습니다. 장소 주소를 먼저 저장하세요");
  const written: string[] = [];
  for (const t of targets) {
    if (!path.isAbsolute(t) || path.basename(t) !== "review-badge.json") throw new HttpError(400, `허용되지 않은 경로: ${t}`);
    if (!fs.existsSync(path.dirname(t))) throw new HttpError(404, `폴더가 없습니다: ${path.dirname(t)}`);
    fs.writeFileSync(t, JSON.stringify(data, null, 2) + "\n", "utf-8");
    written.push(t);
  }
  return Response.json({ written, confirmed: data.confirmed, channels: data.channels.length });
});
