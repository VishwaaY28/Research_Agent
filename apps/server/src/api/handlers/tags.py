from fastapi.responses import JSONResponse
from database.repositories.tags import tag_repository

async def get_all_section_tags():
    tags = await tag_repository.get_all_section_tags()
    return JSONResponse([{
        "id": tag.id,
        "name": tag.name,
        "usage_count": tag.usage_count
    } for tag in tags])

async def search_section_tags(query: str, limit: int = 10):
    tags = await tag_repository.search_tags_by_name(query, limit)
    return JSONResponse([{
        "id": tag.id,
        "name": tag.name,
        "usage_count": tag.usage_count
    } for tag in tags])

async def get_user_section_tags(user_id: int):
    tags = await tag_repository.get_user_section_tags(user_id)
    return JSONResponse([{
        "id": tag.id,
        "name": tag.name,
        "usage_count": tag.usage_count
    } for tag in tags])
