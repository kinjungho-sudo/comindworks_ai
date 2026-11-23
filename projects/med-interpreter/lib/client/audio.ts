"use client";
// 브라우저 오디오: 마이크(24kHz PCM) → 계속 듣기 + 말 감지 → 실시간 받아쓰기, 그리고 PCM 스트리밍 재생.

const RATE = 24000;

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / ${RATE};
    this.t = 0; this.prev = 0;
    this.buf = new Int16Array(2400); this.n = 0;
  }
  push(v) {
    const s = Math.max(-1, Math.min(1, v));
    this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    if (this.n === this.buf.length) {
      this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
      this.buf = new Int16Array(2400); this.n = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.ratio === 1) { for (let i = 0; i < ch.length; i++) this.push(ch[i]); return true; }
    const len = ch.length;
    while (this.t < len) {
      const i0 = Math.floor(this.t), f = this.t - i0;
      const a = i0 < 0 ? this.prev : ch[i0];
      const b = i0 + 1 < len ? ch[i0 + 1] : ch[len - 1];
      this.push(a + (b - a) * f);
      this.t += this.ratio;
    }
    this.t -= len; this.prev = ch[len - 1];
    return true;
  }
}
registerProcessor('capture', Capture);
`;

async function addWorklet(ctx: AudioContext) {
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
}

// 연결된 마이크 목록 (권한을 한 번 받은 뒤에야 이름이 보인다)
export async function listMics(): Promise<{ id: string; label: string }[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput" && d.deviceId && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `마이크 ${i + 1}` }));
}

export class MicEngine {
  ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  onChunk: ((pcm: Int16Array) => void) | null = null;
  constructor(private deviceId?: string) {}

  // 반드시 사용자 터치 안에서 호출 (iOS 오디오 정책)
  async init(): Promise<void> {
    if (this.node) { await this.ctx?.resume(); return; }
    let ctx: AudioContext;
    try { ctx = new AudioContext({ sampleRate: RATE }); } catch { ctx = new AudioContext(); }
    await ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, ...(this.deviceId ? { deviceId: { exact: this.deviceId } } : {}) },
    });
    await addWorklet(ctx);
    let src: MediaStreamAudioSourceNode;
    try { src = ctx.createMediaStreamSource(this.stream); }
    catch {
      // 마이크와 다른 샘플레이트 컨텍스트를 거부하는 브라우저 → 기본값으로 다시
      await ctx.close();
      ctx = new AudioContext();
      await ctx.resume();
      await addWorklet(ctx);
      src = ctx.createMediaStreamSource(this.stream);
    }
    this.ctx = ctx;
    const node = new AudioWorkletNode(ctx, "capture");
    node.port.onmessage = (e) => this.onChunk?.(new Int16Array(e.data));
    src.connect(node);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute).connect(ctx.destination);
    this.node = node;
  }

  close() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node?.disconnect();
    void this.ctx?.close().catch(() => {});
    this.node = null; this.stream = null; this.ctx = null;
  }
}

function b64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function rmsOf(pcm: Int16Array) {
  let s = 0;
  for (let i = 0; i < pcm.length; i++) { const v = pcm[i] / 32768; s += v * v; }
  return Math.sqrt(s / pcm.length);
}

export type ListenState = "idle" | "speech" | "finalizing" | "paused" | "off";

// 한 번의 발화(문장 묶음). 커밋 뒤에도 기다리지 않고 다음 발화를 바로 받는다.
type Turn = { id: string; itemId?: string; text: string; chunks: Int16Array[]; voicedMs: number; started: number; committed: boolean; done: boolean; timer?: ReturnType<typeof setTimeout> };

export type FinalTurn = { id: string; text: string; chunks: Int16Array[]; voicedMs: number; started: number };

// 계속 듣는다. 절대 멈추지 않는다(음소거만 예외).
// 말이 시작되면 OpenAI 실시간 받아쓰기로 보내고(글자가 바로 들어옴), 조용해지면 그 발화를 커밋하고 곧바로 다음 발화를 받는다.
// 발화마다 녹음 조각을 보관해 두었다가, 필요하면 화자 분리(겹친 말 복원)에 쓴다.
export class Listener {
  private ws: WebSocket | null = null;
  private opening: Promise<boolean> | null = null;
  private outbox: string[] = [];
  private pre: Int16Array[] = [];
  private speaking = false;
  private noise = 0.008;
  private voiceRun = 0;
  private lastVoice = 0;
  private quietSince = 0;
  private turns: Turn[] = [];
  private cur: Turn | null = null;
  private muted = false;
  private seq = 0;
  onStart: ((id: string, at: number) => void) | null = null;
  onPartial: ((id: string, text: string) => void) | null = null;
  onCommit: ((id: string, text: string) => void) | null = null;
  onFinal: ((t: FinalTurn) => void) | null = null;
  onLevel: ((rms: number) => void) | null = null;
  onState: ((s: ListenState) => void) | null = null;

  constructor(private mic: MicEngine, private tokenBody: () => Record<string, string | undefined>) {
    mic.onChunk = (pcm) => this.chunk(pcm);
  }

  // (예전 호환) 일시정지는 더 이상 쓰지 않는다 — 통역 음성 중에도 계속 듣는다.
  pause(_reason: string, _on: boolean) {}
  setMuted(m: boolean) { this.muted = m; if (m && this.speaking) this.finish(); this.emit(); }
  get current(): ListenState { return this.muted ? "off" : this.speaking ? "speech" : this.turns.some((t) => t.committed && !t.done) ? "finalizing" : "idle"; }
  private emit() { this.onState?.(this.current); }

  connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(true);
    if (this.opening) return this.opening;
    this.opening = (async () => {
      try {
        const r = await fetch("/api/stt-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.tokenBody()) });
        if (!r.ok) return false;
        const { key } = await r.json();
        const ws = new WebSocket("wss://api.openai.com/v1/realtime", ["realtime", `openai-insecure-api-key.${key}`]);
        const ok = await new Promise<boolean>((res) => {
          const to = setTimeout(() => res(false), 6000);
          ws.onopen = () => { clearTimeout(to); res(true); };
          ws.onerror = () => { clearTimeout(to); res(false); };
        });
        if (!ok) { try { ws.close(); } catch {} return false; }
        ws.onmessage = (e) => this.handle(JSON.parse(e.data));
        ws.onclose = () => {
          if (this.ws !== ws) return;
          this.ws = null;
          // 연결이 끊기면 아직 결과를 못 받은 발화는 지금까지 받은 글자로 마무리 (말은 버리지 않는다)
          for (const t of this.turns) if (t.committed && !t.done) this.complete(t, t.text);
        };
        this.ws = ws;
        for (const m of this.outbox) ws.send(m);
        this.outbox = [];
        return true;
      } catch { return false; }
      finally { this.opening = null; }
    })();
    return this.opening;
  }

  private send(obj: unknown) {
    const s = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    else { this.outbox.push(s); if (this.outbox.length > 900) this.outbox.splice(0, this.outbox.length - 900); void this.connect(); }
  }

  // 서버가 준 item_id 를 발화에 연결한다. 처음 보는 item_id 는 아직 번호가 없는 가장 오래된 발화의 것이다.
  private turnFor(itemId?: string): Turn | undefined {
    if (!itemId) return undefined;
    const known = this.turns.find((t) => t.itemId === itemId);
    if (known) return known;
    const next = this.turns.find((t) => !t.itemId);
    if (next) next.itemId = itemId;
    return next;
  }

  private handle(m: { type: string; item_id?: string; delta?: string; transcript?: string }) {
    if (m.type === "conversation.item.input_audio_transcription.delta" && m.delta) {
      const t = this.turnFor(m.item_id);
      if (!t || t.done) return;
      t.text += m.delta;
      this.onPartial?.(t.id, t.text);
    } else if (m.type === "input_audio_buffer.committed") {
      this.turnFor(m.item_id);
    } else if (m.type === "conversation.item.input_audio_transcription.completed") {
      const t = this.turnFor(m.item_id);
      if (t && !t.done) this.complete(t, (m.transcript ?? t.text).trim());
    }
  }

  private complete(t: Turn, text: string) {
    t.done = true;
    clearTimeout(t.timer);
    this.turns = this.turns.filter((x) => x !== t);
    this.emit();
    // 0.3초도 안 되는 소리(기침, 문 소리)는 버린다
    if (t.voicedMs >= 300 && text) this.onFinal?.({ id: t.id, text, chunks: t.chunks, voicedMs: t.voicedMs, started: t.started });
    else this.onFinal?.({ id: t.id, text: "", chunks: [], voicedMs: 0, started: t.started });
  }

  private chunk(pcm: Int16Array) {
    const rms = rmsOf(pcm);
    this.onLevel?.(rms);
    if (this.muted) { this.pre = []; this.voiceRun = 0; return; }
    const now = performance.now();
    const voice = rms > Math.max(0.014, this.noise * 2.6);
    if (this.speaking && this.cur) {
      this.cur.chunks.push(pcm);
      this.send({ type: "input_audio_buffer.append", audio: b64(pcm) });
      if (voice) { this.lastVoice = now; this.cur.voicedMs += 100; this.quietSince = 0; }
      else if (!this.quietSince) this.quietSince = now;
      const long = now - this.cur.started;
      // 0.7초 조용하면 문장 끝. 길게 이어 말하면 12초 넘어 0.3초 쉬는 곳, 또는 20초에서 나눠 통역을 앞당긴다(소리는 끊기지 않는다).
      if (now - this.lastVoice > 700 || (long > 12_000 && this.quietSince && now - this.quietSince > 300) || long > 20_000) {
        const continuing = voice || now - this.lastVoice < 300;
        this.finish();
        if (continuing) this.begin(now, []);
      }
      return;
    }
    this.pre.push(pcm);
    while (this.pre.length > 4) this.pre.shift();
    if (voice) this.voiceRun++;
    else { this.voiceRun = 0; this.noise = this.noise * 0.97 + Math.min(rms, 0.05) * 0.03; }
    if (this.voiceRun >= 2) this.begin(now, this.pre);
  }

  private begin(now: number, pre: Int16Array[]) {
    const t: Turn = { id: `t${Date.now().toString(36)}${(this.seq++).toString(36)}`, text: "", chunks: [], voicedMs: this.voiceRun * 100, started: Date.now(), committed: false, done: false };
    this.turns.push(t);
    this.cur = t;
    this.speaking = true;
    this.lastVoice = now; this.quietSince = 0;
    for (const p of pre) { t.chunks.push(p); this.send({ type: "input_audio_buffer.append", audio: b64(p) }); }
    this.pre = [];
    this.onStart?.(t.id, t.started);
    this.emit();
  }

  private finish() {
    const t = this.cur;
    if (!t) return;
    this.cur = null;
    this.speaking = false;
    this.voiceRun = 0;
    t.committed = true;
    this.send({ type: "input_audio_buffer.commit" });
    this.onCommit?.(t.id, t.text);
    t.timer = setTimeout(() => { if (!t.done) this.complete(t, t.text.trim()); }, 9000);
    this.emit();
  }

  reconnect() { try { this.ws?.close(); } catch {} this.ws = null; void this.connect(); }
  close() { try { this.ws?.close(); } catch {} this.ws = null; }
}

export function toWav(chunks: Int16Array[], rate = RATE): Blob {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, len * 2, true);
  let o = 44;
  for (const c of chunks) for (let i = 0; i < c.length; i++, o += 2) v.setInt16(o, c[i], true);
  return new Blob([buf], { type: "audio/wav" });
}

// 받는 즉시 재생하는 PCM 플레이어. 같은 문장을 다시 들을 때는 저장해 둔 소리를 쓴다.
export class PcmPlayer {
  private sources: AudioBufferSourceNode[] = [];
  private abort: AbortController | null = null;
  private cache = new Map<string, Float32Array[]>();
  private token = 0;
  constructor(private getCtx: () => AudioContext | null) {}

  stop() {
    this.token++;
    this.abort?.abort();
    this.abort = null;
    for (const s of this.sources) { try { s.stop(); } catch {} }
    this.sources = [];
  }

  async play(key: string, text: string, lang: string): Promise<boolean> {
    this.stop();
    const ctx = this.getCtx();
    if (!ctx) return false;
    await ctx.resume().catch(() => {});
    const my = ++this.token;
    let next = ctx.currentTime + 0.06;
    let last: AudioBufferSourceNode | null = null;
    const schedule = (f: Float32Array) => {
      if (my !== this.token || !f.length) return;
      const b = ctx.createBuffer(1, f.length, RATE);
      b.copyToChannel(f as Float32Array<ArrayBuffer>, 0);
      const s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination);
      next = Math.max(next, ctx.currentTime + 0.02);
      s.start(next); next += b.duration;
      this.sources.push(s); last = s;
    };
    const cached = this.cache.get(key);
    if (cached) cached.forEach(schedule);
    else {
      const ac = new AbortController();
      this.abort = ac;
      const parts: Float32Array[] = [];
      try {
        const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }), signal: ac.signal });
        if (!r.ok || !r.body) return false;
        const rd = r.body.getReader();
        let carry: Uint8Array | null = null;
        for (;;) {
          const { done, value } = await rd.read();
          if (done || my !== this.token) break;
          let bytes = value;
          if (carry) { const m = new Uint8Array(carry.length + value.length); m.set(carry); m.set(value, carry.length); bytes = m; carry = null; }
          if (bytes.length % 2) { carry = bytes.slice(bytes.length - 1); bytes = bytes.subarray(0, bytes.length - 1); }
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const f = new Float32Array(bytes.length / 2);
          for (let i = 0; i < f.length; i++) f[i] = view.getInt16(i * 2, true) / 32768;
          parts.push(f); schedule(f);
        }
        if (my === this.token) this.cache.set(key, parts);
        if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value!);
      } catch { return false; }
    }
    if (my !== this.token) return false;
    const end = last as AudioBufferSourceNode | null;
    if (!end) return true;
    return new Promise((res) => {
      end.onended = () => res(my === this.token);
      // 끝 이벤트가 안 오는 기기 대비
      setTimeout(() => res(my === this.token), (next - ctx.currentTime) * 1000 + 800);
    });
  }
}
