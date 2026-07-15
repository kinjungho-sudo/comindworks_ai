# Company GitHub Sync Rules

작성일: 2026-07-15
상태: 승인됨
승인자: 김정호님
담당: Hermes

## 1. 목적

CoMind Works Company 기록 중 버전 관리가 필요한 공식 Markdown 문서는 GitHub에 저장하고, 원본/대용량/민감 가능성이 있는 자료는 로컬 또는 Google Drive에만 둔다.

## 2. GitHub에 저장할 것

```text
company/README.md
company/index.md
company/search-index.json
company/build-search-index.py

company/01_daily/
company/02_meetings/*.md
company/02_meetings/web-published/*.md
company/03_decisions/
company/04_files/
company/05_improvements/
company/06_approvals/
company/07_automations/
company/09_DR/
```

## 3. GitHub에서 제외할 것

```text
company/08_sources/meetings/audio/
company/08_sources/meetings/uploads/
company/08_sources/meetings/transcripts/

녹음 원본
대용량 미디어
민감한 고객 원문
API key / token / secret
임시 파일
```

## 4. 저장소별 역할

```text
Local Mac mini:
- 전체 원본과 AI 처리 기준 저장소
- 오디오, transcript, 임시 업로드, 자동화 로그 포함

Google Drive:
- 녹음/대용량/공유용 파일
- 웹 접근 가능한 원본/최종본 링크

GitHub:
- 공식 Markdown 기록
- DR, 결정, 회의록 요약, 개선 후보, 자동화 설계, 템플릿

CoMind Works OS:
- Local/GitHub/Drive 데이터를 통합해 검색/조회/편집하는 화면
```

## 5. 운영 규칙

```text
1. 새 공식 Markdown 문서는 GitHub sync 후보가 된다.
2. 오디오/영상/대용량 파일은 GitHub에 올리지 않는다.
3. transcript는 기본적으로 GitHub에 올리지 않는다.
4. transcript에서 민감정보 제거 후 요약본으로 승격된 문서만 GitHub에 올릴 수 있다.
5. 외부 공유 권한 변경은 김정호님 승인 후 진행한다.
6. CoMind Works OS 검색은 title/aliases/keywords/body 기반으로 동작해야 한다.
```
