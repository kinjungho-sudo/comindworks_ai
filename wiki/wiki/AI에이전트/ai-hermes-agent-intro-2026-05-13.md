---
title: "Hermes Agent란 무엇인가 — NousResearch 오픈소스 AI 에이전트 완전 가이드"
category: AI에이전트
tags: [HermesAgent, NousResearch, 오픈소스, AI에이전트, ReAct, MCP, 자동화, 로컬LLM]
source: https://wikidocs.net/334920
created: 2026-05-13
expires: 2027-05-13
type: url
---

# Hermes Agent란 무엇인가

> NousResearch가 MIT 라이선스로 공개한 오픈소스 AI 에이전트. Claude Code와 달리 로컬 LLM부터 OpenAI까지 모든 모델 지원, 19개 메시징 플랫폼 연동, 60개 내장 도구 + 90개 내장 스킬.

---

## 핵심 요약

- **공개일**: 2026년 2월 26일 | **버전**: v0.12.0 (2026-04-30) | **라이선스**: MIT
- **아키텍처**: ReAct 루프 (관찰→추론→행동)
- **모델 지원**: OpenAI / Anthropic / Ollama(로컬) / OpenRouter(200개+) — OpenAI 호환 API 전부 가능
- **기본 모델**: Hermes-3 (Llama 3.1 기반) + Atropos 강화학습

---

## 왜 주목하는가

Claude Code, Cursor 등 상용 에이전트와 달리 **완전 오픈소스**이면서:
1. **로컬 LLM** ($5 VPS에서 Hermes-3 8B 무료 운용 가능)
2. **멀티채널 메시징** 19개 플랫폼 (Telegram, Discord, Slack, WeChat, Teams 등)
3. **스킬 자동 학습** — 대화 후 백그라운드에서 스킬 생성, 7일 주기 자동 정리

---

## 주요 기능

### 60개 내장 도구 + 90개 내장 스킬
- Nous Tool Gateway: 웹 검색, 이미지 생성, TTS 통합
- MCP로 외부 도구 추가 확장 가능

### 자동화 / 크론
- 자연어 스케줄링: "매일 아침 8시에 뉴스 요약" → 크론 자동 등록
- `/goal` 명령: 며칠에 걸친 영속 목표, Ralph loop로 백그라운드 점검

### 메모리 & 스킬 학습
- 대화 기억 → 작업 절차를 스킬로 저장 → 다음 유사 작업에 재사용
- 백그라운드 큐레이터가 7일마다 라이브러리 정리

### TUI & 대시보드
- `hermes --tui`: React/Ink 기반 터미널 UI
- `hermes dashboard`: 로컬 웹 대시보드
- `/fast` 토글: 응답 지연 감소 (Fast Mode)

---

## 실전 활용 사례

| 사례 | 구성 |
|------|------|
| Mac Mini 24시간 AI 비서 | Apple 미리알림·메모·iMessage 연동 + Telegram 원격 지시 |
| 팀 디스코드 봇 | 반복 질문 처리 + 스킬 축적으로 점진적 성능 향상 |
| 매일 뉴스 브리핑 | MCP 검색 API + 자동화된 뉴스레터 발송 |
| $5 VPS 무료 운영 | 로컬 LLM Hermes-3 8B 활용, 비용 제로 |

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 아키텍처 | ReAct 루프 (관찰→추론→행동) + 트랜스포트 추상화 |
| 언어 | Python 91.4%, Shell, JavaScript |
| 라이선스 | MIT |
| 최신 버전 | v0.12.0 (2026-04-30) |

---

## 위키독스 책 목차 (13장 + 부록)

1. Hermes Agent 소개 / 2. 설치 및 환경 설정 / 3. 첫 번째 대화
4. 도구(Tools) 시스템 / 5. 메모리 시스템 / 6. 퍼스널리티와 컨텍스트
7. 스킬 시스템 / 8. MCP 통합 / 9. 메시징 게이트웨이
10. 크론 자동화 / 11. 보안 / 12. 아키텍처 / 13. 실전 프로젝트

---

## 관련 페이지
- [[ai-agentops-2layer-system-2026-04-17]] — 실전 AI 에이전트 운용 2층 시스템
- [[ai-claudecode-800hours-9tips-2026-05-06]] — Claude Code 실전 꿀팁 (비교 관점)
- [[ai-danmartell-3levels-ai-2026-04-17]] — AI 3단계 레벨 (에이전트 위치 파악)
