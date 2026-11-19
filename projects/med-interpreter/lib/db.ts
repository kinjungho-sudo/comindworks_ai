import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type Settings = {
  hospital_name: string;
  retention_days: number;
  speak_to_guest: boolean;
  speak_to_staff: boolean;
  slow_speech: boolean;
  flip_guest: boolean;
  idle_seconds: number;
};

export const DEFAULT_SETTINGS: Settings = {
  hospital_name: "우리병원", retention_days: 30, speak_to_guest: true, speak_to_staff: true,
  slow_speech: false, flip_guest: true, idle_seconds: 180,
};

let cache: { at: number; v: Settings } | null = null;
export async function getSettings(fresh = false): Promise<Settings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.v;
  const { data } = await db().from("medi_settings").select("*").eq("id", 1).maybeSingle();
  const v = { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings;
  cache = { at: Date.now(), v };
  return v;
}
export function clearSettingsCache() { cache = null; }

// 보관 기간이 지난 대화를 지운다. 메시지는 cascade 로 함께 지워진다.
export async function purgeExpired(): Promise<number> {
  const s = await getSettings();
  const cutoff = new Date(Date.now() - s.retention_days * 86400_000).toISOString();
  const { count } = await db().from("medi_sessions").delete({ count: "exact" }).lt("started_at", cutoff);
  return count ?? 0;
}
