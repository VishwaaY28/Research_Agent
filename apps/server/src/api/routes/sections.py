from fastapi import APIRouter, Body, Query
from typing import List

from api.handlers import sections as section_handlers
from api.handlers.sections import get_prompt_by_sectionType, update_sectionType, delete_sectionType, save_prompt, SectionTypeUpdateRequest, SavePromptRequest, create_sectionType, SectionTypeCreateRequest

router = APIRouter(prefix="/api/sections")

@router.post("/bulk/{workspace_id}")
async def bulk_create_sections(
    workspace_id: int,
    filename: str = Query(..., description="Source filename"),
    chunks: list = Body(..., description="List of section chunks, each with content, optional name, and tags")
):
    return await section_handlers.bulk_create_sections(workspace_id, filename, chunks)

@router.post("/search/{workspace_id}")
async def search_sections(workspace_id: int, data: dict):
    return await section_handlers.search_sections(workspace_id, data)

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

@router.get("/section-types/{section_type_id}/prompt")
async def get_prompt_by_SectionType(section_type_id: int):
    return await get_prompt_by_sectionType(section_type_id)

@router.put("/section-types/{section_type_id}")
async def update_SectionType(section_type_id: int, data: SectionTypeUpdateRequest):
    return await update_sectionType(section_type_id, data)

@router.delete("/section-types/{section_type_id}")
async def delete_SectionType(section_type_id: int):
    return await delete_sectionType(section_type_id)

@router.post("/section-types/{section_type_id}/prompt")
async def api_save_prompt(section_type_id: int, data: SavePromptRequest):
    return await save_prompt(section_type_id, data)

@router.post("/section-types/create")
async def create_sectionType_route(data: SectionTypeCreateRequest):
    return await create_sectionType(data)
