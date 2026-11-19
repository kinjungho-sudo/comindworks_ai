import { env } from "@/lib/env";
import { getSettings } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";
import { LANG_META, isLang } from "@/lib/langs";

// 24kHz 16bit mono PCM 을 그대로 흘려보낸다. 브라우저가 받는 즉시 재생한다.
export async function POST(req: Request) {
  const b = await readJSON<{ text?: string; lang?: string }>(req);
  const text = String(b?.text ?? "").trim().slice(0, 1500);
  if (!text || !isLang(b?.lang)) return bad("text, lang 이 필요합니다.");
  const s = await getSettings();
  const lang = LANG_META[b.lang].english;
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.ttsModel,
      voice: b.lang === "ko" ? "cedar" : "marin",
      input: text,
      response_format: "pcm",
      instructions: `Speak in ${lang} as a calm, kind and professional hospital receptionist. Clear articulation${s.slow_speech ? ", at a noticeably slow and patient pace, with short pauses between sentences" : ", at a relaxed, natural pace"}. Pronounce numbers and floor numbers clearly.`,
    }),
    signal: req.signal,
  });
  if (!r.ok || !r.body) return bad(`음성 생성 실패 (${r.status})`, 502);
  return new Response(r.body, { headers: { "Content-Type": "audio/pcm", "Cache-Control": "no-store" } });
}
