---
title: Claude Code Routines — 3종 트리거(Schedule/API/Local)로 진화한 업무 자동화 시스템
category: AI에이전트
tags: [ClaudeCode, Routines, 자동화, 트리거, API연동, GoogleForms, 업무자동화]
source: https://youtu.be/W-PmZZeiI2k
created: 2026-04-18
expires: 2026-10-18
type: url
---

# Claude Code Routines — 3종 트리거로 진화한 업무 자동화 시스템

## 핵심 요약
Claude Code의 스케줄 기능이 **Routines**로 업그레이드되면서 시간 예약만 가능했던 Remote Task를 넘어 **외부 이벤트(고객 문의, 버튼 클릭)에도 반응**하는 본격 자동화 시스템이 됨. 트리거가 3종(Schedule · API · Local)으로 확장되고 **환경 설정**까지 가능해져, 이제 클로드 코드 스킬을 "업무 자동화 시스템"으로 확장 가능.

---

## Remote Task → Routines 핵심 변화 2가지

### 1. 트리거가 3종으로
- **Schedule**: 시간 예약 (기존 Remote Task 기능)
- **API**: HTTP 호출로 외부 이벤트 수신 (새로 추가)
- **Local**: 로컬 환경에서 직접 호출 (새로 추가)

### 2. 환경 설정 가능
- 개별 루틴마다 실행 환경을 분리 설정
- 이로써 여러 자동화 루틴이 서로 간섭 없이 병렬 운영 가능

---

## 실전 데모 2가지

### 데모 1: Schedule 트리거 — 매일 아침 유튜브 키워드 브리핑
- 매일 정해진 시각에 특정 키워드로 YouTube 새 영상 자동 수집
- 영상 요약 → 일일 브리핑 생성
- **핵심**: "콘텐츠 모니터링"을 사람이 매일 반복하지 않음

### 데모 2: API 트리거 — 구글 폼 → 자동 견적서
- 고객이 구글 폼으로 견적 요청 제출
- Google Apps Script가 폼 제출 이벤트 수신 → 루틴 호출 API 실행
- Routine이 받은 데이터로 맞춤 견적서 자동 생성
- **핵심**: "고객 문의 → 견적" 업무 루프를 24시간 자동화

---

## Routines 한계 6가지 (영상 21:27~)
시청 기반 정리 필요 — 설명란에 상세 없음. 영상에서 한계 6가지 언급 → 실제 구축 시 공식 문서 [Routines Docs](https://code.claude.com/docs/ko/routines) 재확인 필요.

---

## 인사이트 (코마인드웍스 사업 연결)

1. **"Jarvis에 n8n + Claude Code Routines 이중 레이어" 구성 가능**
   - n8n = 워크플로우 오케스트레이션 (다양한 서비스 연결)
   - Routines = LLM 판단이 필요한 부분만 담당
   - → 두 엔진을 병용하면 더 똑똑하면서도 유지보수 쉬운 자동화 구축 가능

2. **"고객 문의 → 견적"은 코마인드웍스 교육·컨설팅 사업과 직결**
   - 견적 요청 자동 응답을 실제로 운영하면 무의식 영업 파이프라인 완성
   - 이 영상의 데모 2를 그대로 복제하면 바로 적용 가능

3. **"API 트리거"의 의미** = Claude Code가 단순 개발 도구에서 **백엔드 서비스 컴포넌트**로 진화
   - SaaS 백엔드 일부를 Claude Code로 구축할 가능성 열림
   - → 1인 창업가의 "풀스택 + AI 판단" 워크플로우 현실화

---

## 실천 방법

1. **즉시 적용**: 매일 아침 유튜브 키워드 브리핑을 Routines로 세팅 (콘텐츠 수집 자동화)
2. **중기 적용**: 코마인드웍스 견적 요청 폼 → Routines API 트리거 연결
3. **장기 적용**: LLM Wiki 자동 점검(만료/모순)을 Scheduled Routine으로 상시 운영

---

## 관련 페이지

- [[ai-claudecode-token-save-6tips-2026-04-17]] — Routines 상시 운영 시 Sonnet 고정·컨텍스트 정리 설정이 비용 폭증 방지 핵심
- [[ai-agentops-2layer-system-2026-04-17]] — 2층 시스템(Jarvis/ClaudeCode)에 Routines가 Layer 2의 상시 실행 레이어로 맞물림
- [[biz-openclaw-opensource-ai-agent-2026-04-17]] — 1인 AI 에이전트 개발자의 API 트리거 활용 가능성
- [[auto-ai-video-automation-2026-04-17]] — Routines Schedule 트리거로 영상 자동화 파이프라인 상시 운영 가능

---

## 참고 링크
- [영상 원본](https://youtu.be/W-PmZZeiI2k)
- [Claude Code Routines 공식 문서](https://code.claude.com/docs/ko/routines)
- [영상 내 상세 가이드 Repo](https://github.com/citizendev9c/yt-assets/tree/main/automation/claude-code/routines-26-04-18)
