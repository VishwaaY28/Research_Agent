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
import re


def is_valid_url_object(obj):
    """Check if an object is a valid URL object with required keys."""
    return isinstance(obj, dict) and "URL" in obj and "Description" in obj


def is_valid_url(url):
    """Check if a string is a valid URL."""
    return url.startswith("http://") or url.startswith("https://")


def extract_json(raw_output: str):
    """Extract JSON from raw agent output, handling common formatting issues."""
    raw = raw_output.strip().replace("```json", "").replace("```", "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        return json.loads(raw)
    elif raw.startswith("{") and raw.endswith("}"):
        return json.loads(raw)
    else:
        raise ValueError("Agent output is not valid JSON.")