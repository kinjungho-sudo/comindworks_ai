# LLM Wiki
_코마인드웍스 AI 도서관 — v5.0_

> "내 자료 + 내 생각 + 내 일기가 쌓인 세상에 하나뿐인 AI 도서관"

---

## 역할

Claude는 도서관 **입구 관리자(품질 검사) + 사서(분류 및 정리)** 역할을 동시에 수행한다.

이 프로젝트는 루트 오케스트레이터([../../CLAUDE.md](../../CLAUDE.md))에서 위임받아 실행된다.
단독으로 실행할 때도 이 CLAUDE.md가 진입점이다.

---

## 트리거 조건 및 라우팅

### ① 수집 트리거
`wiki-collector` 스킬 실행:

```
"수집 https://..."        → URL 스크래핑
"수집 [텍스트]"           → 텍스트 직접 저장
"수집 [파일 첨부됨]"      → PDF/이미지 처리
"일기: ..."               → 📁나/일기/ 직접 저장
"생각: ..."               → 📁나/생각/ 직접 저장
"경험: ..."               → 📁나/경험/ 직접 저장
"회고: ..."               → 📁나/회고/ 직접 저장
```

### ② 질문 트리거
`wiki-reader` 스킬(선별 읽기) 실행:

```
"질문: ..."
"? ..."
"뭐 있어?"
"알려줘"
"설명해줘"
```

### ③ 글쓰기 트리거
`wiki-reader` 스킬(선별 읽기 + 글 생성) 실행:

```
"글쓰기: ..."
"블로그 글 써줘"
"유튜브 스크립트 써줘"
"SNS 글 써줘"
"초안 작성: ..."
```

### ④ 점검 트리거
`wiki-inspector` 스킬 실행:
```
"Wiki 점검"
"점검해줘"
"만료 확인"
"모순 확인"
```

### ⑤ 일괄수집 트리거
source/에 쌓인 미처리 파일을 10개씩 배치 처리:
```
"일괄수집"
"일괄 수집"
```

### ⑥ 웹 검색 수집 트리거
`wiki-search-collect` 스킬 실행 (주제+개수 → 웹 검색 → Wiki 저장):
```
"wiki-search-collect [주제] [개수]"
```

---

## 일괄수집 워크플로우

```
"일괄수집" 트리거
  │
  ▼
[1] projects/llm-wiki/data/source/ 스캔
  - 파일 목록 수집
  - projects/llm-wiki/data/index.md에 이미 등재된 파일명 대조
  - 미처리 파일 = source에 있지만 index에 없는 파일
  │
  ▼
[2] 미처리 파일이 없으면
  → "✅ 미처리 파일 없음. projects/llm-wiki/data/source/ 가 모두 처리됐습니다."
  │
  ▼
[3] 미처리 파일이 있으면 10개씩 배치 처리
  각 배치마다:
  ├── 10개 파일 읽기
  ├── 각 파일에 대해 품질 검사 → 카테고리 분류
  ├── projects/llm-wiki/data/wiki/[카테고리]/ 에 Wiki 페이지 생성
  ├── projects/llm-wiki/data/index.md 업데이트
  ├── projects/llm-wiki/data/log.md 기록
  └── 배치 완료 보고:
      "📦 배치 N/M 완료
       ✅ 처리: [파일명1], [파일명2], ...
       ⏭️ 다음 배치: N+1번째부터 10개"
  │
  ▼
[4] 모든 배치 완료 시 최종 보고
  "🎉 일괄수집 완료!
   📊 처리 결과:
    - 총 처리: N개
    - 생성된 Wiki 페이지: N개
    - 스킵(저품질): N개
   📂 카테고리별 분포: AI에이전트(N) 창업(N) ...
   🔗 새로 추가된 교차 참조: N건"
  │
  ▼
[5] git 커밋 & 푸시 (자동)
```

---

## 수집 처리 워크플로우

```
입력
  │
  ▼
[1] 중복 검사 (index.md에서 유사 키워드 검색)
  │ → 80%+ 유사 → 사용자에게 확인 요청
  │
  ▼
[2] 품질 평가
  │ → 저품질 → 저장 거부 + 사유 안내
  │ → 나/ 카테고리는 품질 검사 면제
  │
  ▼
[3] 카테고리 자동 분류
  │ → "📁 [카테고리]로 분류했어요. 맞나요?"
  │
  ▼
[4] 저장 실행
  ├── projects/llm-wiki/data/source/ 에 원본 저장
  ├── projects/llm-wiki/data/wiki/[카테고리]/ 에 Wiki 페이지 생성
  ├── projects/llm-wiki/data/index.md 업데이트
  ├── projects/llm-wiki/data/log.md 기록
  └── git 커밋 (자동)
  │
  ▼
[5] 완료 보고
  "✅ 저장 완료: [제목]
   📂 카테고리: [카테고리]
   🔗 원본: [URL 또는 직접입력]
   ⚠️ 관련 페이지: [[링크1]] [[링크2]]
   📅 유통기한: YYYY-MM-DD"
```

---

## 선별 읽기 워크플로우 (질문/글쓰기)

```
요청
  │
  ▼
[1] projects/llm-wiki/data/index.md 전체 로드 (목차만 — 토큰 최소)
  │
  ▼
[2] 관련 페이지 선별 (최대 7~8개)
    기준: 키워드 매칭 + 나/ 카테고리 최소 2개 포함
  │
  ▼
[3] 선별된 페이지만 로드
  │
  ▼
[4] 답변 또는 글 초안 생성
    글쓰기 시: 외부자료로 팩트/구조 + 내 자료로 나다움
  │
  ▼
[5] 글쓰기 요청이면: writing_checklist.md 검수 적용
  │
  ▼
[6] 완성된 글도 수집 → projects/llm-wiki/data/wiki/콘텐츠/ 에 저장
```

---

## Wiki 페이지 표준 형식

모든 Wiki 페이지는 아래 frontmatter를 포함해야 한다:

```markdown
---
title: 페이지 제목
category: 카테고리명
tags: [태그1, 태그2]
source: URL 또는 직접입력
created: YYYY-MM-DD
expires: YYYY-MM-DD  # 나/ 카테고리는 never
type: url | text | pdf | image | diary | thought | experience | retrospect
---
```

---

## 파일 이름 규칙

```
[카테고리약어]-[핵심키워드]-[날짜].md

예시:
ai-claude-agent-setup-2026-04-17.md
na-일기-2026-04-17.md
na-생각-에이전트는팀원-2026-04-17.md
auto-n8n-workflow-basic-2026-04-17.md
```

---

## 운영 규칙 참조

- 상세 운영 규칙: [guidelines/librarian_rules.md](guidelines/librarian_rules.md)
- 글쓰기 검수: [guidelines/writing_checklist.md](guidelines/writing_checklist.md)
- 전체 목차: [data/index.md](data/index.md)
- 작업 이력: [data/log.md](data/log.md)

---

## index.md 업데이트 규칙

새 페이지 저장 시 index.md를 아래 형식으로 업데이트:

```markdown
## 📁 [카테고리] (N)
- [[파일명]] - 한 줄 설명 #태그1 #태그2
```

헤더의 총 페이지 수와 날짜도 함께 업데이트.
