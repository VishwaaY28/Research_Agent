from fastapi import APIRouter, Query
from typing import List, Optional

from api.handlers import tags as tag_handlers

router = APIRouter(prefix="/api/tags")

@router.get("/sections")
async def get_all_section_tags():
    return await tag_handlers.get_all_section_tags()

@router.get("/sections/search")
async def search_section_tags(
    query: str = Query(..., description="Search query for tag names"),
    limit: int = Query(10, description="Maximum number of results")
):
    return await tag_handlers.search_section_tags(query, limit)

@router.get("/sections/user/{user_id}")
async def get_user_section_tags(user_id: int):
    return await tag_handlers.get_user_section_tags(user_id)
