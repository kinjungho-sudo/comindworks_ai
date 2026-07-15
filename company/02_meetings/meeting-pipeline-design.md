# Meeting Pipeline Design

작성일: 2026-07-15
상태: 설계 초안
담당: Hermes

## 1. 목적

CoMind Works의 회의와 중요한 업무 대화를 Markdown 회의록으로 정리하고, 결정사항/액션아이템/SOP 후보를 추출한다.

## 2. 회의 데이터 유형

```text
A. 사람 간 회의
- 입력: 녹음 파일
- 처리: STT/transcript 생성 → 회의록 작성 → 결정/할일/SOP 후보 추출

B. AI와의 회의 / 내부 직원들과의 회의
- 입력: Slack 또는 Telegram 대화
- 처리: 김정호님이 "회의록 작성해"라고 요청 → 해당 대화 맥락 정리 → 회의록 작성
```

## 3. 운영 원칙

```text
- 모든 회의록은 Markdown으로 저장한다.
- 회의록 기본 위치는 /Users/macmini/Downloads/comindworks_ai/company/02_meetings 이다.
- 사람 간 회의 녹음 원본은 Google Drive 또는 local source 위치에 보관하고, 회의록에는 링크/경로를 남긴다.
- AI/내부 대화 회의록은 Slack/Telegram 원문 링크 또는 session/search 근거를 남긴다.
- 중요한 결정과 액션 아이템은 일일보고와 연결한다.
- SOP/자동화 후보는 05_improvements에 연결한다.
```

## 4. 사람 간 회의 처리 흐름

```text
1. 김정호님이 녹음 파일을 제공하거나 지정 폴더에 저장
2. Hermes가 파일명, 날짜, 참석자, 회의 목적을 확인
3. STT로 transcript 생성
4. transcript 원본 저장
5. meeting-template.md 기준으로 회의록 작성
6. 핵심 결정, 주요 논의, 담당자별 액션 아이템 추출
7. 회의록을 02_meetings에 저장
8. 필요한 경우 산출물 index, 일일보고, 개선 후보와 연결
```

## 5. Slack / Telegram 회의 처리 흐름

```text
1. Slack 또는 Telegram에서 회의/업무 대화 진행
2. 김정호님이 "회의록 작성해"라고 요청
3. Hermes가 현재 대화 또는 지정된 스레드/대화 범위를 확인
4. meeting-template.md 기준으로 회의록 작성
5. 핵심 결정, 주요 논의, 담당자별 액션 아이템 추출
6. 회의록을 02_meetings에 저장
7. 필요하면 #일일보고 또는 관련 프로젝트 기록에 요약 연결
```

## 6. 저장 파일명 규칙

```text
YYYY-MM-DD_meeting_<short-topic>.md

예:
2026-07-15_meeting_daily-briefing-slack-setup.md
2026-07-15_meeting_customer-kickoff.md
```

## 7. 회의록 필수 섹션

```text
1. 회의 정보
2. 회의 목적
3. 핵심 결정
4. 주요 논의
5. 담당자별 액션 아이템
6. 리스크 / 이슈
7. 다음 단계
8. SOP / 자동화 후보
9. 에이전트 공유 메모
```

## 8. 김정호님 사용 문장

Slack/Telegram에서 아래처럼 요청하면 회의록을 작성한다.

```text
회의록 작성해

방금 대화 회의록 작성해

이 스레드 회의록 작성해

이 녹음 파일 회의록으로 만들어줘

회의록 작성하고 결정사항이랑 액션아이템 뽑아줘
```

## 9. 아직 정해야 할 것

```text
1. 녹음 파일 기본 저장 위치: `/Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/audio` 확정
2. transcript 원본 저장 위치: `/Users/macmini/Downloads/comindworks_ai/company/08_sources/meetings/transcripts` 확정
3. Google Drive 업로드/보관 규칙: 초기 웹 저장소는 Google Drive `CoMind Works/04_Meetings/` 후보
4. STT 도구 우선순위
5. 회의록을 Slack 어디에 공유할지
6. CoMind Works OS 웹 업로드 화면/기능 구현 방식
```
