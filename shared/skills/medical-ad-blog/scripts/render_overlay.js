const { chromium } = require('playwright');
(async () => {
  const [,, html, out] = process.argv;
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('file://' + html);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 800 } });
  await b.close();
})();
