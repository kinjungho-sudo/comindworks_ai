# LLM Wiki Webapp

폰으로 URL 던지면 30초 안에 내 Wiki에 저장되는 개인 지식 수집 웹앱

## 구조

- `frontend/` — Next.js + Tailwind (Vercel 배포)
- `backend/` — FastAPI (Mac Mini 포트 3000 실행)

## Mac Mini 백엔드 설치

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env에 ANTHROPIC_API_KEY, WIKI_ROOT, REPO_ROOT 설정
chmod +x start.sh
./start.sh
```

## Cloudflare Tunnel 설정

`cloudflare-tunnel.yaml` 내용을 `~/.cloudflared/config.yml`에 병합 후:

```bash
cloudflared tunnel run
```

## Vercel 프론트엔드 배포

```bash
cd frontend
# .env.local의 NEXT_PUBLIC_API_URL을 https://wiki.comindworks.xyz 로 변경
vercel --prod
```

## 환경변수

| 변수 | 설명 |
|------|------|
| ANTHROPIC_API_KEY | Claude API 키 |
| WIKI_ROOT | wiki/ 폴더 절대 경로 |
| REPO_ROOT | 저장소 루트 절대 경로 |
| NEXT_PUBLIC_API_URL | 백엔드 URL (로컬: http://localhost:3000) |
