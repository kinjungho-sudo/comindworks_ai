// 가격 분포 띠: 점 하나 = 옵션 하나 (로그 눈금). 채운 점 = 단품, 빈 점 = 패키지·체험가. 세로선 = 중앙값.
import type { Row } from "@/lib/data";
import { won, wonFull } from "@/lib/format";

export default function PriceStrip({ rows, median }: { rows: Row[]; median: number | null }) {
  const ps = rows.map((r) => r.price).filter((p) => p > 0);
  if (!ps.length) return null;
  const lo = Math.log10(Math.min(...ps) * 0.85);
  const hi = Math.log10(Math.max(...ps) * 1.15);
  const W = 1000, H = 92, P = 24;
  const x = (p: number) => P + ((Math.log10(p) - lo) / (hi - lo || 1)) * (W - 2 * P);
  const ticks: number[] = [];
  for (const base of [1e3, 1e4, 1e5, 1e6, 1e7]) for (const m of [1, 2, 5]) { const t = base * m; if (Math.log10(t) > lo && Math.log10(t) < hi) ticks.push(t); }
  const placed: { cx: number; cy: number; r: Row }[] = [];
  for (const r of [...rows].sort((a, b) => a.price - b.price)) {
    const cx = x(r.price);
    let cy = 44;
    for (let k = 0; k < 6; k++) {
      const cand = 44 + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 11;
      if (!placed.some((p) => Math.abs(p.cx - cx) < 9 && p.cy === cand)) { cy = cand; break; }
    }
    placed.push({ cx, cy, r });
  }
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="옵션별 가격 분포">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={10} y2={74} stroke="var(--line)" />
            <text x={x(t)} y={88} textAnchor="middle" fontSize="12" fill="var(--mute)">{won(t)}</text>
          </g>
        ))}
        {median != null && <line x1={x(median)} x2={x(median)} y1={6} y2={78} stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" />}
        {placed.map(({ cx, cy, r }, i) => {
          const hollow = r.is_package || r.teaser;
          return (
            <circle key={i} cx={cx} cy={cy} r={5} fill={hollow ? "var(--panel)" : "var(--accent)"} stroke="var(--accent)" strokeWidth="1.5">
              <title>{`${r.hospital} · ${r.name} · ${wonFull(r.price)}${r.is_package ? " (패키지)" : ""}${r.teaser ? " (체험가)" : ""}`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="mute text-xs">● 단품 ○ 패키지·체험가 · 점선 = 중앙값 · 점에 마우스를 올리면 병원·옵션이 보입니다 (가격은 로그 눈금)</figcaption>
    </figure>
  );
}
