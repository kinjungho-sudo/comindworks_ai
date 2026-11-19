// 서버 전용: 저장소 경로, 병원 폴더, 파이썬 엔진 실행, 안전한 파일 접근.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const REPO = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "..");
export const PROJECTS = path.join(REPO, "projects");
export const SKILLS = path.join(REPO, "shared", "skills");
export const PY = process.env.PYTHON || "python3";

export const ENGINES = {
  reviewCare: path.join(SKILLS, "clinic-review-care", "scripts", "review_care.py"),
};

export type Clinic = { id: string; label: string; dir: string; hasPrices: boolean; hasReviews: boolean };

const ID_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  fs.renameSync(tmp, file);
}

export { readJson };

/** 병원 폴더 = review_watch.json이 있는 프로젝트 */
export function listClinics(): Clinic[] {
  return fs
    .readdirSync(PROJECTS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ID_RE.test(d.name))
    .map((d) => {
      const dir = path.join(PROJECTS, d.name);
      const pw = path.join(dir, "price_watch.json");
      const rw = path.join(dir, "review_watch.json");
      const ok = fs.existsSync(rw); // 리뷰 앱: clinic-review-care 설정(review_watch.json)이 있는 병원만
      if (!ok) return null;
      const label =
        readJson<{ client_label?: string }>(rw, {}).client_label ||
        readJson<{ client_label?: string }>(pw, {}).client_label ||
        d.name;
      return { id: d.name, label, dir, hasPrices: fs.existsSync(pw), hasReviews: fs.existsSync(rw) };
    })
    .filter((c): c is Clinic => c !== null);
}

export function getClinic(id: string): Clinic {
  if (!ID_RE.test(id)) throw new HttpError(400, "잘못된 병원 이름");
  const c = listClinics().find((x) => x.id === id);
  if (!c) throw new HttpError(404, "병원 폴더를 찾지 못했습니다");
  return c;
}

/** 병원 폴더 안의 상대 경로만 허용 (../ 탈출 차단) */
export function safeJoin(base: string, rel: string): string {
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) throw new HttpError(400, "허용되지 않은 경로");
  return full;
}

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function handle<T extends unknown[]>(fn: (...a: T) => Promise<Response>) {
  return async (...a: T) => {
    try {
      return await fn(...a);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : String(e);
      if (status === 500) console.error(e);
      return Response.json({ error: message }, { status });
    }
  };
}

export type RunResult = { code: number; stdout: string; stderr: string };

export function runPython(script: string, args: string[], opts: { cwd: string; input?: string; timeoutMs?: number }) {
  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(PY, [script, ...args], { cwd: opts.cwd, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new HttpError(504, "엔진 실행 시간이 초과됐습니다"));
    }, opts.timeoutMs ?? 120_000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

export function parseJsonOutput<T>(r: RunResult, what: string): T {
  try {
    return JSON.parse(r.stdout) as T;
  } catch {
    throw new HttpError(500, `${what} 결과를 읽지 못했습니다: ${(r.stderr || r.stdout).slice(-400)}`);
  }
}
