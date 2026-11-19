"use client";
// 데스크 화면과 손님 화면을 잇는 실시간 채널 (Supabase Realtime broadcast). DB 를 거치지 않는다.
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

export type RoomEvent = { event: string; payload: Record<string, unknown> };

let client: SupabaseClient | null = null;

export class Room {
  private ch: RealtimeChannel | null = null;
  connected = false;
  onStatus: ((ok: boolean) => void) | null = null;

  constructor(url: string, key: string, public code: string, private onEvent: (e: RoomEvent) => void) {
    client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 30 } } });
    const ch = client.channel(`medi-room:${code}`, { config: { broadcast: { self: false, ack: false } } });
    ch.on("broadcast", { event: "*" }, (m) => this.onEvent({ event: m.event, payload: (m.payload ?? {}) as Record<string, unknown> }));
    ch.subscribe((s) => {
      this.connected = s === "SUBSCRIBED";
      this.onStatus?.(this.connected);
    });
    this.ch = ch;
  }

  send(event: string, payload: Record<string, unknown>) {
    if (!this.ch) return;
    void this.ch.send({ type: "broadcast", event, payload });
  }

  close() {
    if (this.ch && client) void client.removeChannel(this.ch);
    this.ch = null;
  }
}

// 사람이 읽고 입력하기 쉬운 8자리 방 코드 (헷갈리는 0/O, 1/I 제외)
export function newRoomCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint8Array(8));
  const s = [...r].map((x) => A[x % A.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normalizeRoom(v: string): string | null {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : null;
}
