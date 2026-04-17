# [원본] 클로드 코드 토큰 녹는 분들, 이 6가지만 바꿔보세요

**출처**: https://www.youtube.com/watch?v=gLZ1wJUADqk&t=3s  
**수집일**: 2026-04-17  
**참고 자료**: https://velog.io/@hbcho/클로드-코드-토큰-절약-설정-7가지

---

## 원본 요약

Claude Code 사용 시 토큰이 빠르게 소진되는 문제를 해결하는 6~7가지 설정 변경 방법.
Pro 플랜 기준, Sonnet 모델 고정과 컨텍스트 관리가 핵심.

### 핵심 설정 목록

1. **기본 모델 Sonnet 고정** (`settings.json`) — Opus는 4~5배 비쌈
2. **하이브리드 모드** (`/model opusplan`) — 계획은 Opus, 실행은 Sonnet
3. **컨텍스트 정리** (`/clear` & `/compact`) — 불필요한 대화 기록 제거
4. **Extended Thinking 끄기** — 최대 3만 토큰 낭비 방지
5. **콕 집어 질문** — "auth.ts의 login 함수만 봐줘" 식으로 파일 지정
6. **MCP 도구 검색 끄기** — 안 쓰는 MCP 비활성화
7. **CLAUDE.md 분리** — 500줄 이하 유지, 작업별 SKILL.md 분리
