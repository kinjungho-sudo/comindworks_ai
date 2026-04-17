# 코마인드웍스 AI 오케스트레이터
_멀티프로젝트 자동화 허브 — v1.0_

> "각 업무는 독립 프로젝트로, 중앙에서 오케스트레이션"

---

## 역할

이 저장소는 **여러 업무 자동화 프로젝트를 묶는 상위 저장소**이다.
루트 Claude는 **라우터**로서, 입력을 해석해 해당 프로젝트로 위임한다.
구체적인 비즈니스 로직은 각 `projects/*/` 내부에서 수행된다.

---

## 프로젝트 목록

| 프로젝트 | 경로 | 담당 |
|---|---|---|
| LLM Wiki | [projects/llm-wiki/](projects/llm-wiki/) | 자료/생각/일기 수집·분류·검색 |
| LLM Wiki Webapp | [projects/llm-wiki-webapp/](projects/llm-wiki-webapp/) | Wiki 웹 UI (FastAPI + Next.js) |

새 프로젝트 추가 시 위 표에 한 줄 추가.

---

## 라우팅 규칙

### LLM Wiki 트리거
입력이 아래 패턴이면 **[projects/llm-wiki/CLAUDE.md](projects/llm-wiki/CLAUDE.md)** 를 로드해 그 규칙으로 처리:

- `수집 ...`, `일기:`, `생각:`, `경험:`, `회고:`
- `일괄수집`, `일괄 수집` — source/의 미처리 파일을 10개씩 배치 처리
- `wiki-search-collect [주제] [개수]` — 웹 검색 → Wiki 자동 저장
- `질문:`, `? ...`, `뭐 있어?`, `알려줘`, `설명해줘`
- `글쓰기:`, `블로그 글 써줘`, `유튜브 스크립트 써줘`, `SNS 글 써줘`, `초안 작성:`
- `Wiki 점검`, `점검해줘`, `만료 확인`, `모순 확인`

### LLM Wiki Webapp 트리거
웹앱 개발·배포·버그 수정 요청이면 **[projects/llm-wiki-webapp/CLAUDE.md](projects/llm-wiki-webapp/CLAUDE.md)** 의 규칙을 따른다.

- `웹앱 ...`, `백엔드 ...`, `프론트엔드 ...`, `FastAPI`, `Next.js` 관련

### 기타 / 신규 프로젝트
매칭되는 프로젝트가 없으면 사용자에게 어느 프로젝트에 속하는지 확인 요청.

---

## 새 대화 시작 시 자동 현황 보고

대화가 시작되면 **항상 먼저** [projects/llm-wiki/data/index.md](projects/llm-wiki/data/index.md) 와 [projects/llm-wiki/data/log.md](projects/llm-wiki/data/log.md) 를 읽고 아래 형식으로 보고:

```
📚 Wiki 현황 보고
 총 페이지: N개
 이번 주 추가: N개
 만료 예정 (30일 내): N개
 모순 감지: N건 (있다면)
 가장 많이 참조된 페이지: [[페이지명]]

오늘 뭘 할까요?
```

---

## 폴더 구조

```
comindworks_ai/
├── CLAUDE.md                    ← 이 파일 (오케스트레이터)
├── .claude/
│   ├── agents/jarvis.md         ← 마스터 에이전트
│   └── skills/                  ← (루트에서 직접 호출하는 스킬만)
├── projects/
│   ├── llm-wiki/                ← Wiki 프로젝트 (자체 CLAUDE.md, .claude/)
│   └── llm-wiki-webapp/         ← 웹앱 프로젝트 (자체 CLAUDE.md)
├── shared/
│   ├── skills/                  ← 공용 스킬 (git-sync, reflect 등)
│   └── utils/
├── docs/
├── archive/                     ← 과거 자료 보관
└── ppt/
```

### 설계 원칙

1. **각 프로젝트는 독립적으로 실행 가능** — 해당 폴더에서 Claude Code를 띄우면 그 프로젝트 규칙만 로드됨
2. **오케스트레이터는 라우팅만** — 비즈니스 로직 갖지 않음, 각 프로젝트의 CLAUDE.md를 참조
3. **공유는 `shared/`에 명시적으로** — 중복 방지

---

## Git 자동 동기화 규칙

모든 작업 완료 후 아래 순서로 Git 커밋 & 푸시:

```bash
git status
git add .
git commit -m "[타입]: [요약]"
git push origin master
```

### 커밋 메시지 타입
- `feat:` 새 기능 추가
- `fix:` 오류 수정
- `docs:` 문서 수정
- `refactor:` 리팩토링
- `wiki:` Wiki 페이지 추가/수정 (LLM Wiki 프로젝트)
- `chore:` 설정/구조 변경

### Mac Mini 동기화
Mac Mini에서 작업 시작 전:
```bash
git pull origin master
```

---

## 매일 마무리 루틴

사용자가 "오늘 끝", "오늘 마무리", "Day N 끝" 입력 시:
1. 블로그 포스팅 글 생성
2. 유튜브 스크립트 생성
3. 교육용 PPT (vanilla-slides HTML) → [ppt/](ppt/) 에 저장
4. Notion 콘텐츠 아카이브 DB 저장
5. Git 커밋 & push
6. GitHub Pages URL 출력

---

## 글로벌 전략 참조
- 글로벌 개발 전략(Phase 1~6): `~/.claude/CLAUDE.md`
- 과거 설계 문서: [archive/](archive/)
