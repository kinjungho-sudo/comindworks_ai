# 병원 블로그·SNS 스튜디오 (clinic-content)

병원 블로그·SNS 원고의 **발행 전 점검 → 원장님 승인 → 사전심의 → 게시 기록**과 **시술가 시세**를 보는 맥미니 로컬 앱. 리뷰는 [clinic-reviews](../clinic-reviews/)에서 다룬다.

```bash
cd projects/clinic-content
npm install        # 처음 한 번
npm run dev        # http://localhost:3300
```

| 메뉴 | 하는 일 | 엔진 |
|---|---|---|
| 원고 · 점검 · 승인 | `output/<날짜>_*/*.md` 원고, 발행 전 점검(의료광고·GEO·출처), 승인·심의필·게시 기록 | `shared/skills/medical-ad-blog/scripts/final_check.py` |
| 시술가 시세 (내부) | 강남언니 이벤트가 보고서, 사람이 눌러서 새 조사 | `shared/skills/clinic-price-research/scripts/price_research.py` |

- 승인 관문: 점검 통과 + 점검 뒤 원고 그대로 + `[원장님 확인]` 0곳 → 승인. 네이버·인스타·유튜브는 심의필 번호가 있어야 게시 기록(의료법 제57조·시행령 제24조).
- 데이터: 병원 폴더 `data/approvals.json`(기록), `docs/reviews/`(점검 보고서·출처 대조표), `data/prices/_run.*`(시세 실행 상태, git 제외).
