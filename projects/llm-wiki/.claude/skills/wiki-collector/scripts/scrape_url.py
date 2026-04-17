"""URL에서 텍스트를 스크래핑하여 반환한다.
YouTube URL이면 자막 API로, 일반 URL은 HTML 파싱으로 처리한다.
"""

import sys
import re
import urllib.request
import urllib.error


def is_youtube_url(url: str) -> bool:
    return bool(re.search(r"(youtube\.com/watch|youtu\.be/)", url))


def extract_video_id(url: str) -> str | None:
    m = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def scrape_youtube(url: str) -> dict:
    video_id = extract_video_id(url)
    if not video_id:
        return {"success": False, "error": "YouTube video ID 추출 실패", "url": url}

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        # 한국어 우선, 없으면 영어, 없으면 첫 번째
        transcript = None
        for lang in ["ko", "en"]:
            try:
                transcript = transcript_list.find_transcript([lang])
                break
            except Exception:
                continue
        if transcript is None:
            transcript = next(iter(transcript_list))

        fetched = transcript.fetch()
        full_text = " ".join(entry.text for entry in fetched)

        # 타임스탬프 포함 버전 (10000자 제한)
        timestamped = []
        for entry in fetched:
            t = int(entry.start)
            m2, s = divmod(t, 60)
            timestamped.append(f"[{m2:02d}:{s:02d}] {entry.text}")
        timestamped_text = "\n".join(timestamped)

        # 제목 추출
        req = urllib.request.Request(
            f"https://www.youtube.com/watch?v={video_id}",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        html = urllib.request.urlopen(req).read().decode("utf-8", errors="ignore")
        title_m = re.search(r"<title>(.*?)</title>", html)
        title = title_m.group(1).replace(" - YouTube", "").strip() if title_m else f"YouTube {video_id}"

        return {
            "success": True,
            "url": url,
            "title": title,
            "content": full_text[:8000],
            "transcript": timestamped_text[:10000],
            "language": transcript.language_code,
            "type": "youtube",
        }

    except Exception as e:
        # 자막 없으면 설명란 fallback
        return scrape_youtube_fallback(url, str(e))


def scrape_youtube_fallback(url: str, reason: str) -> dict:
    video_id = extract_video_id(url)
    req = urllib.request.Request(
        f"https://www.youtube.com/watch?v={video_id}",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    try:
        html = urllib.request.urlopen(req).read().decode("utf-8", errors="ignore")
        title_m = re.search(r"<title>(.*?)</title>", html)
        title = title_m.group(1).replace(" - YouTube", "").strip() if title_m else ""
        desc_m = re.search(r'"description":\{"simpleText":"(.*?)"(?:,|\})', html, re.DOTALL)
        og_m = re.search(r'<meta name="description" content="(.*?)"', html)
        desc = desc_m.group(1)[:3000] if desc_m else (og_m.group(1)[:3000] if og_m else "")
        return {
            "success": True,
            "url": url,
            "title": title,
            "content": desc,
            "transcript": None,
            "type": "youtube_fallback",
            "warning": f"자막 없음 ({reason}) — 설명란만 수집됨",
        }
    except Exception as e2:
        return {"success": False, "error": str(e2), "url": url}


def scrape_web(url: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; LLMWikiBot/1.0)"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except urllib.error.URLError as e:
        return {"success": False, "error": str(e), "url": url}

    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = title_m.group(1).strip() if title_m else "제목 없음"
    title = re.sub(r"\s+", " ", title)

    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) > 5000:
        text = text[:5000] + "... [이하 생략]"

    return {
        "success": True,
        "url": url,
        "title": title,
        "content": text,
        "transcript": None,
        "type": "web",
    }


def scrape_url(url: str) -> dict:
    if is_youtube_url(url):
        return scrape_youtube(url)
    return scrape_web(url)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) < 2:
        print("Usage: python scrape_url.py <URL>")
        sys.exit(1)

    result = scrape_url(sys.argv[1])
    if result["success"]:
        print(f"제목: {result['title']}")
        print(f"타입: {result.get('type', 'unknown')}")
        if result.get("warning"):
            print(f"⚠️  {result['warning']}")
        print(f"내용 길이: {len(result['content'])}자")
        if result.get("transcript"):
            print(f"자막 길이: {len(result['transcript'])}자")
            print(f"\n--- 자막 미리보기 (앞 500자) ---\n{result['transcript'][:500]}")
        else:
            print(f"\n--- 내용 미리보기 ---\n{result['content'][:500]}")
    else:
        print(f"스크래핑 실패: {result['error']}")
        sys.exit(1)
