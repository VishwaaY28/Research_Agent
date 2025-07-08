from fastapi import APIRouter, Path, Request
from typing import List

from api.handlers import prompts as prompts_handlers
from api.handlers.prompts import (
    PromptRequest, GenerateContentRequest, SaveGeneratedContentRequest,
    TagRequest, FilterRequest
)

router = APIRouter(prefix="/api/workspaces/{workspace_id}/content")

@router.get("/workspace-content")
async def get_workspace_content(workspace_id: int = Path(...)):
    """Get all content for a workspace (sections, images, tables)"""
    return await prompts_handlers.get_workspace_content(workspace_id)

@router.post("/generate")
async def generate_content(
    workspace_id: int = Path(...),
    request: GenerateContentRequest = ...
):
    """Generate content using AI"""
    return await prompts_handlers.generate_content(workspace_id, request)

@router.post("/save-generated")
async def save_generated_content(
    req: Request,
    workspace_id: int = Path(...),
    request: SaveGeneratedContentRequest = ...
):
    """Save generated content"""
    return await prompts_handlers.save_generated_content(req, workspace_id, request)

@router.post("/prompts")
async def create_prompt(
    req: Request,
    workspace_id: int = Path(...),
    request: PromptRequest = ...
):
    """Create a new prompt"""
    return await prompts_handlers.create_prompt(req, workspace_id, request)

@router.get("/prompts")
async def get_workspace_prompts(workspace_id: int = Path(...)):
    """Get all prompts for a workspace"""
    return await prompts_handlers.get_workspace_prompts(workspace_id)

@router.post("/prompts/filter")
async def filter_prompts_by_tags(
    workspace_id: int = Path(...),
    request: FilterRequest = ...
):
    """Filter prompts by tags"""
    return await prompts_handlers.filter_prompts_by_tags(workspace_id, request)

@router.post("/prompts/{prompt_id}/tags")
async def add_prompt_tag(
    workspace_id: int = Path(...),
    prompt_id: int = Path(...),
    request: TagRequest = ...
):
    """Add tag to prompt"""
    return await prompts_handlers.add_prompt_tag(workspace_id, prompt_id, request)

@router.delete("/prompts/{prompt_id}/tags/{tag_id}")
async def remove_prompt_tag(
    workspace_id: int = Path(...),
    prompt_id: int = Path(...),
    tag_id: int = Path(...)
):
    """Remove tag from prompt"""
    return await prompts_handlers.remove_prompt_tag(workspace_id, prompt_id, tag_id)

@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    workspace_id: int = Path(...),
    prompt_id: int = Path(...)
):
    """Delete prompt"""
    return await prompts_handlers.delete_prompt(workspace_id, prompt_id)

@router.get("/generated")
async def get_workspace_generated_content(workspace_id: int = Path(...)):
    """Get all generated content for a workspace"""
    return await prompts_handlers.get_workspace_generated_content(workspace_id)

@router.get("/generated/{content_id}")
async def get_generated_content_details(
    workspace_id: int = Path(...),
    content_id: int = Path(...)
):
    """Get generated content details"""
    return await prompts_handlers.get_generated_content_details(workspace_id, content_id)

@router.post("/generated/filter")
async def filter_generated_content_by_tags(
    workspace_id: int = Path(...),
    request: FilterRequest = ...
):
    """Filter generated content by tags"""
    return await prompts_handlers.filter_generated_content_by_tags(workspace_id, request)

@router.post("/generated/{content_id}/tags")
async def add_generated_content_tag(
    workspace_id: int = Path(...),
    content_id: int = Path(...),
    request: TagRequest = ...
):
    """Add tag to generated content"""
    return await prompts_handlers.add_generated_content_tag(workspace_id, content_id, request)

@router.delete("/generated/{content_id}/tags/{tag_id}")
async def remove_generated_content_tag(
    workspace_id: int = Path(...),
    content_id: int = Path(...),
    tag_id: int = Path(...)
):
    """Remove tag from generated content"""
    return await prompts_handlers.remove_generated_content_tag(workspace_id, content_id, tag_id)

@router.delete("/generated/{content_id}")
async def delete_generated_content(
    workspace_id: int = Path(...),
    content_id: int = Path(...)
):
    """Delete generated content"""
    return await prompts_handlers.delete_generated_content(workspace_id, content_id)
