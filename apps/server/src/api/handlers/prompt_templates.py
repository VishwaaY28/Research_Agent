from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from database.models import WorkspaceType, SectionTemplate, PromptTemplate, User
from utils.llm2 import hugging_face_llm_client
from tortoise.exceptions import DoesNotExist, IntegrityError

router = APIRouter()

# Pydantic models for request/response
class WorkspaceTypeCreate(BaseModel):
    name: str
    is_default: bool = False

class WorkspaceTypeResponse(BaseModel):
    id: int
    name: str
    is_default: bool

class SectionTemplateCreate(BaseModel):
    name: str
    order: int = 0

class SectionTemplateResponse(BaseModel):
    id: int
    name: str
    order: int

class PromptTemplateCreate(BaseModel):
    prompt: str
    is_default: bool = False

class PromptTemplateResponse(BaseModel):
    id: int
    prompt: str
    is_default: bool

class SectionWithPromptResponse(BaseModel):
    id: int
    name: str
    order: int
    prompt: Optional[str] = None

# Helper function to get current user from request state
async def get_current_user(request: Request) -> User:
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# Workspace Type Routes
@router.post('/types', response_model=WorkspaceTypeResponse)
async def create_workspace_type(data: WorkspaceTypeCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await WorkspaceType.create(
            name=data.name,
            is_default=data.is_default
        )
        return WorkspaceTypeResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Workspace type with this name already exists")

@router.get('/types', response_model=List[WorkspaceTypeResponse])
async def list_workspace_types(request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    types = await WorkspaceType.all().order_by('name')
    return [
        WorkspaceTypeResponse(
            id=t.id,
            name=t.name,
            is_default=t.is_default
        ) for t in types
    ]

@router.get('/types/{type_id}', response_model=WorkspaceTypeResponse)
async def get_workspace_type(type_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await WorkspaceType.get(id=type_id)
        return WorkspaceTypeResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")

@router.put('/types/{type_id}', response_model=WorkspaceTypeResponse)
async def update_workspace_type(type_id: int, data: WorkspaceTypeCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await WorkspaceType.get(id=type_id)
        obj.name = data.name
        obj.is_default = data.is_default
        await obj.save()
        return WorkspaceTypeResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Workspace type with this name already exists")

@router.delete('/types/{type_id}')
async def delete_workspace_type(type_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await WorkspaceType.get(id=type_id)
        await obj.delete()
        return {"message": "Workspace type deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")

# Section Template Routes
@router.post('/types/{type_id}/sections', response_model=SectionTemplateResponse)
async def create_section_template(type_id: int, data: SectionTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        workspace_type = await WorkspaceType.get(id=type_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")

    obj = await SectionTemplate.create(
        workspace_type=workspace_type,
        name=data.name,
        order=data.order
    )
    return SectionTemplateResponse(
        id=obj.id,
        name=obj.name,
        order=obj.order
    )

@router.get('/types/{type_id}/sections', response_model=List[SectionWithPromptResponse])
async def list_section_templates(type_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        await WorkspaceType.get(id=type_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")

    sections = await SectionTemplate.filter(workspace_type_id=type_id).order_by('order', 'name')

    result = []
    for section in sections:
        # Get the default prompt for this section
        prompt_obj = await PromptTemplate.filter(section_template=section, is_default=True).first()
        prompt_text = prompt_obj.prompt if prompt_obj else None

        result.append(SectionWithPromptResponse(
            id=section.id,
            name=section.name,
            order=section.order,
            prompt=prompt_text
        ))

    return result

@router.get('/sections/{section_id}', response_model=SectionTemplateResponse)
async def get_section_template(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await SectionTemplate.get(id=section_id)
        return SectionTemplateResponse(
            id=obj.id,
            name=obj.name,
            order=obj.order
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section template not found")

@router.put('/sections/{section_id}', response_model=SectionTemplateResponse)
async def update_section_template(section_id: int, data: SectionTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await SectionTemplate.get(id=section_id)
        obj.name = data.name
        obj.order = data.order
        await obj.save()
        return SectionTemplateResponse(
            id=obj.id,
            name=obj.name,
            order=obj.order
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section template not found")

@router.delete('/sections/{section_id}')
async def delete_section_template(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await SectionTemplate.get(id=section_id)
        await obj.delete()
        return {"message": "Section template deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section template not found")

# Prompt Template Routes
@router.post('/sections/{section_id}/prompts', response_model=PromptTemplateResponse)
async def create_prompt_template(section_id: int, data: PromptTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        section = await SectionTemplate.get(id=section_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section template not found")

    # If this is a default prompt, unset other defaults for this section
    if data.is_default:
        await PromptTemplate.filter(section_template=section, is_default=True).update(is_default=False)

    obj = await PromptTemplate.create(
        section_template=section,
        prompt=data.prompt,
        is_default=data.is_default
    )
    return PromptTemplateResponse(
        id=obj.id,
        prompt=obj.prompt,
        is_default=obj.is_default
    )

@router.get('/sections/{section_id}/prompts', response_model=List[PromptTemplateResponse])
async def list_prompt_templates(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        await SectionTemplate.get(id=section_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section template not found")

    prompts = await PromptTemplate.filter(section_template_id=section_id).order_by('-is_default', 'created_at')
    return [
        PromptTemplateResponse(
            id=p.id,
            prompt=p.prompt,
            is_default=p.is_default
        ) for p in prompts
    ]

@router.put('/prompts/{prompt_id}', response_model=PromptTemplateResponse)
async def update_prompt_template(prompt_id: int, data: PromptTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await PromptTemplate.get(id=prompt_id)

        # If this is becoming a default prompt, unset other defaults for this section
        if data.is_default and not obj.is_default:
            await PromptTemplate.filter(section_template=obj.section_template, is_default=True).update(is_default=False)

        obj.prompt = data.prompt
        obj.is_default = data.is_default
        await obj.save()

        return PromptTemplateResponse(
            id=obj.id,
            prompt=obj.prompt,
            is_default=obj.is_default
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Prompt template not found")

@router.delete('/prompts/{prompt_id}')
async def delete_prompt_template(prompt_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await PromptTemplate.get(id=prompt_id)
        await obj.delete()
        return {"message": "Prompt template deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Prompt template not found")

@router.post('/seed')
async def seed_default_data(request: Request):
    """Seed the database with default workspace types, sections, and prompts"""
    await get_current_user(request)

    # Default workspace types and their sections
    default_data = {
        "Proposal": [
            {
                "name": "Executive Summary",
                "prompt": "Provide a concise summary of the proposal, highlighting the business context, objectives, and value proposition."
            },
            {
                "name": "Problem Statement",
                "prompt": "Explain the core business challenges the client is facing and why addressing them is critical."
            },
            {
                "name": "Proposed Solution",
                "prompt": "Describe the proposed solution in detail, including key features, components, and how it addresses the client's needs."
            },
            {
                "name": "Scope of Work",
                "prompt": "Outline the specific deliverables, services, and responsibilities covered under this proposal."
            },
            {
                "name": "Project Approach and Methodology",
                "prompt": "Describe the overall approach, phases, and methodology that will be used to execute the project."
            },
            {
                "name": "Project Plan and Timeline",
                "prompt": "Provide a high-level timeline with major milestones and estimated completion dates for key phases."
            },
            {
                "name": "Team Composition and Roles",
                "prompt": "List the proposed team members, their roles, responsibilities, and relevant experience."
            }
        ],
        "Blog": [
            {
                "name": "Title",
                "prompt": "Provide a catchy and relevant title for the blog post."
            },
            {
                "name": "Introduction",
                "prompt": "Write an engaging introduction to the blog topic."
            },
            {
                "name": "Main Content",
                "prompt": "Develop the main content with supporting arguments and examples."
            },
            {
                "name": "Tips & Insights",
                "prompt": "Share tips, insights, or personal experiences related to the topic."
            },
            {
                "name": "Conclusion",
                "prompt": "Conclude the blog post with a summary or call to action."
            },
            {
                "name": "References",
                "prompt": "List any sources or references used in the blog post."
            },
            {
                "name": "Author Bio",
                "prompt": "Provide a brief bio of the blog author."
            }
        ],
        "User Story": [
            {
                "name": "User Story Title",
                "prompt": "Write a clear, concise title that describes the user story in one sentence."
            },
            {
                "name": "As a [User]",
                "prompt": "Define the user role or persona who will benefit from this feature."
            },
            {
                "name": "I want to [Action]",
                "prompt": "Describe the specific action or capability the user wants to achieve."
            },
            {
                "name": "So that [Benefit]",
                "prompt": "Explain the business value or benefit that will be achieved."
            },
            {
                "name": "Acceptance Criteria",
                "prompt": "List the specific criteria that must be met for this user story to be considered complete."
            },
            {
                "name": "Technical Requirements",
                "prompt": "Outline any technical constraints, dependencies, or implementation details."
            },
            {
                "name": "Definition of Done",
                "prompt": "Define what constitutes completion of this user story, including testing and documentation requirements."
            }
        ]

    }

    created_types = []

    for type_name, sections in default_data.items():
        # Create workspace type
        workspace_type, created = await WorkspaceType.get_or_create(
            name=type_name,
            defaults={"is_default": True}
        )

        if created:
            created_types.append(type_name)

        # Create sections and prompts
        for i, section_data in enumerate(sections):
            section, _ = await SectionTemplate.get_or_create(
                workspace_type=workspace_type,
                name=section_data["name"],
                defaults={"order": i}
            )

            # Create default prompt for this section
            await PromptTemplate.get_or_create(
                section_template=section,
                is_default=True,
                defaults={"prompt": section_data["prompt"]}
            )

    return {
        "message": f"Seeded {len(created_types)} workspace types with their sections and prompts",
        "created_types": created_types
    }
