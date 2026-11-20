"use client";
// 우리 병원 설정: 강남언니에 올라온 병원 이름을 고르거나, 시술별 우리 단가를 직접 넣는다.
// 이 브라우저에만 저장된다(localStorage). 서버로 보내지 않는다.
import { useCallback, useEffect, useState } from "react";

type State = { name: string; prices: Record<string, number> };
const KEY = (slug: string) => `cp-our:${slug}`;
const EVT = "cp-our-change";

function read(slug: string): State {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(slug)) || "null");
    if (v && typeof v === "object") return { name: String(v.name || ""), prices: v.prices || {} };
  } catch {}
  return { name: "", prices: {} };
}

export function useOurClinic(slug: string) {
  const [st, setSt] = useState<State>({ name: "", prices: {} });
  useEffect(() => {
    const sync = () => setSt(read(slug));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, [slug]);
  const save = useCallback((next: State) => {
    try { localStorage.setItem(KEY(slug), JSON.stringify(next)); } catch {}
    setSt(next);
    window.dispatchEvent(new Event(EVT));
  }, [slug]);
  return {
    name: st.name,
    prices: st.prices,
    setName: (name: string) => save({ ...read(slug), name: name.trim() }),
    setPrice: (key: string, v: number | null) => {
      const cur = read(slug);
      const prices = { ...cur.prices };
      if (v == null || !(v > 0)) delete prices[key]; else prices[key] = Math.round(v);
      save({ ...cur, prices });
    },
  };
}
