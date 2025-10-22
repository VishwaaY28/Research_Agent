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
    """
    return await run_research_agent(request)
