import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verify } from "@/lib/auth";

// 통역 화면은 주소만 열면 바로 쓴다(등록 코드 없음). 관리자 화면만 PIN 이 필요하다.
// 대신 돈이 드는 API(받아쓰기·번역·음성)는 ① 이 사이트 화면에서 온 요청만 받고 ② 한 곳에서 너무 많이 부르면 잠시 막는다.
const COSTLY = ["/api/stt-token", "/api/translate", "/api/tts", "/api/transcribe", "/api/backtranslate", "/api/summary"];
const LIMIT_PER_MIN = 90;
const hits = new Map<string, { n: number; reset: number }>();

function sameSite(req: NextRequest) {
  const host = req.headers.get("host");
  const from = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !from) return false;
  try { return new URL(from).host === host; } catch { return false; }
}

function tooMany(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  h.n++;
  if (hits.size > 5000) hits.clear();
  return h.n > LIMIT_PER_MIN;
}

export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/unlock") return NextResponse.redirect(new URL("/", req.url)); // 예전 등록 화면 주소
  if (p === "/admin/login" || p === "/api/admin/login" || p === "/api/cron/purge") return NextResponse.next();
  if (p.startsWith("/admin") || p.startsWith("/api/admin")) {
    if (verify(req.cookies.get(ADMIN_COOKIE)?.value, "admin")) return NextResponse.next();
    if (p.startsWith("/api/")) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (COSTLY.includes(p)) {
    if (!sameSite(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    if (tooMany(req)) return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." }, { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|icon|apple-icon|favicon|brand|.*\\.(?:svg|png|ico|webmanifest|js)$).*)"],
};
