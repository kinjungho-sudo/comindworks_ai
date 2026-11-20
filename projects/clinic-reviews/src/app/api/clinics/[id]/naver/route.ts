// 네이버 리뷰 가져오기 상태·주소 설정
import { getClinic, handle, HttpError } from "@/lib/server/core";
import { naverStatus, setNaverUrl } from "@/lib/server/naver";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  return Response.json(naverStatus(id, getClinic(id).dir));
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { url } = (await req.json()) as { url?: string };
  if (!url) throw new HttpError(400, "주소가 비어 있습니다");
  const c = getClinic(id);
  setNaverUrl(c.dir, url);
  return Response.json(naverStatus(id, c.dir));
});
