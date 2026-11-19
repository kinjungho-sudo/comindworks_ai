// 배지 HTML 조각만 내려받기 (홈페이지 관리자 화면에 붙여 넣을 것)
import path from "node:path";
import { getClinic, handle, HttpError, readJson } from "@/lib/server/core";
import { type Badge, badgeSnippet, EMPTY_BADGE } from "@/lib/shared/badge";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const b = readJson<Badge>(path.join(getClinic(id).dir, "data", "review_badge.json"), EMPTY_BADGE);
  if (!b.confirmed.done) throw new HttpError(409, "심의기구·법률 확인 전에는 내려받을 수 없습니다 (화면 미리보기만 가능)");
  const html = badgeSnippet(b);
  if (!html) throw new HttpError(404, "표시할 채널이 없습니다");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="review-badge-${b.asOf}.html"` },
  });
});
