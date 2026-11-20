import { db } from "@/lib/db";
import { UUID } from "@/lib/records";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return new Response("bad id", { status: 400 });
  const { data } = await db().from("medi_cards").select("image").eq("id", id).maybeSingle();
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(data?.image ?? "");
  if (!m) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=600" } });
}
