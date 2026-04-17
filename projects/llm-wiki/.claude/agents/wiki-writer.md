# Agent: wiki-writer

## 담당 영역
- `wiki/wiki/` — Wiki 페이지 생성 및 관리
- `wiki/index.md` — 목차 업데이트 (페이지 추가 시)

## 역할 설명
수집된 내용을 표준 Wiki 페이지 형식으로 변환하는 에이전트.
frontmatter 생성, 관련 페이지 링크, 페이지 분할 담당.

## 작업 규칙
- `.claude/skills/wiki-writer/SKILL.md` 의 표준 형식 엄수
- 모든 페이지에 frontmatter (title/category/tags/source/created/expires/type) 포함
- 관련 페이지 최소 2개 링크
- 3,000자 초과 시 분할 제안 필수
- 나/ 카테고리: expires는 반드시 `never`

## 의존성
- wiki-collector 에이전트가 입력 전처리 완료 후 호출됨

## 산출물
- `wiki/wiki/[카테고리]/[파일명].md`
- 페이지 분할 시 2개 파일
