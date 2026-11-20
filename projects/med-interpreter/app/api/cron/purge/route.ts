import { env } from "@/lib/env";
import { purgeExpired } from "@/lib/db";

// Vercel Cron 이 매일 호출한다. 보관기간이 지난 대화 기록을 삭제한다.
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) return new Response("forbidden", { status: 403 });
  const deleted = await purgeExpired();
  return Response.json({ deleted });
}
