import logging
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
import json
from datetime import datetime

from database.repositories.workspaces import workspace_repository
from database.repositories.sections import section_repository
from utils.agent_orchestration import fetch_urls_workflow, generate_report_workflow

logger = logging.getLogger(__name__)

class ResearchRequest(BaseModel):
    company_name: str
    product_name: str
    objective: str
    sections: List[str]
    custom_sections: Optional[List[str]] = []
    urls: Optional[List[str]] = []
    guiding_notes: Optional[str] = ""

class URLFetchRequest(BaseModel):
    company_name: str
    product_name: str

class URLSelectionRequest(BaseModel):
    company_name: str
    product_name: str
    objective: str
    sections: List[str]
    custom_sections: Optional[List[str]] = []
    selected_urls: List[str]
    guiding_notes: Optional[str] = ""

class ResearchResponse(BaseModel):
    workspace_id: int
    research_id: str
    status: str
    message: str

async def start_research_workflow(data: ResearchRequest):
    """
    Start a research workflow that will:
    1. Create a workspace for the research
    2. Search for information about the company/product
    3. Scrape content from provided URLs
    4. Generate sections based on the research
    5. Save the generated content to the workspace
    """
    try:
        logger.info(f"Starting research workflow for {data.company_name} - {data.product_name}")
        
        # Create workspace for the research
        workspace_name = f"{data.company_name} - {data.product_name} Research"
        tags = ['research', 'ai-generated', data.company_name.lower(), data.product_name.lower()]
        
        workspace = await workspace_repository.create_workspace(
            name=workspace_name,
            client="Research Agent",
            tag_names=tags,
            workspace_type="Research"
        )
        
        logger.info(f"Created workspace {workspace.id} for research")
        
        # Generate a unique research ID
        research_id = f"RES-{workspace.id}-{int(datetime.now().timestamp())}"
        
        # Start the research process in the background
        asyncio.create_task(perform_research(workspace.id, data, research_id))
        
        return ResearchResponse(
            workspace_id=workspace.id,
            research_id=research_id,
            status="started",
            message="Research workflow initiated successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to start research workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start research workflow: {str(e)}")

async def perform_research(workspace_id: int, data: ResearchRequest, research_id: str):
    """
    Perform the actual research work in the background using CrewAI agents
    """
    try:
        logger.info(f"Starting research process for workspace {workspace_id}")
        
        # Combine all sections
        all_sections = data.sections + (data.custom_sections or [])
        
        # Generate comprehensive report using your exact agent workflow
        logger.info("Generating comprehensive report using your agent workflow...")
        
        # Use the URLs from the request or fetch them automatically
        urls_to_use = data.urls or []
        if not urls_to_use:
            # Fetch URLs automatically if none provided
            fetched_urls = await fetch_urls_workflow(data.company_name, data.product_name)
            urls_to_use = [url_obj["URL"] for url_obj in fetched_urls]
        
        # Generate report using your exact workflow
        report_result = await generate_report_workflow(
            company_name=data.company_name,
            product_name=data.product_name,
            selected_urls=urls_to_use
        )
        
        sections_content = report_result["sections"]
        
        # Save each section to the workspace
        for section_name, content in sections_content.items():
            try:
                await section_repository.create_section(
                    workspace_id=workspace_id,
                    name=section_name,
                    content=content,
                    source="Research Agent - CrewAI",
                    tags=[data.company_name, data.product_name, "ai-generated", "crewai"]
                )
                
                logger.info(f"Generated section '{section_name}' for workspace {workspace_id}")
                
            except Exception as e:
                logger.error(f"Failed to save section '{section_name}': {str(e)}")
        
        logger.info(f"Research process completed for workspace {workspace_id}")
        
    except Exception as e:
        logger.error(f"Research process failed for workspace {workspace_id}: {str(e)}")
        
        # Create error sections as fallback
        all_sections = data.sections + (data.custom_sections or [])
        for section_name in all_sections:
            try:
                await section_repository.create_section(
                    workspace_id=workspace_id,
                    name=section_name,
                    content=f"Error generating content for {section_name}. Please try again or contact support.",
                    source="Research Agent - Error",
                    tags=[data.company_name, data.product_name, "error"]
                )
            except Exception as save_error:
                logger.error(f"Failed to save error section '{section_name}': {str(save_error)}")

async def fetch_urls_for_research_workflow(data: URLFetchRequest):
    """
    Fetch URLs for research using the URL fetcher agent
    Uses the exact same workflow from your agent_flow.py
    """
    try:
        logger.info(f"Fetching URLs for {data.company_name} - {data.product_name}")
        
        urls = await fetch_urls_workflow(data.company_name, data.product_name)
        
        return {
            "urls": urls,
            "status": "success",
            "message": f"Found {len(urls)} relevant URLs"
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch URLs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch URLs: {str(e)}")


async def start_research_with_urls(data: URLSelectionRequest):
    """
    Start research workflow with pre-selected URLs
    """
    try:
        logger.info(f"Starting research with URLs for {data.company_name} - {data.product_name}")
        
        # Create workspace for the research
        workspace_name = f"{data.company_name} - {data.product_name} Research"
        tags = ['research', 'ai-generated', data.company_name.lower(), data.product_name.lower()]
        
        workspace = await workspace_repository.create_workspace(
            name=workspace_name,
            client="Research Agent",
            tag_names=tags,
            workspace_type="Research"
        )
        
        logger.info(f"Created workspace {workspace.id} for research")
        
        # Generate a unique research ID
        research_id = f"RES-{workspace.id}-{int(datetime.now().timestamp())}"
        
        # Convert URLSelectionRequest to ResearchRequest
        research_data = ResearchRequest(
            company_name=data.company_name,
            product_name=data.product_name,
            objective=data.objective,
            sections=data.sections,
            custom_sections=data.custom_sections,
            urls=data.selected_urls,
            guiding_notes=data.guiding_notes
        )
        
        # Start the research process in the background
        asyncio.create_task(perform_research(workspace.id, research_data, research_id))
        
        return ResearchResponse(
            workspace_id=workspace.id,
            research_id=research_id,
            status="started",
            message="Research workflow initiated successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to start research workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start research workflow: {str(e)}")

async def get_research_status(workspace_id: int):
    """
    Get the status of a research workflow
    """
    try:
        # In a real implementation, you would track research status in a database
        # For now, we'll return a mock status
        return {
            "workspace_id": workspace_id,
            "status": "completed",
            "progress": 100,
            "sections_generated": 5,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get research status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get research status: {str(e)}")
