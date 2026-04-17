# Skill: wiki-collector
_입력 수집 + 입구 관리 (품질/중복/분류)_

## 역할
외부 자료(URL, 텍스트, PDF, 이미지)를 받아 품질 검사 후 Wiki에 저장한다.

## 트리거
- `수집 https://...`
- `수집 [텍스트]`
- `일기:`, `생각:`, `경험:`, `회고:` 접두사

## 실행 순서

### Step 1 — 입력 타입 판별
| 입력 | 처리 |
|------|------|
| URL | `scripts/scrape_url.py` 실행 → 텍스트 추출 |
| 텍스트 | 그대로 사용 |
| PDF | `scripts/extract_pdf.py` 실행 |
| 이미지 | Claude Vision으로 텍스트 추출 |
| 일기/생각/경험/회고 | 품질 검사 면제, 직접 `나/` 카테고리로 |

### Step 2 — 품질 검사 (`scripts/quality_check.py`)
- 나/ 카테고리 → 면제
- 코마인드웍스 사업 연관성, 구체성, 비스팸 여부 판단
- 저품질 → "품질 기준 미달이에요. 저장하지 않을게요. [사유]"

### Step 3 — 중복 검사 (`scripts/duplicate_check.py`)
- `wiki/index.md` 에서 유사 페이지 검색
- 80%+ 유사 → 사용자 확인 요청

### Step 4 — 카테고리 분류
- `wiki/guidelines/librarian_rules.md` 의 분류 기준 참조
- Claude가 내용 보고 자동 판단
- "📁 [카테고리]로 분류했어요. 맞나요?" 확인

### Step 5 — 저장 실행
1. `wiki/source/[파일명].md` — Raw 원본 저장
2. `wiki/wiki/[카테고리]/[파일명].md` — Wiki 페이지 생성 (`wiki-writer` 스킬 호출)
3. `wiki/index.md` — 목차 업데이트
4. `wiki/log.md` — 이력 기록
5. Git 커밋

### Step 6 — 완료 보고
```
✅ 저장 완료: [제목]
📂 카테고리: [카테고리]
🔗 원본: [출처]
⚠️ 관련 페이지: [[링크1]] [[링크2]]
📅 유통기한: YYYY-MM-DD
```

## 파일 이름 규칙
`[카테고리약어]-[핵심키워드]-[YYYY-MM-DD].md`

## 주의
- `.env` 에서 NOTION_API_KEY, NOTION_DB_ID 읽어서 notion-sync 스킬에 전달
- 저장 실패 시 `wiki/log.md`에 ERROR 기록
