import Link from "next/link";
import { redirect } from "next/navigation";
import { listClinics } from "@/lib/data";

export default async function Home() {
  const clinics = await listClinics();
  if (clinics.length === 1) redirect(`/c/${clinics[0].id}`);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-xl font-bold">시술가 시세</h1>
      {clinics.map((c) => (
        <Link key={c.id} href={`/c/${c.id}`} className="card block">
          <div className="font-semibold">{c.label}</div>
          <div className="mute text-sm">{c.area} · 조사 {c.dates.length}회 · 최근 {c.dates.at(-1)}</div>
        </Link>
      ))}
      {!clinics.length && <div className="card mute">아직 올라온 조사 결과가 없습니다.</div>}
    </main>
  );
}
