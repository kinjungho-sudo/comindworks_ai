"""3000자 초과 Wiki 페이지를 기초/고급으로 분할한다."""

import sys
import os
import re


def split_page(filepath: str) -> tuple[str, str]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if len(content) <= 3000:
        print(f"분할 불필요: {len(content)}자 (3000자 이하)")
        return filepath, ""

    # frontmatter 파싱
    fm_match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    frontmatter = fm_match.group(0) if fm_match else ""
    body = content[len(frontmatter):]

    # ## 섹션 기준으로 분할
    sections = re.split(r"(^## .+$)", body, flags=re.MULTILINE)

    mid = len(sections) // 2
    part1_body = "".join(sections[:mid])
    part2_body = "".join(sections[mid:])

    base = filepath.replace(".md", "")
    path1 = base + "-기초.md"
    path2 = base + "-고급.md"

    # frontmatter 제목 수정
    fm1 = frontmatter.replace("title:", "title:").replace("\n---", " (기초)\n---", 1)
    fm2 = frontmatter.replace("title:", "title:").replace("\n---", " (고급)\n---", 1)

    with open(path1, "w", encoding="utf-8") as f:
        f.write(fm1 + part1_body)

    with open(path2, "w", encoding="utf-8") as f:
        f.write(fm2 + part2_body)

    os.remove(filepath)
    print(f"✅ 분할 완료:\n  {path1}\n  {path2}")
    return path1, path2


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_page.py <wiki_page.md>")
        sys.exit(1)
    split_page(sys.argv[1])
