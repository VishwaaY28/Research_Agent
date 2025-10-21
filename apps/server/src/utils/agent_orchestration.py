"""
Agent orchestration functions extracted from agent_flow.py
This module provides the core agent workflow functions for the API
"""
import json
import re
from crewai import Crew, Task
from utils.agents import url_fetcher, scraper, reporter
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Utility functions from your agent_flow.py
def is_valid_url_object(obj: Dict[str, Any]) -> bool:
    """Schema validation function for URL objects"""
    return isinstance(obj, dict) and "URL" in obj and "Description" in obj


def is_valid_url(url: str) -> bool:
    """Basic URL format validator"""
    return url.startswith("http://") or url.startswith("https://")


def extract_json(raw_output: str) -> Dict[str, Any]:
    """Utility to clean markdown and extract JSON"""
    raw = raw_output.strip().replace("```json", "").replace("```", "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        return json.loads(raw)
    elif raw.startswith("{") and raw.endswith("}"):
        return json.loads(raw)
    else:
        raise ValueError("Agent output is not valid JSON.")


async def fetch_urls_workflow(company_name: str, product_name: str) -> List[Dict[str, str]]:
    """
    Fetch URLs using the exact same workflow from your agent_flow.py (lines 36-58)
    """
    try:
        # Exact same task definition from your agent_flow.py
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

        # Exact same parsing logic from your agent_flow.py
        parsed_json = extract_json(str(url_output))
        url_list = [obj for obj in parsed_json if is_valid_url_object(obj)]
        
        logger.info(f"Found {len(url_list)} URLs for {company_name} - {product_name}")
        return url_list
        
    except Exception as e:
        logger.error(f"Failed to fetch URLs: {str(e)}")
        return []


async def generate_report_workflow(
    company_name: str, 
    product_name: str, 
    selected_urls: List[str]
) -> Dict[str, Any]:
    """
    Generate report using the exact same workflow from your agent_flow.py (lines 93-149)
    """
    try:
        # Exact same task definitions from your agent_flow.py
        task_scrape = Task(
            description=(
                f"Scrape the following URLs about '{product_name}' from '{company_name}':\n{selected_urls}\n\n"
                "From the full scraped content, extract a list of radar items. Each item must be a dictionary with the following keys:\n"
                "- name (string)\n- ring (string)\n- quadrant (string)\n- isNew (boolean)\n- status (string)\n- description (HTML string)\n\n"
                "Return a JSON object with a key 'items' containing this list. Do not include plain URLs or unrelated content."
            ),
            expected_output="A JSON object with a key 'items' containing a list of radar items with fields: name, ring, quadrant, isNew, status, description.",
            agent=scraper
        )

        task_report = Task(
            description=(
                f"Based on the structured radar items extracted from these URLs about '{product_name}' by '{company_name}':\n"
                f"{selected_urls}\n\n"
                "Write a concise summary (max 100 words) that explains what the product is, its purpose, and how users benefit from it. "
                "Ignore irrelevant or repetitive content like navigation menus, footers, or unrelated product listings. "
                "Use clear markdown formatting with short paragraphs or bullet points. "
                "At the end, include a 'Sources:' section listing the exact URLs used."
            ),
            expected_output=(
                "A markdown-formatted summary under 100 words that includes:\n"
                "- A bold product name as the heading\n"
                "- A short paragraph introducing the product and its purpose\n"
                "- Three bullet points highlighting key benefits\n"
                "- A 'Sources:' section listing the exact URLs used"
            ),
            agent=reporter
        )

        crew_final = Crew(
            agents=[scraper, reporter],
            tasks=[task_scrape, task_report],
            llm=reporter.llm,
            verbose=True
        )

        final_output = crew_final.kickoff()

        # Exact same parsing logic from your agent_flow.py
        result = {
            "raw_output": str(final_output),
            "urls_used": selected_urls,
            "sections": {}
        }

        try:
            parsed = extract_json(str(final_output))
            radar_items = parsed.get("items", [])
            if radar_items:
                # Convert radar items to structured content
                result["radar_items"] = radar_items
                result["sections"]["Product Analysis"] = f"# {product_name}\n\n## Radar Items Analysis\n\n"
                for item in radar_items:
                    result["sections"]["Product Analysis"] += f"**{item['name']}** ({item['ring']}, {item['quadrant']})\n"
                    result["sections"]["Product Analysis"] += f"- Status: {item['status']}\n"
                    result["sections"]["Product Analysis"] += f"- New: {'Yes' if item['isNew'] else 'No'}\n"
                    result["sections"]["Product Analysis"] += f"- Description: {item['description']}\n\n"
            else:
                raise ValueError("No radar items found.")
        except Exception:
            # Fallback to markdown summary (exact same as your agent_flow.py)
            result["sections"]["Executive Summary"] = str(final_output)

        return result
        
    except Exception as e:
        logger.error(f"Failed to generate report: {str(e)}")
        return {
            "raw_output": f"Error generating content: {str(e)}",
            "urls_used": selected_urls,
            "sections": {"Error": f"Failed to generate report: {str(e)}"}
        }

