from database.models import Section, ContentSources, Tag, SectionTag, Workspace
from tortoise.queryset import Prefetch
from tortoise.exceptions import DoesNotExist
from typing import List
from datetime import datetime
import json
from utils.extract_pdf import generate_meaningful_title

class SectionRepository:
    async def bulk_create_sections(self, workspace_id, filename, chunks):
        try:
            workspace = await Workspace.get(id=workspace_id, deleted_at=None)
        except DoesNotExist:
            raise ValueError(f"Workspace with id {workspace_id} not found")

        # We'll prefer any content_source_id provided on individual chunks. Only
        # fall back to creating/upserting a content source for the supplied
        # filename when a chunk doesn't specify an existing source id.
        from database.repositories.sources import content_source_repository

        # Helper to resolve a content source by id or from the filename
        async def resolve_content_source_for_chunk(chunk):
            # If the client provided an explicit content_source_id, try to use it
            cid = None
            if isinstance(chunk, dict) and "content_source_id" in chunk:
                try:
                    cid = int(chunk.get("content_source_id"))
                except Exception:
                    cid = None

            if cid is not None:
                cs = await content_source_repository.get_by_id(cid)
                if cs:
                    return cs

            # Fallback: upsert a content source using the filename (legacy behavior)
            if isinstance(filename, str) and filename.startswith(('http://', 'https://')):
                return await content_source_repository.upsert(
                    name=filename,
                    source_url=filename,
                    extracted_url=filename,
                    type="web",
                )
            else:
                return await content_source_repository.upsert(
                    name=filename,
                    source_url=f"file://{filename}",
                    extracted_url=f"file://{filename}_{workspace_id}",
                    type="pdf" if isinstance(filename, str) and filename.endswith('.pdf') else "docx",
                )

        created_sections = []
        for chunk in chunks:
            content = chunk["content"]
            # Resolve content source for this specific chunk. This will use
            # chunk.content_source_id if provided by the client, otherwise
            # fall back to upserting based on the filename.
            content_source = await resolve_content_source_for_chunk(chunk)
            if not isinstance(content, str):
                try:
                    content = json.dumps(content)
                except Exception:
                    content = str(content)
            
            # Handle different chunk structures
            if isinstance(chunk, dict) and "content" in chunk and isinstance(chunk["content"], list):
                # Structured chunk with minor chunks
                name = chunk.get("title", chunk.get("name", "Untitled Section"))
                tags = chunk.get("tags", [])
                
                # Create main section
                section_source = chunk.get("source") if isinstance(chunk, dict) and "source" in chunk else filename
                section = await Section.create(
                    content_source=content_source,
                    workspace=workspace,
                    name=name,
                    content=content,
                    source=section_source
                )
                
                if tags:
                    await self.add_tags_to_section(section.id, tags)
                
                created_sections.append(section)
                
                # Create sections for minor chunks
                for minor_chunk in chunk["content"]:
                    if isinstance(minor_chunk, dict) and "content" in minor_chunk:
                        minor_content = minor_chunk["content"]
                        if isinstance(minor_content, list):
                            # Extract text from content array
                            minor_text = " ".join([item.get("text", "") for item in minor_content if isinstance(item, dict) and "text" in item])
                        else:
                            minor_text = str(minor_content)
                        
                        minor_name = minor_chunk.get("tag", generate_meaningful_title(minor_text))
                        minor_tags = minor_chunk.get("tags", [])
                        
                        # Add major chunk title as tag
                        if name and name != "Untitled Section":
                            minor_tags.append(name.lower().replace(' ', '-'))
                        
                        minor_source = chunk.get("source") if isinstance(chunk, dict) and "source" in chunk else filename
                        minor_section = await Section.create(
                            content_source=content_source,
                            workspace=workspace,
                            name=minor_name,
                            content=minor_text,
                            source=minor_source
                        )
                        
                        if minor_tags:
                            await self.add_tags_to_section(minor_section.id, minor_tags)
                        
                        created_sections.append(minor_section)
            else:
                # Simple chunk
                name = chunk.get("name", chunk.get("label", "Untitled Section"))
                tags = chunk.get("tags", [])
                if not name or name == "Untitled Section":
                    name = content[:50] + "..." if len(content) > 50 else content

                section_source = chunk.get("source") if isinstance(chunk, dict) and "source" in chunk else filename
                section = await Section.create(
                    content_source=content_source,
                    workspace=workspace,
                    name=name,
                    content=content,
                    source=section_source
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
        from database.repositories.sources import content_source_repository
        workspace = await Workspace.get(id=workspace_id, deleted_at=None)
        content_source = None
        if content_source_id is not None:
            content_source = await ContentSources.get(id=content_source_id)
        else:
            # Ensure a content source exists for manual entries
            manual_name = source or "Manual"
            manual_url = f"manual://{workspace_id}"
            content_source = await content_source_repository.upsert(
                name=manual_name,
                source_url=manual_url,
                extracted_url=manual_url,
                type="web",
            )
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
