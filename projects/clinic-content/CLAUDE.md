# 병원 블로그·SNS 스튜디오 (clinic-content)
_맥미니 로컬 Next.js 앱 — v0.2 (2026-11-20, 리뷰 앱과 분리)_

> 상위: [../../CLAUDE.md](../../CLAUDE.md) · 사람용 설명: [README.md](README.md) · Next.js 16 규칙: [AGENTS.md](AGENTS.md)
> 자매 앱: [../clinic-reviews/](../clinic-reviews/) (리뷰 관리·홈페이지 리뷰 배지)

## 맡는 일
병원 블로그·SNS 원고의 **발행 전 점검 → 원장님 승인 → 사전심의 심의필 → 게시 기록**, 그리고 **시술가 시세(내부 참고)**.
리뷰·답글·홈페이지 리뷰 배지는 이 앱이 아니라 clinic-reviews가 맡는다.

## 원칙
1. **엔진은 파이썬 스킬, 앱은 화면.** 판단 로직은 `shared/skills/medical-ad-blog`(점검)·`clinic-price-research`(시세)에 있고 앱은 JSON만 읽는다. 규칙을 고칠 때는 스킬을 고친다.
2. **로컬 전용(127.0.0.1:3300), 로그인 없음.** 배포하려면 먼저 인증을 붙인다.
3. **게시는 사람이.** 자동 게시를 붙이려면 SNS 프로젝트의 publish_guard처럼 승인 버전 해시·심의필 확인을 거친다.
4. 승인 관문 규칙은 `src/lib/shared/workflow.ts` 한 곳에만 둔다.
5. 화면 문구는 쉬운 한국어. 병원 실명 비공개 규칙을 지킨다.

## 실행·검증
```bash
npm run dev     # http://localhost:3300
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
```
엔진 회귀 시험: `medad_selftest.py`, `cite_selftest.py`, `price_research.py selftest`.

## 커밋 접두어
`content:`
