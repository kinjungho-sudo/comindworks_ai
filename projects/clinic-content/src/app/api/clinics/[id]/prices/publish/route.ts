// 시세 조사 결과를 배포 앱(projects/clinic-prices → clinic-prices.vercel.app)에 올리기. 사람이 버튼을 눌렀을 때만.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getClinic, handle, HttpError, PROJECTS } from "@/lib/server/core";

type Ctx = { params: Promise<{ id: string }> };
const APP = path.join(PROJECTS, "clinic-prices");

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const c = getClinic(id);
  if (!c.hasPrices) throw new HttpError(404, "price_watch.json이 없습니다");
  if (!fs.existsSync(path.join(APP, ".vercel", "project.json"))) throw new HttpError(409, "배포 앱이 Vercel에 연결돼 있지 않습니다 (projects/clinic-prices)");
  const out = await new Promise<{ code: number; log: string }>((resolve, reject) => {
    const child = spawn("npm", ["run", "publish"], { cwd: APP, env: process.env });
    let log = "";
    const t = setTimeout(() => { child.kill("SIGTERM"); reject(new HttpError(504, "배포 시간이 너무 걸립니다 (5분)")); }, 300_000);
    child.stdout.on("data", (d) => (log += d));
    child.stderr.on("data", (d) => (log += d));
    child.on("close", (code) => { clearTimeout(t); resolve({ code: code ?? 1, log }); });
    child.on("error", (e) => { clearTimeout(t); reject(e); });
  });
  const tail = out.log.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").split("\n").filter((l) => /회 \(|병원 \d+곳|Production|Aliased|Error|error|https:\/\/clinic-prices/.test(l)).slice(-8).join("\n");
  if (out.code !== 0) throw new HttpError(502, `배포 실패:\n${tail || out.log.slice(-600)}`);
  return Response.json({ ok: true, url: "https://clinic-prices.vercel.app", log: tail });
});
