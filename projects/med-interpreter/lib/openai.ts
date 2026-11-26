import "server-only";
import { env } from "./env";

export async function openai(path: string, body: unknown, init?: { signal?: AbortSignal }) {
  return fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: init?.signal,
  });
}

// 비스트리밍 JSON 응답 (관리자 자동 채우기 등)
export async function chatJSON<T>(system: string, user: unknown, model = env.translateModel): Promise<T> {
  const r = await openai("/chat/completions", {
    model,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: typeof user === "string" ? user : JSON.stringify(user) }],
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content) as T;
}
