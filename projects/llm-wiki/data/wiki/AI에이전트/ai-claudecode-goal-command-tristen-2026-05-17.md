---
title: Claude Code /Goal 명령어 — Auto Mode + Boss·Worker 2층 구조로 자율 목표 완수 (Tristen O'Brien, 8분 마스터)
category: AI에이전트
tags: [ClaudeCode, goal명령어, AutoMode, 자율실행, Boss워커패턴, TristenOBrien, 업무자동화, 소상공인]
source: https://youtu.be/aMfig5cKOtY
created: 2026-05-19
expires: 2026-11-19
type: url
---

# Claude Code /Goal — Auto Mode + Boss·Worker 2층 구조

## 핵심 요약
Claude Code의 **`/goal` 명령어** 완벽 가이드 (8분). Auto Mode와 조합해 Claude가 **Boss(전략 수립) + Worker(실행)**을 스스로 분리하며 목표를 자율 완수. 피자 가게 콘텐츠 캘린더 라이브 데모 포함. **비용 경고 3가지 룰**도 제시.

> **"/Goal = Claude를 원샷 대화가 아닌 지속적 작업 파트너로 전환하는 스위치"**

---

## /Goal이란 무엇인가

| 구분 | 설명 |
|---|---|
| **정의** | 단일 목표를 주면 Claude가 스스로 계획·실행·검증을 반복 |
| **아닌 것** | 단순 대화 연속이 아님 — 목표 달성까지 자율 루프 |
| **필수 조합** | Auto Mode + /goal (둘 다 켜야 작동) |

---

## Boss & Worker — 왜 작동하는가

```
/goal "콘텐츠 캘린더 만들어줘"
       │
       ▼
  Boss Claude (전략)
  ├── 목표 분해
  ├── 작업 순서 결정
  └── 검증 기준 설정
       │
       ▼
  Worker Claude (실행)
  ├── 개별 작업 수행
  ├── 결과 보고
  └── 재시도/수정
```

핵심: **한 번의 명령으로 Boss가 계획, Worker가 실행 → 사람 개입 없이 목표 완수**

---

## 세팅 방법

1. Claude Desktop 설치 (claude.com/download)
2. **Auto Mode 활성화** (⚙️ 설정에서)
3. 프로젝트에서 `/goal [목표 설명]` 입력
4. "The One Thing": 목표를 **명확하고 검증 가능하게** 작성

```
❌ 나쁜 예: "마케팅 콘텐츠 만들어줘"
✅ 좋은 예: "피자 가게 5월 인스타 콘텐츠 캘린더 — 4주치, 주 3회 포스팅, 한국어"
```

---

## 라이브 데모: 피자 가게 콘텐츠 캘린더 (5:51)

- 입력: 피자 가게용 SNS 콘텐츠 캘린더 목표
- Claude가 Boss → Worker 루프 자동 실행
- 결과: 일정·주제·톤이 완성된 콘텐츠 계획 자율 생성
- 소요: 인간 개입 없이 완성

→ **소상공인·1인 창업가 실용 케이스**

---

## 비용 경고 + 3가지 룰 (7:13)

### ⚠️ 비용 경고
- /goal은 루프가 길어질수록 토큰 소모 급증
- 복잡한 목표 = 예상보다 10~20배 비용 가능

### 3가지 룰
1. **목표를 잘게 쪼개라** — 한 번에 모든 것 vs 단계별 /goal
2. **검증 기준을 명시하라** — "완료" 조건이 없으면 루프 무한 반복
3. **첫 실행은 작은 범위로** — 비용 파악 후 확장

---

## 타임라인

| 시간 | 내용 |
|---|---|
| 0:00 | What /Goal Is (& Isn't) |
| 1:50 | Why It Actually Works (Boss & Worker) |
| 2:53 | The Setup: Auto Mode + /Goal |
| 3:56 | The One Thing You Need to Get Right |
| 5:51 | Live Demo: Pizza Shop Content Calendar |
| 7:13 | The Cost Warning + 3 Rules |

---

## 인사이트 (코마인드웍스 사업 연결)

### 1. **/goal = LLM Wiki 일괄수집·일괄처리 자동화에 직결**
- 현재 `일괄수집` 트리거 = 수동 반복
- /goal로 "LLM Wiki 미처리 source/ 파일 전부 Wiki로 변환" 자율 실행 가능
- → **wiki-collector 스킬을 /goal 루프로 교체 검토**

### 2. **Boss·Worker = 코마인드웍스 멀티에이전트 아키텍처 원형**
- [[ai-claudecode-marketing-agent-team-2026-04-18]]의 하네스 95% 구조와 동일 패턴
- Routines([[ai-claudecode-routines-2026-04-18]])의 자동 트리거 + /goal의 자율 루프 = **완전 자동화 파이프라인**

### 3. **소상공인 데모 = 코마인드웍스 1차 타깃 실증**
- 피자 가게 콘텐츠 캘린더 → AI 못쓰는 소상공인이 /goal 하나로 마케팅 자동화
- → **코마인드웍스 교육 콘텐츠 1호 케이스**: "피자 가게도 하는 AI 마케팅"

### 4. **비용 3룰 = Graphify + /goal 조합 필수**
- /goal 비용 폭발 방지 → [[ai-graphify-claudecode-knowledge-graph-2026-05-19]] 27x 절감과 연계
- Graphify로 컨텍스트 압축 → /goal 루프 비용 현실적 수준으로

### 5. **Tristen O'Brien = 영어권 Claude Code 콘텐츠 벤치마크**
- 8분 구조화 가이드 스타일 → 코마인드웍스 한국어 콘텐츠 포맷 참고
- Claude Design, Beginner Guide, 7 Best Practices 시리즈 연속 학습 가치

---

## 실천 방법

### 즉시 (이번 주)
1. **Auto Mode + /goal 직접 실험** — 코마인드웍스 wiki 관련 작은 목표 1개
2. **목표 명확화 연습** — "완료 조건 명시" 패턴 체화

### 1개월 내
3. **wiki-collector를 /goal 루프로 자동화** — "source/ 미처리 전부 wiki로" 목표 설정
4. **소상공인 케이스 재현** → 한국어 콘텐츠 1편 제작

---

## 관련 페이지

- [[ai-claudecode-routines-2026-04-18]] ★ — Routines 3종 트리거 + /goal 루프 = 완전 자동화 파이프라인
- [[ai-claudecode-marketing-agent-team-2026-04-18]] — Boss·Worker 패턴의 멀티에이전트 구현체
- [[ai-graphify-claudecode-knowledge-graph-2026-05-19]] — /goal 비용 제어를 위한 27x 토큰 절감
- [[ai-claudecode-token-save-6tips-2026-04-17]] — /goal 실행 전 토큰 절약 세팅
- [[ai-joshua-claude-design-system-prd-2026-04-30]] — Claude Code 워크플로우 시스템화
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] — LLM Wiki + Claude Code 원조 개념
- [[ai-claude-live-artifacts-mcp-dashboard-2026-05-03]] — Claude 도구 생태계 연장선
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] ★ — /goal 자동화 = 2단계 시스템화의 핵심 도구
- [[biz-opus-clip-yan-30days-pmf-2026-05-01]] — 초니치 PMF + /goal 자동화 = 빠른 실행

---

## 참고

- [영상 원본](https://youtu.be/aMfig5cKOtY)
- 채널: [Tristen O'Brien](https://www.youtube.com/@TristenOBrien)
- [/goal 공식 문서](https://code.claude.com/docs/en/goal)
- [Claude Code 문서](https://code.claude.com)
