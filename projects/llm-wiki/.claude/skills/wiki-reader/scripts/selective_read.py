"""index.md를 읽고 쿼리와 관련된 페이지를 7~8개 선별한다."""

import sys
import re
import os


PERSONAL_CATEGORIES = {"나", "일기", "생각", "경험", "회고"}


def tokenize(text: str) -> list[str]:
    text = text.lower()
    return re.findall(r"[가-힣a-z0-9]+", text)


def score_entry(query_tokens: list[str], entry: dict) -> float:
    entry_text = entry["filename"] + " " + entry["description"] + " " + " ".join(entry["tags"])
    entry_tokens = set(tokenize(entry_text))
    matches = sum(1 for t in query_tokens if t in entry_tokens)
    return matches / max(len(query_tokens), 1)


def parse_index(index_path: str) -> list[dict]:
    entries = []
    current_category = "기타"

    with open(index_path, "r", encoding="utf-8") as f:
        for line in f:
            cat_match = re.match(r"## 📁 (.+?) \(", line)
            if cat_match:
                current_category = cat_match.group(1).strip()
                continue

            subcat_match = re.match(r"### (.+)/", line)
            if subcat_match:
                current_category = subcat_match.group(1).strip()
                continue

            entry_match = re.match(r"- \[\[(.+?)\]\] - (.+?)(\s+#.*)?$", line.strip())
            if entry_match:
                tags = re.findall(r"#(\w+)", entry_match.group(3) or "")
                entries.append({
                    "filename": entry_match.group(1),
                    "description": entry_match.group(2),
                    "tags": tags,
                    "category": current_category,
                    "is_personal": current_category in PERSONAL_CATEGORIES,
                })

    return entries


def select_pages(query: str, index_path: str, max_pages: int = 8, min_personal: int = 2) -> list[dict]:
    if not os.path.exists(index_path):
        return []

    entries = parse_index(index_path)
    if not entries:
        return []

    query_tokens = tokenize(query)

    personal = [e for e in entries if e["is_personal"]]
    external = [e for e in entries if not e["is_personal"]]

    for e in entries:
        e["score"] = score_entry(query_tokens, e)

    personal.sort(key=lambda x: x["score"], reverse=True)
    external.sort(key=lambda x: x["score"], reverse=True)

    selected_personal = personal[:min_personal]
    remaining_slots = max_pages - len(selected_personal)
    selected_external = external[:remaining_slots]

    result = selected_external + selected_personal
    return result[:max_pages]


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python selective_read.py <query> <index_path>")
        sys.exit(1)

    query = sys.argv[1]
    index_path = sys.argv[2]

    pages = select_pages(query, index_path)

    if not pages:
        print("⚠️ index.md에 페이지가 없습니다.")
        sys.exit(0)

    print(f"📚 선별된 페이지 {len(pages)}개 (쿼리: '{query}'):\n")
    for p in pages:
        personal_label = " 👤" if p["is_personal"] else ""
        print(f"  ✓ [[{p['filename']}]] - {p['description']}{personal_label} (score: {p['score']:.2f})")
