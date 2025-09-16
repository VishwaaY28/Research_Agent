from database.models import ContentSources
from tortoise.exceptions import DoesNotExist

class ContentSourceRepository:
    async def upsert(self, name, source_url, extracted_url, type):
        try:
            # Try to find by source_url first
            obj = await ContentSources.get(source_url=source_url, deleted_at=None)
            # Update existing record
            obj.name = name
            obj.extracted_url = extracted_url
            obj.type = type
            await obj.save()
            return obj
        except DoesNotExist:
            try:
                # Try to find by extracted_url as fallback
                obj = await ContentSources.get(extracted_url=extracted_url, deleted_at=None)
                # Update existing record
                obj.name = name
                obj.source_url = source_url
                obj.type = type
                await obj.save()
                return obj
            except DoesNotExist:
                # Create new record
                obj = await ContentSources.create(
                    name=name,
                    source_url=source_url,
                    extracted_url=extracted_url,
                    type=type
                )
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