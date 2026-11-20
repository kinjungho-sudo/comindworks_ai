# 병원 리뷰 관리 (clinic-reviews)

리뷰를 붙여 넣으면 **긴급·불만·질문·칭찬**으로 나누고, 답글 초안을 **의료법(제19조 진료 정보, 제27조 제3항 유인, 제56조 광고)**으로 검사하고, 홈페이지에 붙일 **리뷰 배지(평점·리뷰 수·링크만)**를 만드는 맥미니 로컬 앱. 블로그·SNS는 [clinic-content](../clinic-content/)에서 다룬다.

```bash
cd projects/clinic-reviews
npm install        # 처음 한 번
npm run dev        # http://localhost:3301
```

| 메뉴 | 하는 일 | 엔진 |
|---|---|---|
| 리뷰 관리 | 붙여 넣기(한 건·CSV) → 분류 → 답글 틀·검사 → "플랫폼에 올렸음" 표시 | `shared/skills/clinic-review-care/scripts/review_care.py` |
| 네이버 리뷰 가져오기 | ① 스마트플레이스 리뷰 목록 통째로 붙여 넣기 ② "새 리뷰 가져오기" 버튼(맥미니 크롬, 10분에 한 번) → 미리보기 확인 → 저장 | 앱 안 `src/lib/shared/naverParse.ts`, `scripts/naver_browser.mjs` |
| 홈페이지 리뷰 배지 | 채널별 평점·리뷰 수·장소 링크 HTML 조각 (원문 없음, 법률 확인 전 내려받기 잠금) | 앱 안 `src/lib/shared/badge.ts` |

- 데이터: 병원 폴더 `data/reviews/*.csv`(리뷰 원문, **git 제외**, 앱에서 넣은 것은 `inbox.csv`), `data/review_badge.json`(배지 숫자·링크).
- 리뷰 원문은 홈페이지·블로그·SNS로 옮기지 않는다. 답글은 사람이 플랫폼에서 직접 올린다.

## 네이버 ② 처음 설정
1. 스마트플레이스 관리자 화면에서 **리뷰** 메뉴를 열고 주소창의 주소를 복사해 앱에 저장.
2. "처음 한 번: 로그인 창 열기" → 맥미니에 뜬 크롬 창에서 직접 네이버 로그인 → 창 닫기. (로그인 정보는 `~/.clinic-reviews/profiles/`에만 남고 저장소에 올라가지 않음)
3. "새 리뷰 가져오기" → 미리보기 확인 → 저장. 로그인이 풀리면 2번을 다시.
