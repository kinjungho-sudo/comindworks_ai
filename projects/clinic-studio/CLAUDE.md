# 병원 콘텐츠 스튜디오 (clinic-studio)
_맥미니 로컬 Next.js 앱 — v0.1 (2026-11-20)_

> 상위: [../../CLAUDE.md](../../CLAUDE.md) · 사람용 설명: [README.md](README.md) · Next.js 16 규칙: [AGENTS.md](AGENTS.md)

## 원칙
1. **엔진은 파이썬 스킬, 앱은 화면.** 의료광고·GEO·출처·리뷰·시세 판단 로직을 앱에 복제하지 않는다. 고칠 때는 `shared/skills/*/scripts/`를 고치고 앱은 JSON만 읽는다.
2. **로컬 전용(127.0.0.1:3300), 로그인 없음.** 배포하려면 먼저 인증·병원별 권한을 붙인다.
3. **게시는 사람이.** 자동 게시를 붙이려면 SNS 프로젝트의 publish_guard처럼 승인 버전 해시·심의필 확인을 거친다.
4. 화면 문구는 쉬운 한국어. 병원 실명 비공개 규칙이 있는 병원은 지킨다.

## 검증
```bash
npx next typegen && npx tsc --noEmit && npx eslint src && npx next build
```
엔진 회귀 시험: `medad_selftest.py`, `cite_selftest.py`, `review_care.py selftest`, `price_research.py selftest`.

## 커밋 접두어
`studio:`
