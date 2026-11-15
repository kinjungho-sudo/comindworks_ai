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

## 폴더 구조

```
vands-busan/
├── CLAUDE.md     ← 이 파일 (프로젝트 규칙)
├── BRAND.md      ← 블로그 브랜드 맥락
├── VOICE.md      ← 블로그 문체
├── README.md     ← 사람용 개요
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
