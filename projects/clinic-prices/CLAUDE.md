# 시술가 시세 앱 (clinic-prices)
_Vercel 배포 앱 — v0.1 (2026-11-20) · https://clinic-prices.vercel.app_

> 상위: [../../CLAUDE.md](../../CLAUDE.md) · 사람용 설명: [README.md](README.md) · Next.js 16 규칙: [AGENTS.md](AGENTS.md)
> 엔진: [shared/skills/clinic-price-research](../../shared/skills/clinic-price-research/SKILL.md) · 맥미니 조사 버튼: [clinic-content](../clinic-content/) 시세 탭

## 구조
- **조사는 맥미니에서만**(`price_research.py run` 또는 clinic-content의 "새로 조사하기"). 배포 서버는 강남언니에 접속하지 않는다.
- 조사 끝 → 병원 폴더 `data/prices/<날짜>/app.json` → `npm run sync`가 `data/`로 복사 → `npm run publish`(= sync + `vercel deploy --prod`). clinic-content 시세 탭 "배포 앱에 올리기" 버튼이 같은 일을 한다.
- `data/`는 git에 올리지 않는다(원본은 병원 폴더). 배포에는 `.vercelignore` 기준으로 함께 올라간다.

## 원칙
1. **로그인 필수.** 비밀번호 1개(`APP_PASSWORD`) + 서명 쿠키(`AUTH_SECRET`, HMAC). 1차 `src/proxy.ts`, 2차 `src/lib/data.ts`의 `requireLogin()` — 데이터를 읽는 곳마다 둘 다 거친다. 새 페이지·API를 만들면 반드시 `requireLogin()`부터.
2. 비밀값은 Vercel 환경 변수에만. 로컬 `.env.local`(git 제외)에 비밀번호가 있다. 운영 `AUTH_SECRET`은 로컬과 다르다.
3. 검색 차단(robots.txt, X-Robots-Tag noindex), 외부 공유 금지 안내. 다른 병원 가격은 광고·블로그에 쓰지 않는다(의료법 제56조 제2항 제4호).
4. 판단 로직(분류·통계)은 파이썬 엔진에. 앱은 app.json을 보여 주기만 한다.

## 실행·검증·배포
```bash
npm run sync && npm run dev      # http://localhost:3302 (.env.local 필요)
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
npm run publish                  # 운영 배포
```
비밀번호 바꾸기: `npx vercel env rm APP_PASSWORD production` → `npx vercel env add APP_PASSWORD production` → `npm run publish`, 로컬 `.env.local`도 같이.

## 커밋 접두어
`prices:`
