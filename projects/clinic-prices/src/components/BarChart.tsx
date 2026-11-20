"use client";
// 병원별 단가 막대 (저렴한 순). 우리 병원은 주황 + "우리" 표시. 각 줄에 강남언니 출처 링크.
import type { Entry, Group } from "@/lib/compare";
import { won, wonFull } from "@/lib/format";

type Row = { key: string; label: string; sub?: string; value: number; our: boolean; entry?: Entry };

export default function BarChart({ g, ourName, ourPrice }: { g: Group; ourName: string; ourPrice: number | null }) {
  const rows: Row[] = g.entries.map((e) => ({
    key: e.hospital, label: e.hospital, sub: e.station.replace(/^부산\s*/, ""), value: e.unitPrice,
    our: ourPrice == null && !!ourName && (e.hospital.includes(ourName) || ourName.includes(e.hospital)), entry: e,
  }));
  if (ourPrice != null) rows.push({ key: "__our", label: ourName ? `${ourName} (직접 입력)` : "우리 병원 (직접 입력)", value: ourPrice, our: true });
  rows.sort((a, b) => a.value - b.value);
  const max = Math.max(...rows.map((r) => r.value)) * 1.05;
  const medPct = (g.median / max) * 100;
  return (
    <div className="space-y-1" role="table" aria-label={`${g.label} 병원별 비교`}>
      <div role="row" className="mute hidden gap-3 px-2 text-xs sm:grid sm:grid-cols-[1.6rem_minmax(9rem,15rem)_1fr_6.5rem_3rem]">
        <span role="columnheader">순위</span><span role="columnheader">병원</span><span role="columnheader">점선 = 중앙값</span>
        <span role="columnheader" className="text-right">{g.perLabel}</span><span role="columnheader" className="hidden sm:block">출처</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.key} role="row"
          className={`group grid grid-cols-[1.6rem_1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 sm:grid-cols-[1.6rem_minmax(9rem,15rem)_1fr_6.5rem_3rem] ${r.our ? "bg-[var(--our-soft)]" : "hover:bg-[var(--soft)]"}`}
          title={r.entry ? `${r.entry.option} · 실제 가격 ${wonFull(r.entry.price)}${r.entry.note ? ` (${r.entry.note})` : ""}` : "직접 입력한 우리 병원 단가"}>
          <span className="num mute text-sm">{i + 1}</span>
          <span className="min-w-0">
            <span className={`block truncate text-sm ${r.our ? "font-bold" : ""}`}>{r.label}{r.our && <span className="tag tag-our ml-1">우리</span>}</span>
            {r.sub && <span className="mute block truncate text-xs">{r.sub}</span>}
          </span>
          <span className="relative col-span-2 col-start-2 row-start-2 h-4 sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:h-5">
            <span className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.our ? "var(--our)" : "var(--other)" }} />
            <span className="absolute -inset-y-1 border-l-2 border-dashed border-[var(--fg2)] opacity-60" style={{ left: `${medPct}%` }} aria-hidden />
          </span>
          <span className={`num col-start-3 row-start-1 text-right text-sm sm:col-start-auto sm:row-start-auto ${r.our ? "font-bold" : ""}`}>{won(r.value)}{r.entry && <a className="src ml-2 sm:hidden" href={r.entry.url} target="_blank" rel="noopener noreferrer nofollow">원문↗</a>}</span>
          <span className="hidden sm:block">{r.entry ? <a className="src" href={r.entry.url} target="_blank" rel="noopener noreferrer nofollow">원문↗</a> : null}</span>
        </div>
      ))}
    </div>
  );
}
