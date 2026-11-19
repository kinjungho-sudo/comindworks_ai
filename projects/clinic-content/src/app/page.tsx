import Link from "next/link";
import { connection } from "next/server";
import { listClinics } from "@/lib/server/core";
import { listPosts } from "@/lib/server/posts";

export default async function Home() {
  await connection(); // 요청마다 병원 폴더를 다시 읽는다
  const clinics = listClinics();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">병원 선택</h1>
        <p className="mute text-sm">저장소 projects/ 안에서 병원 설정(price_watch·review_watch·의료광고 검사기)이 있는 폴더를 찾았습니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {clinics.map((c) => {
          const posts = listPosts(c.id);
          const waiting = posts.filter((p) => p.approval.stage !== "published").length;
          return (
            <Link key={c.id} href={`/c/${c.id}/posts`} className="card block hover:border-[var(--accent)]">
              <div className="font-semibold">{c.label}</div>
              <div className="mute text-sm">projects/{c.id}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="tag tag-info">원고 {posts.length}편 · 게시 전 {waiting}</span>
                {c.hasPrices && <span className="tag tag-mute">시세 조사</span>}
              </div>
            </Link>
          );
        })}
        {!clinics.length && <div className="card mute">병원 폴더가 없습니다.</div>}
      </div>
    </div>
  );
}
