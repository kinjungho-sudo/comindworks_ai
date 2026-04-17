# LLM Wiki 웹앱 설계서 v1.0

**작성일**: 2026-04-17
**작성자**: 코마인드웍스
**버전**: v1.0

---

## 1. 한 줄 요약

> "폰으로 URL 던지면 30초 안에 내 Wiki에 저장되는 개인 지식 수집 웹앱"

---

## 2. 목표

- **Must**: 어디서든 URL/텍스트/파일을 던지면 자동으로 Wiki에 저장
- **Must**: 처리 상태 실시간 표시 + 완료 알림
- **Must**: 모바일 완벽 지원
- **Should**: Wiki 현황 대시보드
- **Could**: 저장된 페이지 품질 피드백

---

## 3. 시스템 아키텍처

```
📱 wiki.comindworks.xyz (Vercel 프론트)
        │
        │ HTTP POST /api/collect
        ▼
🖥️ Mac Mini API 서버 (포트 3000)
  Cloudflare Tunnel로 외부 노출
        │
        ▼
⚙️ Claude Code 실행
  - URL 스크래핑
  - Wiki 페이지 생성
  - index.md 업데이트
  - Git push
        │
        ▼
📊 결과 반환 → 웹앱에 실시간 표시
```

---

## 4. 화면 구성 (3개)

### 화면 1: 수집창 (메인, Day 4)

```
┌─────────────────────────────┐
│   LLM Wiki                  │
│                             │
│  ┌─────────────────────┐    │
│  │ URL 또는 텍스트 입력 │    │
│  └─────────────────────┘    │
│                             │
│  [파일 첨부]  [수집 시작]    │
│                             │
│  ── 처리 상태 ──            │
│  ✅ 스크래핑 완료           │
│  ✅ Wiki 페이지 생성        │
│  ⏳ Git push 중...          │
│                             │
│  ── 최근 수집 ──            │
│  · LLM Wiki 개념 (방금)     │
│  · n8n 자동화 (1시간 전)    │
└─────────────────────────────┘
```

### 화면 2: 대시보드 (Should, Day 4)

```
┌─────────────────────────────┐
│  Wiki 현황                  │
│                             │
│  42개   7개    3개   1건    │
│  전체   이번주  만료  모순   │
│                             │
│  ── 카테고리별 ──           │
│  AI에이전트  ████ 12        │
│  자동화      ███  8         │
│  나          ██   15        │
│                             │
│  ── 최근 추가 ──            │
│  · LLM Wiki 개념            │
│  · 하네스 엔지니어링        │
└─────────────────────────────┘
```

### 화면 3: 피드백 (Could, Day 5)

```
┌─────────────────────────────┐
│  저장된 페이지 확인         │
│                             │
│  LLM Wiki 개념              │
│  📂 AI에이전트 · 97점       │
│                             │
│  ## 요약                    │
│  AI에게 빈 종이가 아닌...   │
│                             │
│  ## 핵심 내용               │
│  · Source / Wiki / Guide    │
│                             │
│  [수정] [삭제] [재수집]     │
└─────────────────────────────┘
```

---

## 5. 기술 스택

| 영역 | 기술 | 이유 |
|------|------|------|
| 프론트 | Next.js + Tailwind | Vercel 최적화 |
| 백엔드 | FastAPI (Python) | Claude Code와 동일 언어 |
| 실시간 | SSE (Server-Sent Events) | 처리 상태 스트리밍 |
| 배포 | Vercel (프론트) + Mac Mini (백엔드) | 기존 인프라 활용 |
| 터널 | Cloudflare Tunnel | 기존 설정 활용 |

---

## 6. API 설계

### POST /api/collect
```json
요청:
{
  "type": "url | text | file",
  "content": "https://... 또는 텍스트",
  "file": "base64 인코딩 (파일일 경우)"
}

응답 (SSE 스트리밍):
data: {"step": "scraping", "status": "processing"}
data: {"step": "scraping", "status": "done"}
data: {"step": "wiki_generate", "status": "processing"}
data: {"step": "wiki_generate", "status": "done", "page": "ai-llm-wiki.md"}
data: {"step": "git_push", "status": "done"}
data: {"step": "complete", "title": "LLM Wiki 개념", "category": "AI에이전트"}
```

### GET /api/dashboard
```json
응답:
{
  "total": 42,
  "this_week": 7,
  "expiring": 3,
  "conflicts": 1,
  "categories": {
    "AI에이전트": 12,
    "자동화": 8,
    "나": 15
  },
  "recent": [...]
}
```

### GET /api/pages
```json
응답:
{
  "pages": [
    {
      "title": "LLM Wiki 개념",
      "category": "AI에이전트",
      "quality_score": 97,
      "date": "2026-04-17",
      "path": "wiki/AI에이전트/ai-llm-wiki.md"
    }
  ]
}
```

---

## 7. 폴더 구조

```
llm-wiki-webapp/
├── frontend/                  ← Next.js (Vercel 배포)
│   ├── app/
│   │   ├── page.tsx           ← 수집창 (메인)
│   │   ├── dashboard/
│   │   │   └── page.tsx       ← 대시보드
│   │   └── pages/
│   │       └── page.tsx       ← 피드백
│   └── components/
│       ├── CollectForm.tsx    ← URL/텍스트/파일 입력
│       ├── StatusStream.tsx   ← 실시간 처리 상태
│       ├── RecentList.tsx     ← 최근 수집 목록
│       └── Dashboard.tsx      ← Wiki 현황
│
└── backend/                   ← FastAPI (Mac Mini 실행)
    ├── main.py                ← API 서버
    ├── routes/
    │   ├── collect.py         ← 수집 API
    │   ├── dashboard.py       ← 대시보드 API
    │   └── pages.py           ← 페이지 목록 API
    ├── services/
    │   ├── scraper.py         ← URL 스크래핑
    │   ├── wiki_generator.py  ← Wiki 페이지 생성
    │   └── git_service.py     ← Git push
    └── .env                   ← API 키 설정
```

---

## 8. Cloudflare Tunnel 설정

```yaml
# 기존 설정에 추가
ingress:
  - hostname: n8n.comindworks.xyz
    service: http://localhost:5678    ← 기존 n8n 그대로

  - hostname: wiki.comindworks.xyz   ← 새로 추가
    service: http://localhost:3000   ← Wiki 웹앱 백엔드
```

---

## 9. 구현 순서 (Day 4)

### Phase 1: 백엔드 API (30분)
- [ ] FastAPI 서버 설정
- [ ] /api/collect 엔드포인트 (SSE)
- [ ] /api/dashboard 엔드포인트
- [ ] Mac Mini에서 실행 확인

### Phase 2: Cloudflare 서브도메인 (10분)
- [ ] wiki.comindworks.xyz 서브도메인 추가
- [ ] Cloudflare Tunnel 설정 업데이트
- [ ] 외부 접속 확인

### Phase 3: 프론트엔드 (40분)
- [ ] Next.js 프로젝트 생성
- [ ] 수집창 UI 구현
- [ ] SSE 실시간 상태 표시
- [ ] 모바일 반응형 적용
- [ ] Vercel 배포

### Phase 4: 테스트 (20분)
- [ ] 폰에서 wiki.comindworks.xyz 접속
- [ ] URL 수집 테스트
- [ ] 텍스트 수집 테스트
- [ ] 실시간 상태 표시 확인
- [ ] Wiki 저장 확인

---

## 10. 비용

| 항목 | 비용 |
|------|------|
| Vercel (프론트) | 무료 |
| Mac Mini (백엔드) | 무료 (기존) |
| Cloudflare Tunnel | 무료 (기존) |
| wiki.comindworks.xyz | 무료 (서브도메인) |
| Claude API (수집당) | ~$0.005 |
| 총 추가 비용 | ~$0 |

---

## 11. 고도화 로드맵

| 버전 | 내용 | 시점 |
|------|------|------|
| v1.0 | 수집창 + 실시간 상태 | Day 4 |
| v1.1 | 대시보드 추가 | Day 4 완료 후 |
| v1.2 | 피드백 (페이지 확인/수정) | Day 5 |
| v2.0 | Docker 패키징 (오픈소스) | 1개월 후 |
