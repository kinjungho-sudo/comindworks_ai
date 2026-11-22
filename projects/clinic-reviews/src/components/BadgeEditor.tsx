"use client";
// 홈페이지 리뷰 배지: 채널별 평점·리뷰 수 + 원래 장소 페이지 링크만. 리뷰 원문은 넣지 않는다.
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { type Badge, badgeSnippet, EMPTY_BADGE, NAME, validateBadge } from "@/lib/shared/badge";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function BadgeEditor({ clinic }: { clinic: string }) {
  const [b, setB] = useState<Badge | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ badge: Badge }>(`/api/clinics/${clinic}/badge`)
      .then((r) => setB({ ...EMPTY_BADGE, ...r.badge, confirmed: { ...EMPTY_BADGE.confirmed, ...r.badge.confirmed } }))
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, [clinic]);
  if (!b) return <div className="mute">{msg?.text || "불러오는 중…"}</div>;

  const set = (k: "naver" | "kakao" | "google", f: "count" | "rating" | "url", v: string) =>
    setB({ ...b, [k]: { ...b[k], [f]: f === "url" ? v.trim() : num(v) } });
  const errs = validateBadge(b);
  const snippet = badgeSnippet(b);

  async function sendHomepage() {
    setBusy(true); setMsg(null);
    try {
      await api(`/api/clinics/${clinic}/badge`, { method: "PUT", json: b });
      const r = await api<{ written: string[]; confirmed: boolean }>(`/api/clinics/${clinic}/badge/homepage`, { method: "POST" });
      setMsg({ ok: true, text: `홈페이지 데이터로 보냈습니다 (${r.written.length}곳). 다음 개발 배포 때 개발 사이트에 반영됩니다${r.confirmed ? "" : " · 법률 확인 전이라 운영 사이트에는 표시되지 않습니다"}` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api(`/api/clinics/${clinic}/badge`, { method: "PUT", json: b });
      setMsg({ ok: true, text: "저장했습니다" });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="box-warn">
        홈페이지에는 <b>평점·리뷰 수와 원래 페이지 링크만</b> 싣습니다. 리뷰 원문을 홈페이지에 옮기면 치료경험담 광고(의료법 제56조 제2항 제2호)가 될 수 있어 이 화면은 원문을 다루지 않습니다.
        숫자 표시도 처음 쓰기 전에 <b>의료광고 심의기구(대한의사협회 등)나 변호사에게 한 번 확인</b>받으세요. 확인 전에는 미리보기만 되고 내려받기는 잠겨 있습니다.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div><label className="label">기준일 (숫자를 확인한 날)</label>
            <input className="input" type="date" value={b.asOf} onChange={(e) => setB({ ...b, asOf: e.target.value })} /></div>
          {(["naver", "kakao", "google"] as const).map((k) => (
            <fieldset key={k} className="space-y-2 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-semibold">{NAME[k]}</legend>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">리뷰 수</label>
                  <input className="input" inputMode="numeric" value={b[k].count ?? ""} onChange={(e) => set(k, "count", e.target.value)} /></div>
                {k === "naver" ? (
                  <div className="mute self-end pb-2 text-xs">네이버 플레이스는 별점이 없어 리뷰 수만 표시합니다</div>
                ) : (
                  <div><label className="label">평점 (0~5)</label>
                    <input className="input" inputMode="decimal" value={b[k].rating ?? ""} onChange={(e) => set(k, "rating", e.target.value)} /></div>
                )}
              </div>
              <div><label className="label">장소 페이지 주소</label>
                <input className="input" placeholder="https://…" value={b[k].url ?? ""} onChange={(e) => set(k, "url", e.target.value)} /></div>
            </fieldset>
          ))}
          <fieldset className="space-y-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-semibold">법률 확인</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={b.confirmed.done}
                onChange={(e) => setB({ ...b, confirmed: { ...b.confirmed, done: e.target.checked, at: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined } })} />
              심의기구·변호사에게 이 배지 표시를 확인받았습니다
            </label>
            {b.confirmed.done && <>
              <input className="input" placeholder="확인해 준 곳 (예: 의협 의료광고심의위원회 전화 문의)" value={b.confirmed.by ?? ""} onChange={(e) => setB({ ...b, confirmed: { ...b.confirmed, by: e.target.value } })} />
              <input className="input" placeholder="메모 (조건 등)" value={b.confirmed.note ?? ""} onChange={(e) => setB({ ...b, confirmed: { ...b.confirmed, note: e.target.value } })} />
            </>}
          </fieldset>
          {errs.length > 0 && <div className="box-bad">{errs.map((x) => <div key={x}>{x}</div>)}</div>}
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={busy || errs.length > 0} onClick={save}>{busy ? "저장 중…" : "저장"}</button>
            <button className="btn" disabled={busy || errs.length > 0 || !snippet} onClick={sendHomepage}>홈페이지로 보내기</button>
            {msg && <span className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>{msg.text}</span>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card space-y-2">
            <div className="text-sm font-semibold">미리보기</div>
            {snippet ? <div className="rounded-lg border border-dashed border-line p-4" dangerouslySetInnerHTML={{ __html: snippet }} />
              : <div className="mute text-sm">리뷰 수나 평점, 그리고 주소를 넣으면 나타납니다.</div>}
          </div>
          <div className="card space-y-2">
            <div className="text-sm font-semibold">홈페이지에 붙이기</div>
            <ol className="mute list-decimal space-y-1 pl-5 text-sm">
              <li><b>밴스의원 홈페이지(자동):</b> &lsquo;홈페이지로 보내기&rsquo;를 누르면 홈페이지 데이터에 들어가고, 다음 개발 배포 때 개발 사이트에 보입니다. 운영 사이트에는 법률 확인을 체크한 뒤에만 보입니다.</li>
              <li>다른 홈페이지(수동): 저장 후 법률 확인을 체크합니다.</li>
              <li>아래 버튼으로 HTML 조각을 내려받아 홈페이지 관리자 화면의 HTML 넣기 칸에 붙여 넣습니다.</li>
              <li>숫자는 자동으로 바뀌지 않습니다. 한 달에 한 번 숫자·기준일을 고치고 다시 붙여 넣으세요.</li>
            </ol>
            <a className={`btn ${b.confirmed.done && snippet ? "btn-primary" : "pointer-events-none opacity-45"}`}
              href={`/api/clinics/${clinic}/badge/snippet`}>HTML 조각 내려받기</a>
            {!b.confirmed.done && <div className="text-xs text-[var(--warn)]">법률 확인 전이라 잠겨 있습니다 (저장한 값 기준)</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
