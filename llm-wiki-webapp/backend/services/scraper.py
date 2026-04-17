import httpx
from bs4 import BeautifulSoup


async def scrape_url(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    title = ""
    if soup.find("title"):
        title = soup.find("title").get_text(strip=True)
    if soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)

    content = ""
    for tag in ["article", "main", ".post-content", ".content"]:
        el = soup.select_one(tag)
        if el:
            content = el.get_text(separator="\n", strip=True)
            break

    if not content:
        headings = soup.find_all(["h1", "h2", "h3"])
        paragraphs = soup.find_all("p")
        content = "\n".join(
            [h.get_text(strip=True) for h in headings]
            + [p.get_text(strip=True) for p in paragraphs[:20]]
        )

    return {"title": title, "content": content[:5000], "url": url}
