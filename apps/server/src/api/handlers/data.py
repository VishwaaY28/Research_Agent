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

        recent_workspaces = []
        for ws in data['recent_workspaces']:
            recent_workspaces.append({
                'id': ws.id,
                'name': ws.name,
                'client': ws.client,
                'last_used_at': ws.last_used_at.isoformat() if ws.last_used_at else None
            })

        return JSONResponse({
            'success': True,
            'data': {
                'stats': data['stats'],
                'recent_workspaces': recent_workspaces
            }
        })

    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")
