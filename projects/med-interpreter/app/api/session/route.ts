import { after } from "next/server";
import { db, purgeExpired } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";
import { isGuestLang } from "@/lib/langs";
import { UUID } from "@/lib/records";

// 대화 시작: 손님 언어와 기록 동의 여부를 남긴다. 시작할 때마다 보관기간 지난 기록을 정리한다.
export async function POST(req: Request) {
  const b = await readJSON<{ guestLang?: string; consent?: boolean }>(req);
  if (!isGuestLang(b?.guestLang)) return bad("guestLang 이 필요합니다.");
  const consent = b.consent === true;
  const { data, error } = await db().from("medi_sessions")
    .insert({ guest_lang: b.guestLang, consent, consent_at: consent ? new Date().toISOString() : null })
    .select("id").single();
  if (error) return bad("대화를 시작하지 못했습니다.", 500);
  after(() => purgeExpired().catch(() => 0));
  return Response.json({ id: data.id, consent });
}

// 대화 종료 또는 손님 언어 변경
export async function PATCH(req: Request) {
  const b = await readJSON<{ id?: string; end?: boolean; guestLang?: string }>(req);
  if (!b?.id || !UUID.test(b.id)) return bad("id 가 필요합니다.");
  const patch: Record<string, unknown> = {};
  if (b.end) patch.ended_at = new Date().toISOString();
  if (isGuestLang(b.guestLang)) patch.guest_lang = b.guestLang;
  if (!Object.keys(patch).length) return bad("바꿀 내용이 없습니다.");
  await db().from("medi_sessions").update(patch).eq("id", b.id).is("ended_at", null);
  // 메시지가 하나도 없는 미동의 대화는 남길 이유가 없다.
  if (b.end) await db().from("medi_sessions").delete().eq("id", b.id).eq("consent", false);
  return Response.json({ ok: true });
}
