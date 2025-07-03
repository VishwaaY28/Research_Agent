from database.models import ContentSources
from tortoise.exceptions import DoesNotExist

class ContentSourceRepository:
    async def upsert(self, workspace_id, name, source_url, extracted_url, type):
        obj, _ = await ContentSources.get_or_create(
            workspace_id=workspace_id, name=name,
            defaults={"source_url": source_url, "extracted_url": extracted_url, "type": type}
        )
        obj.source_url = source_url
        obj.extracted_url = extracted_url
        obj.type = type
        await obj.save()
        return obj

    async def fetch_by_workspace(self, workspace_id):
        return await ContentSources.filter(workspace_id=workspace_id, deleted_at=None)

    async def filter_by_filename(self, workspace_id, filename):
        return await ContentSources.filter(workspace_id=workspace_id, name=filename, deleted_at=None)

    async def soft_delete(self, content_source_id):
        from datetime import datetime
        obj = await ContentSources.get(id=content_source_id)
        obj.deleted_at = datetime.utcnow()
        await obj.save()

    async def hard_delete(self, content_source_id):
        await ContentSources.filter(id=content_source_id).delete()

content_source_repository = ContentSourceRepository()
