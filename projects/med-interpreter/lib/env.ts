import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 없습니다.`);
  return v;
}

export const env = {
  get openaiKey() { return need("OPENAI_API_KEY"); },
  get supabaseUrl() { return need("SUPABASE_URL"); },
  get supabaseKey() { return need("SUPABASE_SECRET_KEY"); },
  get appSecret() { return need("APP_SECRET"); },
  get deviceCode() { return need("DEVICE_CODE"); },
  get adminPin() { return need("ADMIN_PIN"); },
  get cronSecret() { return process.env.CRON_SECRET ?? ""; },
  sttModel: process.env.STT_MODEL || "gpt-live-transcribe",
  sttFallbackModel: process.env.STT_FALLBACK_MODEL || "gpt-4o-transcribe",
  translateModel: process.env.TRANSLATE_MODEL || "gpt-5.4-mini",
  ttsModel: process.env.TTS_MODEL || "gpt-4o-mini-tts",
  backModel: process.env.BACK_MODEL || "gpt-5.4-mini",
};
