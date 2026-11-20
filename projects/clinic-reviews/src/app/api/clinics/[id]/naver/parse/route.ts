// ① 붙여 넣은 네이버 리뷰 목록 → 미리보기
import { getClinic, handle, HttpError } from "@/lib/server/core";
import { parsePasted } from "@/lib/server/naver";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) throw new HttpError(400, "붙여 넣은 글이 없습니다");
  return Response.json({ items: parsePasted(getClinic(id).dir, text) });
});
