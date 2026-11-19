// 홈페이지 리뷰 배지 설정 (병원 폴더 data/review_badge.json). 원문 리뷰는 다루지 않는다.
import path from "node:path";
import { getClinic, handle, HttpError, readJson, writeJson } from "@/lib/server/core";
import { type Badge, badgeSnippet, EMPTY_BADGE, validateBadge } from "@/lib/shared/badge";

type Ctx = { params: Promise<{ id: string }> };
const file = (dir: string) => path.join(dir, "data", "review_badge.json");

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const b = readJson<Badge>(file(getClinic(id).dir), EMPTY_BADGE);
  return Response.json({ badge: b, snippet: badgeSnippet(b) });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const dir = getClinic(id).dir;
  const b = (await req.json()) as Badge;
  const errs = validateBadge(b);
  if (errs.length) throw new HttpError(400, errs.join(" / "));
  if (b.confirmed.done && !b.confirmed.by?.trim()) throw new HttpError(400, "누가 확인했는지(심의기구·변호사 등) 적어 주세요");
  writeJson(file(dir), b);
  return Response.json({ badge: b, snippet: badgeSnippet(b) });
});
