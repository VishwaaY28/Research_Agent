import urllib.parse
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from fastapi import HTTPException
from database.repositories.sections import section_repository

class SectionSearchRequest(BaseModel):
    content_query: Optional[str] = None
    name_query: Optional[str] = None
    tags: Optional[List[str]] = None

async def bulk_create_sections(workspace_id: int, filename: str, chunks: list):
    filename = urllib.parse.unquote(filename)
    if not chunks or not isinstance(chunks, list):
        raise HTTPException(status_code=400, detail="Chunks must be a non-empty list.")
    try:
        sections = await section_repository.bulk_create_sections(workspace_id, filename, chunks)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Handle database integrity errors more gracefully
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=409, 
                detail=f"Content with filename '{filename}' already exists. Please use a different filename or delete the existing content first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to create sections: {str(e)}")
    return [{"id": s.id, "name": s.name, "content": s.content, "source": s.source} for s in sections]

async def search_sections(workspace_id: int, data: dict):
    search_data = SectionSearchRequest(**data)
    sections = await section_repository.search_sections(
        workspace_id=workspace_id,
        content_query=search_data.content_query,
        name_query=search_data.name_query,
        tag_names=search_data.tags
    )

    result = []
    for section in sections:
        tags = [st.tag.name for st in await section.tags.all().prefetch_related("tag")]
        result.append({
            "id": section.id,
            "name": section.name,
            "content": section.content,
            "content_source": section.content_source.name if section.content_source else section.source,
            "tags": tags
        })

    return JSONResponse(result)

async def get_sections(workspace_id: int):
    sections = await section_repository.get_sections_by_workspace(workspace_id)
    result = []
    for s in sections:
        tags = [st.tag.name for st in s.tags]
        result.append({
            "id": s.id,
            "content": s.content,
            "tags": tags,
            "name": s.name,
            "source": s.source,
            "content_source": s.content_source.name if s.content_source else None
        })
    return result

async def filter_section_by_tags(workspace_id: int, tags: list):
    if not tags or not isinstance(tags, list):
        raise HTTPException(status_code=400, detail="Tags must be a non-empty list.")
    sections = await section_repository.filter_sections_by_tags(workspace_id, tags)
    result = []
    for s in sections:
        tags = [st.tag.name for st in s.tags]
        result.append({
            "id": s.id,
            "content": s.content,
            "tags": tags,
            "name": s.name,
            "source": s.source,
            "content_source": s.content_source.name if s.content_source else None
        })
    return result

async def soft_delete_section(section_id: int):
    await section_repository.soft_delete_section(section_id)
    return {"success": True}

async def hard_delete_section(section_id: int):
    await section_repository.hard_delete_section(section_id)
    return {"success": True}

async def create_section(workspace_id: int, name: str, content: str, source: str = None, tags: list = None):
    section = await section_repository.create_section(workspace_id, name, content, source, tags or [])
    return {
        "id": section.id,
        "name": section.name,
        "content": section.content,
        "source": section.source,
        "tags": tags or []
    }
