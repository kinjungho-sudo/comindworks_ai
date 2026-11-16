# 새 병원 폴더 만들기

## 폴더 구조

```
<병원 폴더>/
├── BRAND.md            독자·미션·금지 규칙·주제 범위·Taboo phrases
├── VOICE.md            말투
├── medad_local.json    병원별 검사 규칙 (선택, 실명 비공개면 필수)
├── calendars/          발행 일정
├── docs/
│   ├── decisions.md    결정 기록 (한 줄씩 누적)
│   └── reviews/        글마다 검수 기록
└── output/
    └── <날짜>_<슬러그>/
        ├── <슬러그>.md
        ├── images/ (raw/PROVENANCE.md 포함)
        └── src/    (오버레이 HTML, 생성 로그)
```

## 처음에 사용자에게 물을 것

결정은 번호 선택지로 묻는다.

1. **독자**: 누가 읽나? 예: 병원을 찾는 예비 환자
2. **미션**: 이 블로그로 독자에게 무엇을 돕나?
3. **진료 분야와 다룰 주제**: 질환 정보, 시술 설명 등
4. **말투**: 다정한 존댓말 / 차분한 설명체 등. 병원을 어떻게 부를지(예: "저희 병원")
5. **실명 공개 여부**: 비공개면 `medad_local.json`에 실명·지점명·영문 표기를 block 패턴으로 넣는다.
6. **금지할 것**: 기본은 후기, 효과 보장, 최상급, 타 병원 비교다. 더 금지할 것이 있으면 추가한다.
7. **발행 채널**: 네이버 블로그 / 홈페이지 블로그
8. **이미지 도구**: 빠나나 AI / Codex CLI

## BRAND.md 최소 형식

```markdown
# Brand

## Entity
- 이름: 비공개 — 글·이미지·파일명에 병원 실명을 쓰지 않는다   (또는 실제 명칭)

## Audience
...

## Mission
...

## Never do
- 치료경험담·후기 인용
- 효과 보장·최상급 표현
- 다른 병원과의 비교·비방

### Taboo phrases
- 최고
- 유일
- 100%
- 부작용 없음
- 확실한 효과
```

`### Taboo phrases` 아래 목록은 검사기가 그대로 읽어 block으로 잡는다. claude-blog 스킬이 설치돼 있으면 `/blog brand`로 BRAND.md와 VOICE.md를 만들 수 있다.

## medad_local.json

[../assets/medad_local.example.json](../assets/medad_local.example.json)을 복사해서 패턴만 바꾼다. 실명 패턴에는 한글, 영문, 약칭, 띄어쓰기 변형을 모두 넣는다(예: `"V\\s*&\\s*S"`). 만든 뒤 실명이 든 시험 문장을 검사해 block이 나오는지 확인한다.

## 처음 정해 둘 결정 (docs/decisions.md)

[standard.md](standard.md) 7장을 본다. 의학 감수 표기, 진료과목 명칭, 사전심의, 글 끝 안내 범위가 정해지기 전에는 각각 `[원장님 확인: …]` 자리표시로 남긴다.
