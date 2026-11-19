import { clearSettingsCache, db, getSettings, purgeExpired } from "@/lib/db";
import { bad, readJSON } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ settings: await getSettings(true) });
}

export async function PUT(req: Request) {
  const b = await readJSON<Record<string, unknown>>(req);
  if (!b) return bad("내용이 없습니다.");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.hospital_name === "string" && b.hospital_name.trim()) patch.hospital_name = b.hospital_name.trim().slice(0, 60);
  if (b.retention_days !== undefined) {
    const n = Math.round(Number(b.retention_days));
    if (!(n >= 1 && n <= 365)) return bad("보관 기간은 1~365일 사이여야 합니다.");
    patch.retention_days = n;
  }
  if (b.idle_seconds !== undefined) {
    const n = Math.round(Number(b.idle_seconds));
    if (!(n >= 30 && n <= 1800)) return bad("자동 초기화 시간은 30~1800초 사이여야 합니다.");
    patch.idle_seconds = n;
  }
  for (const k of ["speak_to_guest", "speak_to_staff", "slow_speech", "flip_guest"]) if (typeof b[k] === "boolean") patch[k] = b[k];
  const { error } = await db().from("medi_settings").update(patch).eq("id", 1);
  if (error) return bad(error.message, 500);
  clearSettingsCache();
  if (patch.retention_days) await purgeExpired();
  return Response.json({ settings: await getSettings(true) });
}
