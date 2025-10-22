from typing import Dict, List, Any
from pydantic import BaseModel


class ResearchSectionTemplate(BaseModel):
    name: str
    prompt: str
    schema: Dict[str, Any]


RESEARCH_SECTION_TEMPLATES = {
    "Capabilities & Limits": {
        "name": "Capabilities & Limits",
        "prompt": """Extract evidence-backed "Capabilities" and "Limits" for {TOPIC} from the provided sources.

RULES:
- Each capability/limit must be a single, testable statement supported by at least one citation
- Prefer vendor documentation for capabilities; prefer benchmarks/issues/community posts for limits
- No marketing fluff. If no clear claims are found, return empty arrays
- Include citations with short quotes (≤40 words) and locators

RESPONSE FORMAT:
Return a JSON object with the exact structure shown in the schema below.""",
        "schema": {
            "group": "capabilities_limits",
            "relevant": True,
            "topic": "",
            "capabilities": [
                {"claim": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "limits": [
                {"claim": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "notes": ""
        }
    },
    "Performance & Scalability": {
        "name": "Performance & Scalability",
        "prompt": """Extract "Performance" and "Scalability" information for {TOPIC} from the provided sources.

RULES:
- Document performance metrics, benchmarks, and scalability limits
- Include capacity limits, throughput, and resource requirements
- Focus on measurable performance data and scalability claims
- Include citations with short quotes (≤40 words) and locators

RESPONSE FORMAT:
Return a JSON object with the exact structure shown in the schema below.""",
        "schema": {
            "group": "performance_scalability",
            "relevant": True,
            "topic": "",
            "performance": [
                {"metric": "", "value": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "scalability": [
                {"limit": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "notes": ""
        }
    }
}


def get_research_section_templates() -> Dict[str, ResearchSectionTemplate]:
    """Get all available research section templates."""
    return {name: ResearchSectionTemplate(**data) for name, data in RESEARCH_SECTION_TEMPLATES.items()}


def get_research_section_template(section_name: str) -> ResearchSectionTemplate:
    """Get a specific research section template by name."""
    if section_name not in RESEARCH_SECTION_TEMPLATES:
        raise ValueError(f"Research section template '{section_name}' not found")
    return ResearchSectionTemplate(**RESEARCH_SECTION_TEMPLATES[section_name])
