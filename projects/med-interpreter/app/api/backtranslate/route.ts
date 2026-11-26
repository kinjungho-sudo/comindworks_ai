import { env } from "@/lib/env";
import { bad, readJSON } from "@/lib/http";
import { LANG_META, isLang } from "@/lib/langs";
import { chatJSON } from "@/lib/openai";

// 역번역: 손님에게 나간 통역문을 다시 한국어로 직역하고, 원래 한국어와 핵심 사실(숫자·시간·장소·약·부정)이 달라졌는지 판단한다.
export async function POST(req: Request) {
  const b = await readJSON<{ text?: string; from?: string; original?: string }>(req);
  const text = String(b?.text ?? "").trim().slice(0, 2000);
  const original = String(b?.original ?? "").trim().slice(0, 2000);
  if (!text || !isLang(b?.from)) return bad("text, from 이 필요합니다.");
  try {
    const out = await chatJSON<{ back?: string; ok?: boolean; issue?: string }>(
      `You check a medical interpretation. 1) Translate the ${LANG_META[b.from].english} text back into Korean as literally as possible (do not fix it). 2) Compare it with the original Korean${original ? "" : " (if given)"}: ok=false ONLY if a key fact differs — a number, time, date, place/floor, drug, dose, body part, yes/no or negation, or a missing instruction. Wording differences are fine. If ok=false, explain the difference in one short Korean sentence in "issue".
Return JSON {"back": "...", "ok": true|false, "issue": "..."}`,
      { original, interpretation: text },
      env.backModel,
    );
    return Response.json({ text: String(out.back ?? "").trim(), ok: out.ok !== false, issue: out.issue ?? "" });
  } catch (e) {
    return bad(`역번역 실패: ${(e as Error).message}`, 502);
  }
}
