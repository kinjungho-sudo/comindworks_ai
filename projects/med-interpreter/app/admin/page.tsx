"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_LANGS, GUEST_LANGS, LANG_META, type Lang } from "@/lib/langs";

type Tab = "terms" | "phrases" | "cards" | "records" | "settings";
type Row = { id?: string; category: string; note?: string | null; sort?: number } & Partial<Record<Lang, string | null>>;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (r.status === 401) { location.href = "/admin/login"; throw new Error("로그인 필요"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `오류 ${r.status}`);
  return j as T;
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("terms");
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="brand"><img src="/brand.svg" alt="" width={32} height={32} /><b>MediBridge</b><span>관리자</span></div>
        <nav className="admin-tabs">
          {([["terms", "병원 용어집"], ["phrases", "자주 쓰는 문장"], ["cards", "안내 자료"], ["records", "대화 기록"], ["settings", "설정"]] as [Tab, string][]).map(([k, v]) => (
            <button key={k} className={`atab ${tab === k ? "sel" : ""}`} onClick={() => setTab(k)}>{v}</button>
          ))}
        </nav>
        <div className="admin-actions">
          <a className="btn ghost sm" href="/">통역 화면</a>
          <button className="btn ghost sm" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); location.href = "/admin/login"; }}>로그아웃</button>
        </div>
      </header>
      <main className="admin-main">
        {tab === "terms" && <Library kind="terms" />}
        {tab === "phrases" && <Library kind="phrases" />}
        {tab === "records" && <Records />}
        {tab === "cards" && <Cards />}
        {tab === "settings" && <SettingsForm />}
      </main>
    </div>
  );
}

// ---------------- 용어집 / 자주 쓰는 문장 ----------------

function Library({ kind }: { kind: "terms" | "phrases" }) {
  const isTerm = kind === "terms";
  const [items, setItems] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("전체");
  const [edit, setEdit] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const j = await api<{ items: Row[] }>(`/api/admin/${kind}`);
    setItems(j.items); setLoaded(true);
  }, [kind]);
  useEffect(() => { void load(); }, [load]);

  const cats = useMemo(() => ["전체", ...new Set(items.map((i) => i.category))], [items]);
  const list = items.filter((i) => (cat === "전체" || i.category === cat) && (!q || ALL_LANGS.some((l) => (i[l] ?? "").toLowerCase().includes(q.toLowerCase()))));
  const missing = items.filter((i) => GUEST_LANGS.some((l) => !i[l])).length;

  async function save(row: Row, fill: boolean) {
    setBusy(true); setMsg("");
    try {
      await api(`/api/admin/${kind}`, { method: "POST", body: JSON.stringify({ items: [row], fill }) });
      setEdit(null); setMsg("저장했습니다."); await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function remove(row: Row) {
    if (!row.id || !confirm(`"${row.ko}" 을(를) 삭제할까요?`)) return;
    await api(`/api/admin/${kind}?id=${row.id}`, { method: "DELETE" });
    setEdit(null); await load();
  }
  async function fillAll() {
    const need = items.filter((i) => GUEST_LANGS.some((l) => !i[l]));
    if (!need.length) return;
    setBusy(true); setMsg("AI가 빈 칸을 채우는 중…");
    try {
      for (let i = 0; i < need.length; i += 40) await api(`/api/admin/${kind}`, { method: "POST", body: JSON.stringify({ items: need.slice(i, i + 40), fill: true }) });
      setMsg(`${need.length}개 항목의 빈 칸을 채웠습니다.`); await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  function exportCsv() {
    const cols = ["category", ...ALL_LANGS, isTerm ? "note" : "sort"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [cols.join(","), ...items.map((i) => cols.map((c) => esc((i as Record<string, unknown>)[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${isTerm ? "병원용어집" : "자주쓰는문장"}.csv`;
    a.click();
  }
  async function importCsv(file: File) {
    const rows = parseCsv(await file.text());
    const head = rows.shift()?.map((h) => h.trim().replace(/^﻿/, "")) ?? [];
    if (!head.includes("ko")) { setMsg("첫 줄에 ko 열이 있어야 합니다 (category,ko,en,zh,ja,ru,vi,note)."); return; }
    const data = rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])) as unknown as Row);
    for (const d of data) d.category ||= isTerm ? "기타" : "접수";
    setBusy(true); setMsg(`${data.length}개 가져오는 중… (빈 칸은 AI가 채웁니다)`);
    try {
      for (let i = 0; i < data.length; i += 40) await api(`/api/admin/${kind}`, { method: "POST", body: JSON.stringify({ items: data.slice(i, i + 40), fill: true }) });
      setMsg(`${data.length}개를 추가했습니다.`); await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>{isTerm ? "병원 용어집" : "자주 쓰는 문장"}</h2>
          <p className="muted">{isTerm
            ? "여기 등록한 용어는 받아쓰기와 번역에 바로 반영됩니다. 진료과·검사명·층 안내처럼 병원마다 다른 표현을 넣어 두세요."
            : "직원 화면의 ‘자주 쓰는 문장’ 버튼에 나옵니다. 누르면 말하지 않아도 바로 통역됩니다."}</p>
        </div>
        <div className="head-actions">
          <button className="btn primary" onClick={() => setEdit({ category: cat !== "전체" ? cat : isTerm ? "기타" : "접수" })}>+ 새로 추가</button>
        </div>
      </div>
      <div className="toolbar">
        <input className="input sm" placeholder="검색 (아무 언어나)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tabs">{cats.map((c) => <button key={c} className={`tab ${c === cat ? "sel" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
        <span className="grow" />
        {missing > 0 && <button className="btn ghost sm" disabled={busy} onClick={fillAll}>빈 칸 {missing}개 AI로 채우기</button>}
        <button className="btn ghost sm" onClick={exportCsv}>CSV 내보내기</button>
        <label className="btn ghost sm">CSV 가져오기<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} /></label>
      </div>
      {msg && <p className="flash">{msg}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>분류</th>{ALL_LANGS.map((l) => <th key={l}>{LANG_META[l].korean}</th>)}{isTerm && <th>메모</th>}</tr></thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} onClick={() => setEdit(i)}>
                <td><span className="pill">{i.category}</span></td>
                {ALL_LANGS.map((l) => <td key={l} lang={LANG_META[l].html} className={!i[l] ? "missing" : ""}>{i[l] || "—"}</td>)}
                {isTerm && <td className="muted">{i.note}</td>}
              </tr>
            ))}
            {!list.length && <tr><td colSpan={9} className="muted center">{loaded ? "항목이 없습니다." : "불러오는 중…"}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted small">총 {items.length}개 · 줄을 누르면 수정할 수 있습니다.</p>
      {edit && <EditModal row={edit} isTerm={isTerm} cats={cats.filter((c) => c !== "전체")} busy={busy} onSave={save} onDelete={remove} onClose={() => setEdit(null)} />}
    </section>
  );
}

function EditModal({ row, isTerm, cats, busy, onSave, onDelete, onClose }: {
  row: Row; isTerm: boolean; cats: string[]; busy: boolean; onSave: (r: Row, fill: boolean) => void; onDelete: (r: Row) => void; onClose: () => void;
}) {
  const [r, setR] = useState<Row>(row);
  const [fill, setFill] = useState(true);
  const set = (k: string, v: string) => setR((x) => ({ ...x, [k]: v }));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{row.id ? "수정" : "새로 추가"}</h3>
        <div className="form-grid">
          <label>분류
            <input className="input" list="cats" value={r.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          {ALL_LANGS.map((l) => (
            <label key={l}>{LANG_META[l].korean}{l === "ko" && " *"}
              {isTerm
                ? <input className="input" lang={LANG_META[l].html} value={r[l] ?? ""} onChange={(e) => set(l, e.target.value)} placeholder={l === "ko" ? "예: 위내시경" : "비우면 AI가 채움"} />
                : <textarea className="input" rows={2} lang={LANG_META[l].html} value={r[l] ?? ""} onChange={(e) => set(l, e.target.value)} placeholder={l === "ko" ? "예: 검사 전 8시간 금식해 주세요." : "비우면 AI가 채움"} />}
            </label>
          ))}
          {isTerm && <label className="span2">메모 (번역할 때 참고)<input className="input" value={r.note ?? ""} onChange={(e) => set("note", e.target.value)} placeholder="예: 본관 2층에 있음" /></label>}
        </div>
        <label className="check"><input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} /> 비어 있는 외국어 칸은 AI로 채우기</label>
        <div className="modal-actions">
          {row.id && <button className="btn danger" onClick={() => onDelete(row)}>삭제</button>}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>취소</button>
          <button className="btn primary" disabled={busy || !r.ko?.trim()} onClick={() => onSave(r, fill)}>{busy ? "저장 중…" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---------------- 대화 기록 ----------------

type SessionRow = { id: string; guest_lang: Lang; consent: boolean; started_at: string; ended_at: string | null; message_count: number; summary?: string | null };
type MsgRow = { id: string; speaker: "staff" | "guest"; kind: string; src_lang: Lang; src_text: string; tgt_lang: Lang; tgt_text: string; created_at: string };

const fmt = (s: string) => new Date(s).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Records() {
  const [data, setData] = useState<{ sessions: SessionRow[]; stats: { total30: number; consented30: number; byLang: Record<string, number> }; retentionDays: number } | null>(null);
  const [open, setOpen] = useState<{ session: SessionRow; messages: MsgRow[] } | null>(null);
  const load = useCallback(async () => setData(await api("/api/admin/records")), []);
  useEffect(() => { void load(); }, [load]);

  async function view(id: string) { setOpen(await api(`/api/admin/records?id=${id}`)); }
  async function remove(id: string) {
    if (!confirm("이 대화 기록을 완전히 삭제할까요? 되돌릴 수 없습니다.")) return;
    await api(`/api/admin/records?id=${id}`, { method: "DELETE" });
    setOpen(null); await load();
  }
  function download(o: { session: SessionRow; messages: MsgRow[] }) {
    const lines = [`MediBridge 대화 기록`, `시작: ${new Date(o.session.started_at).toLocaleString("ko-KR")}`, `손님 언어: ${LANG_META[o.session.guest_lang].korean}`, ""];
    for (const m of o.messages) {
      const who = m.speaker === "staff" ? "직원" : "손님";
      lines.push(`[${new Date(m.created_at).toLocaleTimeString("ko-KR")}] ${who}: ${m.src_text}`, `    → ${m.tgt_text}`);
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    a.download = `대화기록_${o.session.started_at.slice(0, 10)}.txt`;
    a.click();
  }

  if (!data) return <p className="muted">불러오는 중…</p>;
  const max = Math.max(1, ...Object.values(data.stats.byLang));
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>대화 기록</h2>
          <p className="muted">손님이 저장에 동의한 대화만 남습니다. {data.retentionDays}일이 지나면 자동으로 삭제됩니다.</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><span className="stat-label">최근 30일 통역</span><b>{data.stats.total30}건</b></div>
        <div className="stat"><span className="stat-label">기록 동의</span><b>{data.stats.consented30}건</b></div>
        <div className="stat wide">
          <span className="stat-label">언어별 (30일)</span>
          <div className="bars">
            {GUEST_LANGS.map((l) => (
              <div key={l} className="bar-row"><span>{LANG_META[l].korean}</span><div className="bar"><i style={{ width: `${((data.stats.byLang[l] ?? 0) / max) * 100}%` }} /></div><em>{data.stats.byLang[l] ?? 0}</em></div>
            ))}
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>시작</th><th>손님 언어</th><th>메시지</th><th>상태</th></tr></thead>
          <tbody>
            {data.sessions.map((s) => (
              <tr key={s.id} onClick={() => view(s.id)}>
                <td>{fmt(s.started_at)}</td>
                <td>{LANG_META[s.guest_lang]?.flag} {LANG_META[s.guest_lang]?.korean}</td>
                <td>{s.message_count}</td>
                <td className="muted">{s.ended_at ? "종료" : "진행 중"}</td>
              </tr>
            ))}
            {!data.sessions.length && <tr><td colSpan={4} className="muted center">저장된 대화가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{fmt(open.session.started_at)} · {LANG_META[open.session.guest_lang].korean} 손님</h3>
            {open.session.summary && <pre className="summary">{open.session.summary}</pre>}
            <div className="transcript">
              {open.messages.map((m) => (
                <div key={m.id} className={`t-row ${m.speaker}`}>
                  <span className="t-who">{m.speaker === "staff" ? "직원" : "손님"}</span>
                  <div><p lang={LANG_META[m.src_lang].html}>{m.src_text}</p><p className="muted" lang={LANG_META[m.tgt_lang].html}>→ {m.tgt_text}</p></div>
                  <span className="t-time">{new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
              {!open.messages.length && <p className="muted">메시지가 없습니다.</p>}
            </div>
            <div className="modal-actions">
              <button className="btn danger" onClick={() => remove(open.session.id)}>삭제</button>
              <span className="grow" />
              <button className="btn ghost" onClick={() => download(open)}>텍스트로 저장</button>
              <button className="btn primary" onClick={() => setOpen(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------- 설정 ----------------

type Svc = { name: string; phone?: string; url?: string; note?: string };
type S = { hospital_name: string; retention_days: number; speak_to_guest: boolean; speak_to_staff: boolean; slow_speech: boolean; flip_guest: boolean; idle_seconds: number; interpreter_services: Svc[] };

function SettingsForm() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { void api<{ settings: S }>("/api/admin/settings").then((j) => setS(j.settings)); }, []);
  if (!s) return <p className="muted">불러오는 중…</p>;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });
  const setSvc = (i: number, p: Partial<Svc>) => set("interpreter_services", s.interpreter_services.map((x, j) => (j === i ? { ...x, ...p } : x)));
  async function save() {
    try { const j = await api<{ settings: S }>("/api/admin/settings", { method: "PUT", body: JSON.stringify(s) }); setS(j.settings); setMsg("저장했습니다. 통역 화면은 다음 대화부터 반영됩니다."); }
    catch (e) { setMsg((e as Error).message); }
  }
  const Toggle = ({ k, label, desc }: { k: "speak_to_guest" | "speak_to_staff" | "slow_speech" | "flip_guest"; label: string; desc: string }) => (
    <label className="setting">
      <div><b>{label}</b><p className="muted">{desc}</p></div>
      <input type="checkbox" className="switch" checked={s[k]} onChange={(e) => set(k, e.target.checked)} />
    </label>
  );
  return (
    <section className="settings">
      <div className="section-head"><div><h2>설정</h2></div></div>
      <label className="setting">
        <div><b>병원 이름</b><p className="muted">첫 화면과 번역 문맥에 쓰입니다.</p></div>
        <input className="input" value={s.hospital_name} onChange={(e) => set("hospital_name", e.target.value)} />
      </label>
      <label className="setting">
        <div><b>대화 기록 보관 기간</b><p className="muted">손님에게 동의받을 때 이 기간을 안내합니다. 지나면 자동 삭제됩니다.</p></div>
        <span className="inline"><input className="input num" type="number" min={1} max={365} value={s.retention_days} onChange={(e) => set("retention_days", Number(e.target.value))} /> 일</span>
      </label>
      <label className="setting">
        <div><b>자동 초기화</b><p className="muted">이 시간 동안 아무 동작이 없으면 다음 손님을 위해 첫 화면으로 돌아갑니다.</p></div>
        <span className="inline"><input className="input num" type="number" min={30} max={1800} step={30} value={s.idle_seconds} onChange={(e) => set("idle_seconds", Number(e.target.value))} /> 초</span>
      </label>
      <Toggle k="speak_to_guest" label="손님에게 음성으로 들려주기" desc="직원이 한 말을 손님 언어 음성으로 읽어 줍니다." />
      <Toggle k="speak_to_staff" label="직원에게 음성으로 들려주기" desc="손님이 한 말을 한국어 음성으로 읽어 줍니다." />
      <Toggle k="slow_speech" label="천천히 말하기" desc="어르신이나 소음이 큰 곳에서 알아듣기 쉽게 천천히 읽습니다." />
      <div className="setting col">
        <div><b>사람 통역 연결처</b><p className="muted">직원 화면의 ‘사람 통역’ 버튼에 나옵니다. 병원이 계약한 전화·화상 통역 서비스나 원내 통역 담당자 번호를 넣으세요.</p></div>
        {s.interpreter_services.map((v, i) => (
          <div key={i} className="svc-edit">
            <input className="input" placeholder="이름 (예: 원내 영어 통역 담당)" value={v.name} onChange={(e) => setSvc(i, { name: e.target.value })} />
            <input className="input" placeholder="전화번호" value={v.phone ?? ""} onChange={(e) => setSvc(i, { phone: e.target.value })} />
            <input className="input" placeholder="화상통역 주소 (선택)" value={v.url ?? ""} onChange={(e) => setSvc(i, { url: e.target.value })} />
            <input className="input" placeholder="메모 (지원 언어·시간 등)" value={v.note ?? ""} onChange={(e) => setSvc(i, { note: e.target.value })} />
            <button className="btn danger sm" onClick={() => set("interpreter_services", s.interpreter_services.filter((_, j) => j !== i))}>삭제</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={() => set("interpreter_services", [...s.interpreter_services, { name: "", phone: "", url: "", note: "" }])}>+ 연결처 추가</button>
      </div>
      <div className="modal-actions"><span className="grow" />{msg && <span className="flash">{msg}</span>}<button className="btn primary" onClick={save}>저장</button></div>
    </section>
  );
}

// ---------------- 안내 자료 ----------------

type CardRow = { id: string; title: string; keywords: string | null; sort: number };

// 그림을 최대 1600px JPEG 로 줄여서 올린다 (SVG 는 그대로)
async function toDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  if (file.type === "image/svg+xml") return raw;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = raw; });
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

function Cards() {
  const [items, setItems] = useState<CardRow[] | null>(null);
  const [edit, setEdit] = useState<(Partial<CardRow> & { image?: string }) | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setItems((await api<{ items: CardRow[] }>("/api/admin/cards")).items), []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!edit) return;
    setBusy(true); setMsg("");
    try { await api("/api/admin/cards", { method: "POST", body: JSON.stringify(edit) }); setEdit(null); setMsg("저장했습니다."); await load(); }
    catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm("이 안내 자료를 삭제할까요?")) return;
    await api(`/api/admin/cards?id=${id}`, { method: "DELETE" }); setEdit(null); await load();
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>안내 자료</h2>
          <p className="muted">층별 안내도·주차 안내·검사 준비 그림처럼 말보다 보여주는 게 빠른 자료입니다. 직원 화면의 ‘안내 자료’에서 손님 화면에 띄우고, 대화에 키워드가 나오면 자동으로 띄울지 물어봅니다.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit({ title: "", keywords: "", sort: 0 })}>+ 새 자료</button>
      </div>
      {msg && <p className="flash">{msg}</p>}
      <div className="card-admin-grid">
        {items?.map((c) => (
          <button key={c.id} className="card-thumb" onClick={() => setEdit(c)}>
            <img src={`/api/cards/image?id=${c.id}`} alt="" />
            <span>{c.title}</span>
            {c.keywords && <span className="muted small">키워드: {c.keywords}</span>}
          </button>
        ))}
        {items && !items.length && <p className="muted">아직 자료가 없습니다.</p>}
        {!items && <p className="muted">불러오는 중…</p>}
      </div>
      {edit && (
        <div className="modal-bg" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{edit.id ? "안내 자료 수정" : "새 안내 자료"}</h3>
            <div className="form-grid">
              <label className="span2">제목 (한국어 — 손님 화면에는 손님 언어로 함께 표시)
                <input className="input" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="예: 층별 안내도" />
              </label>
              <label className="span2">키워드 (쉼표로 구분 — 대화에 나오면 띄울지 물어봄)
                <input className="input" value={edit.keywords ?? ""} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} placeholder="예: 영상의학과, 채혈실, 엘리베이터, 3층" />
              </label>
              <label>순서<input className="input" type="number" value={edit.sort ?? 0} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} /></label>
              <label>그림 {edit.id ? "(바꿀 때만)" : ""}
                <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEdit({ ...edit, image: await toDataUrl(f) }); }} />
              </label>
            </div>
            {(edit.image || edit.id) && <img className="card-preview" src={edit.image ?? `/api/cards/image?id=${edit.id}`} alt="" />}
            <div className="modal-actions">
              {edit.id && <button className="btn danger" onClick={() => remove(edit.id!)}>삭제</button>}
              <span className="grow" />
              <button className="btn ghost" onClick={() => setEdit(null)}>취소</button>
              <button className="btn primary" disabled={busy || !edit.title?.trim() || (!edit.id && !edit.image)} onClick={save}>{busy ? "저장 중…" : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
