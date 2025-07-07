from fastapi import APIRouter, Body
from typing import List
from api.handlers import tables as workspace_table_handlers

router = APIRouter(prefix="/api/workspaces")

@router.post("/{workspace_id}/tables/{source_table_id}")
async def add_table_to_workspace(workspace_id: int, source_table_id: int):
    return await workspace_table_handlers.add_table_to_workspace(workspace_id, source_table_id)

@router.get("/{workspace_id}/tables")
async def get_workspace_tables(workspace_id: int):
    return await workspace_table_handlers.get_workspace_tables(workspace_id)

@router.post("/{workspace_id}/tables/filter")
async def filter_workspace_tables_by_tags(
    workspace_id: int,
    tags: List[str] = Body(..., description="List of tags to filter by")
):
    return await workspace_table_handlers.filter_workspace_tables_by_tags(workspace_id, tags)

@router.post("/{workspace_id}/tables/{workspace_table_id}/tags")
async def add_tag_to_workspace_table(workspace_id: int, workspace_table_id: int, tag_name: str = Body(...)):
    return await workspace_table_handlers.add_tag_to_workspace_table(workspace_table_id, tag_name)

@router.post("/{workspace_id}/tables/{workspace_table_id}/tags/bulk")
async def add_tags_to_workspace_table(workspace_id: int, workspace_table_id: int, tag_names: List[str] = Body(...)):
    return await workspace_table_handlers.add_tags_to_workspace_table(workspace_table_id, tag_names)

@router.delete("/{workspace_id}/tables/{workspace_table_id}/tags/{tag_id}")
async def remove_tag_from_workspace_table(workspace_id: int, workspace_table_id: int, tag_id: int):
    return await workspace_table_handlers.remove_tag_from_workspace_table(workspace_table_id, tag_id)

@router.delete("/{workspace_id}/tables/{workspace_table_id}/soft")
async def soft_delete_workspace_table(workspace_id: int, workspace_table_id: int):
    return await workspace_table_handlers.soft_delete_workspace_table(workspace_table_id)

@router.delete("/{workspace_id}/tables/{workspace_table_id}/hard")
async def hard_delete_workspace_table(workspace_id: int, workspace_table_id: int):
    return await workspace_table_handlers.hard_delete_workspace_table(workspace_table_id)
