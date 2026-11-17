# 이미지 생성 기록

## pore-mirror-ai.png (1536×1024) → images/pore-mirror.png
- 도구: codex-cli 0.162.1 내장 image_generation, 2026-11-17 (빠나나 커넥터 연결 끊김으로 대체)
- SHA-256: 95a8c7a0bd548aa3ec6199db744494274237deabba6d35c9ce1eb4ec64132a65
- 프롬프트·실행 로그: ../../src/codex-run-mirror.log
- 검수: 수채화 일러스트, 차분한 표정, 글자·상표·시술 장면·전후 비교 없음. 원고에 "AI로 만든 일러스트이며 실제 환자가 아닙니다" 표기함

## pore-types-ai.png (1536×1024) → images/pore-types.png
- 도구: codex-cli 0.162.1 내장 image_generation, 2026-11-17
- SHA-256: 6a7fddf43f4cf7ba9d149cfa4aea60b4130e1671589b2cf67030e4a31b0719fa
- 프롬프트·실행 로그: ../../src/codex-run-types.log
- 글자 정책: AI 이미지에는 글자 없음. 제목·층 이름·설명은 src/pore-types-ai.html에서 얹음
- 검수: 왼쪽(커진 피지샘·피지가 찬 둥근 모공)은 문헌 [3]의 '피지 분비', 오른쪽(성근 섬유·처지며 늘어진 입구)은 [3][5]의 '모공 주변 탄력 저하·처짐'과 맞음을 육안 확인. 단순화한 개념도임을 그림 안에 표기. 인물·시술 장면·전후 비교 없음

## spot-check-ai.png (1024×1024 추정) → 카드 이미지 배경 그림
- 도구: Codex CLI 내장 image_generation, 2026-11-17
- SHA-256: 14ad6b7580ebece24858ccb6119d11ae43125be1bfa790f1ce65a6740d706b8b
- 프롬프트·실행 로그: ../../src/codex-run-check.log
- 검수: 수채화 정물, 사람·글자·상표·의료기기 없음

## spot-homecare-ai.png (1024×1024 추정) → 카드 이미지 배경 그림
- 도구: Codex CLI 내장 image_generation, 2026-11-17
- SHA-256: 429265c9b2e6da28d4e393134418827f472b9a2c4d09021b9f6d47b069a509a7
- 프롬프트·실행 로그: ../../src/codex-run-homecare.log
- 검수: 수채화 정물, 사람·글자·상표·의료기기 없음

## spot-consult-ai.png (1024×1024 추정) → 카드 이미지 배경 그림
- 도구: Codex CLI 내장 image_generation, 2026-11-17
- SHA-256: 207d347721968f0c52f17e87b5b4a5e362c44d059f97577f47b73560cbca4325
- 프롬프트·실행 로그: ../../src/codex-run-consult.log
- 검수: 수채화 정물, 사람·글자·상표·의료기기 없음

## 카드 이미지 images/cards/pores-01~08.png
- src/cards.html(에이투지체, OFL)에서 render_cards.js로 렌더. 카드 글자는 src/cards-text.md로 의료광고 검사(block 0)
