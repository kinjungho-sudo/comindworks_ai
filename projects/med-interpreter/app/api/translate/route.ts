import { after } from "next/server";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/db";
import { getTerms, matchTerms } from "@/lib/glossary";
import { bad, readJSON } from "@/lib/http";
import { isLang } from "@/lib/langs";
import { interpreterPrompt, type Turn } from "@/lib/prompts";
import { saveMessage } from "@/lib/records";

type Body = {
  text?: string; from?: string; to?: string; speaker?: "staff" | "guest"; kind?: "speech" | "text";
  sessionId?: string | null; history?: Turn[];
};

// 번역문을 글자 단위로 흘려보낸다(text/plain 스트림). 끝나면 동의한 대화만 저장한다.
export async function POST(req: Request) {
  const b = await readJSON<Body>(req);
  const text = String(b?.text ?? "").trim().slice(0, 2000);
  if (!text || !isLang(b?.from) || !isLang(b?.to)) return bad("text, from, to 가 필요합니다.");
  const from = b.from, to = b.to;
  const speaker = b.speaker === "guest" ? "guest" : "staff";
  const [settings, terms] = await Promise.all([getSettings(), getTerms()]);
  const history = (Array.isArray(b.history) ? b.history : [])
    .filter((h) => h && typeof h.text === "string").slice(-6)
    .map((h) => ({ speaker: h.speaker === "guest" ? "guest" as const : "staff" as const, text: h.text.slice(0, 500) }));
  const system = interpreterPrompt({ hospital: settings.hospital_name, from, to, speaker, glossary: matchTerms(terms, text, from, to), history });

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.translateModel, stream: true,
      ...(env.translateModel.startsWith("gpt-5") ? { reasoning_effort: "none" } : { temperature: 0.2 }),
      messages: [{ role: "system", content: system }, { role: "user", content: text }],
    }),
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) return bad(`번역 실패 (${upstream.status})`, 502);

  let full = "";
  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const d = JSON.parse(data).choices?.[0]?.delta?.content;
              if (d) { full += d; controller.enqueue(enc.encode(d)); }
            } catch { /* 깨진 줄은 건너뜀 */ }
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() { reader.cancel().catch(() => {}); },
  });

  if (b.sessionId) {
    const sessionId = b.sessionId;
    after(async () => {
      const out = full.trim();
      if (out) await saveMessage({ sessionId, speaker, kind: b.kind === "text" ? "text" : "speech", srcLang: from, srcText: text, tgtLang: to, tgtText: out });
    });
  }
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
