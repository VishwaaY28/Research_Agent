from typing import Dict, List, Any
from pydantic import BaseModel


class ResearchSectionTemplate(BaseModel):
    name: str
    prompt: str
    schema: Dict[str, Any]


RESEARCH_SECTION_TEMPLATES = {
    "Capabilities & Limits": {
        "name": "Capabilities & Limits",
        "prompt": """Extract evidence-backed "Capabilities" and "Limits" for {TOPIC} from this source.

RULES
- Each bullet must be a single, testable statement supported by ≥1 citation.
- Prefer vendor docs for capabilities; prefer benchmarks/issues/community posts for limits.
- No marketing fluff. If the page has no clear claims, return empty arrays.

OUTPUT
Use the schema and include citations with short quotes (≤40 words) and locators.""",
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
    "Pricing & Licensing": {
        "name": "Pricing & Licensing",
        "prompt": """Extract "Pricing" and "Licensing" information for {TOPIC} from this source.

RULES
- Include specific pricing tiers, models, and costs where available.
- Document licensing terms, restrictions, and requirements.
- Focus on factual information, not promotional content.

OUTPUT
Use the schema and include citations with short quotes (≤40 words) and locators.""",
        "schema": {
            "group": "pricing_licensing",
            "relevant": True,
            "topic": "",
            "pricing": [
                {"tier": "", "price": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "licensing": [
                {"type": "", "terms": "", "restrictions": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "notes": ""
        }
    },
    "Integration & Compatibility": {
        "name": "Integration & Compatibility",
        "prompt": """Extract "Integration" and "Compatibility" information for {TOPIC} from this source.

RULES
- Document supported platforms, APIs, and third-party integrations.
- Include compatibility requirements and system specifications.
- Focus on technical integration details and requirements.

OUTPUT
Use the schema and include citations with short quotes (≤40 words) and locators.""",
        "schema": {
            "group": "integration_compatibility",
            "relevant": True,
            "topic": "",
            "integrations": [
                {"platform": "", "type": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "compatibility": [
                {"requirement": "", "specification": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "notes": ""
        }
    },
    "Security & Compliance": {
        "name": "Security & Compliance",
        "prompt": """Extract "Security" and "Compliance" information for {TOPIC} from this source.

RULES
- Document security features, certifications, and compliance standards.
- Include data protection measures and privacy policies.
- Focus on verifiable security claims and certifications.

OUTPUT
Use the schema and include citations with short quotes (≤40 words) and locators.""",
        "schema": {
            "group": "security_compliance",
            "relevant": True,
            "topic": "",
            "security": [
                {"feature": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "compliance": [
                {"standard": "", "certification": "", "description": "", "citations": [{"source_id": "", "quote": "", "locator": ""}]}
            ],
            "notes": ""
        }
    },
    "Performance & Scalability": {
        "name": "Performance & Scalability",
        "prompt": """Extract "Performance" and "Scalability" information for {TOPIC} from this source.

RULES
- Document performance metrics, benchmarks, and scalability limits.
- Include capacity limits, throughput, and resource requirements.
- Focus on measurable performance data and scalability claims.

OUTPUT
Use the schema and include citations with short quotes (≤40 words) and locators.""",
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
