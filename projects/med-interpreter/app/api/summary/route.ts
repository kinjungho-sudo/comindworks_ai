import { db, getSettings } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";
import { chatJSON } from "@/lib/openai";
import { UUID } from "@/lib/records";

type Line = { speaker: "staff" | "guest"; ko: string; lang?: string };

// 대화 요약: 진료실·간호사에게 넘길 한국어 요약. 저장 동의한 대화면 기록에도 남긴다.
export async function POST(req: Request) {
  const b = await readJSON<{ sessionId?: string; guestLang?: string; lines?: Line[] }>(req);
  const lines = (b?.lines ?? []).filter((l) => l && typeof l.ko === "string" && l.ko.trim()).slice(-80);
  if (!lines.length) return bad("요약할 대화가 없습니다.");
  const s = await getSettings();
  const convo = lines.map((l) => `${l.speaker === "staff" ? "직원" : "손님"}: ${l.ko}`).join("\n");
  let out: { purpose?: string; symptoms?: string; guided?: string; followup?: string; oneLine?: string };
  try {
    out = await chatJSON(
      `너는 ${s.hospital_name} 안내데스크의 기록 담당이다. 외국인 손님과 직원의 통역 대화(한국어 번역본)를 읽고, 진료실·간호사에게 넘길 짧은 한국어 요약을 만든다.
대화에 나온 사실만 쓰고 추측하지 않는다. 없는 항목은 "없음".
JSON: {"oneLine": "한 줄 요약", "purpose": "방문 목적·요청", "symptoms": "증상·불편 (언제부터, 정도)", "guided": "직원이 안내한 내용", "followup": "확인·후속 조치 필요 사항"}`,
      `손님 언어: ${b?.guestLang ?? "?"}\n\n${convo}`,
    );
  } catch (e) { return bad(`요약 실패: ${(e as Error).message}`, 502); }
  const text = [
    `■ 요약: ${out.oneLine ?? ""}`, `■ 방문 목적: ${out.purpose ?? "없음"}`, `■ 증상·불편: ${out.symptoms ?? "없음"}`,
    `■ 안내한 내용: ${out.guided ?? "없음"}`, `■ 확인 필요: ${out.followup ?? "없음"}`,
  ].join("\n");
  if (b?.sessionId && UUID.test(b.sessionId)) await db().from("medi_sessions").update({ summary: text }).eq("id", b.sessionId).eq("consent", true);
  return Response.json({ summary: text });
}
