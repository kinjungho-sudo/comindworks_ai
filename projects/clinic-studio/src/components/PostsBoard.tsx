"use client";
// 원고 목록 → 발행 전 점검(final_check) → 원장님 승인 → (사전심의 대상이면) 심의필 번호 → 게시 완료 기록.
import { useCallback, useEffect, useState } from "react";
import { api, fileUrl, fmtTime } from "@/lib/client/api";
import { channelNote, gate, needsPreReview, type Post, STAGE_LABEL, type Stage } from "@/lib/shared/workflow";

type Finding = { severity: string; title: string; line?: number; excerpt?: string; cite_text?: string[]; law?: string };
type CheckResult = {
  ok: boolean;
  gates: { name: string; ok: boolean; detail: string }[];
  medad: Finding[];
  geo: { score: number; miss: { id: string; detail: string }[] };
  cite: { block: number; warn: number; findings: { severity: string; id: string; ref: number | null; message: string }[]; uncited: number };
  channel: string;
  markers: string[];
};

const STAGE_TAG: Record<Stage, string> = { draft: "tag-mute", checked: "tag-info", approved: "tag-warn", reviewed: "tag-warn", published: "tag-ok" };

export default function PostsBoard({ clinic }: { clinic: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api<Post[]>(`/api/clinics/${clinic}/posts`).then(setPosts).catch((e) => setErr(e.message));
  }, [clinic]);
  useEffect(load, [load]);

  if (err) return <div className="box-bad">{err}</div>;
  if (!posts) return <div className="mute">불러오는 중…</div>;
  return (
    <div className="space-y-4">
      <div className="box-warn">
        게시 순서: <b>발행 전 점검 통과</b> → <b>원장님 승인</b> → (네이버·인스타·유튜브는) <b>사전심의 심의필 번호</b> → 사람이 게시 후 <b>주소 기록</b>.
        점검·승인 뒤 원고가 바뀌면 다시 점검해야 합니다. 자동 검사는 사전심의·법률 검토를 대신하지 않습니다.
      </div>
      {posts.map((p) => <PostCard key={p.rel} clinic={clinic} post={p} onChange={load} />)}
      {!posts.length && <div className="card mute">output/ 아래에 원고(.md)가 없습니다.</div>}
    </div>
  );
}

function PostCard({ clinic, post, onChange }: { clinic: string; post: Post; onChange: () => void }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [by, setBy] = useState("");
  const [reviewNo, setReviewNo] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const a = post.approval;
  const pre = needsPreReview(post.platform);

  async function check() {
    setBusy("check"); setMsg("");
    try {
      const r = await api<{ result: CheckResult }>(`/api/clinics/${clinic}/posts/check`, { method: "POST", json: { rel: post.rel } });
      setResult(r.result); setOpen(true); onChange();
    } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }
  async function stage(to: Stage | "reset", extra: Record<string, string> = {}) {
    setBusy(to); setMsg("");
    try {
      await api(`/api/clinics/${clinic}/posts/stage`, { method: "POST", json: { rel: post.rel, to, ...extra } });
      onChange();
    } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }
  const gApprove = gate(post, "approved");
  const gReview = gate(post, "reviewed");
  const gPublish = gate(post, "published");
  const naverBase = `output/${post.folder}/naver/`;

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{post.title}</div>
          <div className="mute text-xs break-all">{post.rel}</div>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className={`tag ${STAGE_TAG[a.stage]}`}>{STAGE_LABEL[a.stage]}</span>
          <span className="tag tag-mute">{post.platform || "채널 미표기"}{post.format ? ` · ${post.format}` : ""}</span>
          {post.markers > 0 && <span className="tag tag-warn">원장님 확인 {post.markers}곳</span>}
          {post.stale && <span className="tag tag-bad">점검 뒤 원고 바뀜</span>}
        </div>
      </div>
      <div className="text-sm mute">{channelNote(post.platform)}</div>

      {a.check && (
        <div className="text-sm">
          마지막 점검 {fmtTime(a.check.at)} — <span className={a.check.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}>{a.check.summary}</span>{" "}
          <a className="link" href={fileUrl(clinic, a.check.report)} target="_blank">보고서</a>{" · "}
          <a className="link" href={fileUrl(clinic, a.check.sheet)} target="_blank">출처 대조표</a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={check} disabled={!!busy}>
          {busy === "check" ? "점검 중… (최대 1~2분)" : "발행 전 점검"}
        </button>
        {post.naverBundle && (
          <>
            <a className="btn" href={fileUrl(clinic, naverBase + "preview.html")} target="_blank">네이버 미리보기</a>
            <a className="btn" href={fileUrl(clinic, naverBase + "copy.html")} target="_blank">붙여 넣을 본문</a>
          </>
        )}
        {result && <button className="btn" onClick={() => setOpen(!open)}>{open ? "결과 접기" : "점검 결과 보기"}</button>}
      </div>

      {open && result && <CheckView r={result} />}

      <div className="grid gap-3 border-t border-line pt-3 md:grid-cols-3">
        <StepBox title="① 원장님 승인" done={["approved", "reviewed", "published"].includes(a.stage)}
          doneText={a.approvedBy ? `${a.approvedBy} · ${fmtTime(a.approvedAt)}` : ""} blocked={a.stage === "checked" ? gApprove : a.stage === "draft" ? gApprove : null}>
          <input className="input" placeholder="승인한 분 (예: 원장님)" value={by} onChange={(e) => setBy(e.target.value)} />
          <button className="btn w-full justify-center" disabled={!!gApprove || !by.trim() || !!busy} onClick={() => stage("approved", { by })}>승인 기록</button>
        </StepBox>
        <StepBox title={pre ? "② 사전심의 (필수)" : "② 사전심의 (해당 없음)"} done={a.stage === "reviewed" || (a.stage === "published" && !!a.reviewNo)}
          doneText={a.reviewNo ? `심의필 ${a.reviewNo} · ${fmtTime(a.reviewAt)}` : ""} blocked={pre ? (a.stage === "approved" ? gReview : null) : "자체 홈페이지 등은 심의 대상 아님"}>
          {pre && <>
            <input className="input" placeholder="심의필 번호" value={reviewNo} onChange={(e) => setReviewNo(e.target.value)} />
            <button className="btn w-full justify-center" disabled={!!gReview || !reviewNo.trim() || !!busy} onClick={() => stage("reviewed", { reviewNo })}>심의 완료 기록</button>
          </>}
        </StepBox>
        <StepBox title="③ 게시 완료" done={a.stage === "published"} doneText={a.postedUrl ? `${fmtTime(a.postedAt)}` : ""} blocked={a.stage !== "published" ? gPublish : null}
          extra={a.postedUrl ? <a className="link break-all text-xs" href={a.postedUrl} target="_blank" rel="noopener noreferrer">{a.postedUrl}</a> : null}>
          <input className="input" placeholder="게시한 글 주소 https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn w-full justify-center" disabled={!!gPublish || !url.trim() || !!busy} onClick={() => stage("published", { url })}>게시 기록</button>
        </StepBox>
      </div>
      {msg && <div className="box-bad">{msg}</div>}

      {a.history.length > 0 && (
        <details className="text-sm">
          <summary className="mute cursor-pointer">기록 {a.history.length}건</summary>
          <ul className="mt-2 space-y-1">
            {[...a.history].reverse().map((h, i) => <li key={i}><span className="mute">{fmtTime(h.at)}</span> {h.action} {h.note && <span className="mute">— {h.note}</span>}</li>)}
          </ul>
          {["approved", "reviewed"].includes(a.stage) && (
            <button className="btn mt-2" disabled={!!busy} onClick={() => stage("reset", { note: "화면에서 취소" })}>승인 취소</button>
          )}
        </details>
      )}
    </section>
  );
}

function StepBox({ title, done, doneText, blocked, children, extra }: {
  title: string; done: boolean; doneText: string; blocked: string | null; children?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        {title} {done && <span className="tag tag-ok">완료</span>}
      </div>
      {done ? <div className="text-xs mute">{doneText}</div> : <>{blocked && <div className="text-xs text-[var(--warn)]">{blocked}</div>}{children}</>}
      {extra}
    </div>
  );
}

function CheckView({ r }: { r: CheckResult }) {
  return (
    <div className="space-y-3 rounded-lg border border-line p-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {r.gates.map((g) => <span key={g.name} className={`tag ${g.ok ? "tag-ok" : "tag-bad"}`}>{g.name} {g.ok ? "통과" : "미달"} · {g.detail}</span>)}
      </div>
      <div>
        <div className="font-semibold">의료광고 검사</div>
        {r.medad.length === 0 && <div className="mute">걸린 표현 없음</div>}
        <ul className="space-y-2">
          {r.medad.map((f, i) => (
            <li key={i} className={f.severity === "block" ? "box-bad" : "box-warn"}>
              <b>{f.severity === "block" ? "고쳐야 함" : "확인"}</b> {f.line ? `${f.line}행 ` : ""}{f.title}
              {f.excerpt && <div className="mute break-words">「{f.excerpt}」</div>}
              {(f.cite_text || []).map((c, j) => <div key={j} className="mute text-xs">조문: {c}</div>)}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-semibold">GEO {r.geo.score}점</div>
        {r.geo.miss.map((m) => <div key={m.id} className="mute">· {m.detail}</div>)}
      </div>
      <div>
        <div className="font-semibold">출처 검사 — block {r.cite.block} · warn {r.cite.warn}</div>
        {r.cite.findings.map((f, i) => <div key={i} className={f.severity === "block" ? "text-[var(--bad)]" : "mute"}>· {f.ref ? `[${f.ref}] ` : ""}{f.message}</div>)}
        {r.cite.uncited > 0 && <div className="mute">· 출처 번호 없는 의학 주장 {r.cite.uncited}문장 — 대조표 끝에서 확인</div>}
      </div>
      {r.markers.length > 0 && (
        <div>
          <div className="font-semibold">원장님 확인 남음</div>
          {r.markers.map((m, i) => <div key={i} className="mute">· {m}</div>)}
        </div>
      )}
    </div>
  );
}
