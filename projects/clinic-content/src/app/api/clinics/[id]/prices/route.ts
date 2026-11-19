// 시술가 조사: 보고서 목록·실행 상태 보기, 새 조사 시작 (사람이 누를 때만, 한 번에 하나).
// 조사 원칙(강남언니 robots.txt 때문에 요청 시 소량·공개 화면만)은 clinic-price-research 스킬 references/rules.md.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ENGINES, getClinic, handle, HttpError, PY, readJson, writeJson } from "@/lib/server/core";

type Ctx = { params: Promise<{ id: string }> };
type RunState = { pid?: number; startedAt?: string; finishedAt?: string; code?: number | null };

function paths(dir: string) {
  const cfg = readJson<{ output_dir?: string; report_dir?: string }>(path.join(dir, "price_watch.json"), {});
  const data = path.join(dir, cfg.output_dir || "data/prices");
  return { data, reports: path.join(dir, cfg.report_dir || "output/prices"), state: path.join(data, "_run.json"), log: path.join(data, "_run.log") };
}

function alive(pid?: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = getClinic(id);
  if (!c.hasPrices) throw new HttpError(404, "price_watch.json이 없습니다");
  const p = paths(c.dir);
  const reports = fs.existsSync(p.reports)
    ? fs.readdirSync(p.reports).filter((f) => f.endsWith(".html")).sort().reverse()
        .map((f) => ({ name: f, rel: path.relative(c.dir, path.join(p.reports, f)) }))
    : [];
  const st = readJson<RunState>(p.state, {});
  const running = alive(st.pid) && !st.finishedAt;
  const log = fs.existsSync(p.log) ? fs.readFileSync(p.log, "utf-8").split("\n").slice(-15).join("\n") : "";
  return Response.json({ reports, running, state: st, log });
});

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = getClinic(id);
  if (!c.hasPrices) throw new HttpError(404, "price_watch.json이 없습니다");
  const p = paths(c.dir);
  const st = readJson<RunState>(p.state, {});
  if (alive(st.pid) && !st.finishedAt) throw new HttpError(409, "이미 조사 중입니다");
  fs.mkdirSync(p.data, { recursive: true });
  const out = fs.openSync(p.log, "w");
  const child = spawn(PY, [ENGINES.priceResearch, "run", "price_watch.json"], {
    cwd: c.dir, detached: true, stdio: ["ignore", out, out], env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  const state: RunState = { pid: child.pid, startedAt: new Date().toISOString() };
  writeJson(p.state, state);
  child.on("exit", (code) => writeJson(p.state, { ...state, finishedAt: new Date().toISOString(), code }));
  child.unref();
  return Response.json({ started: true, state });
});
