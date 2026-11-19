import { bad, readJSON } from "@/lib/http";
import { isLang } from "@/lib/langs";
import { saveMessage } from "@/lib/records";

// 번역 API 를 거치지 않는 메시지(자주 쓰는 문장, 손님 빠른 답변) 저장
export async function POST(req: Request) {
  const b = await readJSON<{ sessionId?: string; speaker?: string; srcLang?: string; srcText?: string; tgtLang?: string; tgtText?: string }>(req);
  if (!b?.sessionId || !isLang(b.srcLang) || !isLang(b.tgtLang)) return bad("필수값이 없습니다.");
  const saved = await saveMessage({
    sessionId: b.sessionId, speaker: b.speaker === "guest" ? "guest" : "staff", kind: "phrase",
    srcLang: b.srcLang, srcText: String(b.srcText ?? ""), tgtLang: b.tgtLang, tgtText: String(b.tgtText ?? ""),
  });
  return Response.json({ saved });
}
