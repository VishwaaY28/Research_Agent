from fastapi import APIRouter
from api.handlers.research_agent import (
    ResearchAgentRequest, 
    ResearchAgentResponse, 
    run_research_agent
)

router = APIRouter(prefix="/api/research-agent")

@router.post("/run", response_model=ResearchAgentResponse)
async def run_research(request: ResearchAgentRequest):
    """
    Run the research agent workflow.
    
    If selected_urls is empty, it will fetch URLs for the company/product.
    If selected_urls is provided, it will generate a research report using those URLs.
    """
    return await run_research_agent(request)
