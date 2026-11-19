import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// 안내 자료 목록 (그림은 /api/cards/image 로 따로)
export async function GET() {
  const { data } = await db().from("medi_cards").select("id,title,keywords,sort").order("sort").order("created_at");
  return Response.json({ cards: data ?? [] });
}
