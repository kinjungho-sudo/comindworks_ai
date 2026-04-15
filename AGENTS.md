# 코마인드웍스 AI 에이전트 시스템

> Owner: 정호 (코마인드웍스 / Foal AI)
> Updated: 2026-04-15

---

## 디렉토리 구조

```
comindworks-ai/
├── AGENTS.md                        ← 이 파일 — 전체 에이전트 시스템 인덱스
├── .claude/
│   ├── agents/
│   │   └── jarvis.md                ← Jarvis 총괄 오케스트레이터 정의
│   └── skills/
│       ├── blueprint/               ← 에이전트 시스템 설계서 생성
│       │   ├── SKILL.md
│       │   ├── references/          ← document-template, design-principles, example
│       │   └── scripts/             ← validate_blueprint_doc.py
│       ├── deep-dive/               ← 요구사항 심층 인터뷰 → 스펙 문서
│       │   └── SKILL.md
│       ├── autoresearch/            ← 스킬 자동 최적화 (Karpathy 방법론)
│       │   ├── SKILL.md
│       │   └── references/          ← eval, execution, logging, mutation, pipeline, dashboard
│       └── reflect/                 ← 세션 마무리 — 문서 업데이트, 학습 기록, 다음 액션
│           └── SKILL.md
├── workflows/
│   └── n8n/                         ← n8n 워크플로우 export JSON
├── docs/
│   ├── design-docs/                 ← blueprint 스킬 출력 설계서
│   └── exec-plans/                  ← deep-dive 스킬 출력 스펙 문서
└── templates/                       ← 고객 납품용 템플릿
```

---

## 핵심 원칙

1. **설계 먼저**: 모든 새 프로젝트는 `blueprint` 스킬로 설계서 작성 후 코딩 시작
2. **스펙 구체화**: 요구사항 불명확 시 `deep-dive` 스킬로 인터뷰 → 스펙 문서 생성
3. **세션 마무리**: 작업 세션 종료 시 `reflect` 스킬로 문서 업데이트 + 학습 기록
4. **스킬 개선**: 반복 사용하는 스킬은 `autoresearch`로 자동 최적화
5. **State on Disk**: 모든 중간 결과는 파일/Notion에 저장 — 메모리 의존 금지
6. **Mac Mini 중심**: 모든 24시간 자동화는 Mac Mini(n8n)에서 실행

---

## 메타 스킬 워크플로우

```
blueprint → deep-dive → [구현] → autoresearch → reflect
```

| 단계 | 스킬 | 사용 시점 |
|------|------|----------|
| 1. 설계 | `blueprint` | 새로운 에이전트/자동화 시작 시 |
| 2. 스펙 | `deep-dive` | 요구사항 구체화가 필요할 때 |
| 3. 구현 | *(직접 코딩)* | 설계서와 스펙을 바탕으로 시스템 구축 |
| 4. 최적화 | `autoresearch` | 스킬 동작 확인 후 자동 개선 루프 |
| 5. 마무리 | `reflect` | 작업 세션 종료 시 |

**상황별 패턴:**
- 새 프로젝트: `blueprint` → `deep-dive` → 구현 → `autoresearch` → `reflect`
- 중간 기능 추가: `deep-dive` → 구현 → `reflect`
- 스킬 최적화만: `autoresearch` 단독 실행
- 세션 마무리만: `reflect` 단독 실행

---

## 에이전트 군단 현황

### Jarvis — 총괄 오케스트레이터
- **위치**: `.claude/agents/jarvis.md`
- **실행 환경**: Mac Mini, OpenClaw, 텔레그램
- **역할**: 텔레그램 명령 수신 → 에이전트/워크플로우 라우팅 → 결과 보고
- **상태**: Active (24시간 운영)

### 유튜브 파이프라인
- **위치**: `workflows/n8n/youtube-pipeline.json`
- **역할**: RSS 수집 → 대본 생성 → Notion 저장
- **트리거**: 텔레그램 `/youtube` 명령 또는 스케줄
- **상태**: Active

### 뉴스레터 자동화
- **위치**: `workflows/n8n/newsletter-automation.json`
- **역할**: 매일 오전 9시 자동 실행 — 콘텐츠 수집, 초안 생성, Notion 저장
- **트리거**: n8n 스케줄 (매일 09:00)
- **상태**: Active

---

## 기술 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| 실행 허브 | Mac Mini | 24시간 서버, n8n 호스팅 |
| 워크플로우 엔진 | n8n | 자동화 트리거, HTTP 연동, 스케줄 |
| LLM 인터페이스 | OpenClaw (Claude API) | Jarvis 두뇌 |
| 지식베이스 | Notion | 데이터 저장, 콘텐츠 관리 |
| 사용자 인터페이스 | 텔레그램 Bot | 명령 입력, 결과 수신 |
| 개발 환경 | Windows PC + Claude Code | 에이전트 개발 및 스킬 작성 |

---

## 디바이스 역할

| 디바이스 | 역할 |
|---------|------|
| **Mac Mini** | 서버, n8n(포트 5678), OpenClaw/Jarvis 24시간 실행 |
| **메인 PC** | 개발, 영상편집 |
| **교육용 노트북 (Windows)** | Claude Code 개발 작업 (현재 환경) |

---

## 에이전트 추가 프로세스

새 에이전트를 추가할 때 반드시 아래 순서로 진행:

```
1. blueprint 스킬로 설계서 작성 → docs/design-docs/blueprint-[이름].md
2. deep-dive 스킬로 스펙 구체화 (필요시) → docs/exec-plans/spec-[이름].md
3. .claude/agents/[이름].md 에이전트 정의 파일 작성
4. n8n 워크플로우 구현 → workflows/n8n/[이름].json
5. AGENTS.md 업데이트 (이 파일)
6. reflect 스킬로 세션 마무리
```

---

## 향후 로드맵

### Phase 2 — 에이전트 군단 확장
- [ ] **리서치 에이전트**: 특정 주제 자동 리서치 → Notion 보고서
- [ ] **소셜미디어 에이전트**: 트위터/링크드인 자동 포스팅
- [ ] **고객 온보딩 에이전트**: 코마인드웍스 고객 프로젝트 킥오프 자동화

### Phase 3 — Foal AI 플랫폼 연동
- [ ] Foal AI API ↔ Jarvis 양방향 연동
- [ ] 플랫폼 사용자 데이터 기반 자동 리포팅
- [ ] 멀티-테넌트 에이전트 구조 설계
