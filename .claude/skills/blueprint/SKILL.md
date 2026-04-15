---
name: blueprint
description: Agentic system design blueprint generator. Interviews the user to understand a task they want to automate, then produces a comprehensive integrated design document (.md file) that serves as a concrete implementation plan for Claude Code. The design document includes task context, workflow definition with LLM vs code boundaries, and implementation spec (folder structure, agent architecture, skills/scripts list, sub-agent design). Trigger on "/blueprint", "blueprint", "에이전트 설계", "설계서 만들어", "agentic workflow design", or any request to design/plan an agent or automation system. Use this skill whenever the user mentions automation design, workflow planning, agent architecture, system blueprinting, multi-step AI workflow planning, or wants to structure any complex task into an agentic system — even if they don't explicitly say "blueprint".
---

# Blueprint

## Overview

Conduct a structured interview to understand the user's automation task, then generate a complete agentic system design document. The deliverable is a single `.md` file ready for use as an implementation reference in Claude Code.

## Before Starting

**Read both reference files before doing anything else.** They contain the document structure and design rules you'll apply in Phase 2. Skip them and the output will be incomplete.

1. Read `references/document-template.md` — the full section-by-section template for the output file
2. Read `references/design-principles.md` — design rules for agent structure, validation, data transfer, skill vs sub-agent
3. *(Optional)* Skim `references/example-blueprint.md` — a fully annotated sample blueprint document for calibration

## 코마인드웍스 설계 컨텍스트

인터뷰 전 아래 기술 환경을 기본 컨텍스트로 인식하고 설계에 반영한다:

- **실행 허브**: Mac Mini (n8n, OpenClaw/Jarvis 24시간 상시 운영)
- **워크플로우 엔진**: n8n (자동화 트리거, 스케줄, HTTP 연동)
- **지식베이스**: Notion (데이터 저장, 콘텐츠 관리)
- **인터페이스**: 텔레그램 (Jarvis 명령/보고 채널)
- **개발 환경**: Windows PC + Claude Code
- **상태 저장 원칙**: 모든 중간 결과는 파일로 저장 (State on Disk)
- **주요 사업 도메인**: AI 자동화 에이전트 구축 및 교육 (코마인드웍스), AI 도구 플랫폼 (Foal AI)

## Workflow

### Phase 1: Assess & Interview

Evaluate user input against these four areas. **Ask only about gaps.** If all areas are sufficiently clear, skip directly to Phase 2.

| Area | What to assess | Example question |
|------|---------------|------------------|
| **Goal & success criteria** | Is the ultimate goal clear? Can success/failure be judged? | "어떤 결과가 나와야 이 에이전트가 성공했다고 볼 수 있나요?" |
| **Task procedure** | Are input→output steps defined? Are branch conditions known? | "A 이후 B로 갈지 C로 갈지는 어떤 기준으로 판단하나요?" |
| **Agent organization** | Single vs multi-agent preference? Any clear role separations? | "하나의 에이전트가 순차 처리하면 되나요, 아니면 분리할 역할이 있나요?" |
| **Tools & tech** | n8n/Notion/텔레그램 연동 여부? 외부 API? | "n8n 워크플로우로 트리거할 건가요, 아니면 Claude Code에서 직접 실행할 건가요?" |

**Interview rules:**
- Questions must be specific and probing, never generic or formulaic
- If user says "모르겠다" or "알아서 해줘": apply reasonable defaults, state your choice and reasoning, ask only for unavoidable decisions
- Group related questions — never ask more than 3 questions per turn
- 코마인드웍스 스택(n8n, Notion, 텔레그램)을 기본으로 가정하고 확인만 한다

### Phase 2: Generate Design Document

Once requirements are clear, map interview findings to document sections before writing:

| Interview finding | → Document section |
|---|---|
| Why this is needed, what problem it solves | § 1. 작업 컨텍스트 › 배경 및 목적 |
| What's in scope / out of scope | § 1. 작업 컨텍스트 › 범위 |
| Input format, output format, trigger | § 1. 작업 컨텍스트 › 입출력 정의 |
| Technical constraints, API limits | § 1. 작업 컨텍스트 › 제약조건 |
| Step-by-step process, branching logic | § 2. 워크플로우 정의 |
| What the agent decides vs what code handles | § 2. LLM 판단 vs 코드 처리 구분 |
| What tools/APIs are used | § 3. 스킬/스크립트 목록 |
| Single vs multi-agent preference | § 3. 에이전트 구조 |
| Failure conditions, retry expectations | § 2. 단계별 상세 › 실패 시 처리 |

Fill every section using the template in `references/document-template.md`. Apply design rules from `references/design-principles.md`.

Save as `docs/design-docs/blueprint-<task-name>.md`.

**Output rules:**
- CLAUDE.md, AGENT.md, skill file contents are **NOT written** — only their names and roles
- Implementation spec covers structure and responsibilities, not code or prompts
- Every workflow step must have: success criteria, validation method, failure handling
- **Always include a "스킬 생성 규칙" section** in every blueprint document. All skills defined in this document must be created via `skill-creator` at implementation time — direct manual authoring of SKILL.md is prohibited (see `references/design-principles.md` › Skill Creation Standards for the exact section text). The document **must contain the literal string `skill-creator`** — the structural validator checks for this and will fail without it.

**Completeness check before saving** — confirm each item is filled:
- [ ] Every workflow step has success criteria + validation method + failure handling
- [ ] LLM vs script responsibility table is filled
- [ ] Folder structure is defined
- [ ] "스킬 생성 규칙" section is present and mentions `skill-creator`
- [ ] No table cell left blank or "TBD"

### Phase 2.5: Validate Document

After saving, run the structural validation script before presenting the document to the user.

```bash
# 프로젝트 로컬 스킬 기준:
python .claude/skills/blueprint/scripts/validate_blueprint_doc.py ./docs/design-docs/blueprint-<task-name>.md

# 글로벌 설치 기준:
python ~/.claude/skills/blueprint/scripts/validate_blueprint_doc.py ./docs/design-docs/blueprint-<task-name>.md
```

If validation fails, fix the document and run again. This script checks structure only (required sections, step fields, and implementation/workflow section presence) — it does not check content quality.

If the script is not found, skip script validation and manually verify the Phase 2 completeness checklist instead.

### Phase 3: Review

After presenting the document, summarize the key design decisions made during the interview:

- Agent structure choice (single vs multi) and the reason
- Any tradeoffs locked in (e.g., "LLM judges step X because rule-based detection was too fragile")
- Any constraints that shaped the design
- n8n 트리거 방식 및 코마인드웍스 스택 연동 포인트

Then ask: "Do these decisions match your intent? Let me know if there's anything you'd like to change."

Apply any requested changes and re-confirm.

## References

- **`references/document-template.md`**: Full template for the output design document (all sections, formats, tables)
- **`references/design-principles.md`**: Design rules for folder structure, agent architecture, validation patterns, failure handling, data transfer, and skill vs sub-agent distinctions
- **`references/example-blueprint.md`**: Annotated sample blueprint for calibration
