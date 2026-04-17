"""Wiki 전체 현황을 수집하고 점검 리포트를 출력한다."""

import os
import re
from datetime import date


def parse_frontmatter(content: str) -> dict:
    m = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w+):\s*(.+)$", line)
        if kv:
            fm[kv.group(1)] = kv.group(2).strip()
    return fm


def scan_wiki(wiki_dir: str) -> list[dict]:
    pages = []
    for root, _, files in os.walk(wiki_dir):
        for fname in files:
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            fm = parse_frontmatter(content)
            pages.append({
                "path": fpath,
                "filename": fname,
                "size": len(content),
                "category": fm.get("category", "기타"),
                "expires": fm.get("expires", ""),
                "title": fm.get("title", fname),
            })
    return pages


def check_expiry(pages: list[dict]) -> dict:
    today = date.today()
    expired = []
    expiring_soon = []

    for p in pages:
        exp = p.get("expires", "")
        if not exp or exp == "never":
            continue
        try:
            exp_date = date.fromisoformat(exp)
            delta = (exp_date - today).days
            if delta < 0:
                expired.append(p)
            elif delta <= 30:
                expiring_soon.append(p)
        except ValueError:
            pass

    return {"expired": expired, "expiring_soon": expiring_soon}


def count_by_category(pages: list[dict]) -> dict:
    counts = {}
    for p in pages:
        cat = p["category"]
        counts[cat] = counts.get(cat, 0) + 1
    return counts


def find_oversized(pages: list[dict], limit: int = 3000) -> list[dict]:
    return [p for p in pages if p["size"] > limit]


def generate_report(wiki_dir: str) -> str:
    pages = scan_wiki(wiki_dir)
    expiry = check_expiry(pages)
    by_cat = count_by_category(pages)
    oversized = find_oversized(pages)
    today_str = date.today().isoformat()

    lines = [
        f"🔍 Wiki 점검 리포트 — {today_str}",
        "",
        f"📊 현황",
        f"  총 페이지: {len(pages)}개",
        "  카테고리 분포:",
    ]
    for cat, cnt in sorted(by_cat.items()):
        lines.append(f"    - {cat}: {cnt}개")

    lines += ["", "⏰ 만료 현황"]
    if expiry["expired"]:
        lines.append(f"  이미 만료: {len(expiry['expired'])}개")
        for p in expiry["expired"]:
            lines.append(f"    → {p['title']}")
    else:
        lines.append("  이미 만료: 없음")

    if expiry["expiring_soon"]:
        lines.append(f"  30일 내 만료 예정: {len(expiry['expiring_soon'])}개")
        for p in expiry["expiring_soon"]:
            lines.append(f"    → {p['title']} ({p['expires']})")
    else:
        lines.append("  30일 내 만료 예정: 없음")

    lines += ["", "📏 크기 초과 (3,000자+)"]
    if oversized:
        for p in oversized:
            lines.append(f"  → {p['title']}: {p['size']}자 (분할 권장)")
    else:
        lines.append("  없음")

    lines += ["", "✅ 권장 조치"]
    actions = []
    if expiry["expired"]:
        actions.append(f"만료 페이지 {len(expiry['expired'])}개 아카이브 처리")
    if oversized:
        actions.append(f"크기 초과 페이지 {len(oversized)}개 분할 검토")
    if not actions:
        actions.append("별도 조치 불필요")
    for i, a in enumerate(actions, 1):
        lines.append(f"  {i}. {a}")

    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    wiki_dir = sys.argv[1] if len(sys.argv) > 1 else "wiki/wiki"
    print(generate_report(wiki_dir))
