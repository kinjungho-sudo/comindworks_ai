"use client";
// 브라우저 쪽 오디오: 마이크 → 24kHz PCM, 실시간 받아쓰기 소켓, PCM 스트리밍 재생.

const RATE = 24000;

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / ${RATE};
    this.t = 0; this.prev = 0;
    this.buf = new Int16Array(2400); this.n = 0;
    this.on = false; this.sq = 0; this.cnt = 0;
    this.port.onmessage = (e) => { this.on = !!e.data.on; if (!this.on) this.n = 0; };
  }
  push(v) {
    const s = Math.max(-1, Math.min(1, v));
    this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    if (this.n === this.buf.length) {
      if (this.on) this.port.postMessage({ pcm: this.buf.buffer }, [this.buf.buffer]);
      this.buf = new Int16Array(2400); this.n = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) { this.sq += ch[i] * ch[i]; }
    this.cnt += ch.length;
    if (this.cnt >= 1200) { this.port.postMessage({ level: Math.sqrt(this.sq / this.cnt) }); this.sq = 0; this.cnt = 0; }
    if (this.ratio === 1) { for (let i = 0; i < ch.length; i++) this.push(ch[i]); }
    else {
      const len = ch.length;
      while (this.t < len) {
        const i0 = Math.floor(this.t), f = this.t - i0;
        const a = i0 < 0 ? this.prev : ch[i0];
        const b = i0 + 1 < len ? ch[i0 + 1] : ch[len - 1];
        this.push(a + (b - a) * f);
        this.t += this.ratio;
      }
      this.t -= len; this.prev = ch[len - 1];
    }
    return true;
  }
}
registerProcessor('capture', Capture);
`;

export class MicEngine {
  ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  onChunk: ((pcm: Int16Array) => void) | null = null;
  onLevel: ((rms: number) => void) | null = null;

  // 반드시 사용자 터치 안에서 호출 (iOS 오디오 정책)
  async init(): Promise<void> {
    if (this.node) { await this.ctx?.resume(); return; }
    let ctx: AudioContext;
    try { ctx = new AudioContext({ sampleRate: RATE }); } catch { ctx = new AudioContext(); }
    this.ctx = ctx;
    await ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    let src: MediaStreamAudioSourceNode;
    try { src = ctx.createMediaStreamSource(this.stream); }
    catch {
      // 일부 브라우저는 마이크와 다른 샘플레이트의 컨텍스트를 거부한다 → 기본값으로 다시 만든다.
      await ctx.close();
      this.ctx = new AudioContext();
      await this.ctx.resume();
      const u2 = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await this.ctx.audioWorklet.addModule(u2);
      URL.revokeObjectURL(u2);
      src = this.ctx.createMediaStreamSource(this.stream);
    }
    const node = new AudioWorkletNode(this.ctx!, "capture");
    node.port.onmessage = (e) => {
      if (e.data.pcm) this.onChunk?.(new Int16Array(e.data.pcm));
      else if (typeof e.data.level === "number") this.onLevel?.(e.data.level);
    };
    src.connect(node);
    const mute = this.ctx!.createGain();
    mute.gain.value = 0;
    node.connect(mute).connect(this.ctx!.destination);
    this.node = node;
  }

  get ready() { return !!this.node; }

  record(on: boolean) { this.node?.port.postMessage({ on }); }

  beep(kind: "start" | "stop") {
    const ctx = this.ctx;
    if (!ctx) return;
    const notes = kind === "start" ? [660, 880] : [700, 520];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const t = ctx.currentTime + i * 0.09;
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.13);
    });
  }
}

function b64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// OpenAI 실시간 받아쓰기 소켓 하나 (언어 하나). 말하는 동안 글자가 들어온다.
export class LiveTranscriber {
  private ws: WebSocket | null = null;
  private opening: Promise<boolean> | null = null;
  private queue: string[] = [];
  private text = "";
  private waiter: ((t: string | null) => void) | null = null;
  onDelta: ((text: string) => void) | null = null;
  constructor(public lang: string) {}

  connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(true);
    if (this.opening) return this.opening;
    this.opening = (async () => {
      try {
        const r = await fetch("/api/stt-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: this.lang }) });
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
        ws.onclose = () => { if (this.ws === ws) this.ws = null; this.waiter?.(this.text || null); this.waiter = null; };
        this.ws = ws;
        for (const q of this.queue) ws.send(q);
        this.queue = [];
        return true;
      } catch { return false; }
      finally { this.opening = null; }
    })();
    return this.opening;
  }

  private send(obj: unknown) {
    const s = JSON.stringify(obj);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    else this.queue.push(s);
  }

  private handle(m: { type: string; delta?: string; transcript?: string; error?: { message?: string } }) {
    if (m.type === "conversation.item.input_audio_transcription.delta" && m.delta) {
      this.text += m.delta;
      this.onDelta?.(this.text);
    } else if (m.type === "conversation.item.input_audio_transcription.completed") {
      this.text = m.transcript ?? this.text;
      this.waiter?.(this.text.trim());
      this.waiter = null;
    } else if (m.type === "error") {
      // 너무 짧은 녹음 등. 지금까지 받은 글자로 마무리한다.
      this.waiter?.(this.text.trim());
      this.waiter = null;
    }
  }

  get connected() { return !!this.ws && this.ws.readyState === WebSocket.OPEN; }

  begin() {
    this.text = "";
    this.queue = [];
    this.send({ type: "input_audio_buffer.clear" });
    void this.connect();
  }

  append(pcm: Int16Array) { this.send({ type: "input_audio_buffer.append", audio: b64(pcm) }); }

  // 최종 문장. 소켓이 끝내 안 붙으면 null (→ 녹음 파일 예비 경로)
  async finish(): Promise<string | null> {
    const ok = await this.connect();
    if (!ok) return null;
    return new Promise((res) => {
      const to = setTimeout(() => { this.waiter = null; res(this.text.trim() || null); }, 7000);
      this.waiter = (t) => { clearTimeout(to); res(t); };
      this.send({ type: "input_audio_buffer.commit" });
    });
  }

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

  // 재생이 끝나면 resolve. 중간에 stop() 되면 false
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
    return new Promise((res) => { end.onended = () => res(my === this.token); });
  }
}
