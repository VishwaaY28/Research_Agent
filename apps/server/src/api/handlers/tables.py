# from fastapi import HTTPException
# from fastapi.responses import JSONResponse
# from typing import List
# from database.repositories.tables import workspace_table_repository

# async def add_table_to_workspace(workspace_id: int, source_table_id: int):
#     workspace_table = await workspace_table_repository.add_table_to_workspace(workspace_id, source_table_id)
#     return JSONResponse({"id": workspace_table.id, "workspace_id": workspace_id, "source_table_id": source_table_id})

# async def get_workspace_tables(workspace_id: int):
#     tables = await workspace_table_repository.get_workspace_tables(workspace_id)
#     result = []
#     for tbl in tables:
#         tags = [tag.tag.name for tag in tbl.tags] if hasattr(tbl, 'tags') else []
#         result.append({
#             "id": tbl.id,
#             "workspace_id": tbl.workspace_id,
#             "source_table": {
#                 "id": tbl.source_table.id,
#                 "path": tbl.source_table.path,
#                 "page_number": tbl.source_table.page_number,
#                 "caption": tbl.source_table.caption,
#                 "data": tbl.source_table.data,
#                 "extraction_method": tbl.source_table.extraction_method
#             },
#             "tags": tags
#         })
#     return JSONResponse(result)

# async def filter_workspace_tables_by_tags(workspace_id: int, tags: List[str]):
#     tables = await workspace_table_repository.filter_by_tags(workspace_id, tags)
#     result = []
#     for tbl in tables:
#         tbl_tags = [tag.tag.name for tag in tbl.tags] if hasattr(tbl, 'tags') else []
#         result.append({
#             "id": tbl.id,
#             "workspace_id": tbl.workspace_id,
#             "source_table": {
#                 "id": tbl.source_table.id,
#                 "path": tbl.source_table.path,
#                 "page_number": tbl.source_table.page_number,
#                 "caption": tbl.source_table.caption,
#                 "data": tbl.source_table.data,
#                 "extraction_method": tbl.source_table.extraction_method
#             },
#             "tags": tbl_tags
#         })
#     return JSONResponse(result)

# async def add_tag_to_workspace_table(workspace_table_id: int, tag_name: str):
#     await workspace_table_repository.add_tag_to_workspace_table(workspace_table_id, tag_name)
#     return JSONResponse({"success": True})

# async def add_tags_to_workspace_table(workspace_table_id: int, tag_names: List[str]):
#     await workspace_table_repository.add_tags_to_workspace_table(workspace_table_id, tag_names)
#     return JSONResponse({"success": True})

# async def remove_tag_from_workspace_table(workspace_table_id: int, tag_id: int):
#     success = await workspace_table_repository.remove_tag_from_workspace_table(workspace_table_id, tag_id)
#     return JSONResponse({"success": success})

# async def soft_delete_workspace_table(workspace_table_id: int):
#     await workspace_table_repository.soft_delete(workspace_table_id)
#     return JSONResponse({"success": True})

# async def hard_delete_workspace_table(workspace_table_id: int):
#     await workspace_table_repository.hard_delete(workspace_table_id)
#     return JSONResponse({"success": True})
