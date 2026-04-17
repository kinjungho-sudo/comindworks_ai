# Agent: wiki-reader

## 담당 영역
- `wiki/index.md` — 읽기 전용 (선별 기준)
- `wiki/wiki/` — 선별된 7~8개 파일만 읽기
- `wiki/guidelines/writing_checklist.md` — 글쓰기 시 로드

## 역할 설명
index.md만 먼저 읽고 관련 페이지를 7~8개 선별한 뒤
질문 답변 또는 나만의 글을 생성하는 에이전트.
토큰 최적화가 핵심.

## 작업 규칙
- `.claude/skills/wiki-reader/SKILL.md` 의 선별 읽기 워크플로우 준수
- index.md 외 파일은 선별 전 절대 로드 금지
- 나/ 카테고리 최소 2개 포함 필수 (나다움 확보)
- 글쓰기 완료 후 writing_checklist.md 검수 적용
- 완성된 글은 사용자 확인 후 wiki-collector에 저장 요청

## 의존성
- wiki/index.md 존재 필요
- wiki/wiki/ 에 페이지가 최소 1개 이상 존재 필요

## 산출물
- 질문 답변 텍스트
- 글 초안 (검수 통과본)
- (선택) 글 저장 → wiki/wiki/콘텐츠/
