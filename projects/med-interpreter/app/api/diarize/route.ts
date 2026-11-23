import { env } from "@/lib/env";
import { bad } from "@/lib/http";

// 겹친 말 복원: 마이크 하나에 두 사람이 동시에 말한 발화를 화자별로 다시 받아쓴다.
// 실시간 받아쓰기는 겹친 소리에서 한 사람 말을 버리는 경우가 있어, 발화 녹음을 한 번 더 확인한다.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob)) return bad("audio 가 필요합니다.");
  if (file.size > 20 * 1024 * 1024) return bad("녹음이 너무 깁니다.", 413);
  const fd = new FormData();
  fd.append("file", file, "turn.wav");
  fd.append("model", env.diarizeModel);
  fd.append("response_format", "diarized_json");
  fd.append("chunking_strategy", "auto");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.openaiKey}` }, body: fd });
  if (!r.ok) return bad(`화자 분리 실패 (${r.status})`, 502);
  const j = await r.json() as { segments?: { speaker?: string; text?: string; start?: number; end?: number }[] };
  return Response.json({ segments: (j.segments ?? []).map((s) => ({ speaker: s.speaker ?? "?", text: String(s.text ?? "").trim(), start: s.start ?? 0, end: s.end ?? 0 })).filter((s) => s.text) });
}
