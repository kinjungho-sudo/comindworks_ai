import { db, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, phrases] = await Promise.all([
    getSettings(),
    db().from("medi_phrases").select("id,category,sort,ko,en,zh,ja,ru,vi").order("sort").order("created_at"),
  ]);
  return Response.json({ settings, phrases: phrases.data ?? [] });
}
