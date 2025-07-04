import os

from database.models import Section, ContentSources, Tag, SectionTag, Workspace
from tortoise.queryset import Prefetch
from tortoise.exceptions import DoesNotExist

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
                try:
                    content_source = await ContentSources.get(name=filename, deleted_at=None)
                except DoesNotExist:
                    pass
        else:
            try:
                content_source = await ContentSources.get(name=filename, deleted_at=None)
            except DoesNotExist:
                basename = os.path.basename(filename)
                try:
                    content_source = await ContentSources.get(name=basename, deleted_at=None)
                except DoesNotExist:
                    try:
                        content_source = await ContentSources.filter(
                            source_url__contains=basename,
                            deleted_at=None
                        ).first()
                    except DoesNotExist:
                        pass

        if not content_source:
            available_sources = await self._list_available_sources()
            raise ValueError(f"Content source not found for filename '{filename}'. Available sources: {available_sources}")

        created_sections = []
        for chunk in chunks:
            content = chunk["content"]
            name = chunk.get("name")
            tags = chunk.get("tags", [])
            if not name:
                name = " ".join(content.split()[:4]) + ("..." if len(content.split()) > 4 else "")
            section = await Section.create(
                content_source=content_source,
                workspace=workspace,
                name=name,
                content=content,
                source=filename
            )
            for tag_name in tags:
                tag_obj, _ = await Tag.get_or_create(name=tag_name)
                await SectionTag.create(section=section, tag=tag_obj)
            created_sections.append(section)
        return created_sections

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

    async def soft_delete_section(self, section_id):
        from datetime import datetime
        section = await Section.get(id=section_id)
        section.deleted_at = datetime.utcnow()
        await section.save()

    async def hard_delete_section(self, section_id):
        await Section.filter(id=section_id).delete()

section_repository = SectionRepository()
