from database.models import Tag, SectionTag, Section
from tortoise.functions import Count
from typing import List

class TagRepository:
    async def get_all_section_tags(self):
        return await Tag.annotate(
            usage_count=Count('sections')
        ).filter(
            sections__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count')

    async def search_tags_by_name(self, query: str, limit: int = 10):
        return await Tag.annotate(
            usage_count=Count('sections')
        ).filter(
            name__icontains=query,
            sections__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count').limit(limit)

    async def get_user_section_tags(self, user_id: int):
        return await Tag.annotate(
            usage_count=Count('sections')
        ).filter(
            sections__section__content_source__workspace__user_id=user_id,
            sections__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count')

    async def get_or_create_tag(self, name: str):
        tag, created = await Tag.get_or_create(name=name)
        return tag

tag_repository = TagRepository()
