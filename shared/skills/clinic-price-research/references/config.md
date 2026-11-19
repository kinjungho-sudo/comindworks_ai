# price_watch.json 설정

병원 폴더 맨 위에 둔다. 예시(서면 피부과):

```json
{
  "client_label": "서면 피부과",
  "area_keyword": "서면",
  "search_keywords": ["서면", "부산"],
  "area_stations": ["부산 서면역", "부산 부전역", "부산 범내골역", "부산 전포역", "부산 부암역"],
  "own_hospitals": [],
  "procedures": ["pico-toning", "ulthera", "shurink", "thermage", "oligio", "inmode",
                 "potenza", "fraxel", "rejuran", "juvelook", "aquapeel", "botox"],
  "sorts": ["", "LOWEST_DISCOUNTED_COST", "HIGHEST_POPULARITY"],
  "max_requests": 80,
  "max_detail_requests": 150,
  "output_dir": "data/prices",
  "report_dir": "output/prices"
}
```

| 키 | 뜻 |
|---|---|
| `area_keyword` | 보고서 제목에 쓰는 지역명 |
| `search_keywords` | 시술명 앞에 붙일 검색어. 강남언니는 「서면 인모드」보다 「부산 인모드」에서 서면 병원이 더 많이 나오는 경우가 있어 두 개를 같이 쓴다 |
| `area_stations` | 이벤트 카드의 위치 표기(「부산 서면역」처럼 시·도 + 역). 여기 있는 역만 지역 안으로 센다 |
| `own_hospitals` | 우리 병원의 강남언니 표시명(일부만 써도 됨). 보고서에서 주황색으로 강조. 비워 두면 강조 없음 |
| `procedures` | `assets/procedures_derm.json`의 id 목록. 새 시술은 그 파일에 `include`(제목·옵션에 있어야 할 말), `exclude`, `unit`(샷·cc·유닛·회)과 함께 추가 |
| `sorts` | 목록 정렬. `""`=추천, `LOWEST_DISCOUNTED_COST`=낮은가격, `HIGHEST_POPULARITY`=인기, `HIGHEST_RATING_COUNT`=리뷰많은순 |
| `max_requests` / `max_detail_requests` | 한 번 조사에서 새로 여는 목록·상세 화면 상한 |

다른 지역 예: 센텀이면 `"area_keyword": "센텀"`, `"search_keywords": ["센텀", "부산"]`, `"area_stations": ["부산 센텀시티역", "부산 벡스코역", "부산 민락역"]`.
