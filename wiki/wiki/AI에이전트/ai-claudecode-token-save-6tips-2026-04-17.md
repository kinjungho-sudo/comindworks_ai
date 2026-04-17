---
title: 클로드 코드 토큰 절약 필승 설정 7가지
category: AI에이전트
tags: [ClaudeCode, 토큰절약, 비용최적화, CLAUDE.md, 컨텍스트관리, 개발도구]
source: https://www.youtube.com/watch?v=gLZ1wJUADqk&t=3s
created: 2026-04-17
expires: 2026-10-17
type: url
---

# 클로드 코드 토큰 절약 필승 설정 7가지

## 핵심 요약
Claude Code Pro 플랜에서 토큰이 빠르게 소진되는 문제를 해결하는 실전 설정 7가지. 핵심은 **Sonnet 모델 고정 + 컨텍스트 정리**. 올바르게 설정하면 같은 예산으로 4~5배 더 사용 가능.

---

## 7가지 절약 설정

### 1. 기본 모델 Sonnet으로 고정 (`settings.json`)
- Opus는 Sonnet보다 **4~5배** 비쌈
- 모르는 사이에 Opus가 실행되면 토큰 폭발
- `/model` 명령어로 현재 모델 확인
- `settings.json`에서 기본값을 Sonnet으로 명시

### 2. 하이브리드 모드 활용 (`/model opusplan`)
- 계획 수립은 Opus (고성능 필요)
- 실제 코드 작성/실행은 Sonnet으로 자동 전환
- 성능과 비용의 최적 균형점

### 3. 컨텍스트 대청소 (`/clear` & `/compact`)
- **`/clear`**: 기능 구현 완료 후 대화 기록 전체 삭제 (가장 강력)
- **`/compact`**: 맥락 유지가 필요할 때 대화를 요약·압축
- 오래된 컨텍스트는 이후 모든 메시지에서 토큰 낭비

### 4. Extended Thinking 비활성화
- Claude의 사고 과정에 최대 **3만 토큰** 소모
- `config` 명령어로 끄거나 예산 상한 낮추기
- 단순 코딩 작업엔 불필요

### 5. 콕 집어 질문하기 (Specific Prompting)
```
❌ "이 코드 개선해줘" → 전체 프로젝트 탐색 → 토큰 폭발
✅ "auth.ts의 login 함수만 봐줘" → 필요 파일만 → 수십 배 절약
```
- 파일명 + 함수명을 명시하면 불필요한 탐색 제거

### 6. MCP 도구 검색 제어
- 사용하지 않는 MCP 도구는 비활성화
- `mcp_tool_search` 기능 조절
- 필요할 때만 수동 선택

### 7. CLAUDE.md vs SKILL.md 분리
- **`CLAUDE.md`** (전역): 항상 로드됨 → **500줄 이하**로 핵심만
- **`SKILL.md`** (작업별): 특정 작업에만 필요한 내용 → 필요 시에만 로드
- 무거운 CLAUDE.md = 매 요청마다 토큰 낭비

---

## 핵심 원칙

> "토큰 절약은 비용 감소뿐 아니라 AI 성능도 함께 향상시킨다."

컨텍스트가 가벼울수록 Claude는 더 정확하게 집중한다.
불필요한 히스토리가 쌓일수록 AI의 집중력이 분산된다.

---

## 빠른 실행 체크리스트

```
□ settings.json에서 기본 모델 → Sonnet 설정
□ 기능 완료 시마다 /clear 실행
□ Extended Thinking 필요 없으면 끄기
□ 질문 시 파일명/함수명 명시 습관화
□ CLAUDE.md 500줄 이하로 다이어트
□ 안 쓰는 MCP 비활성화
```

---

## 관련 페이지
- [[ai-llm-wiki-youtube-2026-04-17]]
- [[ai-danmartell-3levels-ai-2026-04-17]]
- [[na-생각-하네스엔지니어링-2026-04-17]]
