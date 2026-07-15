# Meeting Upload Feature Design

작성일: 2026-07-15
상태: 설계 초안
담당: Hermes

## 1. 목적

CoMind Works OS에 회의록 업로드 기능을 만든다.

사용자가 녹음 파일 또는 회의 관련 파일을 업로드하면, 시스템이 파일의 생성 일자와 메타데이터를 확인하고, 표준 파일명을 만든 뒤, 내용을 텍스트로 변환/요약하여 회의록을 생성한다.

결과는 로컬 Company OS에 저장되고, 웹에서 조회할 수 있는 저장소에도 함께 저장된다.

## 2. 기본 저장 위치

```text
녹음 원본:
/Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/audio

업로드 원본 임시/수신:
/Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/uploads

Transcript 원문:
/Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/transcripts

최종 회의록 Markdown:
/Users/macmini/Downloads/comindworks_ai/company/02_meetings

웹 게시/동기화 결과 기록:
/Users/macmini/Downloads/comindworks_ai/company/02_meetings/web-published
```

## 3. 업로드 처리 흐름

```text
1. 사용자가 CoMind Works OS에서 회의 파일 업로드
2. 시스템이 파일 수신
3. 파일 생성 일자/수정 일자/파일명을 확인
4. 회의 일자를 결정
5. 표준 파일명 생성
6. 원본 파일을 audio 또는 uploads에 저장
7. 음성 파일이면 STT로 transcript 생성
8. transcript를 transcripts에 저장
9. meeting-template.md 기준으로 회의록 생성
10. 핵심 결정, 주요 논의, 담당자별 액션 아이템 추출
11. 최종 회의록을 02_meetings에 Markdown으로 저장
12. 웹 저장소에도 업로드/게시
13. 결과 링크와 로컬 경로를 file index 또는 meeting index에 기록
```

## 4. 파일명 규칙

파일 생성 일자 또는 회의 일자를 기준으로 이름을 만든다.

```text
YYYY-MM-DD_meeting_<short-topic>.<ext>
YYYY-MM-DD_meeting_<short-topic>_transcript.md
YYYY-MM-DD_meeting_<short-topic>_notes.md
```

예시:

```text
2026-07-15_meeting_customer-kickoff.m4a
2026-07-15_meeting_customer-kickoff_transcript.md
2026-07-15_meeting_customer-kickoff_notes.md
```

## 5. 회의 일자 결정 규칙

```text
1순위: 사용자가 입력한 회의 일자
2순위: 파일 메타데이터의 생성 일자
3순위: 파일 수정 일자
4순위: 업로드한 날짜
```

회의 일자가 불확실하면 회의록 상단에 `확인 필요`로 표시한다.

## 6. 웹 저장 방식

초기 버전에서는 Google Drive를 웹 저장소로 사용한다.

```text
Google Drive:
CoMind Works/04_Meetings/

저장 대상:
- 원본 녹음 파일 또는 원본 업로드 파일
- transcript Markdown 또는 Google Docs 변환본
- 최종 회의록 Markdown 또는 Google Docs 변환본
```

웹 저장 후 회의록에는 다음을 남긴다.

```text
Google Drive 원본 링크:
Google Drive transcript 링크:
Google Drive 회의록 링크:
로컬 원본 경로:
로컬 transcript 경로:
로컬 회의록 경로:
```

## 7. CoMind Works OS 화면 기능 초안

```text
회의록 업로드 화면:
- 파일 선택
- 회의 제목 입력
- 회의 일자 확인/수정
- 참석자 입력
- 관련 프로젝트 선택
- 처리 시작 버튼

처리 결과 화면:
- 생성된 회의록 요약
- 핵심 결정
- 담당자별 액션 아이템
- 로컬 저장 경로
- Google Drive 링크
- Slack 공유 여부
```

## 8. 승인/검토 규칙

```text
- 내부 회의록은 자동 저장 가능
- 고객/외부 공유 회의록은 공유 전 김정호님 승인 필요
- Google Drive 업로드는 자동 가능하되, 외부 공유 권한 설정은 승인 필요
- 회의록 내용이 불확실하면 `확인 필요`로 표시
```

## 9. 아직 정해야 할 것

```text
1. CoMind Works OS 웹 앱의 기술 스택
2. Google Drive 폴더 ID
3. 업로드 가능한 파일 형식
4. STT 도구: local whisper / OpenAI Whisper / 기타
5. 웹 저장 시 Markdown 그대로 둘지 Google Docs로 변환할지
6. 회의록 생성 후 Slack #일일보고 또는 별도 채널에 공유할지
```

## 11. 지원하는 트리거 방식

```text
1. Telegram/Slack 채팅창 파일 업로드
- 김정호님이 녹음 파일을 올리고 “회의록 작성해”라고 요청하면 처리한다.
- 처리 결과는 로컬과 Google Drive meeting 폴더에 저장한다.

2. Google Drive meeting 폴더 지시 기반 처리
- 김정호님이 Google Drive meeting 폴더에 파일을 올린 뒤 “meeting 폴더 최신 파일 회의록으로 처리해줘”라고 요청하면 처리한다.

3. Google Drive meeting 폴더 주기 감지
- 매 1시간마다 meeting 폴더를 확인한다.
- 새 파일이 있으면 Telegram에 알림을 보낸다.
- 새 파일이 없으면 아무 메시지도 보내지 않는다.
- 감지 cron job: Google Drive meeting 폴더 새 파일 감지
- 감지 job_id: 47b64ac97c1a
- 감지 스크립트: /Users/macmini/.hermes/scripts/meeting_drive_watch.py
```

