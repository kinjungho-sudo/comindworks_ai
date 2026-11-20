import { db, getSettings } from "@/lib/db";
import { ALL_LANGS } from "@/lib/langs";

export const dynamic = "force-dynamic";

// 등록된 기기에만: 설정, 자주 쓰는 문장, 화면끼리 잇는 실시간 채널 정보(공개 키)
export async function GET() {
  const [settings, phrases] = await Promise.all([
    getSettings(),
    db().from("medi_phrases").select(["id", "category", "sort", ...ALL_LANGS].join(",")).order("sort").order("created_at"),
  ]);
  return Response.json({
    settings,
    phrases: phrases.data ?? [],
    realtime: { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY ?? "" },
  });
}
