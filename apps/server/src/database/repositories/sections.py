from database.models import Section, ContentSources, Tag, SectionTag, Workspace
from tortoise.queryset import Prefetch
from tortoise.exceptions import DoesNotExist
from typing import List
from datetime import datetime
import json

class SectionRepository:
    async def bulk_create_sections(self, workspace_id, filename, chunks):
        try:
            workspace = await Workspace.get(id=workspace_id, deleted_at=None)
        except DoesNotExist:
            raise ValueError(f"Workspace with id {workspace_id} not found")

        content_source = None
        if filename.startswith(('http://', 'https://')):
            try:
                content_source = await ContentSources.get(source_url=filename, deleted_at=None)
            except DoesNotExist:
                content_source = await ContentSources.create(
                    name=filename,
                    source_url=filename,
                    extracted_url=filename,
                    type="web"
                )
        else:
            try:
                content_source = await ContentSources.get(name=filename, deleted_at=None)
            except DoesNotExist:
                content_source = await ContentSources.create(
                    name=filename,
                    source_url=f"file://{filename}",
                    extracted_url=f"file://{filename}",
                    type="pdf" if filename.endswith('.pdf') else "docx"
                )

        if not content_source:
            available_sources = await self._list_available_sources()
            raise ValueError(f"Content source not found for filename '{filename}'. Available sources: {available_sources}")

        created_sections = []
        for chunk in chunks:
            content = chunk["content"]
            if not isinstance(content, str):
                try:
                    content = json.dumps(content)
                except Exception:
                    content = str(content)
            name = chunk.get("name")
            tags = chunk.get("tags", [])
            if not name:
                name = content[:50] + "..." if len(content) > 50 else content

            section = await Section.create(
                content_source=content_source,
                workspace=workspace,
                name=name,
                content=content,
                source=filename
            )

            if tags:
                await self.add_tags_to_section(section.id, tags)

            created_sections.append(section)

        return created_sections

    async def add_tag_to_section(self, section_id: int, tag_name: str):
        """Add a tag to a section"""
        tag, _ = await Tag.get_or_create(name=tag_name)
        section_tag, created = await SectionTag.get_or_create(
            section_id=section_id,
            tag=tag
        )
        return section_tag

    async def add_tags_to_section(self, section_id: int, tag_names: List[str]):
        """Add multiple tags to a section"""
        results = []
        for tag_name in tag_names:
            result = await self.add_tag_to_section(section_id, tag_name)
            results.append(result)
        return results

    async def remove_tag_from_section(self, section_id: int, tag_id: int):
        """Remove a tag from a section"""
        deleted_count = await SectionTag.filter(
            section_id=section_id,
            tag_id=tag_id
        ).delete()
        return deleted_count > 0

    async def get_section_tags(self, section_id: int) -> List[Tag]:
        """Get all tags for a section"""
        section_tags = await SectionTag.filter(
            section_id=section_id
        ).prefetch_related('tag')
        return [st.tag for st in section_tags]

    async def _list_available_sources(self):
        sources = await ContentSources.filter(deleted_at=None).all()
        return [{"id": s.id, "name": s.name, "source_url": s.source_url} for s in sources]

    async def get_sections_by_workspace(self, workspace_id):
        return await Section.filter(
            workspace_id=workspace_id, deleted_at=None
        ).prefetch_related(
            "content_source",
            Prefetch(
                "tags",
                queryset=SectionTag.all().prefetch_related("tag")
            )
        )

    async def filter_sections_by_tags(self, workspace_id, tags):
        """Filter sections by workspace and tags"""
        return await Section.filter(
            workspace_id=workspace_id,
            deleted_at=None,
            tags__tag__name__in=tags
        ).distinct().prefetch_related(
            "content_source",
            Prefetch(
                "tags",
                queryset=SectionTag.all().prefetch_related("tag")
            )
        )

    async def search_sections(self, workspace_id: int, content_query: str = None, name_query: str = None, tag_names: list[str] = None):
        query = Section.filter(workspace_id=workspace_id, deleted_at=None)

        if content_query:
            query = query.filter(content__icontains=content_query)

        if name_query:
            query = query.filter(name__icontains=name_query)

        if tag_names:
            query = query.filter(tags__tag__name__in=tag_names).distinct()

        return await query.prefetch_related("tags__tag", "content_source")

    async def create_section(self, workspace_id: int, name: str, content: str, source: str = None, tags: list = None, content_source_id: int = None):
        from database.models import Workspace, Section, ContentSources
        workspace = await Workspace.get(id=workspace_id, deleted_at=None)
        content_source = None
        if content_source_id is not None:
            content_source = await ContentSources.get(id=content_source_id)
        # Always stringify content
        if not isinstance(content, str):
            try:
                content = json.dumps(content)
            except Exception:
                content = str(content)
        section = await Section.create(
            workspace=workspace,
            name=name,
            content=content,
            source=source or "manual",
            content_source=content_source
        )
        if tags:
            await self.add_tags_to_section(section.id, tags)
        return section

    async def soft_delete_section(self, section_id):
        section = await Section.get(id=section_id)
        section.deleted_at = datetime.utcnow()
        await section.save()

    async def hard_delete_section(self, section_id):
        await Section.filter(id=section_id).delete()

section_repository = SectionRepository()
