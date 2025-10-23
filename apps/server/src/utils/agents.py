from crewai import Agent, LLM, Crew, Task
from crewai_tools import SerperDevTool
from crewai.tools import tool
from config.env import env
import requests
from bs4 import BeautifulSoup
from unstructured.partition.html import partition_html
import logging
import re

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0"
]

@tool
def custom_scrape_website(url: str) -> str:
    """
    Custom web scraping tool that extracts content from a website URL.
    Uses BeautifulSoup and unstructured for robust content extraction.

    Args:
        url (str): The URL to scrape

    Returns:
        str: Extracted content from the website
    """
    try:
        logger.info(f"Starting web scraping for: {url}")

        # Try different user agents for better compatibility
        for agent in USER_AGENTS:
            try:
                headers = {
                    "User-Agent": agent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                }

                resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
                resp.raise_for_status()


                content_type = resp.headers.get('content-type', '').lower()
                if 'text/html' not in content_type:
                    logger.warning(f"Unexpected content type: {content_type}")
                    continue

                logger.info(f"Successfully fetched content, length: {len(resp.text)}")


                soup = BeautifulSoup(resp.text, 'html.parser')


                for script in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
                    script.decompose()


                unwanted_classes = [
                    'nav', 'navigation', 'menu', 'sidebar', 'footer', 'header',
                    'breadcrumb', 'pagination', 'social', 'share', 'advertisement',
                    'ads', 'banner', 'popup', 'modal', 'cookie', 'privacy',
                    'comment', 'comments', 'related', 'recommended', 'sponsored',
                    'newsletter', 'subscribe', 'login', 'signup', 'search',
                    'toolbar', 'widget', 'sidebar', 'sidebar-content'
                ]

                for class_name in unwanted_classes:
                    for element in soup.find_all(class_=re.compile(class_name, re.I)):
                        element.decompose()


                text_content = soup.get_text(separator='\n', strip=True)


                lines = text_content.split('\n')
                cleaned_lines = []

                for line in lines:
                    line = line.strip()

                    if (len(line) > 10 and
                        not re.match(r'^(home|about|contact|privacy|terms|login|register|search|menu)$', line, re.I) and
                        not re.match(r'^(copyright|©|all rights reserved)', line, re.I) and
                        not re.match(r'^(page \d+|\d+ of \d+)$', line, re.I) and
                        not re.match(r'^(next|previous|back|continue|more)$', line, re.I)):
                        cleaned_lines.append(line)

                # Join lines and clean up extra whitespace
                result = '\n'.join(cleaned_lines)
                result = re.sub(r'\n\s*\n', '\n\n', result)

                if len(result.strip()) > 50:
                    logger.info(f"Successfully extracted content from {url}")
                    return result
                else:
                    logger.warning(f"Content too short, trying next user agent")
                    continue

            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed with {agent[:30]}...: {e}")
                continue
            except Exception as e:
                logger.warning(f"Error with {agent[:30]}...: {e}")
                continue


        try:
            logger.info("Trying unstructured as fallback")
            elements = partition_html(text=resp.text, extract_images_in_html=False)
            text_parts = []
            for element in elements:
                if hasattr(element, 'text') and element.text:
                    text_parts.append(element.text.strip())

            result = '\n'.join([part for part in text_parts if len(part) > 10])
            if len(result.strip()) > 50:
                logger.info(f"Successfully extracted content using unstructured from {url}")
                return result
        except Exception as e:
            logger.warning(f"Unstructured fallback failed: {e}")

        return "No content could be extracted from this URL."

    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return f"Error extracting content from {url}: {str(e)}"



# Predefined sections and parameters
DEFAULT_SECTIONS = {
    "Capabilities & Limits": ["Topic", "Capabilities", "Limitations", "notes"],
    "Performance & Scalability": ["Topic", "Performance metrics", "Scalability limits", "Resource requirements", "notes"]
}


gemini_llm = LLM(
    model="gemini/gemini-2.0-flash",
    api_key=env.get("GOOGLE_API_KEY"),
    temperature=0.5
)


search_tool = SerperDevTool()
scrape_tool = custom_scrape_website


url_fetcher = Agent(
    role="Web URL Fetcher",
    goal="Given company, product and sections, fetch trustworthy URLs for each section heading and its parameters.",
    backstory="Expert researcher sourcing high-quality sources from the web, specializing in finding relevant URLs for specific research parameters.",
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

content_analyzer = Agent(
    role="Content Analyzer",
    goal="Analyze scraped content to extract information relevant to specific research sections",
    backstory="Expert in analyzing large amounts of text content to identify and extract specific information relevant to research topics and business requirements.",
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
    raw = raw_output.strip().replace("```json", "").replace("```", "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        return json.loads(raw)
    elif raw.startswith("{") and raw.endswith("}"):
        return json.loads(raw)
    else:
        raise ValueError("Agent output is not valid JSON.")
