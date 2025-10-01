# from fastapi import HTTPException
# from fastapi.responses import JSONResponse
# from typing import List
# from database.repositories.images import workspace_image_repository

# async def add_image_to_workspace(workspace_id: int, source_image_id: int):
#     workspace_image = await workspace_image_repository.add_image_to_workspace(workspace_id, source_image_id)
#     return JSONResponse({"id": workspace_image.id, "workspace_id": workspace_id, "source_image_id": source_image_id})

# async def get_workspace_images(workspace_id: int):
#     images = await workspace_image_repository.get_workspace_images(workspace_id)
#     result = []
#     for img in images:
#         tags = [tag.tag.name for tag in img.tags] if hasattr(img, 'tags') else []
#         result.append({
#             "id": img.id,
#             "workspace_id": img.workspace_id,
#             "source_image": {
#                 "id": img.source_image.id,
#                 "path": img.source_image.path,
#                 "page_number": img.source_image.page_number,
#                 "caption": img.source_image.caption,
#                 "ocr_text": img.source_image.ocr_text
#             },
#             "tags": tags
#         })
#     return JSONResponse(result)

# async def filter_workspace_images_by_tags(workspace_id: int, tags: List[str]):
#     images = await workspace_image_repository.filter_by_tags(workspace_id, tags)
#     result = []
#     for img in images:
#         img_tags = [tag.tag.name for tag in img.tags] if hasattr(img, 'tags') else []
#         result.append({
#             "id": img.id,
#             "workspace_id": img.workspace_id,
#             "source_image": {
#                 "id": img.source_image.id,
#                 "path": img.source_image.path,
#                 "page_number": img.source_image.page_number,
#                 "caption": img.source_image.caption,
#                 "ocr_text": img.source_image.ocr_text
#             },
#             "tags": img_tags
#         })
#     return JSONResponse(result)

# async def add_tag_to_workspace_image(workspace_image_id: int, tag_name: str):
#     await workspace_image_repository.add_tag_to_workspace_image(workspace_image_id, tag_name)
#     return JSONResponse({"success": True})

# async def add_tags_to_workspace_image(workspace_image_id: int, tag_names: List[str]):
#     await workspace_image_repository.add_tags_to_workspace_image(workspace_image_id, tag_names)
#     return JSONResponse({"success": True})

# async def remove_tag_from_workspace_image(workspace_image_id: int, tag_id: int):
#     success = await workspace_image_repository.remove_tag_from_workspace_image(workspace_image_id, tag_id)
#     return JSONResponse({"success": success})

# async def soft_delete_workspace_image(workspace_image_id: int):
#     await workspace_image_repository.soft_delete(workspace_image_id)
#     return JSONResponse({"success": True})

# async def hard_delete_workspace_image(workspace_image_id: int):
#     await workspace_image_repository.hard_delete(workspace_image_id)
#     return JSONResponse({"success": True})
