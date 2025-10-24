from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from database.models import UserIntent, ResearchSectionTemplate, ResearchSubSection, User
from utils.llm2 import hugging_face_llm_client
from tortoise.exceptions import DoesNotExist, IntegrityError

router = APIRouter()

# Pydantic models for request/response
class UserIntentCreate(BaseModel):
    name: str
    is_default: bool = False

class UserIntentResponse(BaseModel):
    id: int
    name: str
    is_default: bool

class ResearchSectionTemplateCreate(BaseModel):
    name: str
    order: int = 0
    prompt: str
    schema: Dict[str, Any]

class ResearchSectionTemplateResponse(BaseModel):
    id: int
    name: str
    order: int
    prompt: str
    schema: Dict[str, Any]

class ResearchSubSectionCreate(BaseModel):
    name: str
    order: int = 0

class ResearchSubSectionResponse(BaseModel):
    id: int
    name: str
    order: int

class ResearchSectionWithSubSectionsResponse(BaseModel):
    id: int
    name: str
    order: int
    prompt: str
    schema: Dict[str, Any]
    sub_sections: List[ResearchSubSectionResponse] = []

# Helper function to get current user from request state
async def get_current_user(request: Request) -> User:
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# User Intent Routes
@router.post('/intents', response_model=UserIntentResponse)
async def create_user_intent(data: UserIntentCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await UserIntent.create(
            name=data.name,
            is_default=data.is_default
        )
        return UserIntentResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except IntegrityError:
        raise HTTPException(status_code=400, detail="User intent with this name already exists")

@router.get('/intents', response_model=List[UserIntentResponse])
async def list_user_intents(request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    intents = await UserIntent.all().order_by('name')
    return [
        UserIntentResponse(
            id=intent.id,
            name=intent.name,
            is_default=intent.is_default
        ) for intent in intents
    ]

@router.get('/intents/{intent_id}', response_model=UserIntentResponse)
async def get_user_intent(intent_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await UserIntent.get(id=intent_id)
        return UserIntentResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="User intent not found")

@router.put('/intents/{intent_id}', response_model=UserIntentResponse)
async def update_user_intent(intent_id: int, data: UserIntentCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await UserIntent.get(id=intent_id)
        obj.name = data.name
        obj.is_default = data.is_default
        await obj.save()
        return UserIntentResponse(
            id=obj.id,
            name=obj.name,
            is_default=obj.is_default
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="User intent not found")
    except IntegrityError:
        raise HTTPException(status_code=400, detail="User intent with this name already exists")

@router.delete('/intents/{intent_id}')
async def delete_user_intent(intent_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await UserIntent.get(id=intent_id)
        await obj.delete()
        return {"message": "User intent deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="User intent not found")

# Research Section Template Routes
@router.post('/intents/{intent_id}/sections', response_model=ResearchSectionTemplateResponse)
async def create_research_section_template(intent_id: int, data: ResearchSectionTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        user_intent = await UserIntent.get(id=intent_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="User intent not found")

    obj = await ResearchSectionTemplate.create(
        user_intent=user_intent,
        name=data.name,
        order=data.order,
        prompt=data.prompt,
        schema=data.schema
    )
    return ResearchSectionTemplateResponse(
        id=obj.id,
        name=obj.name,
        order=obj.order,
        prompt=obj.prompt,
        schema=obj.schema
    )

@router.get('/intents/{intent_id}/sections', response_model=List[ResearchSectionWithSubSectionsResponse])
async def list_research_section_templates(intent_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        await UserIntent.get(id=intent_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="User intent not found")

    sections = await ResearchSectionTemplate.filter(user_intent_id=intent_id).order_by('order', 'name').prefetch_related('sub_sections')

    result = []
    for section in sections:
        sub_sections = [
            ResearchSubSectionResponse(
                id=sub.id,
                name=sub.name,
                order=sub.order
            ) for sub in section.sub_sections
        ]

        result.append(ResearchSectionWithSubSectionsResponse(
            id=section.id,
            name=section.name,
            order=section.order,
            prompt=section.prompt,
            schema=section.schema,
            sub_sections=sub_sections
        ))

    return result

@router.get('/sections/{section_id}', response_model=ResearchSectionTemplateResponse)
async def get_research_section_template(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await ResearchSectionTemplate.get(id=section_id)
        return ResearchSectionTemplateResponse(
            id=obj.id,
            name=obj.name,
            order=obj.order,
            prompt=obj.prompt,
            schema=obj.schema
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research section template not found")

@router.put('/sections/{section_id}', response_model=ResearchSectionTemplateResponse)
async def update_research_section_template(section_id: int, data: ResearchSectionTemplateCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await ResearchSectionTemplate.get(id=section_id)
        obj.name = data.name
        obj.order = data.order
        obj.prompt = data.prompt
        obj.schema = data.schema
        await obj.save()
        return ResearchSectionTemplateResponse(
            id=obj.id,
            name=obj.name,
            order=obj.order,
            prompt=obj.prompt,
            schema=obj.schema
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research section template not found")

@router.delete('/sections/{section_id}')
async def delete_research_section_template(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await ResearchSectionTemplate.get(id=section_id)
        await obj.delete()
        return {"message": "Research section template deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research section template not found")

# Research Sub-Section Routes
@router.post('/sections/{section_id}/sub-sections', response_model=ResearchSubSectionResponse)
async def create_research_sub_section(section_id: int, data: ResearchSubSectionCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        section = await ResearchSectionTemplate.get(id=section_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research section template not found")

    obj = await ResearchSubSection.create(
        research_section=section,
        name=data.name,
        order=data.order
    )
    return ResearchSubSectionResponse(
        id=obj.id,
        name=obj.name,
        order=obj.order
    )

@router.get('/sections/{section_id}/sub-sections', response_model=List[ResearchSubSectionResponse])
async def list_research_sub_sections(section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        await ResearchSectionTemplate.get(id=section_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research section template not found")

    sub_sections = await ResearchSubSection.filter(research_section_id=section_id).order_by('order', 'name')
    return [
        ResearchSubSectionResponse(
            id=sub.id,
            name=sub.name,
            order=sub.order
        ) for sub in sub_sections
    ]

@router.put('/sub-sections/{sub_section_id}', response_model=ResearchSubSectionResponse)
async def update_research_sub_section(sub_section_id: int, data: ResearchSubSectionCreate, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await ResearchSubSection.get(id=sub_section_id)
        obj.name = data.name
        obj.order = data.order
        await obj.save()
        return ResearchSubSectionResponse(
            id=obj.id,
            name=obj.name,
            order=obj.order
        )
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research sub-section not found")

@router.delete('/sub-sections/{sub_section_id}')
async def delete_research_sub_section(sub_section_id: int, request: Request):
    await get_current_user(request)  # Ensure user is authenticated
    try:
        obj = await ResearchSubSection.get(id=sub_section_id)
        await obj.delete()
        return {"message": "Research sub-section deleted successfully"}
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Research sub-section not found")

@router.post('/seed')
async def seed_default_data(request: Request):
    """Seed the database with default user intents and research sections"""
    await get_current_user(request)

    default_data = {
        "Technical Focus": [
            {
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
            {
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
        ],
    }

    created_intents = []

    for intent_name, sections in default_data.items():
        # Create or get user intent
        user_intent, created = await UserIntent.get_or_create(
            name=intent_name,
            defaults={"is_default": True}
        )

        if created:
            created_intents.append(intent_name)

        # Create research sections for this intent
        for i, section_data in enumerate(sections):
            await ResearchSectionTemplate.get_or_create(
                user_intent=user_intent,
                name=section_data["name"],
                defaults={
                    "order": i,
                    "prompt": section_data["prompt"],
                    "schema": section_data["schema"]
                }
            )

    return {
        "message": f"Seeded {len(created_intents)} user intents with their research sections",
        "created_intents": created_intents
    }
