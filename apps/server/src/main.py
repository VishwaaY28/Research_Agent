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
# from api.routes.images import router as images_router
# from api.routes.tables import router as tables_router
from config.env import env
from database.db import init_db, close_db

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
    allow_origins=["http://localhost:3000"],
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

    uvicorn.run(
        "main:app",
        host=env["HOST"],
        port=int(env["PORT"]),
        log_level=env["LOG_LEVEL"].lower(),
        reload=True,
    )
