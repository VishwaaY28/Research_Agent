from fastapi import APIRouter, UploadFile, File, Form, Query

from api.handlers import sources as sources_handlers

router = APIRouter(prefix="/api/sources")

@router.post("/{workspace_id}")
async def upload_and_extract(workspace_id: int, file: UploadFile = File(None), url: str = Form(None)):
    return await sources_handlers.upload_and_extract(workspace_id, file, url)

@router.get("/list/{workspace_id}")
async def get_content_sources(workspace_id: int):
    return await sources_handlers.get_content_sources(workspace_id)

@router.get("/list/filter/{workspace_id}")
async def filter_content_sources(workspace_id: int, filename: str = Query(...)):
    return await sources_handlers.filter_content_sources(workspace_id, filename)

@router.delete("/soft/{content_source_id}")
async def soft_delete_content_source(content_source_id: int):
    return await sources_handlers.soft_delete_content_source(content_source_id)

@router.delete("/hard/{content_source_id}")
async def hard_delete_content_source(content_source_id: int):
    return await sources_handlers.hard_delete_content_source(content_source_id)
