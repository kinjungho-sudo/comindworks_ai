# 돌담한방병원 블로그
_프로젝트 규칙 — v0.1 (2026-11-26)_

> 상위 오케스트레이터: [../../CLAUDE.md](../../CLAUDE.md)

## 목적

돌담한방병원(경남 양산, 암재활·암요양 입원 한방병원, https://doldamhospital.co.kr) 블로그 준비.
먼저 벤치마킹할 한방병원·요양병원 블로그를 매일 모아 형식·말투·이미지·트렌드를 배운다.

## 블로그 학습 (2026-11-26 정호님 지시)

- 매일 새벽 예약 작업 `doldam-blog-study-daily`가 키워드 글 30개 + 지정 블로그 새 글을 학습한다. 설정: [blog-study.json](blog-study.json)
- 지정 벤치마킹 블로그(`watch_blogs`): 오쿨리한방병원(ladeover886). 추가는 blog-study.json에 한 줄, 처음 한 번은 `--backfill 30`으로 지난 글까지
- 실행: `python3 ../../shared/skills/blog-study/scripts/study.py blog-study.json` (이 폴더에서, 3~5분)
- 결과: 오늘 `output/blog-study/<날짜>.md`, 누적·트렌드 `docs/research/blog-study-summary.md`, 글쓰기 가이드 `docs/blog-guide.md`
- 다른 병원 글의 문장·이미지는 저장·복사하지 않는다. 형식만 배운다.
- 상위 글에 있는 의료광고 위험 표현은 "따라 하지 말 것"으로만 기록한다.

## 의료광고 주의

- 의료법 제56조: 치료경험담·후기, 효과 보장·최상급, 다른 병원과 비교·비방, 부작용 누락 금지. 암 관련 글은 표준치료(수술·항암·방사선)를 대신한다는 뜻으로 읽히는 문장을 쓰지 않는다.
- 네이버 블로그는 의료광고 사전심의 대상(일평균 이용자 10만 명 이상 매체).
- 검사: `python3 ../../shared/skills/medical-ad-blog/scripts/medad_check.py <원고.md>` — block 0이어야 보여주고 커밋한다.

## 커밋 접두어

`doldam:`
