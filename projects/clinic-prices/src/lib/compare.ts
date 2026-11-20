// 같은 것끼리 단가로 비교하기 (서버·화면 공용).
// - 샷·cc·유닛 시술: 옵션 가격 ÷ 용량 = 단가. "흔한 용량" 기준 환산가도 함께.
// - 회 시술(인모드·포텐자 등): 얼굴 전체 / 한 부위 / 범위 표기 없음으로 나눠 1회 가격.
// - 보톡스: 주름 1부위 / 사각턱 1회로 나눔.
// 병원마다 그룹 안에서 가장 싼 단품 옵션 하나(체험가·패키지 제외)를 대표로 쓴다.
import type { Proc, Row } from "./data";

export type Entry = {
  hospital: string; station: string; unitPrice: number; price: number; qty: number | null;
  option: string; title: string; url: string; note?: string;
};
export type Group = {
  key: string; label: string; perLabel: string; // 예: "샷당", "1회"
  refQty?: number; refLabel?: string; // 환산 기준 (예: 100샷)
  entries: Entry[]; // 단가 낮은 순
  suspects: Entry[]; // 중앙값보다 지나치게 싼 옵션 (첫방문·체험가로 보임) — 비교에서 뺌
  median: number; min: number; max: number;
  skipped: Row[]; // 용량을 알 수 없어 뺀 옵션
};

const FACE = /얼굴|전체|풀\s*페이스|full\s*face|얼전/i;
const PART = /부위|나비존|이마|인중|겨드랑|팔뚝|팔꿈치|다리|무릎|눈가|눈밑|입가|가슴|사타구니|발꿈치|복숭아뼈|바디|부분|택\s*\d|포인트|(?<![가-힣])(코|목|볼|등|팔|턱)(?![가-힣])/; // 한 글자 부위는 단어로 떨어져 있을 때만 (피코토닝의 "코" 오인 방지)
const SUSPECT_RATIO = 0.3; // 중앙값의 30% 미만이면 미끼가 의심 (비교·통계에서 빼고 따로 보여 줌)

function med(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)) : 0;
}

function rowUrl(r: Row & { url?: string; title?: string }) {
  return r.url || `https://unni.app/events/${r.event_id}`;
}

type Tagged = { group: string; unitPrice: number; note?: string };

function tagRow(r: Row, unit: string, procId: string): Tagged | null {
  const text = `${r.name} ${(r as Row & { title?: string }).title ?? ""}`;
  if (procId === "botox") {
    const n = Number(r.name.match(/(\d+)\s*부위/)?.[1] || 1);
    if (/사각|턱/.test(r.name)) return { group: "jaw", unitPrice: r.price };
    if (/주름|이마|미간|눈가|부위|팔자|콧등|입꼬리/.test(r.name)) return { group: "wrinkle", unitPrice: Math.round(r.price / n), note: n > 1 ? `${n}부위 ÷ ${n}` : undefined };
    return null;
  }
  if (unit === "회") {
    const sessions = r.qty && r.qty > 1 ? r.qty : 1;
    const g = PART.test(r.name) ? "part" : FACE.test(r.name) ? "face" : PART.test(text) ? "part" : FACE.test(text) ? "face" : "unknown";
    return { group: g, unitPrice: Math.round(r.price / sessions), note: sessions > 1 ? `${sessions}회 ÷ ${sessions}` : undefined };
  }
  if (r.price_per_unit && r.qty) return { group: "ppu", unitPrice: r.price_per_unit };
  return null;
}

const GROUP_LABEL: Record<string, (unit: string) => [string, string]> = {
  ppu: (u) => [`${u}당 가격`, `${u}당`],
  face: () => ["얼굴 전체 1회", "1회"],
  part: () => ["한 부위 1회", "1회"],
  unknown: () => ["범위 표기 없음 1회", "1회"],
  wrinkle: () => ["주름 보톡스 1부위", "1부위"],
  jaw: () => ["사각턱 보톡스 1회", "1회"],
};

export function compare(procId: string, p: Proc): Group[] {
  const singles = p.rows.filter((r) => !r.is_package && !r.teaser);
  const byGroup = new Map<string, { r: Row; t: Tagged }[]>();
  const skipped: Row[] = [];
  for (const r of singles) {
    const t = tagRow(r, p.unit, procId);
    if (!t) { skipped.push(r); continue; }
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group)!.push({ r, t });
  }
  const stationOf = new Map(p.hospitals.map((h) => [h.hospital, h.station]));
  const groups: Group[] = [];
  for (const [key, items] of byGroup) {
    const best = new Map<string, Entry>();
    for (const { r, t } of items) {
      const cur = best.get(r.hospital);
      if (cur && cur.unitPrice <= t.unitPrice) continue;
      best.set(r.hospital, {
        hospital: r.hospital, station: stationOf.get(r.hospital) ?? "", unitPrice: t.unitPrice, price: r.price, qty: r.qty,
        option: r.name, title: (r as Row & { title?: string }).title ?? "", url: rowUrl(r as Row & { url?: string }), note: t.note,
      });
    }
    const all = [...best.values()].sort((a, b) => a.unitPrice - b.unitPrice);
    const m0 = med(all.map((e) => e.unitPrice));
    const suspects = all.length >= 4 ? all.filter((e) => e.unitPrice < m0 * SUSPECT_RATIO) : [];
    const entries = all.filter((e) => !suspects.includes(e));
    const ups = entries.map((e) => e.unitPrice);
    const [label, perLabel] = (GROUP_LABEL[key] ?? (() => [key, ""]))(p.unit);
    const g: Group = { key, label, perLabel, entries, suspects, median: med(ups), min: Math.min(...ups), max: Math.max(...ups), skipped: [] };
    if (key === "ppu") {
      // 환산 기준 = 병원이 가장 많이 내놓은 용량
      const qg = [...p.qty_groups].sort((a, b) => b.hospitals - a.hospitals || a.qty - b.qty)[0];
      if (qg) { g.refQty = qg.qty; g.refLabel = `${Number.isInteger(qg.qty) ? qg.qty : qg.qty.toFixed(1)}${p.unit}`; }
      g.skipped = skipped;
    }
    groups.push(g);
  }
  if (!groups.find((g) => g.key === "ppu") && skipped.length && groups[0]) groups[0].skipped = skipped;
  // 병원이 많은 그룹부터
  return groups.sort((a, b) => b.entries.length - a.entries.length);
}

/** 우리 병원 순위 (저렴한 순 1위부터). 이름이 들어 있는 병원을 찾거나, 직접 넣은 단가를 끼워 넣는다 */
export function rankOf(g: Group, our: { name?: string; price?: number | null }) {
  let price: number | null = null;
  let entry: Entry | undefined;
  if (our.price != null && our.price > 0) price = our.price;
  else if (our.name) {
    entry = g.entries.find((e) => e.hospital.includes(our.name!) || our.name!.includes(e.hospital));
    price = entry?.unitPrice ?? null;
  }
  if (price == null) return null;
  const others = g.entries.filter((e) => e !== entry);
  const cheaper = others.filter((e) => e.unitPrice < price!).length;
  const total = others.length + 1;
  return { rank: cheaper + 1, total, price, vsMedian: g.median ? Math.round(((price - g.median) / g.median) * 100) : 0, entry };
}
