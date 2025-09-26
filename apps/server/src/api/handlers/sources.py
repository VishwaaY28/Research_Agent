import os
import json
import logging
import time
from fastapi import HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
import re
import urllib.parse
import httpx
from bs4 import BeautifulSoup

from database.repositories.sources import content_source_repository
# from database.repositories.images import source_image_repository
# from database.repositories.tables import source_table_repository
from database.repositories.tags import tag_repository
from utils.extract_pdf import extract_pdf_sections
from utils.extract_docx import extract_docx_sections
from utils.extract_web import extract_web_sections

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SOURCES_DIR = "source_files"
EXTRACTS_DIR = "extracts"
FIGURES_DIR = "tmp"
os.makedirs(SOURCES_DIR, exist_ok=True)
os.makedirs(EXTRACTS_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

async def upload_and_extract(
    files: Optional[List[UploadFile]] = None,
    urls: Optional[List[str]] = None,
    background_tasks=None
):
    if files and urls:
        raise HTTPException(status_code=400, detail="Provide either files or urls, not both.")
    if not files and not urls:
        raise HTTPException(status_code=400, detail="No files or urls provided.")

    responses = []

    async def process_files(saved_file_paths):
        print("[Chunking] Background task started.")
        for filename, source_path in saved_file_paths:
            logger.info(f"Processing file: {filename}")

            existing_sources = await content_source_repository.filter_by_filename(filename)
            if existing_sources:
                logger.info(f"Content source already exists for {filename}")
                existing_source = existing_sources[0]
                try:
                    with open(existing_source.extracted_url, 'r') as f:
                        existing_data = json.load(f)
                    continue
                except Exception as e:
                    logger.warning(f"Could not load existing data for {filename}, re-extracting...")

            ext = filename.split(".")[-1].lower()

            logger.info(f"Saved file to: {source_path}")

            try:
                if ext == "pdf":
                    logger.info("Extracting PDF content...")
                    chunks = extract_pdf_sections(source_path, FIGURES_DIR)
                    source_type = "pdf"
                elif ext == "docx":
                    logger.info("Extracting DOCX content...")
                    chunks = extract_docx_sections(source_path, FIGURES_DIR)
                    source_type = "docx"
                else:
                    logger.warning(f"Unsupported file type: {ext}")
                    continue

                logger.info(f"Extraction results: {len(chunks)} chunks")

                # Generate unique extract path to avoid conflicts
                timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
                safe_filename = filename.replace(" ", "_").replace(".", "_")
                extract_path = os.path.join(EXTRACTS_DIR, f"content_{safe_filename}_{timestamp}.json")

                content_source = await content_source_repository.upsert(
                    name=filename,
                    source_url=source_path,
                    extracted_url=extract_path,
                    type=source_type,
                )
                logger.info(f"Created content source with ID: {content_source.id}")

                response_json = {
                    "success": True,
                    "content_source_id": content_source.id,
                    "chunks": chunks,
                    "filename": filename,
                    "type": source_type
                }

                with open(extract_path, "w") as f:
                    json.dump(response_json, f, indent=2)
                logger.info(f"Saved extraction data to: {extract_path}")

            except Exception as e:
                logger.error(f"Error processing file {filename}: {str(e)}", exc_info=True)
                continue
        print("[Chunking] Background task finished.")

    if files:
        if background_tasks:
            import asyncio
            saved_file_paths = []
            for file in files:
                filename = file.filename
                source_path = os.path.join(SOURCES_DIR, filename)
                with open(source_path, "wb") as f:
                    f.write(await file.read())
                saved_file_paths.append((filename, source_path))
            def run_process_files(saved_file_paths):
                asyncio.run(process_files(saved_file_paths))
            filenames = [filename for filename, _ in saved_file_paths]
            background_tasks.add_task(run_process_files, saved_file_paths)
            return JSONResponse(content={
                "success": True,
                "message": "Chunking started in background.",
                "filenames": filenames,
                "status_poll": "Use /api/sources/list or /api/sources/{content_source_id}/chunks to check status."
            })
        else:
            await process_files(files)
            return JSONResponse(content={"success": True, "message": "Chunking completed."})

    elif urls:
        for url in urls:
            logger.info(f"Processing URL: {url}")
            url_safe = url.replace("://", "_").replace("/", "_")[:50]

            existing_sources = await content_source_repository.filter_by_url(url)
            if existing_sources:
                logger.info(f"Content source already exists for {url}")
                existing_source = existing_sources[0]
                try:
                    with open(existing_source.extracted_url, 'r') as f:
                        existing_data = json.load(f)
                    responses.append(existing_data)
                    continue
                except Exception as e:
                    logger.warning(f"Could not load existing data for {url}, re-extracting...")

            try:
                logger.info("Extracting web content...")
                chunks = extract_web_sections(url, FIGURES_DIR)
                source_type = "web"

                logger.info(f"Web extraction results: {len(chunks)} chunks")

                # Generate unique extract path to avoid conflicts
                timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
                extract_path = os.path.join(EXTRACTS_DIR, f"content_web_{url_safe}_{timestamp}.json")
                content_source = await content_source_repository.upsert(
                    name=url_safe,
                    source_url=url,
                    extracted_url=extract_path,
                    type=source_type,
                )
                logger.info(f"Created web content source with ID: {content_source.id}")

                # if images:
                #     await source_image_repository.create_bulk(content_source.id, images)
                #     logger.info(f"Saved {len(images)} web images to database")

                # if tables:
                #     await source_table_repository.create_bulk(content_source.id, tables)
                #     logger.info(f"Saved {len(tables)} web tables to database")

                response_json = {
                    "success": True,
                    "content_source_id": content_source.id,
                    "chunks": chunks,
                    # "images": images,
                    # "tables": tables,
                    "url": url,
                    "type": source_type
                }

                with open(extract_path, "w") as f:
                    json.dump(response_json, f, indent=2)
                logger.info(f"Saved web extraction data to: {extract_path}")

                responses.append(response_json)

            except Exception as e:
                logger.error(f"Error processing URL {url}: {str(e)}", exc_info=True)
                responses.append({
                    "success": False,
                    "error": str(e),
                    "url": url
                })
                continue

    logger.info(f"Completed processing. Total responses: {len(responses)}")
    return JSONResponse(responses)

async def list_content_sources():
    """List all content sources"""
    try:
        sources = await content_source_repository.list_all()
        return JSONResponse({
            "success": True,
            "sources": [
                {
                    "id": source.id,
                    "name": source.name,
                    "type": source.type.value if hasattr(source.type, 'value') else str(source.type),
                    "source_url": source.source_url,
                    "created_at": source.created_at.isoformat()
                }
                for source in sources
            ]
        })
    except Exception as e:
        logger.error(f"Error listing content sources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def get_source_details(content_source_id: int):
    try:
        content_source = await content_source_repository.get_by_id(content_source_id)
        if not content_source:
            raise HTTPException(status_code=404, detail="Content source not found")

        # images = await source_image_repository.get_by_source(content_source_id)
        # tables = await source_table_repository.get_by_source(content_source_id)

        # Get chunks directly from the source file
        try:
            with open(content_source.extracted_url, 'r') as f:
                extracted_data = json.load(f)
                chunks = extracted_data.get('chunks', [])
        except Exception as e:
            logger.warning(f"Could not load chunks from {content_source.extracted_url}: {e}")
            chunks = []

        return JSONResponse(content={
            "success": True,
            "source": {
                "id": content_source.id,
                "name": content_source.name,
                "type": content_source.type.value if hasattr(content_source.type, 'value') else content_source.type,
                "source_url": content_source.source_url,
                "extracted_url": content_source.extracted_url,
                "created_at": content_source.created_at.isoformat()
            },
            "chunks": chunks,
            # "images": [
            #     {
            #         "id": img.id,
            #         "path": img.path,
            #         "page_number": img.page_number,
            #         "caption": img.caption,
            #         "ocr_text": img.ocr_text
            #     } for img in images
            # ],
            # "tables": [
            #     {
            #         "id": table.id,
            #         "path": table.path,
            #         "page_number": table.page_number,
            #         "caption": table.caption,
            #         "data": table.data,
            #         "extraction_method": table.extraction_method
            #     } for table in tables
            # ]
        })
    except Exception as e:
        logger.error(f"Error getting source details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def find_urls(topics: List[str], limit: int = 10):
    """Find relevant URLs for given topics using Google Search API via SerpApi.

    - Uses Google's search results for better relevancy
    - Supports a wide range of websites
    - Returns diverse results from different domains
    """
    try:
        from serpapi import GoogleSearch

        if not topics:
            return JSONResponse({"success": False, "urls": [], "error": "No topics provided"}, status_code=400)

        query = " ".join([t.strip() for t in topics if t and t.strip()])
        if not query:
            return JSONResponse({"success": False, "urls": [], "error": "No valid topics provided"}, status_code=400)

        # Get API key from environment variable
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            return JSONResponse(
                {"success": False, "urls": [], "error": "SERPAPI_API_KEY not configured"},
                status_code=500
            )

        # Configure search parameters
        search_params = {
            "q": query,
            "api_key": api_key,
            "engine": "google",
            "gl": "us",  # Google Search region (United States)
            "hl": "en",  # Language
            # "num": limit * 2,  # Request more results to account for filtering
            "safe": "active",  # Safe search
        }

        candidates: List[str] = []
        try:
            search = GoogleSearch(search_params)
            results = search.get_dict()

            # Extract organic search results
            if "organic_results" in results:
                for result in results["organic_results"]:
                    if "link" in result:
                        candidates.append(result["link"])

            # Also include "related_pages" if available
            if "related_pages" in results:
                for related in results["related_pages"]:
                    if "link" in related:
                        candidates.append(related["link"])

            # Clean and validate URLs
            valid_urls = []
            seen_domains = set()

            for url in candidates:
                try:
                    parsed = urllib.parse.urlparse(url)
                    domain = parsed.netloc.lower()

                    # Skip if we've seen this domain
                    if domain in seen_domains:
                        continue

                    # Skip known problematic domains
                    if any(skip in domain for skip in [
                        "google.com",
                        "youtube.com",
                        "facebook.com",
                        "twitter.com",
                        "instagram.com",
                        "reddit.com"
                    ]):
                        continue

                    # Add the domain to seen set
                    seen_domains.add(domain)

                    # Add the URL to valid list
                    valid_urls.append(url)

                    # Break if we have enough URLs
                    if len(valid_urls) >= limit:
                        break
                except Exception:
                    continue

            return JSONResponse({
                "success": True,
                "urls": valid_urls[:limit],
                "total": len(valid_urls)
            })
        except Exception as e:
            logger.error(f"Error in Google search: {str(e)}", exc_info=True)
            return JSONResponse(
                {"success": False, "urls": [], "error": "Search failed: " + str(e)},
                status_code=500
            )


        # Heuristic fallback: guess official domains and wikipedia pages
        if not candidates:
            guesses: List[str] = []
            tokens = [t for t in re.split(r"[,\s]+", query) if t]
            t0 = tokens[0].lower() if tokens else ''
            for t in filter(None, [t0]):
                for ext in ['.com', '.org', '.io', '.co']:
                    guesses.append(f"https://{t}{ext}")
                    guesses.append(f"https://www.{t}{ext}")
            # Wikipedia guess
            if t0:
                wiki_title = t0.strip().title().replace(' ', '_')
                guesses.append(f"https://en.wikipedia.org/wiki/{wiki_title}")

            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0, headers=headers) as client:
                for g in guesses:
                    try:
                        r = await client.head(g)
                        if r.status_code < 400:
                            candidates.append(g)
                    except Exception:
                        continue

        def is_valid(u: str) -> bool:
            try:
                if not u or u.startswith("/"):
                    return False
                if any(bad in u for bad in [
                    "duckduckgo.com",
                    "/y.js",
                    "/i.js",
                    "/ac/",
                    "/lite/",
                    "r.duckduckgo.com/",
                    "/settings",
                    "ad.doubleclick.net",
                ]):
                    return False
                p = urllib.parse.urlparse(u)
                return p.scheme in ("http", "https") and p.netloc != ""
            except Exception:
                return False

        scored: List[Dict] = []
        seen = set()
        for raw in candidates:
            if not is_valid(raw):
                continue
            url = raw
            if url in seen:
                continue
            seen.add(url)
            domain = urllib.parse.urlparse(url).netloc.lower()
            score = 0
            if domain.endswith(".gov") or domain.endswith(".edu"):
                score += 5
            official_keywords = ["official", "docs", "documentation", "about", "company", "support"]
            if any(k in url.lower() for k in official_keywords):
                score += 2
            if len(url) < 100:
                score += 1
            scored.append({"url": url, "score": score, "domain": domain})
        domain_to_item: Dict[str, Dict] = {}
        for item in sorted(scored, key=lambda x: (-x["score"], x["url"])):
            if item["domain"] not in domain_to_item:
                domain_to_item[item["domain"]] = item

        prelim = list(domain_to_item.values())[: max(limit * 3, 15)]

        # Validate accessibility to avoid 401/403/404 results
        validated: List[str] = []
        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0, headers=headers) as client:
            for it in prelim:
                u = it["url"]
                try:
                    r = await client.head(u)
                    if r.status_code == 405:  # HEAD not allowed, try GET
                        r = await client.get(u)
                    if r.status_code in (401, 403, 404):
                        continue
                    if r.status_code >= 400:
                        continue
                    validated.append(u)
                except Exception:
                    continue

        urls = validated[:limit]
        return JSONResponse({"success": True, "urls": urls, "topics": topics})
    except Exception as e:
        logger.error(f"find_urls error: {e}")
        return JSONResponse({"success": False, "urls": [], "error": str(e)}, status_code=500)

async def get_source_chunks(content_source_id: int):
    """Get chunks for a specific content source"""
    try:
        source = await content_source_repository.get_by_id(content_source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Content source not found")

        try:
            with open(source.extracted_url, 'r') as f:
                extracted_data = json.load(f)
                chunks = extracted_data.get('chunks', [])
        except Exception as e:
            logger.warning(f"Could not load chunks from {source.extracted_url}: {e}")
            chunks = []

        return JSONResponse({
            "success": True,
            "chunks": chunks,
            "content_source_id": content_source_id
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting source chunks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# async def add_image_tags(image_id: int, tag_names: List[str]):
#     """Add tags to an image"""
#     try:
#         for tag_name in tag_names:
#             await source_image_repository.add_tag(image_id, tag_name)

#         return JSONResponse({"success": True})
#     except Exception as e:
#         logger.error(f"Error adding image tags: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

# async def remove_image_tag(image_id: int, tag_id: int):
#     """Remove a tag from an image"""
#     try:
#         await source_image_repository.remove_tag(image_id, tag_id)
#         return JSONResponse({"success": True})
#     except Exception as e:
#         logger.error(f"Error removing image tag: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

# async def add_table_tags(table_id: int, tag_names: List[str]):
#     """Add tags to a table"""
#     try:
#         for tag_name in tag_names:
#             await source_table_repository.add_tag(table_id, tag_name)

#         return JSONResponse({"success": True})
#     except Exception as e:
#         logger.error(f"Error adding table tags: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

# async def remove_table_tag(table_id: int, tag_id: int):
#     """Remove a tag from a table"""
#     try:
#         await source_table_repository.remove_tag(table_id, tag_id)
#         return JSONResponse({"success": True})
#     except Exception as e:
#         logger.error(f"Error removing table tag: {str(e)}", exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e))

async def soft_delete_content_source(content_source_id: int):
    try:
        await content_source_repository.soft_delete(content_source_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error soft deleting content source: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def hard_delete_content_source(content_source_id: int):
    try:
        await content_source_repository.hard_delete(content_source_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error hard deleting content source: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
