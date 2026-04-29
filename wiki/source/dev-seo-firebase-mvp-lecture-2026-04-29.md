---
title: 나만의 서비스 만들기 3주차 — SEO 설정 & Firebase MVP 배포
category: 개발
tags: [SEO, Firebase, MVP, 온페이지SEO, 크롤링, 롱테일키워드, Favicon, OpenGraph, ClaudeCode]
source: 직접입력(PDF)
created: 2026-04-29
expires: 2027-04-29
type: pdf
---

# 나만의 서비스 만들기 3주차 — SEO 설정 & Firebase MVP 배포

강의자료 원본 PDF (27슬라이드) 내용 요약

## SEO 기본 개념

### SEO란?
- Search Engine Optimization (검색엔진 최적화)
- SERP(검색엔진 결과 페이지)에서 자연 검색(Organic) 노출을 높이는 전략
- 목표: 트래픽 증가 → 전환율 개선 → 브랜드 신뢰성 확보

### 검색 엔진 동작 원리
1. **크롤링**: 검색엔진 봇이 웹페이지 탐색 (robots.txt, sitemap.xml, 내부 링크 구조)
2. **인덱싱**: 수집된 페이지를 검색엔진 DB에 저장 (HTML 구조와 콘텐츠 의미 분석)
3. **랭킹**: 검색어에 맞는 결과 정렬 (콘텐츠 품질, 키워드 적합성, 페이지 경험, 백링크)

---

## 검색 키워드 3종류

| 종류 | 특징 | 검색량/경쟁도 | 전환율 | 예시 |
|------|------|------------|------|------|
| 헤드 키워드 | 1~2단어, 짧고 일반적 | 높음 | 낮음 | 마케팅, 다이어트 |
| 바디 키워드 | 2~3단어, 중간 구체성 | 중간 | 중간 | 디지털 마케팅 전략 |
| 롱테일 키워드 | 3단어 이상, 구체적 | 낮지만 누적 가능 | 높음 | 쇼핑몰 SEO 최적화 방법 |

> **초기 SEO 전략에서는 롱테일 키워드가 핵심** — 경쟁도 낮고 전환율 높음

### 키워드 전략
- 검색 의도 기반: 정보형 / 탐색형 / 거래형
- 유료 도구: Google Keyword Planner, 네이버 키워드 도구
- 먼저 돈 안 드는 온페이지 SEO 최적화부터

---

## 온페이지 SEO

| 요소 | 역할 | 예시 |
|------|------|------|
| Title tag | 검색 결과 제목 | `<title>SEO 최적화 방법 \| 초보자 가이드</title>` |
| Meta Description | 검색 결과 설명문 | `<meta name="description" content="...">` |
| Heading 구조 | H1/H2 계층 | `<h1>SEO 최적화</h1><h2>키워드 전략</h2>` |
| URL 구조 | 읽기 쉬운 URL | `mypage.com/seo-guide/onpage-seo` |
| 내부 링크 | 관련 콘텐츠 유기적 연결 | — |

---

## 오프페이지 SEO
- 백링크, 도메인 권위, 브랜드 언급
- 전략: 콘텐츠 마케팅, 게스트 포스팅, 커뮤니티 활동
- **바이브코딩에서 가장 부족한 활동** — 코딩만 하고 홍보 안 함

---

## Favicon & Open Graph

### Favicon
- 브라우저 탭/북마크에 표시되는 16x16~48x48px 아이콘
- 없거나 기본값이면 "관리 안 되는 사이트"라는 인식을 줌
- 효과: 브랜드 인식, CTR 향상, 신뢰 신호

### Open Graph
- SNS 공유 시 표시되는 정보를 정의하는 메타 태그 (Facebook 시작)
- 카카오톡, 페이스북, 링크드인, X 등 대부분 지원
- OG 설정 여부에 따라 CTR이 갈림
- SEO 간접 영향: 공유 → 클릭 → 체류시간 증가 → 검색엔진 신호

---

## Claude Code + Firebase MVP 실습

### 사전 환경 체크
```bash
git -v
node -v
claude
```
- `/model`: Default — Sonnet 4.6
- `/effort`: Medium
- `/advisor`: Opus 4.7

### 메타 프롬프팅 활용 MVP 제작
- Plan mode에서 시작
- 핵심 프롬프트: "Firebase Spark Plan 100% 호환 MVP 설계 / CTO 전략 파트너로서 권장 경로 1개만 제시"

### Firebase 프로젝트 생성 순서
1. console.firebase.google.com → 새 프로젝트 생성
2. Gemini 사용 ❌, Analytics 사용 ❌
3. 설정 아이콘 → 일반 → 내 앱 → `</>` (웹앱) 선택
4. Firebase 호스팅 체크 ❌
5. `.env.local` 파일 생성 (`.env.local.example` 복제 후 Firebase 설정값 입력)
6. `.firebaserc` 파일 수정 (Firebase project ID 붙여넣기)

### Firebase 데이터베이스 설정
- Firestore → 데이터베이스 만들기 → Standard 버전
- 위치: `asia-northeast3` (Seoul) → 프로덕션 모드

### Firebase 인증 설정
- 보안 > Authentication → 시작하기 → 로그인 방법 추가
- **Google 추천**

### Firebase 설치 명령어
```bash
npm install firebase              # 프로젝트 종속성으로 설치
npm install -g firebase-tools     # 전역 CLI 도구
firebase login
firebase deploy --only firestore:rules,firestore:indexes
npm run dev                       # 로컬 테스트
```

### 배포 사이클
```bash
npm run build
firebase deploy --only hosting
# 수정 후 반복
```

### SEO/Favicon/OG 설정 프롬프팅
- 디자인 변경 시 객관식 질문 기반으로 단계적 진행
- 핵심 원칙: **기능을 절대 깨뜨리지 않는다**, 디자인만 변경
