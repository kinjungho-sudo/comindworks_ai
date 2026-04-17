"""URL에서 텍스트를 스크래핑하여 반환한다."""

import sys
import urllib.request
import urllib.error
import re


def scrape_url(url: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; LLMWikiBot/1.0)"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except urllib.error.URLError as e:
        return {"success": False, "error": str(e), "url": url}

    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else "제목 없음"
    title = re.sub(r"\s+", " ", title)

    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()

    # 최대 5000자로 제한
    if len(text) > 5000:
        text = text[:5000] + "... [이하 생략]"

    return {
        "success": True,
        "url": url,
        "title": title,
        "content": text,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scrape_url.py <URL>")
        sys.exit(1)

    result = scrape_url(sys.argv[1])
    if result["success"]:
        print(f"제목: {result['title']}")
        print(f"내용 길이: {len(result['content'])}자")
        print(f"\n--- 내용 미리보기 ---\n{result['content'][:500]}")
    else:
        print(f"스크래핑 실패: {result['error']}")
        sys.exit(1)
