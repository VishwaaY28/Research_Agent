import os
import logging
from fastapi import HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict

from database.repositories.sources import content_source_repository
from database.repositories.images import source_image_repository
from database.repositories.tables import source_table_repository
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
                    import json
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
                    import json
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

async def get_source_details(content_source_id: int):
    """Get detailed information about a content source including images and tables"""
    try:
        images = await source_image_repository.get_by_source(content_source_id)
        tables = await source_table_repository.get_by_source(content_source_id)

        return JSONResponse({
            "success": True,
            "images": [{"id": img.id, "path": img.path, "page_number": img.page_number,
                       "caption": img.caption, "ocr_text": img.ocr_text} for img in images],
            "tables": [{"id": tbl.id, "path": tbl.path, "page_number": tbl.page_number,
                       "caption": tbl.caption, "data": tbl.data} for tbl in tables]
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def soft_delete_content_source(content_source_id: int):
    await content_source_repository.soft_delete(content_source_id)
    return JSONResponse({"success": True})

async def hard_delete_content_source(content_source_id: int):
    await content_source_repository.hard_delete(content_source_id)
    return JSONResponse({"success": True})
