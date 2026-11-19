import { DEVICE_COOKIE, DEVICE_TTL, issue, safeEqual } from "@/lib/auth";
import { env } from "@/lib/env";
import { bad, readJSON } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readJSON<{ code?: string }>(req);
  const code = String(body?.code ?? "").trim();
  if (!code || !safeEqual(code, env.deviceCode)) {
    await new Promise((r) => setTimeout(r, 800));
    return bad("등록 코드가 맞지 않습니다.", 401);
  }
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `${DEVICE_COOKIE}=${issue("device", DEVICE_TTL)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${DEVICE_TTL}`);
  return res;
}
