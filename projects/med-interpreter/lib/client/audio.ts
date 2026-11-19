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

export class MicEngine {
  ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  onChunk: ((pcm: Int16Array) => void) | null = null;

  // 반드시 사용자 터치 안에서 호출 (iOS 오디오 정책)
  async init(): Promise<void> {
    if (this.node) { await this.ctx?.resume(); return; }
    let ctx: AudioContext;
    try { ctx = new AudioContext({ sampleRate: RATE }); } catch { ctx = new AudioContext(); }
    await ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
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

// 계속 듣는다. 말이 시작되면 OpenAI 실시간 받아쓰기로 보내고(글자가 바로 들어옴), 0.7초 조용하면 문장을 확정한다.
export class Listener {
  private ws: WebSocket | null = null;
  private opening: Promise<boolean> | null = null;
  private outbox: string[] = [];
  private pre: Int16Array[] = [];
  private state: ListenState = "idle";
  private noise = 0.008;
  private voiceRun = 0;
  private voicedMs = 0;
  private lastVoice = 0;
  private started = 0;
  private partial = "";
  private waiter: ((t: string) => void) | null = null;
  private pausedBy = new Set<string>();
  private muted = false;
  onPartial: ((text: string) => void) | null = null;
  onFinal: ((text: string) => void) | null = null;
  onLevel: ((rms: number) => void) | null = null;
  onState: ((s: ListenState) => void) | null = null;

  constructor(private mic: MicEngine, private tokenBody: () => Record<string, string | undefined>) {
    mic.onChunk = (pcm) => this.chunk(pcm);
  }

  // 통역 음성이 나오는 동안 등, 이유별로 잠시 멈춘다
  pause(reason: string, on: boolean) {
    if (on) this.pausedBy.add(reason); else this.pausedBy.delete(reason);
    this.emit();
  }
  setMuted(m: boolean) { this.muted = m; this.emit(); }
  get current(): ListenState { return this.muted ? "off" : this.pausedBy.size ? "paused" : this.state; }
  private emit() { this.onState?.(this.current); }

  // 언어 설정이 바뀌면 새 키로 다시 연결한다
  reconnect() { try { this.ws?.close(); } catch {} this.ws = null; void this.connect(); }

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
        ws.onclose = () => { if (this.ws === ws) this.ws = null; this.resolve(this.partial); };
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
    else { this.outbox.push(s); void this.connect(); }
  }

  private handle(m: { type: string; delta?: string; transcript?: string }) {
    if (m.type === "conversation.item.input_audio_transcription.delta" && m.delta) {
      this.partial += m.delta;
      this.onPartial?.(this.partial);
    } else if (m.type === "conversation.item.input_audio_transcription.completed") {
      this.resolve((m.transcript ?? this.partial).trim());
    } else if (m.type === "error") {
      this.resolve(this.partial.trim());
    }
  }

  private resolve(t: string) {
    const w = this.waiter;
    this.waiter = null;
    w?.(t);
  }

  private chunk(pcm: Int16Array) {
    const rms = rmsOf(pcm);
    this.onLevel?.(rms);
    if (this.muted || this.pausedBy.size) {
      if (this.state === "speech") this.finish(); // 말하는 도중 멈추면 거기까지 확정
      this.pre = []; this.voiceRun = 0;
      return;
    }
    const now = performance.now();
    const voice = rms > Math.max(0.014, this.noise * 2.6);
    if (this.state === "speech") {
      this.send({ type: "input_audio_buffer.append", audio: b64(pcm) });
      if (voice) { this.lastVoice = now; this.voicedMs += 100; }
      if (now - this.lastVoice > 700 || now - this.started > 30_000) this.finish();
      return;
    }
    // idle / finalizing: 말 시작을 기다린다 (앞부분이 잘리지 않게 0.4초를 모아 둔다)
    this.pre.push(pcm);
    const keep = this.state === "finalizing" ? 30 : 4;
    while (this.pre.length > keep) this.pre.shift();
    if (voice) this.voiceRun++;
    else { this.voiceRun = 0; this.noise = this.noise * 0.97 + Math.min(rms, 0.05) * 0.03; }
    if (this.state === "idle" && this.voiceRun >= 2) this.begin(now);
  }

  private begin(now: number) {
    this.state = "speech";
    this.partial = "";
    this.started = now; this.lastVoice = now; this.voicedMs = this.voiceRun * 100;
    this.send({ type: "input_audio_buffer.clear" });
    for (const p of this.pre) this.send({ type: "input_audio_buffer.append", audio: b64(p) });
    this.pre = [];
    this.onPartial?.("");
    this.emit();
  }

  private finish() {
    const voiced = this.voicedMs;
    this.state = "finalizing";
    this.emit();
    const done = (t: string) => {
      this.state = "idle";
      this.emit();
      // 0.3초도 안 되는 소리(기침, 문 소리)는 버린다
      if (voiced >= 300 && t) this.onFinal?.(t);
      else this.onPartial?.("");
      if (this.voiceRun >= 2 && !this.muted && !this.pausedBy.size) this.begin(performance.now());
    };
    const to = setTimeout(() => { this.waiter = null; done(this.partial.trim()); }, 5000);
    this.waiter = (t) => { clearTimeout(to); done(t); };
    this.send({ type: "input_audio_buffer.commit" });
  }

  close() { try { this.ws?.close(); } catch {} this.ws = null; }
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
