---
title: Graphify — Claude Code 토큰 27배 절감 (코드베이스 → 지식 그래프) · 카파시 raw-folder 영감 · Obsidian/Neo4j/MCP 동시 출력
category: AI에이전트
tags: [Graphify, ClaudeCode, 지식그래프, 토큰절감, Karpathy, rawfolder, MCPserver, Obsidian, Neo4j, bookzero, EricEngineer, UVinstall, OpenCode]
source: https://youtu.be/HQEm4rBKdec
created: 2026-05-19
expires: 2026-11-19
type: url
---

# Graphify — Claude Code 토큰 27배 절감 도구

## 핵심 요약
**Eric**(ex-Amazon/Microsoft 시니어 AI 엔지니어)이 자신의 실제 SaaS **bookzero.ai**(AI 회계 부기, 100% Claude Code로 구축)에 **Graphify**를 적용해 **Claude Code 토큰 사용량 27배(27x) 절감**. Graphify는 **코드베이스를 구조화된 지식 그래프로 변환** → Claude Code가 매 세션 파일 다시 읽지 않음. **Andrej Karpathy의 raw-folder 워크플로우에서 영감**, 무료.

> **27x 토큰 절감 = Claude Code 사용 비용 1/27** — 1인 창업가 SaaS 운영 비용 구조 자체를 바꿈

이는 [[ai-karpathy-llmwiki-claudecode-2026-04-17]]·[[ai-claudecode-token-save-6tips-2026-04-17]]의 **실증 진화판**.

---

## 1. Graphify가 해결하는 문제

### 기존 Claude Code의 한계
- 매 세션마다 **파일을 다시 읽음**
- 같은 코드베이스라도 컨텍스트 재구축 → 토큰 폭발
- 대규모 SaaS·여러 파일 프로젝트에서 비용 부담 ↑

### Graphify의 해법
- 코드베이스 → **구조화된 지식 그래프**
- Claude Code는 그래프를 참조 → 필요 부분만 정확히 접근
- 결과: **27x 토큰 절감** (실제 프로덕션 데이터)

---

## 2. 주요 기능

| 기능 | 설명 |
|---|---|
| **UV 2분 설치** | Claude Code · Codex · OpenCode · OpenCloud · Hermes 호환 |
| **path 명령어** | 두 파일 간 **최단 연결 경로** 찾기 (예: admin layout → AI chat) |
| **explain 명령어** | 특정 코드 구조 자연어 설명 |
| **query & update** | 그래프에 직접 질의·갱신 |
| **Obsidian export** | 지식 그래프를 Obsidian vault로 변환 (★ LLM Wiki 직접 연동) |
| **다양한 출력** | Obsidian · Wiki · SVG · Neo4j · **MCP server** 모두 생성 가능 |

### 핵심 인사이트: 하나의 그래프에서 여러 형식 생성
- 단일 그래프 → Obsidian (개인 지식)
- → Wiki (팀 문서)
- → SVG (시각화)
- → Neo4j (쿼리)
- → **MCP server** (다른 AI에서 사용)

---

## 3. Eric의 실증 — bookzero.ai

### bookzero.ai의 의미
- **AI 회계 부기 SaaS** — Claude Code로 100% 구축된 실제 프로덕션 서비스
- 1인 창업가의 SaaS = [[biz-comindworks-philosophy-roadmap-2026-05-04]] 3단계 (SaaS 스케일업)의 실증 모델
- → "정말 Claude Code로 SaaS 만들 수 있는가?"에 대한 답

### 영상 타임라인
| 시간 | 내용 |
|---|---|
| 0:00 | Intro |
| 2:22 | Prerequisites (사전 요구사항) |
| 3:07 | Graphify 설치 |
| 4:07 | 코드베이스에서 실행 |
| 5:04 | Extraction Modes |
| 5:52 | 그래프 결과 |
| 7:01 | 인터랙티브 그래프 |
| 7:43 | **path 명령어** (★ 가장 흥미로운 기능) |
| 8:26 | explain 명령어 |
| 9:14 | query & update |
| 9:53 | **Obsidian export** (★ LLM Wiki와 연결) |
| 10:40 | 기타 출력 |
| 11:14 | Outro |

---

## 4. 카파시 영감 — raw-folder 워크플로우

- Andrej Karpathy X 포스트 (id: 2039805659525644595)
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]]의 LLM Wiki 개념을 코드베이스에 적용한 형태
- **raw 파일 → 정제된 지식 그래프** 패턴

---

## 인사이트 (코마인드웍스 사업 연결)

### 1. **즉시 LLM Wiki 본 저장소에 Graphify 시도**
- 우리 LLM Wiki = 마크다운 파일 50+ 개의 지식베이스
- Graphify로 변환 시 **페이지 간 연결 그래프 시각화** 가능
- path 명령어로 "AI에이전트 페이지 → 창업 페이지 최단 경로" 분석 → **교차참조 규칙 자동 검증**
- → 우리 wiki-inspector 스킬에 Graphify 통합 검토

### 2. **27x 토큰 절감 = 코마인드웍스 운영 비용 구조 변화**
- 현재 Claude Code 비용이 가장 큰 운영비
- Graphify 적용 시 **1년 운영비를 며칠치로 압축** 가능
- → 1인 창업가 SaaS의 **경제적 가능성 증명**

### 3. **MCP server 자동 생성 = 코마인드웍스 LLM Wiki를 다른 AI에 노출**
- 우리 LLM Wiki를 MCP server로 만들면 → **ChatGPT·Gemini·Perplexity에서도 우리 자료 사용 가능**
- "코마인드웍스 지식을 어디서든" — 사용자 질문 "Claude 코드에서만 불러올 수 있나?"에 대한 해답
- → 본 저장소를 시범 케이스로 검증

### 4. **bookzero.ai 모델 = 코마인드웍스 3단계 SaaS의 직접 벤치마크**
- 1인 시니어 엔지니어 + Claude Code = 회계 SaaS
- 코마인드웍스 = 같은 패턴으로 "1인 창업가 OS" SaaS 가능
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] 3단계로 가는 길의 살아있는 증거

### 5. **카파시 raw-folder = LLM Wiki 원리 + 코드베이스 확장**
- 우리는 이미 raw → wiki 구조 (source/ → wiki/)
- Graphify 패턴 적용 시 코드베이스도 같은 구조로 변환 가능
- → **"raw-folder의 LLM Wiki 진영" 코마인드웍스 콘텐츠 1편 후보**

### 6. **무료 + 오픈소스 = 진입 장벽 낮음**
- 본 저장소에 즉시 설치 가능 (`uv` 사용)
- 학습 곡선 짧음
- → 이번 주 안에 실험 + 결과를 [[biz-comindworks-philosophy-roadmap-2026-05-04]] "살아낸 이야기" 자산으로 누적

---

## 실천 방법

### 즉시 (이번 주)
1. **Graphify 설치 + 본 저장소 실험** — `uv tool install graphify` 또는 GitHub 클론
2. **path 명령어로 LLM Wiki 페이지 그래프 시각화** — 교차참조 자동 검증
3. **Obsidian export 결과**가 우리 vault와 어떻게 다른지 비교

### 1개월 내
4. **MCP server export** 시도 → 다른 AI(ChatGPT·Gemini)에서 우리 LLM Wiki 사용 가능한지 검증
5. **27x 토큰 절감 측정** — Graphify 전후 비교 데이터 → 콘텐츠 자산
6. **코마인드웍스 3단계 SaaS 후보 결정** — bookzero.ai 같은 도메인 특화 SaaS

### 분기 내
7. Graphify 적용 결과를 **유튜브 콘텐츠 1편**으로 제작 (한국 1인 창업가용)
8. 본 저장소를 **Graphify 기반 다층 지식 시스템**으로 진화

---

## 관련 페이지

- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] ★ — raw-folder 영감 원천
- [[ai-claudecode-token-save-6tips-2026-04-17]] ★ — 토큰 절감 다른 전략들, 본 페이지는 실증
- [[ai-inflearn-obsidian-claudecode-wiki-course-2026-04-29]] — Obsidian 통합, Graphify의 Obsidian export
- [[ai-claudecode-marketing-agent-team-2026-04-18]] — 하네스 95% = Graphify가 자동화하는 영역
- [[ai-claudecode-routines-2026-04-18]] — Routines로 Graphify 정기 실행 자동화
- [[ai-claude-design-prototype-2026-04-23]] — Claude 도구 생태계 확장
- [[ai-claude-live-artifacts-mcp-dashboard-2026-05-03]] — MCP server 연동 사례
- [[ai-joshua-claude-design-system-prd-2026-04-30]] — 디자인 측면 + Graphify는 코드 측면
- [[ai-ai-slop-design-system-prevent-2026-05-19]] — Design.md + Graphify = 시각·구조 양쪽 컨텍스트
- [[ai-agentops-2layer-system-2026-04-17]] — 2층 시스템에 Graphify 추가 가능
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] ★ — 3단계 SaaS의 실증 모델 (bookzero.ai)
- [[biz-danmartell-20-ways-ai-money-2026-05-07]] — S Tier "AI 에이전트 개발"의 도구 기반
- [[biz-creator-saas-1person-2026-04-17]] — 1인 SaaS 사례에 합류

---

## 참고
- [영상 원본](https://youtu.be/HQEm4rBKdec)
- [Graphify GitHub](https://github.com/safishamsi/graphify)
- [Eric 커뮤니티](https://skool.com/erictech)
- bookzero.ai — Eric의 실제 SaaS (AI 회계 부기)
