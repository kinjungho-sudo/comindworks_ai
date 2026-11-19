import "server-only";
import { chatJSON } from "./openai";
import { GUEST_LANGS, LANG_META, type Lang } from "./langs";

const CODES = GUEST_LANGS.map((l) => `${l}=${LANG_META[l].english}`).join(", ");

type Row = { ko: string } & Partial<Record<Lang, string | null>>;

// 비어 있는 외국어 칸을 AI 로 채운다. 이미 적힌 값은 건드리지 않는다.
export async function fillMissing<T extends Row>(rows: T[], kind: "term" | "phrase"): Promise<T[]> {
  const need = rows.map((r, i) => ({ i, ko: r.ko, en: r.en ?? undefined, missing: GUEST_LANGS.filter((l) => !r[l]?.trim()) })).filter((r) => r.missing.length);
  if (!need.length) return rows;
  const system = kind === "term"
    ? `You localize a Korean hospital reception glossary. For each item, give the standard term a hospital in the target country would use (${CODES}). Short noun phrase, no explanation. Fill only the languages listed in "missing". Return JSON {"items":[{"i":0,"en":"…",…}]}.`
    : `You are a professional medical interpreter. Translate each Korean hospital reception sentence into natural, polite spoken language (${CODES}; Japanese です/ます, Russian formal Вы, Vietnamese quý vị). Fill only the languages listed in "missing". Return JSON {"items":[{"i":0,"en":"…",…}]}.`;
  const out = await chatJSON<{ items: ({ i: number } & Partial<Record<Lang, string>>)[] }>(system, need, "gpt-5.5");
  const copy = rows.map((r) => ({ ...r }));
  for (const it of out.items ?? []) {
    const target = copy[it.i];
    const want = need.find((n) => n.i === it.i);
    if (!target || !want) continue;
    for (const l of want.missing) if (typeof it[l] === "string" && it[l]!.trim()) (target as Row)[l] = it[l]!.trim();
  }
  return copy;
}
