// ② 새 리뷰 가져오기 → 미리보기 (저장은 사람이 확인 후 /reviews POST)
import { getClinic, handle } from "@/lib/server/core";
import { fetchFromSmartPlace } from "@/lib/server/naver";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  return Response.json(await fetchFromSmartPlace(id, getClinic(id).dir));
});
