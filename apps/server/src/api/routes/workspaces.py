from fastapi import APIRouter, Query
from typing import List

from api.handlers import workspaces as ws_handlers
from api.handlers.workspaces import WorkspaceCreateRequest, WorkspaceUpdateRequest

router = APIRouter(prefix="/api/workspaces")

@router.post("")
async def create_workspace(data: WorkspaceCreateRequest):
    return await ws_handlers.create_workspace(data)

@router.get("")
async def get_all_workspaces():
    return await ws_handlers.fetch_all_workspaces()

@router.post("/search")
async def search_workspaces(data: dict):
    return await ws_handlers.search_workspaces(data)

@router.post("/filter")
async def filter_workspaces(data: dict):
    return await ws_handlers.filter_workspaces(data)

@router.get("/{workspace_id}")
async def get_workspace_by_id(workspace_id: int):
    return await ws_handlers.fetch_by_id(workspace_id)

@router.get("/by-name/{name}")
async def get_workspace_by_name(name: str):
    return await ws_handlers.fetch_by_name(name)

@router.get("/filter-by-tags")
async def filter_workspaces_by_tags(tags: List[str] = Query(...)):
    return await ws_handlers.filter_by_tags(tags)

@router.put("/{workspace_id}")
async def update_workspace(workspace_id: int, data: WorkspaceUpdateRequest):
    return await ws_handlers.update_workspace(workspace_id, data)

@router.delete("/soft/{workspace_id}")
async def soft_delete_workspace(workspace_id: int):
    return await ws_handlers.soft_delete(workspace_id)

@router.delete("/hard/{workspace_id}")
async def hard_delete_workspace(workspace_id: int):
    return await ws_handlers.hard_delete(workspace_id)
