# Disable OpenTelemetry telemetry to prevent connection errors
import os
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["OTEL_TRACES_EXPORTER"] = "none"
os.environ["OTEL_METRICS_EXPORTER"] = "none"
os.environ["OTEL_LOGS_EXPORTER"] = "none"

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles

from api.middlewares.auth import AuthMiddleware
from api.routes.auth import router as auth_router
from api.routes.workspaces import router as workspaces_router
from api.routes.sections import router as sections_router
from api.routes.sources import router as sources_router
from api.routes.tags import router as tags_router
from api.routes.prompts import router as prompts_router
from api.routes.data import router as data_router
from api.routes.research_agent import router as research_agent_router
from api.routes.research_section_templates import router as research_section_templates_router
from api.handlers import prompt_templates
# from api.routes.images import router as images_router
# from api.routes.tables import router as tables_router
from config.env import env
from database.db import init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_db()

    yield

    await close_db()

app = FastAPI(
    title="Proposal Craft API",
    description="API for Proposal Craft application",
    root_path_in_servers=False,
    lifespan=lifespan
)

sources_dir = os.path.abspath(os.path.join(os.getcwd(), 'source_files'))
if not os.path.exists(sources_dir):
    os.makedirs(sources_dir, exist_ok=True)
app.mount("/source_files", StaticFiles(directory=sources_dir), name="source_files")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return JSONResponse(
        content={"status": "ok"},
        status_code=200
    )

app.add_middleware(AuthMiddleware)
app.include_router(auth_router)
app.include_router(workspaces_router)
app.include_router(sections_router)
app.include_router(sources_router)
app.include_router(tags_router)
app.include_router(prompts_router)
app.include_router(data_router)
app.include_router(research_agent_router)
app.include_router(research_section_templates_router)
app.include_router(prompt_templates.router, prefix="/api/prompt-templates")
# app.include_router(images_router)
# app.include_router(tables_router)

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    raise HTTPException(
        status_code=404,
        detail=f"Route '{full_path}' not found."
    )

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get('PORT', 8000))

    uvicorn.run(
        "main:app",
        host='0.0.0.0',
        port=8000,
        log_level=env["LOG_LEVEL"].lower(),
        reload=True,
    )
