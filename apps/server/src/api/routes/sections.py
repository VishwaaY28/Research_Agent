from fastapi import APIRouter, Body, Query
from typing import List

from api.handlers import sections as section_handlers

router = APIRouter(prefix="/api/sections")

@router.post("/bulk/{workspace_id}")
async def bulk_create_sections(
    workspace_id: int,
    filename: str = Query(..., description="Source filename"),
    chunks: list = Body(..., description="List of section chunks, each with content, optional name, and tags")
):
    return await section_handlers.bulk_create_sections(workspace_id, filename, chunks)

@router.get("/list/{workspace_id}")
async def get_sections(workspace_id: int):
    return await section_handlers.get_sections(workspace_id)

@router.post("/filter/{workspace_id}")
async def filter_sections_by_tags(
    workspace_id: int,
    tags: List[str] = Body(..., description="List of tags to filter by")
):
    return await section_handlers.filter_section_by_tags(workspace_id, tags)

@router.delete("/soft/{section_id}")
async def soft_delete_section(section_id: int):
    return await section_handlers.soft_delete_section(section_id)

@router.delete("/hard/{section_id}")
async def hard_delete_section(section_id: int):
    return await section_handlers.hard_delete_section(section_id)
