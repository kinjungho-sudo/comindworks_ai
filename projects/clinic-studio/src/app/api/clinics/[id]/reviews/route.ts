// 리뷰: 목록·분류(review_care.py json), 넣기(CSV 붙여 넣기·한 건씩), 답글 초안·게시 답글 저장.
import fs from "node:fs";
import path from "node:path";
import { ENGINES, getClinic, handle, HttpError, parseJsonOutput, runPython } from "@/lib/server/core";
import { COLS, importRows, parseCsv, type ReviewRow, updateRow } from "@/lib/server/reviews";

type Ctx = { params: Promise<{ id: string }> };

function clinicWithConfig(id: string) {
  const c = getClinic(id);
  if (!fs.existsSync(path.join(c.dir, "review_watch.json")))
    throw new HttpError(404, "이 병원 폴더에 review_watch.json이 없습니다 (clinic-review-care 설정 필요)");
  return c;
}

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = clinicWithConfig(id);
  const r = await runPython(ENGINES.reviewCare, ["json", "review_watch.json"], { cwd: c.dir });
  return Response.json(parseJsonOutput(r, "리뷰 분석"));
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = clinicWithConfig(id);
  const body = (await req.json()) as { csv?: string; rows?: Partial<ReviewRow>[] };
  let rows: ReviewRow[] = [];
  if (body.csv) {
    const table = parseCsv(body.csv);
    const head = (table[0] || []).map((h) => h.trim());
    if (!head.includes("text")) throw new HttpError(400, "CSV 첫 줄에 열 이름(platform,date,rating,author,text,…)이 있어야 합니다");
    rows = table.slice(1).map((cells) => {
      const r = Object.fromEntries(COLS.map((k) => [k, ""])) as ReviewRow;
      head.forEach((h, i) => { if ((COLS as readonly string[]).includes(h)) r[h as keyof ReviewRow] = (cells[i] ?? "").trim(); });
      return r;
    });
  } else if (body.rows) {
    rows = body.rows.map((x) => Object.fromEntries(COLS.map((k) => [k, String(x[k] ?? "").trim()])) as ReviewRow);
  }
  for (const r of rows) {
    if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new HttpError(400, `날짜는 2026-11-20 형식으로: ${r.date}`);
    if (r.rating && !/^[0-5](\.\d)?$/.test(r.rating)) throw new HttpError(400, `별점은 0~5 숫자로: ${r.rating}`);
  }
  return Response.json(importRows(c.dir, rows));
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = clinicWithConfig(id);
  const b = (await req.json()) as { id?: string; reply_draft?: string; reply?: string };
  if (!b.id) throw new HttpError(400, "리뷰 id가 필요합니다");
  return Response.json(updateRow(c.dir, b.id, { reply_draft: b.reply_draft, reply: b.reply }));
});
