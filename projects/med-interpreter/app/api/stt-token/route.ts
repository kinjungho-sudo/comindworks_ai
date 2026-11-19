import { env } from "@/lib/env";
import { getSettings } from "@/lib/db";
import { getTerms, sttHint } from "@/lib/glossary";
import { bad, readJSON } from "@/lib/http";
import { isLang } from "@/lib/langs";

// 브라우저가 OpenAI 실시간 받아쓰기에 직접 붙을 수 있는 1회용 키를 만든다. 진짜 API 키는 서버에만 있다.
export async function POST(req: Request) {
  const body = await readJSON<{ lang?: string }>(req);
  if (!isLang(body?.lang)) return bad("lang 이 필요합니다.");
  const [settings, terms] = await Promise.all([getSettings(), getTerms()]);
  const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "transcription",
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            noise_reduction: { type: "near_field" },
            transcription: { model: env.sttModel, language: body.lang, prompt: sttHint(terms, body.lang, settings.hospital_name) },
            turn_detection: null,
          },
        },
      },
    }),
  });
  if (!r.ok) return bad(`받아쓰기 연결 실패 (${r.status})`, 502);
  const j = await r.json();
  return Response.json({ key: j.value, expiresAt: j.expires_at });
}
