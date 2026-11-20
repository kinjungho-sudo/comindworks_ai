"use client";
// 네이버 플레이스 리뷰 가져오기: ① 목록 통째로 붙여 넣기 / ② 버튼으로 가져오기 → 미리보기에서 확인·수정 → 저장
import { useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "@/lib/client/api";

type Item = { id: string; date: string; author: string; text: string; reply: string; keywords: string[]; isNew: boolean };
type Status = { url: string; profileReady: boolean; loginWindowOpen: boolean; lastFetchAt: string | null; lastResult: string | null; nextAllowedAt: string | null };
type Row = Item & { pick: boolean };

export default function NaverPanel({ clinic, onSaved }: { clinic: string; onSaved: () => void }) {
  const [mode, setMode] = useState<"paste" | "fetch">("paste");
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = useCallback(() => {
    api<Status>(`/api/clinics/${clinic}/naver`).then((s) => { setSt(s); setUrl((u) => u || s.url); }).catch(() => {});
  }, [clinic]);
  useEffect(loadStatus, [loadStatus]);

  const show = (items: Item[]) => setRows(items.map((i) => ({ ...i, pick: i.isNew })));
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(""); loadStatus();
  }
  const parse = () => run("parse", async () => {
    const r = await api<{ items: Item[] }>(`/api/clinics/${clinic}/naver/parse`, { method: "POST", json: { text: paste } });
    show(r.items);
    if (!r.items.length) setMsg({ ok: false, text: "리뷰를 찾지 못했습니다. 리뷰 목록 부분을 다시 복사해 주세요" });
  });
  const fetchNow = () => run("fetch", async () => {
    const r = await api<{ items: Item[] }>(`/api/clinics/${clinic}/naver/fetch`, { method: "POST" });
    show(r.items);
    if (!r.items.length) setMsg({ ok: false, text: "화면은 열었지만 리뷰를 찾지 못했습니다. 주소가 '리뷰' 목록 화면인지 확인하세요" });
  });
  const saveUrl = () => run("url", async () => { await api(`/api/clinics/${clinic}/naver`, { method: "PUT", json: { url } }); setMsg({ ok: true, text: "주소를 저장했습니다" }); });
  const login = () => run("login", async () => {
    await api(`/api/clinics/${clinic}/naver/login`, { method: "POST" });
    setMsg({ ok: true, text: "맥미니 화면에 크롬 창이 열렸습니다. 직접 네이버에 로그인한 뒤 창을 닫아 주세요" });
  });
  const save = () => run("save", async () => {
    const picked = (rows || []).filter((r) => r.pick);
    const res = await api<{ added: number; skipped: number }>(`/api/clinics/${clinic}/reviews`, {
      method: "POST",
      json: { rows: picked.map((r) => ({ platform: "네이버", date: r.date, rating: "", author: r.author, text: r.text, reply: r.reply })) },
    });
    setMsg({ ok: true, text: `${res.added}건 저장${res.skipped ? ` · 이미 있던 ${res.skipped}건 건너뜀` : ""}` });
    setRows(null); setPaste(""); onSaved();
  });
  const upd = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const badDate = (rows || []).some((r) => r.pick && !/^\d{4}-\d{2}-\d{2}$/.test(r.date));

  return (
    <details className="card" open>
      <summary className="cursor-pointer font-semibold">네이버 플레이스 리뷰 가져오기</summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${mode === "paste" ? "btn-primary" : ""}`} onClick={() => setMode("paste")}>① 목록 통째로 붙여 넣기</button>
          <button className={`btn ${mode === "fetch" ? "btn-primary" : ""}`} onClick={() => setMode("fetch")}>② 버튼으로 가져오기</button>
        </div>

        {mode === "paste" ? (
          <div className="space-y-2">
            <p className="mute text-sm">스마트플레이스 관리자 화면(또는 네이버 지도)의 리뷰 목록에서 <b>전체 선택(⌘A) → 복사(⌘C)</b> 후 아래에 붙여 넣으세요. 메뉴·버튼 글자는 자동으로 걸러집니다.</p>
            <textarea className="textarea" style={{ minHeight: 140 }} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="여기에 붙여 넣기" />
            <button className="btn btn-primary" disabled={!paste.trim() || !!busy} onClick={parse}>{busy === "parse" ? "나누는 중…" : "리뷰로 나누기"}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="box-warn">
              맥미니의 크롬(이 앱 전용 프로필)이 <b>우리 병원 스마트플레이스 리뷰 화면 1장</b>을 열어 글자를 읽어 옵니다. 누를 때만 동작하고 {"10분에 한 번"}으로 제한했습니다.
              네이버 약관은 자동 접속을 제한하므로 계정 제재 가능성이 조금 있습니다. 답글 작성·클릭은 하지 않습니다.
            </div>
            <div>
              <label className="label">우리 병원 스마트플레이스 &apos;리뷰&apos; 화면 주소 (관리자 화면에서 주소창을 복사)</label>
              <div className="flex gap-2">
                <input className="input" placeholder="https://new.smartplace.naver.com/…/reviews" value={url} onChange={(e) => setUrl(e.target.value)} />
                <button className="btn" disabled={!url.trim() || !!busy} onClick={saveUrl}>저장</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn" disabled={!!busy || st?.loginWindowOpen} onClick={login}>
                {st?.loginWindowOpen ? "로그인 창 열려 있음" : st?.profileReady ? "다시 로그인" : "처음 한 번: 로그인 창 열기"}
              </button>
              <button className="btn btn-primary" disabled={!!busy || !st?.url || !!st?.nextAllowedAt || st?.loginWindowOpen} onClick={fetchNow}>
                {busy === "fetch" ? "네이버 화면 읽는 중… (30초~1분)" : "새 리뷰 가져오기"}
              </button>
              <span className="mute text-xs">
                {st?.lastFetchAt && `지난번 ${fmtTime(st.lastFetchAt)} · ${st.lastResult ?? ""}`}
                {st?.nextAllowedAt && ` · 다음 가능 ${fmtTime(st.nextAllowedAt)}`}
              </span>
            </div>
          </div>
        )}

        {msg && <div className={msg.ok ? "box-ok" : "box-bad"}>{msg.text}</div>}

        {rows && rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm"><b>미리보기</b> — {rows.length}건 찾음 · 새 리뷰 {rows.filter((r) => r.isNew).length}건. 틀린 곳은 고친 뒤 저장하세요.</div>
              <button className="btn btn-primary" disabled={!!busy || !rows.some((r) => r.pick) || badDate} onClick={save}>
                {busy === "save" ? "저장 중…" : `선택한 ${rows.filter((r) => r.pick).length}건 저장`}
              </button>
            </div>
            {badDate && <div className="text-xs text-[var(--bad)]">선택한 리뷰 중 날짜가 비었거나 형식이 틀린 것이 있습니다 (예: 2026-11-20)</div>}
            {rows.map((r, i) => (
              <div key={r.id + i} className={`rounded-lg border border-line p-2 text-sm ${r.pick ? "" : "opacity-50"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="checkbox" checked={r.pick} onChange={(e) => upd(i, { pick: e.target.checked })} aria-label="저장할 리뷰 선택" />
                  <input className="input !w-36" value={r.date} onChange={(e) => upd(i, { date: e.target.value })} placeholder="2026-11-20" />
                  <input className="input !w-40" value={r.author} onChange={(e) => upd(i, { author: e.target.value })} placeholder="닉네임" />
                  {!r.isNew && <span className="tag tag-mute">이미 저장됨</span>}
                  {r.reply && <span className="tag tag-ok">네이버에 답글 있음</span>}
                  {r.keywords.length > 0 && <span className="mute text-xs">키워드: {r.keywords.join(", ")}</span>}
                </div>
                <textarea className="textarea mt-2" style={{ minHeight: 60 }} value={r.text} onChange={(e) => upd(i, { text: e.target.value })} />
                {r.reply && <div className="mute mt-1 whitespace-pre-wrap text-xs">답글: {r.reply}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
