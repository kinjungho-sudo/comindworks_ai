#!/usr/bin/env python3
"""의료광고 사전 검사기 (서면 피부과 블로그용).

의료법 제56조 제2항·시행령 제23조 기준으로 마크다운 원고를 검사한다.
자동 검사는 1차 거름망일 뿐, 의료광고 사전심의나 법률 검토를 대신하지 않는다.

사용법:
    python3 tools/medad_check.py <원고.md> [<원고2.md> ...] [--json]

종료 코드: 0 = block 없음, 1 = block 있음(발행 불가), 2 = 실행 오류
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RULES_PATH = HERE / "medad_rules.json"
BRAND_PATH = HERE.parent / "BRAND.md"

IMG_RE = re.compile(r"!\[([^\]]*)\]\(([^)]*)\)")
LINK_RE = re.compile(r"\]\([^)]*\)")
URL_RE = re.compile(r"https?://\S+")
MARKER_RE = re.compile(r"\[(IMAGE|CHART|VIDEO|추후 기입|원장님 확인)[^\]]*\]")


def load_rules():
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def brand_taboo_phrases():
    """BRAND.md의 '### Taboo phrases' 아래 목록을 읽는다 (없으면 빈 목록)."""
    if not BRAND_PATH.exists():
        return []
    phrases, inside = [], False
    for line in BRAND_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip().lower().startswith("### taboo phrases"):
            inside = True
            continue
        if inside:
            if line.startswith("#"):
                break
            m = re.match(r"\s*-\s+(.+)", line)
            if m and m.group(1).strip().lower() != "not provided":
                phrases.append(m.group(1).strip())
    return phrases


def split_body(text):
    """frontmatter를 떼고 (본문 시작 줄번호, 줄 목록)을 돌려준다."""
    lines = text.splitlines()
    start = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break
    return start, lines


def references_start(lines, start, headings):
    for i in range(start, len(lines)):
        plain = re.sub(r"[*#\s]", "", lines[i])
        if any(plain.startswith(h.replace(" ", "")) for h in headings):
            return i
    return len(lines)


def visible(line):
    """링크 주소·URL·자리표시를 지운, 독자에게 보이는 글자."""
    line = IMG_RE.sub("", line)
    line = LINK_RE.sub("]", line)
    line = URL_RE.sub("", line)
    return line


def excerpt(line, m, width=24):
    s, e = max(0, m.start() - width), min(len(line), m.end() + width)
    return ("…" if s else "") + line[s:e].strip() + ("…" if e < len(line) else "")


def check_file(path, rules, taboo):
    text = Path(path).read_text(encoding="utf-8")
    start, lines = split_body(text)
    st = rules["structure_rules"]
    ref_at = references_start(lines, start, st["references_heading"])
    findings = []

    def add(rule, ln, snippet, severity=None, title=None):
        findings.append({
            "severity": severity or rule["severity"],
            "id": rule["id"] if rule else "S",
            "law": rule["law"] if rule else "",
            "title": title or rule["title"],
            "line": ln + 1,
            "excerpt": snippet,
        })

    body_lines = range(start, ref_at)

    # 1) 본문 표현 규칙 (참고 문헌 이후는 논문 제목이라 제외)
    for i in body_lines:
        vis = visible(lines[i])
        for rule in rules["pattern_rules"]:
            exc = [re.compile(p) for p in rule.get("exceptions", [])]
            for pat in rule["patterns"]:
                for m in re.finditer(pat, vis):
                    if any(x.search(vis) for x in exc):
                        add(rule, i, excerpt(vis, m), severity="warn",
                            title=rule["title"] + " (부정 문맥 예외 — 확인 필요)")
                    else:
                        add(rule, i, excerpt(vis, m))
        for phrase in taboo:
            for m in re.finditer(re.escape(phrase), vis):
                add({"id": "BRAND-taboo", "law": "BRAND.md 금지 표현", "severity": "block",
                     "title": f"금지 표현 '{phrase}'"}, i, excerpt(vis, m))

    # 2) 이미지 규칙 (설명 문구 + 파일명)
    for i in range(start, len(lines)):
        for m in IMG_RE.finditer(lines[i]):
            alt, src = m.group(1), m.group(2)
            target = f"{alt} {Path(src).name}"
            for rule in rules["image_rules"]:
                for pat in rule["patterns"]:
                    if re.search(pat, target):
                        add(rule, i, target[:80])
            if not alt.strip():
                add(None, i, src, severity="warn", title="이미지 설명(alt) 없음")

    # 3) 구조 규칙
    body_text = "\n".join(visible(lines[i]) for i in body_lines)
    has_proc = any(t in body_text for t in st["procedure_terms"])
    if has_proc and not any(t in body_text for t in st["sideeffect_terms"]):
        add({"id": "S07-sideeffect", "law": "제56조 제2항 제7호 / 시행령 제23조 제1항 제7호",
             "severity": "block", "title": "시술을 다루면서 부작용 정보가 없음"}, start, "(본문 전체)")
    if has_proc and not any(t in text for t in st["disclaimer_terms"]):
        add({"id": "S-disclaimer", "law": "서면점 운영 규칙", "severity": "warn",
             "title": "개인차 고지 문구 없음"}, start, "(본문 전체)")
    if re.search(r"\d+(\.\d+)?\s*%", body_text) and ref_at == len(lines):
        add({"id": "S-sources", "law": "제56조 제2항 제8호 — 원문 대조 필요", "severity": "warn",
             "title": "수치가 있는데 참고 문헌 섹션이 없음"}, start, "(본문 전체)")
    for i in range(start, len(lines)):
        for m in MARKER_RE.finditer(lines[i]):
            add({"id": "S-marker", "law": "발행 준비", "severity": "warn",
                 "title": "채워지지 않은 자리표시"}, i, m.group(0)[:60])

    # 같은 줄·같은 규칙은 하나로 합친다 (block이 warn보다 우선)
    order = {"block": 0, "warn": 1}
    findings.sort(key=lambda f: (order[f["severity"]], f["line"]))
    seen, merged = set(), []
    for f in findings:
        key = (f["id"], f["line"])
        if key not in seen:
            seen.add(key)
            merged.append(f)
    return merged


def print_report(path, findings, rules):
    blocks = sum(f["severity"] == "block" for f in findings)
    warns = sum(f["severity"] == "warn" for f in findings)
    verdict = "발행 불가 (block 수정 필요)" if blocks else "자동 검사 통과 (warn·수동 항목 확인 후 원장님 확인으로)"
    print(f"\n== 의료광고 사전 검사: {path}")
    print(f"   결과: {verdict}  |  block {blocks} · warn {warns}\n")
    for f in findings:
        tag = "BLOCK" if f["severity"] == "block" else "warn "
        print(f" [{tag}] {f['line']:>4}행  {f['title']}")
        print(f"         └ {f['excerpt']}")
        if f["law"]:
            print(f"           근거: {f['law']}")
    print("\n 수동 확인 (자동 검사로 못 잡는 항목):")
    for item in rules["manual_checklist"]:
        print(f"   [ ] {item}")
    print(" ※ 자동 검사는 1차 거름망이며 사전심의·법률 검토를 대신하지 않습니다.")


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    as_json = "--json" in argv
    if not args:
        print(__doc__)
        return 2
    try:
        rules = load_rules()
    except (OSError, json.JSONDecodeError) as e:
        print(f"규칙 파일을 읽지 못했습니다: {e}", file=sys.stderr)
        return 2
    taboo = brand_taboo_phrases()
    worst, out = 0, {}
    for p in args:
        if not Path(p).is_file():
            print(f"파일이 없습니다: {p}", file=sys.stderr)
            return 2
        f = check_file(p, rules, taboo)
        out[p] = f
        if any(x["severity"] == "block" for x in f):
            worst = 1
        if not as_json:
            print_report(p, f, rules)
    if as_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    return worst


if __name__ == "__main__":
    sys.exit(main(sys.argv))
