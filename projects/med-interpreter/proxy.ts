import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, DEVICE_COOKIE, verify } from "@/lib/auth";

// 등록된 태블릿(또는 관리자)만 통역 화면과 API를 쓸 수 있다. 관리자 화면은 관리자 PIN 이 필요하다.
const OPEN = ["/unlock", "/api/unlock", "/admin/login", "/api/admin/login", "/api/cron/purge", "/manifest.webmanifest"];

export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (OPEN.includes(p)) return NextResponse.next();
  const admin = verify(req.cookies.get(ADMIN_COOKIE)?.value, "admin");
  const isAdminArea = p.startsWith("/admin") || p.startsWith("/api/admin");
  if (isAdminArea) {
    if (admin) return NextResponse.next();
    if (p.startsWith("/api/")) return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (admin || verify(req.cookies.get(DEVICE_COOKIE)?.value, "device")) return NextResponse.next();
  if (p.startsWith("/api/")) return NextResponse.json({ error: "등록되지 않은 기기입니다." }, { status: 401 });
  return NextResponse.redirect(new URL("/unlock", req.url));
}

export const config = {
  matcher: ["/((?!_next/|icon|apple-icon|favicon|brand|.*\\.(?:svg|png|ico|webmanifest|js)$).*)"],
};
