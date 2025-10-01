import logging
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from database.repositories.workspaces import workspace_repository

logger = logging.getLogger(__name__)

class WorkspaceCreateRequest(BaseModel):
    name: str
    client: str
    tags: List[str]
    workspace_type: Optional[str] = None
    source_ids: Optional[List[int]] = None  # IDs of sources to associate
    chunks: Optional[List[dict]] = None     # Chunks to add as sections

class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    tags: Optional[List[str]] = None

class WorkspaceSearchRequest(BaseModel):
    name_query: Optional[str] = None
    tags: Optional[List[str]] = None

class WorkspaceFilterRequest(BaseModel):
    name_query: Optional[str] = None
    tags: Optional[List[str]] = None

async def create_workspace(data: WorkspaceCreateRequest):
    try:
        logger.info(f"Creating workspace with data: name={data.name}, client={data.client}, tags={data.tags}, workspace_type={data.workspace_type}, source_ids={getattr(data, 'source_ids', None)}, chunks={getattr(data, 'chunks', None)}")

        workspace = await workspace_repository.create_workspace(
            name=data.name,
            client=data.client,
            tag_names=data.tags,
            workspace_type=data.workspace_type
        )

        # Associate all sections from selected sources
        if data.source_ids:
            from database.repositories.sections import section_repository
            for source_id in data.source_ids:
                # Fetch all chunks/sections for this source
                from database.models import Section
                sections = await Section.filter(content_source_id=source_id, deleted_at=None).all()
                for s in sections:
                    # Duplicate section for this workspace
                    await section_repository.create_section(
                        workspace_id=workspace.id,
                        name=s.name,
                        content=s.content,
                        source=s.source,
                        tags=[t.name for t in await s.tags.all().prefetch_related("tag")]
                    )

        # Add selected chunks as new sections
        if data.chunks:
            from database.repositories.sections import section_repository
            import json
            for chunk in data.chunks:
                # chunk should have: content_source_id, name, content, tags (optional)
                content = chunk.get("content")
                if not isinstance(content, str):
                    try:
                        content = json.dumps(content)
                    except Exception:
                        content = str(content)
                await section_repository.create_section(
                    workspace_id=workspace.id,
                    name=chunk.get("name"),
                    content=content,
                    source=chunk.get("source"),
                    tags=chunk.get("tags", []),
                    content_source_id=chunk.get("content_source_id")
                )

        logger.info(f"Workspace created with ID: {workspace.id}")

        workspace_with_tags = await workspace_repository.fetch_by_id(workspace.id)
        if not workspace_with_tags:
            logger.error(f"Could not fetch workspace {workspace.id} after creation")
            raise HTTPException(status_code=500, detail="Workspace created but could not be retrieved")

        tag_relations = await workspace_with_tags.tags.all().prefetch_related("tag")
        tags = [wt.tag.name for wt in tag_relations]

        logger.info(f"Workspace {workspace.id} has tags: {tags}")

        # Get workspace type name if it exists
        workspace_type_name = None
        if workspace_with_tags.workspace_type_id:
            try:
                workspace_type = await workspace_with_tags.workspace_type
                workspace_type_name = workspace_type.name if workspace_type else None
            except:
                workspace_type_name = None

        result = {
            "id": workspace.id,
            "name": workspace.name,
            "client": workspace.client,
            "tags": tags,
            "workspace_type": workspace_type_name  # Return the name instead of ID
        }

        logger.info(f"Returning workspace data: {result}")
        return JSONResponse(result)

    except Exception as e:
        logger.error(f"Error creating workspace: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")

async def filter_workspaces(data: dict):
    filter_data = WorkspaceFilterRequest(**data)
    workspaces = await workspace_repository.filter_workspaces(
        name_query=filter_data.name_query,
        tag_names=filter_data.tags
    )
    result = []
    for ws in workspaces:
        tag_relations = await ws.tags.all().prefetch_related("tag")
        tags = [wt.tag.name for wt in tag_relations]

        # Get workspace type name if it exists
        workspace_type_name = None
        if ws.workspace_type_id:
            try:
                workspace_type = await ws.workspace_type
                workspace_type_name = workspace_type.name if workspace_type else None
            except:
                workspace_type_name = None

        result.append({
            "id": ws.id,
            "name": ws.name,
            "client": ws.client,
            "tags": tags,
            "workspace_type": workspace_type_name
        })
    return JSONResponse(result, status_code=200)

async def search_workspaces(data: dict):
    search_data = WorkspaceSearchRequest(**data)
    workspaces = await workspace_repository.search_workspaces(
        name_query=search_data.name_query,
        tag_names=search_data.tags
    )
    result = []
    for ws in workspaces:
        tag_relations = await ws.tags.all().prefetch_related("tag")
        tags = [wt.tag.name for wt in tag_relations]

        # Get workspace type name if it exists
        workspace_type_name = None
        if ws.workspace_type_id:
            try:
                workspace_type = await ws.workspace_type
                workspace_type_name = workspace_type.name if workspace_type else None
            except:
                workspace_type_name = None

        result.append({
            "id": ws.id,
            "name": ws.name,
            "client": ws.client,
            "tags": tags,
            "workspace_type": workspace_type_name  # Return the name instead of ID
        })
    return JSONResponse(result, status_code=200)

async def fetch_all_workspaces():
    workspaces = await workspace_repository.fetch_all_workspaces()
    result = []
    for ws in workspaces:
        tag_relations = await ws.tags.all().prefetch_related("tag")
        tags = [wt.tag.name for wt in tag_relations]

        # Get workspace type name if it exists
        workspace_type_name = None
        if ws.workspace_type_id:
            try:
                workspace_type = await ws.workspace_type
                workspace_type_name = workspace_type.name if workspace_type else None
            except:
                workspace_type_name = None

        result.append({
            "id": ws.id,
            "name": ws.name,
            "client": ws.client,
            "tags": tags,
            "workspace_type": workspace_type_name  # Return the name instead of ID
        })
    return JSONResponse(result)

async def fetch_by_id(workspace_id: int):
    # Update last_used_at whenever a workspace is accessed
    await workspace_repository.update_last_used(workspace_id)
    workspace = await workspace_repository.fetch_by_id(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    tag_relations = await workspace.tags.all().prefetch_related("tag")
    tags = [wt.tag.name for wt in tag_relations]

    # Get workspace type name if it exists
    workspace_type_name = None
    if workspace.workspace_type_id:
        try:
            workspace_type = await workspace.workspace_type
            workspace_type_name = workspace_type.name if workspace_type else None
        except:
            workspace_type_name = None

    return JSONResponse({
        "id": workspace.id,
        "name": workspace.name,
        "client": workspace.client,
        "tags": tags,
        "workspace_type": workspace_type_name
    })

async def fetch_by_name(name: str):
    workspace = await workspace_repository.fetch_by_name(name)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    tag_relations = await workspace.tags.all().prefetch_related("tag")
    tags = [wt.tag.name for wt in tag_relations]

    # Get workspace type name if it exists
    workspace_type_name = None
    if workspace.workspace_type_id:
        try:
            workspace_type = await workspace.workspace_type
            workspace_type_name = workspace_type.name if workspace_type else None
        except:
            workspace_type_name = None

    return JSONResponse({
        "id": workspace.id,
        "name": workspace.name,
        "client": workspace.client,
        "tags": tags,
        "workspace_type": workspace_type_name  # Return the name instead of ID
    })

async def filter_by_tags(tags: List[str]):
    workspaces = await workspace_repository.filter_by_tags(tags)
    result = []
    for ws in workspaces:
        tag_relations = await ws.tags.all().prefetch_related("tag")
        ws_tags = [wt.tag.name for wt in tag_relations]

        # Get workspace type name if it exists
        workspace_type_name = None
        if ws.workspace_type_id:
            try:
                workspace_type = await ws.workspace_type
                workspace_type_name = workspace_type.name if workspace_type else None
            except:
                workspace_type_name = None

        result.append({
            "id": ws.id,
            "name": ws.name,
            "client": ws.client,
            "tags": ws_tags,
            "workspace_type": workspace_type_name  # Return the name instead of ID
        })
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

    # Fetch updated workspace with tags
    updated_workspace = await workspace_repository.fetch_by_id(workspace_id)
    tag_relations = await updated_workspace.tags.all().prefetch_related("tag")
    tags = [wt.tag.name for wt in tag_relations]

    # Get workspace type name if it exists
    workspace_type_name = None
    if updated_workspace.workspace_type_id:
        try:
            workspace_type = await updated_workspace.workspace_type
            workspace_type_name = workspace_type.name if workspace_type else None
        except:
            workspace_type_name = None

    return JSONResponse({
        "id": updated_workspace.id,
        "name": updated_workspace.name,
        "client": updated_workspace.client,
        "tags": tags,
        "workspace_type": workspace_type_name  # Return the name instead of ID
    })

async def soft_delete(workspace_id: int):
    success = await workspace_repository.soft_delete(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return JSONResponse({"message": "Workspace deleted successfully"})

async def hard_delete(workspace_id: int):
    success = await workspace_repository.hard_delete(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return JSONResponse({"message": "Workspace permanently deleted"})

async def get_workspace_types():
    from database.models import WorkspaceType
    types = await WorkspaceType.all()
    return JSONResponse([{
        "id": t.id,
        "name": t.name,
        "is_default": t.is_default
    } for t in types])
