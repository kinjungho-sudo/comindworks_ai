import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import Overview, { type ProcCard } from "@/components/Overview";
import { compare } from "@/lib/compare";
import { getClinic, getSurvey } from "@/lib/data";
import { pct } from "@/lib/format";

export default async function ClinicPage({ params, searchParams }: PageProps<"/c/[clinic]">) {
  const { clinic: id } = await params;
  const { date } = await searchParams;
  const clinic = await getClinic(id);
  if (!clinic) notFound();
  const s = await getSurvey(clinic, typeof date === "string" ? date : undefined);
  if (!s) notFound();
  const procs = Object.entries(s.procedures);
  const hospitals = [...new Set(procs.flatMap(([, p]) => p.hospitals.map((h) => h.hospital)))].sort();
  const cards: ProcCard[] = procs.map(([pid, p]) => {
    const d = s.diff?.procedures?.[pid];
    return { id: pid, name: p.name, unit: p.unit, nHospitals: p.n_hospitals, groups: compare(pid, p), changePct: d ? pct(d.median_cur, d.median_prev) : null };
  });
  return (
    <>
      <Header clinic={clinic} date={s.date} hospitals={hospitals} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">{s.area} 근처 피부과, 시술별 단가 비교</h1>
          <p className="fg2 text-sm">병원 {hospitals.length}곳 · 시술 {cards.length}개 · 같은 기준(샷·cc당, 1회, 1부위)으로 맞춰 비교합니다. 위에 <b>우리 병원</b>을 넣으면 시술마다 순위가 나옵니다.</p>
        </div>
        <Notice />
        <Overview slug={clinic.id} date={s.date} cards={cards} />
        <p className="mute text-xs">조사 지역: {s.stations.join(", ")} · 출처: 강남언니(unni.app) 공개 이벤트 화면, {s.date} 조사{s.diff?.prev_date ? ` · ▲▼는 ${s.diff.prev_date} 조사 대비` : ""}</p>
      </main>
    </>
  );
}
