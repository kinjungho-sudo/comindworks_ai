# 시술가 시세 앱 (clinic-prices)
_Vercel 배포 앱 — v0.3 (2026-11-20, 단가 비교·우리 병원 순위·그래프) · https://clinic-prices.vercel.app_

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
4. 수집·시술 분류·통계는 파이썬 엔진에. 앱은 **같은 기준끼리 단가 비교**만 한다(`src/lib/compare.ts`):
   - 샷·cc·유닛: 단가 + 흔한 용량 환산 / 회 시술: 얼굴 전체·한 부위·범위 표기 없음 1회 / 보톡스: 주름 1부위·사각턱 1회
   - 병원마다 그룹 안 최저 단품 옵션 1개(체험가·패키지 제외), 중앙값의 30% 미만은 "미끼가 의심"으로 따로.
   - 분류가 틀린 옵션을 찾으면 FACE·PART 정규식을 고치고 데이터로 다시 확인한다.
5. 우리 병원: 강남언니 병원 이름을 고르거나 시술별 단가를 직접 입력 → 순위. **브라우저(localStorage)에만** 저장, 서버로 보내지 않는다.
6. 그래프 색: 다른 병원 파랑(#2a78d6/#3987e5), 우리 병원 주황(#eb6834/#d95926) — dataviz 검증기 통과. 우리 병원은 색과 함께 "우리" 글자로도 표시.

## 실행·검증·배포
```bash
npm run sync && npm run dev      # http://localhost:3302
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
npm run publish                  # 운영 배포
```

## 커밋 접두어
`prices:`
