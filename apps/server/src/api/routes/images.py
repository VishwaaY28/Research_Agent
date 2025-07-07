from fastapi import APIRouter, Body
from typing import List
from api.handlers import images as workspace_image_handlers

router = APIRouter(prefix="/api/workspaces")

@router.post("/{workspace_id}/images/{source_image_id}")
async def add_image_to_workspace(workspace_id: int, source_image_id: int):
    return await workspace_image_handlers.add_image_to_workspace(workspace_id, source_image_id)

@router.get("/{workspace_id}/images")
async def get_workspace_images(workspace_id: int):
    return await workspace_image_handlers.get_workspace_images(workspace_id)

@router.post("/{workspace_id}/images/filter")
async def filter_workspace_images_by_tags(
    workspace_id: int,
    tags: List[str] = Body(..., description="List of tags to filter by")
):
    return await workspace_image_handlers.filter_workspace_images_by_tags(workspace_id, tags)

@router.post("/{workspace_id}/images/{workspace_image_id}/tags")
async def add_tag_to_workspace_image(workspace_id: int, workspace_image_id: int, tag_name: str = Body(...)):
    return await workspace_image_handlers.add_tag_to_workspace_image(workspace_image_id, tag_name)

@router.post("/{workspace_id}/images/{workspace_image_id}/tags/bulk")
async def add_tags_to_workspace_image(workspace_id: int, workspace_image_id: int, tag_names: List[str] = Body(...)):
    return await workspace_image_handlers.add_tags_to_workspace_image(workspace_image_id, tag_names)

@router.delete("/{workspace_id}/images/{workspace_image_id}/tags/{tag_id}")
async def remove_tag_from_workspace_image(workspace_id: int, workspace_image_id: int, tag_id: int):
    return await workspace_image_handlers.remove_tag_from_workspace_image(workspace_image_id, tag_id)

@router.delete("/{workspace_id}/images/{workspace_image_id}/soft")
async def soft_delete_workspace_image(workspace_id: int, workspace_image_id: int):
    return await workspace_image_handlers.soft_delete_workspace_image(workspace_image_id)

@router.delete("/{workspace_id}/images/{workspace_image_id}/hard")
async def hard_delete_workspace_image(workspace_id: int, workspace_image_id: int):
    return await workspace_image_handlers.hard_delete_workspace_image(workspace_image_id)
