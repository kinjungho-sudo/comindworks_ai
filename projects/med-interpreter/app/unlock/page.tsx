"use client";
import { useState } from "react";

export default function Unlock() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    setBusy(false);
    if (r.ok) location.href = "/";
    else setErr((await r.json().catch(() => ({}))).error ?? "등록에 실패했습니다.");
  }
  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img src="/brand.svg" alt="" width={64} height={64} />
        <h1>이 태블릿 등록하기</h1>
        <p className="lead">병원에서 받은 기기 등록 코드를 한 번만 입력하면 됩니다.</p>
        <input className="input code" inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="등록 코드" aria-label="등록 코드" />
        {err && <p className="warn">{err}</p>}
        <button className="btn primary big" disabled={busy || !code.trim()}>{busy ? "확인 중…" : "등록"}</button>
        <a className="link" href="/admin/login">관리자 로그인</a>
      </form>
    </main>
  );
}
