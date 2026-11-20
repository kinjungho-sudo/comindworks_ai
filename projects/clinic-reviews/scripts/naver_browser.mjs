// 네이버 스마트플레이스 리뷰 화면을 맥미니 크롬(전용 프로필)으로 여는 도우미. 앱 서버가 실행한다.
//   node scripts/naver_browser.mjs login <프로필 폴더> <주소>   창을 띄우고 사람이 직접 로그인 → 창을 닫으면 끝
//   node scripts/naver_browser.mjs fetch <프로필 폴더> <주소>   리뷰 화면 글자를 읽어 JSON으로 출력
// 규칙: 사람이 버튼을 눌렀을 때만, 한 번에 화면 1장 + 아래로 3번만 내림. 클릭·입력·답글 작성 없음.
// 비밀번호는 이 도구가 다루지 않는다(사람이 창에서 직접 입력). 프로필(로그인 쿠키)은 저장소 밖에 둔다.
import { chromium } from "playwright-core";

const [, , mode, profile, url] = process.argv;
if (!["login", "fetch"].includes(mode) || !profile || !url) {
  console.error("사용법: naver_browser.mjs login|fetch <프로필 폴더> <주소>");
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: false,
  viewport: { width: 1200, height: 900 },
  args: ["--no-first-run", "--no-default-browser-check"],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

if (mode === "login") {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // 사람이 로그인하고 창을 닫을 때까지 기다린다 (최대 15분)
  await Promise.race([new Promise((r) => ctx.on("close", r)), sleep(15 * 60_000)]);
  await ctx.close().catch(() => {});
  process.exit(0);
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await sleep(2000);
  const finalUrl = page.url();
  if (/nid\.naver\.com|nidlogin/.test(finalUrl)) {
    console.log(JSON.stringify({ loginRequired: true, finalUrl }));
  } else {
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 2500);
      await sleep(1500);
    }
    const texts = [];
    for (const f of page.frames()) {
      const t = await f.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      if (t.trim()) texts.push(t);
    }
    console.log(JSON.stringify({ loginRequired: false, finalUrl, text: texts.join("\n\n"), frames: texts.length }));
  }
} catch (e) {
  console.log(JSON.stringify({ error: String(e?.message || e) }));
} finally {
  await ctx.close().catch(() => {});
}
