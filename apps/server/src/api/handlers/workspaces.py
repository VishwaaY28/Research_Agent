from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from database.repositories.workspaces import workspace_repository

class WorkspaceCreateRequest(BaseModel):
    name: str
    client: str
    tags: List[str]

class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    tags: Optional[List[str]] = None

async def create_workspace(data: WorkspaceCreateRequest):
    workspace = await workspace_repository.create_workspace(
        name=data.name,
        client=data.client,
        tag_names=data.tags
    )
    return JSONResponse({"id": workspace.id, "name": workspace.name, "client": workspace.client})

async def fetch_by_name(name: str):
    workspace = await workspace_repository.fetch_by_name(name)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    tags = [wt.tag.name for wt in await workspace.tags.all().prefetch_related("tag")]
    return JSONResponse({"id": workspace.id, "name": workspace.name, "client": workspace.client, "tags": tags})

async def filter_by_tags(tags: List[str]):
    workspaces = await workspace_repository.filter_by_tags(tags)
    result = []
    for ws in workspaces:
        ws_tags = [wt.tag.name for wt in await ws.tags.all().prefetch_related("tag")]
        result.append({"id": ws.id, "name": ws.name, "client": ws.client, "tags": ws_tags})
    return JSONResponse(result, status_code=200)

async def update_workspace(workspace_id: int, data: WorkspaceUpdateRequest):
    workspace = await workspace_repository.update_workspace(workspace_id, **data.dict(exclude_unset=True))
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if data.tags is not None:
        try:
            await workspace_repository.update_workspace_tags(workspace_id, data.tags)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse({"id": workspace.id, "name": workspace.name, "client": workspace.client})

async def soft_delete(workspace_id: int):
    success = await workspace_repository.soft_delete(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return JSONResponse({"success": True})

async def hard_delete(workspace_id: int):
    success = await workspace_repository.hard_delete(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return JSONResponse({"success": True})
