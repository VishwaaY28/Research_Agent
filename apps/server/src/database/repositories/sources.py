from database.models import ContentSources
from tortoise.exceptions import DoesNotExist

class ContentSourceRepository:
    async def upsert(self, name, source_url, extracted_url, type):
        obj, _ = await ContentSources.get_or_create(
            source_url=source_url,
            defaults={"name": name, "extracted_url": extracted_url, "type": type}
        )
        obj.name = name
        obj.extracted_url = extracted_url
        obj.type = type
        await obj.save()
        return obj

    async def filter_by_filename(self, filename):
        return await ContentSources.filter(name=filename, deleted_at=None)
    
    async def filter_by_url(self, url):
        return await ContentSources.filter(source_url=url, deleted_at=None)

    async def list_all(self):
        return await ContentSources.filter(deleted_at=None).order_by('-created_at')
    
    async def get_by_id(self, content_source_id):
        try:
            return await ContentSources.get(id=content_source_id, deleted_at=None)
        except DoesNotExist:
            return None

    async def soft_delete(self, content_source_id):
        from datetime import datetime
        obj = await ContentSources.get(id=content_source_id)
        obj.deleted_at = datetime.utcnow()
        await obj.save()

    async def hard_delete(self, content_source_id):
        await ContentSources.filter(id=content_source_id).delete()

content_source_repository = ContentSourceRepository()