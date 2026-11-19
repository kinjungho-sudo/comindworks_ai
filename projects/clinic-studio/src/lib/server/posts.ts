// 서버 전용: 원고 목록과 승인 기록 (병원 폴더 data/approvals.json).
import fs from "node:fs";
import path from "node:path";
import { type Approval, type Post } from "@/lib/shared/workflow";
import { getClinic, HttpError, readJson, safeJoin, sha256, writeJson } from "./core";

const SKIP = /cards-text|POSTING|visible|README|review/i;

function frontmatter(text: string) {
  const fm: Record<string, string> = {};
  if (!text.startsWith("---")) return fm;
  const end = text.indexOf("\n---", 3);
  for (const line of text.slice(3, end).split("\n")) {
    const m = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

function approvalsFile(dir: string) {
  return path.join(dir, "data", "approvals.json");
}

export function loadApprovals(dir: string): Record<string, Approval> {
  return readJson<{ posts: Record<string, Approval> }>(approvalsFile(dir), { posts: {} }).posts;
}

export function saveApproval(dir: string, rel: string, a: Approval) {
  const all = loadApprovals(dir);
  all[rel] = a;
  writeJson(approvalsFile(dir), { _about: "clinic-studio 원고 승인 기록. 환자 정보는 넣지 않는다.", posts: all });
}

export function listPosts(clinicId: string): Post[] {
  const { dir } = getClinic(clinicId);
  const out = path.join(dir, "output");
  if (!fs.existsSync(out)) return [];
  const approvals = loadApprovals(dir);
  const posts: Post[] = [];
  for (const folder of fs.readdirSync(out, { withFileTypes: true })) {
    if (!folder.isDirectory() || !/^\d{4}-\d{2}-\d{2}_/.test(folder.name)) continue;
    for (const f of fs.readdirSync(path.join(out, folder.name))) {
      if (!f.endsWith(".md") || SKIP.test(f)) continue;
      const rel = path.join("output", folder.name, f);
      posts.push(readPost(dir, rel, folder.name, approvals[rel]));
    }
  }
  return posts.sort((a, b) => b.folder.localeCompare(a.folder) || a.rel.localeCompare(b.rel));
}

function readPost(dir: string, rel: string, folder: string, a?: Approval): Post {
  const text = fs.readFileSync(safeJoin(dir, rel), "utf-8");
  const fm = frontmatter(text);
  const hash = sha256(text);
  const approval: Approval = a ?? { stage: "draft", history: [] };
  const fixed = approval.stage === "draft" || approval.stage === "checked" ? approval.check?.hash : approval.approvedHash;
  return {
    rel,
    folder,
    title: fm.title || path.basename(rel),
    platform: fm.platform || "",
    format: fm.format || "",
    status: fm.status || "",
    hash,
    markers: (text.match(/\[원장님 확인:[^\]]*\]/g) || []).length,
    naverBundle: /naver/i.test(fm.platform || "") && fs.existsSync(path.join(dir, "output", folder, "naver", "POSTING.md")),
    approval,
    stale: Boolean(fixed && fixed !== hash),
  };
}

export function getPost(clinicId: string, rel: string): Post {
  const p = listPosts(clinicId).find((x) => x.rel === rel);
  if (!p) throw new HttpError(404, "원고를 찾지 못했습니다");
  return p;
}
