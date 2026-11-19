"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    setBusy(false);
    if (r.ok) location.href = "/admin";
    else setErr((await r.json().catch(() => ({}))).error ?? "로그인에 실패했습니다.");
  }
  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img src="/brand.svg" alt="" width={64} height={64} />
        <h1>관리자 로그인</h1>
        <p className="lead">용어집·자주 쓰는 문장·대화 기록·설정을 관리합니다.</p>
        <input className="input code" type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="관리자 PIN" aria-label="관리자 PIN" />
        {err && <p className="warn">{err}</p>}
        <button className="btn primary big" disabled={busy || !pin.trim()}>{busy ? "확인 중…" : "로그인"}</button>
        <a className="link" href="/">통역 화면으로</a>
      </form>
    </main>
  );
}
