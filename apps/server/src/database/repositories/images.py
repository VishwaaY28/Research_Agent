# from typing import List, Optional
# from database.models import WorkspaceImage, WorkspaceImageTag, SourceImage, Tag
# from tortoise.exceptions import DoesNotExist
# from datetime import datetime

# class SourceImageRepository:
#     async def create_bulk(self, content_source_id: int, images: List[dict]):
#         """Create multiple source images for a content source"""
#         source_images = []
#         for image_data in images:
#             source_image = await SourceImage.create(
#                 content_source_id=content_source_id,
#                 path=image_data.get('path', ''),
#                 page_number=image_data.get('page_number'),
#                 caption=image_data.get('caption'),
#                 ocr_text=image_data.get('ocr_text')
#             )
#             source_images.append(source_image)
#         return source_images

#     async def get_by_source(self, content_source_id: int) -> List[SourceImage]:
#         """Get all source images for a content source"""
#         return await SourceImage.filter(
#             content_source_id=content_source_id,
#             deleted_at__isnull=True
#         ).all()

#     async def get_by_id(self, image_id: int) -> Optional[SourceImage]:
#         """Get source image by ID"""
#         try:
#             return await SourceImage.get(id=image_id, deleted_at__isnull=True)
#         except DoesNotExist:
#             return None

# class WorkspaceImageRepository:
#     async def add_image_to_workspace(self, workspace_id: int, source_image_id: int) -> WorkspaceImage:
#         """Add a source image to a workspace"""
#         workspace_image, created = await WorkspaceImage.get_or_create(
#             workspace_id=workspace_id,
#             source_image_id=source_image_id
#         )
#         return workspace_image

#     async def get_workspace_images(self, workspace_id: int) -> List[WorkspaceImage]:
#         """Get all images for a workspace with their tags"""
#         return await WorkspaceImage.filter(
#             workspace_id=workspace_id,
#             deleted_at__isnull=True
#         ).prefetch_related('source_image', 'tags__tag').all()

#     async def add_tag_to_workspace_image(self, workspace_image_id: int, tag_name: str):
#         """Add a tag to a workspace image"""
#         tag, _ = await Tag.get_or_create(name=tag_name)
#         workspace_image_tag, created = await WorkspaceImageTag.get_or_create(
#             workspace_image_id=workspace_image_id,
#             tag=tag
#         )
#         return workspace_image_tag

#     async def add_tags_to_workspace_image(self, workspace_image_id: int, tag_names: List[str]):
#         """Add multiple tags to a workspace image"""
#         results = []
#         for tag_name in tag_names:
#             result = await self.add_tag_to_workspace_image(workspace_image_id, tag_name)
#             results.append(result)
#         return results

#     async def remove_tag_from_workspace_image(self, workspace_image_id: int, tag_id: int):
#         """Remove a tag from a workspace image"""
#         deleted_count = await WorkspaceImageTag.filter(
#             workspace_image_id=workspace_image_id,
#             tag_id=tag_id
#         ).delete()
#         return deleted_count > 0

#     async def get_workspace_image_tags(self, workspace_image_id: int) -> List[Tag]:
#         """Get all tags for a workspace image"""
#         workspace_image_tags = await WorkspaceImageTag.filter(
#             workspace_image_id=workspace_image_id
#         ).prefetch_related('tag')
#         return [wit.tag for wit in workspace_image_tags]

#     async def filter_by_tags(self, workspace_id: int, tag_names: List[str]) -> List[WorkspaceImage]:
#         """Filter workspace images by tags"""
#         return await WorkspaceImage.filter(
#             workspace_id=workspace_id,
#             deleted_at__isnull=True,
#             tags__tag__name__in=tag_names
#         ).prefetch_related('source_image', 'tags__tag').distinct()

#     async def soft_delete(self, workspace_image_id: int):
#         """Soft delete a workspace image"""
#         await WorkspaceImage.filter(id=workspace_image_id).update(deleted_at=datetime.utcnow())

#     async def hard_delete(self, workspace_image_id: int):
#         """Hard delete a workspace image"""
#         await WorkspaceImage.filter(id=workspace_image_id).delete()

# source_image_repository = SourceImageRepository()
# workspace_image_repository = WorkspaceImageRepository()
