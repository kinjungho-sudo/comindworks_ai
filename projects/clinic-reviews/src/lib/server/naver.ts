// 서버 전용: 네이버 플레이스 리뷰 가져오기.
// ① 붙여 넣은 글자 해석, ② 맥미니 크롬(전용 프로필)으로 우리 병원 스마트플레이스 리뷰 화면 읽기.
// ②는 사람이 버튼을 눌렀을 때만, 10분에 한 번 이하. 결과는 바로 저장하지 않고 미리보기로 돌려준다.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseNaverText, type ParsedReview } from "@/lib/shared/naverParse";
import { HttpError, readJson, writeJson } from "./core";
import { readCsvRows, reviewDir, reviewId } from "./reviews";

export const MIN_INTERVAL_MIN = 10;
const SCRIPT = path.join(/*turbopackIgnore: true*/ process.cwd(), "scripts", "naver_browser.mjs");

type NaverConfig = { reviews_url?: string };
type RunLog = { lastFetchAt?: string; lastResult?: string; loginPid?: number; loginStartedAt?: string };

export function profileDir(clinicId: string) {
  // 로그인 쿠키가 들어 있으므로 저장소 밖(사용자 홈)에 둔다
  return path.join(os.homedir(), ".clinic-reviews", "profiles", clinicId);
}

function cfgPath(clinicDir: string) {
  return path.join(clinicDir, "review_watch.json");
}

export function getNaverConfig(clinicDir: string): NaverConfig {
  return readJson<{ naver?: NaverConfig }>(cfgPath(clinicDir), {}).naver ?? {};
}

export function setNaverUrl(clinicDir: string, url: string) {
  const u = url.trim();
  let host = "";
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") throw new Error();
    host = parsed.hostname;
  } catch {
    throw new HttpError(400, "https://로 시작하는 주소를 넣어 주세요");
  }
  if (!/(^|\.)naver\.com$/.test(host)) throw new HttpError(400, "네이버 스마트플레이스(또는 플레이스) 주소만 넣을 수 있습니다");
  const cfg = readJson<Record<string, unknown>>(cfgPath(clinicDir), {});
  cfg.naver = { ...(cfg.naver as object), reviews_url: u };
  writeJson(cfgPath(clinicDir), cfg);
}

function logPath(clinicDir: string) {
  return path.join(reviewDir(clinicDir), "_naver_runs.json"); // data/reviews/ = git 제외
}

function alive(pid?: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function naverStatus(clinicId: string, clinicDir: string) {
  const log = readJson<RunLog>(logPath(clinicDir), {});
  const next = log.lastFetchAt ? new Date(new Date(log.lastFetchAt).getTime() + MIN_INTERVAL_MIN * 60_000) : null;
  return {
    url: getNaverConfig(clinicDir).reviews_url ?? "",
    profileReady: fs.existsSync(profileDir(clinicId)),
    loginWindowOpen: alive(log.loginPid),
    lastFetchAt: log.lastFetchAt ?? null,
    lastResult: log.lastResult ?? null,
    nextAllowedAt: next && next > new Date() ? next.toISOString() : null,
  };
}

/** 로그인 창 열기: 사람이 창에서 직접 네이버에 로그인하고 창을 닫는다 */
export function openLoginWindow(clinicId: string, clinicDir: string) {
  const st = naverStatus(clinicId, clinicDir);
  if (st.loginWindowOpen) throw new HttpError(409, "로그인 창이 이미 열려 있습니다");
  const url = st.url || "https://new.smartplace.naver.com/";
  fs.mkdirSync(profileDir(clinicId), { recursive: true });
  const child = spawn(process.execPath, [SCRIPT, "login", profileDir(clinicId), url], { detached: true, stdio: "ignore" });
  child.unref();
  const log = readJson<RunLog>(logPath(clinicDir), {});
  writeJson(logPath(clinicDir), { ...log, loginPid: child.pid, loginStartedAt: new Date().toISOString() });
}

export type PreviewItem = ParsedReview & { id: string; isNew: boolean };

/** 이미 저장된 리뷰인지 표시해서 미리보기로 */
export function toPreview(clinicDir: string, items: ParsedReview[]): PreviewItem[] {
  const dir = reviewDir(clinicDir);
  const have = new Set<string>();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".csv"))) {
      for (const r of readCsvRows(path.join(dir, f))) have.add(reviewId(r));
    }
  }
  return items.map((it) => {
    const id = reviewId({ platform: "네이버", date: it.date, author: it.author, text: it.text });
    return { ...it, id, isNew: !have.has(id) };
  });
}

export function parsePasted(clinicDir: string, text: string) {
  if (text.length > 400_000) throw new HttpError(413, "붙여 넣은 글이 너무 깁니다 (화면 몇 장씩 나눠 주세요)");
  return toPreview(clinicDir, parseNaverText(text));
}

/** ② 새 리뷰 가져오기: 크롬으로 리뷰 화면 1장을 읽어 미리보기로 */
export async function fetchFromSmartPlace(clinicId: string, clinicDir: string) {
  const st = naverStatus(clinicId, clinicDir);
  if (!st.url) throw new HttpError(400, "먼저 우리 병원 스마트플레이스 리뷰 화면 주소를 저장해 주세요");
  if (st.loginWindowOpen) throw new HttpError(409, "로그인 창을 먼저 닫아 주세요");
  if (st.nextAllowedAt) throw new HttpError(429, `네이버 계정 보호를 위해 ${MIN_INTERVAL_MIN}분에 한 번만 가져옵니다`);
  const log = readJson<RunLog>(logPath(clinicDir), {});
  const now = new Date().toISOString();
  writeJson(logPath(clinicDir), { ...log, lastFetchAt: now, lastResult: "진행 중" });

  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, "fetch", profileDir(clinicId), st.url], { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    let err = "";
    const t = setTimeout(() => { child.kill("SIGTERM"); reject(new HttpError(504, "네이버 화면을 여는 데 시간이 너무 걸립니다")); }, 120_000);
    child.stdout.on("data", (d) => (buf += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", () => { clearTimeout(t); resolve(buf || err); });
    child.on("error", (e) => { clearTimeout(t); reject(e); });
  });
  let res: { loginRequired?: boolean; text?: string; error?: string; finalUrl?: string };
  try {
    res = JSON.parse(out.trim().split("\n").pop() || "{}");
  } catch {
    res = { error: out.slice(-300) };
  }
  const save = (lastResult: string) => writeJson(logPath(clinicDir), { ...readJson<RunLog>(logPath(clinicDir), {}), lastFetchAt: now, lastResult });
  if (res.error) { save(`실패: ${res.error.slice(0, 120)}`); throw new HttpError(502, `크롬 실행 실패: ${res.error.slice(0, 200)}`); }
  if (res.loginRequired) { save("로그인 필요"); throw new HttpError(401, "네이버 로그인이 풀렸습니다. '로그인 창 열기'로 다시 로그인해 주세요"); }
  const items = toPreview(clinicDir, parseNaverText(res.text || ""));
  save(`읽음: 리뷰 ${items.length}건 (새 리뷰 ${items.filter((i) => i.isNew).length}건)`);
  return { items, finalUrl: res.finalUrl, chars: (res.text || "").length };
}
