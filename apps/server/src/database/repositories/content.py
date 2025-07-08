from database.models import (
    Prompt, PromptTag, GeneratedContent, GeneratedContentTag,
    GeneratedContentSection, GeneratedContentImage, GeneratedContentTable,
    Tag, Section, WorkspaceImage, WorkspaceTable, Workspace
)
from database.repositories.tags import tag_repository
from tortoise.functions import Count
from typing import List, Optional
from datetime import datetime

class ContentRepository:
    async def create_prompt(self, workspace_id: int, user_id: int, title: str, content: str, tag_names: List[str] = None):
        """Create a new prompt"""
        prompt = await Prompt.create(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            content=content
        )

        if tag_names:
            for tag_name in tag_names:
                tag = await tag_repository.get_or_create_tag(tag_name)
                await PromptTag.create(prompt=prompt, tag=tag)

        return prompt

    async def get_workspace_prompts(self, workspace_id: int):
        """Get all prompts for a workspace"""
        return await Prompt.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag').order_by('-created_at')

    async def get_prompt_by_id(self, prompt_id: int):
        """Get prompt by ID"""
        return await Prompt.get_or_none(
            id=prompt_id,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag')

    async def filter_prompts_by_tags(self, workspace_id: int, tag_names: List[str]):
        """Filter prompts by tags"""
        return await Prompt.filter(
            workspace_id=workspace_id,
            tags__tag__name__in=tag_names,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag').distinct().order_by('-created_at')

    async def add_prompt_tag(self, prompt_id: int, tag_name: str):
        """Add tag to prompt"""
        prompt = await Prompt.get(id=prompt_id)
        tag = await tag_repository.get_or_create_tag(tag_name)
        await PromptTag.get_or_create(prompt=prompt, tag=tag)

    async def remove_prompt_tag(self, prompt_id: int, tag_id: int):
        """Remove tag from prompt"""
        await PromptTag.filter(prompt_id=prompt_id, tag_id=tag_id).delete()

    async def delete_prompt(self, prompt_id: int):
        """Soft delete prompt"""
        await Prompt.filter(id=prompt_id).update(deleted_at=datetime.now())

    async def create_generated_content(
        self,
        workspace_id: int,
        prompt_id: int,
        user_id: int,
        content: str,
        section_ids: List[int] = None,
        image_ids: List[int] = None,
        table_ids: List[int] = None,
        tag_names: List[str] = None
    ):
        """Create generated content with context"""
        generated_content = await GeneratedContent.create(
            workspace_id=workspace_id,
            prompt_id=prompt_id,
            user_id=user_id,
            content=content
        )

        if section_ids:
            for section_id in section_ids:
                await GeneratedContentSection.create(
                    generated_content=generated_content,
                    section_id=section_id
                )

        if image_ids:
            for image_id in image_ids:
                await GeneratedContentImage.create(
                    generated_content=generated_content,
                    image_id=image_id
                )

        if table_ids:
            for table_id in table_ids:
                await GeneratedContentTable.create(
                    generated_content=generated_content,
                    table_id=table_id
                )

        if tag_names:
            for tag_name in tag_names:
                tag = await tag_repository.get_or_create_tag(tag_name)
                await GeneratedContentTag.create(generated_content=generated_content, tag=tag)

        return generated_content

    async def get_workspace_generated_content(self, workspace_id: int):
        """Get all generated content for a workspace"""
        return await GeneratedContent.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('prompt', 'tags__tag').order_by('-created_at')

    async def get_generated_content_by_id(self, content_id: int):
        """Get generated content by ID with all context"""
        return await GeneratedContent.get_or_none(
            id=content_id,
            deleted_at__isnull=True
        ).prefetch_related(
            'prompt',
            'tags__tag',
            'sections__section',
            'images__image__source_image',
            'tables__table__source_table'
        )

    async def filter_generated_content_by_tags(self, workspace_id: int, tag_names: List[str]):
        """Filter generated content by tags"""
        return await GeneratedContent.filter(
            workspace_id=workspace_id,
            tags__tag__name__in=tag_names,
            deleted_at__isnull=True
        ).prefetch_related('prompt', 'tags__tag').distinct().order_by('-created_at')

    async def add_generated_content_tag(self, content_id: int, tag_name: str):
        """Add tag to generated content"""
        content = await GeneratedContent.get(id=content_id)
        tag = await tag_repository.get_or_create_tag(tag_name)
        await GeneratedContentTag.get_or_create(generated_content=content, tag=tag)

    async def remove_generated_content_tag(self, content_id: int, tag_id: int):
        """Remove tag from generated content"""
        await GeneratedContentTag.filter(generated_content_id=content_id, tag_id=tag_id).delete()

    async def delete_generated_content(self, content_id: int):
        """Soft delete generated content"""
        await GeneratedContent.filter(id=content_id).update(deleted_at=datetime.now())

    async def get_workspace_content(self, workspace_id: int):
        """Get all content for a workspace (sections, images, tables)"""
        workspace = await Workspace.get_or_none(id=workspace_id)
        if not workspace:
            return None

        sections = await Section.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag')

        images = await WorkspaceImage.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('source_image', 'tags__tag')

        tables = await WorkspaceTable.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('source_table', 'tags__tag')

        return {
            'sections': sections,
            'images': images,
            'tables': tables
        }

content_repository = ContentRepository()
