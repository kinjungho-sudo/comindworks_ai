#!/usr/bin/env python3
"""검사기 회귀 시험. tools/medad_cases.json의 문장마다 기대 결과(B=block, W=warn, P=통과)와 비교한다.
규칙(medad_rules.json)을 고칠 때마다 실행: python3 tools/medad_selftest.py  (전부 맞으면 종료 코드 0)"""
import json, os, subprocess, sys, tempfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
cases = json.loads((HERE / "medad_cases.json").read_text(encoding="utf-8"))
miss = 0
for c in cases:
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write("---\ntitle: t\n---\n" + c["text"] + "\n시술 후 부작용이 생길 수 있고 개인차가 있어요.\n")
        p = f.name
    out = json.loads(subprocess.run([sys.executable, str(HERE / "medad_check.py"), p, "--json"],
                                    capture_output=True, text=True).stdout)[p]
    os.unlink(p)
    got = "B" if any(x["severity"] == "block" for x in out) else ("W" if out else "P")
    if got != c["expect"]:
        miss += 1
        print(f"MISS 기대 {c['expect']} → 결과 {got} | {c['text']}")
print(f"정답 {len(cases) - miss}/{len(cases)}")
sys.exit(1 if miss else 0)
