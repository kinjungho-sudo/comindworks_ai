"use client";
// 첫 화면: 시술 카드. 같은 기준(단가)의 중앙값, 병원별 분포 그림, 우리 병원 순위.
import Link from "next/link";
import RangeStrip from "./RangeStrip";
import type { Group } from "@/lib/compare";
import { rankOf } from "@/lib/compare";
import { won } from "@/lib/format";
import { useOurClinic } from "@/lib/our";

export type ProcCard = { id: string; name: string; unit: string; nHospitals: number; groups: Group[]; changePct: number | null };

export default function Overview({ slug, date, cards }: { slug: string; date: string; cards: ProcCard[] }) {
  const our = useOurClinic(slug);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const g = c.groups[0];
        if (!g) return null;
        const manual = our.prices[`${c.id}:${g.key}`] ?? null;
        const rk = rankOf(g, { name: our.name, price: manual });
        return (
          <Link key={c.id} href={`/c/${slug}/p/${c.id}?date=${date}`} className="card block transition hover:-translate-y-0.5 hover:border-[var(--fg2)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-lg font-bold">{c.name}</div>
                <div className="mute text-xs">{g.label} · 병원 {g.entries.length}곳 비교{c.groups.length > 1 ? ` · 기준 ${c.groups.length}가지` : ""}</div>
              </div>
              {g.entries.length < 3 && <span className="tag">표본 적음</span>}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="mute text-sm">{g.perLabel} 중앙값</span>
              <span className="num text-2xl font-bold">{won(g.median)}</span>
              {c.changePct != null && c.changePct !== 0 && <span className={`num text-xs ${c.changePct > 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}`}>{c.changePct > 0 ? "▲" : "▼"}{Math.abs(c.changePct)}%</span>}
            </div>
            {g.refQty && g.refLabel && <div className="mute num text-xs">{g.refLabel} 환산 {won(g.median * g.refQty)}</div>}
            <div className="mt-2"><RangeStrip g={g} ourPrice={rk?.price ?? null} /></div>
            <div className="mute num flex justify-between text-xs"><span>최저 {won(g.min)}</span><span>최고 {won(g.max)}</span></div>
            {g.suspects.length > 0 && <div className="mute mt-1 text-xs">미끼가 의심 {g.suspects.length}건은 비교에서 뺌</div>}
            {rk && (
              <div className="mt-3 rounded-xl bg-[var(--our-soft)] px-3 py-2 text-sm">
                <b className="text-[var(--our)]">우리 병원 {rk.total}곳 중 {rk.rank}번째로 저렴</b>
                <span className="fg2"> · 중앙값보다 {rk.vsMedian === 0 ? "같음" : `${Math.abs(rk.vsMedian)}% ${rk.vsMedian > 0 ? "비쌈" : "저렴"}`}</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
