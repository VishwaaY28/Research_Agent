from database.models import SourceImage
from typing import List, Dict

class SourceImageRepository:
    async def create_bulk(self, content_source_id: int, images: List[Dict]):
        image_objects = []
        for img in images:
            image_obj = SourceImage(
                content_source_id=content_source_id,
                path=img['path'],
                page_number=img.get('page_number'),
                caption=img.get('caption'),
                ocr_text=img.get('ocr_text')
            )
            image_objects.append(image_obj)

        if image_objects:
            await SourceImage.bulk_create(image_objects)
        return image_objects

    async def get_by_source(self, content_source_id: int):
        return await SourceImage.filter(
            content_source_id=content_source_id,
            deleted_at=None
        )

source_image_repository = SourceImageRepository()
