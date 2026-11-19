import { handle } from "@/lib/server/core";
import { listPosts } from "@/lib/server/posts";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  return Response.json(listPosts(id));
});
