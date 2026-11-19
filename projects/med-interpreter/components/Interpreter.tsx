"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Listener, MicEngine, PcmPlayer, type ListenState } from "@/lib/client/audio";
import { Room, newRoomCode, normalizeRoom, type RoomEvent } from "@/lib/client/room";
import { GUEST_LANGS, GUEST_UI, LANG_META, detectLang, isGuestLang, type GuestLang, type Lang } from "@/lib/langs";

type Mode = "desk" | "guest" | "solo";
type Side = "staff" | "guest";
type Settings = {
  hospital_name: string; retention_days: number; speak_to_guest: boolean; speak_to_staff: boolean;
  slow_speech: boolean; flip_guest: boolean; idle_seconds: number;
};
type Phrase = { id: string; category: string; ko: string } & Partial<Record<Lang, string | null>>;
type Boot = { settings: Settings; phrases: Phrase[]; realtime: { url: string; key: string } };
type Msg = {
  id: string; speaker: Side; kind: "speech" | "text" | "phrase";
  srcLang: Lang; src: string; tgtLang: Lang; tgt: string;
  status: "translating" | "done" | "error"; at: number;
};
type Live = { speaker: Side; text: string; at: number };
type Sess = { id: string; consent: boolean | null };

const uid = () => crypto.randomUUID();
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} },
};

// 두 문장이 얼마나 비슷한지 (글자 2개 묶음 겹침). 스피커 소리를 마이크가 다시 받아쓴 경우를 걸러낸다.
function similar(a: string, b: string) {
  const n = (s: string) => s.toLowerCase().replace(/[\s.,!?。、，？！…'"]/g, "");
  const x = n(a), y = n(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) ?? 0) + 1); } return m; };
  const gx = grams(x), gy = grams(y);
  let inter = 0;
  for (const [g, c] of gx) inter += Math.min(c, gy.get(g) ?? 0);
  return (2 * inter) / Math.max(1, x.length - 1 + y.length - 1);
}

// ================================================================
export default function Interpreter() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const qm = q.get("mode"), qr = normalizeRoom(q.get("room") ?? "");
    if ((qm === "guest" || qm === "desk") && qr) { store.set("mb.mode", qm); store.set("mb.room", qr); history.replaceState(null, "", "/"); }
    const m = store.get("mb.mode") as Mode | null;
    const r = store.get("mb.room");
    if (m === "solo") setMode("solo");
    else if ((m === "desk" || m === "guest") && r) { setMode(m); setRoom(r); }
    setReady(true);
    fetch("/api/bootstrap", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) { location.href = "/unlock"; return; }
      setBoot(await res.json());
    }).catch(() => {});
  }, []);

  const pick = (m: Mode, r: string | null) => {
    store.set("mb.mode", m); store.set("mb.room", r);
    setMode(m); setRoom(r);
  };
  const exit = () => { store.set("mb.mode", null); setMode(null); };

  if (!ready || !boot) return <div className="loading"><span className="spinner dark" /></div>;
  if (!mode) return <ModePicker hospital={boot.settings.hospital_name} onPick={pick} />;
  return <Conversation key={`${mode}:${room}`} mode={mode} room={room} boot={boot} onExit={exit} />;
}

// ================================================================
function ModePicker({ hospital, onPick }: { hospital: string; onPick: (m: Mode, room: string | null) => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const desk = () => {
    let r = store.get("mb.deskRoom");
    if (!r) { r = newRoomCode(); store.set("mb.deskRoom", r); }
    onPick("desk", r);
  };
  const guest = () => {
    const r = normalizeRoom(code);
    if (!r) { setErr("데스크 화면에 보이는 8자리 연결 코드를 입력하세요."); return; }
    onPick("guest", r);
  };
  return (
    <main className="picker">
      <div className="picker-head">
        <img src="/brand.svg" alt="" width={56} height={56} />
        <h1>{hospital} 통역</h1>
        <p className="muted">이 기기를 어떤 화면으로 쓸지 고르세요. 한 번 고르면 다음부터 바로 열립니다.</p>
      </div>
      <div className="picker-grid">
        <button className="pick-card" onClick={desk}>
          <span className="pick-icon">🧑‍⚕️</span>
          <b>데스크 화면</b>
          <span>직원 앞에 두는 화면. 직원 말은 손님 언어로, 손님 말은 한국어로 보이고 들립니다.</span>
        </button>
        <div className="pick-card as-div">
          <span className="pick-icon">🙋</span>
          <b>손님 화면</b>
          <span>손님 앞에 두는 두 번째 기기. 데스크 화면의 연결 코드를 입력하거나 QR을 찍으세요.</span>
          <div className="pick-join">
            <input className="input code-sm" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="ABCD-1234" aria-label="연결 코드" onKeyDown={(e) => e.key === "Enter" && guest()} />
            <button className="btn primary" onClick={guest}>연결</button>
          </div>
          {err && <span className="warn sm">{err}</span>}
        </div>
        <button className="pick-card" onClick={() => onPick("solo", null)}>
          <span className="pick-icon">🖥️</span>
          <b>한 화면으로 같이 보기</b>
          <span>기기 하나(모니터 복제 포함)를 함께 볼 때. 한국어와 손님 언어를 모두 알아듣고 양쪽 글자를 같이 보여줍니다.</span>
        </button>
      </div>
      <a className="link" href="/admin">⚙︎ 관리자</a>
    </main>
  );
}

// ================================================================
function Conversation({ mode, room: roomCode, boot, onExit }: { mode: Mode; room: string | null; boot: Boot; onExit: () => void }) {
  const settings = boot.settings;
  const authority = mode !== "guest"; // 대화 상태(세션·언어·초기화)는 데스크(또는 한 화면)가 정한다
  const [started, setStarted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [lives, setLives] = useState<Record<string, Live>>({});
  const [guestLang, setGuestLang] = useState<GuestLang>("en");
  const [session, setSession] = useState<Sess>(() => ({ id: uid(), consent: null }));
  const [listen, setListen] = useState<ListenState>("off");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [remoteTts, setRemoteTts] = useState(false);
  const [roomOk, setRoomOk] = useState(false);
  const [peerAt, setPeerAt] = useState(0);
  const [sheet, setSheet] = useState<null | "connect" | "phrases" | "keyboard" | "lang" | "menu">(null);
  const [now, setNow] = useState(Date.now());

  const dev = useRef(uid().slice(0, 8));
  const mic = useRef<MicEngine | null>(null);
  const listener = useRef<Listener | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  const room = useRef<Room | null>(null);
  const S = useRef({ msgs, guestLang, session, soundOn });
  S.current = { msgs, guestLang, session, soundOn };
  const recent = useRef<{ text: string; at: number }[]>([]);
  const ttsQueue = useRef<Msg[]>([]);
  const ttsBusy = useRef(false);
  const lastActivity = useRef(Date.now());
  const sessionCreated = useRef<string | null>(null);
  const remoteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const liveSent = useRef(0);
  const feed = useRef<HTMLDivElement>(null);

  const G = GUEST_UI[guestLang];

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  // ---------- 상태 공유 ----------
  const broadcastState = useCallback((extra?: { withMsgs?: boolean }) => {
    if (!authority) return;
    const s = S.current;
    room.current?.send("state", { session: s.session, guestLang: s.guestLang, ...(extra?.withMsgs ? { msgs: s.msgs.slice(-40) } : {}) });
  }, [authority]);

  const upsertMsg = useCallback((m: Msg) => {
    setMsgs((xs) => {
      const i = xs.findIndex((x) => x.id === m.id);
      if (i < 0) return [...xs, m].sort((a, b) => a.at - b.at).slice(-200);
      const c = xs.slice(); c[i] = m; return c;
    });
  }, []);

  const ensureSession = useCallback(async () => {
    const s = S.current.session;
    if (!authority || sessionCreated.current === s.id) return;
    sessionCreated.current = s.id;
    await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, guestLang: S.current.guestLang }) }).catch(() => {});
  }, [authority]);

  const changeGuestLang = useCallback((l: GuestLang, fromRemote = false) => {
    if (l === S.current.guestLang) return;
    setGuestLang(l);
    S.current.guestLang = l;
    if (authority) {
      broadcastState();
      if (sessionCreated.current === S.current.session.id) void fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: S.current.session.id, guestLang: l }) });
    } else if (!fromRemote) room.current?.send("lang", { guestLang: l });
  }, [authority, broadcastState]);

  const applyConsent = useCallback(async (v: boolean) => {
    if (!authority) { room.current?.send("consent", { value: v }); setSession((s) => ({ ...s, consent: v })); return; }
    const s = { ...S.current.session, consent: v };
    setSession(s); S.current.session = s;
    broadcastState();
    await ensureSession();
    await fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, consent: v }) }).catch(() => {});
    if (v) {
      const items = S.current.msgs.filter((m) => m.status === "done").map((m) => ({ speaker: m.speaker, kind: m.kind, srcLang: m.srcLang, srcText: m.src, tgtLang: m.tgtLang, tgtText: m.tgt }));
      if (items.length) await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, items }) }).catch(() => {});
    }
  }, [authority, broadcastState, ensureSession]);

  // ---------- 음성 재생 (이 화면 쪽 사람이 들어야 할 것만) ----------
  const wantsAudio = useCallback((m: Msg) => {
    if (!S.current.soundOn) return false;
    if (m.tgtLang === "ko") return mode !== "guest" && settings.speak_to_staff;
    return mode !== "desk" && settings.speak_to_guest;
  }, [mode, settings]);

  const pumpTts = useCallback(async () => {
    if (ttsBusy.current) return;
    ttsBusy.current = true;
    while (ttsQueue.current.length) {
      // 이 기기 앞 사람이 말하는 중이면 끝날 때까지 기다린다 (말을 끊지 않게, 최대 15초)
      for (let w = 0; w < 100; w++) {
        const st = listener.current?.current;
        if (st !== "speech" && st !== "finalizing") break;
        await new Promise((r) => setTimeout(r, 150));
      }
      const m = ttsQueue.current.shift();
      if (!m) break;
      setSpeakingId(m.id);
      listener.current?.pause("tts", true);
      room.current?.send("tts", { dev: dev.current, on: true });
      recent.current.push({ text: m.tgt, at: Date.now() });
      await player.current?.play(m.id + m.tgt.length, m.tgt, m.tgtLang);
      room.current?.send("tts", { dev: dev.current, on: false });
      await new Promise((r) => setTimeout(r, 250)); // 스피커 잔향이 마이크에 안 들어가게
      listener.current?.pause("tts", false);
      setSpeakingId(null);
    }
    ttsBusy.current = false;
  }, []);

  const speak = useCallback((m: Msg, force = false) => {
    if (!force && !wantsAudio(m)) return;
    if (force) { player.current?.stop(); ttsQueue.current = []; ttsBusy.current = false; }
    ttsQueue.current.push(m);
    void pumpTts();
  }, [wantsAudio, pumpTts]);

  // ---------- 통역 ----------
  const interpret = useCallback(async (text: string, srcLang: Lang, kind: "speech" | "text") => {
    lastActivity.current = Date.now();
    const speaker: Side = srcLang === "ko" ? "staff" : "guest";
    const tgtLang: Lang = srcLang === "ko" ? S.current.guestLang : "ko";
    const hist = S.current.msgs.filter((m) => m.status === "done").slice(-6).map((m) => ({ speaker: m.speaker, text: m.speaker === "staff" ? m.src : m.tgt }));
    const m: Msg = { id: uid(), speaker, kind, srcLang, src: text, tgtLang, tgt: "", status: "translating", at: Date.now() };
    upsertMsg(m);
    room.current?.send("msg", { msg: m });
    if (authority) void ensureSession();
    const consent = S.current.session.consent === true;
    let last = 0;
    try {
      const r = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: srcLang, to: tgtLang, speaker, kind, sessionId: consent ? S.current.session.id : null, history: hist }),
      });
      if (!r.ok || !r.body) throw new Error(String(r.status));
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let out = "";
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
        m.tgt = out;
        upsertMsg({ ...m });
        if (Date.now() - last > 200) { last = Date.now(); room.current?.send("msg", { msg: { ...m } }); }
      }
      m.tgt = out.trim();
      if (!m.tgt) throw new Error("empty");
      m.status = "done";
    } catch {
      m.status = "error";
    }
    upsertMsg({ ...m });
    room.current?.send("msg", { msg: { ...m } });
    if (m.status === "done") { recent.current.push({ text: m.tgt, at: Date.now() }); speak(m); }
  }, [authority, ensureSession, speak, upsertMsg]);

  // 이 기기 마이크가 확정한 문장
  const onFinal = useCallback((text: string) => {
    const sendLiveEnd = () => { setLives((l) => { const c = { ...l }; delete c[dev.current]; return c; }); room.current?.send("live", { dev: dev.current, text: "" }); };
    const lang = detectLang(text);
    if (!lang) { sendLiveEnd(); return; }
    // 두 기기를 쓸 때: 데스크는 한국어만, 손님 화면은 외국어만 맡는다 (서로 상대 말을 중복 통역하지 않게)
    if ((mode === "desk" && lang !== "ko") || (mode === "guest" && lang === "ko")) { sendLiveEnd(); return; }
    // 방금 스피커로 나온 통역을 다시 받아쓴 것이면 버린다
    const t = Date.now();
    recent.current = recent.current.filter((r) => t - r.at < 25_000);
    if (recent.current.some((r) => similar(r.text, text) > 0.55)) { sendLiveEnd(); return; }
    sendLiveEnd();
    if (lang !== "ko" && isGuestLang(lang)) changeGuestLang(lang);
    recent.current.push({ text, at: t });
    void interpret(text, lang, "speech");
  }, [mode, changeGuestLang, interpret]);

  const onPartial = useCallback((text: string) => {
    const lang = detectLang(text);
    if (text && ((mode === "desk" && lang && lang !== "ko") || (mode === "guest" && lang === "ko"))) return;
    const speaker: Side = lang && lang !== "ko" ? "guest" : mode === "guest" ? "guest" : "staff";
    const live: Live = { speaker, text, at: Date.now() };
    setLives((l) => ({ ...l, [dev.current]: live }));
    lastActivity.current = Date.now();
    if (Date.now() - liveSent.current > 250 || !text) { liveSent.current = Date.now(); room.current?.send("live", { dev: dev.current, ...live }); }
  }, [mode]);

  // ---------- 실시간 채널 ----------
  const onRoom = useCallback((e: RoomEvent) => {
    const p = e.payload;
    switch (e.event) {
      case "hello":
      case "ping":
        setPeerAt(Date.now());
        if (e.event === "hello") broadcastState({ withMsgs: true });
        break;
      case "state": {
        setPeerAt(Date.now());
        if (authority) break;
        const s = p.session as Sess | undefined;
        if (s?.id) setSession(s);
        if (isGuestLang(p.guestLang)) { setGuestLang(p.guestLang); S.current.guestLang = p.guestLang; }
        if (Array.isArray(p.msgs) && !S.current.msgs.length) setMsgs(p.msgs as Msg[]);
        break;
      }
      case "msg": {
        const m = p.msg as Msg;
        if (!m?.id) break;
        upsertMsg(m);
        lastActivity.current = Date.now();
        if (authority) void ensureSession();
        if (m.status === "done") { recent.current.push({ text: m.tgt, at: Date.now() }, { text: m.src, at: Date.now() }); speak(m); }
        break;
      }
      case "live": {
        const d = String(p.dev ?? "");
        setLives((l) => {
          const c = { ...l };
          if (!p.text) delete c[d]; else c[d] = { speaker: p.speaker === "guest" ? "guest" : "staff", text: String(p.text), at: Date.now() };
          return c;
        });
        break;
      }
      case "tts": {
        // 상대 기기 스피커 소리는 언어로 걸러지므로(데스크=한국어만, 손님=외국어만) 마이크를 멈추지 않는다. 표시만 한다.
        const d = String(p.dev ?? "");
        clearTimeout(remoteTimers.current[d]);
        setRemoteTts(!!p.on);
        if (p.on) remoteTimers.current[d] = setTimeout(() => setRemoteTts(false), 25_000);
        break;
      }
      case "lang":
        if (authority && isGuestLang(p.guestLang)) changeGuestLang(p.guestLang, true);
        break;
      case "consent":
        if (authority && typeof p.value === "boolean") void applyConsent(p.value);
        break;
      case "clear":
        if (!authority) { setMsgs([]); setLives({}); player.current?.stop(); ttsQueue.current = []; }
        break;
    }
  }, [authority, broadcastState, upsertMsg, speak, changeGuestLang, applyConsent, ensureSession]);
  const onRoomRef = useRef(onRoom);
  onRoomRef.current = onRoom;

  useEffect(() => {
    if (!roomCode || !boot.realtime.key) return;
    const r = new Room(boot.realtime.url, boot.realtime.key, roomCode, (e) => onRoomRef.current(e));
    r.onStatus = (ok) => { setRoomOk(ok); if (ok) r.send(authority ? "state" : "hello", authority ? { session: S.current.session, guestLang: S.current.guestLang } : { dev: dev.current }); };
    room.current = r;
    const ping = setInterval(() => r.send("ping", { dev: dev.current, mode }), 10_000);
    return () => { clearInterval(ping); r.close(); room.current = null; };
  }, [roomCode, boot.realtime, authority, mode]);

  // ---------- 시작 (사용자 터치 필요: 마이크·소리 허용) ----------
  const start = useCallback(async () => {
    setStarted(true);
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } };
      void nav.wakeLock?.request("screen").catch(() => {});
    } catch {}
    try {
      mic.current = new MicEngine();
      await mic.current.init();
      player.current = new PcmPlayer(() => mic.current?.ctx ?? null);
      const l = new Listener(mic.current, () => ({ guestLang: S.current.guestLang }));
      l.onState = setListen;
      l.onLevel = (v) => setLevel(v);
      l.onPartial = (t) => onPartialRef.current(t);
      l.onFinal = (t) => onFinalRef.current(t);
      listener.current = l;
      void l.connect();
      setListen(l.current);
    } catch (e) {
      console.warn(e);
      setMicError(mode === "guest" ? G.micDenied : "마이크를 쓸 수 없습니다. 브라우저 주소창의 마이크 권한을 허용해 주세요.");
      if (!player.current) player.current = new PcmPlayer(() => mic.current?.ctx ?? null);
    }
  }, [mode, G.micDenied]);
  const onPartialRef = useRef(onPartial); onPartialRef.current = onPartial;
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal;

  useEffect(() => {
    const v = () => { if (document.visibilityState === "visible" && started) { const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } }; void nav.wakeLock?.request("screen").catch(() => {}); } };
    document.addEventListener("visibilitychange", v);
    return () => { document.removeEventListener("visibilitychange", v); listener.current?.close(); };
  }, [started]);

  useEffect(() => { listener.current?.setMuted(muted); }, [muted]);

  // ---------- 새 손님 (자동 초기화) ----------
  const newGuest = useCallback(() => {
    if (!authority) return;
    const old = S.current.session;
    if (sessionCreated.current === old.id) void fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: old.id, end: true }) });
    const s: Sess = { id: uid(), consent: null };
    setSession(s); S.current.session = s;
    setMsgs([]); S.current.msgs = [];
    setLives({});
    player.current?.stop(); ttsQueue.current = [];
    recent.current = [];
    room.current?.send("clear", {});
    broadcastState();
    setSheet(null);
    lastActivity.current = Date.now();
  }, [authority, broadcastState]);

  useEffect(() => {
    if (!authority) return;
    const i = setInterval(() => {
      if (S.current.msgs.length && Date.now() - lastActivity.current > settings.idle_seconds * 1000) newGuest();
    }, 2000);
    return () => clearInterval(i);
  }, [authority, newGuest, settings.idle_seconds]);

  // ---------- 직원 입력 (자주 쓰는 문장 / 글자) ----------
  const sendPhrase = useCallback((p: Phrase) => {
    setSheet(null);
    const t = p[S.current.guestLang];
    if (!t) { void interpret(p.ko, "ko", "text"); return; }
    const m: Msg = { id: uid(), speaker: "staff", kind: "phrase", srcLang: "ko", src: p.ko, tgtLang: S.current.guestLang, tgt: t, status: "done", at: Date.now() };
    lastActivity.current = Date.now();
    upsertMsg(m);
    room.current?.send("msg", { msg: m });
    recent.current.push({ text: t, at: Date.now() });
    speak(m);
    void ensureSession();
    const s = S.current.session;
    if (s.consent) void fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, speaker: "staff", kind: "phrase", srcLang: "ko", srcText: p.ko, tgtLang: m.tgtLang, tgtText: t }) });
  }, [interpret, upsertMsg, speak, ensureSession]);

  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, lives]);

  // ================= 화면 =================
  const peerOnline = now - peerAt < 25_000;
  const liveList = Object.entries(lives).filter(([, l]) => l.text && now - l.at < 15_000);
  const lastTheirs = [...msgs].reverse().find((m) => m.status === "done" && (mode === "desk" ? m.tgtLang === "ko" : mode === "guest" ? m.tgtLang !== "ko" : true));
  const showConsent = mode !== "desk" && session.consent === null && msgs.some((m) => m.status === "done");
  const guestView = mode === "guest";

  if (!started) {
    return (
      <div className={`startup ${mode}`}>
        {guestView ? (
          <button className="start-card" onClick={start}>
            <div className="welcome-multi">{GUEST_LANGS.map((l) => <span key={l} lang={LANG_META[l].html}>{GUEST_UI[l].welcome}</span>)}</div>
            <span className="start-btn">▶ {GUEST_LANGS.map((l) => GUEST_UI[l].tapToStart).slice(0, 3).join(" · ")}</span>
          </button>
        ) : (
          <button className="start-card" onClick={start}>
            <p className="eyebrow">{settings.hospital_name} · {mode === "desk" ? "데스크 화면" : "한 화면 모드"}</p>
            <h1>통역 시작</h1>
            <p className="lead">누르면 마이크가 켜지고 계속 듣습니다. 버튼 없이 말하면 바로 통역됩니다.</p>
            <span className="start-btn">▶ 시작하기</span>
          </button>
        )}
        <button className="link corner" onClick={onExit}>화면 모드 바꾸기</button>
      </div>
    );
  }

  return (
    <div className={`conv ${mode}`} lang={guestView ? LANG_META[guestLang].html : "ko"}>
      <header className="topbar">
        <div className="bar-left">
          {guestView ? (
            <button className="chip as-btn" onClick={() => setSheet("lang")}>{LANG_META[guestLang].flag} {LANG_META[guestLang].native} ▾</button>
          ) : (
            <>
              <b className="bar-title">{settings.hospital_name}</b>
              <button className="chip as-btn" onClick={() => setSheet("lang")} title="손님 언어 (자동 인식)">손님 {LANG_META[guestLang].flag} {LANG_META[guestLang].korean} ▾</button>
            </>
          )}
        </div>
        <ListenPill state={listen} level={level} remote={remoteTts} speaking={!!speakingId} guest={guestView ? G : null} />
        <div className="bar-right">
          {mode === "desk" && (
            <button className={`peer ${peerOnline ? "on" : ""}`} onClick={() => setSheet("connect")}>
              {peerOnline ? "● 손님 화면 연결됨" : roomOk ? "○ 손님 화면 연결하기" : "연결 중…"}
            </button>
          )}
          {mode !== "desk" && session.consent === true && <span className="badge on">● {guestView ? G.saving : "기록 저장 중"}</span>}
          {mode === "desk" && <span className={`badge ${session.consent ? "on" : ""}`}>{session.consent ? "● 기록 저장 중" : session.consent === false ? "기록 안 함" : "기록 동의 전"}</span>}
          <button className={`icon-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)} aria-label="마이크">{muted ? "🎙̸" : "🎙"}</button>
          <button className={`icon-btn ${soundOn ? "" : "off"}`} onClick={() => { setSoundOn((v) => !v); player.current?.stop(); }} aria-label="소리">{soundOn ? "🔊" : "🔇"}</button>
          {!guestView && <button className="icon-btn" onClick={() => setSheet("menu")} aria-label="메뉴">⋯</button>}
        </div>
      </header>

      <div className="feed" ref={feed}>
        {!msgs.length && !liveList.length && (
          guestView ? (
            <div className="empty-guest">
              <div className="welcome-multi">{GUEST_LANGS.map((l) => <span key={l} lang={LANG_META[l].html}>{GUEST_UI[l].welcome}</span>)}</div>
              <div className="speak-hints">{GUEST_LANGS.map((l) => <p key={l} lang={LANG_META[l].html}>{GUEST_UI[l].justSpeak}</p>)}</div>
            </div>
          ) : (
            <div className="empty-desk">
              <h2>말씀하시면 바로 통역됩니다</h2>
              <p>한국어로 말하면 손님 언어로, 손님이 말하면 한국어로 바뀝니다. 손님 언어는 자동으로 알아냅니다.</p>
              {mode === "desk" && !peerOnline && <button className="btn ghost" onClick={() => setSheet("connect")}>손님 화면 연결하기 (QR)</button>}
            </div>
          )
        )}
        {msgs.map((m) => <MsgRow key={m.id} m={m} mode={mode} G={G} speaking={speakingId === m.id} onReplay={() => speak(m, true)} />)}
        {liveList.map(([d, l]) => (
          <div key={d} className={`row live ${l.speaker}`}>
            <span className="who">{l.speaker === "staff" ? (guestView ? "Staff" : "직원") : guestView ? "You" : "손님"}</span>
            <p className="primary">{l.text}<span className="caret" /></p>
          </div>
        ))}
      </div>

      {micError && <div className="notice warn">{micError}</div>}
      {showConsent && (
        <div className="consent-bar" lang={LANG_META[guestLang].html}>
          <p>{G.saveAsk(settings.retention_days)}</p>
          <div className="consent-btns">
            <button className="btn primary" onClick={() => applyConsent(true)}>{G.saveYes}</button>
            <button className="btn ghost" onClick={() => applyConsent(false)}>{G.saveNo}</button>
          </div>
        </div>
      )}

      <footer className="foot">
        {guestView ? (
          <>
            <p className="disclaimer">{G.disclaimer}</p>
            {lastTheirs && <button className="btn ghost" onClick={() => speak(lastTheirs, true)}>↻ {G.replay}</button>}
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={() => setSheet("phrases")}>☰ 자주 쓰는 문장</button>
            <button className="btn ghost" onClick={() => setSheet("keyboard")}>⌨ 글자로 입력</button>
            <span className="grow" />
            <button className="btn end" onClick={newGuest}>새 손님 (화면 비우기)</button>
          </>
        )}
      </footer>

      {sheet === "connect" && roomCode && <ConnectSheet code={roomCode} online={peerOnline} onClose={() => setSheet(null)} />}
      {sheet === "phrases" && <PhraseSheet phrases={boot.phrases} lang={guestLang} onPick={sendPhrase} onClose={() => setSheet(null)} />}
      {sheet === "keyboard" && <KeyboardSheet lang={guestLang} onSend={(t) => { setSheet(null); void interpret(t, "ko", "text"); }} onClose={() => setSheet(null)} />}
      {sheet === "lang" && (
        <Sheet title={guestView ? "Language" : "손님 언어 (말하면 자동으로 바뀝니다)"} onClose={() => setSheet(null)}>
          <div className="lang-grid">
            {GUEST_LANGS.map((l) => (
              <button key={l} className={`lang-btn ${l === guestLang ? "sel" : ""}`} onClick={() => { changeGuestLang(l); setSheet(null); }}>
                <span className="flag">{LANG_META[l].flag}</span><span>{guestView ? LANG_META[l].native : LANG_META[l].korean}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === "menu" && (
        <Sheet title="메뉴" onClose={() => setSheet(null)}>
          <div className="menu-list">
            {mode === "desk" && <button className="menu-item" onClick={() => setSheet("connect")}>손님 화면 연결 (QR·코드)</button>}
            <button className="menu-item" onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); setSheet(null); }}>전체화면 켜기/끄기</button>
            <a className="menu-item" href="/admin">관리자 화면 (용어집·기록·설정)</a>
            <button className="menu-item" onClick={() => { listener.current?.close(); onExit(); }}>화면 모드 바꾸기</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------------- 하위 컴포넌트 ----------------

function ListenPill({ state, level, remote, speaking, guest }: { state: ListenState; level: number; remote: boolean; speaking: boolean; guest: (typeof GUEST_UI)[GuestLang] | null }) {
  const label = speaking ? (guest ? guest.speaking : "통역 음성 재생 중")
    : state === "off" ? (guest ? guest.paused : "마이크 꺼짐")
    : state === "paused" ? (guest ? guest.paused : "잠시 멈춤")
    : state === "speech" ? (guest ? guest.listening : "받아쓰는 중")
    : state === "finalizing" ? (guest ? guest.listening : "정리 중")
    : guest ? guest.listening : "듣는 중 · 그냥 말하세요";
  const bars = [0.35, 0.7, 1, 0.7, 0.35];
  const active = state === "speech" || state === "idle" || state === "finalizing";
  return (
    <div className={`listen-pill ${state} ${speaking ? "tts" : ""}`}>
      <span className="lvl" aria-hidden>
        {bars.map((b, i) => <i key={i} style={{ height: `${active ? Math.max(4, Math.min(22, level * 160 * b + 4)) : 4}px` }} />)}
      </span>
      <span>{label}</span>
    </div>
  );
}

function MsgRow({ m, mode, G, speaking, onReplay }: { m: Msg; mode: Mode; G: (typeof GUEST_UI)[GuestLang]; speaking: boolean; onReplay: () => void }) {
  const pending = m.status === "translating" && !m.tgt;
  const dots = <span className="dots"><i /><i /><i /></span>;
  if (mode === "solo") {
    // 한 화면: 한국어 줄과 손님 언어 줄을 모두 크게
    const ko = m.srcLang === "ko" ? m.src : m.tgt;
    const fx = m.srcLang === "ko" ? m.tgt : m.src;
    const fxLang = m.srcLang === "ko" ? m.tgtLang : m.srcLang;
    return (
      <div className={`row ${m.speaker} ${speaking ? "speaking" : ""}`}>
        <span className="who">{m.speaker === "staff" ? "직원" : "손님"} <em>{LANG_META[fxLang].flag}</em></span>
        <p className="primary" lang="ko">{ko || dots}</p>
        <p className="primary alt" lang={LANG_META[fxLang].html}>{fx || dots}</p>
        {m.status === "error" && <p className="err">⚠︎ 통역 실패</p>}
        {m.status === "done" && <button className="replay" onClick={onReplay} aria-label="다시 듣기">{speaking ? "🔊" : "▶︎"}</button>}
      </div>
    );
  }
  const viewerIsGuest = mode === "guest";
  const mine = viewerIsGuest ? m.speaker === "guest" : m.speaker === "staff";
  const primary = mine ? m.src : m.tgt;
  const secondary = mine ? m.tgt : m.src;
  const canReplay = !mine && m.status === "done";
  const who = viewerIsGuest ? (m.speaker === "staff" ? "Staff" : "You") : m.speaker === "staff" ? "직원" : `손님 ${LANG_META[m.srcLang].flag}`;
  return (
    <div className={`row ${m.speaker} ${mine ? "mine" : "theirs"} ${speaking ? "speaking" : ""}`}>
      <span className="who">{who}</span>
      <p className="primary">{pending ? dots : primary}</p>
      {m.status === "error" ? <p className="err">⚠︎ {viewerIsGuest ? "Error" : "통역 실패 — 다시 말씀해 주세요"}</p>
        : secondary ? <p className="secondary">{!mine && <span className="tag">{viewerIsGuest ? G.original : "원문"}</span>}{secondary}</p> : null}
      {canReplay && <button className="replay" onClick={onReplay} aria-label={viewerIsGuest ? G.replay : "다시 듣기"}>{speaking ? "🔊" : "▶︎"}</button>}
    </div>
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

function ConnectSheet({ code, online, onClose }: { code: string; online: boolean; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const url = typeof location !== "undefined" ? `${location.origin}/?mode=guest&room=${code}` : "";
  useEffect(() => { void QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#0f1f24", light: "#ffffff" } }).then(setQr); }, [url]);
  return (
    <Sheet title="손님 화면 연결" onClose={onClose}>
      <div className="connect">
        {qr && <img src={qr} alt="손님 화면 연결 QR" width={220} height={220} />}
        <div className="connect-info">
          <p>손님 쪽 기기(태블릿·모니터 PC)로 QR을 찍거나, 그 기기에서 이 주소를 열고 <b>손님 화면</b>을 고른 뒤 코드를 입력하세요.</p>
          <p className="code-big">{code}</p>
          <p className="muted small">{online ? "● 손님 화면이 연결되어 있습니다." : "아직 연결된 손님 화면이 없습니다."} 손님 기기도 처음 한 번은 기기 등록 코드가 필요합니다.</p>
        </div>
      </div>
    </Sheet>
  );
}

function PhraseSheet({ phrases, lang, onPick, onClose }: { phrases: Phrase[]; lang: GuestLang; onPick: (p: Phrase) => void; onClose: () => void }) {
  const cats = useMemo(() => [...new Set(phrases.map((p) => p.category))], [phrases]);
  const [cat, setCat] = useState(cats[0] ?? "");
  const list = phrases.filter((p) => p.category === (cat || cats[0]));
  return (
    <Sheet title="자주 쓰는 문장 — 누르면 바로 통역" onClose={onClose}>
      <div className="tabs">{cats.map((c) => <button key={c} className={`tab ${c === (cat || cats[0]) ? "sel" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="phrase-list">
        {list.map((p) => (
          <button key={p.id} className="phrase" onClick={() => onPick(p)}>
            <span className="ko">{p.ko}</span>
            <span className="tr" lang={LANG_META[lang].html}>{p[lang] || "(누르면 번역)"}</span>
          </button>
        ))}
        {!list.length && <p className="muted">관리자 화면에서 문장을 추가하세요.</p>}
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
