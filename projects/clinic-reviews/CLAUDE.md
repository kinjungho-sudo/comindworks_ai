# 병원 리뷰 관리 (clinic-reviews)
_맥미니 로컬 Next.js 앱 — v0.2 (2026-11-20, 블로그·SNS 앱에서 분리)_

> 상위: [../../CLAUDE.md](../../CLAUDE.md) · 사람용 설명: [README.md](README.md) · Next.js 16 규칙: [AGENTS.md](AGENTS.md)
> 자매 앱: [../clinic-content/](../clinic-content/) (블로그·SNS 점검·승인, 시술가 시세)

## 맡는 일
네이버·카카오·구글·강남언니 **리뷰 모으기 → 분류(긴급·불만·질문·칭찬) → 답글 초안 의료법 검사 → 사람이 게시**, 그리고 **홈페이지 리뷰 배지**(평점·리뷰 수·링크만).

## 원칙
1. **엔진은 파이썬 스킬, 앱은 화면.** 분류·답글 검사는 `shared/skills/clinic-review-care/scripts/review_care.py`. 규칙을 고칠 때는 스킬을 고치고 `review_care.py selftest`를 돌린다.
2. **리뷰 원문·닉네임은 개인정보.** 병원 폴더 `data/reviews/`에만 두고 git에 올리지 않는다(.gitignore). 외부 서비스로 보내지 않는다.
3. **리뷰 원문을 홈페이지·블로그·SNS에 싣지 않는다** (치료경험담 광고, 의료법 제56조 제2항 제2호). 배지는 숫자·링크만, 심의기구·변호사 확인 전에는 내려받기 잠금 (`src/lib/shared/badge.ts`).
4. **답글을 자동으로 올리지 않는다. 리뷰 사이트를 정기적으로 긁지 않는다.**
   - 네이버 ① 목록 통째로 붙여 넣기 → `src/lib/shared/naverParse.ts`가 한 건씩 나눔 (시험: `npm test`).
   - 네이버 ② "새 리뷰 가져오기" 버튼(2026-11-20 정호님 선택): 맥미니 크롬 전용 프로필(`~/.clinic-reviews/profiles/<병원>`, 저장소 밖)로 **우리 병원 스마트플레이스 리뷰 화면 1장**만 읽는다. 사람이 누를 때만, 10분에 한 번 이하, 클릭·입력·답글 없음. 로그인은 사람이 창에서 직접(비밀번호를 다루지 않음). 네이버 약관상 자동 접속 제한이 있어 계정 제재 위험을 화면에 알린다. 예약 자동 실행으로 바꾸지 않는다.
   - 두 방법 모두 결과는 **미리보기에서 사람이 확인·수정한 뒤** 저장한다. 화면 구조가 바뀌어 잘못 나뉘면 `naverParse.ts`를 고치고 시험에 사례를 추가한다.
   - 카카오는 붙여 넣기, 구글은 공식 API(Google Business Profile) 승인을 받으면 붙인다.
5. **로컬 전용(127.0.0.1:3301), 로그인 없음.** 병원 직원이 다른 기기에서 쓰려면 먼저 로그인·권한을 붙인다.

## 실행·검증
```bash
npm run dev     # http://localhost:3301
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
```

## 커밋 접두어
`reviews:`
