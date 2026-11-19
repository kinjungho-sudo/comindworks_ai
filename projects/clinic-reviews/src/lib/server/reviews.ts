// 서버 전용: 리뷰 CSV 읽기·쓰기 (병원 폴더 data/reviews/*.csv, git 제외). 분석은 review_care.py가 한다.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HttpError, readJson } from "./core";

export const COLS = ["platform", "date", "rating", "author", "text", "reply", "reply_draft"] as const;
export type ReviewRow = Record<(typeof COLS)[number], string>;

export function reviewDir(clinicDir: string) {
  const cfg = readJson<{ input_dir?: string }>(path.join(clinicDir, "review_watch.json"), {});
  return path.join(clinicDir, cfg.input_dir || "data/reviews");
}

/** review_care.py의 rid()와 같은 규칙 */
export function reviewId(r: Pick<ReviewRow, "platform" | "date" | "author" | "text">) {
  const key = [r.platform, r.date, r.author, Array.from(r.text).slice(0, 200).join("")].join("|");
  return createHash("sha1").update(key, "utf-8").digest("hex").slice(0, 10);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function esc(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: ReviewRow[]) {
  return [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c] ?? "")).join(","))].join("\n") + "\n";
}

export function readCsvRows(file: string): ReviewRow[] {
  const table = parseCsv(fs.readFileSync(file, "utf-8"));
  if (!table.length) return [];
  const head = table[0].map((h) => h.trim());
  return table.slice(1).map((cells) => {
    const r = Object.fromEntries(COLS.map((c) => [c, ""])) as ReviewRow;
    head.forEach((h, i) => {
      if ((COLS as readonly string[]).includes(h)) r[h as keyof ReviewRow] = (cells[i] ?? "").trim();
    });
    return r;
  });
}

function writeCsv(file: string, rows: ReviewRow[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, toCsv(rows), "utf-8");
  fs.renameSync(tmp, file);
}

/** 앱에서 넣은 리뷰는 inbox.csv 한 파일에 모은다 (이미 있는 리뷰는 건너뜀) */
export function importRows(clinicDir: string, incoming: ReviewRow[]) {
  const dir = reviewDir(clinicDir);
  fs.mkdirSync(dir, { recursive: true });
  const existing = new Set<string>();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".csv"))) {
    for (const r of readCsvRows(path.join(dir, f))) existing.add(reviewId(r));
  }
  const inbox = path.join(dir, "inbox.csv");
  const rows = fs.existsSync(inbox) ? readCsvRows(inbox) : [];
  let added = 0;
  for (const r of incoming) {
    if (!r.text.trim()) continue;
    const id = reviewId(r);
    if (existing.has(id)) continue;
    existing.add(id);
    rows.push(r);
    added++;
  }
  writeCsv(inbox, rows);
  return { added, skipped: incoming.length - added };
}

/** 리뷰 하나의 답글 초안·게시 답글 고치기 (그 리뷰가 들어 있는 CSV를 찾아 고친다) */
export function updateRow(clinicDir: string, id: string, patch: Partial<Pick<ReviewRow, "reply" | "reply_draft">>) {
  const dir = reviewDir(clinicDir);
  if (!fs.existsSync(dir)) throw new HttpError(404, "리뷰 폴더가 없습니다");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".csv"))) {
    const file = path.join(dir, f);
    const rows = readCsvRows(file);
    const i = rows.findIndex((r) => reviewId(r) === id);
    if (i < 0) continue;
    if (patch.reply_draft !== undefined) rows[i].reply_draft = patch.reply_draft.trim();
    if (patch.reply !== undefined) rows[i].reply = patch.reply.trim();
    writeCsv(file, rows);
    return rows[i];
  }
  throw new HttpError(404, "리뷰를 찾지 못했습니다");
}
