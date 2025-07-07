import os
import json
import logging
from fastapi import HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict

from database.repositories.sources import content_source_repository
from database.repositories.images import source_image_repository
from database.repositories.tables import source_table_repository
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
    urls: Optional[List[str]] = None
):
    if files and urls:
        raise HTTPException(status_code=400, detail="Provide either files or urls, not both.")
    if not files and not urls:
        raise HTTPException(status_code=400, detail="No files or urls provided.")

    responses = []

    if files:
        for file in files:
            filename = file.filename
            logger.info(f"Processing file: {filename}")

            existing_sources = await content_source_repository.filter_by_filename(filename)
            if existing_sources:
                logger.info(f"Content source already exists for {filename}")
                existing_source = existing_sources[0]
                try:
                    with open(existing_source.extracted_url, 'r') as f:
                        existing_data = json.load(f)
                    responses.append(existing_data)
                    continue
                except Exception as e:
                    logger.warning(f"Could not load existing data for {filename}, re-extracting...")

            ext = filename.split(".")[-1].lower()
            source_path = os.path.join(SOURCES_DIR, filename)

            with open(source_path, "wb") as f:
                f.write(await file.read())
            logger.info(f"Saved file to: {source_path}")

            try:
                if ext == "pdf":
                    logger.info("Extracting PDF content...")
                    chunks, images, tables = extract_pdf_sections(source_path, FIGURES_DIR)
                    source_type = "pdf"
                elif ext == "docx":
                    logger.info("Extracting DOCX content...")
                    chunks, images, tables = extract_docx_sections(source_path, FIGURES_DIR)
                    source_type = "docx"
                else:
                    logger.warning(f"Unsupported file type: {ext}")
                    responses.append({
                        "success": False,
                        "error": f"Unsupported file type: {ext}",
                        "filename": filename
                    })
                    continue

                logger.info(f"Extraction results: {len(chunks)} chunks, {len(images)} images, {len(tables)} tables")

                extract_path = os.path.join(EXTRACTS_DIR, f"content_{filename}.json")
                content_source = await content_source_repository.upsert(
                    name=filename,
                    source_url=source_path,
                    extracted_url=extract_path,
                    type=source_type,
                )
                logger.info(f"Created content source with ID: {content_source.id}")

                if images:
                    await source_image_repository.create_bulk(content_source.id, images)
                    logger.info(f"Saved {len(images)} images to database")

                if tables:
                    await source_table_repository.create_bulk(content_source.id, tables)
                    logger.info(f"Saved {len(tables)} tables to database")

                response_json = {
                    "success": True,
                    "content_source_id": content_source.id,
                    "chunks": chunks,
                    "images": images,
                    "tables": tables,
                    "filename": filename,
                    "type": source_type
                }

                with open(extract_path, "w") as f:
                    json.dump(response_json, f, indent=2)
                logger.info(f"Saved extraction data to: {extract_path}")

                responses.append(response_json)

            except Exception as e:
                logger.error(f"Error processing file {filename}: {str(e)}", exc_info=True)
                responses.append({
                    "success": False,
                    "error": str(e),
                    "filename": filename
                })
                continue

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
                chunks, images, tables = extract_web_sections(url, FIGURES_DIR)
                source_type = "web"

                logger.info(f"Web extraction results: {len(chunks)} chunks, {len(images)} images, {len(tables)} tables")

                extract_path = os.path.join(EXTRACTS_DIR, f"content_web_{url_safe}.json")
                content_source = await content_source_repository.upsert(
                    name=url_safe,
                    source_url=url,
                    extracted_url=extract_path,
                    type=source_type,
                )
                logger.info(f"Created web content source with ID: {content_source.id}")

                if images:
                    await source_image_repository.create_bulk(content_source.id, images)
                    logger.info(f"Saved {len(images)} web images to database")

                if tables:
                    await source_table_repository.create_bulk(content_source.id, tables)
                    logger.info(f"Saved {len(tables)} web tables to database")

                response_json = {
                    "success": True,
                    "content_source_id": content_source.id,
                    "chunks": chunks,
                    "images": images,
                    "tables": tables,
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

        images = await source_image_repository.get_by_source(content_source_id)
        tables = await source_table_repository.get_by_source(content_source_id)

        chunks_response = await get_source_chunks(content_source_id)
        chunks_data = chunks_response.body.decode() if hasattr(chunks_response, 'body') else '{"chunks": []}'
        chunks_json = json.loads(chunks_data) if isinstance(chunks_data, str) else chunks_data
        chunks = chunks_json.get('chunks', [])

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
            "images": [
                {
                    "id": img.id,
                    "path": img.path,
                    "page_number": img.page_number,
                    "caption": img.caption,
                    "ocr_text": img.ocr_text
                } for img in images
            ],
            "tables": [
                {
                    "id": table.id,
                    "path": table.path,
                    "page_number": table.page_number,
                    "caption": table.caption,
                    "data": table.data,
                    "extraction_method": table.extraction_method
                } for table in tables
            ]
        })
    except Exception as e:
        logger.error(f"Error getting source details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

async def add_image_tags(image_id: int, tag_names: List[str]):
    """Add tags to an image"""
    try:
        for tag_name in tag_names:
            await source_image_repository.add_tag(image_id, tag_name)

        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding image tags: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def remove_image_tag(image_id: int, tag_id: int):
    """Remove a tag from an image"""
    try:
        await source_image_repository.remove_tag(image_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing image tag: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def add_table_tags(table_id: int, tag_names: List[str]):
    """Add tags to a table"""
    try:
        for tag_name in tag_names:
            await source_table_repository.add_tag(table_id, tag_name)

        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding table tags: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def remove_table_tag(table_id: int, tag_id: int):
    """Remove a tag from a table"""
    try:
        await source_table_repository.remove_tag(table_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing table tag: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

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
