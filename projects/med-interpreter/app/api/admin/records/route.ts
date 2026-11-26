import { db, getSettings } from "@/lib/db";
import { bad } from "@/lib/http";
import { UUID } from "@/lib/records";

export const dynamic = "force-dynamic";

// ?id= 가 있으면 대화 한 건의 메시지, 없으면 목록과 통계
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    if (!UUID.test(id)) return bad("id 형식 오류");
    const [s, m] = await Promise.all([
      db().from("medi_sessions").select("*").eq("id", id).maybeSingle(),
      db().from("medi_messages").select("id,speaker,kind,src_lang,src_text,tgt_lang,tgt_text,created_at").eq("session_id", id).order("created_at"),
    ]);
    if (!s.data) return bad("없는 대화입니다.", 404);
    return Response.json({ session: s.data, messages: m.data ?? [] });
  }
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [list, recent, settings] = await Promise.all([
    db().from("medi_sessions").select("id,guest_lang,consent,started_at,ended_at,message_count").eq("consent", true).order("started_at", { ascending: false }).limit(300),
    db().from("medi_sessions").select("guest_lang,consent,started_at").gte("started_at", since).limit(5000),
    getSettings(),
  ]);
  const byLang: Record<string, number> = {};
  for (const r of recent.data ?? []) byLang[r.guest_lang] = (byLang[r.guest_lang] ?? 0) + 1;
  return Response.json({
    sessions: list.data ?? [],
    stats: { total30: recent.data?.length ?? 0, consented30: (recent.data ?? []).filter((r) => r.consent).length, byLang },
    retentionDays: settings.retention_days,
  });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return bad("id 가 필요합니다.");
  await db().from("medi_sessions").delete().eq("id", id);
  return Response.json({ ok: true });
}
