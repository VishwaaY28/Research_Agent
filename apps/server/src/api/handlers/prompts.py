import logging
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel

from database.repositories.content import content_repository
from utils.llm import azure_openai_client, ollama_client
from utils.llm2 import hugging_face_llm_client
from utils.llm3 import groq_client

logger = logging.getLogger(__name__)

USE_AZURE_OPENAI = False
USE_HUGGING_FACE = False
USE_GROQ = True

class PromptRequest(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []

class GenerateContentRequest(BaseModel):
    prompt: str
    section_ids: Optional[List[int]] = []
    section_name: Optional[str] = "Generated Content"

class SaveGeneratedContentRequest(BaseModel):
    prompt: str
    content: str
    section_ids: Optional[List[int]] = []
    tags: Optional[List[str]] = []

class TagRequest(BaseModel):
    tag_name: str

class FilterRequest(BaseModel):
    tag_names: List[str]

async def get_workspace_content(workspace_id: int):
    """Get all content for a workspace"""
    try:
        content = await content_repository.get_workspace_content(workspace_id)
        if not content:
            raise HTTPException(status_code=404, detail="Workspace not found")

        return JSONResponse({
            "success": True,
            "content": {
                "sections": [
                    {
                        "id": section.id,
                        "name": section.name,
                        "content": section.content,
                        "source": section.source,
                        "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in section.tags]
                    }
                    for section in content['sections']
                ]
            }
        })
    except Exception as e:
        logger.error(f"Error getting workspace content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_content(workspace_id: int, request: GenerateContentRequest):
    """Generate content using either Azure OpenAI, Ollama, or Hugging Face based on configuration"""
    try:
        context_sections = []

        if request.section_ids:
            content = await content_repository.get_workspace_content(workspace_id)
            sections = {s.id: s for s in content['sections']}
            context_sections = [sections[sid].content for sid in request.section_ids if sid in sections]

        # Choose provider (GROQ preferred when enabled)
        if USE_GROQ:
            logger.info("Using GROQ for content generation")
            client = groq_client
            provider = "GROQ"
        elif USE_HUGGING_FACE:
            logger.info("Using Hugging Face for content generation")
            client = hugging_face_llm_client
            provider = "Hugging Face"
        elif USE_AZURE_OPENAI:
            logger.info("Using Azure OpenAI for content generation")
            client = azure_openai_client
            provider = "Azure OpenAI"
        else:
            logger.info("Using Ollama for content generation")
            client = ollama_client
            provider = "Ollama"

        result = await client.generate_content(
            prompt=request.prompt,
            context_sections=context_sections,
            section_name=request.section_name or "Generated Content"
        )

        return JSONResponse({
            "success": True,
            "generated_content": result["content"],
            "context_tokens": result.get("context_tokens", 0),
            "response_tokens": result.get("response_tokens", 0),
            "provider": provider
        })
    except Exception as e:
        if USE_GROQ:
            provider = "GROQ"
        elif USE_HUGGING_FACE:
            provider = "Hugging Face"
        elif USE_AZURE_OPENAI:
            provider = "Azure OpenAI"
        else:
            provider = "Ollama"
        logger.error(f"Error generating content with {provider}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

async def save_generated_content(req: Request, workspace_id: int, request: SaveGeneratedContentRequest):
    """Save generated content as a prompt and generated content"""
    try:
        user = req.state.user
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        prompt = await content_repository.create_prompt(
            workspace_id=workspace_id,
            user_id=user.id,
            title=f"Generated prompt - {request.prompt[:50]}...",
            content=request.prompt
        )

        generated_content = await content_repository.create_generated_content(
            workspace_id=workspace_id,
            prompt_id=prompt.id,
            user_id=user.id,
            content=request.content,
            section_ids=request.section_ids,
            tag_names=request.tags
        )

        return JSONResponse({
            "success": True,
            "prompt_id": prompt.id,
            "generated_content_id": generated_content.id
        })
    except Exception as e:
        logger.error(f"Error saving generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def create_prompt(req: Request, workspace_id: int, request: PromptRequest):
    """Create a new prompt"""
    try:
        logger.info(f"Creating prompt for workspace {workspace_id} with data: {request}")

        user = req.state.user
        if not user:
            logger.error("No authenticated user found")
            raise HTTPException(status_code=401, detail="Not authenticated")

        logger.info(f"Creating prompt with user_id: {user.id}")

        prompt = await content_repository.create_prompt(
            workspace_id=workspace_id,
            user_id=user.id,
            title=request.title,
            content=request.content,
            tag_names=request.tags
        )

        logger.info(f"Created prompt with ID: {prompt.id}")

        response_data = {
            "success": True,
            "prompt": {
                "id": prompt.id,
                "title": prompt.title,
                "content": prompt.content,
                "created_at": prompt.created_at.isoformat()
            }
        }
        logger.info(f"Returning response: {response_data}")
        return JSONResponse(response_data)

    except Exception as e:
        logger.error(f"Error creating prompt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")

async def get_workspace_prompts(workspace_id: int):
    """Get all prompts for a workspace"""
    try:
        prompts = await content_repository.get_workspace_prompts(workspace_id)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error getting workspace prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def filter_prompts_by_tags(workspace_id: int, request: FilterRequest):
    """Filter prompts by tags"""
    try:
        prompts = await content_repository.filter_prompts_by_tags(workspace_id, request.tag_names)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error filtering prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def add_prompt_tag(workspace_id: int, prompt_id: int, request: TagRequest):
    """Add tag to prompt"""
    try:
        await content_repository.add_prompt_tag(prompt_id, request.tag_name)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding prompt tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def remove_prompt_tag(workspace_id: int, prompt_id: int, tag_id: int):
    """Remove tag from prompt"""
    try:
        await content_repository.remove_prompt_tag(prompt_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing prompt tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_prompt(workspace_id: int, prompt_id: int):
    """Delete prompt"""
    try:
        await content_repository.delete_prompt(prompt_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error deleting prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_prompts_by_section(workspace_id: int, section_name: str):
    """Get prompts for a specific section"""
    try:
        prompts = await content_repository.get_prompts_by_section(workspace_id, section_name)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error getting prompts by section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_prompts_by_workspace_type(workspace_id: int, workspace_type: str):
    """Get prompts for a specific workspace type"""
    try:
        prompts = await content_repository.get_prompts_by_workspace_type(workspace_id, workspace_type)

        return JSONResponse({
            "success": True,
            "prompts": [
                {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "created_at": prompt.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in prompt.tags]
                }
                for prompt in prompts
            ]
        })
    except Exception as e:
        logger.error(f"Error getting prompts by workspace type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_workspace_generated_content(workspace_id: int):
    """Get all generated content for a workspace"""
    try:
        contents = await content_repository.get_workspace_generated_content(workspace_id)

        return JSONResponse({
            "success": True,
            "generated_content": [
                {
                    "id": content.id,
                    "content": content.content,
                    "prompt_id": content.prompt_id,
                    "prompt_title": content.prompt.title,
                    "created_at": content.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags]
                }
                for content in contents
            ]
        })
    except Exception as e:
        logger.error(f"Error getting workspace generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_generated_content_details(workspace_id: int, content_id: int):
    """Get generated content details with context"""
    try:
        content = await content_repository.get_generated_content_by_id(content_id)
        if not content:
            raise HTTPException(status_code=404, detail="Generated content not found")

        return JSONResponse({
            "success": True,
            "generated_content": {
                "id": content.id,
                "content": content.content,
                "prompt": {
                    "id": content.prompt.id,
                    "title": content.prompt.title,
                    "content": content.prompt.content
                },
                "created_at": content.created_at.isoformat(),
                "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags],
                "context_sections": [
                    {
                        "id": ctx.section.id,
                        "name": ctx.section.name,
                        "content": ctx.section.content
                    }
                    for ctx in content.sections
                ]
            }
        })
    except Exception as e:
        logger.error(f"Error getting generated content details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def filter_generated_content_by_tags(workspace_id: int, request: FilterRequest):
    """Filter generated content by tags"""
    try:
        contents = await content_repository.filter_generated_content_by_tags(workspace_id, request.tag_names)

        return JSONResponse({
            "success": True,
            "generated_content": [
                {
                    "id": content.id,
                    "content": content.content,
                    "prompt_id": content.prompt_id,
                    "prompt_title": content.prompt.title,
                    "created_at": content.created_at.isoformat(),
                    "tags": [{"id": tag.tag.id, "name": tag.tag.name} for tag in content.tags]
                }
                for content in contents
            ]
        })
    except Exception as e:
        logger.error(f"Error filtering generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def add_generated_content_tag(workspace_id: int, content_id: int, request: TagRequest):
    """Add tag to generated content"""
    try:
        await content_repository.add_generated_content_tag(content_id, request.tag_name)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error adding generated content tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def remove_generated_content_tag(workspace_id: int, content_id: int, tag_id: int):
    """Remove tag from generated content"""
    try:
        await content_repository.remove_generated_content_tag(content_id, tag_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error removing generated content tag: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def delete_generated_content(workspace_id: int, content_id: int):
    """Delete generated content"""
    try:
        await content_repository.delete_generated_content(content_id)
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error deleting generated content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_default_prompts():
    """Get default prompts for all sections"""
    try:
        # Return the predefined prompts for each workspace type and section
        default_prompts = {
            "Proposal": {
                "Executive Summary": "Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition.",
                "Problem Statement": "Explain the core business challenges the client is facing and why addressing them is critical.",
                "Proposed Solution": "Describe the proposed solution in detail, including key features, components, and how it addresses the client's needs.",
                "Scope of Work": "Outline the specific deliverables, services, and responsibilities covered under this proposal.",
                "Project Approach and Methodology": "Describe the overall approach, phases, and methodology that will be used to execute the project.",
                "Project Plan and Timeline": "Provide a high-level timeline with major milestones and estimated completion dates for key phases.",
                "Team Composition and Roles": "List the proposed team members, their roles, responsibilities, and relevant experience.",
            },
            "Service Agreement": {
                "Agreement Overview": "Summarize the purpose and scope of the service agreement.",
                "Services Provided": "List and describe the services to be provided under this agreement.",
                "Service Levels": "Define the expected service levels and performance metrics.",
                "Responsibilities": "Outline the responsibilities of both parties.",
                "Payment Terms": "Specify the payment terms, schedule, and invoicing process.",
                "Termination Clause": "Describe the conditions under which the agreement may be terminated.",
                "Confidentiality": "Explain the confidentiality obligations of both parties.",
            },
            "Report": {
                "Introduction": "Provide an introduction to the report, including objectives and background.",
                "Methodology": "Describe the methods and processes used to gather and analyze data.",
                "Findings": "Summarize the key findings of the report.",
                "Analysis": "Provide a detailed analysis of the findings.",
                "Recommendations": "Offer actionable recommendations based on the analysis.",
                "Conclusion": "Summarize the main points and conclusions of the report.",
                "Appendices": "Include any supplementary material or data.",
            },
            "Research": {
                "Abstract": "Summarize the research topic, objectives, and key findings.",
                "Introduction": "Introduce the research problem and its significance.",
                "Literature Review": "Review relevant literature and previous research.",
                "Methodology": "Describe the research design, methods, and procedures.",
                "Results": "Present the results of the research.",
                "Discussion": "Interpret the results and discuss their implications.",
                "References": "List all references and sources cited in the research.",
            },
            "Template": {
                "Header": "Provide the header for the template, including title and date.",
                "Body": "Describe the main content or body of the template.",
                "Footer": "Include footer information such as page numbers or disclaimers.",
                "Instructions": "Provide instructions for using or filling out the template.",
                "Checklist": "List items to be checked or completed in the template.",
                "Summary": "Summarize the purpose and key points of the template.",
                "Appendix": "Include any additional material or resources.",
            },
            "Blog": {
                "Title": "Provide a catchy and relevant title for the blog post.",
                "Introduction": "Write an engaging introduction to the blog topic.",
                "Main Content": "Develop the main content with supporting arguments and examples.",
                "Tips & Insights": "Share tips, insights, or personal experiences related to the topic.",
                "Conclusion": "Conclude the blog post with a summary or call to action.",
                "References": "List any sources or references used in the blog post.",
                "Author Bio": "Provide a brief bio of the blog author.",
            },
        }

        return JSONResponse({
            "success": True,
            "default_prompts": default_prompts
        })
    except Exception as e:
        logger.error(f"Error getting default prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
