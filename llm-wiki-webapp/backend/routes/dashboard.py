import os
import re
from datetime import date
from fastapi import APIRouter

router = APIRouter()

WIKI_ROOT = os.environ.get(
    "WIKI_ROOT",
    os.path.join(os.path.dirname(__file__), "../../../../wiki")
)


@router.get("/dashboard")
def get_dashboard():
    index_path = os.path.join(WIKI_ROOT, "index.md")
    log_path = os.path.join(WIKI_ROOT, "log.md")

    total = 0
    this_week = 0
    expiring = 0
    categories = {}
    recent = []

    try:
        with open(index_path, "r", encoding="utf-8") as f:
            index_content = f.read()

        entries = re.findall(r"- \[\[(.+?)\]\] - (.+)", index_content)
        total = len(entries)

        cat_sections = re.findall(r"## 📁 (.+?) \((\d+)\)", index_content)
        for cat, count in cat_sections:
            if int(count) > 0:
                categories[cat] = int(count)

        recent = [{"slug": e[0], "title": e[1]} for e in entries[-5:]][::-1]

    except FileNotFoundError:
        pass

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            log_content = f.read()

        today = date.today()
        week_start = today.strftime("%Y-%m-%d")
        week_rows = re.findall(
            rf"\| ({today.strftime('%Y-%m-%d')}) \| ADD \|", log_content
        )
        this_week = len(week_rows)

    except FileNotFoundError:
        pass

    return {
        "total": total,
        "this_week": this_week,
        "expiring": expiring,
        "conflicts": 0,
        "categories": categories,
        "recent": recent,
    }
