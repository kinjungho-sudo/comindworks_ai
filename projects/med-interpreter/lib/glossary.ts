import "server-only";
import { db } from "./db";
import type { Lang } from "./langs";

export type Term = { id: string; category: string; ko: string; en: string | null; zh: string | null; ja: string | null; ru: string | null; vi: string | null; note: string | null };

let cache: { at: number; terms: Term[] } | null = null;
export async function getTerms(fresh = false): Promise<Term[]> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.terms;
  const { data, error } = await db().from("medi_terms").select("id,category,ko,en,zh,ja,ru,vi,note").order("category").order("ko");
  if (error) throw error;
  cache = { at: Date.now(), terms: (data ?? []) as Term[] };
  return cache.terms;
}
export function clearTermsCache() { cache = null; }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

// 원문에 나온 용어만 골라 "원어 → 번역어" 목록으로 만든다.
export function matchTerms(terms: Term[], text: string, from: Lang, to: Lang, limit = 30) {
  const t = norm(text);
  const hits: { src: string; dst: string; note: string | null }[] = [];
  for (const term of terms) {
    const src = term[from];
    const dst = term[to];
    if (!src || !dst) continue;
    const latin = from === "en" || from === "ru" || from === "vi";
    const variants = src.split(/[,/;]|\(|\)|（|）/).map((v) => v.trim()).filter((v) => v.length >= (latin ? 3 : 2));
    // 여러 단어로 된 용어는 핵심 단어(가장 긴 단어)만 나와도 해당 용어로 본다. 예: "본관 지하 1층 영상검사실" ← "영상검사실"
    const keys = variants.flatMap((v) => {
      const words = v.split(/\s+/).filter((w) => w.length >= (latin ? 6 : 3));
      return words.length > 1 || (words.length === 1 && words[0] !== v) ? [v, words.sort((a, b) => b.length - a.length)[0]] : [v];
    });
    if (keys.some((v) => t.includes(norm(v)))) hits.push({ src, dst, note: term.note });
    if (hits.length >= limit) break;
  }
  return hits;
}

// 받아쓰기 정확도를 높이기 위한 힌트 문자열 (해당 언어 용어 나열).
export function sttHint(terms: Term[], lang: Lang, hospital: string): string {
  const words = terms.map((t) => t[lang]).filter(Boolean) as string[];
  const head = lang === "ko" ? `${hospital} 병원 안내 데스크 대화.` : "Hospital reception desk conversation.";
  let out = head + " ";
  for (const w of words) {
    if (out.length + w.length > 700) break;
    out += w + ", ";
  }
  return out.replace(/, $/, ".");
}
