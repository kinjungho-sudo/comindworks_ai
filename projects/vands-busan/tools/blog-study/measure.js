// 네이버 블로그 글 형식 측정 (모바일 화면). 글은 저장하지 않고, 셀 수 있는 형식과 짧은 뼈대만 뽑는다.
// node measure.js <in.json(url 목록)> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const urls = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch({ channel: 'chrome' });
  const out = [];
  for (const u of urls) {
    const p = await b.newPage({ viewport: { width: 430, height: 900 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    try {
      await p.goto(u, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.se-main-container', { timeout: 12000 });
      await p.evaluate(async () => { const m = document.querySelector('.se-main-container'); const H = m.getBoundingClientRect().bottom + scrollY; for (let y = 0; y < H; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
      const r = await p.evaluate(() => {
        const m = document.querySelector('.se-main-container');
        const kindOf = c => { const k = [...c.classList].find(x => /^se-(text|image|imageStrip|imageGroup|quotation|horizontalLine|sticker|table|oglink|placesMap|video|oembed|material|sectionTitle|code|formula|schedule|file|audio)$/.test(x)); return k ? k.slice(3) : 'other'; };
        const comps = [...m.querySelectorAll(':scope > .se-component, :scope .se-section-documentTitle ~ .se-component')].filter((c, i, a) => a.indexOf(c) === i);
        const all = comps.length ? comps : [...m.querySelectorAll('.se-component')];
        const seq = [], quotes = [], heads = [];
        let chars = 0;
        for (const c of all) {
          const k = kindOf(c); const t = (c.innerText || '').trim();
          const n = t.replace(/\s/g, '').length;
          if (k === 'quotation') { const st = [...c.classList].find(x => /se-l-/.test(x)) || ''; quotes.push(st.replace('se-l-', '')); if (t) heads.push(t.split('\n')[0].slice(0, 60)); }
          if (k === 'text') { for (const b of c.querySelectorAll('.se-text-paragraph b, .se-text-paragraph strong')) { } }
          seq.push(k === 'text' ? `text:${n}` : k); chars += k === 'text' || k === 'quotation' || k === 'table' ? n : 0;
        }
        const paras = [...m.querySelectorAll('.se-text-paragraph')].map(x => x.innerText.trim());
        const ne = paras.filter(Boolean);
        const cnt = (sel) => m.querySelectorAll(sel).length;
        const classTally = (re) => { const t = {}; for (const s of m.querySelectorAll('.se-text-paragraph span, .se-text-paragraph')) for (const c of s.classList) if (re.test(c)) t[c] = (t[c] || 0) + 1; return t; };
        const colors = {}; for (const s of m.querySelectorAll('.se-text-paragraph span[style*="color"]')) { const c = s.style.color; if (c) colors[c] = (colors[c] || 0) + 1; }
        const bgs = {}; for (const s of m.querySelectorAll('.se-text-paragraph span[style*="background"]')) { const c = s.style.backgroundColor; if (c) bgs[c] = (bgs[c] || 0) + 1; }
        // 큰 글씨 문단(소제목 대용) 추정: fs 클래스가 본문보다 큰 문단
        const bigParas = [...m.querySelectorAll('.se-text-paragraph')].filter(x => /se-fs-fs(2[4-9]|3\d|4\d)/.test(x.innerHTML)).map(x => x.innerText.trim().slice(0, 60)).filter(Boolean);
        const imgs = [...m.querySelectorAll('.se-image img, .se-imageStrip img, .se-imageGroup img')];
        const imgInfo = imgs.map(i => ({ w: i.naturalWidth, h: i.naturalHeight }));
        const align = {}; for (const x of m.querySelectorAll('.se-text-paragraph')) { const a = ([...x.classList].find(c => /align-/.test(c)) || 'left').replace('se-text-paragraph-align-', '') || 'left'; align[a] = (align[a] || 0) + 1; }
        const tags = [...document.querySelectorAll('.post_tag a, .tag_list a, a[href*="Tag"]')].map(a => a.innerText.trim()).filter(t => t.startsWith('#'));
        const titleEl = document.querySelector('.se-title-text, .se-documentTitle .se-text-paragraph');
        const textAll = ne.join('\n');
        return {
          title: titleEl ? titleEl.innerText.trim() : document.title,
          chars, components: seq, n_images: imgs.length, img_sizes: imgInfo.slice(0, 30),
          n_quote: cnt('.se-quotation'), quote_styles: quotes, n_table: cnt('.se-table'), n_hr: cnt('.se-horizontalLine'), n_sticker: cnt('.se-sticker'),
          n_video: cnt('.se-video, .se-oembed'), n_map: cnt('.se-placesMap'), n_link: cnt('.se-oglink'),
          lines: ne.length, empty_lines: paras.length - ne.length, avg_line: Math.round(ne.reduce((a, x) => a + x.length, 0) / Math.max(1, ne.length)),
          align, fonts: classTally(/^se-ff-/), sizes: classTally(/^se-fs-/), colors, highlights: bgs, n_bold: cnt('.se-text-paragraph b, .se-text-paragraph strong, .se-text-paragraph .se-bold'),
          heads, big_paras: bigParas.slice(0, 15), tags: [...new Set(tags)].slice(0, 30),
          opening: ne.slice(0, 4).join(' ').slice(0, 220), closing: ne.slice(-4).join(' ').slice(0, 220),
          text: textAll
        };
      });
      out.push({ url: u, ok: true, ...r });
    } catch (e) { out.push({ url: u, ok: false, err: String(e).slice(0, 160) }); }
    await p.close();
  }
  await b.close();
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
})();
