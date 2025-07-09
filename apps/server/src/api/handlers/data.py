import logging
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from database.repositories.data import dashboard_data_repository

logger = logging.getLogger(__name__)

async def get_dashboard_data(req: Request):
    """Get dashboard statistics and recent activity"""
    try:
        user = getattr(req.state, 'user', None)
        user_id = user.id if user else None

        data = await dashboard_data_repository.get_dashboard_data(user_id)

        recent_content = []
        for content in data['recent_generated_content']:
            recent_content.append({
                'id': content.id,
                'title': content.prompt.title,
                'content_preview': content.content[:150] + '...' if len(content.content) > 150 else content.content,
                'workspace_name': content.workspace.name,
                'created_at': content.created_at.isoformat(),
                'user_name': content.user.name if content.user else 'Unknown',
                'prompt_id': content.prompt.id,
                'workspace_id': content.workspace.id
            })

        return JSONResponse({
            'success': True,
            'data': {
                'stats': data['stats'],
                'recent_generated_content': recent_content
            }
        })

    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")
