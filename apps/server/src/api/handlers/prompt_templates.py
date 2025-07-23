from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.models import WorkspaceType, SectionTemplate, PromptTemplate
from tortoise.exceptions import DoesNotExist

router = APIRouter()

class WorkspaceTypeCreate(BaseModel):
    name: str

class SectionTemplateCreate(BaseModel):
    name: str

class PromptTemplateCreate(BaseModel):
    prompt: str

@router.post('/types')
async def create_workspace_type(data: WorkspaceTypeCreate):
    obj = await WorkspaceType.create(name=data.name)
    return {"id": obj.id, "name": obj.name}

@router.get('/types')
async def list_workspace_types():
    types = await WorkspaceType.all()
    return [{"id": t.id, "name": t.name} for t in types]

@router.post('/types/{type_id}/sections')
async def create_section_template(type_id: int, data: SectionTemplateCreate):
    try:
        workspace_type = await WorkspaceType.get(id=type_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Workspace type not found")
    obj = await SectionTemplate.create(workspace_type=workspace_type, name=data.name)
    return {"id": obj.id, "name": obj.name}

@router.get('/types/{type_id}/sections')
async def list_section_templates(type_id: int):
    sections = await SectionTemplate.filter(workspace_type_id=type_id)
    return [{"id": s.id, "name": s.name} for s in sections]

@router.post('/sections/{section_id}/prompts')
async def create_prompt_template(section_id: int, data: PromptTemplateCreate):
    try:
        section = await SectionTemplate.get(id=section_id)
    except DoesNotExist:
        raise HTTPException(status_code=404, detail="Section not found")
    obj = await PromptTemplate.create(section_template=section, prompt=data.prompt)
    return {"id": obj.id, "prompt": obj.prompt}

@router.get('/sections/{section_id}/prompts')
async def list_prompt_templates(section_id: int):
    prompts = await PromptTemplate.filter(section_template_id=section_id)
    return [{"id": p.id, "prompt": p.prompt} for p in prompts] 