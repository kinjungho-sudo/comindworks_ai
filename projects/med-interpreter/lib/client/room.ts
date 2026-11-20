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

// 방 이름은 데스크 번호로 정한다 ("desk-1"). 코드 입력 없이 데스크 번호만 고르면 연결된다.
export const deskRoom = (n: number) => `desk-${Math.max(1, Math.min(20, Math.round(n) || 1))}`;
export function normalizeRoom(v: string): string | null {
  const m = /^desk-(\d{1,2})$/i.exec(v.trim());
  return m ? deskRoom(Number(m[1])) : null;
}
export const deskNumber = (room: string | null) => Number(/desk-(\d+)/.exec(room ?? "")?.[1] ?? 1);
