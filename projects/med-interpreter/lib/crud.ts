import "server-only";
import { db } from "./db";
import { fillMissing } from "./fill";
import { bad, readJSON } from "./http";
import { ALL_LANGS } from "./langs";
import { UUID } from "./records";

// 용어집·자주 쓰는 문장 공용 CRUD
export function crud(table: "medi_terms" | "medi_phrases", kind: "term" | "phrase", extra: string[], onChange: () => void) {
  const cols = ["id", "category", ...ALL_LANGS, ...extra, "created_at"].join(",");
  const order = kind === "phrase" ? "sort" : "ko";

  async function GET() {
    const { data, error } = await db().from(table).select(cols).order(kind === "term" ? "category" : "category").order(order);
    if (error) return bad(error.message, 500);
    return Response.json({ items: data ?? [] });
  }

  function clean(r: Record<string, unknown>) {
    const o: Record<string, unknown> = {};
    for (const k of ["category", ...ALL_LANGS, ...extra]) {
      if (!(k in r)) continue;
      const v = r[k];
      if (k === "sort") o[k] = Number(v) || 0;
      else o[k] = typeof v === "string" ? (v.trim() || null) : v ?? null;
    }
    return o;
  }

  // body: { items: [...], fill?: boolean }  id 가 있으면 수정, 없으면 추가
  async function POST(req: Request) {
    const b = await readJSON<{ items?: Record<string, unknown>[]; fill?: boolean }>(req);
    let items = (b?.items ?? []).filter((r) => typeof r.ko === "string" && r.ko.trim()).slice(0, 500);
    if (!items.length) return bad("한국어 칸은 반드시 채워야 합니다.");
    if (b?.fill) {
      try { items = await fillMissing(items as { ko: string }[], kind); }
      catch (e) { return bad(`자동 번역 실패: ${(e as Error).message}`, 502); }
    }
    const rows = items.map((r) => ({ ...(typeof r.id === "string" && UUID.test(r.id) ? { id: r.id } : {}), ...clean(r), ...(kind === "term" ? { updated_at: new Date().toISOString() } : {}) }));
    const withId = rows.filter((r) => "id" in r), noId = rows.filter((r) => !("id" in r));
    const out: unknown[] = [];
    if (withId.length) {
      const { data, error } = await db().from(table).upsert(withId).select(cols);
      if (error) return bad(error.message, 500);
      out.push(...(data ?? []));
    }
    if (noId.length) {
      const { data, error } = await db().from(table).insert(noId).select(cols);
      if (error) return bad(error.message, 500);
      out.push(...(data ?? []));
    }
    onChange();
    return Response.json({ items: out });
  }

  async function DELETE(req: Request) {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!UUID.test(id)) return bad("id 가 필요합니다.");
    const { error } = await db().from(table).delete().eq("id", id);
    if (error) return bad(error.message, 500);
    onChange();
    return Response.json({ ok: true });
  }
  return { GET, POST, DELETE };
}
