from fastapi import APIRouter, Request

from api.handlers import data as data_handlers

router = APIRouter(prefix="/api/data")

@router.get("/dashboard")
async def get_dashboard_data(req: Request):
    return await data_handlers.get_dashboard_data(req)
