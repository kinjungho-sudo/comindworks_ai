---
title: AI 슬롭 방지 = 디자인 시스템 — 원티드 몽타주·쿨리콘즈·Pretendard + Design.md 5단계 워크플로우 (메이커 에반)
category: AI에이전트
tags: [AISlop, 디자인시스템, 원티드몽타주, 쿨리콘즈, Pretendard, DesignMD, 자간행간, AI워크플로우, 디자이너Curator, 메이커에반, 한국어UI]
source: 직접 입력 (메이커 에반 강의 정리본)
created: 2026-05-19
expires: 2026-11-19
type: text
---

# AI 슬롭(AI Slop) 방지 = 디자인 시스템

## 핵심 요약
**메이커 에반**의 강의 정리. AI 시대의 진짜 차별점은 코드가 아니라 **"느낌(UI/UX)"**이며, AI가 만들어내는 평범한 결과물(**AI Slop**)을 방지하는 유일한 자산이 **디자인 시스템**. 한국어 환경에 최적화된 **3종 도구 세트(원티드 몽타주 + 쿨리콘즈 + Pretendard)** + **자간 -0.02em·행간 1.5~1.6** 디테일 + **Design.md 5단계 워크플로우**로 비디자이너도 감도 높은 결과물 가능.

> **"AI는 학습 데이터의 평균을 내놓는다. 평균이 흔해진 시대의 차별점은 디테일이다."**

이 가이드는 [[ai-claude-design-prototype-2026-04-23]]·[[ai-joshua-claude-design-system-prd-2026-04-30]]의 **한국어 환경 디테일 보완판**.

---

## 1. AI 슬롭(AI Slop)이란

### 정의
> 겉보기에는 그럴싸하지만, **디테일이 부족하고 어디서 본 듯한 평범한 느낌**의 저품질 AI 생성물

### 원인
- AI는 학습 데이터의 **'평균적인 답'**을 내놓는 구조
- 누구나 평균을 뽑는 시대 → **코드 능력 < 제품의 '느낌'**

---

## 2. 왜 디자인 시스템이 더 중요해졌나

AI가 디자인을 더 많이 생성할수록 → 디자인 시스템 가치 **↑↑**

| 효과 | 디자인 시스템 없음 | 있음 |
|---|---|---|
| 일관성 | 매번 다른 색·버튼 → 통일감 ❌ | 모든 결과물 일관 |
| 브랜드 | 저렴해 보임 | 신뢰 있는 인상 |
| AI 가이드 | 매번 같은 설명 반복 | Design.md 한 번 작성 |

→ [[biz-evan-carmichael-business-fundamentals-2026-04-20]]의 **7 Powers 중 "브랜드"** 해자를 디자인 시스템으로 구현

---

## 3. 한국어 환경 3종 추천 도구

| 구분 | 도구 | 차별점 |
|---|------|--------|
| **디자인 시스템** | **원티드 몽타주** | 한국어 행간·폰트 문제 해결 + 상업적 이용·수정 가능 |
| **아이콘** | **쿨리콘즈 (Coolicons)** | 스타일 통일 + 흔한 오픈소스보다 특색 |
| **폰트** | **프리텐다드 (Pretendard)** | 한국어 UI 표준 — 사용 즉시 정돈 |

### 디테일의 핵심: 자간과 행간

| 항목 | 값 | 근거 |
|---|---|---|
| **자간 (Letter Spacing)** | **-0.02em** | 네이버·리디북스 등 주요 서비스 수치 |
| **행간 (Line Height)** | **1.5 ~ 1.6** | 한글 베이스라인이 영어보다 낮음 → 좁으면 답답 |

→ JOSHUA의 영상([[ai-joshua-claude-design-system-prd-2026-04-30]])이 도구 선택까지 보여줬다면, 이 가이드는 **자간·행간 단위까지** 들어가는 한국어 디테일

---

## 4. AI 디자인 워크플로우 — 5단계

```
[1] 기본값 설정 (색상 5~6, 폰트 6단계, 간격 8단계 — 메뉴판처럼 단순)
        ↓
[2] Design.md 작성 (규칙 + "그 이유" 기록)
        ↓
[3] 컴포넌트 커스텀 (원티드 몽타주 → 브랜드 색상만 입힘)
        ↓
[4] 아이콘 자산화 (자주 쓰는 30개 미리 모아 톤 유지)
        ↓
[5] 프롬프트 전달 (AI 작업 시마다 Design.md 함께 제공)
```

**핵심**: 5번이 가장 중요. AI는 단기 기억력이 약함 → **매번 Design.md 첨부 = 결과물 제어**

---

## 5. 결론 — 디자이너 역할 변화 + 기술적 해자

### 디자이너의 역할 변화
| 과거 | AI 시대 |
|---|---|
| 픽셀을 직접 그림 | **시스템 설계자 + 품질 판단자 (Curator)** |
| 결과물 제작자 | 가이드라인 작성자 |

### 기술적 해자
- 코드는 흔해짐 → 진입 장벽 사라짐
- **디자인 시스템 = AI 시대 강력한 경쟁 우위**

---

## 인사이트 (코마인드웍스 사업 연결)

### 1. **코마인드웍스 자체 Design.md 작성이 5월 최우선 과제**
- 현재 LLM Wiki에 가이드라인은 있지만 **시각 디자인 시스템 부재**
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] "시니어도 쓸 수 있는가?" 4원칙은 UX 측면 → **시각적 가이드 추가 필요**
- 작성 위치: `projects/llm-wiki/guidelines/design_system.md` 또는 별도 `comindworks-brand/` 폴더

### 2. **3종 도구 세트 = 즉시 적용 가능한 빠른 승**
- 원티드 몽타주 + 쿨리콘즈 + Pretendard
- LLM Wiki 웹앱·랜딩페이지·발표 자료에 일괄 적용
- → **이번 주 안에 통일된 비주얼 정체성 확보**

### 3. **자간 -0.02em + 행간 1.5~1.6 = 즉시 정돈 효과**
- 현재 LLM Wiki 웹앱(Next.js)의 글로벌 CSS에 추가
- 변경 사항 단 3줄로 **시니어 가독성 향상**
- 코마인드웍스 4원칙 1번 ("질문으로 이끈다")의 기술적 기반

### 4. **AI Slop 방지 = 코마인드웍스 첫 콘텐츠 주제 후보**
- "당신의 AI 제품이 평범해 보이는 진짜 이유" 같은 훅
- 한국 비디자이너 1인 창업가를 위한 가이드 영상
- → [[biz-sunny-job-youtube-90days-2026-04-18]] 첫 영상 후보

### 5. **디자이너 = Curator 변화 = 코마인드웍스 교육 메시지**
- "코드 → 디자인 → AI 전부 Curator의 시대"
- 코마인드웍스 = 1인 창업가를 Curator로 만들어주는 회사
- → [[biz-comindworks-philosophy-roadmap-2026-05-04]] 사명과 직결

### 6. **Design.md 패턴 = CLAUDE.md 확장**
- 우리는 이미 CLAUDE.md(역할·구조), 이제 Design.md(시각) 필요
- 두 파일이 합쳐지면 **"AI에 컨텍스트 주입의 완전한 패키지"**
- → [[ai-claudecode-marketing-agent-team-2026-04-18]]의 "하네스 95%" 완성

---

## 실천 방법

### 즉시 (이번 주)
1. **원티드 몽타주 .fig 다운로드** + 본인 Figma·Claude Design에 업로드
2. **Pretendard 적용** — LLM Wiki 웹앱 Next.js `<body>` CSS에 추가
3. **자간 -0.02em + 행간 1.5~1.6** 글로벌 CSS 적용 (3줄)
4. `projects/llm-wiki/guidelines/design_system.md` 초안 작성 (=Design.md)

### 1개월 내
5. **쿨리콘즈 30개 셀렉트** 후 자산화 (`assets/icons/` 폴더)
6. 코마인드웍스 **브랜드 색상 5~6개 확정** + 폰트 사이즈 6단계 정의
7. **코마인드웍스 첫 콘텐츠 1편 제작**: "AI Slop 방지 — 비디자이너 1인 창업가 가이드"

### 분기 내
8. **Design.md 시즌 2** — 컴포넌트 라이브러리·접근성 가이드 추가
9. 시니어 사용자 가독성 테스트 (4원칙 1번 "시니어도 쓸 수 있는가?" 검증)

---

## 관련 페이지

- [[ai-claude-design-prototype-2026-04-23]] — Claude Design 도구 + 본 가이드의 한국어 디테일 결합
- [[ai-joshua-claude-design-system-prd-2026-04-30]] — JOSHUA: 디자인 시스템 + PRD 2단계 (본 가이드와 짝)
- [[ai-claudecode-marketing-agent-team-2026-04-18]] — 하네스 95% = Design.md 동시 적용 필요
- [[ai-claudecode-routines-2026-04-18]] — Routines로 Design.md 변경 시 빌드 자동화
- [[ai-claude-live-artifacts-mcp-dashboard-2026-05-03]] — Live Artifacts에도 디자인 시스템 적용
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] — Design.md = CLAUDE.md 시각 버전
- [[biz-comindworks-philosophy-roadmap-2026-05-04]] ★ — "시니어도 쓸 수 있는가" 4원칙의 시각적 기반
- [[biz-evan-carmichael-business-fundamentals-2026-04-20]] — 7 Powers "브랜드" 해자 구현 수단
- [[biz-danmartell-20-ways-ai-money-2026-05-07]] — S Tier "AI 컨설팅" 시 Design.md 자체가 산출물
- [[biz-startup-government-funding-psst-2026-05-03]] — PSST의 Solution 차별성 = 디자인 시스템
- [[biz-bill-gurley-ai-survival-90percent-2026-04-30]] — "AI 활용 능력" 자질의 시각 측면
- [[content-youtube-start-5tips-2026-04-17]] — 썸네일·메타데이터 = 콘텐츠 영역의 디자인 시스템

---

## 참고
- **원본**: 메이커 에반 — *AI로 만든 제품이 안 팔리는 이유*
- 추천 도구:
  - 원티드 몽타주 (Wanted Montage)
  - 쿨리콘즈 (Coolicons): https://coolicons.cool
  - 프리텐다드 (Pretendard): https://github.com/orioncactus/pretendard
