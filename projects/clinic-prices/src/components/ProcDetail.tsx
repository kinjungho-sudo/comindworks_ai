"use client";
// 시술 상세: 비교 기준 고르기 → 병원별 단가 막대(우리 병원 강조) → 옵션 원문 표(출처 링크)
import { useState } from "react";
import BarChart from "./BarChart";
import type { Group } from "@/lib/compare";
import { rankOf } from "@/lib/compare";
import { won, wonFull } from "@/lib/format";
import { useOurClinic } from "@/lib/our";

export default function ProcDetail({ slug, procId, unit, groups }: { slug: string; procId: string; unit: string; groups: Group[] }) {
  const [gi, setGi] = useState(0);
  const our = useOurClinic(slug);
  const g = groups[gi];
  const key = `${procId}:${g.key}`;
  const manual = our.prices[key] ?? null;
  const rk = rankOf(g, { name: our.name, price: manual });
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-5">
      {groups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mute text-sm">비교 기준</span>
          {groups.map((x, i) => (
            <button key={x.key} className={`btn ${i === gi ? "btn-on" : ""}`} onClick={() => setGi(i)}>{x.label} <span className="opacity-70">{x.entries.length}곳</span></button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <section className="card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{g.label} — 병원별 비교</h2>
            {g.refQty && <span className="mute text-xs">{g.refLabel} 기준으로 바꾸면: 중앙 {won(g.median * g.refQty)} · 최저 {won(g.min * g.refQty)}</span>}
          </div>
          <BarChart g={g} ourName={our.name} ourPrice={manual} />
          <p className="mute mt-3 text-xs">병원마다 이 기준에 맞는 단품 옵션 중 가장 싼 것 하나로 비교했습니다(첫방문·체험가·패키지 제외). 줄에 마우스를 올리면 실제 옵션과 가격이 보입니다.</p>
        </section>

        <aside className="space-y-4">
          <section className="card space-y-3">
            <h3 className="font-semibold">우리 병원 기준</h3>
            {rk ? (
              <div className="space-y-1">
                <div className="num text-3xl font-bold text-[var(--our)]">{rk.rank}<span className="text-base font-normal text-[var(--fg2)]"> / {rk.total}위</span></div>
                <div className="fg2 text-sm">저렴한 순 · {g.perLabel} {won(rk.price)}</div>
                <div className="fg2 text-sm">중앙값 {won(g.median)}보다 {rk.vsMedian === 0 ? "같음" : `${Math.abs(rk.vsMedian)}% ${rk.vsMedian > 0 ? "비쌈" : "저렴"}`}</div>
              </div>
            ) : (
              <p className="mute text-sm">{our.name ? `"${our.name}"은(는) 이 기준의 강남언니 이벤트에 없습니다. 아래에 우리 단가를 넣으면 순위가 나옵니다.` : "위에서 우리 병원 이름을 고르거나, 아래에 우리 단가를 넣으세요."}</p>
            )}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(draft.replace(/[^\d]/g, "")); our.setPrice(key, n || null); setDraft(""); }}>
              <input className="input" inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`우리 ${g.perLabel} 가격 (원)`} aria-label="우리 병원 단가" />
              <button className="btn" type="submit">넣기</button>
            </form>
            {manual != null && <button className="mute text-xs underline" onClick={() => our.setPrice(key, null)}>직접 넣은 {wonFull(manual)} 지우기</button>}
            <p className="mute text-xs">이 브라우저에만 저장되고 다른 사람에게는 보이지 않습니다.</p>
          </section>
          <section className="card space-y-1 text-sm">
            <h3 className="font-semibold">숫자 요약</h3>
            <div className="num flex justify-between"><span className="fg2">최저</span><b>{won(g.min)}</b></div>
            <div className="num flex justify-between"><span className="fg2">중앙값</span><b>{won(g.median)}</b></div>
            <div className="num flex justify-between"><span className="fg2">최고</span><b>{won(g.max)}</b></div>
            <div className="num flex justify-between"><span className="fg2">비교 병원</span><b>{g.entries.length}곳</b></div>
          </section>
        </aside>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold">옵션 원문과 출처</h2>
        <table className="w-full text-sm">
          <thead className="mute text-xs"><tr className="border-b border-line text-left">
            <th className="py-2 pr-3">병원</th><th className="pr-3">옵션</th><th className="pr-3 text-right">실제 가격</th><th className="pr-3 text-right">{g.perLabel}</th><th>출처</th>
          </tr></thead>
          <tbody>{g.entries.map((e) => (
            <tr key={e.hospital} className="border-b border-line last:border-0">
              <td className="py-2 pr-3 whitespace-nowrap">{e.hospital}</td>
              <td className="pr-3">{e.option}{e.note && <span className="mute text-xs"> ({e.note})</span>}</td>
              <td className="num pr-3 text-right whitespace-nowrap">{wonFull(e.price)}</td>
              <td className="num pr-3 text-right whitespace-nowrap font-semibold">{wonFull(e.unitPrice)}</td>
              <td><a className="src" href={e.url} target="_blank" rel="noopener noreferrer nofollow">강남언니 원문↗</a></td>
            </tr>
          ))}</tbody>
        </table>
        {g.suspects.length > 0 && (
          <div className="notice mt-3">
            <b>미끼가 의심 {g.suspects.length}건 — 비교에서 뺐습니다</b> (중앙값의 30% 미만, 첫방문·체험가로 보임)
            <ul className="mt-1 space-y-0.5">{g.suspects.map((e) => (
              <li key={e.hospital}>{e.hospital} · {e.option} — {wonFull(e.price)} ({g.perLabel} {wonFull(e.unitPrice)}) <a className="src" href={e.url} target="_blank" rel="noopener noreferrer nofollow">원문↗</a></li>
            ))}</ul>
          </div>
        )}
        {g.skipped.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="mute cursor-pointer">용량·범위를 알 수 없어 비교에서 뺀 옵션 {g.skipped.length}개</summary>
            <ul className="mt-2 space-y-1">{g.skipped.map((r, i) => (
              <li key={i} className="fg2">{r.hospital} · {r.name} — {wonFull(r.price)} <a className="src" href={r.url || `https://unni.app/events/${r.event_id}`} target="_blank" rel="noopener noreferrer nofollow">원문↗</a></li>
            ))}</ul>
          </details>
        )}
        <p className="mute mt-3 text-xs">단위: {unit}. 가격은 강남언니 앱 결제 이벤트가이며 정가·상담 후 결제가와 다를 수 있습니다.</p>
      </section>
    </div>
  );
}
