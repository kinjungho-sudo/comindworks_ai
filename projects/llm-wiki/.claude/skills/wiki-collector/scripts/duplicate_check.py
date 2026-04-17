"""index.md에서 유사 페이지를 검색한다."""

import sys
import re
import os


def load_index(index_path: str) -> list[dict]:
    if not os.path.exists(index_path):
        return []

    entries = []
    with open(index_path, "r", encoding="utf-8") as f:
        for line in f:
            # - [[파일명]] - 설명 #태그1 #태그2 형식 파싱
            m = re.match(r"- \[\[(.+?)\]\] - (.+?)(\s+#.*)?$", line.strip())
            if m:
                entries.append({
                    "filename": m.group(1),
                    "description": m.group(2),
                    "tags": re.findall(r"#(\w+)", m.group(3) or ""),
                })
    return entries


def tokenize(text: str) -> set[str]:
    text = text.lower()
    tokens = re.findall(r"[가-힣a-z0-9]+", text)
    return set(t for t in tokens if len(t) > 1)


def similarity(a: str, b: str) -> float:
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    intersection = ta & tb
    union = ta | tb
    return len(intersection) / len(union)  # Jaccard similarity


def check_duplicate(title: str, content: str, index_path: str, threshold: float = 0.4) -> dict:
    entries = load_index(index_path)
    if not entries:
        return {"duplicate": False, "similar": []}

    query = title + " " + content[:500]
    similar = []

    for entry in entries:
        candidate = entry["filename"] + " " + entry["description"] + " " + " ".join(entry["tags"])
        score = similarity(query, candidate)
        if score >= threshold:
            similar.append({"page": entry["filename"], "score": round(score * 100)})

    similar.sort(key=lambda x: x["score"], reverse=True)
    top = similar[:3]

    is_duplicate = any(s["score"] >= 80 for s in top)
    return {"duplicate": is_duplicate, "similar": top}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python duplicate_check.py <title> <index_path>")
        sys.exit(1)

    title = sys.argv[1]
    index_path = sys.argv[2]
    content = sys.stdin.read() if not sys.stdin.isatty() else ""

    result = check_duplicate(title, content, index_path)

    if result["duplicate"]:
        print("⚠️ 중복 가능성 높음")
        for s in result["similar"]:
            print(f"  - [[{s['page']}]] (유사도 {s['score']}%)")
        sys.exit(1)
    elif result["similar"]:
        print("💡 유사 페이지 존재 (중복은 아님)")
        for s in result["similar"]:
            print(f"  - [[{s['page']}]] (유사도 {s['score']}%)")
        sys.exit(0)
    else:
        print("✅ 중복 없음")
        sys.exit(0)
