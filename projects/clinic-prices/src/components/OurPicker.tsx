"use client";
// 우리 병원 고르기 (강남언니에 올라온 병원 이름 중에서, 또는 시술 화면에서 단가 직접 입력)
import { useState } from "react";
import { useOurClinic } from "@/lib/our";

export default function OurPicker({ slug, hospitals }: { slug: string; hospitals: string[] }) {
  const our = useOurClinic(slug);
  const [v, setV] = useState("");
  if (our.name) {
    return (
      <div className="flex items-center gap-2">
        <span className="tag tag-our">우리 병원: {our.name}</span>
        <button className="btn !px-3 !py-1 text-xs" onClick={() => our.setName("")}>바꾸기</button>
      </div>
    );
  }
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) our.setName(v); }}>
      <input className="input !w-56 !py-1.5" list="cp-hospitals" value={v} onChange={(e) => setV(e.target.value)} placeholder="우리 병원 이름 입력" aria-label="우리 병원 이름" />
      <datalist id="cp-hospitals">{hospitals.map((h) => <option key={h} value={h} />)}</datalist>
      <button className="btn !py-1.5" type="submit">기준으로 보기</button>
    </form>
  );
}
