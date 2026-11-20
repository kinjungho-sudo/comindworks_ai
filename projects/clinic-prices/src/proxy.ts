// 1차 관문: 로그인 쿠키가 없으면 /login으로. (각 페이지에서도 다시 확인한다)
import { type NextRequest, NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value).catch(() => false);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // 로그인 화면·로그인 처리·정적 파일은 통과
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
