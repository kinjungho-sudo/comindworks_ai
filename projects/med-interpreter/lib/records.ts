import "server-only";
import { db } from "./db";
import type { Lang } from "./langs";

export type NewMessage = {
  sessionId: string; speaker: "staff" | "guest"; kind: "speech" | "text" | "phrase";
  srcLang: Lang; srcText: string; tgtLang: Lang; tgtText: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 동의한 대화에만 저장한다. 동의 여부는 서버가 직접 확인한다.
export async function saveMessage(m: NewMessage): Promise<boolean> {
  if (!UUID.test(m.sessionId) || !m.srcText.trim() || !m.tgtText.trim()) return false;
  const { data: s } = await db().from("medi_sessions").select("id,consent,ended_at").eq("id", m.sessionId).maybeSingle();
  if (!s?.consent || s.ended_at) return false;
  const { error } = await db().from("medi_messages").insert({
    session_id: m.sessionId, speaker: m.speaker, kind: m.kind,
    src_lang: m.srcLang, src_text: m.srcText.slice(0, 4000), tgt_lang: m.tgtLang, tgt_text: m.tgtText.slice(0, 4000),
  });
  if (error) { console.error("saveMessage", error.message); return false; }
  const { count } = await db().from("medi_messages").select("id", { count: "exact", head: true }).eq("session_id", m.sessionId);
  await db().from("medi_sessions").update({ message_count: count ?? 0 }).eq("id", m.sessionId);
  return true;
}
export { UUID };
