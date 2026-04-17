"""수집된 내용으로 표준 Wiki 페이지 파일을 생성한다."""

import sys
import os
import re
from datetime import date, timedelta


CATEGORY_PATHS = {
    "AI에이전트": "wiki/wiki/AI에이전트",
    "자동화": "wiki/wiki/자동화",
    "창업": "wiki/wiki/창업",
    "콘텐츠": "wiki/wiki/콘텐츠",
    "개발": "wiki/wiki/개발",
    "리서치": "wiki/wiki/리서치",
    "나": "wiki/wiki/나",
    "기타": "wiki/wiki/기타",
}

SUBCATEGORY_PATHS = {
    "diary": "wiki/wiki/나/일기",
    "thought": "wiki/wiki/나/생각",
    "experience": "wiki/wiki/나/경험",
    "retrospect": "wiki/wiki/나/회고",
}

PERSONAL_TYPES = {"diary", "thought", "experience", "retrospect"}


def slugify(text: str) -> str:
    text = re.sub(r"[^\w가-힣\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    return text[:50]


def get_expires(category: str, content_type: str) -> str:
    if category == "나" or content_type in PERSONAL_TYPES:
        return "never"
    return (date.today() + timedelta(days=180)).strftime("%Y-%m-%d")


def create_wiki_page(
    title: str,
    content: str,
    category: str,
    content_type: str,
    source: str,
    tags: list[str],
    repo_root: str = ".",
) -> str:
    today = date.today().strftime("%Y-%m-%d")
    expires = get_expires(category, content_type)

    if content_type in PERSONAL_TYPES:
        folder = os.path.join(repo_root, SUBCATEGORY_PATHS[content_type])
        prefix = "na"
    else:
        folder = os.path.join(repo_root, CATEGORY_PATHS.get(category, CATEGORY_PATHS["기타"]))
        cat_prefixes = {
            "AI에이전트": "ai", "자동화": "auto", "창업": "biz",
            "콘텐츠": "cnt", "개발": "dev", "리서치": "rsr", "기타": "etc",
        }
        prefix = cat_prefixes.get(category, "etc")

    os.makedirs(folder, exist_ok=True)
    slug = slugify(title)
    filename = f"{prefix}-{slug}-{today}.md"
    filepath = os.path.join(folder, filename)

    tags_str = ", ".join(tags) if tags else category
    frontmatter = f"""---
title: {title}
category: {category}
tags: [{tags_str}]
source: {source}
created: {today}
expires: {expires}
type: {content_type}
---

"""

    body = f"""# {title}

## 핵심 요약
{content[:200].strip()}...

## 주요 내용
{content.strip()}

## 인사이트
_이 자료에서 배운 것과 코마인드웍스 사업과의 연관성을 정리하세요._

## 관련 페이지
- _관련 페이지를 [[링크]] 형식으로 추가하세요_
"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(frontmatter + body)

    return filepath


if __name__ == "__main__":
    # 테스트 실행
    path = create_wiki_page(
        title="테스트 페이지",
        content="이것은 테스트 내용입니다. AI 에이전트 관련 자료.",
        category="AI에이전트",
        content_type="url",
        source="https://example.com",
        tags=["AI", "테스트"],
        repo_root=".",
    )
    print(f"✅ 생성됨: {path}")
