import os
import re
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import anthropic

WIKI_ROOT = os.environ.get(
    "WIKI_ROOT",
    os.path.join(os.path.dirname(__file__), "../../../../wiki")
)

CATEGORIES = ["AI에이전트", "자동화", "창업", "콘텐츠", "개발", "리서치", "나", "기타"]

CATEGORY_PROMPT = f"""다음 카테고리 중 하나를 선택하세요: {', '.join(CATEGORIES)}
내용을 읽고 가장 적합한 카테고리 하나만 단어로 답하세요."""

WIKI_PROMPT = """당신은 LLM Wiki 작가입니다. 아래 내용을 바탕으로 Wiki 페이지를 작성하세요.

규칙:
- frontmatter(title, category, tags, source, created, expires, type) 포함
- ## 핵심 요약, ## 주요 내용, ## 인사이트, ## 관련 페이지 섹션 구성
- 한국어로 작성
- 핵심만 간결하게, 중복 제거

내용:
{content}

카테고리: {category}
소스: {source}
타입: {type}
생성일: {created}
만료일: {expires}
"""


async def generate_wiki_page(scraped: dict, input_type: str) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    content = scraped.get("content", scraped.get("text", ""))
    source = scraped.get("url", "직접 입력")
    title = scraped.get("title", "")
    created = date.today().isoformat()
    expires = (date.today() + relativedelta(months=6)).isoformat() if input_type != "diary" else "never"

    cat_response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{"role": "user", "content": f"{CATEGORY_PROMPT}\n\n{content[:500]}"}],
    )
    category = cat_response.content[0].text.strip()
    if category not in CATEGORIES:
        category = "기타"

    wiki_response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": WIKI_PROMPT.format(
                    content=content[:3000],
                    category=category,
                    source=source,
                    type=input_type,
                    created=created,
                    expires=expires,
                ),
            }
        ],
    )
    wiki_content = wiki_response.content[0].text.strip()

    slug = _make_slug(title or content[:30], category, created)
    return {
        "slug": slug,
        "title": title,
        "category": category,
        "content": wiki_content,
        "created": created,
        "path": f"wiki/wiki/{category}/{slug}.md",
    }


def _make_slug(title: str, category: str, created: str) -> str:
    cat_prefix = {
        "AI에이전트": "ai",
        "자동화": "auto",
        "창업": "biz",
        "콘텐츠": "content",
        "개발": "dev",
        "리서치": "research",
        "나": "na",
        "기타": "etc",
    }.get(category, "etc")

    clean = re.sub(r"[^\w가-힣]", "-", title.lower())[:30].strip("-")
    return f"{cat_prefix}-{clean}-{created}"


async def save_wiki_page(page: dict) -> str:
    wiki_dir = os.path.join(WIKI_ROOT, "wiki", page["category"])
    os.makedirs(wiki_dir, exist_ok=True)
    filepath = os.path.join(wiki_dir, f"{page['slug']}.md")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(page["content"])

    _update_index(page)
    _update_log(page)

    return filepath


def _update_index(page: dict):
    index_path = os.path.join(WIKI_ROOT, "index.md")
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    title_line = page["content"].split("\n")[0].replace("# ", "").strip() if page["content"] else page["title"]
    entry = f"- [[{page['slug']}]] - {title_line}\n"

    cat_header = f"## 📁 {page['category']}"
    if cat_header in content:
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if line.startswith(cat_header):
                insert_at = i + 2
                while insert_at < len(lines) and lines[insert_at].startswith("- "):
                    insert_at += 1
                lines.insert(insert_at, entry.rstrip())
                content = "\n".join(lines)
                break

    today = date.today().isoformat()
    page_count = content.count("- [[")
    content = re.sub(
        r"_마지막 업데이트:.*_",
        f"_마지막 업데이트: {today} | 총 페이지: {page_count}_",
        content,
    )

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)


def _update_log(page: dict):
    log_path = os.path.join(WIKI_ROOT, "log.md")
    with open(log_path, "r", encoding="utf-8") as f:
        content = f.read()

    today = date.today().isoformat()
    entry = f"| {today} | ADD | {page['slug']} | {page['category']} | 웹앱 수집 |\n"

    lines = content.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("_총 저장 페이지:"):
            lines.insert(i, entry.rstrip())
            break

    page_count = content.count("| ADD |") + 1
    content = "\n".join(lines)
    content = re.sub(
        r"_총 저장 페이지:.*_",
        f"_총 저장 페이지: {page_count} | 이번 주 추가: {page_count}_",
        content,
    )

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(content)
