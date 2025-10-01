from database.models import Workspace, Section, Prompt, GeneratedContent
from tortoise.transactions import in_transaction
from tortoise.functions import Count

class DashboardDataRepository:
    @staticmethod
    async def get_dashboard_data(user_id: int = None):
        """Get all dashboard statistics and recent activity in one transaction"""
        async with in_transaction():
            total_workspaces = await Workspace.filter(deleted_at=None).count()

            # Only count sections whose workspace is not soft-deleted
            total_sections = await Section.filter(deleted_at=None, workspace__deleted_at=None).count()

            total_prompts = await Prompt.filter(deleted_at=None).count()

            total_generated_content = await GeneratedContent.filter(deleted_at=None).count()

            recent_workspaces = await Workspace.filter(deleted_at=None).order_by('-last_used_at').limit(3)

            return {
                'stats': {
                    'total_workspaces': total_workspaces,
                    'total_sections': total_sections,
                    'total_prompts': total_prompts,
                    'total_generated_content': total_generated_content
                },
                'recent_workspaces': recent_workspaces
            }

dashboard_data_repository = DashboardDataRepository()
