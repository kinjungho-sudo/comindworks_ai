---
title: Hermes 에이전트로 나만의 AI 직원 팀 만들기! — Workspace + 공유 메모리 + LLM Wiki 멀티에이전트 (시청 필요)
category: AI에이전트
tags: [HermesAgent, NousResearch, AI직원팀, Workspace, 공유메모리, 서브에이전트, LLMWiki, 업무자동화, 시청필요]
source: https://youtu.be/CmHhhT_Xt8M
created: 2026-06-14
expires: 2026-12-14
type: url
---

# Hermes 에이전트로 나만의 AI 직원 팀 만들기!

> ⚠️ **시청 필요** — YouTube 트랜스크립트 직접 추출이 막혀 제목·메타 + 웹 검색 배경으로 구성. 채널명·타임라인·설명란 전문은 영상 시청으로 보강.

## 핵심 요약
**Hermes Agent**(Nous Research 오픈소스)로 한 명의 에이전트가 아니라 **여러 AI 직원(서브에이전트)으로 구성된 팀**을 만드는 법. **Workspace + 공유 메모리(shared-memory)**로 팀원이 같은 기억을 공유하고, **LLM Wiki**를 지식 베이스로 물려 매일 스스로 진화하는 구조. 텔레그램·Slack·Discord로 지시.

> **"태스크마다 일일이 지시하는 단일 봇 → 같은 기억을 공유하며 알아서 일하는 AI 직원 팀으로"**

---

## Hermes Agent란
| 구분 | 내용 |
|---|---|
| **출처** | Nous Research, 오픈소스 (GitHub 다수 스타) |
| **특징** | 장기 기억 + **스킬 자동 생성** + 지속 실행(상시 가동) |
| **강점** | 반복 업무 자동화 — 리서치·서버 작업·문서 정리·코드 분석 |
| **인터페이스** | 텔레그램 / Slack / Discord / MS Teams 메신저 기반 지시 |
| **차별점** | 매번 까먹는 챗봇과 달리 **기억이 누적**되는 AI 직원 |

---

## "AI 직원 팀"의 작동 구조
```
        나 (메신저로 지시)
            │
            ▼
   ┌─── Hermes Workspace ───┐
   │   공유 메모리(shared)   │  ← 팀 공통 기억 + LLM Wiki
   └────────┬───────────────┘
     ┌──────┼──────┐
     ▼      ▼      ▼
  리서치   개발    문서
  직원     직원    직원   ← 각자 스킬 자동 생성·성장
```
- **공유 메모리**: 팀원이 같은 컨텍스트·결과를 공유 → 중복 작업 방지
- **LLM Wiki 연동**: 누적된 지식을 직원들이 함께 참조 → 매일 진화
- **스킬 자동 생성**: 새 업무를 만나면 스킬을 만들어 다음엔 더 빠르게

---

## 관련 자료 (생태계)
- 패스트캠퍼스: "Hermes Agent로 매일 스스로 진화하는 개발 에이전트 팀 만들기 (ft. LLM wiki)"
- WikiDocs: "에르메스 에이전트 업무 자동화: 나만의 AI 팀 만들기", "Hermes Agent: 성장하는 AI 에이전트 실전 가이드"
- 영어권: "My $8/Month Hermes Agent Just Got an AI Team (Hermes Workspace Tutorial)"
- → Hermes Agent 한국어 콘텐츠가 빠르게 형성 중 (시장 검증 신호)

---

## 인사이트 (코마인드웍스 사업 연결)

### 1. **Hermes의 "LLM Wiki" = 우리가 이미 만든 시스템과 정면 비교 대상**
- Hermes는 LLM Wiki를 직원 팀의 공유 지식 베이스로 씀 → **우리 comindworks LLM Wiki도 동일 컨셉**
- 차이: 우리는 Claude Code 위에 직접 구축. Hermes는 메신저·상시 가동 패키지화
- → **벤치마크 1순위**: Hermes의 공유 메모리/스킬 자동 생성 구조를 우리 wiki-collector·스킬 체계에 흡수 검토

### 2. **AI 직원 팀 = Boss·Worker 멀티에이전트의 패키지판**
- [[ai-claudecode-goal-command-tristen-2026-05-17]]의 Boss·Worker, [[ai-claudecode-marketing-agent-team-2026-04-18]]의 서브에이전트 팀과 같은 패턴
- Hermes는 이걸 **메신저 + 상시 가동**으로 비개발자도 쓰게 포장 → 우리 교육 콘텐츠 차별점 참고

### 3. **메신저 기반 상시 가동 = 우리에게 없는 인터페이스**
- 현재 comindworks는 Claude Code 터미널 중심 → 텔레그램/Slack 트리거 미보유
- → **로드맵 후보**: LLM Wiki에 메신저 게이트웨이(텔레그램 봇) 추가

### 4. **"매일 스스로 진화" = 복리 지식 자산 메시지 강화**
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] · [[ai-cmdspace-kuyohan-obsidian-second-brain-2026-05-19]]의 세컨드 브레인 복리 논리와 동일
- 코마인드웍스 브랜드 메시지("쌓일수록 똑똑해지는 AI 도서관")의 외부 검증

---

## 실천 방법
### 즉시
1. **영상 직접 시청** → 채널명·타임라인·구체 데모 보강 후 이 페이지 업데이트
2. Hermes Workspace 공유 메모리 구조 vs 우리 index.md/data 구조 1:1 비교 메모

### 1개월 내
3. Hermes 데모 환경 1회 구동 → 스킬 자동 생성·공유 메모리 UX 체험
4. **메신저 트리거(텔레그램) PoC** — "수집/질문"을 메신저로 받는 게이트웨이 검토

---

## 관련 페이지
- [[ai-cmdspace-kuyohan-obsidian-second-brain-2026-05-19]] — 세컨드 브레인/공유 지식 베이스 컨셉
- [[ai-graphify-claudecode-knowledge-graph-2026-05-19]] — 지식 그래프 + 토큰 절감 (직원 팀 컨텍스트 압축)
- [[ai-claudecode-goal-command-tristen-2026-05-17]] — Boss·Worker 자율 실행 패턴
- [[ai-claudecode-marketing-agent-team-2026-04-18]] — 서브에이전트 마케팅 팀 구현체
- [[ai-claudecode-routines-2026-04-18]] — 상시 가동/자동 트리거
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] ★ — LLM Wiki 원조 개념
- [[ai-inflearn-obsidian-claudecode-wiki-course-2026-04-29]] — LLM Wiki 시장 검증 신호
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] ★ — 우리 LLM Wiki 사업과 직접 경쟁/벤치마크

---

## 참고
- [영상 원본](https://youtu.be/CmHhhT_Xt8M)
- [Hermes Agent (Nous Research)](https://github.com/NousResearch)
- 패스트캠퍼스: Hermes Agent로 진화하는 개발 에이전트 팀 만들기 (ft. LLM wiki)
- WikiDocs: 에르메스 에이전트 업무 자동화 — 나만의 AI 팀 만들기
