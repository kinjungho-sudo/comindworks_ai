import { env } from "@/lib/env";
import { getSettings } from "@/lib/db";
import { getTerms, sttHint } from "@/lib/glossary";
import { bad } from "@/lib/http";
import { isLang } from "@/lib/langs";

// 실시간 연결이 안 될 때 쓰는 예비 경로: 녹음 파일을 한 번에 받아쓴다.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  const lang = form?.get("lang");
  if (!(file instanceof Blob) || !isLang(lang)) return bad("audio, lang 이 필요합니다.");
  if (file.size > 12 * 1024 * 1024) return bad("녹음이 너무 깁니다.", 413);
  const [settings, terms] = await Promise.all([getSettings(), getTerms()]);
  const fd = new FormData();
  fd.append("file", file, "speech.wav");
  fd.append("model", env.sttFallbackModel);
  fd.append("language", lang);
  fd.append("prompt", sttHint(terms, lang, settings.hospital_name));
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.openaiKey}` }, body: fd });
  if (!r.ok) return bad(`받아쓰기 실패 (${r.status})`, 502);
  const j = await r.json();
  return Response.json({ text: String(j.text ?? "").trim() });
}
