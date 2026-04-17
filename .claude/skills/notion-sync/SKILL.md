# Skill: notion-sync
_Wiki 페이지를 노션 DB에 저장_

## 역할
Wiki 페이지 메타데이터를 노션 DB에 동기화한다.

## 트리거
- wiki-collector 완료 후 자동 호출 (NOTION_API_KEY 환경변수 존재 시)
- 수동: `"노션 동기화해줘"`

## 환경변수 (`.env` 파일)
```
NOTION_API_KEY=secret_...
NOTION_WIKI_DB_ID=...
```

## 노션 DB 필드 매핑
| Wiki frontmatter | 노션 필드 | 타입 |
|-----------------|----------|------|
| title | 제목 | Title |
| created | 날짜 | Date |
| category | 카테고리 | Select |
| tags | 태그 | Multi-select |
| source | 원본 URL | URL |
| type | 입력 타입 | Select |
| (핵심 요약) | 요약 | Text |
| expires | 유통기한 | Date |
| (저장완료) | 상태 | Select |

## 실행
```bash
python .claude/skills/notion-sync/scripts/save_to_notion.py \
  --title "제목" \
  --category "AI에이전트" \
  --tags "AI,에이전트" \
  --source "https://..." \
  --type "url" \
  --summary "3줄 요약" \
  --expires "2026-10-17"
```

## 주의
- NOTION_API_KEY 없으면 스킵 (에러 아님)
- 노션 연동은 v1.2 기능 — 키 없어도 나머지 동작에 영향 없음
