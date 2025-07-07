from fastapi import APIRouter, UploadFile, File, Form, Query
from typing import List, Optional

from api.handlers import sources as sources_handlers

router = APIRouter(prefix="/api/sources")

@router.post("")
async def upload_and_extract(
    files: Optional[List[UploadFile]] = File(None),
    urls: Optional[List[str]] = Form(None)
):
    return await sources_handlers.upload_and_extract(files, urls)

@router.get("/list")
async def list_content_sources():
    return await sources_handlers.list_content_sources()

@router.get("/{content_source_id}")
async def get_content_source_details(content_source_id: int):
    return await sources_handlers.get_source_details(content_source_id)

@router.get("/{content_source_id}/chunks")
async def get_content_source_chunks(content_source_id: int):
    return await sources_handlers.get_source_chunks(content_source_id)

@router.post("/{content_source_id}/images/{image_id}/tags")
async def add_image_tags(content_source_id: int, image_id: int, tag_names: List[str]):
    return await sources_handlers.add_image_tags(image_id, tag_names)

@router.delete("/{content_source_id}/images/{image_id}/tags/{tag_id}")
async def remove_image_tag(content_source_id: int, image_id: int, tag_id: int):
    return await sources_handlers.remove_image_tag(image_id, tag_id)

@router.post("/{content_source_id}/tables/{table_id}/tags")
async def add_table_tags(content_source_id: int, table_id: int, tag_names: List[str]):
    return await sources_handlers.add_table_tags(table_id, tag_names)

@router.delete("/{content_source_id}/tables/{table_id}/tags/{tag_id}")
async def remove_table_tag(content_source_id: int, table_id: int, tag_id: int):
    return await sources_handlers.remove_table_tag(table_id, tag_id)

@router.delete("/soft/{content_source_id}")
async def soft_delete_content_source(content_source_id: int):
    return await sources_handlers.soft_delete_content_source(content_source_id)

@router.delete("/hard/{content_source_id}")
async def hard_delete_content_source(content_source_id: int):
    return await sources_handlers.hard_delete_content_source(content_source_id)