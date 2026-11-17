// 카드 이미지 렌더: node render_cards.js <cards.html 절대경로> <출력 폴더> [접두어=card]
// .card 요소마다 PNG 한 장, 그리고 카드 글자를 모은 cards-text.md(의료광고 검사용)를 html 옆에 만든다.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [, , html, outDir, prefix = 'card'] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
  await page.goto('file://' + html);
  await page.waitForLoadState('networkidle');
  const cards = await page.$$('.card');
  const texts = ['---', 'title: 카드 글자 모음 (의료광고 검사용)', '---', ''];
  for (let i = 0; i < cards.length; i++) {
    const name = `${prefix}-${String(i + 1).padStart(2, '0')}.png`;
    await cards[i].screenshot({ path: path.join(outDir, name) });
    const t = (await cards[i].innerText()).replace(/\n{2,}/g, '\n').trim();
    texts.push(`## 카드 ${i + 1} (${name})`, '', t, '');
  }
  fs.writeFileSync(path.join(path.dirname(html), 'cards-text.md'), texts.join('\n'));
  await browser.close();
  console.log(`카드 ${cards.length}장 → ${outDir}`);
})();
