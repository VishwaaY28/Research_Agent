from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, AsyncGenerator
import json
import asyncio
import sys
import io
from contextlib import redirect_stdout, redirect_stderr
from utils.agents import (
    url_fetcher, scraper, content_analyzer, reporter,
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
    user_intent_id: Optional[int] = None
    selected_urls: Optional[List[str]] = None


class URLItem(BaseModel):
    URL: str
    Description: str


class ResearchAgentResponse(BaseModel):
    urls: List[URLItem]
    sections: List[ResearchSection]
    final_report: Optional[str] = None
    error: Optional[str] = None


async def fetch_urls(company_name: str, product_name: str, user_intent_id: Optional[int] = None) -> List[URLItem]:
    """Fetch URLs related to the company and product using the URL fetcher agent."""
    try:
        # Get user intent and its sections from database
        if user_intent_id:
            user_intent = await UserIntent.get(id=user_intent_id)
        else:
            user_intent = await UserIntent.filter(is_default=True).first()

        if not user_intent:
            raise HTTPException(status_code=404, detail="No user intent found")

        section_templates = await ResearchSectionTemplate.filter(
            user_intent=user_intent
        ).order_by('order', 'name')

        if not section_templates:
            raise HTTPException(status_code=404, detail="No research section templates found for this user intent")

        # Build sections description from database
        sections_info = {}
        for section in section_templates:
            sections_info[section.name] = list(section.schema.keys()) if section.schema else []

        task_url_search = Task(
            description=(
                f"Find URLs for the company '{company_name}' and product '{product_name}'. "
                f"Search for information covering these specific sections and parameters:\n\n"
                f"{json.dumps(sections_info, indent=2)}\n\n"
                f"For each section, find relevant and trustworthy URLs that cover the listed parameters. "
                f"Return a valid JSON array of objects with 'URL' and 'Description' keys.\n"
                f"Each URL description should indicate which section and parameters it covers."
            ),
            expected_output="JSON array of objects with 'URL' and 'Description' keys, each URL relevant to specific sections and parameters.",
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


async def scrape_all_urls(urls: List[str]) -> Dict[str, str]:
    """Scrape content from all URLs once and return a mapping of URL to content."""
    scraped_content = {}

    for url in urls:
        try:
            # Create a scraping task for this URL
            scraping_task = Task(
                description=f"Scrape and extract all relevant content from: {url}",
                expected_output="Clean, structured text content from the webpage",
                agent=scraper
            )

            crew_scraping = Crew(
                agents=[scraper],
                tasks=[scraping_task],
                llm=scraper.llm,
                verbose=True
            )

            output = crew_scraping.kickoff()
            scraped_content[url] = str(output)
            print(f"Successfully scraped content from {url}")

        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            scraped_content[url] = f"Error scraping content: {str(e)}"

    return scraped_content


async def analyze_content_for_sections(
    scraped_content: Dict[str, str],
    section_templates: List[ResearchSectionTemplate],
    product_name: str
) -> List[ResearchSection]:
    """Analyze already scraped content for each research section."""
    sections = []

    for section_template in section_templates:
        try:
            # Create an analysis task for this section using the content analyzer
            analysis_task = Task(
                description=f"""
                Analyze the following scraped content to extract information relevant to '{section_template.name}' for '{product_name}':

                Scraped Content:
                {json.dumps(scraped_content, indent=2)}

                Section Requirements:
                {section_template.prompt}

                Expected Output Schema:
                {json.dumps(section_template.schema, indent=2)}

                Instructions:
                1. Analyze the provided scraped content (no need to scrape again)
                2. Extract information relevant to {section_template.name}
                3. Extract specific data points according to the schema
                4. Include proper citations with source URLs
                5. Return a JSON object following the exact schema provided
                """,
                expected_output=f"A JSON object following the exact schema for {section_template.name}",
                agent=content_analyzer
            )

            crew_analysis = Crew(
                agents=[content_analyzer],
                tasks=[analysis_task],
                llm=content_analyzer.llm,
                verbose=True
            )

            output = crew_analysis.kickoff()

            try:
                # Parse the output
                output_str = str(output).strip()

                # Try direct JSON parsing first
                try:
                    parsed = json.loads(output_str)
                except json.JSONDecodeError:
                    # Try to extract JSON from the text
                    parsed = extract_json(output_str)

                if not parsed:
                    raise ValueError("No valid JSON found in agent output")

                section = ResearchSection(
                    section_name=section_template.name,
                    group=parsed.get("group", section_template.schema.get("group", "general")),
                    relevant=parsed.get("relevant", True),
                    topic=parsed.get("topic", product_name),
                    content=parsed,
                    notes=parsed.get("notes", "")
                )

            except Exception as e:
                print(f"Error parsing section {section_template.name}: {str(e)}")
                print(f"Agent output: {str(output)}")

                # Create fallback section with sample data
                fallback_content = {
                    "group": section_template.schema.get("group", "general"),
                    "relevant": True,
                    "topic": product_name,
                    "notes": f"Sample data generated due to parsing error. Original error: {str(e)}"
                }

                # Add section-specific fallback data based on schema
                for key, value in section_template.schema.items():
                    if key not in ["group", "relevant", "topic", "notes"] and isinstance(value, list):
                        fallback_content[key] = [
                            {
                                "claim": f"Sample {key[:-1]} for {product_name}",
                                "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                            }
                        ]

                section = ResearchSection(
                    section_name=section_template.name,
                    group=section_template.schema.get("group", "general"),
                    relevant=True,
                    topic=product_name,
                    content=fallback_content,
                    notes=f"Sample data generated due to parsing error. Original error: {str(e)}"
                )

            sections.append(section)

        except Exception as e:
            print(f"Error processing section {section_template.name}: {str(e)}")

            # Create error section
            error_section = ResearchSection(
                section_name=section_template.name,
                group=section_template.schema.get("group", "general"),
                relevant=False,
                topic=product_name,
                content={},
                notes=f"Failed to process section: {str(e)}"
            )
            sections.append(error_section)

    return sections


async def generate_final_report(
    sections: List[ResearchSection],
    company_name: str,
    product_name: str,
    urls: List[URLItem]
) -> str:
    """Generate a comprehensive final report using the reporter agent."""
    try:
        # Prepare the report data
        report_data = {
            "company": company_name,
            "product": product_name,
            "sections": [
                {
                    "name": section.section_name,
                    "group": section.group,
                    "relevant": section.relevant,
                    "content": section.content,
                    "notes": section.notes
                } for section in sections
            ],
            "sources": [
                {
                    "url": url_item.URL,
                    "description": url_item.Description
                } for url_item in urls
            ]
        }

        report_task = Task(
            description=f"""
            Generate a comprehensive research report for {product_name} from {company_name} based on the following data:

            Research Sections:
            {json.dumps([{
                "name": section.section_name,
                "group": section.group,
                "relevant": section.relevant,
                "content": section.content,
                "notes": section.notes
            } for section in sections], indent=2)}

            Sources Used:
            {json.dumps([{"url": url.URL, "description": url.Description} for url in urls], indent=2)}

            Instructions:
            1. Create a professional research report
            2. Structure the report with clear sections and subsections
            3. Include executive summary, detailed findings, and conclusions
            4. Cite sources appropriately
            5. Make the report actionable and insightful
            6. Use professional business language
            7. Include key insights and recommendations
            8. strictly Dont include your thoughts in the final report
            9. result should be in markdown format
            """,
            expected_output="A comprehensive research report in markdown format with executive summary, detailed findings, and conclusions",
            agent=reporter
        )

        crew_reporting = Crew(
            agents=[reporter],
            tasks=[report_task],
            llm=reporter.llm,
            verbose=True
        )

        report_output = crew_reporting.kickoff()
        return str(report_output)

    except Exception as e:
        print(f"Error generating final report: {str(e)}")
        return f"Error generating final report: {str(e)}"


async def run_research_agent(request: ResearchAgentRequest) -> ResearchAgentResponse:
    """Main function to run the complete research agent workflow."""
    try:
        print(f"Starting research agent for {request.company_name} - {request.product_name}")

        # Step 1: Fetch URLs
        print("Step 1: Fetching URLs...")
        if request.selected_urls and len(request.selected_urls) > 0:
            # Use provided URLs
            urls = [URLItem(URL=url, Description=f"User provided URL for {request.product_name}") for url in request.selected_urls]
        else:
            # Fetch URLs using the agent
            urls = await fetch_urls(request.company_name, request.product_name, request.user_intent_id)

        if not urls:
            return ResearchAgentResponse(
                urls=[],
                sections=[],
                final_report=None,
                error="No URLs found for the given company and product"
            )

        print(f"Found {len(urls)} URLs")

        # Step 2: Get research section templates from database
        print("Step 2: Getting research section templates...")
        if request.user_intent_id:
            user_intent = await UserIntent.get(id=request.user_intent_id)
        else:
            user_intent = await UserIntent.filter(is_default=True).first()

        if not user_intent:
            raise HTTPException(status_code=404, detail="No user intent found")

        section_templates = await ResearchSectionTemplate.filter(
            user_intent=user_intent
        ).order_by('order', 'name')

        if not section_templates:
            raise HTTPException(status_code=404, detail="No research section templates found")

        print(f"Found {len(section_templates)} section templates")

        # Step 3: Scrape all URLs once
        print("Step 3: Scraping content from all URLs...")
        url_list = [url_item.URL for url_item in urls]
        scraped_content = await scrape_all_urls(url_list)

        # Step 4: Analyze scraped content for each section
        print("Step 4: Analyzing content for each section...")
        sections = await analyze_content_for_sections(
            scraped_content,
            section_templates,
            request.product_name
        )

        print(f"Generated {len(sections)} research sections")

        # Step 5: Generate final comprehensive report
        print("Step 5: Generating final report...")
        final_report = await generate_final_report(
            sections,
            request.company_name,
            request.product_name,
            urls
        )

        print("Research agent workflow completed successfully")

        response = ResearchAgentResponse(
            urls=urls,
            sections=sections,
            final_report=final_report
        )

        print(f"Research Agent Response: {response.dict()}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Research agent failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research agent failed: {str(e)}")


class LogCapture:
    """Capture stdout/stderr for streaming"""
    def __init__(self):
        self.logs = []
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
    def write(self, text):
        if text.strip():
            self.logs.append(text.strip())
        self.original_stdout.write(text)
        
    def flush(self):
        self.original_stdout.flush()
        
    def get_new_logs(self):
        logs = self.logs.copy()
        self.logs.clear()
        return logs


async def run_research_agent_streaming(request: ResearchAgentRequest) -> AsyncGenerator[str, None]:
    """Run the research agent with real-time streaming of ALL CrewAI verbose logs."""
    log_capture = LogCapture()

    async def stream_captured_logs(prefix: Optional[str] = None):
        logs = log_capture.get_new_logs()
        for line in logs:
            message = line if not prefix else f"{prefix} {line}"
            yield f"data: {json.dumps({'type': 'log', 'message': message})}\n\n"

    try:
        # Redirect stdout/stderr to capture CrewAI logs
        sys.stdout = log_capture
        sys.stderr = log_capture

        # Intro
        yield f"data: {json.dumps({'type': 'log', 'message': f'Starting research agent for {request.company_name} - {request.product_name}'})}\n\n"

        # Step 1: URL discovery
        yield f"data: {json.dumps({'type': 'step', 'step': 1, 'message': 'Fetching URLs...'})}\n\n"
        if request.selected_urls and len(request.selected_urls) > 0:
            urls = [URLItem(URL=url, Description=f"User provided URL for {request.product_name}") for url in request.selected_urls]
        else:
            # Build sections_info to guide URL fetcher
            if request.user_intent_id:
                user_intent = await UserIntent.get(id=request.user_intent_id)
            else:
                user_intent = await UserIntent.filter(is_default=True).first()
            if not user_intent:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No user intent found'})}\n\n"
                return
            section_templates = await ResearchSectionTemplate.filter(user_intent=user_intent).order_by('order', 'name')
            if not section_templates:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No research section templates found for this user intent'})}\n\n"
                return
            sections_info = {}
            for section in section_templates:
                sections_info[section.name] = list(section.schema.keys()) if section.schema else []

            task_url_search = Task(
                description=(
                    f"Find URLs for the company '{request.company_name}' and product '{request.product_name}'. "
                    f"Search for information covering these specific sections and parameters:\n\n"
                    f"{json.dumps(sections_info, indent=2)}\n\n"
                    f"For each section, find relevant and trustworthy URLs that cover the listed parameters. "
                    f"Return a valid JSON array of objects with 'URL' and 'Description' keys.\n"
                    f"Each URL description should indicate which section and parameters it covers."
                ),
                expected_output="JSON array of objects with 'URL' and 'Description' keys, each URL relevant to specific sections and parameters.",
                agent=url_fetcher
            )
            crew_initial = Crew(agents=[url_fetcher], tasks=[task_url_search], llm=url_fetcher.llm, verbose=True)

            kickoff_task = asyncio.create_task(asyncio.to_thread(crew_initial.kickoff))
            while not kickoff_task.done():
                async for log_line in stream_captured_logs():
                    yield log_line
                await asyncio.sleep(0.2)
            url_output = await kickoff_task
            # Flush remaining logs
            async for log_line in stream_captured_logs():
                yield log_line

            try:
                parsed_json = extract_json(str(url_output))
                urls = [URLItem(**obj) for obj in parsed_json if is_valid_url_object(obj)]
            except Exception:
                urls = []

        if not urls:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No URLs found for the given company and product'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'log', 'message': f'Found {len(urls)} URLs'})}\n\n"

        # Step 2: Load section templates
        yield f"data: {json.dumps({'type': 'step', 'step': 2, 'message': 'Getting research section templates...'})}\n\n"
        if request.user_intent_id:
            user_intent = await UserIntent.get(id=request.user_intent_id)
        else:
            user_intent = await UserIntent.filter(is_default=True).first()
        if not user_intent:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No user intent found'})}\n\n"
            return
        section_templates = await ResearchSectionTemplate.filter(user_intent=user_intent).order_by('order', 'name')
        if not section_templates:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No research section templates found'})}\n\n"
            return
        yield f"data: {json.dumps({'type': 'log', 'message': f'Found {len(section_templates)} section templates'})}\n\n"

        # Step 3: Scrape URLs
        yield f"data: {json.dumps({'type': 'step', 'step': 3, 'message': 'Scraping content from all URLs...'})}\n\n"
        scraped_content: Dict[str, str] = {}
        for url_item in urls:
            url = url_item.URL
            scraping_task = Task(
                description=f"Scrape and extract all relevant content from: {url}",
                expected_output="Clean, structured text content from the webpage",
                agent=scraper
            )
            crew_scraping = Crew(agents=[scraper], tasks=[scraping_task], llm=scraper.llm, verbose=True)
            kickoff_task = asyncio.create_task(asyncio.to_thread(crew_scraping.kickoff))
            while not kickoff_task.done():
                async for log_line in stream_captured_logs(f"[scrape {url}]"):
                    yield log_line
                await asyncio.sleep(0.2)
            output = await kickoff_task
            async for log_line in stream_captured_logs(f"[scrape {url}]"):
                yield log_line
            scraped_content[url] = str(output)

        # Step 4: Analyze content per section
        yield f"data: {json.dumps({'type': 'step', 'step': 4, 'message': 'Analyzing content for each section...'})}\n\n"
        sections: List[ResearchSection] = []
        for section_template in section_templates:
            analysis_task = Task(
                description=f"""
                Analyze the following scraped content to extract information relevant to '{section_template.name}' for '{request.product_name}':

                Scraped Content:
                {json.dumps(scraped_content, indent=2)}

                Section Requirements:
                {section_template.prompt}

                Expected Output Schema:
                {json.dumps(section_template.schema, indent=2)}

                Instructions:
                1. Analyze the provided scraped content (no need to scrape again)
                2. Extract information relevant to {section_template.name}
                3. Extract specific data points according to the schema
                4. Include proper citations with source URLs
                5. Return a JSON object following the exact schema provided
                """,
                expected_output=f"A JSON object following the exact schema for {section_template.name}",
                agent=content_analyzer
            )
            crew_analysis = Crew(agents=[content_analyzer], tasks=[analysis_task], llm=content_analyzer.llm, verbose=True)
            kickoff_task = asyncio.create_task(asyncio.to_thread(crew_analysis.kickoff))
            while not kickoff_task.done():
                async for log_line in stream_captured_logs(f"[analyze {section_template.name}]"):
                    yield log_line
                await asyncio.sleep(0.2)
            output = await kickoff_task
            async for log_line in stream_captured_logs(f"[analyze {section_template.name}]"):
                yield log_line

            try:
                output_str = str(output).strip()
                try:
                    parsed = json.loads(output_str)
                except json.JSONDecodeError:
                    parsed = extract_json(output_str)
                if not parsed:
                    raise ValueError("No valid JSON found in agent output")
                section = ResearchSection(
                    section_name=section_template.name,
                    group=parsed.get("group", section_template.schema.get("group", "general")),
                    relevant=parsed.get("relevant", True),
                    topic=parsed.get("topic", request.product_name),
                    content=parsed,
                    notes=parsed.get("notes", "")
                )
            except Exception as e:
                print(f"Error parsing section {section_template.name}: {str(e)}")
                print(f"Agent output: {str(output)}")
                fallback_content = {
                    "group": section_template.schema.get("group", "general"),
                    "relevant": True,
                    "topic": request.product_name,
                    "notes": f"Sample data generated due to parsing error. Original error: {str(e)}"
                }
                for key, value in section_template.schema.items():
                    if key not in ["group", "relevant", "topic", "notes"] and isinstance(value, list):
                        fallback_content[key] = [{
                            "claim": f"Sample {key[:-1]} for {request.product_name}",
                            "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                        }]
                section = ResearchSection(
                    section_name=section_template.name,
                    group=section_template.schema.get("group", "general"),
                    relevant=True,
                    topic=request.product_name,
                    content=fallback_content,
                    notes=f"Sample data generated due to parsing error. Original error: {str(e)}"
                )
            sections.append(section)

        yield f"data: {json.dumps({'type': 'log', 'message': f'Generated {len(sections)} research sections'})}\n\n"

        # Step 5: Final report
        yield f"data: {json.dumps({'type': 'step', 'step': 5, 'message': 'Generating final report...'})}\n\n"
        report_task = Task(
            description=f"""
            Generate a comprehensive research report for {request.product_name} from {request.company_name} based on the following data:

            Research Sections:
            {json.dumps([{
                "name": section.section_name,
                "group": section.group,
                "relevant": section.relevant,
                "content": section.content,
                "notes": section.notes
            } for section in sections], indent=2)}

            Sources Used:
            {json.dumps([{"url": url.URL, "description": url.Description} for url in urls], indent=2)}

            Instructions:
            1. Create a professional research report
            2. Structure the report with clear sections and subsections
            3. Include executive summary, detailed findings, and conclusions
            4. Cite sources appropriately
            5. Make the report actionable and insightful
            6. Use professional business language
            7. Include key insights and recommendations
            8. strictly Dont include your thoughts in the final report
            9. result should be in markdown format
            """,
            expected_output="A comprehensive research report in markdown format with executive summary, detailed findings, and conclusions",
            agent=reporter
        )
        crew_reporting = Crew(agents=[reporter], tasks=[report_task], llm=reporter.llm, verbose=True)
        kickoff_task = asyncio.create_task(asyncio.to_thread(crew_reporting.kickoff))
        while not kickoff_task.done():
            async for log_line in stream_captured_logs("[report]"):
                yield log_line
            await asyncio.sleep(0.2)
        report_output = await kickoff_task
        async for log_line in stream_captured_logs("[report]"):
            yield log_line
        final_report = str(report_output)

        yield f"data: {json.dumps({'type': 'log', 'message': 'Research agent workflow completed successfully'})}\n\n"

        response = ResearchAgentResponse(urls=urls, sections=sections, final_report=final_report)
        yield f"data: {json.dumps({'type': 'result', 'data': response.dict()})}\n\n"
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Research agent failed: {str(e)}'})}\n\n"
    finally:
        sys.stdout = log_capture.original_stdout
        sys.stderr = log_capture.original_stderr


async def fetch_urls_with_streaming(company_name: str, product_name: str, user_intent_id: Optional[int], log_capture: LogCapture) -> List[URLItem]:
    """Fetch URLs with streaming support."""
    try:
        # Get user intent and its sections from database
        if user_intent_id:
            user_intent = await UserIntent.get(id=user_intent_id)
        else:
            user_intent = await UserIntent.filter(is_default=True).first()

        if not user_intent:
            raise HTTPException(status_code=404, detail="No user intent found")

        section_templates = await ResearchSectionTemplate.filter(
            user_intent=user_intent
        ).order_by('order', 'name')

        if not section_templates:
            raise HTTPException(status_code=404, detail="No research section templates found for this user intent")

        # Build sections description from database
        sections_info = {}
        for section in section_templates:
            sections_info[section.name] = list(section.schema.keys()) if section.schema else []

        task_url_search = Task(
            description=(
                f"Find URLs for the company '{company_name}' and product '{product_name}'. "
                f"Search for information covering these specific sections and parameters:\n\n"
                f"{json.dumps(sections_info, indent=2)}\n\n"
                f"For each section, find relevant and trustworthy URLs that cover the listed parameters. "
                f"Return a valid JSON array of objects with 'URL' and 'Description' keys.\n"
                f"Each URL description should indicate which section and parameters it covers."
            ),
            expected_output="JSON array of objects with 'URL' and 'Description' keys, each URL relevant to specific sections and parameters.",
            agent=url_fetcher
        )

        crew_initial = Crew(
            agents=[url_fetcher],
            tasks=[task_url_search],
            llm=url_fetcher.llm,
            verbose=True
        )

        # Capture logs during execution
        url_output = crew_initial.kickoff()
        
        # Check for new logs and stream them
        new_logs = log_capture.get_new_logs()
        for log in new_logs:
            # This would need to be yielded in the main streaming function
            pass
            
        parsed_json = extract_json(str(url_output))
        url_list = [URLItem(**obj) for obj in parsed_json if is_valid_url_object(obj)]

        return url_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch URLs: {str(e)}")


async def scrape_all_urls_with_streaming(urls: List[str], log_capture: LogCapture) -> Dict[str, str]:
    """Scrape content from all URLs with streaming support."""
    scraped_content = {}

    for url in urls:
        try:
            # Create a scraping task for this URL
            scraping_task = Task(
                description=f"Scrape and extract all relevant content from: {url}",
                expected_output="Clean, structured text content from the webpage",
                agent=scraper
            )

            crew_scraping = Crew(
                agents=[scraper],
                tasks=[scraping_task],
                llm=scraper.llm,
                verbose=True
            )

            output = crew_scraping.kickoff()
            scraped_content[url] = str(output)
            
            # Capture logs
            new_logs = log_capture.get_new_logs()
            for log in new_logs:
                pass  # Would be handled in main streaming function

        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            scraped_content[url] = f"Error scraping content: {str(e)}"

    return scraped_content


async def analyze_content_for_sections_with_streaming(
    scraped_content: Dict[str, str],
    section_templates: List[ResearchSectionTemplate],
    product_name: str,
    log_capture: LogCapture
) -> List[ResearchSection]:
    """Analyze content for sections with streaming support."""
    sections = []

    for section_template in section_templates:
        try:
            # Create an analysis task for this section using the content analyzer
            analysis_task = Task(
                description=f"""
                Analyze the following scraped content to extract information relevant to '{section_template.name}' for '{product_name}':

                Scraped Content:
                {json.dumps(scraped_content, indent=2)}

                Section Requirements:
                {section_template.prompt}

                Expected Output Schema:
                {json.dumps(section_template.schema, indent=2)}

                Instructions:
                1. Analyze the provided scraped content (no need to scrape again)
                2. Extract information relevant to {section_template.name}
                3. Extract specific data points according to the schema
                4. Include proper citations with source URLs
                5. Return a JSON object following the exact schema provided
                """,
                expected_output=f"A JSON object following the exact schema for {section_template.name}",
                agent=content_analyzer
            )

            crew_analysis = Crew(
                agents=[content_analyzer],
                tasks=[analysis_task],
                llm=content_analyzer.llm,
                verbose=True
            )

            output = crew_analysis.kickoff()

            try:
                # Parse the output
                output_str = str(output).strip()

                # Try direct JSON parsing first
                try:
                    parsed = json.loads(output_str)
                except json.JSONDecodeError:
                    # Try to extract JSON from the text
                    parsed = extract_json(output_str)

                if not parsed:
                    raise ValueError("No valid JSON found in agent output")

                section = ResearchSection(
                    section_name=section_template.name,
                    group=parsed.get("group", section_template.schema.get("group", "general")),
                    relevant=parsed.get("relevant", True),
                    topic=parsed.get("topic", product_name),
                    content=parsed,
                    notes=parsed.get("notes", "")
                )

            except Exception as e:
                print(f"Error parsing section {section_template.name}: {str(e)}")
                print(f"Agent output: {str(output)}")

                # Create fallback section with sample data
                fallback_content = {
                    "group": section_template.schema.get("group", "general"),
                    "relevant": True,
                    "topic": product_name,
                    "notes": f"Sample data generated due to parsing error. Original error: {str(e)}"
                }

                # Add section-specific fallback data based on schema
                for key, value in section_template.schema.items():
                    if key not in ["group", "relevant", "topic", "notes"] and isinstance(value, list):
                        fallback_content[key] = [
                            {
                                "claim": f"Sample {key[:-1]} for {product_name}",
                                "citations": [{"source_id": "source_1", "quote": "Sample quote", "locator": "Sample location"}]
                            }
                        ]

                section = ResearchSection(
                    section_name=section_template.name,
                    group=section_template.schema.get("group", "general"),
                    relevant=True,
                    topic=product_name,
                    content=fallback_content,
                    notes=f"Sample data generated due to parsing error. Original error: {str(e)}"
                )

            sections.append(section)

        except Exception as e:
            print(f"Error processing section {section_template.name}: {str(e)}")

            # Create error section
            error_section = ResearchSection(
                section_name=section_template.name,
                group=section_template.schema.get("group", "general"),
                relevant=False,
                topic=product_name,
                content={},
                notes=f"Failed to process section: {str(e)}"
            )
            sections.append(error_section)

    return sections


async def generate_final_report_with_streaming(
    sections: List[ResearchSection],
    company_name: str,
    product_name: str,
    urls: List[URLItem],
    log_capture: LogCapture
) -> str:
    """Generate final report with streaming support."""
    try:
        report_task = Task(
            description=f"""
            Generate a comprehensive research report for {product_name} from {company_name} based on the following data:

            Research Sections:
            {json.dumps([{
                "name": section.section_name,
                "group": section.group,
                "relevant": section.relevant,
                "content": section.content,
                "notes": section.notes
            } for section in sections], indent=2)}

            Sources Used:
            {json.dumps([{"url": url.URL, "description": url.Description} for url in urls], indent=2)}

            Instructions:
            1. Create a professional research report
            2. Structure the report with clear sections and subsections
            3. Include executive summary, detailed findings, and conclusions
            4. Cite sources appropriately
            5. Make the report actionable and insightful
            6. Use professional business language
            7. Include key insights and recommendations
            8. strictly Dont include your thoughts in the final report
            9. result should be in markdown format
            """,
            expected_output="A comprehensive research report in markdown format with executive summary, detailed findings, and conclusions",
            agent=reporter
        )

        crew_reporting = Crew(
            agents=[reporter],
            tasks=[report_task],
            llm=reporter.llm,
            verbose=True
        )

        report_output = crew_reporting.kickoff()
        return str(report_output)

    except Exception as e:
        print(f"Error generating final report: {str(e)}")
        return f"Error generating final report: {str(e)}"
