---
title: Claude Code가 내 노하우를 나무위키처럼 정리해준다 (카파시 LLM Wiki 실습)
category: AI에이전트
tags: [ClaudeCode, LLMWiki, 카파시, Obsidian, 지식관리, RAG비교, 노트북LM, 비개발자, 나무위키]
source: https://www.youtube.com/watch?v=wXc7-vFSd5U
created: 2026-04-17
expires: 2027-04-17
type: url
---

# Claude Code가 내 노하우를 나무위키처럼 정리해준다

## 핵심 요약
카파시(Andrej Karpathy, 테슬라 AI 총괄 출신)가 공개한 LLM Wiki 방법을 비개발자도 따라할 수 있게 풀어낸 실습 영상. 벡터 DB 없이 마크다운 파일만으로 나만의 지식 위키를 구축하고, Claude Code가 자료를 읽어 자동으로 나무위키처럼 정리해준다.

## 핵심 비교: 노트북LM vs RAG vs LLM Wiki

| 방식 | 원리 | 장점 | 단점 |
|------|------|------|------|
| **노트북LM** | 문서 업로드 → Google AI 요약 | 쉬움 | 지식이 축적되지 않음, 외부 서비스 종속 |
| **RAG** | 벡터 DB 임베딩 → 유사 청크 검색 | 대용량 가능 | 인프라 복잡, 개발 필요, 컨텍스트 단절 |
| **LLM Wiki** | 마크다운 폴더 → 컨텍스트 직접 로드 | 인프라 제로, 내가 소유, 복리로 성장 | 파일 관리 필요 |

**핵심**: LLM Wiki는 지식이 **복리로 쌓인다**. 노트북LM은 매번 리셋.

## 영상 구성 (타임라인)

| 시간 | 내용 |
|------|------|
| 0:00 | 인트로 |
| 1:22 | LLM Wiki란? — 카파시가 공개한 시스템 |
| 4:44 | **노트북LM vs RAG vs LLM Wiki 비교** |
| 7:58 | 셋업 실습 — Obsidian + Claude Code |
| 9:18 | 프롬프트로 위키 생성 |
| 12:15 | 자료 넣기 — Web Clipper + 실무 시나리오 |
| 16:30 | 위키 반영 과정 시연 |
| 19:30 | Obsidian 그래프 뷰 확인 |
| 20:30 | 위키에 질문하기 — 복리의 힘 |
| 23:00 | **솔직한 한계와 비용** |
| 24:55 | 아웃트로 |

## 핵심 인사이트

### 복리의 힘
- 자료를 넣을수록 위키가 똑똑해짐
- 서로 다른 페이지가 링크로 연결되며 지식 네트워크 형성
- 6개월 후: "내가 이걸 알고 있었구나"를 AI가 꺼내줌

### 솔직한 한계 (23:00 구간)
- Claude Code 토큰 비용 발생
- 파일이 많아질수록 컨텍스트 관리 필요
- 완전 자동화는 아님 — 인간의 큐레이션 여전히 필요

### 세팅 스택
- **Obsidian** (무료) — 마크다운 폴더 뷰어 + 그래프 뷰
- **Obsidian Web Clipper** — 웹 자료를 마크다운으로 즉시 저장
- **Claude Code** — 자료를 읽고 위키 페이지 자동 생성
- **카파시 원본 프롬프트**: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## 참고 링크
- 상세 가이드: https://github.com/citizendev9c/yt-assets/blob/main/automation/claude-code/llmwiki-26-04-11/README.md
- 카파시 원본 Gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## 인사이트

### 우리 LLM Wiki와의 연결
- 지금 운영 중인 시스템이 이 영상에서 소개하는 것과 정확히 동일한 구조
- 차이점: 우리는 Obsidian 없이 순수 Claude Code + git으로만 운영 → 더 자동화됨
- **`wiki/index.md` = 선별 로드의 핵심** — 이 영상에서 말하는 "복리의 힘"이 이미 작동 중

### 코마인드웍스 사업 연결
- **교육 상품 아이디어**: "비개발자를 위한 LLM Wiki 세팅 1시간 워크숍"
- **B2B 서비스**: 회사의 업무 노하우(SOP, 회의록, 고객 데이터)를 LLM Wiki로 구조화
- 카파시 + 나무위키 프레임은 비개발자 클라이언트에게 가장 직관적인 설명 방식

## 관련 페이지
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] - 카파시 LLM Wiki 다른 실습 영상
- [[ai-llm-wiki-youtube-2026-04-17]] - 카파시 원본 개념 (상위 0.1프로 AI 활용법)
- [[ai-claudecode-token-save-6tips-2026-04-17]] - Claude Code 비용 최적화
