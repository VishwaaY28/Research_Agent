from fastapi import APIRouter
from api.handlers.research_section_templates import router as research_section_templates_router

router = APIRouter(prefix="/api/research-section-templates")
router.include_router(research_section_templates_router)
