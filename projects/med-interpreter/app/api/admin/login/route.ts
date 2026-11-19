import { ADMIN_COOKIE, ADMIN_TTL, DEVICE_COOKIE, DEVICE_TTL, issue, safeEqual } from "@/lib/auth";
import { env } from "@/lib/env";
import { bad, readJSON } from "@/lib/http";

export async function POST(req: Request) {
  const b = await readJSON<{ pin?: string }>(req);
  if (!safeEqual(String(b?.pin ?? "").trim(), env.adminPin)) {
    await new Promise((r) => setTimeout(r, 800));
    return bad("PIN 이 맞지 않습니다.", 401);
  }
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `${ADMIN_COOKIE}=${issue("admin", ADMIN_TTL)}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${ADMIN_TTL}`);
  // 관리자가 로그인한 기기는 통역 화면도 쓸 수 있게 등록해 준다.
  res.headers.append("Set-Cookie", `${DEVICE_COOKIE}=${issue("device", DEVICE_TTL)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${DEVICE_TTL}`);
  return res;
}
