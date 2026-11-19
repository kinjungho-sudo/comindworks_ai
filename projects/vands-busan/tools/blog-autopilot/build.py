# 병원 칼럼 자동 작성기 아티팩트 빌드: python3 tools/blog-autopilot/build.py
# tools/medad_rules.json 규칙을 페이지에 넣어 index.html을 만든다. 규칙을 고치면 다시 빌드해 재게시.
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
r = json.loads((HERE.parent / "medad_rules.json").read_text())
keep = {"pattern_rules": [{k: x[k] for k in ("id", "title", "severity", "patterns", "law", "exceptions") if k in x} for x in r["pattern_rules"]],
        "structure_rules": r["structure_rules"]}
html = (HERE / "template.html").read_text().replace("__RULES__", json.dumps(keep, ensure_ascii=False))
(HERE / "index.html").write_text(html)
print("ok", len(html))
