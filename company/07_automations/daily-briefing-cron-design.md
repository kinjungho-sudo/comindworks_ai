# Daily Briefing Cron Design

작성일: 2026-07-15
상태: cron job 활성화 완료 / 내일부터 매일 오전 10시 실행 / Slack 테스트 메시지 전송 완료
담당: Hermes

## 1. 목적

매일 오전 10시에 CoMind Works의 전날 업무, 자동화 결과, 오늘 할 일, 다음 행동, SOP 개선 후보를 Hermes가 취합해 보고한다.

## 2. 실행 시간

```text
매일 오전 10:00
타임존: Asia/Seoul
```

## 3. 전달 방식

```text
Slack #일일보고:
- 전체 일일보고 전송
- Hermes 최종 취합본을 메인 메시지로 올림
- 에이전트별 상세 내용은 가능하면 스레드에 정리

Telegram:
- 전체 보고는 보내지 않음
- 핵심 2~3줄 요약 알림만 전송
```

## 4. 보고 내용

```text
1. 어제 한 일
2. 에이전트별 활동 요약
3. 자동화 / Cron 실행 결과
4. 완료 여부와 결과
5. 생성된 산출물 / 기록
6. 문제 / 리스크 / 막힌 일
7. 오늘 할 일
8. 다음 해야 할 행동
9. Daily SOP 업데이트 후보
10. 모든 에이전트 공유 메모
```

## 5. 입력 데이터 후보

```text
- Hermes/default session DB
- Lina/Maria/MAX/Ari/Alex profile session DB
- /Users/macmini/Downloads/comindworks_ai/company
- /Users/macmini/Downloads/comindworks_ai/artifacts
- /Users/macmini/Downloads/comindworks_ai/projects/llm-wiki
- Hermes cron job output/history
- Slack/Telegram 대화 기록 또는 Shared Recall 결과
```

## 6. 저장 위치

일일보고 최종 Markdown은 아래에 저장한다.

```text
/Users/macmini/Downloads/comindworks_ai/company/01_daily/YYYY-MM-DD_daily-briefing.md
```

## 7. 자동화 생성 전 확인 필요 항목

```text
1. Slack #일일보고 채널에 Hermes 앱/bot이 들어와 있는지 확인
2. Slack 채널 ID 또는 Hermes가 전달 가능한 채널 대상 확인
3. 테스트 메시지 1회 전송
4. 정상 수신 확인 후 cron job 생성
5. 처음에는 paused 상태 또는 수동 실행 테스트 후 활성화
```

## 8. 김정호님이 지금 해야 할 일

```text
1. Slack #일일보고 채널 열기
2. 채널 상단의 채널명 클릭
3. Integrations / 통합 또는 Members / 멤버에서 Hermes 앱/bot이 있는지 확인
4. 없다면 채널 메시지창에 아래 입력:
   /invite @Hermes
5. Hermes가 초대되면 Telegram에 "초대했어"라고 알려주기
```

## 9. 다음 단계

Hermes가 Slack 채널 연결을 확인한 뒤:

```text
- 테스트 메시지 전송
- cron job 초안 생성
- paused 상태로 둘지 즉시 활성화할지 최종 확인
```
