from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from utils.agents import (
    url_fetcher, scraper, reporter,
    extract_json, is_valid_url_object, is_valid_url
)
from crewai import Task, Crew
from database.models import UserIntent, ResearchSectionTemplate


class Citation(BaseModel):
    source_id: str
    quote: str
    locator: str


class ResearchSection(BaseModel):
    section_name: str
    group: str
    relevant: bool
    topic: str
    content: Dict[str, Any]
    notes: str


class ResearchAgentRequest(BaseModel):
    company_name: str
    product_name: str
    selected_urls: Optional[List[str]] = None


class URLItem(BaseModel):
    URL: str
    Description: str


class ResearchAgentResponse(BaseModel):
    urls: List[URLItem]
    sections: List[ResearchSection]
    error: Optional[str] = None


async def fetch_urls(company_name: str, product_name: str) -> List[URLItem]:
    """Fetch URLs related to the company and product using the URL fetcher agent."""
    try:
        task_url_search = Task(
            description=f"Search for top 5 trustworthy URLs about '{product_name}' from '{company_name}'.",
            expected_output="Return a valid JSON array of 5 objects with keys 'URL' and 'Description'.",
            agent=url_fetcher
        )

        crew_initial = Crew(
            agents=[url_fetcher],
            tasks=[task_url_search],
            llm=url_fetcher.llm,
            verbose=True
        )

        url_output = crew_initial.kickoff()
        parsed_json = extract_json(str(url_output))
        url_list = [URLItem(**obj) for obj in parsed_json if is_valid_url_object(obj)]

        return url_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch URLs: {str(e)}")


async def extract_research_section(
    section_name: str,
    section_template: Dict[str, Any],
    product_name: str,
    valid_urls: List[str]
) -> ResearchSection:
    """Extract a specific research section using the provided template."""
    try:

        source_mapping = {f"source_{i+1}": url for i, url in enumerate(valid_urls)}

        formatted_prompt = section_template["prompt"].format(TOPIC=product_name)

        full_prompt = f"""
{formatted_prompt}

Source mapping:
{json.dumps(source_mapping, indent=2)}

IMPORTANT: You must respond with ONLY a valid JSON object that follows this exact schema:
{json.dumps(section_template["schema"], indent=2)}

Do not include any text before or after the JSON. Do not include explanations or markdown formatting. Return only the JSON object.
"""

        task_section = Task(
            description=full_prompt,
            expected_output=f"A JSON object following the exact schema provided for {section_name}.",
            agent=scraper
        )

        crew = Crew(
            agents=[scraper],
            tasks=[task_section],
            llm=scraper.llm,
            verbose=True
        )

        output = crew.kickoff()

        try:
            # Try to extract JSON from the output
            output_str = str(output).strip()
            
            # First try direct parsing
            try:
                parsed = json.loads(output_str)
            except json.JSONDecodeError:
                # Try to extract JSON from the text
                parsed = extract_json(output_str)
            
            if not parsed:
                raise ValueError("No valid JSON found in agent output")
            
            return ResearchSection(
                section_name=section_name,
                group=parsed.get("group", section_template["schema"]["group"]),
                relevant=parsed.get("relevant", True),
                topic=parsed.get("topic", product_name),
                content=parsed,
                notes=parsed.get("notes", "")
            )
        except Exception as e:
            print(f"Error parsing section {section_name}: {str(e)}")
            print(f"Agent output: {str(output)}")
            
            # Create a fallback response with sample data
            fallback_content = {
                "group": section_template["schema"]["group"],
                "relevant": True,
                "topic": product_name,
                "notes": f"Sample data generated due to parsing error. Original error: {str(e)}"
            }
            
            # Add section-specific fallback data
            if "capabilities" in section_template["schema"]:
                fallback_content["capabilities"] = [
                    {
                        "claim": f"Sample capability for {product_name}",
                        "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                    }
                ]
                fallback_content["limits"] = [
                    {
                        "claim": f"Sample limitation for {product_name}",
                        "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                    }
                ]
            elif "performance" in section_template["schema"]:
                fallback_content["performance"] = [
                    {
                        "metric": "Sample metric",
                        "value": "Sample value",
                        "description": f"Sample performance data for {product_name}",
                        "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                    }
                ]
                fallback_content["scalability"] = [
                    {
                        "limit": "Sample limit",
                        "description": f"Sample scalability information for {product_name}",
                        "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                    }
                ]
            
            return ResearchSection(
                section_name=section_name,
                group=section_template["schema"]["group"],
                relevant=True,  # Mark as relevant so it shows up
                topic=product_name,
                content=fallback_content,
                notes=f"Sample data generated due to parsing error. Original error: {str(e)}"
            )

    except Exception as e:
        return ResearchSection(
            section_name=section_name,
            group=section_template["schema"]["group"],
            relevant=False,
            topic=product_name,
            content={},
            notes=f"Failed to extract section: {str(e)}"
        )


async def generate_research_report(
    company_name: str,
    product_name: str,
    selected_urls: List[str],
    user_intent_id: int = None
) -> List[ResearchSection]:
    """Generate comprehensive research report with multiple sections."""
    try:
        valid_urls = [url for url in selected_urls if is_valid_url(url)]
        if not valid_urls:
            raise HTTPException(status_code=400, detail="No valid URLs provided")

        # Get research section templates from database
        if user_intent_id:
            # Get sections for specific user intent
            section_templates = await ResearchSectionTemplate.filter(
                user_intent_id=user_intent_id
            ).order_by('order', 'name')
        else:
            # Get default sections (Technical Focus)
            default_intent = await UserIntent.filter(is_default=True).first()
            if not default_intent:
                raise HTTPException(status_code=404, detail="No default user intent found")
            
            section_templates = await ResearchSectionTemplate.filter(
                user_intent=default_intent
            ).order_by('order', 'name')

        sections = []
        for section_template in section_templates:
            section = await extract_research_section(
                section_template.name,
                {
                    "prompt": section_template.prompt,
                    "schema": section_template.schema
                },
                product_name,
                valid_urls
            )
            sections.append(section)

        return sections

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate research report: {str(e)}")


async def run_research_agent(request: ResearchAgentRequest) -> ResearchAgentResponse:
    """Main function to run the research agent workflow."""
    try:
        # Step 1: Fetch URLs
        urls = await fetch_urls(request.company_name, request.product_name)

        if not urls:
            return ResearchAgentResponse(
                urls=[],
                sections=[],
                error="No URLs found for the given company and product"
            )

        # Step 2: Automatically scrape all fetched URLs and generate comprehensive research report
        url_list = [url_item.URL for url_item in urls]
        sections = await generate_research_report(
            request.company_name,
            request.product_name,
            url_list
        )

        response = ResearchAgentResponse(
            urls=urls,  # Show which URLs were scraped
            sections=sections
        )
        
        print(f"Research Agent Response: {response.dict()}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research agent failed: {str(e)}")
