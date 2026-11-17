// 사용법: node render_overlay.js <html 절대경로> <출력 png> [가로=1200] [세로=800]
const { chromium } = require('playwright');
(async () => {
  const [,, html, out, w = '1200', h = '800'] = process.argv;
  const width = parseInt(w, 10), height = parseInt(h, 10);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await p.goto('file://' + html);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
  await b.close();
})();
