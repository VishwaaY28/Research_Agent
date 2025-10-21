from fastapi import APIRouter, Path
from typing import List

from api.handlers import research as research_handlers
from api.handlers.research import ResearchRequest, URLFetchRequest, URLSelectionRequest

router = APIRouter(prefix="/api/research")

@router.post("/start")
async def start_research(data: ResearchRequest):
    """Start a new research workflow"""
    return await research_handlers.start_research_workflow(data)

@router.post("/fetch-urls")
async def fetch_urls(data: URLFetchRequest):
    """Fetch relevant URLs for research using CrewAI agents"""
    return await research_handlers.fetch_urls_for_research_workflow(data)

@router.post("/start-with-urls")
async def start_research_with_urls(data: URLSelectionRequest):
    """Start research workflow with pre-selected URLs"""
    return await research_handlers.start_research_with_urls(data)

@router.get("/status/{workspace_id}")
async def get_research_status(workspace_id: int = Path(...)):
    """Get the status of a research workflow"""
    return await research_handlers.get_research_status(workspace_id)
