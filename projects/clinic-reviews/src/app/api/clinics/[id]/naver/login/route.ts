// 맥미니에 네이버 로그인 창 띄우기 (사람이 직접 로그인)
import { getClinic, handle } from "@/lib/server/core";
import { naverStatus, openLoginWindow } from "@/lib/server/naver";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = getClinic(id);
  openLoginWindow(id, c.dir);
  return Response.json(naverStatus(id, c.dir));
});
