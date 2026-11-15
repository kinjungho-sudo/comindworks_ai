const { chromium } = require('playwright');
(async () => {
  const [,, html, out, w = '1200', h = '800'] = process.argv;
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await p.goto('file://' + html);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: +w, height: +h } });
  await b.close();
})();
