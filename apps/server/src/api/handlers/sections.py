import urllib.parse
from fastapi import HTTPException
from database.repositories.sections import section_repository

async def bulk_create_sections(workspace_id: int, filename: str, chunks: list):
    filename = urllib.parse.unquote(filename)
    if not chunks or not isinstance(chunks, list):
        raise HTTPException(status_code=400, detail="Chunks must be a non-empty list.")
    try:
        sections = await section_repository.bulk_create_sections(workspace_id, filename, chunks)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return [{"id": s.id, "name": s.name, "content": s.content, "source": s.source} for s in sections]

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
