// 서버 전용: 배포에 함께 묶인 조사 결과(data/) 읽기. (2026-11-20 정호님 지시로 로그인 없이 공개)
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");

export type Clinic = { id: string; label: string; area: string; dates: string[] };
export type QtyGroup = { qty: number; n: number; hospitals: number; min: number; median: number; max: number };
export type Hospital = { hospital: string; station: string; events: number; min_single: number | null; min_any: number | null; reviews: number; own: boolean };
export type Option = { name: string; price: number; original_price?: number | null; qty?: number | null; is_package?: boolean; teaser?: boolean; price_per_unit?: number | null };
export type Event = {
  event_id: string; url: string; title: string; station: string; hospital: string; price: number | null;
  original_price: number | null; discount_pct: number | null; rating: number | null; review_count: number;
  is_package: boolean; qty: number | null; options: Option[] | null;
};
export type Row = { hospital: string; name: string; price: number; qty: number | null; is_package: boolean; teaser: boolean; price_per_unit?: number | null; event_id: string };
export type Proc = {
  name: string; unit: string; n_events: number; n_hospitals: number; n_rows: number; n_single: number; basis: string;
  teaser_n: number; teaser_min: number | null; min: number | null; p25: number | null; median: number | null; p75: number | null; max: number | null;
  ppu_median: number | null; ppu_min: number | null; ppu_max: number | null; ppu_n: number;
  qty_groups: QtyGroup[]; hospitals: Hospital[]; events: Event[]; rows: Row[];
};
export type Change = { hospital: string; name: string; from: number; to: number };
export type Survey = {
  date: string; client: string; area: string; collected_at?: string; stations: string[];
  procedures: Record<string, Proc>;
  diff: { prev_date?: string; procedures?: Record<string, { median_prev: number | null; median_cur: number | null; ppu_prev: number | null; ppu_cur: number | null; new_events?: unknown[]; gone_events?: unknown[]; changed?: Change[] }> };
};

export async function listClinics(): Promise<Clinic[]> {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf-8")).clinics;
  } catch {
    return [];
  }
}

export async function getClinic(id: string): Promise<Clinic | null> {
  return (await listClinics()).find((c) => c.id === id) ?? null;
}

export async function getSurvey(clinic: Clinic, date?: string): Promise<Survey | null> {
  const d = date && clinic.dates.includes(date) ? date : clinic.dates.at(-1);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA, clinic.id, `${d}.json`), "utf-8"));
}

/** 같은 병원의 모든 조사에서 시술별 중앙값 추이 */
export async function trend(clinic: Clinic, procId: string) {
  return clinic.dates.map((d) => {
    const s: Survey = JSON.parse(fs.readFileSync(path.join(DATA, clinic.id, `${d}.json`), "utf-8"));
    const p = s.procedures[procId];
    return { date: d, median: p?.median ?? null, ppu: p?.ppu_median ?? null, n: p?.n_hospitals ?? 0 };
  });
}
