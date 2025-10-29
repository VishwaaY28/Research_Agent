from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from api.handlers.research_agent import (
    ResearchAgentRequest,
    ResearchAgentResponse,
    run_research_agent,
    run_research_agent_streaming
)

router = APIRouter(prefix="/api/research-agent")

@router.post("/run", response_model=ResearchAgentResponse)
async def run_research(request: ResearchAgentRequest):
    """
    Run the research agent workflow.
    """
    return await run_research_agent(request)


@router.post("/run-stream")
async def run_research_stream(request: ResearchAgentRequest):
    """
    Run the research agent workflow with streaming logs.
    """
    return StreamingResponse(
        run_research_agent_streaming(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )
