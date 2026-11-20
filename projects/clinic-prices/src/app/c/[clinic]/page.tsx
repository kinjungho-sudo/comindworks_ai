import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { getClinic, getSurvey } from "@/lib/data";
import { pct, qtyLabel, won } from "@/lib/format";

export default async function ClinicPage({ params, searchParams }: PageProps<"/c/[clinic]">) {
  const { clinic: id } = await params;
  const { date } = await searchParams;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const s = await getSurvey(clinic, typeof date === "string" ? date : undefined);
  if (!s) notFound();
  const procs = Object.entries(s.procedures);
  const hospitals = new Set(procs.flatMap(([, p]) => p.hospitals.map((h) => h.hospital)));
  const events = procs.reduce((n, [, p]) => n + p.n_events, 0);
  const dif = s.diff?.procedures ?? {};

  return (
    <>
      <Header clinic={clinic} date={s.date} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold">{s.area} 근처 피부과 시술가 — {s.date} 조사</h1>
          <p className="mute text-sm">조사 지역: {s.stations.join(", ")}{s.diff?.prev_date ? ` · 비교 기준: ${s.diff.prev_date} 조사` : " · 첫 조사라 이전과 비교 없음"}</p>
        </div>
        <Notice />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="시술" value={`${procs.length}개`} />
          <Kpi label="병원" value={`${hospitals.size}곳`} />
          <Kpi label="이벤트" value={`${events}건`} />
          <Kpi label="조사 횟수" value={`${clinic.dates.length}회`} />
        </div>

        <section className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="mute text-xs">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left">시술</th><th className="px-3 py-2 text-right">병원</th>
                <th className="px-3 py-2 text-right">최저</th><th className="px-3 py-2 text-right">중앙값</th><th className="px-3 py-2 text-right">최고</th>
                <th className="px-3 py-2 text-right">단위당</th><th className="px-3 py-2 text-left">흔한 용량 중앙값</th><th className="px-3 py-2 text-right">체험가 최저</th>
              </tr>
            </thead>
            <tbody>
              {procs.map(([pid, p]) => {
                const qg = p.qty_groups.find((g) => g.hospitals >= 2);
                const d = dif[pid];
                const ch = d ? pct(d.median_cur, d.median_prev) : null;
                return (
                  <tr key={pid} className="border-b border-line last:border-0 hover:bg-[var(--bg)]">
                    <td className="whitespace-nowrap px-3 py-2"><Link className="link font-semibold" href={`/c/${clinic.id}/p/${pid}?date=${s.date}`}>{p.name}</Link>
                      {p.n_hospitals < 3 && <span className="tag tag-warn ml-1">표본 적음</span>}</td>
                    <td className="px-3 py-2 text-right">{p.n_hospitals}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{won(p.min)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{won(p.median)}
                      {ch != null && ch !== 0 && <span className={`ml-1 text-xs ${ch > 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}`}>{ch > 0 ? "▲" : "▼"}{Math.abs(ch)}%</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{won(p.max)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{p.ppu_median ? `${p.unit}당 ${won(p.ppu_median)}` : "–"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{qg ? `${qtyLabel(qg.qty, p.unit)} ${won(qg.median)} (${qg.hospitals}곳)` : "–"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right mute">{p.teaser_min ? won(p.teaser_min) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p className="mute text-xs">
          최저·중앙값·최고는 단품 옵션 기준(첫방문·체험가 제외, 단품이 3개 미만이면 전체). 단위당 = 샷·cc·유닛당 가격.
          보톡스는 제품(국산·수입)과 부위가 섞여 있어 단순 비교에 주의하세요. 시술명을 누르면 병원별·옵션별 가격이 나옵니다.
        </p>
      </main>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="card"><div className="mute text-xs">{label}</div><div className="text-2xl font-bold">{value}</div></div>;
}
