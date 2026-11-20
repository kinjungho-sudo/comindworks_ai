// 맥미니의 병원 폴더(projects/*/price_watch.json)에서 조사 결과(app.json)를 모아 data/에 복사한다.
// 사용: npm run sync  (배포까지: npm run publish)
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "..");
const PROJECTS = path.resolve(APP, "..");
const OUT = path.join(APP, "data");

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = [];
for (const name of fs.readdirSync(PROJECTS).sort()) {
  const cfgFile = path.join(PROJECTS, name, "price_watch.json");
  if (!fs.existsSync(cfgFile)) continue;
  const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf-8"));
  const root = path.join(PROJECTS, name, cfg.output_dir || "data/prices");
  if (!fs.existsSync(root)) continue;
  const dates = fs.readdirSync(root).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.existsSync(path.join(root, d, "app.json"))).sort();
  if (!dates.length) continue;
  // 공개 주소에 병원 폴더 이름(실명)이 드러나지 않게 price_watch.json의 app_slug를 쓴다
  const slug = cfg.app_slug || name;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new Error(`${name}: app_slug는 영문 소문자·숫자·하이픈만`);
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  for (const d of dates) fs.copyFileSync(path.join(root, d, "app.json"), path.join(OUT, slug, `${d}.json`));
  index.push({ id: slug, label: cfg.client_label || slug, area: cfg.area_keyword || "", dates });
  console.log(`${name} → /c/${slug}: ${dates.length}회 (${dates.at(-1)})`);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ synced_at: new Date().toISOString(), clinics: index }, null, 1) + "\n");
console.log(`data/index.json — 병원 ${index.length}곳`);
