# V&S 부산 (서면)
_프로젝트 규칙 — v0.1_

> 상위 오케스트레이터: [../../CLAUDE.md](../../CLAUDE.md)
> 자매 프로젝트: [../vands-changwon/](../vands-changwon/), [../vands-centum/](../vands-centum/), [../vands-nampo/](../vands-nampo/)

---

## 목적

밴스의원 부산점(서면)의 블로그 글과 SNS 홍보·병원 마케팅 자료 제작.

## 브랜드 맥락

- [BRAND.md](BRAND.md) — 독자·미션·금지 규칙·주제 범위
- [VOICE.md](VOICE.md) — 말투·문체
- 이 폴더에서 `/blog write` 등을 실행하면 claude-blog 스킬이 두 파일을 자동으로 읽는다.
- 수정은 `/blog brand update`.

## 의료광고 주의

- 치료경험담·후기, 효과 보장·최상급 표현, 타 병원 비교·비방 금지 (BRAND.md Never do).
- 공개 전 의료광고 사전심의 대상 여부를 확인한다.

### 의료광고 사전 검사 (필수)

글을 쓰거나 고칠 때마다, 사용자에게 보여주기 전과 커밋 전에 반드시 실행한다.

```bash
python3 tools/medad_check.py output/<폴더>/<원고>.md
```

- **block 1건 이상(종료 코드 1)**: 고친 뒤 다시 실행한다. block이 남은 원고는 보여주지도 커밋하지도 않는다.
- **warn**: 해당 줄을 읽고 문제없으면 통과. 결과 보고에 warn 목록과 판단 이유를 적는다.
- **수동 확인 항목**은 결과 보고에 그대로 남겨 원장님 확인·사전심의 단계로 넘긴다.
- 규칙은 `tools/medad_rules.json`에서 고친다. 자동 검사는 1차 거름망이며 사전심의·법률 검토를 대신하지 않는다.

## 이미지 제작 (2026-11-15 정호님 지시)

- 블로그 이미지는 **Codex CLI 또는 빠나나AI**로 생성한다. 기본은 빠나나 `GPT Image 2.6 Sunburst`(high·2K, 장당 2.7크레딧).
- AI 이미지에는 글자를 넣지 않는다(`No text, no letters`). 라벨·설명은 `src/*-ai.html`에서 얹어 Chrome으로 PNG 렌더.
- 의학적 위치(시술 깊이 등)는 AI에 맡기지 않고 오버레이로 직접 그린다. AI가 그린 내용은 원고와 육안 대조.
- 원본은 `images/raw/`에, 생성 기록은 `images/raw/PROVENANCE.md`(모델·작업 ID·SHA-256)에 남긴다.
- 실제 인물 사진풍·시술 장면·전후 비교 금지. 일러스트·도식만.

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
