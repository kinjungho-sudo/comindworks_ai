"use client";
// 리뷰 넣기 → 분류(긴급·불만·질문·칭찬) → 답글 초안 작성·의료법 검사 → 사람이 플랫폼에 게시 → "게시함" 표시.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import NaverPanel from "./NaverPanel";

type Finding = { id: string; severity: "block" | "warn"; title: string; hit: string; fix: string; cite: string[] };
type Review = {
  id: string; platform: string; date: string; rating: string; author: string; text: string;
  reply: string; reply_draft: string; cat: Cat; rating_num: number | null; flags: string[];
  answered: boolean; draft_check: Finding[]; posted_check: Finding[]; age: number | null;
};
type Cat = "urgent" | "complaint" | "question" | "praise" | "other";

const CAT: Record<Cat, [string, string]> = {
  urgent: ["긴급", "tag-bad"], complaint: ["불만", "tag-warn"], question: ["질문", "tag-info"], praise: ["칭찬", "tag-ok"], other: ["기타", "tag-mute"],
};
// clinic-review-care references/reply-guide.md의 틀 (검사 통과 문장). 리뷰에 맞게 한두 단어를 바꿔 쓴다.
const TEMPLATE: Record<Cat, string> = {
  urgent: "불편을 드려 정말 죄송합니다. 말씀 주신 증상은 바로 확인이 필요해요. 병원 대표번호로 연락 주시면 원장님이 직접 살펴보겠습니다.",
  complaint: "소중한 말씀 남겨 주셔서 감사합니다. 불편을 드려 죄송합니다. 말씀 주신 부분을 다시 살피겠습니다. 더 말씀하실 내용이 있으시면 병원 대표번호로 연락 주세요.",
  question: "문의 남겨 주셔서 감사합니다. 자세한 내용은 병원 대표번호로 문의해 주시면 안내해 드릴게요.",
  praise: "좋게 봐 주셔서 감사합니다. 편하게 다녀가실 수 있도록 더 살피겠습니다.",
  other: "남겨 주셔서 감사합니다. 불편하셨던 점이 있으시면 병원 대표번호로 편하게 말씀 주세요.",
};
const PLATFORMS = ["네이버", "카카오", "구글", "강남언니", "기타"];

export default function ReviewsBoard({ clinic }: { clinic: string }) {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"open" | "all" | Cat>("open");
  const load = useCallback(() => {
    api<Review[]>(`/api/clinics/${clinic}/reviews`).then((r) => { setRows(r); setErr(""); }).catch((e) => setErr(e.message));
  }, [clinic]);
  useEffect(load, [load]);

  const order: Cat[] = ["urgent", "complaint", "question", "praise", "other"];
  const shown = useMemo(() => {
    if (!rows) return [];
    const f = rows.filter((r) => (filter === "all" ? true : filter === "open" ? !r.answered : r.cat === filter));
    return f.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || (b.date || "").localeCompare(a.date || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter]);

  if (err) return <div className="box-bad">{err}</div>;
  const urgentOpen = rows?.filter((r) => r.cat === "urgent" && !r.answered) || [];
  const rated = rows?.filter((r) => r.rating_num != null) || [];
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.rating_num || 0), 0) / rated.length).toFixed(2) : "-";

  return (
    <div className="space-y-4">
      <div className="box-warn">
        리뷰 원문과 닉네임은 개인정보라 이 맥미니의 병원 폴더(data/reviews/)에만 저장되고 git에 올라가지 않습니다.
        답글은 여기서 초안·검사만 하고, <b>게시는 사람이 각 플랫폼에서</b> 합니다. 리뷰를 블로그·SNS·홈페이지에 옮겨 싣지 마세요(의료법 제56조 제2항 제2호).
      </div>
      {rows && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="전체 리뷰" value={rows.length} />
          <Kpi label="평균 별점 (별점 있는 리뷰)" value={avg} />
          <Kpi label="미답변" value={rows.filter((r) => !r.answered).length} />
          <Kpi label="긴급 미답변" value={urgentOpen.length} bad={urgentOpen.length > 0} />
        </div>
      )}
      {urgentOpen.length > 0 && (
        <div className="box-bad">
          <b>오늘 바로 할 일</b> — 긴급 리뷰 {urgentOpen.length}건. 공개 답글보다 먼저 원장님이 확인하고 개별 연락하세요.
        </div>
      )}
      <NaverPanel clinic={clinic} onSaved={load} />
      <ImportBox clinic={clinic} onDone={load} />
      <div className="flex flex-wrap gap-2">
        {(["open", "all", ...order] as const).map((k) => (
          <button key={k} className={`btn ${filter === k ? "btn-primary" : ""}`} onClick={() => setFilter(k)}>
            {k === "open" ? "미답변" : k === "all" ? "전체" : CAT[k][0]}
            <span className="opacity-70">{rows ? (k === "open" ? rows.filter((r) => !r.answered).length : k === "all" ? rows.length : rows.filter((r) => r.cat === k).length) : ""}</span>
          </button>
        ))}
      </div>
      {!rows && <div className="mute">불러오는 중…</div>}
      {shown.map((r) => <ReviewCard key={r.id} clinic={clinic} r={r} onChange={load} />)}
      {rows && !shown.length && <div className="card mute">해당하는 리뷰가 없습니다.</div>}
    </div>
  );
}

function Kpi({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div className="card">
      <div className="mute text-xs">{label}</div>
      <div className={`text-2xl font-bold ${bad ? "text-[var(--bad)]" : ""}`}>{value}</div>
    </div>
  );
}

function ImportBox({ clinic, onDone }: { clinic: string; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"one" | "csv">("one");
  const [one, setOne] = useState({ platform: "네이버", date: today, rating: "", author: "", text: "" });
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ added: number; skipped: number }>(`/api/clinics/${clinic}/reviews`, {
        method: "POST", json: mode === "one" ? { rows: [one] } : { csv },
      });
      setMsg({ ok: true, text: `${r.added}건 추가${r.skipped ? ` · 이미 있는 리뷰 ${r.skipped}건 건너뜀` : ""}` });
      if (mode === "one") setOne({ ...one, author: "", text: "", rating: "" }); else setCsv("");
      onDone();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">다른 채널 리뷰 넣기 <span className="mute text-sm font-normal">— 카카오·구글·강남언니 등 한 건씩 또는 CSV</span></summary>
      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          <button className={`btn ${mode === "one" ? "btn-primary" : ""}`} onClick={() => setMode("one")}>한 건씩</button>
          <button className={`btn ${mode === "csv" ? "btn-primary" : ""}`} onClick={() => setMode("csv")}>CSV 여러 건</button>
        </div>
        {mode === "one" ? (
          <div className="grid gap-2 sm:grid-cols-4">
            <div><label className="label">채널</label>
              <select className="select" value={one.platform} onChange={(e) => setOne({ ...one, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select></div>
            <div><label className="label">작성일</label><input className="input" type="date" value={one.date} onChange={(e) => setOne({ ...one, date: e.target.value })} /></div>
            <div><label className="label">별점 (없으면 비움)</label><input className="input" inputMode="decimal" placeholder="예: 5" value={one.rating} onChange={(e) => setOne({ ...one, rating: e.target.value })} /></div>
            <div><label className="label">닉네임</label><input className="input" value={one.author} onChange={(e) => setOne({ ...one, author: e.target.value })} /></div>
            <div className="sm:col-span-4"><label className="label">리뷰 원문 (고치지 말고 그대로)</label>
              <textarea className="textarea" value={one.text} onChange={(e) => setOne({ ...one, text: e.target.value })} /></div>
          </div>
        ) : (
          <div>
            <label className="label">첫 줄: platform,date,rating,author,text,reply,reply_draft</label>
            <textarea className="textarea font-mono text-xs" style={{ minHeight: 140 }} value={csv} onChange={(e) => setCsv(e.target.value)}
              placeholder={'platform,date,rating,author,text,reply,reply_draft\n네이버,2026-11-20,5,닉네임,"리뷰 원문",,'} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={busy || (mode === "one" ? !one.text.trim() : !csv.trim())} onClick={submit}>{busy ? "저장 중…" : "저장"}</button>
          {msg && <span className={msg.ok ? "text-[var(--ok)] text-sm" : "text-[var(--bad)] text-sm"}>{msg.text}</span>}
        </div>
      </div>
    </details>
  );
}

function Findings({ list }: { list: Finding[] }) {
  if (!list.length) return <div className="text-xs text-[var(--ok)]">검사 통과</div>;
  return (
    <div className="space-y-1">
      {list.map((f, i) => (
        <div key={i} className={`${f.severity === "block" ? "box-bad" : "box-warn"} text-xs`}>
          <b>{f.severity === "block" ? "고쳐야 함" : "확인"}</b> {f.title}{f.hit && <> — 「{f.hit}」</>}
          <div className="mute">{f.fix}</div>
          {f.cite.map((c, j) => <div key={j} className="mute">조문: {c}</div>)}
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ clinic, r, onChange }: { clinic: string; r: Review; onChange: () => void }) {
  const [draft, setDraft] = useState(r.reply_draft || "");
  const [checks, setChecks] = useState<Finding[] | null>(r.reply_draft ? r.draft_check : null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const dirty = draft.trim() !== (r.reply_draft || "").trim();
  const blocked = (checks || []).some((f) => f.severity === "block");

  async function check(text = draft) {
    if (!text.trim()) return;
    setBusy("check");
    try {
      const res = await api<{ findings: Finding[] }>("/api/check-reply", { method: "POST", json: { text, cat: r.cat } });
      setChecks(res.findings);
    } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }
  async function save(patch: { reply_draft?: string; reply?: string }, label: string) {
    setBusy(label); setMsg("");
    try {
      await api(`/api/clinics/${clinic}/reviews`, { method: "PATCH", json: { id: r.id, ...patch } });
      onChange();
    } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }

  return (
    <article className="card space-y-2" style={{ borderLeft: `4px solid var(--${r.cat === "urgent" ? "bad" : r.cat === "complaint" ? "warn" : r.cat === "praise" ? "ok" : r.cat === "question" ? "info" : "line"})` }}>
      <div className="flex flex-wrap items-center gap-2 text-xs mute">
        <span className={`tag ${CAT[r.cat][1]}`}>{CAT[r.cat][0]}</span>
        <span>{r.platform}</span><span>{r.date}</span>
        <span>{r.rating_num != null ? `★${r.rating_num}` : "별점 없음"}</span>
        <span>{r.author}</span>
        {r.answered && <span className="tag tag-ok">답변 완료</span>}
      </div>
      <p className="whitespace-pre-wrap">{r.text}</p>
      {r.flags.map((f, i) => <div key={i} className="text-xs text-[var(--warn)]">⚑ {f}</div>)}

      {r.answered ? (
        <div className="rounded-lg border border-line p-2 text-sm">
          <div className="label">게시한 답글</div>
          <p className="whitespace-pre-wrap">{r.reply}</p>
          <Findings list={r.posted_check} />
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-line p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label !mb-0">답글 초안 (Claude에게 &quot;리뷰 답글 써줘&quot;라고 해도 채워집니다)</span>
            <button className="btn text-xs" onClick={() => { setDraft(TEMPLATE[r.cat]); check(TEMPLATE[r.cat]); }}>틀 넣기</button>
          </div>
          <textarea className="textarea" value={draft} onChange={(e) => { setDraft(e.target.value); setChecks(null); }} placeholder="3~5문장. 시술명·날짜·기록, 할인·환불 약속, 홍보 문구는 쓰지 않습니다." />
          {checks && <Findings list={checks} />}
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={!draft.trim() || !!busy} onClick={() => check()}>{busy === "check" ? "검사 중…" : "의료법 검사"}</button>
            <button className="btn" disabled={!dirty || !!busy} onClick={() => save({ reply_draft: draft }, "save")}>초안 저장</button>
            <button className="btn btn-primary" disabled={!draft.trim() || checks === null || blocked || !!busy}
              title={checks === null ? "먼저 검사하세요" : blocked ? "고쳐야 할 표현이 있습니다" : ""}
              onClick={() => { if (confirm("이 답글을 플랫폼에 직접 올리셨나요? '답변 완료'로 표시합니다.")) save({ reply: draft, reply_draft: "" }, "post"); }}>
              플랫폼에 올렸음 표시
            </button>
          </div>
          {msg && <div className="box-bad">{msg}</div>}
        </div>
      )}
    </article>
  );
}
