# 시술가 시세 앱 (clinic-prices)
_Vercel 배포 앱 — v0.2 (2026-11-20, 로그인 없이 공개) · https://clinic-prices.vercel.app_

> 상위: [../../CLAUDE.md](../../CLAUDE.md) · 사람용 설명: [README.md](README.md) · Next.js 16 규칙: [AGENTS.md](AGENTS.md)
> 엔진: [shared/skills/clinic-price-research](../../shared/skills/clinic-price-research/SKILL.md) · 맥미니 조사 버튼: [clinic-content](../clinic-content/) 시세 탭

## 구조
- **조사는 맥미니에서만**(`price_research.py run` 또는 clinic-content의 "새로 조사하기"). 배포 서버는 강남언니에 접속하지 않는다.
- 조사 끝 → 병원 폴더 `data/prices/<날짜>/app.json` → `npm run sync`가 `data/`로 복사 → `npm run publish`(= sync + `vercel deploy --prod`). clinic-content 시세 탭 "배포 앱에 올리기" 버튼이 같은 일을 한다.
- `data/`는 git에 올리지 않는다(원본은 병원 폴더). 배포에는 `.vercelignore` 기준으로 함께 올라간다.

## 원칙
1. **로그인 없이 공개** (2026-11-20 정호님 지시: "패스워드 만들지마 그냥 오픈해"). 비밀번호를 다시 붙이지 않는다.
2. **공개 주소에 병원 실명을 드러내지 않는다.** 주소는 price_watch.json의 `app_slug`(서면 = `seomyeon`)를 쓴다. 화면 문구에도 실명을 넣지 않는다.
3. 검색 차단(robots.txt, X-Robots-Tag noindex), 외부 공유 금지 안내. 다른 병원 가격은 광고·블로그에 쓰지 않는다(의료법 제56조 제2항 제4호).
4. 판단 로직(분류·통계)은 파이썬 엔진에. 앱은 app.json을 보여 주기만 한다.

## 실행·검증·배포
```bash
npm run sync && npm run dev      # http://localhost:3302
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
npm run publish                  # 운영 배포
```

## 커밋 접두어
`prices:`
