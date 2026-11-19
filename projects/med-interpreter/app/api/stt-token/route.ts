import { env } from "@/lib/env";
import { getSettings } from "@/lib/db";
import { getTerms, sttHint } from "@/lib/glossary";
import { readJSON } from "@/lib/http";
import { isGuestLang, isLang } from "@/lib/langs";

// 브라우저가 OpenAI 실시간 받아쓰기에 직접 붙을 1회용 키(10분)를 만든다. 진짜 API 키는 서버에만 있다.
// lang 을 주면 그 언어로 고정, 없으면 언어 자동 인식. guestLang 은 용어 힌트에만 쓴다.
export async function POST(req: Request) {
  const body = await readJSON<{ lang?: string; guestLang?: string }>(req);
  const lang = isLang(body?.lang) ? body.lang : null;
  const [settings, terms] = await Promise.all([getSettings(), getTerms()]);
  let prompt = sttHint(terms, lang ?? "ko", settings.hospital_name);
  if (!lang && isGuestLang(body?.guestLang)) prompt = (prompt + " " + sttHint(terms, body.guestLang, settings.hospital_name)).slice(0, 1000);
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
            noise_reduction: { type: "far_field" },
            transcription: { model: env.sttModel, ...(lang ? { language: lang } : {}), prompt },
            turn_detection: null,
          },
        },
      },
    }),
  });
  if (!r.ok) return Response.json({ error: `받아쓰기 연결 실패 (${r.status})` }, { status: 502 });
  const j = await r.json();
  return Response.json({ key: j.value, expiresAt: j.expires_at });
}
