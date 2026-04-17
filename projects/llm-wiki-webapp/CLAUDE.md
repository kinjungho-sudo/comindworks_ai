# LLM Wiki Webapp

폰으로 URL 던지면 30초 안에 내 Wiki에 저장되는 개인 지식 수집 웹앱.

---

## 역할

Claude는 이 프로젝트에서 **웹앱 개발자** 역할을 수행한다.
- 백엔드: FastAPI (Mac Mini, 포트 3000)
- 프론트엔드: Next.js + Tailwind (Vercel)
- 노출: Cloudflare Tunnel → `wiki.comindworks.xyz`

LLM Wiki 데이터([../llm-wiki/data/](../llm-wiki/data/))를 읽고 쓰는 얇은 API 계층이다.

---

## 구조

```
llm-wiki-webapp/
├── backend/                      FastAPI 서버
│   ├── routes/                   API 엔드포인트
│   ├── services/                 Wiki 생성·저장 로직
│   ├── .env                      ANTHROPIC_API_KEY, WIKI_ROOT, REPO_ROOT
│   └── start.sh
├── frontend/                     Next.js 앱
└── cloudflare-tunnel.yaml        터널 설정
```

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `WIKI_ROOT` | `/Users/macmini/Downloads/comindworks_ai/projects/llm-wiki/data` |
| `REPO_ROOT` | `/Users/macmini/Downloads/comindworks_ai` |
| `NEXT_PUBLIC_API_URL` | 백엔드 URL (로컬: `http://localhost:3000`, 원격: `https://wiki.comindworks.xyz`) |

---

## 실행

### 백엔드 (Mac Mini)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 최초 1회, 후 값 수정
./start.sh
```

### 프론트엔드 (로컬 개발)
```bash
cd frontend
npm install
npm run dev
```

### 프론트엔드 배포 (Vercel)
```bash
cd frontend
vercel --prod
```

### Cloudflare Tunnel
`cloudflare-tunnel.yaml` 내용을 `~/.cloudflared/config.yml`에 병합 후:
```bash
cloudflared tunnel run
```

---

## 작업 규칙

1. **Wiki 데이터 쓰기는 항상 서비스 계층 경유** — `backend/services/wiki_generator.py` 가 단일 진입점. 라우트에서 직접 파일 조작 금지.
2. **환경변수 하드코딩 금지** — 경로는 `WIKI_ROOT`, `REPO_ROOT` 를 통해 읽는다.
3. **프론트 변경 시 `npm run build` 로 타입 체크 확인 후 커밋**
4. **백엔드 변경 후 로컬 테스트 전 `curl http://localhost:3000/health` 로 기동 확인**

---

## 관련 프로젝트
- 데이터 소스: [../llm-wiki/](../llm-wiki/) (이 웹앱이 읽고 쓰는 대상)
- 루트 오케스트레이터: [../../CLAUDE.md](../../CLAUDE.md)
