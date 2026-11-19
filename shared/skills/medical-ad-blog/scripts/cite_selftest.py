#!/usr/bin/env python3
"""출처 검사기 회귀 시험 (네트워크 필요). tests/cite_fake.md에 일부러 넣은 가짜·오류 출처를 모두 잡는지 본다.
    python3 cite_selftest.py   → 전부 잡으면 종료 코드 0"""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cite_check

EXPECT = {  # (규칙, 문헌 번호): 넣어 둔 오류
    ("C1", 5): "본문 번호에 해당 문헌 없음",
    ("C4", 2): "실제 PMID에 지어낸 제목·저자·연도",
    ("C4", 3): "존재하지 않는 PMID",
    ("C5", 4): "철회 논문",
    ("C3", 6): "404 링크",
    ("C6", None): "인용 번호 없는 의학 주장",
}
res = cite_check.check(HERE.parent / "tests" / "cite_fake.md")
got = {(f["id"], f["ref"]) for f in res["findings"]}
miss = [f"{k} {v}" for k, v in EXPECT.items() if k not in got]
false_alarm = [f for f in res["findings"] if f["ref"] == 1]
for m in miss:
    print("MISS", m)
for f in false_alarm:
    print("오탐 [1]", f["message"])
print(f"잡음 {len(EXPECT) - len(miss)}/{len(EXPECT)} · 정상 문헌 오탐 {len(false_alarm)}")
sys.exit(1 if miss or false_alarm else 0)
