import { after } from "next/server";
import { db, purgeExpired } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";
import { isGuestLang } from "@/lib/langs";
import { UUID } from "@/lib/records";

// 대화 시작. 화면(브라우저)이 정한 id 로 만든다(데스크·손님 화면이 같은 id 를 공유). 처음엔 저장 미동의.
export async function POST(req: Request) {
  const b = await readJSON<{ id?: string; guestLang?: string }>(req);
  if (!b?.id || !UUID.test(b.id)) return bad("id 가 필요합니다.");
  const guestLang = isGuestLang(b.guestLang) ? b.guestLang : "en";
  const { error } = await db().from("medi_sessions").upsert({ id: b.id, guest_lang: guestLang }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return bad("대화를 시작하지 못했습니다.", 500);
  after(() => purgeExpired().catch(() => 0));
  return Response.json({ id: b.id });
}

// 저장 동의 / 손님 언어 변경 / 대화 종료
export async function PATCH(req: Request) {
  const b = await readJSON<{ id?: string; end?: boolean; guestLang?: string; consent?: boolean }>(req);
  if (!b?.id || !UUID.test(b.id)) return bad("id 가 필요합니다.");
  const patch: Record<string, unknown> = {};
  if (b.end) patch.ended_at = new Date().toISOString();
  if (isGuestLang(b.guestLang)) patch.guest_lang = b.guestLang;
  if (b.consent === true) { patch.consent = true; patch.consent_at = new Date().toISOString(); }
  if (b.consent === false) patch.consent = false;
  if (!Object.keys(patch).length) return bad("바꿀 내용이 없습니다.");
  await db().from("medi_sessions").update(patch).eq("id", b.id).is("ended_at", null);
  if (b.consent === false) await db().from("medi_messages").delete().eq("session_id", b.id);
  // 동의하지 않은 대화는 끝나면 남길 이유가 없다(언어 통계는 남긴다).
  if (b.end) await db().from("medi_sessions").update({ message_count: 0 }).eq("id", b.id).eq("consent", false);
  return Response.json({ ok: true });
}
