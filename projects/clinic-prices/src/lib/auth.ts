// 비밀번호 한 개로 들어가는 내부용 로그인. 쿠키 = "만료시각.서명" (HMAC-SHA256, AUTH_SECRET).
// proxy.ts(1차)와 각 페이지·데이터 읽기(2차)에서 같이 확인한다.
export const COOKIE = "cp_session";
export const MAX_AGE = 60 * 60 * 24 * 30; // 30일

const enc = new TextEncoder();

async function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET 환경 변수가 없거나 짧습니다");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeToken(now = Date.now()) {
  const exp = String(Math.floor(now / 1000) + MAX_AGE);
  const sig = hex(await crypto.subtle.sign("HMAC", await key(), enc.encode(exp)));
  return `${exp}.${sig}`;
}

export async function verifyToken(token?: string | null) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(exp) * 1000 < Date.now()) return false;
  const bytes = new Uint8Array(sig.match(/../g)!.map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", await key(), bytes, enc.encode(exp));
}

/** 비밀번호 비교 (길이·내용 차이로 시간이 새지 않게) */
export async function passwordOk(input: string) {
  const want = process.env.APP_PASSWORD;
  if (!want) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(input)),
    crypto.subtle.digest("SHA-256", enc.encode(want)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
