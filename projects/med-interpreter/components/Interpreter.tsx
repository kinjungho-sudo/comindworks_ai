"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Listener, MicEngine, PcmPlayer, listMics, toWav, type FinalTurn, type ListenState } from "@/lib/client/audio";
import { Room, deskNumber, deskRoom, normalizeRoom, type RoomEvent } from "@/lib/client/room";
import { GUEST_LANGS, GUEST_UI, LANG_META, detectLang, isGuestLang, isRisky, type GuestLang, type Lang } from "@/lib/langs";

type Mode = "desk" | "guest" | "solo";
type Side = "staff" | "guest";
type Settings = {
  hospital_name: string; retention_days: number; speak_to_guest: boolean; speak_to_staff: boolean;
  slow_speech: boolean; flip_guest: boolean; idle_seconds: number;
  interpreter_services: { name: string; phone?: string; url?: string; note?: string }[];
};
type Card = { id: string; title: string; keywords: string | null };
type Shown = { type: "card"; id: string; title: string; titleTr?: string } | { type: "amount"; value: number } | null;
type Role = "staff" | "guest" | "any";
type Ear = { role: Role; mic: MicEngine; l: Listener };
type Current = { kind: "live"; speaker: Side; text: string } | { kind: "msg"; m: Msg } | null;
type Phrase = { id: string; category: string; ko: string } & Partial<Record<Lang, string | null>>;
type Boot = { settings: Settings; phrases: Phrase[]; realtime: { url: string; key: string } };
type Msg = {
  id: string; speaker: Side; kind: "speech" | "text" | "phrase";
  srcLang: Lang; src: string; tgtLang: Lang; tgt: string;
  status: "hearing" | "translating" | "done" | "error"; at: number;
  recovered?: boolean; // 겹친 말 복원으로 찾아낸 발화
  back?: string; // 역번역 (직원 말 → 손님 언어 → 다시 한국어)
  backOk?: boolean; backIssue?: string;
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
    let r = store.get("mb.room");
    if (r && !normalizeRoom(r)) { r = deskRoom(1); store.set("mb.room", r); } // 예전 8자리 코드 → 데스크 1
    if (m === "solo" || !m) setMode("solo"); // 처음 여는 기기는 한 화면 모드로 바로 시작
    else if ((m === "desk" || m === "guest") && r) { setMode(m); setRoom(r); }
    setReady(true);
    fetch("/api/bootstrap", { cache: "no-store" }).then(async (res) => {
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
  const [desk, setDesk] = useState(() => deskNumber(store.get("mb.room")));
  return (
    <main className="picker">
      <header className="launch-top"><Brand /><span className="launch-hosp">{hospital}</span></header>
      <div className="picker-body">
        <div className="picker-head">
          <h1>이 기기를 어떻게 쓸까요?</h1>
          <p>한 번 고르면 다음부터 바로 열립니다. 언제든 메뉴에서 바꿀 수 있어요.</p>
        </div>
        <div className="picker-grid">
          <button className="pick-card primary" onClick={() => onPick("solo", null)}>
            <span className="pick-top"><span className="pick-ico"><Icon n="screen" size={26} /></span><span className="pick-badge">기본</span></span>
            <b>한 화면으로 같이 보기</b>
            <span>기기 하나를 직원과 손님이 함께 봅니다. 모니터를 복제해 두 화면에 띄워도 됩니다. 한국어·외국어를 모두 알아듣고 두 줄로 크게 보여줍니다.</span>
            <span className="pick-go">시작하기 <Icon n="arrow" size={16} /></span>
          </button>
          <button className="pick-card" onClick={() => onPick("desk", deskRoom(desk))}>
            <span className="pick-top"><span className="pick-ico"><Icon n="desk" size={26} /></span></span>
            <b>데스크 화면 <small>직원용</small></b>
            <span>손님 화면과 따로 쓰는 직원 쪽 기기. 같은 데스크 번호의 손님 화면과 자동으로 연결됩니다.</span>
            <span className="pick-go">데스크 {desk} 로 시작 <Icon n="arrow" size={16} /></span>
          </button>
          <button className="pick-card" onClick={() => onPick("guest", deskRoom(desk))}>
            <span className="pick-top"><span className="pick-ico"><Icon n="tablet" size={26} /></span></span>
            <b>손님 화면 <small>손님용</small></b>
            <span>손님 앞에 두는 두 번째 기기. 코드 입력 없이 같은 번호의 데스크 화면과 연결됩니다.</span>
            <span className="pick-go">데스크 {desk} 에 연결 <Icon n="arrow" size={16} /></span>
          </button>
        </div>
        <div className="desk-pick">
          <span>데스크 번호 (두 기기로 쓸 때)</span>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} className={`desk-n ${n === desk ? "sel" : ""}`} onClick={() => setDesk(n)}>{n}</button>)}
        </div>
      </div>
      <footer className="launch-foot"><a href="/admin"><Icon n="gear" size={16} /> 관리자</a></footer>
    </main>
  );
}

// ================================================================
function Conversation({ mode, room: roomCode, boot, onExit }: { mode: Mode; room: string | null; boot: Boot; onExit: () => void }) {
  const settings = boot.settings;
  const authority = mode !== "guest"; // 대화 상태(세션·언어·초기화·안내 자료)는 데스크(또는 한 화면)가 정한다
  const [started, setStarted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [lives, setLives] = useState<Record<string, Live>>({});
  const [guestLang, setGuestLang] = useState<GuestLang>("en");
  const [session, setSession] = useState<Sess>(() => ({ id: uid(), consent: null }));
  const [listen, setListen] = useState<ListenState>("off");
  const [level, setLevel] = useState(0);
  const [earCount, setEarCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [roomOk, setRoomOk] = useState(false);
  const [peerAt, setPeerAt] = useState(0);
  const [sheet, setSheet] = useState<null | "connect" | "phrases" | "keyboard" | "lang" | "menu" | "human" | "cards" | "summary" | "mics">(null);
  const [now, setNow] = useState(Date.now());
  const [cards, setCards] = useState<Card[]>([]);
  const [shown, setShown] = useState<Shown>(null);
  const [suggest, setSuggest] = useState<Card | null>(null);
  const [humanNotice, setHumanNotice] = useState(false); // 손님 화면: "통역사 연결 중" 안내
  const [humanAsked, setHumanAsked] = useState(false);   // 데스크: 손님이 사람 통역을 요청함
  const [riskDismissed, setRiskDismissed] = useState<string | null>(null);

  const dev = useRef(uid().slice(0, 8));
  const ears = useRef<Ear[]>([]);
  const player = useRef<PcmPlayer | null>(null);
  const room = useRef<Room | null>(null);
  const S = useRef({ msgs, guestLang, session, soundOn, shown });
  S.current = { msgs, guestLang, session, soundOn, shown };
  const recent = useRef<{ text: string; at: number }[]>([]);
  const ttsQueue = useRef<Msg[]>([]);
  const ttsBusy = useRef(false);
  const lastActivity = useRef(Date.now());
  const sessionCreated = useRef<string | null>(null);
  const liveSent = useRef<Record<string, number>>({});
  const levels = useRef<Record<string, number>>({});
  const feed = useRef<HTMLDivElement>(null);

  const G = GUEST_UI[guestLang];
  const guestView = mode === "guest";

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!authority) return;
    fetch("/api/cards", { cache: "no-store" }).then((r) => r.json()).then((j) => setCards(j.cards ?? [])).catch(() => {});
  }, [authority]);

  // 여러 마이크를 한꺼번에 다루는 도우미
  const pauseAll = useCallback((reason: string, on: boolean) => { for (const e of ears.current) e.l.pause(reason, on); }, []);
  const anyTalking = () => ears.current.some((e) => e.l.current === "speech" || e.l.current === "finalizing");
  const refreshListen = useCallback(() => {
    const st = ears.current.map((e) => e.l.current);
    setListen(st.includes("speech") ? "speech" : st.includes("finalizing") ? "finalizing" : st[0] ?? "off");
  }, []);

  // ---------- 상태 공유 ----------
  const broadcastState = useCallback((extra?: { withMsgs?: boolean }) => {
    if (!authority) return;
    const s = S.current;
    room.current?.send("state", { session: s.session, guestLang: s.guestLang, shown: s.shown, ...(extra?.withMsgs ? { msgs: s.msgs.slice(-40) } : {}) });
  }, [authority]);

  const upsertMsg = useCallback((m: Msg) => {
    setMsgs((xs) => {
      const i = xs.findIndex((x) => x.id === m.id);
      if (i < 0) return [...xs, m].sort((a, b) => a.at - b.at).slice(-200);
      const c = xs.slice(); c[i] = { ...c[i], ...m };
      return c[i].at !== xs[i].at ? c.sort((a, b) => a.at - b.at) : c;
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
      for (let w = 0; w < 40 && anyTalking(); w++) await new Promise((r) => setTimeout(r, 150));
      const m = ttsQueue.current.shift();
      if (!m) break;
      setSpeakingId(m.id);
      room.current?.send("tts", { dev: dev.current, on: true });
      recent.current.push({ text: m.tgt, at: Date.now() });
      await player.current?.play(m.id + m.tgt.length, m.tgt, m.tgtLang);
      room.current?.send("tts", { dev: dev.current, on: false });
      setSpeakingId(null);
    }
    ttsBusy.current = false;
  }, [pauseAll]);

  const speak = useCallback((m: Msg, force = false) => {
    if (!force && !wantsAudio(m)) return;
    if (force) { player.current?.stop(); ttsQueue.current = []; ttsBusy.current = false; }
    ttsQueue.current.push(m);
    void pumpTts();
  }, [wantsAudio, pumpTts]);

  // ---------- 안내 자료 추천 ----------
  const suggestCard = useCallback((koText: string) => {
    if (!authority || !koText) return;
    const t = koText.replace(/\s+/g, "");
    const hit = cards.find((c) => [c.title, ...(c.keywords ?? "").split(/[,\n]/)].map((k) => k.trim().replace(/\s+/g, "")).filter((k) => k.length >= 2).some((k) => t.includes(k)));
    if (hit && S.current.shown?.type !== "card") setSuggest(hit);
  }, [authority, cards]);

  // ---------- 통역 ----------
  const backTranslate = useCallback(async (m: Msg) => {
    try {
      const r = await fetch("/api/backtranslate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: m.tgt, from: m.tgtLang, original: m.src }) });
      if (!r.ok) return;
      const j = await r.json() as { text: string; ok: boolean; issue: string };
      if (!j.text) return;
      const up = { ...m, back: j.text, backOk: j.ok, backIssue: j.issue };
      upsertMsg(up);
      room.current?.send("msg", { msg: up });
    } catch {}
  }, [upsertMsg]);

  // 이미 채팅에 올라간 메시지(원문)를 통역한다. 여러 개가 동시에 돌아도 된다.
  const translateMsg = useCallback(async (m0: Msg) => {
    lastActivity.current = Date.now();
    const m: Msg = { ...m0, tgt: "", status: "translating" };
    const hist = S.current.msgs.filter((x) => x.status === "done" && x.id !== m.id && x.at < m.at).slice(-6).map((x) => ({ speaker: x.speaker, text: x.speaker === "staff" ? x.src : x.tgt }));
    upsertMsg(m);
    room.current?.send("msg", { msg: m });
    if (authority) void ensureSession();
    const consent = S.current.session.consent === true;
    let last = 0;
    try {
      const r = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: m.src, from: m.srcLang, to: m.tgtLang, speaker: m.speaker, kind: m.kind === "text" ? "text" : "speech", sessionId: consent ? S.current.session.id : null, history: hist }),
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
    if (m.status === "done") {
      recent.current.push({ text: m.tgt, at: Date.now() });
      speak(m);
      suggestCard(m.speaker === "staff" ? m.src : m.tgt);
      if (m.speaker === "staff") void backTranslate({ ...m });
    }
  }, [authority, ensureSession, speak, upsertMsg, suggestCard, backTranslate]);

  const makeMsg = (id: string, src: string, srcLang: Lang, kind: Msg["kind"], at: number, extra?: Partial<Msg>): Msg => ({
    id, speaker: srcLang === "ko" ? "staff" : "guest", kind, srcLang, src, tgtLang: srcLang === "ko" ? S.current.guestLang : "ko", tgt: "", status: "translating", at, ...extra,
  });

  // 글자 입력·자주 쓰는 문장 번역용
  const interpret = useCallback(async (text: string, srcLang: Lang, kind: "speech" | "text") => {
    await translateMsg(makeMsg(uid(), text, srcLang, kind, Date.now()));
  }, [translateMsg]);

  const removeMsg = useCallback((id: string) => {
    setMsgs((xs) => xs.filter((x) => x.id !== id));
    room.current?.send("msgdel", { id });
  }, []);

  // 스피커로 나온 통역이 마이크에 다시 들어온 부분을 걸러낸다 (문장 전체가 비슷하면 버리고, 통역문이 통째로 섞여 있으면 그 부분만 뺀다)
  const stripEcho = (text: string) => {
    const now = Date.now();
    recent.current = recent.current.filter((r) => now - r.at < 25_000);
    let t = text;
    for (const r of recent.current) {
      if (similar(r.text, t) > 0.55) return "";
      if (r.text.length >= 10) {
        const i = t.toLowerCase().indexOf(r.text.toLowerCase());
        if (i >= 0) t = (t.slice(0, i) + " " + t.slice(i + r.text.length)).trim();
      }
    }
    return t.replace(/\s+/g, " ").trim();
  };

  // 한 발화 안에 한국어와 외국어가 섞여 있으면 언어별로 나눈다 (MRI·CT 같은 짧은 영어 단어는 한국어 문장에 둔다)
  const splitByLang = (text: string): { lang: Lang; text: string }[] => {
    const toks = text.split(/\s+/).filter(Boolean);
    const runs: { side: "ko" | "fx"; words: string[] }[] = [];
    for (const w of toks) {
      const side: "ko" | "fx" | "n" = /[\uac00-\ud7a3]/.test(w) ? "ko" : /[\p{L}]/u.test(w) ? "fx" : "n";
      const last = runs[runs.length - 1];
      if (side === "n" || (last && last.side === side)) { if (last) last.words.push(w); else runs.push({ side: "fx", words: [w] }); }
      else runs.push({ side, words: [w] });
    }
    // 한국어 사이에 낀 짧은 라틴 문자(약어·외래어)는 한국어로 합친다
    const merged: typeof runs = [];
    runs.forEach((r, i) => {
      const latinShort = r.side === "fx" && r.words.length <= 2 && /^[\x00-\x7F\s]+$/.test(r.words.join(" ")) && (runs[i - 1]?.side === "ko" || runs[i + 1]?.side === "ko");
      const side = latinShort ? "ko" : r.side;
      const last = merged[merged.length - 1];
      if (last && last.side === side) last.words.push(...r.words); else merged.push({ side, words: [...r.words] });
    });
    return merged.map((r) => {
      const t = r.words.join(" ").trim();
      return { lang: (r.side === "ko" ? "ko" : detectLang(t, S.current.guestLang) ?? S.current.guestLang) as Lang, text: t };
    }).filter((p) => p.text.replace(/[\s.,!?。、，？！…'"·-]/g, "").length >= (p.lang === "ko" ? 1 : 2));
  };

  // 겹친 말 복원: 마이크 하나에서 실시간 받아쓰기가 놓친 상대 말이 있는지 화자 분리로 다시 확인한다
  const recover = useCallback(async (turn: FinalTurn, live: { ko?: { id: string; text: string }; fx?: { id: string; text: string } }) => {
    try {
      const fd = new FormData();
      fd.append("audio", toWav(turn.chunks), "turn.wav");
      const r = await fetch("/api/diarize", { method: "POST", body: fd });
      if (!r.ok) return;
      const { segments } = await r.json() as { segments: { speaker: string; text: string }[] };
      const sides: Record<"ko" | "fx", string[]> = { ko: [], fx: [] };
      for (const seg of segments) for (const p of splitByLang(seg.text)) sides[p.lang === "ko" ? "ko" : "fx"].push(p.text);
      const size = (t: string) => t.replace(/[\s.,!?。、，？！…'"·-]/g, "").length;
      const fix = (side: "ko" | "fx", offset: number) => {
        const text = stripEcho(sides[side].join(" ").trim());
        if (!text) return;
        const had = live[side];
        // 실시간 받아쓰기가 이 사람 말을 못 잡았거나, 조각만 잡았으면(복원본이 훨씬 길면) 복원본으로 채운다.
        // 두 사람 목소리가 함께 나온 발화(진짜 겹침)면 실시간 쪽이 섞여 틀리기 쉬우므로, 내용이 다를 때 복원본을 쓴다.
        const overlapped = sides.ko.length > 0 && sides.fx.length > 0;
        if (had && !(size(text) > size(had.text) * 1.5 + 6 || (overlapped && similar(text, had.text) < 0.8))) return;
        const lang: Lang = side === "ko" ? "ko" : (detectLang(text, S.current.guestLang) ?? S.current.guestLang);
        if (lang !== "ko" && isGuestLang(lang)) changeGuestLang(lang);
        const at = S.current.msgs.find((m) => m.id === had?.id)?.at ?? turn.started + offset;
        void translateMsg(makeMsg(had?.id ?? `r-${turn.id}-${side}`, text, lang, "speech", at, { recovered: true }));
      };
      if (sides.fx.length) fix("fx", 2);
      if (sides.ko.length) fix("ko", 1);
    } catch { /* 복원 실패는 조용히 넘긴다 */ }
  }, [translateMsg, changeGuestLang]);

  // 발화가 끝나면(커밋) 바로 채팅에 원문을 올린다. 통역은 확정본이 오면 뒤따른다.
  const onCommit = useCallback((tid: string, text: string, role: Role, key: string) => {
    const lk = `${key}:${tid}`;
    setLives((l) => { const c = { ...l }; delete c[lk]; return c; });
    room.current?.send("live", { dev: lk, text: "" });
    if (role !== "any" || !text.trim()) return; // 두 기기 모드는 확정본에서 언어를 보고 올린다
    const lang = detectLang(text, S.current.guestLang) ?? "ko";
    const m = makeMsg(`v-${lk}`, text, lang, "speech", Date.now(), { status: "hearing" });
    upsertMsg(m);
    room.current?.send("msg", { msg: m });
  }, [upsertMsg]);

  // 확정본: 메아리 제거 → 언어별 분리 → 각각 통역. 마이크 하나면 겹친 말 복원도 돌린다.
  const onFinal = useCallback((turn: FinalTurn, role: Role, key: string) => {
    const lk = `${key}:${turn.id}`;
    const mid = `v-${lk}`;
    setLives((l) => { const c = { ...l }; delete c[lk]; return c; });
    const clean = turn.text ? stripEcho(turn.text) : "";
    let parts = clean ? splitByLang(clean) : [];
    if (role === "staff") parts = parts.filter((p) => p.lang === "ko");
    if (role === "guest") parts = parts.filter((p) => p.lang !== "ko");
    const live: { ko?: { id: string; text: string }; fx?: { id: string; text: string } } = {};
    if (!parts.length) {
      if (S.current.msgs.some((m) => m.id === mid) || role === "any") removeMsg(mid);
    } else {
      parts.forEach((p, i) => {
        const id = i === 0 ? mid : `${mid}-${i}`;
        const side = p.lang === "ko" ? "ko" : "fx";
        if (!live[side]) live[side] = { id, text: p.text };
        if (p.lang !== "ko" && isGuestLang(p.lang)) changeGuestLang(p.lang);
        void translateMsg(makeMsg(id, p.text, p.lang, "speech", turn.started + i * 3));
      });
    }
    if (role === "any" && turn.voicedMs >= 800 && turn.chunks.length) void recover(turn, live);
  }, [changeGuestLang, translateMsg, removeMsg, recover]);

  const onPartial = useCallback((tid: string, text: string, role: Role, key: string) => {
    const lang = detectLang(text, S.current.guestLang);
    if (text && ((role === "staff" && lang && lang !== "ko") || (role === "guest" && lang === "ko"))) return;
    const lk = `${key}:${tid}`;
    const speaker: Side = role === "guest" ? "guest" : role === "staff" ? "staff" : lang && lang !== "ko" ? "guest" : "staff";
    const live: Live = { speaker, text, at: Date.now() };
    setLives((l) => ({ ...l, [lk]: live }));
    lastActivity.current = Date.now();
    if (Date.now() - (liveSent.current[lk] ?? 0) > 250 || !text) { liveSent.current[lk] = Date.now(); room.current?.send("live", { dev: lk, ...live }); }
  }, []);
  const onCommitRef = useRef(onCommit); onCommitRef.current = onCommit;
  const onPartialRef = useRef(onPartial); onPartialRef.current = onPartial;
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal;

  // ---------- 안내 자료 / 금액 띄우기 ----------
  const show = useCallback(async (s: Shown) => {
    setSuggest(null);
    setSheet(null);
    lastActivity.current = Date.now();
    let v = s;
    if (s?.type === "card") {
      try {
        const r = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: s.title, from: "ko", to: S.current.guestLang, speaker: "staff", kind: "text" }) });
        if (r.ok) v = { ...s, titleTr: (await r.text()).trim() };
      } catch {}
    }
    setShown(v); S.current.shown = v;
    room.current?.send("show", { shown: v });
  }, []);

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
        if ("shown" in p) setShown((p.shown as Shown) ?? null);
        if (Array.isArray(p.msgs) && !S.current.msgs.length) setMsgs(p.msgs as Msg[]);
        break;
      }
      case "msg": {
        const m = p.msg as Msg;
        if (!m?.id) break;
        const isNewDone = m.status === "done" && !S.current.msgs.some((x) => x.id === m.id && x.status === "done");
        upsertMsg(m);
        lastActivity.current = Date.now();
        if (authority) void ensureSession();
        if (isNewDone) {
          recent.current.push({ text: m.tgt, at: Date.now() });
          speak(m);
          suggestCard(m.speaker === "staff" ? m.src : m.tgt);
        }
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
      case "msgdel": if (typeof p.id === "string") setMsgs((xs) => xs.filter((x) => x.id !== p.id)); break;
      case "show": setShown((p.shown as Shown) ?? null); break;
      case "human": setHumanNotice(!!p.on); break;
      case "human-request": if (authority) setHumanAsked(true); break;
      case "lang": if (authority && isGuestLang(p.guestLang)) changeGuestLang(p.guestLang, true); break;
      case "consent": if (authority && typeof p.value === "boolean") void applyConsent(p.value); break;
      case "clear":
        if (!authority) { setMsgs([]); setLives({}); setShown(null); setHumanNotice(false); player.current?.stop(); ttsQueue.current = []; }
        break;
    }
  }, [authority, broadcastState, upsertMsg, speak, changeGuestLang, applyConsent, ensureSession, suggestCard]);
  const onRoomRef = useRef(onRoom);
  onRoomRef.current = onRoom;

  useEffect(() => {
    if (!roomCode || !boot.realtime.key) return;
    const r = new Room(boot.realtime.url, boot.realtime.key, roomCode, (e) => onRoomRef.current(e));
    r.onStatus = (ok) => { setRoomOk(ok); if (ok) r.send(authority ? "state" : "hello", authority ? { session: S.current.session, guestLang: S.current.guestLang, shown: S.current.shown } : { dev: dev.current }); };
    room.current = r;
    const ping = setInterval(() => r.send("ping", { dev: dev.current, mode }), 10_000);
    return () => { clearInterval(ping); r.close(); room.current = null; };
  }, [roomCode, boot.realtime, authority, mode]);

  // ---------- 마이크 구성 ----------
  // 데스크/손님 화면: 마이크 1개. 한 화면: 직원·손님 마이크를 따로 지정하면 2개, 아니면 1개가 두 언어를 다 듣는다.
  const buildEars = useCallback(async () => {
    for (const e of ears.current) { e.l.close(); e.mic.close(); }
    ears.current = [];
    const cfg = JSON.parse(store.get("mb.mics") ?? "{}") as { staff?: string; guest?: string; single?: string };
    const plan: { role: Role; deviceId?: string }[] =
      mode === "desk" ? [{ role: "staff", deviceId: cfg.single }]
      : mode === "guest" ? [{ role: "guest", deviceId: cfg.single }]
      : cfg.staff && cfg.guest && cfg.staff !== cfg.guest ? [{ role: "staff", deviceId: cfg.staff }, { role: "guest", deviceId: cfg.guest }]
      : [{ role: "any", deviceId: cfg.staff || cfg.single }];
    const errors: string[] = [];
    for (const [i, pl] of plan.entries()) {
      try {
        let mic = new MicEngine(pl.deviceId);
        try { await mic.init(); } catch { mic = new MicEngine(); await mic.init(); } // 저장된 마이크가 빠졌으면 기본 마이크
        const key = `${dev.current}-${i}`;
        const l = new Listener(mic, () => ({ guestLang: S.current.guestLang }));
        l.onState = () => refreshListen();
        l.onLevel = (v) => { levels.current[key] = v; setLevel(Math.max(...Object.values(levels.current))); };
        l.onPartial = (tid, t) => onPartialRef.current(tid, t, pl.role, key);
        l.onCommit = (tid, t) => onCommitRef.current(tid, t, pl.role, key);
        l.onFinal = (turn) => onFinalRef.current(turn, pl.role, key);
        l.setMuted(muted);
        ears.current.push({ role: pl.role, mic, l });
        void l.connect();
      } catch (err) { console.warn(err); errors.push(pl.role); }
    }
    setEarCount(ears.current.length);
    if (!player.current) player.current = new PcmPlayer(() => ears.current[0]?.mic.ctx ?? null);
    if (!ears.current.length) setMicError(mode === "guest" ? G.micDenied : "마이크를 쓸 수 없습니다. 브라우저 주소창의 마이크 권한을 허용해 주세요.");
    else setMicError(errors.length ? "마이크 하나를 열지 못했습니다. 메뉴 → 마이크 설정을 확인하세요." : null);
    refreshListen();
  }, [mode, muted, G.micDenied, refreshListen]);

  // ---------- 시작 (사용자 터치 필요: 마이크·소리 허용) ----------
  const start = useCallback(async () => {
    setStarted(true);
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } };
      void nav.wakeLock?.request("screen").catch(() => {});
    } catch {}
    await buildEars();
  }, [buildEars]);

  useEffect(() => {
    const v = () => { if (document.visibilityState === "visible" && started) { const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } }; void nav.wakeLock?.request("screen").catch(() => {}); } };
    document.addEventListener("visibilitychange", v);
    return () => { document.removeEventListener("visibilitychange", v); };
  }, [started]);
  useEffect(() => () => { for (const e of ears.current) { e.l.close(); e.mic.close(); } }, []);
  useEffect(() => { for (const e of ears.current) e.l.setMuted(muted); }, [muted]);

  // ---------- 새 손님 (자동 초기화) ----------
  const newGuest = useCallback(() => {
    if (!authority) return;
    const old = S.current.session;
    if (sessionCreated.current === old.id) void fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: old.id, end: true }) });
    const s: Sess = { id: uid(), consent: null };
    setSession(s); S.current.session = s;
    setMsgs([]); S.current.msgs = [];
    setLives({}); setShown(null); S.current.shown = null; setSuggest(null); setHumanAsked(false); setHumanNotice(false); setRiskDismissed(null);
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
    suggestCard(p.ko);
    void ensureSession();
    const s = S.current.session;
    if (s.consent) void fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, speaker: "staff", kind: "phrase", srcLang: "ko", srcText: p.ko, tgtLang: m.tgtLang, tgtText: t }) });
  }, [interpret, upsertMsg, speak, ensureSession, suggestCard]);

  const callHuman = useCallback((on: boolean) => {
    setHumanNotice(on);
    room.current?.send("human", { on });
    if (on) setHumanAsked(false);
  }, []);

  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, lives]);

  // ================= 화면 =================
  const peerOnline = now - peerAt < 25_000;
  const liveList = Object.entries(lives).filter(([, l]) => l.text && now - l.at < 15_000);
  const lastTheirs = [...msgs].reverse().find((m) => m.status === "done" && (mode === "desk" ? m.tgtLang === "ko" : mode === "guest" ? m.tgtLang !== "ko" : true));
  const showConsent = mode !== "desk" && session.consent === null && msgs.some((m) => m.status === "done");
  const riskyMsg = !guestView ? [...msgs].reverse().slice(0, 4).find((m) => m.status === "done" && isRisky(m.speaker === "staff" ? m.src : m.tgt)) : undefined;
  const showRisk = !!riskyMsg && riskyMsg.id !== riskDismissed && !humanNotice;

  if (!started) {
    return (
      <div className={`launch ${mode}`}>
        <header className="launch-top">
          <Brand />
          {!guestView && <span className="launch-hosp">{settings.hospital_name}</span>}
        </header>
        {guestView ? (
          <button className="launch-main as-btn" onClick={start}>
            <GuestWelcome level={0} />
            <span className="launch-cta"><Icon n="play" size={20} /> {GUEST_LANGS.map((l) => GUEST_UI[l].tapToStart).slice(0, 2).join(" · ")}</span>
          </button>
        ) : (
          <main className="launch-main">
            <p className="launch-eyebrow">{mode === "solo" ? "한 화면 통역" : `데스크 ${deskNumber(roomCode)} · 직원 화면`}</p>
            <h1>말하면,<br /><em>바로 통역</em>됩니다</h1>
            <p className="launch-sub">한국어 ↔ 10개 언어 · 손님 언어 자동 인식 · 버튼 없이 계속 듣습니다</p>
            <button className="launch-cta" onClick={start}><Icon n="mic" size={22} /> 통역 시작</button>
            <div className="launch-langs">{GUEST_LANGS.map((l) => <span key={l} lang={LANG_META[l].html}>{LANG_META[l].flag} {LANG_META[l].native}</span>)}</div>
          </main>
        )}
        <footer className="launch-foot">
          <button onClick={onExit}><Icon n="screen" size={16} /> 화면 모드 바꾸기</button>
          {!guestView && <a href="/admin"><Icon n="gear" size={16} /> 관리자</a>}
        </footer>
      </div>
    );
  }

  // 지금 크게 보여줄 것: 말하는 중인 자막이 있으면 그것, 없으면 마지막 메시지
  const liveNow = liveList.sort((a, b) => b[1].at - a[1].at)[0]?.[1];
  const lastMsg = msgs[msgs.length - 1];
  const current: Current = liveNow ? { kind: "live", speaker: liveNow.speaker, text: liveNow.text } : lastMsg ? { kind: "msg", m: lastMsg } : null;
  const history = current?.kind === "msg" ? msgs.slice(0, -1) : msgs;
  const empty = !current;

  return (
    <div className={`conv ${mode}`} lang={guestView ? LANG_META[guestLang].html : "ko"}>
      <header className="topbar">
        <div className="bar-left">
          {guestView ? (
            <button className="lang-chip" onClick={() => setSheet("lang")}><span className="flag">{LANG_META[guestLang].flag}</span>{LANG_META[guestLang].native}<Icon n="chev" /></button>
          ) : (
            <>
              <Brand compact />
              <span className="bar-div" />
              <b className="bar-title">{settings.hospital_name}</b>
              <button className="lang-chip" onClick={() => setSheet("lang")} title="손님 언어 (말하면 자동으로 바뀜)"><span className="muted-sm">손님</span><span className="flag">{LANG_META[guestLang].flag}</span>{LANG_META[guestLang].korean}<Icon n="chev" /></button>
            </>
          )}
        </div>
        <ListenPill state={listen} level={level} speaking={!!speakingId} guest={guestView ? G : null} ears={earCount} />
        <div className="bar-right">
          {mode === "desk" && (
            <button className={`status-chip ${peerOnline ? "ok" : "warn"}`} onClick={() => setSheet("connect")}>
              <i />{peerOnline ? "손님 화면 연결됨" : roomOk ? "손님 화면 연결하기" : "연결 중…"}
            </button>
          )}
          {!guestView && <span className={`status-chip ${session.consent ? "ok" : ""}`}><i />{session.consent ? "기록 저장 중" : session.consent === false ? "기록 안 함" : "기록 동의 전"}</span>}
          {guestView && session.consent === true && <span className="status-chip ok"><i />{G.saving}</span>}
          <button className={`round-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)} aria-label="마이크 켜기/끄기"><Icon n={muted ? "micOff" : "mic"} /></button>
          <button className={`round-btn ${soundOn ? "" : "off"}`} onClick={() => { setSoundOn((v) => !v); player.current?.stop(); }} aria-label="소리 켜기/끄기"><Icon n={soundOn ? "sound" : "soundOff"} /></button>
          <button className="round-btn" onClick={() => setSheet("menu")} aria-label="메뉴"><Icon n="menu" /></button>
        </div>
      </header>

      <main className={`stage ${empty ? "empty" : ""}`}>
        <section className="history" ref={feed} aria-label={guestView ? "History" : "대화 기록"}>
          {history.map((m) => <HistoryRow key={m.id} m={m} mode={mode} G={G} speaking={speakingId === m.id} onReplay={() => speak(m, true)} />)}
        </section>
        <section className="now">
          {shown && <ShowPanel shown={shown} guestLang={guestLang} guestView={guestView} G={G} onClose={authority ? () => void show(null) : undefined} />}
          {empty ? (
            guestView ? <GuestWelcome level={level} /> : (
              <div className="empty-desk">
                <Orb level={level} state={listen} />
                <h2>말씀하시면 바로 통역됩니다</h2>
                <p>한국어로 말하면 손님 언어로, 손님이 말하면 한국어로. 손님 언어(10개)는 자동으로 알아냅니다.</p>
                {mode === "desk" && !peerOnline && <button className="btn ghost" onClick={() => setSheet("connect")}><Icon n="qr" /> 손님 화면 연결하기</button>}
              </div>
            )
          ) : (
            <NowCaption current={current!} mode={mode} G={G} speaking={current?.kind === "msg" && speakingId === current.m.id} onReplay={() => current?.kind === "msg" && speak(current.m, true)} />
          )}
        </section>
      </main>

      {micError && <div className="notice warn">{micError}</div>}
      {!guestView && humanAsked && (
        <div className="alert-bar urgent"><Icon n="person" /><span>손님이 <b>사람 통역</b>을 요청했습니다.</span><button className="btn primary sm" onClick={() => setSheet("human")}>통역 연결하기</button><button className="btn ghost sm" onClick={() => setHumanAsked(false)}>닫기</button></div>
      )}
      {showRisk && (
        <div className="alert-bar"><Icon n="alert" /><span>진료·약·검사 같은 <b>의료 내용</b>이 나왔어요. 정확한 설명이 필요하면 사람 통역을 연결하세요.</span><button className="btn primary sm" onClick={() => setSheet("human")}>사람 통역</button><button className="btn ghost sm" onClick={() => setRiskDismissed(riskyMsg!.id)}>괜찮아요</button></div>
      )}
      {!guestView && suggest && (
        <div className="alert-bar soft"><Icon n="image" /><span>안내 자료 <b>‘{suggest.title}’</b>를 {mode === "solo" ? "화면에" : "손님 화면에"} 띄울까요?</span><button className="btn primary sm" onClick={() => void show({ type: "card", id: suggest.id, title: suggest.title })}>띄우기</button><button className="btn ghost sm" onClick={() => setSuggest(null)}>아니요</button></div>
      )}
      {showConsent && (
        <div className="consent-bar" lang={LANG_META[guestLang].html} dir={LANG_META[guestLang].rtl ? "rtl" : undefined}>
          <Icon n="lock" />
          <p>{G.saveAsk(settings.retention_days)}</p>
          <div className="consent-btns">
            <button className="btn primary" onClick={() => applyConsent(true)}>{G.saveYes}</button>
            <button className="btn ghost" onClick={() => applyConsent(false)}>{G.saveNo}</button>
          </div>
        </div>
      )}

      <footer className="dock">
        {guestView ? (
          <>
            <p className="disclaimer">{G.disclaimer}</p>
            {lastTheirs && <DockBtn icon="replay" label={G.replay} onClick={() => speak(lastTheirs, true)} />}
            <DockBtn icon="person" label={humanAsked ? `✓ ${G.humanAsked}` : G.humanBtn} tone="rose" onClick={() => { room.current?.send("human-request", {}); setHumanAsked(true); setTimeout(() => setHumanAsked(false), 6000); }} />
          </>
        ) : (
          <>
            <DockBtn icon="list" label="자주 쓰는 문장" onClick={() => setSheet("phrases")} />
            <DockBtn icon="keyboard" label="글자 입력" onClick={() => setSheet("keyboard")} />
            <DockBtn icon="image" label="안내 자료·금액" onClick={() => setSheet("cards")} />
            <DockBtn icon="note" label="요약" onClick={() => setSheet("summary")} disabled={!msgs.some((m) => m.status === "done")} />
            <span className="dock-sep" />
            <DockBtn icon="person" label="사람 통역" tone="rose" onClick={() => setSheet("human")} />
            <span className="grow" />
            <DockBtn icon="refresh" label="새 손님" onClick={newGuest} />
          </>
        )}
      </footer>

      {humanNotice && mode !== "desk" && (
        <div className="overlay" dir={LANG_META[guestLang].rtl ? "rtl" : undefined}>
          <div className="overlay-card">
            <div className="big-icon">🧑‍💼</div>
            <h2>{G.humanTitle}</h2>
            <p>{G.humanBody}</p>
            {mode === "solo" && <p className="muted">사람 통역 연결 중 안내를 띄웠습니다.</p>}
            <button className="btn ghost" onClick={() => callHuman(false)}>{G.close}</button>
          </div>
        </div>
      )}

      {sheet === "connect" && roomCode && <ConnectSheet room={roomCode} online={peerOnline} onClose={() => setSheet(null)} />}
      {sheet === "phrases" && <PhraseSheet phrases={boot.phrases} lang={guestLang} onPick={sendPhrase} onClose={() => setSheet(null)} />}
      {sheet === "keyboard" && <KeyboardSheet lang={guestLang} onSend={(t) => { setSheet(null); void interpret(t, "ko", "text"); }} onClose={() => setSheet(null)} />}
      {sheet === "human" && <HumanSheet services={settings.interpreter_services} noticeOn={humanNotice} onNotice={callHuman} onClose={() => setSheet(null)} />}
      {sheet === "cards" && <CardsSheet cards={cards} onShow={(s) => void show(s)} onClose={() => setSheet(null)} shown={shown} onHide={() => void show(null)} />}
      {sheet === "summary" && <SummarySheet msgs={msgs} guestLang={guestLang} sessionId={session.id} consent={session.consent === true} onClose={() => setSheet(null)} />}
      {sheet === "mics" && <MicSheet mode={mode} onApply={() => { setSheet(null); void buildEars(); }} onClose={() => setSheet(null)} />}
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
        <Sheet title={guestView ? "Menu" : "메뉴"} onClose={() => setSheet(null)}>
          <div className="menu-list">
            {mode === "desk" && <button className="menu-item" onClick={() => setSheet("connect")}>손님 화면 연결 (QR·코드)</button>}
            <button className="menu-item" onClick={() => setSheet("mics")}>🎙 마이크 설정{mode === "solo" ? " (직원·손님 마이크 따로 쓰기)" : ""}</button>
            <button className="menu-item" onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); setSheet(null); }}>전체화면 켜기/끄기</button>
            {!guestView && <a className="menu-item" href="/admin">관리자 화면 (용어집·안내 자료·기록·설정)</a>}
            <button className="menu-item" onClick={() => { for (const e of ears.current) { e.l.close(); e.mic.close(); } onExit(); }}>화면 모드 바꾸기</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------------- 하위 컴포넌트 ----------------

function ListenPill({ state, level, speaking, guest, ears }: { state: ListenState; level: number; speaking: boolean; guest: (typeof GUEST_UI)[GuestLang] | null; ears: number }) {
  const label = speaking ? (guest ? guest.speaking : "통역 음성 재생 중")
    : state === "off" ? (guest ? guest.paused : "마이크 꺼짐")
    : state === "paused" ? (guest ? guest.paused : "잠시 멈춤")
    : state === "speech" ? (guest ? guest.listening : "받아쓰는 중")
    : state === "finalizing" ? (guest ? guest.listening : "정리 중")
    : guest ? guest.listening : `듣는 중 · 그냥 말하세요${ears > 1 ? ` (마이크 ${ears}개)` : ""}`;
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

const ICONS: Record<string, string> = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  micOff: "M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11.6 5.3M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18",
  sound: "M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  soundOff: "M4 9v6h4l5 4V5L8 9H4zM17 9l5 5M22 9l-5 5",
  menu: "M5 12h.01M12 12h.01M19 12h.01",
  chev: "M6 9l6 6 6-6",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01",
  note: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  replay: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  play: "M8 5v14l11-7z",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  desk: "M3 17h18M5 17V7h14v10M8 21h8M12 17v4",
  tablet: "M7 3h10v18H7zM11 18h2",
  screen: "M3 4h18v12H3zM8 20h8M12 16v4",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "compact" : ""}`}>
      <img src="/brand.svg" alt="" width={compact ? 28 : 34} height={compact ? 28 : 34} />
      <b>MediBridge</b>
    </span>
  );
}
function Icon({ n, size = 20 }: { n: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={n === "play" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={n === "menu" ? 3.2 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[n] ?? ""} />
    </svg>
  );
}

function DockBtn({ icon, label, onClick, disabled, tone }: { icon: string; label: string; onClick: () => void; disabled?: boolean; tone?: "rose" }) {
  return (
    <button className={`dock-btn ${tone ?? ""}`} onClick={onClick} disabled={disabled}>
      <span className="dock-ico"><Icon n={icon} size={22} /></span>
      <span className="dock-label">{label}</span>
    </button>
  );
}

// 말소리에 반응하는 원 (마이크가 듣고 있다는 신호)
function Orb({ level, state }: { level: number; state: ListenState }) {
  const s = 1 + Math.min(0.6, level * 7);
  return (
    <div className={`orb ${state}`} aria-hidden>
      <span className="orb-ring" style={{ transform: `scale(${s})` }} />
      <span className="orb-ring r2" style={{ transform: `scale(${1 + (s - 1) * 1.8})` }} />
      <span className="orb-core"><Icon n="mic" size={34} /></span>
    </div>
  );
}

// 손님 화면 첫 화면: 10개 언어 인사를 하나씩 크게 돌려 보여준다
function GuestWelcome({ level }: { level: number }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % GUEST_LANGS.length), 2600); return () => clearInterval(t); }, []);
  const l = GUEST_LANGS[i];
  return (
    <div className="guest-welcome">
      <Orb level={level} state="idle" />
      <div key={l} className="gw-text" lang={LANG_META[l].html} dir={LANG_META[l].rtl ? "rtl" : undefined}>
        <h1>{GUEST_UI[l].welcome}</h1>
        <p>{GUEST_UI[l].justSpeak}</p>
      </div>
      <div className="gw-flags">{GUEST_LANGS.map((x, k) => <span key={x} className={k === i ? "on" : ""} title={LANG_META[x].native}>{LANG_META[x].flag}</span>)}</div>
    </div>
  );
}

const whoLabel = (speaker: Side, guestView: boolean, G: (typeof GUEST_UI)[GuestLang]) => speaker === "staff" ? (guestView ? G.staff : "직원") : guestView ? G.guest : "손님";
// 보는 사람 기준 "큰 줄"(내 언어)과 "작은 줄"(상대 언어)
function viewLines(m: Msg, mode: Mode) {
  const a = { lang: m.srcLang, text: m.src }, b = { lang: m.tgtLang, text: m.tgt };
  if (mode === "solo") return m.srcLang === "ko" ? [a, b] : [b, a]; // 한 화면: 한국어 줄이 항상 위
  const mineIsKo = mode === "desk";
  const primary = (mineIsKo ? m.srcLang === "ko" : m.srcLang !== "ko") ? a : b;
  return [primary, primary === a ? b : a];
}

// 지금 하는 말을 자막처럼 크게
function NowCaption({ current, mode, G, speaking, onReplay }: { current: NonNullable<Current>; mode: Mode; G: (typeof GUEST_UI)[GuestLang]; speaking: boolean; onReplay: () => void }) {
  const guestView = mode === "guest";
  const dots = <span className="dots"><i /><i /><i /></span>;
  if (current.kind === "live") {
    return (
      <div className={`caption ${current.speaker} live`}>
        <span className="cap-who"><i className="rec" />{whoLabel(current.speaker, guestView, G)}</span>
        <p className="cap-main">{current.text}<span className="caret" /></p>
        <p className="cap-sub">{dots}</p>
      </div>
    );
  }
  const m = current.m;
  const [p, q] = viewLines(m, mode);
  const backOff = !!m.back && m.backOk === false;
  return (
    <div className={`caption ${m.speaker} ${speaking ? "speaking" : ""}`}>
      <span className="cap-who">{whoLabel(m.speaker, guestView, G)}<em>{LANG_META[m.srcLang].flag} → {LANG_META[m.tgtLang].flag}</em>{m.recovered && !guestView && <em>· 겹친 말 복원</em>}{m.status === "hearing" && <em>· {guestView ? "…" : "받아쓰는 중"}</em>}</span>
      <p className="cap-main" lang={LANG_META[p.lang].html} dir={LANG_META[p.lang].rtl ? "rtl" : undefined}>{p.text || dots}</p>
      <p className={`cap-sub ${mode === "solo" ? "solo" : ""}`} lang={LANG_META[q.lang].html} dir={LANG_META[q.lang].rtl ? "rtl" : undefined}>{q.text || (m.status === "error" ? "" : dots)}</p>
      {!guestView && m.back && <p className={`cap-back ${backOff ? "off" : ""}`}><b>{backOff ? "⚠ 뜻 확인" : "역번역 ✓"}</b> {m.back}{backOff && m.backIssue ? ` — ${m.backIssue}` : ""}</p>}
      {m.status === "error" && <p className="err">⚠︎ {guestView ? G.failed : "통역 실패 — 다시 말씀해 주세요"}</p>}
      {m.status === "done" && <button className="cap-replay" onClick={onReplay} aria-label={guestView ? G.replay : "다시 듣기"}><Icon n={speaking ? "sound" : "play"} size={22} /></button>}
    </div>
  );
}

// 지난 대화 (작게)
function HistoryRow({ m, mode, G, speaking, onReplay }: { m: Msg; mode: Mode; G: (typeof GUEST_UI)[GuestLang]; speaking: boolean; onReplay: () => void }) {
  const guestView = mode === "guest";
  const [p, q] = viewLines(m, mode);
  const backOff = !!m.back && m.backOk === false;
  return (
    <div className={`hrow ${m.speaker} ${speaking ? "speaking" : ""}`}>
      <span className="h-ava">{m.speaker === "staff" ? (guestView ? "S" : "직원") : LANG_META[m.srcLang].flag}</span>
      <div className="h-body">
        <p className="h-main" lang={LANG_META[p.lang].html} dir={LANG_META[p.lang].rtl ? "rtl" : undefined}>{p.text}</p>
        <p className="h-sub" lang={LANG_META[q.lang].html} dir={LANG_META[q.lang].rtl ? "rtl" : undefined}>{q.text}</p>
        {!guestView && backOff && <p className="h-warn">⚠ 뜻 확인 — {m.backIssue || m.back}</p>}
        {m.recovered && !guestView && <p className="h-tag">겹친 말 복원</p>}
        {m.status === "error" && <p className="err">⚠︎ {guestView ? G.failed : "통역 실패"}</p>}
      </div>
      {m.status === "done" && <button className="h-replay" onClick={onReplay} aria-label={guestView ? G.replay : "다시 듣기"}><Icon n={speaking ? "sound" : "play"} size={16} /></button>}
    </div>
  );
}

function ShowPanel({ shown, guestLang, guestView, G, onClose }: { shown: NonNullable<Shown>; guestLang: GuestLang; guestView: boolean; G: (typeof GUEST_UI)[GuestLang]; onClose?: () => void }) {
  return (
    <div className="show-panel">
      {shown.type === "card" ? (
        <>
          <img src={`/api/cards/image?id=${shown.id}`} alt={shown.title} />
          <div className="show-cap">
            <b lang="ko">{shown.title}</b>
            {shown.titleTr && <span lang={LANG_META[guestLang].html}>{LANG_META[guestLang].flag} {shown.titleTr}</span>}
          </div>
        </>
      ) : (
        <div className="amount">
          <span className="amount-label">{guestView ? G.amountLabel : `수납 금액 · ${G.amountLabel}`}</span>
          <span className="amount-value">₩{shown.value.toLocaleString("ko-KR")}</span>
        </div>
      )}
      {onClose && <button className="icon-btn show-close" onClick={onClose} aria-label="닫기">✕</button>}
    </div>
  );
}

function HumanSheet({ services, noticeOn, onNotice, onClose }: { services: Settings["interpreter_services"]; noticeOn: boolean; onNotice: (on: boolean) => void; onClose: () => void }) {
  return (
    <Sheet title="사람 통역 연결" onClose={onClose}>
      <p className="muted">진단·치료 설명, 동의서, 약 복용처럼 중요한 내용은 사람 통역사에게 맡기세요. 번호는 관리자 화면 → 설정에서 바꿀 수 있습니다.</p>
      <div className="svc-list">
        {services.map((s, i) => (
          <div key={i} className="svc">
            <div><b>{s.name}</b>{s.note && <p className="muted small">{s.note}</p>}</div>
            <div className="svc-actions">
              {s.phone && <a className="btn primary" href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>📞 {s.phone}</a>}
              {s.url && <a className="btn ghost" href={s.url} target="_blank" rel="noreferrer">열기</a>}
            </div>
          </div>
        ))}
        {!services.length && <p className="muted">등록된 통역 서비스가 없습니다. 관리자 화면 → 설정에서 추가하세요.</p>}
      </div>
      <div className="sheet-actions">
        <button className={`btn ${noticeOn ? "ghost" : "primary"}`} onClick={() => { onNotice(!noticeOn); onClose(); }}>
          {noticeOn ? "손님 화면 안내 내리기" : "손님 화면에 ‘통역사 연결 중’ 안내 띄우기"}
        </button>
      </div>
    </Sheet>
  );
}

function CardsSheet({ cards, shown, onShow, onHide, onClose }: { cards: Card[]; shown: Shown; onShow: (s: Shown) => void; onHide: () => void; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const n = Number(amount.replace(/[^\d]/g, ""));
  return (
    <Sheet title="손님 화면에 띄우기" onClose={onClose}>
      <div className="amount-row">
        <span className="amount-prefix">₩</span>
        <input className="input" inputMode="numeric" placeholder="수납 금액 (예: 35000)" value={amount ? Number(amount.replace(/[^\d]/g, "") || 0).toLocaleString("ko-KR") : ""} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn primary" disabled={!n} onClick={() => onShow({ type: "amount", value: n })}>금액 띄우기</button>
      </div>
      <div className="card-grid">
        {cards.map((c) => (
          <button key={c.id} className="card-thumb" onClick={() => onShow({ type: "card", id: c.id, title: c.title })}>
            <img src={`/api/cards/image?id=${c.id}`} alt="" loading="lazy" />
            <span>{c.title}</span>
          </button>
        ))}
        {!cards.length && <p className="muted">등록된 안내 자료가 없습니다. 관리자 화면 → 안내 자료에서 층별 안내도·주차 안내 같은 그림을 올리세요.</p>}
      </div>
      {shown && <div className="sheet-actions"><button className="btn ghost" onClick={onHide}>띄운 것 내리기</button></div>}
    </Sheet>
  );
}

function SummarySheet({ msgs, guestLang, sessionId, consent, onClose }: { msgs: Msg[]; guestLang: GuestLang; sessionId: string; consent: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const lines = msgs.filter((m) => m.status === "done").map((m) => ({ speaker: m.speaker, ko: m.srcLang === "ko" ? m.src : m.tgt }));
    fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: consent ? sessionId : null, guestLang, lines }) })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setText(j.summary); })
      .catch((e) => setErr(String(e.message ?? e)));
  }, [msgs, guestLang, sessionId, consent]);
  return (
    <Sheet title="대화 요약 (진료실·간호사 전달용)" onClose={onClose}>
      {!text && !err && <p className="muted"><span className="dots"><i /><i /><i /></span> 요약하는 중…</p>}
      {err && <p className="warn">{err}</p>}
      {text && <pre className="summary">{text}</pre>}
      <div className="sheet-actions">
        {text && <span className="muted small">{consent ? "● 대화 기록에도 저장했습니다." : "기록 미동의 대화라 저장하지 않았습니다."}</span>}
        <button className="btn primary" disabled={!text} onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true)); }}>{copied ? "복사됨 ✓" : "복사하기"}</button>
      </div>
    </Sheet>
  );
}

function MicSheet({ mode, onApply, onClose }: { mode: Mode; onApply: () => void; onClose: () => void }) {
  const [mics, setMics] = useState<{ id: string; label: string }[]>([]);
  const [cfg, setCfg] = useState<{ staff?: string; guest?: string; single?: string }>(() => JSON.parse(store.get("mb.mics") ?? "{}"));
  useEffect(() => { void listMics().then(setMics).catch(() => {}); }, []);
  const save = () => { store.set("mb.mics", JSON.stringify(cfg)); onApply(); };
  const select = (k: "staff" | "guest" | "single", label: string, allowNone?: string) => (
    <label className="mic-row">
      <span>{label}</span>
      <select className="input" value={cfg[k] ?? ""} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value || undefined })}>
        <option value="">{allowNone ?? "기본 마이크"}</option>
        {mics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </label>
  );
  return (
    <Sheet title="마이크 설정" onClose={onClose}>
      {mode === "solo" ? (
        <>
          <p className="muted">PC 한 대에 마이크를 두 개(직원용·손님용) 꽂으면 각각 지정하세요. 두 사람이 동시에 말해도 따로 받아씁니다. 손님 마이크를 비우면 마이크 하나가 두 언어를 다 듣습니다.</p>
          {select("staff", "직원 마이크 (한국어)")}
          {select("guest", "손님 마이크 (외국어)", "따로 안 씀 — 직원 마이크 하나로")}
          <p className="muted small">권장: 사람마다 앞쪽 소리만 잡는 단일지향(거위목·탁상) 마이크. 상대 목소리가 덜 섞입니다.</p>
        </>
      ) : (
        <>
          <p className="muted">이 기기에 연결된 마이크 중 하나를 고르세요. USB·블루투스 마이크를 꽂으면 목록에 나옵니다.</p>
          {select("single", mode === "desk" ? "직원 마이크" : "손님 마이크")}
        </>
      )}
      {!mics.length && <p className="warn sm">마이크 목록을 읽지 못했습니다. 브라우저의 마이크 권한을 확인하세요.</p>}
      <div className="sheet-actions"><button className="btn primary" onClick={save}>적용</button></div>
    </Sheet>
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

function ConnectSheet({ room, online, onClose }: { room: string; online: boolean; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const url = typeof location !== "undefined" ? `${location.origin}/?mode=guest&room=${room}` : "";
  useEffect(() => { void QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#0f1f24", light: "#ffffff" } }).then(setQr); }, [url]);
  return (
    <Sheet title="손님 화면 연결" onClose={onClose}>
      <div className="connect">
        {qr && <img src={qr} alt="손님 화면 연결 QR" width={220} height={220} />}
        <div className="connect-info">
          <p className="code-big">데스크 {deskNumber(room)}</p>
          <p>손님 쪽 기기에서 이 주소를 열고 <b>손님 화면 → 데스크 {deskNumber(room)}</b> 을 누르면 바로 연결됩니다. 코드 입력은 필요 없고, QR을 찍어도 됩니다.</p>
          <p className="muted small">{online ? "● 손님 화면이 연결되어 있습니다." : "아직 연결된 손님 화면이 없습니다."}</p>
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
