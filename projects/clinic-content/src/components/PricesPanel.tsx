"use client";
// 시술가 시세: 보고서 보기 + 사람이 누를 때만 새 조사 (강남언니 공개 화면, 소량). 결과는 내부 참고용.
import { useCallback, useEffect, useState } from "react";
import { api, fileUrl, fmtTime } from "@/lib/client/api";

type State = { reports: { name: string; rel: string }[]; running: boolean; state: { startedAt?: string; finishedAt?: string; code?: number | null }; log: string };

export default function PricesPanel({ clinic }: { clinic: string }) {
  const [s, setS] = useState<State | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api<State>(`/api/clinics/${clinic}/prices`).then((x) => { setS(x); setErr(""); }).catch((e) => setErr(e.message));
  }, [clinic]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!s?.running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [s?.running, load]);

  const [pub, setPub] = useState<{ busy: boolean; msg?: string; ok?: boolean }>({ busy: false });
  async function publish() {
    if (!confirm("최근 조사 결과를 배포 앱(clinic-prices.vercel.app)에 올립니다. 1~3분 걸립니다.")) return;
    setPub({ busy: true });
    try {
      await api<{ url: string }>(`/api/clinics/${clinic}/prices/publish`, { method: "POST" });
      setPub({ busy: false, ok: true, msg: "올렸습니다 — clinic-prices.vercel.app" });
    } catch (e) { setPub({ busy: false, ok: false, msg: (e as Error).message }); }
  }

  async function start() {
    if (!confirm("강남언니 공개 이벤트 화면을 4~7초 간격으로 소량 조회합니다(10~15분). 시작할까요?")) return;
    try { await api(`/api/clinics/${clinic}/prices`, { method: "POST" }); load(); } catch (e) { setErr((e as Error).message); }
  }

  if (err && !s) return <div className="box-bad">{err}</div>;
  if (!s) return <div className="mute">불러오는 중…</div>;
  const latest = s.reports[0];
  return (
    <div className="space-y-4">
      <div className="box-warn">
        <b>내부 참고용</b>입니다. 다른 병원 가격·순위를 블로그·SNS·광고·홈페이지에 싣지 않습니다(의료법 제56조 제2항 제4호, 비교 광고).
        강남언니는 검색엔진 외 자동 수집을 막고 있어, 필요할 때 사람이 눌러서 소량만 조사합니다(정기 자동 실행 없음).
      </div>
      <div className="card flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={s.running} onClick={start}>{s.running ? "조사 중…" : "새로 조사하기"}</button>
        <button className="btn" disabled={s.running || pub.busy || !s.reports.length} onClick={publish}>{pub.busy ? "올리는 중… (1~3분)" : "배포 앱에 올리기"}</button>
        <a className="link text-sm" href="https://clinic-prices.vercel.app" target="_blank" rel="noopener noreferrer">배포 앱 열기 ›</a>
        <span className="mute text-sm">
          {s.running ? `시작 ${fmtTime(s.state.startedAt)} · 5초마다 새로 고침`
            : s.state.finishedAt ? `지난 조사 ${fmtTime(s.state.finishedAt)} ${s.state.code === 0 ? "완료" : `(종료 코드 ${s.state.code})`}` : "앱에서 조사한 기록 없음"}
        </span>
      </div>
      {pub.msg && <div className={pub.ok ? "box-ok" : "box-bad whitespace-pre-wrap"}>{pub.msg}</div>}
      {(s.running || s.log) && <pre className="card overflow-x-auto text-xs mute whitespace-pre-wrap">{s.log || "로그 대기 중…"}</pre>}
      {latest ? (
        <div className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">최근 보고서 — {latest.name}</div>
            <a className="btn" href={fileUrl(clinic, latest.rel)} target="_blank">새 창으로 열기</a>
          </div>
          <iframe title="시세 보고서" src={fileUrl(clinic, latest.rel)} className="h-[75vh] w-full rounded-lg border border-line bg-white" />
        </div>
      ) : <div className="card mute">아직 보고서가 없습니다.</div>}
      {s.reports.length > 1 && (
        <div className="card text-sm">
          <div className="font-semibold">지난 보고서</div>
          {s.reports.slice(1).map((r) => <div key={r.rel}><a className="link" href={fileUrl(clinic, r.rel)} target="_blank">{r.name}</a></div>)}
        </div>
      )}
    </div>
  );
}
