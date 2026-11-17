# 결정 기록

- 2026-11-15: 블로그 브랜드 파일(BRAND.md·VOICE.md) 생성. 독자=피부과를 찾는 예비 고객, 말투=다정한 존댓말("저희 병원"), 주제=피부 고민 정보·시술 설명, 금지=후기 인용·효과 보장/최상급·타 병원 비교.
- 2026-11-15: 의료광고 사전 검사기(tools/medad_check.py) 도입. 글마다 보여주기·커밋 전 필수 실행, block 0건이어야 진행.
- 2026-11-16: 병원 실명 비공개 결정. 글에서는 '저희 병원'으로만 지칭, 검사기 N-realname 규칙 추가.
- 2026-11-17: 원장님 확인 질문지 작성(docs/director-questionnaire.md) — 자리표시 31곳을 질문 17개로 묶음. 답 받으면 일괄 반영.
- 2026-11-17: 스킬 초안 medical-ad-blog를 shared/skills/에 만듦. 공통 규칙은 스킬, 서면점 실명 규칙은 medad_local.json으로 분리. 프로젝트 tools/는 스킬 확정 전까지 유지(결과 동일 확인).
- 2026-11-17: 모공 글을 blog-write(claude-blog, 설치 수 2.7K·BRAND/VOICE 연동) + medical-ad-blog 게이트로 작성. PicPost(picpo.app)는 사진·메모 기반 후기형 초안 도구이고 네이버 입력기는 Windows 전용이라 이번 글에는 쓰지 않음(크레딧 사용 0). 네이버 게시 묶음(naver_export.py) 도입.
