# 병원 콘텐츠 스튜디오 (clinic-studio)

병원 블로그·SNS 원고의 **발행 전 점검 → 원장님 승인 → 사전심의 → 게시 기록**, **리뷰 관리**, **홈페이지 리뷰 배지**, **시술가 시세**를 한 화면에서 다루는 맥미니 로컬 앱.

## 실행

```bash
cd projects/clinic-studio
npm install        # 처음 한 번
npm run dev        # http://localhost:3300
```

맥미니에서만 열린다(127.0.0.1). 로그인이 없으므로 외부에 공개하거나 Vercel에 배포하지 않는다.

## 무엇을 하나

| 메뉴 | 하는 일 | 쓰는 엔진 |
|---|---|---|
| 원고 · 점검 · 승인 | `output/<날짜>_*/*.md` 원고 목록, 발행 전 점검(의료광고·GEO·출처), 승인 단계 기록 | `shared/skills/medical-ad-blog/scripts/final_check.py` |
| 리뷰 관리 | 리뷰 붙여 넣기 → 긴급·불만·질문·칭찬 분류 → 답글 초안 의료법 검사 → 게시 표시 | `shared/skills/clinic-review-care/scripts/review_care.py` |
| 홈페이지 리뷰 배지 | 채널별 평점·리뷰 수 + 장소 링크만 담은 HTML 조각 (리뷰 원문 없음) | 앱 안 (`src/lib/shared/badge.ts`) |
| 시술가 시세 (내부) | 강남언니 이벤트가 보고서 보기, 사람이 눌러서 새 조사 | `shared/skills/clinic-price-research/scripts/price_research.py` |

## 지키는 규칙 (코드에 걸려 있음)

- **승인 관문** (`src/lib/shared/workflow.ts`): 점검 통과 + 점검 뒤 원고 그대로 + `[원장님 확인]` 0곳이어야 승인. 네이버·인스타·유튜브 등은 **심의필 번호**가 있어야 게시 기록(의료법 제57조·시행령 제24조). 승인 뒤 원고가 바뀌면 다시 점검.
- **게시는 사람이**: 앱은 게시 묶음(미리보기·붙여 넣을 본문)과 기록만. 자동 게시 없음.
- **리뷰**: 원문·닉네임은 병원 폴더 `data/reviews/`(git 제외). 답글 검사에서 block이 있으면 "올렸음 표시" 불가. 리뷰 원문은 홈페이지·블로그로 옮기지 않는다(제56조 제2항 제2호).
- **배지**: 심의기구·변호사 확인 체크 전에는 HTML 내려받기 잠김.
- **시세**: 한 번에 하나, 버튼을 눌렀을 때만. 내부 참고용.

## 데이터 위치 (병원 폴더 기준)

| 파일 | 내용 | git |
|---|---|---|
| `data/approvals.json` | 원고별 점검·승인·심의필·게시 기록 | 올림 |
| `data/review_badge.json` | 배지 숫자·링크·법률 확인 | 올림 |
| `data/reviews/*.csv` | 리뷰 원문·답글 (앱에서 넣은 것은 `inbox.csv`) | **제외** |
| `docs/reviews/<날짜>_<원고>_final-check.md`, `_sources.md` | 점검 보고서·출처 대조표 | 올림 |
| `data/prices/_run.*` | 시세 조사 실행 상태·로그 | 제외 |

병원 폴더는 `projects/` 안에서 `price_watch.json`·`review_watch.json`·`tools/medad_check.py` 중 하나가 있으면 자동으로 잡힌다.
