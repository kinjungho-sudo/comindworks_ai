import os
import re
from fastapi import APIRouter

router = APIRouter()

WIKI_ROOT = os.environ.get(
    "WIKI_ROOT",
    os.path.join(os.path.dirname(__file__), "../../../../wiki")
)


@router.get("/pages")
def get_pages():
    pages = []
    wiki_dir = os.path.join(WIKI_ROOT, "wiki")

    if not os.path.exists(wiki_dir):
        return {"pages": pages}

    for category in os.listdir(wiki_dir):
        cat_dir = os.path.join(wiki_dir, category)
        if not os.path.isdir(cat_dir):
            continue

        for fname in os.listdir(cat_dir):
            if not fname.endswith(".md"):
                continue

            fpath = os.path.join(cat_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()

            title = fname.replace(".md", "")
            title_match = re.search(r"^title:\s*(.+)$", content, re.MULTILINE)
            if title_match:
                title = title_match.group(1).strip()

            created = ""
            created_match = re.search(r"^created:\s*(.+)$", content, re.MULTILINE)
            if created_match:
                created = created_match.group(1).strip()

            quality_score = _calc_quality(content)
            slug = fname.replace(".md", "")

            pages.append({
                "slug": slug,
                "title": title,
                "category": category,
                "quality_score": quality_score,
                "date": created,
                "path": f"wiki/wiki/{category}/{fname}",
            })

    pages.sort(key=lambda x: x["date"], reverse=True)
    return {"pages": pages}


def _calc_quality(content: str) -> int:
    score = 50
    if "## 핵심 요약" in content:
        score += 10
    if "## 주요 내용" in content or "## 인사이트" in content:
        score += 10
    if "## 관련 페이지" in content:
        score += 5
    if len(content) > 500:
        score += 10
    if len(content) > 1000:
        score += 10
    if "코마인드웍스" in content:
        score += 5
    return min(score, 100)
