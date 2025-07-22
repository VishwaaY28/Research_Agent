import logging
from database.models import (
    Prompt, PromptTag, GeneratedContent, GeneratedContentTag,
    GeneratedContentSection, Tag, Section, Workspace
)
from database.repositories.tags import tag_repository
from tortoise.functions import Count
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ContentRepository:
    async def create_prompt(self, workspace_id: int, user_id: int, title: str, content: str, tag_names: List[str] = None):
        """Create a new prompt"""
        try:
            logger.info(f"Creating prompt in repository with workspace_id={workspace_id}, user_id={user_id}")

            prompt = await Prompt.create(
                workspace_id=workspace_id,
                user_id=user_id,
                title=title,
                content=content
            )
            logger.info(f"Created prompt with ID: {prompt.id}")

            if tag_names:
                logger.info(f"Adding tags to prompt {prompt.id}: {tag_names}")
                for tag_name in tag_names:
                    tag = await tag_repository.get_or_create_tag(tag_name)
                    await PromptTag.create(prompt=prompt, tag=tag)
                logger.info("Successfully added all tags")

            return prompt
        except Exception as e:
            logger.error(f"Error in create_prompt: {str(e)}", exc_info=True)
            raise

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
            'sections__section'
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

    async def get_prompts_by_section(self, workspace_id: int, section_name: str):
        """Get prompts for a specific section"""
        return await Prompt.filter(
            workspace_id=workspace_id,
            title__icontains=section_name,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag').order_by('-created_at')

    async def get_prompts_by_workspace_type(self, workspace_id: int, workspace_type: str):
        """Get prompts for a specific workspace type"""
        # First get the workspace to check its type
        workspace = await Workspace.get_or_none(id=workspace_id)
        if not workspace or workspace.workspace_type != workspace_type:
            return []
        
        return await Prompt.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag').order_by('-created_at')

    async def get_workspace_content(self, workspace_id: int):
        """Get all content for a workspace (sections only)"""
        workspace = await Workspace.get_or_none(id=workspace_id)
        if not workspace:
            return None

        sections = await Section.filter(
            workspace_id=workspace_id,
            deleted_at__isnull=True
        ).prefetch_related('tags__tag')

        return {
            'sections': sections
        }

content_repository = ContentRepository()
