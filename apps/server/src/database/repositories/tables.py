# from typing import List, Optional
# from database.models import WorkspaceTable, WorkspaceTableTag, SourceTable, Tag
# from tortoise.exceptions import DoesNotExist
# from datetime import datetime

# class SourceTableRepository:
#     async def create_bulk(self, content_source_id: int, tables: List[dict]):
#         """Create multiple source tables for a content source"""
#         source_tables = []
#         for table_data in tables:
#             source_table = await SourceTable.create(
#                 content_source_id=content_source_id,
#                 path=table_data.get('path', ''),
#                 page_number=table_data.get('page_number'),
#                 caption=table_data.get('caption'),
#                 data=table_data.get('data'),
#                 extraction_method=table_data.get('extraction_method')
#             )
#             source_tables.append(source_table)
#         return source_tables

#     async def get_by_source(self, content_source_id: int) -> List[SourceTable]:
#         """Get all source tables for a content source"""
#         return await SourceTable.filter(
#             content_source_id=content_source_id,
#             deleted_at__isnull=True
#         ).all()

#     async def get_by_id(self, table_id: int) -> Optional[SourceTable]:
#         """Get source table by ID"""
#         try:
#             return await SourceTable.get(id=table_id, deleted_at__isnull=True)
#         except DoesNotExist:
#             return None

# class WorkspaceTableRepository:
#     async def add_table_to_workspace(self, workspace_id: int, source_table_id: int) -> WorkspaceTable:
#         """Add a source table to a workspace"""
#         workspace_table, created = await WorkspaceTable.get_or_create(
#             workspace_id=workspace_id,
#             source_table_id=source_table_id
#         )
#         return workspace_table

#     async def get_workspace_tables(self, workspace_id: int) -> List[WorkspaceTable]:
#         """Get all tables for a workspace with their tags"""
#         return await WorkspaceTable.filter(
#             workspace_id=workspace_id,
#             deleted_at__isnull=True
#         ).prefetch_related('source_table', 'tags__tag').all()

#     async def add_tag_to_workspace_table(self, workspace_table_id: int, tag_name: str):
#         """Add a tag to a workspace table"""
#         tag, _ = await Tag.get_or_create(name=tag_name)
#         workspace_table_tag, created = await WorkspaceTableTag.get_or_create(
#             workspace_table_id=workspace_table_id,
#             tag=tag
#         )
#         return workspace_table_tag

#     async def add_tags_to_workspace_table(self, workspace_table_id: int, tag_names: List[str]):
#         """Add multiple tags to a workspace table"""
#         results = []
#         for tag_name in tag_names:
#             result = await self.add_tag_to_workspace_table(workspace_table_id, tag_name)
#             results.append(result)
#         return results

#     async def remove_tag_from_workspace_table(self, workspace_table_id: int, tag_id: int):
#         """Remove a tag from a workspace table"""
#         deleted_count = await WorkspaceTableTag.filter(
#             workspace_table_id=workspace_table_id,
#             tag_id=tag_id
#         ).delete()
#         return deleted_count > 0

#     async def get_workspace_table_tags(self, workspace_table_id: int) -> List[Tag]:
#         """Get all tags for a workspace table"""
#         workspace_table_tags = await WorkspaceTableTag.filter(
#             workspace_table_id=workspace_table_id
#         ).prefetch_related('tag')
#         return [wtt.tag for wtt in workspace_table_tags]

#     async def filter_by_tags(self, workspace_id: int, tag_names: List[str]) -> List[WorkspaceTable]:
#         """Filter workspace tables by tags"""
#         return await WorkspaceTable.filter(
#             workspace_id=workspace_id,
#             deleted_at__isnull=True,
#             tags__tag__name__in=tag_names
#         ).prefetch_related('source_table', 'tags__tag').distinct()

#     async def soft_delete(self, workspace_table_id: int):
#         """Soft delete a workspace table"""
#         await WorkspaceTable.filter(id=workspace_table_id).update(deleted_at=datetime.utcnow())

#     async def hard_delete(self, workspace_table_id: int):
#         """Hard delete a workspace table"""
#         await WorkspaceTable.filter(id=workspace_table_id).delete()

# source_table_repository = SourceTableRepository()
# workspace_table_repository = WorkspaceTableRepository()
