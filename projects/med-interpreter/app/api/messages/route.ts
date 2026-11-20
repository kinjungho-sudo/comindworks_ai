import { bad, readJSON } from "@/lib/http";
import { isLang } from "@/lib/langs";
import { saveMessage } from "@/lib/records";

type Item = { speaker?: string; kind?: string; srcLang?: string; srcText?: string; tgtLang?: string; tgtText?: string };

// 번역 API 를 거치지 않은 메시지(자주 쓰는 문장)나, 동의 직후 그 전까지의 대화를 저장한다.
export async function POST(req: Request) {
  const b = await readJSON<{ sessionId?: string; items?: Item[] } & Item>(req);
  if (!b?.sessionId) return bad("sessionId 가 필요합니다.");
  const items = (b.items ?? [b]).slice(0, 200);
  let saved = 0;
  for (const it of items) {
    if (!isLang(it.srcLang) || !isLang(it.tgtLang)) continue;
    const ok = await saveMessage({
      sessionId: b.sessionId, speaker: it.speaker === "guest" ? "guest" : "staff",
      kind: it.kind === "phrase" ? "phrase" : it.kind === "text" ? "text" : "speech",
      srcLang: it.srcLang, srcText: String(it.srcText ?? ""), tgtLang: it.tgtLang, tgtText: String(it.tgtText ?? ""),
    });
    if (ok) saved++;
  }
  return Response.json({ saved });
}
