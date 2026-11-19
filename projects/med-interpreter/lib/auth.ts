import { createHmac, timingSafeEqual } from "node:crypto";

// 서명된 쿠키 두 종류: 태블릿 등록(device), 관리자(admin).
export const DEVICE_COOKIE = "mb_device";
export const ADMIN_COOKIE = "mb_admin";
export type Role = "device" | "admin";

function secret() {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET 없음");
  return s;
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issue(role: Role, ttlSeconds: number): string {
  const payload = `${role}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  return `${payload}.${sign(payload)}`;
}

export function verify(token: string | undefined, role: Role): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const [r, exp] = payload.split(".");
  if (r !== role || !exp || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(sign(payload));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const DEVICE_TTL = 60 * 60 * 24 * 365;
export const ADMIN_TTL = 60 * 60 * 12;
