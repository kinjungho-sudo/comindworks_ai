# CoMind Works OS Storage & Search Design

작성일: 2026-07-15
상태: 설계 초안
담당: Hermes

## 1. 목적

CoMind Works OS에서 회사 기록, 회의록, DR, 결정, 산출물, 개선 후보를 바로 조회하고 검색할 수 있게 한다.

저장소는 로컬과 GitHub를 함께 사용하되, CoMind Works OS는 사용자가 보기 쉬운 검색/조회 화면을 제공한다.

## 2. 저장소 역할

```text
Local Mac mini:
- AI 에이전트가 읽고 쓰는 1차 운영 저장소
- 빠른 처리, STT, transcript, 원본 파일, 자동화 로그
- 경로: /Users/macmini/Downloads/comindworks_ai/company

GitHub:
- 버전 관리가 필요한 Markdown 공식 기록 저장소
- 회의록 요약, DR, 결정 로그, SOP, 에이전트/직원 프로필, 운영 규칙
- 민감정보/대용량 원본/녹음 파일은 저장하지 않음

Google Drive:
- 녹음, 대용량 파일, 공유용 문서, 웹 접근 가능한 원본/최종본 보관
- Drive 링크는 Markdown 메타데이터에 기록

CoMind Works OS:
- 조회/검색/편집 UI
- Local/GitHub/Drive의 데이터를 사람이 보기 좋게 통합 표시
```

## 3. CoMind Works OS 검색 대상

```text
- title
- aliases
- keywords
- participants
- related_project
- source.drive_file_name
- source.drive_links
- local_paths
- body text
- tags
- type
- date
```

중요 원칙:

```text
파일명은 시스템용
제목은 사람용
aliases/keywords는 검색용
본문은 맥락용
```

## 4. 문서 메타데이터 표준

모든 주요 Markdown 문서 상단에 YAML frontmatter를 둔다.

```yaml
---
title: 두두강사님 면담
type: meeting
date: 2026-07-15
slug: dudu-instructor-interview
status: draft
aliases:
  - 두두 강사님 면담
  - 두두강사님
  - 두두 강사님
keywords:
  - AI 교육
  - 컨설팅
  - B2B
  - 온프레미스
participants:
  - 김정호
  - 두두강사님
related_project:
  - AI 교육·컨설팅 사업
source:
  drive_file_name: 두두강사님 면담.m4a
  drive_file_id: 17F7cVSupwhaH2VfgLT8y_VNvDFm7EAJR
  local_audio: /Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/audio/2026-07-15_meeting_dudu-instructor-interview.m4a
  transcript: /Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/transcripts/2026-07-15_meeting_dudu-instructor-interview_transcript.md
---
```

## 5. GitHub 저장 원칙

```text
GitHub에 저장:
- 01_daily 요약본
- 02_meetings 최종 회의록 Markdown
- 03_decisions 결정 로그
- 05_improvements 개선 후보
- 07_automations 자동화 설계/운영 카드
- 09_DR 설계 리뷰
- README/index/templates

GitHub에 저장하지 않음:
- 녹음 원본
- 대용량 미디어
- 민감한 고객 원문
- 토큰/API key/비밀정보
- 임시 transcript 중 민감정보 포함 가능성이 높은 원본
```

## 6. CoMind Works OS 조회 화면 초안

```text
메인 검색:
- 전체 검색창
- 한글 제목/별칭/키워드/본문 검색

필터:
- 문서 유형: meeting / DR / decision / daily / improvement / automation / file
- 날짜
- 관련 프로젝트
- 담당자/참석자
- 상태

상세 화면:
- 제목
- 요약
- 핵심 결정
- 액션 아이템
- 관련 파일/Drive 링크
- 로컬 경로
- GitHub 경로
- 관련 DR/Decision/Improvement 링크
```

## 7. 동기화 전략

초기 전략은 단순하게 유지한다.

```text
1. 로컬 Markdown을 1차로 만든다.
2. 민감정보/대용량 여부를 확인한다.
3. GitHub에 올릴 수 있는 문서는 commit/push 후보로 표시한다.
4. CoMind Works OS는 로컬 파일을 우선 읽고, 필요하면 GitHub 최신본과 비교한다.
5. Google Drive 링크는 문서 메타데이터로 연결한다.
```

추후 자동화:

```text
- 문서 생성 시 자동 frontmatter 생성
- SQLite 또는 검색 인덱스 생성
- GitHub sync cron
- CoMind Works OS 웹앱에서 검색 API 제공
```

## 8. 다음 구현 후보

```text
1. 모든 템플릿에 YAML frontmatter 추가
2. 기존 샘플 회의록에 title/aliases/keywords 추가
3. company 문서 검색 인덱스 스크립트 생성
4. GitHub에 올릴/제외할 경로 규칙 작성
5. CoMind Works OS 웹앱의 첫 화면: 검색 + 최근 문서 목록
```
