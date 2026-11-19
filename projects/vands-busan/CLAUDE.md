# 서면 피부과 블로그
_프로젝트 규칙 — v0.1_

> 상위 오케스트레이터: [../../CLAUDE.md](../../CLAUDE.md)
> 자매 프로젝트: [../vands-changwon/](../vands-changwon/), [../vands-centum/](../vands-centum/), [../vands-nampo/](../vands-nampo/)

---

## 목적

서면 피부과(실명 비공개)의 블로그 글과 SNS 홍보·병원 마케팅 자료 제작.

## 브랜드 맥락

- [BRAND.md](BRAND.md) — 독자·미션·금지 규칙·주제 범위
- [VOICE.md](VOICE.md) — 말투·문체
- 이 폴더에서 `/blog write` 등을 실행하면 claude-blog 스킬이 두 파일을 자동으로 읽는다.
- 수정은 `/blog brand update`.

## 품질 기준서 (필수)

- 글을 쓰기 전에 [docs/blog-standard.md](docs/blog-standard.md)를 따른다. 통과 기준: `tools/medad_check.py` block 0 → `tools/geo_check.py` 85점 이상 → 독자·심의 시뮬레이션 반영.
- 검수 기록은 `docs/reviews/<날짜>_<슬러그>.md`에 남긴다.
- **발행 전 마무리 점검(한 번에):** `python3 ../../shared/skills/medical-ad-blog/scripts/final_check.py output/<폴더>/<원고>.md` → 의료광고·GEO·출처(문헌 실재·서지·인용 번호) 검사 + `docs/reviews/<날짜>_<원고>_final-check.md`·`_sources.md`(본문 문장↔실제 초록 대조표). 대조표는 심의 시뮬레이션 에이전트가 채운다.

## 실명 비공개 (2026-11-16 정호님 지시)

- 글·이미지·파일명·frontmatter에 병원 실명과 지점명을 쓰지 않는다. 병원은 "저희 병원"으로만 지칭.
- 검사기 `N-realname` 규칙이 실명을 block으로 잡는다.

## 의료광고 주의

- 치료경험담·후기, 효과 보장·최상급 표현, 타 병원 비교·비방 금지 (BRAND.md Never do).
- 공개 전 의료광고 사전심의 대상 여부를 확인한다. **네이버 블로그·인스타그램·유튜브는 심의 대상**(일평균 이용자 10만 명 이상 매체, 의료법 제57조 제1항·시행령 제24조), 병원 자체 홈페이지는 대상 아님(제56조 금지 내용은 적용). 채널별 표: `../../shared/skills/medical-ad-blog/references/medical-ad-law.md` 3장.
- 법 근거는 기억이 아니라 원문으로 말한다. 검사 결과에 조문 원문이 함께 찍힌다. 법 개정 확인: `python3 ../../shared/skills/medical-ad-blog/scripts/law_sync.py --check` (월 1회·큰 발행 전).

### 의료광고 사전 검사 (필수)

글을 쓰거나 고칠 때마다, 사용자에게 보여주기 전과 커밋 전에 반드시 실행한다.

```bash
python3 tools/medad_check.py output/<폴더>/<원고>.md
```

- **block 1건 이상(종료 코드 1)**: 고친 뒤 다시 실행한다. block이 남은 원고는 보여주지도 커밋하지도 않는다.
- **warn**: 해당 줄을 읽고 문제없으면 통과. 결과 보고에 warn 목록과 판단 이유를 적는다.
- **수동 확인 항목**은 결과 보고에 그대로 남겨 원장님 확인·사전심의 단계로 넘긴다.
- 규칙은 `tools/medad_rules.json`에서 고친다. 자동 검사는 1차 거름망이며 사전심의·법률 검토를 대신하지 않는다.
- 규칙을 고친 뒤에는 `python3 tools/medad_selftest.py`(회귀 시험 64문장)가 전부 맞아야 한다. 새로 놓친 표현은 `tools/medad_cases.json`에 추가.

### 시뮬레이션 검수 (2026-11-17 정호님 지시, 글마다)

검사기 통과 후, 원고만 넘겨 **별도 에이전트 2개를 동시에** 돌린다(내 결론은 넘기지 않음).
1. **독자 시뮬레이션**: 서로 다른 예비 고객 4명(나이·고민·읽는 방식·검색 유입) — 답 못 받은 질문, 헷갈린 말, 이탈 지점
2. **심의 시뮬레이션**: 의료광고심의위원회 관점 — 위험 문장, 누락 정보, **인용 문헌이 본문 주장을 실제로 받치는지** 원문 대조
- 반영 시 새 의학 사실은 출처 없이 쓰지 않는다. 병원이 정할 내용은 `[원장님 확인: …]` 자리표시로 남긴다(검사기가 warn으로 잡음).

## 이미지 제작 (2026-11-15 정호님 지시)

- 블로그 이미지는 **Codex CLI 또는 빠나나AI**로 생성한다. 기본은 빠나나 `GPT Image 2.6 Sunburst`(high·2K, 장당 2.7크레딧). 빠나나 연결이 끊기면 `codex exec -s workspace-write -C <글 폴더>`로 내장 image_generation 사용.
- AI 이미지에는 글자를 넣지 않는다(`No text, no letters`). 라벨·설명은 `src/*-ai.html`에서 얹어 Chrome으로 PNG 렌더.
- 의학적 위치(시술 깊이 등)는 AI에 맡기지 않고 오버레이로 직접 그린다. AI가 그린 내용은 원고와 육안 대조.
- 원본은 `images/raw/`에, 생성 기록은 `images/raw/PROVENANCE.md`(모델·작업 ID·SHA-256)에 남긴다.
- 실제 인물 사진풍·시술 장면·전후 비교 금지. 사람은 수채화 일러스트로만, 아래에 "AI로 만든 일러스트이며 실제 환자가 아닙니다" 표기(기준서 4장).

## 시술가 조사 (2026-11-19)

- 주변 피부과 이벤트 가격은 `clinic-price-research` 스킬로 조사한다. 설정 [price_watch.json](price_watch.json), 보고서 `output/prices/<날짜>_price-report.html`.
- 실행: `python3 ../../shared/skills/clinic-price-research/scripts/price_research.py run price_watch.json` (10~15분, 사람이 요청할 때만).
- **내부 참고용.** 조사한 타 병원 가격을 블로그·SNS·광고 원고에 넣지 않는다.

## 폴더 구조

```
vands-busan/
├── CLAUDE.md     ← 이 파일 (프로젝트 규칙)
├── BRAND.md      ← 블로그 브랜드 맥락
├── VOICE.md      ← 블로그 문체
├── README.md     ← 사람용 개요
├── tools/        ← 의료광고 사전 검사기 (medad_check.py · medad_rules.json)
├── calendars/    ← 발행 일정
├── docs/         ← 기획·조사·회의 메모
├── data/         ← 원본 자료, 입력 데이터
└── output/       ← 산출물 (글·이미지·리포트)
```

## 작업 규칙

1. 산출물은 `output/`, 원본 자료는 `data/`, 문서는 `docs/`에 둔다.
2. 결정 사항은 `docs/decisions.md`에 한 줄씩 누적 기록.
3. 작업 완료 후 루트 규칙대로 Git 커밋 & 푸시.

## 커밋 접두어

`vands:` — 이 프로젝트 관련 변경
