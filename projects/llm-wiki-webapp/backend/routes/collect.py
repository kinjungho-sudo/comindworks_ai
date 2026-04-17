import json
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.scraper import scrape_url
from services.wiki_generator import generate_wiki_page, save_wiki_page
from services.git_service import git_push

router = APIRouter()


class CollectRequest(BaseModel):
    type: str  # url | text | file | diary
    content: str
    file: str | None = None


async def collect_stream(req: CollectRequest):
    def event(step: str, status: str, **extra):
        data = {"step": step, "status": status, **extra}
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    try:
        # Step 1: Scraping
        yield event("scraping", "processing")
        await asyncio.sleep(0.1)

        if req.type == "url":
            scraped = await scrape_url(req.content)
        else:
            scraped = {"content": req.content, "title": req.content[:40], "url": "직접 입력"}

        yield event("scraping", "done")

        # Step 2: Wiki generation
        yield event("wiki_generate", "processing")
        page = await generate_wiki_page(scraped, req.type)
        yield event("wiki_generate", "done", page=f"{page['slug']}.md")

        # Step 3: Save
        yield event("saving", "processing")
        save_wiki_page(page)
        yield event("saving", "done")

        # Step 4: Git push
        yield event("git_push", "processing")
        success = git_push(page["title"], page["category"])
        yield event("git_push", "done" if success else "error")

        yield event("complete", "done", title=page["title"], category=page["category"])

    except Exception as e:
        yield event("error", "failed", message=str(e))


@router.post("/collect")
async def collect(req: CollectRequest):
    return StreamingResponse(
        collect_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
