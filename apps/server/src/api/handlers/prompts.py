import logging
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel

from database.repositories.content import content_repository
from utils.llm import openai_client

logger = logging.getLogger(__name__)

class PromptRequest(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []

class GenerateContentRequest(BaseModel):
    prompt: str
    section_ids: Optional[List[int]] = []
    image_ids: Optional[List[int]] = []
    table_ids: Optional[List[int]] = []

class SaveGeneratedContentRequest(BaseModel):
    prompt: str
    content: str
    section_ids: Optional[List[int]] = []
    image_ids: Optional[List[int]] = []
    table_ids: Optional[List[int]] = []
    tags: Optional[List[str]] = []

class TagRequest(BaseModel):
    tag_name: str

class FilterRequest(BaseModel):
    tag_names: List[str]

async def get_workspace_content(workspace_id: int):
    """Get all content for a workspace"""
    try:
        content = await content_repository.get_workspace_content(workspace_id)
        if not content:
            raise HTTPException(status_code=404, detail="Workspace not found")

        return JSONResponse({
            "success": True,
            "content": {
                "sections": [
                    {
                        "id": section.id,
                        "name": section.name,
                        "content": section.content,
                        "source": section.source,
                        "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in section.tags]
                    }
                    for section in content['sections']
                ],
                "images": [
                    {
                        "id": image.id,
                        "source_image_id": image.source_image.id,
                        "path": image.source_image.path,
                        "caption": image.source_image.caption,
                        "ocr_text": image.source_image.ocr_text,
                        "page_number": image.source_image.page_number,
                        "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in image.tags]
                    }
                    for image in content['images']
                ],
                "tables": [
                    {
                        "id": table.id,
                        "source_table_id": table.source_table.id,
                        "path": table.source_table.path,
                        "caption": table.source_table.caption,
                        "data": table.source_table.data,
                        "page_number": table.source_table.page_number,
                        "extraction_method": table.source_table.extraction_method,
                        "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in table.tags]
                    }
                    for table in content['tables']
                ]
            }
        })
    except Exception as e:
        logger.error(f"Error getting workspace content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_content(workspace_id: int, request: GenerateContentRequest):
    """Generate content using OpenAI"""
    try:
        context_sections = []
        context_images = []
        context_tables = []

        if request.section_ids:
            content = await content_repository.get_workspace_content(workspace_id)
            sections = {s.id: s for s in content['sections']}
            context_sections = [sections[sid].content for sid in request.section_ids if sid in sections]

        if request.image_ids:
            content = await content_repository.get_workspace_content(workspace_id)
            images = {img.id: img for img in content['images']}
            context_images = [
                {
                    "caption": images[iid].source_image.caption,
                    "ocr_text": images[iid].source_image.ocr_text
                }
                for iid in request.image_ids if iid in images
            ]

        if request.table_ids:
            content = await content_repository.get_workspace_content(workspace_id)
            tables = {tbl.id: tbl for tbl in content['tables']}
            context_tables = [
                {
                    "caption": tables[tid].source_table.caption,
                    "data": tables[tid].source_table.data
                }
                for tid in request.table_ids if tid in tables
            ]

        generated_text = await openai_client.generate_content(
            prompt=request.prompt,
            context_sections=context_sections,
            context_images=context_images,
            context_tables=context_tables
        )

        return JSONResponse({
            "success": True,
            "generated_content": generated_text
        })
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def save_generated_content(req: Request, workspace_id: int, request: SaveGeneratedContentRequest):
    """Save generated content as a prompt and generated content"""
    try:
        user = req.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        prompt = await content_repository.create_prompt(
            workspace_id=workspace_id,
            user_id=user.id,
            title=f"Generated prompt - {request.prompt[:50]}...",
            content=request.prompt
        )

        generated_content = await content_repository.create_generated_content(
            workspace_id=workspace_id,
            prompt_id=prompt.id,
            user_id=user.id,
            content=request.content,
            section_ids=request.section_ids,
            image_ids=request.image_ids,
            table_ids=request.table_ids,
            tag_names=request.tags
        )

        return JSONResponse({
            "success": True,
            "prompt_id": prompt.id,
            "generated_content_id": generated_content.id
        })
    except Exception as e:
        logger.error(f"Error saving generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def create_prompt(req: Request, workspace_id: int, request: PromptRequest):
    """Create a new prompt"""
    try:
        user = req.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        prompt = await content_repository.create_prompt(
            workspace_id=workspace_id,
            user_id=user.id,
            title=request.title,
            content=request.content,
            tag_names=request.tags
        )

        return JSONResponse({
            "success": True,
            "prompt": {
                "id": prompt.id,
                "title": prompt.title,
                "content": prompt.content,
                "created_at": prompt.created_at.isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error creating prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_workspace_prompts(workspace_id: int):
    """Get all prompts for a workspace"""
    try:
        prompts = await content_repository.get_workspace_prompts(workspace_id)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error getting workspace prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def filter_prompts_by_tags(workspace_id: int, request: FilterRequest):
    """Filter prompts by tags"""
    try:
        prompts = await content_repository.filter_prompts_by_tags(workspace_id, request.tag_names)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error filtering prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def add_prompt_tag(workspace_id: int, prompt_id: int, request: TagRequest):
    """Add tag to prompt"""
    try:
        await content_repository.add_prompt_tag(prompt_id, request.tag_name)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding prompt tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def remove_prompt_tag(workspace_id: int, prompt_id: int, tag_id: int):
    """Remove tag from prompt"""
    try:
        await content_repository.remove_prompt_tag(prompt_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing prompt tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_prompt(workspace_id: int, prompt_id: int):
    """Delete prompt"""
    try:
        await content_repository.delete_prompt(prompt_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error deleting prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_workspace_generated_content(workspace_id: int):
    """Get all generated content for a workspace"""
    try:
        contents = await content_repository.get_workspace_generated_content(workspace_id)

        return JSONResponse({
            "success": True,
            "generated_content": [
                {
                    "id": content.id,
                    "content": content.content,
                    "prompt_id": content.prompt_id,
                    "prompt_title": content.prompt.title,
                    "created_at": content.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags]
                }
                for content in contents
            ]
        })
    except Exception as e:
        logger.error(f"Error getting workspace generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_generated_content_details(workspace_id: int, content_id: int):
    """Get generated content details with context"""
    try:
        content = await content_repository.get_generated_content_by_id(content_id)
        if not content:
            raise HTTPException(status_code=404, detail="Generated content not found")

        return JSONResponse({
            "success": True,
            "generated_content": {
                "id": content.id,
                "content": content.content,
                "prompt": {
                    "id": content.prompt.id,
                    "title": content.prompt.title,
                    "content": content.prompt.content
                },
                "created_at": content.created_at.isoformat(),
                "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags],
                "context_sections": [
                    {
                        "id": ctx.section.id,
                        "name": ctx.section.name,
                        "content": ctx.section.content
                    }
                    for ctx in content.sections
                ],
                "context_images": [
                    {
                        "id": ctx.image.id,
                        "path": ctx.image.source_image.path,
                        "caption": ctx.image.source_image.caption,
                        "ocr_text": ctx.image.source_image.ocr_text
                    }
                    for ctx in content.images
                ],
                "context_tables": [
                    {
                        "id": ctx.table.id,
                        "path": ctx.table.source_table.path,
                        "caption": ctx.table.source_table.caption,
                        "data": ctx.table.source_table.data
                    }
                    for ctx in content.tables
                ]
            }
        })
    except Exception as e:
        logger.error(f"Error getting generated content details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def filter_generated_content_by_tags(workspace_id: int, request: FilterRequest):
    """Filter generated content by tags"""
    try:
        contents = await content_repository.filter_generated_content_by_tags(workspace_id, request.tag_names)

        return JSONResponse({
            "success": True,
            "generated_content": [
                {
                    "id": content.id,
                    "content": content.content,
                    "prompt_id": content.prompt_id,
                    "prompt_title": content.prompt.title,
                    "created_at": content.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags]
                }
                for content in contents
            ]
        })
    except Exception as e:
        logger.error(f"Error filtering generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def add_generated_content_tag(workspace_id: int, content_id: int, request: TagRequest):
    """Add tag to generated content"""
    try:
        await content_repository.add_generated_content_tag(content_id, request.tag_name)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding generated content tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def remove_generated_content_tag(workspace_id: int, content_id: int, tag_id: int):
    """Remove tag from generated content"""
    try:
        await content_repository.remove_generated_content_tag(content_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing generated content tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_generated_content(workspace_id: int, content_id: int):
    """Delete generated content"""
    try:
        await content_repository.delete_generated_content(content_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error deleting generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
