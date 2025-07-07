from database.models import Tag, SectionTag, Section, WorkspaceImageTag, WorkspaceTableTag
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

    async def get_all_image_tags(self):
        return await Tag.annotate(
            usage_count=Count('workspace_images')
        ).filter(
            workspace_images__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count')

    async def search_image_tags_by_name(self, query: str, limit: int = 10):
        return await Tag.annotate(
            usage_count=Count('workspace_images')
        ).filter(
            name__icontains=query,
            workspace_images__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count').limit(limit)

    async def get_all_table_tags(self):
        return await Tag.annotate(
            usage_count=Count('workspace_tables')
        ).filter(
            workspace_tables__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count')

    async def search_table_tags_by_name(self, query: str, limit: int = 10):
        return await Tag.annotate(
            usage_count=Count('workspace_tables')
        ).filter(
            name__icontains=query,
            workspace_tables__isnull=False,
            deleted_at__isnull=True
        ).distinct().order_by('-usage_count').limit(limit)

    async def get_or_create_tag(self, name: str):
        tag, created = await Tag.get_or_create(name=name)
        return tag

tag_repository = TagRepository()
