import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import ProcDetail from "@/components/ProcDetail";
import { compare } from "@/lib/compare";
import { getClinic, getSurvey, trend } from "@/lib/data";
import { won } from "@/lib/format";

export default async function ProcPage({ params, searchParams }: PageProps<"/c/[clinic]/p/[proc]">) {
  const { clinic: id, proc } = await params;
  const { date } = await searchParams;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const s = await getSurvey(clinic, typeof date === "string" ? date : undefined);
  const p = s?.procedures[proc];
  if (!s || !p) notFound();
  const groups = compare(proc, p);
  const hospitals = [...new Set(Object.values(s.procedures).flatMap((x) => x.hospitals.map((h) => h.hospital)))].sort();
  const t = await trend(clinic, proc);
  return (
    <>
      <Header clinic={clinic} date={s.date} hospitals={hospitals} back={{ href: `/c/${clinic.id}?date=${s.date}`, label: "전체 시술" }} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="fg2 text-sm">{s.date} 조사 · 이벤트 {p.n_events}건 · 병원 {p.n_hospitals}곳{p.teaser_n ? ` · 첫방문·체험가 ${p.teaser_n}개는 비교에서 뺌(최저 ${won(p.teaser_min)})` : ""}</p>
        </div>
        <Notice />
        {groups.length ? <ProcDetail slug={clinic.id} procId={proc} unit={p.unit} groups={groups} /> : <div className="card mute">같은 기준으로 비교할 수 있는 단품 옵션이 없습니다.</div>}
        {t.length > 1 && (
          <section className="card">
            <h2 className="mb-2 text-lg font-bold">조사별 중앙값</h2>
            <div className="space-y-1 text-sm">{t.map((x) => (
              <div key={x.date} className="num flex gap-4"><span className="mute w-24">{x.date}</span><b className="w-20 text-right">{won(x.median)}</b><span className="mute">병원 {x.n}곳</span></div>
            ))}</div>
          </section>
        )}
      </main>
    </>
  );
}
