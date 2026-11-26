import { db } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";
import { UUID } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await db().from("medi_cards").select("id,title,keywords,sort,created_at").order("sort").order("created_at");
  if (error) return bad(error.message, 500);
  return Response.json({ items: data ?? [] });
}

// { id?, title, keywords, sort, image? (data:image/...;base64) }
export async function POST(req: Request) {
  const b = await readJSON<{ id?: string; title?: string; keywords?: string; sort?: number; image?: string }>(req);
  const title = String(b?.title ?? "").trim().slice(0, 80);
  if (!title) return bad("제목이 필요합니다.");
  const row: Record<string, unknown> = { title, keywords: String(b?.keywords ?? "").trim().slice(0, 300) || null, sort: Number(b?.sort) || 0 };
  if (b?.image) {
    if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(b.image)) return bad("그림 형식은 PNG·JPG·WEBP·SVG 만 됩니다.");
    if (b.image.length > 2_500_000) return bad("그림이 너무 큽니다 (최대 약 1.8MB).");
    row.image = b.image;
  }
  if (b?.id && UUID.test(b.id)) {
    const { error } = await db().from("medi_cards").update(row).eq("id", b.id);
    if (error) return bad(error.message, 500);
  } else {
    if (!row.image) return bad("그림을 올려 주세요.");
    const { error } = await db().from("medi_cards").insert(row);
    if (error) return bad(error.message, 500);
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return bad("id 가 필요합니다.");
  await db().from("medi_cards").delete().eq("id", id);
  return Response.json({ ok: true });
}
