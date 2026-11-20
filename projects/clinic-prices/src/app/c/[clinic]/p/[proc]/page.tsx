import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import PriceStrip from "@/components/PriceStrip";
import { getClinic, getSurvey, trend } from "@/lib/data";
import { pct, qtyLabel, won, wonFull } from "@/lib/format";

export default async function ProcPage({ params, searchParams }: PageProps<"/c/[clinic]/p/[proc]">) {
  const { clinic: id, proc } = await params;
  const { date } = await searchParams;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const s = await getSurvey(clinic, typeof date === "string" ? date : undefined);
  const p = s?.procedures[proc];
  if (!s || !p) notFound();
  const t = await trend(clinic, proc);
  const d = s.diff?.procedures?.[proc];
  const unit = p.unit;

  return (
    <>
      <Header clinic={clinic} date={s.date} back={{ href: `/c/${clinic.id}?date=${s.date}`, label: "전체 시술" }} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold">{p.name} <span className="mute text-base font-normal">— {s.date} 조사, 병원 {p.n_hospitals}곳 · 이벤트 {p.n_events}건</span></h1>
          <p className="mute text-sm">기준: {p.basis}{p.n_hospitals < 3 ? " · 표본이 적어 참고만 하세요" : ""}</p>
        </div>
        <Notice />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Kpi label="최저" value={won(p.min)} />
          <Kpi label="중앙값" value={won(p.median)} sub={d && pct(d.median_cur, d.median_prev) ? `지난 조사 대비 ${pct(d.median_cur, d.median_prev)}%` : undefined} />
          <Kpi label="최고" value={won(p.max)} />
          <Kpi label={`${unit}당 중앙값`} value={p.ppu_median ? won(p.ppu_median) : "–"} sub={p.ppu_n ? `${won(p.ppu_min)} ~ ${won(p.ppu_max)} (${p.ppu_n}개)` : undefined} />
          <Kpi label="체험가 최저" value={p.teaser_min ? won(p.teaser_min) : "–"} sub={p.teaser_n ? `${p.teaser_n}개, 통계에서 뺌` : undefined} />
        </div>

        <section className="card"><h2 className="mb-2 font-semibold">옵션별 가격 분포</h2><PriceStrip rows={p.rows} median={p.median} /></section>

        {p.qty_groups.length > 0 && (
          <section className="card overflow-x-auto">
            <h2 className="mb-2 font-semibold">용량별 가격 (단품)</h2>
            <table className="w-full text-sm"><thead className="mute text-xs"><tr><th className="text-left">용량</th><th className="text-right">병원</th><th className="text-right">최저</th><th className="text-right">중앙값</th><th className="text-right">최고</th></tr></thead>
              <tbody>{p.qty_groups.map((g) => (
                <tr key={g.qty} className="border-t border-line"><td className="py-1">{qtyLabel(g.qty, unit)}</td><td className="text-right">{g.hospitals}곳</td><td className="text-right">{won(g.min)}</td><td className="text-right font-semibold">{won(g.median)}</td><td className="text-right">{won(g.max)}</td></tr>
              ))}</tbody></table>
          </section>
        )}

        {t.length > 1 && (
          <section className="card">
            <h2 className="mb-2 font-semibold">조사별 중앙값 추이</h2>
            <div className="space-y-1 text-sm">{t.map((x) => (
              <div key={x.date} className="flex gap-3"><span className="mute w-24">{x.date}</span><span className="w-20 text-right font-semibold">{won(x.median)}</span><span className="mute">{x.ppu ? `${unit}당 ${won(x.ppu)}` : ""} · 병원 {x.n}곳</span></div>
            ))}</div>
          </section>
        )}

        {d?.changed && d.changed.length > 0 && (
          <section className="card">
            <h2 className="mb-2 font-semibold">지난 조사({s.diff.prev_date}) 이후 바뀐 가격</h2>
            <ul className="space-y-1 text-sm">{d.changed.map((c, i) => (
              <li key={i}>{c.hospital} · {c.name}: {wonFull(c.from)} → <b>{wonFull(c.to)}</b></li>
            ))}</ul>
          </section>
        )}

        <section className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">병원별 최저가</h2>
          <table className="w-full text-sm"><thead className="mute text-xs"><tr><th className="text-left">병원</th><th className="text-left">위치</th><th className="text-right">단품 최저</th><th className="text-right">전체 최저</th><th className="text-right">이벤트</th><th className="text-right">리뷰</th></tr></thead>
            <tbody>{p.hospitals.map((h) => (
              <tr key={h.hospital} className={`border-t border-line ${h.own ? "font-semibold text-[var(--accent)]" : ""}`}>
                <td className="py-1">{h.hospital}{h.own ? " (우리 병원)" : ""}</td><td className="mute whitespace-nowrap">{h.station.replace(/^부산\s*/, "")}</td>
                <td className="text-right whitespace-nowrap">{won(h.min_single)}</td><td className="text-right whitespace-nowrap">{won(h.min_any)}</td>
                <td className="text-right">{h.events}</td><td className="text-right">{h.reviews.toLocaleString("ko-KR")}</td>
              </tr>
            ))}</tbody></table>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">이벤트 원문 ({p.events.length}건)</h2>
          {p.events.map((e) => (
            <details key={e.event_id} className="rounded-lg border border-line p-2 text-sm">
              <summary className="cursor-pointer">
                <span className="font-semibold">{e.hospital}</span> · {e.title}
                <span className="mute"> — {won(e.price)}{e.is_package ? " · 패키지 포함" : ""}{e.review_count ? ` · 리뷰 ${e.review_count}` : ""}</span>
              </summary>
              <div className="mt-2 space-y-1">
                {(e.options ?? []).map((o, i) => (
                  <div key={i} className="flex flex-wrap justify-between gap-2 border-t border-line pt-1">
                    <span>{o.name}{o.is_package ? <span className="tag tag-mute ml-1">패키지</span> : null}</span>
                    <span className="whitespace-nowrap">{o.original_price ? <del className="mute mr-1">{wonFull(o.original_price)}</del> : null}<b>{wonFull(o.price)}</b>{o.price_per_unit ? <span className="mute"> ({unit}당 {won(o.price_per_unit)})</span> : null}</span>
                  </div>
                ))}
                {!e.options?.length && <div className="mute">옵션 정보 없음 (목록 가격만)</div>}
                <a className="link text-xs" href={e.url} target="_blank" rel="noopener noreferrer nofollow">강남언니에서 원문 보기 ›</a>
              </div>
            </details>
          ))}
        </section>
      </main>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="card"><div className="mute text-xs">{label}</div><div className="text-xl font-bold">{value}</div>{sub && <div className="mute text-xs">{sub}</div>}</div>;
}
