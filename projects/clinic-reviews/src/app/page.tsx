import Link from "next/link";
import { connection } from "next/server";
import { listClinics } from "@/lib/server/core";

export default async function Home() {
  await connection(); // 요청마다 병원 폴더를 다시 읽는다
  const clinics = listClinics();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">병원 선택</h1>
        <p className="mute text-sm">저장소 projects/ 안에서 리뷰 설정(review_watch.json)이 있는 병원 폴더를 찾았습니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {clinics.map((c) => (
          <Link key={c.id} href={`/c/${c.id}/reviews`} className="card block hover:border-[var(--accent)]">
            <div className="font-semibold">{c.label}</div>
            <div className="mute text-sm">projects/{c.id}</div>
          </Link>
        ))}
        {!clinics.length && <div className="card mute">review_watch.json이 있는 병원 폴더가 없습니다.</div>}
      </div>
    </div>
  );
}
