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
4. **리뷰 사이트를 긁지 않고, 답글을 자동으로 올리지 않는다.** 네이버·카카오는 붙여 넣기, 구글은 공식 API(Google Business Profile) 승인을 받으면 붙인다.
5. **로컬 전용(127.0.0.1:3301), 로그인 없음.** 병원 직원이 다른 기기에서 쓰려면 먼저 로그인·권한을 붙인다.

## 실행·검증
```bash
npm run dev     # http://localhost:3301
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
```

## 커밋 접두어
`reviews:`
