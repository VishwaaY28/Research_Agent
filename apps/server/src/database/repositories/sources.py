from database.models import ContentSources
from tortoise.exceptions import DoesNotExist

class ContentSourceRepository:
    async def upsert(self, name, source_url, extracted_url, type):
        obj, _ = await ContentSources.get_or_create(
            name=name,
            defaults={"source_url": source_url, "extracted_url": extracted_url, "type": type}
        )
        obj.source_url = source_url
        obj.extracted_url = extracted_url
        obj.type = type
        await obj.save()
        return obj

    async def filter_by_filename(self, filename):
        return await ContentSources.filter(name=filename, deleted_at=None)

    async def soft_delete(self, content_source_id):
        from datetime import datetime
        obj = await ContentSources.get(id=content_source_id)
        obj.deleted_at = datetime.utcnow()
        await obj.save()

    async def hard_delete(self, content_source_id):
        await ContentSources.filter(id=content_source_id).delete()

content_source_repository = ContentSourceRepository()
