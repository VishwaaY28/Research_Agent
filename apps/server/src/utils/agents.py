from crewai import Agent, LLM, Crew, Task
from crewai_tools import SerperDevTool, ScrapeWebsiteTool
from config.env import env


gemini_llm = LLM(
    model="gemini/gemini-2.0-flash",
    api_key=env.get("GOOGLE_API_KEY"),
    temperature=0.5
)


search_tool = SerperDevTool()
scrape_tool = ScrapeWebsiteTool()


url_fetcher = Agent(
    role="URL Fetcher",
    goal="Find top 5 trustworthy URLs related to the company and product",
    backstory="Specialized in using search tools to find relevant sources.",
    tools=[search_tool],
    llm=gemini_llm,
    verbose=True
)

scraper = Agent(
    role="Scraper",
    goal="Extract relevant content from selected URLs",
    backstory="Expert in web scraping and extracting meaningful data.",
    tools=[scrape_tool],
    llm=gemini_llm,
    verbose=True
)

reporter = Agent(
    role="Reporter",
    goal="Summarize the scraped content in under 100 words",
    backstory="Skilled in writing concise product summaries for business and technical audiences.",
    llm=gemini_llm,
    verbose=True
)

import json

def is_valid_url_object(obj):
    """Check if an object is a valid URL object with required keys."""
    return isinstance(obj, dict) and "URL" in obj and "Description" in obj


def is_valid_url(url):
    """Check if a string is a valid URL."""
    return url.startswith("http://") or url.startswith("https://")


def extract_json(raw_output: str):
    """Extract JSON from raw agent output, handling common formatting issues."""
    import re
    
    raw = raw_output.strip()
    
    # Remove markdown code blocks
    raw = re.sub(r'```json\s*', '', raw)
    raw = re.sub(r'```\s*$', '', raw)
    raw = raw.strip()
    
    # Try to find JSON objects or arrays in the text
    json_patterns = [
        r'\{.*\}',  # Match {...}
        r'\[.*\]',  # Match [...]
    ]
    
    for pattern in json_patterns:
        matches = re.findall(pattern, raw, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
    
    # If no pattern matches, try parsing the entire string
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError("Agent output is not valid JSON.")
