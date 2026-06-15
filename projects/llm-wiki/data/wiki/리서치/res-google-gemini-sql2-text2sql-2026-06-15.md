---
title: 구글 제미나이-SQL2 — 자연어→SQL 변환 BIRD 80.04% 돌파 (Text-to-SQL)
category: 리서치
tags: [구글, 제미나이SQL2, TexttoSQL, NL2SQL, BIRD벤치마크, BigQuery, 데이터에게질문하기, AI산업동향]
source: https://www.aitimes.com/news/articleView.html?idxno=211690
created: 2026-06-15
expires: 2026-12-15
type: url
---

# 구글 제미나이-SQL2 — 자연어→SQL 80% 돌파

## 핵심 요약
구글이 자연어를 SQL로 변환하는 **제미나이-SQL2(Gemini-SQL2)**를 공개. **제미나이 3.1 프로** 기반 Text-to-SQL 기능으로, 업계 표준 **BIRD 벤치마크에서 80.04%** 실행 정확도 기록(단일 학습 모델 부문 최고). 독립 모델이 아니라 기존 모델 위에 얹은 기능이라는 점이 특징.

> **"자연어로 묻기만 하면 '실제로 실행되는' SQL이 나온다 — 단, 5건 중 1건은 여전히 틀린다"**

---

## 정확도 — BIRD 벤치마크
| 구분 | 실행 정확도 |
|---|---|
| **제미나이-SQL2** | **80.04%** |
| 기존 제미나이-SQL | 76.13% |
| 인간 전문가 | 92.96% |

- 약 **+4%p** 개선, 경쟁 모델 제치고 단일 학습 모델 부문 1위
- 인간(92.96%)과는 아직 ~13%p 격차

---

## 기술 포인트
- **독립 모델 아님**: 제미나이 3.1 프로 위에 구축된 Text-to-SQL 기능
- 자연어 질문 → **실제 실행 가능한** SQL 변환 ("성공적 실행"이 핵심 지표)
- 난점: "복잡한 비즈니스 맥락 + 미묘한 데이터 특성" 때문에 정확한 SQL 생성이 본질적으로 어려움

## 한계
- 80% = **5건 중 1건 오류** → 실무는 **인간 검토(human-in-the-loop) 필수**

## 활용 사례
- **수익 관리 담당자**: 복잡한 조인·윈도 함수 SQL 자동 생성
- **데이터 엔지니어**: 빅쿼리(BigQuery) SQL 검토·수정 → 생산성 향상
- **SaaS 기업**: "데이터에게 질문하기(Talk to your data)" 기능 구현

---

## 인사이트 (코마인드웍스 사업 연결)

### 1. **"데이터에게 질문하기" = LLM Wiki "질문:" 트리거의 SQL 버전**
- 우리 LLM Wiki는 마크다운 지식에 자연어로 질문 → Hermes/Gemini-SQL2는 정형 DB에 자연어로 질문
- → comindworks가 다루는 데이터가 markdown을 넘어 **DB·스프레드시트로 확장될 때 직접 차용할 패턴**

### 2. **"80%는 검토 필요" = 우리 품질검사·human-in-the-loop 철학과 동일**
- LLM Wiki의 "입구 관리자(품질 검사)" 역할과 같은 메시지: AI 생성물은 사람 검토 게이트가 필수
- → 교육 콘텐츠 메시지로 활용: "AI 자동화 ≠ 무인. 검토 루프가 핵심"

### 3. **벤치마크 마케팅 = 기술 신뢰 확보 공식**
- 구글은 BIRD 80.04%라는 단일 수치로 신뢰를 압축 전달
- → 코마인드웍스도 자체 자동화의 **정량 지표(처리 정확도/시간 절감)** 제시 전략 참고

### 4. **소상공인·비개발자에게 SQL 장벽 제거 = AI 민주화 흐름**
- [[biz-comindworks-philosophy-roadmap-2026-05-04]]의 "지식은 공평하지 않다" 사명과 동일 방향
- SQL 못 쓰는 사람도 데이터 분석 → 우리 타깃(시니어·비개발자)과 정확히 겹침

---

## 실천 방법
### 즉시
1. BIRD 벤치마크 / Gemini-SQL2 기술 블로그 원문 확인 → 프롬프트·아키텍처 패턴 메모
2. "데이터에게 질문하기" UX를 LLM Wiki 질문 트리거 개선 아이디어로 기록

### 향후
3. comindworks 데이터가 DB로 확장 시 Text-to-SQL 레이어 도입 검토 (BigQuery/Supabase)
4. 자체 자동화 정확도 지표화 → 신뢰 마케팅에 활용

---

## 관련 페이지
- [[ai-claude-live-artifacts-mcp-dashboard-2026-05-03]] — 비개발자가 말로 만드는 데이터 대시보드 (DART/주식)
- [[ai-graphify-claudecode-knowledge-graph-2026-05-19]] — 코드/지식 그래프 질의, 구조화 데이터 검색
- [[ai-hermes-agent-ai-team-2026-06-14]] — 자연어 지시 기반 업무 자동화 에이전트
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] ★ — 자연어로 지식 질의하는 LLM Wiki 원조 개념
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] ★ — AI 민주화/지식 공평 사명과 직접 연결

---

## 참고
- [AI타임스 기사 원본](https://www.aitimes.com/news/articleView.html?idxno=211690) (박찬 기자, 2026-06-13)
- BIRD 벤치마크(Big Bench for Large-scale Database Grounded Text-to-SQL)
