"""동일 태그/키워드를 가진 페이지들 간 내용 충돌을 탐지한다."""

import sys
import os
import re
from collections import defaultdict


def parse_page(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    fm = {}
    if fm_match:
        for line in fm_match.group(1).splitlines():
            kv = re.match(r"^(\w+):\s*(.+)$", line)
            if kv:
                fm[kv.group(1)] = kv.group(2).strip()

    tags_raw = fm.get("tags", "")
    tags = re.findall(r"\w+", tags_raw)

    return {
        "path": filepath,
        "title": fm.get("title", os.path.basename(filepath)),
        "tags": tags,
        "content": content,
    }


def find_conflicts(wiki_dir: str) -> list[dict]:
    pages = []
    for root, _, files in os.walk(wiki_dir):
        if "archived" in root:
            continue
        for fname in files:
            if fname.endswith(".md"):
                pages.append(parse_page(os.path.join(root, fname)))

    # 같은 태그를 가진 페이지 그룹화
    tag_groups = defaultdict(list)
    for p in pages:
        for tag in p["tags"]:
            tag_groups[tag].append(p)

    # 간단한 수치 상충 감지 (같은 주제에서 다른 숫자)
    conflicts = []
    for tag, group in tag_groups.items():
        if len(group) < 2:
            continue
        # 각 페이지에서 수치 추출
        for i, pa in enumerate(group):
            for pb in group[i + 1:]:
                # 같은 키워드 주변 숫자 비교 (단순 휴리스틱)
                nums_a = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", pa["content"]))
                nums_b = set(re.findall(r"\b\d+(?:\.\d+)?%?\b", pb["content"]))
                # 숫자가 완전히 다른 집합이면 충돌 가능성 (단순 감지)
                if nums_a and nums_b and not nums_a.intersection(nums_b) and len(nums_a) > 2:
                    conflicts.append({
                        "tag": tag,
                        "page_a": pa["title"],
                        "page_b": pb["title"],
                        "note": "동일 태그, 수치 불일치 — 검토 필요",
                    })

    return conflicts[:10]  # 최대 10건


if __name__ == "__main__":
    wiki_dir = sys.argv[1] if len(sys.argv) > 1 else "wiki/wiki"
    conflicts = find_conflicts(wiki_dir)

    if conflicts:
        print(f"⚠️ 충돌 감지 {len(conflicts)}건:\n")
        for c in conflicts:
            print(f"  태그 #{c['tag']}")
            print(f"  → [[{c['page_a']}]] vs [[{c['page_b']}]]")
            print(f"  → {c['note']}\n")
    else:
        print("✅ 충돌 감지 없음")
