---
title: 나만의 서비스 만들기 3주차 — SEO 설정 & Firebase MVP 배포
category: 개발
tags: [SEO, Firebase, MVP, 롱테일키워드, 온페이지SEO, Favicon, OpenGraph, ClaudeCode, 바이브코딩]
source: 직접입력(PDF)
created: 2026-04-29
expires: 2027-04-29
type: pdf
---

# 나만의 서비스 만들기 3주차 — SEO 설정 & Firebase MVP 배포

> 강의자료 PDF | 2026-04-29 수집

---

## 핵심 요약

SEO는 크롤링→인덱싱→랭킹 3단계로 동작하며, 초기 창업자는 **롱테일 키워드 + 온페이지 SEO**부터 무료로 시작해야 한다. Firebase Spark(무료) 플랜으로 Google 로그인 + Firestore DB + 호스팅까지 0원에 MVP를 배포할 수 있다.

---

## SEO 핵심 개념

### 검색 엔진 동작 원리
- **크롤링** → **인덱싱** → **랭킹** 3단계
- 크롤링 열쇠: `robots.txt`, `sitemap.xml`, 내부 링크 구조
- 랭킹 요소: 콘텐츠 품질, 키워드 적합성, 페이지 경험, 백링크

### 키워드 전략 — 초기 창업자 필독

| 종류 | 경쟁도 | 전환율 | 초기 전략 |
|------|--------|--------|----------|
| 헤드 키워드 (1~2단어) | 높음 | 낮음 | ❌ 비용 필요 |
| 바디 키워드 (2~3단어) | 중간 | 중간 | △ 여건 되면 |
| 롱테일 키워드 (3단어+) | 낮음 | 높음 | ✅ 지금 당장 |

> **초기 SEO = 롱테일 키워드 집중** — 경쟁 적고, 이미 살 준비된 사람이 검색하는 키워드

---

## 온페이지 SEO 체크리스트

```html
<!-- 1. Title tag -->
<title>핵심키워드 포함 제목 | 브랜드명</title>

<!-- 2. Meta Description -->
<meta name="description" content="키워드 포함 160자 이내 설명">

<!-- 3. Heading 구조 -->
<h1>페이지 주제 (1개만)</h1>
<h2>섹션 제목</h2>

<!-- 4. Favicon -->
<link rel="icon" href="/favicon.ico">

<!-- 5. Open Graph -->
<meta property="og:title" content="제목">
<meta property="og:description" content="설명">
<meta property="og:image" content="https://...썸네일.jpg">
```

- **URL**: `domain.com/keyword-slug` 형식 (한글 URL 피하기)
- **내부 링크**: 관련 페이지끼리 연결 (크롤링 봇 이동 경로 확보)

---

## 오프페이지 SEO

- 백링크, 도메인 권위, 브랜드 언급
- 바이브코딩의 맹점: 코딩만 하고 **홍보(게스트 포스팅, 커뮤니티)를 안 함**
- 콘텐츠 마케팅이 장기적으로 가장 효과적

---

## Firebase 무료 MVP 배포 전체 흐름

### 1단계 — Firebase 프로젝트 생성
```
console.firebase.google.com
→ 새 프로젝트 (Gemini ❌, Analytics ❌)
→ 설정 → 내 앱 → </> 웹앱 추가
→ Firebase 호스팅 체크 ❌
→ SDK 설정값 복사
```

### 2단계 — 환경 파일 설정
```bash
# .env.local 파일에 입력
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
`.firebaserc` → `"default": "your-project-id"` 수정

### 3단계 — DB + 인증 설정
```
Firestore → 데이터베이스 만들기 → Standard → asia-northeast3 → 프로덕션 모드
Authentication → Google 로그인 추가
```

### 4단계 — 설치 및 배포
```bash
npm install firebase
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
npm run dev           # 로컬 테스트

npm run build
firebase deploy --only hosting   # 실배포
```

### 수정 후 반복 사이클
```bash
# 코드 수정 → 빌드 → 배포
npm run build && firebase deploy --only hosting
```

---

## Claude Code 활용 팁

- 모델: `/model` → Sonnet 4.6 (기본값 유지)
- 작업 강도: `/effort` → Medium
- 복잡한 설계: `/advisor` → Opus 4.7
- **Plan mode에서 시작** — 먼저 설계, 그다음 구현
- 디자인 변경 시: "기능 절대 깨뜨리지 않음" 원칙을 프롬프트에 명시

---

## 관련 페이지
- [[ai-claudecode-token-save-6tips-2026-04-17]] - Claude Code로 MVP 개발 시 토큰 비용 절감 필수
- [[ai-karpathy-llmwiki-claudecode-2026-04-17]] - Claude Code를 코드 작성 이상으로 활용하는 방법
- [[biz-toss-mvp-litmers-2026-04-17]] - MVP를 만들기 전 프리토타이핑으로 검증하는 전략
- [[biz-neilpatel-million-dollar-roadmap-2026-04-17]] - SEO와 디지털 마케팅을 수익화로 연결하는 로드맵
