from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.middlewares.auth import AuthMiddleware
from api.routes.auth import router as auth_router
from api.routes.workspaces import router as workspaces_router
from api.routes.sections import router as sections_router
from api.routes.sources import router as sources_router
from api.routes.tags import router as tags_router
from api.routes.prompts import router as prompts_router
from api.routes.data import router as data_router
from api.handlers import prompt_templates
# from api.routes.images import router as images_router
# from api.routes.tables import router as tables_router
from config.env import env
from database.db import init_db, close_db
import os  # Add this import for dynamic PORT

app = FastAPI(
    title="Proposal Craft API",
    description="API for Proposal Craft application",
    root_path_in_servers=False
)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501", "https://your-frontend-render-url.onrender.com","*"],  # Add your frontend Render URL here for CORS
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

    # Dynamic port: Use Render's PORT env var, fallback to 8000 for local dev
    port = int(os.environ.get('PORT', 8000))
    # reload = os.environ.get('ENV') == 'development'  # Optional: Enable reload only in dev (set ENV=development locally)

    uvicorn.run(
        "main:app",
        host='0.0.0.0',
        port=port,
        log_level=env["LOG_LEVEL"].lower(),
        reload=True,  # Set to False for production
    )
