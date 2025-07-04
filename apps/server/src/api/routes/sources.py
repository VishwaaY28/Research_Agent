from fastapi import APIRouter, UploadFile, File, Form, Query
from typing import List, Optional

from api.handlers import sources as sources_handlers

router = APIRouter(prefix="/api/sources")

@router.post("/{workspace_id}")
async def upload_and_extract(
    files: Optional[List[UploadFile]] = File(None),
    urls: Optional[List[str]] = Form(None)
):
    return await sources_handlers.upload_and_extract(files, urls)

@router.delete("/soft/{content_source_id}")
async def soft_delete_content_source(content_source_id: int):
    return await sources_handlers.soft_delete_content_source(content_source_id)

@router.delete("/hard/{content_source_id}")
async def hard_delete_content_source(content_source_id: int):
    return await sources_handlers.hard_delete_content_source(content_source_id)
