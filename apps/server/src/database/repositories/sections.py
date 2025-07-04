import os

from database.models import Section, ContentSources, Tag, SectionTag
from tortoise.queryset import Prefetch
from tortoise.exceptions import DoesNotExist

class SectionRepository:
    async def bulk_create_sections(self, workspace_id, filename, chunks):
        try:
            content_source = await ContentSources.get(workspace_id=workspace_id, name=filename, deleted_at=None)
        except DoesNotExist:
            basename = os.path.basename(filename)
            try:
                content_source = await ContentSources.get(
                    workspace_id=workspace_id,
                    name=basename,
                    deleted_at=None
                )
            except DoesNotExist:
                try:
                    content_source = await ContentSources.get(
                        workspace_id=workspace_id,
                        source_url__contains=basename,
                        deleted_at=None
                    )
                except DoesNotExist:
                    available_sources = await self._list_available_sources(workspace_id)
                    raise ValueError(f"Content source not found for workspace {workspace_id} and filename '{filename}'. Available sources: {available_sources}")

        created_sections = []
        for chunk in chunks:
            content = chunk["content"]
            name = chunk.get("name")
            tags = chunk.get("tags", [])
            if not name:
                name = " ".join(content.split()[:4]) + ("..." if len(content.split()) > 4 else "")
            section = await Section.create(
                content_source=content_source,
                name=name,
                content=content,
                source=filename
            )
            for tag_name in tags:
                tag_obj, _ = await Tag.get_or_create(name=tag_name)
                await SectionTag.create(section=section, tag=tag_obj)
            created_sections.append(section)
        return created_sections

    async def _list_available_sources(self, workspace_id):
        sources = await ContentSources.filter(workspace_id=workspace_id, deleted_at=None).all()
        return [{"id": s.id, "name": s.name, "source_url": s.source_url} for s in sources]

    async def get_sections_by_workspace(self, workspace_id):
        return await Section.filter(
            content_source__workspace_id=workspace_id, deleted_at=None
        ).prefetch_related(
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
