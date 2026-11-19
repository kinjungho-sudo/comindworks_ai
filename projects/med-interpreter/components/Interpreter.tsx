"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveTranscriber, MicEngine, PcmPlayer, toWav } from "@/lib/client/audio";
import { GUEST_LANGS, GUEST_UI, LANG_META, QUICK_KO, type GuestLang, type Lang } from "@/lib/langs";

type Side = "staff" | "guest";
type Settings = {
  hospital_name: string; retention_days: number; speak_to_guest: boolean; speak_to_staff: boolean;
  slow_speech: boolean; flip_guest: boolean; idle_seconds: number;
};
type Phrase = { id: string; category: string; ko: string } & Partial<Record<Lang, string | null>>;
type Msg = {
  id: string; speaker: Side; kind: "speech" | "text" | "phrase";
  srcLang: Lang; src: string; tgtLang: Lang; tgt: string;
  status: "translating" | "done" | "error";
};
type Busy = { side: Side; stage: "listening" | "transcribing" | "translating" } | null;
type Phase = "welcome" | "consent" | "talk" | "bye";

const uid = () => Math.random().toString(36).slice(2, 10);
const MAX_TURN_MS = 45_000;
const dbg = (...a: unknown[]) => { if (typeof window !== "undefined" && (window as unknown as { __mbdebug?: boolean }).__mbdebug) console.log("[mb]", Date.now() % 100000, ...a); };

export default function Interpreter() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [guestLang, setGuestLang] = useState<GuestLang>("en");
  const [session, setSession] = useState<{ id: string; consent: boolean } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [live, setLive] = useState<{ side: Side; text: string } | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [level, setLevel] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ side: Side | "both"; ko: string; guest: string } | null>(null);
  const [sheet, setSheet] = useState<null | "phrases" | "keyboard" | "end" | "lang" | "menu">(null);
  const [muted, setMuted] = useState(false);
  const [idleLeft, setIdleLeft] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const mic = useRef<MicEngine | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  const stt = useRef<Record<Side, LiveTranscriber | null>>({ staff: null, guest: null });
  const turn = useRef<{ side: Side; chunks: Int16Array[]; started: number; heardAt: number; spoke: boolean; hold: boolean; noise: number } | null>(null);
  const lastActive = useRef(Date.now());
  const msgsRef = useRef<Msg[]>([]);
  const sessionRef = useRef(session);
  const settingsRef = useRef(settings);
  const mutedRef = useRef(muted);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  msgsRef.current = msgs; sessionRef.current = session; settingsRef.current = settings; mutedRef.current = muted;

  const G = GUEST_UI[guestLang];

  const loadBoot = useCallback(async () => {
    try {
      const r = await fetch("/api/bootstrap", { cache: "no-store" });
      if (r.status === 401) { location.href = "/unlock"; return; }
      const j = await r.json();
      setSettings(j.settings); setPhrases(j.phrases);
    } catch { /* 오프라인이면 이전 값 유지 */ }
  }, []);

  useEffect(() => { void loadBoot(); }, [loadBoot]);

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const touch = useCallback(() => { lastActive.current = Date.now(); setIdleLeft(null); }, []);

  // ---------- 화면 꺼짐 방지 ----------
  const keepAwake = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && !wake.current) wake.current = await nav.wakeLock.request("screen");
    } catch { /* 지원 안 하는 기기 */ }
  }, []);
  useEffect(() => {
    const v = () => { if (document.visibilityState === "visible" && phase !== "welcome") { wake.current = null; void keepAwake(); } };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, [phase, keepAwake]);

  // ---------- 마이크 준비 (첫 터치 안에서) ----------
  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (!mic.current) {
      mic.current = new MicEngine();
      player.current = new PcmPlayer(() => mic.current?.ctx ?? null);
    }
    try {
      await mic.current.init();
      setMicError(null);
      return true;
    } catch (e) {
      console.warn("mic", e);
      setMicError("마이크를 쓸 수 없습니다. 브라우저 설정에서 마이크를 허용해 주세요.");
      return false;
    }
  }, []);

  const transcriber = useCallback((side: Side, lang: Lang) => {
    const cur = stt.current[side];
    if (cur && cur.lang === lang) return cur;
    cur?.close();
    const t = new LiveTranscriber(lang);
    stt.current[side] = t;
    return t;
  }, []);

  // ---------- 말하기(음성 재생) ----------
  const speak = useCallback(async (m: Msg) => {
    const s = settingsRef.current;
    if (!player.current || !m.tgt.trim()) return;
    setSpeakingId(m.id);
    await player.current.play(m.id + ":" + m.tgt.length, m.tgt, m.tgtLang);
    setSpeakingId((cur) => (cur === m.id ? null : cur));
  }, []);

  const autoSpeak = useCallback((m: Msg) => {
    const s = settingsRef.current;
    if (!s || mutedRef.current) return;
    const toGuest = m.tgtLang !== "ko";
    if ((toGuest && s.speak_to_guest) || (!toGuest && s.speak_to_staff)) void speak(m);
  }, [speak]);

  const stopSpeaking = useCallback(() => { player.current?.stop(); setSpeakingId(null); }, []);

  // ---------- 번역 ----------
  const history = () => msgsRef.current.filter((m) => m.status === "done").slice(-6).map((m) => ({ speaker: m.speaker, text: m.speaker === "staff" ? m.src : m.tgt }));

  const translate = useCallback(async (side: Side, text: string, kind: "speech" | "text") => {
    const from: Lang = side === "staff" ? "ko" : guestLang;
    const to: Lang = side === "staff" ? guestLang : "ko";
    const m: Msg = { id: uid(), speaker: side, kind, srcLang: from, src: text, tgtLang: to, tgt: "", status: "translating" };
    const hist = history();
    setMsgs((x) => [...x, m]);
    setBusy({ side, stage: "translating" });
    dbg("tr:start");
    const upd = (p: Partial<Msg>) => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, ...p } : y)));
    try {
      const r = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from, to, speaker: side, kind, sessionId: sessionRef.current?.consent ? sessionRef.current.id : null, history: hist }),
      });
      if (!r.ok || !r.body) throw new Error(String(r.status));
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let out = "";
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
        if (out.length < 12) dbg("tr:first");
        upd({ tgt: out });
      }
      out = out.trim();
      if (!out) throw new Error("empty");
      dbg("tr:done");
      const fin = { ...m, tgt: out, status: "done" as const };
      upd({ tgt: out, status: "done" });
      autoSpeak(fin);
    } catch {
      upd({ status: "error" });
    } finally {
      setBusy(null);
      touch();
    }
  }, [guestLang, autoSpeak, touch]);

  // ---------- 한 번 말하기 ----------
  const finishTurn = useCallback(async () => {
    const t = turn.current;
    if (!t) return;
    turn.current = null;
    mic.current?.record(false);
    mic.current?.beep("stop");
    setLevel(0);
    const side = t.side;
    setBusy({ side, stage: "transcribing" });
    dbg("finish:start");
    const lang: Lang = side === "staff" ? "ko" : guestLang;
    const tr = transcriber(side, lang);
    let text = await tr.finish();
    dbg("finish:stt", text);
    if (text === null && t.chunks.length > 3) {
      // 실시간 연결 실패 → 녹음 파일로 받아쓰기
      try {
        const fd = new FormData();
        fd.append("audio", toWav(t.chunks), "speech.wav");
        fd.append("lang", lang);
        const r = await fetch("/api/transcribe", { method: "POST", body: fd });
        text = r.ok ? (await r.json()).text : "";
      } catch { text = ""; }
    }
    setLive(null);
    const clean = (text ?? "").trim();
    if (clean.replace(/[\s.,!?。、…·]/g, "").length < 1) {
      setBusy(null);
      setNotice({ side, ko: "잘 들리지 않았어요. 버튼을 누르고 다시 말씀해 주세요.", guest: GUEST_UI[guestLang].sayAgain });
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    await translate(side, clean, "speech");
  }, [guestLang, transcriber, translate]);

  const startTurn = useCallback(async (side: Side, hold: boolean) => {
    if (!(await ensureMic())) return;
    stopSpeaking();
    touch();
    const lang: Lang = side === "staff" ? "ko" : guestLang;
    const tr = transcriber(side, lang);
    tr.onDelta = (txt) => setLive({ side, text: txt });
    tr.begin();
    turn.current = { side, chunks: [], started: Date.now(), heardAt: Date.now(), spoke: false, hold, noise: 0.01 };
    mic.current!.onChunk = (pcm) => {
      const cur = turn.current;
      if (!cur) return;
      cur.chunks.push(pcm);
      tr.append(pcm);
    };
    mic.current!.onLevel = (rms) => {
      const cur = turn.current;
      setLevel(rms);
      if (!cur) return;
      // 말을 시작한 뒤 1.8초 조용하면 자동으로 끝낸다(누르고 있는 중이면 제외).
      const speech = rms > Math.max(0.018, cur.noise * 3);
      dbg("lvl", rms.toFixed(3));
      if (!speech && !cur.spoke) cur.noise = cur.noise * 0.95 + rms * 0.05;
      if (speech) { cur.spoke = true; cur.heardAt = Date.now(); }
      const now = Date.now();
      if (!cur.hold && cur.spoke && now - cur.heardAt > 1800) void finishTurn();
      else if (now - cur.started > MAX_TURN_MS) void finishTurn();
      else if (!cur.hold && !cur.spoke && now - cur.started > 9000) void finishTurn();
    };
    mic.current!.beep("start");
    setTimeout(() => mic.current?.record(true), 140); // 시작음이 녹음에 섞이지 않게
    setLive({ side, text: "" });
    setBusy({ side, stage: "listening" });
  }, [ensureMic, guestLang, stopSpeaking, touch, transcriber, finishTurn]);

  // 눌렀다 떼기: 짧게 누르면 "켜기/끄기", 길게 누르면 "누르는 동안 말하기"
  const press = useRef<{ side: Side; at: number } | null>(null);
  const onMicDown = useCallback((side: Side) => {
    if (busy && busy.side !== side) return;
    if (busy && busy.stage !== "listening") return;
    if (turn.current) { void finishTurn(); press.current = null; return; }
    press.current = { side, at: Date.now() };
    void startTurn(side, false);
  }, [busy, finishTurn, startTurn]);
  const onMicUp = useCallback(() => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (Date.now() - p.at > 650 && turn.current?.side === p.side) void finishTurn();
  }, [finishTurn]);
  useEffect(() => {
    // 길게 누르는 중으로 판정되면 자동 종료를 끈다
    const i = setInterval(() => {
      if (press.current && turn.current && Date.now() - press.current.at > 650) turn.current.hold = true;
    }, 100);
    return () => clearInterval(i);
  }, []);

  // ---------- 바로 보내기 (자주 쓰는 문장 / 손님 빠른 답변) ----------
  const sendDirect = useCallback((side: Side, src: string, tgt: string) => {
    stopSpeaking();
    touch();
    const from: Lang = side === "staff" ? "ko" : guestLang;
    const to: Lang = side === "staff" ? guestLang : "ko";
    const m: Msg = { id: uid(), speaker: side, kind: "phrase", srcLang: from, src, tgtLang: to, tgt, status: "done" };
    setMsgs((x) => [...x, m]);
    autoSpeak(m);
    const s = sessionRef.current;
    if (s?.consent) void fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, speaker: side, srcLang: from, srcText: src, tgtLang: to, tgtText: tgt }) });
  }, [guestLang, autoSpeak, stopSpeaking, touch]);

  const sendPhrase = useCallback((p: Phrase) => {
    setSheet(null);
    const t = p[guestLang];
    if (t) sendDirect("staff", p.ko, t);
    else void translate("staff", p.ko, "text");
  }, [guestLang, sendDirect, translate]);

  // ---------- 대화 흐름 ----------
  const chooseLang = useCallback(async (l: GuestLang) => {
    touch();
    setGuestLang(l);
    setPhase("consent");
    void keepAwake();
    const ok = await ensureMic();
    if (ok) {
      void transcriber("staff", "ko").connect();
      void transcriber("guest", l).connect();
    }
  }, [ensureMic, keepAwake, touch, transcriber]);

  const decideConsent = useCallback(async (consent: boolean) => {
    touch();
    setPhase("talk");
    setMsgs([]);
    try {
      const r = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestLang, consent }) });
      if (r.ok) setSession(await r.json());
    } catch { setSession(null); }
  }, [guestLang, touch]);

  const endConversation = useCallback(async (silent = false) => {
    setSheet(null);
    if (turn.current) { turn.current = null; mic.current?.record(false); }
    stopSpeaking();
    setLive(null); setBusy(null); setIdleLeft(null);
    const s = sessionRef.current;
    if (s) void fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, end: true }) });
    setSession(null);
    stt.current.guest?.close(); stt.current.guest = null;
    setPhase(silent ? "welcome" : "bye");
    setMsgs([]);
    try { await wake.current?.release(); } catch {}
    wake.current = null;
    void loadBoot();
    if (!silent) setTimeout(() => setPhase((p) => (p === "bye" ? "welcome" : p)), 3500);
  }, [loadBoot, stopSpeaking]);

  const changeLang = useCallback((l: GuestLang) => {
    setSheet(null);
    touch();
    setGuestLang(l);
    const s = sessionRef.current;
    if (s) void fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, guestLang: l }) });
    void transcriber("guest", l).connect();
  }, [touch, transcriber]);

  // ---------- 자동 초기화 ----------
  useEffect(() => {
    if (phase === "welcome" || phase === "bye") return;
    const limit = (settings?.idle_seconds ?? 180) * 1000;
    const i = setInterval(() => {
      if (turn.current || busy || speakingId) { lastActive.current = Date.now(); return; }
      const idle = Date.now() - lastActive.current;
      if (idle > limit + 15_000) void endConversation(true);
      else if (idle > limit) setIdleLeft(Math.ceil((limit + 15_000 - idle) / 1000));
    }, 500);
    return () => clearInterval(i);
  }, [phase, settings, busy, speakingId, endConversation]);

  useEffect(() => () => { stt.current.staff?.close(); stt.current.guest?.close(); }, []);

  const lastFor = (viewer: Side) => [...msgs].reverse().find((m) => m.speaker !== viewer && m.status === "done");

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {}
  };

  const flip = settings?.flip_guest ?? true;
  const hospital = settings?.hospital_name || "MediBridge";

  // ===================== 화면 =====================
  return (
    <div className="stage" onPointerDown={touch}>
      {/* 손님 쪽 (위, 뒤집힘) */}
      <section className={`half guest ${flip ? "flipped" : ""}`} lang={LANG_META[guestLang].html} aria-label="Guest">
        {phase === "welcome" && <GuestWelcome hospital={hospital} onPick={chooseLang} />}
        {phase === "consent" && (
          <div className="center-card">
            <div className="consent-icon" aria-hidden>🔒</div>
            <h2>{G.consentTitle}</h2>
            <p className="consent-body">{G.consentBody(settings?.retention_days ?? 30)}</p>
            <div className="consent-actions">
              <button className="btn primary big" onClick={() => decideConsent(true)}>{G.agree}</button>
              <button className="btn ghost big" onClick={() => decideConsent(false)}>{G.decline}</button>
            </div>
            <p className="fine">{G.disclaimer}</p>
          </div>
        )}
        {phase === "talk" && (
          <TalkPanel
            viewer="guest" lang={guestLang} msgs={msgs} live={live} busy={busy} level={level} speakingId={speakingId}
            notice={notice && (notice.side === "both" || notice.side === "guest") ? notice.guest : null}
            labels={{ tap: G.tapToSpeak, listening: G.listening, finish: G.tapToFinish, translating: G.translating, otherSpeaking: G.staffSpeaking, replay: G.replay, original: G.original, retry: "↻", empty: G.tapToSpeak }}
            header={<div className="hdr"><span className="chip">{LANG_META[guestLang].flag} {LANG_META[guestLang].native}</span><span className="hdr-note">{G.disclaimer}</span></div>}
            extra={
              <div className="quick-row">
                {G.quick.map((q, i) => <button key={i} className="chip-btn" onClick={() => sendDirect("guest", q, QUICK_KO[i])}>{q}</button>)}
              </div>
            }
            leftTool={null}
            rightTool={<ToolBtn label={G.replay} icon="↻" disabled={!lastFor("guest")} onClick={() => { const m = lastFor("guest"); if (m) void speak(m); }} />}
            onMicDown={() => onMicDown("guest")} onMicUp={onMicUp}
            onReplay={(m) => void speak(m)} onRetry={(m) => { setMsgs((x) => x.filter((y) => y.id !== m.id)); void translate(m.speaker, m.src, m.kind === "phrase" ? "text" : m.kind); }}
            micError={micError ? G.micDenied : null}
          />
        )}
        {phase === "bye" && <div className="center-card"><div className="bye">🙏</div><h2>{G.thanks}</h2></div>}
        {idleLeft !== null && phase !== "welcome" && (
          <div className="overlay"><div className="overlay-card"><h3>{G.stillThere}</h3><p className="count">{idleLeft}</p><button className="btn primary big" onClick={touch}>{G.continue}</button></div></div>
        )}
      </section>

      <div className="divider" aria-hidden />

      {/* 직원 쪽 (아래) */}
      <section className="half staff" lang="ko" aria-label="직원">
        {phase === "welcome" && (
          <div className="center-card staff-welcome">
            <p className="eyebrow">{hospital} · 안내데스크 통역</p>
            <h1>외국인 손님이 오셨나요?</h1>
            <p className="lead">손님이 위 화면에서 언어를 고르면 바로 통역이 시작됩니다. 직원이 직접 골라도 됩니다.</p>
            <div className="lang-grid ko">
              {GUEST_LANGS.map((l) => (
                <button key={l} className="lang-btn" onClick={() => chooseLang(l)}>
                  <span className="flag">{LANG_META[l].flag}</span><span>{LANG_META[l].korean}</span>
                </button>
              ))}
            </div>
            <div className="welcome-tools">
              <a className="link" href="/admin">⚙︎ 관리자</a>
              <button className="link" onClick={toggleFullscreen}>{fullscreen ? "전체화면 끄기" : "⛶ 전체화면"}</button>
            </div>
            {micError && <p className="warn">{micError}</p>}
          </div>
        )}
        {phase === "consent" && (
          <div className="center-card">
            <p className="eyebrow">{LANG_META[guestLang].flag} {LANG_META[guestLang].korean} 손님</p>
            <h2>손님이 대화 기록 저장 동의 여부를 고르고 있어요</h2>
            <p className="lead">동의하면 대화가 {settings?.retention_days ?? 30}일 동안 저장된 뒤 자동 삭제됩니다. 동의하지 않아도 통역은 똑같이 됩니다.</p>
            <div className="consent-actions">
              <button className="btn ghost" onClick={() => decideConsent(false)}>저장 없이 바로 시작</button>
              <button className="btn ghost" onClick={() => endConversation(true)}>취소</button>
            </div>
          </div>
        )}
        {phase === "talk" && (
          <TalkPanel
            viewer="staff" lang="ko" msgs={msgs} live={live} busy={busy} level={level} speakingId={speakingId}
            notice={notice && (notice.side === "both" || notice.side === "staff") ? notice.ko : null}
            labels={{ tap: "눌러서 말하기", listening: "듣고 있어요 · 말을 마치면 자동으로 통역해요", finish: "눌러서 끝내기", translating: "통역 중…", otherSpeaking: "손님이 말하는 중…", replay: "다시 듣기", original: "원문", retry: "다시 시도", empty: "버튼을 누르고 한국어로 말하세요. 손님 화면에 바로 통역됩니다." }}
            header={
              <div className="hdr">
                <button className="chip as-btn" onClick={() => setSheet("lang")}>{LANG_META[guestLang].flag} {LANG_META[guestLang].korean} ▾</button>
                <span className={`badge ${session?.consent ? "on" : ""}`}>{session?.consent ? "● 기록 저장 중" : "기록 안 함"}</span>
                <span className="grow" />
                <button className={`icon-btn ${muted ? "off" : ""}`} onClick={() => { setMuted((v) => !v); stopSpeaking(); }} aria-label="음성 켜기/끄기">{muted ? "🔇" : "🔊"}</button>
                <button className="btn end" onClick={() => setSheet("end")}>대화 종료</button>
              </div>
            }
            extra={null}
            leftTool={<ToolBtn label="자주 쓰는 문장" icon="☰" onClick={() => setSheet("phrases")} />}
            rightTool={<ToolBtn label="글자로 입력" icon="⌨" onClick={() => setSheet("keyboard")} />}
            onMicDown={() => onMicDown("staff")} onMicUp={onMicUp}
            onReplay={(m) => void speak(m)} onRetry={(m) => { setMsgs((x) => x.filter((y) => y.id !== m.id)); void translate(m.speaker, m.src, m.kind === "phrase" ? "text" : m.kind); }}
            micError={micError}
          />
        )}
        {phase === "bye" && <div className="center-card"><h2>대화를 마쳤습니다</h2><p className="lead">잠시 후 첫 화면으로 돌아갑니다.</p></div>}

        {sheet === "phrases" && <PhraseSheet phrases={phrases} lang={guestLang} onPick={sendPhrase} onClose={() => setSheet(null)} />}
        {sheet === "keyboard" && <KeyboardSheet lang={guestLang} onSend={(t) => { setSheet(null); void translate("staff", t, "text"); }} onClose={() => setSheet(null)} />}
        {sheet === "lang" && (
          <Sheet title="손님 언어 바꾸기" onClose={() => setSheet(null)}>
            <div className="lang-grid ko">
              {GUEST_LANGS.map((l) => (
                <button key={l} className={`lang-btn ${l === guestLang ? "sel" : ""}`} onClick={() => changeLang(l)}>
                  <span className="flag">{LANG_META[l].flag}</span><span>{LANG_META[l].korean}</span>
                </button>
              ))}
            </div>
          </Sheet>
        )}
        {sheet === "end" && (
          <Sheet title="대화를 끝낼까요?" onClose={() => setSheet(null)}>
            <p className="lead">화면의 대화가 지워지고 첫 화면으로 돌아갑니다.{session?.consent ? " 동의한 기록은 관리자 화면에 남습니다." : ""}</p>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={() => setSheet(null)}>계속하기</button>
              <button className="btn danger" onClick={() => endConversation(false)}>대화 종료</button>
            </div>
          </Sheet>
        )}
        {idleLeft !== null && phase !== "welcome" && (
          <div className="overlay"><div className="overlay-card"><h3>대화가 없어서 곧 초기화됩니다</h3><p className="count">{idleLeft}</p><button className="btn primary big" onClick={touch}>계속하기</button></div></div>
        )}
      </section>
    </div>
  );
}

// ---------------- 하위 컴포넌트 ----------------

function GuestWelcome({ hospital, onPick }: { hospital: string; onPick: (l: GuestLang) => void }) {
  return (
    <div className="center-card guest-welcome">
      <p className="eyebrow">{hospital}</p>
      <h1 className="multi">{GUEST_LANGS.map((l) => <span key={l} lang={LANG_META[l].html}>{GUEST_UI[l].welcome}</span>)}</h1>
      <p className="lead">Please choose your language · 请选择语言 · 言語を選択 · Выберите язык · Chọn ngôn ngữ</p>
      <div className="lang-grid">
        {GUEST_LANGS.map((l) => (
          <button key={l} className="lang-btn big" onClick={() => onPick(l)} lang={LANG_META[l].html}>
            <span className="flag">{LANG_META[l].flag}</span>
            <span className="native">{LANG_META[l].native}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type Labels = { tap: string; listening: string; finish: string; translating: string; otherSpeaking: string; replay: string; original: string; retry: string; empty: string };

function TalkPanel(p: {
  viewer: Side; lang: Lang; msgs: Msg[]; live: { side: Side; text: string } | null; busy: Busy; level: number; speakingId: string | null;
  notice: string | null; labels: Labels; header: React.ReactNode; extra: React.ReactNode; leftTool: React.ReactNode; rightTool: React.ReactNode;
  onMicDown: () => void; onMicUp: () => void; onReplay: (m: Msg) => void; onRetry: (m: Msg) => void; micError: string | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const L = p.labels;
  const mineBusy = p.busy?.side === p.viewer;
  const otherBusy = p.busy && p.busy.side !== p.viewer;
  const listening = mineBusy && p.busy?.stage === "listening";
  const processing = mineBusy && p.busy?.stage !== "listening";
  const liveMine = p.live && p.live.side === p.viewer;
  const liveOther = p.live && p.live.side !== p.viewer;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [p.msgs, p.live]);

  const scale = 1 + Math.min(0.5, p.level * 6);

  return (
    <div className="talk">
      {p.header}
      <div className="feed" ref={scroller}>
        {!p.msgs.length && !p.live && <p className="empty">{L.empty}</p>}
        {p.msgs.map((m) => {
          const mine = m.speaker === p.viewer;
          const main = mine ? m.src : m.tgt;
          const sub = mine ? m.tgt : m.src;
          return (
            <div key={m.id} className={`bubble ${mine ? "mine" : "theirs"} ${p.speakingId === m.id && !mine ? "speaking" : ""}`}>
              {!mine && m.status === "translating" && !m.tgt ? (
                <p className="main dim"><span className="dots"><i /><i /><i /></span> {L.translating}</p>
              ) : (
                <p className="main">{main}</p>
              )}
              {m.status === "error" ? (
                <button className="retry" onClick={() => p.onRetry(m)}>⚠︎ {L.retry}</button>
              ) : sub ? (
                <p className="sub">{!mine && <span className="sub-label">{L.original}</span>}{sub}</p>
              ) : null}
              {!mine && m.status === "done" && (
                <button className="replay" onClick={() => p.onReplay(m)} aria-label={L.replay}>{p.speakingId === m.id ? "🔊" : "▶︎"}</button>
              )}
            </div>
          );
        })}
        {liveMine && (
          <div className="bubble mine live">
            <p className="main">{p.live!.text || <span className="dots"><i /><i /><i /></span>}</p>
          </div>
        )}
        {liveOther && (
          <div className="bubble theirs live"><p className="main dim"><span className="dots"><i /><i /><i /></span> {L.otherSpeaking}</p></div>
        )}
      </div>
      {p.notice && <div className="notice">{p.notice}</div>}
      {p.micError && <div className="notice warn">{p.micError}</div>}
      {p.extra}
      <div className="controls">
        <div className="tool-slot">{p.leftTool}</div>
        <div className="mic-wrap">
          <button
            className={`mic ${listening ? "on" : ""} ${processing ? "proc" : ""}`}
            disabled={!!otherBusy || !!processing}
            onPointerDown={(e) => { e.preventDefault(); p.onMicDown(); }}
            onPointerUp={p.onMicUp}
            onPointerLeave={p.onMicUp}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={listening ? L.finish : L.tap}
          >
            {listening && <span className="ring" style={{ transform: `scale(${scale})` }} />}
            {processing ? <span className="spinner" /> : listening ? <StopIcon /> : <MicIcon />}
          </button>
          <span className="mic-label">{listening ? L.listening : processing ? L.translating : otherBusy ? L.otherSpeaking : L.tap}</span>
        </div>
        <div className="tool-slot">{p.rightTool}</div>
      </div>
    </div>
  );
}

function ToolBtn({ label, icon, onClick, disabled }: { label: string; icon: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="tool" onClick={onClick} disabled={disabled}>
      <span className="tool-icon" aria-hidden>{icon}</span>
      <span className="tool-label">{label}</span>
    </button>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="닫기">✕</button></div>
        {children}
      </div>
    </div>
  );
}

function PhraseSheet({ phrases, lang, onPick, onClose }: { phrases: Phrase[]; lang: GuestLang; onPick: (p: Phrase) => void; onClose: () => void }) {
  const cats = useMemo(() => [...new Set(phrases.map((p) => p.category))], [phrases]);
  const [cat, setCat] = useState(cats[0] ?? "");
  const list = phrases.filter((p) => p.category === (cat || cats[0]));
  return (
    <Sheet title="자주 쓰는 문장" onClose={onClose}>
      <div className="tabs">{cats.map((c) => <button key={c} className={`tab ${c === (cat || cats[0]) ? "sel" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="phrase-list">
        {list.map((p) => (
          <button key={p.id} className="phrase" onClick={() => onPick(p)}>
            <span className="ko">{p.ko}</span>
            <span className="tr" lang={LANG_META[lang].html}>{p[lang] || "(누르면 바로 번역)"}</span>
          </button>
        ))}
        {!list.length && <p className="empty">관리자 화면에서 문장을 추가하세요.</p>}
      </div>
    </Sheet>
  );
}

function KeyboardSheet({ lang, onSend, onClose }: { lang: GuestLang; onSend: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState("");
  return (
    <Sheet title={`글자로 입력 → ${LANG_META[lang].korean}로 통역`} onClose={onClose}>
      <textarea className="input" autoFocus rows={3} value={t} onChange={(e) => setT(e.target.value)} placeholder="한국어로 입력하세요" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (t.trim()) onSend(t.trim()); } }} />
      <div className="sheet-actions"><button className="btn primary" disabled={!t.trim()} onClick={() => onSend(t.trim())}>통역하기</button></div>
    </Sheet>
  );
}

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <rect x="9" y="2.5" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" /></svg>
);
