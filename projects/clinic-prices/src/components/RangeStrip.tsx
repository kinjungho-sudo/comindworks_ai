"use client";
// 카드용 작은 그림: 병원별 단가 점(파랑), 우리 병원(주황), 중앙값 눈금
import type { Group } from "@/lib/compare";
import { won } from "@/lib/format";

export default function RangeStrip({ g, ourPrice }: { g: Group; ourPrice: number | null }) {
  const vals = g.entries.map((e) => e.unitPrice).concat(ourPrice != null ? [ourPrice] : []);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const W = 300, P = 10;
  const x = (v: number) => (hi === lo ? W / 2 : P + ((v - lo) / (hi - lo)) * (W - 2 * P));
  return (
    <svg viewBox={`0 0 ${W} 34`} className="w-full" role="img" aria-label={`${g.label} 병원별 분포`}>
      <line x1={P} x2={W - P} y1={17} y2={17} stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1={x(g.median)} x2={x(g.median)} y1={7} y2={27} stroke="var(--fg2)" strokeWidth="1.5" strokeDasharray="2 2" />
      {g.entries.map((e) => (
        <circle key={e.hospital} cx={x(e.unitPrice)} cy={17} r={4.5} fill="var(--other)" stroke="var(--panel)" strokeWidth="2">
          <title>{`${e.hospital} · ${g.perLabel} ${won(e.unitPrice)}`}</title>
        </circle>
      ))}
      {ourPrice != null && (
        <circle cx={x(ourPrice)} cy={17} r={7} fill="var(--our)" stroke="var(--panel)" strokeWidth="2"><title>{`우리 병원 · ${won(ourPrice)}`}</title></circle>
      )}
    </svg>
  );
}
