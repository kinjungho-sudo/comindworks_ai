---
name: deep-dive
description: Interview user in-depth to create a detailed spec. Use when the user wants to deeply explore requirements, clarify a task, or create a specification document. Trigger on "/deep-dive", "deep dive", "interview me", "create a spec", "요구사항 정리", "기획서 만들어", or "스펙 작성". Also trigger when the user seems unsure about what they want and needs structured questioning to figure it out — e.g., requests to flesh out an idea, write a PRD, clarify scope, explore edge cases, or when they say things like "I have a rough idea but need to think it through".
---

# deep-dive

An in-depth interview skill that asks non-obvious, probing questions across all dimensions — technical implementation, UI/UX, tradeoffs, concerns, and edge cases — then saves results to a spec document.

**CRITICAL DEFAULT BEHAVIOR**: When an existing spec or planning document is found, you MUST update that document unless the user explicitly requests a new file. Creating a new file when a relevant document already exists is INCORRECT behavior — unless the user overrides this in Step 1. New file creation is the default ONLY when no related document exists at all.

## 코마인드웍스 컨텍스트

인터뷰 진행 시 아래 기술 환경을 기본 전제로 깔고 질문한다:
- 실행 환경: Mac Mini (n8n 상시 운영)
- 연동 허브: Notion, 텔레그램, n8n HTTP 노드
- 사업 도메인: AI 자동화 에이전트 구축/교육, Foal AI 플랫폼
- 저장 원칙: State on Disk (모든 중간 결과는 파일/Notion으로 저장)

기술 스택이 불명확할 때 위 환경을 기본으로 가정하고 확인만 한다.

## Execution Flow

1. Read the user's instructions (topic/goal) from `$ARGUMENTS`
2. Scan the current working directory for existing spec/planning documents
3. **If documents found → present them to the user and confirm which to update**
4. Conduct a multi-round interview using `AskUserQuestion`
5. Save results: update the chosen document (default) or create new only if user requested

---

## Step 1: Understand the Topic & Scan for Existing Document

1. Read the `$ARGUMENTS` to understand what the user wants to spec out. If no argument is given, ask what topic to deep-dive into as the first question.
2. Use `Glob` to scan the current working directory for existing spec or planning documents. Look for patterns such as:
   - `spec-*.md`, `*-spec.md`, `blueprint-*.md`
   - `*기획*.md`, `*설계*.md`, `*planning*.md`, `*PRD*.md`, `*requirements*.md`
   - `docs/design-docs/*.md`, `docs/exec-plans/*.md`
   - `architecture.md`, `roadmap.md`, `overview.md`, `notes.md`
   - Always check `README.md` directly
   - ⚠️ **CLAUDE.md is context-only**: Read it to understand project conventions, but **never include it as an update candidate**
3. If a matching file is found, read it with `Read` to understand its current content.
4. **If no documents found** → skip to Step 2. Decision is implicitly **create new**.
5. **User confirmation (REQUIRED when documents are found)**:
   - Present the candidate document(s) via `AskUserQuestion`
   - **Exclude `CLAUDE.md` from the candidate list**
   - If **one document** found: "I found an existing document: `[filename]`. I'll update this with the interview results. OK? (Type 'new' if you want a separate file instead.)"
   - If **multiple documents** found: "I found these existing documents: [list]. Which one should I update? Or type 'new' to create a fresh spec file."
   - If the user confirms or picks → **update target** (proceed to Step 4a)
   - If the user wants new → **create new** (proceed to Step 4b)
   - ⚠️ This decision is **FINAL** — do not re-evaluate in later steps.

---

## Step 2: Conduct the Interview

Use `AskUserQuestion` to interview the user continuously. Follow these rules:

- **Ask 1–2 questions per round** — never dump many questions at once
- **Build on previous answers first** — follow threads the user signals as important
- **Cover all relevant categories** — skip ones that clearly don't apply
- **Avoid obvious questions** — never ask "what is the goal?" without more depth
- **Hard stop at 8 rounds** — after 8 rounds, stop and proceed to Step 3. Note uncovered areas as open questions.

### Question Categories

Always cover 1, 4, 5. Skip others that don't fit.

1. **Core behavior** *(always)* — What exactly should it do? Happy path and edge cases?
2. **Technical implementation** — Stack, constraints, existing systems? (n8n, Notion, 텔레그램 연동 여부 포함)
3. **UI/UX** *(skip for non-interactive tools)* — What does the user experience look like?
4. **Tradeoffs** *(always)* — What are you willing to sacrifice? Speed vs. accuracy?
5. **Failure modes** *(always)* — What should happen when things go wrong?
6. **Scale & future** — What does "done" look like? What might change later?
7. **Concerns** — What are you most worried about?

---

## Step 3: Save Results — Follow Step 1 Decision

DO NOT re-evaluate. Follow the decision made in Step 1:

- **Update target was chosen** → go to Step 4a (Update)
- **No document found, or user requested new** → go to Step 4b (Create)

⚠️ **HARD RULE**: If an existing document was found AND the user did NOT request a new file, you MUST go to Step 4a.

---

## Step 4a: Update Existing Document

1. The file was already read in Step 1 — use that content.
2. **Pre-merge analysis (REQUIRED):**
   - List every section heading in the existing document
   - Map each interview finding to an existing section
   - Classify each item: **APPEND** / **REVISE** / **NEW_SECTION**
3. **Merge rules:**
   - **APPEND**: Add at the end of the matching section
   - **REVISE**: Replace the outdated content directly — do not keep old text alongside new
   - **NEW_SECTION**: Insert before the last section (before "Open Questions" if it exists)
   - **Untouched content**: Must remain exactly as-is
   - Use `Edit` tool for targeted updates. **Do NOT use `Write` to overwrite the entire file.**
4. Tell the user the filename and summarize what was changed.

---

## Step 4b: Create New Spec File

> ⚠️ Only reach this step if: (a) no existing document was found, OR (b) user explicitly requested new.

- Filename: `docs/exec-plans/spec-[topic-slug].md` (코마인드웍스 디렉토리 구조 기준)
- Format:

```markdown
# Spec: [Topic]

## Overview
[1–2 sentence summary]

## Goals
- ...

## Scope
- In:
- Out:

## Inputs and Outputs
- ...

## Requirements
### Functional
- ...
### Non-functional
- ...

## Technical Notes
- 실행 환경: Mac Mini / n8n / Notion / 텔레그램
- ...

## UI/UX Notes
- ...

## Tradeoffs & Decisions
- ...

## Failure Modes
- ...

## Open Questions
- ...
```

Use `Write` tool to save the file, then tell the user the filename.
