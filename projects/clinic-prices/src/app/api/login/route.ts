import { COOKIE, MAX_AGE, makeToken, passwordOk } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const pw = String(form.get("password") ?? "");
  const base = new URL(req.url);
  if (!(await passwordOk(pw))) {
    await new Promise((r) => setTimeout(r, 800)); // 연속 대입을 느리게
    return Response.redirect(new URL("/login?e=1", base), 303);
  }
  const token = await makeToken();
  const secure = base.protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: { Location: new URL("/", base).toString(), "Set-Cookie": `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}` },
  });
}
