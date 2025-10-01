from database.models import Workspace, Tag, WorkspaceTag, Section, Prompt, GeneratedContent, WorkspaceType
from tortoise.exceptions import DoesNotExist
from tortoise.transactions import in_transaction

class WorkspaceRepository:
    @staticmethod
    async def create_workspace(name: str, client: str, tag_names: list[str], workspace_type: str = None):
        """
        Create a workspace. Content association (sources/chunks) is handled in the handler, not here.
        """
        async with in_transaction():
            workspace_type_obj = None
            print(f"DEBUG: Received workspace_type: {workspace_type} (type: {type(workspace_type)})")
            
            # Debug: List all available workspace types
            all_workspace_types = await WorkspaceType.all()
            print(f"DEBUG: Available workspace types in database: {[(wt.id, wt.name) for wt in all_workspace_types]}")
            
            if workspace_type:
                # If workspace_type is a string (name), fetch the object
                if isinstance(workspace_type, str) and not workspace_type.isdigit():
                    try:
                        workspace_type_obj = await WorkspaceType.get(name=workspace_type)
                        print(f"DEBUG: Found workspace type by name: {workspace_type} -> ID: {workspace_type_obj.id}")
                    except WorkspaceType.DoesNotExist:
                        workspace_type_obj = None
                        print(f"DEBUG: Workspace type not found by name: {workspace_type}")
                else:
                    # If it's already an int or string id, fetch the object
                    try:
                        workspace_type_obj = await WorkspaceType.get(id=int(workspace_type))
                        print(f"DEBUG: Found workspace type by ID: {workspace_type} -> ID: {workspace_type_obj.id}")
                    except WorkspaceType.DoesNotExist:
                        workspace_type_obj = None
                        print(f"DEBUG: Workspace type not found by ID: {workspace_type}")
            else:
                print(f"DEBUG: No workspace_type provided")
            
            print(f"DEBUG: Final workspace_type_obj: {workspace_type_obj}")
            workspace = await Workspace.create(name=name, client=client, workspace_type=workspace_type_obj)
            print(f"DEBUG: Created workspace with ID: {workspace.id}, workspace_type: {workspace.workspace_type_id}")

            for tag_name in tag_names:
                if tag_name.strip():
                    tag, _ = await Tag.get_or_create(name=tag_name.strip())
                    await WorkspaceTag.create(workspace=workspace, tag=tag)

            return workspace

    @staticmethod
    async def fetch_all_workspaces():
        return await Workspace.filter(deleted_at=None).prefetch_related("tags__tag").all()

    @staticmethod
    async def fetch_by_id(workspace_id: int):
        try:
            return await Workspace.get(id=workspace_id, deleted_at=None).prefetch_related("tags__tag")
        except DoesNotExist:
            return None

    @staticmethod
    async def fetch_by_name(name: str):
        try:
            return await Workspace.get(name=name, deleted_at=None).prefetch_related("tags__tag")
        except DoesNotExist:
            return None

    @staticmethod
    async def filter_workspaces(name_query: str = None, tag_names: list[str] = None):
        query = Workspace.filter(deleted_at=None)

        if name_query:
            query = query.filter(name__icontains=name_query)

        if tag_names:
            query = query.filter(tags__tag__name__in=tag_names).distinct()

        return await query.prefetch_related("tags__tag")

    @staticmethod
    async def search_workspaces(name_query: str = None, tag_names: list[str] = None):
        return await WorkspaceRepository.filter_workspaces(name_query, tag_names)

    @staticmethod
    async def filter_by_tags(tag_names: list[str]):
        return await Workspace.filter(
            tags__tag__name__in=tag_names,
            deleted_at=None
        ).distinct().prefetch_related("tags__tag")

    @staticmethod
    async def update_workspace(workspace_id: int, **kwargs):
        workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
        if not workspace:
            return None
        allowed_fields = {"name", "client"}
        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(workspace, key, value)
        await workspace.save()
        return workspace

    @staticmethod
    async def update_workspace_tags(workspace_id: int, tag_names: list[str]):
        async with in_transaction():
            workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
            if not workspace:
                raise ValueError("Workspace not found")

            await WorkspaceTag.filter(workspace=workspace).delete()

            for tag_name in tag_names:
                if tag_name.strip():
                    tag, _ = await Tag.get_or_create(name=tag_name.strip())
                    await WorkspaceTag.create(workspace=workspace, tag=tag)

            return workspace

    @staticmethod
    async def update_last_used(workspace_id: int):
        workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
        if workspace:
            from datetime import datetime
            workspace.last_used_at = datetime.utcnow()
            await workspace.save()
        return workspace

    @staticmethod
    async def soft_delete(workspace_id: int):
        workspace = await Workspace.get_or_none(id=workspace_id)
        if not workspace:
            return False
        from datetime import datetime
        now = datetime.utcnow()
        workspace.deleted_at = now
        await workspace.save()

        # Soft-delete all related sections
        await Section.filter(workspace_id=workspace_id, deleted_at=None).update(deleted_at=now)
        # Soft-delete all related prompts
        await Prompt.filter(workspace_id=workspace_id, deleted_at=None).update(deleted_at=now)
        # Soft-delete all related generated content
        await GeneratedContent.filter(workspace_id=workspace_id, deleted_at=None).update(deleted_at=now)

        return True

    @staticmethod
    async def hard_delete(workspace_id: int):
        async with in_transaction():
            await WorkspaceTag.filter(workspace_id=workspace_id).delete()
            deleted_count = await Workspace.filter(id=workspace_id).delete()
            return deleted_count > 0

workspace_repository = WorkspaceRepository()
